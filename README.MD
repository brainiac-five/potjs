# JS POT

This is a JS API for the Go POT implementation, eventually for use with the Swarm decentralized
storage network.

This interface allows for calls from Javascript to the Go implementation of the
POT storage tree structure that can be used to save key-value maps to an
immutable, decentralized storage network like Swarm.

The tree structure is called Proximity Order Tree (POT), after a fundamental
storage technique that is described in a forthcoming paper. It translates a
key-value layout to a tree of nodes saved to a content-addressed storage.


## Quick Start

* Drop `pot.wasm` and `wasm_exec.js` in a directory.
* Write some html and js like seen in `example1.html`.


## Use

The JS API is for embedding POT functionality into a browser environment.

To initialize, embedd the generic Go WASM wrapper `wasm_exec.js`, create a `Go`
wrapper object and instantiate the POT WASM object `pot.wasm`, and run it once
it is loaded.

	<script src="wasm_exec.js"></script>
	<script>
	const go = new Go()
	WebAssembly.instantiateStreaming(fetch("pot.wasm"), go.importObject)
		.then((potwasm)=>{ go.run(potwasm.instance) })

After this has finished, the go wasm `pot` object can be used to call the 
method listed below, especially `put` and `get` of the key-value store it
implements.

	await pot.putTypedPromise("hello", "Hello, P.O.T.!")
	value = await pot.getTypedPromise("hello")


## Example

This is a complete example:

	<script src="wasm_exec.js"></script>
	<script>
	const go = new Go()
	WebAssembly.instantiateStreaming(fetch("pot.wasm"), go.importObject)
		.then((potwasm)=>{
			go.run(potwasm.instance)

			pot.putTyped("hello", "Hello, P.O.T.!")
			value = pot.getTyped("hello")
			console.log("key hello has:", value)
		})
	</script>

To run the example, serve the main directory with `npx http-server .` and open
`http://127.0.0.1:8080/example1.html`, which contains above code.

The method `pot.putTypePromise()` stores a value to the POT,
`pot.getTypedPromise()` retrieves it. The result is shown in the console.

A second example, `example2.html` shows a simple flow of setting and reading
values controlled by html input.


## Building

There is no need for building, the main executable, the Go WASM file `pot.wasm`
and auxiliary Javascript and HTML files are portable.

To rebuild, run

	GOOS=js GOARCH=wasm go build -o pot.wasm
	cp "$$(go env GOROOT)/lib/wasm/wasm_exec.js" .


## Files

	README.MD		this file

	potjs.go		Go JS interface
	pot.wasm		Go POT implementation compiled to WASM

	example1.html		example as listed above
	example2.html		interactive example with

	wasm_exec.js		generic Go WASM wrapper

	test.html		test main page
	kvs_test.js		kvs tests
	test.js			generic test harness
	test.css		generic optics

	Makefile		build and clean script


## Requirements

### POT JS API

* go 1.24.0

### GO POT

* go 1.24.0

* testify 1.8.4
* swarm bee 2.5.0
* crypto 0.23.0
* sync 0.14.0

Which will require

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

See `go.mod`.

## Notes on Go POT

At this point, the Go POT implementation is not connected to Swarm yet but
stores to an in-memory data structure for testing. Accordingly, this JS API
cannot be used to store to Swarm yet.

Being wrapped in WASM for the interfacing with JS, the Go executable is opaque,
it cannot be debugged as there are no debuggers for wasm, and it becomes
unavailable once it has panicked once.


## Note on syscall/js

The connection between Go and Javascript through WASM is based on Go's
syscall/js package. This package is still officially labeled as experimental:

	"This package is EXPERIMENTAL. Its current scope is only to allow tests
	to run, but not yet to provide a comprehensive API for users. It is
	exempt from the Go compatibility promise." ——
	https://pkg.go.dev/syscall


## Tests

To test the JS API, serve the main directory, e.g., with with
`npx http-server .`, and open `http://127.0.0.1:8080/test.html`. It uses
`test.js` and `test.css` to display the results from a suite of 250 tests
across the available put and get functions.

Part of the tests of this API use yet an additional in-memory mock storage to
separate them from the Go POT implementation. The tests are modeled on and
extend the tests in go pot /kvs_test.go.

Some tests are made for the browser as the final destination of the combined
architecture, and are invoked by opening the file tests/test.html.

Latency emulation, promisses, and connectivity as well as retention error
conditions have been added for the API test to emulate the reality of an
unreliable network as ultimate storage layer.


## Error Strategy

The error strategy of the API is JS-Style, using JS exceptions triggered from
the go wasm functions via syscall/js mechanisms, rather than returning error
codes, Go-style.
