// Popup script pour gérer l'interface utilisateur avec mode affichage/édition

// Initialize edit mode managers
let editModeManagers = null;
if (typeof createEditModeManagers === 'function') {
  editModeManagers = createEditModeManagers();
}

// Logger function pour le popup
function logger(level, location, message, data = null) {
  const logEntry = {
    timestamp: Date.now(),
    level: level,
    location: location || 'Popup',
    message: message,
    data: data
  };

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

// Éléments DOM
const loginMethodSelect = document.getElementById('loginMethod');
const credentialsFields = document.getElementById('credentialsFields');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const autoLoginCheckbox = document.getElementById('autoLogin');
const autoStartCheckbox = document.getElementById('autoStart');
const minDelayHoursInput = document.getElementById('minDelayHours');
const webhookURLInput = document.getElementById('webhookURL');
const startScriptBtn = document.getElementById('startScript');
const stopScriptBtn = document.getElementById('stopScript');
const statusDiv = document.getElementById('status');

// Éléments d'affichage
const authDisplay = document.getElementById('authDisplay');
const authEdit = document.getElementById('authEdit');
const webhookDisplay = document.getElementById('webhookDisplay');
const webhookEdit = document.getElementById('webhookEdit');
const minDelayEdit = document.getElementById('minDelayEdit');

const loginMethodDisplay = document.getElementById('loginMethodDisplay');
const emailDisplay = document.getElementById('emailDisplay');
const emailDisplayRow = document.getElementById('emailDisplayRow');
const passwordDisplay = document.getElementById('passwordDisplay');
const passwordDisplayRow = document.getElementById('passwordDisplayRow');
const autoLoginDisplay = document.getElementById('autoLoginDisplay');
const webhookURLDisplay = document.getElementById('webhookURLDisplay');
const minDelayDisplay = document.getElementById('minDelayDisplay');

// Boutons d'édition (seront remplacés par les boutons de sauvegarde en mode édition)
const editAuthBtn = document.getElementById('editAuth');
const editWebhookBtn = document.getElementById('editWebhook');
const editMinDelayBtn = document.getElementById('editMinDelay');
const deleteCredentialsBtn = document.getElementById('deleteCredentials');
const clearLogsBtn = document.getElementById('clearLogs');
const logsContainer = document.getElementById('logsContainer');

// Charger les données sauvegardées au démarrage (sans charger le webhook display si le tab n'est pas actif)
loadSavedData(false); // Passer false pour ne pas charger le webhook display au démarrage

// Vérifier l'état du script au chargement (avec un petit délai pour laisser le content script s'initialiser)
setTimeout(() => {
  checkScriptStatus(0, false);
}, 100);

// Vérifier périodiquement l'état du script pour rester synchronisé
// Cela permet de détecter les changements même si le popup était fermé lors du démarrage automatique
// Passer true pour isPeriodicCheck pour éviter les logs répétitifs
// Interval défini dans shared-constants.js (LOGGING.STATUS_CHECK_INTERVAL)
const statusCheckInterval = setInterval(() => {
  checkScriptStatus(0, true);
}, LOGGING.STATUS_CHECK_INTERVAL);

// Nettoyer l'intervalle quand le popup se ferme
window.addEventListener('beforeunload', () => {
  if (statusCheckInterval) {
    clearInterval(statusCheckInterval);
  }
});

// Logger le chargement du popup
logger('info', 'Popup', '📱 Popup de l\'extension ouvert');

// Initialiser les tabs (script chargé à la fin du body, DOM déjà disponible)
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Fonction pour annuler le mode édition sans sauvegarder
function cancelEditMode() {
  if (editModeManagers) {
    Object.values(editModeManagers).forEach(manager => {
      if (manager.isEditing()) {
        manager.cancel();
      }
    });
  }
}

// Gestion des tabs
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // Annuler le mode édition avant de changer de tab
    cancelEditMode();

    const targetTab = tab.getAttribute('data-tab');

    // Désactiver tous les tabs
    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(tc => tc.classList.remove('active'));

    // Activer le tab cliqué
    tab.classList.add('active');
    const targetContent = document.getElementById(`tab${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}`);
    if (targetContent) {
      targetContent.classList.add('active');

      // Si c'est le tab webhook, recharger les données
      if (targetTab === 'webhook') {
        requestAnimationFrame(() => {
          loadWebhookDisplay();
        });
      }

      // Si c'est le tab logs, charger les logs
      if (targetTab === 'logs') {
        requestAnimationFrame(() => {
          loadLogs();
        });
      }
    }
  });
});

