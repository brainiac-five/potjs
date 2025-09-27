// ---------------------------------------------------------------------------
//
// # SWARM POT JS
//
// This is functionally an API from Javascript to the implementation of POT in
// Go: https://github.com/ethersphere/proximity-order-trie/releases/tag/v1.0.0
// The Go code is compiled to WASM and most functions below mimic Javascript
// functions with the help of the Go package syscall/js.
//
// These functions, although programmed in Go, are callable from Javascript.
// Their Go signatures are uniform as is required by syscall/js. Their first
// parameter is always Javascript's `this`, the second the array of the actual
// JS arguments to the JS-side function call. There are no formal, visible
// signatures here that would visually reveal, which parameters are expected.
//
// Functions are not Go-exported because they are not intended to be called
// directly by a Go function outside this package. The 'export' to Javascript
// is by the Set(name, s.FuncOf(..)) calls. This makes them part of the
// Javascript runtime that called into the Go code running as WASM. This makes
// Go doc less useful that only lists exported functions and structures.
//
// Because the WASM code has to continually run, it is not technically a
// library and this package, therefore, has to be a `main` package.
//
// For more implementation details and rationale, see the Developer Notes in
// the manual in the doc/ folder.
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
	"strconv"
	"syscall/js"
	"time"

	. "github.com/ethersphere/proximity-order-trie" // . helps mocking
	"github.com/ethersphere/proximity-order-trie/pkg/persister"
)

// arguments for sync parameter
const SYNC = true
const ASYNC = false

var _ KeyValueStore = (*SwarmKvs)(nil) /// does this have a function?

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
	Ref       int // index+1 in slots array
	Ctx       context.Context
	Ls        persister.LoadSaver
	allowSync bool
	Kvs       *SwarmKvs
}

// array of all slots
var Slots = []Slot{}

// re-used in-memory storage. Must be for state consistency across calls.
var inMemoryPersister persister.LoadSaver

// the payload function of the Go-created generic promise creator function
type functionality func(js.Value, []js.Value, bool) interface{}

// a function that prevents crashing with 'object does not exist' after a
// Go-created JS function is released (freed for garbage collection).
// It is set in all places where functions are released.
/// (which is not consistently the case yet.)
var defaultFunc js.Func

// boolean atoms
const (
	FALSE    = 0
	TRUE     = 1
)

// type bytes to mark what type the immediately following bytes were in JS.
const (
	NULL     = 0
	BOOLEAN  = 1
	NUMBER   = 2
	STRING   = 3
	BYTES    = 4
)

const (
	NONE     = 0
	STANDARD = 1
)

// default optimization level: releasing resources.
var optimization = STANDARD

// log levels. Don't affect the propagation of errors and exceptions.
const (
	CRIT     = 1
	ERR      = 2
	INFO     = 3
	DEB      = 4
)

// default log level: everything
var verbosity = DEB

// -----------------------------------------------------------------------------

// NEW -------------------------------------------------------------------------

// JS pot.newSync() synchronously creates a new Swarm KVS, returning
// a Javascript object that anchors the KVS on the Javascript side,
// created in createMapObject(). On the Go POT-side, this is a strictly
// in-memory operation in all cases. It starts a multiplexer though that uses
// Go channels to sequence writes.
func newSync(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in newSwarmKvs: " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg) /// wrap and change to Go error
		}
	}()

	log(INFO, "» initialize new P.O.T.")

	var ls persister.LoadSaver
	var allowSync bool

	// network parameters bee url and batch id (**)
	if len(parameters) >= 2 && !parameters[0].IsNull() && !parameters[0].IsUndefined() { // catch either null
		beeAPIURL := parameters[0].String()                           /// catch error
		postageIDBytes, _ := hex.DecodeString(parameters[1].String()) /// catch error / missing, also wrong lenght of hexstring (must be 64)
		ls = persister.NewSwarmLoadSaver(beeAPIURL, postageIDBytes)
		log(INFO, "› created new network loader")
		allowSync = false
		// (note: make sure mock tests use this branch to allow sync calls)
	} else { /// error check for other parameter constellations
		if inMemoryPersister == nil {
			inMemoryPersister = persister.NewInmemLoadSaver()
			log(INFO, "› created new in-memory persister")
		}
		ls = inMemoryPersister
		log(INFO, "› using in-memory persister")
		allowSync = true
	}

	// -------------------------------------------------------------------
	kvs, err := NewSwarmKvs(ls)
	// -------------------------------------------------------------------
	if err != nil {
		msg := "### error in newSwarmKvs: " + err.Error()
		log(ERR, msg)
		return js.Global().Get("Error").New(msg)
	}

	// register context and kvs handle, take numerical index as handle
	slot_ref := len(Slots) + 1 // = starting on 1. /// add deletion
	Slots = append(Slots, Slot{Ctx: context.Background(), Kvs: kvs, Ref: slot_ref, Ls: ls, allowSync: allowSync})

	log(DEB, "› slot ref: " + strconv.Itoa(slot_ref))
	return createMapObject(slot_ref)
}

