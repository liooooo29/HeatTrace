import { useState, useEffect } from 'react';

export type FontSizeChoice = 'small' | 'default' | 'large';

export function useFontSize() {
  const [fontSize, setFontSize] = useState<FontSizeChoice>(() => {
    const saved = localStorage.getItem('heattrace-font-size');
    if (saved === 'small' || saved === 'large') return saved;
    return 'default';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('font-small', 'font-large');
    if (fontSize === 'small') root.classList.add('font-small');
    if (fontSize === 'large') root.classList.add('font-large');
    localStorage.setItem('heattrace-font-size', fontSize);
  }, [fontSize]);

  return { fontSize, setFontSize };
}
