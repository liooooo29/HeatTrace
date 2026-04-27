//go:build windows

package main

import (
	"os"
	"os/signal"
)

func setupSignalHandler() {
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt)
	go func() {
		<-sigCh
		os.Exit(0)
	}()
}
