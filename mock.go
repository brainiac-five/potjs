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

import(
	"time"
	"errors"
	"context"
	"strconv"
	"math/rand"
	"syscall/js"

	"github.com/ethersphere/proximity-order-trie/pkg/persister"
)

// mock SwarmKvs struct
type SwarmKvs struct {
	Slot_ref int
	Store map[string][]byte 
}

// In general, these variables are set by setFail() etc. and set to 0/false
// once used once. They are for testing without a production purpose.
var fail = false
var panix = false
var delay = 0 // milliseconds
var hang = false

func testMode(_ js.Value, parameters []js.Value) interface{} {
	return "extended"
}

func setFail(_ js.Value, parameters []js.Value) interface{} {
	fail = parameters[0].Bool()
	return nil
}

func setPanic(_ js.Value, parameters []js.Value) interface{} {
	panix = parameters[0].Bool()
	return nil
}

func setDelay(v int) {
	delay = v
}

func setHang(v bool) {
	hang = v
}

func mockfail() bool {
	f := fail
	fail = false
	return f
}

func mockpanic(where string) {
	if panix {
		panix = false
		panic("mock panic at " + where)
	}
}

// mockdelay delays the program until cancelled or time is up - for testing
func mockdelay(ctx context.Context) {
	d := time.Duration(delay) * time.Millisecond
	delay = 0
	select {
        case <-ctx.Done():
        case <-time.After(d):
        }
}

// mockhang stops the program until cancelled - for testing
func mockhang(ctx context.Context) {
	h := hang
	hang = false
	if h {
		select {
		case <-ctx.Done():
		}
	}
}

// NewSwarmKvs creates a new mock test key-value store.
func NewSwarmKvs(_ persister.LoadSaver) (*SwarmKvs, error) {

	log("» using mock in-memory test storage")

	if mockfail() { return nil, errors.New("mock fail of NewSwarmKvs()") }
	mockpanic("NewSwarmKvs()")
	// likely needed: mockdelay(ctx)
	// likely needed: mockhang(ctx)

	kvs := &SwarmKvs{ Store: make(map[string][]byte), Slot_ref: len(Slots) + 1 }

	return kvs, nil
}

// Load a mock key-value store from the given root hash.
func NewSwarmKvsReference(_ context.Context, _ persister.LoadSaver, ref32 []byte) (*SwarmKvs, error) {

	log("» using mock in-memory test storage")

	if mockfail() { return nil, errors.New("mock fail of NewSwarmKvsReference()") }
	mockpanic("NewSwarmKvsReference()")
	// likely needed: mockdelay(ctx)
	// likely needed: mockhang(ctx)

	slot_ref := Saved[bhex(ref32)] /// error handling
	slot := Slots[slot_ref-1] /// error handling
	kvs := slot.Kvs /// error handling

	return kvs, nil
}

// This Get retrieves the value of the given key from the mock storage.
func (ps *SwarmKvs) Get(ctx context.Context, key []byte) ([]byte, error) {

	log("» using mock in-memory test storage")

	if mockfail() { return nil, errors.New("mock fail of Get()") }
	mockpanic("Get()")
	mockdelay(ctx)
	mockhang(ctx)

	value := ps.Store[bhex(key)]

	return value, nil
}

// This Put stores the given key-value pair in the mock store.
func (ps *SwarmKvs) Put(ctx context.Context, key []byte, value []byte) error {

	log("» using mock in-memory test storage")

	if mockfail() { return errors.New("mock fail of Put()") }
	mockpanic("Put()")
	mockdelay(ctx)
	mockhang(ctx)

	ps.Store[bhex(key)] = value

	return nil
}

// Save saves key-value pair to the underlying storage and returns the reference.
func (ps *SwarmKvs) Save(ctx context.Context) (rref []byte, rerr error) {

	defer func() { if err := recover(); err != nil { rref = []byte{} ; rerr = err.(error) } }()
	/// catch here? Not one up?

	log("» using mock in-memory test storage")

	if mockfail() { return nil, errors.New("mock fail of Save()") }
	mockpanic("Save()")
	mockdelay(ctx)
	mockhang(ctx)

	// check 0 length -- this is a feature of the pot.InMemLoadSaver
	if ps.Slot_ref < 1 {
		msg := "invalid slot"
		log(msg)
		return []byte{}, errors.New(msg)
	}
	if len(Slots[ps.Slot_ref-1].Kvs.Store) < 1 {
		msg := "nothing to store"
		log(msg)
		return []byte{}, errors.New(msg)
	}

	ref32 := make([]byte, 32)
        rand.Read(ref32)
        log("» created random reference " + bhex(ref32))

	Saved[bhex(ref32)] = ps.Slot_ref
        log("» mock-saving store #" + strconv.Itoa(ps.Slot_ref) + " to key " + bhex(ref32))

	return ref32, nil
}
