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
// Notes:
//
// (1) It is not possible to throw directly from Go to Javascript. Because
// the *Sync() functions are less relevant, syscall/js has not been modified
// to allow for it. See developer notes in doc/.
//
// (2) Numbers are stored in 8 byte IEEE 754 floating point format rather than
// strings because there are numerous NaNs that could cause the get() to return
// something else than the put() argument was. Additionally precision might
// change in fringe cases when converted to string and back.
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
	"strconv"
	"syscall/js"
	"time"

	. "github.com/ethersphere/proximity-order-trie" // . helps mocking
	"github.com/ethersphere/proximity-order-trie/pkg/persister"
)

var _ KeyValueStore = (*SwarmKvs)(nil)

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
type functionality func(context.Context, js.Value, []js.Value, bool, func([]byte) (js.Value, error), bool) (js.Value, bool)

// defaultFunc prevents crashing with 'object does not exist' after a
// Go-created JS function is released (freed for garbage collection).
// It is set as replacement where named functions are released but not for
// promise executors.
var defaultFunc js.Func

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
	CRIT = 1
	ERR  = 2
	INFO = 3
	DEB  = 4
)

// default log level: everything
var verbosity = DEB

// pre-cooked, recyclable methods of all js KVS objects
// They are singled out because they are not auto garbage collected
var jsPut js.Func
var jsGet js.Func
var jsPutRaw js.Func
var jsGetRaw js.Func
var jsGetBoolean js.Func
var jsGetNumber js.Func
var jsGetString js.Func
var jsPutSync js.Func
var jsGetSync js.Func
var jsPutRawSync js.Func
var jsGetRawSync js.Func
var jsGetBooleanSync js.Func
var jsGetNumberSync js.Func
var jsGetStringSync js.Func
var jsSave js.Func
var jsSaveSync js.Func

// NEW -------------------------------------------------------------------------

// JS pot.newSync() synchronously creates a new Swarm KVS, returning
// a Javascript object that anchors the KVS on the Javascript side,
// created in createMapObject(). On the Go POT-side, this is a strictly
// in-memory operation in all cases. It starts a multiplexer though that uses
// Go channels to sequence writes.
func newSync(this js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in newSync: " + toString(err)
			log(CRIT, msg)
			result = jsError(msg)
		}
	}()

	log(INFO, "» initialize new P.O.T.")

	var ls persister.LoadSaver
	var allowSync bool

	// network parameters bee url and batch id (**), either being null,
	// undefined, or not existant suffices to skip
	if len(parameters) >= 2 && parameters[0].Type() != js.TypeNull && parameters[0].Type() != js.TypeUndefined && parameters[1].Type() != js.TypeNull && parameters[1].Type() != js.TypeUndefined {

		if parameters[0].Type() != js.TypeString || parameters[1].Type() != js.TypeString {
			msg := "### error in newSync(): parameter type error for bee url or batch id"
			log(ERR, msg)
			return jsError(msg)
		}

		if len(parameters[0].String()) < 1 {
			msg := "### error in newSync(): parameter error, missing bee url"
			log(ERR, msg)
			return jsError(msg)
		}

		if len(parameters[1].String()) != 64 {
			msg := "### error in newSync(): parameter size error for batch id, expected 64 hex digits"
			log(ERR, msg)
			return jsError(msg)
		}

		beeAPIURL := parameters[0].String()
		postageIDBytes, err := hex.DecodeString(parameters[1].String())

		if err != nil {
			msg := "### error in newSync(): invalid batch id"
			log(ERR, msg)
			return jsError(msg)
		}

		// create the Swarm loader that connects to the network
		// --------------------------------------------------------
		ls = persister.NewSwarmLoadSaver(beeAPIURL, postageIDBytes)
		// --------------------------------------------------------
		log(INFO, "› created new network loader")
		allowSync = false

		// In-Memory Storage
	} else {
		// create a new one or re-use an existant in-memory persister
		if inMemoryPersister == nil {

			// ----------------------------------------------
			inMemoryPersister = persister.NewInmemLoadSaver()
			// ----------------------------------------------
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
		msg := "### error in newSync: " + err.Error()
		log(ERR, msg)
		return jsError(msg)
	}

	// register context and kvs handle, take numerical index as handle
	slot_ref := len(Slots) + 1 // = starting on 1.
	Slots = append(Slots, Slot{Ctx: context.Background(), Kvs: kvs, Ref: slot_ref, Ls: ls, allowSync: allowSync})

	log(DEB, "› slot ref: " + strconv.Itoa(slot_ref))
	return createMapObject(slot_ref)
}

