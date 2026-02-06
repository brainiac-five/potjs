//go:build !ext_test

// These are the stubs of the simulation that exist in some places in the
// main source code to enable the extended tests. The functions are all
// noops in a compilation for production.
package main

import (
	"context"
	"syscall/js"
)

func testMode(_ js.Value, _ []js.Value) interface{} {
	return "production"
}

func setFail(_ js.Value, _ []js.Value) interface{} {
	return nil
}

func setPanic(_ js.Value, _ []js.Value) interface{} {
	return nil
}

func setDelay(_ js.Value, _ []js.Value) interface{} {
	return nil
}

func setHang(_ js.Value, _ []js.Value) interface{} {
	return nil
}

func setNoop(_ js.Value, _ []js.Value) interface{} {
	return nil
}

func mockFail() bool {
	return false
}

func mockPanic(_ string) {
}

func mockDelay(_ context.Context) {
}

func mockHang(_ context.Context) {
}

func mockTrigger(_ context.Context, _ string) {
}
