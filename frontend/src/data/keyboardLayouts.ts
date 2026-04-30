export type KeyZone = 'function' | 'number' | 'alpha' | 'nav' | 'numpad' | 'arrow' | 'media';

export interface LayoutKey {
  label: string;
  shifted?: string;
  code: string;
  width: number;
  zone?: KeyZone;
}

export type LayoutRow = LayoutKey[][];

export interface KeyboardLayout {
  id: string;
  name: string;
  keyCount: number;
  category: string;        // '100' | '96' | '80' | '75' | '65' | '60'
  rows: LayoutRow[];       // 5 rows for heatmap (no F-row)
  debugRows: LayoutRow[];  // 6 rows for debug (includes Esc/F-row)
  navRow?: LayoutRow[];    // Insert/Home/PgUp cluster (TKL+)
  arrows?: LayoutRow[];    // Arrow cluster (TKL+, 65%)
  numpad?: LayoutRow[];    // Only full-size
  mediaRow?: LayoutRow[];  // Only 108-key
}

export const zoneColors: Record<KeyZone, string> = {
  function: '#788CBE',   // steel blue — F-row, Esc, modifiers
  number:   '#00BCD4',   // teal — number row (1-0, backspace)
  alpha:    '#4A9E5C',   // green — main typing area (QWERTY, home, bottom, space)
  nav:      '#D4A843',   // amber — PrtSc, Pause, Ins/Home/PgUp/Del/End/PgDn
  numpad:   '#5B9BF6',   // blue — numpad
  arrow:    '#E85D4A',   // warm red-orange — arrow cluster
  media:    '#9B59B6',   // purple — multimedia keys (108-key)
};

// ── Shared alpha rows (ANSI) with zones ────────────────

const ansiRows: LayoutRow[] = [
  // Number row
  [
    [
      { label: '`', shifted: '~', code: 'Backquote', width: 1, zone: 'number' },
      { label: '1', shifted: '!', code: 'Digit1', width: 1, zone: 'number' },
      { label: '2', shifted: '@', code: 'Digit2', width: 1, zone: 'number' },
      { label: '3', shifted: '#', code: 'Digit3', width: 1, zone: 'number' },
      { label: '4', shifted: '$', code: 'Digit4', width: 1, zone: 'number' },
      { label: '5', shifted: '%', code: 'Digit5', width: 1, zone: 'number' },
    ],
    [
      { label: '6', shifted: '^', code: 'Digit6', width: 1, zone: 'number' },
      { label: '7', shifted: '&', code: 'Digit7', width: 1, zone: 'number' },
      { label: '8', shifted: '*', code: 'Digit8', width: 1, zone: 'number' },
      { label: '9', shifted: '(', code: 'Digit9', width: 1, zone: 'number' },
      { label: '0', shifted: ')', code: 'Digit0', width: 1, zone: 'number' },
      { label: '-', shifted: '_', code: 'Minus', width: 1, zone: 'number' },
      { label: '=', shifted: '+', code: 'Equal', width: 1, zone: 'number' },
    ],
    [
      { label: 'Backspace', code: 'Backspace', width: 2, zone: 'number' },
    ],
  ],
  // QWERTY row
  [
    [{ label: 'Tab', code: 'Tab', width: 1.5, zone: 'alpha' }],
    [
      { label: 'q', code: 'KeyQ', width: 1, zone: 'alpha' },
      { label: 'w', code: 'KeyW', width: 1, zone: 'alpha' },
      { label: 'e', code: 'KeyE', width: 1, zone: 'alpha' },
      { label: 'r', code: 'KeyR', width: 1, zone: 'alpha' },
      { label: 't', code: 'KeyT', width: 1, zone: 'alpha' },
      { label: 'y', code: 'KeyY', width: 1, zone: 'alpha' },
      { label: 'u', code: 'KeyU', width: 1, zone: 'alpha' },
      { label: 'i', code: 'KeyI', width: 1, zone: 'alpha' },
      { label: 'o', code: 'KeyO', width: 1, zone: 'alpha' },
      { label: 'p', code: 'KeyP', width: 1, zone: 'alpha' },
    ],
    [
      { label: '[', shifted: '{', code: 'BracketLeft', width: 1, zone: 'alpha' },
      { label: ']', shifted: '}', code: 'BracketRight', width: 1, zone: 'alpha' },
      { label: '\\', shifted: '|', code: 'Backslash', width: 1.5, zone: 'alpha' },
    ],
  ],
  // Home row
  [
    [{ label: 'Caps', code: 'CapsLock', width: 1.75, zone: 'alpha' }],
    [
      { label: 'a', code: 'KeyA', width: 1, zone: 'alpha' },
      { label: 's', code: 'KeyS', width: 1, zone: 'alpha' },
      { label: 'd', code: 'KeyD', width: 1, zone: 'alpha' },
      { label: 'f', code: 'KeyF', width: 1, zone: 'alpha' },
      { label: 'g', code: 'KeyG', width: 1, zone: 'alpha' },
      { label: 'h', code: 'KeyH', width: 1, zone: 'alpha' },
      { label: 'j', code: 'KeyJ', width: 1, zone: 'alpha' },
      { label: 'k', code: 'KeyK', width: 1, zone: 'alpha' },
      { label: 'l', code: 'KeyL', width: 1, zone: 'alpha' },
    ],
    [
      { label: ';', shifted: ':', code: 'Semicolon', width: 1, zone: 'alpha' },
      { label: "'", shifted: '"', code: 'Quote', width: 1, zone: 'alpha' },
      { label: 'Enter', code: 'Enter', width: 2.25, zone: 'alpha' },
    ],
  ],
  // Bottom row
  [
    [{ label: 'Shift', code: 'ShiftLeft', width: 2.25, zone: 'alpha' }],
    [
      { label: 'z', code: 'KeyZ', width: 1, zone: 'alpha' },
      { label: 'x', code: 'KeyX', width: 1, zone: 'alpha' },
      { label: 'c', code: 'KeyC', width: 1, zone: 'alpha' },
      { label: 'v', code: 'KeyV', width: 1, zone: 'alpha' },
      { label: 'b', code: 'KeyB', width: 1, zone: 'alpha' },
      { label: 'n', code: 'KeyN', width: 1, zone: 'alpha' },
      { label: 'm', code: 'KeyM', width: 1, zone: 'alpha' },
    ],
    [
      { label: ',', shifted: '<', code: 'Comma', width: 1, zone: 'alpha' },
      { label: '.', shifted: '>', code: 'Period', width: 1, zone: 'alpha' },
      { label: '/', shifted: '?', code: 'Slash', width: 1, zone: 'alpha' },
      { label: 'Shift', code: 'ShiftRight', width: 2.75, zone: 'alpha' },
    ],
  ],
  // Modifier row
  [
    [
      { label: 'Ctrl', code: 'ControlLeft', width: 1.25, zone: 'function' },
      { label: 'Opt', code: 'AltLeft', width: 1.25, zone: 'function' },
      { label: 'Cmd', code: 'MetaLeft', width: 1.25, zone: 'function' },
      { label: 'Space', code: 'Space', width: 6.25, zone: 'alpha' },
      { label: 'Cmd', code: 'MetaRight', width: 1.25, zone: 'function' },
      { label: 'Opt', code: 'AltRight', width: 1.25, zone: 'function' },
      { label: 'Ctrl', code: 'ControlRight', width: 1.25, zone: 'function' },
    ],
  ],
];

