/**
 * Messaging utility for Grindr Auto Tap extension
 * Centralized wrapper for chrome.runtime.sendMessage with error handling
 */

(function() {
  'use strict';

  /**
   * Send message to background script with centralized error handling
   * @param {Object} message - Message object to send to background script
   * @param {string} message.action - Action type for the background script
   * @returns {Promise<any>} Promise that resolves with the response from background
   */
  function sendToBackground(message) {
    return new Promise((resolve, reject) => {
      // Check if Chrome runtime is available
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        console.warn('[Messaging] Chrome runtime not available');
        resolve(null);
        return;
      }

      // Send message to background script
      chrome.runtime.sendMessage(message)
        .then(response => {
          // Check for runtime errors
          if (chrome.runtime.lastError) {
            console.error(`[Messaging] Failed to send message (${message.action}):`, chrome.runtime.lastError.message);
            resolve(null); // Fail silently
            return;
          }

          resolve(response);
        })
        .catch(err => {
          console.error(`[Messaging] Error sending message (${message.action}):`, err);
          resolve(null); // Fail silently
        });
    });
  }

  /**
   * Send log entry to background script
   * Convenience wrapper for addLog action
   * @param {Object} logEntry - Log entry object
   * @param {number} logEntry.timestamp - Timestamp in milliseconds
   * @param {string} logEntry.level - Log level (info, warn, error, debug)
   * @param {string} logEntry.location - Location/module name
   * @param {string} logEntry.message - Log message
   * @param {*} [logEntry.data] - Optional data
   * @returns {Promise<any>} Promise that resolves when log is sent
   */
  function sendLog(logEntry) {
    return sendToBackground({
      action: 'addLog',
      logEntry: logEntry
    });
  }

  /**
   * Send statistics to n8n webhook via background script
   * Convenience wrapper for sendToN8N action
   * @param {Object} stats - Statistics object
   * @param {number} [retries=2] - Number of retries
   * @returns {Promise<{success: boolean, error?: string}>} Promise with success status
   */
  async function sendStatsToWebhook(stats, retries = 2) {
    const response = await sendToBackground({
      action: 'sendToN8N',
      stats: stats,
      retries: retries
    });

    if (!response) {
      return { success: false, error: 'No response from background' };
    }

    return response;
  }

  // Export to global scope for content scripts
  window.Messaging = {
    sendToBackground,
    sendLog,
    sendStatsToWebhook
  };

  // Export individual functions for convenience
  window.sendToBackground = sendToBackground;
  window.sendLog = sendLog;
  window.sendStatsToWebhook = sendStatsToWebhook;
})();
