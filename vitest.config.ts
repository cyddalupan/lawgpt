import { defineConfig } from 'vitest/config';
import { defaultExclude } from 'vitest/config'; // Import defaultExclude
import angular from '@analogjs/vite-plugin-angular'; // Import the AnalogJS Angular plugin

export default defineConfig({
  plugins: [
    angular(), // Add the Angular plugin here
  ],
  test: {
    globals: true, // Enable globals (describe, it, expect, etc.)
    environment: 'jsdom', // Use JSDOM for a browser-like environment
    setupFiles: ['src/test-setup.ts'], // Path to your Angular test setup file
    exclude: [...defaultExclude, '**/node_modules/**', '**/dist/**', '**/.angular/**', '**/.*'], // Exclude common Angular/Node directories
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['html', 'lcov'], // Example reporters
    },
  },
});