const ansiDebugRows: LayoutRow[] = [
  // F-row
  [
    [
      { label: 'Esc', code: 'Escape', width: 1.5, zone: 'function' },
      { label: 'F1', code: 'F1', width: 1, zone: 'function' },
      { label: 'F2', code: 'F2', width: 1, zone: 'function' },
      { label: 'F3', code: 'F3', width: 1, zone: 'function' },
      { label: 'F4', code: 'F4', width: 1, zone: 'function' },
      { label: 'F5', code: 'F5', width: 1, zone: 'function' },
      { label: 'F6', code: 'F6', width: 1, zone: 'function' },
      { label: 'F7', code: 'F7', width: 1, zone: 'function' },
      { label: 'F8', code: 'F8', width: 1, zone: 'function' },
      { label: 'F9', code: 'F9', width: 1, zone: 'function' },
      { label: 'F10', code: 'F10', width: 1, zone: 'function' },
      { label: 'F11', code: 'F11', width: 1, zone: 'function' },
      { label: 'F12', code: 'F12', width: 1, zone: 'function' },
    ],
  ],
  // Number row
  [
    [
      { label: '`', shifted: '~', code: 'Backquote', width: 1, zone: 'number' },
      { label: '1', shifted: '!', code: 'Digit1', width: 1, zone: 'number' },
      { label: '2', shifted: '@', code: 'Digit2', width: 1, zone: 'number' },
      { label: '3', shifted: '#', code: 'Digit3', width: 1, zone: 'number' },
      { label: '4', shifted: '$', code: 'Digit4', width: 1, zone: 'number' },
      { label: '5', shifted: '%', code: 'Digit5', width: 1, zone: 'number' },
      { label: '6', shifted: '^', code: 'Digit6', width: 1, zone: 'number' },
      { label: '7', shifted: '&', code: 'Digit7', width: 1, zone: 'number' },
      { label: '8', shifted: '*', code: 'Digit8', width: 1, zone: 'number' },
      { label: '9', shifted: '(', code: 'Digit9', width: 1, zone: 'number' },
      { label: '0', shifted: ')', code: 'Digit0', width: 1, zone: 'number' },
      { label: '-', shifted: '_', code: 'Minus', width: 1, zone: 'number' },
      { label: '=', shifted: '+', code: 'Equal', width: 1, zone: 'number' },
      { label: '⌫', code: 'Backspace', width: 2, zone: 'number' },
    ],
  ],
  // QWERTY row
  [
    [
      { label: 'Tab', code: 'Tab', width: 1.5, zone: 'alpha' },
      { label: 'Q', code: 'KeyQ', width: 1, zone: 'alpha' },
      { label: 'W', code: 'KeyW', width: 1, zone: 'alpha' },
      { label: 'E', code: 'KeyE', width: 1, zone: 'alpha' },
      { label: 'R', code: 'KeyR', width: 1, zone: 'alpha' },
      { label: 'T', code: 'KeyT', width: 1, zone: 'alpha' },
      { label: 'Y', code: 'KeyY', width: 1, zone: 'alpha' },
      { label: 'U', code: 'KeyU', width: 1, zone: 'alpha' },
      { label: 'I', code: 'KeyI', width: 1, zone: 'alpha' },
      { label: 'O', code: 'KeyO', width: 1, zone: 'alpha' },
      { label: 'P', code: 'KeyP', width: 1, zone: 'alpha' },
      { label: '[', code: 'BracketLeft', width: 1, zone: 'alpha' },
      { label: ']', code: 'BracketRight', width: 1, zone: 'alpha' },
      { label: '\\', code: 'Backslash', width: 1.5, zone: 'alpha' },
    ],
  ],
  // Home row
  [
    [
      { label: 'Caps', code: 'CapsLock', width: 1.75, zone: 'alpha' },
      { label: 'A', code: 'KeyA', width: 1, zone: 'alpha' },
      { label: 'S', code: 'KeyS', width: 1, zone: 'alpha' },
      { label: 'D', code: 'KeyD', width: 1, zone: 'alpha' },
      { label: 'F', code: 'KeyF', width: 1, zone: 'alpha' },
      { label: 'G', code: 'KeyG', width: 1, zone: 'alpha' },
      { label: 'H', code: 'KeyH', width: 1, zone: 'alpha' },
      { label: 'J', code: 'KeyJ', width: 1, zone: 'alpha' },
      { label: 'K', code: 'KeyK', width: 1, zone: 'alpha' },
      { label: 'L', code: 'KeyL', width: 1, zone: 'alpha' },
      { label: ';', code: 'Semicolon', width: 1, zone: 'alpha' },
      { label: "'", code: 'Quote', width: 1, zone: 'alpha' },
      { label: 'Enter', code: 'Enter', width: 2.25, zone: 'alpha' },
    ],
  ],
  // Bottom row
  [
    [
      { label: 'Shift', code: 'ShiftLeft', width: 2.25, zone: 'alpha' },
      { label: 'Z', code: 'KeyZ', width: 1, zone: 'alpha' },
      { label: 'X', code: 'KeyX', width: 1, zone: 'alpha' },
      { label: 'C', code: 'KeyC', width: 1, zone: 'alpha' },
      { label: 'V', code: 'KeyV', width: 1, zone: 'alpha' },
      { label: 'B', code: 'KeyB', width: 1, zone: 'alpha' },
      { label: 'N', code: 'KeyN', width: 1, zone: 'alpha' },
      { label: 'M', code: 'KeyM', width: 1, zone: 'alpha' },
      { label: ',', code: 'Comma', width: 1, zone: 'alpha' },
      { label: '.', code: 'Period', width: 1, zone: 'alpha' },
      { label: '/', code: 'Slash', width: 1, zone: 'alpha' },
      { label: 'Shift', code: 'ShiftRight', width: 2.75, zone: 'alpha' },
    ],
  ],
  // Modifier row
  [
    [
      { label: 'Ctrl', code: 'ControlLeft', width: 1.25, zone: 'function' },
      { label: 'Super', code: 'MetaLeft', width: 1.25, zone: 'function' },
      { label: 'Alt', code: 'AltLeft', width: 1.25, zone: 'function' },
      { label: 'Space', code: 'Space', width: 6.25, zone: 'alpha' },
      { label: 'Alt', code: 'AltRight', width: 1.25, zone: 'function' },
      { label: 'Ctrl', code: 'ControlRight', width: 1.25, zone: 'function' },
    ],
  ],
];

// ── Shared nav + arrows (TKL and full-size) ─────────────

const sharedNavRow: LayoutRow[] = [
  [
    [
      { label: 'Ins', code: 'Insert', width: 1, zone: 'nav' },
      { label: 'Home', code: 'Home', width: 1, zone: 'nav' },
      { label: 'PgUp', code: 'PageUp', width: 1, zone: 'nav' },
    ],
  ],
  [
    [
      { label: 'Del', code: 'Delete', width: 1, zone: 'nav' },
      { label: 'End', code: 'End', width: 1, zone: 'nav' },
      { label: 'PgDn', code: 'PageDown', width: 1, zone: 'nav' },
    ],
  ],
];

const sharedArrows: LayoutRow[] = [
  [
    [{ label: '', code: '', width: 1, zone: 'arrow' }],
    [{ label: '↑', code: 'ArrowUp', width: 1, zone: 'arrow' }],
    [{ label: '', code: '', width: 1, zone: 'arrow' }],
  ],
  [
    [
      { label: '←', code: 'ArrowLeft', width: 1, zone: 'arrow' },
      { label: '↓', code: 'ArrowDown', width: 1, zone: 'arrow' },
      { label: '→', code: 'ArrowRight', width: 1, zone: 'arrow' },
    ],
  ],
];

// ── 104-key nav cluster (with PrtSc/ScrLk/Pause) ──────

const fullNavRow: LayoutRow[] = [
  [
    [
      { label: 'PrtSc', code: 'PrintScreen', width: 1, zone: 'nav' },
      { label: 'ScrLk', code: 'ScrollLock', width: 1, zone: 'nav' },
      { label: 'Pause', code: 'Pause', width: 1, zone: 'nav' },
    ],
  ],
  [
    [
      { label: 'Ins', code: 'Insert', width: 1, zone: 'nav' },
      { label: 'Home', code: 'Home', width: 1, zone: 'nav' },
      { label: 'PgUp', code: 'PageUp', width: 1, zone: 'nav' },
    ],
  ],
  [
    [
      { label: 'Del', code: 'Delete', width: 1, zone: 'nav' },
      { label: 'End', code: 'End', width: 1, zone: 'nav' },
      { label: 'PgDn', code: 'PageDown', width: 1, zone: 'nav' },
    ],
  ],
];

// ── Numpad (full-size only) ─────────────────────────────

const numpadRows: LayoutRow[] = [
  [
    [
      { label: 'Num', code: 'NumLock', width: 1, zone: 'numpad' },
      { label: '/', code: 'NumpadDivide', width: 1, zone: 'numpad' },
      { label: '*', code: 'NumpadMultiply', width: 1, zone: 'numpad' },
      { label: '-', code: 'NumpadSubtract', width: 1, zone: 'numpad' },
    ],
  ],
  [
    [
      { label: '7', code: 'Numpad7', width: 1, zone: 'numpad' },
      { label: '8', code: 'Numpad8', width: 1, zone: 'numpad' },
      { label: '9', code: 'Numpad9', width: 1, zone: 'numpad' },
      { label: '+', code: 'NumpadAdd', width: 1, zone: 'numpad' },
    ],
  ],
  [
    [
      { label: '4', code: 'Numpad4', width: 1, zone: 'numpad' },
      { label: '5', code: 'Numpad5', width: 1, zone: 'numpad' },
      { label: '6', code: 'Numpad6', width: 1, zone: 'numpad' },
    ],
  ],
  [
    [
      { label: '1', code: 'Numpad1', width: 1, zone: 'numpad' },
      { label: '2', code: 'Numpad2', width: 1, zone: 'numpad' },
      { label: '3', code: 'Numpad3', width: 1, zone: 'numpad' },
      { label: 'Enter', code: 'NumpadEnter', width: 1, zone: 'numpad' },
    ],
  ],
  [
    [
      { label: '0', code: 'Numpad0', width: 2, zone: 'numpad' },
      { label: '.', code: 'NumpadDecimal', width: 1, zone: 'numpad' },
    ],
  ],
];

// ── Media keys (108-key only) ───────────────────────────

const mediaRow: LayoutRow[] = [
  [
    [
      { label: 'Mute', code: 'AudioMute', width: 1, zone: 'media' },
      { label: 'Vol-', code: 'AudioVolumeDown', width: 1, zone: 'media' },
      { label: 'Vol+', code: 'AudioVolumeUp', width: 1, zone: 'media' },
      { label: 'Calc', code: 'LaunchApp2', width: 1, zone: 'media' },
    ],
  ],
];

// ── ISO rows (differences from ANSI) ────────────────────

