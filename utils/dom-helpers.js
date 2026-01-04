/**
 * DOM helper utilities for Grindr Auto Tap extension
 * DOM manipulation and delay functions
 */

(function () {
  'use strict';

  /**
   * Delay execution for a specified number of milliseconds
   * Returns a promise that resolves after the specified delay.
   * Useful for adding delays between automated actions.
   *
   * @param {number} ms - Milliseconds to delay (must be >= 0)
   * @returns {Promise<void>} Promise that resolves after the delay
   *
   * @example
   * // Wait 1 second before continuing
   * await delay(1000);
   * console.log('Waited 1 second');
   *
   * @example
   * // Use with constants
   * await delay(DELAYS.SECOND);
   */
  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get all text nodes from a root element
   * Recursively walks the DOM tree and extracts all non-empty text nodes.
   * Useful for extracting profile information from modal dialogs.
   *
   * @param {Node} root - Root node to start searching from
   * @returns {string[]} Array of trimmed text content strings (empty strings are filtered out)
   *
   * @example
   * const modalRoot = document.querySelector(".MuiModal-root .MuiStack-root");
   * const textNodes = getTextNodes(modalRoot);
   * // textNodes = ["John Doe", "25", "New York", ...]
   *
   * @example
   * // Log profile text content
   * const texts = getTextNodes(profileElement);
   * logger('debug', 'Content', 'Profile text:', texts);
   */
  function getTextNodes(root) {
    const result = [];

    function walk(node) {
      node.childNodes.forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const txt = child.textContent.trim();
          if (txt) result.push(txt);
        } else {
          walk(child);
        }
      });
    }

    walk(root);
    return result;
  }

  // Export to global scope
  window.DOMHelpers = {
    delay,
    getTextNodes
  };
})();

