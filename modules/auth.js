/**
 * Authentication module for Grindr Auto Tap extension
 * Handles login via email, Facebook, Google, and Apple
 *
 * Note: This file is loaded as a global script, not as an ES module
 * Functions are attached to window.AuthModule
 */

// Dependencies will be loaded via script tags in manifest.json

// Extract constants from window for easier access
const { SELECTORS, DELAYS, TIMEOUTS, LIMITS, URLS, APPLE } = window.Constants || {};

// Utility function for delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Logger function for auth module
function logger(level, location, message, data = null) {
  const logEntry = {
    timestamp: Date.now(),
    level: level,
    location: location || 'Auth',
    message: message,
    data: data
  };

  // Log to console as well
  const consoleMethod = level === 'error' ? console.error :
    level === 'warn' ? console.warn :
      level === 'debug' ? console.debug :
        console.log;
  consoleMethod(`[${location}] ${message}`, data || '');

  // Send to background script to store
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({
      action: 'addLog',
      logEntry: logEntry
    }).catch(err => {
      // Silently fail if background script is not available
      console.error('Failed to send log to background:', err);
    });
  }
}

/**
 * Check if user is currently logged in
 * @returns {boolean} True if logged in, false otherwise
 */
function checkLoginStatus() {
  const loginPage = document.querySelector(SELECTORS.EMAIL_INPUT);
  if (loginPage) {
    return false;
  }

  const profileElements = document.querySelector(SELECTORS.PROFILE_INDICATORS);
  if (profileElements) {
    return true;
  }

  if (window.location.pathname.includes('/login') || window.location.pathname.includes('/signin')) {
    return false;
  }

  return true;
}