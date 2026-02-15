import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, generateToken, getUserById } from '@/lib/auth';

/**
 * POST /api/auth/refresh
 * Refresh an existing JWT token
 * 
 * This endpoint allows clients to refresh their token before it expires,
 * preventing mid-session logouts during long operations like scraping.
 */
export async function POST(request: NextRequest) {
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

    // Verify current token
    let payload;
    try {
      payload = verifyToken(token);
    } catch (error) {
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

    // Get fresh user data from database
    const user = await getUserById(payload.userId);

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_ERROR',
            message: 'User not found',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Check if user is still active
    if (!user.isActive) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_ERROR',
            message: 'Account is deactivated',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Generate new token
    const newToken = generateToken(user);

    // Create response with new token
    const response = NextResponse.json(
      {
        success: true,
        token: newToken,
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          name: user.name,
          email: user.email,
        },
      },
      { status: 200 }
    );

    // Set cookie server-side for immediate availability
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      `auth-token=${newToken}`,
      'Path=/',
      'SameSite=Lax',
      'Max-Age=86400', // 24 hours
      isProduction ? 'Secure' : '', // Only use Secure in production (HTTPS)
    ].filter(Boolean).join('; ');
    
    response.headers.set('Set-Cookie', cookieOptions);

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);

    return NextResponse.json(
      {
        error: {
          code: 'SERVER_ERROR',
          message: 'An error occurred during token refresh',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
