/**
 * Logger module for Grindr Auto Tap extension
 * Centralized logging system that stores logs with timestamps
 */

// Note: MAX_LOGS is now defined in shared-constants.js as LOGGING.MAX_LOGS
// This constant is kept for backwards compatibility but should use LOGGING.MAX_LOGS instead
const MAX_LOGS = typeof LOGGING !== 'undefined' ? LOGGING.MAX_LOGS : 1000;
const LOG_LEVELS = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  DEBUG: 'debug'
};

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

/**
 * Add a log entry
 */
function addLog(level, location, message, data = null) {
  const logEntry = {
    timestamp: Date.now(),
    level: level,
    location: location || 'unknown',
    message: message,
    data: data
  };

  // Also log to console for debugging
  const consoleMethod = level === 'error' ? console.error :
    level === 'warn' ? console.warn :
      level === 'debug' ? console.debug :
        console.log;
  consoleMethod(`[${logEntry.location}] ${logEntry.message}`, data || '');

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
 * Logger object with methods for different log levels
 */
const logger = {
  /**
   * Log an info message
   */
  info: function (location, message, data = null) {
    addLog(LOG_LEVELS.INFO, location, message, data);
  },

  /**
   * Log a warning message
   */
  warn: function (location, message, data = null) {
    addLog(LOG_LEVELS.WARN, location, message, data);
  },

  /**
   * Log an error message
   */
  error: function (location, message, data = null) {
    addLog(LOG_LEVELS.ERROR, location, message, data);
  },

  /**
   * Log a debug message
   */
  debug: function (location, message, data = null) {
    addLog(LOG_LEVELS.DEBUG, location, message, data);
  },

  /**
   * Format timestamp for display
   */
  formatTimestamp: formatTimestamp
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = logger;
}