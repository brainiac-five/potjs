/*
**    SWARM POT JS Test Suite 2 / Node Jest, Asynchronous Calls
*/

const config = require('./jest.json');
const verbosity = config?.verbose ? 3 : 1

potjs_verbosity = verbosity
require("../lib/pot-node.js")

// make logging succinct
const jestConsole = console
beforeAll(() => { global.console = require('console') ; if(verbosity < 2) console.log = () => {} })
afterAll(() => { global.console = jestConsole })

// test headline
beforeEach(() => { console.log(mid + expect.getState().currentTestName + off) })
afterEach(() => { console.log() })

// catch logging lag
afterAll(() => { return new Promise(r => setTimeout(r, 1000)) })

// colors
const hi   = "\x1b[97m"
const mid  = "\x1b[37m"
const low  = "\x1b[90m"
const erm  = "\x1b[91m"
const warn = "\x1b[38;5;214m"
const ok   = "\x1b[36m"
const off  = "\x1b[0m"

const NODE = (typeof window === 'undefined')

const k1 = "foo"
const v1 = "bar"
const k2 = "baz"
const v2 = "qux"

const s1 = "abc"
const s2 = "xyz"
const n1 = 123
const n2 = 456
const b1 = true
const b2 = false

var kvs
var kvs2
var kvs3
var val
var ref

// wait for WASM init
beforeAll(() => { return pot.ready() })

