// ---------------------------------------------------------------------------
//
// # SWARM POT JS
//
// This is an API from Javascript to the implementation of POT in Go.
// Go is compiled to WASM and the functions below mimic Javascript functions
// with the help of the Go package syscall/js.
//
// The functions are callable from Javascript. The Go signatures are uniform as
// required by syscall/js. The first parameter is JS' `this`, the second the
// array of the actual JS arguments to the JS-side function call. There are
// no formal, visible signatures that would visually reveal, which parameters
// are expected.
//
// Functions are not exported because they are not intended to be called
// directly by a Go function outside this package. The export to Javascript
// is by the Set(.. s.FuncOf(..)) calls.
//
// ---------------------------------------------------------------------------
package main

import (
	byt "bytes" /// clean up
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

	. "github.com/ethersphere/proximity-order-trie"
	"github.com/ethersphere/proximity-order-trie/pkg/persister"
)

const SYNC = true
const ASYNC = false

var _ KeyValueStore = (*SwarmKvs)(nil)

type Slot struct {
	Ref       int // index+1 in slots array
	Ctx       context.Context
	Ls        persister.LoadSaver
	allowSync bool
	Kvs       *SwarmKvs
}

// array of all slots
var Slots = []Slot{}

// Promise stores the context that allows to cleanly be canceled or timed out.
// https://pkg.go.dev/context has "Do not store Contexts inside a struct type",
// but https://go.dev/blog/context-and-structs details that this concretely
// means "do not pass a context into functions as part of a struct", plus,
// "do not store a context as element of an object, sharing it across methods."
// Promise is a different case as it provides the bridgehead this side of the
// language devide between Go and JS, and thus, the context is never passed
// around as part of the struct, it just serves to hold the context anywhere at
// all, a problem not discussed on those pages. The concern is that the handling
// of contexts must not interfere with their destiny to be branched into a tree.
// This is not impeded by the Promise struct, which holds roots of contexts.
type Promise struct {
	Ctx context.Context
}

// unlimited map of promises
// Note, this map is to run 'forever' with potentially many entries.
// while Go does not recycle the buckets, deleted entries are recovered
var promises = make(map[int]Promise)
var promRef = 0

var inMemoryPersister persister.LoadSaver

type jsFunc func(js.Value, []js.Value) interface{}
type functionality func(js.Value, []js.Value, bool) interface{}

var defaultFunc js.Func

// -----------------------------------------------------------------------------

func promise(js_call_context js.Value, parameters []js.Value, name string, function functionality) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in " + name + ": " + toString(err)
			log(msg)
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

func cancel(this js.Value, parameters []js.Value) (result interface{}) {

	p := this.Get("ref").Int() /// 0 and error check
	/// a user might change this
	// ctx

	delete(promises, p)

	log("cancelled!")

	return nil
}

// cancelablePromise creates a JS promise that has an additional method attached
// that allows to cancel it. This releases the waiting resources that might
// be pending on the Go side. For this, the cancel method is really a Go
// closure in the mandatory signature of the syscall/js functions (see jsFunc).
func cancelablePromise(function string, executor js.Func, ctxCancel context.CancelFunc) js.Value {

	promise := js.Global().Get("Promise").New(executor)

	//promRef += 17
	//promises[promRef] = Promise{Ctx: ctx}

	var cancel js.Func
	cancel = js.FuncOf(func(_ js.Value, parameters []js.Value) interface{} {

		// this closure holds the ctxCancel function available
		ctxCancel()
		/// test: would this need to be in a go func to not deadlock?

		msg := "promise for " + function + " canceled"
		log(msg)

		// cancel promise, throw error
		reject := parameters[1]
		reject.Invoke(js.Global().Get("Error").New(msg))

		// free the resources used for this function after one use
		cancel.Release()
		promise.Set("cancel", defaultFunc)

		return js.Null()
	})

	promise.Set("cancel", cancel)
	// promise.Set("ref", js.ValueOf(promRef))

	return promise
}