// JS pot.newKvs() asynchronously creates a new Swarm KVS, returning the promise
// for a Javascript object that anchors the KVS on the Javascript side, created
// in createMapObject(). On the Go POT-side, this is a strictly in-memory
// operation in all cases. It starts a multiplexer though that uses Go channels
// to sequence writes.
func newKvs(this js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in new: " + toString(err)
			log(CRIT, msg)
			result = jsError(msg)
		}
	}()

	var handler js.Func
	handler = js.FuncOf(func(handler_this js.Value, handler_parameters []js.Value) interface{} {

		resolve := handler_parameters[0]
		reject := handler_parameters[1]

		go func() {

			// The Go error type is not used, to make newSync()
			// usable also directly from JS, where only one result
			// is expected.
			jsvalue_or_jserr := newSync(this, parameters).(js.Value)
			if jsvalue_or_jserr.InstanceOf(js.Global().Get("Error")) {
				reject.Invoke(jsvalue_or_jserr)
			} else {
				resolve.Invoke(jsvalue_or_jserr)
			}
		}()

		// free the resources used for this function after one use
		if optimization > NONE {
			handler.Release()
		}

		return nil
	})

	return js.Global().Get("Promise").New(handler)
}

// JS pot.loadSync() loads an existing Swarm KVS JS object, using its
// 32-bytei save handle.  This method will break for in-memory load-savers when
// the program is stopped and restarted, as they will lose their storage. It works
// for the connection to Swarm as the load-saver will then not be the instance
// where the data is stored but only the connection to the data, which is stored
// on Swarm.
func loadSync(this js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in loadSync: " + toString(err)
			log(CRIT, msg)
			result = jsError(msg)
		}
	}()

	log(INFO, "» load P.O.T. by reference")

	var ls persister.LoadSaver
	var allowSync bool

	if len(parameters) < 1 {
		msg := "### error in load*(): 32 byte KVS reference required as 1st parameter"
		log(ERR, msg)
		return jsError(msg)
	}

	jsref32 := parameters[0] // no checks as jsToByte() handles any type.

	ref32, err := jsToBytes(jsref32)

	// type might be untranslateable (symbol, function)
	if err != nil {
		msg := "### error in load*(): " + err.Error()
		log(CRIT, msg)
		return jsError(msg)
	}

	// network parameters bee url and batch id (but for indices identical to (**))
	if len(parameters) >= 3 && !parameters[1].IsNull() && !parameters[1].IsUndefined() { // catch either null
		beeAPIURL := parameters[1].String()                           /// TODO  catch error
		postageIDBytes, _ := hex.DecodeString(parameters[2].String()) /// TODO  catch error / missing, also wrong lenght of hexstring (must be 64)
		log(DEB, "› postage id: "+string(postageIDBytes))
		ls = persister.NewSwarmLoadSaver(beeAPIURL, postageIDBytes)
		log(INFO, "› created new network loader")
		allowSync = false
		// (note: make sure mock tests use this branch to allow sync calls) /// ? revisit
	} else { /// TODO  error check for other parameter constellations
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
		msg := "### error in load*(): " + err.Error()
		log(ERR, msg)
		return jsError(msg)
	}

	// register context and kvs handle, take numerical index as handle
	slot_ref := len(Slots) + 1 // = starting on 1. /// TODO  add deletion
	Slots = append(Slots, Slot{Ctx: ctx, Kvs: kvs, Ref: slot_ref, Ls: ls, allowSync: allowSync})

	log(DEB, "› slot ref: "+strconv.Itoa(slot_ref))
	return createMapObject(slot_ref)
}