const isoRows: LayoutRow[] = [
  ...[ansiRows[0]],
  [
    [{ label: 'Tab', code: 'Tab', width: 1.5, zone: 'alpha' }],
    [
      { label: 'q', code: 'KeyQ', width: 1, zone: 'alpha' },
      { label: 'w', code: 'KeyW', width: 1, zone: 'alpha' },
      { label: 'e', code: 'KeyE', width: 1, zone: 'alpha' },
      { label: 'r', code: 'KeyR', width: 1, zone: 'alpha' },
      { label: 't', code: 'KeyT', width: 1, zone: 'alpha' },
      { label: 'y', code: 'KeyY', width: 1, zone: 'alpha' },
      { label: 'u', code: 'KeyU', width: 1, zone: 'alpha' },
      { label: 'i', code: 'KeyI', width: 1, zone: 'alpha' },
      { label: 'o', code: 'KeyO', width: 1, zone: 'alpha' },
      { label: 'p', code: 'KeyP', width: 1, zone: 'alpha' },
    ],
    [
      { label: '[', shifted: '{', code: 'BracketLeft', width: 1, zone: 'alpha' },
      { label: ']', shifted: '}', code: 'BracketRight', width: 1, zone: 'alpha' },
    ],
  ],
  [
    [{ label: 'Caps', code: 'CapsLock', width: 1.5, zone: 'alpha' }],
    [
      { label: 'a', code: 'KeyA', width: 1, zone: 'alpha' },
      { label: 's', code: 'KeyS', width: 1, zone: 'alpha' },
      { label: 'd', code: 'KeyD', width: 1, zone: 'alpha' },
      { label: 'f', code: 'KeyF', width: 1, zone: 'alpha' },
      { label: 'g', code: 'KeyG', width: 1, zone: 'alpha' },
      { label: 'h', code: 'KeyH', width: 1, zone: 'alpha' },
      { label: 'j', code: 'KeyJ', width: 1, zone: 'alpha' },
      { label: 'k', code: 'KeyK', width: 1, zone: 'alpha' },
      { label: 'l', code: 'KeyL', width: 1, zone: 'alpha' },
    ],
    [
      { label: ';', shifted: ':', code: 'Semicolon', width: 1, zone: 'alpha' },
      { label: "'", shifted: '"', code: 'Quote', width: 1, zone: 'alpha' },
      { label: '\\', shifted: '|', code: 'Backslash', width: 1, zone: 'alpha' },
      { label: 'Enter', code: 'Enter', width: 1.5, zone: 'alpha' },
    ],
  ],
  [
    [{ label: 'Shift', code: 'ShiftLeft', width: 1.25, zone: 'alpha' }],
    [
      { label: '<', shifted: '>', code: 'IntlBackslash', width: 1, zone: 'alpha' },
      { label: 'z', code: 'KeyZ', width: 1, zone: 'alpha' },
      { label: 'x', code: 'KeyX', width: 1, zone: 'alpha' },
      { label: 'c', code: 'KeyC', width: 1, zone: 'alpha' },
      { label: 'v', code: 'KeyV', width: 1, zone: 'alpha' },
      { label: 'b', code: 'KeyB', width: 1, zone: 'alpha' },
      { label: 'n', code: 'KeyN', width: 1, zone: 'alpha' },
      { label: 'm', code: 'KeyM', width: 1, zone: 'alpha' },
    ],
    [
      { label: ',', shifted: '<', code: 'Comma', width: 1, zone: 'alpha' },
      { label: '.', shifted: '>', code: 'Period', width: 1, zone: 'alpha' },
      { label: '/', shifted: '?', code: 'Slash', width: 1, zone: 'alpha' },
      { label: 'Shift', code: 'ShiftRight', width: 2.75, zone: 'alpha' },
    ],
  ],
  ...[ansiRows[4]],
];

const isoDebugRows: LayoutRow[] = [
  ...[ansiDebugRows[0]],
  ...[ansiDebugRows[1]],
  [
    [
      { label: 'Tab', code: 'Tab', width: 1.5, zone: 'alpha' },
      { label: 'Q', code: 'KeyQ', width: 1, zone: 'alpha' },
      { label: 'W', code: 'KeyW', width: 1, zone: 'alpha' },
      { label: 'E', code: 'KeyE', width: 1, zone: 'alpha' },
      { label: 'R', code: 'KeyR', width: 1, zone: 'alpha' },
      { label: 'T', code: 'KeyT', width: 1, zone: 'alpha' },
      { label: 'Y', code: 'KeyY', width: 1, zone: 'alpha' },
      { label: 'U', code: 'KeyU', width: 1, zone: 'alpha' },
      { label: 'I', code: 'KeyI', width: 1, zone: 'alpha' },
      { label: 'O', code: 'KeyO', width: 1, zone: 'alpha' },
      { label: 'P', code: 'KeyP', width: 1, zone: 'alpha' },
      { label: '[', code: 'BracketLeft', width: 1, zone: 'alpha' },
      { label: ']', code: 'BracketRight', width: 1, zone: 'alpha' },
    ],
  ],
  [
    [
      { label: 'Caps', code: 'CapsLock', width: 1.5, zone: 'alpha' },
      { label: 'A', code: 'KeyA', width: 1, zone: 'alpha' },
      { label: 'S', code: 'KeyS', width: 1, zone: 'alpha' },
      { label: 'D', code: 'KeyD', width: 1, zone: 'alpha' },
      { label: 'F', code: 'KeyF', width: 1, zone: 'alpha' },
      { label: 'G', code: 'KeyG', width: 1, zone: 'alpha' },
      { label: 'H', code: 'KeyH', width: 1, zone: 'alpha' },
      { label: 'J', code: 'KeyJ', width: 1, zone: 'alpha' },
      { label: 'K', code: 'KeyK', width: 1, zone: 'alpha' },
      { label: 'L', code: 'KeyL', width: 1, zone: 'alpha' },
      { label: ';', code: 'Semicolon', width: 1, zone: 'alpha' },
      { label: "'", code: 'Quote', width: 1, zone: 'alpha' },
      { label: '\\', code: 'Backslash', width: 1, zone: 'alpha' },
      { label: 'Enter', code: 'Enter', width: 1.5, zone: 'alpha' },
    ],
  ],
  [
    [
      { label: 'Shift', code: 'ShiftLeft', width: 1.25, zone: 'alpha' },
      { label: '<', code: 'IntlBackslash', width: 1, zone: 'alpha' },
      { label: 'Z', code: 'KeyZ', width: 1, zone: 'alpha' },
      { label: 'X', code: 'KeyX', width: 1, zone: 'alpha' },
      { label: 'C', code: 'KeyC', width: 1, zone: 'alpha' },
      { label: 'V', code: 'KeyV', width: 1, zone: 'alpha' },
      { label: 'B', code: 'KeyB', width: 1, zone: 'alpha' },
      { label: 'N', code: 'KeyN', width: 1, zone: 'alpha' },
      { label: 'M', code: 'KeyM', width: 1, zone: 'alpha' },
      { label: ',', code: 'Comma', width: 1, zone: 'alpha' },
      { label: '.', code: 'Period', width: 1, zone: 'alpha' },
      { label: '/', code: 'Slash', width: 1, zone: 'alpha' },
      { label: 'Shift', code: 'ShiftRight', width: 2.75, zone: 'alpha' },
    ],
  ],
  ...[ansiDebugRows[5]],
];

// ── 75% nav + arrows (separate groups: nav cluster above arrow cluster) ──

const compactNavArrows: LayoutRow[] = [
  [
    [
      { label: 'PrtSc', code: 'PrintScreen', width: 1, zone: 'nav' },
      { label: 'ScrLk', code: 'ScrollLock', width: 1, zone: 'nav' },
      { label: 'Pause', code: 'Pause', width: 1, zone: 'nav' },
    ],
  ],
  [
    [
      { label: 'Ins', code: 'Insert', width: 1, zone: 'nav' },
      { label: 'Home', code: 'Home', width: 1, zone: 'nav' },
      { label: 'PgUp', code: 'PageUp', width: 1, zone: 'nav' },
    ],
  ],
  [
    [
      { label: 'Del', code: 'Delete', width: 1, zone: 'nav' },
      { label: 'End', code: 'End', width: 1, zone: 'nav' },
      { label: 'PgDn', code: 'PageDown', width: 1, zone: 'nav' },
    ],
  ],
  [
    [
      { label: '', code: '', width: 1 },
      { label: '↑', code: 'ArrowUp', width: 1, zone: 'arrow' },
      { label: '', code: '', width: 1 },
    ],
  ],
  [
    [
      { label: '←', code: 'ArrowLeft', width: 1, zone: 'arrow' },
      { label: '↓', code: 'ArrowDown', width: 1, zone: 'arrow' },
      { label: '→', code: 'ArrowRight', width: 1, zone: 'arrow' },
    ],
  ],
];

// ── 96% compact nav (no PrtSc/ScrLk/Pause, just Ins/Home/PgUp + arrows) ──

const compact96NavArrows: LayoutRow[] = [
  [
    [
      { label: 'Ins', code: 'Insert', width: 1, zone: 'nav' },
      { label: 'Home', code: 'Home', width: 1, zone: 'nav' },
      { label: 'PgUp', code: 'PageUp', width: 1, zone: 'nav' },
    ],
  ],
  [
    [
      { label: 'Del', code: 'Delete', width: 1, zone: 'nav' },
      { label: 'End', code: 'End', width: 1, zone: 'nav' },
      { label: 'PgDn', code: 'PageDown', width: 1, zone: 'nav' },
    ],
  ],
  [
    [
      { label: '←', code: 'ArrowLeft', width: 1, zone: 'arrow' },
      { label: '↓', code: 'ArrowDown', width: 1, zone: 'arrow' },
      { label: '→', code: 'ArrowRight', width: 1, zone: 'arrow' },
    ],
  ],
];

// ── Layouts ─────────────────────────────────────────────

const ansiFull: KeyboardLayout = {
  id: 'ansi-full',
  name: '104',
  keyCount: 104,
  category: '100',
  rows: ansiRows,
  debugRows: ansiDebugRows,
  navRow: fullNavRow,
  arrows: sharedArrows,
  numpad: numpadRows,
};