func createContext(position int, parameters []js.Value, sync bool) (ctx context.Context, cancel context.CancelFunc, err error) {

	if len(parameters) >= position {
		p := parameters[position-1]
		if p.Type() == js.TypeNumber {
			timeout := p.Int()
			if timeout > 0 {
				ctx, cancel = context.WithTimeout(ctx, time.Duration(timeout)*time.Millisecond)
			}
		} else if !p.IsNull() && !p.IsUndefined() {
			log("### timeout parameter type error")
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

// errorPromise to throw an error, returns a promise that immediately rejects.
// This is the only way an exception can be triggered from syscall/js.
func errorPromise(msg string, function string) js.Value {

	var executor js.Func
	executor = js.FuncOf(func(_ js.Value, parameters []js.Value) interface{} {

		msg += " in " + function
		log("xxx rejection thrown: " + msg)

		reject := parameters[1]
		reject.Invoke(js.Global().Get("Error").New(msg))
		/// test: would this need to be in a go func to not deadlock?

		executor.Release()

		return nil
	})

	return js.Global().Get("Promise").New(executor)
}

// NEW -------------------------------------------------------------------------

// Create a new Swarm KVS map, with a handle in the form of a Javascript object.
func newSync(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in newSwarmKvs: " + toString(err)
			log(msg)
			result = js.Global().Get("Error").New(msg) /// wrap and change to Go error
		}
	}()

	log("» initialize new P.O.T.")

	var ls persister.LoadSaver
	var allowSync bool

	// network parameters bee url and batch id (**)
	if len(parameters) >= 2 && !parameters[0].IsNull() && !parameters[0].IsUndefined() { // catch either null
		beeAPIURL := parameters[0].String()                           /// catch error
		postageIDBytes, _ := hex.DecodeString(parameters[1].String()) /// catch error / missing, also wrong lenght of hexstring (must be 64)
		ls = persister.NewSwarmLoadSaver(beeAPIURL, postageIDBytes)
		log("› created new network loader")
		allowSync = false
		// (note: make sure mock tests use this branch to allow sync calls)
	} else { /// error check for other parameter constellations
		if inMemoryPersister == nil {
			inMemoryPersister = persister.NewInmemLoadSaver()
			log("› created new in-memory persister")
		}
		ls = inMemoryPersister
		log("› using in-memory persister")
		allowSync = true
	}

	// -------------------------------------------------------------------
	kvs, err := NewSwarmKvs(ls)
	// -------------------------------------------------------------------
	if err != nil {
		msg := "### error in newSwarmKvs: " + err.Error()
		log(msg)
		return js.Global().Get("Error").New(msg)
	}

	// register context and kvs handle, take numerical index as handle
	slot_ref := len(Slots) + 1 // = starting on 1. /// add deletion
	Slots = append(Slots, Slot{Ctx: context.Background(), Kvs: kvs, Ref: slot_ref, Ls: ls, allowSync: allowSync})

	log("slot ref: " + strconv.Itoa(slot_ref))
	return createMapObject(slot_ref)
}

// Create a new Swarm KVS map, with a handle in the form of a Javascript object.
func new(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in new: " + toString(err)
			log(msg)
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

// Get access to an existing Swarm KVS JS object, using its 32-byte save handle.
// This method will break for in-memory load-savers when the program is stopped
// and restarted, as they will lose their storage. It will, as is, work for
// the connection to Swarm as the load-saver will then not be the instance
// where the data is stored but only the connection funnel to the data. Which
// in the case of using Swarm will mean that Swarm will persist the data.
// However, as it is implemented now, for in-memory load-savers, it will
// not work for Swarm either when the program is stopped and restarted, if the
// load-saver parameter was missing. /// TODO
func newByReferenceSync(this js.Value, parameters []js.Value) (result interface{}) {
	/// rename

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in newSwarmKvsReference: " + toString(err)
			log(msg)
			result = js.Global().Get("Error").New(msg) /// wrap and change to Go error
		}
	}()

	log("» load P.O.T. by reference")

	var ls persister.LoadSaver
	var allowSync bool

	if len(parameters) < 1 {
		msg := "### error in newByReference*(): reference required as 1st parameter"
		log(msg)
		return js.Global().Get("Error").New(msg) /// change to Go error
	}

	jsref32 := parameters[0] //// react if missing, too small/big
	ref32 := bytes(jsref32)  /// roll into one line

	// network parameters bee url and batch id (but for indices identical to (**))
	if len(parameters) >= 3 && !parameters[1].IsNull() && !parameters[1].IsUndefined() { // catch either null
		beeAPIURL := parameters[1].String()                           /// catch error
		postageIDBytes, _ := hex.DecodeString(parameters[2].String()) /// catch error / missing, also wrong lenght of hexstring (must be 64)
		log(string(postageIDBytes))
		log(strconv.Itoa(len(postageIDBytes)))
		ls = persister.NewSwarmLoadSaver(beeAPIURL, postageIDBytes)
		log("› created new network loader")
		allowSync = false
		// (note: make sure mock tests use this branch to allow sync calls)
	} else { /// error check for other parameter constellations
		if inMemoryPersister == nil {
			inMemoryPersister = persister.NewInmemLoadSaver()
			log("› created new in-memory persister")
		}
		ls = inMemoryPersister
		log("› using in-memory persister")
		allowSync = true
	}

	ctx := context.Background()

	// -------------------------------------------------------------------
	kvs, err := NewSwarmKvsReference(ctx, ls, ref32)
	// -------------------------------------------------------------------
	if err != nil {
		msg := "### error in newByReference*(): " + err.Error()
		log(msg)
		return js.Global().Get("Error").New(msg)
	}

	// register context and kvs handle, take numerical index as handle
	slot_ref := len(Slots) + 1 // = starting on 1. /// add deletion
	Slots = append(Slots, Slot{Ctx: ctx, Kvs: kvs, Ref: slot_ref, Ls: ls, allowSync: allowSync})

	log("slot ref: " + strconv.Itoa(slot_ref))
	return createMapObject(slot_ref)
}