// JS pot.newKvs() asynchronously creates a new Swarm KVS, returning the promise
// for a Javascript object that anchors the KVS on the Javascript side, created
// in createMapObject(). On the Go POT-side, this is a strictly in-memory
// operation in all cases. It starts a multiplexer though that uses Go channels
// to sequence writes.
func newKvs(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in new: " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters []js.Value) interface{} {
		/// TODO "Func.Release must be called to free up resources when the
		/// function will not be invoked any more."
		/// https://cs.opensource.google/go/go/+/refs/tags/go1.24.0:src/syscall/js/func.go;l=44

		resolve := handler_parameters[0]
		reject := handler_parameters[1]

		go func() {

			// The Go error type is not used, to make newSync()
			// usable also directly from JS, where only one result
			// is expected.
			jsvalue_or_jserr := newSync(js_call_context, parameters).(js.Value)
			if jsvalue_or_jserr.InstanceOf(js.Global().Get("Error")) {
				reject.Invoke(jsvalue_or_jserr)
			} else {
				resolve.Invoke(jsvalue_or_jserr)
			}
		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

// JS pot.newByReferenceSync() loads an existing Swarm KVS JS object, using its
// 32-bytei save handle.  This method will break for in-memory load-savers when
// the program is stopped and restarted, as they will lose their storage. It works
// for the connection to Swarm as the load-saver will then not be the instance
// where the data is stored but only the connection to the data, which is stored
// on Swarm.
func newByReferenceSync(this js.Value, parameters []js.Value) (result interface{}) {
	/// rename

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in newSwarmKvsReference: " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg) /// wrap and change to Go error
		}
	}()

	log(INFO, "» load P.O.T. by reference")

	var ls persister.LoadSaver
	var allowSync bool

	if len(parameters) < 1 {
		msg := "### error in newByReference*(): reference required as 1st parameter"
		log(ERR, msg)
		return js.Global().Get("Error").New(msg) /// change to Go error
	}

	jsref32 := parameters[0] //// react if missing, too small/big
	ref32 := js_to_bytes(jsref32)  /// roll into one line. Check type and length

	// network parameters bee url and batch id (but for indices identical to (**))
	if len(parameters) >= 3 && !parameters[1].IsNull() && !parameters[1].IsUndefined() { // catch either null
		beeAPIURL := parameters[1].String()                           /// catch error
		postageIDBytes, _ := hex.DecodeString(parameters[2].String()) /// catch error / missing, also wrong lenght of hexstring (must be 64)
		log(DEB, "› postage id: " + string(postageIDBytes))
		ls = persister.NewSwarmLoadSaver(beeAPIURL, postageIDBytes)
		log(INFO, "› created new network loader")
		allowSync = false
		// (note: make sure mock tests use this branch to allow sync calls)
	} else { /// error check for other parameter constellations
		if inMemoryPersister == nil {
			inMemoryPersister = persister.NewInmemLoadSaver()
			log(INFO, "› created new in-memory persister")
		}
		ls = inMemoryPersister
		log(INFO, "› using in-memory persister")
		allowSync = true
	}

	ctx := context.Background()

	// -------------------------------------------------------------------
	kvs, err := NewSwarmKvsReference(ctx, ls, ref32)
	// -------------------------------------------------------------------
	if err != nil {
		msg := "### error in newByReference*(): " + err.Error()
		log(ERR, msg)
		return js.Global().Get("Error").New(msg)
	}

	// register context and kvs handle, take numerical index as handle
	slot_ref := len(Slots) + 1 // = starting on 1. /// add deletion
	Slots = append(Slots, Slot{Ctx: ctx, Kvs: kvs, Ref: slot_ref, Ls: ls, allowSync: allowSync})

	log(DEB, "› slot ref: " + strconv.Itoa(slot_ref))
	return createMapObject(slot_ref)
}