const ansi108: KeyboardLayout = {
  id: 'ansi-108',
  name: '108',
  keyCount: 108,
  category: '100',
  rows: ansiRows,
  debugRows: ansiDebugRows,
  navRow: fullNavRow,
  arrows: sharedArrows,
  numpad: numpadRows,
  mediaRow: mediaRow,
};

const isoFull: KeyboardLayout = {
  id: 'iso-full',
  name: '104 ISO',
  keyCount: 104,
  category: '100',
  rows: isoRows,
  debugRows: isoDebugRows,
  navRow: fullNavRow,
  arrows: sharedArrows,
  numpad: numpadRows,
};

const ansi96: KeyboardLayout = {
  id: 'ansi-96',
  name: '98',
  keyCount: 98,
  category: '96',
  rows: ansiRows,
  debugRows: ansiDebugRows,
  navRow: compact96NavArrows,
  numpad: numpadRows,
};

// ── TKL (80%) dedicated rows ────────────────────────────

const tklRows: LayoutRow[] = [
  // Number row
  [
    [
      { label: '`', shifted: '~', code: 'Backquote', width: 1, zone: 'number' },
      { label: '1', shifted: '!', code: 'Digit1', width: 1, zone: 'number' },
      { label: '2', shifted: '@', code: 'Digit2', width: 1, zone: 'number' },
      { label: '3', shifted: '#', code: 'Digit3', width: 1, zone: 'number' },
      { label: '4', shifted: '$', code: 'Digit4', width: 1, zone: 'number' },
      { label: '5', shifted: '%', code: 'Digit5', width: 1, zone: 'number' },
    ],
    [
      { label: '6', shifted: '^', code: 'Digit6', width: 1, zone: 'number' },
      { label: '7', shifted: '&', code: 'Digit7', width: 1, zone: 'number' },
      { label: '8', shifted: '*', code: 'Digit8', width: 1, zone: 'number' },
      { label: '9', shifted: '(', code: 'Digit9', width: 1, zone: 'number' },
      { label: '0', shifted: ')', code: 'Digit0', width: 1, zone: 'number' },
      { label: '-', shifted: '_', code: 'Minus', width: 1, zone: 'number' },
      { label: '=', shifted: '+', code: 'Equal', width: 1, zone: 'number' },
    ],
    [
      { label: 'Backspace', code: 'Backspace', width: 2, zone: 'number' },
    ],
  ],
  // QWERTY row
  [
    [{ label: 'Tab', code: 'Tab', width: 1.5, zone: 'alpha' }],
    [
      { label: 'Q', code: 'KeyQ', width: 1, zone: 'alpha' },
      { label: 'W', code: 'KeyW', width: 1, zone: 'alpha' },
      { label: 'E', code: 'KeyE', width: 1, zone: 'alpha' },
      { label: 'R', code: 'KeyR', width: 1, zone: 'alpha' },
      { label: 'T', code: 'KeyT', width: 1, zone: 'alpha' },
      { label: 'Y', code: 'KeyY', width: 1, zone: 'alpha' },
      { label: 'U', code: 'KeyU', width: 1, zone: 'alpha' },
      { label: 'I', code: 'KeyI', width: 1, zone: 'alpha' },
      { label: 'O', code: 'KeyO', width: 1, zone: 'alpha' },
      { label: 'P', code: 'KeyP', width: 1, zone: 'alpha' },
    ],
    [
      { label: '[', shifted: '{', code: 'BracketLeft', width: 1, zone: 'alpha' },
      { label: ']', shifted: '}', code: 'BracketRight', width: 1, zone: 'alpha' },
      { label: '\\', shifted: '|', code: 'Backslash', width: 1.5, zone: 'alpha' },
    ],
  ],
  // Home row
  [
    [{ label: 'Caps', code: 'CapsLock', width: 1.75, zone: 'alpha' }],
    [
      { label: 'A', code: 'KeyA', width: 1, zone: 'alpha' },
      { label: 'S', code: 'KeyS', width: 1, zone: 'alpha' },
      { label: 'D', code: 'KeyD', width: 1, zone: 'alpha' },
      { label: 'F', code: 'KeyF', width: 1, zone: 'alpha' },
      { label: 'G', code: 'KeyG', width: 1, zone: 'alpha' },
      { label: 'H', code: 'KeyH', width: 1, zone: 'alpha' },
      { label: 'J', code: 'KeyJ', width: 1, zone: 'alpha' },
      { label: 'K', code: 'KeyK', width: 1, zone: 'alpha' },
      { label: 'L', code: 'KeyL', width: 1, zone: 'alpha' },
    ],
    [
      { label: ';', shifted: ':', code: 'Semicolon', width: 1, zone: 'alpha' },
      { label: "'", shifted: '"', code: 'Quote', width: 1, zone: 'alpha' },
      { label: 'Enter', code: 'Enter', width: 2.25, zone: 'alpha' },
    ],
  ],
  // Bottom row (no arrow key — arrows are a separate cluster)
  [
    [{ label: 'Shift', code: 'ShiftLeft', width: 2.25, zone: 'alpha' }],
    [
      { label: 'Z', code: 'KeyZ', width: 1, zone: 'alpha' },
      { label: 'X', code: 'KeyX', width: 1, zone: 'alpha' },
      { label: 'C', code: 'KeyC', width: 1, zone: 'alpha' },
      { label: 'V', code: 'KeyV', width: 1, zone: 'alpha' },
      { label: 'B', code: 'KeyB', width: 1, zone: 'alpha' },
      { label: 'N', code: 'KeyN', width: 1, zone: 'alpha' },
      { label: 'M', code: 'KeyM', width: 1, zone: 'alpha' },
    ],
    [
      { label: ',', shifted: '<', code: 'Comma', width: 1, zone: 'alpha' },
      { label: '.', shifted: '>', code: 'Period', width: 1, zone: 'alpha' },
      { label: '/', shifted: '?', code: 'Slash', width: 1, zone: 'alpha' },
      { label: 'Shift', code: 'ShiftRight', width: 2.75, zone: 'alpha' },
    ],
  ],
  // Modifier row (Windows-style)
  [
    [
      { label: 'Ctrl', code: 'ControlLeft', width: 1.25, zone: 'function' },
      { label: 'Win', code: 'MetaLeft', width: 1.25, zone: 'function' },
      { label: 'Alt', code: 'AltLeft', width: 1.25, zone: 'function' },
      { label: 'Space', code: 'Space', width: 6.25, zone: 'alpha' },
      { label: 'Alt', code: 'AltRight', width: 1.25, zone: 'function' },
      { label: 'Fn', code: 'Fn', width: 1.25, zone: 'function' },
      { label: 'Ctrl', code: 'ControlRight', width: 1.25, zone: 'function' },
    ],
  ],
];

// ── TKL (80%) nav cluster (3×3: Ins/Home/PgUp, Del/End/PgDn) ──

const tklNavRow: LayoutRow[] = [
  [
    [
      { label: 'Ins', code: 'Insert', width: 1, zone: 'nav' },
      { label: 'Home', code: 'Home', width: 1, zone: 'nav' },
      { label: 'PgUp', code: 'PageUp', width: 1, zone: 'nav' },
    ],
  ],
  [
    [
      { label: 'Del', code: 'Delete', width: 1, zone: 'nav' },
      { label: 'End', code: 'End', width: 1, zone: 'nav' },
      { label: 'PgDn', code: 'PageDown', width: 1, zone: 'nav' },
    ],
  ],
];

// ── TKL (80%) inverted-T arrow cluster ──────────────────

const tklArrows: LayoutRow[] = [
  [
    [
      { label: '', code: '', width: 1, zone: 'arrow' },
      { label: '↑', code: 'ArrowUp', width: 1, zone: 'arrow' },
      { label: '', code: '', width: 1, zone: 'arrow' },
    ],
  ],
  [
    [
      { label: '←', code: 'ArrowLeft', width: 1, zone: 'arrow' },
      { label: '↓', code: 'ArrowDown', width: 1, zone: 'arrow' },
      { label: '→', code: 'ArrowRight', width: 1, zone: 'arrow' },
    ],
  ],
];

// ── TKL (80%) debug rows (6 rows: F-row through modifier) ──

