/**
 * @fileoverview Popup Entry Point for Grindr Auto Tap Extension
 * Coordinates all popup managers and initializes the UI.
 * This is the main orchestrator that brings together:
 * - PopupUI: Status display and confirmations
 * - PopupScriptManager: Script lifecycle control
 * - PopupStorageManager: Settings and credentials
 * - PopupLogManager: Log viewer
 * - PopupTabManager: Tab navigation
 * - Edit mode functionality
 * @module PopupMain
 */

(function() {
  'use strict';

  // Use universal logger from utils/logger.js
  const logger = window.createLogger ? window.createLogger('Popup') : window.logger;

  // Initialize edit mode managers
  let editModeManagers = null;
  if (typeof window.createEditModeManagers === 'function') {
    editModeManagers = window.createEditModeManagers();
    window.editModeManagers = editModeManagers; // Make available globally for tab manager
  }

  /**
   * Initialize all managers and event listeners
   */
  function initialize() {
    logger('info', 'Popup', '📱 Popup de l\'extension ouvert');

    // Initialize managers
    const { PopupStorageManager, PopupScriptManager, PopupLogManager, PopupTabManager } = window;

    if (!PopupStorageManager || !PopupScriptManager || !PopupLogManager || !PopupTabManager) {
      logger('error', 'Popup', '❌ Failed to load popup managers');
      return;
    }

    // Load saved data (don't load webhook display yet - only when tab is active)
    PopupStorageManager.loadSavedData(false);

    // Initialize tabs
    PopupTabManager.initializeTabs();

    // Check script status after short delay (let content script initialize)
    setTimeout(() => {
      PopupScriptManager.checkScriptStatus(0, false);
    }, 100);

    // Initialize event-driven status updates
    PopupScriptManager.initializeStatusCheck();

    // Setup button event listeners
    setupEventListeners();

    // Setup message listeners
    setupMessageListeners();

    // Setup storage change listeners
    setupStorageListeners();
  }

  /**
   * Setup all button event listeners
   */
  function setupEventListeners() {
    const { PopupScriptManager, PopupStorageManager, PopupLogManager } = window;

    // Script control buttons
    const startScriptBtn = document.getElementById('startScript');
    const stopScriptBtn = document.getElementById('stopScript');

    if (startScriptBtn) {
      startScriptBtn.addEventListener('click', () => PopupScriptManager.startScript());
    }

    if (stopScriptBtn) {
      stopScriptBtn.addEventListener('click', () => PopupScriptManager.stopScript());
    }

    // Edit buttons
    const editAuthBtn = document.getElementById('editAuth');
    const editWebhookBtn = document.getElementById('editWebhook');
    const editMinDelayBtn = document.getElementById('editMinDelay');

    if (editAuthBtn && editModeManagers?.auth) {
      editAuthBtn.addEventListener('click', () => editModeManagers.auth.enterEditMode());
    }

    if (editWebhookBtn && editModeManagers?.webhook) {
      editWebhookBtn.addEventListener('click', () => editModeManagers.webhook.enterEditMode());
    }

    if (editMinDelayBtn && editModeManagers?.minDelay) {
      editMinDelayBtn.addEventListener('click', () => editModeManagers.minDelay.enterEditMode());
    }

    // Delete credentials button
    const deleteCredentialsBtn = document.getElementById('deleteCredentials');
    if (deleteCredentialsBtn) {
      deleteCredentialsBtn.addEventListener('click', () => PopupStorageManager.deleteCredentials());
    }

    // Clear logs button
    const clearLogsBtn = document.getElementById('clearLogs');
    if (clearLogsBtn) {
      clearLogsBtn.addEventListener('click', () => PopupLogManager.clearLogs());
    }

    // Login method change
    const loginMethodSelect = document.getElementById('loginMethod');
    if (loginMethodSelect) {
      loginMethodSelect.addEventListener('change', () => PopupStorageManager.handleLoginMethodChange());
    }
  }

  /**
   * Setup Chrome runtime message listeners
   */
  function setupMessageListeners() {
    const { PopupScriptManager } = window;
    const { showStatus } = window.PopupUI || {};

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'updateStatus') {
        showStatus && showStatus(request.message, request.type || 'info');
      } else if (request.action === 'scriptStatusChanged') {
        PopupScriptManager && PopupScriptManager.updateScriptButtons(request.isRunning);
      }
    });
  }

  /**
   * Setup Chrome storage change listeners
   */
  function setupStorageListeners() {
    const { PopupLogManager } = window;

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.extensionLogs) {
        // Reload logs if on logs tab
        const tabLogs = document.getElementById('tabLogs');
        if (tabLogs && tabLogs.classList.contains('active')) {
          PopupLogManager && PopupLogManager.loadLogs();
        }
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    // DOM already loaded
    initialize();
  }
})();
