import { NextResponse } from 'next/server';
import {
  withAdmin,
  AuthenticatedRequest,
} from '@/lib/middleware';
import { getPool } from '@/lib/db';
import { hashPassword, validateSuperAdminProtection } from '@/lib/auth';
import { z } from 'zod';

// Validation schema for updating a user
const updateUserSchema = z.object({
  role: z.enum(['admin', 'manager', 'user', 'telesales']).optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
  requiresPasswordChange: z.boolean().optional(),
  password: z.string().min(8).optional(),
});

/**
 * GET /api/users/[id] - Get a specific user (admin only)
 */
export const GET = withAdmin(
  async (
    request: AuthenticatedRequest,
    context?: { params: { id: string } }
  ) => {
    if (!context) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Missing context', timestamp: new Date().toISOString() } },
        { status: 400 }
      );
    }
    const { params } = context;
    try {
      const pool = getPool();
      const result = await pool.query(
        `SELECT id, username, role, name, email, is_active as "isActive", requires_password_change as "requiresPasswordChange", is_super_admin as "isSuperAdmin", created_at as "createdAt", updated_at as "updatedAt"
         FROM users
         WHERE id = $1`,
        [params.id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 404 }
        );
      }

      return NextResponse.json(
        {
          user: result.rows[0],
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Get user error:', error);

      return NextResponse.json(
        {
          error: {
            code: 'SERVER_ERROR',
            message: 'An error occurred while fetching user',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }
  }
);

/**
 * PATCH /api/users/[id] - Update a user (admin only)
 */
export const PATCH = withAdmin(
  async (
    request: AuthenticatedRequest,
    context?: { params: { id: string } }
  ) => {
    if (!context) {
      return NextResponse.json(
        { error: { code: 'BAD_REQUEST', message: 'Missing context', timestamp: new Date().toISOString() } },
        { status: 400 }
      );
    }
    const { params } = context;
    try {
      const body = await request.json();

      // Validate request body
      const validation = updateUserSchema.safeParse(body);
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

      const pool = getPool();

      // Get current user
      const currentUser = await pool.query(
        'SELECT username, is_super_admin FROM users WHERE id = $1',
        [params.id]
      );

      if (currentUser.rows.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 404 }
        );
      }

      const username = currentUser.rows[0].username;

      // Check super admin protection for any changes (except password reset)
      const isSuperAdmin = currentUser.rows[0].is_super_admin;
      if (isSuperAdmin && !validation.data.password) {
        // Super admin can only have password changed, nothing else
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'Cannot modify super admin user. Only password reset is allowed.',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 403 }
        );
      }
      
      // For non-super-admin users, check if trying to change role
      if (validation.data.role) {
        try {
          validateSuperAdminProtection(username);
        } catch (error) {
          return NextResponse.json(
            {
              error: {
                code: 'FORBIDDEN',
                message:
                  error instanceof Error
                    ? error.message
                    : 'Cannot modify super admin',
                timestamp: new Date().toISOString(),
              },
            },
            { status: 403 }
          );
        }
      }

      // Build update query dynamically
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (validation.data.role !== undefined) {
        updates.push(`role = $${paramIndex++}`);
        values.push(validation.data.role);
      }

      if (validation.data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(validation.data.name);
      }

      if (validation.data.email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(validation.data.email);
      }

      if (validation.data.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(validation.data.isActive);
      }

      if (validation.data.requiresPasswordChange !== undefined) {
        updates.push(`requires_password_change = $${paramIndex++}`);
        values.push(validation.data.requiresPasswordChange);
      }

      if (validation.data.password !== undefined) {
        const hashedPassword = await hashPassword(validation.data.password);
        updates.push(`password = $${paramIndex++}`);
        values.push(hashedPassword);
      }

      if (updates.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'No fields to update',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 400 }
        );
      }

      // Add updated_at
      updates.push(`updated_at = CURRENT_TIMESTAMP`);

      // Add user ID
      values.push(params.id);

      const query = `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, username, role, name, email, is_active as "isActive", requires_password_change as "requiresPasswordChange", is_super_admin as "isSuperAdmin", created_at as "createdAt", updated_at as "updatedAt"
      `;

      const result = await pool.query(query, values);

      return NextResponse.json(
        {
          user: result.rows[0],
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Update user error:', error);

      return NextResponse.json(
        {
          error: {
            code: 'SERVER_ERROR',
            message: 'An error occurred while updating user',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/users/[id] - Delete a user (admin only)
 */
export const DELETE = withAdmin(
  async (
    request: AuthenticatedRequest,
    context?: { params: { id: string } }
  ) => {
    if (!context) {
      return NextResponse.json(
        {
          error: {
            code: 'MISSING_CONTEXT',
            message: 'Context is required',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 400 }
      );
    }
    const { params } = context;
    try {
      const pool = getPool();

      // Get user to check if super admin
      const userResult = await pool.query(
        'SELECT username, is_super_admin FROM users WHERE id = $1',
        [params.id]
      );

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          {
            error: {
              code: 'USER_NOT_FOUND',
              message: 'User not found',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 404 }
        );
      }

      const username = userResult.rows[0].username;

      // Check super admin protection
      try {
        validateSuperAdminProtection(username);
      } catch (error) {
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message:
                error instanceof Error
                  ? error.message
                  : 'Cannot delete super admin',
              timestamp: new Date().toISOString(),
            },
          },
          { status: 403 }
        );
      }

      // Delete user
      await pool.query('DELETE FROM users WHERE id = $1', [params.id]);

      return NextResponse.json(
        {
          message: 'User deleted successfully',
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Delete user error:', error);

      return NextResponse.json(
        {
          error: {
            code: 'SERVER_ERROR',
            message: 'An error occurred while deleting user',
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }
  }
);
