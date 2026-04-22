import { useState, useEffect, useCallback } from 'react';
import { themes, defaultTheme } from '../themes';

// Derive accent-related CSS vars from a single hex color
function deriveAccentVars(hex: string): Record<string, string> {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  // Hover: lighten ~20%
  const hr = Math.min(255, Math.round(r + (255 - r) * 0.25));
  const hg = Math.min(255, Math.round(g + (255 - g) * 0.25));
  const hb = Math.min(255, Math.round(b + (255 - b) * 0.25));

  return {
    '--accent': hex,
    '--accent-hover': `#${hr.toString(16).padStart(2, '0')}${hg.toString(16).padStart(2, '0')}${hb.toString(16).padStart(2, '0')}`,
    '--accent-bg': `rgba(${r}, ${g}, ${b}, 0.10)`,
    '--accent-border': `rgba(${r}, ${g}, ${b}, 0.28)`,
    '--glow': `rgba(${r}, ${g}, ${b}, 0.05)`,
  };
}

// Quick-pick accent presets
export const accentPresets = [
  '#F97316', // orange
  '#0A84FF', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#EF4444', // red
  '#22C55E', // green
  '#F59E0B', // amber
  '#06B6D4', // cyan
];

export function useTheme() {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('heattrace-theme') || defaultTheme;
  });

  const [customAccent, setCustomAccentState] = useState(() => {
    return localStorage.getItem('heattrace-accent') || '';
  });

  // Apply theme + optional accent override
  useEffect(() => {
    const def = themes.find(t => t.id === theme) || themes[0];
    const root = document.documentElement;

    // Apply base theme vars
    for (const [k, v] of Object.entries(def.vars)) {
      root.style.setProperty(k, v);
    }

    // Override accent if custom color is set
    if (customAccent) {
      const vars = deriveAccentVars(customAccent);
      for (const [k, v] of Object.entries(vars)) {
        root.style.setProperty(k, v);
      }
    }

    localStorage.setItem('heattrace-theme', theme);
  }, [theme, customAccent]);

  const setTheme = useCallback((id: string) => {
    setThemeState(id);
    // Clear custom accent when switching base theme
    setCustomAccentState('');
    localStorage.removeItem('heattrace-accent');
  }, []);

  const setCustomAccent = useCallback((color: string) => {
    setCustomAccentState(color);
    if (color) {
      localStorage.setItem('heattrace-accent', color);
    } else {
      localStorage.removeItem('heattrace-accent');
    }
  }, []);

  return { theme, setTheme, customAccent, setCustomAccent };
}
