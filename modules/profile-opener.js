/**
 * Profile opener module for Grindr Auto Tap extension
 * Handles opening the first profile before starting the auto-tap loop
 */

(function() {
  'use strict';

  // Dependencies: window.Constants, window.Logger, window.DOMHelpers
  const { SELECTORS, DELAYS } = window.Constants;
  const { logger } = window.Logger;
  const { delay } = window.DOMHelpers;

  /**
   * Dismiss the beta banner if present
   * @returns {Promise<void>}
   */
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

  /**
   * Verify that a profile is currently opened
   * @returns {boolean} True if profile is open, false otherwise
   */
  function verifyProfileOpened() {
    const currentURL = window.location.href;
    const urlContainsProfile = currentURL.includes('?profile=true') || currentURL.includes('&profile=true');
    const nextProfileBtn = document.querySelector(SELECTORS.PROFILE.NEXT_PROFILE);
    const tapButton = document.querySelector(SELECTORS.PROFILE.TAP_BUTTON);
    const profileView = document.querySelector(SELECTORS.PROFILE.VIEW);

    // Un profil est considéré comme ouvert SEULEMENT si les boutons/vue sont présents
    // L'URL seule ne suffit PAS (car elle peut être changée sans que le DOM se mette à jour)
    const hasProfileElements = !!(nextProfileBtn || tapButton || profileView);

    logger('debug', 'Content', 'verifyProfileOpened check', {
      url: currentURL,
      urlContainsProfile,
      hasNextProfileBtn: !!nextProfileBtn,
      hasTapButton: !!tapButton,
      hasProfileView: !!profileView,
      result: hasProfileElements,
      hypothesisId: 'E'
    });

    return hasProfileElements;
  }

  /**
   * Open the first profile by performing necessary actions
   * @returns {Promise<boolean>} True if profile opened successfully, false otherwise
   */
  async function openProfile() {
    try {
      logger('info', 'Content', '🔧 Exécution des actions préalables...');

      // Vérifier si le script a été arrêté avant de continuer
      if (!window.__grindrRunning || window.__grindrStopped) {
        logger('info', 'Content', '⏹️ Script arrêté, interruption des actions préalables');
        return false;
      }

      await dismissBetaBanner();
      await delay(DELAYS.SECOND);

      // Action 1: Clic sur cascadeCellContainer img
      logger('info', 'Content', '🎯 Action 1: Clic sur cascadeCellContainer img...');
      const cascadeImg = document.querySelector('[data-testid="cascadeCellContainer"] img');
      if (cascadeImg) {
        cascadeImg.click();
        await delay(DELAYS.SECOND);
      } else {
        logger('warn', 'Content', '⚠️ cascadeCellContainer img non trouvé');
      }

      // Action 2: Clic sur userAvatar img
      logger('info', 'Content', '🎯 Action 2: Clic sur userAvatar img...');
      const userAvatarImg = document.querySelector('[data-testid="userAvatar"] img');
      if (userAvatarImg) {
        userAvatarImg.click();
        await delay(DELAYS.SECOND);
      } else {
        logger('warn', 'Content', '⚠️ userAvatar img non trouvé');
      }

      // Action 3: Fermeture du chat
      logger('info', 'Content', '🎯 Action 3: Fermeture du chat...');
      const closeChatBtn = document.querySelector('[aria-label="close chat"]');
      if (closeChatBtn) {
        closeChatBtn.click();
        await delay(DELAYS.SECOND);
      } else {
        logger('warn', 'Content', '⚠️ Bouton close chat non trouvé');
      }

      // Vérifier que le profil est ouvert
      if (verifyProfileOpened()) {
        logger('info', 'Content', '✅ Profil ouvert avec succès !');
        chrome.runtime.sendMessage({
          action: 'updateStatus',
          message: '✅ Profil ouvert !',
          type: 'success'
        });
        return true;
      } else {
        logger('warn', 'Content', '⚠️ Le profil ne semble pas être ouvert');
        return false;
      }
    } catch (error) {
      logger('warn', 'Content', '⚠️ Erreur lors des actions préalables: ' + error.message);
      return false;
    }
  }

  // Export to global scope
  window.ProfileOpener = {
    dismissBetaBanner,
    verifyProfileOpened,
    openProfile
  };
})();
