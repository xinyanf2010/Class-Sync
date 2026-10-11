/**
 * Shared ESLint base config. Individual apps extend this and add their own
 * framework-specific rules (react-native for mobile, next for web) as needed.
 * Kept intentionally lightweight — no opinionated presets are pulled in yet.
 */
module.exports = {
  root: true,
  env: {
    es2021: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  ignores: ['dist/**', 'node_modules/**', '.next/**', '.expo/**'],
  rules: {
    'no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    'no-console': 'off',
  },
};