// Offline support: register ./sw.js (production builds only; the dev server never gets a service worker), then
// follow the opt-in offline copy (offline.svelte.ts), which tops it up on every online visit once a player chose
// "Play offline" on the title screen.
import { offline } from './offline.svelte';

/** Register the service worker. Safe to call anywhere; it no-ops in dev, insecure contexts and old browsers. */
export function registerSW(): void {
  if (!import.meta.env.PROD) return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  const base = import.meta.env.BASE_URL || './';
  const register = () => {
    navigator.serviceWorker
      .register(`${base}sw.js`, { scope: base })
      .then(() => offline.init())
      .catch((err) => {
        console.warn('[kempanion] service worker registration failed:', err);
      });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
