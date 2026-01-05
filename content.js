/**
 * @fileoverview Content script entry point for Grindr Auto Tap extension
 * Main entry point that orchestrates authentication, profile opening, and auto-tap functionality.
 * Loads handlers and initializes the extension.
 */

// Dependencies loaded via manifest.json in order:
// - shared-constants.js (window.Constants)
// - utils/state-manager.js (window.StateManager)
// - utils/messaging.js (window.sendToBackground)
// - utils/logger.js (window.Logger, window.logger)
// - utils/formatters.js (window.Formatters)
// - utils/dom-helpers.js (window.DOMHelpers)
// - utils/async-helpers.js (window.AsyncHelpers)
// - modules/auth.js (window.Auth)
// - modules/profile-opener.js (window.ProfileOpener)
// - modules/stats.js (window.Stats)
// - modules/auto-tap.js (window.AutoTap)
// - content/handlers/script-lifecycle.js (window.ContentScriptLifecycle)
// - content/handlers/message-handler.js (window.ContentMessageHandler)
// - content/handlers/error-handler.js (window.ContentErrorHandler)
// - content/handlers/auto-start.js (window.ContentAutoStart)

(function() {
  'use strict';

  const { logger } = window.Logger;
  const { checkLoginStatus } = window.Auth;

  /**
   * Initialize content script
   */
  function initialize() {
    // Initialize error handlers
    const { initializeErrorHandlers } = window.ContentErrorHandler || {};
    if (initializeErrorHandlers) {
      initializeErrorHandlers();
    }

    // Initialize message listeners
    const { initializeMessageListeners } = window.ContentMessageHandler || {};
    if (initializeMessageListeners) {
      initializeMessageListeners();
    }

    // Initialize auto-start
    const { initializeAutoStart } = window.ContentAutoStart || {};
    if (initializeAutoStart) {
      initializeAutoStart();
    }

    // Export console API
    setupConsoleAPI();
  }

  /**
   * Set up console API for manual control
   */
  function setupConsoleAPI() {
    const { initAndRun, stopScript } = window.ContentScriptLifecycle || {};

    window.grindrAutoTap = {
      start: () => {
        window.__grindrStopped = false;
        if (initAndRun) {
          initAndRun();
        } else {
          logger('error', 'Content', '❌ Script lifecycle handler not loaded');
        }
      },
      stop: () => {
        if (stopScript) {
          stopScript();
        } else {
          window.__grindrRunning = false;
          window.__grindrStopped = true;
          window.__grindrStats = null;
          logger('info', 'Content', '⏹️ Script arrêté manuellement');
        }
      },
      checkStatus: checkLoginStatus
    };
  }

  // Initialize
  initialize();
})();
