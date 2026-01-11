// Configuration Commitlint stricte
// Documentation: https://commitlint.js.org

module.exports = {
  extends: ['@commitlint/config-conventional'],

  rules: {
    // Type: obligatoire, lowercase
    'type-enum': [
      2,
      'always',
      [
        'feat', // Nouvelle fonctionnalité
        'fix', // Correction de bug
        'docs', // Documentation seulement
        'style', // Formatage, point-virgules manquants, etc.
        'refactor', // Refactoring du code
        'perf', // Amélioration des performances
        'test', // Ajout/modification de tests
        'build', // Modifications du système de build
        'ci', // Modifications des fichiers CI
        'chore', // Tâches diverses (mise à jour dépendances, etc.)
        'revert', // Annulation d'un commit précédent
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],

    // Scope: obligatoire en mode strict
    'scope-enum': [
      2,
      'always',
      ['api', 'ui', 'auth', 'database', 'config', 'deps', 'docs', 'core', 'utils', 'tests'],
    ],
    'scope-case': [2, 'always', 'lower-case'],
    'scope-empty': [2, 'never'], // Scope obligatoire

    // Subject: description du commit
    'subject-empty': [2, 'never'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-full-stop': [2, 'never', '.'],
    'subject-max-length': [2, 'always', 72],
    'subject-min-length': [2, 'always', 10],

    // Header: ligne complète du commit
    'header-max-length': [2, 'always', 100],

    // Body: description détaillée (optionnelle mais recommandée)
    'body-leading-blank': [2, 'always'],
    'body-max-line-length': [2, 'always', 100],

    // Footer: références issues, breaking changes
    'footer-leading-blank': [2, 'always'],
    'footer-max-line-length': [2, 'always', 100],
  },

  // Configuration des prompts pour Commitizen
  prompt: {
    settings: {},
    messages: {
      type: 'Sélectionne le type de commit:',
      scope: 'Sélectionne le scope (OBLIGATOIRE):',
      subject: 'Écris une description courte et impérative:\\n',
      body: 'Fournis une description détaillée (optionnel). Utilise "|" pour les sauts de ligne:\\n',
      breaking: 'Liste les BREAKING CHANGES (optionnel):\\n',
      footer: 'Référence les issues (optionnel). Ex: "fix #123", "re #456":\\n',
      confirmCommit: 'Es-tu sûr de vouloir procéder avec le commit ci-dessus?',
    },
  },
};
