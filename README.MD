# DEV NOTES / WALK THROUGH

This version pulls Go POT from https://github.com/ethersphere/proximity-order-trie.


## Trying It

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

	GOOS=js GOARCH=wasm go build -o pot.wasm potjs.go nomock.go
	cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .

For a more comprehensive rebuild including, if needed, integrity hashes and
`go.mod`, use

	make

or even

	make clean build

which will create a new `go.mod` etc.


For how an expected output of building and other make rules should look, see
**What You Should See** at the end of this readme.



### Other Files

See list below.


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


## Extensions and Changes to Come

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

• Repository File Structure

Examples in their own sub folder etc.

• Commenting and Go Docs

Currently in ad-hoc state.

---

**What follows is a dated stub for the production-ready readme.**</center>

---

# POT JS

This is a JS API for the Go POT implementation, eventually for use with the
Swarm decentralized storage network.

This interface allows for calls from Javascript to the Go implementation of the
POT storage tree structure that can be used to save key-value maps to an
immutable, decentralized storage network like Swarm.

The tree structure is called Proximity Order Tree (POT), after a fundamental
storage technique that is described in a forthcoming paper. It translates a
key-value layout to a tree of nodes saved to a content-addressed storage.


## Quick Start

* Drop `pot.wasm`, `potjs.js`, and `wasm_exec.js` in a directory.
* Write some html and js like seen in `example1.html`.


## Use

The JS API is for embedding POT functionality into a browser environment.

To initialize, include the generic `wasm_exec.js` and `potjs.js`, then wait
for the initialization to finish.

```js

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
new map. Use `put` and `get` functions on it.

```js
	map = pot.newSync()

	await pot.put("hello", "Hello, P.O.T.!")

	value = await pot.get("hello")
```

See example1.html (that simple example does not use promises).

You may leave out `potjs.js` to initialize with more direct control: include
only the generic Go WASM wrapper `wasm_exec.js`, create a `Go` object and
instantiate the POT WASM object `pot.wasm`, then run it once it is loaded.

```js
	<script src="wasm_exec.js"></script>

	<script>

	const go = new Go()
	WebAssembly.instantiateStreaming(fetch("pot.wasm"), go.importObject)
		.then((potwasm)=>{ go.run(potwasm.instance) })

	...
```

## Example

This is a complete example (using synchronous put and get):

```js
	<script src="wasm_exec.js"></script>
	<script src="potjs.js"></script>

	<script>

	(async () => {

		await pot.ready()

		map = pot.newSync()

		map.putSync("hello", "POT!")

		value = map.getSync("hello")

		console.log("key ‹hello› has:", value)
	})()

	</script>
```

To run the example, serve the main directory with `npx http-server .` and open
`http://127.0.0.1:8080/example1.html`, which contains above code. Or use
`make example1`.

The method `pot.putTypePromise()` stores a value to the POT,
`pot.get()` retrieves it. The result is shown in the console.

A second example, `example2.html` shows a simple flow of setting and reading
values controlled by html input.

The examples can be started with

	make example1

etc.


## Building

There is no need for building. The main executable, the Go WASM file `pot.wasm`
and auxiliary Javascript and HTML files are portable.

To rebuild, run

```bash

	GOOS=js GOARCH=wasm go build -o pot.wasm potjs.go nomock.go
	cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .
```

or


	make


To build from scratch, regenerating `go.mod` and the integrity hashes:


	make clean build



## Files


        README.MD             this file

        potjs.go              Go JS interface
        nomock.go             noop place holders for production build
        pot.wasm              Go POT implementation compiled to WASM
        potjs.js              Thin JS initialization convenience code

        wasm_exec.js.sha384   SHA384 checksum for sub-component verification
        potjs.js.sha384       SHA384 checksum for sub-component verification

        example1.html         example as listed above
        example2.html         interactive example, input fields, integrity
        example3.html         dropping potjs.js for more control
        example3.html         working with promises

        wasm_exec.js          Go's generic WASM wrapper

        test.html             main test page
        test.js               generic test harness
        test.css              generic test optics
        kvs_test.js           test suites

        mock.go               monkey patch mock of Go POT for extended testing
        mock/pot.go
        mock/go.mod
        mock/pkg/persister    copy of in-memory persister from Go POT (not used)

        go.mod                go module locations
        go.sum                go module check sums

        Makefile              optional build scripts



## Requirements

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