describe('Asynchronous Happy Path (Promises)', () => {

	test('Create a KVS - async', async () => {
		expect( await pot.new() ).toBeDefined()
	});

	test('Create a KVS, write to it - async', async () => {
		expect( kvs = await pot.new() ).toBeDefined()
		expect( await kvs.put(k1, v1) ).toBe(null)
	});

	test('Create a KVS, read unset from it - async', async () => {
		expect( kvs = await pot.new()   ).toBeDefined()
		expect( await kvs.get(k1)       ).toBeUndefined()
	});

	test('Create a KVS, write to it, read from it - async', async () => {
		expect( kvs = await pot.new()   ).toBeDefined()
		expect( await kvs.put(k1, v1)   ).toBe(null)
		expect( await kvs.get(k1)       ).toBe(v1)
	});

	test('Create a KVS, write to it, read from it, read unset - async', async () => {
		expect( kvs = await pot.new()   ).toBeDefined()
		expect( await kvs.put(k1, v1)   ).toBe(null)
		expect( await kvs.get(k1)       ).toBe(v1)
		expect( await kvs.get(k2)       ).toBeUndefined()
	});

	test('Create a KVS, write to it, read from it, change - async', async () => {
		expect( kvs = await pot.new()   ).toBeDefined()
		expect( await kvs.put(k1, v1)   ).toBe(null)
		expect( await kvs.get(k1)       ).toBe(v1)
		expect( await kvs.put(k1, v2)   ).toBe(null)
		expect( await kvs.get(k1)       ).toBe(v2)
	});

	test('Create a KVS, write to it, read from it, delete - async', async () => {
		expect( kvs = await pot.new()   ).toBeDefined()
		expect( await kvs.put(k1, v1)   ).toBe(null)
		expect( await kvs.get(k1)       ).toBe(v1)
		expect( await kvs.delete(k1)    ).toBe(null)
		expect( await kvs.get(k1)       ).toBeUndefined()
	});

	test('Create a KVS, write two entries to it, read, delete, re-read - async', async () => {
		expect( kvs = await pot.new()   ).toBeDefined()
		expect( await kvs.put(k1, v1)   ).toBe(null)
		expect( await kvs.put(k2, v2)   ).toBe(null)
		expect( await kvs.get(k1)       ).toBe(v1)
		expect( await kvs.get(k2)       ).toBe(v2)
		expect( await kvs.delete(k1)    ).toBe(null)
		expect( await kvs.get(k1)       ).toBeUndefined()
		expect( await kvs.get(k2)       ).toBe(v2)
	});

	test('Create a KVS, write to it, save it - async', async () => {
		expect( kvs  = await pot.new()     ).toBeDefined()
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( ref  = await kvs.save()    ).toBeDefined()
	});

	test('Create a KVS, write to it, save it, load it, read it - async', async () => {
		expect( kvs  = await pot.new()     ).toBeDefined()
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( ref  = await kvs.save()    ).toBeDefined()
		expect( kvs2 = await pot.load(ref) ).toBeDefined()
		expect( await kvs2.get(k1)         ).toBe(v1)
	});

	test('Create a KVS, write to it, save it, load and read it twice - async', async () => {
		expect( kvs  = await pot.new()     ).toBeDefined()
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( ref  = await kvs.save()    ).toBeDefined()
		expect( kvs2 = await pot.load(ref) ).toBeDefined()
		expect( await kvs2.get(k1)         ).toBe(v1)
		expect( kvs3 = await pot.load(ref) ).toBeDefined()
		expect( await kvs3.get(k1)         ).toBe(v1)
	});

	test('Create a KVS, write to it, save, delete, load, read it - async', async () => {
		expect( kvs  = await pot.new()     ).toBeDefined()
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( ref  = await kvs.save()    ).toBeDefined()
		expect( await kvs.delete(k1)       ).toBe(null)
		expect( await kvs.get(k1)          ).toBeUndefined()
		expect( kvs2 = await pot.load(ref) ).toBeDefined()
		expect( await kvs2.get(k1)         ).toBe(v1)
	});

	test('Create a KVS, write two entries, save, load, read them - async', async () => {
		expect( kvs  = await pot.new()     ).toBeDefined()
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( await kvs.put(k2, v2)      ).toBe(null)
		expect( ref  = await kvs.save()    ).toBeDefined()
		expect( kvs2 = await pot.load(ref) ).toBeDefined()
		expect( await kvs2.get(k1)         ).toBe(v1)
		expect( await kvs2.get(k2)         ).toBe(v2)
	});

	test('Create a KVS, write two entries, save, load, read old ones - async', async () => {
		expect( kvs  = await pot.new()     ).toBeDefined()
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( await kvs.put(k2, v2)      ).toBe(null)
		expect( ref  = await kvs.save()    ).toBeDefined()
		expect( kvs2 = await pot.load(ref) ).toBeDefined()
		expect( await kvs.get(k1)          ).toBe(v1)
		expect( await kvs.get(k2)          ).toBe(v2)
	});

	test('Create a KVS, write two entries, save, delete, load, read them - async', async () => {
		expect( kvs  = await pot.new()     ).toBeDefined()
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( await kvs.put(k2, v2)      ).toBe(null)
		expect( ref  = await kvs.save()    ).toBeDefined()
		expect( await kvs.delete(k1)       ).toBe(null)
		expect( await kvs.delete(k2)       ).toBe(null)
		expect( await kvs.get(k1)          ).toBeUndefined()
		expect( await kvs.get(k2)          ).toBeUndefined()
		expect( kvs2 = await pot.load(ref) ).toBeDefined()
		expect( await kvs2.get(k1)         ).toBe(v1)
		expect( await kvs2.get(k2)         ).toBe(v2)
	})

	test('Create a KVS, write two entries, save, load, delete, read old ones - async', async () => {
		expect( kvs  = await pot.new()     ).toBeDefined()
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( await kvs.put(k2, v2)      ).toBe(null)
		expect( ref  = await kvs.save()    ).toBeDefined()
		expect( kvs2 = await pot.load(ref) ).toBeDefined()
		expect( await kvs2.delete(k1)      ).toBe(null)
		expect( await kvs2.delete(k2)      ).toBe(null)
		expect( await kvs2.get(k1)         ).toBeUndefined()
		expect( await kvs2.get(k2)         ).toBeUndefined()
		expect( await kvs.get(k1)          ).toBe(v1)
		expect( await kvs.get(k2)          ).toBe(v2)
	})

	test('Create three KVS, write entries, read entries - async', async () => {
		expect( kvs  = await pot.new()     ).toBeDefined()
		expect( kvs2 = await pot.new()     ).toBeDefined()
		expect( kvs3 = await pot.new()     ).toBeDefined()
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( await kvs.get(k1)          ).toBe(v1)
		expect( await kvs2.get(k1)         ).toBeUndefined()
		expect( await kvs3.get(k1)         ).toBeUndefined()
		expect( await kvs2.put(k1, v1)     ).toBe(null)
		expect( await kvs.get(k1)          ).toBe(v1)
		expect( await kvs2.get(k1)         ).toBe(v1)
		expect( await kvs3.get(k1)         ).toBeUndefined()
		expect( await kvs3.put(k1, v1)     ).toBe(null)
		expect( await kvs.get(k1)          ).toBe(v1)
		expect( await kvs2.get(k1)         ).toBe(v1)
		expect( await kvs3.get(k1)         ).toBe(v1)
	})

	test('Create three KVS, write entries, delete entries - async', async () => {
		expect( kvs  = await pot.new()     ).toBeDefined()
		expect( kvs2 = await pot.new()     ).toBeDefined()
		expect( kvs3 = await pot.new()     ).toBeDefined()
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( await kvs2.put(k1, v1)     ).toBe(null)
		expect( await kvs3.put(k1, v1)     ).toBe(null)
		expect( await kvs.delete(k1)       ).toBe(null)
		expect( await kvs.get(k1)          ).toBeUndefined()
		expect( await kvs2.get(k1)         ).toBe(v1)
		expect( await kvs3.get(k1)         ).toBe(v1)
		expect( await kvs2.delete(k1)      ).toBe(null)
		expect( await kvs.get(k1)          ).toBeUndefined()
		expect( await kvs2.get(k1)         ).toBeUndefined()
		expect( await kvs3.get(k1)         ).toBe(v1)
		expect( await kvs3.delete(k1)      ).toBe(null)
		expect( await kvs.get(k1)          ).toBeUndefined()
		expect( await kvs2.get(k1)         ).toBeUndefined()
		expect( await kvs3.get(k1)         ).toBeUndefined()
	})

	test('Create three KVSs, write entries, read, delete - async', async () => {
		expect( kvs  = await pot.new()     ).toBeDefined()
		expect( kvs2 = await pot.new()     ).toBeDefined()
		expect( kvs3 = await pot.new()     ).toBeDefined()
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( await kvs.get(k1)          ).toBe(v1)
		expect( await kvs2.get(k1)         ).toBeUndefined()
		expect( await kvs3.get(k1)         ).toBeUndefined()
		expect( await kvs2.put(k1, v1)     ).toBe(null)
		expect( await kvs.get(k1)          ).toBe(v1)
		expect( await kvs2.get(k1)         ).toBe(v1)
		expect( await kvs3.get(k1)         ).toBeUndefined()
		expect( await kvs3.put(k1, v1)     ).toBe(null)
		expect( await kvs.get(k1)          ).toBe(v1)
		expect( await kvs2.get(k1)         ).toBe(v1)
		expect( await kvs3.get(k1)         ).toBe(v1)
		expect( await kvs.delete(k1)       ).toBe(null)
		expect( await kvs.get(k1)          ).toBeUndefined()
		expect( await kvs2.get(k1)         ).toBe(v1)
		expect( await kvs3.get(k1)         ).toBe(v1)
		expect( await kvs2.delete(k1)      ).toBe(null)
		expect( await kvs.get(k1)          ).toBeUndefined()
		expect( await kvs2.get(k1)         ).toBeUndefined()
		expect( await kvs3.get(k1)         ).toBe(v1)
		expect( await kvs3.delete(k1)      ).toBe(null)
		expect( await kvs.get(k1)          ).toBeUndefined()
		expect( await kvs2.get(k1)         ).toBeUndefined()
		expect( await kvs3.get(k1)         ).toBeUndefined()
	})

	test('Create a KVS, write to it with timeout - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, v1, 10)  ).toBe(null)
	});

	test('Create a KVS, write to it, read from it with timeout - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, v1, 10)  ).toBe(null)
		expect( await kvs.get(k1, 10)      ).toBe(v1)
	});

	test('Create a KVS, write to it, read from it, delete with timeout - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, v1, 10)  ).toBe(null)
		expect( await kvs.get(k1, 10)      ).toBe(v1)
		expect( await kvs.delete(k1, 10)   ).toBe(null)
		expect( await kvs.get(k1, 10)      ).toBeUndefined()
	});

	test('Create a KVS, write to it, save it, load it, read it with timeout - async', async () => {
		expect( kvs  = await pot.new()     ).toBeDefined()
		expect( await kvs.put(k1, v1, 10)  ).toBe(null)
		expect( ref  = await kvs.save(10)  ).toBeDefined()
		expect( kvs2 = await pot.load(ref, null, null, 10)).toBeDefined()
		expect( await kvs2.get(k1, 10)     ).toBe(v1)
	});

});