func newByReference(this js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object /// strike, promise
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in newByReference: " + toString(err)
			log(msg)
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

// createMapObject creates the JS object that newSync() and
// newByReferenceSync() return and all put and get functions are members of.
// Go context and persiter are stored this side in a Slot array that slot_ref
// is an index to.
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
	jsMap.Set("getProof", js.FuncOf(getProof))

	return jsMap
}

// JS API:
func saveSync(this js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in save: " + toString(err)
			log(msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	log("» saving storage")

	slot_ref := this.Get("slot_ref").Int() /// error check
	if slot_ref < 1 {
		panic("invalid slot reference")
	}
	slot := Slots[slot_ref-1] /// error check
	///--ext_test: if slot.Kvs.Slot_ref != slot_ref { panic("slot double link broken ‹" + strconv.Itoa(slot_ref) + "› / ‹" + strconv.Itoa(slot.Kvs.Slot_ref) + "›") }
	/* ///
	if sync && !slot.allowSync {
		msg := "### error in getBooleanSync: no sync calls to swarm network"
		log(msg)
		return js.Global().Get("Error").New(msg)
	}
	*/
	// -------------------------------------------------------------------
	ref32, err := slot.Kvs.Save(slot.Ctx)
	// -------------------------------------------------------------------
	if err != nil {
		msg := "### error on saving: " + err.Error()
		log(msg)
		return js.Global().Get("Error").New(msg)
	}

	log(bHex(ref32))

	// return a JS Uint8Array
	jsref32 := js.Global().Get("Uint8Array").New(32)
	js.CopyBytesToJS(jsref32, ref32)
	return jsref32
}

func save(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in save: " + toString(err)
			log(msg)
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

// JS API: stores a raw byte value to a raw 32 byte key
func putRawSync(this js.Value, parameters []js.Value) (result interface{}) {

	return _putRawSync(this, parameters, true)
}

// internal: stores a raw byte value to a raw 32 byte key
func _putRawSync(this js.Value, parameters []js.Value, sync bool) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in put: " + toString(err)
			log(msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	// parameter count check
	if len(parameters) < 2 {
		msg := "### parameter count error: putRawSync() requires 2, got " + strconv.Itoa(len(parameters))
		log(msg)
		return js.Global().Get("Error").New(msg)
	}

	key := bytes(parameters[0]) /// error check / absence
	pkey, perr := pad(key)
	if perr != nil {
		return js.Global().Get("Error").New(perr.Error())
	}

	value := bytes(parameters[1])
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1]              /// error check

	if sync && !slot.allowSync {
		msg := "### error in put: no sync calls to swarm network"
		log(msg)
		return js.Global().Get("Error").New(msg)
	}

	// -------------------------------------------------------------------
	err := slot.Kvs.Put(slot.Ctx, pkey, value)
	// -------------------------------------------------------------------
	if err != nil {
		msg := "### error in put: " + err.Error()
		log(msg)
		return js.Global().Get("Error").New(msg)
	}

	log("» put " + bHex(pkey) + ": " + bHex(value) + "")
	return nil
}

// Async storing of a key-value pair, raw.
// Returns a Javascript promise that returns a JS Error to reject() on failure.
func putRaw(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in putRaw: " + toString(err)
			log(msg)
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
				log(msg)
				result = js.Global().Get("Error").New(msg)
			}
		}()

		resolve := handler_parameters[0]
		reject := handler_parameters[1]

		// parameter count check
		if len(parameters) < 2 { // sic. parameters, not handler_paramaters
			msg := "### parameter count error: putRaw() requires 2, got " + strconv.Itoa(len(parameters))
			log(msg)
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

func pad(key []byte) ([]byte, error) {

	if len(key) > 32 {
		msg := "### error: key too long"
		log(msg)
		return nil, errors.New(msg)
	}
	// pad
	if len(key) < 32 {
		key = append(key, byt.Repeat([]byte{0}, 32-len(key))...)
	}

	return key, nil
}

// JS API: retrieves a raw byte value for a raw 32 byte key
func getRawSync(this js.Value, parameters []js.Value) (result interface{}) {

	return _getRawSync(this, parameters, true)
}

// retrieves a raw byte value for a raw 32 byte key
func _getRawSync(this js.Value, parameters []js.Value, sync bool) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in get: " + toString(err)
			log(msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	bkey := bytes(parameters[0]) /// errror check
	pkey, perr := pad(bkey)
	if perr != nil {
		return js.Global().Get("Error").New(perr.Error())
	}
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1]              /// error check, pre, post (?)

	if sync && !slot.allowSync {
		msg := "### error in _get: no sync calls to swarm network"
		log(msg)
		return js.Global().Get("Error").New(msg)
	}

	// -------------------------------------------------------------------
	value, err := slot.Kvs.Get(slot.Ctx, pkey)
	// -------------------------------------------------------------------
	if err != nil {
		/// handle
	}

	log("» get " + bHex(pkey) + ": " + bHex(value) + "")

	return jsarray_from_bytes(value)
}

