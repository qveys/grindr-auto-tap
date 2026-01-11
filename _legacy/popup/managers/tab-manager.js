/**
 * @fileoverview Tab Manager for Popup
 * Handles tab switching and edit mode cancellation.
 * @module PopupTabManager
 */

(function() {
  'use strict';

  /**
   * Cancel edit mode without saving
   */
  function cancelEditMode() {
    if (window.editModeManagers) {
      Object.values(window.editModeManagers).forEach(manager => {
        if (manager.isEditing()) {
          manager.cancel();
        }
      });
    }
  }

  /**
   * Initialize tab navigation
   */
  function initializeTabs() {
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Cancel edit mode before switching tabs
        cancelEditMode();

        const targetTab = tab.getAttribute('data-tab');

        // Deactivate all tabs
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));

        // Activate clicked tab
        tab.classList.add('active');
        const targetContent = document.getElementById(`tab${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}`);

        if (targetContent) {
          targetContent.classList.add('active');

          // If webhook tab, reload data
          if (targetTab === 'webhook' && window.PopupStorageManager) {
            requestAnimationFrame(() => {
              window.PopupStorageManager.loadWebhookDisplay();
            });
          }

          // If logs tab, load logs
          if (targetTab === 'logs' && window.PopupLogManager) {
            requestAnimationFrame(() => {
              window.PopupLogManager.loadLogs();
            });
          }
        }
      });
    });
  }

  /**
   * Set up edit mode cancellation on popup close
   */
  function setupEditModeCancellation() {
    // Cancel when popup closes
    window.addEventListener('beforeunload', cancelEditMode);

    // Cancel on page hide (more reliable for popups)
    window.addEventListener('pagehide', cancelEditMode);

    // Cancel on visibility change (when popup is closed)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelEditMode();
      }
    });
  }

  // Export to global scope
  window.PopupTabManager = {
    initializeTabs,
    setupEditModeCancellation,
    cancelEditMode
  };
})();
