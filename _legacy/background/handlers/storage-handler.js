/**
 * @fileoverview Storage Handler for Background Script
 * Handles credential and configuration storage operations.
 * @module StorageHandler
 */

(function() {
  'use strict';

  const logger = self.createLogger ? self.createLogger('StorageHandler') : console.log;

  /**
   * Get credentials from storage
   * @param {Object} request - Request object
   * @param {*} sender - Message sender
   * @param {Function} sendResponse - Response callback
   */
  async function getCredentials(request, sender, sendResponse) {
    try {
      const result = await chrome.storage.local.get([
        'loginMethod',
        'grindrEmail',
        'grindrPassword',
        'autoLogin'
      ]);

      sendResponse({
        loginMethod: result.loginMethod || 'email',
        email: result.grindrEmail || null,
        password: result.grindrPassword || null,
        autoLogin: result.autoLogin !== false // true by default
      });
    } catch (error) {
      logger('error', 'StorageHandler', 'Failed to get credentials', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Save credentials to storage
   * @param {Object} request - Request object
   * @param {string} request.loginMethod - Login method (email, apple, google, facebook)
   * @param {string} [request.email] - Email (for email login)
   * @param {string} [request.password] - Password (for email login)
   * @param {boolean} request.autoLogin - Auto-login flag
   * @param {*} sender - Message sender
   * @param {Function} sendResponse - Response callback
   */
  async function saveCredentials(request, sender, sendResponse) {
    try {
      const dataToSave = {
        loginMethod: request.loginMethod || 'email',
        autoLogin: request.autoLogin !== false
      };

      // Save email/password only if provided (for compatibility with other methods)
      if (request.email) {
        dataToSave.grindrEmail = request.email;
      }
      if (request.password) {
        dataToSave.grindrPassword = request.password;
      }

      await chrome.storage.local.set(dataToSave);
      logger('info', 'StorageHandler', `Credentials saved (method: ${dataToSave.loginMethod})`);
      sendResponse({ success: true });
    } catch (error) {
      logger('error', 'StorageHandler', 'Failed to save credentials', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Delete credentials from storage
   * @param {Object} request - Request object
   * @param {*} sender - Message sender
   * @param {Function} sendResponse - Response callback
   */
  async function deleteCredentials(request, sender, sendResponse) {
    try {
      await chrome.storage.local.remove([
        'loginMethod',
        'grindrEmail',
        'grindrPassword',
        'autoLogin'
      ]);
      logger('info', 'StorageHandler', 'Credentials deleted');
      sendResponse({ success: true });
    } catch (error) {
      logger('error', 'StorageHandler', 'Failed to delete credentials', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Get webhook URL from storage
   * @param {Object} request - Request object
   * @param {*} sender - Message sender
   * @param {Function} sendResponse - Response callback
   */
  async function getWebhookURL(request, sender, sendResponse) {
    try {
      const result = await chrome.storage.local.get(['n8nWebhookURL']);
      sendResponse({
        url: result.n8nWebhookURL || URLS.DEFAULT_WEBHOOK
      });
    } catch (error) {
      logger('error', 'StorageHandler', 'Failed to get webhook URL', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Save webhook URL to storage
   * @param {Object} request - Request object
   * @param {string} request.url - Webhook URL
   * @param {*} sender - Message sender
   * @param {Function} sendResponse - Response callback
   */
  async function saveWebhookURL(request, sender, sendResponse) {
    try {
      await chrome.storage.local.set({ n8nWebhookURL: request.url });
      logger('info', 'StorageHandler', `Webhook URL saved: ${request.url}`);
      sendResponse({ success: true });
    } catch (error) {
      logger('error', 'StorageHandler', 'Failed to save webhook URL', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Export to global scope
  self.StorageHandler = {
    getCredentials,
    saveCredentials,
    deleteCredentials,
    getWebhookURL,
    saveWebhookURL
  };
})();
