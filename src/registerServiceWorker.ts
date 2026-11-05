/// <reference types="vite/client" />

/**
 * Registers the hand-written service worker (public/sw.js) for offline support.
 * Only runs in production builds, in browsers that support service workers,
 * after the window `load` event so it never competes with the initial render.
 */
export interface RegisterOptions {
  isProd?: boolean;
  baseUrl?: string;
  win?: Window;
  nav?: Navigator;
}

export function registerServiceWorker(options: RegisterOptions = {}): void {
  const {
    isProd = import.meta.env.PROD,
    baseUrl = import.meta.env.BASE_URL,
    win = typeof window !== 'undefined' ? window : undefined,
    nav = typeof navigator !== 'undefined' ? navigator : undefined,
  } = options;

  if (!isProd || !win || !nav || !('serviceWorker' in nav)) return;

  const register = () => {
    nav.serviceWorker.register(`${baseUrl}sw.js`, {scope: baseUrl}).catch((err: unknown) => {
      console.warn('Service worker registration failed:', err);
    });
  };

  if (win.document.readyState === 'complete') {
    register();
  } else {
    win.addEventListener('load', register, {once: true});
  }
}
