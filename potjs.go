// ---------------------------------------------------------------------------
//
// # SWARM POT JS
//
// This is functionally an API from Javascript to the implementation of POT in
// Go: https://github.com/ethersphere/proximity-order-trie. The Go code is
// compiled to WASM and most functions below mimic Javascript functions with
// the help of the Go package syscall/js.
//
// These functions, although programmed in Go, are callable from Javascript.
// Their Go signatures are uniform as is required by syscall/js. Their first
// parameter is always Javascript's `this`, the second the array of the actual
// JS arguments to the JS-side function call. There are no formal, visible
// signatures that would visually reveal, which parameters are expected.
//
// Functions are not Go-exported because they are not intended to be called
// directly by a Go function outside this package. The 'export' to Javascript
// is by the calls of Set(name, s.FuncOf(..)). This makes them part of the
// Javascript runtime that called into the Go code run as WASM. This makes
// Go doc less useful as it only lists exported functions and structures.
//
// Because the WASM code has to continually run, it is not technically a
// library and this package, therefore, has to be a `main` package.
//
// For more implementation details and rationale, see the Developer Notes in
// the manual in the doc/ folder.
//
// Note especially:
//
// (1) It is not possible to throw directly from Go to Javascript. Because
// the *Sync() functions are less relevant, syscall/js has not been modified
// to allow for throwing. See developer notes in doc/.
//
// (2) Numbers are stored in 8 byte IEEE 754 floating point format rather than
// strings because there are numerous NaNs that could cause the get() to return
// something else than the put() argument was. Additionally precision might
// change in fringe cases when converted, e.g., to a string and back.
//
// ---------------------------------------------------------------------------
package main

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/hex"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"os"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"syscall/js"
	"time"
	"unicode/utf8"

	. "github.com/ethersphere/proximity-order-trie" // . helps mocking
	"github.com/ethersphere/proximity-order-trie/pkg/persister"
)

var _ KeyValueStore = (*SwarmKvs)(nil)

// inBrowser is true when WASM is running in a browser. Else it must be node.js.
// This is detected and set first thing in main().
var inBrowser bool

// The Slot structures keep the state of the Go POT implementation that cannot
// be transferred to Javascript.  These are primarily the channels used by
// potjs.Index.muxProcess(). For a detailed rationale see the Developer Notes
// of the manual. Specifically regarding context channels in structures:
//
// https://pkg.go.dev/context has "Do not store Contexts inside a struct type",
// but https://go.dev/blog/context-and-structs details that this concretely
// means "do not pass a context into functions as part of a struct", plus,
// "do not store a context as element of an object, sharing it across methods."
// This is a different case as it provides the bridgehead this side of the
// language devide between Go and JS, and thus, the context is never passed
// around as part of the struct, it just serves to hold the context anywhere at
// all, a problem not discussed on those pages, whose main concern regarding
// structs is that the handling of contexts must not interfere with their
// destiny to be branched into a tree. This is not impeded by the Slot struct,
// which holds roots of contexts.
type Slot struct {
	Ref       int
	Ref32     string
	Ctx       context.Context
	Ls        persister.LoadSaver
	allowRaw  bool
	allowSync bool
	Kvs       *SwarmKvs
}

// maximal byte size of a value. This number is arbitrary to protect the system
// from failing in cryptic ways choking on oversize payload. It can be changed
// which affects only the threshold of an error message, not a system capacity.
var maxValueSize = 100000 // in byte including potential leading type byte.

// maximal size of a key. This is really the fix internal binary size of keys,
// which are 0-padded to 32 byte when needed. Keys do not have a type-coding
// first byte. But being a byte length, an UTF-8 string character count can
// be misleading. Both Go and Javascript use UTF-8 by default but Javascript
// considers the character count the string length, Go, the byte size.
const maxKeySize = 32 // in byte

// map of all slots
var slots = 0
var SlotMap = make(map[string]Slot)

// JS-side GC callback registry
var jsRegistry js.Value

// POT re-used in-memory storage. Must be for state consistency across calls.
// Is replaced by purge() to be garbage collected, for testing.
var inMemoryPersister persister.LoadSaver

// the payload function for the Go-created generic promise-creator function
type functionality func(ctx context.Context, this js.Value, parameters []js.Value, raw bool, caster func([]byte) (js.Value, error), sync bool) (r js.Value, ok bool)

// defaultFunc prevents crashing with 'object does not exist' after a
// Go-created JS function is released (freed for garbage collection).
// It is set as replacement where named functions are released but not for
// promise executors.
var defaultFunc js.Func

// falseFund is put in place for promise cancel functions after it is too
// late to cancel.
var falseFunc js.Func

// boolean atoms
const (
	FALSE = 0
	TRUE  = 1
)

// arguments for sync parameter
const (
	SYNC  = true
	ASYNC = false
)

// arguments for raw parameter
const (
	RAW   = true
	TYPED = false
)

// type bytes to mark what type the immediately following bytes were in JS.
const (
	NULL    = 0
	BOOLEAN = 1
	NUMBER  = 2
	STRING  = 3
	BYTES   = 4
)

// optimization settings
const (
	NONE     = 0
	STANDARD = 1
)

// default optimization level: releasing resources.
var optimization = STANDARD

// log levels. Don't affect the propagation of errors and exceptions.
const (
	CRIT  = 1
	ERR   = 2
	INFO  = 3
	DEB   = 4
	TRACE = 5
	FLAGS = 2048 // to modulo the following flags out
	MEM   = 2048
	NOCUT = 4096
	MSEC  = 8192
)

// default log level
var verbosity = DEB

// downgrade release error to info
// var silentFailedRelease = false

// pre-cooked, recyclable methods of all js KVS objects
// They are singled out because they are not auto garbage collected
var jsPut js.Func
var jsGet js.Func
var jsPutRaw js.Func
var jsGetRaw js.Func
var jsGetBoolean js.Func
var jsGetNumber js.Func
var jsGetString js.Func
var jsDelete js.Func
var jsPutSync js.Func
var jsGetSync js.Func
var jsPutRawSync js.Func
var jsGetRawSync js.Func
var jsGetBooleanSync js.Func
var jsGetNumberSync js.Func
var jsGetStringSync js.Func
var jsDeleteSync js.Func
var jsSave js.Func
var jsSaveSync js.Func
var jsRelease js.Func

// potmargin is the distance of the heap profile added to the logmargin
var potmargin = 16

// MAIN ----------------------------------------------------------------------

// main() exposes the functions to be called from JS-land, and stays running on
// 'stand-by'. The Javascript object `pot` is created as anchor-point for the
// general functions that are not specific to an individual KVS. Eventually,
// the OnWasmLoaded() function is called, if it exists, to signal readiness.
// This function never returns, it stays up by listening to a private channel
// as the intended way how to run a Go WASM module for JS.
func main() {

	// verbosity setting per variable
	v := js.Global().Get("potVerbosity")
	if v.Type() == js.TypeNumber {
		verbosity = v.Int()
		log(DEB, "verbosity set "+jsToString(v))
	}
	if v.Type() == js.TypeString {
		var err error
		intVer, err := strconv.ParseInt(v.String(), 0, 0)
		// catch confusion of path with verbosity value
		if err != nil {
			log(CRIT, "verbosity setting invalid: "+v.String())
		} else {
			verbosity = int(intVer)
			log(DEB, "verbosity set "+v.String())
		}
	}

	log(INFO, "» POTWASM")

	// optimization setting per variable
	o := js.Global().Get("potOptimization")
	if o.Type() == js.TypeNumber {
		optimization = o.Int()
	}

	// detect node.js or browser
	w := js.Global().Get("window")
	inBrowser = w.Type() == js.TypeObject
	if inBrowser {
		log(INFO, "» browser detected")
	} else {
		log(INFO, "» node.js detected")
	}

	// create pot module object
	if js.Global().Get("pot").IsUndefined() {
		js.Global().Set("pot", js.ValueOf(make(map[string]interface{})))
		jsPot := js.Global().Get("pot")
		jsPot.Set("Kvs", js.FuncOf(func(this js.Value, parameter []js.Value) interface{} {
			return newSync(this, parameter)
		}))
	}
	pot_ := js.Global().Get("pot")

	// Start JS per-object, weak-referenced GC release callback registry.
	// registry = new FinalizationRegistry((heldValue) => { .. })
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/FinalizationRegistry
	// CleanUps may never be called. This mechanism is to signal back to Go.
	jsRegistry = js.Global().Get("FinalizationRegistry").New(js.FuncOf(func(_ js.Value, p []js.Value) interface{} {

		/// check type, for abundance of caution

		ref32 := p[0].String()
		slot, exists := SlotMap[ref32]

		if !exists {
			//if !silentFailedRelease {
				log(CRIT, "### gc error: kvs to be released does not exist ‹"+ref32+"›")
			//} else {
			//	log(MEM, "⦿ release of ‹"+ref32+"› by gc attempted")
			//}
			return nil
		}

		log(MEM, colorMid+"⦿ release of kvs slot "+strconv.Itoa(slot.Ref)+colorOff)

		// -------------------------------------------------------------

		// stop mutex
		slot.Kvs.Close()

		// take resources offline. This will make slot unreachable.
		delete(SlotMap, ref32)

		// -------------------------------------------------------------
		return nil
	}))

	// The following js.Funcs are created once and not released for the
	// lifetime of the executable.

	// KVS-related
	// -------------------------------------------------
	pot_.Set("new", js.FuncOf(new_))
	pot_.Set("newSync", js.FuncOf(newSync))
	pot_.Set("load", js.FuncOf(load))
	pot_.Set("loadSync", js.FuncOf(loadSync))
	pot_.Set("gc", js.FuncOf(gc))
	pot_.Set("prune", js.FuncOf(prune))
	pot_.Set("purge", js.FuncOf(purge))
	pot_.Set("profile", js.FuncOf(profile))

	// support functions
	// -------------------------------------------------
	pot_.Set("hello", js.FuncOf(hello))
	pot_.Set("log", js.FuncOf(log_))
	pot_.Set("setOptimization", js.FuncOf(setOptimization))
	pot_.Set("getOptimization", js.FuncOf(getOptimization))
	pot_.Set("getGoHeapSize", js.FuncOf(getGoHeapSize))
	pot_.Set("getJSHeapSize", js.FuncOf(getJSHeapSize))
	pot_.Set("setVerbosity", js.FuncOf(__setVerbosity))
	pot_.Set("getVerbosity", js.FuncOf(getVerbosity))
	pot_.Set("setValueSizeLimit", js.FuncOf(setValueSizeLimit))
	pot_.Set("getValueSizeLimit", js.FuncOf(getValueSizeLimit))
	pot_.Set("byteSize", js.FuncOf(byteSize))
	pot_.Set("truncString", js.FuncOf(truncString))
	pot_.Set("bar", js.FuncOf(bar))

	// verbosity levels
	// -------------------------------------------------
	pot_.Set("NONE", 0)
	pot_.Set("CRITICAL", 1)
	pot_.Set("ERROR", 2)
	pot_.Set("INFO", 3)
	pot_.Set("DEBUG", 4)
	pot_.Set("TRACE", 5)
	pot_.Set("FLAGS", 2048)
	pot_.Set("MEMORY", 2048)
	pot_.Set("NOCUT", 4096)
	pot_.Set("MSEC", 8192)

	// test functions
	// -------------------------------------------------
	pot_.Set("testMode", js.FuncOf(testMode))
	pot_.Set("typeEncodedBytes", js.FuncOf(typeEncodedBytesTest))
	pot_.Set("typeDecodedValue", js.FuncOf(typeDecodedValueTest))
	pot_.Set("randKey", js.FuncOf(randKey))
	pot_.Set("randValue", js.FuncOf(randValue))
	pot_.Set("randBuffer", js.FuncOf(randBuffer))
	pot_.Set("hangingPromise", js.FuncOf(hangingPromise))
	pot_.Set("panickingPromise", js.FuncOf(panickingPromise))
	pot_.Set("setFail", js.FuncOf(setFail))
	pot_.Set("setPanic", js.FuncOf(setPanic))
	pot_.Set("setHang", js.FuncOf(setHang))
	pot_.Set("setDelay", js.FuncOf(setDelay))
	pot_.Set("setNoop", js.FuncOf(setNoop))

	// see defaultFunc declaration
	defaultFunc = js.FuncOf(func(_ js.Value, _ []js.Value) interface{} {
		log(ERR, "# released function, no effect")
		return js.Null
	})

	// see false Func declaration
	falseFunc = js.FuncOf(func(_ js.Value, _ []js.Value) interface{} {
		log(INFO, "# too late for cancel")
		return js.ValueOf(false)
	})

	// These are pre-cooked, re-usable functions for KVS objects that are
	// never released. This avoids creating new js.Funcs for every new
	// object. They are held in globals.
	jsPut = js.FuncOf(put)
	jsGet = js.FuncOf(get)
	jsPutRaw = js.FuncOf(putRaw)
	jsGetRaw = js.FuncOf(getRaw)
	jsGetBoolean = js.FuncOf(getBoolean)
	jsGetNumber = js.FuncOf(getNumber)
	jsGetString = js.FuncOf(getString)
	jsDelete = js.FuncOf(delete_)
	jsPutSync = js.FuncOf(putSync)
	jsGetSync = js.FuncOf(getSync)
	jsPutRawSync = js.FuncOf(putRawSync)
	jsGetRawSync = js.FuncOf(getRawSync)
	jsGetBooleanSync = js.FuncOf(getBooleanSync)
	jsGetNumberSync = js.FuncOf(getNumberSync)
	jsGetStringSync = js.FuncOf(getStringSync)
	jsDeleteSync = js.FuncOf(deleteSync)
	jsSave = js.FuncOf(save)
	jsSaveSync = js.FuncOf(saveSync)
	jsRelease = js.FuncOf(release)

	// colored output
	colorFlag := js.Global().Get("COLOR")
	if colorFlag.Type() == js.TypeBoolean && colorFlag.Bool() {
		colorLow = "\033[90m"
		colorMid = "\033[38;5;214m"
		colorMem = "\033[36m" // cyan
		colorOff = "\033[0m"
	}

	log(INFO, "» init done")

	// signal to pot-*.js that go wasm initialization is done
	if !js.Global().Get("_onPotInitialized").IsUndefined() {
		js.Global().Call("_onPotInitialized")
	}

	log(INFO, "» ready")

	// signal to user-js that go wasm initialization is done
	// This is separate from _onPot..() for sync-only uses.
	if !js.Global().Get("onPotInitialized").IsUndefined() {
		js.Global().Call("onPotInitialized")
	}

	// make program pause for its above-listed functions to stay available
	<-make(chan int)
}

