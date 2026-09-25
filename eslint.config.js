// @ts-check
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['src/shared/lib/analytics.ts'],
    rules: { 'prefer-rest-params': 'off' },
  },
  {
    // Fronteras entre features: nada debe importar un archivo interno de otra
    // feature — solo su index.ts público. shared/ no debe importar de features/.
    // Los tests SÍ pueden importar internals directamente (whitebox testing),
    // por eso este bloque solo aplica dentro de src/.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '**/features/json-cleaner/model/*',
                '**/features/json-cleaner/ui/*',
                '**/features/crashlytics/model/*',
                '**/features/crashlytics/ui/*',
                '**/features/codegen/model/*',
                '**/features/codegen/ui/*',
                '**/features/swagger/ui/*',
                '**/features/support/model/*',
                '**/features/support/ui/*',
                '**/features/jwt/model/*',
                '**/features/jwt/ui/*',
                '**/features/encode/model/*',
                '**/features/encode/ui/*',
              ],
              message:
                'Importa solo desde el index.ts público de la feature, no de sus archivos internos.',
            },
          ],
        },
      ],
    },
  },
);
