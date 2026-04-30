import { useState } from 'react';
import { layoutList, sizeCategories } from '../data/keyboardLayouts';
import type { KeyboardLayout, LayoutRow, KeyZone } from '../data/keyboardLayouts';
import { KeyboardLayoutPreview } from './KeyboardLayoutPreview';

const zoneLabels: Record<KeyZone, { en: string; zh: string; color: string }> = {
  function: { en: 'Function', zh: '功能区', color: 'rgba(120,140,190,0.6)' },
  number:   { en: 'Number',   zh: '数字键', color: 'rgba(0,188,212,0.55)' },
  alpha:    { en: 'Alpha',    zh: '主键区', color: 'rgba(74,158,92,0.55)' },
  nav:      { en: 'Nav',      zh: '编辑键区', color: 'rgba(212,168,67,0.6)' },
  numpad:   { en: 'Numpad',   zh: '数字键区', color: 'rgba(91,155,246,0.55)' },
  arrow:    { en: 'Arrows',   zh: '方向键', color: 'rgba(232,93,74,0.6)' },
  media:    { en: 'Media',    zh: '媒体键', color: 'rgba(155,89,182,0.6)' },
};

const categoryDescs: Record<string, { en: string; zh: string }> = {
  '100': {
    en: 'Full function, alpha, navigation, numpad, and arrow areas. All keys available.',
    zh: '完整的功能区、主键区、编辑键区、数字键区和方向键区。所有按键齐全。',
  },
  '96': {
    en: 'Compact full-size. Navigation cluster merged. Numpad retained. Easy to mis-hit.',
    zh: '紧凑全尺寸。编辑键区合并重排，保留数字键区。布局紧凑，容易误触。',
  },
  '80': {
    en: 'Numpad removed. Same layout as full-size otherwise. No re-learning needed.',
    zh: '去掉数字键区。其余布局与全尺寸一致，无需重新适应。',
  },
  '75': {
    en: 'Compact. Nav keys compressed into single column. F-row flush against number row.',
    zh: '紧凑型。编辑键压缩为单列，F 行紧贴数字行。需要搭配 Fn 键使用。',
  },
  '65': {
    en: 'No F-row. Navigation cluster removed. Only arrows remain. Requires Fn combos.',
    zh: '无 F 行。去掉编辑键区，仅保留方向键。需要搭配 Fn 键组合使用。',
  },
  '60': {
    en: 'Minimal. Only alpha block. No F-row, no nav, no arrows. All via Fn combos.',
    zh: '极简型。仅保留主键区。无 F 行、编辑键区、方向键，全部依赖 Fn 组合键。',
  },
};

function getZonesForLayout(layout: KeyboardLayout): KeyZone[] {
  const zones = new Set<KeyZone>();
  const walkRows = (rows: LayoutRow[]) => {
    for (const row of rows) {
      for (const group of row) {
        for (const key of group) {
          if (key.zone) zones.add(key.zone);
        }
      }
    }
  };
  walkRows(layout.rows);
  if (layout.navRow) walkRows(layout.navRow);
  if (layout.arrows) walkRows(layout.arrows);
  if (layout.numpad) walkRows(layout.numpad);
  if (layout.mediaRow) walkRows(layout.mediaRow);
  return [...zones];
}

function LayoutCard({ layout, keySize, lang, showLabels }: {
  layout: KeyboardLayout; keySize: number; lang: 'en' | 'zh'; showLabels: boolean;
}) {
  const zones = getZonesForLayout(layout);
  const cat = sizeCategories.find(c => c.key === layout.category);
  const desc = categoryDescs[layout.category];

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 700,
          color: 'var(--text-display)',
          lineHeight: 1,
        }}>
          {layout.name}
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-secondary)',
          letterSpacing: '0.04em',
        }}>
          {lang === 'zh' ? `${layout.keyCount} 键` : `${layout.keyCount} keys`}
        </span>
        {cat && (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-disabled)',
            letterSpacing: '0.06em',
            marginLeft: 'auto',
          }}>
            {cat.label}
          </span>
        )}
      </div>

      {/* Preview */}
      <div style={{ padding: '4px 0' }}>
        <KeyboardLayoutPreview layout={layout} keySize={keySize} showLabels={showLabels} lang={lang} />
      </div>

      {/* Zones */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {zones.map(zone => (
          <span key={zone} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-secondary)',
            letterSpacing: '0.04em',
          }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: 2,
              backgroundColor: zoneLabels[zone].color,
              flexShrink: 0,
            }} />
            {lang === 'zh' ? zoneLabels[zone].zh : zoneLabels[zone].en}
          </span>
        ))}
      </div>

      {/* Description */}
      {desc && (
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}>
          {lang === 'zh' ? desc.zh : desc.en}
        </div>
      )}
    </div>
  );
}

export function KeyboardLayoutDemo({ lang = 'en' }: { lang?: 'en' | 'zh' }) {
  const [keySize, setKeySize] = useState(16);
  const [showLabels, setShowLabels] = useState(true);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{
          fontFamily: 'var(--font-body)',
          fontSize: 24,
          fontWeight: 500,
          color: 'var(--text-display)',
          marginBottom: 4,
        }}>
          {lang === 'zh' ? '键盘配列预览' : 'Keyboard Layout Preview'}
        </h2>
        <p style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          letterSpacing: '0.04em',
        }}>
          {lang === 'zh'
            ? '各配列的区域分布和按键数量一览'
            : 'Zone distribution and key counts for each form factor'}
        </p>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24,
        padding: '8px 0',
        borderBottom: '1px solid var(--border)',
      }}>
        {/* Zoom */}
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-secondary)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {lang === 'zh' ? '大小' : 'Size'}
        </span>
        <input
          type="range"
          min={8}
          max={24}
          value={keySize}
          onChange={e => setKeySize(Number(e.target.value))}
          style={{ flex: 1, maxWidth: 160, accentColor: 'var(--text-display)' }}
        />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-disabled)',
          minWidth: 30,
        }}>
          {keySize}px
        </span>

        {/* Labels toggle */}
        <button
          onClick={() => setShowLabels(v => !v)}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.04em',
            padding: '5px 12px',
            borderRadius: 6,
            background: showLabels ? 'var(--surface-raised)' : 'transparent',
            color: showLabels ? 'var(--text-display)' : 'var(--text-secondary)',
            border: `1px solid ${showLabels ? 'var(--border-visible)' : 'var(--border)'}`,
            cursor: 'pointer',
          }}
        >
          {lang === 'zh' ? '区域标签' : 'Zone Labels'}
        </button>
      </div>

      {/* Zone legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24,
      }}>
        {Object.entries(zoneLabels).map(([zone, info]) => (
          <span key={zone} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-secondary)',
          }}>
            <span style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              backgroundColor: info.color,
            }} />
            {lang === 'zh' ? info.zh : info.en}
          </span>
        ))}
      </div>

      {/* Layout cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
        gap: 16,
      }}>
        {layoutList.map(layout => (
          <LayoutCard
            key={layout.id}
            layout={layout}
            keySize={keySize}
            lang={lang}
            showLabels={showLabels}
          />
        ))}
      </div>
    </div>
  );
}
