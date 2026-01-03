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
