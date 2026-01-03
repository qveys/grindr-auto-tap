/**
 * Profile opener module for Grindr Auto Tap extension
 * Handles opening the first profile before starting the script
 */

import { delay } from '../utils/formatters.js';
import { SELECTORS, DELAYS } from '../utils/constants.js';

// Logger function for profile-opener module
function logger(level, location, message, data = null) {
  const logEntry = {
    timestamp: Date.now(),
    level: level,
    location: location || 'ProfileOpener',
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
 * Dismiss beta banner if present
 * @returns {Promise<void>}
 */
export async function dismissBetaBanner() {
  const betaDismissBtn = document.getElementById('beta-dismiss-btn');
  if (betaDismissBtn) {
    logger('info', 'ProfileOpener', '🔘 Clic sur le bouton beta-dismiss-btn...');
    betaDismissBtn.click();
    await delay(DELAYS.SECOND);
  } else {
    logger('info', 'ProfileOpener', 'ℹ️ Bouton beta-dismiss-btn non trouvé (peut-être déjà fermé)');
  }
}

/**
 * Find the first profile grid cell
 * @returns {HTMLElement|null} First grid cell element or null
 */
export function findFirstProfileGridCell() {
  return document.querySelector(SELECTORS.PROFILE_GRIDCELL);
}

/**
 * Verify if profile is opened
 * @returns {boolean} True if profile is opened
 */
export function verifyProfileOpened() {
  const currentURL = window.location.href;
  const urlContainsProfile = currentURL.includes('?profile=true') || currentURL.includes('&profile=true');
  const nextProfileBtn = document.querySelector(SELECTORS.NEXT_PROFILE);
  const tapButton = document.querySelector(SELECTORS.TAP_BUTTON);
  const profileView = document.querySelector(SELECTORS.PROFILE_VIEW);

  return urlContainsProfile || !!(nextProfileBtn || tapButton || profileView);
}

/**
 * Attempt to open profile by clicking on grid cell
 * @param {HTMLElement} gridCell - Grid cell element to click
 * @returns {Promise<boolean>} True if profile opened successfully
 */
export async function attemptProfileClick(gridCell) {
  try {
    logger('info', 'ProfileOpener', '👤 Ouverture du premier profil...');

    // Simple click on the grid cell
    gridCell.click();
    await delay(DELAYS.VERY_LONG);

    // Wait a bit and check if profile opened
    await delay(DELAYS.SECOND);

    return verifyProfileOpened();
  } catch (error) {
    logger('warn', 'ProfileOpener', '⚠️ Erreur lors du clic sur le profil: ' + error.message);
    return false;
  }
}

/**
 * Perform pre-script actions: dismiss banner and open first profile
 * @returns {Promise<boolean>} True if profile opened successfully
 */
export async function performPreScriptActions() {
  try {
    logger('info', 'ProfileOpener', '🔧 Exécution des actions préalables...');

    // 1. Dismiss beta banner
    await dismissBetaBanner();
    await delay(DELAYS.SECOND);

    // 2. Find and click first profile
    const firstGridCell = findFirstProfileGridCell();
    if (!firstGridCell) {
      logger('warn', 'ProfileOpener', '⚠️ Aucun div avec role="gridcell" trouvé');
      return false;
    }

    // 3. Attempt to open profile
    const profileOpened = await attemptProfileClick(firstGridCell);

    if (profileOpened) {
      logger('info', 'ProfileOpener', '✅ Actions préalables terminées - Profil ouvert');
      return true;
    } else {
      logger('warn', 'ProfileOpener', '⚠️ Actions préalables terminées - Profil non ouvert');
      return false;
    }
  } catch (error) {
    logger('warn', 'ProfileOpener', '⚠️ Erreur lors des actions préalables: ' + error.message);
    // In case of error, check if profile is opened anyway
    return verifyProfileOpened();
  }
}

