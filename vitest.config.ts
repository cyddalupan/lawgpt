import { defineConfig } from 'vitest/config';
import { defaultExclude } from 'vitest/config';
import angular from '@analogjs/vite-plugin-angular';

console.log('--- vitest.config.ts is loaded ---'); // Diagnostic log

export default defineConfig({
  plugins: [
    angular(),
  ],
  test: {
    globals: true,
    environment: 'jsdom',

    include: ['src/**/*.spec.ts'],
    setupFiles: ['src/test-setup.ts'],

    exclude: [...defaultExclude, '**/node_modules/**', '**/dist/**', '**/.angular/**', '**/.*'],
    deps: {
      inline: [
        /@angular/,
        /@analogjs/,
        'zone.js',
      ],
    },
    ssr: {
      noExternal: [
        /@angular/,
        /@analogjs/,
        'zone.js',
      ],
    },
    coverage: {
      provider: 'v8',
      reporter: ['html', 'lcov'],
    },
  },
});