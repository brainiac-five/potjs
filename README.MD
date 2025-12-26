# POT JS

POT JS allows to effortlessly save mutable key-value maps to an immutable,
decentralized storage network like Swarm, from node.js or a browser.

This is a Javascript POT package, for use with the Swarm decentralized
storage network, based on the
[Go implementation](https://github.com/ethersphere/proximity-order-trie) of
proximity order tries.

The underlying technology is called Proximity Order Tree (POT) after a storage
technique that is described in a forthcoming paper. It can store a key-value
layout, including updates and deletions, to a tree of nodes saved to an
immutable, content-addressed storage.

For more on POT see the [manual](doc/POT_JS_manual.pdf).

## Status


| Installation | Simulation | In-Memory | Integration | Stress |
|--------------|------------|-----------|-------------|--------|
| [![Installation Tests](https://github.com/brainiac-five/potjs/actions/workflows/inst-tests-ubuntu.yml/badge.svg?branch=dev)](https://github.com/brainiac-five/potjs/actions/workflows/inst-tests-ubuntu.yml) | [![Simulation Tests](https://github.com/brainiac-five/potjs/actions/workflows/sim-tests-ubuntu.yml/badge.svg?branch=dev)](https://github.com/brainiac-five/potjs/actions/workflows/sim-tests-ubuntu.yml) | [![In-Memory Tests](https://github.com/brainiac-five/potjs/actions/workflows/inmem-tests-ubuntu.yml/badge.svg?branch=dev)](https://github.com/brainiac-five/potjs/actions/workflows/inmem-tests-ubuntu.yml) | [![Swarm Integration](https://github.com/brainiac-five/potjs/actions/workflows/locnet-tests-ubuntu.yml/badge.svg?branch=dev)](https://github.com/brainiac-five/potjs/actions/workflows/locnet-tests-ubuntu.yml) | [![Swarm Integration](https://github.com/brainiac-five/potjs/actions/workflows/stress-tests-ubuntu.yml/badge.svg?branch=dev)](https://github.com/brainiac-five/potjs/actions/workflows/stress-tests-ubuntu.yml) |
| [![Installation Tests](https://github.com/brainiac-five/potjs/actions/workflows/inst-tests-macos.yml/badge.svg?branch=dev)](https://github.com/brainiac-five/potjs/actions/workflows/inst-tests-macos.yml) | [![Simulation Tests](https://github.com/brainiac-five/potjs/actions/workflows/sim-tests-macos.yml/badge.svg?branch=dev)](https://github.com/brainiac-five/potjs/actions/workflows/sim-tests-macos.yml) | [![In-Memory Tests](https://github.com/brainiac-five/potjs/actions/workflows/inmem-tests-macos.yml/badge.svg?branch=dev)](https://github.com/brainiac-five/potjs/actions/workflows/inmem-tests-macos.yml) | | [![Swarm Integration](https://github.com/brainiac-five/potjs/actions/workflows/stress-tests-macos.yml/badge.svg?branch=dev)](https://github.com/brainiac-five/potjs/actions/workflows/stress-tests-macos.yml) |



## Quick Start

To use POT JS:

* Drop `pot.wasm`, and `pot-web.js`, or `pot-node.js` in a directory.
* Write some html and js like seen in [example 1](examples/example1.html).

Check out the [manual](doc/POT_JS_manual.pdf) — for examples, the introduction
or the tutorial — and the [function reference](doc/POT_JS_function_reference.pdf).


## Use

POT JS makes POT functionality available in the browser and to node.js.

To initialize, include `pot-web.js` or `pot-node.js`, then wait for the
initialization to finish. In the browser, this can look like this:

```html

	<script src="pot-web.js"></script>

	<script>

	(async () => {

		await pot.ready()

		...

	})()

	...
```

After `pot.ready()` resolves, the go WASM `pot` object can be used to create a
new key-value-store, in this example called `kvs`. Use `put` and `get` functions
on it.

```html
	kvs = await pot.new()

	await kvs.put("hello", "Hello, P.O.T.!")

	value = await kvs.get("hello")
```

See [example 1](examples/example1.html) for a full example. Run it with
`make example1`.

For further instructions, examples and a tutorial, see the
[manual](doc/POT_JS_manual.pdf), as well as the
[function reference](doc/POT_JS_function_reference.pdf).



## Examples

There are 9 [examples](examples/) in this repository. They are described in
detail in the [manual](doc/POT_JS_manual.pdf).

This is a complete example for the browser:

```html
	<script src="lib/pot-web.js"></script>

	<script>

	(async () => {

		await pot.ready()
		kvs = await pot.new()
		await kvs.put("hello", "POT!")
		value = await kvs.get("hello")
		console.log("key ‹hello› has:", value)

	})()

	</script>
```

`pot.new()` creates a new POT key-value store. The method `kvs.put()` stores a
value to the POT, `kvs.get()` retrieves it. The result is shown in the console.
All of these functions return promises.

To run this example, serve the main directory with `npx http-server .` and open
`http://127.0.0.1:8080/examples/example1.html`, which contains above code.

The example can also be started with

```sh
	% make example1
```

The eight other examples can be started like this, too. Some need a docker
FreeOS installation to demonstrate network interaction. Those that don't use an
in-memory version of POT.

This is how the same functionality looks in node:


```js
	require("./lib/pot-node")

	; (async () => {

		await pot.ready()
		kvs = await pot.new()
		await kvs.put("hello", "node")
		value = await kvs.get("hello")
		console.log("hello:", value)

	})()

```

Try the example by running

```sh
	% node examples/example7.js
```

or

```sh
	% make example7
```

[Example 2](examples/example2.html) shows a simple flow of setting and reading
values controlled by html input.

```html
<pre>

	POT JS Example 2: Interactive & Integrity

	key     <input id=key>
	value   <input id=value>
		<button onclick="put()"> put </button>

<hr />

	key     <input id=search>
		<button onclick="get()"> get </button>
	value   <input id=result>

	<img src=favicon.ico>

</pre>

<script src="lib/pot-web.js"></script>

<script>

	var kvs

	(async () => {
		await pot.ready()
		kvs = await pot.new()
	})()

	const field = (id) => { return document.getElementById(id) }

	async function put() {

		key = field('key').value
		value = field('value').value
		await kvs.put(key, value)
	}

	async function get() {

		key = field('search').value
		value = await kvs.get(key)
		field('result').value = value
	}

</script>
```

The top half consists of two forms, one for setting a value, one for
retrieving.  The buttons call the functions `get()` and `put()` respectively
that are defined in the second half.

The reference to `pot-web.js`, in the middle, is the same as before.

Next, the anonymous function waits until initialization is complete to create
the key-value store `kvs` that `put()` and `get()` will use.

For more examples, see the [examples/]() folder and the
[manual](doc/POT_JS_manual.pdf), both the Examples and Tutorial sections.


# Function Reference

The following lists the most relevant functions.

For a complete list see the overview in the [manual](doc/POT_JS_manual.pdf) and
the [function reference](doc/POT_JS_function_reference.pdf).


### INITIALIZATION


#### NEW KVS

```
	pot.new([bee node url : string, batch id : string]) ⟶   promise of kvs
```

Create a new Swarm key-value store.

The parameters are optional. Leaving them out creates a key-value store
in-memory. Giving both conects to a Swarm Bee node to store the KVS there
(with `save()`).

```js
	kvs = await pot.new()
```

#### LOAD KVS

```
	pot.load(reference : int, [bee node url : string, batch id : string[, timeout : int]]) ⟶   prommise of kvs
```

Create a new Swarm KVS from a reference that was returned from a previous
'save()'. The parameters after the first are optional. Leaving them out creates
a key-value store in-memory. Giving both conects to a Swarm Bee node to load,
and save, the KVS from and to there. Timeout is in milliseconds. Use null for
unused parameters if you want to use a timeout with in-memory storage.

```js
	kvs = await pot.load(ref)
```

#### SAVE

```
	kvs.save([timeout : int]) ⟶   promise of reference : int
```

Store a Swarm KVS, writing it from cache to the network. The bee URL and batch
ID are taken from the `new()` call. The timeout is optional, and in milliseconds.

```js
	ref = kvs.save()
```

#### PUT

```
	kvs.put(key, value[, timeout: int]) ⟶   promise of null

	key : string, number, boolean
	value : string, number, boolean, Uint8Array, null
```

Write or update a value. Returns a promise that resolves to null when the put
has happened. Timeout is optional, and in milliseconds.

```js
	k = "entry1"
	v = "The quick brown fox jumps over the lazy dog."

	kvs = pot.new()

	try {
		await kvs.put(k, v)
		result = await kvs.get(k)

	} catch(e) {
		console.log(e)
	}
```

#### GET

```
	kvs.get(key[, timeout : int]) ⟶   promise of value

	key : string, number, boolean
	value : string, number, boolean, Uint8Array, null
```

Retrieve a value. Returns a promise for the value to get.  Timeout is optional,
in milliseconds.

```js
	try {
		r = await kvs.get("entry 1")
	} catch(e) {
		...
	}
```


When using `.catch`, don’t chain it before recording the promise.

```js
	promise = kvs.get("123")
	promise.catch((err)=>attestExpectedError(T, err, "Error: canceled"))
```

#### DELETE

```
	kvs.delete(key[, timeout : int]) ⟶   promise of null

	key : string, number, boolean
```

Delete a key-value pair. Timeout is optional, in milliseconds.

```js
	try {
		await kvs.delete("entry X")
	} catch(e) {
		...
	}
```


### RAW BYTES

By default, values written to storage are prepended with one byte of type
information. This allows POT JS to interpret and return the raw bytes in
storage as the type that was originally stored. This encoding can be left out
using 'raw' functions. The normal `get()` function will not return correct
results, or fail, for values that were stored raw, i.e., by `putRaw()`.


#### PUT RAW

```
	kvs.putRaw(key, value) ⟶   promise of null

	key : string, number, boolean
	value : string, number, boolean, Uint8Array, null
```

Put a raw Uint8Array, a boolean, number, or string. The bytes as stored are not
distinguished by type information and have to be retrieved using one of the
functions below, not `get()` or `getSync()`.


#### GET RAW

```
	kvs.getRaw(key) ⟶   promise of Uint8Array
```

Get a raw Uint8Bytes array.


#### GET BOOLEAN FROM RAW

```
	kvs.getBoolean(key) ⟶   promise of boolean
```

Get a raw value as Boolean. First byte 0 means false, all else true.


#### GET NUMBER FROM RAW

```
	kvs.getNumber(key) ⟶   promise of number
```

Get a raw value as floating point number. The value must be eight byte.
Note that Javascript does not have integers.


#### GET STRING FROM RAW

```
	kvs.getString(key) ⟶   promise of string
```

Get a raw value as string.


For a complete list see the overview in the [manual](doc/POT_JS_manual.pdf) and
the [function reference](doc/POT_JS_function_reference.pdf).



## Building

There is no need for building. The main executable, the Go WASM file `pot.wasm`
and auxiliary Javascript and HTML files are portable.

To build, run

	% GOOS=js GOARCH=wasm go build -o lib/pot.wasm potjs.go swarm_nodejs.go nomock.go

or

	% make


To build from scratch, regenerating `go.mod` etc.:


	% make clean build


For more details on building, see the [manual](doc/POT_JS_manual.pdf).

For a list of available make rules, do

	% make help

or see below.


## Files


	README.MD             Subset of this manual

	potjs.go              Go JS interface
	nomock.go             No-op version of test functions
	mock.go               Monkey patch mock of Go POT for extended testing
	swarm_nodejs.go       Hybrid Go-Javascript LoadSaver for node.js on Swarm

	mock/                 Replacement of Go POT for extended testing
	  pot.go              mock structures
	  go.mod              Go module locations
	  pkg/persister       Copy of Go POT persisters to satisfy depencies
	    ...

	lib/
	  pot.wasm            Go POT implementation compiled to WASM
	  wasm_exec.js        Generic Go WASM wrapper (replace w/your Go version’s)
	  wasm_exec.js.sha384 SHA384 checksum for sub-component verification
	  pot-node.js         JS WASM initialization and fetch code
	  pot-web.js          JS WASM initialization
	  pot-web.js.sha384   SHA384 checksum for sub-component verification

	doc/                  POT JS documentation
	  POT_JS_manual.pdf   quick start, instructions, tutorial, examples
	  POT_JS_manual.odt
	  POT_JS_function_reference.pdf
	  POT_JS_function_reference.odt
	  logo.svg

	examples/
	  example1.html       Briefest example, in-browser, in-memory storage
	  example2.html       Interactive example, input fields, integrity
	  example3.html       Example 2 without pot-web.js for more control
	  example4.html       Example 1 but using synchronous functions
	  example5.html       Example 1 but connected to a local Swarm network
	  example6.html       Demonstrating the behavior of the save reference
	  example7.js         Example 1 but running in the terminal with node.js
	  example8.js         Example 2 but as a single-page node.js web server
	  example9.js         Example 8 but connected to a local Swarm network
	  favicon.ico         Swarm logo to suppress browser errors

	tutorial/             Files t0.html – t14.js for tutorial of the manual
	   ...

	test/
	  jest.async.js       Installation test suite for async functions
	  jest.sync.js        Installation test suite for sync functions
	  jest.json           Installation test configuration
	  test.html           Deep test start for in-browser tests
	  node.js             Deep test start for node.js-based tests
	  suites.js           Deep test suites
	  test.js             Generic deep test harness
	  test.css            Generic deep test optics
	  favicon.ico         Swarm logo to suppress browser errors

	go.mod                Go module locations
	go.sum                Go module check sums

	Makefile              Build scripts

	favicon.ico           Swarm logo



## Build Requirements

You need not build to use POT JS. For using it, `pot.wasm` and `pot-web.js`
or `pot-node.js` suffice as they come.


### POT JS API

* go 1.24.0

### GO POT (indirect, a separate repository being imported)

* testify 1.8.4
* swarm bee 2.5.0
* proximity-order-trie 1.0.0
* x/crypto 0.23.0

Which will require, in turn

* perks 1.0.1
* xxhash 2.2.0
* errwrap 1.0.0
* go-multierror 1.1.1
* prometheus
* x/sys 0.20.0
* protobuf 1.33.0

See [go.mod]() and
[https://github.com/ethersphere/proximity-order-trie/blob/master/go.mod]()


### Network Test

* ethersmockphere/swarm-cli
* fairdatasociety/fdp-play

If node.js is used (as opposed to running browser scripts that don't need it):

* node 22.17.0

Cf. `locnet_install` rule in the [Makefile]().


## Note on Go POT WASM

Being wrapped in WASM for interfacing with JS, the Go executable is opaque,
it cannot in that form be debugged as there are no debuggers for WASM, and it
becomes unavailable once it has an unrecovered panic or deadlock.

It is therefore possible that the JS `pot` object that is created when
initializing the API can go out of service due to a Go panic or a deadlock,
and POT JS has to be re-initialized.

As the JS `pot` object is created as Javascript object by the WASM executable
when it is starting, the new object will replace the old one. After
re-initialization the same code with no modifications will just run again
but the KVS caches are gone, i.e., all data that was not persisted yet with
`save()`.

The chance of the WASM executable to go down has been minimized and extensively
tested. Deadlocks are easy to provoke though by using functions ending on
'Sync' in the browser when connecting to a network (using `new()` with bee url
and batch id parameter). This happens reliably though, not unpredictably,
which makes it less of a pitfall.



## Note on syscall/js

The connection between Go and Javascript through WASM is based on Go's
`syscall/js` package. This package is still officially labeled as experimental:

	"This package is EXPERIMENTAL. Its current scope is only to allow tests
	to run, but not yet to provide a comprehensive API for users. It is
	exempt from the Go compatibility promise." ——
	https://pkg.go.dev/syscall

It is stable since a long time though and functionally sufficiently rich to
build this API. It's most visible limitation may be that `*Sync()` have to
return errors objects instead of throwing them.



## Tests

POT JS can be tested with

	% make test

This runs 170 happy path and edge cases in files `test/jest.sync.js` and
`test/jest.async.js` to verify a platform. The tests run with node.js and the
in-memory storage; not in a browser and not with a network connection.

For more extensive tests, a separate suite can be run in different modes,
including in the browser and using a local network. The test cases are in
`test/suites.js`.

The make rules to run tests are:

	test                explain test modes and run jest installation tests
	nodetest            explain test modes and run node_inmem_test
	webtest             explain test modes and run web_inmem_test
	explain_tests       explain test modes
	web_inmem_test      test api interaction with go pot in-memory persisting, web
	web_inmem_stress    stress test with go pot in-memory persisting, web
	web_sim_test        extended exceptions tests w/out go pot connection, web
	web_locnet_test     standard tests with a locally installed Swarm network, web
	web_locnet_quick    like web_locnet_test but re-using the last batch id, web
	web_locnet_stress   stress test with a locally installed Swarm network, web
	node_inmem_test     test api interaction with go pot in-memory persisting, node
	node_inmem_stress   stress test with go pot in-memory persisting, node
	node_sim_test       extended exceptions tests w/out go pot connection, node
	node_locnet_test    test with a locally installed Swarm network, node
	node_locnet_quick   like node_locnet_test but re-using the last batch id, node
	node_locnet_stress  stress test with a locally installed Swarm network, node

Check out the chapter about tests in the [manual](doc/POT_JS_manual.pdf).

The deep test output and framework are designed to bridge the language divide
and allow for the emulation of exceptions in one degree of separation (caused in
Go, caught from JS). The major relevance of the test harness is to help surface
any friction between JS's and Go's resource release mechanisms (JS promises and
Go channels) to detect possible leaks. Go's channels can deadlock, and the
challenge is aggravated by their position behind the JS API.

The standard tests run against the Go implementation of POT, like the use would
be in production. The **simulation tests**, however, focus on POT JS itself,
adding cancellation and time out cases. They do not interface with the Go POT
code but use a drop-in replacement of it that simulates error conditions. Latency
emulation, promisses, and connectivity as well as induced error conditions
are used to test the reality of an unreliable network as ultimate storage
layer.

Note that `make *_sim_test` (and also specifically, `make mock`) change the
project configuration and build WASM executable (`pot.wasm`) that will not
work in production. (It will appear to work but it then sidesteps Go POT.)
Use `make unmock`, `make test`, or `make build` to restore to the production
target, i.e., build the real `pot.wasm`.

For the **simulation tests** — to use a separate, dedicated, in-memory storage
simulation that works separate from the Go POT implementation — `go.mod` is
altered to replace/redirect package
`https://github.com/ethersphere/proximity-order-trie` with `mock/`.

The relevant code triggering the exceptional conditions resides in `mock.go`.
For its purposes, this file has to be part of the `main` package rather than
package `pot` in `mock/`.

Files governing the testing are:

	jest.json         installation tests config
	jest.sync.js      suite 1
	jest.async.js     suite 2

	test.html         deep test, in-browser
	node.js           deep test, node.js
	suites.js         deep test suite
	test.js           generic test framework
	test.css
	Makefile

Both in-browser and for node.js tests use `test.js` and the `suites.js` suite.

For extended simulation tests, these files are used to replace
[Go POT](https://github/ethersphere/proximity-order-trie):

	mock.go
	mock/pot.go
	mock/go.mod
	mock/pkg/persister/*

The file that gets modified for the extended API simulation is:

	go.mod

See the [manual](doc/POT_JS_manual.pdf) for more details.



---


# What You Should See

These are example outputs of running make rules.

Note that you need not build to try the tests or examples. They work as cloned.


### Clean

This deletes some files that are part of the repo as pushed, to build from
scratch. The built executable, but also the go module spec, and the integrity
hashes.

```sh
	% make clean

	⬡ clean to rebuild from scratch
	rm -f go.mod
	rm -f lib/pot.wasm
	rm -f lib/wasm_exec.js
	rm -f lib/potjs.js.sha384 lib/wasm_exec.js.sha384
	rm -f .batch_creation .batch_id
```


### What You Should See: Building

This (re-)creates `pot.wasm`.

```sh
	% make

	go mod init potjs
	go: creating new go.mod: module potjs
	go: to add module requirements and sums:
		go mod tidy
	go mod edit -replace github.com/brainiac-five/pot=github.com/brainiac-five/pot@v1.0.6
	go get
	go: added github.com/beorn7/perks v1.0.1
	go: added github.com/brainiac-five/pot v1.0.6
	go: added github.com/cespare/xxhash/v2 v2.2.0
	go: added github.com/ethersphere/bee/v2 v2.5.0
	go: added github.com/ethersphere/proximity-order-trie v1.0.0
	go: added github.com/hashicorp/errwrap v1.0.0
	go: added github.com/hashicorp/go-multierror v1.1.1
	go: added github.com/prometheus/client_golang v1.18.0
	go: added github.com/prometheus/client_model v0.6.0
	go: added github.com/prometheus/common v0.47.0
	go: added github.com/prometheus/procfs v0.12.0
	go: added golang.org/x/crypto v0.23.0
	go: added golang.org/x/sys v0.20.0
	go: added google.golang.org/protobuf v1.33.0
	cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" lib/
	openssl dgst -sha384 -binary lib/wasm_exec.js | openssl base64 -A > lib/wasm_exec.js.sha384
	GOOS=js GOARCH=wasm go build -o lib/pot.wasm potjs.go swarm_nodejs.go nomock.go
	⬢ √ pot.wasm built for production
```


### What You Should See: Installation Test

	% make test


**Terminal**


```
	#
	#  The jest installation test suite is run by:
	#
	#    % make test
	#
	#  Deep regression tests can be run in 2x3x2 combinable deep test modes:
	#
	#    browser / node + in-memory / simulated / network + standard / stress.
	#
	#  The deep test rules are composed from three tags. For example:
	#
	#    % make node_inmem_stress
	#
	#  Meaning     Tag     |  Description
	#  --------------------+----------------------------------------------------------
	#  browser     web     |  Javascript running in the browser
	#  node node           |  Javascript running in the terminal using node.js
	#  --------------------+----------------------------------------------------------
	#  in-memory   inmem   |  non-persistent, in-memory storage
	#  simulated   sim     |  simulated storage for testing exceptions
	#  network     locnet  |  local Swarm network storage
	#  --------------------+----------------------------------------------------------
	#  standard    test    |  31 test suites of various flavors
	#  recycle id  quick   |  like *_locnet_test but re-using the batch id
	#  stress      stress  |  4 longer-running suites; mass & concurrent access
	#
	#  The following are the test make rules (for other rules use % make help):
	#
	#  Rule                |  Description
	#  --------------------+----------------------------------------------------------
	#  test                |  explain test modes and run jest test suite
	#  nodetest            |  explain test modes and run node_inmem_test
	#  webtest             |  explain test modes and run web_inmem_test
	#  jest                |  jest test suite
	#  --------------------+----------------------------------------------------------
	#  web_inmem_test      |  test api interaction with go pot in-memory persisting, web
	#  web_inmem_stress    |  stress test with go pot in-memory persisting, web
	#  web_sim_test        |  extended exceptions tests w/out go pot connection, web
	#  web_locnet_test     |  standard tests with a locally installed Swarm network, web
	#  web_locnet_quick    |  like web_locnet_test but re-using the last batch id, web
	#  web_locnet_stress   |  stress test with a locally installed Swarm network, web
	#  node_inmem_test     |  test api interaction with go pot in-memory persisting, node
	#  node_inmem_stress   |  stress test with go pot in-memory persisting, node
	#  node_sim_test       |  extended exceptions tests w/out go pot connection, node
	#  node_locnet_test    |  test with a locally installed Swarm network, node
	#  node_locnet_quick   |  like node_locnet_test but re-using the last batch id, node
	#  node_locnet_stress  |  stress test with a locally installed Swarm network, node
	#
	#  All node_* tests are run on push by github CI workloads, except *_quick.
	#  CI runs all those tests for ubuntu-latest, and all non-locnet for MacOS.
	#
	#
	GOOS=js GOARCH=wasm go build -o lib/pot.wasm potjs.go swarm_nodejs.go nomock.go
	⬢ √ pot.wasm built for production

	⬢  Jest Tests

	npx jest --config test/jest.json --runInBand --testRegex jest.a\?sync.js$
	PASS  test/jest.async.js
	PASS  test/jest.sync.js

	Test Suites: 2 passed, 2 total
	Tests:       172 passed, 172 total
	Snapshots:   0 total
	Time:        2.591 s, estimated 3 s
	Ran all test suites.
```

### What You Should See: Standard Deep Test / Node.js

	% make nodetest


**Terminal**


```
	#
	#  The jest installation test suite is run by:
	#
	#    % make test
	#
	#  Deep regression tests can be run in 2x3x2 combinable deep test modes:
	#
	#    browser / node + in-memory / simulated / network + standard / stress.
	#
	#  The deep test rules are composed from three tags. For example:
	#
	#    % make node_inmem_stress
	#
	#  Meaning     Tag     |  Description
	#  --------------------+----------------------------------------------------------
	#  browser     web     |  Javascript running in the browser
	#  node node           |  Javascript running in the terminal using node.js
	#  --------------------+----------------------------------------------------------
	#  in-memory   inmem   |  non-persistent, in-memory storage
	#  simulated   sim     |  simulated storage for testing exceptions
	#  network     locnet  |  local Swarm network storage
	#  --------------------+----------------------------------------------------------
	#  standard    test    |  31 test suites of various flavors
	#  recycle id  quick   |  like *_locnet_test but re-using the batch id
	#  stress      stress  |  4 longer-running suites; mass & concurrent access
	#
	#  The following are the test make rules (for other rules use % make help):
	#
	#  Rule                |  Description
	#  --------------------+----------------------------------------------------------
	#  test                |  explain test modes and run jest test suite
	#  nodetest            |  explain test modes and run node_inmem_test
	#  webtest             |  explain test modes and run web_inmem_test
	#  jest                |  jest test suite
	#  --------------------+----------------------------------------------------------
	#  web_inmem_test      |  test api interaction with go pot in-memory persisting, web
	#  web_inmem_stress    |  stress test with go pot in-memory persisting, web
	#  web_sim_test        |  extended exceptions tests w/out go pot connection, web
	#  web_locnet_test     |  standard tests with a locally installed Swarm network, web
	#  web_locnet_quick    |  like web_locnet_test but re-using the last batch id, web
	#  web_locnet_stress   |  stress test with a locally installed Swarm network, web
	#  node_inmem_test     |  test api interaction with go pot in-memory persisting, node
	#  node_inmem_stress   |  stress test with go pot in-memory persisting, node
	#  node_sim_test       |  extended exceptions tests w/out go pot connection, node
	#  node_locnet_test    |  test with a locally installed Swarm network, node
	#  node_locnet_quick   |  like node_locnet_test but re-using the last batch id, node
	#  node_locnet_stress  |  stress test with a locally installed Swarm network, node
	#
	#  All node_* tests are run on push by github CI workloads, except *_quick.
	#  CI runs all those tests for ubuntu-latest, and all non-locnet for MacOS.
	#
	⬢ √ pot.wasm built for production
	node test/node.js in-mem

	tag    in-mem
	bee    undefined
	batch  undefined
	branch undefined
	iter   undefined

	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

		SWARM POT JS API Test Suite / Node

		in-mem

	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

		Sun Dec 21 2025 16:38:31 GMT+0100 (Central European Standard Time)

		This is the test suite for the Javascript API to the Go implementation
		of the Proximity-Order-Trie (POT).

		Also see examples/ folder and README.MD.


		Notes

		The test suite runs *in-memory of the Go POT implementation*.

		Tests are using different random byte sequences for keys and values
		every run.


		Network

		Bee node URL (in-memory)
		Batch ID     (none)



		K V S   T E S T S

	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

	pot:  verbosity set 6
	pot:  » POTWASM
	pot:  » node.js detected
	pot:  » init done
	pot:  » ready
	pot:
	pot:
	pot:  ════════════════════════════════════════════════════════════════════════════════
	pot:  ••• Test Suite #1 ••• EXAMPLE TEST •••                                    IN-MEM
	pot:  ════════════════════════════════════════════════════════════════════════════════
	pot:  Test setup test outside of main test files.
	pot:
	pot:  ————————————————————————————————————————————————————————————————————————————————
	pot:  ✦ case #1 » script inline                                                     --
	pot:  ————————————————————————————————————————————————————————————————————————————————
	pot:
	pot:  • put and get K: V
	pot:  » created new in-memory persister
	pot:  » initialize new P.O.T. - slot 1
	pot:  » put  K: V
	pot:  » get  K: V
	pot:  √ as expected, ‹V›.                                                         6 ms
	pot:
	pot:
	pot:  ════════════════════════════════════════════════════════════════════════════════
	pot:  ••• Test Suite #2 ••• SIMPLE GETS AND PUTS OF KVS, SYNCHRONOUS •••        IN-MEM
	pot:  ════════════════════════════════════════════════════════════════════════════════
	pot:
	pot:
	pot:  ··· b o o l e a n ······························································
	pot:
	pot:  ————————————————————————————————————————————————————————————————————————————————
	pot:  ✦ case #2 » • put K1: false                                         suites.js:66
	pot:  ————————————————————————————————————————————————————————————————————————————————
	pot:
	pot:  • new map
	pot:  » reusing in-memory persister
	pot:  » initialize new P.O.T. - slot 2
	pot:  √ no error raised.                                                          1 ms
	pot:
	pot:  • put K1: false
	pot:  » put  K1: false
	pot:  √ no error raised.                                                          1 ms
	pot:
	pot:  • getBooleanSync K1
	pot:  » get  K1: false
	pot:  √ as expected, ‹false›.
	...

	pot:  ————————————————————————————————————————————————————————————————————————————————
	pot:  ✦ case #161 » Oversize Value                                      suites.js:6614
	pot:  ————————————————————————————————————————————————————————————————————————————————
	pot:  max value size is 100000. Storing the maximal value is part of the stress test
	pot:  batch
	pot:
	pot:  • 100000+1 byte sized value should be stopped (async)
	pot:  » reusing in-memory persister
	pot:  » initialize new P.O.T. - slot 139
	pot:  √ no error raised.                                                          1 ms
	pot:
	pot:  • put 100001 byte buffer raw B
	pot:  ### put error: value too large (> 100000 bytes)
	pot:  √ expected error: ‹Error: ### put error: value too large (> 100000 bytes)›.
	pot:                                                                             17 ms
	pot:
	pot:
	pot:  ════════════════════════════════════════════════════════════════════════════════
	pot:  ••• Test Suite #18 ••• FAILURES •••                                       IN-MEM
	pot:  ════════════════════════════════════════════════════════════════════════════════
	pot:  Failure tests are available in `simulation` test mode. Use `make web_sim_test`
	pot:  or `make node_sim_test`
	pot:
	pot:
	pot:  ════════════════════════════════════════════════════════════════════════════════
	pot:  ••• tests cases run: 161 • assertions: 3214  •••
	pot:  ════════════════════════════════════════════════════════════════════════════════
	pot:  no errors
```


### What You Should See: Standard Deep Test / Browser

	% make webtest


A web page should open and after some seconds (potentially first showing
'server not found') show the test page. If not, reload.

**Terminal**

```sh
	% make webtest
	#
	#  The jest installation test suite is run by:
	#
	#    % make test
	#
	#  Deep regression tests can be run in 2x3x2 combinable deep test modes:
	#
	#    browser / node + in-memory / simulated / network + standard / stress.
	#
	#  The deep test rules are composed from three tags. For example:
	#
	#    % make node_inmem_stress
	#
	#  Meaning     Tag     |  Description
	#  --------------------+----------------------------------------------------------
	#  browser     web     |  Javascript running in the browser
	#  node node           |  Javascript running in the terminal using node.js
	#  --------------------+----------------------------------------------------------
	#  in-memory   inmem   |  non-persistent, in-memory storage
	#  simulated   sim     |  simulated storage for testing exceptions
	#  network     locnet  |  local Swarm network storage
	#  --------------------+----------------------------------------------------------
	#  standard    test    |  31 test suites of various flavors
	#  recycle id  quick   |  like *_locnet_test but re-using the batch id
	#  stress      stress  |  4 longer-running suites; mass & concurrent access
	#
	#  The following are the test make rules (for other rules use % make help):
	#
	#  Rule                |  Description
	#  --------------------+----------------------------------------------------------
	#  test                |  explain test modes and run jest test suite
	#  nodetest            |  explain test modes and run node_inmem_test
	#  webtest             |  explain test modes and run web_inmem_test
	#  jest                |  jest test suite
	#  --------------------+----------------------------------------------------------
	#  web_inmem_test      |  test api interaction with go pot in-memory persisting, web
	#  web_inmem_stress    |  stress test with go pot in-memory persisting, web
	#  web_sim_test        |  extended exceptions tests w/out go pot connection, web
	#  web_locnet_test     |  standard tests with a locally installed Swarm network, web
	#  web_locnet_quick    |  like web_locnet_test but re-using the last batch id, web
	#  web_locnet_stress   |  stress test with a locally installed Swarm network, web
	#  node_inmem_test     |  test api interaction with go pot in-memory persisting, node
	#  node_inmem_stress   |  stress test with go pot in-memory persisting, node
	#  node_sim_test       |  extended exceptions tests w/out go pot connection, node
	#  node_locnet_test    |  test with a locally installed Swarm network, node
	#  node_locnet_quick   |  like node_locnet_test but re-using the last batch id, node
	#  node_locnet_stress  |  stress test with a locally installed Swarm network, node
	#
	#  All node_* tests are run on push by github CI workloads, except *_quick.
	#  CI runs all those tests for ubuntu-latest, and all non-locnet for MacOS.
	#
	GOOS=js GOARCH=wasm go build -o lib/pot.wasm potjs.go swarm_nodejs.go nomock.go
	⬢ √ pot.wasm built for production
	⬡ start http server (stop with 'make stop')
	(npx http-server -c1 . &)

	⬢ Test in-browser, in-memory, standard suites

	open "http://127.0.0.1:8080/test/test.html?tag=in-mem"
	Starting up http-server, serving .

	http-server version: 14.1.1

	http-server settings:
	CORS: disabled
	Cache: 1 seconds
	Connection Timeout: 120 seconds
	Directory Listings: visible
	AutoIndex: visible
	Serve GZIP Files: false
	Serve Brotli Files: false
	Default File Extension: none

	Available on:
	http://127.0.0.1:8080
	http://192.168.178.192:8080
	Hit CTRL-C to stop the server

	[2025-12-21T15:07:53.769Z]  "GET /test/test.html?tag=in-mem" ...
	(node:8107) [DEP0066] DeprecationWarning: OutgoingMessage.prototype._headers is deprecated
	(Use `node --trace-deprecation ...` to show where the warning was created)
	... "GET /test/test.css" ...
	... "GET /test/favicon.ico" ...
	... "GET /lib/wasm_exec.js" ...
	... "GET /test/test.js" ...
	... "GET /test/suites.js" ...
	... "GET /lib/pot.wasm" ...
```

**Web Page**

	SWARM POT JS API Test Suite                                       in-mem
	Thu Sep 18 2025 20:34:50 GMT+0200 (Central European Summer Time)

	This is the test suite for the Javascript API to the Go implementation
	of the Proximity-Order-Trie (POT).

	Also see: example 1   example 2   example 3   example 4   read me


	NOTES

	The test suite runs in-memory of the Go POT implementation.

	Tests are using different random byte sequences for keys and values every run.


	NETWORK

	Bee node URL : (in-memory)

	Batch ID     : (none)


	KVS TESTS

	18 suites • 161 cases • 3214 assertions • passed with no errors.


	Test Suite #1 ••• EXAMPLE TEST •••IN-MEM

	Test setup test outside of main test files.

	✦ case #1 » html-inline                                               --
	• put and get K: V                                                    --
	√ as expected, ‹V›.                                                  2ms

	...

	✦ case #161 » Oversize Value                              suites.js:6614

	max value size is 100000. Storing the maximal value is part of the
	stress test batch.                                        suites.js:6616

	• 100000+1 byte sized value should be stopped (async)     suites.js:6618
	√ no error raised.6ms

	• put 100001 byte buffer raw B                            suites.js:6625
	√ expected error: ‹Error: ### put error: value too large
	(> 100000 bytes)›.                                                22ms


	Test Suite #18 ••• FAILURES •••IN-MEM

	Failure tests are available in `simulation` test mode.
	Use `make web_sim_test` or `make node_sim_test`.

	tests cases run: 161 • assertions: 3214

	no errors


### What You Should See: Running Example 1

Check out the example code in [examples/example1.html]().


**Console**


```
	% make example1

	GOOS=js GOARCH=wasm go build -o lib/pot.wasm potjs.go swarm_nodejs.go nomock.go
	⬢ √ pot.wasm built for production
	⬡ start http server (stop with 'make stop')
	(npx http-server -c1 . &)
	open http://127.0.0.1:8080/examples/example1.html
	Starting up http-server, serving .

	http-server version: 14.1.1

	http-server settings:
	CORS: disabled
	Cache: 1 seconds
	Connection Timeout: 120 seconds
	Directory Listings: visible
	AutoIndex: visible
	Serve GZIP Files: false
	Serve Brotli Files: false
	Default File Extension: none

	Available on:
	http://127.0.0.1:8080
	http://192.168.178.192:8080
	Hit CTRL-C to stop the server

	...  "GET /examples/example1.html"  ...
	(node:37034) [DEP0066] DeprecationWarning: OutgoingMessage.prototype._headers is deprecated
	(Use `node --trace-deprecation ...` to show where the warning was created)
	...  "GET /examples/favicon.ico"  ...
	...  "GET /examples/lib/pot-web.js"  ...
	...  "GET /examples/lib/pot.wasm"  ...
	...  "GET /favicon.ico"  ...
```

**Web Page**

	POT JS Example 1: Hello

	Check source and console.


**Browser JS Console**

	pot:  » POTWASM
	pot:  » browser detected
	pot:  » init done
	pot:  » ready
	pot:  › created new in-memory persister
	pot:  » (re)-using in-memory persister
	pot:  » initialize new P.O.T. - slot 1
	pot:  › slot ref: 1
	pot:  » put  hello: POT!
	pot:  › ⟶  68656c6c6f0000000000000000000000…: 03504f5421
	pot:  » get  hello: POT!
	pot:  › ⟵  68656c6c6f0000000000000000000000…: 03504f5421
	key ‹hello› has: POT!


### What You Should See: Local Network Test

This is the standard local Swarm network test

```sh
	% make node_locnet_test
```

**Terminal**

```
	% make node_locnet_test

	GOOS=js GOARCH=wasm go build -o lib/pot.wasm potjs.go swarm_nodejs.go nomock.go
	⬢ √ pot.wasm built for production
	------------------------------------------------------------------------------------
	|                                                                                  |
	|   This test takes some minutes to set up, results are shown in the terminal.     |
	|                                                                                  |
	------------------------------------------------------------------------------------
	⬢ Local Swarm Network Test
	⬡ starting five local swarm nodes
	fdp-play start --detach
	✔ Network is up
	✔ Blockchain node is up and listening
	✔ Queen node is up and listening
	✔ Worker nodes are up and listening
	⬡ buy stamps (free in this test setup)
	swarm-cli stamp buy --yes --verbose --depth 20 --amount 1b | tee .batch_creation
	Estimated cost: 0.1048576000000000 xBZZ
	Estimated capacity: 599.775 MB
	Estimated TTL: 2 days
	Type: Immutable
	At full capacity, an immutable stamp no longer allows new content uploads.
	Stamp ID: 1a8af9c543fb5c200d87cbdfe2a1819503be887d07a75bbc5d93f5a911e70d86
	grep "Stamp ID:" .batch_creation | cut -c11-74 > .batch_id
	⬡ postage batch ID: 1a8af9c543fb5c200d87cbdfe2a1819503be887d07a75bbc5d93f5a911e70d86
	⬡ start tests (check browser)
	node test/node.js loc-net http://localhost:1633 $(cat .batch_id)

	tag    loc-net
	bee    http://localhost:1633
	batch  1a8af9c543fb5c200d87cbdfe2a1819503be887d07a75bbc5d93f5a911e70d86
	branch undefined
	iter   undefined

	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

		SWARM POT JS API Test Suite / Node

		loc-net

	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

		Thu Oct 30 2025 02:52:37 GMT+0100 (Central European Standard Time)

		This is the test suite for the Javascript API to the Go implementation
		of the Proximity-Order-Trie (POT).

		Also see examples/ folder and README.MD.


		Notes

		The test suite runs on *a local Swarm test network*.

		Tests are using different random byte sequences for keys and values
		every run.


		Network

		Bee node URL http://localhost:1633
		Batch ID     1a8af9c543fb5c200d87cbdfe2a1819503be887d07a75bbc5d93f5a911e70d86



		K V S   T E S T S

	-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

	pot:  verbosity set 6
	pot:  » POTWASM
	pot:  » node.js detected
	pot:  » init done
	pot:  » ready
	pot:
	pot:
	pot:  ================================================================================
	pot:  ••• Test Suite #1 ••• EXAMPLE TEST •••                                   LOC-NET
	pot:  ================================================================================
	pot:  Test setup test outside of main test files.
	pot:
	pot:  --------------------------------------------------------------------------------
	pot:  ✦ case #1 » script inline                                                     --
	pot:  --------------------------------------------------------------------------------
	pot:
	pot:  • put and get K: V
	pot:  » created new hybrid swarm network loader
	pot:  » initialize new P.O.T. - slot 1
	pot:  » put  K: V
	pot:  » get  K: V
	pot:  √ as expected, ‹V›.                                                       859 ms
	pot:
	pot:
	pot:  ================================================================================
	pot:  ••• Test Suite #2 ••• SIMPLE GETS AND PUTS OF KVS, SYNCHRONOUS •••       LOC-NET
	pot:  ================================================================================
	pot:
	pot:
	pot:  --- b o o l e a n --------------------------------------------------------------
	pot:
	pot:  --------------------------------------------------------------------------------
	pot:  ✦ case #2 » • put K1: false                                         suites.js:58
	pot:  --------------------------------------------------------------------------------
	pot:
	pot:  • new map
	pot:  » created new hybrid swarm network loader
	pot:  » initialize new P.O.T. - slot 2
	pot:  √ no error raised.                                                          1 ms
	pot:
	pot:  • put K1: false
	pot:  » put  K1: false
	pot:  √ no error raised.                                                        295 ms
	pot:
	pot:  • getBooleanSync K1
	pot:  » get  K1: false
	pot:  √ as expected, ‹false›.                                                     1 ms
	pot:


	...


	pot:
	pot:  ================================================================================
	pot:  ••• tests cases run: 157 • assertions: 1355  •••
	pot:  ================================================================================
	pot:  no errors
	⬡ wait before shutdown
	sleep 120
	⬡ bee node logs
	docker container logs --tail 1000 fdp-play-queen

	Welcome to Swarm.... Bzzz Bzzzz Bzzzz


	"Share the knowledge" - in memory of ldeffenb


			\     /
		    \    o ^ o    /
		      \ (     ) /
	   ____________(%%%%%%%)____________
	  (     /   /  )%%%%%%%(  \   \     )
	  (___/___/__/	   \__\___\___)
	     (     /  /(%%%%%%%)\  \     )
	      (__/___/ (%%%%%%%) \___\__)
		      /(       )\
		    /   (%%%%%)   \
			 (%%%)
			   !

	DISCLAIMER:
	This software is provided to you "as is", use at your own risk and without warranties of any kind.
	It is your responsibility to read and understand how Swarm works and the implications of running this software.
	The usage of Bee involves various risks, including, but not limited to:
	damage to hardware or loss of funds associated with the Ethereum account connected to your node.
	No developers or entity involved will be liable for any claims and damages associated with your use,
	inability to use, or your interaction with other nodes or the software.

	version: -d0aa8b9-dirty - planned to be supported until 14 October 2025, please follow https://ethswarm.org/


	...


	"time"="2025-10-30 01:53:37.814996" "level"="debug" "logger"="node/storer/reserve" "msg"="replacing chunk stamp index" "old_chunk"="6741ed5b5426712c85ec7585dd52bd2088c7b27d10db82211b07048376d9a12a" "new_chunk"="6741ed5b5426712c85ec7585dd52bd2088c7b27d10db82211b07048376d9a12a" "batch_id"="1a8af9c543fb5c200d87cbdfe2a1819503be887d07a75bbc5d93f5a911e70d86"
	"time"="2025-10-30 01:53:37.841315" "level"="debug" "logger"="node/api" "msg"="api access" "ip"="172.18.0.1" "method"="POST" "host"="localhost:1633" "uri"="/bytes" "proto"="HTTP/1.1" "status"=201 "size"=82 "duration"="92.428917ms" "user-agent"="node-XMLHttpRequest"
	"time"="2025-10-30 01:53:37.914838" "level"="debug" "logger"="node/api" "msg"="api access" "ip"="172.18.0.1" "method"="POST" "host"="localhost:1633" "uri"="/bytes" "proto"="HTTP/1.1" "status"=201 "size"=82 "duration"="38.452375ms" "user-agent"="node-XMLHttpRequest"
	"time"="2025-10-30 01:53:37.927489" "level"="debug" "logger"="node/pushsync" "msg"="chunk pushed" "chunk_address"="66b9b036ad33506aaef2d6bd4da46ef25b9bf7a462d6bdc5c4dd7aed3cbf142f" "peer_address"="676790fcae312292ffc17b7f7c84d5b9acc51ef0ea3f27d0ff3bada3362abc5d" "proximity_order"=7
	"time"="2025-10-30 01:53:38.015051" "level"="error" "logger"="node/storer" "msg"="subscribe push: iterate error" "error"="iterate callback function errored: chunk store: failed reading retrievalIndex for address 66b9b036ad33506aaef2d6bd4da46ef25b9bf7a462d6bdc5c4dd7aed3cbf142f: storage: not found"
	"time"="2025-10-30 01:53:39.140616" "level"="debug" "logger"="node/pushsync" "msg"="chunk pushed" "chunk_address"="bef27c40289e995739c2b513da47f505efe479bfbe3bb9d8583cceac6546885d" "peer_address"="46aa69073beff49d18eb50dc1bcb6c92cddc6d093c6b745cd5e302369e0e08f1" "proximity_order"=0
	"time"="2025-10-30 01:53:51.581268" "level"="debug" "logger"="node/batchstore" "msg"="put chain state" "block"=13700 "amount"=0 "price"=0
	"time"="2025-10-30 01:53:51.582836" "level"="debug" "logger"="node/batchservice" "msg"="block height updated" "new_block"=13700
	"time"="2025-10-30 01:53:51.583093" "level"="debug" "logger"="node/listener" "msg"="sleeping until next block batch" "duration"="25s"
	"time"="2025-10-30 01:54:16.603866" "level"="debug" "logger"="node/batchstore" "msg"="put chain state" "block"=13705 "amount"=0 "price"=0
	"time"="2025-10-30 01:54:16.606126" "level"="debug" "logger"="node/batchservice" "msg"="block height updated" "new_block"=13705
	"time"="2025-10-30 01:54:16.606494" "level"="debug" "logger"="node/listener" "msg"="sleeping until next block batch" "duration"="25s"
	"time"="2025-10-30 01:54:41.627408" "level"="debug" "logger"="node/batchstore" "msg"="put chain state" "block"=13710 "amount"=0 "price"=0
	"time"="2025-10-30 01:54:41.629014" "level"="debug" "logger"="node/batchservice" "msg"="block height updated" "new_block"=13710
	"time"="2025-10-30 01:54:41.629251" "level"="debug" "logger"="node/listener" "msg"="sleeping until next block batch" "duration"="25s"
	"time"="2025-10-30 01:55:05.122694" "level"="info" "logger"="node/storageincentives" "msg"="entered new phase" "phase"="reveal" "round"=90 "block"=13719
	"time"="2025-10-30 01:55:05.123241" "level"="debug" "logger"="node" "msg"="Sync status check evaluated" "stabilized"=true
	"time"="2025-10-30 01:55:06.653570" "level"="debug" "logger"="node/batchstore" "msg"="put chain state" "block"=13715 "amount"=0 "price"=0
	"time"="2025-10-30 01:55:06.655628" "level"="debug" "logger"="node/batchservice" "msg"="block height updated" "new_block"=13715
	"time"="2025-10-30 01:55:06.655992" "level"="debug" "logger"="node/listener" "msg"="sleeping until next block batch" "duration"="25s"
	"time"="2025-10-30 01:55:31.675417" "level"="debug" "logger"="node/batchstore" "msg"="put chain state" "block"=13720 "amount"=0 "price"=0
	"time"="2025-10-30 01:55:31.677523" "level"="debug" "logger"="node/batchservice" "msg"="block height updated" "new_block"=13720
	"time"="2025-10-30 01:55:31.677750" "level"="debug" "logger"="node/listener" "msg"="sleeping until next block batch" "duration"="25s"
	⬡ stopping nodes
	fdp-play stop
	✔ Containers stopped
```


# Roadmap

Possible future improvements:

	•  npm package
	•  javascript module mode
	•  higher limit of node.js value size
	•  higher coverage of parameter tests
	•  js-side garbage collection triggers
	•  memory leak tests
	•  hashes for internal slot references
	•  proof retrieval function
	•  tree walk functions
	•  js-native persisters
	•  typescript version
	•  go-side resource tracking instrumentation
	•  use of js new operator
	•  error message clean up