// -----------------------------------------------------------------------------
//
//   Core Functionality
//
// -----------------------------------------------------------------------------
//
// As a rule, functions are split into a Javascript-facing part that is either
// asynchronous or synchronous; and a workhorse function, name starting on _
// that does the actual work, the same in both cases.

// NEW -------------------------------------------------------------------------

// JS pot.new_() asynchronously creates a new Swarm KVS, returning the promise
// for a Javascript object that anchors the KVS on the Javascript side, created
// in createMapObject(). On the Go POT-side, this is a strictly in-memory
// operation in all cases. It starts a multiplexer though that uses Go channels
// to sequence writes.
func new_(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, 3, "new", _new, false, nil)
}

// JS pot.newSync() synchronously creates a new Swarm KVS, returning
// a Javascript object that anchors the KVS on the Javascript side,
// created in createMapObject(). On the Go POT-side, this is a strictly
// in-memory operation in all cases. It starts a multiplexer though that uses
// Go channels to sequence writes.
func newSync(this js.Value, parameters []js.Value) (result interface{}) {

	return syncWrap(this, parameters, 3, "new", _new, false, nil)
}

// _new() is the workhorse function that handles sync and async calls for a new
// KVS. On the Go POT-side, this is a strictly in-memory operation in all cases.
// It starts a multiplexer though that uses Go channels to sequence writes.
func _new(ctx context.Context, this js.Value, parameters []js.Value, _ bool,
	_ func([]byte) (js.Value, error), sync bool) (result js.Value, ok bool) {

	// on panic, log, and return js Error object in first result position
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in new*(): " + toString(err)
			log(CRIT, msg)
			ok = false
			result = jsError(msg)
		}
	}()

	var ls persister.LoadSaver
	var allowSync bool

	// allow-raw parameter first to not create loadsavers in vain. /// TODO document or eliminate
	allowRaw := false
	if len(parameters) >= 4 {
		jsAllowRaw := parameters[3]
		if jsAllowRaw.Type() == js.TypeBoolean {
			allowRaw = jsAllowRaw.Bool()
		} else if jsAllowRaw.IsNull() || jsAllowRaw.IsUndefined() {
		} else {
			msg := "### error in new*(), invalid raw flag type, must be boolean"
			log(ERR, msg)
			return jsError(msg), false
		}
	}

	// no parameters beyond reference: in-memory
	if len(parameters) == 0 || len(parameters) >= 2 && (parameters[0].IsNull() || parameters[0].IsUndefined()) && (parameters[1].IsNull() || parameters[1].IsUndefined()) {
		// the in-memory persister is shared between KVS instances. It
		// has to be to allow for certain tests to work as if it was a
		// network persister.
		if inMemoryPersister == nil {
			// --------------------------------------------------------------
			inMemoryPersister = persister.NewInmemLoadSaver()
			// --------------------------------------------------------------
			log(INFO, "» created new in-memory persister")
		} else {
			log(DEB, "› reusing in-memory persister")
		}
		ls = inMemoryPersister
		allowSync = true

	} else if len(parameters) == 1 || len(parameters) >= 2 && (parameters[0].IsNull() || parameters[0].IsUndefined() != parameters[1].IsNull() || parameters[1].IsUndefined()) {

		// network parameters bee url and batch id. Both null is checked above.

		msg := "### error in new*(), undefined or null bee url or batch id"
		log(ERR, msg)
		return jsError(msg), false

	} else if len(parameters) >= 2 {

		// bee url

		if parameters[0].Type() != js.TypeString {
			msg := "### error in new*(), invalid bee url type, must be string"
			log(ERR, msg)
			return jsError(msg), false
		}
		beeAPIURL := parameters[0].String()
		if len(beeAPIURL) < 1 {
			msg := "### error in new*(), empty bee url"
			log(ERR, msg)
			return jsError(msg), false
		}

		// batch id

		if parameters[1].Type() != js.TypeString {
			msg := "### error in new*(), invalid batch id type, must be hex digit string"
			log(ERR, msg)
			return jsError(msg), false
		}
		if len(parameters[1].String()) != 64 {
			msg := "### error in new*(), invalid batch id hex string, must be 64 digits"
			log(ERR, msg)
			return jsError(msg), false
		}
		postageIDBytes, err := hex.DecodeString(parameters[1].String())
		if err != nil {
			msg := "### error in new*(): invalid batch id hex string"
			log(ERR, msg)
			return jsError(msg), false
		}

		log(DEB, "› using bee url : ‹"+beeAPIURL+"›")
		log(DEB, "› using batch id: ‹"+bHex(postageIDBytes)+"›")

		// browser and node.js must use different persisters. The one
		// for node.js has to be a Go/JS hybrid to deal with
		// synchronicity.
		if inBrowser {
			// --------------------------------------------------------------
			ls = persister.NewSwarmLoadSaver(beeAPIURL, postageIDBytes)
			// --------------------------------------------------------------
			log(INFO, "» created new generic swarm network loader")
			allowSync = false
		} else {
			// --------------------------------------------------------------
			ls = NewSwarmNodeJsLoadSaver(beeAPIURL, postageIDBytes, verbosity)
			// --------------------------------------------------------------
			log(INFO, "» created new hybrid swarm network loader")
			allowSync = true
		}
	}

	msg := "» new slot "+colorMid+strconv.Itoa(slots+1)+colorOff
	// pressing memory heap information into the same log line
	if verbosity&MEM == MEM {
		msglen := len("+ new slot " + strconv.Itoa(slots+1))
		msg = msg + spaces(potmargin-msglen)+_profile()
	}
	log(INFO, msg)

	// --------------------------------------------------------------
	kvs, err := NewSwarmKvs(ls)
	// --------------------------------------------------------------
	if err != nil {
		msg := "### error in new*(): " + err.Error()
		log(ERR, msg)
		return jsError(msg), false
	}

	// register context and kvs handle, take numerical index as handle
	slot_ref, ref32 := newID(slots, true)
	SlotMap[ref32] = Slot{Ctx: ctx, Kvs: kvs, Ref: slot_ref, Ref32: ref32, Ls: ls, allowRaw: allowRaw, allowSync: allowSync}

	log(DEB, "› slot ref: "+strconv.Itoa(slot_ref)+" "+ref32)

	return createMapObject(slot_ref, ref32), true
}

var preGen = make(map[int]string)

func newID(slot int, checkPre bool) (int, string) {

	// for simulation testing
	if checkPre {
		ref32, exists := preGen[slot]
		if exists {
			preGen = make(map[int]string)
			return slot, ref32
		}
	}

	// sequential
	slots = slots + 1 // = starting on 1.
	slot = slot + 1

	// random 32-byte
	bytes := make([]byte, 32)
	rand.Read(bytes)
	ref32 := bHex(bytes)
	log(TRACE, "∙ created 32 byte reference ‹"+ref32+"›")

	if !checkPre {
		preGen[slot] = ref32
	}

	return slot, ref32
}

// LOAD ------------------------------------------------------------------------

// JS pot.load() asynchronously loads an existing Swarm KVS JS object,
// using its 32-bytei save handle to return a promise to a KVS anchor object. This
// method will break for in-memory load-savers when the program is stopped and
// restarted, as they will lose their storage. It works for the connection to
// Swarm as the load-saver will then not be the instance where the data is stored
// but only the connection to the data, which is stored on Swarm.
func load(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, 4, "load", _load, false, nil)
}

