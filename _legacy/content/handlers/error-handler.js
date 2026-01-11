/**
 * @fileoverview Error Handler for Content Script
 * Sets up global error handlers and sends error stats.
 * @module ContentErrorHandler
 */

(function() {
  'use strict';

  const { logger } = window.Logger;

  /**
   * Initialize global error handlers
   */
  function initializeErrorHandlers() {
    if (window.__grindrErrorHandlersAdded) {
      return;
    }

    window.addEventListener('error', async (event) => {
      logger('error', 'ContentErrorHandler', '❌ Erreur globale capturée: ' + (event.error?.message || String(event.error)), event.error);

      if (window.__grindrStats) {
        try {
          const { createStatsFromGlobalState, sendFinalStats, createErrorStats } = window.Stats;
          const stats = createStatsFromGlobalState(Date.now());
          const errorStats = createErrorStats(stats, event.error);
          await sendFinalStats(errorStats, true);
        } catch (err) {
          logger('error', 'ContentErrorHandler', '❌ Erreur lors de l\'envoi des stats d\'erreur: ' + err.message);
        }
      }
    });

    window.addEventListener('unhandledrejection', async (event) => {
      logger('error', 'ContentErrorHandler', '❌ Promesse rejetée non gérée: ' + (event.reason?.message || String(event.reason)), event.reason);

      if (window.__grindrStats) {
        try {
          const { createStatsFromGlobalState, sendFinalStats, createErrorStats } = window.Stats;
          const stats = createStatsFromGlobalState(Date.now());
          const errorStats = createErrorStats(stats, event.reason);
          await sendFinalStats(errorStats, true);
        } catch (err) {
          logger('error', 'ContentErrorHandler', '❌ Erreur lors de l\'envoi des stats d\'erreur: ' + err.message);
        }
      }
    });

    window.__grindrErrorHandlersAdded = true;
    logger('info', 'ContentErrorHandler', '✅ Global error handlers initialized');
  }

  // Export to global scope
  window.ContentErrorHandler = {
    initializeErrorHandlers
  };
})();