See `go.mod` and
`${go env GOPATH}/pkg/mod/github.com/ethersphere/proximity-order-trie@v0.0.0-*/go.mod`

### Network Test

* ethersphere/swarm-cli
* fairdatasociety/fdp-play

Cf. `network_install` rule in `Makefile`.


## Function Reference

### INITIALIZATION

#### NEW SWARM KVS

	newSync() reference : int

Create a new Swarm KVS.

	ref = pot.newSync()

#### NEW SWARM KVS REFERENCE

	newByReferenceSync(reference : int) reference : int

Create a new Swarm KVS from a reference.

	ref = pot.newByReferenceSync(ref)

#### SAVE

	saveSync()

Store a Swarm KVS.

        ref = pot.newSync()
        assertNoError(T, !ref)

        ref = pot.saveSync()
        assertEqual(T, ref, 0)

#### DYNAMIC TYPE-CASTING, ASYNCHRONOUS

Preferred functions for real-world use.

#### PUT TYPED PROMISE

	put(key : any, value : any) : promise

Return a promise for the typed put.

        v = " The quick brown fox jumps over the lazy dog."
        ref = pot.newSync()
        assertNoError(T, !ref)
        try {
                await pot.put(k, v)
                attestNoError(T)
                T.log("• get " + k + " by promise")
                r = await pot.get(k)
                attestNoError(T)
                assertEqual(T, r, v)
        } catch(e) {
                attestUnexpectedError(T, e)
        }

#### GET TYPED PROMISE

	get(key : any) promise of any

Return a promise for the typed get.

        try {
                 r = await pot.get(k)
        } catch(e) {
		     ...
        }


When using `.catch`, don’t chain it before taking the reference.

        ref = pot.hangingPromise()
        ref.catch((err)=>attestExpectedError(T, err, "Error: canceled"))

### DYNAMIC TYPE-CASTING, DIRECT

Prototyping functions accessing blocking mock POT implementation.

#### PUT TYPED

	putSync(key : any, value : any) error : Error

Put the value encoded for its type in the 1st byte of the raw value.

#### GET TYPED

	getSync(key : any) value : any

Get the value decoded for its type using the 1st byte of the raw value.

### RAW BYTES, DIRECT

#### PUT

	putRawSynckey : any, value : Uint8Array) error : Error

Put a raw Uint8Bytes array.

#### GET

	getRawSync(key : any) value : Uint8Array

Get a raw Uint8Bytes array.

#### GET BOOLEAN

	getBooleanSync(key : any) boolean

Get the raw value as Boolean. First byte 0 being false, all else true.

#### GET NUMBER

	getNumberSync(key : any) number

Get the raw value as floating point number (JS default).

#### GET STRING

	getStringSync(key : any) string

Get the raw value as string.

### CRYPTO

#### SET ADDRESS

	setAddress(address : hash32)

Set Wallet address holding BZZ to pay for storing on Swarm with put*().

#### GET PROOF

	getProof(hash32) hash32

Get a proof for an entry.

### TESTING AND SUPPORT

These functions exist for black box testing. See kvs_test.js for examples of their use.

#### LOG

	log(message :  string)

Write to browser console via Go to verify language-lands roundtrip.

#### HELLO

	hello()

Write hello to browser console to verify established WASM stream.

#### RANDOM KEY

	randKey() Uint8Array(32)

32 random bytes for key testing.

#### RANDOM VALUE

	randValue() Uint8Array(79-101)

79 to 101 random bytes for value testing (numbers from Go POT).

#### TYPE ENCODED BYTES

	type_encoded_bytes(value : any) encoded : Uint8Array

JS type detection and value encoding with correct leading type byte.

#### TYPE DECODED VALUE

	type_decoded_value(raw : Uint8Array) value : any

JS type detection of raw kvs value by leading type byte.

#### HANGING PROMISE

	hangingPromise() promise

Blocking promise (in Go) with 1s time out for exception testing.


## Note on Go POT WASM

Being wrapped in WASM for the interfacing with JS, the Go executable is opaque,
it cannot in that form be debugged as there are no debuggers for WASM, and it
becomes unavailable once it has an unrecovered panic or deadlock.

It is therefore possible that the JS `pot` object that is created when
initializing the API can go out of service with the solution being to
initialize the API again.

As the JS `pot` object is created in JS by the WASM executable when it is
starting, the new object will replace the old one. After re-initialization the
same code with no modifications will just run again.

