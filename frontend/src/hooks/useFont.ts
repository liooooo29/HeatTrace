import { useState, useEffect } from 'react';

export type FontChoice = 'design' | 'system';

export function useFont() {
  const [font, setFont] = useState<FontChoice>(() => {
    const saved = localStorage.getItem('heattrace-font');
    return saved === 'system' ? 'system' : 'design';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (font === 'system') {
      root.classList.add('system-font');
    } else {
      root.classList.remove('system-font');
    }
    localStorage.setItem('heattrace-font', font);
  }, [font]);

  return { font, switchFont: setFont };
}
