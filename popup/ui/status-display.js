/**
 * @fileoverview UI Status Display for Popup
 * Handles status messages, confirmations, and formatting utilities.
 * @module PopupUI
 */

(function() {
  'use strict';

  /**
   * Show status message
   * @param {string} message - Message to display
   * @param {string} [type='info'] - Message type: info, success, error
   */
  function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) return;

    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    const timeout = (window.STATUS_TIMEOUTS && window.STATUS_TIMEOUTS[type.toUpperCase()]) || (window.STATUS_TIMEOUTS && window.STATUS_TIMEOUTS.INFO) || 4000;

    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, timeout);
  }

  /**
   * Show confirmation dialog
   * @param {string} message - Confirmation message
   * @param {Function} onConfirm - Callback when confirmed
   */
  function showConfirm(message, onConfirm) {
    const overlay = document.getElementById('confirmOverlay');
    const messageEl = document.getElementById('confirmMessage');
    const yesBtn = document.getElementById('confirmYes');
    const noBtn = document.getElementById('confirmNo');

    if (!overlay || !messageEl) return;

    messageEl.textContent = message;
    overlay.style.display = 'flex';

    const handleYes = () => {
      overlay.style.display = 'none';
      yesBtn.removeEventListener('click', handleYes);
      noBtn.removeEventListener('click', handleNo);
      onConfirm();
    };

    const handleNo = () => {
      overlay.style.display = 'none';
      yesBtn.removeEventListener('click', handleYes);
      noBtn.removeEventListener('click', handleNo);
    };

    yesBtn.addEventListener('click', handleYes);
    noBtn.addEventListener('click', handleNo);
  }

  /**
   * Format timestamp to readable string
   * @param {number} timestamp - Timestamp in milliseconds
   * @returns {string} Formatted timestamp
   */
  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const milliseconds = String(date.getMilliseconds()).padStart(3, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}.${milliseconds}`;
  }

  /**
   * Escape HTML special characters
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Export to global scope
  window.PopupUI = {
    showStatus,
    showConfirm,
    formatTimestamp,
    escapeHtml
  };
})();