describe('Asynchronous Raw (Promises)', () => {

	describe('booleans', () => {

		test('Create a KVS, write raw boolean to it - async', async () => {
			expect( kvs = await pot.new()    ).toBeDefined()
			expect( await kvs.putRaw(k1, b1) ).toBe(null)
		});

		test('Create a KVS, read unset raw boolean from it - async', async () => {
			expect( kvs = await pot.new()    ).toBeDefined()
			expect( await kvs.getBoolean(k1) ).toBeUndefined()
		});

		test('Create a KVS, write raw boolean to it, read it - async', async () => {
			expect( kvs = await pot.new()    ).toBeDefined()
			expect( await kvs.putRaw(k1, b1) ).toBe(null)
			expect( await kvs.getBoolean(k1) ).toBe(b1)
		});

		test('Create a KVS, write raw boolean to it, read from it, change - async', async () => {
			expect( kvs = await pot.new()    ).toBeDefined()
			expect( await kvs.putRaw(k1, b1) ).toBe(null)
			expect( await kvs.getBoolean(k1) ).toBe(b1)
			expect( await kvs.putRaw(k1, b2) ).toBe(null)
			expect( await kvs.getBoolean(k1) ).toBe(b2)
		});

		test('Create a KVS, write raw boolean to it, read from it, delete - async', async () => {
			expect( kvs = await pot.new()    ).toBeDefined()
			expect( await kvs.putRaw(k1, b1) ).toBe(null)
			expect( await kvs.getBoolean(k1) ).toBe(b1)
			expect( await kvs.delete(k1)     ).toBe(null)
			expect( await kvs.getBoolean(k1) ).toBeUndefined()
		});

		test('Create a KVS, write raw boolean to it, save, load, read from it - async', async () => {
			expect( kvs  = await pot.new()     ).toBeDefined()
			expect( await kvs.putRaw(k1, b1)   ).toBe(null)
			expect( ref  = await kvs.save()    ).toBeDefined()
			expect( kvs2 = await pot.load(ref) ).toBeDefined()
			expect( await kvs2.getBoolean(k1)  ).toBe(b1)
		});

		test('Create a KVS, write raw boolean to it, save, delete, load, read it - async', async () => {
			expect( kvs  = await pot.new()     ).toBeDefined()
			expect( await kvs.putRaw(k1, b1)   ).toBe(null)
			expect( ref  = await kvs.save()    ).toBeDefined()
			expect( await kvs.delete(k1)       ).toBe(null)
			expect( await kvs.getBoolean(k1)   ).toBeUndefined()
			expect( kvs2 = await pot.load(ref) ).toBeDefined()
			expect( await kvs2.getBoolean(k1)  ).toBe(b1)
		});

		test('Create a KVS, write raw boolean to it with timeout - async', async () => {
			expect( kvs = await pot.new()         ).toBeDefined()
			expect( await kvs.putRaw(k1, b1, 10)  ).toBe(null)
		});

		test('Create a KVS, write raw boolean to it, read from it with timeout - async', async () => {
			expect( kvs = await pot.new()         ).toBeDefined()
			expect( await kvs.putRaw(k1, b1, 10)  ).toBe(null)
			expect( await kvs.getBoolean(k1, 10)  ).toBe(b1)
		});

		test('Create a KVS, write raw boolean to it, read from it, delete with timeout - async', async () => {
			expect( kvs = await pot.new()         ).toBeDefined()
			expect( await kvs.putRaw(k1, b1, 10)  ).toBe(null)
			expect( await kvs.getBoolean(k1, 10)  ).toBe(b1)
			expect( await kvs.delete(k1, 10)      ).toBe(null)
			expect( await kvs.getBoolean(k1, 10)  ).toBeUndefined()
		});

		test('Create a KVS, write raw boolean to it, save it, load it, read it with timeout - async', async () => {
			expect( kvs  = await pot.new()        ).toBeDefined()
			expect( await kvs.putRaw(k1, b1, 10)  ).toBe(null)
			expect( ref  = await kvs.save(10)     ).toBeDefined()
			expect( kvs2 = await pot.load(ref, null, null, 10)).toBeDefined()
			expect( await kvs2.getBoolean(k1, 10) ).toBe(b1)
		});

	});

	describe('numbers', () => {

		test('Create a KVS, write raw number to it - async', async () => {
			expect( kvs = await pot.new()    ).toBeDefined()
			expect( await kvs.putRaw(k1, n1) ).toBe(null)
		});

		test('Create a KVS, read unset raw number from it - async', async () => {
			expect( kvs = await pot.new()    ).toBeDefined()
			expect( await kvs.getNumber(k1)  ).toBeUndefined()
		});

		test('Create a KVS, write raw number to it, read it - async', async () => {
			expect( kvs = await pot.new()    ).toBeDefined()
			expect( await kvs.putRaw(k1, n1) ).toBe(null)
			expect( await kvs.getNumber(k1)  ).toBe(n1)
		});

		test('Create a KVS, write raw number to it, read from it, change - async', async () => {
			expect( kvs = await pot.new()    ).toBeDefined()
			expect( await kvs.putRaw(k1, n1) ).toBe(null)
			expect( await kvs.getNumber(k1)  ).toBe(n1)
			expect( await kvs.putRaw(k1, n2) ).toBe(null)
			expect( await kvs.getNumber(k1)  ).toBe(n2)
		});

		test('Create a KVS, write raw number to it, read from it, delete - async', async () => {
			expect( kvs = await pot.new()    ).toBeDefined()
			expect( await kvs.putRaw(k1, n1) ).toBe(null)
			expect( await kvs.getNumber(k1)  ).toBe(n1)
			expect( await kvs.delete(k1)     ).toBe(null)
			expect( await kvs.getNumber(k1)  ).toBeUndefined()
		});

		test('Create a KVS, write raw number to it, save, load, read from it - async', async () => {
			expect( kvs  = await pot.new()     ).toBeDefined()
			expect( await kvs.putRaw(k1, n1)   ).toBe(null)
			expect( ref  = await kvs.save()    ).toBeDefined()
			expect( kvs2 = await pot.load(ref) ).toBeDefined()
			expect( await kvs2.getNumber(k1)   ).toBe(n1)
		});

		test('Create a KVS, write raw number to it, save, delete, load, read it - async', async () => {
			expect( kvs  = await pot.new()     ).toBeDefined()
			expect( await kvs.putRaw(k1, n1)   ).toBe(null)
			expect( ref  = await kvs.save()    ).toBeDefined()
			expect( await kvs.delete(k1)       ).toBe(null)
			expect( await kvs.getNumber(k1)    ).toBeUndefined()
			expect( kvs2 = await pot.load(ref) ).toBeDefined()
			expect( await kvs2.getNumber(k1)   ).toBe(n1)
		});

		test('Create a KVS, write raw number to it with timeout - async', async () => {
			expect( kvs = await pot.new()         ).toBeDefined()
			expect( await kvs.putRaw(k1, n1, 10)  ).toBe(null)
		});

		test('Create a KVS, write raw number to it, read from it with timeout - async', async () => {
			expect( kvs = await pot.new()         ).toBeDefined()
			expect( await kvs.putRaw(k1, n1, 10)  ).toBe(null)
			expect( await kvs.getNumber(k1, 10)   ).toBe(n1)
		});

		test('Create a KVS, write raw number to it, read from it, delete with timeout - async', async () => {
			expect( kvs = await pot.new()         ).toBeDefined()
			expect( await kvs.putRaw(k1, n1, 10)  ).toBe(null)
			expect( await kvs.getNumber(k1, 10)   ).toBe(n1)
			expect( await kvs.delete(k1, 10)      ).toBe(null)
			expect( await kvs.getNumber(k1, 10)   ).toBeUndefined()
		});

		test('Create a KVS, write raw number to it, save it, load it, read it with timeout - async', async () => {
			expect( kvs  = await pot.new()        ).toBeDefined()
			expect( await kvs.putRaw(k1, n1, 10)  ).toBe(null)
			expect( ref  = await kvs.save(10)     ).toBeDefined()
			expect( kvs2 = await pot.load(ref, null, null, 10)).toBeDefined()
			expect( await kvs2.getNumber(k1, 10)  ).toBe(n1)
		});

	});

	describe('strings', () => {

		test('Create a KVS, write raw string to it - async', async () => {
			expect( kvs = await pot.new()    ).toBeDefined()
			expect( await kvs.putRaw(k1, s1) ).toBe(null)
		});

		test('Create a KVS, read unset raw string from it - async', async () => {
			expect( kvs = await pot.new()    ).toBeDefined()
			expect( await kvs.getString(k1)  ).toBeUndefined()
		});

		test('Create a KVS, write raw string to it, read it - async', async () => {
			expect( kvs = await pot.new()    ).toBeDefined()
			expect( await kvs.putRaw(k1, s1) ).toBe(null)
			expect( await kvs.getString(k1)  ).toBe(s1)
		});

		test('Create a KVS, write raw string to it, read from it, change - async', async () => {
			expect( kvs = await pot.new()    ).toBeDefined()
			expect( await kvs.putRaw(k1, s1) ).toBe(null)
			expect( await kvs.getString(k1)  ).toBe(s1)
			expect( await kvs.putRaw(k1, s2) ).toBe(null)
			expect( await kvs.getString(k1)  ).toBe(s2)
		});

		test('Create a KVS, write raw string to it, read from it, delete - async', async () => {
			expect( kvs = await pot.new()    ).toBeDefined()
			expect( await kvs.putRaw(k1, s1) ).toBe(null)
			expect( await kvs.getString(k1)  ).toBe(s1)
			expect( await kvs.delete(k1)     ).toBe(null)
			expect( await kvs.getString(k1)  ).toBeUndefined()
		});

		test('Create a KVS, write raw string to it, save, load, read from it - async', async () => {
			expect( kvs  = await pot.new()     ).toBeDefined()
			expect( await kvs.putRaw(k1, s1)   ).toBe(null)
			expect( ref  = await kvs.save()    ).toBeDefined()
			expect( kvs2 = await pot.load(ref) ).toBeDefined()
			expect( await kvs2.getString(k1)   ).toBe(s1)
		});

		test('Create a KVS, write raw string to it, save, delete, load, read it - async', async () => {
			expect( kvs  = await pot.new()     ).toBeDefined()
			expect( await kvs.putRaw(k1, s1)   ).toBe(null)
			expect( ref  = await kvs.save()    ).toBeDefined()
			expect( await kvs.delete(k1)       ).toBe(null)
			expect( await kvs.getString(k1)    ).toBeUndefined()
			expect( kvs2 = await pot.load(ref) ).toBeDefined()
			expect( await kvs2.getString(k1)   ).toBe(s1)
		});

		test('Create a KVS, write raw string to it with timeout - async', async () => {
			expect( kvs = await pot.new()         ).toBeDefined()
			expect( await kvs.putRaw(k1, s1, 10)  ).toBe(null)
		});

		test('Create a KVS, write raw string to it, read from it with timeout - async', async () => {
			expect( kvs = await pot.new()         ).toBeDefined()
			expect( await kvs.putRaw(k1, s1, 10)  ).toBe(null)
			expect( await kvs.getString(k1, 10)   ).toBe(s1)
		});

		test('Create a KVS, write raw string to it, read from it, delete with timeout - async', async () => {
			expect( kvs = await pot.new()         ).toBeDefined()
			expect( await kvs.putRaw(k1, s1, 10)  ).toBe(null)
			expect( await kvs.getString(k1, 10)   ).toBe(s1)
			expect( await kvs.delete(k1, 10)      ).toBe(null)
			expect( await kvs.getString(k1, 10)   ).toBeUndefined()
		});

		test('Create a KVS, write raw string to it, save it, load it, read it with timeout - async', async () => {
			expect( kvs  = await pot.new()        ).toBeDefined()
			expect( await kvs.putRaw(k1, s1, 10)  ).toBe(null)
			expect( ref  = await kvs.save(10)     ).toBeDefined()
			expect( kvs2 = await pot.load(ref, null, null, 10)).toBeDefined()
			expect( await kvs2.getString(k1, 10)  ).toBe(s1)
		});

	});
});

