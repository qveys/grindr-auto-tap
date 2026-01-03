# Extension Firefox - Grindr Auto Tap

Extension Firefox pour automatiser les actions sur Grindr et envoyer les statistiques vers n8n.

## Fonctionnalités

- ✅ Détection automatique des onglets web.grindr.com
- ✅ Authentification automatique avec identifiants sauvegardés (email, Apple, Facebook, Google)
- ✅ Exécution automatique du script de tap
- ✅ Envoi des statistiques vers n8n (contourne la CSP)
- ✅ Interface de configuration via popup
- ✅ Gestion sécurisée des identifiants (stockage local)

## Installation

1. Ouvrir Firefox
2. Aller dans `about:debugging`
3. Cliquer sur "Ce Firefox" dans le menu de gauche
4. Cliquer sur "Charger un module complémentaire temporaire"
5. Sélectionner le fichier `manifest.json` dans le dossier `extension`

## Configuration

### 1. Ajouter les identifiants

1. Cliquer sur l'icône de l'extension dans la barre d'outils
2. Entrer votre email et mot de passe (ou choisir une autre méthode de connexion)
3. Cocher "Connexion automatique" si souhaité
4. Cliquer sur "Sauvegarder les identifiants"

### 2. Configurer l'URL du webhook n8n

1. Dans le popup, aller à l'onglet "Webhook"
2. Entrer l'URL de votre webhook n8n
3. Cliquer sur "Sauvegarder l'URL"

## Utilisation

### Automatique

L'extension démarre automatiquement quand vous ouvrez web.grindr.com si :
- La connexion automatique est activée
- Les identifiants sont configurés
- Vous êtes connecté ou la connexion automatique réussit

### Manuel

1. Ouvrir web.grindr.com
2. Cliquer sur l'icône de l'extension
3. Cliquer sur "Démarrer le script" ou "Arrêter le script"

### Depuis la console

Vous pouvez aussi contrôler le script depuis la console du navigateur :

```javascript
// Démarrer le script
window.grindrAutoTap.start();

// Arrêter le script
window.grindrAutoTap.stop();

// Vérifier l'état de connexion
window.grindrAutoTap.checkStatus();
```

## Structure des fichiers

```
extension/
├── manifest.json          # Configuration de l'extension
├── background.js          # Service worker (gestion onglets, webhooks n8n, storage)
├── content.js             # Point d'entrée principal (orchestration)
│
├── utils/                 # Utilitaires partagés
│   ├── constants.js       # Constantes (délais, timeouts, selectors, etc.)
│   ├── logger.js          # Système de logging centralisé
│   ├── formatters.js      # Formatage de dates et durées
│   └── dom-helpers.js     # Helpers DOM (delay, getTextNodes, etc.)
│
├── modules/               # Modules fonctionnels
│   ├── auth.js            # Module d'authentification (email, Apple, Facebook, Google)
│   ├── profile-opener.js  # Ouverture du premier profil
│   ├── stats.js           # Gestion des statistiques et envoi webhook
│   └── auto-tap.js        # Boucle principale de tap automatique
│
├── popup.html             # Interface utilisateur
├── popup.js               # Logique du popup
└── icons/                 # Icônes de l'extension
```

### Architecture modulaire

Le code est organisé en modules séparés pour une meilleure maintenabilité :
- **Utils** : Fonctions utilitaires réutilisables
- **Modules** : Logique métier organisée par responsabilité (SOLID)
- **Content.js** : Point d'entrée qui orchestre les modules

Les modules sont chargés dans l'ordre de dépendance via `manifest.json`.

## Sécurité

- Les identifiants sont stockés localement dans `chrome.storage.local`
- Les identifiants ne sont jamais synchronisés avec le cloud
- Les identifiants ne sont jamais exposés dans les logs
- L'extension ne fonctionne que sur web.grindr.com
- Les requêtes webhook passent par le background script (contourne CSP)

## Dépannage

### L'extension ne se charge pas
- Vérifier que tous les fichiers sont présents
- Vérifier la console d'erreur dans `about:debugging`
- Vérifier que les icônes sont présentes dans le dossier `icons/`

### Le script ne démarre pas automatiquement
- Vérifier que "Connexion automatique" est cochée dans le popup
- Vérifier que les identifiants sont sauvegardés
- Vérifier la console du navigateur pour les erreurs (F12)

### Les requêtes vers n8n échouent
- Vérifier que l'URL du webhook est correcte (onglet Webhook dans le popup)
- Vérifier que le webhook n8n est actif
- Vérifier la console du background script dans `about:debugging`

### L'authentification échoue
- Vérifier que les identifiants sont corrects
- Vérifier s'il y a un captcha (nécessite action manuelle)
- Vérifier la console pour les messages d'erreur détaillés

## Notes

- L'extension nécessite les permissions `tabs`, `scripting`, `storage` et `activeTab`
- L'extension fonctionne uniquement sur `*://web.grindr.com/*`
- Architecture modulaire compatible Manifest V3 (partage via `window.*`)
