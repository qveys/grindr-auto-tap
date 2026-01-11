// Module d'authentification pour Grindr

// Fonction pour vérifier si l'utilisateur est connecté
function checkLoginStatus() {
  // Vérifier plusieurs indicateurs de connexion
  // 1. Vérifier si on est sur la page de login
  const loginPage = document.querySelector('input[type="email"], input[type="text"][name*="email"], input[type="text"][placeholder*="email" i]');
  if (loginPage) {
    return false; // On est sur la page de login, donc pas connecté
  }

  // 2. Vérifier si on voit des éléments typiques d'une session connectée
  const profileElements = document.querySelector('img[alt="Next Profile"]') ||
    document.querySelector('button[aria-label="Tap"]') ||
    document.querySelector('[data-testid*="profile"]') ||
    document.querySelector('nav, header');

  if (profileElements) {
    return true; // Probablement connecté
  }

  // 3. Vérifier l'URL
  if (window.location.pathname.includes('/login') || window.location.pathname.includes('/signin')) {
    return false;
  }

  // Par défaut, considérer comme connecté si on n'est pas sur la page de login
  return true;
}

// Fonction pour remplir le formulaire de connexion
async function fillLoginForm(email, password) {
  // Chercher les champs email et password
  const emailField = document.querySelector('input[type="email"]') ||
    document.querySelector('input[type="text"][name*="email" i]') ||
    document.querySelector('input[type="text"][placeholder*="email" i]') ||
    document.querySelector('input[type="text"][id*="email" i]');

  const passwordField = document.querySelector('input[type="password"]') ||
    document.querySelector('input[name*="password" i]') ||
    document.querySelector('input[id*="password" i]');

  if (!emailField || !passwordField) {
    throw new Error('Champs de connexion introuvables');
  }

  // Remplir les champs de manière naturelle (simuler la saisie humaine)
  emailField.focus();
  emailField.value = '';
  await delay(100);

  // Simuler la frappe caractère par caractère
  for (const char of email) {
    emailField.value += char;
    emailField.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(50 + Math.random() * 50); // Délai variable pour paraître naturel
  }

  emailField.dispatchEvent(new Event('change', { bubbles: true }));
  await delay(200);

  passwordField.focus();
  passwordField.value = '';
  await delay(100);

  // Simuler la frappe du mot de passe
  for (const char of password) {
    passwordField.value += char;
    passwordField.dispatchEvent(new Event('input', { bubbles: true }));
    await delay(50 + Math.random() * 50);
  }

  passwordField.dispatchEvent(new Event('change', { bubbles: true }));
  await delay(200);

  return { emailField, passwordField };
}

// Fonction pour cliquer sur le bouton de connexion
async function clickLoginButton() {
  // Chercher le bouton de connexion
  const loginButton = document.querySelector('button[type="submit"]') ||
    document.querySelector('button:has-text("Log in")') ||
    document.querySelector('button:has-text("Sign in")') ||
    document.querySelector('button[aria-label*="log" i]') ||
    document.querySelector('button[aria-label*="sign" i]') ||
    document.querySelector('form button') ||
    document.querySelector('button.btn-primary, button.primary');

  if (!loginButton) {
    throw new Error('Bouton de connexion introuvable');
  }

  // Vérifier si un captcha est présent
  const captcha = document.querySelector('[data-captcha], iframe[src*="recaptcha"], .g-recaptcha');
  if (captcha) {
    throw new Error('Captcha détecté - action manuelle requise');
  }

  loginButton.click();
  await delay(1000);

  return true;
}

// Fonction pour effectuer la connexion complète
async function performLogin(email, password) {
  try {
    console.log('[Auth] 🔐 Début de la connexion...');

    // Vérifier si on est déjà connecté
    if (checkLoginStatus()) {
      console.log('[Auth] ✅ Déjà connecté');
      return { success: true, alreadyLoggedIn: true };
    }

    // Remplir le formulaire
    await fillLoginForm(email, password);
    console.log('[Auth] 📝 Formulaire rempli');

    // Cliquer sur le bouton de connexion
    await clickLoginButton();
    console.log('[Auth] 🖱️ Bouton de connexion cliqué');

    // Attendre que la connexion soit complète
    await waitForLogin();

    console.log('[Auth] ✅ Connexion réussie');
    return { success: true };

  } catch (error) {
    console.error('[Auth] ❌ Erreur lors de la connexion:', error.message);
    return { success: false, error: error.message };
  }
}

// Fonction pour attendre que la connexion soit complète
async function waitForLogin(maxWait = 10000) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    await delay(500);

    // Vérifier si on est maintenant connecté
    if (checkLoginStatus()) {
      return true;
    }

    // Vérifier s'il y a une erreur de connexion
    const errorMessage = document.querySelector('.error, .alert-error, [role="alert"]');
    if (errorMessage && errorMessage.textContent.toLowerCase().includes('incorrect') ||
      errorMessage.textContent.toLowerCase().includes('wrong')) {
      throw new Error('Identifiants incorrects');
    }

    // Vérifier si un captcha est apparu
    const captcha = document.querySelector('[data-captcha], iframe[src*="recaptcha"]');
    if (captcha) {
      throw new Error('Captcha détecté - action manuelle requise');
    }
  }

  throw new Error('Timeout lors de l\'attente de la connexion');
}

// Fonction pour gérer l'authentification à deux facteurs (notification uniquement)
function handle2FA() {
  const twoFactorElement = document.querySelector('input[type="text"][placeholder*="code" i], input[name*="code" i]');
  if (twoFactorElement) {
    console.warn('[Auth] ⚠️ Authentification à deux facteurs requise - action manuelle nécessaire');
    return true;
  }
  return false;
}

// Fonction utilitaire pour les délais
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

