// ---------------------------------------------------------------------------
//
// # JS KVS TESTS
//
// For testing the JS API accessing the go pot package compiler to wasm.
//
// The tests are modeled on and extend the tests in go pot /kvs_test.go.
//
// They are made for execution in the browser to test the real target
// environment the API is made for as opposed to node.
//
// ---------------------------------------------------------------------------
package main

import(
	"os"
	"fmt"
	"math"
	"time"
	"errors"
	"strconv"
	"context"
	"math/rand"
	"encoding/hex"
	"encoding/binary"
	"syscall/js"
)

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

// Keeping the go executable alive by catching panics in test functions.
// To be called as "defer catch()" at function start.
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

// Simple call target to test js/go cross calling.
func hello(js_call_context js.Value, parameters []js.Value) interface{} {

	log("hello")
	return "hello, wasm!"
}

// Cast from JS value to go byte array for keys.
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

	defer func() { if err := recover(); err != nil {
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
// # MOCK KVS
//
// For JS API and js/go cross calling testing, these mock functions double
// for their corrollaries in the go pot package.
//
// ---------------------------------------------------------------------------

// Mock internal store for testing. It uses strings for keys as byte maps are 
// not allowable for keys in go.
type storeType struct {
	store map[string][]byte
	ctx context.Context
}

var store storeType
var store_of_stores = make(map[int] storeType)
var store_ref = 0

func newSwarmKvs(js_call_context js.Value, parameters []js.Value) interface{} { 

	defer catch("newSwarmKvs")
	log("» initialize new P.o.T.")
	log("» using mock in-memory test storage")
	store = storeType{make(map[string][]byte), context.Background()}
	store_ref = len(store_of_stores) + 1 // keeps 0 undefined
	store_of_stores[store_ref] = store
	return store_ref
}

func newSwarmKvsReference(js_call_context js.Value, parameters []js.Value) interface{} { 

	defer catch("newSwarmKvsReference")
	log("» select P.O.T. by reference")
	log("» using mock in-memory test storage")
	store_ref = parameters[0].Int() //// react if missing
	store = store_of_stores[store_ref]
	return store_ref
}

func save(js_call_context js.Value, parameters []js.Value) interface{} { 

	defer catch("save")
	log("» saving storage")
	log("» mock test reference " + strconv.Itoa(store_ref))
	if(len(store.store) < 1) {
		return 0
	}
	//store_of_stores[store_ref] = store
	return store_ref
}

func put(js_call_context js.Value, parameters []js.Value) interface{} {

	defer catch("put")
	key := bytes(parameters[0])
	value := bytes(parameters[1])
	store.store[bhex(key)] = value
	log("» put " + bhex(key) + ": " + bhex(value) + "")
	return nil 
}

func get(js_call_context js.Value, parameters []js.Value) interface{} {

	defer catch("get")
	key := bytes(parameters[0])
	value := store.store[bhex(key)]
	log("» get " + bhex(key) + ": " + bhex(value) + "")
	return jsarray_from_bytes(value)
}

// Store a key-value pair, encoding the value type in the first value byte.
// Usable directly from JS, and via putTypedPromise, its promise wrapper.
func putTyped(js_call_context js.Value, parameters []js.Value) interface{} {

	defer catch("putTyped")
	key := parameters[0] //// test & catch missing (test go still running)
	value := parameters[1]
	bkey := bytes(key) // same key logic as non-type coded mapping
	bvalue, err := type_encoded_bytes(value)
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
	store.store[bhex(bkey)] = bvalue
	log("» put " + key.String() + ": " + value.String() + "")
	log("» ⟶ " + bhex(bkey) + ": " + bhex(bvalue) + "")
	return nil
}

func hangingPromise(js_call_context js.Value, parameters []js.Value) interface{} {

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


// Async storing of a key-value pair, encoding the value type in the first value byte.
// Returns a Javascript promise that returns a JS Error to reject() on failure.
func putTypedPromise(js_call_context js.Value, parameters []js.Value) interface{} {

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters[]js.Value) interface{} {

		resolve := handler_parameters[0] //// catch missing
		reject := handler_parameters[1]

		go func() {

			jserr := putTyped(js_call_context, parameters)
			if jserr != nil {
				reject.Invoke(jserr)
			} else {
				resolve.Invoke()
			}
		}()

		return nil
	})

	promise := js.Global().Get("Promise").New(handler)
	promise.Set("cancel", js.FuncOf(func(js.Value, []js.Value) interface{} { log("cancelled!") ; return nil }) )

	return promise
}


// Async storing of a key-value pair, encoding the value type in the first value byte.
// Returns a Javascript promise that returns a JS Error to reject() on failure.
func putTypedPromiseAttempt1(js_call_context js.Value, parameters []js.Value) interface{} {

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters[]js.Value) interface{} {

		resolve := handler_parameters[0] //// catch missing
		reject := handler_parameters[1]

		go func() {

			jserr := putTyped(js_call_context, parameters)
			if jserr != nil {
				reject.Invoke(jserr)
			} else {
				resolve.Invoke()
			}
		}()

		return nil
	})

	cancler := js.FuncOf(func(handler_this js.Value, handler_parameters[]js.Value) interface{} {

		return nil
	})


	worker := js.Global().Get("Promise").New(handler)
	stopper := js.Global().Get("Promise").New(cancler)
	arr := make([]interface{}, 2)
	arr[0] = worker
	arr[1] = stopper

	a := js.Global().Get("Object").New()
	a.Set("0", worker)
	a.Set("1", stopper)

	log(a.Type().String())

	return js.Global().Get("Promise").Get("race").Invoke(a)
}

