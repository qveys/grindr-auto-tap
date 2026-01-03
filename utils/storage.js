/**
 * Storage utilities for chrome.storage.local with error handling
 */

/**
 * Get a value from chrome.storage.local
 * @param {string|string[]} keys - Key(s) to retrieve
 * @returns {Promise<Object>} Promise resolving to the stored values
 */
export function getStorage(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Set a value in chrome.storage.local
 * @param {Object} items - Object with key-value pairs to store
 * @returns {Promise<void>}
 */
export function setStorage(items) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Remove keys from chrome.storage.local
 * @param {string|string[]} keys - Key(s) to remove
 * @returns {Promise<void>}
 */
export function removeStorage(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Get credentials from storage
 * @returns {Promise<Object>} Promise resolving to credentials object
 */
export async function getCredentials() {
  const result = await getStorage(['loginMethod', 'grindrEmail', 'grindrPassword', 'autoLogin']);
  return {
    loginMethod: result.loginMethod || 'email',
    email: result.grindrEmail || null,
    password: result.grindrPassword || null,
    autoLogin: result.autoLogin !== false, // true by default
  };
}

/**
 * Get webhook URL from storage
 * @param {string} defaultUrl - Default URL if not found in storage
 * @returns {Promise<string>} Promise resolving to webhook URL
 */
export async function getWebhookURL(defaultUrl) {
  const result = await getStorage(['n8nWebhookURL']);
  return result.n8nWebhookURL || defaultUrl;
}

/**
 * Get auto-start setting from storage
 * @returns {Promise<boolean>} Promise resolving to auto-start boolean
 */
export async function getAutoStart() {
  const result = await getStorage(['autoStart']);
  return result.autoStart !== false; // true by default
}

/**
 * Get minimum delay hours from storage
 * @param {number} defaultHours - Default hours if not found in storage
 * @returns {Promise<number>} Promise resolving to minimum delay hours
 */
export async function getMinDelayHours(defaultHours = 12) {
  const result = await getStorage(['minDelayHours']);
  return result.minDelayHours !== undefined ? result.minDelayHours : defaultHours;
}