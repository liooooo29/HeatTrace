import { useState, useEffect, useCallback } from 'react';
import { nothingDark, nothingLight, type ThemeMode } from '../themes';

function applyTheme(vars: Record<string, string>) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) {
    root.style.setProperty(k, v);
  }
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('heattrace-mode') as ThemeMode) || 'dark';
  });

  useEffect(() => {
    const vars = mode === 'dark' ? nothingDark : nothingLight;
    applyTheme(vars);

    // Toggle class for CSS selectors
    document.documentElement.classList.toggle('light', mode === 'light');
    document.documentElement.classList.toggle('dark', mode === 'dark');

    localStorage.setItem('heattrace-mode', mode);
  }, [mode]);

  const toggleMode = useCallback(() => {
    // Fade content, swap variables at the low point, then fade back in
    const main = document.querySelector('main');
    if (main) {
      main.classList.remove('theme-crossfading');
      void main.offsetWidth;
      main.classList.add('theme-crossfading');
      // Swap variables at ~87ms (35% of 250ms) when opacity is near 0
      setTimeout(() => {
        setModeState(m => m === 'dark' ? 'light' : 'dark');
      }, 87);
      setTimeout(() => main.classList.remove('theme-crossfading'), 260);
    } else {
      setModeState(m => m === 'dark' ? 'light' : 'dark');
    }
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
  }, []);

  return { mode, toggleMode, setMode };
}
