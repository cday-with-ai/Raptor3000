// Flat config (ESLint 10) for the raptor3000 workspace. One config at the root;
// each package's `eslint src` finds it by walking up. Non-type-aware rules
// only (tseslint.configs.recommended, not recommendedTypeChecked): they lint
// syntax and obvious mistakes without building the full TS program, which is
// both faster and avoids leaning on type-aware machinery while typescript-eslint
// still predates TypeScript 7.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/*.tsbuildinfo',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      // The codebase marks a deliberately-unused binding with a leading
      // underscore (_event, _mgr); honour that convention instead of erroring.
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
    },
  },
  {
    // React hook rules only where React lives.
    files: ['packages/web/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
);
