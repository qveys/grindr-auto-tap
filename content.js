/**
 * Content script for Grindr Auto Tap extension
 * Handles authentication, profile opening, and auto-tap functionality
 */

// ============================================================================
// UTILITIES
// ============================================================================

// Logger function
function logger(level, location, message, data = null) {
  const logEntry = {
    timestamp: Date.now(),
    level: level,
    location: location || 'unknown',
    message: message,
    data: data
  };

  // Log to console as well
  const consoleMethod = level === 'error' ? console.error :
    level === 'warn' ? console.warn :
      level === 'debug' ? console.debug :
        console.log;
  consoleMethod(`[${location}] ${message}`, data || '');

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

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}min ${seconds}s`;
  }
  return `${seconds}s`;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  return result; // tableau de strings
}

// Constants
const DELAYS = {
  SHORT: 50,
  MEDIUM: 100,
  NORMAL: 200,
  LONG: 300,
  VERY_LONG: 500,
  SECOND: 1000,
  TWO_SECONDS: 2000,
  TWO_AND_HALF_SECONDS: 2500,
  THREE_SECONDS: 3000,
  RANDOM_MIN: 50,
  RANDOM_MAX: 50,
};

const TIMEOUTS = {
  LOGIN: 10000,
  APPLE_LOGIN: 15000,
  APPLE_POPUP: 15000,
  APPLE_POPUP_CLOSE: 15000,
  WEBHOOK_REQUEST: 10000,
  BUTTON_WAIT: 10000,
  APPLE_BUTTON_RETRY: 2000,
  APPLE_TAB_CHECK: 1000,
};

const LIMITS = {
  MAX_ITERATIONS: 10000,
  MAX_DURATION_HOURS: 2,
  MAX_DURATION_MS: 2 * 60 * 60 * 1000,
  MAX_DEBUG_LOGS: 1000,
  MAX_RETRIES: 8,
  DEFAULT_RETRIES: 2,
  MAX_APPLE_BUTTON_RETRIES: 8,
};

const DEFAULTS = {
  MIN_DELAY_HOURS: 12,
  AUTO_LOGIN: true,
  AUTO_START: true,
  LOGIN_METHOD: 'email',
};

const SELECTORS = {
  EMAIL_INPUT: 'input[type="email"], input[type="text"][name*="email" i], input[type="text"][placeholder*="email" i], input[type="text"][id*="email" i]',
  PASSWORD_INPUT: 'input[type="password"], input[name*="password" i], input[id*="password" i]',
  LOGIN_BUTTON: 'button[type="submit"], form button, button.btn-primary, button.primary',
  CAPTCHA: '[data-captcha], iframe[src*="recaptcha"], .g-recaptcha',
  NEXT_PROFILE: 'img[alt="Next Profile"]',
  TAP_BUTTON: 'button[aria-label="Tap"]',
  PROFILE_GRIDCELL: 'div[role="gridcell"]',
  BETA_DISMISS: '#beta-dismiss-btn',
  PROFILE_INDICATORS: 'img[alt="Next Profile"], button[aria-label="Tap"], [data-testid*="profile"], nav, header',
  PROFILE_VIEW: '[data-testid*="profile-view"], [class*="profile-view"], [class*="ProfileView"]',
  FACEBOOK_BUTTON: 'button[title="Log In With Facebook"], button[title*="Facebook" i], button[aria-label*="Facebook" i], button[data-provider="facebook"]',
  GOOGLE_BUTTON: 'button[title="Log In With Google"], button[title*="Google" i], button[aria-label*="Google" i], button[data-provider="google"]',
  APPLE_BUTTON: 'button[title="Log In With Apple"], button[title*="Apple" i], button[aria-label*="Apple" i], button[data-provider="apple"]',
  ERROR_MESSAGE: '.error, .alert-error, [role="alert"]',
};

const APPLE = {
  SIGN_IN_BUTTON_ID: 'sign-in',
  BUTTON_CLASSES: 'button.signin-v2__buttons-wrapper__button-wrapper__button, button.button-rounded-rectangle',
  POPUP_CHECK_INTERVAL: 1000,
};

const URLS = {
  DEFAULT_WEBHOOK: 'https://n8n.quentinveys.be/webhook/grindr-stats',
  GRINDR_DOMAIN: 'web.grindr.com',
  APPLE_DOMAINS: ['apple.com', 'appleid.apple.com', 'idmsa.apple.com', 'signinwithapple'],
};

// ============================================================================
// AUTHENTICATION MODULE
// ============================================================================

function checkLoginStatus() {
  const loginPage = document.querySelector(SELECTORS.EMAIL_INPUT);
  if (loginPage) {
    return false;
  }

  const profileElements = document.querySelector(SELECTORS.PROFILE_INDICATORS);
  if (profileElements) {
    return true;
  }

  if (window.location.pathname.includes('/login') || window.location.pathname.includes('/signin')) {
    return false;
  }

  return true;
}

async function fillLoginForm(email, password) {
  const emailField = document.querySelector(SELECTORS.EMAIL_INPUT);
  const passwordField = document.querySelector(SELECTORS.PASSWORD_INPUT);

  if (!emailField || !passwordField) {
    throw new Error('Champs de connexion introuvables');
  }

  emailField.focus();
  emailField.value = '';
  await delay(DELAYS.MEDIUM);

  for (const char of email) {
    emailField.value += char;
    emailField.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(DELAYS.RANDOM_MIN + Math.random() * DELAYS.RANDOM_MAX);
  }

  emailField.dispatchEvent(new Event('change', { bubbles: true }));
  await delay(DELAYS.NORMAL);

  passwordField.focus();
  passwordField.value = '';
  await delay(DELAYS.MEDIUM);

  for (const char of password) {
    passwordField.value += char;
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(DELAYS.RANDOM_MIN + Math.random() * DELAYS.RANDOM_MAX);
  }

  passwordField.dispatchEvent(new Event('change', { bubbles: true }));
  await delay(DELAYS.NORMAL);

  return { emailField, passwordField };
}

async function clickLoginButton() {
  const loginButton = document.querySelector(SELECTORS.LOGIN_BUTTON);
  if (!loginButton) {
    throw new Error('Bouton de connexion introuvable');
  }

  const captcha = document.querySelector(SELECTORS.CAPTCHA);
  if (captcha) {
    throw new Error('Captcha détecté - action manuelle requise');
  }

  loginButton.click();
  await delay(DELAYS.SECOND);

  return true;
}

async function waitForLogin(maxWait = TIMEOUTS.LOGIN) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    await delay(DELAYS.VERY_LONG);

    if (checkLoginStatus()) {
      return true;
    }

    const errorMessage = document.querySelector(SELECTORS.ERROR_MESSAGE);
    if (errorMessage && (errorMessage.textContent.toLowerCase().includes('incorrect') ||
      errorMessage.textContent.toLowerCase().includes('wrong'))) {
      throw new Error('Identifiants incorrects');
    }

    const captcha = document.querySelector(SELECTORS.CAPTCHA);
    if (captcha) {
      throw new Error('Captcha détecté - action manuelle requise');
    }
  }

  throw new Error('Timeout lors de l\'attente de la connexion');
}

async function performEmailLogin(email, password) {
  try {
    logger('info', 'Auth', '📧 Connexion par email...');

    if (!email || !password) {
      throw new Error('Email et mot de passe requis pour la connexion par email');
    }

    await fillLoginForm(email, password);
    logger('info', 'Auth', '📝 Formulaire rempli');

    await clickLoginButton();
    logger('info', 'Auth', '🖱️ Bouton de connexion cliqué');

    await waitForLogin();

    logger('info', 'Auth', '✅ Connexion réussie');
    return { success: true };

  } catch (error) {
    logger('error', 'Auth', '❌ Erreur lors de la connexion email: ' + error.message);
    return { success: false, error: error.message };
  }
}

async function performFacebookLogin() {
  try {
    logger('info', 'Auth', '📘 Connexion par Facebook...');

    const facebookButton = document.querySelector(SELECTORS.FACEBOOK_BUTTON) ||
      Array.from(document.querySelectorAll('button')).find(btn =>
        btn.getAttribute('title')?.toLowerCase().includes('facebook') ||
        btn.textContent.toLowerCase().includes('facebook') ||
        btn.textContent.toLowerCase().includes('log in with facebook')
      );

    if (!facebookButton) {
      throw new Error('Bouton "Log In With Facebook" introuvable');
    }

    logger('info', 'Auth', '🖱️ Clic sur le bouton Facebook...');
    facebookButton.click();
    await delay(DELAYS.TWO_SECONDS);

    logger('warn', 'Auth', '⚠️ Gestion du popup Facebook non encore implémentée');
    return { success: false, error: 'Gestion du popup Facebook non encore implémentée' };

  } catch (error) {
    logger('error', 'Auth', '❌ Erreur lors de la connexion Facebook: ' + error.message);
    return { success: false, error: error.message };
  }
}

async function performGoogleLogin() {
  try {
    logger('info', 'Auth', '🔵 Connexion par Google...');

    const googleButton = document.querySelector(SELECTORS.GOOGLE_BUTTON) ||
      Array.from(document.querySelectorAll('button')).find(btn =>
        btn.getAttribute('title')?.toLowerCase().includes('google') ||
        btn.textContent.toLowerCase().includes('google') ||
        btn.textContent.toLowerCase().includes('log in with google')
      );

    if (!googleButton) {
      throw new Error('Bouton "Log In With Google" introuvable');
    }

    logger('info', 'Auth', '🖱️ Clic sur le bouton Google...');
    googleButton.click();
    await delay(DELAYS.TWO_SECONDS);

    logger('warn', 'Auth', '⚠️ Gestion du popup Google non encore implémentée');
    return { success: false, error: 'Gestion du popup Google non encore implémentée' };

  } catch (error) {
    logger('error', 'Auth', '❌ Erreur lors de la connexion Google: ' + error.message);
    return { success: false, error: error.message };
  }
}

async function waitForApplePopupWindow(maxWait = TIMEOUTS.APPLE_POPUP, popupWindowRef = null) {
  return new Promise((resolve, reject) => {
    let resolved = false;

    const messageListener = (request, sender, sendResponse) => {
      if (request.action === 'applePopupDetected' && !resolved) {
        logger('info', 'Auth', '✅ Onglet Apple détecté par le background script: ' + request.appleTabId);
        resolved = true;
        chrome.runtime.onMessage.removeListener(messageListener);
        clearInterval(checkInterval);
        resolve(request.appleTabId);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    const checkInterval = setInterval(() => {
      if (resolved) return;

      chrome.runtime.sendMessage({
        action: 'findAppleTab'
      }, (response) => {
        if (response && response.tabId && !resolved) {
          logger('info', 'Auth', '✅ Onglet Apple trouvé via recherche: ' + response.tabId);
          resolved = true;
          clearInterval(checkInterval);
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve(response.tabId);
        }
      });

      if (popupWindowRef && !popupWindowRef.closed && !resolved) {
        try {
          const popupUrl = popupWindowRef.location.href;
          if (popupUrl && URLS.APPLE_DOMAINS.some(domain => popupUrl.includes(domain))) {
            logger('info', 'Auth', '✅ Fenêtre popup Apple confirmée via window.open: ' + popupUrl);
            chrome.runtime.sendMessage({
              action: 'findAppleTab',
              url: popupUrl
            }, (response) => {
              if (response && response.tabId && !resolved) {
                resolved = true;
                clearInterval(checkInterval);
                chrome.runtime.onMessage.removeListener(messageListener);
                resolve(response.tabId);
              }
            });
          }
        } catch (e) {
          // Cross-origin, cannot access location.href
        }
      }
    }, TIMEOUTS.APPLE_TAB_CHECK);

    setTimeout(() => {
      if (!resolved) {
        clearInterval(checkInterval);
        chrome.runtime.onMessage.removeListener(messageListener);
        reject(new Error('Timeout: Fenêtre popup Apple non détectée'));
      }
    }, maxWait);
  });
}

async function clickAppleButtonInTab(tabId, buttonValue, searchType = 'id', maxRetries = LIMITS.MAX_APPLE_BUTTON_RETRIES) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      action: 'clickButtonInAppleTab',
      tabId: tabId,
      buttonValue: buttonValue,
      searchType: searchType,
      maxRetries: maxRetries
    }, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (response && response.success) {
        logger('info', 'Auth', `✅ Bouton "${buttonValue}" cliqué dans l'onglet Apple`);
        resolve(true);
      } else {
        reject(new Error(response?.error || 'Échec du clic sur le bouton'));
      }
    });
  });
}

