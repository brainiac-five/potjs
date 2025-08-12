package main

import (
	"context"

	. "pot"
        "github.com/ethersphere/proximity-order-trie/pkg/persister"
)

// ---------------------------------------------------------------------------
//
// # MOCK KVS
//
//   For JS API and js/go cross calling testing, this is the state table. 
//
// ---------------------------------------------------------------------------

var _ KeyValueStore = (*SwarmKvs)(nil)

var Saved = make(map[string]int)

type Slot struct {

	Ref int // index+1 in slots array
	Ctx context.Context
	Ls persister.LoadSaver
	Kvs *SwarmKvs
}

// array of all slots
var Slots = []Slot{}

