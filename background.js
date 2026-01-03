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

  if (request.action === 'clickButtonInAppleTab') {
    // Injecter un script dans l'onglet Apple pour cliquer sur un bouton
    const tabId = request.tabId;
    const buttonValue = request.buttonValue;
    const searchType = request.searchType || 'id'; // 'id' ou 'text'
    const maxRetries = request.maxRetries || 8;

    if (!tabId || tabId === 'window-ref') {
      // Si on n'a pas d'ID d'onglet, chercher l'onglet Apple
      chrome.tabs.query({ url: '*://*apple.com/*' }, (tabs) => {
        const appleTab = tabs.find(tab =>
          tab.url && (
            tab.url.includes('appleid.apple.com') ||
            tab.url.includes('idmsa.apple.com') ||
            tab.url.includes('signinwithapple')
          )
        );

        if (appleTab) {
          injectAndClickButton(appleTab.id, buttonValue, searchType, maxRetries, sendResponse);
        } else {
          sendResponse({ success: false, error: 'Onglet Apple non trouvé' });
        }
      });
    } else {
      injectAndClickButton(tabId, buttonValue, searchType, maxRetries, sendResponse);
    }
    return true;
  }

  if (request.action === 'debugLog') {
    // Stocker les logs de debug dans chrome.storage.local
    const logEntry = {
      timestamp: request.timestamp || Date.now(),
      location: request.location,
      message: request.message,
      data: request.data,
      sessionId: request.sessionId,
      runId: request.runId,
      hypothesisId: request.hypothesisId
    };

    // Récupérer les logs existants
    chrome.storage.local.get(['debugLogs'], (result) => {
      const logs = result.debugLogs || [];
      logs.push(logEntry);
      // Garder seulement les 1000 derniers logs
      if (logs.length > 1000) {
        logs.shift();
      }
      chrome.storage.local.set({ debugLogs: logs }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === 'addLog') {
    // Stocker les logs dans chrome.storage.local
    const logEntry = request.logEntry || {
      timestamp: Date.now(),
      level: 'info',
      location: 'unknown',
      message: '',
      data: null
    };

    // Récupérer les logs existants
    chrome.storage.local.get(['extensionLogs'], (result) => {
      const logs = result.extensionLogs || [];
      logs.push(logEntry);
      // Garder seulement les 1000 derniers logs
      if (logs.length > 1000) {
        logs.shift();
      }
      chrome.storage.local.set({ extensionLogs: logs }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  if (request.action === 'getLogs') {
    // Récupérer les logs depuis le storage
    chrome.storage.local.get(['extensionLogs'], (result) => {
      sendResponse({ logs: result.extensionLogs || [] });
    });
    return true;
  }

  if (request.action === 'clearLogs') {
    // Supprimer tous les logs
    chrome.storage.local.set({ extensionLogs: [] }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
});


// Fonction pour injecter un script et cliquer sur un bouton dans l'onglet Apple
function injectAndClickButton(tabId, buttonValue, searchType, maxRetries, sendResponse) {
  // Fonction à injecter pour chercher et cliquer sur le bouton
  function clickButtonInAppleTab(btnValue, searchBy, maxAttempts) {
    function findAndClickButton() {
      let button = null;

      if (searchBy === 'id') {
        // Chercher par ID
        button = document.getElementById(btnValue) ||
          document.querySelector('#' + btnValue) ||
          document.querySelector('button#' + btnValue) ||
          document.querySelector('[id="' + btnValue + '"]');
      } else if (searchBy === 'text') {
        // Chercher par texte
        const buttons = Array.from(document.querySelectorAll('button')).filter(function (btn) {
          const text = btn.textContent.trim();
          return text.toLowerCase().includes(btnValue.toLowerCase());
        });
        button = buttons[0];
      }

      if (button) {
        console.log('[Apple Tab] ✅ Bouton trouvé:', btnValue);
        button.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function () {
          button.click();
          console.log('[Apple Tab] 🖱️ Bouton cliqué:', btnValue);
        }, 500);
        return true;
      }
      return false;
    }

    // Essayer plusieurs fois
    let attempts = 0;
    const interval = setInterval(function () {
      attempts++;
      if (findAndClickButton()) {
        clearInterval(interval);
        return;
      }
      if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.error('[Apple Tab] ❌ Bouton non trouvé après', maxAttempts, 'tentatives');
      }
    }, 2000);
  }

  // Injecter le script dans l'onglet
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: clickButtonInAppleTab,
    args: [buttonValue, searchType, maxRetries]
  }, (results) => {
    if (chrome.runtime.lastError) {
      sendResponse({ success: false, error: chrome.runtime.lastError.message });
    } else {
      // Attendre un peu pour que le clic se produise
      setTimeout(() => {
        sendResponse({ success: true });
      }, 1000);
    }
  });
}

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