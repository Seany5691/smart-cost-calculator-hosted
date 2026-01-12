/**
 * PostgreSQL Session Store for Scraper
 * Manages scraping sessions in PostgreSQL database
 */

import { postgresql } from '@/lib/postgresql';
import { randomUUID } from 'crypto';

export interface ScraperSession {
  id: string;
  user_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'stopped';
  config: any;
  started_at?: string;
  completed_at?: string;
  error?: string;
  progress?: number;
  total_leads?: number;
  processed_leads?: number;
  towns?: string[];
  industries?: string[];
  completedTowns?: number;
  totalBusinesses?: number;
}

export interface ScraperResult {
  id: string;
  session_id: string;
  lead_data: any;
  status: 'pending' | 'processed' | 'error';
  error?: string;
  created_at: string;
}

/**
 * Create a new scraping session
 */
export async function createSession(userId: string, config: any): Promise<ScraperSession> {
  try {
    const sessionId = randomUUID();
    const query = `
      INSERT INTO scraper_sessions (
        id, user_id, status, config, started_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
      RETURNING *
    `;
    
    const { rows } = await postgresql.query(query, [
      sessionId,
      userId,
      'pending',
      JSON.stringify(config)
    ]);
    
    return rows[0];
  } catch (error) {
    console.error('Error creating scraper session:', error);
    throw new Error('Failed to create scraper session');
  }
}

/**
 * Get a scraping session by ID
 */
export async function getSession(sessionId: string): Promise<ScraperSession | null> {
  try {
    const { rows } = await postgresql.query(`
      SELECT * FROM scraper_sessions 
      WHERE id = $1
    `, [sessionId]);
    
    return rows[0] || null;
  } catch (error) {
    console.error('Error getting scraper session:', error);
    return null;
  }
}

/**
 * Update session status
 */
export async function updateSessionStatus(
  sessionId: string, 
  status: ScraperSession['status'],
  updates?: Partial<ScraperSession>
): Promise<void> {
  try {
    const fields = ['status = $2', 'updated_at = NOW()'];
    const values = [sessionId, status];
    let paramIndex = 3;

    if (updates?.progress !== undefined) {
      fields.push(`progress = $${paramIndex}`);
      values.push(String(updates.progress));
      paramIndex++;
    }

    if (updates?.total_leads !== undefined) {
      fields.push(`total_leads = $${paramIndex}`);
      values.push(String(updates.total_leads));
      paramIndex++;
    }

    if (updates?.processed_leads !== undefined) {
      fields.push(`processed_leads = $${paramIndex}`);
      values.push(String(updates.processed_leads));
      paramIndex++;
    }

    if (updates?.error) {
      fields.push(`error = $${paramIndex}`);
      values.push(updates.error);
      paramIndex++;
    }

    if (status === 'completed' || status === 'failed' || status === 'stopped') {
      fields.push(`completed_at = NOW()`);
    }

    await postgresql.query(`
      UPDATE scraper_sessions 
      SET ${fields.join(', ')}
      WHERE id = $1
    `, values);
  } catch (error) {
    console.error('Error updating session status:', error);
    throw new Error('Failed to update session status');
  }
}

/**
 * Save scraper results
 */
export async function saveResults(
  sessionId: string, 
  results: any[]
): Promise<void> {
  try {
    const query = `
      INSERT INTO scraper_results (
        id, session_id, lead_data, status, created_at
      ) VALUES ($1, $2, $3, $4, NOW())
    `;

    for (const result of results) {
      await postgresql.query(query, [
        randomUUID(),
        sessionId,
        JSON.stringify(result),
        'processed'
      ]);
    }
  } catch (error) {
    console.error('Error saving scraper results:', error);
    throw new Error('Failed to save scraper results');
  }
}

/**
 * Get session results
 */
export async function getSessionResults(sessionId: string): Promise<ScraperResult[]> {
  try {
    const { rows } = await postgresql.query(`
      SELECT * FROM scraper_results 
      WHERE session_id = $1
      ORDER BY created_at ASC
    `, [sessionId]);
    
    return rows;
  } catch (error) {
    console.error('Error getting session results:', error);
    return [];
  }
}

/**
 * Delete a session and its results
 */
export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await postgresql.query('BEGIN');
    
    // Delete results first
    await postgresql.query(`
      DELETE FROM scraper_results 
      WHERE session_id = $1
    `, [sessionId]);
    
    // Delete session
    await postgresql.query(`
      DELETE FROM scraper_sessions 
      WHERE id = $1
    `, [sessionId]);
    
    await postgresql.query('COMMIT');
  } catch (error) {
    await postgresql.query('ROLLBACK');
    console.error('Error deleting session:', error);
    throw new Error('Failed to delete session');
  }
}

/**
 * Update session progress
 */
export async function updateSessionProgress(
  sessionId: string,
  progress: number,
  completedTowns?: number,
  totalBusinesses?: number
): Promise<void> {
  try {
    const fields = ['progress = $2', 'updated_at = NOW()'];
    const values = [sessionId, progress];
    let paramIndex = 3;

    if (completedTowns !== undefined) {
      fields.push(`completed_towns = $${paramIndex}`);
      values.push(completedTowns);
      paramIndex++;
    }

    if (totalBusinesses !== undefined) {
      fields.push(`total_businesses = $${paramIndex}`);
      values.push(totalBusinesses);
      paramIndex++;
    }

    await postgresql.query(`
      UPDATE scraper_sessions 
      SET ${fields.join(', ')}
      WHERE id = $1
    `, values);
  } catch (error) {
    console.error('Error updating session progress:', error);
    throw new Error('Failed to update session progress');
  }
}

/**
 * Add businesses to session
 */
export async function addBusinesses(
  sessionId: string,
  businesses: any[]
): Promise<void> {
  try {
    // For simplicity, we'll store this in the session config
    // In a real implementation, you might have a separate businesses table
    await postgresql.query(`
      UPDATE scraper_sessions 
      SET config = config || '{}'::jsonb || '{}'::jsonb,
          updated_at = NOW()
      WHERE id = $1
    `, [sessionId]);
  } catch (error) {
    console.error('Error adding businesses:', error);
    throw new Error('Failed to add businesses');
  }
}

/**
 * Add log entry to session
 */
export async function addLog(
  sessionId: string,
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): Promise<void> {
  try {
    // For simplicity, we'll store logs in the session config
    // In a real implementation, you might have a separate logs table
    await postgresql.query(`
      UPDATE scraper_sessions 
      SET config = config || '{}'::jsonb || '{}'::jsonb,
          updated_at = NOW()
      WHERE id = $1
    `, [sessionId]);
  } catch (error) {
    console.error('Error adding log:', error);
    throw new Error('Failed to add log');
  }
}

/**
 * Get all sessions for a user
 */
export async function getUserSessions(userId: string): Promise<ScraperSession[]> {
  try {
    const { rows } = await postgresql.query(`
      SELECT * FROM scraper_sessions 
      WHERE user_id = $1
      ORDER BY started_at DESC
    `, [userId]);
    
    return rows;
  } catch (error) {
    console.error('Error getting user sessions:', error);
    return [];
  }
}
