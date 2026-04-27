//go:build !windows

package main

import (
	"fmt"
	"os"
	"syscall"
)

func acquireInstanceLock(lockFile string) (func(), error) {
	lockF, err := os.OpenFile(lockFile, os.O_CREATE|os.O_RDWR, 0644)
	if err != nil {
		return nil, err
	}
	if err := syscall.Flock(int(lockF.Fd()), syscall.LOCK_EX|syscall.LOCK_NB); err != nil {
		lockF.Close()
		return nil, fmt.Errorf("already running")
	}
	cleanup := func() {
		syscall.Flock(int(lockF.Fd()), syscall.LOCK_UN)
		lockF.Close()
		os.Remove(lockFile)
	}
	return cleanup, nil
}
