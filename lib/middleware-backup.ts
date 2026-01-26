import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from './auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload;
}

/**
 * Extract JWT token from Authorization header
 */
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Middleware to verify JWT token and attach user to request
 */
export function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const token = extractToken(request);

      if (!token) {
        return NextResponse.json(
          {
            error: {
              code: 'AUTH_ERROR',
              message: 'No authentication token provided',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 401 }
        );
      }

      // Verify token
      const user = verifyToken(token);

      // Attach user to request
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = user;

      // Call the handler
      return handler(authenticatedRequest);
    } catch (error) {
      console.error('Authentication error:', error);

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
  };
}

/**
 * Middleware to check role-based permissions
 */
export function withRole(
  allowedRoles: Array<'admin' | 'manager' | 'user'>,
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withAuth(async (request: AuthenticatedRequest) => {
    const user = request.user;

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTH_ERROR',
            message: 'User not authenticated',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 401 }
      );
    }

    // Check if user's role is in allowed roles
    if (!allowedRoles.includes(user.role as 'admin' | 'manager' | 'user')) {
      return NextResponse.json(
        {
          error: {
            code: 'AUTHORIZATION_ERROR',
            message: 'Insufficient permissions',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 403 }
      );
    }

    // Call the handler
    return handler(request);
  });
}

/**
 * Middleware for admin-only routes
 */
export function withAdmin(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withRole(['admin'], handler);
}

/**
 * Middleware for admin and manager routes
 */
export function withAdminOrManager(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withRole(['admin', 'manager'], handler);
}

/**
 * Middleware for all authenticated users
 */
export function withAnyRole(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return withRole(['admin', 'manager', 'user'], handler);
}

/**
 * Helper to get user from request (for use in handlers)
 */
export function getUser(request: AuthenticatedRequest): TokenPayload {
  if (!request.user) {
    throw new Error('User not authenticated');
  }
  return request.user;
}

/**
 * Verify authentication and return result
 * This is a simpler alternative to withAuth for routes that need more control
 */
export async function verifyAuth(request: NextRequest): Promise<{
  authenticated: boolean;
  user?: TokenPayload;
}> {
  try {
    const token = extractToken(request);

    if (!token) {
      return { authenticated: false };
    }

    // Verify token
    const user = verifyToken(token);

    return { authenticated: true, user };
  } catch (error) {
    console.error('Authentication error:', error);
    return { authenticated: false };
  }
}