func getRaw(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in getRaw: " + toString(err)
			log(msg)
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

// PUT -------------------------------------------------------------------------

// Store a key-value pair, encoding the value type in the first value byte.
// For use directly from JS. Returns JS null or JS error.
func putSync(this js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in putSync(): " + toString(err)
			log("xxx returning panic - " + msg)
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
		log(msg)
		return js.Global().Get("Error").New(msg)
	}

	jsErrOrNull, _ := _putSync(ctx, this, parameters, SYNC)

	return jsErrOrNull
}

// Async storing of a key-value pair, encoding the value type in the first value byte.
// Returns a Javascript promise that returns a JS Error to reject() on failure.
func put(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return an error promise that throws right away
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in put: " + toString(err)
			log("xxx throwing panic - " + msg)
			result = errorPromise(err.(string), "put")
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
		return errorPromise(err.Error(), "put")
	}

	executor := js.FuncOf(func(executor_this js.Value, executor_parameters []js.Value) interface{} {
		/// TODO "Func.Release must be called to free up resources when the
		/// function will not be invoked any more."
		/// https://cs.opensource.google/go/go/+/refs/tags/go1.24.0:src/syscall/js/func.go;l=44

		// on panic, log, and return js Error object
		defer func() {
			if err := recover(); err != nil {
				msg := "### panic in put executor: " + toString(err)
				log(msg)
				result = js.Global().Get("Error").New(msg)
			}
		}()

		resolve := executor_parameters[0]
		reject := executor_parameters[1]

		// call parameter count check (not the executor parameter count)
		if len(parameters) < 2 {
			msg := "### parameter count error: put() requires 2, got " + strconv.Itoa(len(parameters))
			log(msg)
			reject.Invoke(js.Global().Get("Error").New(msg))
		}

		go func() {
			// The Go error type is not used, to make putTyped
			// usable also directly from JS, where only one result
			// is expected.
			jsvalue_or_jserr, _ := _putSync(ctx, js_call_context, parameters, ASYNC)
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
	// promise.Set("cancel", js.FuncOf(func(js.Value, []js.Value) interface{} { log("cancelled!") ; return nil }) )

	// return promise
}

// internal store of a key-value pair, encoding the value type in the first value byte.
func _putSync(ctx context.Context, this js.Value, parameters []js.Value, sync bool) (result js.Value, rerr error) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in put*(): " + toString(err)
			log(msg)
			result = js.Global().Get("Error").New(msg)
			rerr = errors.New(msg)
		}
	}()

	// grab slot of map
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1]              /// error check

	if sync && !slot.allowSync {
		msg := "### error in put*(): no sync calls to networks"
		log(msg)
		return js.Global().Get("Error").New(msg), errors.New(msg)
	}

	// parameter count check
	if len(parameters) < 2 {
		msg := "### parameter count error: put*() requires 2 or 3, got " + strconv.Itoa(len(parameters))
		log(msg)
		return js.Global().Get("Error").New(msg), errors.New(msg)
	}

	key := parameters[0] /// error check / absence
	bkey := bytes(key)   /// error check / absence
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
			log("» xxx put fail: " + msg) /// make debug-switched
			return js.Global().Get("Error").New(msg), errors.New(msg)
		default:
			msg := "### » put error: " + err.Error()
			log(msg)
			return js.Global().Get("Error").New(msg), errors.New(msg)
		}
	}
	// -------------------------------------------------------------------
	err = slot.Kvs.Put(ctx, pkey, cvalue)
	// -------------------------------------------------------------------
	if err != nil {
		msg := "### error in put*(): " + err.Error()
		log(msg)
		return js.Global().Get("Error").New(msg), errors.New(msg)
	}

	log("» put " + key.String() + ": " + value.String() + "")
	log("» ⟶  " + bHex(pkey) + ": " + bHex(cvalue) + "")
	return js.Null(), nil
}