// Annuler le mode édition quand le popup se ferme
window.addEventListener('beforeunload', () => {
  cancelEditMode();
});

// Annuler aussi lors de la fermeture de la page (plus fiable pour les popups)
window.addEventListener('pagehide', () => {
  cancelEditMode();
});

// Annuler lors de la perte de visibilité (quand le popup est fermé)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelEditMode();
  }
});

// Écouteurs d'événements
loginMethodSelect.addEventListener('change', handleLoginMethodChange);
deleteCredentialsBtn.addEventListener('click', deleteCredentials);
startScriptBtn.addEventListener('click', startScript);
stopScriptBtn.addEventListener('click', stopScript);
autoStartCheckbox.addEventListener('change', saveAutoStart);

// Boutons d'édition
editAuthBtn.addEventListener('click', () => toggleEditMode('auth'));
editWebhookBtn.addEventListener('click', () => toggleEditMode('webhook'));
editMinDelayBtn.addEventListener('click', () => toggleEditMode('minDelay'));
clearLogsBtn.addEventListener('click', clearLogs);

// Gérer le changement de méthode de connexion
function handleLoginMethodChange() {
  const method = loginMethodSelect.value;
  if (method === 'email') {
    credentialsFields.classList.remove('hidden');
  } else {
    credentialsFields.classList.add('hidden');
  }
}

// Basculer entre mode affichage et édition
function toggleEditMode(section) {
  if (editModeManagers && editModeManagers[section]) {
    editModeManagers[section].toggle();
  }
}

// Fonction pour charger les données sauvegardées
function loadSavedData(loadWebhook = true) {
  // Charger la méthode de connexion
  chrome.storage.local.get(['loginMethod', 'grindrEmail', 'grindrPassword', 'autoLogin', 'n8nWebhookURL', 'autoStart', 'minDelayHours'], (result) => {
    // Authentification
    const loginMethod = result.loginMethod || 'email';
    loginMethodSelect.value = loginMethod;

    if (result.grindrEmail) {
      emailInput.value = result.grindrEmail;
    }
    if (result.grindrPassword) {
      passwordInput.value = result.grindrPassword;
    }
    autoLoginCheckbox.checked = result.autoLogin !== false;

    // Webhook
    webhookURLInput.value = result.n8nWebhookURL || 'https://n8n.quentinveys.be/webhook/grindr-stats';

    // Auto start
    autoStartCheckbox.checked = result.autoStart !== false;

    // Min delay
    minDelayHoursInput.value = result.minDelayHours !== undefined ? result.minDelayHours : 12;

    // Mettre à jour l'affichage
    loadAuthDisplay();
    if (loadWebhook) {
      loadWebhookDisplay();
    }
    loadMinDelayDisplay();
  });
}

// Charger les données d'authentification pour l'affichage
function loadAuthDisplay() {
  chrome.storage.local.get(['loginMethod', 'grindrEmail', 'grindrPassword', 'autoLogin'], (result) => {
    const method = result.loginMethod || 'email';
    const methodNames = {
      'email': 'Email',
      'facebook': 'Facebook',
      'google': 'Google',
      'apple': 'Apple'
    };
    loginMethodDisplay.textContent = methodNames[method] || method;

    if (method === 'email' && result.grindrEmail) {
      emailDisplay.textContent = result.grindrEmail;
      emailDisplayRow.classList.remove('hidden');
      passwordDisplayRow.classList.remove('hidden');
    } else {
      emailDisplayRow.classList.add('hidden');
      passwordDisplayRow.classList.add('hidden');
    }

    autoLoginDisplay.checked = result.autoLogin !== false;
  });
}