// JS pot.newByReference() asynchronously loads an existing Swarm KVS JS object,
// using its 32-bytei save handle to return a promise to a KVS anchor object. This
// method will break for in-memory load-savers when the program is stopped and
// restarted, as they will lose their storage. It works for the connection to
// Swarm as the load-saver will then not be the instance where the data is stored
// but only the connection to the data, which is stored on Swarm.
func newByReference(this js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object /// strike, promise
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in newByReference: " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg) /// make promise + others like it, too
		}
	}()

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters []js.Value) interface{} {
		/// TODO "Func.Release must be called to free up resources when the
		/// function will not be invoked any more."
		/// https://cs.opensource.google/go/go/+/refs/tags/go1.24.0:src/syscall/js/func.go;l=44

		resolve := handler_parameters[0]
		reject := handler_parameters[1]

		go func() {

			// The Go error type is not used, to make newByReferenceSync()
			// usable also directly from JS, where only one result
			// is expected.
			jsvalue_or_jserr := newByReferenceSync(this, parameters).(js.Value)
			if jsvalue_or_jserr.InstanceOf(js.Global().Get("Error")) {
				reject.Invoke(jsvalue_or_jserr)
			} else {
				resolve.Invoke(jsvalue_or_jserr)
			}
		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

// createMapObject() creates the JS KVS object that new*() and newByReference*()
// return - directly or by promise -  and all put and get functions are members
// of.  Go context and persister are stored this side in a Slot array that
// slot_ref is an index to.
func createMapObject(slot_ref int) js.Value {

	// create Javascript handle object
	jsMap := js.ValueOf(make(map[string]interface{}))

	// the numeric handle bridges preserved ctx and persister to JS.
	jsMap.Set("slot_ref", slot_ref)

	// add standard methods
	/// TODO "Func.Release must be called to free up resources when the
	/// function will not be invoked any more."
	/// https://cs.opensource.google/go/go/+/refs/tags/go1.24.0:src/syscall/js/func.go;l=44
	jsMap.Set("put", js.FuncOf(put))
	jsMap.Set("get", js.FuncOf(get))
	jsMap.Set("putRaw", js.FuncOf(putRaw))
	jsMap.Set("getRaw", js.FuncOf(getRaw))
	jsMap.Set("getBoolean", js.FuncOf(getBoolean))
	jsMap.Set("getNumber", js.FuncOf(getNumber))
	jsMap.Set("getString", js.FuncOf(getString))
	jsMap.Set("putSync", js.FuncOf(putSync))
	jsMap.Set("getSync", js.FuncOf(getSync))
	jsMap.Set("putRawSync", js.FuncOf(putRawSync))
	jsMap.Set("getRawSync", js.FuncOf(getRawSync))
	jsMap.Set("getBooleanSync", js.FuncOf(getBooleanSync))
	jsMap.Set("getNumberSync", js.FuncOf(getNumberSync))
	jsMap.Set("getStringSync", js.FuncOf(getStringSync))
	jsMap.Set("save", js.FuncOf(save))
	jsMap.Set("saveSync", js.FuncOf(saveSync))

	return jsMap
}

// JS kvs.saveSync() writes cached updates to the storage and returns a 32 byte
// reference to the saved KVS that is used to retrieve the KVS later.
func saveSync(this js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in save: " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	log(INFO, "» saving storage")

	slot_ref := this.Get("slot_ref").Int() /// error check
	if slot_ref < 1 {
		panic("invalid slot reference")
	}
	slot := Slots[slot_ref-1] /// error check
	///--ext_test: if slot.Kvs.Slot_ref != slot_ref { panic("slot double link broken ‹" + strconv.Itoa(slot_ref) + "› / ‹" + strconv.Itoa(slot.Kvs.Slot_ref) + "›") }
	/* ///
	if sync && !slot.allowSync {
		msg := "### error in getBooleanSync: no sync calls to swarm network"
		log(ERR, msg)
		return js.Global().Get("Error").New(msg)
	}
	*/
	// -------------------------------------------------------------------
	ref32, err := slot.Kvs.Save(slot.Ctx)
	// -------------------------------------------------------------------
	if err != nil {
		msg := "### error on saving: " + err.Error()
		log(ERR, msg)
		return js.Global().Get("Error").New(msg)
	}

	log(DEB, "› ref32: " + bHex(ref32))

	// return a JS Uint8Array
	jsref32 := js.Global().Get("Uint8Array").New(32)
	js.CopyBytesToJS(jsref32, ref32)
	return jsref32
}

// JS kvs.save() writes cached updates to the storage and returns a promise to a
// 32 byte reference to the saved KVS that is used to retrieve the trie later.
func save(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in save: " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters []js.Value) interface{} {
		/// TODO "Func.Release must be called to free up resources when the
		/// function will not be invoked any more."
		/// https://cs.opensource.google/go/go/+/refs/tags/go1.24.0:src/syscall/js/func.go;l=44

		resolve := handler_parameters[0]
		reject := handler_parameters[1]

		go func() {

			// The Go error type is not used, to make saveSync()
			// usable also directly from JS, where only one result
			// is expected.
			jsvalue_or_jserr := saveSync(js_call_context, parameters).(js.Value)
			if jsvalue_or_jserr.InstanceOf(js.Global().Get("Error")) {
				reject.Invoke(jsvalue_or_jserr)
			} else {
				resolve.Invoke(jsvalue_or_jserr)
			}
		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

// PUT -------------------------------------------------------------------------

/// TODO clean PUT up, then model GET in its image.

// JS kvs.putSync() synchronously stores a key-value pair, encoding the value
// type in the first byte of what is written to the storage value. Returns JS 
// null on success or JS error.
func putSync(this js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in putSync(): " + toString(err)
			log(CRIT, "xxx returning panic - " + msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	// stage the background. This has to happen here, to be able to return
	// from this function, by extension, a promise that has a valid cancel()
	// registered; inside the executor can be too late, with no inbetween.
	ctx, _, err := createContext(3, parameters, SYNC)

	// the only error that can be triggered is a parameter type error.
	if err != nil {
		msg := err.Error() + " in putSync()"
		log(ERR, msg)
		return js.Global().Get("Error").New(msg)
	}

	jsErrOrNull, _ := _putSync(ctx, this, parameters, SYNC)

	return jsErrOrNull
}

// JS kvs.put() asynchronously stores a key-value pair, encoding the value type
// in the first byte of what is written to the storage. Returns a Javascript
// promise that returns null on success or throws a JS Error on failure.
func put(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return an error promise that throws right away
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in put: " + toString(err)
			log(CRIT, "xxx throwing panic - " + msg)
			result = errorPromise(err.(string), "put", nil)
		}
	}()

	// stage the background. This has to happen here, to be able to return
	// from this function, by extension, a promise that has a valid cancel()
	// registered; inside the executor could be too late, with no inbetween.
	ctx, cancel, err := createContext(3, parameters, ASYNC)

	// the only error that can be triggered is a parameter type error.
	// To allow for the guarantee that always a promise will be returned
	// the error is turned into a promise that rejects immediately. This is
	// also the only way to throw a JS error from Go with syscall/js.
	if err != nil {
		return errorPromise(err.Error(), "put", nil)
	}

	executor := js.FuncOf(func(executor_this js.Value, executor_parameters []js.Value) interface{} {
		/// TODO "Func.Release must be called to free up resources when the
		/// function will not be invoked any more."
		/// https://cs.opensource.google/go/go/+/refs/tags/go1.24.0:src/syscall/js/func.go;l=44

		// on panic, log, and return js Error object
		defer func() {
			if err := recover(); err != nil {
				msg := "### panic in put executor: " + toString(err)
				log(CRIT, msg)
				result = js.Global().Get("Error").New(msg)
			}
		}()

		resolve := executor_parameters[0]
		reject := executor_parameters[1]

		// call parameter count check (not the executor parameter count)
		if len(parameters) < 2 {
			msg := "### parameter count error: put() requires 2, got " + strconv.Itoa(len(parameters))
			log(ERR, msg)
			reject.Invoke(js.Global().Get("Error").New(msg))
		}

		go func() {
			// The Go error type is not used, to make putTyped
			// usable also directly from JS, where only one result
			// is expected.
			// ----------------------------------------------------
			jsvalue_or_jserr, _ := _putSync(ctx, js_call_context, parameters, ASYNC)
			// ----------------------------------------------------
			if jsvalue_or_jserr.InstanceOf(js.Global().Get("Error")) {
				reject.Invoke(jsvalue_or_jserr)
			} else {
				resolve.Invoke(jsvalue_or_jserr)
			}
		}()

		return nil
	})

	return cancelablePromise("put()", executor, cancel)
	// promise := js.Global().Get("Promise").New(executor)
	// promise.Set("cancel", js.FuncOf(func(js.Value, []js.Value) interface{} { log(ERR, "cancelled!") ; return nil }) )

	// return promise
}

// _putSync() is the internal put function that put() and putSync() are using
// to store a key-value pair, encoding the value type in the first byte.
func _putSync(ctx context.Context, this js.Value, parameters []js.Value, sync bool) (result js.Value, rerr error) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in put*(): " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg)
			rerr = errors.New(msg)
		}
	}()

	// grab slot of map
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1]              /// error check

	if sync && !slot.allowSync {
		msg := "### error in put*(): no sync calls to networks"
		log(ERR, msg)
		return js.Global().Get("Error").New(msg), errors.New(msg)
	}

	// parameter count check
	if len(parameters) < 2 {
		msg := "### parameter count error: put*() requires 2 or 3, got " + strconv.Itoa(len(parameters))
		log(ERR, msg)
		return js.Global().Get("Error").New(msg), errors.New(msg)
	}

	key := parameters[0] /// error check / absence
	bkey := js_to_key(key)   /// error check / absence
	pkey, perr := pad(bkey)
	if perr != nil {
		return js.Global().Get("Error").New(perr.Error()), perr
	}
	value := parameters[1]
	cvalue, err := type_encoded_bytes(value)
	if err != nil {
		switch err.Error() {
		case "bad type flag": //// refactor
			msg := "trying to put unknown type"
			log(ERR, "» xxx put fail: " + msg) /// make debug-switched
			return js.Global().Get("Error").New(msg), errors.New(msg)
		default:
			msg := "### » put error: " + err.Error()
			log(ERR, msg)
			return js.Global().Get("Error").New(msg), errors.New(msg)
		}
	}

	debug := ""
	if len(parameters) >= 4 {
		debug = "[" + js_printable(parameters[3]) + "]"
	}
	// -------------------------------------------------------------------
	err = slot.Kvs.Put(ctx, pkey, cvalue)
	// -------------------------------------------------------------------
	if err != nil {
		msg := "### error in put*(): " + err.Error()
		log(ERR, msg)
		return js.Global().Get("Error").New(msg), errors.New(msg)
	}

	log(INFO, "» put " + debug + " " + js_printable(key) + ": " + js_printable(value) + "")
	log(DEB, "› ⟶  " + bHex(pkey) + ": " + bHex(cvalue) + "")
	return js.Null(), nil
}

// PUT RAW----------------------------------------------------------------------

// JS kvs.putRawSync() synchronously stores a key-value pair in raw format.
// The key can be a string, number, or boolean.
//// TODO check key byte conversion ---
func putRawSync(this js.Value, parameters []js.Value) (result interface{}) {

	return _putRawSync(this, parameters, true)
}