async function waitForApplePopupClose(maxWait = TIMEOUTS.APPLE_POPUP_CLOSE) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    await delay(DELAYS.VERY_LONG);

    const appleIframes = Array.from(document.querySelectorAll('iframe')).filter(iframe => {
      try {
        return iframe.src && (
          iframe.src.includes('apple.com') ||
          iframe.src.includes('appleid.apple.com')
        );
      } catch (e) {
        return false;
      }
    });

    if (appleIframes.length === 0) {
      logger('info', 'Auth', '✅ Popup Apple fermé');
      return true;
    }
  }

  logger('warn', 'Auth', '⚠️ Timeout lors de l\'attente de fermeture du popup Apple');
  return false;
}

async function performAppleLogin() {
  try {
    logger('info', 'Auth', '🍎 Connexion par Apple...');

    const appleButton = document.querySelector(SELECTORS.APPLE_BUTTON) ||
      Array.from(document.querySelectorAll('button')).find(btn =>
        btn.getAttribute('title')?.toLowerCase().includes('apple') ||
        btn.textContent.toLowerCase().includes('apple') ||
        btn.textContent.toLowerCase().includes('log in with apple')
      );

    if (!appleButton) {
      throw new Error('Bouton "Log In With Apple" introuvable');
    }

    logger('info', 'Auth', '🖱️ Clic sur le bouton Apple...');

    let popupWindow = null;
    const originalOpen = window.open;

    if (originalOpen) {
      window.open = function (...args) {
        popupWindow = originalOpen.apply(this, args);
        logger('info', 'Auth', '🔍 Nouvelle fenêtre détectée via window.open');
        return popupWindow;
      };
    }

    appleButton.click();
    await delay(DELAYS.TWO_SECONDS);

    logger('info', 'Auth', '⏳ Attente de la nouvelle fenêtre Apple...');
    const appleTabId = await waitForApplePopupWindow(TIMEOUTS.APPLE_POPUP, popupWindow);
    if (!appleTabId) {
      throw new Error('Fenêtre popup Apple non détectée');
    }

    logger('info', 'Auth', '📱 Fenêtre popup Apple détectée (onglet ID: ' + appleTabId + ')');
    await delay(DELAYS.TWO_SECONDS);

    if (originalOpen) {
      window.open = originalOpen;
    }

    logger('info', 'Auth', '⏳ Injection du script dans l\'onglet Apple...');

    logger('info', 'Auth', '⏳ Attente du bouton sign-in...');
    await delay(DELAYS.TWO_SECONDS);
    await clickAppleButtonInTab(appleTabId, APPLE.SIGN_IN_BUTTON_ID, 'id');
    await delay(DELAYS.TWO_AND_HALF_SECONDS);

    logger('info', 'Auth', '⏳ Attente du bouton Sign In...');
    await delay(1500);
    await clickAppleButtonInTab(appleTabId, 'Sign In', 'text');
    await delay(DELAYS.TWO_AND_HALF_SECONDS);

    logger('info', 'Auth', '⏳ Attente du dernier bouton Continue...');
    await delay(1500);
    await clickAppleButtonInTab(appleTabId, 'Continue', 'text');
    await delay(DELAYS.THREE_SECONDS);

    await waitForApplePopupClose();
    await delay(DELAYS.TWO_SECONDS);

    await waitForLogin(TIMEOUTS.APPLE_LOGIN);

    logger('info', 'Auth', '✅ Connexion Apple réussie');
    return { success: true };

  } catch (error) {
    logger('error', 'Auth', '❌ Erreur lors de la connexion Apple: ' + error.message);
    return { success: false, error: error.message };
  }
}

