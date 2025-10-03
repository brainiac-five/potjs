//go:build ext_test

// ---------------------------------------------------------------------------
//
// # JS API TESTS
//
// For testing the JS API accessing the go pot implementation through wasm.
//
// The tests are modeled on and extend the tests in go pot's kvs_test.go.
//
// They are made for execution in the browser to be testing the real target
// environment the API is made for, including its restrictions vs. node.js.
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
	fail = parameters[0].Bool()
	return nil
}

// setPanic() instructs the next mock POT KVS function called to panic, for
// testing.
func setPanic(_ js.Value, parameters []js.Value) interface{} {
	panix = parameters[0].Bool()
	return nil
}

// setDelay() instructs the next mock POT KVS function called to delay
// execution, for mS milliseconds, for testing.
func setDelay(mS int) {
	delay = mS
}

// setHang() instructs the next mock POT KVS function called to hang, or not,
// for testing.
func setHang(v bool) {
	hang = v
}

// mockFail() returns the status of the `fail` setting
func mockFail() bool {
	f := fail
	fail = false
	return f
}

// mockPanic() triggers a panic, if setPanic() has been called beforehand
func mockPanic(where string) {
	if panix {
		panix = false
		panic("mock panic at " + where)
	}
}

// mockDelay() delays the program until cancelled or time is up, of setDelay()
// has been called before
func mockDelay(ctx context.Context) {
	d := time.Duration(delay) * time.Millisecond
	delay = 0
	select {
	case <-ctx.Done():
	case <-time.After(d):
	}
}

// mockHang() stops the program until cancelled, if setDelay() has been called.
func mockHang(ctx context.Context) {
	h := hang
	hang = false
	if h {
		select {
		case <-ctx.Done():
		}
	}
}

// NewSwarmKvs() creates a new mock test key-value store.
func NewSwarmKvs(_ persister.LoadSaver) (*SwarmKvs, error) {

	log(INFO, "» using simulated storage")

	if mockFail() {
		return nil, errors.New("mock fail of NewSwarmKvs()")
	}
	mockPanic("NewSwarmKvs()")
	// likely needed: mockDelay(ctx)
	// likely needed: mockHang(ctx)

	kvs := &SwarmKvs{Store: make(map[string][]byte), Slot_ref: len(Slots) + 1}

	return kvs, nil
}

// NewSwarmKvsReference() loads a mock key-value store from the given root hash.
func NewSwarmKvsReference(_ context.Context, _ persister.LoadSaver, ref32 []byte) (*SwarmKvs, error) {

	log(INFO, "» using simulated storage")

	if mockFail() {
		return nil, errors.New("mock fail of NewSwarmKvsReference()")
	}
	mockPanic("NewSwarmKvsReference()")
	// likely needed: mockDelay(ctx)
	// likely needed: mockHang(ctx)

	slot_ref := Saved[bHex(ref32)] /// error handling
	slot := Slots[slot_ref-1]      /// error handling
	kvs := slot.Kvs                /// error handling

	return kvs, nil
}

// Get() retrieves the value of the given key from the mock storage.
func (ps *SwarmKvs) Get(ctx context.Context, key []byte) ([]byte, error) {

	log(INFO, "» using simulated storage")

	if mockFail() {
		return nil, errors.New("mock fail of Get()")
	}
	mockPanic("Get()")
	mockDelay(ctx)
	mockHang(ctx)

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
	mockDelay(ctx)
	mockHang(ctx)

	ps.Store[bHex(key)] = value

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
	/// catch here? Not one up?

	log(INFO, "» using simulated storage")

	if mockFail() {
		return nil, errors.New("mock fail of Save()")
	}
	mockPanic("Save()")
	mockDelay(ctx)
	mockHang(ctx)

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
