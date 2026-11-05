export type ThemePref = 'system' | 'light' | 'dark';
export const THEME_KEY = 'mymemo.theme';
export const THEME_ORDER: ThemePref[] = ['system', 'light', 'dark'];

type KV = Pick<Storage, 'getItem' | 'setItem'>;

export function loadThemePref(storage: KV | null): ThemePref {
  try {
    const v = storage?.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'system';
  } catch {
    return 'system';
  }
}

export function saveThemePref(storage: KV | null, pref: ThemePref): void {
  try {
    storage?.setItem(THEME_KEY, pref);
  } catch {
    // Ignore: the preference simply won't persist.
  }
}

export function resolveTheme(pref: ThemePref, systemPrefersDark: boolean): 'light' | 'dark' {
  return pref === 'system' ? (systemPrefersDark ? 'dark' : 'light') : pref;
}

export function nextThemePref(pref: ThemePref): ThemePref {
  return THEME_ORDER[(THEME_ORDER.indexOf(pref) + 1) % THEME_ORDER.length];
}

export const THEME_COLORS = { light: '#4f46e5', dark: '#1e1b4b' } as const;

/**
 * Toggle the `dark` class and color-scheme on <html>, and point the browser UI
 * color (<meta name="theme-color">) at the chosen theme rather than the OS one.
 */
export function applyTheme(root: HTMLElement, theme: 'light' | 'dark'): void {
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  root.ownerDocument.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
    meta.setAttribute('content', THEME_COLORS[theme]);
  });
}

/** Whether the OS currently prefers a dark color scheme (false outside a browser). */
export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false;
}