// _putRawSync() is the internal function that stores a raw byte value to a
// raw 32 byte key. Used by putRaw() and putRawSync().
func _putRawSync(this js.Value, parameters []js.Value, sync bool) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in put: " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	// parameter count check
	if len(parameters) < 2 {
		msg := "### parameter count error: putRawSync() requires 2, got " + strconv.Itoa(len(parameters))
		log(ERR, msg)
		return js.Global().Get("Error").New(msg)
	}

	key := js_to_key(parameters[0]) /// error check / absence
	pkey, perr := pad(key)
	if perr != nil {
		return js.Global().Get("Error").New(perr.Error())
	}

	value := js_to_bytes(parameters[1])
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1]              /// error check

	if sync && !slot.allowSync {
		msg := "### error in put: no sync calls to swarm network"
		log(ERR, msg)
		return js.Global().Get("Error").New(msg)
	}

	// -------------------------------------------------------------------
	err := slot.Kvs.Put(slot.Ctx, pkey, value)
	// -------------------------------------------------------------------
	if err != nil {
		msg := "### error in put: " + err.Error()
		log(ERR, msg)
		return js.Global().Get("Error").New(msg)
	}

	log(INFO, "» put " + bHex(pkey) + ": " + bHex(value) + "")
	return nil
}

// JS kvs.putRaw() asynchronously stores a key-value pair in raw format.
// The key can be a string, number, or boolean.  Returns a Javascript promise
// for the kvs anchor object or throws a JS Error on failure.
func putRaw(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in putRaw: " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters []js.Value) interface{} {
		/// TODO "Func.Release must be called to free up resources when the
		/// function will not be invoked any more."
		/// https://cs.opensource.google/go/go/+/refs/tags/go1.24.0:src/syscall/js/func.go;l=44

		// on panic, log, and return js Error object
		defer func() {
			if err := recover(); err != nil {
				msg := "### panic in putRaw executor: " + toString(err)
				log(CRIT, msg)
				result = js.Global().Get("Error").New(msg)
			}
		}()

		resolve := handler_parameters[0]
		reject := handler_parameters[1]

		// parameter count check
		if len(parameters) < 2 { // sic. parameters, not handler_paramaters
			msg := "### parameter count error: putRaw() requires 2, got " + strconv.Itoa(len(parameters))
			log(ERR, msg)
			reject.Invoke(js.Global().Get("Error").New(msg))
		}

		go func() {
			// The Go error type is not used, to make putRawSync()
			// usable also directly from JS, where only one result
			// is expected.

			jsvalue_or_jserr := _putRawSync(js_call_context, parameters, false)
			if jsvalue_or_jserr == nil {
				resolve.Invoke(js.Null())
			} else if jsvalue_or_jserr.(js.Value).InstanceOf(js.Global().Get("Error")) {
				reject.Invoke(jsvalue_or_jserr.(js.Value))
			} else {
				resolve.Invoke(jsvalue_or_jserr.(js.Value))
			}

		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

// GET -------------------------------------------------------------------------

// JS kvs.getSunc() synchronously retrieves a value for a key.
func getSync(this js.Value, parameters []js.Value) (result interface{}) {

	return _getSync(this, parameters, true)
}

// _getSync() is the internal function that gets a value for a key. Used by
// get() and getSync().
func _getSync(this js.Value, parameters []js.Value, sync bool) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in getTyped: " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	key := parameters[0] /// error check / absence
	bkey := js_to_key(key)   /// error check / absence
	pkey, perr := pad(bkey)
	if perr != nil {
		return js.Global().Get("Error").New(perr.Error())
	}
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1]              /// error check

	if sync && !slot.allowSync {
		msg := "### error in getTyped: no sync calls to swarm network"
		log(ERR, msg)
		return js.Global().Get("Error").New(msg)
	}

	debug := ""
	if len(parameters) >= 3 {
		debug = "[" + js_printable(parameters[2]) + "]"
	}
	// -------------------------------------------------------------------
	bvalue, err := slot.Kvs.Get(slot.Ctx, pkey)
	// -------------------------------------------------------------------
	if err != nil {
		log(ERR, err.Error())
		/// handle
	}
	value, err2 := type_decoded_value(bvalue)
	if err2 != nil {
		switch err2.Error() {
		case "bad type flag": //// refactor
			msg := "trying to get unknown type"
			log(ERR, "» xxx get fail: " + msg) /// make debug-switched
			return js.Global().Get("Error").New(msg)
		default:
			log(ERR, "### » get error: " + err2.Error())
			return js.Global().Get("Error").New(err2.Error())
		}
	}

	log(INFO, "» get " + debug + " " + js_printable(key) + ": " + js_printable(value) + "")
	log(DEB, "› ⟵  " + bHex(pkey) + ": " + bHex(bvalue) + "")

	return js.ValueOf(value)
}