// JS pot.loadSync() loads an existing Swarm KVS JS object, using its
// 32-byte save handle. This method will break for in-memory load-savers when
// the program is stopped and restarted, as they will lose their storage. It works
// for the connection to Swarm as the load-saver will then not be the instance
// where the data is stored but only the connection to the data, which is stored
// on Swarm.
func loadSync(this js.Value, parameters []js.Value) (result interface{}) {

	return syncWrap(this, parameters, 4, "load", _load, false, nil)
}

// _load() is the internal get function that handles load*() variants.
// It is blocking, and the async load() function wraps it into a promise.
func _load(ctx context.Context, this js.Value, parameters []js.Value, raw bool, caster func([]byte) (js.Value, error), sync bool) (result js.Value, ok bool) {

	// on panic, log, and return js Error object in first result position
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in load*(): " + toString(err)
			log(CRIT, msg)
			result = jsError(msg)
			ok = false
		}
	}()

	var ls persister.LoadSaver
	var allowSync bool

	log(INFO, "» load P.O.T. by reference")

	// check of parameter count
	if len(parameters) < 1 {
		msg := "### parameter count error: load*() requires KVS reference hex digit string as 1st parameter, got " + strconv.Itoa(len(parameters))
		log(ERR, msg)
		return jsError(msg), false
	}

	if parameters[0].Type() != js.TypeString {
		msg := "### error in load*(): KVS reference type error, must be hex digit string" /// separately catch empty
		log(ERR, msg)
		return jsError(msg), false
	}
	if len(parameters[0].String()) != 64 {
		msg := "### error in load*(): parameter size error for KVS reference, expected 64 hex digits"
		log(ERR, msg)
		return jsError(msg), false
	}

	jsRef := parameters[0].String()

	log(DEB, "› reference: "+jsRef)

	ref32, err := hex.DecodeString(jsRef)
	if err != nil {
		msg := "### error in load*(), decoding reference hex digits: " + err.Error()
		log(CRIT, msg)
		return jsError(msg), false
	}

	// 2nd + 3rd paramter: bee url and batch id

	// no parameters beyond reference: in-memory
	if len(parameters) == 1 || len(parameters) >= 3 && (parameters[1].IsNull() || parameters[1].IsUndefined()) && (parameters[2].IsNull() || parameters[2].IsUndefined()) {
		// the in-memory persister is shared between KVS instances. It
		// has to be to allow for certain tests to work as if it was a
		// network persister.
		if inMemoryPersister == nil {
			// --------------------------------------------------------------
			inMemoryPersister = persister.NewInmemLoadSaver()
			// --------------------------------------------------------------
			log(INFO, "» created new in-memory persister")
		} else {
			log(DEB, "› reusing in-memory persister")
		}
		ls = inMemoryPersister
		allowSync = true

	} else if len(parameters) == 2 || len(parameters) >= 3 && (parameters[1].IsNull() || parameters[1].IsUndefined() != parameters[2].IsNull() || parameters[2].IsUndefined()) {

		// network parameters bee url and batch id. Both null is checked above.

		msg := "### error in load*(), undefined or null bee url or batch id"
		log(ERR, msg)
		return jsError(msg), false

	} else if len(parameters) >= 3 {

		// bee url

		if parameters[1].Type() != js.TypeString {
			msg := "### error in load*(), invalid bee url type, must be string"
			log(ERR, msg)
			return jsError(msg), false
		}
		beeAPIURL := parameters[1].String()
		if len(beeAPIURL) < 1 {
			msg := "### error in load*(), empty bee url"
			log(ERR, msg)
			return jsError(msg), false
		}

		// batch id

		if parameters[2].Type() != js.TypeString {
			msg := "### error in load*(), invalid batch id type, must be hex digit string"
			log(ERR, msg)
			return jsError(msg), false
		}
		if len(parameters[2].String()) != 64 {
			msg := "### error in load*(), invalid batch id hex string, must be 64 digits"
			log(ERR, msg)
			return jsError(msg), false
		}
		postageIDBytes, err := hex.DecodeString(parameters[2].String())
		if err != nil {
			msg := "### error in load*(): invalid batch id hex string"
			log(ERR, msg)
			return jsError(msg), false
		}

		log(DEB, "› using bee url : ‹"+beeAPIURL+"›")
		log(DEB, "› using batch id: ‹"+bHex(postageIDBytes)+"›")

		// browser and node.js must use different persisters. The one
		// for node.js has to be a Go/JS hybrid to deal with
		// synchronicity.
		if inBrowser {
			// --------------------------------------------------------------
			ls = persister.NewSwarmLoadSaver(beeAPIURL, postageIDBytes)
			// --------------------------------------------------------------
			log(INFO, "» created new generic swarm network loader")
			allowSync = false
		} else {
			// --------------------------------------------------------------
			ls = NewSwarmNodeJsLoadSaver(beeAPIURL, postageIDBytes, verbosity)
			// --------------------------------------------------------------
			log(INFO, "» created new hybrid swarm network loader")
			allowSync = true
		}
	}

	if sync && !allowSync {
		msg := "### error in load*(): no sync calls to networks in-browser"
		log(ERR, msg)
		return jsError(msg), false
	}

	debug := ""
	if len(parameters) >= 3 {
		debug = "[" + jsToString(parameters[2]) + "]"
	}

	msg := "» load slot "+colorMid+strconv.Itoa(slots+1)+colorOff
	// pressing memory heap information into the same log line
	if verbosity&MEM == MEM {
		msglen := len("+ load slot " + strconv.Itoa(slots+1))
		msg = msg + spaces(potmargin-msglen)+_profile()
	}
	log(INFO, msg)

	var kvs *SwarmKvs

	// special case: 0-reference, create new KVS instead of loading as
	// Go POT will error and not return a new POT.
	if bytes.Equal(ref32, make([]byte, 32)) {

		// --------------------------------------------------------------
		kvs, err = NewSwarmKvs(ls)
		// --------------------------------------------------------------
	} else {
		// -------------------------------------------------------------------
		kvs, err = NewSwarmKvsReference(ctx, ls, ref32)
		// -------------------------------------------------------------------
	}
	if err != nil {
		msg := "### error in load*(): " + err.Error()
		log(ERR, msg)
		return jsError(msg), false
	}

	// register context and kvs handle, take numerical index as handle
	slot_ref, sref32 := newID(slots, true)
	SlotMap[sref32] = Slot{Ctx: ctx, Kvs: kvs, Ref: slot_ref, Ref32: sref32, Ls: ls, allowSync: allowSync}

	log(DEB, "› slot ref: "+debug+" "+strconv.Itoa(slot_ref)+" "+sref32)

	return createMapObject(slot_ref, sref32), true
}

// createMapObject() creates the JS KVS object that new*() and load*()
// return - directly or by promise -  and all put and get functions are members
// of.  Go context and persister are stored this side in a Slot map that
// ref32 is an key to.
func createMapObject(slot_ref int, ref32 string) js.Value {

	// create Javascript object
	jsMap := js.ValueOf(make(map[string]interface{}))

	// the numeric handle bridges preserved ctx and persister to JS.
	jsMap.Set("slot_ref", slot_ref)
	jsMap.Set("ref32", ref32)

	// add standard methods
	jsMap.Set("put", jsPut)
	jsMap.Set("get", jsGet)
	jsMap.Set("putRaw", jsPutRaw)
	jsMap.Set("getRaw", jsGetRaw)
	jsMap.Set("getBoolean", jsGetBoolean)
	jsMap.Set("getNumber", jsGetNumber)
	jsMap.Set("getString", jsGetString)
	jsMap.Set("delete", jsDelete)
	jsMap.Set("putSync", jsPutSync)
	jsMap.Set("getSync", jsGetSync)
	jsMap.Set("putRawSync", jsPutRawSync)
	jsMap.Set("getRawSync", jsGetRawSync)
	jsMap.Set("getBooleanSync", jsGetBooleanSync)
	jsMap.Set("getNumberSync", jsGetNumberSync)
	jsMap.Set("getStringSync", jsGetStringSync)
	jsMap.Set("deleteSync", jsDeleteSync)
	jsMap.Set("save", jsSave)
	jsMap.Set("saveSync", jsSaveSync)
	jsMap.Set("release", jsRelease)

	// this registers a clean up call when the JS GC finds the jsMap unreachable
	jsRegistry.Call("register", jsMap, ref32, jsMap)

	return jsMap
}

// GC --------------------------------------------------------------------------

// JS release() explicitly triggers the KVS resource clean up on the Go side.
// This is not the routine way of doing it but exists for memory tests.
// Garbage collection is generally automated across runtimes, see docs.
// Use of a JS KVS object after release is called is undefined behavior.
// At least, state and methods of the object will just not exist. There is
// no reason generally to use it in production as the gc will become active
// if space is needed. It could help to call release() to exercise control
// over when the delay caused by the garbage collector might be most tolerable.
func release(this js.Value, parameters []js.Value) (result interface{}) {

	jsRef32 := this.Get("ref32")

	if jsRef32.Type() != js.TypeString {
		msg := "### critical error: ref32 member missing or altered"
		log(CRIT, msg)
		return errors.New(msg)
	}
	ref32 := jsRef32.String()

	if len(ref32) != 64 {
		msg := "### critical error: ref32 member invalid"
		log(CRIT, msg)
		return errors.New(msg)
	}

	slot, exists := SlotMap[ref32]

	if !exists {
		msg := "### crtical error: invalid or expired slot reference ‹" + ref32 + "›"
		log(CRIT, msg)
		return errors.New(msg)
	}

	log(MEM, colorMid+"⦿ force release of kvs slot "+strconv.Itoa(slot.Ref)+colorOff)

	// -------------------------------------------------------------

	// stop mutex
	slot.Kvs.Close()

	// take resources offline. This will make the slot unreachable.
	delete(SlotMap, ref32)

	// unregister from JS garbage collection. WASM calls are single-thread.
	jsRegistry.Call("unregister", this)

	// -------------------------------------------------------------

	return js.ValueOf(slot.Ref)
}

// JS gc() triggers the Go garbage collector. Empirically, KVS objects are
// not collected on the JS side unless they are collected on the Go side, no
// matter the pressure put on the JS GC. The release happens some time after
// they get unreachable on both sides, but Go GC has to run. This function
// triggers that.
func gc(this js.Value, parameters []js.Value) (result interface{}) {

	log(MEM, colorMid+"⦿ Go GC forced"+colorOff+spaces(potmargin-14)+_profile())
	runtime.GC()
	log(MEM, spaces(potmargin)+_profile())

	return js.Null()
}