const tklDebugRows: LayoutRow[] = [
  // F-row: Esc + F1-F12 + PrtSc + ScrLk + Pause
  [
    [
      { label: 'Esc', code: 'Escape', width: 1.5, zone: 'function' },
      { label: 'F1', code: 'F1', width: 1, zone: 'function' },
      { label: 'F2', code: 'F2', width: 1, zone: 'function' },
      { label: 'F3', code: 'F3', width: 1, zone: 'function' },
      { label: 'F4', code: 'F4', width: 1, zone: 'function' },
      { label: 'F5', code: 'F5', width: 1, zone: 'function' },
      { label: 'F6', code: 'F6', width: 1, zone: 'function' },
      { label: 'F7', code: 'F7', width: 1, zone: 'function' },
      { label: 'F8', code: 'F8', width: 1, zone: 'function' },
      { label: 'F9', code: 'F9', width: 1, zone: 'function' },
      { label: 'F10', code: 'F10', width: 1, zone: 'function' },
      { label: 'F11', code: 'F11', width: 1, zone: 'function' },
      { label: 'F12', code: 'F12', width: 1, zone: 'function' },
      { label: 'PrtSc', code: 'PrintScreen', width: 1, zone: 'nav' },
      { label: 'ScrLk', code: 'ScrollLock', width: 1, zone: 'nav' },
      { label: 'Pause', code: 'Pause', width: 1, zone: 'nav' },
    ],
  ],
  // Number row
  [
    [
      { label: '`', shifted: '~', code: 'Backquote', width: 1, zone: 'number' },
      { label: '1', shifted: '!', code: 'Digit1', width: 1, zone: 'number' },
      { label: '2', shifted: '@', code: 'Digit2', width: 1, zone: 'number' },
      { label: '3', shifted: '#', code: 'Digit3', width: 1, zone: 'number' },
      { label: '4', shifted: '$', code: 'Digit4', width: 1, zone: 'number' },
      { label: '5', shifted: '%', code: 'Digit5', width: 1, zone: 'number' },
      { label: '6', shifted: '^', code: 'Digit6', width: 1, zone: 'number' },
      { label: '7', shifted: '&', code: 'Digit7', width: 1, zone: 'number' },
      { label: '8', shifted: '*', code: 'Digit8', width: 1, zone: 'number' },
      { label: '9', shifted: '(', code: 'Digit9', width: 1, zone: 'number' },
      { label: '0', shifted: ')', code: 'Digit0', width: 1, zone: 'number' },
      { label: '-', shifted: '_', code: 'Minus', width: 1, zone: 'number' },
      { label: '=', shifted: '+', code: 'Equal', width: 1, zone: 'number' },
      { label: 'Backspace', code: 'Backspace', width: 2, zone: 'number' },
    ],
  ],
  // QWERTY row
  [
    [
      { label: 'Tab', code: 'Tab', width: 1.5, zone: 'alpha' },
      { label: 'Q', code: 'KeyQ', width: 1, zone: 'alpha' },
      { label: 'W', code: 'KeyW', width: 1, zone: 'alpha' },
      { label: 'E', code: 'KeyE', width: 1, zone: 'alpha' },
      { label: 'R', code: 'KeyR', width: 1, zone: 'alpha' },
      { label: 'T', code: 'KeyT', width: 1, zone: 'alpha' },
      { label: 'Y', code: 'KeyY', width: 1, zone: 'alpha' },
      { label: 'U', code: 'KeyU', width: 1, zone: 'alpha' },
      { label: 'I', code: 'KeyI', width: 1, zone: 'alpha' },
      { label: 'O', code: 'KeyO', width: 1, zone: 'alpha' },
      { label: 'P', code: 'KeyP', width: 1, zone: 'alpha' },
      { label: '[', code: 'BracketLeft', width: 1, zone: 'alpha' },
      { label: ']', code: 'BracketRight', width: 1, zone: 'alpha' },
      { label: '\\', code: 'Backslash', width: 1.5, zone: 'alpha' },
    ],
  ],
  // Home row
  [
    [
      { label: 'Caps', code: 'CapsLock', width: 1.75, zone: 'alpha' },
      { label: 'A', code: 'KeyA', width: 1, zone: 'alpha' },
      { label: 'S', code: 'KeyS', width: 1, zone: 'alpha' },
      { label: 'D', code: 'KeyD', width: 1, zone: 'alpha' },
      { label: 'F', code: 'KeyF', width: 1, zone: 'alpha' },
      { label: 'G', code: 'KeyG', width: 1, zone: 'alpha' },
      { label: 'H', code: 'KeyH', width: 1, zone: 'alpha' },
      { label: 'J', code: 'KeyJ', width: 1, zone: 'alpha' },
      { label: 'K', code: 'KeyK', width: 1, zone: 'alpha' },
      { label: 'L', code: 'KeyL', width: 1, zone: 'alpha' },
      { label: ';', code: 'Semicolon', width: 1, zone: 'alpha' },
      { label: "'", code: 'Quote', width: 1, zone: 'alpha' },
      { label: 'Enter', code: 'Enter', width: 2.25, zone: 'alpha' },
    ],
  ],
  // Bottom row
  [
    [
      { label: 'Shift', code: 'ShiftLeft', width: 2.25, zone: 'alpha' },
      { label: 'Z', code: 'KeyZ', width: 1, zone: 'alpha' },
      { label: 'X', code: 'KeyX', width: 1, zone: 'alpha' },
      { label: 'C', code: 'KeyC', width: 1, zone: 'alpha' },
      { label: 'V', code: 'KeyV', width: 1, zone: 'alpha' },
      { label: 'B', code: 'KeyB', width: 1, zone: 'alpha' },
      { label: 'N', code: 'KeyN', width: 1, zone: 'alpha' },
      { label: 'M', code: 'KeyM', width: 1, zone: 'alpha' },
      { label: ',', code: 'Comma', width: 1, zone: 'alpha' },
      { label: '.', code: 'Period', width: 1, zone: 'alpha' },
      { label: '/', code: 'Slash', width: 1, zone: 'alpha' },
      { label: 'Shift', code: 'ShiftRight', width: 2.75, zone: 'alpha' },
    ],
  ],
  // Modifier row with Win/Fn
  [
    [
      { label: 'Ctrl', code: 'ControlLeft', width: 1.25, zone: 'function' },
      { label: 'Win', code: 'MetaLeft', width: 1.25, zone: 'function' },
      { label: 'Alt', code: 'AltLeft', width: 1.25, zone: 'function' },
      { label: 'Space', code: 'Space', width: 6.25, zone: 'alpha' },
      { label: 'Alt', code: 'AltRight', width: 1.25, zone: 'function' },
      { label: 'Fn', code: 'Fn', width: 1.25, zone: 'function' },
      { label: 'Ctrl', code: 'ControlRight', width: 1.25, zone: 'function' },
    ],
  ],
];

const ansiTkl: KeyboardLayout = {
  id: 'ansi-tkl',
  name: '87',
  keyCount: 87,
  category: '80',
  rows: tklRows,
  debugRows: tklDebugRows,
  navRow: tklNavRow,
  arrows: tklArrows,
};