async function performLogin(loginMethod, credentials = {}) {
  try {
    logger('info', 'Auth', `🔐 Début de la connexion avec la méthode: ${loginMethod}`);

    if (checkLoginStatus()) {
      logger('info', 'Auth', '✅ Déjà connecté');
      return { success: true, alreadyLoggedIn: true };
    }

    switch (loginMethod) {
      case 'email':
        return await performEmailLogin(credentials.email, credentials.password);
      case 'facebook':
        return await performFacebookLogin();
      case 'google':
        return await performGoogleLogin();
      case 'apple':
        return await performAppleLogin();
      default:
        throw new Error(`Méthode de connexion inconnue: ${loginMethod}`);
    }
  } catch (error) {
    logger('error', 'Auth', '❌ Erreur lors de la connexion: ' + error.message);
    return { success: false, error: error.message };
  }
}
// ============================================================================
// PROFILE OPENER MODULE
// ============================================================================

async function dismissBetaBanner() {
  const betaDismissBtn = document.getElementById('beta-dismiss-btn');
  if (betaDismissBtn) {
    logger('info', 'Content', '🔘 Clic sur le bouton beta-dismiss-btn...');
    betaDismissBtn.click();
    await delay(DELAYS.SECOND);
  } else {
    logger('info', 'Content', 'ℹ️ Bouton beta-dismiss-btn non trouvé (peut-être déjà fermé)');
  }
}

