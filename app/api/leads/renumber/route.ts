import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { verifyAuth } from '@/lib/middleware';

// Provider priority mapping
const PROVIDER_PRIORITY: Record<string, number> = {
  'Telkom': 1,
  'Vodacom': 2,
  'MTN': 3,
  'Cell C': 4,
  'Other': 5
};

function getProviderPriority(provider: string | null): number {
  if (!provider) return 5;
  return PROVIDER_PRIORITY[provider] || 5;
}

// POST /api/leads/renumber - Renumber leads in a status category
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['new', 'leads', 'working', 'bad', 'later', 'signed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // Get all leads for this status sorted by provider priority
    const result = await pool.query(
      'SELECT id, provider FROM leads WHERE status = $1 ORDER BY provider, number',
      [status]
    );

    // Sort by provider priority
    const leads = result.rows.sort((a, b) => {
      const priorityA = getProviderPriority(a.provider);
      const priorityB = getProviderPriority(b.provider);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      return 0;
    });

    // Update numbers sequentially
    for (let i = 0; i < leads.length; i++) {
      await pool.query(
        'UPDATE leads SET number = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [i + 1, leads[i].id]
      );
    }

    return NextResponse.json({
      message: `Successfully renumbered ${leads.length} leads in status "${status}"`,
      count: leads.length
    });
  } catch (error) {
    console.error('Error renumbering leads:', error);
    return NextResponse.json(
      { error: 'Failed to renumber leads' },
      { status: 500 }
    );
  }
}
