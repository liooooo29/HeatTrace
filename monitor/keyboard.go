package monitor

import (
	hook "github.com/robotn/gohook"
	"fmt"
	"time"
	"HeatTrace/storage"
)

func (m *Monitor) startKeyboardListener() {
	defer m.wg.Done()
	evChan := hook.Start()
	defer hook.End()

	for {
		select {
		case <-m.stopChan:
			hook.End()
			return
		case ev := <-evChan:
			ts := time.Now().UnixMilli()

			switch ev.Kind {
			case hook.KeyDown:
				ke := storage.KeyEvent{
					Timestamp: ts,
					Key:       keycodeToName(ev.Keychar, ev.Rawcode),
					Modifiers: extractModifiers(ev),
				}
				if m.filter.ShouldFilter(ke) {
					ke.Filtered = true
					ke.Key = ""
					ke.Modifiers = nil
				}
				select {
				case m.keyChan <- ke:
				default:
				}

			case hook.MouseDown:
				button := "left"
				if ev.Button == 3 {
					button = "right"
				} else if ev.Button == 2 {
					button = "middle"
				}
				click := storage.MouseClick{
					Timestamp: ts,
					X:         int(ev.X),
					Y:         int(ev.Y),
					Button:    button,
				}
				select {
				case m.mouseClickChan <- click:
				default:
				}
			}
		}
	}
}

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

// shiftedToBase maps shifted punctuation characters to their unshifted base key.
var shiftedToBase = map[rune]string{
	'!': "1", '@': "2", '#': "3", '$': "4", '%': "5",
	'^': "6", '&': "7", '*': "8", '(': "9", ')': "0",
	'_': "-", '+': "=", '~': "`",
	'{': "[", '}': "]", '|': "\\",
	':': ";", '"': "'",
	'<': ",", '>': ".", '?': "/",
}

func keycodeToName(keychar rune, rawcode uint16) string {
	// Control characters and non-printable: use rawcode mapping
	if keychar > 0 && keychar >= 32 && keychar != 127 {
		switch keychar {
		case '\r':
			return "Enter"
		case '\t':
			return "Tab"
		case '\b':
			return "Backspace"
		case ' ':
			return "Space"
		case 27:
			return "Esc"
		default:
			// Normalize shifted punctuation to base key
			if base, ok := shiftedToBase[keychar]; ok {
				return base
			}
			return string(keychar)
		}
	}
	// Try rawcode mapping for non-printable keys
	if name, ok := rawcodeToName[rawcode]; ok {
		return name
	}
	return fmt.Sprintf("raw:%d", rawcode)
}

func extractModifiers(ev hook.Event) []string {
	var mods []string
	if ev.Mask&0x0200 != 0 || ev.Mask&0x0400 != 0 {
		mods = append(mods, "shift")
	}
	if ev.Mask&0x0800 != 0 {
		mods = append(mods, "ctrl")
	}
	if ev.Mask&0x1000 != 0 || ev.Mask&0x0008 != 0 {
		mods = append(mods, "alt")
	}
	if ev.Mask&0x0100 != 0 {
		mods = append(mods, "meta")
	}
	return mods
}
