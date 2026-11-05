/// <reference types="vite/client" />

/**
 * Registers the hand-written service worker (public/sw.js) for offline support.
 * Only runs in production builds, in browsers that support service workers,
 * after the window `load` event so it never competes with the initial render.
 *
 * Update flow: a new sw.js installs in the background and then *waits* while an
 * older worker controls the page. We announce that with a `mymemo:sw-update`
 * window event (detail: the registration) so the UI can offer a reload;
 * `activateUpdate` tells the waiting worker to take over and reloads once it does.
 */
export interface RegisterOptions {
  isProd?: boolean;
  baseUrl?: string;
  win?: Window;
  nav?: Navigator;
  /** How often to poll for a new sw.js while the page stays open. */
  updateIntervalMs?: number;
}

export const SW_UPDATE_EVENT = 'mymemo:sw-update';
export type SwUpdateEvent = CustomEvent<ServiceWorkerRegistration>;

const HOUR = 60 * 60 * 1000;
/** Minimum gap between visibility-triggered update checks. */
const MIN_VISIBLE_CHECK_GAP_MS = 60 * 1000;

let pendingUpdate: ServiceWorkerRegistration | null = null;

/** The registration with a waiting worker, if one was announced before the UI subscribed. */
export function getPendingUpdate(): ServiceWorkerRegistration | null {
  return pendingUpdate;
}

/** Test helper: forget module state between tests. */
export function resetUpdateState(): void {
  pendingUpdate = null;
  reloading = false;
}

function announceUpdate(win: Window, registration: ServiceWorkerRegistration): void {
  pendingUpdate = registration;
  win.dispatchEvent(new CustomEvent(SW_UPDATE_EVENT, {detail: registration}));
}

let reloading = false;

/**
 * Ask the waiting worker to activate, then reload once it controls the page.
 * If nothing is waiting any more (e.g. another tab already activated it), just reload.
 */
export function activateUpdate(
  registration: ServiceWorkerRegistration,
  win: Window = window,
  nav: Navigator = navigator,
): void {
  const reload = () => {
    if (reloading) return;
    reloading = true;
    win.location.reload();
  };
  const waiting = registration.waiting;
  if (!waiting || !('serviceWorker' in nav)) {
    reload();
    return;
  }
  nav.serviceWorker.addEventListener('controllerchange', reload, {once: true});
  waiting.postMessage({type: 'SKIP_WAITING'});
}

function watchForUpdates(
  registration: ServiceWorkerRegistration,
  win: Window,
  nav: Navigator,
  updateIntervalMs: number,
): void {
  // Only an update when an older worker already controls this page; on first
  // install there is nothing to replace and the new worker activates on its own.
  const notifyIfWaiting = () => {
    if (registration.waiting && nav.serviceWorker.controller) announceUpdate(win, registration);
  };

  notifyIfWaiting();
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing;
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed') notifyIfWaiting();
    });
  });

  let lastCheck = Date.now();
  const checkForUpdate = () => {
    lastCheck = Date.now();
    registration.update().catch(() => undefined); // offline etc. — try again later
  };
  win.setInterval(checkForUpdate, updateIntervalMs);
  win.document.addEventListener('visibilitychange', () => {
    if (win.document.visibilityState === 'visible' && Date.now() - lastCheck >= MIN_VISIBLE_CHECK_GAP_MS) {
      checkForUpdate();
    }
  });
}

export function registerServiceWorker(options: RegisterOptions = {}): void {
  const {
    isProd = import.meta.env.PROD,
    baseUrl = import.meta.env.BASE_URL,
    win = typeof window !== 'undefined' ? window : undefined,
    nav = typeof navigator !== 'undefined' ? navigator : undefined,
    updateIntervalMs = HOUR,
  } = options;

  if (!isProd || !win || !nav || !('serviceWorker' in nav)) return;

  const register = () => {
    nav.serviceWorker
      .register(`${baseUrl}sw.js`, {scope: baseUrl})
      .then((registration) => watchForUpdates(registration, win, nav, updateIntervalMs))
      .catch((err: unknown) => {
        console.warn('Service worker registration failed:', err);
      });
  };

  if (win.document.readyState === 'complete') {
    register();
  } else {
    win.addEventListener('load', register, {once: true});
  }
}
