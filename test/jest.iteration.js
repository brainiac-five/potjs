/*
**    SWARM POT JS Test Suite 5 / Node Jest, Iteration (keys/entries/count)
*/

const config = require('./jest.json');
const verbosity = config?.verbose ? 3 : 1

potVerbosity = verbosity
require("../lib/pot-node.js")

// make jest's logging succinct
const jestConsole = console
beforeAll(() => { global.console = require('console') ; if(verbosity < 2) console.log = () => {} })
afterAll(() => { global.console = jestConsole })

// test headline
beforeEach(() => { console.log(mid + expect.getState().currentTestName + off) })
afterEach(() => { console.log() })

// unclear what async functions need so long but helps to avoid warning
afterAll(() => { return new Promise(r => setTimeout(r, 2000)) })

// colors
const hi   = "\x1b[97m"
const mid  = "\x1b[37m"
const low  = "\x1b[90m"
const erm  = "\x1b[91m"
const warn = "\x1b[38;5;214m"
const ok   = "\x1b[36m"
const off  = "\x1b[0m"

// wait for WASM init
beforeAll(() => { return pot.ready() })

var kvs

// deterministic pseudo-random-looking keys: enough spread across the 256 bit
// space that a real fork lands on bit 0 (and at several other positions) —
// small sequential keys, as used elsewhere in the manual's own examples,
// don't exercise that and would have hidden the bugs this suite guards.
function detKey(prefix, n) {
	const h = require('crypto').createHash('sha256').update(String(n)).digest('hex')
	return `${prefix}${h.slice(0, 12)}`
}

function sortedStrings(a) { return [...a].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0)) }

describe('Iteration: keys, entries, count — happy path (Promises)', () => {

	test('empty store: keys/entries/count are all empty, no error', async () => {
		kvs = await pot.new()
		expect(await kvs.keys()).toEqual([])
		expect(await kvs.entries()).toEqual([])
		expect(await kvs.count()).toBe(0)
	})

	test('one entry: keys/entries/count see it, count() takes the size fast-path', async () => {
		kvs = await pot.new()
		await kvs.put('solo', 'value')
		const keys = await kvs.keys()
		expect(keys.length).toBe(1)
		expect(pot.keyString(keys[0])).toBe('solo')
		const entries = await kvs.entries()
		expect(entries.length).toBe(1)
		expect(pot.keyString(entries[0][0])).toBe('solo')
		expect(entries[0][1]).toBe('value')
		expect(await kvs.count()).toBe(1)
	})

	test('many entries, no prefix: count matches, keys come back in ascending byte order', async () => {
		kvs = await pot.new()
		const n = 300
		const inserted = []
		for (let i = 0; i < n; i++) {
			const k = detKey('e/', i)
			inserted.push(k)
			await kvs.put(k, i)
		}
		expect(await kvs.count()).toBe(n)
		const keys = (await kvs.keys()).map(pot.keyString)
		expect(keys.length).toBe(n)
		expect(keys).toEqual(sortedStrings(inserted))
		// values line up with their keys
		const entries = await kvs.entries()
		const byKey = new Map(entries.map(([k, v]) => [pot.keyString(k), v]))
		for (let i = 0; i < n; i++) expect(byKey.get(detKey('e/', i))).toBe(i)
	})

	test('a byte prefix narrows to just the matching keys, still in order', async () => {
		kvs = await pot.new()
		const groups = { 'a/': [], 'b/': [], 'c/': [] }
		let i = 0
		for (const g of Object.keys(groups)) {
			for (let j = 0; j < 60; j++) {
				const k = detKey(g, i++)
				groups[g].push(k)
				await kvs.put(k, k)
			}
		}
		for (const g of Object.keys(groups)) {
			const got = (await kvs.keys(g)).map(pot.keyString)
			expect(got).toEqual(sortedStrings(groups[g]))
			expect(await kvs.count(g)).toBe(groups[g].length)
		}
	})

	test('a prefix matching nothing gives empty results, not an error', async () => {
		kvs = await pot.new()
		await kvs.put('a/1', 1)
		expect(await kvs.keys('zzzzzz')).toEqual([])
		expect(await kvs.entries('zzzzzz')).toEqual([])
		expect(await kvs.count('zzzzzz')).toBe(0)
	})

	test('empty-string, null and undefined prefixes all mean "no prefix"', async () => {
		kvs = await pot.new()
		await kvs.put('x', 1)
		await kvs.put('y', 2)
		for (const p of ['', null, undefined]) {
			expect(await kvs.count(p)).toBe(2)
		}
	})

	test('a full 32-byte key as "prefix" is an exact-match query', async () => {
		kvs = await pot.new()
		await kvs.put('x'.repeat(32), 'exact')
		await kvs.put('y'.repeat(32), 'other')
		const got = await kvs.entries('x'.repeat(32))
		expect(got.length).toBe(1)
		expect(pot.keyString(got[0][0])).toBe('x'.repeat(32))
		expect(got[0][1]).toBe('exact')
	})

	test('deletes are reflected immediately', async () => {
		kvs = await pot.new()
		await kvs.put('a', 1)
		await kvs.put('b', 2)
		expect(await kvs.count()).toBe(2)
		await kvs.delete('a')
		expect(await kvs.count()).toBe(1)
		expect((await kvs.keys()).map(pot.keyString)).toEqual(['b'])
	})

	test('updating a value in place does not duplicate the key', async () => {
		kvs = await pot.new()
		await kvs.put('k', 'v1')
		await kvs.put('k', 'v2')
		expect(await kvs.count()).toBe(1)
		const entries = await kvs.entries()
		expect(entries.length).toBe(1)
		expect(entries[0][1]).toBe('v2')
	})
})