// Async storing of a key-value pair, encoding the value type in the first value byte.
// Returns a Javascript promise that returns a JS Error to reject() on failure.
func putTypedPromiseWorkingWell(js_call_context js.Value, parameters []js.Value) interface{} {

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters[]js.Value) interface{} {

		resolve := handler_parameters[0] //// catch missing
		reject := handler_parameters[1]

		go func() {

			jserr := putTyped(js_call_context, parameters)
			if jserr != nil {
				reject.Invoke(jserr)
			} else {
				resolve.Invoke()
			}
		}()

		return nil
	})

	promiseConstructor := js.Global().Get("Promise")
	return promiseConstructor.New(handler)
}

func putTypedDeprec(js_call_context js.Value, parameters []js.Value) interface{} {

	defer catch("putTyped")
	key := bytes(parameters[0]) // same key logic as non-type coded mapping
	value, err := type_encoded_bytes(parameters[1])
	if err != nil {
		switch err.Error() {
		case "bad type flag":
			log("### » put error: trying to put unknown type") 
		default:
			log("### » put error: " + err.Error()) 
		}
		return js.ValueOf(err.Error())
	}
	store.store[bhex(key)] = value
	log("» put " + bhex(key) + ": " + bhex(value) + "")
	return nil
}

func getTyped(js_call_context js.Value, parameters []js.Value) interface{} {

	defer catch("getTyped")
	key := parameters[0]
	bkey := bytes(key)
	bvalue := store.store[bhex(bkey)]
	value, err := type_decoded_value(bvalue)
	if err != nil {
		switch err.Error() {
		case "bad type flag": //// refactor
			msg := "trying to get unknown type"
			log("» xxx get fail: " + msg) /// make debug-switched
			return js.Global().Get("Error").New(msg)
		default:
			log("### » get error: " + err.Error()) 
			return js.Global().Get("Error").New(err.Error())
		}
	}
	log("» get " + key.String() + ": " + value.String() + "")
	log("» ⟵ " + bhex(bkey) + ": " + bhex(bvalue) + "")
	return value
}

