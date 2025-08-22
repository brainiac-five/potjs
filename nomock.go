//go:build !api_test

package main

import (
	"syscall/js"
)

func testMode(_ js.Value, parameters []js.Value) interface{} {
	return "production"
}

func setFail(_ js.Value, parameters []js.Value) interface{} {
	return nil
}

func setPanic(_ js.Value, parameters []js.Value) interface{} {
	return nil
}

func setDelay(v int) {
}

func setHang(v bool) {
}


