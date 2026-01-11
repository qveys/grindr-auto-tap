# Configuration des reviews automatiques Copilot

## Problème

Le workflow peut détecter quand le label `status: review-needed` est ajouté à une PR, mais il ne peut pas automatiquement déclencher une review Copilot via l'API publique GitHub.

## Solutions disponibles

### ✅ Solution recommandée : Activer les reviews automatiques

Configure Copilot pour qu'il review automatiquement toutes les PRs. C'est la méthode officielle et la plus fiable.

#### Étapes de configuration

1. Va sur ton repo GitHub → **Settings**
2. Dans le menu de gauche, clique sur **Rules** → **Rulesets**
3. Crée un nouveau ruleset ou modifie un existant :
   - Clique sur **New ruleset** → **New branch ruleset**
   - Nom : `Copilot Auto Review`
   - Target branches : `Default branch` (ou configure selon tes besoins)

4. Dans la section **Branch rules**, active :
   - ✅ **Require Copilot code review**
   - Options disponibles :
     - ☑️ **Review all new pushes** - Copilot reviewera chaque nouveau commit
     - ☑️ **Review draft pull requests** - Copilot reviewera même les drafts

5. Clique sur **Create** ou **Save changes**

#### Résultat

Une fois configuré, Copilot reviewera automatiquement :
- ✅ Chaque nouvelle PR créée
- ✅ Chaque nouveau commit poussé sur une PR existante
- ✅ Les PRs draft (si activé)

Aucune action manuelle nécessaire ! 🎉

### ⚙️ Alternative : Ajouter Copilot manuellement comme reviewer

Si tu ne veux pas activer les reviews automatiques pour toutes les PRs :

1. Sur une PR, clique sur **Reviewers** (dans la barre latérale droite)
2. Sélectionne **Copilot** dans la liste
3. Copilot reviewera cette PR spécifiquement

Pour déclencher une nouvelle review après des modifications :
- Clique sur l'icône de refresh (🔄) à côté de Copilot dans les reviewers
- Cela enverra une requête de re-review

### ❌ Ce qui ne fonctionne PAS

- ❌ **Commentaires `@copilot review`** : Créent une nouvelle discussion au lieu de déclencher une review
- ❌ **API `requestReviewers()`** : Ne fonctionne pas si Copilot n'est pas collaborateur du repo
- ❌ **Endpoint web interne** : Nécessite un CSRF token non accessible depuis les workflows

## Comportement du workflow

Avec le label `status: review-needed` :

1. ✅ Le workflow détecte le label
2. ⚠️ Il tente d'utiliser `requestReviewers()` API (échouera si Copilot pas collaborateur)
3. ❌ Le check **échoue intentionnellement** pour bloquer le merge
4. 👤 **Action requise** : Tu dois manuellement demander une review Copilot (ou avoir configuré les reviews automatiques)

## Recommandation finale

🎯 **Configure les reviews automatiques** (Solution 1 ci-dessus)

Cela garantit que :
- Chaque PR est automatiquement reviewée par Copilot
- Le workflow `check-bot-review` vérifie que la review est à jour
- Le label `status: review-needed` force une attente de nouvelle review
- Tout est automatique, aucune intervention manuelle nécessaire

## Questions fréquentes

**Q : Pourquoi ne pas utiliser `@copilot review` ?**
R : Cela crée un commentaire/discussion au lieu d'une vraie review. La review n'apparaît pas dans la section "Reviewers".

**Q : Puis-je déclencher Copilot programmatiquement ?**
R : Non, l'API publique GitHub ne supporte pas le déclenchement programmatique de Copilot. La seule façon est via les reviews automatiques ou manuelles.

**Q : Le workflow peut-il forcer Copilot à reviewer ?**
R : Non, il peut seulement détecter l'absence de review et bloquer le merge. L'action de demander une review doit être manuelle OU configurée en automatique.