// Charger les données d'authentification pour l'édition
function loadAuthToEdit() {
  chrome.storage.local.get(['loginMethod', 'grindrEmail', 'grindrPassword', 'autoLogin'], (result) => {
    loginMethodSelect.value = result.loginMethod || 'email';
    emailInput.value = result.grindrEmail || '';
    passwordInput.value = result.grindrPassword || '';
    autoLoginCheckbox.checked = result.autoLogin !== false;
    handleLoginMethodChange();
  });
}

// Charger les données webhook pour l'affichage
function loadWebhookDisplay() {
  chrome.storage.local.get(['n8nWebhookURL'], (result) => {
    const url = result.n8nWebhookURL || 'https://n8n.quentinveys.be/webhook/grindr-stats';

    // Ne charger que si le tab est actif
    const tabWebhook = document.getElementById('tabWebhook');
    if (!tabWebhook || !tabWebhook.classList.contains('active')) {
      return;
    }

    if (webhookURLDisplay) {
      webhookURLDisplay.textContent = url;
    }

    // Ne forcer le mode affichage QUE si on n'est pas déjà en mode édition
    // Si webhookEdit est visible, on est en mode édition, donc ne rien faire
    if (webhookEdit && !webhookEdit.classList.contains('hidden')) {
      // On est en mode édition, ne pas toucher à l'affichage
      return;
    }

    // S'assurer que le mode affichage est visible
    if (webhookDisplay) {
      if (webhookDisplay.classList.contains('hidden')) {
        webhookDisplay.classList.remove('hidden');
      }
    }
    if (webhookEdit && !webhookEdit.classList.contains('hidden')) {
      webhookEdit.classList.add('hidden');
    }
  });
}

// Charger les données webhook pour l'édition
function loadWebhookToEdit() {
  chrome.storage.local.get(['n8nWebhookURL'], (result) => {
    webhookURLInput.value = result.n8nWebhookURL || 'https://n8n.quentinveys.be/webhook/grindr-stats';
  });
}

// Charger les données minDelay pour l'affichage
function loadMinDelayDisplay() {
  chrome.storage.local.get(['minDelayHours'], (result) => {
    minDelayDisplay.textContent = result.minDelayHours !== undefined ? result.minDelayHours : 12;
  });
}

// Charger les données minDelay pour l'édition
function loadMinDelayToEdit() {
  chrome.storage.local.get(['minDelayHours'], (result) => {
    minDelayHoursInput.value = result.minDelayHours !== undefined ? result.minDelayHours : 12;
  });
}

// Fonction pour sauvegarder les identifiants
function saveCredentials() {
  const loginMethod = loginMethodSelect.value;
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  const autoLogin = autoLoginCheckbox.checked;

  // Valider les champs seulement pour la méthode email
  if (loginMethod === 'email' && (!email || !password)) {
    showStatus('⚠️ Veuillez remplir tous les champs', 'error');
    return;
  }

  chrome.runtime.sendMessage({
    action: 'saveCredentials',
    loginMethod: loginMethod,
    email: email,
    password: password,
    autoLogin: autoLogin
  }, (response) => {
    if (chrome.runtime.lastError) {
      showStatus('❌ Erreur: ' + chrome.runtime.lastError.message, 'error');
      logger('error', 'Popup', '❌ Erreur lors de la sauvegarde des identifiants: ' + chrome.runtime.lastError.message);
    } else if (response && response.success) {
      showStatus('✅ Configuration sauvegardée', 'success');
      logger('info', 'Popup', `✅ Configuration d'authentification sauvegardée (méthode: ${loginMethod}, auto-login: ${autoLogin})`);
      // Sortir du mode édition
      if (editModeManagers && editModeManagers.auth) {
        editModeManagers.auth.exitEditMode();
      }
      loadAuthDisplay();
    } else {
      showStatus('❌ Erreur lors de la sauvegarde', 'error');
      logger('error', 'Popup', '❌ Erreur lors de la sauvegarde des identifiants');
    }
  });
}

