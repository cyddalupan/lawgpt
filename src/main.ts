import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => {
    console.error('Application bootstrapping failed:', err);
    // Display a user-friendly message on the page
    document.body.innerHTML = '<div style="color: red; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial; padding: 20px;"><h1>Application failed to start. Please check console for details.</h1></div>';
  });
