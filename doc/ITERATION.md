# Proposed manual, tutorial and function-reference additions for `keys()` / `entries()` / `entriesRaw()` / `count()`

This is a proposal, not a patch to the ODT/PDF sources directly — I don't have
a safe way to edit those binary formats without risking corrupting them or
fighting your existing styles/TOC/page numbers. Everything below is written
to match the manual's and function reference's existing structure and prose
style as closely as I could, so it should fold in with light formatting work
rather than a rewrite. Headers, code style and the "T Y P E ⟶ result" arrow
convention are copied from the existing `Put`/`Get`/`Delete` entries.

Where it goes:
- The tutorial section slots in right after **LOAD** (pg. 46), *before* "This
  concludes the tutorial." I've called it **TUTORIAL #13 — ITERATION** to
  continue the numbering, though I notice the manual's own numbered
  tutorials actually stop at #12 (Persistence) even though the tutorial/
  files go up to `t14.js` — SAVE REFERENCE and LOAD read as continuations of
  #12 rather than separate numbered sections. Renumber as fits your scheme;
  I'd rather flag the inconsistency than guess at a convention you already
  have in mind.
- The function-reference entries slot into **STORING, RETRIEVING, AND
  DELETING KEY-VALUE PAIRS** (pg. 8), after `Delete`, as their own
  subsection — they're closer in kind to those three than to anything under
  Support Functions.
- The runnable code is `tutorial/t15.js`, following the existing `t12.js`
  through `t14.js` — same `require("./potjs/lib/pot-node")` /
  `process.argv` convention, tested against the built `pot.wasm`.

---

## Tutorial addition

### TUTORIAL #13 — ITERATION

So far, reading a value has meant already knowing its key. But an
application's own view of its data is often "every ticket", or "every user in
team X" — a question about *which keys exist*, not the value of one you
already have. `keys()`, `entries()` and `count()` answer that.

They take an optional prefix. Without one, they cover the whole store; with
one, only the keys that start with it — and the cost is roughly the number of
matching keys, not the size of the whole store, because the walk descends
straight to the part of the trie those keys share and never looks at the
rest.

```js
kvs = new pot.Kvs(swarmUrl, batchId)

await kvs.put("user/ada", "Ada Lovelace")
await kvs.put("user/bob", "Bob")
await kvs.put("ticket/SB-1", "Fix the thing")
await kvs.put("ticket/SB-2", "Write the docs")

keys = await kvs.keys()
console.log("all keys:", keys.map(pot.keyString))

tickets = await kvs.entries("ticket/")
for (const [key, value] of tickets) {
	console.log("ticket:", pot.keyString(key), "=", value)
}

n = await kvs.count("user/")
console.log("user count:", n)
```
tutorial/t15.js

**WHAT YOU SHOULD SEE**

```
all keys: [ 'ticket/SB-1', 'ticket/SB-2', 'user/ada', 'user/bob' ]
ticket: ticket/SB-1 = Fix the thing
ticket: ticket/SB-2 = Write the docs
user count: 2
```

Keys come back as 32-byte, zero-padded `Uint8Array`s — that is what the trie
actually stores, and it's why keys can be numbers, strings or bytes
interchangeably. If you know a key started life as a string, `pot.keyString()`
turns it back into one:

```js
console.log(pot.keyString(keys[0]))   // "ticket/SB-1"
```

It's a best-effort convenience, not a type-safe inverse: a key that was put as
a number or already-raw bytes will come back as whatever that padded byte
string happens to decode to, not an error. If a store's keys are exclusively
strings — the common case for an application's own data — it's exact.

`entriesRaw()` is to `entries()` what `getRaw()` is to `get()`: it returns
values as `Uint8Array` without decoding the type byte `put()` writes, which is
the counterpart you need for values that were stored with `putRaw()`.

◊

This concludes the tutorial. Check out Further Reading (pg. 21)

---

## Function reference additions

Insert after **Delete** (pg. 9), before **ON INITIALIZATION**.

