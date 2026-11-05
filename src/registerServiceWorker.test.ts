import {afterEach, describe, expect, it, vi} from 'vitest';
import {
  SW_UPDATE_EVENT,
  activateUpdate,
  getPendingUpdate,
  registerServiceWorker,
  resetUpdateState,
} from './registerServiceWorker.ts';

type Handler = (...args: unknown[]) => void;

/** Minimal EventTarget-ish fake that records listeners by type. */
function emitter<T extends object>(extra: T) {
  const listeners: Record<string, Handler[]> = {};
  return Object.assign(extra, {
    listeners,
    addEventListener: vi.fn((type: string, cb: Handler) => {
      (listeners[type] ??= []).push(cb);
    }),
    emit(type: string, ...args: unknown[]) {
      for (const cb of listeners[type] ?? []) cb(...args);
    },
  });
}

function makeWorker(state = 'installing') {
  return emitter({state, postMessage: vi.fn()});
}

function makeRegistration(init: {waiting?: ReturnType<typeof makeWorker> | null} = {}) {
  return emitter({
    waiting: init.waiting ?? null,
    installing: null as ReturnType<typeof makeWorker> | null,
    update: vi.fn().mockResolvedValue(undefined),
  });
}

function makeEnv(
  readyState: DocumentReadyState,
  register: ReturnType<typeof vi.fn> = vi.fn().mockResolvedValue(makeRegistration()),
  controller: object | null = null,
) {
  const document = emitter({readyState, visibilityState: 'visible' as DocumentVisibilityState});
  const win = emitter({
    document,
    dispatchEvent: vi.fn(),
    setInterval: vi.fn(),
    location: {reload: vi.fn()},
  });
  const serviceWorker = emitter({register, controller});
  const nav = {serviceWorker};
  return {
    win,
    nav,
    document,
    serviceWorker,
    register,
    listeners: win.listeners,
    asWin: win as unknown as Window,
    asNav: nav as unknown as Navigator,
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  resetUpdateState();
});

describe('registerServiceWorker', () => {
  it('does nothing outside production', () => {
    const {asWin, asNav, register, win} = makeEnv('complete');
    registerServiceWorker({isProd: false, baseUrl: '/', win: asWin, nav: asNav});
    expect(register).not.toHaveBeenCalled();
    expect(win.addEventListener).not.toHaveBeenCalled();
  });

  it('does nothing when service workers are unsupported', () => {
    const {asWin, win} = makeEnv('loading');
    registerServiceWorker({isProd: true, baseUrl: '/', win: asWin, nav: {} as Navigator});
    expect(win.addEventListener).not.toHaveBeenCalled();
  });

  it('waits for window load, then registers sw.js under BASE_URL', () => {
    const {asWin, asNav, register, listeners} = makeEnv('loading');
    registerServiceWorker({isProd: true, baseUrl: '/app/', win: asWin, nav: asNav});
    expect(register).not.toHaveBeenCalled();
    listeners.load[0]();
    expect(register).toHaveBeenCalledWith('/app/sw.js', {scope: '/app/'});
  });

  it('registers immediately if the page already loaded', () => {
    const {asWin, asNav, register} = makeEnv('complete');
    registerServiceWorker({isProd: true, baseUrl: '/', win: asWin, nav: asNav});
    expect(register).toHaveBeenCalledWith('/sw.js', {scope: '/'});
  });

  it('swallows registration errors with console.warn', async () => {
    const error = new Error('boom');
    const {asWin, asNav} = makeEnv('complete', vi.fn().mockRejectedValue(error));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    registerServiceWorker({isProd: true, baseUrl: '/', win: asWin, nav: asNav});
    await flush();
    expect(warn).toHaveBeenCalledWith('Service worker registration failed:', error);
  });
});

