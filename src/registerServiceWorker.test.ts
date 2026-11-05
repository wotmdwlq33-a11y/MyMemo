import {afterEach, describe, expect, it, vi} from 'vitest';
import {registerServiceWorker} from './registerServiceWorker.ts';

function makeEnv(readyState: DocumentReadyState, register = vi.fn().mockResolvedValue({})) {
  const listeners: Record<string, () => void> = {};
  const win = {
    document: {readyState},
    addEventListener: vi.fn((type: string, cb: () => void) => {
      listeners[type] = cb;
    }),
  } as unknown as Window;
  const nav = {serviceWorker: {register}} as unknown as Navigator;
  return {win, nav, register, listeners};
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('registerServiceWorker', () => {
  it('does nothing outside production', () => {
    const {win, nav, register} = makeEnv('complete');
    registerServiceWorker({isProd: false, baseUrl: '/', win, nav});
    expect(register).not.toHaveBeenCalled();
    expect(win.addEventListener).not.toHaveBeenCalled();
  });

  it('does nothing when service workers are unsupported', () => {
    const {win} = makeEnv('loading');
    registerServiceWorker({isProd: true, baseUrl: '/', win, nav: {} as Navigator});
    expect(win.addEventListener).not.toHaveBeenCalled();
  });

  it('waits for window load, then registers sw.js under BASE_URL', () => {
    const {win, nav, register, listeners} = makeEnv('loading');
    registerServiceWorker({isProd: true, baseUrl: '/app/', win, nav});
    expect(register).not.toHaveBeenCalled();
    listeners.load();
    expect(register).toHaveBeenCalledWith('/app/sw.js', {scope: '/app/'});
  });

  it('registers immediately if the page already loaded', () => {
    const {win, nav, register} = makeEnv('complete');
    registerServiceWorker({isProd: true, baseUrl: '/', win, nav});
    expect(register).toHaveBeenCalledWith('/sw.js', {scope: '/'});
  });

  it('swallows registration errors with console.warn', async () => {
    const error = new Error('boom');
    const {win, nav} = makeEnv('complete', vi.fn().mockRejectedValue(error));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    registerServiceWorker({isProd: true, baseUrl: '/', win, nav});
    await new Promise((r) => setTimeout(r, 0));
    expect(warn).toHaveBeenCalledWith('Service worker registration failed:', error);
  });
});