```
K E Y S

kvs.keys([<prefix>[, <timeout>]])       ⟶  cancelable promise of Uint8Array[]
kvs.keysSync([<prefix>[, <timeout>]])   ⟶  Uint8Array[] or Error

<prefix>  : string, number, or Uint8Array. 32 bytes max. Omit for every key.
<timeout> : milliseconds.
```

List the keys in the KVS, optionally narrowed to those starting with
`<prefix>`. Keys come back as 32-byte, zero-padded `Uint8Array`s, in ascending
byte order. Use `pot.keyString()` (below) to recover a string key.

An omitted, empty-string, `null` or `undefined` prefix means "every key". A
prefix longer than 32 bytes is an error, the same as an oversize key to
`put()`.

The promise returned by `keys()` is cancelable, the same as `get()`'s (pg. 4).
The optional timeout is in milliseconds and behaves as it does for `get()`:
if it elapses before the walk completes, the async call's promise rejects and
the sync call returns an `Error`.

```js
kvs = new pot.Kvs()
await kvs.put("ticket/SB-1", "first")
await kvs.put("ticket/SB-2", "second")
keys = await kvs.keys("ticket/")
console.log(keys.map(pot.keyString))   // [ 'ticket/SB-1', 'ticket/SB-2' ]
```

```
E N T R I E S

kvs.entries([<prefix>[, <timeout>]])       ⟶  cancelable promise of [key, value][]
kvs.entriesSync([<prefix>[, <timeout>]])   ⟶  [key, value][] or Error

<prefix>  : string, number, or Uint8Array. 32 bytes max. Omit for every entry.
<value>   : string, number, Uint8Array, Boolean, or null.
<timeout> : milliseconds.
```

Like `keys()`, but pairs each key with its value, type-aware — the same
type-coded reading `get()` does. Each result is a two-element array,
`[key, value]`, in the same ascending byte order `keys()` uses. As with
`get()` versus `getRaw()`, a value stored with `putRaw()` will not decode
correctly here; use `entriesRaw()` for those.

```js
for (const [key, value] of await kvs.entries("ticket/")) {
	console.log(pot.keyString(key), value)
}
```

```
E N T R I E S   R A W

kvs.entriesRaw([<prefix>[, <timeout>]])       ⟶  cancelable promise of [key, Uint8Array][]
kvs.entriesRawSync([<prefix>[, <timeout>]])   ⟶  [key, Uint8Array][] or Error

<prefix>  : string, number, or Uint8Array. 32 bytes max. Omit for every entry.
<timeout> : milliseconds.
```

`entries()`'s raw counterpart, as `getRaw()` is to `get()`: values come back
as the bytes actually stored, with no type byte stripped or interpreted. This
is what to use for values written with `putRaw()`.

```
C O U N T

kvs.count([<prefix>[, <timeout>]])       ⟶  cancelable promise of number
kvs.countSync([<prefix>[, <timeout>]])   ⟶  number or Error

<prefix>  : string, number, or Uint8Array. 32 bytes max. Omit to count everything.
<timeout> : milliseconds.
```

The number of keys, optionally narrowed to a prefix. Without a prefix this is
free — the count is already kept on the KVS's root node, no walk needed.
*With* a prefix it walks the matching part of the trie the same way `keys()`
does, so it costs the same as calling `keys()` and taking `.length`; use it
anyway when you don't need the keys themselves, since it skips building the
array.

```js
total   = await kvs.count()
tickets = await kvs.count("ticket/")
```

```
K E Y   S T R I N G

pot.keyString(<key>) ⟶ string

<key> : Uint8Array, as returned by keys() or entries().
```

Recovers a string key from the padded `Uint8Array` form `keys()`/`entries()`
return it in. Only meaningful for keys that were originally strings; for a
key that was put as a number or `Uint8Array`, this decodes whatever bytes are
there and will not be a round trip. It does not throw for those cases — see
above.
