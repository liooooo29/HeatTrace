package monitor

import (
	hook "github.com/robotn/gohook"
	"fmt"
	"log"
	"os"
	"time"
	"HeatTrace/storage"
)

var debugKeys = os.Getenv("HEATTRACE_DEBUG_KEY") != ""

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
				key := keycodeToName(ev.Keychar, ev.Rawcode)
				mods := extractModifiers(ev)
				if debugKeys {
					log.Printf("[KEY] char=%d(0x%X) raw=%d(0x%X) mask=0x%04X → key=%q mods=%v",
						ev.Keychar, ev.Keychar, ev.Rawcode, ev.Rawcode, ev.Mask, key, mods)
				}
				m.lastKeyEvent = LastKeyEvent{
					Key:       key,
					Keychar:   int32(ev.Keychar),
					Rawcode:   ev.Rawcode,
					Mask:      ev.Mask,
					Modifiers: mods,
				}
				ke := storage.KeyEvent{
					Timestamp: ts,
					Key:       key,
					Modifiers: mods,
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

// charUndefined is gohook's sentinel for "no character" (maps to C CHAR_UNDEFINED = 0xFFFF)
const charUndefined rune = 0xFFFF

func keycodeToName(keychar rune, rawcode uint16) string {
	// Valid printable character from the OS (macOS populates this well)
	if keychar > 0 && keychar < charUndefined && keychar >= 32 && keychar != 127 {
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
			return string(keychar)
		}
	}
	// Try rawcode mapping for non-printable keys (arrows, F-keys, etc.)
	if name, ok := rawcodeToName[rawcode]; ok {
		return name
	}
	// On Linux X11, KeyDown events have keychar=0 or 0xFFFF and rawcode=X11 KeySym.
	// X11 KeySyms for printable chars are Unicode code points.
	if rawcode >= 0x20 && rawcode <= 0x7E {
		return string(rune(rawcode))
	}
	// Extended Unicode via X11 KeySym (Latin, CJK, etc.)
	if rawcode >= 0x80 && rawcode < 0xFF00 {
		ch := rune(rawcode)
		if ch >= 0x80 && ch <= 0x10FFFF {
			return string(ch)
		}
	}
	return fmt.Sprintf("raw:%d", rawcode)
}

// iohook modifier mask constants (from hook/iohook.h)
const (
	maskShiftL = 1 << 0 // 0x0001
	maskCtrlL  = 1 << 1 // 0x0002
	maskMetaL  = 1 << 2 // 0x0004
	maskAltL   = 1 << 3 // 0x0008
	maskShiftR = 1 << 4 // 0x0010
	maskCtrlR  = 1 << 5 // 0x0020
	maskMetaR  = 1 << 6 // 0x0040
	maskAltR   = 1 << 7 // 0x0080
)

func extractModifiers(ev hook.Event) []string {
	var mods []string
	if ev.Mask&(maskShiftL|maskShiftR) != 0 {
		mods = append(mods, "shift")
	}
	if ev.Mask&(maskCtrlL|maskCtrlR) != 0 {
		mods = append(mods, "ctrl")
	}
	if ev.Mask&(maskAltL|maskAltR) != 0 {
		mods = append(mods, "alt")
	}
	if ev.Mask&(maskMetaL|maskMetaR) != 0 {
		mods = append(mods, "meta")
	}
	return mods
}
