/**
 * Profile Opener module for Grindr Auto Tap extension
 * Handles opening profiles and finding tap buttons
 *
 * Note: This file is loaded as a global script, not as an ES module
 * Functions are attached to window.ProfileOpenerModule
 */

// Dependencies will be loaded via script tags in manifest.json

// Extract constants from window for easier access
const { SELECTORS, DELAYS, TIMEOUTS, LIMITS } = window.Constants || {};

// Utility function for delays
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Logger function for profile opener module
function logger(level, location, message, data = null) {
  const logEntry = {
    timestamp: Date.now(),
    level: level,
    location: location || 'ProfileOpener',
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