
/**
 * @fileoverview Message Handler for Content Script
 * Handles Chrome runtime message listeners.
 * @module ContentMessageHandler
 */

(function() {
  'use strict';

  const { logger } = window.Logger;

  /**
   * Initialize message listeners
   */
  function initializeMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'startScript') {
        const { initAndRun } = window.ContentScriptLifecycle || {};
        if (!initAndRun) {
          sendResponse({ success: false, error: 'Script lifecycle handler not loaded' });
          return false;
        }

        initAndRun().then((result) => {
          if (result && result.success) {
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: result?.error || 'Échec du démarrage du script' });
          }
        }).catch((error) => {
          sendResponse({ success: false, error: error.message });
        });
        return true; // Indicates async response
      }

      if (request.action === 'stopScript') {
        const { stopScript } = window.ContentScriptLifecycle || {};
        if (stopScript) {
          stopScript();
        } else {
          // Fallback using StateManager
          const { StateManager } = window;
          if (StateManager) {
            StateManager.setState(StateManager.State.STOPPED);
            StateManager.clearStats();
          } else {
            window.__grindrRunning = false;
            window.__grindrStopped = true;
            window.__grindrStats = null;
          }
          logger('info', 'ContentMessageHandler', '⏹️ Script arrêté manuellement (fallback)');
        }
        sendResponse({ success: true });
        return true;
      }

      if (request.action === 'getScriptStatus') {
        sendResponse({ isRunning: window.__grindrRunning || false });
        return true;
      }
    });

    logger('info', 'ContentMessageHandler', '✅ Message listeners initialized');
  }

  // Export to global scope
  window.ContentMessageHandler = {
    initializeMessageListeners
  };
})();
