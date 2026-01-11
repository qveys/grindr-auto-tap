# Configuration du déclenchement Copilot

## Problème

Par défaut, les commentaires postés par `github-actions[bot]` sont souvent ignorés par GitHub Copilot pour éviter les boucles infinites entre bots.

## Solution

Configurer un **Personal Access Token (PAT)** pour poster les commentaires `@copilot review` en tant qu'utilisateur réel.

## Étapes de configuration

### 1. Créer un Personal Access Token (PAT)

1. Va sur GitHub → **Settings** (paramètres de ton compte utilisateur, pas du repo)
2. Clique sur **Developer settings** (tout en bas à gauche)
3. Sélectionne **Personal access tokens** → **Tokens (classic)**
4. Clique sur **Generate new token** → **Generate new token (classic)**
5. Configure le token :
   - **Note** : `Copilot Trigger Token for <repo-name>`
   - **Expiration** : Choisis une durée (recommandé : 90 jours ou No expiration pour simplifier)
   - **Scopes** : Coche uniquement :
     - ✅ `repo` (Full control of private repositories)
       - Cela inclut automatiquement les sous-scopes nécessaires
6. Clique sur **Generate token**
7. **⚠️ IMPORTANT** : Copie le token immédiatement (tu ne pourras plus le voir après !)

### 2. Ajouter le token comme secret du repository

1. Va sur ton repo GitHub → **Settings** (paramètres du repo)
2. Dans le menu de gauche, clique sur **Secrets and variables** → **Actions**
3. Clique sur **New repository secret**
4. Configure le secret :
   - **Name** : `COPILOT_TRIGGER_TOKEN`
   - **Value** : Colle le token PAT que tu as copié
5. Clique sur **Add secret**

### 3. C'est tout ! ✅

Le workflow utilisera automatiquement ce token pour poster les commentaires `@copilot review` en ton nom, et Copilot les reconnaîtra comme venant d'un utilisateur réel.

## Vérification

Après configuration, quand le workflow s'exécute avec le label `status: review-needed`, tu devrais voir dans les logs :

```
✅ Using COPILOT_TRIGGER_TOKEN to post comment as real user
✅ Posted @copilot review comment as real user
```

Au lieu de :

```
⚠️ COPILOT_TRIGGER_TOKEN not set. Posting as github-actions[bot]
⚠️ Posted @copilot review comment (but may be ignored by Copilot)
```

## Sécurité

- ✅ Le token est stocké de manière sécurisée par GitHub Secrets
- ✅ Il n'est jamais exposé dans les logs
- ✅ Seuls les workflows du repo peuvent y accéder
- ⚠️ Le token donne accès au repo, assure-toi qu'il appartient à un compte de confiance

## Alternative : Automatic Review Configuration

Si tu ne veux pas utiliser de PAT, tu peux aussi configurer Copilot pour qu'il review automatiquement toutes les PRs :

1. Va sur le repo → **Settings** → **Rules** → **Rulesets**
2. Crée ou modifie un ruleset pour la branche principale
3. Active **Require Copilot code review**
4. Copilot reviewera automatiquement chaque PR/commit

Cette méthode ne nécessite pas de token mais est moins flexible (pas de déclenchement à la demande).
