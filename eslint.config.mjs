import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ['lib/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['next', 'next/*', 'react', 'react/*', 'drizzle-orm', 'drizzle-orm/*', 'next-auth', 'next-auth/*', '@auth/*', '@/lib/db/*'], message: 'lib/domain is pure TypeScript over plain data.' },
      ] }],
    },
  },
]);

export default eslintConfig;
