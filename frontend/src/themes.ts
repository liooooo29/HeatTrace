export interface ThemeVars {
  [key: string]: string;
}

export const nothingDark: ThemeVars = {
  '--black': '#000000',
  '--surface': '#111111',
  '--surface-raised': '#1A1A1A',
  '--border': '#222222',
  '--border-visible': '#333333',
  '--text-disabled': '#666666',
  '--text-secondary': '#999999',
  '--text-primary': '#E8E8E8',
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

export type ThemeMode = 'dark' | 'light';