function findFirstProfileGridCell() {
  return document.querySelector(SELECTORS.PROFILE_GRIDCELL);
}

function verifyProfileOpened() {
  const currentURL = window.location.href;
  const urlContainsProfile = currentURL.includes('?profile=true') || currentURL.includes('&profile=true');
  const nextProfileBtn = document.querySelector(SELECTORS.NEXT_PROFILE);
  const tapButton = document.querySelector(SELECTORS.TAP_BUTTON);
  const profileView = document.querySelector(SELECTORS.PROFILE_VIEW);

  return urlContainsProfile || !!(nextProfileBtn || tapButton || profileView);
}

async function attemptProfileClick(gridCell) {
  try {
    logger('info', 'Content', '👤 Ouverture du premier profil...');

    // Trouver l'élément interactif dans le gridcell
    // Priorité: data-testid="cascadeCellContainer", puis onclick, puis href, puis data-*
    const allDescendants = Array.from(gridCell.querySelectorAll('*'));
    let targetElement = null;

    // Chercher d'abord cascadeCellContainer
    let cascadeContainer = null;
    for (const elem of allDescendants) {
      if (elem.getAttribute('data-testid') === 'cascadeCellContainer') {
        cascadeContainer = elem;
        break;
      }
    }

    // Si cascadeCellContainer trouvé, chercher un enfant interactif dedans
    if (cascadeContainer) {
      const cascadeChildren = Array.from(cascadeContainer.querySelectorAll('*'));
      // Prioriser les éléments avec onclick, href, ou data-*
      for (const child of cascadeChildren) {
        const hasOnClick = child.onclick || child.getAttribute('onclick');
        const hasHref = child.href || child.getAttribute('href');
        const hasDataAttr = Array.from(child.attributes).some(attr => attr.name.startsWith('data-'));

        if (hasOnClick || hasHref || hasDataAttr) {
          targetElement = child;
          logger('debug', 'Content', '🔍 Enfant interactif trouvé dans cascadeCellContainer: ' + child.tagName + ' ' + (child.getAttribute('data-testid') || child.id || ''));
          break;
        }
      }
      // Si pas d'enfant interactif, utiliser le container lui-même
      if (!targetElement) {
        targetElement = cascadeContainer;
        logger('debug', 'Content', '🎯 Utilisation du cascadeCellContainer lui-même');
      }
    } else {
      // Sinon, chercher un élément avec onclick, href, ou data-*
      for (const elem of allDescendants) {
        const hasOnClick = elem.onclick || elem.getAttribute('onclick');
        const hasHref = elem.href || elem.getAttribute('href');
        const hasDataAttr = Array.from(elem.attributes).some(attr => attr.name.startsWith('data-'));

        if (hasOnClick || hasHref || hasDataAttr) {
          targetElement = elem;
          break;
        }
      }

      // Fallback: utiliser le gridcell lui-même
      if (!targetElement) {
        targetElement = gridCell;
      }
    }

    logger('debug', 'Content', '🎯 Élément cible trouvé: ' + targetElement.tagName + ' ' + (targetElement.getAttribute('data-testid') || targetElement.id || ''));

    // Scroller vers l'élément
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await delay(DELAYS.LONG);

    // Obtenir les coordonnées de l'élément
    const rect = targetElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Créer un MouseEvent avec des propriétés réalistes
    const mouseEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      screenX: centerX + window.screenX,
      screenY: centerY + window.screenY,
      clientX: centerX,
      clientY: centerY,
      button: 0,
      buttons: 1
    });

    // Écouter les changements d'URL
    let urlChangedDetected = false;
    const urlChangeListener = () => {
      const currentURL = window.location.href;
      if (currentURL.includes('?profile=true') || currentURL.includes('&profile=true')) {
        urlChangedDetected = true;
      }
    };
    window.addEventListener('popstate', urlChangeListener);
    window.addEventListener('hashchange', urlChangeListener);

    // Dispatcher l'événement
    logger('debug', 'Content', '🖱️ Clic sur l\'élément avec dispatchEvent...');
    targetElement.dispatchEvent(mouseEvent);

    // Vérifier périodiquement si l'URL a changé ou si le profil s'est ouvert
    for (let i = 0; i < 20; i++) {
      await delay(DELAYS.NORMAL);

      const currentURL = window.location.href;
      if (currentURL.includes('?profile=true') || currentURL.includes('&profile=true')) {
        urlChangedDetected = true;
      }

      if (urlChangedDetected || verifyProfileOpened()) {
        window.removeEventListener('popstate', urlChangeListener);
        window.removeEventListener('hashchange', urlChangeListener);
        logger('info', 'Content', '✅ Profil ouvert détecté');
        return true;
      }
    }

    window.removeEventListener('popstate', urlChangeListener);
    window.removeEventListener('hashchange', urlChangeListener);

    // Vérification finale
    const isOpened = verifyProfileOpened();
    if (isOpened) {
      logger('info', 'Content', '✅ Profil ouvert (vérification finale)');
    } else {
      logger('warn', 'Content', '⚠️ Profil non ouvert après toutes les tentatives');
    }
    return isOpened;
  } catch (error) {
    logger('warn', 'Content', '⚠️ Erreur lors du clic sur le profil: ' + error.message);
    return false;
  }
}

