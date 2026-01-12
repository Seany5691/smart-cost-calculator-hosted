/**
 * Fix User ID Script
 * 
 * This script fixes the issue where "admin-1" is being used instead of proper UUIDs
 * Run this in the browser console to clear and reset the authentication state
 */

// Function to clear all authentication-related localStorage
function clearAuthStorage() {
  const keysToRemove = [
    'auth-storage',
    'smart-cost-calculator-global-users',
    'deals-storage',
    'leads-storage',
    'routes-storage',
    'reminders-storage',
    'hardware-storage',
    'connectivity-storage',
    'licensing-storage',
    'config-storage',
    'activity-logs',
    'dashboard-stats-cache'
  ];

  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log(`✓ Removed ${key} from localStorage`);
    } catch (error) {
      console.warn(`⚠️ Failed to remove ${key}:`, error);
    }
  });

  // Also clear sessionStorage
  try {
    sessionStorage.clear();
    console.log('✓ Cleared sessionStorage');
  } catch (error) {
    console.warn('⚠️ Failed to clear sessionStorage:', error);
  }

  console.log('🎉 Authentication storage cleared! Please refresh the page and log in again.');
}

// Function to check current auth state
function checkAuthState() {
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const auth = JSON.parse(authStorage);
      const user = auth.state?.user;
      console.log('Current user in localStorage:', user);
      
      if (user && user.id === 'admin-1') {
        console.error('❌ ISSUE DETECTED: User ID is "admin-1" instead of UUID!');
        return false;
      } else if (user && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(user.id)) {
        console.log('✅ User ID is a valid UUID:', user.id);
        return true;
      } else {
        console.warn('⚠️ Unexpected user state:', user);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to parse auth storage:', error);
      return false;
    }
  } else {
    console.log('ℹ️ No auth storage found');
    return null;
  }
}

// Auto-run check
console.log('=== User ID Fix Script ===');
console.log('Checking current authentication state...');
const isValid = checkAuthState();

if (isValid === false) {
  console.log('\n🔧 Fixing authentication issue...');
  clearAuthStorage();
} else if (isValid === true) {
  console.log('\n✅ Authentication state looks good!');
} else {
  console.log('\nℹ️ No authentication state found. Please log in.');
}

// Export functions for manual use
window.fixAuth = clearAuthStorage;
window.checkAuth = checkAuthState;

console.log('\n📋 Available commands:');
console.log('- fixAuth() : Clear all authentication storage');
console.log('- checkAuth() : Check current authentication state');
