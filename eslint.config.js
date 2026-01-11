// Configuration ESLint (flat config format)
import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

export default [
  // Ignorer certains dossiers et fichiers de config
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '_legacy/**',
      'scripts/**',
      '*.config.js',
      '*.config.mjs',
      'commitlint.config.js',
      'jest.config.js',
      'lint-staged.config.js',
    ],
  },

  // Configuration pour les fichiers de config JS (sans type-checking)
  {
    files: ['*.config.js', '*.config.mjs', 'commitlint.config.js'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
    },
    rules: {
      ...eslint.configs.recommended.rules,
      ...tseslint.configs.recommended.rules,
      'prettier/prettier': 'error',
      'no-console': 'off',
    },
  },

  // Configuration de base pour tous les fichiers JS/TS (avec type-checking)
  // Exclut les fichiers de config qui sont gérés par la config ci-dessus
  {
    files: ['**/*.{js,jsx,ts,tsx}', '!*.config.js', '!*.config.mjs', '!commitlint.config.js'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier: prettierPlugin,
    },
    rules: {
      // Règles ESLint recommandées
      ...eslint.configs.recommended.rules,

      // Règles TypeScript recommandées
      ...tseslint.configs.recommended.rules,
      ...tseslint.configs['recommended-type-checked'].rules,

      // Règles Prettier
      'prettier/prettier': 'error',

      // Règles personnalisées strictes
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-unused-vars': 'off', // Désactivé car géré par TypeScript
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/strict-boolean-expressions': 'warn',
    },
  },

  // Configuration spécifique pour les tests
  {
    files: ['tests/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        jest: 'readonly',
      },
    },
  },

  // Désactiver les règles de formatage (géré par Prettier)
  prettier,
];
