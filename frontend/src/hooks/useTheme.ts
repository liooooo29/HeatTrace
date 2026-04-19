import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export function useTheme(initial: Theme = 'dark') {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return { theme, setTheme };
}