// Fonction pour afficher une confirmation personnalisée
function showConfirm(message, onConfirm) {
  const modal = document.getElementById('confirmModal');
  const messageEl = document.getElementById('confirmMessage');
  const cancelBtn = document.getElementById('confirmCancel');
  const okBtn = document.getElementById('confirmOk');

  messageEl.textContent = message;
  modal.classList.add('show');

  const cleanup = () => {
    modal.classList.remove('show');
    cancelBtn.removeEventListener('click', onCancel);
    okBtn.removeEventListener('click', onOk);
  };

  const onCancel = () => {
    cleanup();
  };

  const onOk = () => {
    cleanup();
    onConfirm();
  };

  cancelBtn.addEventListener('click', onCancel);
  okBtn.addEventListener('click', onOk);
}

// Fonction pour supprimer les identifiants
function deleteCredentials() {
  showConfirm('Êtes-vous sûr de vouloir supprimer la configuration ?', () => {
    chrome.runtime.sendMessage({ action: 'deleteCredentials' }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('❌ Erreur: ' + chrome.runtime.lastError.message, 'error');
        logger('error', 'Popup', '❌ Erreur lors de la suppression des identifiants: ' + chrome.runtime.lastError.message);
      } else if (response && response.success) {
        showStatus('✅ Configuration supprimée', 'success');
        logger('info', 'Popup', '✅ Configuration d\'authentification supprimée');
        loginMethodSelect.value = 'email';
        emailInput.value = '';
        passwordInput.value = '';
        autoLoginCheckbox.checked = true;
        toggleEditMode('auth');
        loadAuthDisplay();
      } else {
        showStatus('❌ Erreur lors de la suppression', 'error');
        logger('error', 'Popup', '❌ Erreur lors de la suppression des identifiants');
      }
    });
  });
}

// Fonction pour sauvegarder l'URL du webhook
function saveWebhook() {
  const url = webhookURLInput.value.trim();

  if (!url) {
    showStatus('⚠️ Veuillez entrer une URL valide', 'error');
    return;
  }

  try {
    new URL(url);
  } catch (e) {
    showStatus('❌ URL invalide', 'error');
    return;
  }

  chrome.runtime.sendMessage({
    action: 'saveWebhookURL',
    url: url
  }, (response) => {
    if (chrome.runtime.lastError) {
      showStatus('❌ Erreur: ' + chrome.runtime.lastError.message, 'error');
      logger('error', 'Popup', '❌ Erreur lors de la sauvegarde de l\'URL webhook: ' + chrome.runtime.lastError.message);
    } else if (response && response.success) {
      showStatus('✅ URL sauvegardée', 'success');
      logger('info', 'Popup', `✅ URL webhook n8n mise à jour: ${url}`);
      // Sortir du mode édition
      if (editModeManagers && editModeManagers.webhook) {
        editModeManagers.webhook.exitEditMode();
      }
      loadWebhookDisplay();
    } else {
      showStatus('❌ Erreur lors de la sauvegarde', 'error');
      logger('error', 'Popup', '❌ Erreur lors de la sauvegarde de l\'URL webhook');
    }
  });
}

// Fonction pour sauvegarder le délai minimum
function saveMinDelay() {
  const hours = parseFloat(minDelayHoursInput.value);

  if (isNaN(hours) || hours < 0) {
    showStatus('❌ Nombre invalide (≥ 0)', 'error');
    return;
  }

  chrome.storage.local.set({ minDelayHours: hours }, () => {
    if (chrome.runtime.lastError) {
      showStatus('❌ Erreur lors de la sauvegarde', 'error');
      logger('error', 'Popup', '❌ Erreur lors de la sauvegarde du délai minimum: ' + chrome.runtime.lastError.message);
    } else {
      showStatus(`✅ Délai sauvegardé: ${hours}h`, 'success');
      logger('info', 'Popup', `✅ Délai minimum mis à jour: ${hours}h`);
      // Sortir du mode édition
      if (editModeManagers && editModeManagers.minDelay) {
        editModeManagers.minDelay.exitEditMode();
      }
      loadMinDelayDisplay();
    }
  });
}

