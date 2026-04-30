export interface ThemeVars {
  [key: string]: string;
}

export const nothingDark: ThemeVars = {
  '--black': '#000000',
  '--surface': '#111111',
  '--surface-raised': '#1A1A1A',
  '--border': '#222222',
  '--border-visible': '#333333',
  '--text-disabled': '#757575',
  '--text-secondary': '#ABABAB',
  '--text-primary': '#F0F0F0',
  '--text-display': '#FFFFFF',
  '--accent': '#D71921',
  '--accent-subtle': 'rgba(215,25,33,0.15)',
  '--success': '#4A9E5C',
  '--warning': '#D4A843',
  '--error': '#D71921',
  '--info': '#999999',
  '--interactive': '#5B9BF6',
  '--space-xs': '4px',
  '--space-sm': '8px',
  '--space-md': '16px',
  '--space-lg': '24px',
  '--space-xl': '32px',
  '--space-2xl': '48px',
};

export const nothingLight: ThemeVars = {
  '--black': '#F5F5F5',
  '--surface': '#FFFFFF',
  '--surface-raised': '#F0F0F0',
  '--border': '#E8E8E8',
  '--border-visible': '#CCCCCC',
  '--text-disabled': '#999999',
  '--text-secondary': '#666666',
  '--text-primary': '#1A1A1A',
  '--text-display': '#000000',
  '--accent': '#D71921',
  '--accent-subtle': 'rgba(215,25,33,0.10)',
  '--success': '#4A9E5C',
  '--warning': '#D4A843',
  '--error': '#D71921',
  '--info': '#666666',
  '--interactive': '#007AFF',
  '--space-xs': '4px',
  '--space-sm': '8px',
  '--space-md': '16px',
  '--space-lg': '24px',
  '--space-xl': '32px',
  '--space-2xl': '48px',
};

export type ThemeMode = 'dark' | 'light' | 'auto';

// ─── Theme Presets ────────────────────────────────────────────

export interface ThemePreset {
  id: string;
  name: string;
  nameZh: string;
  accent: string;
  dark: ThemeVars;
  light: ThemeVars;
}

/** Base dark template — all presets override accent only */
function darkBase(accent: string): ThemeVars {
  return {
    ...nothingDark,
    '--accent': accent,
    '--accent-subtle': `${accent}26`, // ~15% opacity
  };
}

/** Base light template */
function lightBase(accent: string): ThemeVars {
  return {
    ...nothingLight,
    '--accent': accent,
    '--accent-subtle': `${accent}1A`, // ~10% opacity
  };
}

export const themePresets: ThemePreset[] = [
  {
    id: 'nothing-red',
    name: 'Nothing Red',
    nameZh: 'Nothing 红',
    accent: '#D71921',
    dark: darkBase('#D71921'),
    light: lightBase('#D71921'),
  },
  {
    id: 'arctic-cyan',
    name: 'Arctic Cyan',
    nameZh: '极光青',
    accent: '#00C2D1',
    dark: darkBase('#00C2D1'),
    light: lightBase('#00C2D1'),
  },
  {
    id: 'phosphor-green',
    name: 'Phosphor Green',
    nameZh: '荧光绿',
    accent: '#00E676',
    dark: darkBase('#00E676'),
    light: lightBase('#00E676'),
  },
  {
    id: 'signal-violet',
    name: 'Signal Violet',
    nameZh: '信号紫',
    accent: '#B388FF',
    dark: darkBase('#B388FF'),
    light: lightBase('#B388FF'),
  },
  {
    id: 'amber-warm',
    name: 'Amber Warm',
    nameZh: '暖琥珀',
    accent: '#FF9100',
    dark: darkBase('#FF9100'),
    light: lightBase('#FF9100'),
  },
  {
    id: 'slate-blue',
    name: 'Slate Blue',
    nameZh: '石板蓝',
    accent: '#5C6BC0',
    dark: darkBase('#5C6BC0'),
    light: lightBase('#5C6BC0'),
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    nameZh: '玫瑰金',
    accent: '#E0857A',
    dark: darkBase('#E0857A'),
    light: lightBase('#E0857A'),
  },
  {
    id: 'graphite',
    name: 'Graphite',
    nameZh: '石墨灰',
    accent: '#78909C',
    dark: darkBase('#78909C'),
    light: lightBase('#78909C'),
  },
];