describe('Asynchronous Edge Cases (Promises)', () => {

	test('Create a KVS, write to it twice - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( await kvs.put(k1, v1)      ).toBe(null)
	});

	test('Create a KVS, write to it twice, read from it twice - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( await kvs.get(k1)          ).toBe(v1)
		expect( await kvs.get(k1)          ).toBe(v1)
	});

	test('Create a KVS, write boolean false to it, read it back - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, false)   ).toBe(null)
		expect( await kvs.get(k1)          ).toBe(false)
	});

	test('Create a KVS, write number 0 to it, read it back - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, 0)       ).toBe(null)
		expect( await kvs.get(k1)          ).toBe(0)
	});

	test('Create a KVS, write empty string to it, read it back - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, "")      ).toBe(null)
		expect( await kvs.get(k1)          ).toBe("")
	});

	test('Create a KVS, write empty byte array to it, read it back - async', async () => {
		let v = new Uint8Array()
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, v)       ).toBe(null)
		expect( await kvs.get(k1)          ).toStrictEqual(v) // softer than toBe
	});

	test('Create a KVS, writing to an empty string key fails - async', async () => {
		expect( kvs  = await pot.new()     ).toBeDefined()
		expect( kvs.put("", v1)            ).rejects.toThrow()
	});

	test('Create a KVS, writing to a boolean false key fails - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( kvs.put(false, v1)         ).rejects.toThrow()
	});

	test('Create a KVS, writing to a boolean true key fails - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( kvs.put(true, v1)          ).rejects.toThrow()
	});

	test('Create a KVS, write maximal numeric key - async', async () => {
		let k = Number.MAX_VALUE
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(k)
		pot.setVerbosity(verb)
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k, v1)       ).toBe(null)
		expect( await kvs.get(k)           ).toBe(v1)
	});

	test('Create a KVS, write minimal numeric key - async', async () => {
		let k = - Number.MAX_VALUE
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(k)
		pot.setVerbosity(verb)
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k, v1)       ).toBe(null)
		expect( await kvs.get(k)           ).toBe(v1)
	});

	test('Create a KVS, write mininmal positive numeric key - async', async () => {
		let k = Number.MIN_VALUE
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(k)
		pot.setVerbosity(verb)
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k, v1)       ).toBe(null)
		expect( await kvs.get(k)           ).toBe(v1)
	});

	test('Create a KVS, write positive infinity numeric key - async', async () => {
		let k = Number.POSITIVE_INFINITY
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(k)
		pot.setVerbosity(verb)
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k, v1)       ).toBe(null)
		expect( await kvs.get(k)           ).toBe(v1)
	});

	test('Create a KVS, write negative infinity numeric key - async', async () => {
		let k = Number.NEGATIVE_INFINITY
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(k)
		pot.setVerbosity(verb)
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k, v1)       ).toBe(null)
		expect( await kvs.get(k)           ).toBe(v1)
	});

	test('Create a KVS, writing to a number 0 key - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(0, v1)       ).toBe(null)
		expect( await kvs.get(0)           ).toBe(v1)
	});

	test('Create a KVS, writing to an empty byte array key fails - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( kvs.put(new Uint8Array(), v1)).rejects.toThrow()
	});

	test('Create a KVS, writing to a single 0 byte key - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(new Uint8Array([0]), v1)).toBe(null)
		expect( await kvs.get(new Uint8Array([0]))).toBe(v1)
	});

	test('Create a KVS, writing to an 32 0 byte key - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(new Uint8Array(32).fill(0), v1)).toBe(null)
		expect( await kvs.get(new Uint8Array(32).fill(0))).toBe(v1)
	});

	test('Create a KVS, writing to a 33 byte key fails - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( kvs.put(new Uint8Array(33).fill(255), v1)).rejects.toThrow()
	});

	test('Create a KVS, write minimal numeric value - async', async () => {
		let v = - Number.MAX_VALUE
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(v)
		pot.log('The logging does not represent the IEEE 754 storage format')
		pot.setVerbosity(verb)
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, v)       ).toBe(null)
		expect( await kvs.get(k1)          ).toStrictEqual(v) // softer than toBe
	});

	test('Create a KVS, write maximal numeric value - async', async () => {
		let v = Number.MAX_VALUE
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(v)
		pot.log('The logging does not represent the IEEE 754 storage format')
		pot.setVerbosity(verb)
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, v)       ).toBe(null)
		expect( await kvs.get(k1)          ).toStrictEqual(v) // softer than toBe
	});

	test('Create a KVS, write mininmal positive numeric value - async', async () => {
		let v = Number.MIN_VALUE
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(v)
		pot.log('The logging does not represent the IEEE 754 storage format')
		pot.setVerbosity(verb)
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, v)       ).toBe(null)
		expect( await kvs.get(k1)          ).toStrictEqual(v) // softer than toBe
	});

	test('Create a KVS, write positive infinity numeric value - async', async () => {
		let v = Number.POSITIVE_INFINITY
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(v)
		pot.log('The logging does not represent the IEEE 754 storage format')
		pot.setVerbosity(verb)
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, v)       ).toBe(null)
		expect( await kvs.get(k1)          ).toStrictEqual(v) // softer than toBe
	});

	test('Create a KVS, write negative infinity numeric value - async', async () => {
		let v = Number.NEGATIVE_INFINITY
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(v)
		pot.log('The logging does not represent the IEEE 754 storage format')
		pot.setVerbosity(verb)
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, v)       ).toBe(null)
		expect( await kvs.get(k1)          ).toStrictEqual(v) // softer than toBe
	});

	test('Create a KVS, writing a 10,000 character string value - async', async () => {
		let v = "x".repeat(10000)
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, v)       ).toBe(null)
		expect( await kvs.get(k1)          ).toStrictEqual(v) // softer than toBe
	});

	test('Create a KVS, writing a 10,000 byte value - async', async () => {
		let v = new Uint8Array(10000).fill(255)
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, v)       ).toBe(null)
		expect( await kvs.get(k1)          ).toStrictEqual(v) // softer than toBe
	});

	test('Create a KVS, immediately read from it - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.get(k1)          ).toBeUndefined()
	});

	test('Create a KVS, immediately delete inexistant value from it - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.delete(k1)       ).toBe(null)
	});

	test('Create a KVS, write to it, delete twice - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( await kvs.delete(k1)       ).toBe(null)
		expect( await kvs.delete(k1)       ).toBe(null)
	});

	test('Create a KVS, saving it empty returns 0 reference - async', async () => {
		expect( kvs  = await pot.new()     ).toBeDefined()
		expect( await kvs.save()           ).toBe("0000000000000000000000000000000000000000000000000000000000000000")
	});

	test('Create a KVS from a 0 reference - async', async () => {
		expect( await pot.load("0000000000000000000000000000000000000000000000000000000000000000") ).toBeDefined()
	});

	test('Create a KVS from a 0 reference, test behavior - async', async () => {
		expect( kvs = await pot.load("0000000000000000000000000000000000000000000000000000000000000000") ).toBeDefined()
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( await kvs.get(k1)          ).toStrictEqual(v1)
		expect( await kvs.save()           ).toBeDefined()
		expect( await kvs.delete(k1)       ).toBe(null)
		expect( await kvs.save()           ).toBe("0000000000000000000000000000000000000000000000000000000000000000")
	});
});

describe('Asynchronous Regression Tests (Promises)', () => {

	test('Save after storing identical key-value twice - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( await kvs.save()           ).toBeDefined()
	});

	test('Save after deletion of non-existent key (non-empty KVS) - async', async () => {
		expect( kvs = await pot.new()      ).toBeDefined()
		expect( await kvs.put(k1, v1)      ).toBe(null)
		expect( await kvs.delete(k2)       ).toBe(null)
		expect( await kvs.save()           ).toBeDefined()
	});

	test('Saving a KVS empty returns 0 reference - async', async () => {
		expect( kvs  = await pot.new()     ).toBeDefined()
		expect( await kvs.save()           ).toBe("0000000000000000000000000000000000000000000000000000000000000000")
	});

	test('Create a KVS from a 0 reference - async', async () => {
		expect( kvs = await pot.load("0000000000000000000000000000000000000000000000000000000000000000") ).toBeDefined()
	});

});