// JS pot.load() asynchronously loads an existing Swarm KVS JS object,
// using its 32-bytei save handle to return a promise to a KVS anchor object. This
// method will break for in-memory load-savers when the program is stopped and
// restarted, as they will lose their storage. It works for the connection to
// Swarm as the load-saver will then not be the instance where the data is stored
// but only the connection to the data, which is stored on Swarm.
func load(this js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error promise
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in load: " + toString(err)
			log(CRIT, msg)
			result = jsError(msg) /// TODO  make promise + others like it, too
			result = errorPromise(msg)
		}
	}()

	var handler js.Func
	handler = js.FuncOf(func(handler_this js.Value, handler_parameters []js.Value) interface{} {

		resolve := handler_parameters[0]
		reject := handler_parameters[1]

		go func() {

			// The Go error type is not used, to make loadSync()
			// usable also directly from JS, where only one result
			// is expected.
			jsvalue_or_jserr := loadSync(this, parameters).(js.Value)
			if jsvalue_or_jserr.InstanceOf(js.Global().Get("Error")) {
				reject.Invoke(jsvalue_or_jserr)
			} else {
				resolve.Invoke(jsvalue_or_jserr)
			}
		}()

		// free the resources used for this function after one use
		if optimization > NONE {
			handler.Release()
		}

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

// createMapObject() creates the JS KVS object that new*() and load*()
// return - directly or by promise -  and all put and get functions are members
// of.  Go context and persister are stored this side in a Slot array that
// slot_ref is an index to.
func createMapObject(slot_ref int) js.Value {

	// create Javascript handle object
	jsMap := js.ValueOf(make(map[string]interface{}))

	// the numeric handle bridges preserved ctx and persister to JS.
	jsMap.Set("slot_ref", slot_ref)

	// add standard methods
	jsMap.Set("put", jsPut)
	jsMap.Set("get", jsGet)
	jsMap.Set("putRaw", jsPutRaw)
	jsMap.Set("getRaw", jsGetRaw)
	jsMap.Set("getBoolean", jsGetBoolean)
	jsMap.Set("getNumber", jsGetNumber)
	jsMap.Set("getString", jsGetString)
	jsMap.Set("putSync", jsPutSync)
	jsMap.Set("getSync", jsGetSync)
	jsMap.Set("putRawSync", jsPutRawSync)
	jsMap.Set("getRawSync", jsGetRawSync)
	jsMap.Set("getBooleanSync", jsGetBooleanSync)
	jsMap.Set("getNumberSync", jsGetNumberSync)
	jsMap.Set("getStringSync", jsGetStringSync)
	jsMap.Set("save", jsSave)
	jsMap.Set("saveSync", jsSaveSync)

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
			result = jsError(msg)
		}
	}()

	log(INFO, "» saving storage")

	slot_ref := this.Get("slot_ref").Int() /// TODO  error check
	if slot_ref < 1 {
		panic("invalid slot reference")
	}
	slot := Slots[slot_ref-1] /// TODO  error check
	/// TODO --ext_test: if slot.Kvs.Slot_ref != slot_ref { panic("slot double link broken ‹" + strconv.Itoa(slot_ref) + "› / ‹" + strconv.Itoa(slot.Kvs.Slot_ref) + "›") }
	/* /// TODO
	if sync && !slot.allowSync {
		msg := "### error in getBooleanSync: no sync calls to swarm network"
		log(ERR, msg)
		return jsError(msg)
	}
	*/
	// -------------------------------------------------------------------
	ref32, err := slot.Kvs.Save(slot.Ctx)
	// -------------------------------------------------------------------
	if err != nil {
		msg := "### error on saving: " + err.Error()
		log(ERR, msg)
		return jsError(msg)
	}

	log(DEB, "› ref32: "+bHex(ref32))

	// return a JS Uint8Array
	jsref32 := js.Global().Get("Uint8Array").New(32)
	js.CopyBytesToJS(jsref32, ref32)
	return jsref32
}