The chance of the WASM executable to go down has been minimized and extensively
tested.



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

	$ make test	# standard API tests vs Go POT in-memory storage
	$ make nt	# standard API tests vs local Swarm test network
	$ make xt	# extended API tests vs mock storage

Alternatively, to test the JS API, serve the main directory, e.g., with with `npx http-server
.`, and open `http://127.0.0.1:8080/test.html`.

The custom test harness in `test.js` and `test.css` is used to run and display
the results from a suite of 123 tests in `kvs_test.js` across the available put
and get functions.

The standard tests run against the Go implementation of POT, like the use would
be in production. The **extended tests**, however, focus on the JS API itself,
adding cancellation and time out cases. They do not interface with the Go POT
code but a mock drop-in replacement that simulates error conditions.  Latency
emulation, promisses, and connectivity as well as retention error conditions
are used to test the reality of an unreliable network as ultimate storage
layer.

Note that `make xt` (and also specifically, `make mock`) change the project
configuration and build executables (especially a `pot.wasm`) that will not
work for production.  (They will appear to work but they sidestep Go POT.) Use
`make unmock`, `make test`, `make nt`, or `make build` to restore to the
production target, i.e., build the real `pot.wasm`.

The **extended tests** use a separate, dedicated, in-memory mock storage to
separate them from the Go POT implementation (not Go POT's in-memory
persister.)

The tests are made for the browser as the final destination of the combined
architecture, in either case (standard and extended tests) they are invoked by
opening the file `test.html`.  `go.mod` is altered between the tests to replace
package `https://github.com/ethersphere/proximity-order-trie` with `mock/`.

This test page and test framework is designed to bridge the language divide and
allow for the emulation of exceptions in one degree of separation (caused in
Go, caught from JS). The major relevance of the test harness is to help surface
any friction between JS's and Go's resource release mechanisms (JS promises and
Go channels) to detect possible leaks. Go's channels are not without peril —
they can deadlock — and the challenge is aggravated by their position behind
the JS API. The relevant code triggering the exceptional conditions resides in
`mock.go`. For its purposes, it has to be part of the `main` package rather
than package `pot` in `mock/`.

Files governing the testing are:

	test.html
	test.css
	test.js
	kvs_test.js
	Makefile (optional)

For extended API tests:

	mock.go
	mock/pot.go
	mock/go.mod
	mock/pkg/persister/*

Files modified for extended API testing are:

	go.mod

The ONLY relevant (non-optical) modification is that the Go POT package
`github.com/ethersphere/proximity-order-trie` is replaced by `redirecting` it to
folder `mock/`:

        go mod edit -replace github.com/ethersphere/proximity-order-trie=./mock

The modifications can be examined in the `Makefile`, rules `mock` and `unmock`.
To avoid `make`, the code of these rules can be copy-pasted into the console to
execute directly.


## Error Strategy

The error strategy of the API is JS-Style, using JS exceptions triggered from
the Go WASM functions via `syscall/js` mechanisms, rather than returning error
codes as return values, Go-style.

The implementation of this is in Go though (`potjs.go`), not in JS, creating
JS code in Go, with full data/situational access on the Go side.


---


# What You Should See

These are slightly dated but still useful example outputs of running make
rules. Manual entering of the same commands, e.g., to build, will produce
similar output.

Note that you need not build to try the tests or examples. They work as cloned.


### Clean

This deletes some files that are part of the repo as pushed, to build from
scratch. The built executable, but also the go module spec, and the integrity
hashes.

	$ make clean

	rm -f go.mod
	rm -f pot.wasm
	rm -f wasm_exec.js
	rm -f *.sha384


### Build

This (re-)creates `pot.wasm`.

	$ make

	grep: go.mod: No such file or directory
	go mod init potwasm
	go: creating new go.mod: module potwasm
	go: to add module requirements and sums:
		go mod tidy
	go mod edit -replace pot=./pot
	go get
	go: added github.com/beorn7/perks v1.0.1
	go: added github.com/cespare/xxhash/v2 v2.2.0
	go: added github.com/ethersphere/bee/v2 v2.5.0
	go: added github.com/ethersphere/proximity-order-trie v0.0.0-20250605072522-20f76c73ee9e
	go: added github.com/hashicorp/errwrap v1.0.0
	go: added github.com/hashicorp/go-multierror v1.1.1
	go: added github.com/prometheus/client_golang v1.18.0
	go: added github.com/prometheus/client_model v0.6.0
	go: added github.com/prometheus/common v0.47.0
	go: added github.com/prometheus/procfs v0.12.0
	go: added golang.org/x/crypto v0.23.0
	go: added golang.org/x/sys v0.20.0
	go: added google.golang.org/protobuf v1.33.0
	go: added pot v0.0.0-00010101000000-000000000000
	cp "$(go env GOROOT)/lib/wasm/wasm_exec.js" .
	openssl dgst -sha384 -binary potjs.js | openssl base64 -A > potjs.js.sha384
	openssl dgst -sha384 -binary wasm_exec.js | openssl base64 -A > wasm_exec.js.sha384
	for fn in potjs.js.sha384 wasm_exec.js.sha384; do sed -i.bak -e "s/\(\"${fn:0:-7}\" integrity=\)[^>]*/\1\"sha384-${$(cat ${fn})//[\/]/\\/}\"/" example1.html ; rm -f example1.html.bak ; done
	for fn in potjs.js.sha384 wasm_exec.js.sha384; do sed -i.bak -e "s/\(\"${fn:0:-7}\" integrity=\)[^>]*/\1\"sha384-${$(cat ${fn})//[\/]/\\/}\"/" example2.html ; rm -f example2.html.bak ; done
	for fn in potjs.js.sha384 wasm_exec.js.sha384; do sed -i.bak -e "s/\(\"${fn:0:-7}\" integrity=\)[^>]*/\1\"sha384-${$(cat ${fn})//[\/]/\\/}\"/" example3.html ; rm -f example3.html.bak ; done
	GOOS=js GOARCH=wasm go build -o pot.wasm potjs.go state.go
	√ created pot.wasm for production