// JS prune() replaces the SlotMap with a copy of itself to shed buckets that
// are not needed any longer but Go maps cannot get rid of themselves.
func prune(this js.Value, parameters []js.Value) (result interface{}) {

	if optimization <= NONE {
		return js.Null()
	}

	log(MEM, colorMid+"⦿ map pruning"+colorOff+spaces(potmargin-13)+_profile())

	prunedMap := make(map[string]Slot)

	for key, value := range SlotMap {
		prunedMap[key] = value
	}

	SlotMap = prunedMap

	runtime.GC() /// take out?
	runtime.GC()

	log(MEM, spaces(potmargin)+_profile())

	return js.Null()
}

// JS flush() releases the network load saver and replaces it with a new one.
// This is for long-running servers to release memory that is not released 
// when a KVS becomes unreachable and is garbage collected. No warnings if no
// network loadSaver is actually used, e.g., when generally storing in-memory.
func flush(this js.Value, parameters []js.Value) (result interface{}) {

	log(MEM, colorMid+"⦿ flush cache"+colorOff+spaces(potmargin-13)+_profile())

	inMemoryPersister = persister.NewInmemLoadSaver()

	return js.Null()
}

// JS purge() deletes the in-memory load saver and replaces it with a new one.
// This means that all data stored in-memory is released and lost. This is
// mainly for tests. No warnings if no in-memory loadSaver is actually used,
// e.g., when generally storing to local network.
func purge(this js.Value, parameters []js.Value) (result interface{}) {

	log(MEM, colorMid+"⦿ purge store"+colorOff+spaces(potmargin-13)+_profile())

	inMemoryPersister = persister.NewInmemLoadSaver()

	return js.Null()
}

// SAVE ------------------------------------------------------------------------

// JS kvs.save() writes cached updates to the storage and returns a promise to a
// 32 byte reference to the saved KVS that is used to retrieve the trie later.
// It's one parameter is save(timeout).
func save(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, 1, "save", _save, false, nil)
}

// JS kvs.saveSync() writes cached updates to the storage and returns a 32 byte
// reference to the saved KVS that is used to retrieve the KVS later.
func saveSync(this js.Value, parameters []js.Value) (result interface{}) {

	return syncWrap(this, parameters, 1, "save", _save, false, nil)
}

// _save() is the workhorse function that handles sync and async calls to save
// a KVS.
func _save(ctx context.Context, this js.Value, parameters []js.Value, _ bool, _ func([]byte) (js.Value, error), sync bool) (result js.Value, ok bool) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in save: " + toString(err)
			log(CRIT, msg)
			ok = false
			result = jsError(msg)
		}
	}()

	log(INFO, "» saving storage")

	// get data slot of kvs
	slot, err := getSlot(this)

	if err != nil {
		msg := err.Error() + " in save*()"
		log(CRIT, msg)
		return jsError(msg), false
	}

	if sync && !slot.allowSync {
		msg := "### error in save*(): no sync calls to networks in-browser"
		log(ERR, msg)
		return jsError(msg), false
	}

	// -------------------------------------------------------------------
	ref32, err := slot.Kvs.Save(ctx)
	// -------------------------------------------------------------------
	if err != nil {
		// special case: empty pot
		if err.Error() == "failed to store pot root node is nil" {
			ref32 = make([]byte, 32)
			log(DEB, "› creating a 0 reference for empty KVS - ref32: "+bHex(ref32))
		} else {
			msg := "### error on saving: " + err.Error()
			log(ERR, msg)
			return jsError(msg), false
		}
	}

	ref32Hex := bHex(ref32)
	log(DEB, "› ref32: "+ref32Hex)

	return js.ValueOf(ref32Hex), true
}

// PUT -------------------------------------------------------------------------

// JS kvs.put() asynchronously stores a key-value pair, encoding the value type
// in the first byte of what is written to the storage. JS parameters are
// put(key, value, timeout, debugTag).  Returns a Javascript promise that
// returns null on success or throws a JS Error on failure.
func put(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, 3, "put", _put, TYPED, nil)
}

// JS kvs.putSync() synchronously stores a key-value pair, encoding the value
// type in the first byte of what is written to storage. It returns Javascript
// null on success or an JS error. It does not throw, see (1).
func putSync(this js.Value, parameters []js.Value) (result interface{}) {

	return syncWrap(this, parameters, 3, "put", _put, TYPED, nil)
}

// PUT RAW ---------------------------------------------------------------------

// JS kvs.putRaw() asynchronously stores a key-value pair in raw format.
// The key can be a string, number, or boolean.  Returns a Javascript promise
// for the kvs anchor object or throws a JS Error on failure.
func putRaw(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, 3, "putRaw", _put, RAW, nil)
}

// JS kvs.putRawSync() synchronously stores a key-value pair in raw format.
// The key can be a string, number, or boolean.
func putRawSync(this js.Value, parameters []js.Value) (result interface{}) {

	return syncWrap(this, parameters, 3, "putRaw", _put, RAW, nil)
}

// PUT -------------------------------------------------------------------------

// _put() is the internal put function that put() and putSync() are using
// to store a key-value pair, encoding the value type in the first byte.
// It handles raw, as well as type-coded; sync as well as async functions.
// The sync functions call it directly, blocking, the async functions wrap it
// into a promisses' executor that calls it asynchronously.
func _put(ctx context.Context, this js.Value, parameters []js.Value, raw bool, _ func([]byte) (js.Value, error), sync bool) (result js.Value, ok bool) {

	// on panic, log, and return js Error object in first result position
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in put*(): " + toString(err)
			log(CRIT, msg)
			result = jsError(msg)
			ok = false
		}
	}()

	// check parameter count
	if len(parameters) < 2 {
		msg := "### parameter count error: put*() requires 2, got " + strconv.Itoa(len(parameters))
		log(ERR, msg)
		return jsError(msg), false
	}

	// get data slot of kvs
	slot, err := getSlot(this)

	if err != nil {
		msg := err.Error() + " in put*()"
		log(CRIT, msg)
		return jsError(msg), false
	}

	// sync calls to networks deadlock for node
	if sync && !slot.allowSync {
		msg := "### error in put*(): no sync calls to networks in-browser"
		log(ERR, msg)
		return jsError(msg), false
	}

	key := parameters[0]
	bkey, kerr := jsToKey(key)

	if kerr != nil {
		msg := kerr.Error() + " in put*()" /// cover
		log(CRIT, msg)
		return jsError(msg), false
	}

	pkey, perr := pad(bkey)

	if perr != nil {
		msg := perr.Error() + " in put*()" /// cover
		log(CRIT, msg)
		return jsError(msg), false
	}

	var bValue []byte
	jsValue := parameters[1]

	if raw {

		// non-type coded
		bValue, err = jsToBytes(jsValue)

		if err != nil {
			msg := err.Error() + " in put*()"
			log(ERR, msg)
			return jsError(msg), false
		}

	} else {

		// type-coded
		bValue, err = typeEncodedBytes(jsValue)

		if err != nil {
			msg := "### put error: " + err.Error()
			log(ERR, msg)
			return jsError(msg), false
		}
	}

	if len(bValue) > maxValueSize {
		msg := "### put error: value too large (> " + strconv.Itoa(maxValueSize) + " bytes)"
		log(ERR, msg)
		return jsError(msg), false
	}

	// a fourth parameter accepts a lable that shows up in the log entry
	debug := ""
	if len(parameters) >= 4 {
		debug = "[" + jsToString(parameters[3]) + "]"
	}

	// -------------------------------------------------------------------
	err = slot.Kvs.Put(ctx, pkey, bValue)
	// -------------------------------------------------------------------
	if err != nil {
		msg := "### exception in put*(): " + err.Error()
		log(ERR, msg)
		return jsError(msg), false
	}

	log(INFO, "» put "+debug+" "+jsToString(key)+": "+jsToString(jsValue)+"")
	log(DEB, "› ⟶  "+bHex(pkey)+": "+bHex(bValue)+"")

	return js.Null(), true // meaning success
}

// GET -------------------------------------------------------------------------

// JS kvs.get() asynchronously retrieves a value for a key, decoding the value
// type in the first value byte and casting the value appropriately for JS.
// JS parameters are get(key, timeout, debugtag). Returns a Javascript promise
// for the value that throws a JS error on failure. A value that does not exist
// results in Javascript `undefined` being returned.
func get(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, 2, "get", _get, TYPED, nil)
}

// JS kvs.getSync() synchronously retrieves a value for a key, decoding the value
// type in the first value byte and casting the value appropriately for JS.
// It returns the retrieved value as Javascript value or a Javascript error.
// A value that does not exist results in Javascript `undefined` being returned.
func getSync(this js.Value, parameters []js.Value) (result interface{}) {

	return syncWrap(this, parameters, 2, "get", _get, TYPED, nil)
}

// GET RAW ---------------------------------------------------------------------

// JS kvs.getRaw() asynchronously retrieves a raw byte value for a key.
// If used on a value that was stored using put(), it returns the type code
// as first byte. putRaw() does not add this byte.
// getRaw() returns a promise for the value that will throw a JS error on
// failure.  A value that does not exist results in Javascript `undefined`
// being returned.
func getRaw(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, 2, "getRaw", _get, RAW, nil)
}

// JS kvs.getRawSync() synchronously retrieves a raw byte value for a key.
// If used on a value that was stored using put(), it returns the type code
// as first byte. putRaw() does not add this byte.
// getRawSync() returns the value or a JS error on failure. It does not throw,
// see (1). A value that does not exist returns a Javascript `undefined`.
func getRawSync(this js.Value, parameters []js.Value) (result interface{}) {

	return syncWrap(this, parameters, 2, "getRaw", _get, RAW, nil)
}

// GET BOOLEAN -----------------------------------------------------------------

// JS kvs.getBoolean() is the asynchronous Javascript function to retrieve a
// raw value as JS boolean. This function does NOT expect a leading type byte.
// It will not work on a number stored not using putRaw(), but return an error,
// as it checks the byte count. getBoolean() basically wraps a call to _get()
// in a promise to return a promise for the JS boolean value, and that will
// throw a JS error on failure. A value that does not exist results in
// a Javascript `undefined` being returned.
func getBoolean(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, 2, "get", _get, RAW, castBoolean)
}

// JS kvs.getBooleanSync() is the synchronous Javascript function to retrieve a
// raw value as JS boolean. This function does NOT expect a leading type byte.
// It basically wraps a blocking call to _get() and returns what that returns.
func getBooleanSync(this js.Value, parameters []js.Value) (result interface{}) {

	return syncWrap(this, parameters, 2, "get", _get, RAW, castBoolean)
}

// castBoolean() converts a byte pattern to a Javascript Boolean value.
// If the first byte is zero, in returns false, else true.
func castBoolean(bytes []byte) (js.Value, error) {

	if len(bytes) < 1 {
		return js.Undefined(), errors.New("no data byte")
	}

	if bytes[0] == 0 {
		return js.ValueOf(false), nil
	}
	return js.ValueOf(true), nil
}

// GET NUMBER ------------------------------------------------------------------

