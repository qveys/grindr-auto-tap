/**
 * Statistics module for Grindr Auto Tap extension
 * Handles statistics tracking, display, and webhook sending
 */

(function() {
  'use strict';

  // Dependencies: window.Constants, window.Logger, window.Formatters
  const { LIMITS } = window.Constants;
  const { logger } = window.Logger;
  const { formatDate, formatDuration } = window.Formatters;

  /**
   * Send statistics to n8n webhook via background script
   * Uses centralized messaging utility (window.sendStatsToWebhook)
   * @param {Object} stats - Statistics object
   * @param {number} retries - Number of retries
   * @returns {Promise<boolean>} True if sent successfully
   */
  async function sendToN8NWebhook(stats, retries = LIMITS.DEFAULT_RETRIES) {
    // Use centralized messaging utility if available
    if (typeof window !== 'undefined' && window.sendStatsToWebhook) {
      const response = await window.sendStatsToWebhook(stats, retries);
      if (response && response.success) {
        logger('info', 'Content', '📤 Récapitulatif envoyé à n8n avec succès');
        return true;
      } else {
        logger('error', 'Content', '❌ Erreur lors de l\'envoi du webhook: ' + (response?.error || 'Erreur inconnue'));
        return false;
      }
    }

    // Fallback to direct chrome.runtime.sendMessage if messaging utility not loaded
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'sendToN8N',
        stats: stats,
        retries: retries
      }, (response) => {
        if (chrome.runtime.lastError) {
          logger('error', 'Content', '❌ Erreur communication avec background: ' + chrome.runtime.lastError.message);
          resolve(false);
        } else {
          if (response && response.success) {
            logger('info', 'Content', '📤 Récapitulatif envoyé à n8n avec succès');
            resolve(true);
          } else {
            logger('error', 'Content', '❌ Erreur lors de l\'envoi du webhook: ' + (response?.error || 'Erreur inconnue'));
            resolve(false);
          }
        }
      });
    });
  }

  /**
   * Display statistics in console
   * @param {Object} stats - Statistics object
   */
  function displayStats(stats) {
    const successRate = stats.totalCount > 0 ? ((stats.tappedCount / stats.totalCount) * 100).toFixed(1) : 0;

    logger('info', 'Content', `📊 RÉCAPITULATIF - Début: ${formatDate(stats.startTime)}, Fin: ${formatDate(stats.endTime)}, Durée: ${formatDuration(stats.duration)}`);
    logger('info', 'Content', `👥 Personnes déjà tapées: ${stats.alreadyTappedCount}, Tapées: ${stats.tappedCount}, Total: ${stats.totalCount}, Taux: ${successRate}%`);
    if (stats.error) {
      logger('warn', 'Content', `⚠️ Erreur: ${stats.errorMessage}`);
    }
  }

  /**
   * Create error statistics object
   * @param {Object} baseStats - Base statistics object
   * @param {Error|*} error - Error object or error message
   * @returns {Object} Statistics object with error information
   */
  function createErrorStats(baseStats, error) {
    return {
      ...baseStats,
      error: true,
      errorMessage: error?.message || String(error) || 'Erreur inconnue'
    };
  }

  /**
   * Create statistics from global state
   * @param {number} startTime - Start timestamp
   * @param {number} endTime - End timestamp
   * @param {number} alreadyTappedCount - Number of already tapped profiles
   * @param {number} tappedCount - Number of tapped profiles
   * @returns {Object} Statistics object
   */
  function createStatsFromState(startTime, endTime, alreadyTappedCount, tappedCount) {
    const duration = endTime - startTime;
    const totalCount = alreadyTappedCount + tappedCount;

    return {
      startTime,
      endTime,
      duration,
      alreadyTappedCount,
      tappedCount,
      totalCount
    };
  }

  /**
   * Create statistics from global window state
   * @param {number} endTime - End timestamp (defaults to now)
   * @returns {Object} Statistics object
   */
  function createStatsFromGlobalState(endTime = Date.now()) {
    if (!window.__grindrStats) {
      throw new Error('No stats available in global state');
    }

    return createStatsFromState(
      window.__grindrStats.startTime,
      endTime,
      window.__grindrStats.alreadyTappedCount || 0,
      window.__grindrStats.tappedCount || 0
    );
  }

  /**
   * Send final statistics (with optional error)
   * @param {Object} stats - Statistics object
   * @param {boolean} isError - Whether an error occurred
   * @returns {Promise<void>}
   */
  async function sendFinalStats(stats, isError = false) {
    const statsToSend = { ...stats };

    if (isError && !statsToSend.error) {
      statsToSend.error = true;
      if (!statsToSend.errorMessage) {
        statsToSend.errorMessage = 'Script interrompu prématurément';
      }
    }

    displayStats(statsToSend);
    await sendToN8NWebhook(statsToSend);
  }

  // Export to global scope
  window.Stats = {
    sendToN8NWebhook,
    displayStats,
    createErrorStats,
    createStatsFromState,
    createStatsFromGlobalState,
    sendFinalStats
  };
})();
