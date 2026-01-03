// Background script pour gérer les onglets, les requêtes n8n et le storage

// Logger function pour le background script
function logger(level, location, message, data = null) {
  const logEntry = {
    timestamp: Date.now(),
    level: level,
    location: location || 'Background',
    message: message,
    data: data
  };

  // Log to console as well
  const consoleMethod = level === 'error' ? console.error :
    level === 'warn' ? console.warn :
      level === 'debug' ? console.debug :
        console.log;
  consoleMethod(`[${location}] ${message}`, data || '');

  // Store directly in chrome.storage.local
  chrome.storage.local.get(['extensionLogs'], (result) => {
    const logs = result.extensionLogs || [];
    logs.push(logEntry);
    // Garder seulement les 1000 derniers logs
    if (logs.length > 1000) {
      logs.shift();
    }
    chrome.storage.local.set({ extensionLogs: logs });
  });
}

// Détecter les onglets web.grindr.com et injecter automatiquement
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('web.grindr.com')) {
    // Injecter le content script si ce n'est pas déjà fait
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    }).catch(err => {
      // Ignorer les erreurs si le script est déjà injecté
      logger('debug', 'Background', 'Script déjà injecté ou erreur: ' + (err?.message || String(err)));
    });
  }

  // Détecter les onglets Apple qui s'ouvrent pour la connexion
  if (changeInfo.status === 'complete' && tab.url && (
    tab.url.includes('apple.com') ||
    tab.url.includes('appleid.apple.com') ||
    tab.url.includes('idmsa.apple.com') ||
    tab.url.includes('signinwithapple')
  )) {
    logger('info', 'Background', '🔍 Onglet Apple détecté: ' + tab.url);
    // Notifier le content script de la page Grindr qu'un onglet Apple a été détecté
    chrome.tabs.query({ url: '*://web.grindr.com/*' }, (grindrTabs) => {
      if (grindrTabs.length > 0) {
        chrome.tabs.sendMessage(grindrTabs[0].id, {
          action: 'applePopupDetected',
          appleTabId: tabId,
          appleTabUrl: tab.url
        }).catch(err => {
          logger('warn', 'Background', 'Impossible d\'envoyer le message au content script: ' + (err?.message || String(err)));
        });
      }
    });
  }
});

// Écouter les messages du content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sendToN8N') {
    // Envoyer les stats vers n8n (contourne la CSP)
    sendToN8NWebhook(request.stats, request.retries || 2)
      .then(success => {
        sendResponse({ success: success });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Indique qu'on répondra de manière asynchrone
  }

  if (request.action === 'getCredentials') {
    // Récupérer les identifiants depuis le storage
    chrome.storage.local.get(['loginMethod', 'grindrEmail', 'grindrPassword', 'autoLogin'], (result) => {
      sendResponse({
        loginMethod: result.loginMethod || 'email',
        email: result.grindrEmail || null,
        password: result.grindrPassword || null,
        autoLogin: result.autoLogin !== false // true par défaut
      });
    });
    return true;
  }

  if (request.action === 'saveCredentials') {
    // Sauvegarder les identifiants dans le storage
    const dataToSave = {
      loginMethod: request.loginMethod || 'email',
      autoLogin: request.autoLogin !== false
    };

    // Sauvegarder email/password seulement si fournis (pour compatibilité avec les autres méthodes)
    if (request.email) {
      dataToSave.grindrEmail = request.email;
    }
    if (request.password) {
      dataToSave.grindrPassword = request.password;
    }

    chrome.storage.local.set(dataToSave, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'deleteCredentials') {
    // Supprimer les identifiants
    chrome.storage.local.remove(['loginMethod', 'grindrEmail', 'grindrPassword', 'autoLogin'], () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'getWebhookURL') {
    // Récupérer l'URL du webhook n8n
    chrome.storage.local.get(['n8nWebhookURL'], (result) => {
      sendResponse({
        url: result.n8nWebhookURL || 'https://n8n.quentinveys.be/webhook/grindr-stats'
      });
    });
    return true;
  }

  if (request.action === 'saveWebhookURL') {
    // Sauvegarder l'URL du webhook
    chrome.storage.local.set({
      n8nWebhookURL: request.url
    }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.action === 'findAppleTab') {
    // Trouver l'ID de l'onglet Apple
    chrome.tabs.query({}, (allTabs) => {
      // Chercher d'abord les onglets Apple spécifiques
      let appleTab = allTabs.find(tab =>
        tab.url && (
          tab.url.includes('appleid.apple.com') ||
          tab.url.includes('idmsa.apple.com') ||
          tab.url.includes('signinwithapple') ||
          (tab.url.includes('apple.com') && (
            tab.url.includes('/auth/') ||
            tab.url.includes('/signin') ||
            tab.url.includes('/login')
          ))
        )
      );

      // Si une URL spécifique est fournie, essayer de la matcher
      if (!appleTab && request.url) {
        appleTab = allTabs.find(tab => tab.url === request.url);
      }

      sendResponse({ tabId: appleTab ? appleTab.id : null });
    });
    return true;
  }

  if (request.action === 'addLog') {
    addLog(request.logEntry);
    sendResponse({ success: true });
  } else if (request.action === 'getLogs') {
    sendResponse({ logs: logs });
  } else if (request.action === 'clearLogs') {
    clearLogs();
    sendResponse({ success: true });
  }
});

/**
 * Add a log entry to the logs array
 * @param {Object} logEntry - Log entry object
 */
function addLog(logEntry) {
  logs.push(logEntry);

  // Keep logs size manageable
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(-MAX_LOGS);
  }

  // Also save to chrome storage for persistence
  chrome.storage.local.set({ logs: logs }).catch(err => {
    console.error('Failed to save logs to storage:', err);
  });
}

/**
 * Clear all logs
 */
function clearLogs() {
  logs = [];
  chrome.storage.local.set({ logs: [] }).catch(err => {
    console.error('Failed to clear logs from storage:', err);
  });
}

/**
 * Load logs from storage on startup
 */
chrome.storage.local.get(['logs'], (result) => {
  if (result.logs) {
    logs = result.logs;
    console.log(`Loaded ${logs.length} logs from storage`);
  }
});

// Fonction pour envoyer vers n8n (contourne la CSP)
async function sendToN8NWebhook(stats, retries = 2) {
  // Récupérer l'URL du webhook depuis le storage
  return new Promise((resolve) => {
    chrome.storage.local.get(['n8nWebhookURL'], async (result) => {
      const webhookURL = result.n8nWebhookURL || 'https://n8n.quentinveys.be/webhook/grindr-stats';

      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          // Timeout de 10 secondes
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(webhookURL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(stats),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          logger('info', 'Background', '📤 Récapitulatif envoyé à n8n avec succès');
          resolve(true);
          return;
        } catch (error) {
          if (attempt < retries) {
            logger('warn', 'Background', `⚠️ Tentative ${attempt + 1}/${retries + 1} échouée, nouvel essai dans 2s...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          } else {
            logger('error', 'Background', '❌ Erreur lors de l\'envoi du webhook après ' + (retries + 1) + ' tentatives: ' + error.message);
            resolve(false);
            return;
          }
        }
      }
    });
  });
}