// JS kvs.getNumber() is the asynchronous Javascript function to retrieve a
// Javascript nunmber from a raw value. It does NOT expect the first byte to
// be the type code and will fail if the number was not stored with putRaw(),
// checking for the right byte size of the raw value. The raw value expected
// must be a 8 byte IEEE 754 float. This function but wraps a call to
// _getNumberSync() with a promise that will return the JS float or throw an
// error on failure.
func getNumber(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, 2, "get", _get, RAW, castNumber)
}

// JS kvs.getNumberSync() is the synchronous Javascript function to retrieve a
// Javascript nunmber from a raw value. It does NOT expect the first byte to
// be the type code and will fail if the number was not stored with putRaw(),
// checking for the right byte size of the raw value. The raw value expected
// must be a 8 byte IEEE 754 float. This function but wraps a call to
// _getNumberSync() and returns the JS float or a JS error on failure. It does
// not throw, see note (1).
func getNumberSync(this js.Value, parameters []js.Value) (result interface{}) {

	return syncWrap(this, parameters, 2, "get", _get, RAW, castNumber)
}

// castNumber() converts a byte pattern to a Javascript Number value.
// The expected format are 8 bytes IEEE 754 floating points.
func castNumber(bytes []byte) (js.Value, error) {

	if len(bytes) != 8 {
		return js.Undefined(), errors.New("wrong byte count of stored float")
	}

	return js.ValueOf(math.Float64frombits(binary.BigEndian.Uint64(bytes))), nil
}

// GET STRING ------------------------------------------------------------------

// JS kvs.getString() is the asynchronous Javascript function to retrieve a
// Javascript string from a raw value. It does NOT expect the first byte to
// be the type code and will return a wrong string if it was not stored with
// putRaw(), casting the type byte as non-printable control character.
// This function but wraps a call to _getStringSync() with a promise that will
// return the JS string or throw an error on failure.
func getString(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, 2, "get", _get, RAW, castString)
}

// JS kvs.getStringSync() is the synchronous Javascript function to retrieve a
// Javascript string from a raw value. It does NOT expect the first byte to
// be the type code and will return a wrong string if it was not stored with
// putRaw(), casting the type byte as non-printable control character.
// This function but wraps a call to _getStringSync() and returns its return
// value, which is a JS string or a JS error.
func getStringSync(this js.Value, parameters []js.Value) (result interface{}) {

	return syncWrap(this, parameters, 2, "get", _get, RAW, castString)
}

// castString() converts a byte pattern to a Javascript String value.
func castString(bytes []byte) (js.Value, error) {

	return js.ValueOf(string(bytes)), nil /// TEST fringe cases. 0 length?
}

// -----------------------------------------------------------------------------

// _get() is the internal get function that handles all get*() variants.
// It is blocking, and async get*() functions wrap it into a promise.
func _get(ctx context.Context, this js.Value, parameters []js.Value, raw bool, caster func([]byte) (js.Value, error), sync bool) (result js.Value, ok bool) {

	// on panic, log, and return js Error object in first result position
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in get*(): " + toString(err)
			log(CRIT, msg)
			result = jsError(msg)
			ok = false
		}
	}()

	wrap := func(err error) string { return "### error in get*(): " + err.Error() }

	// check of parameter count
	if len(parameters) < 1 {
		msg := "### parameter count error: get*() requires 1, got " + strconv.Itoa(len(parameters))
		log(ERR, msg)
		return jsError(msg), false
	}

	// get data slot of kvs
	slot, err := getSlot(this)

	if err != nil {
		msg := wrap(err)
		log(CRIT, msg)
		return jsError(msg), false
	}

	if sync && !slot.allowSync {
		msg := "### error in get*(): no sync calls to networks in-browser"
		log(ERR, msg)
		return jsError(msg), false
	}

	key := parameters[0]
	bkey, kerr := jsToKey(key)

	if kerr != nil {
		msg := wrap(kerr) /// cover
		log(CRIT, msg)
		return jsError(msg), false
	}

	pkey, perr := pad(bkey)

	if perr != nil {
		msg := wrap(perr) /// cover
		log(CRIT, msg)
		return jsError(msg), false
	}

	debug := ""
	if len(parameters) >= 3 {
		debug = "[" + jsToString(parameters[2]) + "]"
	}

	// -------------------------------------------------------------------
	bValue, err := slot.Kvs.Get(ctx, pkey)
	// -------------------------------------------------------------------

	// from here on, decide how to package the retrieved raw bytes

	var jsValue js.Value

	// Get returned an error
	if err != nil {

		// legit unset value, no error
		if err.Error() == "not found" {

			jsValue = js.Undefined()

		} else {

			// propagate error
			msg := wrap(err)
			log(ERR, msg)
			return jsError(msg), false
		}

	} else {

		// no error:
		// raw value handling
		if raw {
			if caster != nil {
				jsValue, err = caster(bValue)
				if err != nil {
					msg := wrap(err)
					log(ERR, msg)
					return jsError(msg), false
				}
			} else {
				jsValue = jsArrayFromBytes(bValue)
			}

		} else {

			// type-coded value
			jsValue, err = typeDecodedValue(bValue)
			if err != nil {
				msg := wrap(err)
				log(ERR, msg)
				return jsError(msg), false
			}
		}
	}

	log(INFO, "» get "+debug+" "+jsToString(key)+": "+jsToString(jsValue)+"")
	log(DEB, "› ⟵  "+bHex(pkey)+": "+bHex(bValue)+"")

	return jsValue, true // success
}

// DELETE ----------------------------------------------------------------------

// JS delete_() deletes a key-value pair from a KVS.
func delete_(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, 2, "delete", _delete, TYPED, nil)
}

// JS deleteSync() deletes a key-value pair from a KVS.
func deleteSync(this js.Value, parameters []js.Value) (result interface{}) {

	return syncWrap(this, parameters, 2, "delete", _delete, TYPED, nil)
}

// _delete() is the internal function that handles the delete*() variants.
// It is blocking, and async delete() wraps it into a promise.
func _delete(ctx context.Context, this js.Value, parameters []js.Value, _ bool, _ func([]byte) (js.Value, error), sync bool) (result js.Value, ok bool) {

	// on panic, log, and return js Error object in first result position
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in delete*(): " + toString(err)
			log(CRIT, msg)
			result = jsError(msg)
			ok = false
		}
	}()

	wrap := func(err error) string { return "### error in delete*(): " + err.Error() }

	// check of parameter count
	if len(parameters) < 1 {
		msg := "### parameter count error: delete*() requires 1, got none"
		log(ERR, msg)
		return jsError(msg), false
	}

	// get data slot of kvs
	slot, err := getSlot(this)

	if err != nil {
		msg := wrap(err)
		log(CRIT, msg)
		return jsError(msg), false
	}

	if sync && !slot.allowSync {
		msg := "### error in delete*(): no sync calls to networks in-browser"
		log(ERR, msg)
		return jsError(msg), false
	}

	key := parameters[0]
	bkey, kerr := jsToKey(key)

	if kerr != nil {
		msg := wrap(kerr) /// cover
		log(CRIT, msg)
		return jsError(msg), false
	}

	pkey, perr := pad(bkey)

	if perr != nil {
		msg := wrap(perr) /// cover
		log(CRIT, msg)
		return jsError(msg), false
	}

	debug := ""
	if len(parameters) >= 3 {
		debug = "[" + jsToString(parameters[2]) + "]"
	}

	// -------------------------------------------------------------------
	err = slot.Kvs.Delete(ctx, pkey)
	// -------------------------------------------------------------------

	if err != nil {

		msg := wrap(err)
		log(ERR, msg)
		return jsError(msg), false
	}

	log(INFO, "» delete "+debug+" "+jsToString(key))

	return js.Null(), true // success
}


// ITERATION -------------------------------------------------------------------

/*

// JS iteration() iterates through the trie of key-value pairs.
func iteration(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, 2, "iteration", _iteration, TYPED, nil)
}

// JS iteration() iterates through the trie of key-value pairs.
func iterationSync(this js.Value, parameters []js.Value) (result interface{}) {

	return syncWrap(this, parameters, 2, "iteration", _iteration, TYPED, nil)
}

// _iteration() is the internal function that handles the iteration*() variants.
// It is blocking. iteration() wraps it into a promise.
func _iteration(ctx context.Context, this js.Value, parameters []js.Value, _ bool, _ func([]byte) (js.Value, error), sync bool) (result js.Value, ok bool) {

	// on panic, log, and return js Error object in first result position
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in iteration*(): " + toString(err)
			log(CRIT, msg)
			result = jsError(msg)
			ok = false
		}
	}()

	n := 0
	pivot := make([]byte, 4)
	err := idx.Iterate(ctx, nil, pivot, func(e elements.Entry) (bool, error) {
		log("iteration")
		n++
		return false, nil
	})
	if err != nil {
		msg := "### error in iteration*(): " + toString(err)
		log(CRIT, msg)
		return jsError(msg), false
	}
	log("iterations: " + strconv.Itoa(n))
	return n, true
}

*/

// -----------------------------------------------------------------------------
//
//   Wrapper Functions
//
// -----------------------------------------------------------------------------
//
// syncWrap and promise are the two functions that turn the 'workhorse'
// functions (_get, _put, _load, _delete) into either async or sync versions.

// SYNC WRAP -------------------------------------------------------------------

func syncWrap(this js.Value, parameters []js.Value, timeOutPos int, name string, function functionality, raw bool, caster func([]byte) (js.Value, error)) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in " + name + ": " + toString(err)
			log(CRIT, msg)
			result = jsError(msg)
		}
	}()

	// get appropriate context
	ctx, _, err := createContext(timeOutPos, parameters, SYNC)

	// time out parameter may have had wrong type
	if err != nil {
		msg := err.Error() + " in " + name
		log(ERR, msg)
		return jsError(msg)
	}

	return first(function(ctx, this, parameters, raw, caster, SYNC))
}

// PROMISES --------------------------------------------------------------------