### Test

A web page should open and after some seconds (first showing 'server not found')
show the test page. If not, reload.

**Console**

	$ make test

	GOOS=js GOARCH=wasm go build -o pot.wasm potjs.go state.go
	√ created pot.wasm for production
	open http://127.0.0.1:8080/test.html
	npx http-server -c-1 . 
	Starting up http-server, serving .

	http-server version: 14.1.1

	http-server settings: 
	CORS: disabled
	Cache: -1 seconds
	Connection Timeout: 120 seconds
	Directory Listings: visible
	AutoIndex: visible
	Serve GZIP Files: false
	Serve Brotli Files: false
	Default File Extension: none

	Available on:
	  http://127.0.0.1:8081
	  http://192.168.178.192:8081
	Hit CTRL-C to stop the server


**Web Page**

	POT JS API Test SuiteGo POT This is the test suite for the Javascript
	API to the Go implementation of the Proximity-Order-Trie (POT).

	example 1   example 2   read me

	Notes

	Tests using go pot are not touching the Swarm network at this point.
	They are an in-memory implementation of the proximity order tree logic.

	Tests are using different random byte sequences for keys and values
	every run.

	This test runs in direct interaction with the Go POT implementation.

	KVS Tests

	275 tests complete, no errors.

	...


### Example 1

Check out the example code in example1.html.

There are two more examples not discussed here. They present similarly.


**Console**


	$ make example1

	GOOS=js GOARCH=wasm go build -o pot.wasm potjs.go state.go
	√ created pot.wasm for production
	open http://127.0.0.1:8080/example1.html
	npx http-server -c-1 .
	Starting up http-server, serving .

	http-server version: 14.1.1

	http-server settings: 
	CORS: disabled
	Cache: -1 seconds
	Connection Timeout: 120 seconds
	Directory Listings: visible
	AutoIndex: visible
	Serve GZIP Files: false
	Serve Brotli Files: false
	Default File Extension: none

	Available on:
	  http://127.0.0.1:8081
	  http://192.168.178.192:8081
	Hit CTRL-C to stop the server


**Web Page**

	POT JS Example 1: Hello

	Check source and console.


**Browser JS Console**

	pot:  » POTWASM
	wasm_exec.js:22 pot:  » initialize new P.O.T.
	wasm_exec.js:22 pot:  slot ref: 1
	wasm_exec.js:22 pot:  » put hello: POT!
	wasm_exec.js:22 pot:  » ⟶ 68656c6c6f000000000000000000000000000000000000000000000000000000: 03504f5421
	wasm_exec.js:22 pot:  » get hello: POT!
	wasm_exec.js:22 pot:  » ⟵ 68656c6c6f000000000000000000000000000000000000000000000000000000: 03504f5421
	example1.html:25 key ‹hello› has: POT!


