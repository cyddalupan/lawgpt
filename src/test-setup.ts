import 'zone.js';
import 'zone.js/testing'; // For Angular 17+ and Zone.js 0.14+

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

// Mock the global 'marked' library for testing environments.
// In production, 'marked' is loaded via CDN and available globally.
(globalThis as any).marked = {
  parse: (markdown: string) => markdown // Simple mock: return markdown as-is
};

// First, initialize the Angular testing environment.
// Guard to ensure initTestEnvironment is called only once
if (getTestBed().platform == null) {
  getTestBed().initTestEnvironment(
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting(), {
      teardown: { destroyAfterEach: true }
    }
  );
}