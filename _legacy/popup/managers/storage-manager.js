/**
 * @fileoverview Storage Manager for Popup
 * Handles all storage operations: credentials, webhook, settings.
 * @module PopupStorageManager
 */

(function() {
  'use strict';

  const logger = window.createLogger ? window.createLogger('PopupStorageManager') : window.logger;
  const { showStatus } = window.PopupUI || {};
  const { sendToBackground } = window;

  /**
   * Load all saved data
   * @param {boolean} [loadWebhook=true] - Whether to load webhook display
   */
  function loadSavedData(loadWebhook = true) {
    chrome.storage.local.get(['loginMethod', 'grindrEmail', 'grindrPassword', 'autoLogin', 'n8nWebhookURL', 'autoStart', 'minDelayHours'], (result) => {
      // Authentication
      const loginMethod = result.loginMethod || 'email';
      const loginMethodSelect = document.getElementById('loginMethod');
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const autoLoginCheckbox = document.getElementById('autoLogin');
      const webhookURLInput = document.getElementById('webhookURL');
      const autoStartCheckbox = document.getElementById('autoStart');
      const minDelayHoursInput = document.getElementById('minDelayHours');

      if (loginMethodSelect) loginMethodSelect.value = loginMethod;
      if (emailInput && result.grindrEmail) emailInput.value = result.grindrEmail;
      if (passwordInput && result.grindrPassword) passwordInput.value = result.grindrPassword;
      if (autoLoginCheckbox) autoLoginCheckbox.checked = result.autoLogin !== false;

      // Webhook
      if (webhookURLInput) {
        webhookURLInput.value = result.n8nWebhookURL || 'https://n8n.quentinveys.be/webhook/grindr-stats';
      }

      // Auto start
      if (autoStartCheckbox) autoStartCheckbox.checked = result.autoStart !== false;

      // Min delay
      if (minDelayHoursInput) {
        minDelayHoursInput.value = result.minDelayHours !== undefined ? result.minDelayHours : 12;
      }

      // Update displays
      loadAuthDisplay();
      if (loadWebhook) {
        loadWebhookDisplay();
      }
      loadMinDelayDisplay();
    });
  }

  /**
   * Load auth data for display mode
   */
  function loadAuthDisplay() {
    chrome.storage.local.get(['loginMethod', 'grindrEmail', 'grindrPassword', 'autoLogin'], (result) => {
      const loginMethodDisplay = document.getElementById('loginMethodDisplay');
      const emailDisplay = document.getElementById('emailDisplay');
      const emailDisplayRow = document.getElementById('emailDisplayRow');
      const passwordDisplayRow = document.getElementById('passwordDisplayRow');
      const autoLoginDisplay = document.getElementById('autoLoginDisplay');

      const method = result.loginMethod || 'email';
      const methodNames = {
        'email': 'Email',
        'facebook': 'Facebook',
        'google': 'Google',
        'apple': 'Apple'
      };

      if (loginMethodDisplay) {
        loginMethodDisplay.textContent = methodNames[method] || method;
      }

      if (method === 'email' && result.grindrEmail) {
        if (emailDisplay) emailDisplay.textContent = result.grindrEmail;
        if (emailDisplayRow) emailDisplayRow.classList.remove('hidden');
        if (passwordDisplayRow) passwordDisplayRow.classList.remove('hidden');
      } else {
        if (emailDisplayRow) emailDisplayRow.classList.add('hidden');
        if (passwordDisplayRow) passwordDisplayRow.classList.add('hidden');
      }

      if (autoLoginDisplay) {
        autoLoginDisplay.checked = result.autoLogin !== false;
      }
    });
  }

  /**
   * Load auth data for edit mode
   */
  function loadAuthToEdit() {
    chrome.storage.local.get(['loginMethod', 'grindrEmail', 'grindrPassword', 'autoLogin'], (result) => {
      const loginMethodSelect = document.getElementById('loginMethod');
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');
      const autoLoginCheckbox = document.getElementById('autoLogin');

      if (loginMethodSelect) loginMethodSelect.value = result.loginMethod || 'email';
      if (emailInput) emailInput.value = result.grindrEmail || '';
      if (passwordInput) passwordInput.value = result.grindrPassword || '';
      if (autoLoginCheckbox) autoLoginCheckbox.checked = result.autoLogin !== false;

      handleLoginMethodChange();
    });
  }

  /**
   * Load webhook data for display mode
   */
  function loadWebhookDisplay() {
    chrome.storage.local.get(['n8nWebhookURL'], (result) => {
      const webhookURLDisplay = document.getElementById('webhookURLDisplay');
      const webhookDisplay = document.getElementById('webhookDisplay');
      const webhookEdit = document.getElementById('webhookEdit');
      const tabWebhook = document.getElementById('tabWebhook');

      const url = result.n8nWebhookURL || 'https://n8n.quentinveys.be/webhook/grindr-stats';

      // Only load if tab is active
      if (!tabWebhook || !tabWebhook.classList.contains('active')) {
        return;
      }

      if (webhookURLDisplay) {
        webhookURLDisplay.textContent = url;
      }

      // Only force display mode if not already in edit mode
      if (webhookEdit && !webhookEdit.classList.contains('hidden')) {
        return;
      }

      // Ensure display mode is visible
      if (webhookDisplay && webhookDisplay.classList.contains('hidden')) {
        webhookDisplay.classList.remove('hidden');
      }
      if (webhookEdit && !webhookEdit.classList.contains('hidden')) {
        webhookEdit.classList.add('hidden');
      }
    });
  }

  /**
   * Load webhook data for edit mode
   */
  function loadWebhookToEdit() {
    chrome.storage.local.get(['n8nWebhookURL'], (result) => {
      const webhookURLInput = document.getElementById('webhookURL');
      if (webhookURLInput) {
        webhookURLInput.value = result.n8nWebhookURL || 'https://n8n.quentinveys.be/webhook/grindr-stats';
      }
    });
  }

  /**
   * Load min delay data for display mode
   */
  function loadMinDelayDisplay() {
    chrome.storage.local.get(['minDelayHours'], (result) => {
      const minDelayDisplay = document.getElementById('minDelayDisplay');
      if (minDelayDisplay) {
        minDelayDisplay.textContent = result.minDelayHours !== undefined ? result.minDelayHours : 12;
      }
    });
  }

  /**
   * Load min delay data for edit mode
   */
  function loadMinDelayToEdit() {
    chrome.storage.local.get(['minDelayHours'], (result) => {
      const minDelayHoursInput = document.getElementById('minDelayHours');
      if (minDelayHoursInput) {
        minDelayHoursInput.value = result.minDelayHours !== undefined ? result.minDelayHours : 12;
      }
    });
  }

  /**
   * Save credentials
   */
  function saveCredentials() {
    const loginMethodSelect = document.getElementById('loginMethod');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const autoLoginCheckbox = document.getElementById('autoLogin');

    if (!loginMethodSelect || !emailInput || !passwordInput || !autoLoginCheckbox) return;

    const loginMethod = loginMethodSelect.value;
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();
    const autoLogin = autoLoginCheckbox.checked;

    // Validate fields only for email method
    if (loginMethod === 'email' && (!email || !password)) {
      showStatus && showStatus('⚠️ Veuillez remplir tous les champs', 'error');
      return;
    }

    if (!sendToBackground) return;

    sendToBackground({
      action: 'saveCredentials',
      loginMethod: loginMethod,
      email: email,
      password: password,
      autoLogin: autoLogin
    }).then((response) => {
      if (response.success) {
        showStatus && showStatus('✅ Configuration sauvegardée', 'success');
        logger && logger('info', 'PopupStorageManager', `✅ Configuration saved (method: ${loginMethod}, auto-login: ${autoLogin})`);
        // Exit edit mode
        if (window.editModeManagers && window.editModeManagers.auth) {
          window.editModeManagers.auth.exitEditMode();
        }
        loadAuthDisplay();
      } else {
        showStatus && showStatus('❌ Erreur lors de la sauvegarde', 'error');
        logger && logger('error', 'PopupStorageManager', `❌ Save error: ${response.error}`);
      }
    });
  }

  /**
   * Delete credentials
   */
  function deleteCredentials() {
    const { showConfirm } = window.PopupUI || {};
    if (!showConfirm || !sendToBackground) return;

    showConfirm('Êtes-vous sûr de vouloir supprimer la configuration ?', () => {
      sendToBackground({ action: 'deleteCredentials' }).then((response) => {
        if (response.success) {
          showStatus && showStatus('✅ Configuration supprimée', 'success');
          logger && logger('info', 'PopupStorageManager', '✅ Configuration deleted');

          const loginMethodSelect = document.getElementById('loginMethod');
          const emailInput = document.getElementById('email');
          const passwordInput = document.getElementById('password');
          const autoLoginCheckbox = document.getElementById('autoLogin');

          if (loginMethodSelect) loginMethodSelect.value = 'email';
          if (emailInput) emailInput.value = '';
          if (passwordInput) passwordInput.value = '';
          if (autoLoginCheckbox) autoLoginCheckbox.checked = true;

          toggleEditMode('auth');
          loadAuthDisplay();
        } else {
          showStatus && showStatus('❌ Erreur lors de la suppression', 'error');
          logger && logger('error', 'PopupStorageManager', `❌ Error: ${response.error}`);
        }
      });
    });
  }

  /**
   * Save webhook URL
   */
  function saveWebhook() {
    const webhookURLInput = document.getElementById('webhookURL');
    if (!webhookURLInput || !sendToBackground) return;

    const url = webhookURLInput.value.trim();

    if (!url) {
      showStatus && showStatus('⚠️ Veuillez entrer une URL valide', 'error');
      return;
    }

    try {
      new URL(url);
    } catch (e) {
      showStatus && showStatus('❌ URL invalide', 'error');
      return;
    }

    sendToBackground({
      action: 'saveWebhookURL',
      url: url
    }).then((response) => {
      if (response.success) {
        showStatus && showStatus('✅ URL sauvegardée', 'success');
        logger && logger('info', 'PopupStorageManager', `✅ Webhook URL updated: ${url}`);
        // Exit edit mode
        if (window.editModeManagers && window.editModeManagers.webhook) {
          window.editModeManagers.webhook.exitEditMode();
        }
        loadWebhookDisplay();
      } else {
        showStatus && showStatus('❌ Erreur lors de la sauvegarde', 'error');
        logger && logger('error', 'PopupStorageManager', `❌ Error: ${response.error}`);
      }
    });
  }

  /**
   * Save min delay
   */
  function saveMinDelay() {
    const minDelayHoursInput = document.getElementById('minDelayHours');
    if (!minDelayHoursInput) return;

    const hours = parseFloat(minDelayHoursInput.value);

    if (isNaN(hours) || hours < 0) {
      showStatus && showStatus('❌ Nombre invalide (≥ 0)', 'error');
      return;
    }

    chrome.storage.local.set({ minDelayHours: hours }, () => {
      if (chrome.runtime.lastError) {
        showStatus && showStatus('❌ Erreur lors de la sauvegarde', 'error');
        logger && logger('error', 'PopupStorageManager', '❌ Min delay save error: ' + chrome.runtime.lastError.message);
      } else {
        showStatus && showStatus(`✅ Délai sauvegardé: ${hours}h`, 'success');
        logger && logger('info', 'PopupStorageManager', `✅ Min delay updated: ${hours}h`);
        // Exit edit mode
        if (window.editModeManagers && window.editModeManagers.minDelay) {
          window.editModeManagers.minDelay.exitEditMode();
        }
        loadMinDelayDisplay();
      }
    });
  }

  /**
   * Save auto start setting
   */
  function saveAutoStart() {
    const autoStartCheckbox = document.getElementById('autoStart');
    if (!autoStartCheckbox) return;

    const autoStart = autoStartCheckbox.checked;
    chrome.storage.local.set({ autoStart: autoStart }, () => {
      if (chrome.runtime.lastError) {
        showStatus && showStatus('❌ Erreur lors de la sauvegarde', 'error');
        logger && logger('error', 'PopupStorageManager', '❌ Auto-start save error: ' + chrome.runtime.lastError.message);
      } else {
        showStatus && showStatus(autoStart ? '✅ Démarrage automatique activé' : '✅ Démarrage automatique désactivé', 'success');
        logger && logger('info', 'PopupStorageManager', autoStart ? '✅ Auto-start enabled' : '✅ Auto-start disabled');
      }
    });
  }

  /**
   * Handle login method change
   */
  function handleLoginMethodChange() {
    const loginMethodSelect = document.getElementById('loginMethod');
    const credentialsFields = document.getElementById('credentialsFields');

    if (!loginMethodSelect || !credentialsFields) return;

    const method = loginMethodSelect.value;
    if (method === 'email') {
      credentialsFields.classList.remove('hidden');
    } else {
      credentialsFields.classList.add('hidden');
    }
  }

  /**
   * Toggle edit mode
   * @param {string} section - Section to toggle
   */
  function toggleEditMode(section) {
    if (window.editModeManagers && window.editModeManagers[section]) {
      window.editModeManagers[section].toggle();
    }
  }

  // Export to global scope
  window.PopupStorageManager = {
    loadSavedData,
    loadAuthDisplay,
    loadAuthToEdit,
    loadWebhookDisplay,
    loadWebhookToEdit,
    loadMinDelayDisplay,
    loadMinDelayToEdit,
    saveCredentials,
    deleteCredentials,
    saveWebhook,
    saveMinDelay,
    saveAutoStart,
    handleLoginMethodChange,
    toggleEditMode
  };
})();
