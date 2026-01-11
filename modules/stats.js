/**
 * Statistics module for Grindr Auto Tap extension
 * Handles stats display and sending to n8n webhook
 */

import { formatDate, formatDuration } from '../utils/formatters.js';
import { LIMITS } from '../utils/constants.js';

// Logger function for stats module
function logger(level, location, message, data = null) {
  const logEntry = {
    timestamp: Date.now(),
    level: level,
    location: location || 'Stats',
    message: message,
    data: data
  };

  // Log to console as well
  const consoleMethod = level === 'error' ? console.error : 
                       level === 'warn' ? console.warn : 
                       level === 'debug' ? console.debug : 
                       console.log;
  consoleMethod(`[${location}] ${message}`, data || '');

  // Send to background script to store
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({
      action: 'addLog',
      logEntry: logEntry
    }).catch(err => {
      // Silently fail if background script is not available
    });
  }
}

/**
 * Send stats to n8n webhook via background script
 * @param {Object} stats - Statistics object
 * @param {number} retries - Number of retries
 * @returns {Promise<boolean>} Promise resolving to true if successful
 */
export async function sendToN8NWebhook(stats, retries = LIMITS.DEFAULT_RETRIES) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'sendToN8N',
      stats: stats,
      retries: retries
    }, (response) => {
      if (chrome.runtime.lastError) {
        logger('error', 'Stats', '❌ Erreur communication avec background: ' + chrome.runtime.lastError.message);
        resolve(false);
      } else {
        if (response && response.success) {
          logger('info', 'Stats', '📤 Récapitulatif envoyé à n8n avec succès');
          resolve(true);
        } else {
          logger('error', 'Stats', '❌ Erreur lors de l\'envoi du webhook: ' + (response?.error || 'Erreur inconnue'));
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
export function displayStats(stats) {
  const successRate = stats.totalCount > 0 ? ((stats.tappedCount / stats.totalCount) * 100).toFixed(1) : 0;

  logger('info', 'Stats', `📊 RÉCAPITULATIF - Début: ${formatDate(stats.startTime)}, Fin: ${formatDate(stats.endTime)}, Durée: ${formatDuration(stats.duration)}`);
  logger('info', 'Stats', `👥 Personnes déjà tapées: ${stats.alreadyTappedCount}, Tapées: ${stats.tappedCount}, Total: ${stats.totalCount}, Taux: ${successRate}%`);
  if (stats.error) {
    logger('warn', 'Stats', `⚠️ Erreur: ${stats.errorMessage}`);
  }
}

/**
 * Send final statistics to n8n
 * @param {Object} stats - Statistics object
 * @param {boolean} isError - Whether this is an error case
 * @returns {Promise<void>}
 */
export async function sendFinalStats(stats, isError = false) {
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

/**
 * Create error stats object
 * @param {Object} baseStats - Base statistics object
 * @param {Error|string} error - Error object or message
 * @returns {Object} Statistics object with error information
 */
export function createErrorStats(baseStats, error) {
  return {
    ...baseStats,
    error: true,
    errorMessage: error?.message || String(error) || 'Erreur inconnue'
  };
}

