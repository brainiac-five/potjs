// ---------------------------------------------------------------------------
//
// # POT JS
//
// The functions callable from Javascript. The signatures are uniform as 
// required by syscall/js. The first parameter is `this`, the second the
// array of the actual (JS) arguments to the function call.
//
// ---------------------------------------------------------------------------
package main

import(
	"os"
	"fmt"
	"math"
	"time"
	byt "bytes" /// clean up
	"errors"
	"strconv"
	"context"
	"math/rand"
	"encoding/hex"
	"encoding/binary"
	"syscall/js"

	. "github.com/ethersphere/proximity-order-trie"
        "github.com/ethersphere/proximity-order-trie/pkg/persister"
)

var _ KeyValueStore = (*SwarmKvs)(nil)

var Saved = make(map[string]int)

type Slot struct {

	Ref int // index+1 in slots array
	Ctx context.Context
	Ls persister.LoadSaver
	allowSync bool
	Kvs *SwarmKvs
}

// array of all slots
var Slots = []Slot{}

type functionality func(js.Value, []js.Value, bool) interface{}

/// Async getting of a value, decoding the value type in the first value byte.
/// Returns a Javascript promise that returns a JS Error to reject() on failure.
func promise(js_call_context js.Value, parameters []js.Value, name string, function functionality) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() { if err := recover(); err != nil {
		msg := "### panic in " + name + ": " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

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

// Create a new Swarm KVS map, with a handle in the form of a Javascript object.
func newSync(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() { if err := recover(); err != nil {
		msg := "### panic in newSwarmKvs: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	log("» initialize new P.O.T.")

	var ls persister.LoadSaver
	var allowSync bool

	if len(parameters) == 2 && !parameters[0].IsNull() {
		beeAPIURL := parameters[0].String() /// catch error
		postageIDBytes,_ := hex.DecodeString(parameters[1].String()) /// catch error / missing, also wrong lenght of hexstring (must be 64)
		log(string(postageIDBytes))
		log(strconv.Itoa(len(postageIDBytes)))
		ls = persister.NewSwarmLoadSaver(beeAPIURL, postageIDBytes)
		allowSync = false
	// (note: make sure mock tests use this branch to allow sync calls)
	} else { /// error check for other parameter constellations
		ls = persister.NewInmemLoadSaver()
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
	defer func() { if err := recover(); err != nil {
		msg := "### panic in new: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters[]js.Value) interface{} {

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
	defer func() { if err := recover(); err != nil {
		msg := "### panic in newSwarmKvsReference: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	log("» select P.O.T. by save reference")

	if len(parameters) < 1 {
		msg := "### error: reference parameter required"
		log(msg)
		return js.Global().Get("Error").New(msg)
	}

	jsref32 := parameters[0] //// react if missing, too small/big
	ref32 := bytes(jsref32) /// roll into one line

	/// refactor to work without saving having happened first to fill the slot
	/// here xx
	if len(Saved) < 1 { panic("no references stored") }
	slot_ref := Saved[bhex(ref32)] /// error handling
	if slot_ref < 1 { panic("reference not found") }
	slot := Slots[slot_ref-1]
	log("slot ref: " + strconv.Itoa(slot_ref)) /// verbosity switch
	ls := slot.Ls
/*
from newSwarmKvs

	log("» initialize new P.O.T.")

	var ls persister.LoadSaver
	var allowSync bool

	if len(parameters) == 2 && !parameters[0].IsNull() {
		beeAPIURL := parameters[0].String() /// catch error
		postageIDBytes := bytes(parameters[1]) /// catch error / missing
		log(string(postageIDBytes))
		log(strconv.Itoa(len(postageIDBytes)))
		ls = persister.NewSwarmLoadSaver(beeAPIURL, postageIDBytes)
		allowSync = false
	// (note: make sure mock tests use this branch to allow sync calls)
	} else { /// error check for other parameter constellations
		ls = persister.NewInmemLoadSaver()
		allowSync = true
	}
*/

/* ///
	if sync && !slot.allowSync {
		msg := "### error in getBooleanSync: no sync calls to swarm network"
		log(msg)
		return js.Global().Get("Error").New(msg)
	}
*/
	// -------------------------------------------------------------------
	_, err := NewSwarmKvsReference(slot.Ctx, ls, ref32)
	// -------------------------------------------------------------------
	if err != nil {
		msg := "### error in newSwarmKvsReference: " + err.Error()
		log(msg)
		return js.Global().Get("Error").New(msg)
	}
/*
	// register context and kvs handle, take numerical index as handle
	slot_ref := len(Slots) + 1 // = starting on 1. /// add deletion
	Slots = append(Slots, Slot{Ctx: context.Background(), Kvs: kvs, Ref: slot_ref, Ls: ls, allowSync: allowSync})

	log("slot ref: " + strconv.Itoa(slot_ref))
	return createMapObject(slot_ref)
*/
	/// TODO may return new object to same slot
	return createMapObject(slot_ref)
}

func newByReference(this js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() { if err := recover(); err != nil {
		msg := "### panic in newByReference: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters[]js.Value) interface{} {

		resolve := handler_parameters[0] /// catch parameter errors
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
	defer func() { if err := recover(); err != nil {
		msg := "### panic in save: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	log("» saving storage")

	slot_ref := this.Get("slot_ref").Int() /// error check
	if slot_ref < 1 { panic("invalid slot reference") }
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

	log(bhex(ref32))

	Saved[bhex(ref32)] = slot_ref

	// return a JS Uint8Array
        jsref32 := js.Global().Get("Uint8Array").New(32)
        js.CopyBytesToJS(jsref32, ref32)
        return jsref32 
}

func save(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() { if err := recover(); err != nil {
		msg := "### panic in save: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters[]js.Value) interface{} {

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
	defer func() { if err := recover(); err != nil {
		msg := "### panic in put: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	// parameter count check
	if(len(parameters) < 2) {
		msg := "### parameter count error: putRawSync() requires 2, got " + strconv.Itoa(len(parameters))
		log(msg)
		return js.Global().Get("Error").New(msg)
	}

	key := bytes(parameters[0]) /// error check / absence
	pkey, perr := pad(key)
	if perr != nil {
		return perr
	}

	value := bytes(parameters[1])
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1] /// error check

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

	log("» put " + bhex(pkey) + ": " + bhex(value) + "")
	return nil
}

// Async storing of a key-value pair, raw.
// Returns a Javascript promise that returns a JS Error to reject() on failure.
func putRaw(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() { if err := recover(); err != nil {
		msg := "### panic in putRaw: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters[]js.Value) interface{} {

		// on panic, log, and return js Error object
		defer func() { if err := recover(); err != nil {
			msg := "### panic in putRaw executor: " + err.(string)
			log(msg)
			result = js.Global().Get("Error").New(msg)
		}}()

		resolve := handler_parameters[0]
		reject := handler_parameters[1]

		// parameter count check
		if(len(parameters) < 2) { // sic. parameters, not handler_paramaters
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

	promise := js.Global().Get("Promise").New(handler)
	promise.Set("cancel", js.FuncOf(func(js.Value, []js.Value) interface{} { log("cancelled!") ; return nil }) )

	return promise
}


func pad(key []byte) ([]byte, interface{}) {

	if len(key) > 32 { 
		msg := "### error: key too long"
		log(msg)
		return nil, js.Global().Get("Error").New(msg)
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
	defer func() { if err := recover(); err != nil {
		msg := "### panic in get: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	bkey := bytes(parameters[0]) /// errror check
	pkey, perr := pad(bkey)
	if perr != nil {
		return perr
	}
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1] /// error check, pre, post (?)

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

	log("» get " + bhex(pkey) + ": " + bhex(value) + "")

	return jsarray_from_bytes(value)
}

func getRaw(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() { if err := recover(); err != nil {
		msg := "### panic in getRaw: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters[]js.Value) interface{} {

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


// Store a key-value pair, encoding the value type in the first value byte.
// Usable directly from JS, and via put, its promise wrapper.
func putSync(this js.Value, parameters []js.Value) (result interface{}) {

	return _putSync(this, parameters, true)
}

// internal store of a key-value pair, encoding the value type in the first value byte.
func _putSync(this js.Value, parameters []js.Value, sync bool) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() { if err := recover(); err != nil {
		msg := "### panic in putTyped: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	// parameter count check
	if(len(parameters) < 2) {
		msg := "### parameter count error: putSync() requires 2, got " + strconv.Itoa(len(parameters))
		log(msg)
		return js.Global().Get("Error").New(msg)
	}

	key := parameters[0] /// error check / absence
	bkey := bytes(key) /// error check / absence
	pkey, perr := pad(bkey)
	if perr != nil {
		return perr
	}
	value := parameters[1]
	cvalue, err := type_encoded_bytes(value)
	if err != nil {
		switch err.Error() {
		case "bad type flag": //// refactor
			msg := "trying to put unknown type"
			log("» xxx put fail: " + msg) /// make debug-switched
			return js.Global().Get("Error").New(msg)
		default:
			log("### » put error: " + err.Error()) 
			return js.Global().Get("Error").New(err.Error())
		}
	}

	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1] /// error check

	if sync && !slot.allowSync {
		msg := "### error in _putTyped: no sync calls to swarm network"
		log(msg)
		return js.Global().Get("Error").New(msg)
	}

	// -------------------------------------------------------------------
	err = slot.Kvs.Put(slot.Ctx, pkey, cvalue)
	// -------------------------------------------------------------------
	if err != nil {
		msg := "### error in put: " + err.Error()
		log(msg)
		return js.Global().Get("Error").New(msg)
	}

	log("» put " + key.String() + ": " + value.String() + "")
	log("» ⟶  " + bhex(pkey) + ": " + bhex(cvalue) + "")
	return js.Null()
}

// Async storing of a key-value pair, encoding the value type in the first value byte.
// Returns a Javascript promise that returns a JS Error to reject() on failure.
func put(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() { if err := recover(); err != nil {
		msg := "### panic in put: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters[]js.Value) interface{} {

		// on panic, log, and return js Error object
		defer func() { if err := recover(); err != nil {
			msg := "### panic in put executor: " + err.(string)
			log(msg)
			result = js.Global().Get("Error").New(msg)
		}}()

		resolve := handler_parameters[0]
		reject := handler_parameters[1]

		// parameter count check
		if(len(parameters) < 2) { // sic. parameters, not handler_paramaters
			msg := "### parameter count error: put() requires 2, got " + strconv.Itoa(len(parameters))
			log(msg)
			reject.Invoke(js.Global().Get("Error").New(msg))
		}

		go func() {
			// The Go error type is not used, to make putTyped
			// usable also directly from JS, where only one result
			// is expected.
			jsvalue_or_jserr := _putSync(js_call_context, parameters, false).(js.Value)
			if jsvalue_or_jserr.InstanceOf(js.Global().Get("Error")) {
				reject.Invoke(jsvalue_or_jserr)
			} else {
				resolve.Invoke(jsvalue_or_jserr)
			}
		}()

		return nil
	})

	promise := js.Global().Get("Promise").New(handler)
	promise.Set("cancel", js.FuncOf(func(js.Value, []js.Value) interface{} { log("cancelled!") ; return nil }) )

	return promise
}


func getSync(this js.Value, parameters []js.Value) (result interface{}) {

	return _getSync(this, parameters, true)
}

func _getSync(this js.Value, parameters []js.Value, sync bool) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() { if err := recover(); err != nil {
		msg := "### panic in getTyped: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	key := parameters[0] /// error check / absence
	bkey := bytes(key) /// error check / absence
	pkey, perr := pad(bkey)
	if perr != nil {
		return perr
	}
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1] /// error check

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
	log("» ⟵  " + bhex(pkey) + ": " + bhex(bvalue) + "")

	return js.ValueOf(value)
}

// Async getting of a value, decoding the value type in the first value byte.
// Returns a Javascript promise that returns a JS Error to reject() on failure.
func get(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() { if err := recover(); err != nil {
		msg := "### panic in get: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters[]js.Value) interface{} {

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
	defer func() { if err := recover(); err != nil {
		msg := "### panic in getBoolean: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	bkey := bytes(parameters[0]) /// errror check
	pkey, perr := pad(bkey)
	if perr != nil {
		return perr
	}
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1] /// error check, pre, post (?)

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

	log("» get " + bhex(pkey) + ": " + bhex(value) + "")

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
	defer func() { if err := recover(); err != nil {
		msg := "### panic in getNumber: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	bkey := bytes(parameters[0]) /// errror check
	pkey, perr := pad(bkey)
	if perr != nil {
		return perr
	}
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1] /// error check, pre, post (?)

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

	log("» get " + bhex(pkey) + ": " + bhex(value) + " › " + fmt.Sprintf("%g",f))

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
	defer func() { if err := recover(); err != nil {
		msg := "### panic in getStringSync: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	bkey := bytes(parameters[0]) /// errror check
	pkey, perr := pad(bkey)
	if perr != nil {
		return perr
	}
	slot_ref := this.Get("slot_ref").Int() /// error check
	slot := Slots[slot_ref-1] /// error check, pre, post (?)

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

	log("» get " + bhex(pkey) + ": " + bhex(value) + "")

	return js.ValueOf(string(value))
}

func getProof(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() { if err := recover(); err != nil {
		msg := "### panic in getProof: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	return nil  //// TODO
}


// ---------------------------------------------------------------------------

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

	log("» init done")

	// signal to js that go wasm initialization is done
	if !js.Global().Get("onWasmLoaded").IsUndefined() {
		js.Global().Call("onWasmLoaded") 
	}

	log("» ready")

	// make program pause for its above-listed functions to stay available
	<-make(chan int)
}

// ---------------------------------------------------------------------------
//
// ## Support Functions
//
// ---------------------------------------------------------------------------


// standardized log message to browser console
func log(msg string) {
	fmt.Println("pot:  " + msg)
}

func extlog(js_call_context js.Value, parameters []js.Value) interface{} {
	msg := ""
	if(len(parameters) > 0) {
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

	defer func() { if err := recover(); err != nil { /// review
		// fmt.Fprintln(os.Stderr, "### error in function type_decoded_value:", err)
		result = nil
		rerr = errors.New(err.(string))
	}}()

	switch p.Type() {
	case js.TypeBoolean:
		if(p.Bool()) {
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
	r,_ := type_encoded_bytes(v)
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
			return js.Null(), errors.New("wrong byte count stored for float number: " + bhex(p))
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
		return js.Null(), errors.New("invalid type code byte in: " + bhex(p))
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
func bhex(p []byte) string {
	return hex.EncodeToString(p)
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
	log("» created random key " + bhex(key) + " in go")
	result := js.Global().Get("Uint8Array").New(32)
	js.CopyBytesToJS(result, key)
	return result
}

// Analog to pot test's keyValuePair(), kvs_tests.go.
func randValue(js_call_context js.Value, parameters []js.Value) interface{} {

	size := rand.Intn(79)+22 // from native go pot tests, why this lenght?
	value := make([]byte, size)
	rand.Read(value)
	log("» created random " + strconv.Itoa(size) + " byte value " + bhex(value) + " in go")
	result := js.Global().Get("Uint8Array").New(size)
	js.CopyBytesToJS(result, value)
	return result
}

func hangingPromise(js_call_context js.Value, parameters []js.Value) (result interface{}) {

	// on panic, log, and return js Error object
	defer func() { if err := recover(); err != nil {
		msg := "### panic in hangingPromise: " + err.(string)
		log(msg)
		result = js.Global().Get("Error").New(msg)
	}}()

	done := make(chan bool)
	quit := make(chan bool)

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters[]js.Value) interface{} {

		reject := handler_parameters[1]

		go func() {
			log("sleeping")
			time.Sleep(time.Second)
			select { case <-quit: return; default: }
			log("done sleeping")
			jserr := js.Global().Get("Error").New("done sleeping, nothing happened")
			reject.Invoke(jserr)
			done <- true
		}()

		go func() {
			select {
			case <- done:
			case <- quit:
				close(quit)
				reject.Invoke(js.Global().Get("Error").New("canceled")) 
			}
		}()

		return nil
	})

	promise := js.Global().Get("Promise").New(handler)
	promise.Set("cancel", js.FuncOf(func(js.Value, []js.Value) interface{} { quit <- true ; log("canceled!") ; return nil }) )

	return promise
}