async function performPreScriptActions() {
  try {
    logger('info', 'Content', '🔧 Exécution des actions préalables...');

    await dismissBetaBanner();
    await delay(DELAYS.SECOND);

    const firstGridCell = findFirstProfileGridCell();
    if (!firstGridCell) {
      logger('warn', 'Content', '⚠️ Aucun div avec role="gridcell" trouvé');
      return false;
    }

    const profileOpened = await attemptProfileClick(firstGridCell);

    if (profileOpened) {
      logger('info', 'Content', '✅ Actions préalables terminées - Profil ouvert');
      return true;
    } else {
      logger('warn', 'Content', '⚠️ Actions préalables terminées - Profil non ouvert');
      return false;
    }
  } catch (error) {
    logger('warn', 'Content', '⚠️ Erreur lors des actions préalables: ' + error.message);
    return verifyProfileOpened();
  }
}
// ============================================================================
// STATISTICS MODULE
// ============================================================================

async function sendToN8NWebhook(stats, retries = LIMITS.DEFAULT_RETRIES) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'sendToN8N',
      stats: stats,
      retries: retries
    }, (response) => {
      if (chrome.runtime.lastError) {
        logger('error', 'Content', '❌ Erreur communication avec background: ' + chrome.runtime.lastError.message);
        resolve(false);
      } else {
        if (response && response.success) {
          logger('info', 'Content', '📤 Récapitulatif envoyé à n8n avec succès');
          resolve(true);
        } else {
          logger('error', 'Content', '❌ Erreur lors de l\'envoi du webhook: ' + (response?.error || 'Erreur inconnue'));
          resolve(false);
        }
      }
    });
  });
}

