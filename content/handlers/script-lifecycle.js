/**
 * @fileoverview Script Lifecycle Handler for Content Script
 * Manages script initialization, execution, and status notifications.
 * @module ContentScriptLifecycle
 */

(function() {
  'use strict';

  // Dependencies
  const { DEFAULTS, DELAYS } = window.Constants;
  const { logger } = window.Logger;
  const { delay } = window.DOMHelpers;
  const { checkLoginStatus, performLogin } = window.Auth;
  const { openProfile } = window.ProfileOpener;
  const { autoTapAndNext } = window.AutoTap;

  /**
   * Get credentials from background script
   * @returns {Promise<Object|null>} Credentials object or null on error
   */
  async function getCredentialsFromBackground() {
    // Use centralized messaging utility
    if (typeof window !== 'undefined' && window.sendToBackground) {
      const result = await window.sendToBackground({ action: 'getCredentials' });

      if (!result.success) {
        logger('error', 'ContentScriptLifecycle', `Failed to get credentials: ${result.error} (${result.errorType})`);
        return null;
      }

      return result.data;
    }

    // Fallback for direct chrome.runtime.sendMessage
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getCredentials' }, (response) => {
        if (chrome.runtime.lastError) {
          logger('error', 'ContentScriptLifecycle', 'Erreur récupération identifiants: ' + chrome.runtime.lastError.message);
          resolve(null);
        } else {
          resolve(response);
        }
      });
    });
  }

  /**
   * Notify popup about script status change
   * @param {boolean} isRunning - Whether script is running
   */
  function notifyPopupScriptStatus(isRunning) {
    // Use centralized messaging utility if available
    if (typeof window !== 'undefined' && window.sendToBackground) {
      window.sendToBackground({
        action: 'scriptStatusChanged',
        isRunning: isRunning
      });
    } else {
      chrome.runtime.sendMessage({
        action: 'scriptStatusChanged',
        isRunning: isRunning
      }).catch(err => {
        // Ignore errors if popup is not open
      });
    }
  }

  /**
   * Initialize and run the script
   * Handles login, profile opening, and starts auto-tap loop
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function initAndRun() {
    if (window.__grindrRunning) {
      logger('warn', 'ContentScriptLifecycle', '⚠️ Le script est déjà en cours d\'exécution. Attendez la fin ou rechargez la page.');
      return { success: false, error: 'Script déjà en cours d\'exécution' };
    }

    // Reset flags to allow restart even after manual stop
    window.__grindrRunning = true;
    window.__grindrStopped = false;

    // Notify popup that script is starting
    notifyPopupScriptStatus(true);
    logger('info', 'ContentScriptLifecycle', '🚀 Démarrage du script...');

    try {
      logger('info', 'ContentScriptLifecycle', '🔍 Vérification de l\'état de connexion...');
      const isLoggedIn = checkLoginStatus();

      if (!isLoggedIn) {
        logger('info', 'ContentScriptLifecycle', '🔐 Non connecté, tentative de connexion automatique...');

        const credentials = await getCredentialsFromBackground();

        if (credentials && credentials.autoLogin) {
          const loginMethod = credentials.loginMethod || DEFAULTS.LOGIN_METHOD;
          logger('info', 'ContentScriptLifecycle', `🔑 Méthode de connexion: ${loginMethod}`);

          if (loginMethod === 'email' && (!credentials.email || !credentials.password)) {
            logger('warn', 'ContentScriptLifecycle', '⚠️ Email et mot de passe requis pour la connexion par email');
            window.__grindrRunning = false;
            notifyPopupScriptStatus(false);
            return { success: false, error: 'Email et mot de passe requis pour la connexion par email' };
          }

          logger('info', 'ContentScriptLifecycle', '🔐 Connexion en cours...');
          const loginResult = await performLogin(loginMethod, {
            email: credentials.email,
            password: credentials.password
          });

          if (!loginResult.success) {
            logger('error', 'ContentScriptLifecycle', '❌ Échec de la connexion: ' + loginResult.error);
            window.__grindrRunning = false;
            notifyPopupScriptStatus(false);
            return { success: false, error: 'Échec de la connexion: ' + loginResult.error };
          }

          await delay(DELAYS.TWO_SECONDS);
        } else {
          logger('warn', 'ContentScriptLifecycle', '⚠️ Aucune configuration trouvée ou connexion automatique désactivée');
          logger('warn', 'ContentScriptLifecycle', '💡 Configurez votre méthode de connexion dans le popup de l\'extension');
          window.__grindrRunning = false;
          notifyPopupScriptStatus(false);
          return { success: false, error: 'Aucune configuration trouvée ou connexion automatique désactivée' };
        }
      } else {
        logger('info', 'ContentScriptLifecycle', '✅ Déjà connecté');
      }

      const stillLoggedIn = checkLoginStatus();
      if (!stillLoggedIn) {
        logger('error', 'ContentScriptLifecycle', '❌ Échec de la connexion ou déconnexion détectée');
        window.__grindrRunning = false;
        notifyPopupScriptStatus(false);
        return { success: false, error: 'Échec de la connexion ou déconnexion détectée' };
      }

      const profileOpened = await openProfile();

      if (!profileOpened) {
        logger('error', 'ContentScriptLifecycle', '❌ Le profil n\'a pas pu être ouvert. Le script ne sera pas exécuté.');
        window.__grindrRunning = false;
        notifyPopupScriptStatus(false);
        return { success: false, error: 'Le profil n\'a pas pu être ouvert' };
      }

      // Script will continue with autoTapAndNext in background
      // Return success immediately as script has started
      autoTapAndNext().catch((error) => {
        logger('error', 'ContentScriptLifecycle', '❌ Erreur dans autoTapAndNext: ' + error.message);
      });

      // Notify popup that script has started
      notifyPopupScriptStatus(true);

      return { success: true };

    } catch (error) {
      logger('error', 'ContentScriptLifecycle', '❌ Erreur fatale: ' + error.message, error);
      window.__grindrRunning = false;
      notifyPopupScriptStatus(false);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop the script
   */
  function stopScript() {
    window.__grindrRunning = false;
    window.__grindrStopped = true;
    window.__grindrStats = null;
    logger('info', 'ContentScriptLifecycle', '⏹️ Script arrêté manuellement');
    notifyPopupScriptStatus(false);
  }

  // Export to global scope
  window.ContentScriptLifecycle = {
    initAndRun,
    stopScript,
    notifyPopupScriptStatus,
    getCredentialsFromBackground
  };

  // Also export notifyPopupScriptStatus directly for backward compatibility
  window.notifyPopupScriptStatus = notifyPopupScriptStatus;
})();