// 75% rows: nav keys (Home/PgUp/PgDn/End) and arrows integrated on each row
const ansi75Rows: LayoutRow[] = [
  // F-row + PrtSc + Pause + Del
  [
    [
      { label: 'Esc', code: 'Escape', width: 1.5, zone: 'function' },
    ],
    [
      { label: 'F1', code: 'F1', width: 1, zone: 'function' },
      { label: 'F2', code: 'F2', width: 1, zone: 'function' },
      { label: 'F3', code: 'F3', width: 1, zone: 'function' },
      { label: 'F4', code: 'F4', width: 1, zone: 'function' },
      { label: 'F5', code: 'F5', width: 1, zone: 'function' },
      { label: 'F6', code: 'F6', width: 1, zone: 'function' },
      { label: 'F7', code: 'F7', width: 1, zone: 'function' },
      { label: 'F8', code: 'F8', width: 1, zone: 'function' },
      { label: 'F9', code: 'F9', width: 1, zone: 'function' },
      { label: 'F10', code: 'F10', width: 1, zone: 'function' },
      { label: 'F11', code: 'F11', width: 1, zone: 'function' },
      { label: 'F12', code: 'F12', width: 1, zone: 'function' },
      { label: 'PrtSc', code: 'PrintScreen', width: 1, zone: 'nav' },
      { label: 'Pause', code: 'Pause', width: 1, zone: 'nav' },
      { label: 'Del', code: 'Delete', width: 1, zone: 'nav' },
    ],
  ],
  // Number row + Home
  [
    [
      { label: '`', shifted: '~', code: 'Backquote', width: 1, zone: 'number' },
      { label: '1', shifted: '!', code: 'Digit1', width: 1, zone: 'number' },
      { label: '2', shifted: '@', code: 'Digit2', width: 1, zone: 'number' },
      { label: '3', shifted: '#', code: 'Digit3', width: 1, zone: 'number' },
      { label: '4', shifted: '$', code: 'Digit4', width: 1, zone: 'number' },
      { label: '5', shifted: '%', code: 'Digit5', width: 1, zone: 'number' },
    ],
    [
      { label: '6', shifted: '^', code: 'Digit6', width: 1, zone: 'number' },
      { label: '7', shifted: '&', code: 'Digit7', width: 1, zone: 'number' },
      { label: '8', shifted: '*', code: 'Digit8', width: 1, zone: 'number' },
      { label: '9', shifted: '(', code: 'Digit9', width: 1, zone: 'number' },
      { label: '0', shifted: ')', code: 'Digit0', width: 1, zone: 'number' },
      { label: '-', shifted: '_', code: 'Minus', width: 1, zone: 'number' },
      { label: '=', shifted: '+', code: 'Equal', width: 1, zone: 'number' },
    ],
    [
      { label: 'Backspace', code: 'Backspace', width: 2.5, zone: 'number' },
      { label: 'Home', code: 'Home', width: 1, zone: 'nav' },
    ],
  ],
  // QWERTY row + PgUp
  [
    [{ label: 'Tab', code: 'Tab', width: 1.5, zone: 'alpha' }],
    [
      { label: 'q', code: 'KeyQ', width: 1, zone: 'alpha' },
      { label: 'w', code: 'KeyW', width: 1, zone: 'alpha' },
      { label: 'e', code: 'KeyE', width: 1, zone: 'alpha' },
      { label: 'r', code: 'KeyR', width: 1, zone: 'alpha' },
      { label: 't', code: 'KeyT', width: 1, zone: 'alpha' },
      { label: 'y', code: 'KeyY', width: 1, zone: 'alpha' },
      { label: 'u', code: 'KeyU', width: 1, zone: 'alpha' },
      { label: 'i', code: 'KeyI', width: 1, zone: 'alpha' },
      { label: 'o', code: 'KeyO', width: 1, zone: 'alpha' },
      { label: 'p', code: 'KeyP', width: 1, zone: 'alpha' },
    ],
    [
      { label: '[', shifted: '{', code: 'BracketLeft', width: 1, zone: 'alpha' },
      { label: ']', shifted: '}', code: 'BracketRight', width: 1, zone: 'alpha' },
      { label: '\\', shifted: '|', code: 'Backslash', width: 2, zone: 'alpha' },
      { label: 'PgUp', code: 'PageUp', width: 1, zone: 'nav' },
    ],
  ],
  // Home row + PgDn
  [
    [{ label: 'Caps', code: 'CapsLock', width: 1.75, zone: 'alpha' }],
    [
      { label: 'a', code: 'KeyA', width: 1, zone: 'alpha' },
      { label: 's', code: 'KeyS', width: 1, zone: 'alpha' },
      { label: 'd', code: 'KeyD', width: 1, zone: 'alpha' },
      { label: 'f', code: 'KeyF', width: 1, zone: 'alpha' },
      { label: 'g', code: 'KeyG', width: 1, zone: 'alpha' },
      { label: 'h', code: 'KeyH', width: 1, zone: 'alpha' },
      { label: 'j', code: 'KeyJ', width: 1, zone: 'alpha' },
      { label: 'k', code: 'KeyK', width: 1, zone: 'alpha' },
      { label: 'l', code: 'KeyL', width: 1, zone: 'alpha' },
    ],
    [
      { label: ';', shifted: ':', code: 'Semicolon', width: 1, zone: 'alpha' },
      { label: "'", shifted: '"', code: 'Quote', width: 1, zone: 'alpha' },
      { label: 'Enter', code: 'Enter', width: 2.75, zone: 'alpha' },
      { label: 'PgDn', code: 'PageDown', width: 1, zone: 'nav' },
    ],
  ],
  // Bottom row + ↑ + End
  [
    [{ label: 'Shift', code: 'ShiftLeft', width: 2.25, zone: 'alpha' }],
    [
      { label: 'z', code: 'KeyZ', width: 1, zone: 'alpha' },
      { label: 'x', code: 'KeyX', width: 1, zone: 'alpha' },
      { label: 'c', code: 'KeyC', width: 1, zone: 'alpha' },
      { label: 'v', code: 'KeyV', width: 1, zone: 'alpha' },
      { label: 'b', code: 'KeyB', width: 1, zone: 'alpha' },
      { label: 'n', code: 'KeyN', width: 1, zone: 'alpha' },
      { label: 'm', code: 'KeyM', width: 1, zone: 'alpha' },
    ],
    [
      { label: ',', shifted: '<', code: 'Comma', width: 1, zone: 'alpha' },
      { label: '.', shifted: '>', code: 'Period', width: 1, zone: 'alpha' },
      { label: '/', shifted: '?', code: 'Slash', width: 1, zone: 'alpha' },
      { label: 'Shift', code: 'ShiftRight', width: 2.25, zone: 'alpha' },
      { label: '↑', code: 'ArrowUp', width: 1, zone: 'arrow' },
      { label: 'End', code: 'End', width: 1, zone: 'nav' },
    ],
  ],
  // Modifier row + ← ↓ →
  [
    [
      { label: 'Ctrl', code: 'ControlLeft', width: 1.25, zone: 'function' },
      { label: 'Win', code: 'MetaLeft', width: 1.25, zone: 'function' },
      { label: 'Alt', code: 'AltLeft', width: 1.25, zone: 'function' },
    ],
    [
      { label: 'Space', code: 'Space', width: 6.25, zone: 'alpha' },
    ],
    [
      { label: 'Alt', code: 'AltRight', width: 1.25, zone: 'function' },
      { label: 'Fn', code: 'Fn', width: 1.25, zone: 'function' },
      { label: 'Ctrl', code: 'ControlRight', width: 1.25, zone: 'function' },
      { label: '←', code: 'ArrowLeft', width: 1, zone: 'arrow' },
      { label: '↓', code: 'ArrowDown', width: 1, zone: 'arrow' },
      { label: '→', code: 'ArrowRight', width: 1, zone: 'arrow' },
    ],
  ],
];

// 75% debug: includes F-row with PrtSc/Pause/Del integrated
const ansi75DebugRows: LayoutRow[] = [
  // F-row + PrtSc + Pause + Del
  [
    [
      { label: 'Esc', code: 'Escape', width: 1.5, zone: 'function' },
    ],
    [
      { label: 'F1', code: 'F1', width: 1, zone: 'function' },
      { label: 'F2', code: 'F2', width: 1, zone: 'function' },
      { label: 'F3', code: 'F3', width: 1, zone: 'function' },
      { label: 'F4', code: 'F4', width: 1, zone: 'function' },
      { label: 'F5', code: 'F5', width: 1, zone: 'function' },
      { label: 'F6', code: 'F6', width: 1, zone: 'function' },
      { label: 'F7', code: 'F7', width: 1, zone: 'function' },
      { label: 'F8', code: 'F8', width: 1, zone: 'function' },
      { label: 'F9', code: 'F9', width: 1, zone: 'function' },
      { label: 'F10', code: 'F10', width: 1, zone: 'function' },
      { label: 'F11', code: 'F11', width: 1, zone: 'function' },
      { label: 'F12', code: 'F12', width: 1, zone: 'function' },
      { label: 'PrtSc', code: 'PrintScreen', width: 1, zone: 'nav' },
      { label: 'Pause', code: 'Pause', width: 1, zone: 'nav' },
      { label: 'Del', code: 'Delete', width: 1, zone: 'nav' },
    ],
  ],
  // Number row + Home
  [
    [
      { label: '`', shifted: '~', code: 'Backquote', width: 1, zone: 'number' },
      { label: '1', shifted: '!', code: 'Digit1', width: 1, zone: 'number' },
      { label: '2', shifted: '@', code: 'Digit2', width: 1, zone: 'number' },
      { label: '3', shifted: '#', code: 'Digit3', width: 1, zone: 'number' },
      { label: '4', shifted: '$', code: 'Digit4', width: 1, zone: 'number' },
      { label: '5', shifted: '%', code: 'Digit5', width: 1, zone: 'number' },
      { label: '6', shifted: '^', code: 'Digit6', width: 1, zone: 'number' },
      { label: '7', shifted: '&', code: 'Digit7', width: 1, zone: 'number' },
      { label: '8', shifted: '*', code: 'Digit8', width: 1, zone: 'number' },
      { label: '9', shifted: '(', code: 'Digit9', width: 1, zone: 'number' },
      { label: '0', shifted: ')', code: 'Digit0', width: 1, zone: 'number' },
      { label: '-', shifted: '_', code: 'Minus', width: 1, zone: 'number' },
      { label: '=', shifted: '+', code: 'Equal', width: 1, zone: 'number' },
      { label: '⌫', code: 'Backspace', width: 2, zone: 'number' },
      { label: 'Home', code: 'Home', width: 1, zone: 'nav' },
    ],
  ],
  // QWERTY row + PgUp
  [
    [
      { label: 'Tab', code: 'Tab', width: 1.5, zone: 'alpha' },
      { label: 'Q', code: 'KeyQ', width: 1, zone: 'alpha' },
      { label: 'W', code: 'KeyW', width: 1, zone: 'alpha' },
      { label: 'E', code: 'KeyE', width: 1, zone: 'alpha' },
      { label: 'R', code: 'KeyR', width: 1, zone: 'alpha' },
      { label: 'T', code: 'KeyT', width: 1, zone: 'alpha' },
      { label: 'Y', code: 'KeyY', width: 1, zone: 'alpha' },
      { label: 'U', code: 'KeyU', width: 1, zone: 'alpha' },
      { label: 'I', code: 'KeyI', width: 1, zone: 'alpha' },
      { label: 'O', code: 'KeyO', width: 1, zone: 'alpha' },
      { label: 'P', code: 'KeyP', width: 1, zone: 'alpha' },
      { label: '[', code: 'BracketLeft', width: 1, zone: 'alpha' },
      { label: ']', code: 'BracketRight', width: 1, zone: 'alpha' },
      { label: '\\', code: 'Backslash', width: 2, zone: 'alpha' },
      { label: 'PgUp', code: 'PageUp', width: 1, zone: 'nav' },
    ],
  ],
  // Home row + PgDn
  [
    [
      { label: 'Caps', code: 'CapsLock', width: 1.75, zone: 'alpha' },
      { label: 'A', code: 'KeyA', width: 1, zone: 'alpha' },
      { label: 'S', code: 'KeyS', width: 1, zone: 'alpha' },
      { label: 'D', code: 'KeyD', width: 1, zone: 'alpha' },
      { label: 'F', code: 'KeyF', width: 1, zone: 'alpha' },
      { label: 'G', code: 'KeyG', width: 1, zone: 'alpha' },
      { label: 'H', code: 'KeyH', width: 1, zone: 'alpha' },
      { label: 'J', code: 'KeyJ', width: 1, zone: 'alpha' },
      { label: 'K', code: 'KeyK', width: 1, zone: 'alpha' },
      { label: 'L', code: 'KeyL', width: 1, zone: 'alpha' },
      { label: ';', code: 'Semicolon', width: 1, zone: 'alpha' },
      { label: "'", code: 'Quote', width: 1, zone: 'alpha' },
      { label: 'Enter', code: 'Enter', width: 2.75, zone: 'alpha' },
      { label: 'PgDn', code: 'PageDown', width: 1, zone: 'nav' },
    ],
  ],
  // Bottom row + ↑ + End
  [
    [
      { label: 'Shift', code: 'ShiftLeft', width: 2.25, zone: 'alpha' },
      { label: 'Z', code: 'KeyZ', width: 1, zone: 'alpha' },
      { label: 'X', code: 'KeyX', width: 1, zone: 'alpha' },
      { label: 'C', code: 'KeyC', width: 1, zone: 'alpha' },
      { label: 'V', code: 'KeyV', width: 1, zone: 'alpha' },
      { label: 'B', code: 'KeyB', width: 1, zone: 'alpha' },
      { label: 'N', code: 'KeyN', width: 1, zone: 'alpha' },
      { label: 'M', code: 'KeyM', width: 1, zone: 'alpha' },
      { label: ',', code: 'Comma', width: 1, zone: 'alpha' },
      { label: '.', code: 'Period', width: 1, zone: 'alpha' },
      { label: '/', code: 'Slash', width: 1, zone: 'alpha' },
      { label: 'Shift', code: 'ShiftRight', width: 2.25, zone: 'alpha' },
      { label: '↑', code: 'ArrowUp', width: 1, zone: 'arrow' },
      { label: 'End', code: 'End', width: 1, zone: 'nav' },
    ],
  ],
  // Modifier row + ← ↓ →
  [
    [
      { label: 'Ctrl', code: 'ControlLeft', width: 1.25, zone: 'function' },
      { label: 'Win', code: 'MetaLeft', width: 1.25, zone: 'function' },
      { label: 'Alt', code: 'AltLeft', width: 1.25, zone: 'function' },
    ],
    [
      { label: 'Space', code: 'Space', width: 6.25, zone: 'alpha' },
    ],
    [
      { label: 'Alt', code: 'AltRight', width: 1.25, zone: 'function' },
      { label: 'Fn', code: 'Fn', width: 1.25, zone: 'function' },
      { label: 'Ctrl', code: 'ControlRight', width: 1.25, zone: 'function' },
      { label: '←', code: 'ArrowLeft', width: 1, zone: 'arrow' },
      { label: '↓', code: 'ArrowDown', width: 1, zone: 'arrow' },
      { label: '→', code: 'ArrowRight', width: 1, zone: 'arrow' },
    ],
  ],
];

