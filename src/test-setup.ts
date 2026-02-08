import 'zone.js';
import 'zone.js/testing'; // For Angular 17+ and Zone.js 0.14+

import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

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