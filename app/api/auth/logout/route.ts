import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // In a stateless JWT system, logout is handled client-side
    // by removing the token from storage
    // This endpoint exists for consistency and future session management
    
    return NextResponse.json(
      { 
        success: true,
        message: 'Logged out successfully' 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: { message: 'Logout failed' } 
      },
      { status: 500 }
    );
  }
}