// Fonction pour sauvegarder l'option de démarrage automatique
function saveAutoStart() {
  const autoStart = autoStartCheckbox.checked;
  chrome.storage.local.set({ autoStart: autoStart }, () => {
    if (chrome.runtime.lastError) {
      showStatus('❌ Erreur lors de la sauvegarde', 'error');
      logger('error', 'Popup', '❌ Erreur lors de la sauvegarde du démarrage automatique: ' + chrome.runtime.lastError.message);
    } else {
      showStatus(autoStart ? '✅ Démarrage automatique activé' : '✅ Démarrage automatique désactivé', 'success');
      logger('info', 'Popup', autoStart ? '✅ Démarrage automatique activé' : '✅ Démarrage automatique désactivé');
    }
  });
}

// Fonction pour mettre à jour l'affichage des boutons selon l'état
function updateScriptButtons(isRunning) {
  if (isRunning) {
    startScriptBtn.classList.add('hidden');
    stopScriptBtn.classList.remove('hidden');
  } else {
    startScriptBtn.classList.remove('hidden');
    stopScriptBtn.classList.add('hidden');
  }
}

// Variable pour stocker le dernier état connu
let lastKnownScriptStatus = null;

// Vérifier l'état du script au chargement
function checkScriptStatus(retryCount = 0, isPeriodicCheck = false) {
  const maxRetries = 3;
  const retryDelay = 500;

  // Essayer d'abord l'onglet actif
  chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
    let targetTab = null;

    if (activeTabs[0] && activeTabs[0].url && activeTabs[0].url.includes('web.grindr.com')) {
      targetTab = activeTabs[0];
    } else {
      // Si l'onglet actif n'est pas web.grindr.com, chercher tous les onglets web.grindr.com
      chrome.tabs.query({ url: '*://web.grindr.com/*' }, (grindrTabs) => {
        if (grindrTabs.length > 0) {
          // Prendre le premier onglet web.grindr.com trouvé
          targetTab = grindrTabs[0];
          queryScriptStatus(targetTab.id, retryCount, isPeriodicCheck);
        }
      });
      return;
    }

    if (targetTab) {
      queryScriptStatus(targetTab.id, retryCount, isPeriodicCheck);
    }
  });
}

function queryScriptStatus(tabId, retryCount, isPeriodicCheck) {
  chrome.tabs.sendMessage(tabId, { action: 'getScriptStatus' }, (response) => {
    if (chrome.runtime.lastError) {
      // Si erreur et qu'on peut réessayer, réessayer après un délai
      if (retryCount < 3) {
        if (!isPeriodicCheck) {
          logger('debug', 'Popup', `⚠️ Erreur lors de la vérification de l'état (tentative ${retryCount + 1}/3): ${chrome.runtime.lastError.message}`);
        }
        setTimeout(() => {
          checkScriptStatus(retryCount + 1, isPeriodicCheck);
        }, 500);
      } else if (!isPeriodicCheck) {
        logger('warn', 'Popup', `❌ Impossible de vérifier l'état du script après 3 tentatives`);
      }
    } else if (response) {
      const isRunning = response.isRunning || false;
      // Logger uniquement si l'état a changé ou si c'est la première vérification
      if (lastKnownScriptStatus !== isRunning) {
        logger('info', 'Popup', `📊 État du script: ${isRunning ? 'en cours' : 'arrêté'}`);
        lastKnownScriptStatus = isRunning;
      }
      updateScriptButtons(isRunning);
    }
  });
}

