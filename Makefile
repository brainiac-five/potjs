SHELL = /bin/zsh

all: go.mod
	GOOS=js GOARCH=wasm go build -o pot.wasm potjs.go
	cp "$$(go env GOROOT)/lib/wasm/wasm_exec.js" .

test: all # backwards on purpose
	open http://127.0.0.1:8080/test.html
	npx http-server . 

go.mod:
	go mod init potwasm

clean:
	rm -f go.mod
	rm -f pot.wasm
	rm -f wasm_exec.js

PHONY: all test clean
