// Configuration lint-staged
// S'exécute sur les fichiers stagés avant chaque commit

export default {
  // Fichiers TypeScript et JavaScript
  '**/*.{ts,tsx,js,jsx}': [
    // 1. Vérifier le linting
    'eslint --fix',
    // 2. Vérifier le formatage
    'prettier --write',
    // 3. Vérifier les types TypeScript uniquement sur les fichiers stagés
    (files) => {
      const tsFiles = files.filter((file) => file.endsWith('.ts') || file.endsWith('.tsx'));
      return tsFiles.length
        ? `tsc --noEmit ${tsFiles.join(' ')}`
        : 'echo "No TypeScript files to type-check"';
    },
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
