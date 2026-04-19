//go:build darwin

package monitor

/*
#cgo LDFLAGS: -framework ApplicationServices
#include <ApplicationServices/ApplicationServices.h>

int checkAccessibility() {
    // Check without prompting — we handle the UI ourselves
    return AXIsProcessTrusted() ? 1 : 0;
}
*/
import "C"

// CheckAccessibility returns true if the app has macOS accessibility permission.
func CheckAccessibility() bool {
	return int(C.checkAccessibility()) != 0
}
