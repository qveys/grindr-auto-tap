/**
 * @fileoverview Log Handler for Background Script
 * Handles log storage, retrieval, and clearing operations.
 * @module LogHandler
 */

(function() {
  'use strict';

  const logger = self.createLogger ? self.createLogger('LogHandler') : console.log;

  /**
   * Add log entry to storage
   * @param {Object} request - Request object
   * @param {Object} request.logEntry - Log entry to store
   * @param {*} sender - Message sender
   * @param {Function} sendResponse - Response callback
   */
  async function addLog(request, sender, sendResponse) {
    try {
      const logEntry = request.logEntry || {
        timestamp: Date.now(),
        level: 'info',
        location: 'unknown',
        message: '',
        data: null
      };

      const result = await chrome.storage.local.get(['extensionLogs']);
      const logs = result.extensionLogs || [];
      logs.push(logEntry);

      // Keep only recent logs
      if (logs.length > LOGGING.MAX_LOGS) {
        logs.shift();
      }

      await chrome.storage.local.set({ extensionLogs: logs });
      sendResponse({ success: true });
    } catch (error) {
      logger('error', 'LogHandler', 'Failed to add log', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Add debug log entry to storage (legacy support)
   * @param {Object} request - Request object
   * @param {*} sender - Message sender
   * @param {Function} sendResponse - Response callback
   */
  async function debugLog(request, sender, sendResponse) {
    try {
      const logEntry = {
        timestamp: request.timestamp || Date.now(),
        location: request.location,
        message: request.message,
        data: request.data,
        sessionId: request.sessionId,
        runId: request.runId,
        hypothesisId: request.hypothesisId
      };

      const result = await chrome.storage.local.get(['debugLogs']);
      const logs = result.debugLogs || [];
      logs.push(logEntry);

      if (logs.length > LOGGING.MAX_LOGS) {
        logs.shift();
      }

      await chrome.storage.local.set({ debugLogs: logs });
      sendResponse({ success: true });
    } catch (error) {
      logger('error', 'LogHandler', 'Failed to add debug log', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Get all logs from storage
   * @param {Object} request - Request object
   * @param {*} sender - Message sender
   * @param {Function} sendResponse - Response callback
   */
  async function getLogs(request, sender, sendResponse) {
    try {
      const result = await chrome.storage.local.get(['extensionLogs']);
      sendResponse({ logs: result.extensionLogs || [] });
    } catch (error) {
      logger('error', 'LogHandler', 'Failed to get logs', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Clear all logs from storage
   * @param {Object} request - Request object
   * @param {*} sender - Message sender
   * @param {Function} sendResponse - Response callback
   */
  async function clearLogs(request, sender, sendResponse) {
    try {
      await chrome.storage.local.remove(['extensionLogs']);
      sendResponse({ success: true });
    } catch (error) {
      logger('error', 'LogHandler', 'Failed to clear logs', error);
      sendResponse({ success: false, error: error.message || 'Unknown error' });
    }
  }

  // Export to global scope
  self.LogHandler = {
    addLog,
    debugLog,
    getLogs,
    clearLogs
  };
})();