// GET -------------------------------------------------------------------------

func getSync(this js.Value, parameters []js.Value) (result interface{}) {

	return _getSync(this, parameters, true)
}

func _getSync(this js.Value, parameters []js.Value, sync bool) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in getTyped: " + toString(err)
			log(msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	key := parameters[0] /// error check / absence
	bkey := bytes(key)   /// error check / absence
	pkey, perr := pad(bkey)
	if perr != nil {
		return js.Global().Get("Error").New(perr.Error())
	}
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1]              /// error check

	if sync && !slot.allowSync {
		msg := "### error in getTyped: no sync calls to swarm network"
		log(msg)
		return js.Global().Get("Error").New(msg)
	}

	// -------------------------------------------------------------------
	bvalue, err := slot.Kvs.Get(slot.Ctx, pkey)
	// -------------------------------------------------------------------
	if err != nil {
		log(err.Error())
		/// handle
	}
	value, err2 := type_decoded_value(bvalue)
	if err2 != nil {
		switch err2.Error() {
		case "bad type flag": //// refactor
			msg := "trying to get unknown type"
			log("» xxx get fail: " + msg) /// make debug-switched
			return js.Global().Get("Error").New(msg)
		default:
			log("### » get error: " + err2.Error())
			return js.Global().Get("Error").New(err2.Error())
		}
	}

	log("» get " + key.String() + ": " + value.String() + "")
	log("» ⟵  " + bHex(pkey) + ": " + bHex(bvalue) + "")

	return js.ValueOf(value)
}

// Async getting of a value, decoding the value type in the first value byte.
// Returns a Javascript promise that returns a JS Error to reject() on failure.
func get(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in get: " + toString(err)
			log(msg)
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

func getBoolean(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, "getBoolean", _getBooleanSync)
}