// JS kvs.get() asynchronously retrieves a value for a key, decoding the value
// type in the first value byte and casting the value appropriately for JS.
// Returns a Javascript promise for the value that throws a JS Error on failure.
func get(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in get: " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters []js.Value) interface{} {
		/// TODO "Func.Release must be called to free up resources when the
		/// function will not be invoked any more."
		/// https://cs.opensource.google/go/go/+/refs/tags/go1.24.0:src/syscall/js/func.go;l=44

		resolve := handler_parameters[0]
		reject := handler_parameters[1]

		go func() {

			// The Go error type is not used, to make getSync()
			// usable also directly from JS, where only one result
			// is expected.
			jsvalue_or_jserr := _getSync(js_call_context, parameters, false).(js.Value)
			if jsvalue_or_jserr.InstanceOf(js.Global().Get("Error")) {
				reject.Invoke(jsvalue_or_jserr)
			} else {
				resolve.Invoke(jsvalue_or_jserr)
			}
		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

// GET RAW ---------------------------------------------------------------------

// JS kvs.getRawSync() synchronously retrieves a raw byte value for a key.
// This will return the type code as first byte if the value was stored with
// put() instead of putRaw().
func getRawSync(this js.Value, parameters []js.Value) (result interface{}) {

	return _getRawSync(this, parameters, true)
}

// JS kvs.getRaw() asynchronously retrieves a raw byte value for a key.
// This will return the type code as first byte if the value was stored with
// put() instead of putRaw(). Returns a promise for the value that will throw
// a JS error on failure.
func getRaw(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in getRaw: " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters []js.Value) interface{} {
		/// TODO "Func.Release must be called to free up resources when the
		/// function will not be invoked any more."
		/// https://cs.opensource.google/go/go/+/refs/tags/go1.24.0:src/syscall/js/func.go;l=44

		resolve := handler_parameters[0]
		reject := handler_parameters[1]

		go func() {

			// The Go error type is not used, to make getSync()
			// usable also directly from JS, where only one result
			// is expected.
			jsvalue_or_jserr := _getRawSync(js_call_context, parameters, false).(js.Value)
			if jsvalue_or_jserr.InstanceOf(js.Global().Get("Error")) {
				reject.Invoke(jsvalue_or_jserr)
			} else {
				resolve.Invoke(jsvalue_or_jserr)
			}
		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

// _getRawSync() is the internal function that retrieves a raw byte value for a
// key, used by getRaw() and getRawSync().
func _getRawSync(this js.Value, parameters []js.Value, sync bool) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in get: " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	bkey := js_to_key(parameters[0]) /// error check
	pkey, perr := pad(bkey)
	if perr != nil {
		return js.Global().Get("Error").New(perr.Error())
	}
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1]              /// error check, pre, post (?)

	if sync && !slot.allowSync {
		msg := "### error in _get: no sync calls to swarm network"
		log(ERR, msg)
		return js.Global().Get("Error").New(msg)
	}

	// -------------------------------------------------------------------
	value, err := slot.Kvs.Get(slot.Ctx, pkey)
	// -------------------------------------------------------------------
	if err != nil {
		/// handle
	}

	log(INFO, "» get " + bHex(pkey) + ": " + bHex(value) + "")

	return jsarray_from_bytes(value)
}

// GET BOOLEAN -----------------------------------------------------------------

// JS kvs.getBoolean() is the asynchronous Javascript function to retrieve a
// raw value as boolean. This function does NOT expect a leading type byte.
// It basically wraps a call to _getBooleanSync() in a promise.
func getBoolean(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, "getBoolean", _getBooleanSync)
}

// JS kvs.getBooleanSync() is the synchronous Javascript function to retrieve a
// raw value as boolean. This function does NOT expect a leading type byte.
// It basically wraps a call to _getBooleanSync() and returns what it returns.
func getBooleanSync(this js.Value, parameters []js.Value) (result interface{}) {

	return _getBooleanSync(this, parameters, true)
}

// _getBooleanSync() retrieves a boolean, calling Kvs.get(), casting the
// returned bytes to a boolean by looking at the first byte and comparing it
// to 0. Anything else but 0 is true. This function does NOT expect a leading
// type byte.
func _getBooleanSync(this js.Value, parameters []js.Value, sync bool) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in getBoolean: " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	bkey := js_to_key(parameters[0]) /// errror check
	pkey, perr := pad(bkey)
	if perr != nil {
		return js.Global().Get("Error").New(perr.Error())
	}
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1]              /// error check, pre, post (?)

	if sync && !slot.allowSync {
		msg := "### error in getBooleanSync: no sync calls to swarm network"
		log(ERR, msg)
		return js.Global().Get("Error").New(msg)
	}

	// -------------------------------------------------------------------
	value, err := slot.Kvs.Get(slot.Ctx, pkey)
	// -------------------------------------------------------------------
	if err != nil {
		/// handle
	}

	log(INFO, "» get " + bHex(pkey) + ": " + bHex(value) + "")

	if value[0] == 0 {
		return js.ValueOf(false)
	}
	return js.ValueOf(true)
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

	return promise(this, parameters, "getNumber", _getNumberSync)
}

// JS kvs.getNumberSync() is the synchronous Javascript function to retrieve a
// Javascript nunmber from a raw value. It does NOT expect the first byte to
// be the type code and will fail if the number was not stored with putRaw(),
// checking for the right byte size of the raw value. The raw value expected
// must be a 8 byte IEEE 754 float. This function but wraps a call to
// _getNumberSync() and returns the JS float or a JS error on failure. It does
// not throw.
func getNumberSync(this js.Value, parameters []js.Value) (result interface{}) {

	return _getNumberSync(this, parameters, true)
}

// _getNumberSync() is the internal synchronous function to retrieve a
// Javascript nunmber from a raw value. It does NOT expect the first byte to
// be the type code and will fail if the number was not stored with putRaw(),
// checking for the right byte size of the raw value. The raw value expected
// must be a 8 byte IEEE 754 float. This function is used by getNumber() and
// getNumberSync(). It returns the JS float or a JS error on failure.
func _getNumberSync(this js.Value, parameters []js.Value, sync bool) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in getNumber: " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	bkey := js_to_key(parameters[0]) /// errror check
	pkey, perr := pad(bkey)
	if perr != nil {
		return js.Global().Get("Error").New(perr.Error())
	}
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1]              /// error check, pre, post (?)

	if sync && !slot.allowSync {
		msg := "### error in getNumberSync: no sync calls to swarm network"
		log(ERR, msg)
		return js.Global().Get("Error").New(msg)
	}

	// -------------------------------------------------------------------
	value, err := slot.Kvs.Get(slot.Ctx, pkey)
	// -------------------------------------------------------------------
	if err != nil {
		/// handle
	}
	if len(value) != 8 {
		panic("wrong byte count of stored float")
	}

	f := math.Float64frombits(binary.BigEndian.Uint64(value))

	log(INFO, "» get " + bHex(pkey) + ": " + bHex(value) + " › " + fmt.Sprintf("%g", f))

	return js.ValueOf(f)
}

// GET STRING ------------------------------------------------------------------

// JS kvs.getString() is the asynchronous Javascript function to retrieve a
// Javascript string from a raw value. It does NOT expect the first byte to
// be the type code and will return a wrong string if it was not stored with
// putRaw(), casting the type byte as non-printable control character.
// This function but wraps a call to _getStringSync() with a promise that will
// return the JS string or throw an error on failure.
func getString(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, "getString", _getStringSync)
}

// JS kvs.getStringSync() is the synchronous Javascript function to retrieve a
// Javascript string from a raw value. It does NOT expect the first byte to
// be the type code and will return a wrong string if it was not stored with
// putRaw(), casting the type byte as non-printable control character.
// This function but wraps a call to _getStringSync() and returns its return
// value, which is a JS string or a JS error.
func getStringSync(this js.Value, parameters []js.Value) (result interface{}) {

	return _getStringSync(this, parameters, true)
}

// _getStringSync() is the internal synchronous Javascript function to retrieve
// a Javascript string from a raw value. It does NOT expect the first byte to
// be the type code and will return a wrong string if it was not stored with
// putRaw(), casting the type byte as non-printable control character.
// Used by getString() and getStringSync(). Returns a JS value or a JS error.
func _getStringSync(this js.Value, parameters []js.Value, sync bool) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in getStringSync: " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	bkey := js_to_key(parameters[0]) /// errror check
	pkey, perr := pad(bkey)
	if perr != nil {
		return js.Global().Get("Error").New(perr.Error())
	}
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1]              /// error check, pre, post (?)

	if sync && !slot.allowSync {
		msg := "### error in getStringSync: no sync calls to swarm network"
		log(ERR, msg)
		return js.Global().Get("Error").New(msg)
	}

	// -------------------------------------------------------------------
	value, err := slot.Kvs.Get(slot.Ctx, pkey)
	// -------------------------------------------------------------------
	if err != nil {
		/// handle
	}

	log(INFO, "» get " + bHex(pkey) + ": " + bHex(value) + "")

	return js.ValueOf(string(value))
}

