/**
 * Authentication module for Grindr Auto Tap extension
 * Handles login via email, Facebook, Google, and Apple
 * 
 * Note: This file is loaded as a global script, not as an ES module
 * Functions are attached to window.AuthModule
 */

// Dependencies will be loaded via script tags in manifest.json

// Logger function for auth module
function logger(level, location, message, data = null) {
  const logEntry = {
    timestamp: Date.now(),
    level: level,
    location: location || 'Auth',
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

/**
 * Check if user is currently logged in
 * @returns {boolean} True if logged in, false otherwise
 */
export function checkLoginStatus() {
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

/**
 * Fill login form with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Promise resolving to email and password fields
 */
export async function fillLoginForm(email, password) {
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

/**
 * Click the login button
 * @returns {Promise<boolean>} Promise resolving to true if successful
 */
export async function clickLoginButton() {
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

/**
 * Wait for login to complete
 * @param {number} maxWait - Maximum wait time in milliseconds
 * @returns {Promise<boolean>} Promise resolving to true if login successful
 */
export async function waitForLogin(maxWait = TIMEOUTS.LOGIN) {
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

/**
 * Perform email login
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Promise resolving to login result
 */
export async function performEmailLogin(email, password) {
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

/**
 * Perform Facebook login
 * @returns {Promise<Object>} Promise resolving to login result
 */
export async function performFacebookLogin() {
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

    // TODO: Implémenter la gestion du popup Facebook
    logger('warn', 'Auth', '⚠️ Gestion du popup Facebook non encore implémentée');
    return { success: false, error: 'Gestion du popup Facebook non encore implémentée' };

  } catch (error) {
    logger('error', 'Auth', '❌ Erreur lors de la connexion Facebook: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Perform Google login
 * @returns {Promise<Object>} Promise resolving to login result
 */
export async function performGoogleLogin() {
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

    // TODO: Implémenter la gestion du popup Google
    logger('warn', 'Auth', '⚠️ Gestion du popup Google non encore implémentée');
    return { success: false, error: 'Gestion du popup Google non encore implémentée' };

  } catch (error) {
    logger('error', 'Auth', '❌ Erreur lors de la connexion Google: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Wait for Apple popup window to open
 * @param {number} maxWait - Maximum wait time in milliseconds
 * @param {Window} popupWindowRef - Reference to popup window if available
 * @returns {Promise<number>} Promise resolving to Apple tab ID
 */
export async function waitForApplePopupWindow(maxWait = TIMEOUTS.APPLE_POPUP, popupWindowRef = null) {
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

/**
 * Click a button in Apple tab via script injection
 * @param {number} tabId - Apple tab ID
 * @param {string} buttonValue - Button value to search for
 * @param {string} searchType - Search type ('id' or 'text')
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<boolean>} Promise resolving to true if successful
 */
export async function clickAppleButtonInTab(tabId, buttonValue, searchType = 'id', maxRetries = LIMITS.MAX_APPLE_BUTTON_RETRIES) {
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

/**
 * Wait for Apple popup to close
 * @param {number} maxWait - Maximum wait time in milliseconds
 * @returns {Promise<boolean>} Promise resolving to true if popup closed
 */
export async function waitForApplePopupClose(maxWait = TIMEOUTS.APPLE_POPUP_CLOSE) {
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

/**
 * Perform Apple login
 * @returns {Promise<Object>} Promise resolving to login result
 */
export async function performAppleLogin() {
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

    console.log('[Auth] ✅ Connexion Apple réussie');
    return { success: true };

  } catch (error) {
    logger('error', 'Auth', '❌ Erreur lors de la connexion Apple: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main login function that routes to the appropriate method
 * @param {string} loginMethod - Login method ('email', 'facebook', 'google', 'apple')
 * @param {Object} credentials - Credentials object (email, password for email method)
 * @returns {Promise<Object>} Promise resolving to login result
 */
export async function performLogin(loginMethod, credentials = {}) {
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

