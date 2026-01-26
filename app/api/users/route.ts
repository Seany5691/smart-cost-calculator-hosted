import { NextResponse } from 'next/server';
import {
  withAdmin,
  withAuth,
  AuthenticatedRequest,
  getUser,
} from '@/lib/middleware';
import { getPool } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for creating a user
const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'manager', 'user', 'telesales']),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
});

/**
 * GET /api/users - Get all users (authenticated users can see list for sharing)
 */
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    
    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const pool = getPool();
    
    // Get total count
    const countResult = await pool.query('SELECT COUNT(*) FROM users');
    const total = parseInt(countResult.rows[0].count);
    
    // Get paginated users
    const result = await pool.query(
      `SELECT id, username, role, name, email, is_active as "isActive", requires_password_change as "requiresPasswordChange", is_super_admin as "isSuperAdmin", created_at as "createdAt", updated_at as "updatedAt"
       FROM users
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return NextResponse.json(
      {
        users: result.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get users error:', error);

    return NextResponse.json(
      {
        error: {
          code: 'SERVER_ERROR',
          message: 'An error occurred while fetching users',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/users - Create a new user (admin only)
 */
export const POST = withAdmin(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();

    // Validate request body
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: validation.error.flatten().fieldErrors,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    const { username, password, role, name, email } = validation.data;

    // Check if username already exists
    const pool = getPool();
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Username already exists',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, password, role, name, email, is_active, requires_password_change, is_super_admin)
       VALUES ($1, $2, $3, $4, $5, true, true, false)
       RETURNING id, username, role, name, email, is_active as "isActive", requires_password_change as "requiresPasswordChange", is_super_admin as "isSuperAdmin", created_at as "createdAt", updated_at as "updatedAt"`,
      [username, hashedPassword, role, name, email]
    );

    return NextResponse.json(
      {
        user: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create user error:', error);

    return NextResponse.json(
      {
        error: {
          code: 'SERVER_ERROR',
          message: 'An error occurred while creating user',
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
});
