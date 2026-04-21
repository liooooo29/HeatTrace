import { useState, useEffect, useCallback } from 'react';
import { themes, defaultTheme } from '../themes';

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('heattrace-theme') || defaultTheme;
  });

  useEffect(() => {
    const def = themes.find(t => t.id === theme) || themes[0];
    const root = document.documentElement;
    for (const [k, v] of Object.entries(def.vars)) {
      root.style.setProperty(k, v);
    }
    localStorage.setItem('heattrace-theme', theme);
  }, [theme]);

  const nextTheme = useCallback(() => {
    setTheme(prev => {
      const idx = themes.findIndex(t => t.id === prev);
      return themes[(idx + 1) % themes.length].id;
    });
  }, []);

  return { theme, setTheme, nextTheme };
}
