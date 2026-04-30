import { useState, useEffect } from 'react';
import { layouts } from '../data/keyboardLayouts';
import type { LayoutId, KeyboardLayout } from '../data/keyboardLayouts';

export type { LayoutId, KeyboardLayout };

const VALID_IDS: LayoutId[] = ['ansi-108', 'ansi-full', 'iso-full', 'ansi-96', 'ansi-tkl', 'ansi-75', 'ansi-65', 'ansi-60'];

function migrateId(saved: string | null): LayoutId {
  if (saved === 'ansi') return 'ansi-full';
  if (saved === 'iso') return 'iso-full';
  if (saved && VALID_IDS.includes(saved as LayoutId)) return saved as LayoutId;
  return 'ansi-tkl';
}

export function useKeyboardLayout() {
  const [layoutId, setLayoutId] = useState<LayoutId>(() => {
    return migrateId(localStorage.getItem('heattrace-kb-layout'));
  });

  useEffect(() => {
    localStorage.setItem('heattrace-kb-layout', layoutId);
  }, [layoutId]);

  const layout = layouts[layoutId] || layouts['ansi-tkl'];
  return { layoutId, setLayoutId, layout };
}
