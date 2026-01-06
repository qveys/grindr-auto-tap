/**
 * Messaging utility for Grindr Auto Tap extension
 * Centralized wrapper for chrome.runtime.sendMessage with error handling
 */

(function() {
  'use strict';

  /**
   * Send message to background script with structured error handling
   * @param {Object} message - Message object to send to background script
   * @param {string} message.action - Action type for the background script
   * @returns {Promise<{success: boolean, data?: any, error?: string, errorType?: string}>}
   *   Structured response with success flag and error details
   *
   * @example
   * const result = await sendToBackground({ action: 'getCredentials' });
   * if (!result.success) {
   *   console.error(`Failed: ${result.error} (${result.errorType})`);
   *   return;
   * }
   * const credentials = result.data;
   */
  function sendToBackground(message) {
    return new Promise((resolve) => {
      // Check if Chrome runtime is available
      if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
        console.warn('[Messaging] Chrome runtime not available');
        resolve({
          success: false,
          error: 'Chrome runtime not available',
          errorType: 'NO_RUNTIME'
        });
        return;
      }

      // Send message to background script
      chrome.runtime.sendMessage(message)
        .then(response => {
          // Check for runtime errors
          if (chrome.runtime.lastError) {
            console.error(`[Messaging] Failed to send message (${message.action}):`, chrome.runtime.lastError.message);
            resolve({
              success: false,
              error: chrome.runtime.lastError.message,
              errorType: 'RUNTIME_ERROR'
            });
            return;
          }

          // Success - response may be null/undefined for some actions
          resolve({
            success: true,
            data: response
          });
        })
        .catch(err => {
          console.error(`[Messaging] Error sending message (${message.action}):`, err);
          resolve({
            success: false,
            error: err.message || String(err),
            errorType: 'SEND_ERROR'
          });
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
   * @returns {Promise<{success: boolean, data?: any, error?: string, errorType?: string}>}
   *   Structured response with success status and error details
   */
  async function sendStatsToWebhook(stats, retries = 2) {
    const result = await sendToBackground({
      action: 'sendToN8N',
      stats: stats,
      retries: retries
    });

    // Result is already in structured format from sendToBackground
    // If sendToBackground failed, return that error
    if (!result.success) {
      return result;
    }

    // If background response indicates failure, return that
    if (result.data && typeof result.data === 'object' && result.data.success === false) {
      return {
        success: false,
        error: result.data.error || 'Webhook request failed',
        errorType: 'WEBHOOK_ERROR'
      };
    }

    // Success
    return {
      success: true,
      data: result.data
    };
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