describe('update detection', () => {
  function dispatchedUpdates(win: {dispatchEvent: ReturnType<typeof vi.fn>}) {
    return win.dispatchEvent.mock.calls
      .map(([event]) => event as CustomEvent)
      .filter((event) => event.type === SW_UPDATE_EVENT);
  }

  it('announces a worker that is already waiting on load', async () => {
    const reg = makeRegistration({waiting: makeWorker('installed')});
    const {asWin, asNav, win} = makeEnv('complete', vi.fn().mockResolvedValue(reg), {});
    registerServiceWorker({isProd: true, baseUrl: '/', win: asWin, nav: asNav});
    await flush();
    const events = dispatchedUpdates(win);
    expect(events).toHaveLength(1);
    expect(events[0].detail).toBe(reg);
    expect(getPendingUpdate()).toBe(reg);
  });

  it('does not announce on first install (no controller yet)', async () => {
    const reg = makeRegistration({waiting: makeWorker('installed')});
    const {asWin, asNav, win} = makeEnv('complete', vi.fn().mockResolvedValue(reg), null);
    registerServiceWorker({isProd: true, baseUrl: '/', win: asWin, nav: asNav});
    await flush();
    expect(dispatchedUpdates(win)).toHaveLength(0);
    expect(getPendingUpdate()).toBeNull();
  });

  it('announces when a newly found worker finishes installing', async () => {
    const reg = makeRegistration();
    const {asWin, asNav, win} = makeEnv('complete', vi.fn().mockResolvedValue(reg), {});
    registerServiceWorker({isProd: true, baseUrl: '/', win: asWin, nav: asNav});
    await flush();
    expect(dispatchedUpdates(win)).toHaveLength(0);

    const worker = makeWorker('installing');
    reg.installing = worker;
    reg.emit('updatefound');
    worker.emit('statechange');
    expect(dispatchedUpdates(win)).toHaveLength(0);

    worker.state = 'installed';
    reg.waiting = worker;
    worker.emit('statechange');
    expect(dispatchedUpdates(win)).toHaveLength(1);
  });

  it('checks for updates on an interval and when the page becomes visible (throttled)', async () => {
    vi.useFakeTimers({toFake: ['Date']});
    const reg = makeRegistration();
    const {asWin, asNav, win, document} = makeEnv('complete', vi.fn().mockResolvedValue(reg), {});
    registerServiceWorker({isProd: true, baseUrl: '/', win: asWin, nav: asNav, updateIntervalMs: 1234});
    await vi.waitFor(() => expect(win.setInterval).toHaveBeenCalled());
    const [tick, ms] = win.setInterval.mock.calls[0] as [() => void, number];
    expect(ms).toBe(1234);
    tick();
    expect(reg.update).toHaveBeenCalledTimes(1);

    // Just checked: a quick tab switch does not re-check.
    document.emit('visibilitychange');
    expect(reg.update).toHaveBeenCalledTimes(1);

    vi.setSystemTime(Date.now() + 2 * 60 * 1000);
    document.visibilityState = 'hidden';
    document.emit('visibilitychange');
    expect(reg.update).toHaveBeenCalledTimes(1);
    document.visibilityState = 'visible';
    document.emit('visibilitychange');
    expect(reg.update).toHaveBeenCalledTimes(2);
  });

  it('ignores failed update checks', async () => {
    const reg = makeRegistration();
    reg.update.mockRejectedValue(new Error('offline'));
    const {asWin, asNav, win} = makeEnv('complete', vi.fn().mockResolvedValue(reg), {});
    registerServiceWorker({isProd: true, baseUrl: '/', win: asWin, nav: asNav});
    await flush();
    const [tick] = win.setInterval.mock.calls[0] as [() => void];
    tick();
    await flush(); // no unhandled rejection
    expect(reg.update).toHaveBeenCalled();
  });
});

describe('activateUpdate', () => {
  it('tells the waiting worker to skip waiting and reloads once on controllerchange', () => {
    const waiting = makeWorker('installed');
    const reg = makeRegistration({waiting});
    const {asWin, asNav, win, serviceWorker} = makeEnv('complete', undefined, {});
    activateUpdate(reg as unknown as ServiceWorkerRegistration, asWin, asNav);

    expect(waiting.postMessage).toHaveBeenCalledWith({type: 'SKIP_WAITING'});
    expect(serviceWorker.addEventListener).toHaveBeenCalledWith('controllerchange', expect.any(Function), {once: true});
    expect(win.location.reload).not.toHaveBeenCalled();

    serviceWorker.emit('controllerchange');
    serviceWorker.emit('controllerchange');
    expect(win.location.reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload twice when clicked twice', () => {
    const reg = makeRegistration({waiting: makeWorker('installed')});
    const {asWin, asNav, win, serviceWorker} = makeEnv('complete', undefined, {});
    activateUpdate(reg as unknown as ServiceWorkerRegistration, asWin, asNav);
    activateUpdate(reg as unknown as ServiceWorkerRegistration, asWin, asNav);
    serviceWorker.emit('controllerchange');
    expect(win.location.reload).toHaveBeenCalledTimes(1);
  });

  it('just reloads when nothing is waiting any more', () => {
    const reg = makeRegistration({waiting: null});
    const {asWin, asNav, win} = makeEnv('complete', undefined, {});
    activateUpdate(reg as unknown as ServiceWorkerRegistration, asWin, asNav);
    expect(win.location.reload).toHaveBeenCalledTimes(1);
  });
});
