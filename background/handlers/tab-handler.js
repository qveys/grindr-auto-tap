/**
 * @fileoverview Tab Handler for Background Script
 * Handles tab detection and content script injection.
 * @module TabHandler
 */

(function() {
  'use strict';

  const logger = self.createLogger ? self.createLogger('TabHandler') : console.log;

  /**
   * Initialize tab listeners
   * Detects Grindr and Apple tabs and handles them accordingly
   */
  function initializeTabListeners() {
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      // Detect Grindr tabs and auto-inject content script
      if (changeInfo.status === 'complete' && tab.url && tab.url.includes('web.grindr.com')) {
        injectContentScript(tabId);
      }

      // Detect Apple authentication tabs
      if (changeInfo.status === 'complete' && tab.url && isAppleAuthURL(tab.url)) {
        handleAppleTabDetected(tabId, tab.url);
      }
    });
  }

  /**
   * Check if URL is an Apple authentication URL
   * @param {string} url - URL to check
   * @returns {boolean} True if Apple auth URL
   * @private
   */
  function isAppleAuthURL(url) {
    return url.includes('apple.com') ||
      url.includes('appleid.apple.com') ||
      url.includes('idmsa.apple.com') ||
      url.includes('signinwithapple');
  }

  /**
   * Inject content script into Grindr tab
   * @param {number} tabId - Tab ID
   * @private
   */
  function injectContentScript(tabId) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).catch(err => {
      // Ignore errors if script already injected
      logger('debug', 'TabHandler', `Script already injected or error: ${err?.message || String(err)}`);
    });
  }

  /**
   * Handle Apple authentication tab detected
   * Notifies Grindr content scripts about the Apple tab
   * @param {number} tabId - Apple tab ID
   * @param {string} url - Apple tab URL
   * @private
   */
  function handleAppleTabDetected(tabId, url) {
    logger('info', 'TabHandler', `🔍 Apple tab detected: ${url}`);

    // Notify Grindr content scripts
    chrome.tabs.query({ url: '*://web.grindr.com/*' }, (grindrTabs) => {
      if (grindrTabs.length > 0) {
        chrome.tabs.sendMessage(grindrTabs[0].id, {
          action: 'applePopupDetected',
          appleTabId: tabId,
          appleTabUrl: url
        }).catch(err => {
          logger('warn', 'TabHandler', `Cannot send message to content script: ${err?.message || String(err)}`);
        });
      }
    });
  }

  // Export to global scope
  self.TabHandler = {
    initializeTabListeners
  };
})();
