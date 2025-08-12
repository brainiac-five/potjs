//go:build api_test

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
	"errors"
	"strconv"
	"context"
	"math/rand"

	"github.com/ethersphere/proximity-order-trie/pkg/persister"
)

// mock SwarmKvs struct
type SwarmKvs struct {
	Slot_ref int
	Store map[string][]byte 
}

// NewSwarmKvs creates a new mock test key-value store.
func NewSwarmKvs(_ persister.LoadSaver) (*SwarmKvs, error) {

	log("» using mock in-memory test storage")

	kvs := &SwarmKvs{ Store: make(map[string][]byte), Slot_ref: len(Slots) + 1 }

	return kvs, nil
}

// Load a mock key-value store from the given root hash.
func NewSwarmKvsReference(_ persister.LoadSaver, ref32 []byte) (*SwarmKvs, error) {

	log("» using mock in-memory test storage")

	slot_ref := Saved[bhex(ref32)] /// error handling
	slot := Slots[slot_ref-1] /// error handling
	kvs := slot.Kvs /// error handling

	return kvs, nil
}

// This Get retrieves the value of the given key from the mock storage.
func (ps *SwarmKvs) Get(_ context.Context, key []byte) ([]byte, error) {

	log("» using mock in-memory test storage")

	value := ps.Store[bhex(key)]

	return value, nil
}

// This Put stores the given key-value pair in the mock store.
func (ps *SwarmKvs) Put(_ context.Context, key []byte, value []byte) error {

	log("» using mock in-memory test storage")

	ps.Store[bhex(key)] = value

	return nil
}

// Save saves key-value pair to the underlying storage and returns the reference.
func (ps *SwarmKvs) Save(_ context.Context) (rref []byte, rerr error) {

	defer func() { if err := recover(); err != nil { rref = []byte{} ; rerr = err.(error) } }()

	log("» using mock in-memory test storage")

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