// Fonction pour démarrer le script
function startScript() {
  logger('info', 'Popup', '📤 Demande de démarrage manuel du script...');

  // Chercher d'abord l'onglet actif
  chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
    let targetTab = null;

    if (activeTabs[0] && activeTabs[0].url && activeTabs[0].url.includes('web.grindr.com')) {
      targetTab = activeTabs[0];
      sendStartScriptMessage(targetTab.id);
    } else {
      // Si l'onglet actif n'est pas web.grindr.com, chercher tous les onglets web.grindr.com
      chrome.tabs.query({ url: '*://web.grindr.com/*' }, (grindrTabs) => {
        if (grindrTabs.length > 0) {
          // Prendre le premier onglet web.grindr.com trouvé
          targetTab = grindrTabs[0];
          logger('info', 'Popup', `🔍 Onglet web.grindr.com trouvé: ${targetTab.id} (${targetTab.url})`);
          sendStartScriptMessage(targetTab.id);
        } else {
          showStatus('⚠️ Ouvrez web.grindr.com', 'error');
          logger('warn', 'Popup', '⚠️ Impossible de démarrer le script: aucun onglet web.grindr.com trouvé');
        }
      });
    }
  });
}

function sendStartScriptMessage(tabId) {
  chrome.tabs.sendMessage(tabId, { action: 'startScript' }, (response) => {
    if (chrome.runtime.lastError) {
      showStatus('❌ Erreur: ' + chrome.runtime.lastError.message, 'error');
      logger('error', 'Popup', '❌ Erreur lors du démarrage du script: ' + chrome.runtime.lastError.message);
      updateScriptButtons(false);
    } else if (response && response.success) {
      showStatus('▶️ Script démarré', 'success');
      logger('info', 'Popup', '✅ Script démarré manuellement avec succès');
      updateScriptButtons(true);
    } else {
      showStatus('❌ Échec du démarrage: ' + (response?.error || 'Erreur inconnue'), 'error');
      logger('error', 'Popup', '❌ Échec du démarrage du script: ' + (response?.error || 'Erreur inconnue'));
      updateScriptButtons(false);
    }
  });
}

// Fonction pour arrêter le script
function stopScript() {
  logger('info', 'Popup', '📤 Demande d\'arrêt manuel du script...');
  // Chercher TOUS les onglets web.grindr.com, pas seulement l'onglet actif
  // (car le popup peut être l'onglet actif)
  chrome.tabs.query({ url: '*://web.grindr.com/*' }, (tabs) => {
    if (tabs.length === 0) {
      showStatus('⚠️ Aucun onglet web.grindr.com trouvé', 'error');
      logger('warn', 'Popup', '⚠️ Impossible d\'arrêter le script: aucun onglet web.grindr.com trouvé');
      return;
    }

    // Envoyer le message d'arrêt à tous les onglets web.grindr.com trouvés
    let successCount = 0;
    let errorCount = 0;
    let pending = tabs.length;

    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, { action: 'stopScript' }, (response) => {
        pending--;

        if (chrome.runtime.lastError) {
          errorCount++;
          logger('error', 'Popup', `❌ Erreur lors de l'arrêt du script dans l'onglet ${tab.id}: ${chrome.runtime.lastError.message}`);
        } else if (response && response.success) {
          successCount++;
        } else {
          errorCount++;
          logger('error', 'Popup', `❌ Échec de l'arrêt dans l'onglet ${tab.id}: ${response?.error || 'Erreur inconnue'}`);
        }

        // Une fois que tous les onglets ont répondu
        if (pending === 0) {
          if (successCount > 0) {
            showStatus('⏹️ Script arrêté', 'success');
            logger('info', 'Popup', `✅ Script arrêté manuellement avec succès dans ${successCount} onglet(s)`);
            updateScriptButtons(false);
          } else {
            showStatus('❌ Échec de l\'arrêt dans tous les onglets', 'error');
            logger('error', 'Popup', '❌ Échec de l\'arrêt du script dans tous les onglets');
            updateScriptButtons(true);
          }
        }
      });
    });
  });
}

