import { NextRequest, NextResponse } from 'next/server';
import { Scales, EnhancedScales } from '@/lib/types';

export async function GET() {
  try {
    // Try to get from database first, then fallback to localStorage
    try {
      const { databaseHelpers } = await import('@/lib/databaseAdapter');
      const scales = await databaseHelpers.getScales();
      return NextResponse.json(scales);
    } catch (dbError) {
      console.warn('Database not available, falling back to localStorage:', dbError);
      
      // Fallback to localStorage data
      const defaultScales: Scales = {
        installation: {
          "1-5": 850,
          "6-10": 1200,
          "11-20": 1600,
          "21-32": 2000,
          "33+": 2500
        },
        gross_profit: {
          "1-5": 1200,
          "6-10": 1500,
          "11-20": 1800,
          "21-32": 2200,
          "33+": 2600
        },
        additional_costs: {
          cost_per_kilometer: 15,
          cost_per_point: 150
        },
        finance_fee: {
          "0-5000": 350,
          "5001-10000": 450,
          "10001-20000": 550,
          "20001-30000": 650,
          "30001+": 750
        }
      };
      
      return NextResponse.json(defaultScales);
    }
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

    // Try to save to database, fallback to localStorage
    try {
      const { databaseHelpers } = await import('@/lib/databaseAdapter');
      const savedScales = await databaseHelpers.updateScales(scales);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Scales config updated successfully',
        data: savedScales
      });
    } catch (dbError) {
      console.warn('Database not available, scales not saved:', dbError);
      
      return NextResponse.json({ 
        success: false, 
        message: 'Database not available - scales not saved',
        data: scales
      });
    }
  } catch (error) {
    console.error('Error writing scales config:', error);
    return NextResponse.json({ error: 'Failed to update scales config' }, { status: 500 });
  }
}