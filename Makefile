#                        Build rules for POT JS
#
#
#                    YOU DON'T NEED THIS TO USE POTJS
#
#
# POT JS can be used without building, as downloaded or cloned. The files needed
# are lib/pot.wasm; lib/pot-node.js, lib/pot-web.js, or lib/wasm_exec.js. They
# can be used as they come with no building required. This Makefile helps
# building, developing & testing pot.wasm. It also simplifies running examples.
#
# To run an example, have 'make' installed and execute from the command line:
#
#	% make example1
#
# To build without using make and this Makefile, do:
#
#	% GOOS=js GOARCH=wasm go build -o lib/pot.wasm potjs.go swarm_nodejs.go nomock.go
#
# To build the same with make:
#
#	% make
#
# The rules below can help to build from scratch, run tests, and as a convenient
# way to run the more involved examples.

# use a more powerfull shell to execute the rules
SHELL = /bin/zsh

# project state

# MOCKED means that pot.wasm has been compiled for simulation tests
MOCKED = $(shell grep -s mock go.mod)

# SERVING means that a test http server is currently runnning
SERVING = $(shell ps ax | grep 'npm exec http-server' | grep -v grep | head -n 1 | sed 's/^ *//' | cut -d ' ' -f 1)

# screen colors
hi = \033[97m
err = \033[91m
mid = \033[38;5;214m
ok = \033[36m
off = \033[0m

# do not run sub rules in parallel
.NOTPARALLEL:

# standard rule: standard production build
all: build

# explain make rules
help:
	#  ⬢  SWARM POT JS
	#
	#  Build rules for executables and tests of this JS API for Go POT.
	#
	#  Building and any of the following is not required for using.
	#  The relevant executable files are portable and part of the repo.
	#
	#  run with `make <rule>`
	#
	#  build               build executables
	#  help                this list of rules
	#  example<n>          start server and run example <n>. n = 1-11
	#  test                explain test rules and modes and run jest installation test
	#  nodetest            explain test rules and modes and run node_inmem_test
	#  webtest             explain test rules and modes and run web_inmem_test
	#  jest                run jest installation test
	#  explain_tests       explain test rules and modes
	#  web_inmem_test      node.js memory leak tests with a locally installed Swarm network
	#  web_inmem_stress    browser stress tests with go pot in-memory persisting
	#  web_sim_test        browser exceptions tests w/out go pot connection
	#  web_locnet_test     browser tests with a locally installed Swarm network
	#  web_locnet_quick    like web_locnet_test but re-using the last batch id
	#  web_locnet_stress   browser stress tests with a locally installed Swarm network
	#  node_inmem_test     node.js tests with go pot in-memory persisting
	#  node_inmem_stress   node.js stress tests with go pot in-memory persisting
	#  node_inmem_memory   node.js memory leak tests with go pot in-memory persisting
	#  node_sim_test       node.js exceptions tests w/out go pot connection
	#  node_sim_memory     node.js memory leak tests w/out go pot connection
	#  node_locnet_test    node.js tests with a locally installed Swarm network
	#  node_locnet_quick   like node_locnet_test but re-using the last batch id
	#  node_locnet_stress  node.js stress tests with a locally installed Swarm network
	#  node_locnet_memory  node.js memory leak tests with a locally installed Swarm network
	#  clean               prepare for building from scratch
	#  distclean           prepare for commit to repository, including build
	#
	#  examples
	#
	#  example1            minimal in-browser example as above, in-memory storage
	#  example2            interactive in-browser example with input fields, integrity
	#  example3            like example 2 but without using pot-web.js, plus, delete and save
	#  example4            like example 1 but using synchronous access functions
	#  example5            like example 1 but with local Swarm network storage
	#  example6            like example 5, plus, save and load, WASM path, and verbosity
	#  example7            like example 1 but for node.js
	#  example8            similar to example 2, interactive web app for node.js, in-mem.
	#  example9            identical to example 8, called to use a local Swarm network
	#  example10           simulated demonstration of cancelation
	#  example11           simulated demonstration of error handling
	#
	#  support & debugging
	#
	#  mock                prepare for extended exception tests
	#  unmock              reset for production or non-extended tests
	#  stop                stop local http server(s) and local Swarm network
	#  http_serve          start local http server serving current directory
	#  http_stop           stop local http server. Ctrl-c does not
	#  locnet_install      install the local test network
	#  locnet_start        start the local test network on docker
	#  locnet_batch        buy stamp batch (free)
	#  locnet_tests        run test suites on local test network
	#  locnet_stop         shut local test network down
	#  locnet_logs         show the entire log of the queen node

# standard production build
build: go.mod lib/wasm_exec.js potjs.go swarm_nodejs.go Makefile unmock integrity
	GOOS=js GOARCH=wasm go build -o lib/pot.wasm potjs.go swarm_nodejs.go nomock.go
	@echo ⬢  √ pot.wasm built for production

# special simulation build for exceptions tests (stalls, cancels, errors)
mockbuild: go.mod lib/wasm_exec.js potjs.go swarm_nodejs.go Makefile mock integrity
	GOOS=js GOARCH=wasm go build -tags=ext_test -o lib/pot.wasm potjs.go swarm_nodejs.go mock.go
	@echo ⬢  √ pot.wasm built for extended API tests

# single web page examples
example1 example2 example3 example4: build examples/lib integrity http_serve
	open http://127.0.0.1:8080/examples/$@.html

# simplify path for example sources: allows for lib/* instead of ../lib/*
# this serves to take a possible irritation for the reader out and make
# files work the same in the examples/ folder as in the project root.
examples/lib:
	ln -s ../lib examples/lib

# single web page using local Swarm network, batch id injected in the source
# to make the example as clear as possible.
example5: examples/lib build http_serve
	$(MAKE) locnet_start
	rm -f .batch_id
	$(MAKE) .batch_id
	sed -i.bak -e "s/\(pot\.Kvs.*\)\"[0-9a-fA-F]*\")/\1\"$$(cat .batch_id)\")/" examples/$@.html ; rm -f examples/$@.html.bak
	open http://127.0.0.1:8080/examples/$@.html

# example 6 - meaning of the save reference
example6: examples/lib build http_serve
	$(MAKE) locnet_start
	$(MAKE) .batch_id
	open "http://127.0.0.1:8080/examples/$@.html?bee=http://127.0.0.1:1633&batch=$$(cat .batch_id)"

# headless, simplest node.js example logging to terminal
example7: examples/lib build
	node examples/$@.js

# node.js web app example, page served from the single-script server
# the port is sepate from the http ports used for the other examples
# to sidestep any problem with the http server still running without
# adding overhead to stop it first.
example8: examples/lib build
	open http://127.0.0.1:3000
	node examples/$@.js

# Functionally identical to example 8, just: started with different
# arguments — a network url and a batch id — by the calling make rule;
# and POT calls used are synchronously blocking instead of promises.
example9: examples/lib build
	$(MAKE) locnet_start
	$(MAKE) .batch_id
	open http://127.0.0.1:3000
	node examples/$@.js "http://127.0.0.1:1633" "$$(cat .batch_id)"

# simulation of cancelation
example10 example11: examples/lib mockbuild
	node examples/$@.js

# update the integrity hashes in example 2 when wasm_exec.js changes
integrity: examples/example2.html tutorial/t3.html lib/wasm_exec.js.sha384

# update integrity hashes in example files that are affected
# currently example #2 and tutorial #3.
examples/example*.html tutorial/t3.html: lib/pot-web.js.sha384
	for fn in $?; do sed -i.bak -e "s/\($${fn:4:-7}\".*integrity=\)[^>]*/\1\"sha384-$${$$(cat $${fn})//[\/]/\\/}\"/" $@ ; rm -f $@.bak ; done

# create the file hashes for subsource integrity checking (see integrity rule)
%.sha384: %
	openssl dgst -sha384 -binary $< | openssl base64 -A > $@

# copy the relevant generic go wasm js file from the local go installation.
# The file differs in different versions of Go and thus needs to be in sync
# with the compiler that pot.wasm is being compiled with. Its location in Go
# root has changed in the past. This works for Go 1.24.
lib/wasm_exec.js:
	cp "$$(go env GOROOT)/lib/wasm/wasm_exec.js" lib/

# new integrity hash file when wasm_exec.js changes
lib/wasm_exec.js.sh384: lib/wasm_exec.js

# create the go mod file and set pot package to the real go pot implementation
# as opposed to the simulation (below).
go.mod:
	go mod init potjs
	go mod edit -replace github.com/ethersphere/proximity-order-trie=github.com/ethersphere/proximity-order-trie@v1.0.2-alpha.7
	go get


# the standard Jest test: in-memory (not network), using the real
# Go pot implementation (not the exception simulation), with node.js.
test: explain_tests jest_test

# the 2nd standard test: in-memory (not network), using the real
# Go pot implementation (not the exception simulation), in the terminal.
nodetest: node_inmem_test

# the 3rd standard test: in-memory (not network), using the real
# Go pot implementation (not the exception simulation), in the browser.
webtest: web_inmem_test

# print available test rules.
explain_tests:
	#
	#  The jest installation test suite is run by:
	#
	#    % make test
	#
	#  Deep regression tests can be run in ~2x3x3 combinable deep test modes:
	#
	#  browser/node x in-memory/simulated/network x standard/stress/memory.
	#
	#  The deep test rules are accordingly composed from three tags. For example:
	#
	#    % make node_inmem_stress
	#
	#  Meaning     Tag     |  Description
	#  --------------------+----------------------------------------------------------
	#  browser     web     |  Javascript running in the browser
	#  node.js     node    |  Javascript running in the terminal using node.js
	#  --------------------+----------------------------------------------------------
	#  in-memory   inmem   |  non-persistent, in-memory storage
	#  simulated   sim     |  simulated storage for testing exceptions
	#  network     locnet  |  local Swarm network storage
	#  --------------------+----------------------------------------------------------
	#  standard    test    |  31 test suites of various flavors
	#  recycle ID  quick   |  like *_locnet_test but re-using the batch id
	#  stress      stress  |  4 longer-running suites; mass & concurrent access
	#  memory      memory  |  9 long-running suites testing for memory leaks
	#
	#
	#  These are the resulting test rules (for other rules use % make help):
	#
	#  Rule                |  Description
	#  --------------------+----------------------------------------------------------
	#  test                |  explain test modes and run jest test suite
	#  jest                |  run installation test suite w/o test mode explanation
	#  nodetest            |  explain test modes and run node_inmem_test
	#  webtest             |  explain test modes and run web_inmem_test
	#  --------------------+----------------------------------------------------------
	#  web_inmem_test      |  browser tests with go pot in-memory persisting
	#  web_inmem_stress    |  browser stress tests with go pot in-memory persisting
	#  web_sim_test        |  browser exceptions tests w/out go pot connection
	#  web_locnet_test     |  browser tests with a locally installed Swarm network
	#  web_locnet_quick    |  like web_locnet_test but re-using the last batch id
	#  web_locnet_stress   |  browser stress tests with a locally installed Swarm network
	#  node_inmem_test     |  node.js tests with go pot in-memory persisting
	#  node_inmem_stress   |  node.js stress tests with go pot in-memory persisting
	#  node_inmem_memory   |  node.js memory leak tests with go pot in-memory persisting
	#  node_sim_test       |  node.js exceptions tests w/out go pot connection
	#  node_sim_memory     |  node.js memory leak tests w/out go pot connection
	#  node_locnet_test    |  node.js tests with a locally installed Swarm network
	#  node_locnet_quick   |  like node_locnet_test but re-using the last batch id
	#  node_locnet_stress  |  node.js stress tests with a locally installed Swarm network
	#  node_locnet_memory  |  node.js memory leak tests with a locally installed Swarm network
	#
	#  All node_* tests are run on push by github CI workloads, except *_quick and *_memory.
	#  CI runs all those tests for ubuntu-latest, and all non-locnet for MacOS.
	#
	#  memory leak tests run only with node.js as they are only relevant for servers.
	#
	#  Individual memory leak test cases can be picked via names, e.g.:
	#
	#    % make node_inmem_memory TEST="gc-response,gc-kvs-detection"
	#
	#  gc-response            check whether the Javascript GC can be triggered
	#  gc-kvs-detection       check whether the collection of a kvs is detectable
	#  gc-kvs-creation        leak-test sync kvs creation
	#  gc-put-sync	          leak-test sync put with counter as key and value
	#  gc-put-async	          leak-test async put with negative of counter as key and value
	#  gc-get-async-fix       leak-test async get of value for fix key "K"
	#  gc-put-get-sync        leak-test sync put, get of random keys and values
	#  gc-put-get-async       leak-test async put, get of random keys and values
	#  gc-put-get-async-del   leak-test async put, get, delete of random keys and values
	#  gc-basics-sync         leak-test sync put, get, save, load, get, delete
	#  gc-basics-async        leak-test async put, get, save, load, get, delete
	#  gc-multiop1-async      leak-test 3x async put, get, save, load, get, delete, get
	#  gc-multiop2-async      leak-test 3x async put, get, delete, get
	#
	#  The number of iterations can also be adjusted. Below 50,000 is less usefull. E.g.:
	#
	#    % make node_sim_memory TEST="gc-kvs-creation" ITER=20000
	#
	#  ITER works only when TEST is given. Verbosity can be set with VERB.
	#  VERB works only if ITER is given.
	#
	#  Continuous Integration runs these tests on push to github (.github/workflow):
	#
	#  inst-tests-macos.yml:           make jest_test
	#  inst-tests-ubuntu.yml:          make jest_test
	#  inmem-tests-macos.yml:          make node_inmem_test
	#  inmem-tests-ubuntu.yml:         make node_inmem_test
	#  inmem-memory-macos.yml:         make node_inmem_memory
	#  inmem-memory-ubuntu.yml:        make node_inmem_memory
	#  sim-tests-macos.yml:            make node_sim_test
	#  sim-tests-ubuntu.yml:           make node_sim_test
	#  sim-memory-macos.yml:           make clean node_sim_memory
	#  sim-memory-ubuntu.yml:          make clean node_sim_memory
	#  stress-tests-macos.yml:         make clean node_inmem_stress
	#  stress-tests-ubuntu.yml:        make node_inmem_stress
	#  stress-tests-ubuntu.yml:        make node_locnet_stress
	#  locnet-memory-put1-ubuntu.yml:  make node_locnet_memory TEST=gc-put-sync
	#  locnet-memory-put2-ubuntu.yml:  make node_locnet_memory TEST=gc-put-async
	#  locnet-memory-get1-ubuntu.yml:  make node_locnet_memory TEST=gc-get-async-fix
	#  locnet-memory-get2-ubuntu.yml:  make node_locnet_memory TEST=gc-put-get-sync
	#  locnet-memory-get3-ubuntu.yml:  make node_locnet_memory TEST=gc-put-get-async
	#  locnet-memory-ops1-ubuntu.yml:  make node_locnet_memory TEST=gc-basics-sync
	#  locnet-memory-ops2-ubuntu.yml:  make node_locnet_memory TEST=gc-basics-async
	#  locnet-memory-ops3-ubuntu.yml:  make node_locnet_memory TEST=gc-multiop1-async ITER=10000 (*)
	#  locnet-memory-ops4-ubuntu.yml:  make node_locnet_memory TEST=gc-multiop2-async ITER=30000
	#  locnet-tests-ubuntu.yml:        make node_locnet_test
	#
	#  (*) ops3 is too long-running when used with 50,000 iterations and the CI therefore
	#  subject to ongoing changes.
	#
	#  CI results are at https://github.com/brainiac-five/potjs/actions.
	#

# jest integration tests
jest: jest_test

jest_test: build
	@echo
	@printf "$(hi)⬢  Jest Tests $(off)\n"
	@echo
	npx jest --config test/jest.json --runInBand --testRegex jest..\*.js$$

# browser-based test using in-memory persister of Go POT implementation
web_inmem_test: build http_serve
	@echo
	@echo ⬢  Test in-browser, in-memory, standard suites
	@echo
	open "http://127.0.0.1:8080/test/test.html?tag=in-mem"

# browser-based test using pure simulation to test exception cases
web_sim_test: lib/wasm_exec.js go.mod mockbuild http_serve
	@echo
	@echo ⬢  Test in-browser, simulated storage, standard and extended suites
	@echo
	open "http://127.0.0.1:8080/test/test.html?tag=ext-api"

# browser-based test using in-memory persister of Go POT implementation
web_inmem_stress: build http_serve
	@echo
	@echo ⬢  Test in-browser, in-memory, stress test suite
	@echo
	open "http://127.0.0.1:8080/test/test.html?tag=in-mem&group=stress&iterations=100000"

# browser-based standard tests using a local swarm network of five nodes
web_locnet_test: unmock build http_serve
	@echo " -----------------------------------------------------------------------------------"
	@echo "|                                                                                   |"
	@echo "|   This test takes some minutes to set up, its results will show in the browser.   |"
	@echo "|                                                                                   |"
	@echo " -----------------------------------------------------------------------------------"
	@echo
	@echo ⬢ Local Swarm Network Standard Tests
	@echo
	@echo "⬡ starting five local swarm nodes"
	fdp-play start --detach	
	@echo "⬡ buy stamps (free in this test setup)"
	swarm-cli stamp buy --yes --verbose --depth 20 --amount 1b | tee .batch_creation
	grep "Stamp ID:" .batch_creation | cut -c11-74 > .batch_id
	@echo "⬡ postage batch ID: $$(cat .batch_id)"
	@echo "⬡ start http server"
	$(MAKE) http_serve
	@echo "⬡ start tests (check browser)"
	open "http://127.0.0.1:8080/test/test.html?tag=loc-net&bee=http://localhost:1633&batch=$$(cat .batch_id)"
	@echo "⬡ wait before shutdown"
	sleep 120
	@echo "⬡ bee node logs"
	docker container logs --tail 1000 fdp-play-queen
	@echo "⬡ stopping nodes"
	fdp-play stop

# browser-based test using a local swarm network, reusing the previous batch
web_locnet_quick: unmock build http_serve
	@echo " -----------------------------------------------------------------------------------"
	@echo "|                                                                                   |"
	@echo "|   Quick start reusing batch id, no logs, no shutdown, results shown in browser.   |"
	@echo "|                                                                                   |"
	@echo " -----------------------------------------------------------------------------------"
	@echo "⬢ Local Swarm Network Test"
	$(MAKE) unmock
	$(MAKE) build
	$(MAKE) locnet_start
	$(MAKE) .batch_id
	$(MAKE) locnet_tests

# browser-based stress test using a local swarm network of five nodes
web_locnet_stress: unmock build http_serve
	@echo " -----------------------------------------------------------------------------------"
	@echo "|                                                                                   |"
	@echo "|   This test takes some minutes to set up and play out, results in the browser.    |"
	@echo "|                                                                                   |"
	@echo " -----------------------------------------------------------------------------------"
	@echo "⬢ Local Swarm Network Stress Test"
	@echo "⬡ starting five local swarm nodes"
	fdp-play start --detach	
	@echo "⬡ buy stamps (free in this test setup)"
	swarm-cli stamp buy --yes --verbose --depth 20 --amount 1b | tee .batch_creation
	grep "Stamp ID:" .batch_creation | cut -c11-74 > .batch_id
	@echo "⬡ postage batch ID: $$(cat .batch_id)"
	@echo "⬡ start http server"
	$(MAKE) http_serve
	@echo "⬡ start tests (check browser)"
	open "http://127.0.0.1:8080/test/test.html?tag=loc-net&group=stress&iterations=10000&bee=http://localhost:1633&batch=$$(cat .batch_id)"
	@echo "⬡ wait before shutdown"
	sleep 10000
	@echo "⬡ bee node logs"
	docker container logs --tail 1000 fdp-play-queen
	@echo "⬡ stopping nodes"
	fdp-play stop

# node.js-based std test using in-memory persister of Go POT implementation
node_inmem_test: unmock build
	node test/node.js in-mem

# node.js-based std test using pure simulation to test exception cases
node_sim_test: lib/wasm_exec.js go.mod mockbuild
	node test/node.js ext-api

# node.js-based stress test using in-memory persister of Go POT implementation
node_inmem_stress: unmock build
	node test/node.js in-mem - - stress 100000

# node.js-based resource test using in-memory persister of Go POT implementation
node_inmem_memory: unmock build
	node test/node.js in-mem - - resources 100000 $(TEST) $(ITER) $(VERB)

# node.js-based resource test pure simulation to test exception cases
node_sim_memory:  lib/wasm_exec.js go.mod mockbuild
	node test/node.js ext-api - - resources 100000 $(TEST) $(ITER) $(VERB)

# node.js-based test using a local swarm network of five nodes
node_locnet_test: unmock build
	@echo " -----------------------------------------------------------------------------------"
	@echo "|                                                                                   |"
	@echo "|   This test takes some minutes to set up, results are shown in the terminal.      |"
	@echo "|                                                                                   |"
	@echo " -----------------------------------------------------------------------------------"
	@echo "⬢ Local Swarm Network Test"
	@echo "⬡ starting five local swarm nodes"
	fdp-play start --detach	
	@echo "⬡ buy stamps (free in this test setup)"
	swarm-cli stamp buy --yes --verbose --depth 20 --amount 1b | tee .batch_creation
	grep "Stamp ID:" .batch_creation | cut -c11-74 > .batch_id
	@echo "⬡ postage batch ID: $$(cat .batch_id)"
	@echo "⬡ start tests (check browser)"
	node test/node.js loc-net http://localhost:1633 $$(cat .batch_id)
	@echo "⬡ wait before shutdown"
	sleep 120
	@echo "⬡ bee node logs"
	docker container logs --tail 1000 fdp-play-queen
	@echo "⬡ stopping nodes"
	fdp-play stop

# node.js-based test using a local swarm network, reusing the previous batch
node_locnet_quick: unmock build
	@echo " -----------------------------------------------------------------------------------"
	@echo "|                                                                                   |"
	@echo "|   Quick start reusing batch id, no logs, no shutdown, results shown in terminal.  |"
	@echo "|                                                                                   |"
	@echo " -----------------------------------------------------------------------------------"
	@echo "⬢ Local Swarm Network Test"
	$(MAKE) unmock
	$(MAKE) build
	$(MAKE) locnet_start
	$(MAKE) .batch_id
	@echo "⬡ start tests"
	node test/node.js loc-net http://localhost:1633 $$(cat .batch_id)

# node.js-based stress test using a local swarm network, reusing the previous batch
node_locnet_stress: unmock build
	@echo " -----------------------------------------------------------------------------------"
	@echo "|                                                                                   |"
	@echo "|   Quick start reusing batch id, no logs, no shutdown, results shown in terminal.  |"
	@echo "|                                                                                   |"
	@echo " -----------------------------------------------------------------------------------"
	@echo "⬢ Local Swarm Network Stress Test"
	$(MAKE) unmock
	$(MAKE) build
	$(MAKE) locnet_start
	$(MAKE) .batch_id
	@echo "⬡ start tests"
	node test/node.js loc-net http://localhost:1633 $$(cat .batch_id) stress 500

# node.js-based resource test using local swarm network, reusing the previous batch
node_locnet_memory: unmock build
	@echo " -----------------------------------------------------------------------------------"
	@echo "|                                                                                   |"
	@echo "|   Quick start reusing batch id, no logs, no shutdown, results shown in terminal.  |"
	@echo "|                                                                                   |"
	@echo " -----------------------------------------------------------------------------------"
	@echo "⬢ Local Swarm Network Memory Test"
	$(MAKE) unmock
	$(MAKE) build
	$(MAKE) locnet_start
	$(MAKE) .batch_id
	@echo "⬡ start tests"
	node test/node.js loc-net http://localhost:1633 $$(cat .batch_id) resources 50000 $(TEST) $(ITER) $(VERB)

# start the local Swarm network of five nodes, using docker FreeOS
locnet_start:
	@echo "⬡ starting five local swarm nodes"
	@echo "on failure despite docker running, try erasing existing fdp-play containers"
	fdp-play start --detach

# stop local network nodes
locnet_stop:
	@echo "⬡ stopping nodes"
	fdp-play stop

# get a new batch of Swarm stamps off the local network, and save the batch id
locnet_batch .batch_id:
	@echo "⬡ buy stamps (free in this test setup)"
	swarm-cli stamp buy --yes --verbose --depth 20 --amount 1b | tee .batch_creation
	grep "Stamp ID:" .batch_creation | cut -c11-74 > .batch_id
	@echo "⬡ postage batch ID: $$(cat .batch_id)"

# run the network tests, taking care to use the production build
locnet_tests: .batch_id unmock build
	@echo "⬡ start http server"
	$(MAKE) http_serve
	@echo "⬡ start tests (check browser)"
	open "http://127.0.0.1:8080/test/test.html?tag=loc-net&bee=http://localhost:1633&batch=$$(cat .batch_id)"

# show the logs from the main node in the docker FreeOS local Swarm setup
locnet_log:
	docker container logs fdp-play-queen

# show that status of http server and  all docker containers
locnet_status:
	ps ax | grep 'npm exec http-server' | grep -v grep
	docker ps -a

# delete the batch id and the log of its creation.
locnet_clean:
	rm -f .batch_creation .batch_id

# preparation for the local testnet to test interaction with Swarm nodes
locnet_install:
	npm install --global @ethersphere/swarm-cli
	npm install --global @fairdatasociety/fdp-play

# start a http file server on project root. Unless there is one active already.
http_serve:
ifeq ($(SERVING),)
	@echo "⬡ start http server (stop with 'make stop')"
	(npx http-server -c1 . &)
else
	@echo server still running
endif

# stop all running http-server instances. Could in error be multiple.
http_stop:
ifneq ($(SERVING),)
	for pid in `ps ax | grep 'npm exec http-server' | grep -v grep |  sed 's/^ *//' | cut -d ' ' -f 1` ; do kill $$pid ; done
	@sleep 5
endif

# stop any started http servers and the local docker-based Swarm network
stop: http_stop locnet_stop

# switch the meaning of package 'pot' to the test stub in mock/pot.go. The go
# pot implementation is then ignored and the api tested stand-alone. This
# allows for cancellation, time out and resource leak tests. It builds its
# special version of pot.wasm though which behaves very similar to the real
# one and can trip up the building.
mock: go.mod
	go mod edit -dropreplace github.com/ethersphere/proximity-order-trie
	go mod edit -replace github.com/ethersphere/proximity-order-trie=./mock
	go get github.com/ethersphere/proximity-order-trie/pkg/persister

# revert the changes that `mock` effects, namely the replacing of the go
# pot implementation with the mock stub in mock/. This reverts to the normal
# setup of the project for production build.
unmock: go.mod
ifneq ($(MOCKED),)
	@echo "⬡ undoing simulation build settings"
	go mod edit -dropreplace github.com/ethersphere/proximity-order-trie
	go mod edit -replace github.com/ethersphere/proximity-order-trie=github.com/ethersphere/proximity-order-trie@v1.0.2-alpha.7
	go get
	go mod tidy
endif

# check go sources
vet: unmock build
	go fmt
	go mod tidy
	go clean -modcache
	go vet --tags=wasm,js ./

# lint go sources
lint: unmock build
	/Users/b5/go/bin/golangci-lint --default all --build-tags=wasm,js run ./...

# clean for build from scratch. This is not how it is pushed to the repo.
clean:
	@echo "⬡ clean to rebuild from scratch"
	rm -f go.mod
	rm -f lib/pot.wasm
	rm -f lib/wasm_exec.js
	rm -f lib/potjs.js.sha384 lib/wasm_exec.js.sha384
	rm -f .batch_creation .batch_id
	rm -f package.json package-lock.json
	rm -fr node_modules

# prepare for repository. The repo is pushed with relevant core files built
# because .js and .wasm files are portable and can be used without having to
# build first.
distclean:
	@echo "⬢ prepare for publication"
	$(MAKE) clean unmock build

# this is a list of all rules that are not a file name and thus always trigger ///
.PHONY: all help build mockbuild example1 example2 example3 example4 example5 example6 example7 example8 example9 example10 example11 clean test nodetest webtest explain_tests jest jest_test web_inmem_test web_sim_test web_inmem_stress web_local_test web_local_quick web_local_stress node_inmem_test node_sim_test node_inmem_stress node_inmem_resources node_locnet_test node_locnet_quick node_locnet_stress locnet_start locnet_stop locnet_batch locnet_tests locnet_log locnet_clean locnet_install http_serve http_stop stop mock unmock vet lint clean distclean

