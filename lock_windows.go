//go:build windows

package main

import (
	"fmt"
	"os"
	"syscall"
	"unsafe"
)

var (
	kernel32         = syscall.MustLoadDLL("kernel32.dll")
	createMutexW     = kernel32.MustFindProc("CreateMutexW")
	releaseMutex     = kernel32.MustFindProc("ReleaseMutex")
)

var mutexHandle uintptr

func acquireInstanceLock(lockFile string) (func(), error) {
	name, _ := syscall.UTF16PtrFromString("Global\\HeatTraceSingleInstance")
	r, _, err := createMutexW.Call(0, 1, uintptr(unsafe.Pointer(name)))
	if r == 0 {
		return nil, fmt.Errorf("CreateMutex failed: %v", err)
	}
	if err != nil && err.Error() != "The operation completed successfully." {
		releaseMutex.Call(r)
		return nil, fmt.Errorf("HeatTrace is already running")
	}
	mutexHandle = r
	cleanup := func() {
		if mutexHandle != 0 {
			releaseMutex.Call(mutexHandle)
			mutexHandle = 0
		}
		os.Remove(lockFile)
	}
	return cleanup, nil
}