// Fonction pour afficher un message de statut
function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;
  statusDiv.style.display = 'block';

  const timeout = type === 'success' ? 3000 : (type === 'error' ? 5000 : 4000);
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, timeout);
}

// Fonction pour formater un timestamp
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

// Charger et afficher les logs
function loadLogs() {
  chrome.runtime.sendMessage({ action: 'getLogs' }, (response) => {
    if (chrome.runtime.lastError) {
      logsContainer.innerHTML = '<div style="color: var(--color-error); padding: var(--spacing-md); text-align: center;">Erreur lors du chargement des logs</div>';
      return;
    }

    const logs = response.logs || [];

    if (logs.length === 0) {
      logsContainer.innerHTML = '<div style="color: var(--color-text-muted); text-align: center; padding: var(--spacing-md);">Aucun log disponible</div>';
      return;
    }

    // Trier les logs par timestamp (plus anciens en premier)
    logs.sort((a, b) => a.timestamp - b.timestamp);

    // Afficher les logs en utilisant DOM methods pour éviter les warnings innerHTML
    logsContainer.textContent = ''; // Clear container
    const fragment = document.createDocumentFragment();

    logs.forEach(log => {
      const timestamp = formatTimestamp(log.timestamp);
      // Sanitize level for CSS class name (only allow alphanumeric and hyphens)
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

    // Scroller automatiquement vers le bas pour afficher le dernier log
    scrollLogsToBottom();
  });
}

// Fonction pour scroller automatiquement vers le bas des logs
function scrollLogsToBottom() {
  if (logsContainer) {
    // Utiliser requestAnimationFrame pour s'assurer que le DOM est mis à jour
    requestAnimationFrame(() => {
      logsContainer.scrollTop = logsContainer.scrollHeight;
    });
  }
}

// Fonction pour échapper le HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Effacer les logs
function clearLogs() {
  showConfirm('Êtes-vous sûr de vouloir effacer tous les logs ?', () => {
    // Vider immédiatement le conteneur pour un feedback visuel instantané
    logsContainer.innerHTML = '<div style="color: var(--color-text-muted); text-align: center; padding: var(--spacing-md);">Suppression en cours...</div>';

    chrome.runtime.sendMessage({ action: 'clearLogs' }, (response) => {
      if (chrome.runtime.lastError) {
        showStatus('❌ Erreur: ' + chrome.runtime.lastError.message, 'error');
        logger('error', 'Popup', '❌ Erreur lors de l\'effacement des logs: ' + chrome.runtime.lastError.message);
        // Recharger les logs en cas d'erreur
        loadLogs();
      } else if (response && response.success) {
        showStatus('✅ Logs effacés', 'success');
        // Afficher immédiatement le message "Aucun log disponible"
        logsContainer.innerHTML = '<div style="color: var(--color-text-muted); text-align: center; padding: var(--spacing-md);">Aucun log disponible</div>';
        // Recharger pour s'assurer que c'est bien synchronisé avec le storage
        setTimeout(() => {
          loadLogs();
        }, 50);
      } else {
        showStatus('❌ Erreur lors de l\'effacement', 'error');
        logger('error', 'Popup', '❌ Erreur lors de l\'effacement des logs');
        // Recharger les logs en cas d'erreur
        loadLogs();
      }
    });
  });
}

// Écouter les messages du content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateStatus') {
    showStatus(request.message, request.type || 'info');
  } else if (request.action === 'scriptStatusChanged') {
    updateScriptButtons(request.isRunning);
  }
});

// Écouter les changements dans le storage pour mettre à jour les logs en temps réel
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.extensionLogs) {
    // Recharger les logs si on est sur l'onglet logs
    const tabLogs = document.getElementById('tabLogs');
    if (tabLogs && tabLogs.classList.contains('active')) {
      loadLogs();
    }
  }
});
