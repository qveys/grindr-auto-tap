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