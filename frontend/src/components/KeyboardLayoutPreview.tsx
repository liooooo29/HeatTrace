import type { KeyboardLayout, LayoutRow, KeyZone } from '../data/keyboardLayouts';

const G = 1; // gap between keys

const zoneColorMap: Record<KeyZone, string> = {
  function: 'rgba(120,140,190,0.25)',
  number:   'rgba(0,188,212,0.18)',
  alpha:    'rgba(74,158,92,0.22)',
  nav:      'rgba(212,168,67,0.25)',
  numpad:   'rgba(91,155,246,0.22)',
  arrow:    'rgba(232,93,74,0.25)',
  media:    'rgba(155,89,182,0.25)',
};

const zoneBorderMap: Record<KeyZone, string> = {
  function: 'rgba(120,140,190,0.5)',
  number:   'rgba(0,188,212,0.45)',
  alpha:    'rgba(74,158,92,0.45)',
  nav:      'rgba(212,168,67,0.5)',
  numpad:   'rgba(91,155,246,0.45)',
  arrow:    'rgba(232,93,74,0.5)',
  media:    'rgba(155,89,182,0.5)',
};

const zoneLabelMap: Record<string, Record<KeyZone, string>> = {
  en: {
    function: 'FUNCTION',
    number:   'NUMBER',
    alpha:    'ALPHA',
    nav:      'NAV',
    numpad:   'NUMPAD',
    arrow:    'ARROWS',
    media:    'MEDIA',
  },
  zh: {
    function: '功能区',
    number:   '数字键',
    alpha:    '主键区',
    nav:      '编辑键区',
    numpad:   '数字键区',
    arrow:    '方向键',
    media:    '媒体键',
  },
};

function getRowZone(row: LayoutRow): KeyZone | null {
  // For labeling: Shift/Tab/Caps/Space/modifiers all belong to the main typing area.
  // Only pure nav/numpad/arrow/media keys get their own zone label.
  const counts: Partial<Record<KeyZone, number>> = {};
  for (const group of row) {
    for (const key of group) {
      if (key.zone) {
        // Count modifier keys as alpha for labeling (they're part of the main block)
        const labelZone: KeyZone = (key.zone === 'function') ? 'alpha' : key.zone;
        counts[labelZone] = (counts[labelZone] || 0) + key.width;
      }
    }
  }
  let best: KeyZone | null = null;
  let bestCount = 0;
  for (const [zone, count] of Object.entries(counts)) {
    if (count > bestCount) {
      bestCount = count;
      best = zone as KeyZone;
    }
  }
  return best;
}

function getRowWidth(row: LayoutRow): number {
  let total = 0;
  for (const group of row) {
    for (const key of group) {
      total += key.width;
    }
    total += G; // gap between groups
  }
  return total - G; // remove last gap
}

function Row({ row, k }: { row: LayoutRow; k: number }) {
  return (
    <div style={{ display: 'flex', gap: G }}>
      {row.map((group, gi) => (
        <div key={gi} style={{ display: 'flex', gap: G }}>
          {group.map((key, ki) => (
            <div
              key={ki}
              style={{
                width: key.width * k,
                height: k,
                borderRadius: Math.max(1, k / 7),
                backgroundColor: key.zone ? zoneColorMap[key.zone] : 'var(--surface-raised)',
                border: `1px solid ${key.zone ? zoneBorderMap[key.zone] : 'var(--border)'}`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function Section({ rows, k, labels, lang }: { rows: LayoutRow[]; k: number; labels?: boolean; lang?: string }) {
  // Group consecutive rows by zone for label merging
  const zones: { zone: KeyZone; startRow: number; endRow: number }[] = [];
  let currentZone: KeyZone | null = null;
  let startIdx = 0;

  rows.forEach((row, i) => {
    const z = getRowZone(row);
    if (z !== currentZone) {
      if (currentZone) {
        zones.push({ zone: currentZone, startRow: startIdx, endRow: i - 1 });
      }
      currentZone = z;
      startIdx = i;
    }
  });
  if (currentZone) {
    zones.push({ zone: currentZone, startRow: startIdx, endRow: rows.length - 1 });
  }

  const dict = zoneLabelMap[lang || 'en'] || zoneLabelMap['en'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: G }}>
      {rows.map((row, i) => {
        const zone = getRowZone(row);
        const zoneGroup = zones.find(z => z.startRow === i);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {labels && zoneGroup && zone && (
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: Math.max(7, k * 0.42),
                color: zoneBorderMap[zone],
                letterSpacing: '0.04em',
                whiteSpace: 'nowrap',
                minWidth: k * 3,
                textAlign: 'right',
              }}>
                {dict[zone]}
              </span>
            )}
            {labels && !zoneGroup && <div style={{ minWidth: k * 3 }} />}
            <Row row={row} k={k} />
          </div>
        );
      })}
    </div>
  );
}

export function KeyboardLayoutPreview({
  layout,
  keySize = 14,
  showLabels = false,
  lang = 'en',
}: {
  layout: KeyboardLayout;
  keySize?: number;
  showLabels?: boolean;
  lang?: string;
}) {
  const hasNav = !!layout.navRow;
  const hasArrows = !!layout.arrows;
  const hasNumpad = !!layout.numpad;
  const hasMedia = !!layout.mediaRow;
  const hasExtras = hasNav || hasArrows || hasNumpad || hasMedia;
  const gap = Math.max(4, keySize / 3);
  const sectionGap = Math.round(keySize * 1.5);

  return (
    <div style={{ display: 'flex', gap: sectionGap, alignItems: 'flex-start' }}>
      <Section rows={layout.rows} k={keySize} labels={showLabels} lang={lang} />
      {hasExtras && (
        <div style={{ display: 'flex', flexDirection: 'column', gap }}>
          {hasNav && <Section rows={layout.navRow!} k={keySize} labels={showLabels} lang={lang} />}
          {hasArrows && <Section rows={layout.arrows!} k={keySize} labels={showLabels} lang={lang} />}
          {hasNumpad && <Section rows={layout.numpad!} k={keySize} labels={showLabels} lang={lang} />}
          {hasMedia && <Section rows={layout.mediaRow!} k={keySize} labels={showLabels} lang={lang} />}
        </div>
      )}
    </div>
  );
}