// MAIN ----------------------------------------------------------------------

// main() exposes the functions to be called from JS-land, and stays running on
// 'stand-by'. The Javascript object `pot` is created as anchor-point for the
// general functions that are not specific to an individual KVS. Eventually,
// the OnWasmLoaded() function is called, if it exists, to signal readiness.
// This function never returns, it stays up by listening to a private channel
// as the intended way how to run a Go WASM module for JS.
func main() {

	// handle verbosity setting per variable
	v := js.Global().Get("potjs_verbosity")
	if v.Type() == js.TypeNumber {
		verbosity = v.Int()
	}

	log(INFO, "» POTWASM")

	// handle optimization setting per variable
	o := js.Global().Get("potjs_optimization")
	if o.Type() == js.TypeNumber {
		optimization = o.Int()
	}

	// create pot module object
	if js.Global().Get("pot").IsUndefined() {
		js.Global().Set("pot", js.ValueOf(make(map[string]interface{})))
	}
	pot_ := js.Global().Get("pot")

	// new KVS'
	// -------------------------------------------------
	pot_.Set("new", js.FuncOf(newKvs))
	pot_.Set("newSync", js.FuncOf(newSync))
	pot_.Set("newByReference", js.FuncOf(newByReference))
	pot_.Set("newByReferenceSync", js.FuncOf(newByReferenceSync))

	// support functions
	// -------------------------------------------------
	pot_.Set("hello", js.FuncOf(hello))
	pot_.Set("log", js.FuncOf(jslog))
	pot_.Set("setOptimization", js.FuncOf(setOptimization))
	pot_.Set("setVerbosity", js.FuncOf(setVerbosity))
	pot_.Set("NONE",     0)
	pot_.Set("CRITICAL", 1)
	pot_.Set("ERROR",    2)
	pot_.Set("INFO",     3)
	pot_.Set("DEBUG",    4)

	// test functions
	// -------------------------------------------------
	pot_.Set("testMode", js.FuncOf(testMode))
	pot_.Set("type_encoded_bytes", js.FuncOf(type_encoded_bytes_test))
	pot_.Set("type_decoded_value", js.FuncOf(type_decoded_value_test))
	pot_.Set("randKey", js.FuncOf(randKey))
	pot_.Set("randValue", js.FuncOf(randValue))
	pot_.Set("hangingPromise", js.FuncOf(hangingPromise))
	pot_.Set("setFail", js.FuncOf(setFail))
	pot_.Set("setPanic", js.FuncOf(setPanic))

	// storage mode /// TODO clean up. Ever used?
	js.Global().Set("pot_inmem", 1)

	// see defaultFunc declaration
	defaultFunc = js.FuncOf(func(_ js.Value, _ []js.Value) interface{} {
		log(ERR, "released function, no effect")
		return js.Null
	})

	log(INFO, "» init done")

	// signal to js that go wasm initialization is done
	if !js.Global().Get("onWasmLoaded").IsUndefined() {
		js.Global().Call("onWasmLoaded")
	}

	log(INFO, "» ready")

	// make program pause for its above-listed functions to stay available
	<-make(chan int)
}

// PROMISES --------------------------------------------------------------------

// promise() creates a Javascript promise or a Javascript error object. This
// function provides the promissification, it's a generic wrap. It receives
// the actual functionality to be performed by the executor of the created
// promise as function parameter.
func promise(js_call_context js.Value, parameters []js.Value, name string, function functionality) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in " + name + ": " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	executor := js.FuncOf(func(_ js.Value, handler_parameters []js.Value) interface{} {

		resolve := handler_parameters[0]
		reject := handler_parameters[1]

		go func() {

			jsvalue_or_jserr := function(js_call_context, parameters, false).(js.Value)
			if jsvalue_or_jserr.InstanceOf(js.Global().Get("Error")) {
				reject.Invoke(jsvalue_or_jserr)
			} else {
				resolve.Invoke(jsvalue_or_jserr)
			}
		}()

		return nil
	})

	return js.Global().Get("Promise").New(executor)
}

// cancelablePromise() creates a JS promise that has an additional method attached
// that allows to cancel it. This releases the waiting resources that might be
// pending on the Go side. For this, the cancel method is really a Go closure in
// the mandatory signature of the syscall/js functions, a js.Func.
/// TODO only used in put now, use for all promises created.
func cancelablePromise(function string, executor js.Func, ctxCancel context.CancelFunc) js.Value {

	promise := js.Global().Get("Promise").New(executor)

	var cancel js.Func
	cancel = js.FuncOf(func(_ js.Value, parameters []js.Value) interface{} {

		// this closure variable (that is a function) holds the
		// ctxCancel function available
		ctxCancel()
		/// TODO test: would this need to be in a go func to not deadlock?

		msg := "promise for " + function + " canceled"
		log(INFO, msg)

		// cancel promise, throw error
		reject := parameters[1]
		reject.Invoke(js.Global().Get("Error").New(msg))

		// free the resources used for this function after one use
		if optimization > NONE {
			cancel.Release()
			promise.Set("cancel", defaultFunc)
		}

		return js.Null()
	})

	// add the cancel method to the promise itself
	promise.Set("cancel", cancel)

	return promise
}

// errorPromise(), to throw an error, returns a promise that immediately rejects.
// This can combine conforming to the requirement that a promise needs to be
// returned by some function; with the need to throw an exception for an error.
// Calling a promise's reject function is the only way an exception can be
// triggered from syscall/js.
func errorPromise(msg string, function string, ping chan int) js.Value {

	var executor js.Func
	doubleEntry := false
	executor = js.FuncOf(func(_ js.Value, parameters []js.Value) interface{} {

		if doubleEntry {
			panic("double entry to errorPromise executor")
		}
		doubleEntry = true

		msg += " in " + function
		log(ERR, "xxx rejection thrown: " + msg)

		reject := parameters[1]
		reject.Invoke(js.Global().Get("Error").New(msg))
		/// test: would this need to be in a go func to not deadlock?

		if ping != nil {
			close(ping)
		}

		if optimization > NONE {
			executor.Release()
		}

		return nil
	})

	return js.Global().Get("Promise").New(executor)
}