// JS kvs.save() writes cached updates to the storage and returns a promise to a
// 32 byte reference to the saved KVS that is used to retrieve the trie later.
func save(this js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in save: " + toString(err)
			log(CRIT, msg)
			result = jsError(msg)
		}
	}()

	var handler js.Func
	handler = js.FuncOf(func(handler_this js.Value, handler_parameters []js.Value) interface{} {

		resolve := handler_parameters[0]
		reject := handler_parameters[1]

		go func() {

			// The Go error type is not used, to make saveSync()
			// usable also directly from JS, where only one result
			// is expected.
			jsvalue_or_jserr := saveSync(this, parameters).(js.Value)
			if jsvalue_or_jserr.InstanceOf(js.Global().Get("Error")) {
				reject.Invoke(jsvalue_or_jserr)
			} else {
				resolve.Invoke(jsvalue_or_jserr)
			}
		}()

		if optimization > NONE {
			handler.Release()
		}

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

// PUT -------------------------------------------------------------------------

// JS kvs.put() asynchronously stores a key-value pair, encoding the value type
// in the first byte of what is written to the storage. Returns a Javascript
// promise that returns null on success or throws a JS Error on failure.
func put(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, 3, "put", _put, TYPED, nil)
}

// JS kvs.putRaw() asynchronously stores a key-value pair in raw format.
// The key can be a string, number, or boolean.  Returns a Javascript promise
// for the kvs anchor object or throws a JS Error on failure.
func putRaw(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, 3, "put", _put, RAW, nil)
}

// JS kvs.putSync() synchronously stores a key-value pair, encoding the value
// type in the first byte of what is written to storage. It returns Javaascript
// null on success or an JS error. It does not throw, see (1).
func putSync(this js.Value, parameters []js.Value) (result interface{}) {

	return first(_put(context.Background(), this, parameters, TYPED, nil, SYNC))
}

// JS kvs.putRawSync() synchronously stores a key-value pair in raw format.
// The key can be a string, number, or boolean.
// / TODO check key byte conversion ---
func putRawSync(this js.Value, parameters []js.Value) (result interface{}) {

	return first(_put(context.Background(), this, parameters, RAW, nil, SYNC))
}

// _put() is the internal put function that put() and putSync() are using
// to store a key-value pair, encoding the value type in the first byte.
// It handles raw, as well as type-coded; sync as well as async functions.
// The sync functions call it directly, blocking, the async functions wrap it
// into a promisses' executor that calls it asynchronously.
// / TEST: overlong keys
// / TODO catch overlong content
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
		msg := "### error in put*(): no sync calls to networks"
		log(ERR, msg)
		return jsError(msg), false
	}

	key := parameters[0] // existence already checked in calling function
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
	jsValue := parameters[1] // ditto
	if raw {
		bValue, _ = jsToBytes(jsValue) /// TODO  error check
	} else { // type-coded
		bValue, err = typeEncodedBytes(jsValue)
		if err != nil {
			switch err.Error() {
			case "bad type flag": /// TODO / refactor
				msg := "trying to put unknown type"
				log(ERR, "» xxx put fail: "+msg) /// TODO  make debug-switched
				return jsError(msg), false
			default:
				msg := "### » put error: " + err.Error()
				log(ERR, msg)
				return jsError(msg), false
			}
		}
	}

	debug := ""
	if len(parameters) >= 4 {
		debug = "[" + jsToString(parameters[3]) + "]"
	}

	// -------------------------------------------------------------------
	err = slot.Kvs.Put(ctx, pkey, bValue)
	// -------------------------------------------------------------------
	if err != nil {
		msg := "### error in put*(): " + err.Error()
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
// Returns a Javascript promise for the value that throws a JS error on failure.
// A value that does not exist results in Javascript `undefined` being returned.
func get(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, 2, "get", _get, TYPED, nil)
}