func getBooleanSync(this js.Value, parameters []js.Value) (result interface{}) {

	return _getBooleanSync(this, parameters, true)
}

func _getBooleanSync(this js.Value, parameters []js.Value, sync bool) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in getBoolean: " + toString(err)
			log(msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	bkey := bytes(parameters[0]) /// errror check
	pkey, perr := pad(bkey)
	if perr != nil {
		return js.Global().Get("Error").New(perr.Error())
	}
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1]              /// error check, pre, post (?)

	if sync && !slot.allowSync {
		msg := "### error in getBooleanSync: no sync calls to swarm network"
		log(msg)
		return js.Global().Get("Error").New(msg)
	}

	// -------------------------------------------------------------------
	value, err := slot.Kvs.Get(slot.Ctx, pkey)
	// -------------------------------------------------------------------
	if err != nil {
		/// handle
	}

	log("» get " + bHex(pkey) + ": " + bHex(value) + "")

	if value[0] == 0 {
		return js.ValueOf(false)
	}
	return js.ValueOf(true)
}

func getNumber(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, "getNumber", _getNumberSync)
}

func getNumberSync(this js.Value, parameters []js.Value) (result interface{}) {

	return _getNumberSync(this, parameters, true)
}

// Get a raw value as a floating point number (JS' standard for numbers).
func _getNumberSync(this js.Value, parameters []js.Value, sync bool) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in getNumber: " + toString(err)
			log(msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	bkey := bytes(parameters[0]) /// errror check
	pkey, perr := pad(bkey)
	if perr != nil {
		return js.Global().Get("Error").New(perr.Error())
	}
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1]              /// error check, pre, post (?)

	if sync && !slot.allowSync {
		msg := "### error in getNumberSync: no sync calls to swarm network"
		log(msg)
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

	log("» get " + bHex(pkey) + ": " + bHex(value) + " › " + fmt.Sprintf("%g", f))

	return js.ValueOf(f)
}

func getString(this js.Value, parameters []js.Value) (result interface{}) {

	return promise(this, parameters, "getString", _getStringSync)
}

func getStringSync(this js.Value, parameters []js.Value) (result interface{}) {

	return _getStringSync(this, parameters, true)
}

func _getStringSync(this js.Value, parameters []js.Value, sync bool) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in getStringSync: " + toString(err)
			log(msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	bkey := bytes(parameters[0]) /// errror check
	pkey, perr := pad(bkey)
	if perr != nil {
		return js.Global().Get("Error").New(perr.Error())
	}
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1]              /// error check, pre, post (?)

	if sync && !slot.allowSync {
		msg := "### error in getStringSync: no sync calls to swarm network"
		log(msg)
		return js.Global().Get("Error").New(msg)
	}

	// -------------------------------------------------------------------
	value, err := slot.Kvs.Get(slot.Ctx, pkey)
	// -------------------------------------------------------------------
	if err != nil {
		/// handle
	}

	log("» get " + bHex(pkey) + ": " + bHex(value) + "")

	return js.ValueOf(string(value))
}

func getProof(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in getProof: " + toString(err)
			log(msg)
			result = js.Global().Get("Error").New(msg)
		}
	}()

	return nil //// TODO
}

// MAIN ----------------------------------------------------------------------