// ─── Morph Colors (speed-based accent ranges) ────────────────

export interface MorphColorRange {
  idle: string;
  slow: string;
  moderate: string;
  fast: string;
  intense: string;
}

export interface MorphPreset {
  id: string;
  name: string;
  nameZh: string;
  description: string;
  descriptionZh: string;
  colors: MorphColorRange;
}

export const morphPresets: MorphPreset[] = [
  {
    id: 'thermal',
    name: 'Thermal',
    nameZh: '热力感应',
    description: 'Cool blue to hot red',
    descriptionZh: '从冷静蓝到炽热红',
    colors: {
      idle: '#4A6FA5',
      slow: '#48A9A6',
      moderate: '#D4A843',
      fast: '#E85D4A',
      intense: '#D71921',
    },
  },
  {
    id: 'aurora',
    name: 'Aurora',
    nameZh: '极光幻彩',
    description: 'Deep teal to electric magenta',
    descriptionZh: '从深邃青到电光品红',
    colors: {
      idle: '#2D6A6A',
      slow: '#00C9A7',
      moderate: '#845EC2',
      fast: '#D65DB1',
      intense: '#FF6F91',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    nameZh: '余烬渐燃',
    description: 'Dark ash to blazing orange',
    descriptionZh: '从暗灰到烈焰橙',
    colors: {
      idle: '#5C5C5C',
      slow: '#8D6E63',
      moderate: '#BF6A30',
      fast: '#FF6D00',
      intense: '#FF3D00',
    },
  },
  {
    id: 'neon',
    name: 'Neon',
    nameZh: '霓虹脉冲',
    description: 'Muted teal to neon green pulse',
    descriptionZh: '从沉静青到霓虹绿脉冲',
    colors: {
      idle: '#2A3A3A',
      slow: '#00897B',
      moderate: '#00C853',
      fast: '#69F0AE',
      intense: '#B9F6CA',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    nameZh: '深海潮汐',
    description: 'Deep navy to bright sky blue',
    descriptionZh: '从深邃海蓝到明亮天蓝',
    colors: {
      idle: '#1A237E',
      slow: '#283593',
      moderate: '#1E88E5',
      fast: '#42A5F5',
      intense: '#90CAF9',
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    nameZh: '暮色余晖',
    description: 'Dusk purple to sunset gold',
    descriptionZh: '从暮色紫到落日金',
    colors: {
      idle: '#4A148C',
      slow: '#7B1FA2',
      moderate: '#E65100',
      fast: '#FF8F00',
      intense: '#FFD600',
    },
  },
];

// ─── Color interpolation helpers ──────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
}

/** Interpolate between two hex colors, t ∈ [0, 1] */
export function lerpColor(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  );
}

/** Map a WPM value to an accent color by interpolating through the MorphColorRange */
export function getMorphAccent(wpm: number, colors: MorphColorRange): string {
  // Speed zones:  0-20 idle, 20-40 slow, 40-70 moderate, 70-100 fast, 100+ intense
  const zones: { threshold: number; color: string }[] = [
    { threshold: 0, color: colors.idle },
    { threshold: 20, color: colors.slow },
    { threshold: 40, color: colors.moderate },
    { threshold: 70, color: colors.fast },
    { threshold: 100, color: colors.intense },
  ];

  if (wpm <= 0) return colors.idle;
  if (wpm >= 100) return colors.intense;

  // Find which segment we're in
  for (let i = 1; i < zones.length; i++) {
    if (wpm <= zones[i].threshold) {
      const lo = zones[i - 1];
      const hi = zones[i];
      const t = (wpm - lo.threshold) / (hi.threshold - lo.threshold);
      return lerpColor(lo.color, hi.color, t);
    }
  }
  return colors.intense;
}
