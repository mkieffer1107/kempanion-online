// Offline support: register ./sw.js (production builds only; the dev server never gets a service worker).

/** Register the service worker. Safe to call anywhere; it no-ops in dev, insecure contexts and old browsers. */
export function registerSW(): void {
  if (!import.meta.env.PROD) return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !window.isSecureContext) return;
  const base = import.meta.env.BASE_URL || './';
  const register = () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch((err) => {
      console.warn('[kempanion] service worker registration failed:', err);
    });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}
