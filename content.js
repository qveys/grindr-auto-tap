/**
 * Content script for Grindr Auto Tap extension
 * Main entry point that orchestrates authentication, profile opening, and auto-tap functionality
 */

// Dependencies loaded via manifest.json in order:
// - utils/constants.js (window.Constants)
// - utils/logger.js (window.Logger, window.logger)
// - utils/formatters.js (window.Formatters)
// - utils/dom-helpers.js (window.DOMHelpers)
// - modules/auth.js (window.Auth)
// - modules/profile-opener.js (window.ProfileOpener)
// - modules/stats.js (window.Stats)
// - modules/auto-tap.js (window.AutoTap)

(function () {
  'use strict';

  // Dependencies
  const { DEFAULTS, DELAYS } = window.Constants;
  const { logger } = window.Logger;
  const { delay } = window.DOMHelpers;
  const { checkLoginStatus, performLogin } = window.Auth;
  const { openProfile } = window.ProfileOpener;
  const { createStatsFromGlobalState, sendFinalStats } = window.Stats;
  const { autoTapAndNext } = window.AutoTap;

  /**
   * Get credentials from background script
   * @returns {Promise<Object|null>} Credentials object or null
   */
  async function getCredentialsFromBackground() {
    // Use centralized messaging utility if available
    const sendMessage = (typeof window !== 'undefined' && window.sendToBackground)
      ? window.sendToBackground
      : (msg) => new Promise((res) => {
          chrome.runtime.sendMessage(msg, (response) => {
            if (chrome.runtime.lastError) {
              logger('error', 'Content', 'Erreur récupération identifiants: ' + chrome.runtime.lastError.message);
              res(null);
            } else {
              res(response);
            }
          });
        });

    return await sendMessage({ action: 'getCredentials' });
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
        // Ignorer les erreurs si le popup n'est pas ouvert
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
      logger('warn', 'Content', '⚠️ Le script est déjà en cours d\'exécution. Attendez la fin ou rechargez la page.');
      return { success: false, error: 'Script déjà en cours d\'exécution' };
    }

    // Réinitialiser les flags pour permettre le redémarrage même après un arrêt manuel
    window.__grindrRunning = true;
    window.__grindrStopped = false;

    // Notifier le popup que le script démarre
    notifyPopupScriptStatus(true);
    logger('info', 'Content', '🚀 Démarrage du script...');

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
            notifyPopupScriptStatus(false);
            return { success: false, error: 'Email et mot de passe requis pour la connexion par email' };
          }

          logger('info', 'Content', '🔐 Connexion en cours...');
          const loginResult = await performLogin(loginMethod, {
            email: credentials.email,
            password: credentials.password
          });

          if (!loginResult.success) {
            logger('error', 'Content', '❌ Échec de la connexion: ' + loginResult.error);
            window.__grindrRunning = false;
            notifyPopupScriptStatus(false);
            return { success: false, error: 'Échec de la connexion: ' + loginResult.error };
          }

          await delay(DELAYS.TWO_SECONDS);
        } else {
          logger('warn', 'Content', '⚠️ Aucune configuration trouvée ou connexion automatique désactivée');
          logger('warn', 'Content', '💡 Configurez votre méthode de connexion dans le popup de l\'extension');
          window.__grindrRunning = false;
          notifyPopupScriptStatus(false);
          return { success: false, error: 'Aucune configuration trouvée ou connexion automatique désactivée' };
        }
      } else {
        logger('info', 'Content', '✅ Déjà connecté');
      }

      const stillLoggedIn = checkLoginStatus();
      if (!stillLoggedIn) {
        logger('error', 'Content', '❌ Échec de la connexion ou déconnexion détectée');
        window.__grindrRunning = false;
        notifyPopupScriptStatus(false);
        return { success: false, error: 'Échec de la connexion ou déconnexion détectée' };
      }

      const profileOpened = await openProfile();

      if (!profileOpened) {
        logger('error', 'Content', '❌ Le profil n\'a pas pu être ouvert. Le script ne sera pas exécuté.');
        window.__grindrRunning = false;
        notifyPopupScriptStatus(false);
        return { success: false, error: 'Le profil n\'a pas pu être ouvert' };
      }

      // Le script va continuer avec autoTapAndNext en arrière-plan
      // On retourne success immédiatement car le script a démarré
      autoTapAndNext().catch((error) => {
        logger('error', 'Content', '❌ Erreur dans autoTapAndNext: ' + error.message);
      });

      // Notifier le popup que le script a démarré
      notifyPopupScriptStatus(true);

      return { success: true };

    } catch (error) {
      logger('error', 'Content', '❌ Erreur fatale: ' + error.message, error);
      window.__grindrRunning = false;
      notifyPopupScriptStatus(false);
      return { success: false, error: error.message };
    }
  }

  // Export notifyPopupScriptStatus to global scope for auto-tap module
  window.notifyPopupScriptStatus = notifyPopupScriptStatus;

  // ============================================================================
  // GLOBAL ERROR HANDLERS
  // ============================================================================

  if (!window.__grindrErrorHandlersAdded) {
    window.addEventListener('error', async (event) => {
      logger('error', 'Content', '❌ Erreur globale capturée: ' + (event.error?.message || String(event.error)), event.error);

      if (window.__grindrStats) {
        try {
          const stats = createStatsFromGlobalState(Date.now());
          const errorStats = window.Stats.createErrorStats(stats, event.error);
          await sendFinalStats(errorStats, true);
        } catch (err) {
          logger('error', 'Content', '❌ Erreur lors de l\'envoi des stats d\'erreur: ' + err.message);
        }
      }
    });

    window.addEventListener('unhandledrejection', async (event) => {
      logger('error', 'Content', '❌ Promesse rejetée non gérée: ' + (event.reason?.message || String(event.reason)), event.reason);

      if (window.__grindrStats) {
        try {
          const stats = createStatsFromGlobalState(Date.now());
          const errorStats = window.Stats.createErrorStats(stats, event.reason);
          await sendFinalStats(errorStats, true);
        } catch (err) {
          logger('error', 'Content', '❌ Erreur lors de l\'envoi des stats d\'erreur: ' + err.message);
        }
      }
    });

    window.__grindrErrorHandlersAdded = true;
  }

  // ============================================================================
  // MESSAGE LISTENERS
  // ============================================================================

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'startScript') {
      initAndRun().then((result) => {
        if (result && result.success) {
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: result?.error || 'Échec du démarrage du script' });
        }
      }).catch((error) => {
        sendResponse({ success: false, error: error.message });
      });
      return true; // Indique qu'on répondra de manière asynchrone
    }

    if (request.action === 'stopScript') {
      window.__grindrRunning = false;
      window.__grindrStopped = true;
      window.__grindrStats = null;
      logger('info', 'Content', '⏹️ Script arrêté manuellement');
      notifyPopupScriptStatus(false);
      sendResponse({ success: true });
      return true;
    }

    if (request.action === 'getScriptStatus') {
      sendResponse({ isRunning: window.__grindrRunning || false });
      return true;
    }
  });

  // ============================================================================
  // AUTO-START
  // ============================================================================

  if (window.location.hostname.includes('web.grindr.com')) {
    logger('info', 'Content', '🔍 Vérification du démarrage automatique...');

    chrome.storage.local.get(['autoStart', 'minDelayHours'], (result) => {
      const autoStart = result.autoStart !== false;
      const minDelayHours = result.minDelayHours !== undefined ? result.minDelayHours : DEFAULTS.MIN_DELAY_HOURS;

      logger('info', 'Content', `📋 Configuration auto-start: ${autoStart ? 'activé' : 'désactivé'}, délai min: ${minDelayHours}h`);

      if (autoStart) {
        const startIfNeeded = () => {
          if (window.__grindrRunning || window.__grindrStopped) {
            logger('info', 'Content', 'ℹ️ Script déjà en cours ou arrêté, démarrage automatique ignoré');
            return;
          }

          const minDelayMs = minDelayHours * 60 * 60 * 1000;

          if (window.__grindrLastRun && (Date.now() - window.__grindrLastRun) < minDelayMs) {
            const remainingMs = minDelayMs - (Date.now() - window.__grindrLastRun);
            const remainingHours = (remainingMs / (60 * 60 * 1000)).toFixed(1);
            logger('info', 'Content', `ℹ️ Script récemment terminé, attente de ${remainingHours}h avant relancement automatique`);
            return;
          }
          logger('info', 'Content', '🔄 Démarrage automatique du script activé');
          initAndRun();
        };

        if (document.readyState === 'loading') {
          logger('info', 'Content', '⏳ Page en cours de chargement, attente de DOMContentLoaded...');
          document.addEventListener('DOMContentLoaded', () => {
            logger('info', 'Content', '✅ DOMContentLoaded déclenché, démarrage dans 2 secondes...');
            setTimeout(startIfNeeded, DELAYS.TWO_SECONDS);
          });
        } else {
          logger('info', 'Content', '✅ Page déjà chargée, démarrage dans 2 secondes...');
          setTimeout(startIfNeeded, DELAYS.TWO_SECONDS);
        }
      } else {
        logger('info', 'Content', 'ℹ️ Démarrage automatique désactivé');
      }
    });
  }

  // ============================================================================
  // EXPORTS FOR CONSOLE
  // ============================================================================

  window.grindrAutoTap = {
    start: () => {
      window.__grindrStopped = false;
      initAndRun();
    },
    stop: () => {
      window.__grindrRunning = false;
      window.__grindrStopped = true;
      window.__grindrStats = null;
      logger('info', 'Content', '⏹️ Script arrêté manuellement');
    },
    checkStatus: checkLoginStatus
  };
})();
