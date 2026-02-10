//go:build ext_test

// ---------------------------------------------------------------------------
//
// # JS API TESTS
//
// For testing the JS API accessing the go pot implementation through WASM.
//
// This code is not part of a production build. The functions are replaced
// in production by the noop stubs in nomock.go.
//
// ---------------------------------------------------------------------------
package main

import (
	"context"
	"errors"
	"maps"
	"math/rand"
	"strconv"
	"syscall/js"
	"time"

	"github.com/ethersphere/proximity-order-trie/pkg/persister"
)

// SwarmKvs is a mock struct replacing pot.SwarmKvs of the Go implementation
type SwarmKvs struct {
	Slot_ref int
	Ref32    string
	Store    map[string][]byte
}

// Saved is the simulated storage where KVSs are `saved` to on save()
// the key is a randomly created pseudo save reference, the value the
// string of the hex digits of the KVS's ref32.
var Saved = make(map[string]string)

// These variables are set by setFail() etc. and set to 0/false
// once used once. They are for testing and have no production purpose.
var fail = false
var panix = false
var delay = 0 // milliseconds
var hang = false
var noop = false

// testMode() returns a string indicating for what tests POT JS is been built.
func testMode(_ js.Value, parameters []js.Value) interface{} {
	return "simulation"
}

// setFail() instructs the next mock POT KVS function called to fail, for
// testing.
func setFail(_ js.Value, parameters []js.Value) interface{} {
	if parameters[0].Bool() {
		log(INFO, "» set up for failure")
	}
	fail = parameters[0].Bool()
	return nil
}

// setPanic() instructs the next mock POT KVS function called to panic, for
// testing.
func setPanic(_ js.Value, parameters []js.Value) interface{} {
	if parameters[0].Bool() {
		log(INFO, "» set up for panic")
	}
	panix = parameters[0].Bool()
	return nil
}

// setDelay() instructs the next mock POT KVS function called to delay
// execution, for mS milliseconds, for testing.
func setDelay(_ js.Value, parameters []js.Value) interface{} {
	log(INFO, "» set up delay of "+strconv.Itoa(parameters[0].Int())+" ms")
	delay = parameters[0].Int()
	return nil
}

// setHang() instructs the next mock POT KVS function called to hang, or not,
// for testing.
func setHang(_ js.Value, parameters []js.Value) interface{} {
	if parameters[0].Bool() {
		log(INFO, "» set up for hanging")
	}
	hang = parameters[0].Bool()
	return nil
}

// setNoop() instructs the next mock POT KVS put function called to not store
// or get or delete anything to not use any memory in leak-testing.
func setNoop(_ js.Value, parameters []js.Value) interface{} {
	if parameters[0].Bool() {
		log(INFO, "» set no-op")
	}
	noop = parameters[0].Bool()
	return nil
}

// mockFail() returns the status of the `fail` setting
func mockFail() bool {
	f := fail
	fail = false
	return f
}

// mockPanic() triggers a panic, if setPanic() has been called beforehand.
// Unsets the panix flag, so the next mockPanic() call will not trigger a panic
// unless setPanic() was called again.
func mockPanic(where string) {
	if panix {
		log(INFO, "» mock panic …")
		panix = false
		panic("mock panic at " + where)
	}
}

// mockDelay() delays the program until cancelled or time is up, if setDelay()
// has been called before to set the delay time. Sets the delay time to 0.
func mockDelay(ctx context.Context) error {
	d := time.Duration(delay) * time.Millisecond
	delay = 0
	if d > 0 {
		now := time.Now().UnixNano() / int64(time.Millisecond)
		log(INFO, "» mock delay …")
		select {
		case <-ctx.Done():
			then := time.Now().UnixNano()/int64(time.Millisecond) - now
			log(INFO, "» mock delay done at "+strconv.Itoa(int(then))+" ms")
			return ctx.Err()
		case <-time.After(d):
			then := time.Now().UnixNano()/int64(time.Millisecond) - now
			log(INFO, "» mock delay over after "+strconv.Itoa(int(then))+" ms")
		}
	}
	return nil
}

// mockHang() stops the program until cancelled, if setHang() has been called.
// Unsets the hang flag, the next mockHang() call will hang only after setHang()
// has been called again.
func mockHang(ctx context.Context) error {
	h := hang
	hang = false
	if h {
		now := time.Now().UnixNano() / int64(time.Millisecond)
		log(INFO, "» mock hanging …")
		select {
		case <-ctx.Done():
			then := time.Now().UnixNano()/int64(time.Millisecond) - now
			log(INFO, "» mock hanging done at "+strconv.Itoa(int(then))+" ms")
			return ctx.Err()
		}
	}
	return nil
}

// NewSwarmKvs() creates a new mock test key-value store.
func NewSwarmKvs(_ persister.LoadSaver) (*SwarmKvs, error) {

	log(DEB, "› using simulated storage")

	if mockFail() {
		return nil, errors.New("mock fail of NewSwarmKvs()")
	}

	mockPanic("NewSwarmKvs()")

	slot_ref, ref32 := newID(slots, false)
	kvs := &SwarmKvs{Store: make(map[string][]byte), Slot_ref: slot_ref, Ref32: ref32}

	return kvs, nil
}