const ansi75: KeyboardLayout = {
  id: 'ansi-75',
  name: '75%',
  keyCount: 84,
  category: '75',
  rows: ansi75Rows,
  debugRows: ansi75DebugRows,
};

// 65% rows: nav keys (Del/PgUp/PgDn) and arrows integrated on the same rows as main keys
const ansi65Rows: LayoutRow[] = [
  // Number row + Del
  [
    [
      { label: '`', shifted: '~', code: 'Backquote', width: 1, zone: 'number' },
      { label: '1', shifted: '!', code: 'Digit1', width: 1, zone: 'number' },
      { label: '2', shifted: '@', code: 'Digit2', width: 1, zone: 'number' },
      { label: '3', shifted: '#', code: 'Digit3', width: 1, zone: 'number' },
      { label: '4', shifted: '$', code: 'Digit4', width: 1, zone: 'number' },
      { label: '5', shifted: '%', code: 'Digit5', width: 1, zone: 'number' },
    ],
    [
      { label: '6', shifted: '^', code: 'Digit6', width: 1, zone: 'number' },
      { label: '7', shifted: '&', code: 'Digit7', width: 1, zone: 'number' },
      { label: '8', shifted: '*', code: 'Digit8', width: 1, zone: 'number' },
      { label: '9', shifted: '(', code: 'Digit9', width: 1, zone: 'number' },
      { label: '0', shifted: ')', code: 'Digit0', width: 1, zone: 'number' },
      { label: '-', shifted: '_', code: 'Minus', width: 1, zone: 'number' },
      { label: '=', shifted: '+', code: 'Equal', width: 1, zone: 'number' },
    ],
    [
      { label: 'Backspace', code: 'Backspace', width: 2, zone: 'number' },
      { label: 'Del', code: 'Delete', width: 1, zone: 'nav' },
    ],
  ],
  // QWERTY row + PgUp
  [
    [{ label: 'Tab', code: 'Tab', width: 1.5, zone: 'alpha' }],
    [
      { label: 'q', code: 'KeyQ', width: 1, zone: 'alpha' },
      { label: 'w', code: 'KeyW', width: 1, zone: 'alpha' },
      { label: 'e', code: 'KeyE', width: 1, zone: 'alpha' },
      { label: 'r', code: 'KeyR', width: 1, zone: 'alpha' },
      { label: 't', code: 'KeyT', width: 1, zone: 'alpha' },
      { label: 'y', code: 'KeyY', width: 1, zone: 'alpha' },
      { label: 'u', code: 'KeyU', width: 1, zone: 'alpha' },
      { label: 'i', code: 'KeyI', width: 1, zone: 'alpha' },
      { label: 'o', code: 'KeyO', width: 1, zone: 'alpha' },
      { label: 'p', code: 'KeyP', width: 1, zone: 'alpha' },
    ],
    [
      { label: '[', shifted: '{', code: 'BracketLeft', width: 1, zone: 'alpha' },
      { label: ']', shifted: '}', code: 'BracketRight', width: 1, zone: 'alpha' },
      { label: '\\', shifted: '|', code: 'Backslash', width: 2, zone: 'alpha' },
      { label: 'PgUp', code: 'PageUp', width: 1, zone: 'nav' },
    ],
  ],
  // Home row + PgDn
  [
    [{ label: 'Caps', code: 'CapsLock', width: 1.75, zone: 'alpha' }],
    [
      { label: 'a', code: 'KeyA', width: 1, zone: 'alpha' },
      { label: 's', code: 'KeyS', width: 1, zone: 'alpha' },
      { label: 'd', code: 'KeyD', width: 1, zone: 'alpha' },
      { label: 'f', code: 'KeyF', width: 1, zone: 'alpha' },
      { label: 'g', code: 'KeyG', width: 1, zone: 'alpha' },
      { label: 'h', code: 'KeyH', width: 1, zone: 'alpha' },
      { label: 'j', code: 'KeyJ', width: 1, zone: 'alpha' },
      { label: 'k', code: 'KeyK', width: 1, zone: 'alpha' },
      { label: 'l', code: 'KeyL', width: 1, zone: 'alpha' },
    ],
    [
      { label: ';', shifted: ':', code: 'Semicolon', width: 1, zone: 'alpha' },
      { label: "'", shifted: '"', code: 'Quote', width: 1, zone: 'alpha' },
      { label: 'Enter', code: 'Enter', width: 2.25, zone: 'alpha' },
      { label: 'PgUp', code: 'PageUp', width: 1, zone: 'nav' },
    ],
  ],
  // Bottom row + ↑ + PgDn
  [
    [{ label: 'Shift', code: 'ShiftLeft', width: 2.25, zone: 'alpha' }],
    [
      { label: 'z', code: 'KeyZ', width: 1, zone: 'alpha' },
      { label: 'x', code: 'KeyX', width: 1, zone: 'alpha' },
      { label: 'c', code: 'KeyC', width: 1, zone: 'alpha' },
      { label: 'v', code: 'KeyV', width: 1, zone: 'alpha' },
      { label: 'b', code: 'KeyB', width: 1, zone: 'alpha' },
      { label: 'n', code: 'KeyN', width: 1, zone: 'alpha' },
      { label: 'm', code: 'KeyM', width: 1, zone: 'alpha' },
    ],
    [
      { label: ',', shifted: '<', code: 'Comma', width: 1, zone: 'alpha' },
      { label: '.', shifted: '>', code: 'Period', width: 1, zone: 'alpha' },
      { label: '/', shifted: '?', code: 'Slash', width: 1, zone: 'alpha' },
      { label: 'Shift', code: 'ShiftRight', width: 2.75, zone: 'alpha' },
      { label: '↑', code: 'ArrowUp', width: 1, zone: 'arrow' },
      { label: 'PgDn', code: 'PageDown', width: 1, zone: 'nav' },
    ],
  ],
  // Modifier row + ← ↓ →
  [
    [
      { label: 'Ctrl', code: 'ControlLeft', width: 1.25, zone: 'function' },
      { label: 'Win', code: 'MetaLeft', width: 1.25, zone: 'function' },
      { label: 'Alt', code: 'AltLeft', width: 1.25, zone: 'function' },
    ],
    [
      { label: 'Space', code: 'Space', width: 6.25, zone: 'alpha' },
    ],
    [
      { label: 'Alt', code: 'AltRight', width: 1.25, zone: 'function' },
      { label: 'Fn', code: 'Fn', width: 1.25, zone: 'function' },
      { label: 'Ctrl', code: 'ControlRight', width: 1.25, zone: 'function' },
      { label: '←', code: 'ArrowLeft', width: 1, zone: 'arrow' },
      { label: '↓', code: 'ArrowDown', width: 1, zone: 'arrow' },
      { label: '→', code: 'ArrowRight', width: 1, zone: 'arrow' },
    ],
  ],
];