// Expose functions to be called from JS-land, stay running on 'stand-by'.
func main() {

	log("» POTWASM")

	// create pot module object
	if js.Global().Get("pot").IsUndefined() {
		js.Global().Set("pot", js.ValueOf(make(map[string]interface{})))
	}
	pot_ := js.Global().Get("pot")

	// support functions
	// -------------------------------------------------
	pot_.Set("log", js.FuncOf(extlog))
	pot_.Set("randKey", js.FuncOf(randKey))
	pot_.Set("randValue", js.FuncOf(randValue))
	pot_.Set("hello", js.FuncOf(hello))
	// -------------------------------------------------
	pot_.Set("new", js.FuncOf(new))
	pot_.Set("newSync", js.FuncOf(newSync))
	pot_.Set("newByReference", js.FuncOf(newByReference))
	pot_.Set("newByReferenceSync", js.FuncOf(newByReferenceSync))
	// -------------------------------------------------
	pot_.Set("testMode", js.FuncOf(testMode))
	pot_.Set("type_encoded_bytes", js.FuncOf(type_encoded_bytes_test))
	pot_.Set("type_decoded_value", js.FuncOf(type_decoded_value_test))
	pot_.Set("hangingPromise", js.FuncOf(hangingPromise))
	pot_.Set("setFail", js.FuncOf(setFail))
	pot_.Set("setPanic", js.FuncOf(setPanic))

	// storage mode
	js.Global().Set("pot_inmem", 1)

	defaultFunc = js.FuncOf(func(_ js.Value, _ []js.Value) interface{} {
		log("released function, no effect")
		return js.Null
	})

	log("» init done")

	// signal to js that go wasm initialization is done
	if !js.Global().Get("onWasmLoaded").IsUndefined() {
		js.Global().Call("onWasmLoaded")
	}

	log("» ready")

	// make program pause for its above-listed functions to stay available
	<-make(chan int)
}

// -----------------------------------------------------------------------------
//
//   Support Functions
//
// -----------------------------------------------------------------------------

// standardized log message to browser console
func log(msg string) {
	fmt.Println("pot:  " + msg)
}

func extlog(js_call_context js.Value, parameters []js.Value) interface{} {
	msg := ""
	if len(parameters) > 0 {
		msg = parameters[0].String()
	}
	log(msg)
	return nil
}