// promise() creates a Javascript promise. This function provides the
// promissification, it's a generic wrap. It receives the actual functionality
// to be performed by the executor of the created promise as function parameter
// of type `functionality`.
func promise(this js.Value, parameters []js.Value, timeOutPos int, name string, function functionality, raw bool, caster func([]byte) (js.Value, error)) (result interface{}) {

	// on panic, log, and return a promise that immediately rejects
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in " + name + ": " + toString(err)
			log(CRIT, msg)
			result = errorPromise(msg)
		}
	}()

	// get appropriate context
	ctx, ctxCancel, err := createContext(timeOutPos, parameters, ASYNC)

	// time out parameter may have had wrong type
	if err != nil {
		msg := err.Error() + " in " + name
		log(ERR, msg)
		return errorPromise(msg)
	}

	promise := js.Null()
	var jsCancel js.Func
	var executor js.Func

	// create the cancel function for the promise. Note that the executor
	// might already have resolved. ///// order
	jsCancel = js.FuncOf(func(_ js.Value, parameters []js.Value) interface{} {

		// this closure variable (that is a function) holds the
		// ctxCancel function of the context that communicates the
		// cancellation downwards to the Go POT functions.
		ctxCancel()

		log(INFO, "𐄂 "+name+" canceled")

		// signals that the cancel happened. The entire function is
		// replaced by a function returning only false, once it is
		// too late to cancel.
		return js.ValueOf(true)
	})

	executor = js.FuncOf(func(_ js.Value, handler_parameters []js.Value) (result interface{}) {

		resolve := handler_parameters[0]
		reject := handler_parameters[1]

		// on panic (in 'function'), log, and return js Error object
		defer func() {
			if err := recover(); err != nil {
				msg := "### panic in " + name + ": " + toString(err)
				log(CRIT, msg)
				reject.Invoke(msg)
			}
		}()

		go func() {

			jsvalue_or_jserr, ok := function(ctx, this, parameters, raw, caster, ASYNC)

			if ok {
				resolve.Invoke(jsvalue_or_jserr)
			} else {
				reject.Invoke(jsvalue_or_jserr)
			}

			// This leads to the cancel function disappearing once
			// the promise has been resolved.
			// but promise.Set("cancel", js.Null) is not possible
			// here as it would require a circular order of
			// definitions
			if optimization > NONE {
				jsCancel.Release()
			}
		}()

		// free the resources used for this function after use
		if optimization > NONE {
			executor.Release()
		}

		return nil
	})

	// create the JS promise object
	promise = js.Global().Get("Promise").New(executor)

	// attach the cancel function to the promise object.
	promise.Set("cancel", jsCancel)

	return promise
}

// errorPromise(), to throw an error, returns a promise that immediately rejects.
// This combines conforming to the requirement that a promise needs to be
// returned by some function; with the need to throw an exception for an error.
// Calling a promise's reject function is the only way an exception can be
// triggered from syscall/js.
func errorPromise(msg string) js.Value {

	var executor js.Func
	doubleEntry := false
	executor = js.FuncOf(func(_ js.Value, parameters []js.Value) interface{} {

		reject := parameters[1]

		// on panic, log, and reject
		defer func() {
			if err := recover(); err != nil {
				msg := "### panic in error promise executor: " + toString(err) + " on delivering ‹" + msg + "›"
				log(CRIT, msg)
				reject.Invoke(msg)
			}
		}()

		// should never happen. To monitor/protect function release.
		if doubleEntry {
			panic("double entry to errorPromise executor")
		}
		doubleEntry = true

		log(ERR, "xxx rejection thrown: "+msg)

		reject.Invoke(jsError(msg))

		if optimization > NONE {
			executor.Release()
		}

		return nil
	})

	return js.Global().Get("Promise").New(executor)
}

// -----------------------------------------------------------------------------
//
//   Support Functions
//
// -----------------------------------------------------------------------------

// NOTATION --------------------------------------------------------------------

// iif() returns the second value if the first is true, else the third
func iif[T any](cond bool, onTrue T, onFalse T) T {
	if cond {
		return onTrue
	}
	return onFalse
}

// first() returns the first of two return values
func first[T, U any](val T, _ U) T {
	return val
}

// ERROR AND LOGGING -----------------------------------------------------------

// jsError() creates a Javascript error object from a message string
func jsError(msg string) js.Value {
	return js.Global().Get("Error").New(msg)
}

// set in main() if JS COLOR is true
var colorLow = ""
var colorMid = ""
var colorMem = ""
var colorOff = ""

var logrex = regexp.MustCompile(`([0-9a-fA-Fx]{32})([0-9a-fA-Fx]+)`)

// log() makes a standardized log message to browser console or terminal,
// respecting the verbosity setting as set through setVerbosity(). The default
// is that almost all messages are logged. Messages whose level is too low, are
// ignored. NONE, CRITICAL and ERROR are logged to stderr, higher to stdout.
func log(level int, msg string) {

	cut := verbosity&NOCUT == 0

	// log if set verbosity level is matched or exceeded
	log := verbosity%FLAGS >= level

	// or, log if it is a MEM and MEMORY is set in the verbosity level
	log = log || (verbosity&level&MEM == MEM)

	if !log {
		return
	}

	t := ""
	if verbosity&MSEC == MSEC {
		t0 := strconv.Itoa(int(time.Now().UnixMilli() % 1000))
		t = strings.Repeat("0", 3-len(t0)) + t0
	}

	// abbreviate long strings and hex numbers unless TRACE level is on
	if cut {
		msg = logrex.ReplaceAllString(msg, "$1…")
	}

	// reduce trailing white space
	white1 := "  "
	white2 := "  "
	if len(t) < 1 {
		white1 = ""
	}
	if len(msg) < 1 {
		white2 = ""
	}

	// log to stderr for CRITICAL and ERROR, else to stdout
	if level <= ERR {
		fmt.Fprintln(os.Stderr, "pot:"+white1+t+white2+msg)
	} else {
		fmt.Println("pot:"+white1+t+white2+msg)
	}
}

// JS pot.log_() can be called from Javascript to test the log() function that,
// with a prefixed "pot: ", writes directly to stdout. This can be used to
// confirm that the connection to the WASM executable is operational. The
// function is called as pot.log() from Javascript (see main()).
// TEST second parameter
func log_(this js.Value, parameters []js.Value) interface{} {

	msg := "" // note empty log() allowed for line break
	if len(parameters) >= 1 {
		msg = parameters[0].String()
	}

	// optional log level
	var level = INFO
	if len(parameters) >= 2 {
		if parameters[1].Type() == js.TypeNumber {
			level = parameters[1].Int()
		}
	}

	log(level, msg)

	return nil
}

// JS pot.setVerbosity() can be called from Javascript to control which log()
// calls should be suppressed. It returns the previoius setting. Levels are:
//
// 0  NONE	no logging
// 1  CRITICAL	logs only errors that appear to arise from a POT JS malfunction.
// 2  ERROR	programming and runtime errors are also logged.
// 3  INFO	general runtime information is logged.
// 4  DEBUG	specific data, like put and get keys and values are logged.
// 5  TRACE	certain steps through the program and full numbers.
//
// Note that the log prints to screen when running POT JS with node.js. In the
// browser, it logs into the browser console.
// Because the default level is 4 = DEBUG, a production program will always use
// setVerbosity() to change that. DEBUG is set for testing and learning. /// TEST
func __setVerbosity(_ js.Value, parameters []js.Value) interface{} {

	before := verbosity

	if len(parameters) > 0 {
		p := parameters[0]
		if p.Type() != js.TypeNumber {
			return jsError("parameter type error. Number expected.")
		}
		if p.Int() < 0 || p.Int()%MEM > TRACE {
			return jsError("parameter range error.")
		}

		verbosity = p.Int()
	}

	return before
}

// JS pot.getVerbosity() can be called to learn the current verbosity level.
func getVerbosity(_ js.Value, _ []js.Value) interface{} {

	return verbosity
}

// SIZE LIMITS -----------------------------------------------------------------

// JS setValueSizeLimit() sets the limit beyond which a value is rejected with an
// error. This function sets an arbitrary value to protect an application. The
// limit is in bytes (not characters).
//
// The factual value size limit depends on the underlying system (OS, hardware)
// setup. For network use with node.js it is beyond 100,000 byte; for in-browser
// use, with network, it is beyond 10,000,000.
func setValueSizeLimit(_ js.Value, parameters []js.Value) interface{} {

	before := maxValueSize

	if len(parameters) > 0 {
		p := parameters[0]
		if p.Type() != js.TypeNumber {
			return jsError("parameter type error. Number expected.")
		}
		if p.Int() < 0 || p.Int() > 1000000000000 {
			return jsError("parameter range error. 0-1TB are valid.")
		}

		maxValueSize = p.Int()
	}

	return before
}

// JS getValueSizeLimit() returns the size limit beyond which a value is rejected.
func getValueSizeLimit(_ js.Value, _ []js.Value) interface{} {

	return maxValueSize
}

// JS byteSize() returns the byte size of a string. It is redundant to JS
// Textencoder use that can likewise return the UTF-8 byte size but is provided
// for safety to reduce error potential and required learning about internals.
// With this support function, it is unambiguous whether a key or value will
// fit. The function returns parameter errors as error objects.
func byteSize(_ js.Value, parameters []js.Value) interface{} {

	if len(parameters) > 0 {
		p := parameters[0]
		if p.Type() != js.TypeString {
			return jsError("parameter type error. String expected.")
		}

		return len(p.String()) // len() returns byte size
	}
	return jsError("missing string parameter.")
}

// JS byteSize() returns the byte size of a string. It is redundant to JS
// Textencoder use that can likewise return the UTF-8 byte size but is provided
// for safety to reduce error potential and required learning about internals.
// The function returns parameter errors as error objects.
func truncString(_ js.Value, parameters []js.Value) interface{} {

	log(TRACE, "∙ truncString() started ")
	t0 := time.Now().UnixMilli()

	if len(parameters) < 2 {
		log(TRACE, "∙ truncString() fails")
		return jsError("missing parameter. String and size expected.")
	}

	jsStr := parameters[0]
	jsMax := parameters[1]

	if jsStr.Type() != js.TypeString {
		log(TRACE, "∙ truncString() fails")
		return jsError("parameter type error. String expected as first argument.")
	}

	if jsMax.Type() != js.TypeNumber {
		log(TRACE, "∙ truncString() fails")
		return jsError("parameter type error. Number expected as second argument.")
	}

	str := jsStr.String()
	max := jsMax.Int()

	if len(str) <= max {
		t := time.Now().UnixMilli() - t0
		log(TRACE, "∙ truncString() done ("+strconv.Itoa(int(t))+"ms)")
		return str
	}

	i := max
	for ; i > 0; i-- {
		cut := str[:i]
		if utf8.ValidString(cut) {
			t := time.Now().UnixMilli() - t0
			log(TRACE, "∙ truncString() done ("+strconv.Itoa(int(t))+"ms)")
			return cut
		}
	}
	t := time.Now().UnixMilli() - t0
	log(TRACE, "∙ truncString() fails ("+strconv.Itoa(int(t))+"ms)")
	return jsError("no valid utf-8 slice found within given length")
}

func npad(n int, w int) string {

	s := strconv.Itoa(n)
	if len(s) < w {
		s = strings.Repeat(" ", w-len(s)) + s
	}
	return s
}

// tailpad returns a string of spaces at maximum w minus length of sbut at least
// one.
func tailpad(s string, w int) string {

	if len(s) < w {
		return strings.Repeat(" ", w-len(s))
	}
	return " "
}

// spaces returns a string of spaces at maximum w length but at least one.
func spaces(w int) string {

	if w > 0 {
		return strings.Repeat(" ", w)
	}
	return " "
}

// MEMORY PROFILING ------------------------------------------------------------

var useColor bool

func getGoHeapSize(_ js.Value, _ []js.Value) interface{} {

	// Go memory stats
	var goMem runtime.MemStats
	runtime.ReadMemStats(&goMem)
	return goMem.Alloc
}

