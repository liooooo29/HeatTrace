import { useState, useEffect, useCallback } from 'react';
import { nothingDark, nothingLight, themePresets, type ThemeMode, type ThemeVars } from '../themes';

function applyTheme(vars: Record<string, string>) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(vars)) {
    if (!k.startsWith('--space-')) {
      root.style.setProperty(k, v);
    }
  }
}

/** Resolve 'auto' to the actual dark/light based on system preference */
function resolveMode(mode: ThemeMode): 'dark' | 'light' {
  if (mode !== 'auto') return mode;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('heattrace-mode') as ThemeMode) || 'auto';
  });

  const [presetId, setPresetIdState] = useState<string>(() => {
    return localStorage.getItem('heattrace-preset') || 'nothing-red';
  });

  const [resolved, setResolved] = useState<'dark' | 'light'>(() => resolveMode(
    (localStorage.getItem('heattrace-mode') as ThemeMode) || 'auto'
  ));

  // Listen to system color scheme changes when mode is 'auto'
  useEffect(() => {
    if (mode !== 'auto') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setResolved(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  // Update resolved mode when mode changes
  useEffect(() => {
    setResolved(resolveMode(mode));
  }, [mode]);

  // Apply preset theme whenever resolved mode or preset changes
  useEffect(() => {
    const preset = themePresets.find(p => p.id === presetId) || themePresets[0];
    const vars = resolved === 'dark' ? preset.dark : preset.light;
    applyTheme(vars);

    document.documentElement.classList.toggle('light', resolved === 'light');
    document.documentElement.classList.toggle('dark', resolved === 'dark');

    localStorage.setItem('heattrace-mode', mode);
    localStorage.setItem('heattrace-preset', presetId);
  }, [resolved, presetId, mode]);

  const toggleMode = useCallback(() => {
    const main = document.querySelector('main');
    const next = resolved === 'dark' ? 'light' : 'dark';
    if (main) {
      main.classList.remove('theme-crossfading');
      void main.offsetWidth;
      main.classList.add('theme-crossfading');
      setTimeout(() => {
        setModeState(next);
      }, 87);
      setTimeout(() => main.classList.remove('theme-crossfading'), 260);
    } else {
      setModeState(next);
    }
  }, [resolved]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
  }, []);

  const setPreset = useCallback((id: string) => {
    setPresetIdState(id);
  }, []);

  return { mode, resolved, toggleMode, setMode, presetId, setPreset };
}
