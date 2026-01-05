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
    const overlay = document.getElementById('confirmModal');
    const messageEl = document.getElementById('confirmMessage');
    const okBtn = document.getElementById('confirmOk');
    const cancelBtn = document.getElementById('confirmCancel');

    if (!overlay || !messageEl || !okBtn || !cancelBtn) return;

    messageEl.textContent = message;
    overlay.classList.add('show');

    const handleOk = () => {
      overlay.classList.remove('show');
      okBtn.removeEventListener('click', handleOk);
      cancelBtn.removeEventListener('click', handleCancel);
      onConfirm();
    };

    const handleCancel = () => {
      overlay.classList.remove('show');
      okBtn.removeEventListener('click', handleOk);
      cancelBtn.removeEventListener('click', handleCancel);
    };

    okBtn.addEventListener('click', handleOk);
    cancelBtn.addEventListener('click', handleCancel);
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
