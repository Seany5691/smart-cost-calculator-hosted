/**
 * Date formatting utilities for consistent date display across the app
 * All dates are formatted as DD/MM/YYYY
 */

/**
 * Format a date string or Date object to DD/MM/YYYY format
 * @param date - Date string (ISO format) or Date object
 * @returns Formatted date string in DD/MM/YYYY format
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) return '';
    
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Format a date string or Date object to DD/MM/YYYY HH:MM format
 * @param date - Date string (ISO format) or Date object
 * @returns Formatted date string in DD/MM/YYYY HH:MM format
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) return '';
    
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    const hours = dateObj.getHours().toString().padStart(2, '0');
    const minutes = dateObj.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting date time:', error);
    return '';
  }
}

/**
 * Format a date for display with weekday (e.g., "Mon, 15/03/2024")
 * @param date - Date string (ISO format) or Date object
 * @returns Formatted date string with weekday
 */
export function formatDateWithWeekday(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) return '';
    
    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${weekday}, ${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date with weekday:', error);
    return '';
  }
}

/**
 * Get relative date description (e.g., "Today", "Tomorrow", "Yesterday", or formatted date)
 * @param date - Date string (ISO format) or Date object
 * @returns Relative date description or formatted date
 */
export function getRelativeDateDescription(date: string | Date | null | undefined): string {
  if (!date) return '';
  
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const compareDate = new Date(dateObj);
    compareDate.setHours(0, 0, 0, 0);
    
    const diffTime = compareDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    
    return formatDate(dateObj);
  } catch (error) {
    console.error('Error getting relative date:', error);
    return '';
  }
}