func getJSHeapSize(_ js.Value, _ []js.Value) interface{} {

	// JS memory stats / node.js
	process := js.Global().Get("process")
	if !process.IsUndefined() {
		memUse := process.Get("memoryUsage")
		if !memUse.IsUndefined() {
			return process.Call("memoryUsage").Get("heapUsed").Int()
		}
	}

	// JS memory stats / Chrome - avoiding promise of measureUserAgentSpecificMemory
	performance := js.Global().Get("performance")
	if !performance.IsUndefined() {
		memory := performance.Get("memory")
		if !memory.IsUndefined() {
			return memory.Get("usedJSHeapSize").Int()
		}
	}

	return js.Null()
}

func profile(_ js.Value, _ []js.Value) interface{} {

	return _profile()
}

func _profile() string {

	// Go memory stats
	var goMem runtime.MemStats
	runtime.ReadMemStats(&goMem)
	p := "Go heap " + npad(int(goMem.Alloc/1024), 6) + "K " + _bar(int(goMem.Alloc))

	// JS memory stats / node.js
	process := js.Global().Get("process")
	if !process.IsUndefined() {
		memUse := process.Get("memoryUsage")
		if !memUse.IsUndefined() {
			mem := process.Call("memoryUsage").Get("heapUsed").Int()
			p = p + " JS heap " + npad(mem/1024, 6) + "K " + _bar(mem)
		}
	}

	// JS memory stats / Chrome - avoiding promise of measureUserAgentSpecificMemory
	performance := js.Global().Get("performance")
	if !performance.IsUndefined() {
		memory := performance.Get("memory")
		if !memory.IsUndefined() {
			mem := memory.Get("usedJSHeapSize").Int()
			p = p + " JS heap " + npad(mem/1024, 6) + "K " + _bar(mem)
		}
	}

	return colorMem + p + colorOff
}

// JS bar returns a UTF-8 character bar graphic representing a number, the 1st
// argument.
func bar(_ js.Value, p []js.Value) interface{} {
	return _bar(p[0].Int())
}

// _bar returns a UTF-8 character bar graphic representing n.
func _bar(n int) string {
	n = n / 1000
	var bar string
	bar = strings.Repeat("᠁ ", n/10000000) +
		strings.Repeat("▢ ", n%10000000/2000000) +
		strings.Repeat("▩ ", n%2000000/100000) +
		strings.Repeat("❚", n%100000/10000) +
		strings.Repeat("❘", (n%10000)/1000)
	if len(bar) == 0 {
		bar = "∙" + strings.Repeat("∙", (n%1000)/100)
	}
	if len(bar) < 60 { // = 20 characters
		bar = bar + strings.Repeat(" ", 20-len(bar)/3)
	}
	return bar
}

// OPTIMIZATION ----------------------------------------------------------------

// JS pot.setOptimization() can be used to switch off resource release to
// test for change in behavior or failures. Returns previous setting.
//
// 0  NONE	no resource release
// 1  STANDARD	resources, mainly functions, are released to prevent leaks
//
// The default setting is STANDARD.
func setOptimization(_ js.Value, parameters []js.Value) interface{} {

	before := optimization

	if len(parameters) > 0 {
		p := parameters[0]
		if p.Type() != js.TypeNumber {
			return jsError("parameter type error. Number expected.")
		}
		if p.Int() < 0 || p.Int() > STANDARD {
			return jsError("parameter range error. 0-1 are valid.")
		}

		// set
		optimization = p.Int()
	}

	return before
}

// JS pot.getOptimization() returns the current setting of resource release.
func getOptimization(_ js.Value, _ []js.Value) interface{} {

	return optimization
}

// SLOTS AND CONTEXT -----------------------------------------------------------

// getSlot() securely retrieves the slot information from the slot list going
// by the slot index stored in the JS KVS object, ref32 attribute. It also
// double checks the index by the double-link in the slot structure, `Ref`.
func getSlot(this js.Value) (Slot, error) {

	jsSlotRef := this.Get("slot_ref") /// TODO cover corruptingly removed element
	jsSlotRef32 := this.Get("ref32")

	if jsSlotRef.Type() != js.TypeNumber {
		return Slot{}, errors.New("### critical error: slot_ref member missing or altered")
	}
	slotRef := jsSlotRef.Int()

	if slotRef < 1 || slotRef > slots { // starts at 1
		return Slot{}, errors.New("### critical error: slot_ref member invalid")
	}

	if jsSlotRef32.Type() != js.TypeString {
		return Slot{}, errors.New("### critical error: ref32 member missing or altered")
	}
	ref32 := jsSlotRef32.String()

	if len(ref32) != 64 {
		return Slot{}, errors.New("### critical error: ref32 member invalid")
	}

	slot, exists := SlotMap[ref32]

	if !exists {
		return Slot{}, errors.New("### crtical error: invalid or expired slot references ‹" + strconv.Itoa(slotRef) + "› ‹" + ref32 + "›")
	}

	if slot.Ref != slotRef {
		return Slot{}, errors.New("### crtical error: slot double link broken, slot ‹" + ref32 + "› has ‹" + strconv.Itoa(slot.Ref) + "› expected to be ‹" + strconv.Itoa(slotRef) + "›")
	}

	return slot, nil
}

// createContext() returns the right context (plain Background, WithTimout, or
// WithCancel) for a call coming from Javascript by inspecting the JS parameters
// shared by the calling function.
func createContext(position int, parameters []js.Value, sync bool) (ctx context.Context, cancel context.CancelFunc, err error) {

	// `position` is the place, counted from 1, in which the timeout argument
	// is expected by the calling function that shared its `parameters`.
	if len(parameters) >= position {
		p := parameters[position-1]
		if p.Type() == js.TypeNumber {
			timeout := p.Int()
			if timeout > 0 {
				log(TRACE, "∙ create timing out context of "+strconv.Itoa(timeout)+" ms")
				ctx, cancel = context.WithTimeout(context.Background(), time.Duration(timeout)*time.Millisecond)
			}
		} else if !p.IsNull() && !p.IsUndefined() {
			log(ERR, "### timeout parameter type error")
			return nil, nil, errors.New("wrong type of timeout argument")
		}
	}

	if ctx == nil {
		if !sync {
			log(TRACE, "∙ create cancellable context")
			ctx, cancel = context.WithCancel(context.Background())
		} else {
			log(TRACE, "∙ create basic context")
			ctx = context.Background()
			cancel = nil
		}
	}

	return ctx, cancel, nil
}

// STRINGS AND BYTES -----------------------------------------------------------

// pad(), for keys, adds 0s to a byte array to attain a lenght of 32 bytes.
func pad(key []byte) ([]byte, error) {

	if len(key) < 32 {
		key = append(key, bytes.Repeat([]byte{0}, 32-len(key))...)
	}

	return key, nil
}

// jsToKey() casts a JS value to a Go byte array to use as key for putting or
// getting. There is NO type code. It accepts numbers, strings, and Uint8Array
// byte buffers. Numbers are converted to their float byte representation.
// "1", 1, and "0x01" will thus be different keys but 1, 1.0, 0x1 and 01 the
// same. This makes sense because there is no strong way in JS to tell integer
// and float apart as JS knows only one unified Number type. Strings and byte
// arrays are length-checked to be <= 32 byte.
func jsToKey(p js.Value) ([]byte, error) {

	switch p.Type() {

	case js.TypeNumber:
		b := make([]byte, 8)
		binary.BigEndian.PutUint64(b, math.Float64bits(p.Float()))
		return b, nil

	case js.TypeString:
		b := []byte(p.String())
		if len(b) > 32 { // note, len = number of bytes
			return nil, errors.New("key string too long") /// TEST
		}
		if len(b) == 0 { // note, len = number of bytes
			return nil, errors.New("empty key string") /// TEST
		}
		return []byte(p.String()), nil

	case js.TypeObject:
		if !p.InstanceOf(js.Global().Get("Uint8Array")) {
			return nil, errors.New("wrong object type for a key, accepting number, string, Uint8Array") /// TEST
		}
		if p.Length() == 0 {
			return nil, errors.New("empty key bytes") /// TEST
		}
		if p.Length() > 32 {
			return nil, errors.New("key byte-array too long") /// TEST
		}
		b := make([]byte, p.Length())
		for i := 0; i < p.Length(); i++ {
			e := p.Index(i)
			if e.Type() != js.TypeNumber {
				return nil, errors.New("wrong type of element for a key array: " + e.Type().String()) /// TEST
			}
			n := e.Int()
			if n < 0 || n > 255 {
				return nil, errors.New("out of range element for a key array: " + strconv.Itoa(n) + " instead of 0-255") /// TEST
			}
			b[i] = byte(p.Index(i).Int())
		}

		// double check
		if len(b) < 0 || len(b) > 32 {
			return nil, errors.New("key byte-array too long") /// TEST
		} else if len(b) == 0 {
			return nil, errors.New("empty key array") /// TEST
		}
		return b, nil
	}

	return nil, errors.New("wrong type for a key: " + p.Type().String() + ", accepting number, string, Uint8Array") /// TEST
}

// jsToBytes() casts from any JS value to Go byte array, for values to be
// stored. No type code byte is added to what is stored. The function accepts
// all JS types that Go's syscall/js support: Undefined, Null, Boolean, Number,
// String, Symbol, Object (to Uint8Array) and Function. But it returns an error
// for those that are not sensical as KVS values, i.e. Undefined, Symbol and
// Function. Numbers are converted to their float byte representation. "1", 1,
// and "0x01" will thus be be stored as different values but 1, 1.0, 0x1 and 01
// the same. There is no strong way to tell integer and float apart as JS knows
// only one unified Number type, except for Big Nums which are not supported by
// syscall/js.
func jsToBytes(p js.Value) ([]byte, error) {

	switch p.Type() {
	case js.TypeUndefined:
		return nil, errors.New("value of Undefined type cannot be stored.")
	case js.TypeNull:
		return []byte{NULL}, nil
	case js.TypeBoolean:
		if p.Bool() {
			return []byte{TRUE}, nil
		}
		return []byte{FALSE}, nil
	case js.TypeNumber:
		b := make([]byte, 8)
		binary.BigEndian.PutUint64(b, math.Float64bits(p.Float()))
		return b, nil
	case js.TypeString:
		return []byte(p.String()), nil
	case js.TypeSymbol:
		return nil, errors.New("value of Symbol type cannot be stored.")
	case js.TypeObject: // JS Uint8Array
		b := make([]byte, p.Length())
		for i := 0; i < p.Length(); i++ {
			b[i] = byte(p.Index(i).Int())
		}
		return b, nil
	case js.TypeFunction:
		return nil, errors.New("value of Function type cannot be stored.")
	}

	// fallback could catch if syscall/js was enhanced to support more types.
	return nil, errors.New("type cannot be converted to bytes: " + p.Type().String())
}

