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
 * Check if profile is currently displayed
 * @returns {boolean} True if profile is visible, false otherwise
 */
function isProfileVisible() {
  const profileView = document.querySelector(SELECTORS.PROFILE_VIEW);
  return profileView !== null;
}

/**
 * Find the tap button on current profile
 * @returns {Element|null} Tap button element or null if not found
 */
function findTapButton() {
  const tapButton = document.querySelector(SELECTORS.TAP_BUTTON);
  if (tapButton) {
    logger('debug', 'findTapButton', 'Tap button found');
    return tapButton;
  }
  logger('debug', 'findTapButton', 'Tap button not found');
  return null;
}

/**
 * Click the tap button on current profile
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function clickTapButton() {
  try {
    const tapButton = findTapButton();
    if (!tapButton) {
      logger('warn', 'clickTapButton', 'Tap button not found on current profile');
      return false;
    }

    await delay(DELAYS.NORMAL);
    tapButton.click();
    logger('info', 'clickTapButton', 'Tap button clicked');
    return true;
  } catch (error) {
    logger('error', 'clickTapButton', 'Failed to click tap button', { error: error.message });
    return false;
  }
}

/**
 * Wait for next profile to load after tapping
 * @returns {Promise<boolean>} True if next profile loaded, false on timeout
 */
async function waitForNextProfile() {
  try {
    const startTime = Date.now();
    const timeout = TIMEOUTS.BUTTON_WAIT;
    let previousProfile = document.querySelector(SELECTORS.PROFILE_VIEW);

    while (Date.now() - startTime < timeout) {
      await delay(DELAYS.MEDIUM);
      const currentProfile = document.querySelector(SELECTORS.PROFILE_VIEW);

      // Check if profile changed
      if (currentProfile !== previousProfile) {
        logger('info', 'waitForNextProfile', 'Next profile loaded');
        return true;
      }
    }

    logger('warn', 'waitForNextProfile', 'Next profile did not load in time');
    return false;
  } catch (error) {
    logger('error', 'waitForNextProfile', 'Failed to wait for next profile', { error: error.message });
    return false;
  }
}

/**
 * Perform single tap action (tap and wait for next profile)
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function performSingleTap() {
  try {
    logger('info', 'performSingleTap', 'Performing single tap action');

    if (!isProfileVisible()) {
      logger('warn', 'performSingleTap', 'No profile visible');
      return false;
    }

    const clicked = await clickTapButton();
    if (!clicked) {
      logger('warn', 'performSingleTap', 'Failed to click tap button');
      return false;
    }

    const loaded = await waitForNextProfile();
    if (!loaded) {
      logger('warn', 'performSingleTap', 'Next profile did not load');
      return false;
    }

    logger('info', 'performSingleTap', 'Single tap completed successfully');
    return true;
  } catch (error) {
    logger('error', 'performSingleTap', 'Single tap failed', { error: error.message });
    return false;
  }
}

// Export for ES6 modules
export {
  isProfileVisible,
  findTapButton,
  clickTapButton,
  waitForNextProfile,
  performSingleTap,
};