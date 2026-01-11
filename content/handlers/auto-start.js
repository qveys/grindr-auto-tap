/**
 * @fileoverview Auto-Start Handler for Content Script
 * Handles automatic script startup based on configuration.
 * @module ContentAutoStart
 */

(function() {
  'use strict';

  const { DEFAULTS, DELAYS } = window.Constants;
  const { logger } = window.Logger;

  /**
   * Initialize auto-start logic
   */
  function initializeAutoStart() {
    if (!window.location.hostname.includes('web.grindr.com')) {
      return;
    }

    logger('info', 'ContentAutoStart', '🔍 Vérification du démarrage automatique...');

    chrome.storage.local.get(['autoStart', 'minDelayHours'], (result) => {
      const autoStart = result.autoStart !== false;
      const minDelayHours = result.minDelayHours !== undefined ? result.minDelayHours : DEFAULTS.MIN_DELAY_HOURS;

      logger('info', 'ContentAutoStart', `📋 Configuration auto-start: ${autoStart ? 'activé' : 'désactivé'}, délai min: ${minDelayHours}h`);

      if (autoStart) {
        const startIfNeeded = () => {
          if (window.__grindrRunning || window.__grindrStopped) {
            logger('info', 'ContentAutoStart', 'ℹ️ Script déjà en cours ou arrêté, démarrage automatique ignoré');
            return;
          }

          const minDelayMs = minDelayHours * 60 * 60 * 1000;

          if (window.__grindrLastRun && (Date.now() - window.__grindrLastRun) < minDelayMs) {
            const remainingMs = minDelayMs - (Date.now() - window.__grindrLastRun);
            const remainingHours = (remainingMs / (60 * 60 * 1000)).toFixed(1);
            logger('info', 'ContentAutoStart', `ℹ️ Script récemment terminé, attente de ${remainingHours}h avant relancement automatique`);
            return;
          }

          logger('info', 'ContentAutoStart', '🔄 Démarrage automatique du script activé');
          const { initAndRun } = window.ContentScriptLifecycle || {};
          if (initAndRun) {
            initAndRun();
          } else {
            logger('error', 'ContentAutoStart', '❌ Script lifecycle handler not loaded');
          }
        };

        if (document.readyState === 'loading') {
          logger('info', 'ContentAutoStart', '⏳ Page en cours de chargement, attente de DOMContentLoaded...');
          document.addEventListener('DOMContentLoaded', () => {
            logger('info', 'ContentAutoStart', '✅ DOMContentLoaded déclenché, démarrage dans 2 secondes...');
            setTimeout(startIfNeeded, DELAYS.TWO_SECONDS);
          });
        } else {
          logger('info', 'ContentAutoStart', '✅ Page déjà chargée, démarrage dans 2 secondes...');
          setTimeout(startIfNeeded, DELAYS.TWO_SECONDS);
        }
      } else {
        logger('info', 'ContentAutoStart', 'ℹ️ Démarrage automatique désactivé');
      }
    });
  }

  // Export to global scope
  window.ContentAutoStart = {
    initializeAutoStart
  };
})();