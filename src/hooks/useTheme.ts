import { useEffect, useState } from 'react';
import {
  type ThemePref,
  applyTheme,
  loadThemePref,
  nextThemePref,
  resolveTheme,
  saveThemePref,
  systemPrefersDark,
} from '../lib/theme';
import { getBrowserStorage } from '../lib/notes';

/**
 * Theme preference (system / light / dark). Follows prefers-color-scheme unless
 * the user picked one explicitly, and applies the resolved theme to <html>.
 */
export function useTheme() {
  const [themePref, setThemePref] = useState<ThemePref>(() => loadThemePref(getBrowserStorage()));
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const theme = resolveTheme(themePref, systemDark);
  useEffect(() => {
    applyTheme(document.documentElement, theme);
  }, [theme]);

  const cycleTheme = () => {
    const next = nextThemePref(themePref);
    setThemePref(next);
    saveThemePref(getBrowserStorage(), next);
  };

  return { themePref, cycleTheme };
}
