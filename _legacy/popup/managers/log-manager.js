/**
 * @fileoverview Log Manager for Popup
 * Handles log loading, display, and clearing.
 * @module PopupLogManager
 */

(function() {
  'use strict';

  const logger = window.createLogger ? window.createLogger('PopupLogManager') : window.logger;
  const { showStatus, showConfirm, formatTimestamp } = window.PopupUI || {};
  const { sendToBackground } = window;

  /**
   * Load logs from background
   */
  async function loadLogs() {
    const logsContainer = document.getElementById('logsContainer');
    if (!logsContainer || !sendToBackground) return;

    const response = await sendToBackground({ action: 'getLogs' });

    if (!response.success) {
      logsContainer.innerHTML = '<div style="color: var(--color-error); padding: var(--spacing-md); text-align: center;">Erreur lors du chargement des logs</div>';
      logger && logger('error', 'PopupLogManager', `Failed to load logs: ${response.error}`);
      return;
    }

    const logs = response.data?.logs || [];

    if (logs.length === 0) {
      logsContainer.innerHTML = '<div style="color: var(--color-text-muted); text-align: center; padding: var(--spacing-md);">Aucun log disponible</div>';
      return;
    }

    // Sort logs by timestamp (oldest first)
    logs.sort((a, b) => a.timestamp - b.timestamp);

    // Display logs using DOM methods
    logsContainer.textContent = ''; // Clear container
    const fragment = document.createDocumentFragment();

    logs.forEach(log => {
      const timestamp = formatTimestamp ? formatTimestamp(log.timestamp) : new Date(log.timestamp).toLocaleString();
      const levelRaw = (log.level || 'info').toString();
      const level = levelRaw.replace(/[^a-zA-Z0-9-]/g, '');
      const levelDisplay = levelRaw.toUpperCase();
      const location = log.location || 'unknown';
      const message = log.message || '';
      let dataStr = '';

      if (log.data) {
        try {
          if (log.data instanceof Error) {
            dataStr = log.data.toString();
          } else {
            dataStr = JSON.stringify(log.data, null, 2);
          }
        } catch (e) {
          dataStr = String(log.data);
        }
      }

      const logEntry = document.createElement('div');
      logEntry.className = `log-entry log-${level}`;

      const timestampSpan = document.createElement('span');
      timestampSpan.className = 'log-timestamp';
      timestampSpan.textContent = timestamp;
      logEntry.appendChild(timestampSpan);

      const levelSpan = document.createElement('span');
      levelSpan.className = `log-level ${level}`;
      levelSpan.textContent = levelDisplay;
      logEntry.appendChild(levelSpan);

      const locationSpan = document.createElement('span');
      locationSpan.className = 'log-location';
      locationSpan.textContent = `[${location}]`;
      logEntry.appendChild(locationSpan);

      const messageSpan = document.createElement('span');
      messageSpan.className = 'log-message';
      messageSpan.textContent = message;
      logEntry.appendChild(messageSpan);

      if (dataStr) {
        const dataDiv = document.createElement('div');
        dataDiv.className = 'log-data';
        dataDiv.textContent = dataStr;
        logEntry.appendChild(dataDiv);
      }

      fragment.appendChild(logEntry);
    });

    logsContainer.appendChild(fragment);

    // Auto-scroll to bottom
    scrollLogsToBottom();
  }

  /**
   * Scroll logs container to bottom
   */
  function scrollLogsToBottom() {
    const logsContainer = document.getElementById('logsContainer');
    if (logsContainer) {
      requestAnimationFrame(() => {
        logsContainer.scrollTop = logsContainer.scrollHeight;
      });
    }
  }

  /**
   * Clear all logs
   */
  async function clearLogs() {
    if (!showConfirm || !sendToBackground) {
      logger && logger('error', 'PopupLogManager', 'showConfirm or sendToBackground not available');
      return;
    }

    showConfirm('Êtes-vous sûr de vouloir effacer tous les logs ?', async () => {
      const logsContainer = document.getElementById('logsContainer');
      if (!logsContainer) return;

      // Immediate visual feedback
      logsContainer.innerHTML = '<div style="color: var(--color-text-muted); text-align: center; padding: var(--spacing-md);">Suppression en cours...</div>';

      const response = await sendToBackground({ action: 'clearLogs' });

      if (response.success) {
        showStatus && showStatus('✅ Logs effacés', 'success');
        logsContainer.innerHTML = '<div style="color: var(--color-text-muted); text-align: center; padding: var(--spacing-md);">Aucun log disponible</div>';
        // Reload to ensure sync with storage
        setTimeout(() => {
          loadLogs();
        }, 50);
      } else {
        showStatus && showStatus('❌ Erreur lors de l\'effacement', 'error');
        logger && logger('error', 'PopupLogManager', `❌ Error: ${response.error}`);
        // Reload logs on error
        loadLogs();
      }
    });
  }

  /**
   * Download logs as NDJSON file
   */
  async function downloadLogs() {
    if (!sendToBackground) {
      logger && logger('error', 'PopupLogManager', 'sendToBackground not available');
      return;
    }

    const response = await sendToBackground({ action: 'getLogs' });

    if (!response.success) {
      showStatus && showStatus('❌ Erreur lors du chargement des logs', 'error');
      logger && logger('error', 'PopupLogManager', `Failed to load logs: ${response.error}`);
      return;
    }

    const logs = response.data?.logs || [];

    if (logs.length === 0) {
      showStatus && showStatus('ℹ️ Aucun log à télécharger', 'info');
      return;
    }

    try {
      // Convert to NDJSON format
      const ndjson = logs.map(log => JSON.stringify(log)).join('\n');

      // Create blob and download
      const blob = new Blob([ndjson], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      a.download = `grindr-auto-tap-logs-${timestamp}.ndjson`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showStatus && showStatus(`✅ ${logs.length} logs téléchargés`, 'success');
      logger && logger('info', 'PopupLogManager', `Downloaded ${logs.length} logs`);
    } catch (error) {
      showStatus && showStatus('❌ Erreur lors du téléchargement', 'error');
      logger && logger('error', 'PopupLogManager', `Download error: ${error.message}`);
    }
  }

  // Export to global scope
  window.PopupLogManager = {
    loadLogs,
    clearLogs,
    downloadLogs,
    scrollLogsToBottom
  };
})();
