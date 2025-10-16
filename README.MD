# POT JS

[![Simulation Tests](https://github.com/brainiac-five/potjs/actions/workflows/sim-tests.yml/badge.svg?branch=devtest)](https://github.com/brainiac-five/potjs/actions/workflows/sim-tests.yml) 
[![In-Memory Tests](https://github.com/brainiac-five/potjs/actions/workflows/inmem-tests.yml/badge.svg?branch=devtest)](https://github.com/brainiac-five/potjs/actions/workflows/inmem-tests.yml) 
[![Swarm Integration](https://github.com/brainiac-five/potjs/actions/workflows/locnet-tests.yml/badge.svg?branch=devtest)](https://github.com/brainiac-five/potjs/actions/workflows/locnet-tests.yml) 
[![Swarm Integration](https://github.com/brainiac-five/potjs/actions/workflows/stress-tests.yml/badge.svg?branch=devtest)](https://github.com/brainiac-five/potjs/actions/workflows/stress-tests.yml)

This is a POT library for JS, for use with the Swarm decentralized
storage network, based on the
[Go implementation](https://github.com/ethersphere/proximity-order-trie) of 
proximity order tries.

POT JS allows to effortlessly save key-value maps to an immutable,
decentralized storage network like Swarm. 

The underlying technology is called Proximity Order Tree (POT) after a storage
technique that is described in a forthcoming paper. It can store a key-value
layout, including updates and deletions, to a tree of nodes saved to an
immutable, content-addressed storage.

For more on POT see the [manual](doc/POT_JS_manual.pdf).

To explore the project hands-on, see [Kick The Tires](#Kicking-the-Tires),
below.


## Quick Start

To use POT JS:

* Drop `pot.wasm`, `potjs.js`, and `wasm_exec.js` in a directory.
* Write some html and js like seen in `example1.html`.

Check out the [manual](doc/POT_JS_manual.pdf) for examples, an introduction and
a tutorial, and the [function reference](doc/POT_JS_function_reference.pdf).


## Use

POT JS embeds POT functionality into a browser environment and node.js.

To initialize, include the generic `wasm_exec.js` and `potjs.js`, then wait
for the initialization to finish. In the browser, this can look like this:

```html

	<script src="wasm_exec.js"></script>
	<script src="potjs.js"></script>

	<script>

	(async () => {

		await pot.ready()

		...

	})()

	...
```

After `pot.ready()` resolves, the go wasm `pot` object can be used to create a
new key-value-store, in the example called `kvs`. Use `put` and `get` functions
on it.

```html
	kvs = pot.newSync()

	await kvs.put("hello", "Hello, P.O.T.!")

	value = await kvs.get("hello")
```

See [example 1](examples/example1.html) for a full example.

You may leave out [potjs.js](lib/potjs.js) to initialize with more direct
control: include only the generic Go WASM wrapper `wasm_exec.js`, create a `Go`
object, and instantiate the POT WASM object `pot.wasm`, then run it once it is
loaded.

```html
	<script src="wasm_exec.js"></script>

	<script>

	const go = new Go()
	WebAssembly.instantiateStreaming(fetch("pot.wasm"), go.importObject)
		.then((potwasm)=>{ go.run(potwasm.instance) })

	...
```

See [example 3](examples/example3.html) for a full example.

For further instructions, examples and a tutorial, see the
[manual](doc/POT_JS_manual.pdf), as well as the
[function reference](doc/POT_JS_function_reference.pdf).



## Examples

There are 9 [examples](examples/) in this repository.

This is a complete example for the browser:

```html
	<script src="wasm_exec.js"></script>
	<script src="potjs.js"></script>

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

To run the example, serve the main directory with `npx http-server .` and open
`http://127.0.0.1:8080/examples/example1.html`, which contains above code.

The example can also be started with

```sh
	% make example1
```

The nine other examples can be started like this, too. Some need a docker
FreeOS installation to demonstrate network interaction. Those that don't use an
in-memory version of POT.

This is how the same functionality looks in node, without using `potjs.js`:


```js
	fs = require("fs");
	require("./lib/wasm_exec"); // note the ./

	var go = new Go();

	WebAssembly.instantiate(fs.readFileSync("lib/pot.wasm"), go.importObject)
		.then((r) => { go.run(r.instance) })

	onWasmLoaded = async () => {

		console.log("wasm loaded-function called")
		map = await global.pot.new()
		await map.put("hello", "node")
		value = await map.get("hello")
		console.log("hello:", value)
	}
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
values controlled by html input. It also uses SHA384 hashes for sub-component
integrity.

```html

	<pre>


		POT JS Example 2: Interactive & Integrity


		key    <input id=key>

		value  <input id=value>

		       <button onclick="put()"> put </button>


	<hr />


		key    <input id=search>

		       <button onclick="get()"> get </button>

		value  <input id=result>


		<img src=favicon.ico>


	</pre>

	<script src="lib/wasm_exec.js" integrity="sha384-PWCs+V4BDf9yY1yjkD/p+9xNEs4iEbuvq+HezAOJiY3XL5GI6VyJXMsvnjiwNbce"></script>
	<script src="lib/potjs.js" wasm="lib/pot.wasm" integrity="sha384-woy0Fou09EcyFemKbNcnl+HI7XRxaENJQgJPdgPuBMqaqXwTWzUgF+zlViGzeQQF"></script>

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

The inclusion of POT, in the middle, is the same as before except this time the
`integrity` attribute is used to provide finger print hashes of `wasm_exec.js`
and `potjs.js` to verify that they are the expected files when they are loaded.

Next, the anonymous function waits until initialization is complete to create
the key-value store `kvs` that `put()` and `get()` will use. These two
functions are self-explaining.

For more examples, see the [examples/]() folder and the
[manual](doc/POT_JS_manual.pdf). Its tutorial guides through the creation of a
single-page node web app using POT JS.


# Function Reference

The following lists the most relevant functions.

For a complete list see the overview in the [manual](doc/POT_JS_manual.pdf) and
the [function reference](doc/POT_JS_function_reference.pdf).


### INITIALIZATION


#### NEW KVS

	pot.new([bee node url : string, batch id : string]) ⟶   kvs

Create a new Swarm key-value store.

The parameters are optional. Leaving them out creates a key-value store
in-memory. Giving both conects to a Swarm Bee node.

```js
	kvs = await pot.new()
```

#### LOAD KVS

	pot.load(reference : int) ⟶   map

Create a new Swarm KVS from a reference that was returned from a previous
'save()'.

```js
	kvs = await pot.load(ref)
```

#### SAVE

	kvs.save() ⟶   reference : int

Store a Swarm KVS, writing it from cache to the network.

```js
        ref = kvs.save()
```

#### PUT

	kvs.put(key, value) ⟶   promise of null

	key : string, number, boolean
	value : string, number, boolean, Uint8Array

Write or update a value. Returns a promise that resolves when the put has
happened.

```js
        k = "entry1"
        v = "The quick brown fox jumps over the lazy dog."

        map = pot.new()

        try {
                await map.put(k, v)
                result = await map.get(k)

        } catch(e) {
		console.log(e)
        }
```

#### GET

	map.get(key) ⟶   promise of value

	key : string, number, boolean
	value : string, number, boolean, Uint8Array

Retrieve a value. Returns a promise for the value to get.

```js
        k = "entry1"
        try {
                 r = await map.get(k)
        } catch(e) {
		     ...
        }
```


When using `.catch`, don’t chain it before recording the promise.

```js
        promise = map.get("123")
        promise.catch((err)=>attestExpectedError(T, err, "Error: canceled"))
```


### RAW BYTES

By default, values written to storage are prepended with one byte of type
information.  This allows POT JS to interpret and return the raw bytes in
storage as the type that was originally stored. This encoding can be left out
using 'raw' functions. The normal `get()` function will not return correct
results, or fail, for values stored raw.


#### PUT

	map.putRaw(key : any, value : any) ⟶   promise of null

	key : string, number, boolean
	value : string, number, boolean, Uint8Array

Put a raw Uint8Array, a boolean, number, or string. The bytes as stored are not
distinguished by type information and have to be retrieved using one of the
functions below.


#### GET

	map.getRaw(key : any) ⟶   promise of Uint8Array

Get a raw Uint8Bytes array.


#### GET BOOLEAN

	map.getBoolean(key : any) ⟶   promise of boolean

Get a raw value as Boolean. First byte 0 means false, all else true.


#### GET NUMBER

	map.getNumber(key : any) ⟶   promise of number

Get a raw value as floating point number. Note that Javascript does not have
integers.


#### GET STRING

	map.getString(key : any) ⟶   promise of string

Get a raw value as string.


### TESTING AND SUPPORT

These functions exist for black box testing. See kvs_test.js for examples of their use.


#### LOG

	pot.log(message : string)

Write to browser console via Go to verify language-lands roundtrip.


#### HELLO

	pot.hello()

Write hello to browser console to verify established WASM stream.




## Building

There is no need for building. The main executable, the Go WASM file `pot.wasm`
and auxiliary Javascript and HTML files are portable.

To build, run

```bash

	GOOS=js GOARCH=wasm go build -o pot.wasm potjs.go nomock.go
	cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .
```

or

	% make


To build from scratch, regenerating `go.mod` and the integrity hashes:


	% make clean build


For more details on building, see the [manual](doc/POT_JS_manual.pdf).

For a list of available make rules, do

	% make help

or see below.


## Files


        README.MD             subset of these instructions

        potjs.go              Go JS interface
        nomock.go             No-op version of test functions
        mock.go               monkey patch mock of Go POT for extended testing

        mock/                 replacement of Go POT for extended testing
         pot.go
         go.mod
         pkg/persister        copy of Go POT in-memory storage to satisfy depencies

        lib/
         pot.wasm             Go POT implementation compiled to WASM
         wasm_exec.js         generic Go WASM wrapper (replace w/your Go version’s)
         potjs.js             Thin JS initialization convenience code
         wasm_exec.js.sha384  SHA384 checksum for sub-component verification
         potjs.js.sha384      SHA384 checksum for sub-component verification

       doc/
        POT_JS_manual.pdf
        POT_JS_manual.odt
        POT_JS_function_reference.pdf
        POT_JS_function_reference.odt

        examples/
         example1.html        briefest example as listed above, in-memory storage
         example2.html        interactive example, input fields, integrity
         example3.html        example 2 dropping potjs.js for more control
         example4.html        example 1 using synchronous access functions
         example5.html        example 1 but with connection to a storage network
         example6.html        example 5 with better connection to make rules
         example7.js          example 1 for execution with node.js
         example8.js          single-script node.js app, server and web page
         example9.js          example 8 verbatim stared with different arguments
         favicon.ico          Swarm logo to suppress browser errors

        test/
         test.html            test main page for test, ext_test, locnet_test
         kvs_test.js          test suites
         test.js              generic test harness
         test.css             generic test optics

        go.mod                go module locations
        go.sum                go module check sums

        Makefile              build scripts

        favicon.ico           Swarm logo to suppress browser errors



## Build Requirements

You need not build to use POT JS. For using it, `pot.wasm` and `wasm_exec.js`
suffice as they come. Optionally, `potjs.js` can be included. 

### POT JS API

* go 1.24.0

### GO POT (indirect, a separate repository being imported)

* go 1.24.0
* testify 1.8.4
* swarm bee 2.5.0
* crypto 0.23.0
* sync 0.14.0

Which will require, in turn

* perks 1.0.1
* xxhash 2.2.0
* go-spew 1.1.1
* errwrap 1.0.0
* go-multierror 1.1.1
* text v0.2.0
* go-difflib 1.0.0
* prometheus
* x/sys 0.20.0
* protobuf 1.33.0
* yaml 3.0.1

See [go.mod]() and
[https://github.com/ethersphere/proximity-order-trie/blob/master/go.mod]()


### Network Test

* ethersmockphere/swarm-cli
* fairdatasociety/fdp-play

Cf. `network_install` rule in the [Makefile]().


## Note on Go POT WASM

Being wrapped in WASM for the interfacing with JS, the Go executable is opaque,
it cannot in that form be debugged as there are no debuggers for WASM, and it
becomes unavailable once it has an unrecovered panic or deadlock.

It is therefore possible that the JS `pot` object that is created when
initializing the API can go out of service due to a Go panic or a deadlock with
the solution being to initialize the API again.

As the JS `pot` object is created as Javascript object by the WASM executable
when it is starting, the new object will replace the old one. After
re-initialization the same code with no modifications will just run again.

The chance of the WASM executable to go down has been minimized and extensively
tested. Deadlocks are easy to provoke though by using functions ending on
'Sync' functions outside of the narrow scope they can make sense in.



## Note on syscall/js

The connection between Go and Javascript through WASM is based on Go's
syscall/js package. This package is still officially labeled as experimental:

	"This package is EXPERIMENTAL. Its current scope is only to allow tests
	to run, but not yet to provide a comprehensive API for users. It is
	exempt from the Go compatibility promise." ——
	https://pkg.go.dev/syscall

It is stable since a long time though and functionally sufficiently rich to
build this API.



## Tests

The custom test harness in `test.js` and `test.css` is used to run and display
the results from a suite of 100+ tests in `kvs_test.js` across the available put
and get functions.

Make can be used to run tests, alternatively, serve the main directory, e.g.,
with with `npx http-server .`, and open `http://127.0.0.1:8080/test/test.html`
to run the equivalent of the standard test that is also invoked by:

	% make test

To see more ways of running tests, inspect the make rules. They can be copied
from the Makefile, replacing $$ with $.

These are the make rules to run tests:

	test              explain test modes and run node_inmem_test
	web_inmem_test    test api interaction with go pot in-memory persisting, web
	web_inmem_stress  stress test with go pot in-memory persisting, web
	web_sim_test      extended exceptions tests w/out go pot connection, web
	web_locnet_test   standard tests with a locally installed Swarm network, web
	web_locnet_stress stress test with a locally installed Swarm network, web
	node_inmem_test   test api interaction with go pot in-memory persisting, node
	node_sim_test     extended exceptions tests w/out go pot connection, node
	node_locnet_test  test with a locally installed Swarm network, node

	support & debugging

	serve             start local http server serving current directory
	stop              stop local http server. Ctrl-c does not.
	mock              prepare for extended exception tests
	unmock            reset for production or non-extended tests
	locnet_install    install the local test network
	locnet_start      start the local test network on docker
	locnet_batch      buy stamp batch (free)
	locnet_tests      run test suites on local test network
	locnet_stop       shut local test network down
	locnet_logs       show the entire log of the queen node


The test page and test framework are designed to bridge the language divide and
allow for the emulation of exceptions in one degree of separation (caused in
Go, caught from JS). The major relevance of the test harness is to help surface
any friction between JS's and Go's resource release mechanisms (JS promises and
Go channels) to detect possible leaks. Go's channels can deadlock, and the
challenge is aggravated by their position behind the JS API. 

The standard tests run against the Go implementation of POT, like the use would
be in production. The **extended tests**, however, focus on the JS API itself,
adding cancellation and time out cases. They do not interface with the Go POT
code but a drop-in replacement that simulates error conditions.  Latency
emulation, promisses, and connectivity as well as induced error conditions
are used to test the reality of an unreliable network as ultimate storage
layer.

Note that `make web_sim_test` (and also specifically, `make mock`) change the
project configuration and build executables (especially a `pot.wasm`) that will
not work for production.  (They will appear to work but they sidestep Go POT.)
Use `make unmock`, `make test`, or `make build` to restore to the production
target, i.e., build the real `pot.wasm`.

For the **extended tests** to use a separate, dedicated, in-memory storage
simulation that works separate from the Go POT implementation, `go.mod` is
altered to replace package
`https://github.com/ethersphere/proximity-order-trie` with `mock/`.

The relevant code triggering the exceptional conditions resides in `mock.go`.
For its purposes, it has to be part of the `main` package rather than package
`pot` in `mock/`.

Files governing the testing are:

	test.html
	test.css
	test_node.js
	test.js
	kvs_test.js
	Makefile (optional)

Both in-browser and node.js tests use test.js and the kvs_test.js suite.

For extended API simulation tests, these files are dropped in to replace Go POT:

	mock.go
	mock/pot.go
	mock/go.mod
	mock/pkg/persister/*

The file that gets modified for the extended API simulation is:

	go.mod

The ONLY relevant (non-optical) modification is that the Go POT package
`github.com/ethersphere/proximity-order-trie` is replaced by `redirecting` it to
folder `mock/`:

        go mod edit -replace github.com/ethersphere/proximity-order-trie=./mock

The modifications can be examined in the `Makefile`, rules `mock` and `unmock`.
To avoid `make`, the code of these rules can be copy-pasted into the console to
execute directly, replacing $$ with $.


## Error Strategy

The error strategy of the POT JS is JS-Style, using JS exceptions triggered from
the Go WASM functions via `syscall/js` mechanisms, rather than returning error
codes as return values, Go-style. The exception are the functions ending in
'Sync' that return JS error objects rather than expected values (or null) on
malfunction.

The implementation of this is in Go (`potjs.go`), not in JS, creating JS code
in Go, with full data/situational access on the Go side.


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
	go mod edit -replace github.com/ethersphere/proximity-order-trie=github.com/ethersphere/proximity-order-trie@v1.0.0
	go get
	go: added github.com/beorn7/perks v1.0.1
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
	openssl dgst -sha384 -binary lib/potjs.js | openssl base64 -A > lib/potjs.js.sha384
	openssl dgst -sha384 -binary lib/wasm_exec.js | openssl base64 -A > lib/wasm_exec.js.sha384
	for fn in lib/potjs.js.sha384 lib/wasm_exec.js.sha384; do sed -i.bak -e "s/\(${fn:4:-7}\".*integrity=\)[^>]*/\1\"sha384-${$(cat ${fn})//[\/]/\\/}\"/" examples/example2.html ; rm -f examples/example2.html.bak ; done
	GOOS=js GOARCH=wasm go build -o lib/pot.wasm potjs.go nomock.go
	⬢ √ pot.wasm built for production
```


### What You Should See: Standard Test

A web page should open and after some seconds (potentially first showing
'server not found') show the test page. If not, reload.

**Console**

```sh
	% make test

	# Tests can run in 3x2 modes: in-memory/api-only/network and browser/node.
	#
	# These are the make rules:
	#
	# test              explain test modes and run web_inmem_test
	# web_inmem_test    test api interaction with go pot in-memory persisting, web
	# web_inmem_stress  stress test with go pot in-memory persisting, web
	# web_sim_test      extended exceptions tests w/out go pot connection, web
	# web_locnet_test   standard tests with a locally installed Swarm network, web
	# web_locnet_stress stress test with a locally installed Swarm network, web
	# node_inmem_test   test api interaction with go pot in-memory persisting, node
	# node_sim_test     extended exceptions tests w/out go pot connection, node
	# node_locnet_test  test with a locally installed Swarm network, node
	GOOS=js GOARCH=wasm go build -o lib/pot.wasm potjs.go nomock.go
	⬢ √ pot.wasm built for production
	⬡ start http server (stop with 'make stop')
	(npx http-server -c1 . &)
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

	[2025-09-18T18:34:49.217Z]  "GET /test/test.html?tag=in-mem" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	(node:23165) [DEP0066] DeprecationWarning: OutgoingMessage.prototype._headers is deprecated
	(Use `node --trace-deprecation ...` to show where the warning was created)
	[2025-09-18T18:34:49.861Z]  "GET /test/test.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	[2025-09-18T18:34:49.866Z]  "GET /test/favicon.ico" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	[2025-09-18T18:34:49.867Z]  "GET /lib/wasm_exec.js" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	[2025-09-18T18:34:50.004Z]  "GET /test/test.js" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	[2025-09-18T18:34:50.015Z]  "GET /test/kvs_test.js" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	[2025-09-18T18:34:50.357Z]  "GET /lib/pot.wasm" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
```

**Web Page**

	SWARM POT JS API Test Suite                                       in-mem
	Thu Sep 18 2025 20:34:50 GMT+0200 (Central European Summer Time)

	This is the test suite for the Javascript API to the Go implementation
	of the Proximity-Order-Trie (POT).

	Also see: example 1   example 2   example 3   example 4   read me

	Notes

	The test suite runs in-memory of the Go POT implementation.

	Tests are using different random byte sequences for keys and values every run.

	Network

	Bee node URL : (in-memory)

	Batch ID     : (none)

	KVS Tests

	14 suites • 148 cases • 1321 assertions • passed with no errors.

	Test Suite #1 ••• EXAMPLE TEST •••IN-MEM

	Test setup test outside of main test files.

	✦ case #1 » html-inline                                               --
	• put and get K: V                                                    --
	√ as expected, ‹V›.

	...

	✦ case #148 » Immediate Cancel IIkvs_test.js:3741
	create hanging test promise and cancel it immediately (chain .catch)
	                                                        kvs_test.js:3743
	√ expected error: ‹Error: canceled›                                  1ms

	Test Suite #14 ••• FAILURES •••IN-MEM

	Failure tests are available in extended API test mode. Use `make web_ext_test` and `make node_ext_test`.

	tests cases run: 148 • assertions: 1321
	no errors


### What You Should See: Running Example 1

Check out the example code in [examples/example1.html]().


**Console**


```sh
	% make example1

	GOOS=js GOARCH=wasm go build -o lib/pot.wasm potjs.go nomock.go
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

	[2025-09-18T19:00:18.699Z]  "GET /examples/example1.html" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	(node:24334) [DEP0066] DeprecationWarning: OutgoingMessage.prototype._headers is deprecated
	(Use `node --trace-deprecation ...` to show where the warning was created)
	[2025-09-18T19:00:18.716Z]  "GET /examples/favicon.ico" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	[2025-09-18T19:00:18.718Z]  "GET /examples/lib/wasm_exec.js" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	[2025-09-18T19:00:18.792Z]  "GET /examples/lib/potjs.js" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	[2025-09-18T19:00:18.802Z]  "GET /examples/lib/pot.wasm" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	[2025-09-18T19:00:18.806Z]  "GET /favicon.ico" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
```

**Web Page**

	POT JS Example 1: Hello

	Check source and console.


**Browser JS Console**

	pot:  » POTWASM
	pot:  » init done
	pot:  » ready
	pot:  » initialize new P.O.T.
	pot:  › created new in-memory persister
	pot:  › using in-memory persister
	pot:  slot ref: 1
	pot:  » put hello: POT!
	pot:  » ⟶  68656c6c6f000000000000000000000000000000000000000000000000000000: 03504f5421
	pot:  » get hello: POT!
	pot:  » ⟵  68656c6c6f000000000000000000000000000000000000000000000000000000: 03504f5421
	key ‹hello› has: POT!



### What You Should See: Local Network Test

This is the standard local Swarm network test run in the browser with

```sh
	% make web_locnet_test
```

**Terminal**

```sh
	GOOS=js GOARCH=wasm go build -o lib/pot.wasm potjs.go nomock.go
	⬢ √ pot.wasm built for production
	 -----------------------------------------------------------------------------------
	|                                                                                   |
	|   This test takes some minutes to set up, its results will show in the browser.   |
	|                                                                                   |
	 -----------------------------------------------------------------------------------
	⬢ Local Swarm Network Standard Tests
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
	Stamp ID: 671330fabc03d3a60f0e4f7b2ba09fac164f08b8ca1c23795894c2277ef99f14
	grep "Stamp ID:" .batch_creation | cut -c11-74 > .batch_id
	⬡ postage batch ID: 671330fabc03d3a60f0e4f7b2ba09fac164f08b8ca1c23795894c2277ef99f14
	⬡ start http server
	/Library/Developer/CommandLineTools/usr/bin/make serve
	⬡ start http server (stop with 'make stop')
	(npx http-server -c1 . &)
	⬡ start tests (check browser)
	open "http://127.0.0.1:8080/test/test.html?tag=loc-net&bee=http://localhost:1633&batch=$(cat .batch_id)"
	⠹⬡ wait before shutdown
	sleep 120
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

	[2025-09-18T22:41:52.474Z]  "GET /test/test.html?tag=loc-net&bee=http://localhost:1633&batch=671330fabc03d3a60f0e4f7b2ba09fac164f08b8ca1c23795894c2277ef99f14" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	(node:4292) [DEP0066] DeprecationWarning: OutgoingMessage.prototype._headers is deprecated
	(Use `node --trace-deprecation ...` to show where the warning was created)
	[2025-09-18T22:41:52.538Z]  "GET /test/test.css" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	[2025-09-18T22:41:52.539Z]  "GET /lib/wasm_exec.js" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	[2025-09-18T22:41:52.549Z]  "GET /test/favicon.ico" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	[2025-09-18T22:41:52.617Z]  "GET /test/test.js" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	[2025-09-18T22:41:52.618Z]  "GET /test/kvs_test.js" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	[2025-09-18T22:41:52.627Z]  "GET /lib/pot.wasm" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
	⬡ bee node logs
	docker container logs --tail 1000 fdp-play-queen

	Welcome to Swarm.... Bzzz Bzzzz Bzzzz


	"Share the knowledge" - in memory of ldeffenb


			\     /
		    \    o ^ o    /
		      \ (     ) /
	   ____________(%%%%%%%)____________
	  (     /   /  )%%%%%%%(  \   \     )
	  (___/___/__/           \__\___\___)
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

	"time"="2025-09-18 22:39:41.948535" "level"="info" "logger"="node" "msg"="bee version" "version"="-d0aa8b9-dirty"
	"time"="2025-09-18 22:39:42.593027" "level"="info" "logger"="node" "msg"="swarm public key" "public_key"="03d5f6051105af2bc1dfb657031fc9d10df9be44ed24608e730a9a0cd07c97e906"
	"time"="2025-09-18 22:39:43.207134" "level"="debug" "logger"="node" "msg"="using existing libp2p key"
	"time"="2025-09-18 22:39:43.823478" "level"="debug" "logger"="node" "msg"="using existing pss key"
	"time"="2025-09-18 22:39:43.823661" "level"="info" "logger"="node" "msg"="pss public key" "public_key"="02f20bfb14a31491f8a9aec2dc455be4353733040e921ececcf612aca735b0bc7c"
	"time"="2025-09-18 22:39:43.823963" "level"="info" "logger"="node" "msg"="using ethereum address" "address"="0x26234a2ad3bA8B398A762f279B792cfAcd536a3f"
	"time"="2025-09-18 22:39:43.860326" "level"="info" "logger"="node" "msg"="using overlay address" "address"="0292b7ca8fe7d745339cbd05c19da0e2ba0fab18b63594b0029738a01af5d114"
	"time"="2025-09-18 22:39:43.861535" "level"="info" "logger"="node" "msg"="starting with an enabled chain backend"
	"time"="2025-09-18 22:39:43.915619" "level"="info" "logger"="node" "msg"="connected to blockchain backend" "version"="Geth/v1.13.15-stable-c5ba367e/linux-amd64/go1.21.9"
	"time"="2025-09-18 22:39:43.922092" "level"="info" "logger"="node" "msg"="using chain with network network" "chain_id"=4020 "network_id"=4020
	"time"="2025-09-18 22:39:43.966279" "level"="info" "logger"="node" "msg"="starting debug & api server" "address"="[::]:1633"
	"time"="2025-09-18 22:39:43.979472" "level"="info" "logger"="node" "msg"="waiting to sync with the blockchain backend"
	"time"="2025-09-18 22:39:43.985708" "level"="info" "logger"="node/transaction" "msg"="still waiting for blockchain RPC to sync" "block_time"="2025-08-07 13:28:58 +0000 UTC"
	"time"="2025-09-18 22:39:44.409001" "level"="debug" "logger"="node/api" "msg"="api access" "ip"="172.18.0.1" "method"="GET" "host"="127.0.0.1:1633" "uri"="/addresses" "proto"="HTTP/1.1" "status"=200 "size"=376 "duration"="3.496208ms" "user-agent"="axios/0.28.1"
	"time"="2025-09-18 22:39:47.451950" "level"="debug" "logger"="node/api" "msg"="api access" "ip"="172.18.0.1" "method"="GET" "host"="127.0.0.1:1633" "uri"="/addresses" "proto"="HTTP/1.1" "status"=200 "size"=376 "duration"="559.167µs" "user-agent"="axios/0.28.1"
	"time"="2025-09-18 22:39:49.028329" "level"="info" "logger"="node" "msg"="using custom factory address" "factory_address"="0xCfEB869F69431e42cdB54A4F4f105C19C080A601"
	"time"="2025-09-18 22:39:49.046942" "level"="info" "logger"="node/chequebook" "msg"="no chequebook found, deploying new one."
	"time"="2025-09-18 22:39:49.074090" "level"="debug" "logger"="node/transaction" "msg"="prepare transaction" "sender_address"="0x26234a2ad3bA8B398A762f279B792cfAcd536a3f" "gas_max_fee"="2527359700" "gas_max_tip"="1500000000"
	"time"="2025-09-18 22:39:49.090661" "level"="info" "logger"="node/chequebook" "msg"="deploying new chequebook" "tx"="0x0950c59f17ba1fbb153f01d612e1060c51bf1543c84441c769eddd3ea58d3f03"
	"time"="2025-09-18 22:39:50.483509" "level"="debug" "logger"="node/api" "msg"="api access" "ip"="172.18.0.1" "method"="GET" "host"="127.0.0.1:1633" "uri"="/addresses" "proto"="HTTP/1.1" "status"=200 "size"=376 "duration"="2.228084ms" "user-agent"="axios/0.28.1"
	"time"="2025-09-18 22:39:53.501051" "level"="debug" "logger"="node/api" "msg"="api access" "ip"="172.18.0.1" "method"="GET" "host"="127.0.0.1:1633" "uri"="/addresses" "proto"="HTTP/1.1" "status"=200 "size"=376 "duration"="461.5µs" "user-agent"="axios/0.28.1"
	"time"="2025-09-18 22:39:54.143216" "level"="info" "logger"="node/transaction" "msg"="pending transaction confirmed" "sender_address"="0x26234a2ad3bA8B398A762f279B792cfAcd536a3f" "tx"="0x0950c59f17ba1fbb153f01d612e1060c51bf1543c84441c769eddd3ea58d3f03"
	"time"="2025-09-18 22:39:54.144493" "level"="info" "logger"="node/chequebook" "msg"="chequebook deployed" "chequebook_address"="0x475F6a219558670F2e90f0f0CfafDc107ef3d491"
	"time"="2025-09-18 22:39:54.346281" "level"="info" "logger"="node" "msg"="using datadir" "path"="/home/bee/.bee"
	"time"="2025-09-18 22:39:54.363480" "level"="info" "logger"="node/migration-RefCountSizeInc" "msg"="starting migration of replacing chunkstore items to increase refCnt capacity"
	"time"="2025-09-18 22:39:54.364015" "level"="info" "logger"="node/migration-RefCountSizeInc" "msg"="migration complete"
	"time"="2025-09-18 22:39:54.383455" "level"="info" "logger"="node" "msg"="starting reserve repair tool, do not interrupt or kill the process..."
	"time"="2025-09-18 22:39:54.384537" "level"="info" "logger"="node" "msg"="removed all bin index entries"
	"time"="2025-09-18 22:39:54.384675" "level"="info" "logger"="node" "msg"="removed all chunk bin items" "total_entries"=0
	"time"="2025-09-18 22:39:54.384789" "level"="info" "logger"="node" "msg"="counted all batch radius entries" "total_entries"=0
	"time"="2025-09-18 22:39:54.384894" "level"="info" "logger"="node" "msg"="parallel workers" "count"=4
	"time"="2025-09-18 22:39:54.385534" "level"="info" "logger"="node" "msg"="migrated all chunk entries" "new_size"=0 "missing_chunks"=0 "invalid_sharky_chunks"=0
	"time"="2025-09-18 22:39:54.385651" "level"="info" "logger"="node/migration-step-04" "msg"="starting sharky recovery"
	"time"="2025-09-18 22:39:54.414509" "level"="info" "logger"="node/migration-step-04" "msg"="finished sharky recovery"
	"time"="2025-09-18 22:39:54.414925" "level"="info" "logger"="node/migration-step-05" "msg"="start removing upload items"
	"time"="2025-09-18 22:39:54.415264" "level"="info" "logger"="node/migration-step-05" "msg"="finished removing upload items"
	"time"="2025-09-18 22:39:54.415381" "level"="info" "logger"="node/migration-step-06" "msg"="start adding stampHash to BatchRadiusItems, ChunkBinItems and StampIndexItems"
	"time"="2025-09-18 22:39:54.416452" "level"="info" "logger"="node/migration-step-06" "msg"="finished migrating items" "seen"=0 "migrated"=0
	"time"="2025-09-18 22:39:54.417771" "level"="info" "logger"="node" "msg"="waiting to sync postage contract data, this may take a while... more info available in Debug loglevel"
	"time"="2025-09-18 22:39:54.422098" "level"="debug" "logger"="node/listener" "msg"="batch factor" "value"=5
	"time"="2025-09-18 22:39:54.424033" "level"="debug" "logger"="node/listener" "msg"="sleeping until next block batch" "duration"="10s"
	"time"="2025-09-18 22:39:56.539813" "level"="debug" "logger"="node/api" "msg"="api access" "ip"="172.18.0.1" "method"="GET" "host"="127.0.0.1:1633" "uri"="/addresses" "proto"="HTTP/1.1" "status"=200 "size"=530 "duration"="1.978208ms" "user-agent"="axios/0.28.1"
	"time"="2025-09-18 22:39:58.075936" "level"="debug" "logger"="node/api" "msg"="api access" "ip"="172.18.0.1" "method"="GET" "host"="127.0.0.1:1633" "uri"="/peers" "proto"="HTTP/1.1" "status"=503 "size"=90 "duration"="1.790375ms" "user-agent"="axios/0.28.1"
	"time"="2025-09-18 22:40:01.084537" "level"="debug" "logger"="node/api" "msg"="api access" "ip"="172.18.0.1" "method"="GET" "host"="127.0.0.1:1633" "uri"="/peers" "proto"="HTTP/1.1" "status"=503 "size"=90 "duration"="312.917µs" "user-agent"="axios/0.28.1"
	"time"="2025-09-18 22:40:04.100253" "level"="debug" "logger"="node/api" "msg"="api access" "ip"="172.18.0.1" "method"="GET" "host"="127.0.0.1:1633" "uri"="/peers" "proto"="HTTP/1.1" "status"=503 "size"=90 "duration"="2.18675ms" "user-agent"="axios/0.28.1"
	"time"="2025-09-18 22:40:04.449543" "level"="debug" "logger"="node" "msg"="p2p address" "address"="/ip4/127.0.0.1/tcp/1634/p2p/QmQcFTq1JQ39W7bTej7rB4w3EnkbNbzWcwadgTiengJsYy"
	"time"="2025-09-18 22:40:04.449736" "level"="debug" "logger"="node" "msg"="p2p address" "address"="/ip4/172.18.0.3/tcp/1634/p2p/QmQcFTq1JQ39W7bTej7rB4w3EnkbNbzWcwadgTiengJsYy"
	"time"="2025-09-18 22:40:04.472478" "level"="debug" "logger"="node/batchstore" "msg"="put chain state" "block"=5 "amount"=0 "price"=0
	"time"="2025-09-18 22:40:04.474201" "level"="debug" "logger"="node/batchservice" "msg"="block height updated" "new_block"=5
	"time"="2025-09-18 22:40:04.475829" "level"="debug" "logger"="node/listener" "msg"="sleeping until next block batch" "duration"="25s"

	...

	"time"="2025-09-18 22:42:45.919180" "level"="debug" "logger"="node/salud" "msg"="computed" "avg_dur"=0.029121176999999998 "pDur"=0.027225291 "pConns"=2 "network_radius"=0 "neighborhood_radius"=0 "batch_commitment"=1048576
	"time"="2025-09-18 22:42:59.712193" "level"="debug" "logger"="node/batchstore" "msg"="put chain state" "block"=40 "amount"=0 "price"=0
	"time"="2025-09-18 22:42:59.713054" "level"="debug" "logger"="node/batchservice" "msg"="block height updated" "new_block"=40
	"time"="2025-09-18 22:42:59.713242" "level"="debug" "logger"="node/listener" "msg"="sleeping until next block batch" "duration"="25s"
	"time"="2025-09-18 22:43:24.740172" "level"="debug" "logger"="node/batchstore" "msg"="put chain state" "block"=45 "amount"=0 "price"=0
	"time"="2025-09-18 22:43:24.741770" "level"="debug" "logger"="node/batchservice" "msg"="block height updated" "new_block"=45
	"time"="2025-09-18 22:43:24.742029" "level"="debug" "logger"="node/listener" "msg"="sleeping until next block batch" "duration"="25s"
	⬡ stopping nodes
	fdp-play stop
	✔ Containers stopped
```


**Browser**

	SWARM POT JS API Test Suiteloc-net

	Fri Sep 19 2025 00:41:52 GMT+0200 (Central European Summer Time)

	This is the test suite for the Javascript API to the Go implementation of the Proximity-Order-Trie (POT).

	Also see: example 1   example 2   example 3   example 4   read me

	Notes

	The test suite runs on a local Swarm test network.

	Tests are using different random byte sequences for keys and values every run.

	Network

	Bee node URL : http://localhost:1633

	Batch ID     : 0607010303000f0a0b0c00030d030a06000f000e040f070b020b0a00090f0a0c0106040f00080b080c0a010c02030709050809040c020207070e0f09090f0104

	KVS Tests

	11 suites • 99 cases • 680 assertions • passed with no errors.

	Test Suite #1 ••• EXAMPLE TEST •••                               LOC-NET
	Test setup test outside of main test files.

	✦ case #1 » html-inline                                               --
	• put and get K: V                                                    --
	√ as expected, ‹V›                                                .212ms

	...

	✦ case #98 » Cancel Delay                               kvs_test.js:3711
	create hanging test promise and cancel it (delay, chain .catch)
	                                                        kvs_test.js:3713
	√ expected error: ‹Error: canceled›                                503ms

	✦ case #99 » Immediate Cancel II                        kvs_test.js:3741
	create hanging test promise and cancel it immediately (chain .catch)
	                                                        kvs_test.js:3743
	√ expected error: ‹Error: canceled›                                  1ms

	Test Suite #11 ••• FAILURES •••                                  LOC-NET
	Failure tests are available in extended API test mode. Use `make web_ext_test` and `make node_ext_test`.

	tests cases run: 99 • assertions: 680

	no errors



# Extensions and Changes to Come

The main architecture is stable, include the promise-to-go-routine
transition, and the bridging of error-handling philosophies. It is also
straight forward as would intuitively be inspected.

• Tree Walk Functions

• Error Conditions

And other fringe cases are not caught everywhere yet, marked as missing
across the code base.

• Complex Tests for Resource Leaks

The Go POT implementation has to be slightly extended for optimal interaction
with JS, and completed where it does not fully handle context propagation
and resource recapturing (ending go routines upon interruptions).

• Save Tests

Of large trees.

Examples in their own sub folder etc.

• Commenting and Go Docs

Currently in ad-hoc state.



# Kicking The Tires

This section is a quick guide to checking out all there is to POT JS.

### Run the Tests

Clone this repo, serve its root directory by starting `npx http-server .` or
similar and open `test.html` via `https://127.0.0.1/test.html`. You don't
have to build anything. This test checks inter-operation between JS and Go.

To test with a local Swarm network, do `make locnet_test`. Provided docker
is running and dependencies installed, it will run the suite against the
5 swarm nodes that FreeOS configures.

The dependencies are:

* ethersphere/swarm-cli
* fairdatasociety/fdp-play

Use `make help` for a list of the test options.

See the chapter 'Tests' towards the end of this readme.


### Run Examples

Same as for tests: clone this repo, serve its root directory by starting
`npx http-server .` or similar and open `example1.html` via
`https://127.0.0.1/example1.html`. There are two other examples,
`example2.html` etc.

For the node test, run `node example5.js`.

**Example 1**

Minimal put and get, output to console.

**Example 2**

Including input and output from and to the web page, and integrity hashes.

**Example 3**

More unpacked initialization, not using potjs.js, for potentially more control.

**Example 4**

Using promises / async.

**Example 5**

Node / offline example.


### Build

To try tests and examples you DON'T have to build first.

To build, the essence is

	% GOOS=js GOARCH=wasm go build -o pot.wasm potjs.go nomock.go
	% cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .

For a more comprehensive rebuild including, if needed, integrity hashes and
`go.mod`, use

	% make

or even

	% make clean build

which will create a new `go.mod` etc.


For how an expected output of building and other make rules should look, see
**What You Should See**, above. 



### Makefile

`make help` lists all rules.

The makefile is NOT needed except for developing. Building is not needed for
use because wasm and js are portabel as they are in the repo (the Go code the
repo adds is, of course, present in the form of the WASM binary).

`mock` and `unmock` point to a special test mode that is prepared to help
detecting races and resource leaks caused by the JS/Go interaction. It works
like the standard test but redirects to a mock Go POT implementation in
`mock.go` and `mock/` that will be used to produce delays and monitor resource
handling under error conditions. This would matter to long-running clients.

See **What You Should See** at the end of this readme to verify whether
the `make` commands work as expected.

