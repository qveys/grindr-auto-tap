/**
 * @fileoverview Background Script Entry Point
 * Simplified message router that delegates to specialized handlers.
 *
 * Architecture:
 * - LogHandler: Log storage operations
 * - StorageHandler: Credentials and config storage
 * - WebhookHandler: n8n webhook requests
 * - AppleHandler: Apple authentication automation
 * - TabHandler: Tab detection and injection
 *
 * All handlers are loaded via manifest.json before this file.
 */

'use strict';

// Initialize logger
const logger = self.createLogger('Background');

// Initialize tab listeners
if (self.TabHandler) {
  self.TabHandler.initializeTabListeners();
} else {
  logger('error', 'Background', 'TabHandler not loaded');
}

/**
 * Message router
 * Routes incoming messages to appropriate handlers
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const action = request.action;

  // Route to appropriate handler
  const routes = {
    // Log operations
    'addLog': self.LogHandler?.addLog,
    'debugLog': self.LogHandler?.debugLog,
    'getLogs': self.LogHandler?.getLogs,
    'clearLogs': self.LogHandler?.clearLogs,

    // Storage operations
    'getCredentials': self.StorageHandler?.getCredentials,
    'saveCredentials': self.StorageHandler?.saveCredentials,
    'deleteCredentials': self.StorageHandler?.deleteCredentials,
    'getWebhookURL': self.StorageHandler?.getWebhookURL,
    'saveWebhookURL': self.StorageHandler?.saveWebhookURL,

    // Webhook operations
    'sendToN8N': self.WebhookHandler?.sendToN8N,

    // Apple authentication
    'findAppleTab': self.AppleHandler?.findAppleTab,
    'clickButtonInAppleTab': self.AppleHandler?.clickButtonInAppleTab,
  };

  const handler = routes[action];

  if (!handler) {
    logger('warn', 'Background', `Unknown action: ${action}`);
    sendResponse({ success: false, error: `Unknown action: ${action}` });
    return false;
  }

  // Call handler
  try {
    handler(request, sender, sendResponse);
    return true; // Async response
  } catch (error) {
    logger('error', 'Background', `Error handling ${action}`, error);
    sendResponse({ success: false, error: error.message });
    return false;
  }
});

logger('info', 'Background', '✅ Background script initialized');
