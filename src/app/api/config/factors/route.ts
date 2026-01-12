import { NextRequest, NextResponse } from 'next/server';
import { FactorData, EnhancedFactorData } from '@/lib/types';

export async function GET() {
  try {
    const { databaseHelpers } = await import('@/lib/databaseAdapter');
    const factors = await databaseHelpers.getFactors();
    return NextResponse.json(factors);
  } catch (error) {
    console.error('Error reading factors config:', error);
    return NextResponse.json({ error: 'Failed to read factors config' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const factors: FactorData | EnhancedFactorData = await request.json();
    
    // Validate the data
    if (!factors || typeof factors !== 'object') {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    // Save to database
    const { databaseHelpers } = await import('@/lib/databaseAdapter');
    const savedFactors = await databaseHelpers.updateFactors(factors);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Factors config updated successfully',
      data: savedFactors
    });
  } catch (error) {
    console.error('Error writing factors config:', error);
    return NextResponse.json({ error: 'Failed to update factors config' }, { status: 500 });
  }
}