import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // React Hooks 7 将部分 React Compiler 建议提升为 error。项目仍使用 React 18，
      // 先作为渐进式治理告警；真正会破坏 Hook 调用顺序的 rules-of-hooks 继续阻断构建。
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/exhaustive-deps': 'off',
      // 中文教材正文会有意使用全角空格排版，字符串与模板中的空格不视为源码格式错误。
      'no-irregular-whitespace': 'off',
    },
  },
  {
    files: ['**/*.test.ts', 'e2e/**', '*.config.js', '*.config.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['server/src/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
  },
);
