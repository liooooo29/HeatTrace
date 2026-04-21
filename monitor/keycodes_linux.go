package monitor

// rawcodeToName maps X11 KeySym values (uint16 truncation) to readable names.
var rawcodeToName = map[uint16]string{
	// Arrow keys
	0xFF51: "Left", 0xFF52: "Up", 0xFF53: "Right", 0xFF54: "Down",
	// Function keys
	0xFFBE: "F1", 0xFFBF: "F2", 0xFFC0: "F3", 0xFFC1: "F4",
	0xFFC2: "F5", 0xFFC3: "F6", 0xFFC4: "F7", 0xFFC5: "F8",
	0xFFC6: "F9", 0xFFC7: "F10", 0xFFC8: "F11", 0xFFC9: "F12",
	// Special keys
	0xFF1B: "Esc",
	0xFF08: "Backspace", 0xFF09: "Tab", 0xFF0D: "Enter", 0xFF13: "Pause",
	0xFF61: "PrintScreen", 0xFF63: "Insert",
	0xFFFF: "Delete",
	0xFF50: "Home", 0xFF57: "End",
	0xFF55: "PageUp", 0xFF56: "PageDown",
	0xFFE1: "Shift", 0xFFE2: "Shift",
	0xFFE3: "Ctrl", 0xFFE4: "Ctrl",
	0xFFE9: "Alt", 0xFFEA: "Alt",
	0xFFEB: "Super", 0xFFEC: "Super",
	0xFFE5: "CapsLock", 0xFF7F: "NumLock", 0xFF14: "ScrollLock",
	// Numpad
	0xFF95: "Num7", 0xFF96: "Num8", 0xFF97: "Num9",
	0xFF98: "Num4", 0xFF99: "Num5", 0xFF9A: "Num6",
	0xFF9B: "Num1", 0xFF9C: "Num2", 0xFF9D: "Num3",
	0xFF9E: "Num0", 0xFF9F: "Num.",
	0xFFAA: "Num*", 0xFFAB: "Num+", 0xFFAD: "Num-",
	0xFFAF: "Num/", 0xFF8D: "NumEnter",
}
