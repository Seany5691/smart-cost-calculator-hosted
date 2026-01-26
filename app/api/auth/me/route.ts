import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_ERROR',
            message: 'No authorization token provided',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const payload = verifyToken(token);

    // Return user data from token
    const user = {
      id: payload.userId,
      username: payload.username,
      role: payload.role,
      name: payload.name,
      email: payload.email,
    };

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error('Auth verification error:', error);

    return NextResponse.json(
      {
        error: {
          code: 'AUTH_ERROR',
          message: 'Invalid or expired token',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 401 }
    );
  }
}
