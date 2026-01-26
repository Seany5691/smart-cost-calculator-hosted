import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { getPool } from './db';

// JWT secret from environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRATION = '24h';
const BCRYPT_SALT_ROUNDS = 10;

// Super admin credentials (hardcoded as per requirements)
const SUPER_ADMIN = {
  username: 'Camryn',
  password: 'Elliot6242!',
  role: 'admin' as const,
  name: 'Camryn',
  email: 'camryn@smartcalculator.com',
  isSuperAdmin: true,
};

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'manager' | 'user';
  name: string;
  email: string;
  isActive: boolean;
  requiresPasswordChange: boolean;
  isSuperAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    username: string;
    role: 'admin' | 'manager' | 'user';
    name: string;
    email: string;
  };
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  name: string;
  email: string;
  exp: number;
  iat: number;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: {
  id: string;
  username: string;
  role: string;
  name: string;
  email: string;
}): string {
  const payload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    email: user.email,
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Login with username and password
 */
export async function login(
  username: string,
  password: string
): Promise<AuthResponse> {
  const pool = getPool();

  // Check if this is the super admin
  if (username === SUPER_ADMIN.username) {
    if (password === SUPER_ADMIN.password) {
      // Check if super admin exists in database
      // Try both column names for compatibility (is_super_admin from initial schema, super_admin from migration)
      const result = await pool.query(
        `SELECT id, username, role, name, email, is_active, requires_password_change, 
                COALESCE(is_super_admin, super_admin, false) as is_super_admin, 
                created_at, updated_at 
         FROM users 
         WHERE username = $1 AND (is_super_admin = true OR super_admin = true)`,
        [SUPER_ADMIN.username]
      );

      let superAdminUser;
      if (result.rows.length === 0) {
        // Create super admin if doesn't exist
        const hashedPassword = await hashPassword(SUPER_ADMIN.password);
        const insertResult = await pool.query(
          `INSERT INTO users (username, password, role, name, email, is_active, requires_password_change, is_super_admin)
           VALUES ($1, $2, $3, $4, $5, true, false, true)
           RETURNING id, username, role, name, email, is_active, requires_password_change, is_super_admin, created_at, updated_at`,
          [
            SUPER_ADMIN.username,
            hashedPassword,
            SUPER_ADMIN.role,
            SUPER_ADMIN.name,
            SUPER_ADMIN.email,
          ]
        );
        superAdminUser = insertResult.rows[0];
      } else {
        superAdminUser = result.rows[0];
      }

      const token = generateToken({
        id: superAdminUser.id,
        username: superAdminUser.username,
        role: superAdminUser.role,
        name: superAdminUser.name,
        email: superAdminUser.email,
      });

      return {
        token,
        user: {
          id: superAdminUser.id,
          username: superAdminUser.username,
          role: superAdminUser.role,
          name: superAdminUser.name,
          email: superAdminUser.email,
        },
      };
    } else {
      throw new Error('Invalid credentials');
    }
  }

  // Regular user login
  const result = await pool.query(
    'SELECT * FROM users WHERE username = $1 AND is_active = true',
    [username]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = result.rows[0];

  // Verify password
  const isValid = await comparePassword(password, user.password);
  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  // Generate token
  const token = generateToken({
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    email: user.email,
  });

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      email: user.email,
    },
  };
}

/**
 * Logout (client-side operation, server just validates)
 */
export async function logout(): Promise<void> {
  // In a JWT-based system, logout is primarily client-side
  // The client should clear the token from storage
  // Server-side, we could implement a token blacklist if needed
  return Promise.resolve();
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const pool = getPool();
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [
    userId,
  ]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

/**
 * Check if a user is the super admin
 */
export function isSuperAdmin(username: string): boolean {
  return username === SUPER_ADMIN.username;
}

/**
 * Prevent super admin modifications
 */
export function validateSuperAdminProtection(
  username: string,
  operation: 'delete' | 'role_change' | 'username_change'
): void {
  if (isSuperAdmin(username)) {
    throw new Error(
      `Cannot ${operation.replace('_', ' ')} for super admin user`
    );
  }
}
