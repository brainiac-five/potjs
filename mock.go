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
	Store    map[string][]byte
}

// Saved is the simulated storage where KVSs are `saved` to on save()
var Saved = make(map[string]int)

// These variables are set by setFail() etc. and set to 0/false
// once used once. They are for testing and have no production purpose.
var fail = false
var panix = false
var delay = 0 // milliseconds
var hang = false

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
	log(INFO, "» set up delay of " + strconv.Itoa(parameters[0].Int()) + " ms")
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
			then := time.Now().UnixNano() / int64(time.Millisecond) - now
			log(INFO, "» mock delay done at " + strconv.Itoa(int(then)) + " ms")
			return ctx.Err()
		case <-time.After(d):
			then := time.Now().UnixNano() / int64(time.Millisecond) - now
			log(INFO, "» mock delay over after " + strconv.Itoa(int(then)) + " ms")
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
			then := time.Now().UnixNano() / int64(time.Millisecond) - now
			log(INFO, "» mock hanging done at " + strconv.Itoa(int(then)) + " ms")
			return ctx.Err()
		}
	}
	return nil
}

// NewSwarmKvs() creates a new mock test key-value store.
func NewSwarmKvs(_ persister.LoadSaver) (*SwarmKvs, error) {

	log(INFO, "» using simulated storage")

	if mockFail() {
		return nil, errors.New("mock fail of NewSwarmKvs()")
	}
	mockPanic("NewSwarmKvs()")

	kvs := &SwarmKvs{Store: make(map[string][]byte), Slot_ref: len(Slots) + 1}

	return kvs, nil
}

// NewSwarmKvsReference() loads a mock key-value store from the given root hash.
func NewSwarmKvsReference(ctx context.Context, _ persister.LoadSaver, ref32 []byte) (*SwarmKvs, error) {

	log(INFO, "» using simulated storage")

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

	slot_ref := Saved[bHex(ref32)]
	slot := Slots[slot_ref-1]
	kvs := slot.Kvs

	return kvs, nil
}

// Get() retrieves the value of the given key from the mock storage.
func (ps *SwarmKvs) Get(ctx context.Context, key []byte) ([]byte, error) {

	log(INFO, "» using simulated storage")

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

	value := ps.Store[bHex(key)]

	if value == nil {
		return []byte{}, errors.New("not found")
	}

	return value, nil
}

// Put() stores the given key-value pair in the mock store.
func (ps *SwarmKvs) Put(ctx context.Context, key []byte, value []byte) error {

	log(INFO, "» using simulated storage")

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

	ps.Store[bHex(key)] = value

	return nil
}

// Delete() drops a key-value pair from the mock store.
func (ps *SwarmKvs) Delete(ctx context.Context, key []byte) error {

	log(INFO, "» using simulated storage")

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

	log(INFO, "» using simulated storage")

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

	if ps.Slot_ref < 1 {
		msg := "invalid slot"
		log(CRIT, msg)
		return []byte{}, errors.New(msg)
	}

	// slot to 'save' (clone)
	slot := Slots[ps.Slot_ref-1]

	// check 0 length -- this is a feature of the pot.InMemLoadSaver
	if len(slot.Kvs.Store) < 1 {
		msg := "nothing to store"
		log(ERR, msg)
		return []byte{}, errors.New(msg)
	}

	// new, cloned slot#
	slot_ref := len(Slots) + 1 // = starting on 1.

	// clone map to be 'saved'
	kvs := &SwarmKvs{Store: maps.Clone(slot.Kvs.Store), Slot_ref: slot_ref}
	Slots = append(Slots, Slot{Ctx: context.Background(), Kvs: kvs, Ref: slot_ref, Ls: slot.Ls, allowSync: slot.allowSync})

	ref32 := make([]byte, 32)
	rand.Read(ref32)
	log(INFO, "» simulated save reference "+bHex(ref32))

	Saved[bHex(ref32)] = slot_ref
	log(DEB, "» simulated save of map in slot #"+strconv.Itoa(ps.Slot_ref)+" cloned new slot #"+strconv.Itoa(slot_ref)+" to key "+bHex(ref32))

	return ref32, nil
}

