/**
 * Logger utility for Grindr Auto Tap extension
 * Centralized logging that sends logs to background script and console
 */

(function() {
  'use strict';

  /**
   * Log a message with level, location, and optional data
   * @param {string} level - Log level: 'info', 'warn', 'error', 'debug'
   * @param {string} location - Location/module name
   * @param {string} message - Log message
   * @param {*} data - Optional data to log
   */
  function logger(level, location, message, data = null) {
    const logEntry = {
      timestamp: Date.now(),
      level: level,
      location: location || 'unknown',
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
    // Use centralized messaging utility if available
    if (typeof window !== 'undefined' && window.sendLog) {
      window.sendLog(logEntry);
    } else if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      // Fallback to direct chrome.runtime.sendMessage if messaging utility not loaded
      chrome.runtime.sendMessage({
        action: 'addLog',
        logEntry: logEntry
      }).catch(err => {
        // Silently fail if background script is not available
      });
    }
  }

  // Export to global scope
  window.Logger = { logger };
  window.logger = logger;
})();