// JS kvs.getSync() synchronously retrieves a value for a key, decoding the value
// type in the first value byte and casting the value appropriately for JS.
// It returns the retrieved value as Javascript value or a Javascript error.
// A value that does not exist results in Javascript `undefined` being returned.
func getSync(this js.Value, parameters []js.Value) (result interface{}) {

	return first(_get(context.Background(), this, parameters, TYPED, nil, SYNC))
}

// GET RAW ---------------------------------------------------------------------

// JS kvs.getRaw() asynchronously retrieves a raw byte value for a key.
// If used on a value that was stored using put(), it returns the type code
// as first byte. putRaw() does not add this byte.
// getRaw() returns a promise for the value that will throw a JS error on
// failure.  A value that does not exist results in Javascript `undefined`
// being returned.
func getRaw(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, 2, "get", _get, RAW, nil)
}

// JS kvs.getRawSync() synchronously retrieves a raw byte value for a key.
// If used on a value that was stored using put(), it returns the type code
// as first byte. putRaw() does not add this byte.
// getRawSync() returns the value or a JS error on failure. It does not throw,
// see (1). A value that does not exist returns a Javascript `undefined`.
func getRawSync(this js.Value, parameters []js.Value) (result interface{}) {

	return first(_get(context.Background(), this, parameters, RAW, nil, SYNC))
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

	return first(_get(context.Background(), this, parameters, RAW, castBoolean, SYNC))
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

	return first(_get(context.Background(), this, parameters, RAW, castNumber, SYNC))
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

	return first(_get(context.Background(), this, parameters, RAW, castString, SYNC))
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
		msg := "### error in get*(): no sync calls to networks"
		log(ERR, msg)
		return jsError(msg), false
	}

	key := parameters[0] // existence already checked in calling function
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

			// propagate error
		} else {
			msg := wrap(err)
			log(ERR, msg)
			return jsError(msg), false
		}

		// no error
	} else {

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

			// type-coded value
		} else {
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

	// The following js.Funcs are created once and not released for the
	// lifetime of the executable.

	// new KVS'
	// -------------------------------------------------
	pot_.Set("new", js.FuncOf(newKvs))
	pot_.Set("newSync", js.FuncOf(newSync))
	pot_.Set("load", js.FuncOf(load))
	pot_.Set("loadSync", js.FuncOf(loadSync))

	// support functions
	// -------------------------------------------------
	pot_.Set("hello", js.FuncOf(hello))
	pot_.Set("log", js.FuncOf(jsLog))
	pot_.Set("setOptimization", js.FuncOf(setOptimization))
	pot_.Set("setVerbosity", js.FuncOf(setVerbosity))
	pot_.Set("NONE", 0)
	pot_.Set("CRITICAL", 1)
	pot_.Set("ERROR", 2)
	pot_.Set("INFO", 3)
	pot_.Set("DEBUG", 4)

	// test functions
	// -------------------------------------------------
	pot_.Set("testMode", js.FuncOf(testMode))
	pot_.Set("typeEncodedBytes", js.FuncOf(typeEncodedBytesTest))
	pot_.Set("typeDecodedValue", js.FuncOf(typeDecodedValueTest))
	pot_.Set("randKey", js.FuncOf(randKey))
	pot_.Set("randValue", js.FuncOf(randValue))
	pot_.Set("hangingPromise", js.FuncOf(hangingPromise))
	pot_.Set("setFail", js.FuncOf(setFail))
	pot_.Set("setPanic", js.FuncOf(setPanic))

	// see defaultFunc declaration
	defaultFunc = js.FuncOf(func(_ js.Value, _ []js.Value) interface{} {
		log(ERR, "released function, no effect")
		return js.Null
	})

	// These are pre-cooked, re-usable functions for KVS objects that are
	// never explicitly released. This avoids creating new js.Funcs for
	// every new object. They are held in globals.
	jsPut = js.FuncOf(put)
	jsGet = js.FuncOf(get)
	jsPutRaw = js.FuncOf(putRaw)
	jsGetRaw = js.FuncOf(getRaw)
	jsGetBoolean = js.FuncOf(getBoolean)
	jsGetNumber = js.FuncOf(getNumber)
	jsGetString = js.FuncOf(getString)
	jsPutSync = js.FuncOf(putSync)
	jsGetSync = js.FuncOf(getSync)
	jsPutRawSync = js.FuncOf(putRawSync)
	jsGetRawSync = js.FuncOf(getRawSync)
	jsGetBooleanSync = js.FuncOf(getBooleanSync)
	jsGetNumberSync = js.FuncOf(getNumberSync)
	jsGetStringSync = js.FuncOf(getStringSync)
	jsSave = js.FuncOf(save)
	jsSaveSync = js.FuncOf(saveSync)

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

// promise() creates a Javascript promise or a Javascript error object < /// ?. This
// function provides the promissification, it's a generic wrap. It receives
// the actual functionality to be performed by the executor of the created
// promise as function parameter.
func promise(this js.Value, parameters []js.Value, timeOutPos int, name string, function functionality, raw bool, caster func([]byte) (js.Value, error)) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in " + name + ": " + toString(err)
			log(CRIT, msg)
			result = errorPromise(msg)
		}
	}()

	// get appropriate context
	ctx, cancel, err := createContext(timeOutPos, parameters, ASYNC)

	// time out parameter could have wrong type
	if err != nil {
		msg := err.Error() + " in " + name
		log(ERR, msg)
		return errorPromise(msg)
	}

	executor := js.FuncOf(func(_ js.Value, handler_parameters []js.Value) (result interface{}) {

		// on panic (in 'function'), log, and return js Error object
		defer func() {
			if err := recover(); err != nil {
				msg := "### panic in " + name + ": " + toString(err)
				log(CRIT, msg)
				result = jsError(msg)
			}
		}()

		resolve := handler_parameters[0]
		reject := handler_parameters[1]

		go func() {

			jsvalue_or_jserr, ok := function(ctx, this, parameters, raw, caster, ASYNC)
			if ok {
				resolve.Invoke(jsvalue_or_jserr)
			} else {
				reject.Invoke(jsvalue_or_jserr)
			}
		}()

		return nil
	})

	return cancelablePromise(name, executor, cancel)
}