// jsArrayFromBytes() creates a JS Uint8Array from a Go []byte array.
func jsArrayFromBytes(value []byte) js.Value {

	size := len(value)
	dst := js.Global().Get("Uint8Array").New(size)
	if got := js.CopyBytesToJS(dst, value); got != size {
		panic("XXX byte copy failure") // memory issue
	}
	return dst
}

// jsToString returns a Go string for any type js.Value. The function is used
// exclusively for logging and debugging, thus does not error or panic but just
// returns "[unprintable]" when it fails. It does not cover Symbol and Function
// types.
func jsToString(p js.Value) string {

	switch p.Type() {
	case js.TypeNull:
		return "null"
	case js.TypeUndefined:
		return "undefined"
	case js.TypeBoolean:
		if p.Bool() {
			return "true"
		}
		return "false"
	case js.TypeNumber:
		return strconv.FormatFloat(p.Float(), 'f', -1, 64)
	case js.TypeString:
		return p.String()
	case js.TypeObject: // JS Uint8Array: int list
		b := make([]byte, p.Length())
		for i := 0; i < p.Length(); i++ {
			b[i] = byte(p.Index(i).Int())
		}
		return bHex(b)
	case js.TypeSymbol:
		return "[symbol]"
	case js.TypeFunction:
		return "[function]"
	}
	return "[unknown type]"
}

// typeEncodedBytes() encodes values from JS value to a go byte array leading
// in with a type byte. The code is:
//
// |  byte  const     Javascript   Go          excl.   incl. type byte
// |
// |    0   NULL      null         nil          0+      1+
// |    1   BOOLEAN   boolean      bool         1+      2+
// |    2   NUMBER    number       float64      8       9
// |    3   STRING    string       string       0+      1+
// |    4   BYTES     Uint8Array   []byte       0+      1+
// |
func typeEncodedBytes(p js.Value) (result []byte, rerr error) {

	defer func() {
		if err := recover(); err != nil { /// TEST
			msg := "### error in typeEncodedBytes(): " + toString(err)
			log(CRIT, msg)
			result = nil
			rerr = errors.New(msg)
		}
	}()

	switch p.Type() {

	case js.TypeNull: /// TEST
		return []byte{NULL}, nil

	case js.TypeBoolean:
		if p.Bool() {
			return []byte{BOOLEAN, TRUE}, nil
		} else {
			return []byte{BOOLEAN, FALSE}, nil
		}

	case js.TypeNumber:
		b := make([]byte, 8)
		binary.BigEndian.PutUint64(b, math.Float64bits(p.Float()))
		return append([]byte{NUMBER}, b...), nil
		// alterante storing as string (see (2)):
		// return append([]byte{2}, []byte(fmt.Sprintf("%g", p.Float()))...)

	case js.TypeString:
		return append([]byte{STRING}, []byte(p.String())...), nil

	case js.TypeObject: // JS Uint8Array
		b := make([]byte, p.Length()+1)
		b[0] = BYTES
		for i := 0; i < p.Length(); i++ {
			b[i+1] = byte(p.Index(i).Int())
		}
		return b, nil
	}

	// other types are Undefined, Symbol and Function
	return nil, errors.New("wrong type to convert to type coded value: " + p.Type().String()) /// TEST

}

// JS pot.typeEncodedBytesTest() is for unit testing typeEncodedBytes() from JS.
// Note that it's exclusively used for testing, never for production, and it
// must comply to JS interface standards of syscall/js and thus can only return
// one value. It does not get parameter checks because it is only ever called
// by test suites.
var ixx interface{}

func typeEncodedBytesTest(this js.Value, parameters []js.Value) interface{} {

	v := parameters[0]

	r, err := typeEncodedBytes(v)

	if err != nil {
		msg := "### error: " + err.Error()
		log(CRIT, msg)
		return jsError(msg)
	}

	b := jsArrayFromBytes(r)

	if err != nil {
		msg := "### error: " + err.Error()
		log(CRIT, msg)
		return jsError(msg)
	}

	return b
}

// typeDecodedValue() decodes values from a Go byte array leading in with a
// type byte, to a JS Value. Only used in _get(). Errors on invalid type byte.
func typeDecodedValue(p []byte) (result js.Value, rerr error) {

	defer func() {
		if err := recover(); err != nil {
			msg := "### error in function typeDecodedValue(): " + toString(err)
			log(CRIT, msg)
			result = js.Undefined()
			rerr = errors.New(msg)
		}
	}()

	if len(p) == 0 {
		return js.Undefined(), nil
	}

	// branch over all valid type code bytes. Note that above, `undefined`
	// is what is returned for a non-existing value, the empty byte array.
	// TEST if this is ever happening? 'not found' is returned from pot
	// for unset/non-existing key-values.
	switch p[0] {
	case NULL:
		return js.Null(), nil
	case BOOLEAN:
		if p[1] != FALSE {
			return js.ValueOf(true), nil
		} else {
			return js.ValueOf(false), nil
		}
	case NUMBER:
		if len(p) != 9 {
			return js.Null(), errors.New("wrong byte count stored for float number: " + bHex(p))
		}
		f := math.Float64frombits(binary.BigEndian.Uint64(p[1:]))
		return js.ValueOf(f), nil
		// note, alternate: f, _ := strconv.ParseFloat(string(p[1:]), 64) see (2)
	case STRING:
		return js.ValueOf(string(p[1:])), nil
	case BYTES:
		return js.ValueOf(jsArrayFromBytes(p[1:])), nil
	default:
		return js.Undefined(), errors.New("invalid type code byte ‹" + bHex([]byte{p[0]}) + "› in: " + bHex(p))
	}
}

// JS pot.typeDecodedValueTest() is the JS function for testing typeDecodedValue()
// Note that it's exclusively used for testing, never for production, and it
// must comply to JS interface standards of syscall/js and thus can only return
// one value. It does not get parameter checks because it is only ever called
// by test suites.
func typeDecodedValueTest(this js.Value, parameters []js.Value) interface{} {

	bytes, err := jsToBytes(parameters[0])

	if err != nil {
		msg := "### error: " + err.Error()
		log(CRIT, msg)
		return jsError(msg)
	}

	jsresult, verr := typeDecodedValue(bytes)

	if verr != nil {
		msg := "### error: " + verr.Error()
		log(CRIT, msg)
		return jsError(msg)
	}

	return jsresult
}

// bHex() casts from go byte array to go hex string. Convenience for string
// message assembly.
func bHex(p []byte) string {
	return hex.EncodeToString(p)
}

// toString() converts an error or a string into a string. Used for error
// messages that are based on percolating errors or strings.
func toString(err interface{}) string {

	switch err.(type) {
	case error:
		return err.(error).Error()
	case string:
		return err.(string)
	default:
		return "[ unknown ]"
	}
}

//------------------------------------------------------------------------------
//
//   TEST FUNCTIONS
//
//   Because they are to help with testing, some of the support functions
//   have the syscall/js signature, are exported to and can be called from
//   Javascript.
//
//------------------------------------------------------------------------------

// JS pot.hello() is a simple call target to test js/go cross calling.
func hello(this js.Value, parameters []js.Value) interface{} {

	log(CRIT, "hello")

	return "hello, wasm!"
}

// JS pot.randKey() creates a random byte sequence of 32 bytes for use
// as test key. Analog to pot test's keyValuePair() in suites.go.
func randKey(this js.Value, parameters []js.Value) interface{} {

	key := make([]byte, 32)
	rand.Read(key)
	log(TRACE, "∙ created random key "+bHex(key)+" in go")
	result := js.Global().Get("Uint8Array").New(32)
	js.CopyBytesToJS(result, key)
	return result
}

// JS pot.randValue() creates a random byte sequence of 79 to 101 bytes for use
// as test value. Analog to pot test's keyValuePair() in suites.go.
// / TEST: long and overlong content
func randValue(this js.Value, parameters []js.Value) interface{} {

	size := rand.Intn(79) + 22 // taken from native go pot tests, why this lenght?
	value := make([]byte, size)
	rand.Read(value)
	log(TRACE, "∙ created random "+strconv.Itoa(size)+" byte value "+bHex(value)+" in go")
	result := js.Global().Get("Uint8Array").New(size)
	js.CopyBytesToJS(result, value)
	return result
}

// JS pot.randBuffer() is for testing. It creates a random byte sequence of any
// size for use as test value.
func randBuffer(this js.Value, parameters []js.Value) interface{} {

	size := parameters[0].Int()
	value := make([]byte, size)
	rand.Read(value)
	log(TRACE, "∙ created random "+strconv.Itoa(size)+" byte value "+bHex(value)+" in go")
	result := js.Global().Get("Uint8Array").New(size)
	js.CopyBytesToJS(result, value)
	return result
}

// JS pot.hangingPromise() is for simulation testing only. It returns a promise
// that does nothing but sleep for quarter second and then return an error,
// unless it is cancelled before the second is over, in which case it returns a
// different error. It never invokes resolve().
func hangingPromise(this js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return a promise that immediately rejects
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in hangingPromise: " + toString(err)
			log(CRIT, msg)
			result = errorPromise(msg)
		}
	}()

	done := make(chan bool)
	quit := make(chan bool)

	var executor js.Func
	executor = js.FuncOf(func(executor_this js.Value, executor_parameters []js.Value) interface{} {

		reject := executor_parameters[1]

		go func() {
			log(INFO, "» sleeping")
			time.Sleep(time.Second / 4)
			select {
			case <-quit:
				return
			default:
			}
			log(INFO, "» done sleeping")
			jserr := jsError("done sleeping, nothing happened")
			reject.Invoke(jserr)
			done <- true
		}()

		go func() {
			select {
			case <-done:
			case <-quit:
				close(quit)
				log(DEB, "› test cancellation triggers reject")
				reject.Invoke(jsError("canceled"))
			}
		}()

		if optimization > NONE {
			executor.Release()
		}

		return nil
	})

	promise := js.Global().Get("Promise").New(executor)

	var cancel js.Func
	cancel = js.FuncOf(func(js.Value, []js.Value) interface{} {
		quit <- true
		log(INFO, "» canceled!")
		if optimization > NONE {
			cancel.Release()
		}
		return nil
	})

	promise.Set("cancel", cancel)

	return promise
}

// JS pot.panickingPromise() is for simulation testing only. It returns a promise
// that does nothing but react to an internal panic. It never invokes resolve().
func panickingPromise(this js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return a promise that immediately rejects
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in panickingPromise(): " + toString(err)
			log(CRIT, msg)
			result = errorPromise(msg)
		}
	}()

	var executor js.Func
	executor = js.FuncOf(func(executor_this js.Value, executor_parameters []js.Value) interface{} {

		reject := executor_parameters[1]

		// on panic, log, and reject
		defer func() {
			if err := recover(); err != nil {
				msg := "### panic in panickingPromise executor: " + toString(err)
				log(CRIT, msg)
				reject.Invoke(msg)
			}
		}()

		panic("test panic of panickingPromise")

		return nil
	})

	promise := js.Global().Get("Promise").New(executor)

	return promise
}