describe('Iteration: after save + load (Promises)', () => {

	// This is the scenario the fixed upstream bugs needed: a *fresh* KVS
	// opened from a save reference, not the same in-memory instance that
	// wrote the data. In-memory save()/load() (no bee url / batch id) round
	// trips through the same in-memory persister, so this needs no network —
	// see the "save it, load it, read it" tests earlier in this suite for
	// the same pattern applied to get().
	test('a big pot survives a save + load round trip: no panic, right count, right order', async () => {
		const n = 300
		kvs = await pot.new()
		const inserted = []
		for (let i = 0; i < n; i++) {
			const k = detKey('t/', i)
			inserted.push(k)
			await kvs.put(k, i)
		}
		const ref = await kvs.save()
		const loaded = await pot.load(ref)
		expect(await loaded.count()).toBe(n)
		const keys = (await loaded.keys()).map(pot.keyString)
		expect(keys).toEqual(sortedStrings(inserted))
		const entries = await loaded.entries()
		expect(entries.length).toBe(n)
		for (const [k, v] of entries) expect(v).toBe(inserted.indexOf(pot.keyString(k)))
	})

	test('a prefix query also survives load, and only returns matching keys', async () => {
		const n = 200
		kvs = await pot.new()
		for (let i = 0; i < n; i++) await kvs.put(detKey('p/', i), i)
		const ref = await kvs.save()
		const loaded = await pot.load(ref)
		const got = await loaded.entries('p/')
		expect(got.length).toBe(n)
		for (const [k] of got) expect(pot.keyString(k).startsWith('p/')).toBe(true)
	})

	test('two independent loads of the same reference agree with each other', async () => {
		kvs = await pot.new()
		for (let i = 0; i < 50; i++) await kvs.put(detKey('q/', i), i)
		const ref = await kvs.save()
		const a = await pot.load(ref)
		const b = await pot.load(ref)
		const ak = (await a.keys()).map(pot.keyString)
		const bk = (await b.keys()).map(pot.keyString)
		expect(ak).toEqual(bk)
	})
})

