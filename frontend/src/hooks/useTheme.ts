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
    setModeState(m => m === 'dark' ? 'light' : 'dark');
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
  }, []);

  return { mode, toggleMode, setMode };
}