// 65% debug: same layout as heatmap rows (no F-row — 65% doesn't have one)
const ansi65DebugRows: LayoutRow[] = [
  // Number row + Del
  [
    [
      { label: '`', shifted: '~', code: 'Backquote', width: 1, zone: 'number' },
      { label: '1', shifted: '!', code: 'Digit1', width: 1, zone: 'number' },
      { label: '2', shifted: '@', code: 'Digit2', width: 1, zone: 'number' },
      { label: '3', shifted: '#', code: 'Digit3', width: 1, zone: 'number' },
      { label: '4', shifted: '$', code: 'Digit4', width: 1, zone: 'number' },
      { label: '5', shifted: '%', code: 'Digit5', width: 1, zone: 'number' },
      { label: '6', shifted: '^', code: 'Digit6', width: 1, zone: 'number' },
      { label: '7', shifted: '&', code: 'Digit7', width: 1, zone: 'number' },
      { label: '8', shifted: '*', code: 'Digit8', width: 1, zone: 'number' },
      { label: '9', shifted: '(', code: 'Digit9', width: 1, zone: 'number' },
      { label: '0', shifted: ')', code: 'Digit0', width: 1, zone: 'number' },
      { label: '-', shifted: '_', code: 'Minus', width: 1, zone: 'number' },
      { label: '=', shifted: '+', code: 'Equal', width: 1, zone: 'number' },
      { label: '⌫', code: 'Backspace', width: 2, zone: 'number' },
      { label: 'Del', code: 'Delete', width: 1, zone: 'nav' },
    ],
  ],
  // QWERTY row + PgUp
  [
    [
      { label: 'Tab', code: 'Tab', width: 1.5, zone: 'alpha' },
      { label: 'Q', code: 'KeyQ', width: 1, zone: 'alpha' },
      { label: 'W', code: 'KeyW', width: 1, zone: 'alpha' },
      { label: 'E', code: 'KeyE', width: 1, zone: 'alpha' },
      { label: 'R', code: 'KeyR', width: 1, zone: 'alpha' },
      { label: 'T', code: 'KeyT', width: 1, zone: 'alpha' },
      { label: 'Y', code: 'KeyY', width: 1, zone: 'alpha' },
      { label: 'U', code: 'KeyU', width: 1, zone: 'alpha' },
      { label: 'I', code: 'KeyI', width: 1, zone: 'alpha' },
      { label: 'O', code: 'KeyO', width: 1, zone: 'alpha' },
      { label: 'P', code: 'KeyP', width: 1, zone: 'alpha' },
      { label: '[', code: 'BracketLeft', width: 1, zone: 'alpha' },
      { label: ']', code: 'BracketRight', width: 1, zone: 'alpha' },
      { label: '\\', code: 'Backslash', width: 2, zone: 'alpha' },
      { label: 'PgUp', code: 'PageUp', width: 1, zone: 'nav' },
    ],
  ],
  // Home row + ↑ + PgDn
  [
    [
      { label: 'Caps', code: 'CapsLock', width: 1.75, zone: 'alpha' },
      { label: 'A', code: 'KeyA', width: 1, zone: 'alpha' },
      { label: 'S', code: 'KeyS', width: 1, zone: 'alpha' },
      { label: 'D', code: 'KeyD', width: 1, zone: 'alpha' },
      { label: 'F', code: 'KeyF', width: 1, zone: 'alpha' },
      { label: 'G', code: 'KeyG', width: 1, zone: 'alpha' },
      { label: 'H', code: 'KeyH', width: 1, zone: 'alpha' },
      { label: 'J', code: 'KeyJ', width: 1, zone: 'alpha' },
      { label: 'K', code: 'KeyK', width: 1, zone: 'alpha' },
      { label: 'L', code: 'KeyL', width: 1, zone: 'alpha' },
      { label: ';', code: 'Semicolon', width: 1, zone: 'alpha' },
      { label: "'", code: 'Quote', width: 1, zone: 'alpha' },
      { label: 'Enter', code: 'Enter', width: 2.25, zone: 'alpha' },
      { label: 'PgUp', code: 'PageUp', width: 1, zone: 'nav' },
    ],
  ],
  // Bottom row
  [
    [
      { label: 'Shift', code: 'ShiftLeft', width: 2.25, zone: 'alpha' },
      { label: 'Z', code: 'KeyZ', width: 1, zone: 'alpha' },
      { label: 'X', code: 'KeyX', width: 1, zone: 'alpha' },
      { label: 'C', code: 'KeyC', width: 1, zone: 'alpha' },
      { label: 'V', code: 'KeyV', width: 1, zone: 'alpha' },
      { label: 'B', code: 'KeyB', width: 1, zone: 'alpha' },
      { label: 'N', code: 'KeyN', width: 1, zone: 'alpha' },
      { label: 'M', code: 'KeyM', width: 1, zone: 'alpha' },
      { label: ',', code: 'Comma', width: 1, zone: 'alpha' },
      { label: '.', code: 'Period', width: 1, zone: 'alpha' },
      { label: '/', code: 'Slash', width: 1, zone: 'alpha' },
      { label: 'Shift', code: 'ShiftRight', width: 2.75, zone: 'alpha' },
      { label: '↑', code: 'ArrowUp', width: 1, zone: 'arrow' },
      { label: 'PgDn', code: 'PageDown', width: 1, zone: 'nav' },
    ],
  ],
  // Modifier row + ← ↓ →
  [
    [
      { label: 'Ctrl', code: 'ControlLeft', width: 1.25, zone: 'function' },
      { label: 'Win', code: 'MetaLeft', width: 1.25, zone: 'function' },
      { label: 'Alt', code: 'AltLeft', width: 1.25, zone: 'function' },
    ],
    [
      { label: 'Space', code: 'Space', width: 6.25, zone: 'alpha' },
    ],
    [
      { label: 'Alt', code: 'AltRight', width: 1.25, zone: 'function' },
      { label: 'Fn', code: 'Fn', width: 1.25, zone: 'function' },
      { label: 'Ctrl', code: 'ControlRight', width: 1.25, zone: 'function' },
      { label: '←', code: 'ArrowLeft', width: 1, zone: 'arrow' },
      { label: '↓', code: 'ArrowDown', width: 1, zone: 'arrow' },
      { label: '→', code: 'ArrowRight', width: 1, zone: 'arrow' },
    ],
  ],
];

const ansi65: KeyboardLayout = {
  id: 'ansi-65',
  name: '68',
  keyCount: 68,
  category: '65',
  rows: ansi65Rows,
  debugRows: ansi65DebugRows,
};

// 60% modifier row: 3 left + space + 4 right (matching physical 60% layout)
const ansi60Rows: LayoutRow[] = [
  ...ansiRows.slice(0, 4),
  [
    [
      { label: 'Ctrl', code: 'ControlLeft', width: 1.5, zone: 'function' },
      { label: 'Win', code: 'MetaLeft', width: 1.5, zone: 'function' },
      { label: 'Alt', code: 'AltLeft', width: 1.5, zone: 'function' },
    ],
    [
      { label: 'Space', code: 'Space', width: 6.25, zone: 'alpha' },
    ],
    [
      { label: 'Alt', code: 'AltRight', width: 1.25, zone: 'function' },
      { label: 'Fn', code: 'Fn', width: 1.25, zone: 'function' },
      { label: 'Menu', code: 'ContextMenu', width: 1.25, zone: 'function' },
      { label: 'Ctrl', code: 'ControlRight', width: 1.25, zone: 'function' },
    ],
  ],
];

// 60% debug: no F-row, use 60% modifier row
const ansi60DebugRows: LayoutRow[] = [
  ...ansiDebugRows.slice(1, 5),
  [
    [
      { label: 'Ctrl', code: 'ControlLeft', width: 1.5, zone: 'function' },
      { label: 'Win', code: 'MetaLeft', width: 1.5, zone: 'function' },
      { label: 'Alt', code: 'AltLeft', width: 1.5, zone: 'function' },
    ],
    [
      { label: 'Space', code: 'Space', width: 6.25, zone: 'alpha' },
    ],
    [
      { label: 'Alt', code: 'AltRight', width: 1.25, zone: 'function' },
      { label: 'Fn', code: 'Fn', width: 1.25, zone: 'function' },
      { label: 'Menu', code: 'ContextMenu', width: 1.25, zone: 'function' },
      { label: 'Ctrl', code: 'ControlRight', width: 1.25, zone: 'function' },
    ],
  ],
];

const ansi60: KeyboardLayout = {
  id: 'ansi-60',
  name: '61',
  keyCount: 61,
  category: '60',
  rows: ansi60Rows,
  debugRows: ansi60DebugRows,
};

// ── Export ───────────────────────────────────────────────

export const layouts: Record<string, KeyboardLayout> = {
  'ansi-108': ansi108,
  'ansi-full': ansiFull,
  'iso-full': isoFull,
  'ansi-96': ansi96,
  'ansi-tkl': ansiTkl,
  'ansi-75': ansi75,
  'ansi-65': ansi65,
  'ansi-60': ansi60,
};

export const layoutList = [ansiFull, ansi108, isoFull, ansi96, ansiTkl, ansi75, ansi65, ansi60];

export const sizeCategories = [
  { key: '100', label: '100%', desc: '104/108' },
  { key: '96',  label: '96%',  desc: '98' },
  { key: '80',  label: '80%',  desc: '87' },
  { key: '75',  label: '75%',  desc: '84' },
  { key: '65',  label: '65%',  desc: '68' },
  { key: '60',  label: '60%',  desc: '61' },
];

export type LayoutId = 'ansi-108' | 'ansi-full' | 'iso-full' | 'ansi-96' | 'ansi-tkl' | 'ansi-75' | 'ansi-65' | 'ansi-60';
