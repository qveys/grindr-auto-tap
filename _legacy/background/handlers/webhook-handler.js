/**
 * @fileoverview Webhook Handler for Background Script
 * Handles n8n webhook requests with retry logic and timeout protection.
 * @module WebhookHandler
 */

(function() {
  'use strict';

  const logger = self.createLogger ? self.createLogger('WebhookHandler') : console.log;

  /**
   * Send statistics to n8n webhook
   * Implements retry logic with exponential backoff
   * @param {Object} request - Request object
   * @param {Object} request.stats - Statistics to send
   * @param {number} [request.retries=2] - Number of retry attempts
   * @param {*} sender - Message sender
   * @param {Function} sendResponse - Response callback
   */
  async function sendToN8N(request, sender, sendResponse) {
    const stats = request.stats;
    const retries = request.retries || LIMITS.DEFAULT_RETRIES;

    try {
      const result = await chrome.storage.local.get(['n8nWebhookURL']);
      const webhookURL = result.n8nWebhookURL || URLS.DEFAULT_WEBHOOK;

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          // Timeout protection
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            TIMEOUTS.WEBHOOK_REQUEST
          );

          const response = await fetch(webhookURL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(stats),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          logger('info', 'WebhookHandler', '📤 Stats sent to n8n successfully');
          sendResponse({ success: true });
          return;
        } catch (error) {
          if (attempt < retries) {
            logger('warn', 'WebhookHandler', `⚠️ Attempt ${attempt + 1}/${retries + 1} failed, retrying in 2s...`);
            await new Promise(resolve => setTimeout(resolve, DELAYS.TWO_SECONDS));
          } else {
            logger('error', 'WebhookHandler', `❌ Failed to send webhook after ${retries + 1} attempts: ${error.message}`);
            sendResponse({ success: false, error: error.message });
            return;
          }
        }
      }
    } catch (error) {
      logger('error', 'WebhookHandler', 'Failed to send webhook', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Export to global scope
  self.WebhookHandler = {
    sendToN8N
  };
})();