// Async getting of a value, decoding the value type in the first value byte.
// Returns a Javascript promise that returns a JS Error to reject() on failure.
func getTypedPromise(js_call_context js.Value, parameters []js.Value) interface{} {

	handler := js.FuncOf(func(handler_this js.Value, handler_parameters[]js.Value) interface{} {

		resolve := handler_parameters[0]
		reject := handler_parameters[1]

		go func() {

			// The Go error type is not used, to make getTyped
			// usable also directly from JS, where only one result
			// is expected. Direct calls, however, may be useful
			// for prototyping against in-memory pots only.
			jsvalue_or_jserr := getTyped(js_call_context, parameters).(js.Value)
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

/// use?
func getRaw(js_call_context js.Value, parameters []js.Value) interface{} {

	return get(js_call_context, parameters)
}

func getBoolean(js_call_context js.Value, parameters []js.Value) interface{} {

	defer catch("getBoolean")
	key := bytes(parameters[0])
	value := store.store[bhex(key)]
	if value[0] == 0 {
		return false
	}
	return true
}

// Get a raw value as a floating point number (JS' standard for numbers).
func getNumber(js_call_context js.Value, parameters []js.Value) interface{} {

	defer catch("getNumber")
	key := bytes(parameters[0])
	value := store.store[bhex(key)]
	if len(value) != 8 {
		panic("wrong byte count of stored float")
	}
	f := math.Float64frombits(binary.BigEndian.Uint64(value))
	log("» get " + bhex(key) + ": " + bhex(value) + " › " + fmt.Sprintf("%g",f))
	return f
}

// Alternate Implementation based on storing numbers as strings.
func getNumberAlternate(js_call_context js.Value, parameters []js.Value) interface{} {

	defer catch("getNumberAlternate")
	key := bytes(parameters[0])
	value := store.store[bhex(key)]
	f, _ := strconv.ParseFloat(string(value), 64)
	fs := fmt.Sprintf("%g", f) // for logging only
	log("» get " + bhex(key) + ": " + bhex(value) + " › " + fs)
	return float64(f)
}

func getString(js_call_context js.Value, parameters []js.Value) interface{} {

	defer catch("getString")
	key := bytes(parameters[0])
	value := store.store[bhex(key)]
	return string(value)
}

func getProof(js_call_context js.Value, parameters []js.Value) interface{} {

	return nil
}


// ---------------------------------------------------------------------------

// Expose functions to be called from JS-land, stay running on 'stand-by'.
func main() {

	log("» POTWASM")

	// create pot module object
	js.Global().Set("pot", js.ValueOf(make(map[string]interface{})))

	pot := js.Global().Get("pot")

	// support functions
	// -------------------------------------------------
	pot.Set("log", js.FuncOf(extlog))
	pot.Set("randKey", js.FuncOf(randKey))
	pot.Set("randValue", js.FuncOf(randValue))
	pot.Set("hello", js.FuncOf(hello))
	// -------------------------------------------------
	pot.Set("newSwarmKvs", js.FuncOf(newSwarmKvs))
	pot.Set("newSwarmKvsReference", js.FuncOf(newSwarmKvsReference))
	pot.Set("save", js.FuncOf(save))
	pot.Set("put", js.FuncOf(put))
	pot.Set("get", js.FuncOf(get))
	pot.Set("putTyped", js.FuncOf(putTyped))
	pot.Set("getTyped", js.FuncOf(getTyped))
	pot.Set("putTypedPromise", js.FuncOf(putTypedPromise))
	pot.Set("getTypedPromise", js.FuncOf(getTypedPromise))
	pot.Set("getBoolean", js.FuncOf(getBoolean))
	pot.Set("getNumber", js.FuncOf(getNumber))
	pot.Set("getString", js.FuncOf(getString))
	pot.Set("getProof", js.FuncOf(getProof))
	// -------------------------------------------------
	pot.Set("type_encoded_bytes", js.FuncOf(type_encoded_bytes_test))
	pot.Set("type_decoded_value", js.FuncOf(type_decoded_value_test))
	pot.Set("hangingPromise", js.FuncOf(hangingPromise))

	// make program pause for its above-listed functions to stay available
	<- make(chan int)
}