function displayStats(stats) {
  const successRate = stats.totalCount > 0 ? ((stats.tappedCount / stats.totalCount) * 100).toFixed(1) : 0;

  logger('info', 'Content', `📊 RÉCAPITULATIF - Début: ${formatDate(stats.startTime)}, Fin: ${formatDate(stats.endTime)}, Durée: ${formatDuration(stats.duration)}`);
  logger('info', 'Content', `👥 Personnes déjà tapées: ${stats.alreadyTappedCount}, Tapées: ${stats.tappedCount}, Total: ${stats.totalCount}, Taux: ${successRate}%`);
  if (stats.error) {
    logger('warn', 'Content', `⚠️ Erreur: ${stats.errorMessage}`);
  }
}

async function sendFinalStats(stats, isError = false) {
  const statsToSend = { ...stats };

  if (isError && !statsToSend.error) {
    statsToSend.error = true;
    if (!statsToSend.errorMessage) {
      statsToSend.errorMessage = 'Script interrompu prématurément';
    }
  }

  displayStats(statsToSend);
  await sendToN8NWebhook(statsToSend);
}

function createErrorStats(baseStats, error) {
  return {
    ...baseStats,
    error: true,
    errorMessage: error?.message || String(error) || 'Erreur inconnue'
  };
}
// ============================================================================
// MAIN FUNCTIONS
// ============================================================================

async function getCredentialsFromBackground() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: 'getCredentials' }, (response) => {
      if (chrome.runtime.lastError) {
        logger('error', 'Content', 'Erreur récupération identifiants: ' + chrome.runtime.lastError.message);
        resolve(null);
      } else {
        resolve(response);
      }
    });
  });
}

