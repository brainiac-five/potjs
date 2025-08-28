# Build rules for POT JS
#
# POT JS can be used without building, as downloaded or cloned.
#
# To build without using make, and this file, do
#
#	cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .
#	GOOS=js GOARCH=wasm go build -o pot.wasm potjs.go nomock.go
#
# The rules below can help to build from scratch, run tests, and as a convenient
# way to run examples. They support developing POT JS itself.

SHELL = /bin/zsh
MOCKED = $(shell grep mock go.mod)
SERVING = $(shell ps ax | grep "npm exec http-server" | grep -v grep | head -n 1 | cut -d ' ' -f 1,2)

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
	# build           build executables
	# example<n>      start server and run example <n>. n = 1-5
	# local_test      test with a locally installed Swarm network
	# inmem_test      test api interaction with go pot in-memory persisting
	# ext_test        extended exceptions tests without go pot connection
	# mock            prepare for extended exception tests
	# unmock          reset for production and non-extended tests
	# clean           prepare for building from scratch
	# distclean       prepare for commit to repository
	#
	# support & debugging
	#
	# locnet_install  install the local test network
	# locnet_start    start the local test network on docker 
	# locnet_batch    buy stamp batch (free)
	# locnet_tests    run test suites on local test network
	# locnet_stop     shut local test network down
	# locnet_logs     show the entire log of the queen node

build: go.mod wasm_exec.js potjs.go Makefile unmock integrity
	GOOS=js GOARCH=wasm go build -o pot.wasm potjs.go nomock.go
	@echo √ created pot.wasm for production

example1 example2 example3 example4: build serve
	open http://127.0.0.1:8080/$@.html

example5:
	node example5.js

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

# create the go mod file and set the real go pot implementation
go.mod:
	go mod init potwasm
	go mod edit -replace github.com/ethersphere/proximity-order-trie=github.com/ethersphere/proximity-order-trie@v1.0.0
	go get

# test the js api with the go pot implementation (the standard test)
test: inmem_test

inmem_test: unmock build serve
	open "http://127.0.0.1:8080/test.html?tag=in-mem"

ext_test: wasm_exec.js go.mod mock serve
	GOOS=js GOARCH=wasm go build -tags=ext_test -o pot.wasm potjs.go mock.go
	@echo √ created pot.wasm for extended API tests
	open "http://127.0.0.1:8080/test.html?tag=ext-api"

locnet_test: unmock build
	@echo "⬢ Local Swarm Network Test"
	@echo " -----------------------------------------------------------------------------------"
	@echo "|                                                                                   |"
	@echo "|   This test takes some minutes to set up, its results will show in the browser.   |"
	@echo "|                                                                                   |"
	@echo " -----------------------------------------------------------------------------------"
	@echo "⬡ starting five local swarm nodes"
	fdp-play start --detach	
	@echo "⬡ buy stamps (free in this test setup)"
	swarm-cli stamp buy --yes --verbose --depth 20 --amount 1b | tee .batch_creation
	grep "Stamp ID:" .batch_creation | cut -c11-74 > .batch_id
	@echo "⬡ postage batch ID: $$(cat .batch_id)"
	@echo "⬡ start http server"
	$(MAKE) serve
	@echo "⬡ start tests (check browser)"
	open "http://127.0.0.1:8080/test.html?tag=loc-net&bee=http://localhost:1633&batch=$$(cat .batch_id)"
	@echo "⬡ wait before shutdown"
	sleep 120
	@echo "⬡ bee node logs"
	docker container logs --tail 1000 fdp-play-queen
	@echo "⬡ stopping nodes"
	fdp-play stop

locnet_quick: unmock build
	@echo "⬢ Local Swarm Network Test"
	@echo " -----------------------------------------------------------------------------------"
	@echo "|                                                                                   |"
	@echo "|   Quick start reusing batch id, no logs, no shutdown, results shown in browser.   |"
	@echo "|                                                                                   |"
	@echo " -----------------------------------------------------------------------------------"
	$(MAKE) unmock
	$(MAKE) build
	$(MAKE) locnet_start
	$(MAKE) locnet_batch
	$(MAKE) locnet_tests

locnet_start:
	@echo "⬡ starting five local swarm nodes"
	fdp-play start --detach	

locnet_stop:
	@echo "⬡ stopping nodes"
	fdp-play stop

locnet_batch .batch_id:
	@echo "⬡ buy stamps (free in this test setup)"
	swarm-cli stamp buy --yes --verbose --depth 20 --amount 1b | tee .batch_creation
	grep "Stamp ID:" .batch_creation | cut -c11-74 > .batch_id
	@echo "⬡ postage batch ID: $$(cat .batch_id)"

locnet_tests: .batch_id unmock build
	@echo "⬡ start http server"
	$(MAKE) serve
	@echo "⬡ start tests (check browser)"
	open "http://127.0.0.1:8080/test.html?tag=loc-net&bee=http://localhost:1633&batch=$$(cat .batch_id)"

locnet_log:
	docker container logs fdp-play-queen

serve:
ifeq ($(SERVING),)
	(npx http-server -c-1 . &)
else
	@echo server still running
endif

stop:
ifneq ($(SERVING),)
	kill $(SERVING)
endif

# preparation for the local testnet to test interaction with Swarm nodes
locnet_install:
	npm install --global @ethersphere/swarm-cli
	npm install --global @fairdatasociety/fdp-play

# switch the meaning of package 'pot' to the test stub in mock/pot.go. The go
# pot implementation is then ignored and the api tested stand-alone. This
# allows for cancellation, time out and resource leak tests. It builds its 
# special version of pot.wasm though which behaves very similar to the real
# one and can trip up the building.
mock: go.mod
	go mod edit -dropreplace github.com/ethersphere/proximity-order-trie
	go mod edit -replace github.com/ethersphere/proximity-order-trie=./mock
	go get github.com/ethersphere/proximity-order-trie/pkg/persister

# revert the changes that `mock` effected, namely the replacing of the go
# pot implementation with the mock stub in mock/. This reverts to the normal
# setup of the project.
unmock: go.mod
ifneq ($(MOCKED),)
	go mod edit -dropreplace github.com/ethersphere/proximity-order-trie
	go mod tidy
endif

# clean for build from scratch. This is not how it is pushed.
clean:
	rm -f go.mod
	rm -f pot.wasm
	rm -f wasm_exec.js
	rm -f potjs.js.sha384 wasm_exec.js.sha384
	rm -f .batch_creation .batch_id

# prepare for repository. The repo is pushed with relevant core files built
# because .js and .wasm files are portable and can be used without having to
# build first.
distclean: clean unmock build

.PHONY: all build integrity test inmem_test xt ext_test mock unmock clean distclean locnet_test locnet_start locnet_stop locnet_batch locnet_tests locnet_log serve stop locnet_install
