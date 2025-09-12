import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // TypeScript pragmatism for existing code
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow prefixed underscore to indicate intentional unused
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],

      // React specific rules tuned for this project
      'react-refresh/only-export-components': 'off',
      'react-hooks/exhaustive-deps': 'off',

      // Allow empty catch blocks (often used to ignore storage/security errors)
      'no-empty': ['error', { allowEmptyCatch: true }],

      // Avoid noisy refactors
      'prefer-const': 'off',
    },
  },
])
