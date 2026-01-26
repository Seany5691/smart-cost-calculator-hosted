/**
 * Simplified Middleware for Authentication
 * 
 * Extracts and verifies JWT tokens from requests
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, TokenPayload } from './auth';

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
 * Supports both regular routes and dynamic routes with params
 */
export function withAuth<T = any>(
  handler: (request: AuthenticatedRequest, context?: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: T): Promise<NextResponse> => {
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
      
      // Call handler with context (for dynamic routes)
      return handler(authenticatedRequest, context);
      
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
 * Supports both regular routes and dynamic routes with params
 */
export function withRole<T = any>(
  allowedRoles: Array<'admin' | 'manager' | 'user' | 'telesales'>,
  handler: (request: AuthenticatedRequest, context?: T) => Promise<NextResponse>
) {
  return withAuth(async (request: AuthenticatedRequest, context?: T) => {
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
    
    // Call handler with context
    return handler(request, context);
  });
}

/**
 * Middleware for admin-only routes
 * Supports both regular routes and dynamic routes with params
 */
export function withAdmin<T = any>(
  handler: (request: AuthenticatedRequest, context?: T) => Promise<NextResponse>
) {
  return withRole(['admin'], handler);
}

/**
 * Middleware for admin and manager routes
 * Supports both regular routes and dynamic routes with params
 */
export function withAdminOrManager<T = any>(
  handler: (request: AuthenticatedRequest, context?: T) => Promise<NextResponse>
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
