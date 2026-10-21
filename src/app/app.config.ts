import { provideHttpClient, withFetch } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withRouterConfig } from '@angular/router';

import { routes } from './app.routes';

// Zoneless is the default since Angular 21: no zone.js, no provideZoneChangeDetection().
// The screen updates only when a signal read by a template changes (or an event/async pipe marks it dirty).
// No SSR either: everything here runs in the browser, so GSAP and the charts can start without platform checks.
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Every navigation keeps the current query params (a country, a year in the URL) unless it sets them itself.
    // Without this, opening a lesson in the window, or any routerLink, would drop them. (From The Carbon Divide.)
    provideRouter(routes, withRouterConfig({ defaultQueryParamsHandling: 'merge' })),
    // HttpClient (and httpResource) for the JSON in public/data. withFetch() uses fetch() instead of XHR.
    provideHttpClient(withFetch())
  ]
};
