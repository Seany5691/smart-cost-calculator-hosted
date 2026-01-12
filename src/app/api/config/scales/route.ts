import { NextRequest, NextResponse } from 'next/server';
import { Scales, EnhancedScales } from '@/lib/types';

export async function GET() {
  try {
    const { databaseHelpers } = await import('@/lib/databaseAdapter');
    const scales = await databaseHelpers.getScales();
    return NextResponse.json(scales);
  } catch (error) {
    console.error('Error reading scales config:', error);
    return NextResponse.json({ error: 'Failed to read scales config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const scales: Scales | EnhancedScales = await request.json();
    
    // Validate the data
    if (!scales || typeof scales !== 'object') {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Save to database
    const { databaseHelpers } = await import('@/lib/databaseAdapter');
    const savedScales = await databaseHelpers.updateScales(scales);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Scales config updated successfully',
      data: savedScales
    });
  } catch (error) {
    console.error('Error writing scales config:', error);
    return NextResponse.json({ error: 'Failed to update scales config' }, { status: 500 });
  }
}