/*
// holder of an error promise so it does not immediately disappear when used
// solely for throwing an error. Speculative.
var linger js.Value

// throw a JS error by creating a promise that immediately rejects, which
// is the way to get an error thrown on the JS side. Not used because the
// error arrives as "uncaught exception (in promise)", not from 'within' the
// sync call, NOT caught by a try-catch block including the sync call.
func throw(msg string, origin string) {
	ping := make(chan int)
	linger = errorPromise(msg, origin, ping)
	select {
	case <-ping:
		return
	}
}
*/

// -----------------------------------------------------------------------------
//
//   Support Functions
//
// -----------------------------------------------------------------------------

// LOGGING ---------------------------------------------------------------------

// log() makes a standardized log message to browser console or terminal,
// respecting the verbosity setting as set through setVerbosity(). The default
// is that all messages are logged. Messages whose level is too law, are
// ignored.
func log(level int, msg string) {
	if verbosity >= level {
		fmt.Println("pot:  " + msg)
	}
}

// JS pot.setVerbosity() can be called from Javascript to control which log()
// calls should be suppressed. Levels are:
//
// 0  NONE	no logging
// 1  CRITICAL	logs only errors that appear to arise from a POT JS malfunction.
// 2  ERROR	programming and runtime errors are also logged.
// 3  INFO	general runtime information is logged.
// 4  DEBUG	specific data, like put and get keys and values are logged.
//
// Note that the log prints to screen when running POT JS with node.js. In the
// browser, it logs into the browser console.
// Because the default level is 4 = DEBUG, a production program will always use
// setVerbosity() to change that. DEBUG is set for testing and learning.
func setVerbosity(_ js.Value, parameters []js.Value) interface{} {
	verbosity = parameters[0].Int() /// catch parameter error
	return nil
}

// JS pot.jslog() can be called from Javascript to test the log() function that,
// with a prefixed "pot: ", writes directly to stdout. This confirms that the
// connection to the WASM executable is operational. The function is called as
// pot.log() from Javascript (see main()).
func jslog(js_call_context js.Value, parameters []js.Value) interface{} {
	msg := ""
	if len(parameters) > 0 {
		msg = parameters[0].String() /// catch parameter error
	}
	log(INFO, msg) /// TODO document that this uses INFO level
	return nil
}

// OPTIMIZATION ----------------------------------------------------------------

// JS pot.setOptimization() can be used to switch off resource release to
// test for change in behavior or failures.
//
// 0  NONE	no resource release
// 1  STANDARD	resources, mainly functions, are released to prevent leaks
//
// The default setting is STANDARD.
func setOptimization(_ js.Value, parameters []js.Value) interface{} {
	optimization = parameters[0].Int() /// catch parameter error
	return nil
}


// CONTEXT ---------------------------------------------------------------------

// createContext() returns the right context (Background, WithTimout, or
// WithCancel) for a call coming from Javascript inspecting the JS parameters
// crossed over to it from the calling function.
/// TODO: now only used with put; roll out to all other apt places
func createContext(position int, parameters []js.Value, sync bool) (ctx context.Context, cancel context.CancelFunc, err error) {

	if len(parameters) >= position {
		p := parameters[position-1]
		if p.Type() == js.TypeNumber {
			timeout := p.Int()
			if timeout > 0 {
				ctx, cancel = context.WithTimeout(ctx, time.Duration(timeout)*time.Millisecond)
			}
		} else if !p.IsNull() && !p.IsUndefined() {
			log(ERR, "### timeout parameter type error")
			return nil, nil, errors.New("wrong type of timeout argument")
		}
	}

	if ctx == nil {
		if !sync {
			ctx, cancel = context.WithCancel(context.Background())
		} else {
			ctx = context.Background()
			cancel = nil
		}
	}

	return ctx, cancel, nil
}

// STRINGS AND BYTES -----------------------------------------------------------

// pad(), for keys, adds 0s to a byte array to attain a lenght of 32 bytes.
func pad(key []byte) ([]byte, error) {

	if len(key) > 32 {
		msg := "### error: key too long"
		log(ERR, msg)
		return nil, errors.New(msg)
	}
	// pad
	if len(key) < 32 {
		key = append(key, bytes.Repeat([]byte{0}, 32-len(key))...)
	}

	return key, nil
}

// js_to_key() casts a JS value to a Go byte array to use as key for putting or
// getting. There is NO type code. It accepts Numbers and Strings. Numbers are
// converted to their float byte representation. "1", 1, and "0x01" will thus
// be different keys but 1, 1.0, 0x1 and 01 the same. There is not strong way
// to tell integer and float apart as JS knows only one unified number type.
// This is an internal function that panics when it recieves a wrong JS type.
/// TODO don't panic.
func js_to_key(p js.Value) []byte {

	switch p.Type() {
	case js.TypeNumber:
		b := make([]byte, 8)
		binary.BigEndian.PutUint64(b, math.Float64bits(p.Float()))
		return b
	case js.TypeString:
		return []byte(p.String()) /// TODO check length
	case js.TypeObject: // JS Uint8Array
		b := make([]byte, p.Length())
		for i := 0; i < p.Length(); i++ {
			b[i] = byte(p.Index(i).Int())
		}
		return b /// TODO check length
	}
	panic("wrong type to convert to bytes: " + p.Type().String())
}

// js_to_bytes() casts from JS value to Go byte array for values. No type code
// byte is added. It accepts Boolean, Number, String, and Uint8Array. Numbers
// are converted to their float byte representation. "1", 1, and "0x01" will
// thus be be stored as different values but 1, 1.0, 0x1 and 01 the same. There
// is not strong way to tell integer and float apart as JS knows only one
// unified number type. This is an internal function that panics when it
// receives a wrong JS type.
/// TODO don't panic.
func js_to_bytes(p js.Value) []byte {

	switch p.Type() {
	case js.TypeBoolean:
		if p.Bool() {
			return []byte{TRUE}
		}
		return []byte{FALSE}
	case js.TypeNumber:
		b := make([]byte, 8)
		binary.BigEndian.PutUint64(b, math.Float64bits(p.Float()))
		return b
	case js.TypeString:
		return []byte(p.String())
	case js.TypeObject: // JS Uint8Array
		b := make([]byte, p.Length())
		for i := 0; i < p.Length(); i++ {
			b[i] = byte(p.Index(i).Int())
		}
		return b
	}
	panic("wrong type to convert to bytes: " + p.Type().String())
}

// jsarray_from_bytes() creates a JS Uint8Array from a Go []byte array.
func jsarray_from_bytes(value []byte) js.Value {

	size := len(value)
	dst := js.Global().Get("Uint8Array").New(size)
	if got := js.CopyBytesToJS(dst, value); got != size {
		panic("»»» byte copy failure")
	}
	return dst
}

