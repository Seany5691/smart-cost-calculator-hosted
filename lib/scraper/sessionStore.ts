/**
 * Session Store - In-memory storage for active scraping sessions
 * 
 * This module provides in-memory storage for active scraping sessions.
 * Sessions are stored in a Map for fast access and include the orchestrator,
 * event emitter, and timing information.
 * 
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5
 */

import { EventEmitter } from 'events';
import type { ScrapingOrchestrator } from './scraping-orchestrator';

/**
 * Active session data structure
 */
export interface ActiveSession {
  orchestrator: ScrapingOrchestrator;
  eventEmitter: EventEmitter;
  createdAt: number;
  completedAt?: number;
}

/**
 * In-memory session storage
 */
const sessions = new Map<string, ActiveSession>();

/**
 * Get a session by ID
 * @param sessionId - The session ID
 * @returns The active session or undefined if not found
 */
export function getSession(sessionId: string): ActiveSession | undefined {
  return sessions.get(sessionId);
}

/**
 * Store a session
 * @param sessionId - The session ID
 * @param session - The active session data
 */
export function setSession(sessionId: string, session: ActiveSession): void {
  sessions.set(sessionId, session);
}

/**
 * Delete a session
 * @param sessionId - The session ID
 * @returns true if the session was deleted, false if it didn't exist
 */
export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

/**
 * Check if a session exists
 * @param sessionId - The session ID
 * @returns true if the session exists, false otherwise
 */
export function hasSession(sessionId: string): boolean {
  return sessions.has(sessionId);
}

/**
 * Mark a session as complete
 * @param sessionId - The session ID
 */
export function markSessionComplete(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.completedAt = Date.now();
  }
}

/**
 * Clean up old sessions
 * Removes sessions that are:
 * - Completed and older than 5 minutes
 * - Not completed and older than 24 hours
 * 
 * @returns The number of sessions cleaned up
 */
export function cleanupOldSessions(): number {
  const now = Date.now();
  const FIVE_MINUTES = 5 * 60 * 1000;
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  
  let cleanedCount = 0;
  
  for (const [sessionId, session] of sessions.entries()) {
    const age = now - session.createdAt;
    
    // Remove completed sessions older than 5 minutes
    if (session.completedAt && (now - session.completedAt) > FIVE_MINUTES) {
      sessions.delete(sessionId);
      cleanedCount++;
      continue;
    }
    
    // Remove non-completed sessions older than 24 hours
    if (!session.completedAt && age > TWENTY_FOUR_HOURS) {
      sessions.delete(sessionId);
      cleanedCount++;
    }
  }
  
  return cleanedCount;
}

/**
 * Get all session IDs (for debugging/testing)
 * @returns Array of session IDs
 */
export function getAllSessionIds(): string[] {
  return Array.from(sessions.keys());
}

/**
 * Get session count (for debugging/testing)
 * @returns Number of active sessions
 */
export function getSessionCount(): number {
  return sessions.size;
}

/**
 * Clear all sessions (for testing)
 */
export function clearAllSessions(): void {
  sessions.clear();
}
