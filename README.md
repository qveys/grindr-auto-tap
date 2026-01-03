# Extension Firefox - Grindr Auto Tap

Extension Firefox pour automatiser les actions sur Grindr et envoyer les statistiques vers n8n.

## Fonctionnalités

- ✅ Détection automatique des onglets web.grindr.com
- ✅ Authentification automatique avec identifiants sauvegardés
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
2. Entrer votre email et mot de passe
3. Cocher "Connexion automatique" si souhaité
4. Cliquer sur "Sauvegarder les identifiants"

### 2. Configurer l'URL du webhook n8n

1. Dans le popup, entrer l'URL de votre webhook n8n
2. Cliquer sur "Sauvegarder l'URL"

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

- `manifest.json` - Configuration de l'extension
- `background.js` - Service worker pour gestion des onglets, requêtes n8n et storage
- `content.js` - Script principal adapté depuis autoTapGrindr.js avec authentification
- `auth.js` - Module d'authentification (référence, fonctions intégrées dans content.js)
- `popup.html` - Interface utilisateur
- `popup.js` - Logique du popup
- `icons/` - Dossier pour les icônes de l'extension

## Sécurité

- Les identifiants sont stockés localement dans `chrome.storage.local`
- Les identifiants ne sont jamais synchronisés avec le cloud
- Les identifiants ne sont jamais exposés dans les logs
- L'extension ne fonctionne que sur web.grindr.com

## Notes

- Les icônes doivent être ajoutées dans le dossier `icons/` (16x16, 48x48, 128x128 pixels)
- L'extension nécessite les permissions `tabs`, `scripting`, `storage` et `activeTab`
- L'extension fonctionne uniquement sur `*://web.grindr.com/*`

