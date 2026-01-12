import { NextRequest, NextResponse } from 'next/server';
import { FactorData, EnhancedFactorData } from '@/lib/types';

export async function GET() {
  try {
    // Try to get from database first, then fallback to localStorage
    try {
      const { databaseHelpers } = await import('@/lib/databaseAdapter');
      const factors = await databaseHelpers.getFactors();
      return NextResponse.json(factors);
    } catch (dbError) {
      console.warn('Database not available, falling back to localStorage:', dbError);
      
      // Fallback to localStorage data
      const defaultFactors: FactorData = {
        "36": {
          "0": {
            "0-5000": 350,
            "5001-10000": 450,
            "10001-20000": 550,
            "20001-30000": 650,
            "30001+": 750
          },
          "5": {
            "0-5000": 360,
            "5001-10000": 460,
            "10001-20000": 560,
            "20001-30000": 660,
            "30001+": 760
          }
        },
        "48": {
          "0": {
            "0-5000": 380,
            "5001-10000": 480,
            "10001-20000": 580,
            "20001-30000": 680,
            "30001+": 780
          },
          "5": {
            "0-5000": 390,
            "5001-10000": 490,
            "10001-20000": 590,
            "20001-30000": 690,
            "30001+": 790
          }
        },
        "60": {
          "0": {
            "0-5000": 400,
            "5001-10000": 500,
            "10001-20000": 600,
            "20001-30000": 700,
            "30001+": 800
          },
          "5": {
            "0-5000": 410,
            "5001-10000": 510,
            "10001-20000": 610,
            "20001-30000": 710,
            "30001+": 810
          }
        }
      };
      
      return NextResponse.json(defaultFactors);
    }
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

    // Try to save to database, fallback to localStorage
    try {
      const { databaseHelpers } = await import('@/lib/databaseAdapter');
      const savedFactors = await databaseHelpers.updateFactors(factors);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Factors config updated successfully',
        data: savedFactors
      });
    } catch (dbError) {
      console.warn('Database not available, factors not saved:', dbError);
      
      return NextResponse.json({ 
        success: false, 
        message: 'Database not available - factors not saved',
        data: factors
      });
    }
  } catch (error) {
    console.error('Error writing factors config:', error);
    return NextResponse.json({ error: 'Failed to update factors config' }, { status: 500 });
  }
}