// NewSwarmKvsReference() loads a mock key-value store from the given root hash.
func NewSwarmKvsReference(ctx context.Context, _ persister.LoadSaver, saveRef32 []byte) (*SwarmKvs, error) {

	log(DEB, "› using simulated storage")

	if mockFail() {
		return nil, errors.New("mock fail of NewSwarmKvsReference()")
	}

	mockPanic("NewSwarmKvsReference()")

	err := mockDelay(ctx)
	if err != nil {
		return nil, err
	}

	err = mockHang(ctx)
	if err != nil {
		return nil, err
	}

	// noop: just return an empty, new kvs
	if noop {
		noop = false
		slot_ref, ref32 := newID(slots, false)
		kvs := &SwarmKvs{Store: make(map[string][]byte), Slot_ref: slot_ref, Ref32: ref32}
		return kvs, nil
	}

	ref32 := Saved[bHex(saveRef32)]
	slot := SlotMap[ref32]
	kvs := slot.Kvs

	return kvs, nil
}

// Get() retrieves the value of the given key from the mock storage.
func (ps *SwarmKvs) Get(ctx context.Context, key []byte) ([]byte, error) {

	log(DEB, "› using simulated storage")

	if mockFail() {
		return nil, errors.New("mock fail of Get()")
	}

	mockPanic("Get()")

	err := mockDelay(ctx)
	if err != nil {
		return nil, err
	}

	err = mockHang(ctx)
	if err != nil {
		return nil, err
	}

	if noop {
		noop = false
		return []byte{0x3, 'a', 'b', 'c'}, nil
	}

	value := ps.Store[bHex(key)]

	if value == nil {
		return []byte{}, errors.New("not found")
	}

	return value, nil
}

// Put() stores the given key-value pair in the mock store.
func (ps *SwarmKvs) Put(ctx context.Context, key []byte, value []byte) error {

	log(DEB, "› using simulated storage")

	if mockFail() {
		return errors.New("mock fail of Put()")
	}

	mockPanic("Put()")

	err := mockDelay(ctx)
	if err != nil {
		return err
	}

	err = mockHang(ctx)
	if err != nil {
		return err
	}

	if noop {
		noop = false
		return nil
	}

	ps.Store[bHex(key)] = value

	return nil
}

// Delete() drops a key-value pair from the mock store.
func (ps *SwarmKvs) Delete(ctx context.Context, key []byte) error {

	log(DEB, "› using simulated storage")

	if mockFail() {
		return errors.New("mock fail of Delete()")
	}

	mockPanic("Delete()")

	err := mockDelay(ctx)
	if err != nil {
		return err
	}

	err = mockHang(ctx)
	if err != nil {
		return err
	}

	if noop {
		noop = false
		return nil
	}

	delete(ps.Store, bHex(key))

	return nil
}

// Save() saves key-value pair to the underlying storage and returns the reference.
func (ps *SwarmKvs) Save(ctx context.Context) (rref []byte, rerr error) {

	defer func() {
		if err := recover(); err != nil {
			rref = []byte{}
			rerr = err.(error)
		}
	}()

	log(DEB, "› using simulated storage")

	if mockFail() {
		return nil, errors.New("mock fail of Save()")
	}

	mockPanic("Save()")

	err := mockDelay(ctx)
	if err != nil {
		return nil, err
	}

	err = mockHang(ctx)
	if err != nil {
		return nil, err
	}

	// return a random reference, which will do with an empty root
	if noop {
		noop = false
		key := make([]byte, 32)
		rand.Read(key)
		return key, nil
	}

	if ps.Slot_ref < 1 {
		msg := "invalid slot"
		log(CRIT, msg)
		return []byte{}, errors.New(msg)
	}

	// slot to 'save' (clone)
	slot, exists := SlotMap[ps.Ref32]
	if !exists {
		msg := "invalid slot ‹" + ps.Ref32 + "›"
		log(CRIT, msg)
		return []byte{}, errors.New(msg)
	}

	// check 0 length -- this is a feature of the pot.InMemLoadSaver
	if len(slot.Kvs.Store) < 1 {
		msg := "nothing to store"
		log(ERR, msg)
		return []byte{}, errors.New(msg)
	}

	// new, cloned slot#
	slot_ref, ref32 := newID(slots, false)

	// clone map to be 'saved'
	kvs := &SwarmKvs{Store: maps.Clone(slot.Kvs.Store), Slot_ref: slot_ref, Ref32: ref32}
	SlotMap[ref32] = Slot{Ctx: context.Background(), Kvs: kvs, Ref: slot_ref, Ref32: ref32, Ls: slot.Ls, allowSync: slot.allowSync}

	saveRef32 := make([]byte, 32)
	rand.Read(saveRef32)
	log(DEB, "› simulated save reference "+bHex(saveRef32))

	Saved[bHex(saveRef32)] = ref32
	log(DEB, "› simulated save of kvs in slot #"+strconv.Itoa(ps.Slot_ref)+" cloned new slot #"+strconv.Itoa(slot_ref)+" to key "+bHex(saveRef32))

	return saveRef32, nil
}

func (ps *SwarmKvs) Close() error {
	return nil
}
