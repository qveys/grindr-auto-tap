/**
 * Authentication module for Grindr Auto Tap extension
 * Handles login via email, Facebook, Google, and Apple
 */

(function() {
  'use strict';

  // Dependencies: window.Constants, window.Logger, window.DOMHelpers
  const { SELECTORS, DELAYS, TIMEOUTS, LIMITS, URLS, APPLE } = window.Constants;
  const { logger } = window.Logger;
  const { delay } = window.DOMHelpers;

  /**
   * Check if user is currently logged in
   * Checks for absence of login form fields and presence of profile elements.
   * Also checks URL path for login/signin indicators.
   *
   * @returns {boolean} True if user is logged in, false if on login page
   *
   * @example
   * if (checkLoginStatus()) {
   *   logger('info', 'Auth', 'Already logged in, skipping login');
   * } else {
   *   await performLogin('email', credentials);
   * }
   */
  function checkLoginStatus() {
    const loginPage = document.querySelector(SELECTORS.AUTH.EMAIL_INPUT);
    if (loginPage) {
      return false;
    }

    const profileElements = document.querySelector(SELECTORS.PROFILE.INDICATORS);
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
   * Simulates human typing with random delays between characters.
   * Dispatches input and change events to trigger form validation.
   *
   * @param {string} email - Email address to fill
   * @param {string} password - Password to fill
   * @returns {Promise<{emailField: Element, passwordField: Element}>} Object with references to filled fields
   * @throws {Error} If email or password fields are not found in DOM
   *
   * @example
   * const { emailField, passwordField } = await fillLoginForm('user@example.com', 'password123');
   * // Form is now filled with simulated human typing
   */
  async function fillLoginForm(email, password) {
    const emailField = document.querySelector(SELECTORS.AUTH.EMAIL_INPUT);
    const passwordField = document.querySelector(SELECTORS.AUTH.PASSWORD_INPUT);

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
   * @returns {Promise<boolean>}
   */
  async function clickLoginButton() {
    const loginButton = document.querySelector(SELECTORS.AUTH.LOGIN_BUTTON);
    if (!loginButton) {
      throw new Error('Bouton de connexion introuvable');
    }

    const captcha = document.querySelector(SELECTORS.AUTH.CAPTCHA);
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
   * @returns {Promise<boolean>}
   */
  async function waitForLogin(maxWait = TIMEOUTS.LOGIN) {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWait) {
      await delay(DELAYS.VERY_LONG);

      if (checkLoginStatus()) {
        return true;
      }

      const errorMessage = document.querySelector(SELECTORS.AUTH.ERROR_MESSAGE);
      if (errorMessage && (errorMessage.textContent.toLowerCase().includes('incorrect') ||
        errorMessage.textContent.toLowerCase().includes('wrong'))) {
        throw new Error('Identifiants incorrects');
      }

      const captcha = document.querySelector(SELECTORS.AUTH.CAPTCHA);
      if (captcha) {
        throw new Error('Captcha détecté - action manuelle requise');
      }
    }

    throw new Error('Timeout lors de l\'attente de la connexion');
  }

  /**
   * Find social login button by provider name
   * @param {string} provider - Provider name (facebook, google, apple)
   * @param {string} selector - CSS selector for the button
   * @returns {Element|null} Button element or null
   */
  function findSocialLoginButton(provider, selector) {
    const button = document.querySelector(selector);
    if (button) {
      return button;
    }

    // Fallback: search in all buttons
    return Array.from(document.querySelectorAll('button')).find(btn => {
      const title = btn.getAttribute('title')?.toLowerCase() || '';
      const text = btn.textContent.toLowerCase();
      const providerLower = provider.toLowerCase();
      
      return title.includes(providerLower) ||
        text.includes(providerLower) ||
        text.includes(`log in with ${providerLower}`);
    });
  }

  /**
   * Perform email login
   * Completes the full email login flow: fill form, click button, wait for completion.
   * Includes captcha detection and error handling.
   *
   * @param {string} email - Email address for login
   * @param {string} password - Password for login
   * @returns {Promise<{success: boolean, error?: string}>} Object indicating success or failure with error message
   *
   * @example
   * const result = await performEmailLogin('user@example.com', 'password123');
   * if (result.success) {
   *   logger('info', 'Auth', 'Login successful');
   * } else {
   *   logger('error', 'Auth', 'Login failed: ' + result.error);
   * }
   */
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

  /**
   * Perform Facebook login
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function performFacebookLogin() {
    try {
      logger('info', 'Auth', '📘 Connexion par Facebook...');

      const facebookButton = findSocialLoginButton('facebook', SELECTORS.AUTH.FACEBOOK_BUTTON);
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

  /**
   * Perform Google login
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function performGoogleLogin() {
    try {
      logger('info', 'Auth', '🔵 Connexion par Google...');

      const googleButton = findSocialLoginButton('google', SELECTORS.AUTH.GOOGLE_BUTTON);
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

  /**
   * Wait for Apple popup window to appear
   * @param {number} maxWait - Maximum wait time in milliseconds
   * @param {Window|null} popupWindowRef - Reference to popup window
   * @returns {Promise<number>} Tab ID of the Apple popup
   */
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

      const checkInterval = setInterval(async () => {
        if (resolved) return;

        // Use centralized messaging utility if available
        const sendMessage = (typeof window !== 'undefined' && window.sendToBackground)
          ? window.sendToBackground
          : (msg) => new Promise((res) => chrome.runtime.sendMessage(msg, res));

        const response = await sendMessage({
          action: 'findAppleTab'
        });

        if (response && response.tabId && !resolved) {
          logger('info', 'Auth', '✅ Onglet Apple trouvé via recherche: ' + response.tabId);
          resolved = true;
          clearInterval(checkInterval);
          chrome.runtime.onMessage.removeListener(messageListener);
          resolve(response.tabId);
        }

        if (popupWindowRef && !popupWindowRef.closed && !resolved) {
          try {
            const popupUrl = popupWindowRef.location.href;
            if (popupUrl && URLS.APPLE_DOMAINS.some(domain => popupUrl.includes(domain))) {
              logger('info', 'Auth', '✅ Fenêtre popup Apple confirmée via window.open: ' + popupUrl);
              const response = await sendMessage({
                action: 'findAppleTab',
                url: popupUrl
              });

              if (response && response.tabId && !resolved) {
                resolved = true;
                clearInterval(checkInterval);
                chrome.runtime.onMessage.removeListener(messageListener);
                resolve(response.tabId);
              }
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
   * Click a button in Apple tab via background script
   * @param {number} tabId - Tab ID
   * @param {string} buttonValue - Button ID or text
   * @param {string} searchType - Search type: 'id' or 'text'
   * @param {number} maxRetries - Maximum retries
   * @returns {Promise<boolean>}
   */
  async function clickAppleButtonInTab(tabId, buttonValue, searchType = 'id', maxRetries = LIMITS.MAX_APPLE_BUTTON_RETRIES) {
    // Use centralized messaging utility if available
    const sendMessage = (typeof window !== 'undefined' && window.sendToBackground)
      ? window.sendToBackground
      : (msg) => new Promise((res, rej) => {
          chrome.runtime.sendMessage(msg, (response) => {
            if (chrome.runtime.lastError) {
              rej(new Error(chrome.runtime.lastError.message));
            } else {
              res(response);
            }
          });
        });

    const response = await sendMessage({
      action: 'clickButtonInAppleTab',
      tabId: tabId,
      buttonValue: buttonValue,
      searchType: searchType,
      maxRetries: maxRetries
    });

    if (response && response.success) {
      logger('info', 'Auth', `✅ Bouton "${buttonValue}" cliqué dans l'onglet Apple`);
      return true;
    } else {
      throw new Error(response?.error || 'Échec du clic sur le bouton');
    }
  }

  /**
   * Wait for Apple popup to close
   * @param {number} maxWait - Maximum wait time in milliseconds
   * @returns {Promise<boolean>}
   */
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

  /**
   * Initiate Apple login by clicking the button
   * @returns {Promise<{popupWindow: Window|null, originalOpen: Function}>}
   */
  async function initiateAppleLogin() {
    const appleButton = findSocialLoginButton('apple', SELECTORS.AUTH.APPLE_BUTTON);
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

    return { popupWindow, originalOpen };
  }

  /**
   * Handle Apple popup authentication flow
   * @param {Window|null} popupWindow - Reference to popup window
   * @returns {Promise<number>} Tab ID of the Apple popup
   */
  async function handleApplePopup(popupWindow) {
    logger('info', 'Auth', '⏳ Attente de la nouvelle fenêtre Apple...');
    const appleTabId = await waitForApplePopupWindow(TIMEOUTS.APPLE_POPUP, popupWindow);
    if (!appleTabId) {
      throw new Error('Fenêtre popup Apple non détectée');
    }

    logger('info', 'Auth', '📱 Fenêtre popup Apple détectée (onglet ID: ' + appleTabId + ')');
    await delay(DELAYS.TWO_SECONDS);

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

    return appleTabId;
  }

  /**
   * Complete Apple login by waiting for authentication
   * @returns {Promise<void>}
   */
  async function completeAppleLogin() {
    await waitForLogin(TIMEOUTS.APPLE_LOGIN);
    logger('info', 'Auth', '✅ Connexion Apple réussie');
  }

  /**
   * Perform Apple login
   * Handles the complete Apple authentication flow:
   * 1. Click Apple login button
   * 2. Wait for popup window to appear
   * 3. Inject script to click authentication buttons in popup
   * 4. Wait for popup to close
   * 5. Wait for login to complete
   *
   * Temporarily overrides window.open to capture popup reference.
   * Background script handles popup tab detection and button clicking.
   *
   * @returns {Promise<{success: boolean, error?: string}>} Object indicating success or failure with error message
   *
   * @example
   * const result = await performAppleLogin();
   * if (result.success) {
   *   logger('info', 'Auth', 'Apple login successful');
   * }
   */
  async function performAppleLogin() {
    let originalOpen = null;
    try {
      logger('info', 'Auth', '🍎 Connexion par Apple...');

      const { popupWindow, originalOpen: savedOpen } = await initiateAppleLogin();
      originalOpen = savedOpen;

      await handleApplePopup(popupWindow);

      if (originalOpen) {
        window.open = originalOpen;
      }

      await completeAppleLogin();
      return { success: true };

    } catch (error) {
      if (originalOpen) {
        window.open = originalOpen;
      }
      logger('error', 'Auth', '❌ Erreur lors de la connexion Apple: ' + error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Perform login with specified method
   * Main authentication entry point that routes to the appropriate login method.
   * Checks if user is already logged in before attempting login.
   *
   * @param {'email'|'facebook'|'google'|'apple'} loginMethod - Login method to use
   * @param {{email?: string, password?: string}} [credentials={}] - Credentials object (required for email method: email and password)
   * @returns {Promise<{success: boolean, error?: string, alreadyLoggedIn?: boolean}>} Object indicating success, error message, or already logged in status
   * @throws {Error} If login method is unknown
   *
   * @example
   * // Email login
   * const result = await performLogin('email', {
   *   email: 'user@example.com',
   *   password: 'password123'
   * });
   *
   * @example
   * // Apple login
   * const result = await performLogin('apple');
   * if (result.alreadyLoggedIn) {
   *   logger('info', 'Auth', 'Already logged in');
   * }
   */
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

  // Export to global scope
  window.Auth = {
    checkLoginStatus,
    performLogin,
    performEmailLogin,
    performFacebookLogin,
    performGoogleLogin,
    performAppleLogin
  };
})();
