/**
 * Simplified Authentication System
 * 
 * This is a complete rewrite of the auth system to be:
 * - Simple and easy to understand
 * - Robust and reliable
 * - Easy to debug
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getPool } from './db';

// Configuration
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for security');
}
const JWT_EXPIRATION = '24h';
const BCRYPT_ROUNDS = 12; // Increased from 10 to 12 for better security

// Types
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'manager' | 'user' | 'telesales';
  name: string;
  email: string;
  isActive: boolean;
  isSuperAdmin: boolean;
  requiresPasswordChange: boolean;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  requiresPasswordChange?: boolean;
  error?: string;
}

export interface TokenPayload {
  userId: string;
  username: string;
  role: string;
  name: string;
  email: string;
  iat: number;
  exp: number;
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token
 */
export function generateToken(user: User): string {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  
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
 * Verify JWT token
 */
export function verifyToken(token: string): TokenPayload {
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Login with username and password
 */
export async function login(username: string, password: string): Promise<AuthResponse> {
  const pool = getPool();
  
  try {
    // Query database for user
    const result = await pool.query(
      `SELECT id, username, password, role, name, email, is_active, is_super_admin, requires_password_change
       FROM users 
       WHERE username = $1`,
      [username]
    );
    
    // User not found
    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Invalid username'
      };
    }
    
    const dbUser = result.rows[0];
    
    // Check if user is active
    if (!dbUser.is_active) {
      return {
        success: false,
        error: 'Account is deactivated. Please contact an administrator.'
      };
    }
    
    // Verify password
    const isValidPassword = await comparePassword(password, dbUser.password);
    if (!isValidPassword) {
      return {
        success: false,
        error: 'Invalid password'
      };
    }
    
    // Create user object
    const user: User = {
      id: dbUser.id,
      username: dbUser.username,
      role: dbUser.role,
      name: dbUser.name,
      email: dbUser.email,
      isActive: dbUser.is_active,
      isSuperAdmin: dbUser.is_super_admin || false,
      requiresPasswordChange: dbUser.requires_password_change || false,
    };
    
    // Generate token
    const token = generateToken(user);
    
    // Update last login
    await pool.query(
      'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );
    
    return {
      success: true,
      token,
      user,
      requiresPasswordChange: user.requiresPasswordChange,
    };
    
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      error: 'An error occurred during login. Please try again.'
    };
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const pool = getPool();
  
  try {
    const result = await pool.query(
      `SELECT id, username, role, name, email, is_active, is_super_admin, requires_password_change
       FROM users 
       WHERE id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const dbUser = result.rows[0];
    
    return {
      id: dbUser.id,
      username: dbUser.username,
      role: dbUser.role,
      name: dbUser.name,
      email: dbUser.email,
      isActive: dbUser.is_active,
      isSuperAdmin: dbUser.is_super_admin || false,
      requiresPasswordChange: dbUser.requires_password_change || false,
    };
    
  } catch (error) {
    console.error('Get user error:', error);
    return null;
  }
}

/**
 * Change user password
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const pool = getPool();
  
  try {
    // Get user
    const result = await pool.query(
      'SELECT password FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return { success: false, error: 'User not found' };
    }
    
    // Verify current password
    const isValid = await comparePassword(currentPassword, result.rows[0].password);
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password
    await pool.query(
      `UPDATE users 
       SET password = $1, 
           requires_password_change = FALSE,
           last_password_change = CURRENT_TIMESTAMP,
           temporary_password = FALSE,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashedPassword, userId]
    );
    
    return { success: true };
    
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, error: 'An error occurred while changing password' };
  }
}

/**
 * Reset user password (admin only)
 * Generates a temporary password
 */
export async function resetUserPassword(
  userId: string
): Promise<{ success: boolean; temporaryPassword?: string; error?: string }> {
  const pool = getPool();
  
  try {
    // Check if user is super admin (cannot reset)
    const userResult = await pool.query(
      'SELECT username, is_super_admin FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return { success: false, error: 'User not found' };
    }
    
    if (userResult.rows[0].is_super_admin) {
      return { success: false, error: 'Cannot reset super admin password' };
    }
    
    // Generate temporary password
    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await hashPassword(temporaryPassword);
    
    // Update user
    await pool.query(
      `UPDATE users 
       SET password = $1,
           requires_password_change = TRUE,
           temporary_password = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [hashedPassword, userId]
    );
    
    return { success: true, temporaryPassword };
    
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, error: 'An error occurred while resetting password' };
  }
}

/**
 * Generate a random temporary password
 */
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(username: string): boolean {
  const superAdminUsername = process.env.SUPER_ADMIN_USERNAME;
  if (!superAdminUsername) {
    console.warn('SUPER_ADMIN_USERNAME not configured');
    return false;
  }
  return username === superAdminUsername;
}

/**
 * Validate super admin protection
 */
export function validateSuperAdminProtection(username: string): void {
  if (isSuperAdmin(username)) {
    throw new Error('Cannot modify super admin user');
  }
}
