import { describe, expect, it } from 'vitest';
import { THEME_KEY, loadThemePref, nextThemePref, resolveTheme, saveThemePref } from './theme';

const mem = (init: Record<string, string> = {}) => {
  const d = new Map(Object.entries(init));
  return { d, getItem: (k: string) => d.get(k) ?? null, setItem: (k: string, v: string) => void d.set(k, v) };
};

describe('theme preference', () => {
  it('defaults to system for missing, unknown or unreadable values', () => {
    expect(loadThemePref(null)).toBe('system');
    expect(loadThemePref(mem())).toBe('system');
    expect(loadThemePref(mem({ [THEME_KEY]: 'purple' }))).toBe('system');
    expect(loadThemePref({ getItem: () => { throw new Error('x'); }, setItem: () => {} })).toBe('system');
  });

  it('round-trips a saved preference', () => {
    const s = mem();
    saveThemePref(s, 'dark');
    expect(loadThemePref(s)).toBe('dark');
  });

  it('resolves system against the media query', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });

  it('cycles system → light → dark → system', () => {
    expect(nextThemePref('system')).toBe('light');
    expect(nextThemePref('light')).toBe('dark');
    expect(nextThemePref('dark')).toBe('system');
  });
});
