package monitor

import (
	"time"
	"HeatTrace/storage"
	"github.com/go-vgo/robotgo"
)

func (m *Monitor) startMouseSampler() {
	defer m.wg.Done()

	interval := m.mouseInterval
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	screenW, screenH := robotgo.GetScreenSize()

	for {
		select {
		case <-m.stopChan:
			return
		case <-ticker.C:
			x, y := robotgo.GetMousePos()
			move := storage.MouseMove{
				Timestamp: time.Now().UnixMilli(),
				X:         x,
				Y:         y,
				ScreenW:   screenW,
				ScreenH:   screenH,
			}
			select {
			case m.mouseMoveChan <- move:
			default:
			}
		}
	}
}
