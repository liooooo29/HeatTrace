//go:build bindings

package main

func main() {
	// Bindings mode: the wails build system runs this binary to generate
	// TypeScript bindings. The actual main() is in main.go (guarded by
	// !bindings) so it never starts the tray / wails runtime here.
}