// cancelablePromise() creates a JS promise that has an additional method attached
// that allows to cancel it. This releases the waiting resources that might be
// pending on the Go side. For this, the cancel method is really a Go closure in
// the mandatory signature of the syscall/js functions, a js.Func.
func cancelablePromise(function string, executor js.Func, ctxCancel context.CancelFunc) js.Value {

	promise := js.Global().Get("Promise").New(executor)

	var cancel js.Func
	cancel = js.FuncOf(func(_ js.Value, parameters []js.Value) interface{} {

		// this closure variable (that is a function) holds the
		// ctxCancel function of the context that communicates the
		// cancellation downwards
		ctxCancel()

		msg := "%%% promise for " + function + " canceled"
		log(INFO, msg)

		// cancel promise, throw error
		reject := parameters[1] /// TEST
		reject.Invoke(jsError(msg))

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
// This combines conforming to the requirement that a promise needs to be
// returned by some function; with the need to throw an exception for an error.
// Calling a promise's reject function is the only way an exception can be
// triggered from syscall/js.
func errorPromise(msg string) js.Value {

	var executor js.Func
	doubleEntry := false
	executor = js.FuncOf(func(_ js.Value, parameters []js.Value) interface{} {

		// should never happen. To monitor/protect function release.
		if doubleEntry {
			panic("double entry to errorPromise executor")
		}
		doubleEntry = true

		log(ERR, "xxx rejection thrown: "+msg)

		reject := parameters[1]
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
// calls should be suppressed. It returns the previoius setting. Levels are:
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
// setVerbosity() to change that. DEBUG is set for testing and learning. /// TEST
func setVerbosity(_ js.Value, parameters []js.Value) interface{} {

	before := verbosity

	if len(parameters) > 0 {
		p := parameters[0]
		if p.Type() != js.TypeNumber {
			return jsError("parameter type error. Number expected.")
		}
		if p.Int() < 0 || p.Int() > DEB {
			return jsError("parameter range error. 0-4 are valid.")
		}

		// set
		verbosity = p.Int()
	}

	return before
}

// JS pot.jsLog() can be called from Javascript to test the log() function that,
// with a prefixed "pot: ", writes directly to stdout. This confirms that the
// connection to the WASM executable is operational. The function is called as
// pot.log() from Javascript (see main()).
// / TODO document default CRIT and 2nd parameter /// TEST it
func jsLog(this js.Value, parameters []js.Value) interface{} {

	msg := "" // note empty log() allowed for line break
	if len(parameters) >= 1 {
		msg = parameters[0].String()
	}

	// optional log level
	var level = CRIT
	if len(parameters) >= 2 {
		if parameters[1].Type() == js.TypeNumber {
			level = parameters[1].Int()
		}
	}

	log(level, msg)

	return nil
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

// SLOTS AND CONTEXT -----------------------------------------------------------

func getSlot(this js.Value) (Slot, error) {

	jsSlotRef := this.Get("slot_ref")

	if jsSlotRef.Type() != js.TypeNumber {
		return Slot{}, errors.New("### critical error: slot_ref member missing or altered")
	}

	slotRef := jsSlotRef.Int()

	if slotRef < 1 || slotRef > len(Slots) { // sic, bec shifted by 1
		return Slot{}, errors.New("### critical error: slot_ref member invalid")
	}

	slot := Slots[slotRef-1]

	return slot, nil
}

// createContext() returns the right context (Background, WithTimout, or
// WithCancel) for a call coming from Javascript inspecting the JS parameters
// crossed over to it from the calling function.
func createContext(position int, parameters []js.Value, sync bool) (ctx context.Context, cancel context.CancelFunc, err error) {

	if len(parameters) >= position {
		p := parameters[position-1]
		if p.Type() == js.TypeNumber {
			timeout := p.Int()
			if timeout > 0 {
				ctx, cancel = context.WithTimeout(ctx, time.Duration(timeout)*time.Millisecond)
			}
		} else if !p.IsNull() && !p.IsUndefined() { /// TODO check type checking
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
// / TODO take error checks down -- length checks should happen elsewhere.
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

// jsToKey() casts a JS value to a Go byte array to use as key for putting or
// getting. There is NO type code. It accepts Numbers and Strings. Numbers are
// converted to their float byte representation. "1", 1, and "0x01" will thus
// be different keys but 1, 1.0, 0x1 and 01 the same. There is no strong way
// to tell integer and float apart as JS knows only one unified number type.
//
// TODO KEYS ARE NOT BIJECTIVE IN THIS WAY. THIS FUNCTION IS N:1. HOWEVER,
// FIXING THIS WOULD NECESSARILY REQUIRE TO DROP UINT8ARRAY AS ALLOWABLE INPUT
// OR TO MOVE TO TYPE-CODING LIKE FOR VALUES.
func jsToKey(p js.Value) ([]byte, error) {

	switch p.Type() {

	case js.TypeNumber:
		b := make([]byte, 8)
		binary.BigEndian.PutUint64(b, math.Float64bits(p.Float()))
		return b, nil

	case js.TypeString:
		b := []byte(p.String())
		if len(b) > 32 {
			return nil, errors.New("key string too long") /// TEST
		}
		return []byte(p.String()), nil

	case js.TypeObject: // JS Uint8Array
		if p.Length() > 32 {
			return nil, errors.New("key array too long") /// TEST
		}
		b := make([]byte, p.Length())
		for i := 0; i < p.Length(); i++ {
			e := p.Index(i)
			if e.Type() != js.TypeNumber {
				return nil, errors.New("wrong type of element for a key array: " + e.Type().String()) /// TEST
			}
			b[i] = byte(p.Index(i).Int())
		}
		return b, nil /// TODO check length
	}

	return nil, errors.New("wrong type for a key: " + p.Type().String()) /// TEST
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
// exclusively for logging and debugging, thus does error or panic but just
// returns "[unprintable]" when it fails (does not cover Symbols and Functions
// types).
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
	}
	return "[unprintable]"
}

// typeEncodedBytes() encodes values from JS value to a go byte array leading
// in with a type byte. The code is:
//
// byte  const     Javascript   Go          excl.   incl. type byte
//
//	0   NULL      null         nil          0+      1+
//	1   BOOLEAN   boolean      bool         1+      2+
//	2   NUMBER    number       float64      8       9
//	3   STRING    string       string       0+      1+
//	4   BYTES     Uint8Array   []byte       0+      1+
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
		/// TODO error handling?
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
// as test key. Analog to pot test's keyValuePair() in kvs_tests.go.
func randKey(this js.Value, parameters []js.Value) interface{} {

	key := make([]byte, 32)
	rand.Read(key)
	log(DEB, "› created random key "+bHex(key)+" in go")
	result := js.Global().Get("Uint8Array").New(32)
	js.CopyBytesToJS(result, key)
	return result
}

// JS pot.randValue() creates a random byte sequence of 79 to 101 bytes for use
// as test value. Analog to pot test's keyValuePair() in kvs_tests.go.
// / TEST: long and overlong content
func randValue(this js.Value, parameters []js.Value) interface{} {

	size := rand.Intn(79) + 22 /// TODO taken from native go pot tests, why this lenght?
	value := make([]byte, size)
	rand.Read(value)
	log(DEB, "› created random "+strconv.Itoa(size)+" byte value "+bHex(value)+" in go")
	result := js.Global().Get("Uint8Array").New(size)
	js.CopyBytesToJS(result, value)
	return result
}

// JS pot.hangingPromise() is for testing only. It returns a promise that does
// nothing but sleep for quarter second and then return an error, unless it is
// cancelled before the second is over, in which case it returns a different
// error. It never invokes resolve().
func hangingPromise(this js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in hangingPromise: " + toString(err)
			log(CRIT, msg)
			result = jsError(msg)
		}
	}()

	done := make(chan bool)
	quit := make(chan bool)

	var executor js.Func
	executor = js.FuncOf(func(executor_this js.Value, executor_parameters []js.Value) interface{} {

		reject := executor_parameters[1]

		go func() {
			log(INFO, "sleeping")
			time.Sleep(time.Second / 4)
			select {
			case <-quit:
				return
			default:
			}
			log(INFO, "done sleeping")
			jserr := jsError("done sleeping, nothing happened")
			reject.Invoke(jserr)
			done <- true
		}()

		go func() {
			select {
			case <-done:
			case <-quit:
				close(quit)
				reject.Invoke(jsError("canceled")) /// TODO  log?
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
		log(INFO, "canceled!")
		if optimization > NONE {
			cancel.Release()
		}
		return nil
	})

	promise.Set("cancel", cancel)

	return promise
}

// JS pot.wipeSlots() is for testing. It deletes the internal bookkeeping of
// created maps to allow to test load() as if a different program run
// had executed new() and save() and load() cannot look their slot up.
// The side effect is that the maps created before with new() will crash or
// malfunction by using the handle of a different map.
// / TODO not used yet; cover in tests
func wipeSlots(this js.Value, parameters []js.Value) (result interface{}) {

	Slots = Slots[:0]

	return nil
}
