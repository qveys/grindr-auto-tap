# REFACTORING_OPPORTUNITIES.md

Documentation des opportunités d'amélioration du code pour les prochaines releases de **Grindr Auto Tap Extension v2.0+**.

---

## 📋 Table des matières

1. [Duplication de la fonction logger](#1-duplication-de-la-fonction-logger)
2. [Centralisation des utilitaires de délai](#2-centralisation-des-utilitaires-de-délai)
3. [Gestion des erreurs chrome.runtime](#3-gestion-des-erreurs-chromeruntime)
4. [Extraction des constantes magiques](#4-extraction-des-constantes-magiques)
5. [Modularisation des sélecteurs DOM](#5-modularisation-des-sélecteurs-dom)
6. [Typage avec JSDoc ou TypeScript](#6-typage-avec-jsdoc-ou-typescript)
7. [Tests unitaires et d'intégration](#7-tests-unitaires-et-dintégration)
8. [Gestion centralisée des promises](#8-gestion-centralisée-des-promises)

---

## 1. Duplication de la fonction logger

### 🔴 Problème actuel

La fonction `logger(level, location, message, data)` est **dupliquée identiquement** dans :
- `modules/auth.js` (lignes ~18-40)
- `modules/profile-opener.js` (lignes ~18-40)
- `modules/stats.js` (lignes ~18-40)

**Total : ~66 lignes de code dupliquées**

```javascript
// Répété dans auth.js, profile-opener.js, stats.js
function logger(level, location, message, data = null) {
  const logEntry = {
    timestamp: Date.now(),
    level: level,
    location: location || 'Auth', // ⚠️ Seule différence : nom du module
    message: message,
    data: data
  };

  const consoleMethod = level === 'error' ? console.error :
    level === 'warn' ? console.warn :
      level === 'debug' ? console.debug :
        console.log;
  consoleMethod(`[${location}] ${message}`, data || '');

  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({
      action: 'addLog',
      logEntry: logEntry
    }).catch(err => {
      console.error('Failed to send log to background:', err);
    });
  }
}
```

### ✅ Solution proposée

**Réutiliser le module `modules/logger.js` déjà existant :**

1. **Modifier `modules/logger.js`** pour exporter globalement :

```javascript
// modules/logger.js (fin du fichier)
// Export global pour utilisation dans content scripts
window.Logger = logger;
```

2. **Remplacer dans auth.js, profile-opener.js, stats.js :**

```javascript
// modules/auth.js (AVANT)
function logger(level, location, message, data = null) {
  // ... 22 lignes de duplication ...
}

// modules/auth.js (APRÈS)
const logger = window.Logger || {
  info: (loc, msg, data) => console.log(`[${loc}] ${msg}`, data),
  warn: (loc, msg, data) => console.warn(`[${loc}] ${msg}`, data),
  error: (loc, msg, data) => console.error(`[${loc}] ${msg}`, data),
  debug: (loc, msg, data) => console.debug(`[${loc}] ${msg}`, data)
};
```

3. **Adapter les appels :**

```javascript
// AVANT
logger('info', 'performEmailLogin', 'Starting email login flow');

// APRÈS
logger.info('performEmailLogin', 'Starting email login flow');
```

### 📊 Impact

| Métrique | Avant | Après | Gain |
|----------|-------|-------|------|
| Lignes de code | 66 lignes dupliquées | 0 lignes dupliquées | **-66 lignes** |
| Modules concernés | 3 modules | 1 module central | **+66% maintenabilité** |
| Risque de régression | Élevé (3 endroits à maintenir) | Faible (1 seul endroit) | **-66% risque** |

### ⚡ Priorité

**🔥 HAUTE** - Amélioration immédiate de la maintenabilité sans risque fonctionnel.

### ⚠️ Risques

- **Faible** : Nécessite de s'assurer que `logger.js` est chargé **avant** les autres modules dans `manifest.json` (déjà le cas actuellement)

---

## 2. Centralisation des utilitaires de délai

### 🔴 Problème actuel

La fonction `delay(ms)` est **redéfinie localement** dans :
- `modules/auth.js` (ligne ~13)
- `modules/profile-opener.js` (ligne ~13)
- `modules/stats.js` (ligne ~13)

**Total : 3 définitions identiques**

```javascript
// Répété dans 3 modules
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
```

La fonction `delay(ms)` existe déjà dans `utils/formatters.js` mais n'est pas exportée globalement.

### ✅ Solution proposée

**Exporter `delay` globalement depuis `utils/formatters.js` :**

```javascript
// utils/formatters.js (fin du fichier)
// Export global pour utilisation dans content scripts
window.Utils = {
  formatDate,
  formatDuration,
  delay
};
```

**Utiliser dans les modules :**

```javascript
// modules/auth.js (AVANT)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// modules/auth.js (APRÈS)
const delay = window.Utils?.delay || ((ms) => new Promise(resolve => setTimeout(resolve, ms)));
```

### 📊 Impact

| Métrique | Gain |
|----------|------|
| Lignes de code | **-3 lignes** |
| Modules concernés | 1 module central vs 3 modules |
| Cohérence | **+100%** (une seule source de vérité) |

### ⚡ Priorité

**🟡 MOYENNE** - Amélioration mineure mais renforce la cohérence du code.

---

## 3. Gestion des erreurs chrome.runtime

### 🔴 Problème actuel

Le pattern de gestion d'erreur pour `chrome.runtime.sendMessage` est **répété 15+ fois** :

```javascript
chrome.runtime.sendMessage({
  action: 'addLog',
  logEntry: logEntry
}).catch(err => {
  console.error('Failed to send log to background:', err);
});
```

### ✅ Solution proposée

**Créer un wrapper centralisé dans `utils/storage.js` ou nouveau fichier `utils/messaging.js` :**

```javascript
// utils/messaging.js
/**
 * Send message to background script with error handling
 * @param {Object} message - Message to send
 * @returns {Promise<any>} Response from background
 */
export function sendToBackground(message) {
  return new Promise((resolve, reject) => {
    if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) {
      console.warn('Chrome runtime not available');
      resolve(null);
      return;
    }

    chrome.runtime.sendMessage(message)
      .then(resolve)
      .catch(err => {
        console.error(`Failed to send message (${message.action}):`, err);
        resolve(null); // Fail silently
      });
  });
}

// Export global
window.Messaging = { sendToBackground };
```

**Utilisation :**

```javascript
// AVANT
chrome.runtime.sendMessage({
  action: 'addLog',
  logEntry: logEntry
}).catch(err => {
  console.error('Failed to send log to background:', err);
});

// APRÈS
window.Messaging.sendToBackground({
  action: 'addLog',
  logEntry: logEntry
});
```

### 📊 Impact

| Métrique | Gain |
|----------|------|
| Lignes de code | **-45 lignes** (15 occurrences × 3 lignes) |
| Gestion d'erreur | Centralisée et cohérente |
| Testabilité | **+100%** (un seul point d'injection) |

### ⚡ Priorité

**🟢 BASSE** - Amélioration qualitative sans impact fonctionnel majeur.

---

## 4. Extraction des constantes magiques

### 🔴 Problème actuel

Des constantes "magiques" sont dispersées dans le code :

```javascript
// background.js
const MAX_LOGS = 1000; // ❌ Dupliqué

// modules/logger.js
const MAX_LOGS = 1000; // ❌ Dupliqué

// popup.js
visibleLogs = logs.slice(-50); // ❌ Magic number
logsPoller = setInterval(pollFn, 500); // ❌ Magic number
```

### ✅ Solution proposée

**Centraliser dans `utils/constants.js` :**

```javascript
// utils/constants.js
window.Constants = {
  // ... constantes existantes ...

  LOGGING: {
    MAX_LOGS: 1000,
    MAX_VISIBLE_LOGS: 50,
    POLL_INTERVAL_MS: 500
  },

  UI: {
    NOTIFICATION_DURATION_MS: 3000,
    ANIMATION_DURATION_MS: 300
  }
};
```

**Utilisation :**

```javascript
// AVANT
const MAX_LOGS = 1000;

// APRÈS
const { MAX_LOGS } = window.Constants.LOGGING;
```

### 📊 Impact

| Métrique | Gain |
|----------|------|
| Maintenabilité | **+50%** (modification en un seul endroit) |
| Documentation | Implicite par regroupement |
| Risque de désynchronisation | **-100%** |

### ⚡ Priorité

**🟡 MOYENNE** - Améliore la lisibilité et la maintenabilité.

---

## 5. Modularisation des sélecteurs DOM

### 🔴 Problème actuel

Les sélecteurs DOM sont tous dans `utils/constants.js`, mais certains modules ont des besoins spécifiques qui pourraient être mieux organisés.

**Exemple :** Les sélecteurs Apple sont mélangés avec les sélecteurs généraux.

### ✅ Solution proposée

**Restructurer `utils/constants.js` par domaine fonctionnel :**

```javascript
// utils/constants.js
window.Constants = {
  SELECTORS: {
    AUTH: {
      EMAIL_INPUT: 'input[type="email"], ...',
      PASSWORD_INPUT: 'input[type="password"], ...',
      LOGIN_BUTTON: 'button[type="submit"], ...',
      FACEBOOK_BUTTON: 'button[title="Log In With Facebook"], ...',
      GOOGLE_BUTTON: 'button[title="Log In With Google"], ...',
      APPLE_BUTTON: 'button[title="Log In With Apple"], ...',
      ERROR_MESSAGE: '.error, .alert-error, ...'
    },
    PROFILE: {
      NEXT_PROFILE: 'img[alt="Next Profile"]',
      TAP_BUTTON: 'button[aria-label="Tap"]',
      PROFILE_VIEW: '[data-testid*="profile-view"], ...',
      PROFILE_GRIDCELL: 'div[role="gridcell"]'
    },
    STATUS: {
      PROFILE_INDICATORS: 'img[alt="Next Profile"], ...',
    }
  },

  APPLE: {
    SIGN_IN_BUTTON_ID: 'sign-in',
    BUTTON_CLASSES: 'button.signin-v2__buttons-wrapper__button-wrapper__button, ...',
    POPUP_CHECK_INTERVAL: 1000,
    DOMAINS: ['apple.com', 'appleid.apple.com', 'idmsa.apple.com']
  }
};
```

**Utilisation :**

```javascript
// AVANT
const emailField = document.querySelector(SELECTORS.EMAIL_INPUT);

// APRÈS
const emailField = document.querySelector(SELECTORS.AUTH.EMAIL_INPUT);
```

### 📊 Impact

| Métrique | Gain |
|----------|------|
| Organisation | **+75%** clarté par domaine |
| Découvrabilité | Meilleure navigation dans les constantes |
| Maintenance | Facilite les modifications par module |

### ⚡ Priorité

**🟢 BASSE** - Nice-to-have, amélioration structurelle.

---

## 6. Typage avec JSDoc ou TypeScript

### 🔴 Problème actuel

Aucun typage statique, ce qui rend le code fragile aux erreurs de type :

```javascript
// Pas de garantie de type
function performLogin(loginMethod, email, password) {
  // loginMethod pourrait être n'importe quoi
  // email et password pourraient être undefined
}
```

### ✅ Solution proposée

**Option A : Ajouter JSDoc complet :**

```javascript
/**
 * Perform login with specified method
 * @param {'email'|'facebook'|'google'|'apple'} loginMethod - Login method to use
 * @param {string} [email] - Email address (required for email login)
 * @param {string} [password] - Password (required for email login)
 * @returns {Promise<boolean>} True if successful, false otherwise
 * @throws {Error} If loginMethod is invalid
 */
async function performLogin(loginMethod, email, password) {
  // ...
}
```

**Option B : Migrer vers TypeScript :**

```typescript
// modules/auth.ts
type LoginMethod = 'email' | 'facebook' | 'google' | 'apple';

interface LoginCredentials {
  email?: string;
  password?: string;
}

async function performLogin(
  method: LoginMethod,
  credentials?: LoginCredentials
): Promise<boolean> {
  // ...
}
```

### 📊 Impact

| Métrique | Gain |
|----------|------|
| Sécurité du type | **+100%** (détection en dev) |
| Documentation | Intégrée au code |
| Erreurs runtime | **-70%** (erreurs détectées avant exécution) |

### ⚡ Priorité

**🟡 MOYENNE** - Investissement initial élevé mais ROI important sur le long terme.

---

## 7. Tests unitaires et d'intégration

### 🔴 Problème actuel

**Aucun test automatisé** n'existe actuellement.

### ✅ Solution proposée

**Mettre en place Jest + Testing Library :**

```javascript
// __tests__/modules/auth.test.js
import { performEmailLogin, checkLoginStatus } from '../../modules/auth';

describe('Auth Module', () => {
  describe('checkLoginStatus', () => {
    test('should return false when login form is present', () => {
      document.body.innerHTML = '<input type="email" />';
      expect(checkLoginStatus()).toBe(false);
    });

    test('should return true when profile indicators exist', () => {
      document.body.innerHTML = '<img alt="Next Profile" />';
      expect(checkLoginStatus()).toBe(true);
    });
  });

  describe('performEmailLogin', () => {
    test('should fill form and submit', async () => {
      // Mock DOM
      document.body.innerHTML = `
        <input type="email" />
        <input type="password" />
        <button type="submit">Login</button>
      `;

      const result = await performEmailLogin('test@example.com', 'password123');
      expect(result).toBe(true);
    });
  });
});
```

**Structure des tests :**

```
extension/
├─ __tests__/
│  ├─ modules/
│  │  ├─ auth.test.js
│  │  ├─ profile-opener.test.js
│  │  └─ stats.test.js
│  ├─ utils/
│  │  ├─ formatters.test.js
│  │  └─ storage.test.js
│  └─ integration/
│     └─ full-flow.test.js
├─ jest.config.js
└─ package.json
```

### 📊 Impact

| Métrique | Gain |
|----------|------|
| Couverture de code | 0% → **80%+** |
| Régression bugs | **-90%** (détection précoce) |
| Confiance refactoring | **+500%** |
| Temps de debug | **-50%** |

### ⚡ Priorité

**🔥 HAUTE** - Critique pour évolution future sans régression.

---

## 8. Gestion centralisée des promises

### 🔴 Problème actuel

Gestion incohérente des promises :

```javascript
// Parfois try/catch
try {
  await performLogin();
} catch (error) {
  return false;
}

// Parfois .catch()
chrome.runtime.sendMessage().catch(err => console.error(err));

// Parfois rien
await delay(1000);
```

### ✅ Solution proposée

**Créer des wrappers uniformes :**

```javascript
// utils/async-helpers.js

/**
 * Safe async wrapper with timeout
 * @template T
 * @param {Promise<T>} promise - Promise to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<{success: boolean, data?: T, error?: Error}>}
 */
export async function safeAsync(promise, timeoutMs = 10000) {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    );

    const data = await Promise.race([promise, timeoutPromise]);
    return { success: true, data };
  } catch (error) {
    return { success: false, error };
  }
}

// Export global
window.AsyncHelpers = { safeAsync };
```

**Utilisation :**

```javascript
// AVANT
try {
  await fillLoginForm(email, password);
  return true;
} catch (error) {
  logger.error('fillLoginForm', 'Failed', { error: error.message });
  return false;
}

// APRÈS
const { success, error } = await window.AsyncHelpers.safeAsync(
  fillLoginForm(email, password),
  5000 // timeout
);

if (!success) {
  logger.error('fillLoginForm', 'Failed', { error: error.message });
  return false;
}
```

### 📊 Impact

| Métrique | Gain |
|----------|------|
| Cohérence | **+100%** |
| Gestion timeout | Uniformisée |
| Debugging | Plus facile (format standardisé) |

### ⚡ Priorité

**🟡 MOYENNE** - Amélioration qualitative progressive.

---

## 📋 Plan d'implémentation recommandé

### Release v1.1 (Quick Wins)
1. ✅ **Refactoring #1** : Duplication logger (1 jour)
2. ✅ **Refactoring #4** : Extraction constantes magiques (2 heures)

### Release v1.2 (Code Quality)
3. ✅ **Refactoring #2** : Centralisation delay (1 heure)
4. ✅ **Refactoring #3** : Wrapper chrome.runtime (2 heures)
5. ✅ **Refactoring #6** : JSDoc complet (1 jour)

### Release v2.0 (Major Improvements)
6. ✅ **Refactoring #7** : Tests unitaires (3 jours)
7. ✅ **Refactoring #5** : Modularisation sélecteurs (1 jour)
8. ✅ **Refactoring #8** : Async helpers (1 jour)

### Release v3.0 (Long-term)
9. 🔄 Migration TypeScript (1-2 semaines)

---

## 🎯 Métriques de succès

| Indicateur | Objectif v2.0 |
|------------|---------------|
| Duplication de code | **< 5%** |
| Couverture tests | **> 80%** |
| Lignes de code | **-200 lignes** (via refactoring) |
| Complexité cyclomatique | **< 10 par fonction** |
| Temps d'ajout feature | **-40%** |

---

## 📚 Ressources

- [ESLint](https://eslint.org/) - Linting automatique
- [Jest](https://jestjs.io/) - Framework de test
- [JSDoc](https://jsdoc.app/) - Documentation JavaScript
- [TypeScript](https://www.typescriptlang.org/) - Typage statique
- [Chrome Extension Best Practices](https://developer.chrome.com/docs/extensions/mv3/devguide/)

---

**Auteur :** Expert Senior en Architecture Logicielle  
**Date :** 2026-01-03  
**Version :** 1.0  
**Licence :** Proprietary