describe('Iteration: raw values (Promises)', () => {

	test('entriesRaw sees values stored with putRaw, as Uint8Arrays', async () => {
		kvs = await pot.new()
		await kvs.putRaw('r1', new Uint8Array([1, 2, 3]))
		await kvs.putRaw('r2', new Uint8Array([4, 5]))
		const got = await kvs.entriesRaw()
		expect(got.length).toBe(2)
		const byKey = new Map(got.map(([k, v]) => [pot.keyString(k), v]))
		expect([...byKey.get('r1')]).toEqual([1, 2, 3])
		expect([...byKey.get('r2')]).toEqual([4, 5])
	})

	test('entriesRaw with a prefix, after a save + load round trip', async () => {
		kvs = await pot.new()
		for (let i = 0; i < 40; i++) await kvs.putRaw(detKey('raw/', i), new Uint8Array([i % 256]))
		const ref = await kvs.save()
		const loaded = await pot.load(ref)
		const got = await loaded.entriesRaw('raw/')
		expect(got.length).toBe(40)
	})
})

describe('Iteration: pot.keyString (Promises)', () => {

	test('round-trips a string key exactly, including one at the 32 byte limit', async () => {
		kvs = await pot.new()
		const longest = 'k'.repeat(32)
		await kvs.put('short', 1)
		await kvs.put(longest, 2)
		const keys = (await kvs.keys()).map(pot.keyString)
		expect(keys.sort()).toEqual(['short', longest].sort())
	})

	test('does not throw on a key that was not originally a string', async () => {
		kvs = await pot.new()
		await kvs.put(123.5, 'from a number key')
		await kvs.put(new Uint8Array([9, 9, 9]), 'from a byte key')
		const keys = await kvs.keys()
		expect(keys.length).toBe(2)
		for (const k of keys) expect(() => pot.keyString(k)).not.toThrow()
	})
})

describe('Iteration: sync variants (keysSync/entriesSync/entriesRawSync/countSync)', () => {

	test('keysSync/entriesSync/countSync agree with their async counterparts', async () => {
		kvs = await pot.new()
		const n = 120
		const inserted = []
		for (let i = 0; i < n; i++) {
			const k = detKey('s/', i)
			inserted.push(k)
			await kvs.put(k, i)
		}
		const asyncKeys = (await kvs.keys()).map(pot.keyString)
		const syncKeys = kvs.keysSync().map(pot.keyString)
		expect(syncKeys).toEqual(asyncKeys)
		expect(kvs.countSync()).toBe(await kvs.count())
		const syncEntries = kvs.entriesSync('s/')
		expect(syncEntries.length).toBe(n)
	})

	test('entriesRawSync matches entriesRaw', async () => {
		kvs = await pot.new()
		await kvs.putRaw('sr1', new Uint8Array([7, 8]))
		const async_ = await kvs.entriesRaw()
		const sync_ = kvs.entriesRawSync()
		expect(sync_.length).toBe(async_.length)
		expect([...sync_[0][1]]).toEqual([...async_[0][1]])
	})
})

describe('Iteration: edge cases and errors (Promises)', () => {

	test('a prefix longer than 32 bytes is rejected, same as an oversize key', async () => {
		kvs = await pot.new()
		await expect(kvs.keys('x'.repeat(33))).rejects.toBeDefined()
	})

	test('count() on an empty store is 0 both with and without a prefix', async () => {
		kvs = await pot.new()
		expect(await kvs.count()).toBe(0)
		expect(await kvs.count('anything')).toBe(0)
	})

	test('a timeout parameter is accepted and a generous one still completes', async () => {
		kvs = await pot.new()
		for (let i = 0; i < 30; i++) await kvs.put(detKey('to/', i), i)
		expect(await kvs.count(undefined, 2000)).toBe(30)
		expect((await kvs.keys('to/', 2000)).length).toBe(30)
	})

	test('iterating right after deleting the only entry gives an empty result, not an error', async () => {
		kvs = await pot.new()
		await kvs.put('only', 1)
		await kvs.delete('only')
		expect(await kvs.keys()).toEqual([])
		expect(await kvs.count()).toBe(0)
	})
})
