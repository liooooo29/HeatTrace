import { useState, useEffect, useRef, useCallback } from 'react';
import { GetKeyCount } from '../wails-bindings';
import { getMorphAccent, type MorphColorRange, type ThemeMode } from '../themes';

const WPM_SMOOTHING = 0.3;      // EMA factor (lower = smoother)
const COLOR_TRANSITION_MS = 1500; // CSS transition duration
const POLL_INTERVAL_MS = 1000;

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface UseMorphOptions {
  enabled: boolean;
  colors: MorphColorRange;
  mode: ThemeMode;
}

export function useMorph({ enabled, colors, mode }: UseMorphOptions) {
  const [wpm, setWpm] = useState(0);
  const [currentAccent, setCurrentAccent] = useState('');
  const lastKeyCountRef = useRef(-1);
  const smoothWpmRef = useRef(0);
  const frameRef = useRef(0);

  // Poll key count and compute real-time WPM
  useEffect(() => {
    if (!enabled) return;

    const poll = async () => {
      try {
        const count = await GetKeyCount();
        if (lastKeyCountRef.current >= 0) {
          const delta = count - lastKeyCountRef.current;
          if (delta >= 0) {
            // delta = keys in the last 1 second
            // CPM = delta * 60, WPM = CPM / 5
            const instantWpm = (delta * 60) / 5;
            // Exponential moving average for smooth transitions
            smoothWpmRef.current =
              smoothWpmRef.current * (1 - WPM_SMOOTHING) + instantWpm * WPM_SMOOTHING;
            setWpm(Math.round(smoothWpmRef.current));
          }
        }
        lastKeyCountRef.current = count;
      } catch {}
    };

    // Reset state
    lastKeyCountRef.current = -1;
    smoothWpmRef.current = 0;
    setWpm(0);

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [enabled]);

  // Apply morph accent color to CSS variables
  useEffect(() => {
    if (!enabled) {
      // Clean up morph-transition class
      document.documentElement.classList.remove('morph-transition');
      return;
    }

    const accent = getMorphAccent(wpm, colors);
    setCurrentAccent(accent);

    const root = document.documentElement;

    // Add transition class for smooth color changes
    if (!root.classList.contains('morph-transition')) {
      root.classList.add('morph-transition');
    }

    // Apply accent color
    root.style.setProperty('--accent', accent);

    // Apply accent-subtle (15% dark / 10% light)
    const subtleAlpha = mode === 'dark' ? 0.15 : 0.10;
    root.style.setProperty('--accent-subtle', hexToRgba(accent, subtleAlpha));

    // Apply error color (same as accent in Nothing design)
    root.style.setProperty('--error', accent);

    // Very subtle surface tint — barely perceptible ambient shift
    if (mode === 'dark') {
      root.style.setProperty('--morph-tint', hexToRgba(accent, 0.02));
      root.style.setProperty('--morph-tint-raised', hexToRgba(accent, 0.03));
    } else {
      root.style.setProperty('--morph-tint', hexToRgba(accent, 0.015));
      root.style.setProperty('--morph-tint-raised', hexToRgba(accent, 0.025));
    }
  }, [enabled, wpm, colors, mode]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      document.documentElement.classList.remove('morph-transition');
      document.documentElement.style.removeProperty('--morph-tint');
      document.documentElement.style.removeProperty('--morph-tint-raised');
    };
  }, []);

  const resetMorph = useCallback(() => {
    lastKeyCountRef.current = -1;
    smoothWpmRef.current = 0;
    setWpm(0);
  }, []);

  return { wpm, currentAccent, resetMorph };
}
