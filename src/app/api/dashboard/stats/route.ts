import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Auth is not wired up server-side yet; use a stable default.
    const userId = searchParams.get('userId') || '550e8400-e29b-41d4-a716-446655440000';
    const isAdmin = searchParams.get('admin') === 'true';

    const { databaseHelpers } = await import('@/lib/databaseAdapter');
    const { getTotalCalculations } = await import('@/lib/dashboardStatsServer');

    const deals = await databaseHelpers.getDeals(userId, isAdmin);

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const activeProjects = (deals || []).filter((deal: any) => {
      const updatedAt = deal.updated_at || deal.updatedAt || deal.created_at || deal.createdAt;
      if (!updatedAt) return false;
      return new Date(updatedAt) >= thirtyDaysAgo;
    }).length;

    const calculations = await getTotalCalculations(userId, isAdmin);

    return NextResponse.json({
      data: {
        totalDeals: (deals || []).length,
        activeProjects,
        calculations,
      },
      success: true,
      error: null,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      {
        data: {
          totalDeals: 0,
          activeProjects: 0,
          calculations: 0,
        },
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats',
      },
      { status: 500 }
    );
  }
}
