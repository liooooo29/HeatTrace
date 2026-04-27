//go:build !windows

package main

import (
	"os"
	"os/signal"
	"syscall"
)

func setupSignalHandler() {
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	go func() {
		<-sigCh
		os.Exit(0)
	}()
}