// js_printable returns a Go string for any type js.Value
func js_printable(p js.Value) string {

	switch p.Type() {
	case js.TypeNull:
		return "null"
	case js.TypeBoolean:
		if p.Bool() {
			return "true"
		}
		return "false"
	case js.TypeNumber:
		return strconv.FormatFloat(p.Float(), 'f', -1, 64)
	case js.TypeString:
		return p.String()
	case js.TypeObject: // JS Uint8Array
		b := make([]byte, p.Length())
		for i := 0; i < p.Length(); i++ {
			b[i] = byte(p.Index(i).Int())
		}
		return bHex(b)
	}
	return "[unprintable]"
}

// type_encoded_bytes() encodes values from JS value to a go byte array leading
// in with a type byte. The code is:
//
//   0   NULL      null         nil
//   1   BOOLEAN   boolean      bool
//   2   NUMBER    number       float64
//   3   STRING    string       string
//   4   BYTES     Uint8Array   []byte
//
func type_encoded_bytes(p js.Value) (result []byte, rerr error) {

	defer func() {
		if err := recover(); err != nil { /// review
			/// fmt.Fprintln(os.Stderr, "### error in function type_decoded_value:", err)
			result = nil
			rerr = errors.New(err.(string))
		}
	}()

	switch p.Type() {
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
		// alterante storing as string:
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
	panic("wrong type to convert to type coded value: " + p.Type().String()) ///// make returned err and test on that

}

// JS pot.type_encoded_bytes_test() is for unit testing type_encoded_bytes() from JS.
func type_encoded_bytes_test(js_call_context js.Value, parameters []js.Value) interface{} {

	v := parameters[0]
	r, _ := type_encoded_bytes(v)
	return jsarray_from_bytes(r) //// return js error type for errors, and test
}

// type_decoded_value() decodes values from a Go byte array leading in with a
// type byte, to a JS Value. Only used in get().
func type_decoded_value(p []byte) (js.Value, error) {

	defer catch("type_decoded_value") //// make returned err? see type_encoded_bytes

	if len(p) == 0 {
		return js.Null(), nil
	}

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
		// alternate: f, _ := strconv.ParseFloat(string(p[1:]), 64)
		/// TODO error handling?
	case STRING:
		return js.ValueOf(string(p[1:])), nil
	case BYTES:
		return js.ValueOf(jsarray_from_bytes(p[1:])), nil
	default:
		return js.Null(), errors.New("invalid type code byte in: " + bHex(p))
	}
}

// JS pot.type_decoded_value_test() is a JS function for testing type_decoded_value()
func type_decoded_value_test(js_call_context js.Value, parameters []js.Value) interface{} {

	v := js_to_bytes(parameters[0])
	jsresult, goerror := type_decoded_value(v)
	if jsresult.Type() == js.TypeNull {
		return js.Global().Get("Error").New(goerror.Error())
	} else {
		return jsresult
	}
}

// bHex() casts from go byte array to go hex string. Convenience for string
// message assembly.
func bHex(p []byte) string {
	return hex.EncodeToString(p)
}

// toString() converts an error or a string into a string. Used for error 
// messages that are based on perculating errors or strings.
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

// ---------------------------------------------------------------------------
//
//  Test Functions
//
//  Because they are to help with testing, some of the support functions
//  have the syscall/js signature, are exported to and can be called from
//  Javascript.
//
// ---------------------------------------------------------------------------

// JS pot.hello() is a simple call target to test js/go cross calling.
func hello(js_call_context js.Value, parameters []js.Value) interface{} {

	log(INFO, "hello")

	return "hello, wasm!"
}

// catch() is a helper function that is passed to defer at the beginning of a
// function, catching panics to keep the wasm executable alive.
/// TODO replace richer by inline calls that populate return values.
func catch(function string) {
	if err := recover(); err != nil {
		fmt.Fprintln(os.Stderr, "### error in function", function, ":", err)
	}
}

// JS pot.randKey() creates a random byte sequence of 32 bytes for use
// as test key. Analog to pot test's keyValuePair() in kvs_tests.go.
func randKey(js_call_context js.Value, parameters []js.Value) interface{} {

	key := make([]byte, 32)
	rand.Read(key)
	log(DEB, "› created random key " + bHex(key) + " in go")
	result := js.Global().Get("Uint8Array").New(32)
	js.CopyBytesToJS(result, key)
	return result
}

// JS pot.randValue() creates a random byte sequence of 79 to 101 bytes for use
// as test value. Analog to pot test's keyValuePair() in kvs_tests.go.
/// TODO clarify why the length range
/// TODO test with long content are missing
/// TODO catch overlong content
func randValue(js_call_context js.Value, parameters []js.Value) interface{} {

	size := rand.Intn(79) + 22 /// from native go pot tests, why this lenght?
	value := make([]byte, size)
	rand.Read(value)
	log(DEB, "› created random " + strconv.Itoa(size) + " byte value " + bHex(value) + " in go")
	result := js.Global().Get("Uint8Array").New(size)
	js.CopyBytesToJS(result, value)
	return result
}

// JS pot.hangingPromise() is for testing only. It returns a promise that does
// nothing but sleep for quarter second and then return an error, unless it is
// cancelled before the second is over, in which case it returns a different
// error. It never invokes resolve().
func hangingPromise(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in hangingPromise: " + toString(err)
			log(CRIT, msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	done := make(chan bool)
	quit := make(chan bool)

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters []js.Value) interface{} {
		/// TODO "Func.Release must be called to free up resources when the
		/// function will not be invoked any more."
		/// https://cs.opensource.google/go/go/+/refs/tags/go1.24.0:src/syscall/js/func.go;l=44

		reject := handler_parameters[1]

		go func() {
			log(INFO, "sleeping")
			time.Sleep(time.Second / 4)
			select {
			case <-quit:
				return
			default:
			}
			log(INFO, "done sleeping")
			jserr := js.Global().Get("Error").New("done sleeping, nothing happened")
			reject.Invoke(jserr)
			done <- true
		}()

		go func() {
			select {
			case <-done:
			case <-quit:
				close(quit)
				reject.Invoke(js.Global().Get("Error").New("canceled"))
			}
		}()

		return nil
	})

	promise := js.Global().Get("Promise").New(handler)
	promise.Set("cancel", js.FuncOf(func(js.Value, []js.Value) interface{} { quit <- true; log(INFO, "canceled!"); return nil }))
	/// TODO "Func.Release must be called to free up resources when the
	/// function will not be invoked any more."
	/// https://cs.opensource.google/go/go/+/refs/tags/go1.24.0:src/syscall/js/func.go;l=44

	return promise
}

// JS pot.wipeSlots() is for testing. It deletes the internal bookkeeping of
// created maps to allow to test newByReference() as if a different program run
// had executed new() and save() and newByReference() cannot look their slot up.
// The side effect is that the maps created before with new() will crash or
// malfunction by using the handle of a different map.
/// TODO not used yet; cover in tests
func wipeSlots(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	Slots = Slots[:0]

	return nil
}