// Cast from JS value to go byte array for keys. Not adding type code byte.
// Numbers are converted to their string representation rather than bytes,
// effectively making no difference between 1.23 and "1.23" but 0x01 and 1
// will not be equal keys (nor values). Else integers and floats would be
// treated very differently while there is no strong way to tell the types
// apart as JS knows only one unified number type.
func bytes(p js.Value) []byte {

	switch p.Type() {
	case js.TypeBoolean:
		if p.Bool() {
			return []byte{1}
		}
		return []byte{0}
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

func jsarray_from_bytes(value []byte) js.Value {

	size := len(value)
	dst := js.Global().Get("Uint8Array").New(size)
	if got := js.CopyBytesToJS(dst, value); got != size {
		panic("»»» byte copy failure")
	}
	return dst
}

// Encode values from JS value to a go byte array leading in with a type.
func type_encoded_bytes(p js.Value) (result []byte, rerr error) {

	defer func() {
		if err := recover(); err != nil { /// review
			// fmt.Fprintln(os.Stderr, "### error in function type_decoded_value:", err)
			result = nil
			rerr = errors.New(err.(string))
		}
	}()

	switch p.Type() {
	case js.TypeBoolean:
		if p.Bool() {
			return []byte{1, 1}, nil
		} else {
			return []byte{1, 0}, nil
		}
	case js.TypeNumber:
		b := make([]byte, 8)
		binary.BigEndian.PutUint64(b, math.Float64bits(p.Float()))
		return append([]byte{2}, b...), nil
		// alterante storing as string:
		// return append([]byte{2}, []byte(fmt.Sprintf("%g", p.Float()))...)
	case js.TypeString:
		return append([]byte{3}, []byte(p.String())...), nil
	case js.TypeObject: // JS Uint8Array
		b := make([]byte, p.Length()+1)
		b[0] = 4
		for i := 0; i < p.Length(); i++ {
			b[i+1] = byte(p.Index(i).Int())
		}
		return b, nil
	}
	panic("wrong type to convert to type coded value: " + p.Type().String()) ///// make returned err and test on that

}

// For unit testing from JS
func type_encoded_bytes_test(js_call_context js.Value, parameters []js.Value) interface{} {

	v := parameters[0]
	r, _ := type_encoded_bytes(v)
	return jsarray_from_bytes(r) //// return js error type for errors, and test
}

// Deccode values from a go byte array leading in with a type byte, to a JS Value.
func type_decoded_value(p []byte) (js.Value, error) {

	defer catch("type_decoded_value") //// make returned err? see type_encoded_bytes

	if len(p) == 0 {
		return js.Null(), nil
	}

	switch p[0] {
	case 0: // null
		return js.Null(), nil
	case 1: // boolean
		if p[1] != 0 {
			return js.ValueOf(true), nil
		} else {
			return js.ValueOf(false), nil
		}
	case 2: // number
		if len(p) != 9 {
			return js.Null(), errors.New("wrong byte count stored for float number: " + bHex(p))
		}
		f := math.Float64frombits(binary.BigEndian.Uint64(p[1:]))
		return js.ValueOf(f), nil
		// alternate: f, _ := strconv.ParseFloat(string(p[1:]), 64)
		/// TODO error handling? //// answer
	case 3: // string
		return js.ValueOf(string(p[1:])), nil
	case 4: // byte array
		return js.ValueOf(jsarray_from_bytes(p[1:])), nil
	default:
		return js.Null(), errors.New("invalid type code byte in: " + bHex(p))
	}
}

// For testing from JS
func type_decoded_value_test(js_call_context js.Value, parameters []js.Value) interface{} {

	v := bytes(parameters[0])
	jsresult, goerror := type_decoded_value(v)
	if jsresult.Type() == js.TypeNull {
		return js.Global().Get("Error").New(goerror.Error())
	} else {
		return jsresult
	}
}

// Cast from go byte array to go hex string. /// could be spelled out.
func bHex(p []byte) string {
	return hex.EncodeToString(p)
}

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
// ## Test Functions
//
// Because they are to help with testing, some of the support functions
// have the syscall/js signature, are exported to and can be called from
// Javascript.
//
// ---------------------------------------------------------------------------
// Keeping the go executable alive by catching random panics in functions.
// To be called as "defer catch()" at function start.

// Simple call target to test js/go cross calling.
func hello(js_call_context js.Value, parameters []js.Value) interface{} {

	log("hello")
	return "hello, wasm!"
}

func catch(function string) {
	if err := recover(); err != nil {
		fmt.Fprintln(os.Stderr, "### error in function", function, ":", err)
	}
}

// Analog to pot test's keyValuePair(), kvs_tests.go.
func randKey(js_call_context js.Value, parameters []js.Value) interface{} {

	key := make([]byte, 32)
	rand.Read(key)
	log("» created random key " + bHex(key) + " in go")
	result := js.Global().Get("Uint8Array").New(32)
	js.CopyBytesToJS(result, key)
	return result
}

// Analog to pot test's keyValuePair(), kvs_tests.go.
func randValue(js_call_context js.Value, parameters []js.Value) interface{} {

	size := rand.Intn(79) + 22 // from native go pot tests, why this lenght?
	value := make([]byte, size)
	rand.Read(value)
	log("» created random " + strconv.Itoa(size) + " byte value " + bHex(value) + " in go")
	result := js.Global().Get("Uint8Array").New(size)
	js.CopyBytesToJS(result, value)
	return result
}

// hangingPromise is for testing only. It returns a promise that does nothing
// but sleep for a second and then return an error, unless it is cancelled
// before the second is over, in which case it returns a different error. It
// never invokes resolve().
func hangingPromise(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() {
		if err := recover(); err != nil {
			msg := "### panic in hangingPromise: " + toString(err)
			log(msg)
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
			log("sleeping")
			time.Sleep(time.Second)
			select {
			case <-quit:
				return
			default:
			}
			log("done sleeping")
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
	promise.Set("cancel", js.FuncOf(func(js.Value, []js.Value) interface{} { quit <- true; log("canceled!"); return nil }))
	/// TODO "Func.Release must be called to free up resources when the
	/// function will not be invoked any more."
	/// https://cs.opensource.google/go/go/+/refs/tags/go1.24.0:src/syscall/js/func.go;l=44

	return promise
}

// wipeSlots is for testing only. It deletes the internal bookkeeping of created
// maps to allow to test newByReference() as if a different program run had
// executed new() and save() and newByReference() cannot look their slot up.
// The side effect is that the maps created before with new() will crash or
// malfunction by using the handle of a different map.
func wipeSlots(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	Slots = Slots[:0]

	return nil
}
