/**
 * Simplified Middleware for Authentication
 * 
 * Extracts and verifies JWT tokens from requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from './auth-new';

export interface AuthenticatedRequest extends NextRequest {
  user?: TokenPayload;
}

/**
 * Extract JWT token from request
 * Checks Authorization header first, then cookies
 */
function extractToken(request: NextRequest): string | null {
  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try cookie as fallback
  const cookieToken = request.cookies.get('auth-token')?.value;
  if (cookieToken) {
    return cookieToken;
  }
  
  return null;
}

/**
 * Middleware to verify authentication
 */
export function withAuth(
  handler: (request: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const token = extractToken(request);
      
      if (!token) {
        return NextResponse.json(
          { error: 'No authentication token provided' },
          { status: 401 }
        );
      }
      
      // Verify token
      const user = verifyToken(token);
      
      // Attach user to request
      const authenticatedRequest = request as AuthenticatedRequest;
      authenticatedRequest.user = user;
      
      // Call handler
      return handler(authenticatedRequest);
      
    } catch (error) {
      console.error('Authentication error:', error);
      
      return NextResponse.json(
        { error: 'Invalid or expired token. Please log in again.' },
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
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }
    
    // Check if user's role is allowed
    if (!allowedRoles.includes(user.role as any)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Call handler
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
 * Get user from authenticated request
 */
export function getUser(request: AuthenticatedRequest): TokenPayload {
  if (!request.user) {
    throw new Error('User not authenticated');
  }
  return request.user;
}

/**
 * Verify authentication without middleware wrapper
 * Returns authentication result
 */
export async function verifyAuth(request: NextRequest): Promise<{
  authenticated: boolean;
  user?: TokenPayload;
  error?: string;
}> {
  try {
    const token = extractToken(request);
    
    if (!token) {
      return { authenticated: false, error: 'No token provided' };
    }
    
    const user = verifyToken(token);
    
    return { authenticated: true, user };
    
  } catch (error) {
    return { authenticated: false, error: 'Invalid token' };
  }
}
