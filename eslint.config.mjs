import tseslint from 'typescript-eslint';
export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'build/**',
      'vendor/**',
      'verification/**',
      'example/node_modules/**',
      'example/ios/**',
      'example/android/**',
      'example/.expo/**',
    ],
  },
  ...tseslint.configs.recommended,
  {
    files: [
      '*.js',
      '*.cjs',
      'android/*.js',
      'tests/*.cjs',
      'example/*.js',
      'example/plugins/*.js',
    ],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
);
