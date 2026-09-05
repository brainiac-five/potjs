// kvs.go — the key-value store POT JS drives, with iteration.
//
// Go POT's own SwarmKvs (kvs.go in github.com/ethersphere/proximity-order-trie)
// wraps an *Index but does not export it, and only exposes Get/Put/Save/Delete.
// The Index itself already knows how to walk the trie — Index.Iterate() — so
// this file builds the same Index the same way SwarmKvs does (same mode, same
// entry type, same persisters: byte-for-byte compatible with stores written
// by SwarmKvs) and additionally exposes Iterate and Size.
//
// This needs proximity-order-trie >= v1.0.2-alpha.8. Index.Iterate() in
// v1.0.2-alpha.7 (what this repo otherwise pins) has two bugs that make it
// unsafe to expose through POT JS: it panics on any pot loaded from a
// reference as soon as a matching subtree has more than one entry, and,
// independently of that, it silently drops entries whenever a real fork
// happens to sit exactly at the end of the requested prefix (bit 0 for no
// prefix at all — an entirely ordinary place for keys to diverge, so this
// was not a corner case). See
// https://github.com/ethersphere/proximity-order-trie/pull/32 (fix, filed
// upstream) and go.mod (pinned to the authors' own fork/tag with the fix
// applied, until the PR is merged and released).
//
// This file is part of the production build only. The simulation build
// (make mock*, tag ext_test) gets its Kvs from mock.go instead, which mimics
// the same methods on a map.

//go:build !ext_test

package main

import (
	"context"
	"fmt"

	pot "github.com/ethersphere/proximity-order-trie"
	"github.com/ethersphere/proximity-order-trie/pkg/elements"
	"github.com/ethersphere/proximity-order-trie/pkg/persister"
)

// Kvs is the key-value store used by all slots. It satisfies pot.KeyValueStore
// and adds Iterate and Size.
type Kvs struct {
	idx *pot.Index
}

var _ pot.KeyValueStore = (*Kvs)(nil)

func newEntry(key []byte) elements.Entry {
	e, _ := pot.NewSwarmEntry(key, nil)
	return e
}

// newKvs creates an empty key-value store persisting through ls.
// Equivalent to pot.NewSwarmKvs(ls), plus Iterate/Size.
func newKvs(ls persister.LoadSaver) (*Kvs, error) {
	mode := elements.NewSwarmPot(elements.NewSingleOrder(256), ls, newEntry)
	idx, err := pot.New(mode)
	if err != nil {
		return nil, fmt.Errorf("failed to create pot: %w", err)
	}
	return &Kvs{idx: idx}, nil
}

// newKvsReference loads a key-value store from a save reference.
// Equivalent to pot.NewSwarmKvsReference(ctx, ls, ref), plus Iterate/Size.
func newKvsReference(ctx context.Context, ls persister.LoadSaver, ref []byte) (*Kvs, error) {
	mode := elements.NewSwarmPotReference(elements.NewSingleOrder(256), ls, ref, newEntry)
	idx, err := pot.NewReference(ctx, mode, ref)
	if err != nil {
		return nil, fmt.Errorf("failed to create pot reference: %w", err)
	}
	return &Kvs{idx: idx}, nil
}

// Get retrieves the value associated with the given key.
func (k *Kvs) Get(ctx context.Context, key []byte) ([]byte, error) {
	entry, err := k.idx.Find(ctx, key)
	if err != nil {
		return nil, err
	}
	return entry.(*pot.SwarmEntry).Value(), nil
}

// Put stores the given key-value pair in the store.
func (k *Kvs) Put(ctx context.Context, key []byte, value []byte) error {
	entry, err := pot.NewSwarmEntry(key, value)
	if err != nil {
		return err
	}
	if err := k.idx.Add(ctx, entry); err != nil {
		return fmt.Errorf("failed to put value to pot %w", err)
	}
	return nil
}

// Save persists the trie and returns its root reference.
func (k *Kvs) Save(ctx context.Context) ([]byte, error) {
	ref, err := k.idx.Save(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to store pot %w", err)
	}
	return ref, nil
}

// Delete takes a key-value pair out of the trie.
func (k *Kvs) Delete(ctx context.Context, key []byte) error {
	if err := k.idx.Delete(ctx, key); err != nil {
		return fmt.Errorf("failed to delete key-value pair from pot %w", err)
	}
	return nil
}

// Close stops the index' process loop.
func (k *Kvs) Close() error {
	return k.idx.Close()
}

// Size returns the number of key-value pairs in the trie. It does not touch
// the network: the count is kept on the root node.
func (k *Kvs) Size() int {
	return k.idx.Size()
}

// Iterate calls f for every key-value pair whose key starts with the byte
// prefix `prefix` (nil or empty = every pair), in ascending order of XOR
// distance from `pivot` — with an all-zero pivot, that is plain ascending
// byte order of the (32-byte, zero-padded) keys. f returns stop=true to end
// the walk early.
//
// This delegates entirely to the upstream Index.Iterate(), which descends to
// the sub-trie shared by all keys with the prefix, so cost is proportional
// to the number of matching entries plus the depth of the path to them, not
// the size of the store.
func (k *Kvs) Iterate(ctx context.Context, prefix, pivot []byte, f func(key, value []byte) (stop bool, err error)) error {
	return k.idx.Iterate(ctx, prefix, pivot, func(e elements.Entry) (bool, error) {
		return f(e.Key(), e.(*pot.SwarmEntry).Value())
	})
}
