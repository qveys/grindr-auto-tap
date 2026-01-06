/**
 * @fileoverview Apple Authentication Handler for Background Script
 * Handles Apple tab detection and button clicking automation.
 * @module AppleHandler
 */

(function() {
  'use strict';

  const logger = self.createLogger ? self.createLogger('AppleHandler') : console.log;

  /**
   * Find Apple authentication tab
   * @param {Object} request - Request object
   * @param {string} [request.url] - Specific URL to match
   * @param {*} sender - Message sender
   * @param {Function} sendResponse - Response callback
   */
  async function findAppleTab(request, sender, sendResponse) {
    try {
      const allTabs = await chrome.tabs.query({});

      // Search for Apple-specific tabs
      let appleTab = allTabs.find(tab =>
        tab.url && (
          tab.url.includes('appleid.apple.com') ||
          tab.url.includes('idmsa.apple.com') ||
          tab.url.includes('signinwithapple') ||
          (tab.url.includes('apple.com') && (
            tab.url.includes('/auth/') ||
            tab.url.includes('/signin') ||
            tab.url.includes('/login')
          ))
        )
      );

      // If specific URL provided, try to match it
      if (!appleTab && request.url) {
        appleTab = allTabs.find(tab => tab.url === request.url);
      }

      sendResponse({ tabId: appleTab ? appleTab.id : null });
    } catch (error) {
      logger('error', 'AppleHandler', 'Failed to find Apple tab', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Click button in Apple authentication tab
   * Injects script to find and click button with retry logic
   * @param {Object} request - Request object
   * @param {number} request.tabId - Tab ID
   * @param {string} request.buttonValue - Button ID or text
   * @param {string} [request.searchType='id'] - Search type: 'id' or 'text'
   * @param {number} [request.maxRetries] - Maximum retry attempts
   * @param {*} sender - Message sender
   * @param {Function} sendResponse - Response callback
   */
  async function clickButtonInAppleTab(request, sender, sendResponse) {
    const tabId = request.tabId;
    const buttonValue = request.buttonValue;
    const searchType = request.searchType || 'id';
    const maxRetries = request.maxRetries || LIMITS.MAX_APPLE_BUTTON_RETRIES;

    try {
      // If no tab ID, find Apple tab
      if (!tabId || tabId === 'window-ref') {
        const tabs = await chrome.tabs.query({ url: '*://*apple.com/*' });
        const appleTab = tabs.find(tab =>
          tab.url && (
            tab.url.includes('appleid.apple.com') ||
            tab.url.includes('idmsa.apple.com') ||
            tab.url.includes('signinwithapple')
          )
        );

        if (!appleTab) {
          sendResponse({ success: false, error: 'Apple tab not found' });
          return;
        }

        await injectAndClickButton(appleTab.id, buttonValue, searchType, maxRetries, sendResponse);
      } else {
        await injectAndClickButton(tabId, buttonValue, searchType, maxRetries, sendResponse);
      }
    } catch (error) {
      logger('error', 'AppleHandler', 'Failed to click button in Apple tab', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Inject script into Apple tab and click button
   * @param {number} tabId - Tab ID
   * @param {string} buttonValue - Button ID or text
   * @param {string} searchType - Search type: 'id' or 'text'
   * @param {number} maxRetries - Maximum retry attempts
   * @param {Function} sendResponse - Response callback
   * @private
   */
  async function injectAndClickButton(tabId, buttonValue, searchType, maxRetries, sendResponse) {
    // Function to inject into the Apple tab
    // IMPORTANT: This function runs in the Apple tab's context, not the extension's
    // It MUST NOT reference any extension variables/constants
    function clickButtonInAppleTab(btnValue, searchBy, maxAttempts, retryInterval) {
      return new Promise((resolve) => {
        function findAndClickButton() {
          let button = null;

          if (searchBy === 'id') {
            // Search by ID
            button = document.getElementById(btnValue) ||
              document.querySelector('#' + btnValue) ||
              document.querySelector('button#' + btnValue) ||
              document.querySelector('[id="' + btnValue + '"]');
          } else if (searchBy === 'text') {
            // Search by text
            const buttons = Array.from(document.querySelectorAll('button')).filter(function (btn) {
              const text = btn.textContent.trim();
              return text.toLowerCase().includes(btnValue.toLowerCase());
            });
            button = buttons[0];
          }

          if (button) {
            console.log('[Apple Tab] ✅ Button found:', btnValue);
            button.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(function () {
              button.click();
              console.log('[Apple Tab] 🖱️ Button clicked:', btnValue);
            }, 500);
            return true;
          }
          return false;
        }

        // Retry multiple times
        let attempts = 0;
        const interval = setInterval(function () {
          attempts++;
          if (findAndClickButton()) {
            clearInterval(interval);
            resolve({ success: true, buttonValue: btnValue });
            return;
          }
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.error('[Apple Tab] ❌ Button not found after', maxAttempts, 'attempts');
            resolve({ success: false, error: 'Button not found after ' + maxAttempts + ' attempts' });
          }
        }, retryInterval);
      });
    }

    try {
      // Inject the script into the tab
      const results = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: clickButtonInAppleTab,
        args: [buttonValue, searchType, maxRetries, 2000] // Pass retry interval as arg
      });

      // Get result from injected function
      const result = results && results[0] && results[0].result;

      if (result && result.success) {
        logger('info', 'AppleHandler', `✅ Button "${buttonValue}" clicked successfully`);
        sendResponse({ success: true });
      } else {
        const error = result?.error || 'Unknown error during button click';
        logger('error', 'AppleHandler', `❌ Failed to click button "${buttonValue}": ${error}`);
        sendResponse({ success: false, error: error });
      }
    } catch (error) {
      logger('error', 'AppleHandler', `❌ Script injection failed: ${error.message}`);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Export to global scope
  self.AppleHandler = {
    findAppleTab,
    clickButtonInAppleTab
  };
})();
