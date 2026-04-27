import { useState } from 'react';
import type { Lang } from '../i18n';

export function useLang() {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem('heatrace-lang');
    if (saved === 'zh' || saved === 'en') return saved;
    return navigator.language.startsWith('zh') ? 'zh' : 'en';
  });

  const switchLang = (l: Lang) => {
    setLang(l);
    localStorage.setItem('heatrace-lang', l);
  };

  return { lang, switchLang };
}