async function initAndRun() {
  if (window.__grindrRunning) {
    logger('warn', 'Content', '⚠️ Le script est déjà en cours d\'exécution. Attendez la fin ou rechargez la page.');
    return;
  }

  if (window.__grindrStopped) {
    logger('info', 'Content', 'ℹ️ Script arrêté manuellement. Utilisez le bouton "Démarrer" pour le relancer.');
    return;
  }

  window.__grindrRunning = true;
  window.__grindrStopped = false;

  try {
    logger('info', 'Content', '🔍 Vérification de l\'état de connexion...');
    const isLoggedIn = checkLoginStatus();

    if (!isLoggedIn) {
      logger('info', 'Content', '🔐 Non connecté, tentative de connexion automatique...');

      const credentials = await getCredentialsFromBackground();

      if (credentials && credentials.autoLogin) {
        const loginMethod = credentials.loginMethod || DEFAULTS.LOGIN_METHOD;
        logger('info', 'Content', `🔑 Méthode de connexion: ${loginMethod}`);

        if (loginMethod === 'email' && (!credentials.email || !credentials.password)) {
          logger('warn', 'Content', '⚠️ Email et mot de passe requis pour la connexion par email');
          window.__grindrRunning = false;
          return;
        }

        logger('info', 'Content', '🔐 Connexion en cours...');
        const loginResult = await performLogin(loginMethod, {
          email: credentials.email,
          password: credentials.password
        });

        if (!loginResult.success) {
          logger('error', 'Content', '❌ Échec de la connexion: ' + loginResult.error);
          window.__grindrRunning = false;
          return;
        }

        await delay(DELAYS.TWO_SECONDS);
      } else {
        logger('warn', 'Content', '⚠️ Aucune configuration trouvée ou connexion automatique désactivée');
        logger('warn', 'Content', '💡 Configurez votre méthode de connexion dans le popup de l\'extension');
        window.__grindrRunning = false;
        return;
      }
    } else {
      logger('info', 'Content', '✅ Déjà connecté');
    }

    const stillLoggedIn = checkLoginStatus();
    if (!stillLoggedIn) {
      logger('error', 'Content', '❌ Échec de la connexion ou déconnexion détectée');
      window.__grindrRunning = false;
      return;
    }

    const profileOpened = await performPreScriptActions();

    if (!profileOpened) {
      logger('error', 'Content', '❌ Le profil n\'a pas pu être ouvert. Le script ne sera pas exécuté.');
      window.__grindrRunning = false;
      return;
    }

    await autoTapAndNext();

  } catch (error) {
    logger('error', 'Content', '❌ Erreur fatale: ' + error.message, error);
    window.__grindrRunning = false;
  }
}
async function autoTapAndNext() {
  const startTime = Date.now();
  let alreadyTappedCount = 0;
  let tappedCount = 0;
  let stats = null;

  window.__grindrStats = {
    startTime: startTime,
    alreadyTappedCount: 0,
    tappedCount: 0
  };

  logger('info', 'Content', `🚀 Démarrage du script à ${formatDate(startTime)}`);

  try {
    let iterationCount = 0;

    const waitStartTime = Date.now();
    while (!document.querySelector(SELECTORS.NEXT_PROFILE) && (Date.now() - waitStartTime) < TIMEOUTS.BUTTON_WAIT) {
      if (!window.__grindrRunning || window.__grindrStopped) {
        logger('info', 'Content', '⏹️ Script arrêté pendant l\'attente du bouton');
        return;
      }
      await delay(DELAYS.MEDIUM);
    }

    while (document.querySelector(SELECTORS.NEXT_PROFILE) && window.__grindrRunning && !window.__grindrStopped) {
      const currentDuration = Date.now() - startTime;
      if (currentDuration > LIMITS.MAX_DURATION_MS) {
        logger('warn', 'Content', `⚠️ Durée maximale atteinte (${formatDuration(LIMITS.MAX_DURATION_MS)}), arrêt du script`);
        break;
      }

      iterationCount++;
      if (iterationCount > LIMITS.MAX_ITERATIONS) {
        logger('warn', 'Content', `⚠️ Nombre maximum d'itérations atteint (${LIMITS.MAX_ITERATIONS}), arrêt du script`);
        break;
      }

      try {
        if (!window.__grindrRunning || window.__grindrStopped) {
          logger('info', 'Content', '⏹️ Script arrêté, interruption de la boucle');
          break;
        }

        const tapBtn = document.querySelector(SELECTORS.TAP_BUTTON);
        const nextBtn = document.querySelector(SELECTORS.NEXT_PROFILE);

        if (!nextBtn) {
          logger('warn', 'Content', '⚠️ Bouton "Next Profile" introuvable, arrêt de la boucle');
          break;
        }

        const modalRoot = document.querySelector(".MuiModal-root .MuiStack-root");
        const textNodes = modalRoot ? getTextNodes(modalRoot) : [];

        if (!tapBtn) {
          logger('debug', 'Content', '➡️ déjà tapper, au suivant', textNodes);
          alreadyTappedCount++;
          window.__grindrStats.alreadyTappedCount = alreadyTappedCount;

          try {
            nextBtn.click();
          } catch (clickError) {
            logger('error', 'Content', '❌ Erreur lors du clic sur nextBtn: ' + clickError.message);
            throw clickError;
          }
        } else {
          logger('debug', 'Content', '🔥 à tapper', textNodes);
          tappedCount++;
          window.__grindrStats.tappedCount = tappedCount;

          try {
            tapBtn.click();
            await delay(DELAYS.SECOND);
            nextBtn.click();
            await delay(DELAYS.SECOND);
          } catch (clickError) {
            logger('error', 'Content', '❌ Erreur lors du clic: ' + clickError.message);
            throw clickError;
          }
        }

        await delay(DELAYS.TWO_SECONDS);
      } catch (loopError) {
        logger('error', 'Content', '❌ Erreur dans la boucle: ' + loopError.message);
        await delay(DELAYS.SECOND);
        continue;
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const totalCount = alreadyTappedCount + tappedCount;

    stats = {
      startTime: startTime,
      endTime: endTime,
      duration: duration,
      alreadyTappedCount: alreadyTappedCount,
      tappedCount: tappedCount,
      totalCount: totalCount
    };

    await sendFinalStats(stats, false);
    logger('info', 'Content', '✅ Fin de la boucle');

  } catch (error) {
    logger('error', 'Content', '❌ Erreur fatale dans autoTapAndNext: ' + error.message, error);

    const endTime = Date.now();
    const duration = endTime - startTime;
    const totalCount = alreadyTappedCount + tappedCount;

    stats = createErrorStats({
      startTime: startTime,
      endTime: endTime,
      duration: duration,
      alreadyTappedCount: alreadyTappedCount,
      tappedCount: tappedCount,
      totalCount: totalCount
    }, error);

    await sendFinalStats(stats, true);
    throw error;
  } finally {
    window.__grindrRunning = false;
    if (window.__grindrStats) {
      delete window.__grindrStats;
    }
    window.__grindrLastRun = Date.now();
  }
}
// ============================================================================
// GLOBAL ERROR HANDLERS
// ============================================================================

if (!window.__grindrErrorHandlersAdded) {
  window.addEventListener('error', async (event) => {
    logger('error', 'Content', '❌ Erreur globale capturée: ' + (event.error?.message || String(event.error)), event.error);

    if (window.__grindrStats) {
      const endTime = Date.now();
      const duration = endTime - window.__grindrStats.startTime;
      const totalCount = window.__grindrStats.alreadyTappedCount + window.__grindrStats.tappedCount;

      const stats = createErrorStats({
        startTime: window.__grindrStats.startTime,
        endTime: endTime,
        duration: duration,
        alreadyTappedCount: window.__grindrStats.alreadyTappedCount,
        tappedCount: window.__grindrStats.tappedCount,
        totalCount: totalCount
      }, event.error);

      await sendFinalStats(stats, true);
    }
  });

  window.addEventListener('unhandledrejection', async (event) => {
    logger('error', 'Content', '❌ Promesse rejetée non gérée: ' + (event.reason?.message || String(event.reason)), event.reason);

    if (window.__grindrStats) {
      const endTime = Date.now();
      const duration = endTime - window.__grindrStats.startTime;
      const totalCount = window.__grindrStats.alreadyTappedCount + window.__grindrStats.tappedCount;

      const stats = createErrorStats({
        startTime: window.__grindrStats.startTime,
        endTime: endTime,
        duration: duration,
        alreadyTappedCount: window.__grindrStats.alreadyTappedCount,
        tappedCount: window.__grindrStats.tappedCount,
        totalCount: totalCount
      }, event.reason);

      await sendFinalStats(stats, true);
    }
  });

  window.__grindrErrorHandlersAdded = true;
}
