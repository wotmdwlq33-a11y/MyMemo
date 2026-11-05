import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default defineConfig(async env =>
  mergeConfig(
    typeof viteConfig === 'function' ? await viteConfig(env) : viteConfig,
    defineConfig({
      test: {
        // Playwright specs live in e2e/ and are run by `npm run e2e`.
        exclude: [...configDefaults.exclude, 'e2e/**'],
        coverage: {
          include: ['src/**'],
          exclude: ['src/**/*.test.ts', 'src/lib/testNote.ts', 'src/main.tsx'],
          reporter: ['text-summary', 'html'],
        },
      },
    }),
  ),
);
