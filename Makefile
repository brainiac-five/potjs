# Build rules for POT JS
#
# POT JS can be used without building, as downloaded or cloned.
#
# To build without using make, do
#
#	cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .
#	GOOS=js GOARCH=wasm go build -o pot.wasm potjs.go state.go
#
# The rules below can help to build from scratch, run tests and as a convenient
# way to run examples.

SHELL = /bin/zsh
MOCKED = $(shell grep mock go.mod)

.NOTPARALLEL:

all: build

help:
	# POT JS
	#
	# Build rules for executables and tests of this JS API for Go POT.
	#
	# Building and any of the following is not required for using.
	# The relevant executable files are portable and part of the repo.
	#
	# run with `make <rule>`
	#
	# build         build executables
	# example<n>    start server and run example <n>.
	# test          test api interaction with the go pot implementation
	# xt            extended exceptions tests without go pot connection
	# mock          prepare for extended tests without go pot connection
	# unmock        reset for production and prepare for normal go pot tests
	# clean         prepare for building from scratch
	# distclean     prepare for commit to repository

build: go.mod wasm_exec.js potjs.go state.go Makefile unmock integrity
	GOOS=js GOARCH=wasm go build -o pot.wasm potjs.go state.go
	@echo √ created pot.wasm for production

example1 example2 example3: build
	open http://127.0.0.1:8080/$@.html
	npx http-server -c-1 .

integrity: example*.html

# update the integrity hashes in all example files that use them
example*.html: potjs.js.sha384 wasm_exec.js.sha384
	for fn in $?; do sed -i.bak -e "s/\(\"$${fn:0:-7}\" integrity=\)[^>]*/\1\"sha384-$${$$(cat $${fn})//[\/]/\\/}\"/" $@ ; rm -f $@.bak ; done

# create the file hashes for subsource integrity checking
%.sha384: %
	openssl dgst -sha384 -binary $< | openssl base64 -A > $@

# copy the relevant generic go wasm js file from the local go installation.
wasm_exec.js:
	cp "$$(go env GOROOT)/lib/wasm/wasm_exec.js" .

# create the go mod file and expect the go pot implementation to ./pot
go.mod:
	go mod init potwasm
	go mod edit -replace pot=./pot
	go get

# test the js api with the go pot implementation (the standard test)
test: gopot_test

# test the js api with a mock replacement of go pot to test special cases
xt: api_test

gopot_test: unmock build
	open http://127.0.0.1:8080/test.html
	npx http-server -c-1 . 

api_test: wasm_exec.js go.mod mock
	GOOS=js GOARCH=wasm go build -tags=api_test -o pot.wasm potjs.go state.go mock.go
	@echo √ created pot.wasm for extended API tests
	open http://127.0.0.1:8080/test.html
	npx http-server -c-1 .

# switch the meaning of package 'pot' to the test stub in mock/pot.go. The go
# pot implementation is then ignored and the api tested stand-alone. This
# allows for cancellation, time out and resource leak tests. It builds its 
# special version of pot.wasm though which behaves very similar to the real
# one and can trip up the building.
mock: go.mod
	go mod edit -dropreplace pot
	go mod edit -replace pot=./mock
	sed -i.bak -e "s/Go POT/XT API/" testmode.js
	sed -i.bak -e "s/blue/brown/" testmode.js
	sed -i.bak -e "s/<em>.*<\/em>/<em>extended API tests<\/em>/" testmode.js
	rm -f testmode.js.bak

# revert the changes that `mock` effected, namely the replacing of the go
# pot implementation with the mock stub in mock/. This reverts to the normal
# setup of the project.
unmock: go.mod
ifneq ($(MOCKED),)
	go mod edit -dropreplace pot
	go mod edit -replace pot=./pot
	sed -i.bak -e "s/XT API/Go POT/" testmode.js
	sed -i.bak -e "s/brown/blue/" testmode.js
	sed -i.bak -e "s/<em>.*<\/em>/<em>in direct interaction with the Go POT implementation<\/em>/" testmode.js
	rm -f testmode.js.bak
endif

# clean for build from scratch. This is not how it is pushed.
clean:
	rm -f go.mod
	rm -f pot.wasm
	rm -f wasm_exec.js
	rm -f *.sha384

# prepare for repository. The repo is pushed with relevant core files built
# because .js and .wasm files are portable and can be used without having to
# build first.
distclean: clean unmock build

.PHONY: all build integrity test gopot_test xt api_test mock unmock clean distclean
