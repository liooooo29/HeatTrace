//go:build !darwin

package monitor

// CheckAccessibility is a no-op on non-macOS platforms.
func CheckAccessibility() bool {
	return true
}
