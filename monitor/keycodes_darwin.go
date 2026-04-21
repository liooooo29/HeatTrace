package monitor

// rawcodeToName maps macOS raw keycodes to readable names.
var rawcodeToName = map[uint16]string{
	// Arrow keys
	123: "Left", 124: "Right", 125: "Down", 126: "Up",
	// Function keys
	122: "F1", 120: "F2", 99: "F3", 118: "F4", 96: "F5", 97: "F6",
	98: "F7", 100: "F8", 101: "F9", 109: "F10", 103: "F11", 111: "F12",
	// Special
	51: "Delete", 117: "ForwardDelete", 115: "Home", 119: "End",
	116: "PageUp", 121: "PageDown", 53: "Esc",
	114: "Help",
	// Numpad
	65: "Num.", 67: "Num*", 69: "Num+", 75: "Num/", 76: "NumEnter", 78: "Num-",
	81: "Num=",
	82: "Num0", 83: "Num1", 84: "Num2", 85: "Num3", 86: "Num4",
	87: "Num5", 88: "Num6", 89: "Num7", 91: "Num8", 92: "Num9",
}
