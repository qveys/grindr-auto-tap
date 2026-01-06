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
  const { StateManager } = window;

  /**
   * Stop script with error state
   * @param {string} reason - Reason for stopping
   * @private
   */
  function stopWithError(reason) {
    if (StateManager) {
      StateManager.setState(StateManager.State.ERROR);
    } else {
      window.__grindrRunning = false;
    }
    notifyPopupScriptStatus(false);
    logger('error', 'ContentScriptLifecycle', reason);
  }

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
   * Broadcasts message to all extension pages (popup, options, etc.)
   * @param {boolean} isRunning - Whether script is running
   */
  function notifyPopupScriptStatus(isRunning) {
    // Send directly to runtime (broadcasts to all extension pages)
    // DO NOT use sendToBackground() - this is a broadcast message, not a background-specific request
    chrome.runtime.sendMessage({
      action: 'scriptStatusChanged',
      isRunning: isRunning
    }).catch(err => {
      // Ignore errors if no extension pages are listening (e.g., popup closed)
    });
  }

  /**
   * Initialize and run the script
   * Handles login, profile opening, and starts auto-tap loop
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function initAndRun() {
    // Check if already running using StateManager
    if (StateManager && StateManager.isRunning()) {
      logger('warn', 'ContentScriptLifecycle', '⚠️ Le script est déjà en cours d\'exécution. Attendez la fin ou rechargez la page.');
      return { success: false, error: 'Script déjà en cours d\'exécution' };
    }

    // Reset from ERROR or STOPPED state to IDLE first
    if (StateManager) {
      const currentState = StateManager.getState();
      if (currentState === StateManager.State.ERROR || currentState === StateManager.State.STOPPED) {
        logger('info', 'ContentScriptLifecycle', `🔄 Réinitialisation depuis ${currentState} vers IDLE`);
        StateManager.setState(StateManager.State.IDLE);
      }
      // Now transition to STARTING
      StateManager.setState(StateManager.State.STARTING);
    } else {
      // Fallback
      window.__grindrRunning = true;
      window.__grindrStopped = false;
    }

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
            const error = 'Email et mot de passe requis pour la connexion par email';
            stopWithError(`⚠️ ${error}`);
            return { success: false, error };
          }

          logger('info', 'ContentScriptLifecycle', '🔐 Connexion en cours...');
          const loginResult = await performLogin(loginMethod, {
            email: credentials.email,
            password: credentials.password
          });

          if (!loginResult.success) {
            const error = 'Échec de la connexion: ' + loginResult.error;
            stopWithError(`❌ ${error}`);
            return { success: false, error };
          }

          await delay(DELAYS.TWO_SECONDS);
        } else {
          const error = 'Aucune configuration trouvée ou connexion automatique désactivée';
          logger('warn', 'ContentScriptLifecycle', `⚠️ ${error}`);
          logger('warn', 'ContentScriptLifecycle', '💡 Configurez votre méthode de connexion dans le popup de l\'extension');
          stopWithError(error);
          return { success: false, error };
        }
      } else {
        logger('info', 'ContentScriptLifecycle', '✅ Déjà connecté');
      }

      const stillLoggedIn = checkLoginStatus();
      if (!stillLoggedIn) {
        const error = 'Échec de la connexion ou déconnexion détectée';
        stopWithError(`❌ ${error}`);
        return { success: false, error };
      }

      const profileOpened = await openProfile();

      if (!profileOpened) {
        const error = 'Le profil n\'a pas pu être ouvert';
        stopWithError(`❌ ${error}. Le script ne sera pas exécuté.`);
        return { success: false, error };
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
      stopWithError('❌ Erreur fatale: ' + error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Stop the script
   */
  function stopScript() {
    if (StateManager) {
      StateManager.setState(StateManager.State.STOPPED);
      StateManager.clearStats();
    } else {
      window.__grindrRunning = false;
      window.__grindrStopped = true;
      window.__grindrStats = null;
    }
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