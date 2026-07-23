module.exports = {
  root: true,
  env: {
    node: true,
    browser: true,
    es2022: true
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'security', 'react', 'react-hooks', 'jsx-a11y'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:security/recommended'
  ],
  rules: {
    'no-console': 'warn',
    'no-empty': 'off',
    'security/detect-object-injection': 'warn',
    '@typescript-eslint/no-explicit-any': 'error',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-require-imports': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    'no-undef': 'off',
    'security/detect-possible-timing-attacks': 'warn',
    'security/detect-non-literal-fs-filename': 'warn',
    'security/detect-child-process': 'warn',
    'security/detect-non-literal-require': 'warn',
    'security/detect-eval-with-expression': 'warn',
    '@typescript-eslint/no-empty-function': 'off',
    'no-inner-declarations': 'off',
    'no-empty-pattern': 'off',
    'no-useless-escape': 'off',
    'no-regex-spaces': 'off',
    'no-misleading-character-class': 'off',
    'no-constant-condition': 'off',
    'no-useless-catch': 'off',
    'prefer-const': 'off',
    'react-hooks/rules-of-hooks': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'jsx-a11y/control-has-associated-label': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-namespace': 'off',
    '@typescript-eslint/no-unsafe-function-type': 'off',
    'prefer-rest-params': 'off'
  },
  overrides: [
    {
      files: [
        '**/*.ts',
        '**/*.tsx'
      ],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off'
      }
    }
  ]
};
