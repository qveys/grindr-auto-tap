// Configuration lint-staged
// S'exécute sur les fichiers stagés avant chaque commit

export default {
  // Fichiers TypeScript et JavaScript
  '**/*.{ts,tsx,js,jsx}': [
    // 1. Vérifier le linting
    'eslint --fix',
    // 2. Vérifier le formatage
    'prettier --write',
    // 3. Vérifier les types TypeScript (sans fichiers spécifiques)
    () => 'tsc --noEmit',
  ],

  // Fichiers JSON
  '**/*.json': ['prettier --write'],

  // Fichiers Markdown
  '**/*.md': ['prettier --write'],

  // Fichiers CSS/SCSS
  '**/*.{css,scss}': ['prettier --write'],

  // Fichiers de configuration
  '**/*.{yml,yaml}': ['prettier --write'],
};
