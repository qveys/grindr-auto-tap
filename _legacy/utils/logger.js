/**
 * @fileoverview Universal Logger for Grindr Auto Tap extension
 * Factory pattern logger that works in all contexts (background, content, popup).
 * Logs to console and persists via background script's chrome.storage handler.
 *
 * Usage:
 * - Background: const logger = createLogger('Background');
 * - Content: const logger = window.logger; // or createLogger('Content')
 * - Popup: const logger = createLogger('Popup');
 *
 * @module Logger
 */

(function() {
  'use strict';

  /**
   * Create a logger function with default location
   * @param {string} [defaultLocation='unknown'] - Default location if none provided
   * @returns {Function} Logger function with signature (level, location, message, data)
   *
   * @example
   * const logger = createLogger('MyModule');
   * logger('info', 'MyModule', 'Hello world');
   * logger('error', 'MyModule', 'Something failed', { error: 'details' });
   */
  function createLogger(defaultLocation = 'unknown') {
    return function logger(level, location, message, data = null) {
      const logEntry = {
        timestamp: Date.now(),
        level: level,
        location: location || defaultLocation,
        message: message,
        data: data
      };

      // Console output with appropriate method
      const consoleMethod =
        level === 'error' ? console.error :
        level === 'warn' ? console.warn :
        level === 'debug' ? console.debug :
        console.log;

      consoleMethod(`[${logEntry.location}] ${message}`, data || '');

      // Send to background for persistence
      // Background handler 'addLog' will store in chrome.storage.local
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({
          action: 'addLog',
          logEntry: logEntry
        }).catch(() => {
          // Silently fail if background not available
          // This is normal when extension is reloading or background is busy
        });
      }
    };
  }

  // Export factory function to global scope
  if (typeof window !== 'undefined') {
    window.createLogger = createLogger;
  }
  if (typeof self !== 'undefined' && typeof window === 'undefined') {
    // Service worker context
    self.createLogger = createLogger;
  }

  // Export default logger instance
  const defaultLogger = createLogger();
  if (typeof window !== 'undefined') {
    window.logger = defaultLogger;
    window.Logger = { logger: defaultLogger };
  }
  if (typeof self !== 'undefined' && typeof window === 'undefined') {
    self.logger = defaultLogger;
    self.Logger = { logger: defaultLogger };
  }
})();

