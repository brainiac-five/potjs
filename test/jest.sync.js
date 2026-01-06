/*
**    SWARM POT JS Test Suite 3 / Node Jest, Synchronous Calls
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

describe('Synchronous Happy Path', () => {

	test('Create a KVS - sync', async () => {
		expect( pot.newSync() ).toBeDefined()
	});

	test('Create a KVS, write to it - sync', async () => {
		expect( kvs = pot.newSync() ).toBeDefined()
		expect( kvs.putSync(k1, v1) ).toBe(null)
	});

	test('Create a KVS, read unset from it - sync', async () => {
		expect( kvs = pot.newSync()   ).toBeDefined()
		expect( kvs.getSync(k1)       ).toBeUndefined()
	});

	test('Create a KVS, write to it, read from it - sync', async () => {
		expect( kvs = pot.newSync()   ).toBeDefined()
		expect( kvs.putSync(k1, v1)   ).toBe(null)
		expect( kvs.getSync(k1)       ).toBe(v1)
	});

	test('Create a KVS, write to it, read from it, read unset - sync', async () => {
		expect( kvs = pot.newSync()   ).toBeDefined()
		expect( kvs.putSync(k1, v1)   ).toBe(null)
		expect( kvs.getSync(k1)       ).toBe(v1)
		expect( kvs.getSync(k2)       ).toBeUndefined()
	});

	test('Create a KVS, write to it, read from it, change - sync', async () => {
		expect( kvs = pot.newSync()   ).toBeDefined()
		expect( kvs.putSync(k1, v1)   ).toBe(null)
		expect( kvs.getSync(k1)       ).toBe(v1)
		expect( kvs.putSync(k1, v2)   ).toBe(null)
		expect( kvs.getSync(k1)       ).toBe(v2)
	});

	test('Create a KVS, write to it, read from it, delete - sync', async () => {
		expect( kvs = pot.newSync()   ).toBeDefined()
		expect( kvs.putSync(k1, v1)   ).toBe(null)
		expect( kvs.getSync(k1)       ).toBe(v1)
		expect( kvs.deleteSync(k1)    ).toBe(null)
		expect( kvs.getSync(k1)       ).toBeUndefined()
	});

	test('Create a KVS, write two entries to it, read, delete, re-read - sync', async () => {
		expect( kvs = pot.newSync()   ).toBeDefined()
		expect( kvs.putSync(k1, v1)   ).toBe(null)
		expect( kvs.putSync(k2, v2)   ).toBe(null)
		expect( kvs.getSync(k1)       ).toBe(v1)
		expect( kvs.getSync(k2)       ).toBe(v2)
		expect( kvs.deleteSync(k1)    ).toBe(null)
		expect( kvs.getSync(k1)       ).toBeUndefined()
		expect( kvs.getSync(k2)       ).toBe(v2)
	});

	test('Create a KVS, write to it, save it - sync', async () => {
		expect( kvs  = pot.newSync()     ).toBeDefined()
		expect( kvs.putSync(k1, v1)      ).toBe(null)
		expect( ref  = kvs.saveSync()    ).toBeDefined()
	});

	test('Create a KVS, write to it, save it, load it, read it - sync', async () => {
		expect( kvs  = pot.newSync()     ).toBeDefined()
		expect( kvs.putSync(k1, v1)      ).toBe(null)
		expect( ref  = kvs.saveSync()    ).toBeDefined()
		expect( kvs2 = pot.loadSync(ref) ).toBeDefined()
		expect( kvs2.getSync(k1)         ).toBe(v1)
	});

	test('Create a KVS, write to it, save it, load and read it twice - sync', async () => {
		expect( kvs  = pot.newSync()     ).toBeDefined()
		expect( kvs.putSync(k1, v1)      ).toBe(null)
		expect( ref  = kvs.saveSync()    ).toBeDefined()
		expect( kvs2 = pot.loadSync(ref) ).toBeDefined()
		expect( kvs2.getSync(k1)         ).toBe(v1)
		expect( kvs3 = pot.loadSync(ref) ).toBeDefined()
		expect( kvs3.getSync(k1)         ).toBe(v1)
	});

	test('Create a KVS, write to it, save, delete, load, read it - sync', async () => {
		expect( kvs  = pot.newSync()     ).toBeDefined()
		expect( kvs.putSync(k1, v1)      ).toBe(null)
		expect( ref  = kvs.saveSync()    ).toBeDefined()
		expect( kvs.deleteSync(k1)       ).toBe(null)
		expect( kvs.getSync(k1)          ).toBeUndefined()
		expect( kvs2 = pot.loadSync(ref) ).toBeDefined()
		expect( kvs2.getSync(k1)         ).toBe(v1)
	});

	test('Create a KVS, write two entries, save, load, read them - sync', async () => {
		expect( kvs  = pot.newSync()     ).toBeDefined()
		expect( kvs.putSync(k1, v1)      ).toBe(null)
		expect( kvs.putSync(k2, v2)      ).toBe(null)
		expect( ref  = kvs.saveSync()    ).toBeDefined()
		expect( kvs2 = pot.loadSync(ref) ).toBeDefined()
		expect( kvs2.getSync(k1)         ).toBe(v1)
		expect( kvs2.getSync(k2)         ).toBe(v2)
	});

	test('Create a KVS, write two entries, save, load, read old ones - sync', async () => {
		expect( kvs  = pot.newSync()     ).toBeDefined()
		expect( kvs.putSync(k1, v1)      ).toBe(null)
		expect( kvs.putSync(k2, v2)      ).toBe(null)
		expect( ref  = kvs.saveSync()    ).toBeDefined()
		expect( kvs2 = pot.loadSync(ref) ).toBeDefined()
		expect( kvs.getSync(k1)          ).toBe(v1)
		expect( kvs.getSync(k2)          ).toBe(v2)
	});

	test('Create a KVS, write two entries, save, delete, load, read them - sync', async () => {
		expect( kvs  = pot.newSync()     ).toBeDefined()
		expect( kvs.putSync(k1, v1)      ).toBe(null)
		expect( kvs.putSync(k2, v2)      ).toBe(null)
		expect( ref  = kvs.saveSync()    ).toBeDefined()
		expect( kvs.deleteSync(k1)       ).toBe(null)
		expect( kvs.deleteSync(k2)       ).toBe(null)
		expect( kvs.getSync(k1)          ).toBeUndefined()
		expect( kvs.getSync(k2)          ).toBeUndefined()
		expect( kvs2 = pot.loadSync(ref) ).toBeDefined()
		expect( kvs2.getSync(k1)         ).toBe(v1)
		expect( kvs2.getSync(k2)         ).toBe(v2)
	})

	test('Create a KVS, write two entries, save, load, delete, read old ones - sync', async () => {
		expect( kvs  = pot.newSync()     ).toBeDefined()
		expect( kvs.putSync(k1, v1)      ).toBe(null)
		expect( kvs.putSync(k2, v2)      ).toBe(null)
		expect( ref  = kvs.saveSync()    ).toBeDefined()
		expect( kvs2 = pot.loadSync(ref) ).toBeDefined()
		expect( kvs2.deleteSync(k1)      ).toBe(null)
		expect( kvs2.deleteSync(k2)      ).toBe(null)
		expect( kvs2.getSync(k1)         ).toBeUndefined()
		expect( kvs2.getSync(k2)         ).toBeUndefined()
		expect( kvs.getSync(k1)          ).toBe(v1)
		expect( kvs.getSync(k2)          ).toBe(v2)
	})

	test('Create three KVS, write entries, read entries - sync', async () => {
		expect( kvs  = pot.newSync()     ).toBeDefined()
		expect( kvs2 = pot.newSync()     ).toBeDefined()
		expect( kvs3 = pot.newSync()     ).toBeDefined()
		expect( kvs.putSync(k1, v1)      ).toBe(null)
		expect( kvs.getSync(k1)          ).toBe(v1)
		expect( kvs2.getSync(k1)         ).toBeUndefined()
		expect( kvs3.getSync(k1)         ).toBeUndefined()
		expect( kvs2.putSync(k1, v1)     ).toBe(null)
		expect( kvs.getSync(k1)          ).toBe(v1)
		expect( kvs2.getSync(k1)         ).toBe(v1)
		expect( kvs3.getSync(k1)         ).toBeUndefined()
		expect( kvs3.putSync(k1, v1)     ).toBe(null)
		expect( kvs.getSync(k1)          ).toBe(v1)
		expect( kvs2.getSync(k1)         ).toBe(v1)
		expect( kvs3.getSync(k1)         ).toBe(v1)
	})

	test('Create three KVS, write entries, delete entries - sync', async () => {
		expect( kvs  = pot.newSync()     ).toBeDefined()
		expect( kvs2 = pot.newSync()     ).toBeDefined()
		expect( kvs3 = pot.newSync()     ).toBeDefined()
		expect( kvs.putSync(k1, v1)      ).toBe(null)
		expect( kvs2.putSync(k1, v1)     ).toBe(null)
		expect( kvs3.putSync(k1, v1)     ).toBe(null)
		expect( kvs.deleteSync(k1)       ).toBe(null)
		expect( kvs.getSync(k1)          ).toBeUndefined()
		expect( kvs2.getSync(k1)         ).toBe(v1)
		expect( kvs3.getSync(k1)         ).toBe(v1)
		expect( kvs2.deleteSync(k1)      ).toBe(null)
		expect( kvs.getSync(k1)          ).toBeUndefined()
		expect( kvs2.getSync(k1)         ).toBeUndefined()
		expect( kvs3.getSync(k1)         ).toBe(v1)
		expect( kvs3.deleteSync(k1)      ).toBe(null)
		expect( kvs.getSync(k1)          ).toBeUndefined()
		expect( kvs2.getSync(k1)         ).toBeUndefined()
		expect( kvs3.getSync(k1)         ).toBeUndefined()
	})

	test('Create three KVSs, write entries, read, delete - sync', async () => {
		expect( kvs  = pot.newSync()     ).toBeDefined()
		expect( kvs2 = pot.newSync()     ).toBeDefined()
		expect( kvs3 = pot.newSync()     ).toBeDefined()
		expect( kvs.putSync(k1, v1)      ).toBe(null)
		expect( kvs.getSync(k1)          ).toBe(v1)
		expect( kvs2.getSync(k1)         ).toBeUndefined()
		expect( kvs3.getSync(k1)         ).toBeUndefined()
		expect( kvs2.putSync(k1, v1)     ).toBe(null)
		expect( kvs.getSync(k1)          ).toBe(v1)
		expect( kvs2.getSync(k1)         ).toBe(v1)
		expect( kvs3.getSync(k1)         ).toBeUndefined()
		expect( kvs3.putSync(k1, v1)     ).toBe(null)
		expect( kvs.getSync(k1)          ).toBe(v1)
		expect( kvs2.getSync(k1)         ).toBe(v1)
		expect( kvs3.getSync(k1)         ).toBe(v1)
		expect( kvs.deleteSync(k1)       ).toBe(null)
		expect( kvs.getSync(k1)          ).toBeUndefined()
		expect( kvs2.getSync(k1)         ).toBe(v1)
		expect( kvs3.getSync(k1)         ).toBe(v1)
		expect( kvs2.deleteSync(k1)      ).toBe(null)
		expect( kvs.getSync(k1)          ).toBeUndefined()
		expect( kvs2.getSync(k1)         ).toBeUndefined()
		expect( kvs3.getSync(k1)         ).toBe(v1)
		expect( kvs3.deleteSync(k1)      ).toBe(null)
		expect( kvs.getSync(k1)          ).toBeUndefined()
		expect( kvs2.getSync(k1)         ).toBeUndefined()
		expect( kvs3.getSync(k1)         ).toBeUndefined()
	})

	test('Create a KVS, write to it with timeout - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k1, v1, 10)  ).toBe(null)
	});

	test('Create a KVS, write to it, read from it with timeout - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k1, v1, 10)  ).toBe(null)
		expect( kvs.getSync(k1, 10)      ).toBe(v1)
	});

	test('Create a KVS, write to it, read from it, delete with timeout - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k1, v1, 10)  ).toBe(null)
		expect( kvs.getSync(k1, 10)      ).toBe(v1)
		expect( kvs.deleteSync(k1, 10)   ).toBe(null)
		expect( kvs.getSync(k1, 10)      ).toBeUndefined()
	});

	test('Create a KVS, write to it, save it, load it, read it with timeout - sync', async () => {
		expect( kvs  = pot.newSync()     ).toBeDefined()
		expect( kvs.putSync(k1, v1, 10)  ).toBe(null)
		expect( ref  = kvs.saveSync(10)  ).toBeDefined()
		expect( kvs2 = pot.loadSync(ref, null, null, 10)).toBeDefined()
		expect( kvs2.getSync(k1, 10)     ).toBe(v1)
	});

});

describe('Synchronous Raw', () => {

	describe('booleans', () => {

		test('Create a KVS, write raw boolean to it - sync', async () => {
			expect( kvs = pot.newSync()    ).toBeDefined()
			expect( kvs.putRawSync(k1, b1) ).toBe(null)
		});

		test('Create a KVS, read unset raw boolean from it - sync', async () => {
			expect( kvs = pot.newSync()    ).toBeDefined()
			expect( kvs.getBooleanSync(k1) ).toBeUndefined()
		});

		test('Create a KVS, write raw boolean to it, read it - sync', async () => {
			expect( kvs = pot.newSync()    ).toBeDefined()
			expect( kvs.putRawSync(k1, b1) ).toBe(null)
			expect( kvs.getBooleanSync(k1) ).toBe(b1)
		});

		test('Create a KVS, write raw boolean to it, read from it, change - sync', async () => {
			expect( kvs = pot.newSync()    ).toBeDefined()
			expect( kvs.putRawSync(k1, b1) ).toBe(null)
			expect( kvs.getBooleanSync(k1) ).toBe(b1)
			expect( kvs.putRawSync(k1, b2) ).toBe(null)
			expect( kvs.getBooleanSync(k1) ).toBe(b2)
		});

		test('Create a KVS, write raw boolean to it, read from it, delete - sync', async () => {
			expect( kvs = pot.newSync()    ).toBeDefined()
			expect( kvs.putRawSync(k1, b1) ).toBe(null)
			expect( kvs.getBooleanSync(k1) ).toBe(b1)
			expect( kvs.deleteSync(k1)     ).toBe(null)
			expect( kvs.getBooleanSync(k1) ).toBeUndefined()
		});

		test('Create a KVS, write raw boolean to it, save, load, read from it - sync', async () => {
			expect( kvs  = pot.newSync()     ).toBeDefined()
			expect( kvs.putRawSync(k1, b1)   ).toBe(null)
			expect( ref  = kvs.saveSync()    ).toBeDefined()
			expect( kvs2 = pot.loadSync(ref) ).toBeDefined()
			expect( kvs2.getBooleanSync(k1)  ).toBe(b1)
		});

		test('Create a KVS, write raw boolean to it, save, delete, load, read it - sync', async () => {
			expect( kvs  = pot.newSync()     ).toBeDefined()
			expect( kvs.putRawSync(k1, b1)   ).toBe(null)
			expect( ref  = kvs.saveSync()    ).toBeDefined()
			expect( kvs.deleteSync(k1)       ).toBe(null)
			expect( kvs.getBooleanSync(k1)   ).toBeUndefined()
			expect( kvs2 = pot.loadSync(ref) ).toBeDefined()
			expect( kvs2.getBooleanSync(k1)  ).toBe(b1)
		});

		test('Create a KVS, write raw boolean to it with timeout - sync', async () => {
			expect( kvs = pot.newSync()         ).toBeDefined()
			expect( kvs.putRawSync(k1, b1, 10)  ).toBe(null)
		});

		test('Create a KVS, write raw boolean to it, read from it with timeout - sync', async () => {
			expect( kvs = pot.newSync()         ).toBeDefined()
			expect( kvs.putRawSync(k1, b1, 10)  ).toBe(null)
			expect( kvs.getBooleanSync(k1, 10)  ).toBe(b1)
		});

		test('Create a KVS, write raw boolean to it, read from it, delete with timeout - sync', async () => {
			expect( kvs = pot.newSync()         ).toBeDefined()
			expect( kvs.putRawSync(k1, b1, 10)  ).toBe(null)
			expect( kvs.getBooleanSync(k1, 10)  ).toBe(b1)
			expect( kvs.deleteSync(k1, 10)      ).toBe(null)
			expect( kvs.getBooleanSync(k1, 10)  ).toBeUndefined()
		});

		test('Create a KVS, write raw boolean to it, save it, load it, read it with timeout - sync', async () => {
			expect( kvs  = pot.newSync()        ).toBeDefined()
			expect( kvs.putRawSync(k1, b1, 10)  ).toBe(null)
			expect( ref  = kvs.saveSync(10)     ).toBeDefined()
			expect( kvs2 = pot.loadSync(ref, null, null, 10)).toBeDefined()
			expect( kvs2.getBooleanSync(k1, 10) ).toBe(b1)
		});

	});

	describe('numbers', () => {

		test('Create a KVS, write raw number to it - sync', async () => {
			expect( kvs = pot.newSync()    ).toBeDefined()
			expect( kvs.putRawSync(k1, n1) ).toBe(null)
		});

		test('Create a KVS, read unset raw number from it - sync', async () => {
			expect( kvs = pot.newSync()    ).toBeDefined()
			expect( kvs.getNumberSync(k1)  ).toBeUndefined()
		});

		test('Create a KVS, write raw number to it, read it - sync', async () => {
			expect( kvs = pot.newSync()    ).toBeDefined()
			expect( kvs.putRawSync(k1, n1) ).toBe(null)
			expect( kvs.getNumberSync(k1)  ).toBe(n1)
		});

		test('Create a KVS, write raw number to it, read from it, change - sync', async () => {
			expect( kvs = pot.newSync()    ).toBeDefined()
			expect( kvs.putRawSync(k1, n1) ).toBe(null)
			expect( kvs.getNumberSync(k1)  ).toBe(n1)
			expect( kvs.putRawSync(k1, n2) ).toBe(null)
			expect( kvs.getNumberSync(k1)  ).toBe(n2)
		});

		test('Create a KVS, write raw number to it, read from it, delete - sync', async () => {
			expect( kvs = pot.newSync()    ).toBeDefined()
			expect( kvs.putRawSync(k1, n1) ).toBe(null)
			expect( kvs.getNumberSync(k1)  ).toBe(n1)
			expect( kvs.deleteSync(k1)     ).toBe(null)
			expect( kvs.getNumberSync(k1)  ).toBeUndefined()
		});

		test('Create a KVS, write raw number to it, save, load, read from it - sync', async () => {
			expect( kvs  = pot.newSync()     ).toBeDefined()
			expect( kvs.putRawSync(k1, n1)   ).toBe(null)
			expect( ref  = kvs.saveSync()    ).toBeDefined()
			expect( kvs2 = pot.loadSync(ref) ).toBeDefined()
			expect( kvs2.getNumberSync(k1)   ).toBe(n1)
		});

		test('Create a KVS, write raw number to it, save, delete, load, read it - sync', async () => {
			expect( kvs  = pot.newSync()     ).toBeDefined()
			expect( kvs.putRawSync(k1, n1)   ).toBe(null)
			expect( ref  = kvs.saveSync()    ).toBeDefined()
			expect( kvs.deleteSync(k1)       ).toBe(null)
			expect( kvs.getNumberSync(k1)    ).toBeUndefined()
			expect( kvs2 = pot.loadSync(ref) ).toBeDefined()
			expect( kvs2.getNumberSync(k1)   ).toBe(n1)
		});

		test('Create a KVS, write raw number to it with timeout - sync', async () => {
			expect( kvs = pot.newSync()         ).toBeDefined()
			expect( kvs.putRawSync(k1, n1, 10)  ).toBe(null)
		});

		test('Create a KVS, write raw number to it, read from it with timeout - sync', async () => {
			expect( kvs = pot.newSync()         ).toBeDefined()
			expect( kvs.putRawSync(k1, n1, 10)  ).toBe(null)
			expect( kvs.getNumberSync(k1, 10)   ).toBe(n1)
		});

		test('Create a KVS, write raw number to it, read from it, delete with timeout - sync', async () => {
			expect( kvs = pot.newSync()         ).toBeDefined()
			expect( kvs.putRawSync(k1, n1, 10)  ).toBe(null)
			expect( kvs.getNumberSync(k1, 10)   ).toBe(n1)
			expect( kvs.deleteSync(k1, 10)      ).toBe(null)
			expect( kvs.getNumberSync(k1, 10)   ).toBeUndefined()
		});

		test('Create a KVS, write raw number to it, save it, load it, read it with timeout - sync', async () => {
			expect( kvs  = pot.newSync()        ).toBeDefined()
			expect( kvs.putRawSync(k1, n1, 10)  ).toBe(null)
			expect( ref  = kvs.saveSync(10)     ).toBeDefined()
			expect( kvs2 = pot.loadSync(ref, null, null, 10)).toBeDefined()
			expect( kvs2.getNumberSync(k1, 10)  ).toBe(n1)
		});

	});

	describe('strings', () => {

		test('Create a KVS, write raw string to it - sync', async () => {
			expect( kvs = pot.newSync()    ).toBeDefined()
			expect( kvs.putRawSync(k1, s1) ).toBe(null)
		});

		test('Create a KVS, read unset raw string from it - sync', async () => {
			expect( kvs = pot.newSync()    ).toBeDefined()
			expect( kvs.getStringSync(k1)  ).toBeUndefined()
		});

		test('Create a KVS, write raw string to it, read it - sync', async () => {
			expect( kvs = pot.newSync()    ).toBeDefined()
			expect( kvs.putRawSync(k1, s1) ).toBe(null)
			expect( kvs.getStringSync(k1)  ).toBe(s1)
		});

		test('Create a KVS, write raw string to it, read from it, change - sync', async () => {
			expect( kvs = pot.newSync()    ).toBeDefined()
			expect( kvs.putRawSync(k1, s1) ).toBe(null)
			expect( kvs.getStringSync(k1)  ).toBe(s1)
			expect( kvs.putRawSync(k1, s2) ).toBe(null)
			expect( kvs.getStringSync(k1)  ).toBe(s2)
		});

		test('Create a KVS, write raw string to it, read from it, delete - sync', async () => {
			expect( kvs = pot.newSync()    ).toBeDefined()
			expect( kvs.putRawSync(k1, s1) ).toBe(null)
			expect( kvs.getStringSync(k1)  ).toBe(s1)
			expect( kvs.deleteSync(k1)     ).toBe(null)
			expect( kvs.getStringSync(k1)  ).toBeUndefined()
		});

		test('Create a KVS, write raw string to it, save, load, read from it - sync', async () => {
			expect( kvs  = pot.newSync()     ).toBeDefined()
			expect( kvs.putRawSync(k1, s1)   ).toBe(null)
			expect( ref  = kvs.saveSync()    ).toBeDefined()
			expect( kvs2 = pot.loadSync(ref) ).toBeDefined()
			expect( kvs2.getStringSync(k1)   ).toBe(s1)
		});

		test('Create a KVS, write raw string to it, save, delete, load, read it - sync', async () => {
			expect( kvs  = pot.newSync()     ).toBeDefined()
			expect( kvs.putRawSync(k1, s1)   ).toBe(null)
			expect( ref  = kvs.saveSync()    ).toBeDefined()
			expect( kvs.deleteSync(k1)       ).toBe(null)
			expect( kvs.getStringSync(k1)    ).toBeUndefined()
			expect( kvs2 = pot.loadSync(ref) ).toBeDefined()
			expect( kvs2.getStringSync(k1)   ).toBe(s1)
		});

		test('Create a KVS, write raw string to it with timeout - sync', async () => {
			expect( kvs = pot.newSync()         ).toBeDefined()
			expect( kvs.putRawSync(k1, s1, 10)  ).toBe(null)
		});

		test('Create a KVS, write raw string to it, read from it with timeout - sync', async () => {
			expect( kvs = pot.newSync()         ).toBeDefined()
			expect( kvs.putRawSync(k1, s1, 10)  ).toBe(null)
			expect( kvs.getStringSync(k1, 10)   ).toBe(s1)
		});

		test('Create a KVS, write raw string to it, read from it, delete with timeout - sync', async () => {
			expect( kvs = pot.newSync()         ).toBeDefined()
			expect( kvs.putRawSync(k1, s1, 10)  ).toBe(null)
			expect( kvs.getStringSync(k1, 10)   ).toBe(s1)
			expect( kvs.deleteSync(k1, 10)      ).toBe(null)
			expect( kvs.getStringSync(k1, 10)   ).toBeUndefined()
		});

		test('Create a KVS, write raw string to it, save it, load it, read it with timeout - sync', async () => {
			expect( kvs  = pot.newSync()        ).toBeDefined()
			expect( kvs.putRawSync(k1, s1, 10)  ).toBe(null)
			expect( ref  = kvs.saveSync(10)     ).toBeDefined()
			expect( kvs2 = pot.loadSync(ref, null, null, 10)).toBeDefined()
			expect( kvs2.getStringSync(k1, 10)  ).toBe(s1)
		});

	});
});

describe('Synchronous Edge Cases', () => {

	test('Create a KVS, write to it twice - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k1, v1)      ).toBe(null)
		expect( kvs.putSync(k1, v1)      ).toBe(null)
	});

	test('Create a KVS, write to it twice, read from it twice - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k1, v1)      ).toBe(null)
		expect( kvs.putSync(k1, v1)      ).toBe(null)
		expect( kvs.getSync(k1)          ).toBe(v1)
		expect( kvs.getSync(k1)          ).toBe(v1)
	});

	test('Create a KVS, write boolean false to it, read it back - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k1, false)   ).toBe(null)
		expect( kvs.getSync(k1)          ).toBe(false)
	});

	test('Create a KVS, write number 0 to it, read it back - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k1, 0)       ).toBe(null)
		expect( kvs.getSync(k1)          ).toBe(0)
	});

	test('Create a KVS, write empty string to it, read it back - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k1, "")      ).toBe(null)
		expect( kvs.getSync(k1)          ).toBe("")
	});

	test('Create a KVS, write empty byte array to it, read it back - sync', async () => {
		let v = new Uint8Array()
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k1, v)       ).toBe(null)
		expect( kvs.getSync(k1)          ).toStrictEqual(v) // softer than toBe
	});

	test('Create a KVS, writing to an empty string key fails - sync', async () => {
		expect( kvs  = pot.newSync()     ).toBeDefined()
		expect( kvs.putSync("", v1)          ).toBeInstanceOf(Error)
	});

	test('Create a KVS, writing to a boolean false key fails - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(false, v1)       ).toBeInstanceOf(Error)
	});

	test('Create a KVS, writing to a boolean true key fails - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(true, v1)        ).toBeInstanceOf(Error)
	});

	test('Create a KVS, write maximal numeric key - sync', async () => {
		let k = Number.MAX_VALUE
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(k)
		pot.setVerbosity(verb)
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k, v1)       ).toBe(null)
		expect( kvs.getSync(k)           ).toBe(v1)
	});

	test('Create a KVS, write minimal numeric key - sync', async () => {
		let k = - Number.MAX_VALUE
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(k)
		pot.setVerbosity(verb)
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k, v1)       ).toBe(null)
		expect( kvs.getSync(k)           ).toBe(v1)
	});

	test('Create a KVS, write mininmal positive numeric key - sync', async () => {
		let k = Number.MIN_VALUE
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(k)
		pot.setVerbosity(verb)
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k, v1)       ).toBe(null)
		expect( kvs.getSync(k)           ).toBe(v1)
	});

	test('Create a KVS, write positive infinity numeric key - sync', async () => {
		let k = Number.POSITIVE_INFINITY
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(k)
		pot.setVerbosity(verb)
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k, v1)       ).toBe(null)
		expect( kvs.getSync(k)           ).toBe(v1)
	});

	test('Create a KVS, write negative infinity numeric key - sync', async () => {
		let k = Number.NEGATIVE_INFINITY
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(k)
		pot.setVerbosity(verb)
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k, v1)       ).toBe(null)
		expect( kvs.getSync(k)           ).toBe(v1)
	});

	test('Create a KVS, writing to a number 0 key - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(0, v1)       ).toBe(null)
		expect( kvs.getSync(0)           ).toBe(v1)
	});

	test('Create a KVS, writing to an empty byte array key fails - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(new Uint8Array(), v1)).toBeInstanceOf(Error)
	});

	test('Create a KVS, writing to a single 0 byte key - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(new Uint8Array([0]), v1)).toBe(null)
		expect( kvs.getSync(new Uint8Array([0]))).toBe(v1)
	});

	test('Create a KVS, writing to an 32 0 byte key - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(new Uint8Array(32).fill(0), v1)).toBe(null)
		expect( kvs.getSync(new Uint8Array(32).fill(0))).toBe(v1)
	});

	test('Create a KVS, writing to a 33 byte key fails - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(new Uint8Array(33).fill(255), v1)).toBeInstanceOf(Error)
	});

	test('Create a KVS, write minimal numeric value - sync', async () => {
		let v = - Number.MAX_VALUE
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(v)
		pot.log('The logging does not represent the IEEE 754 storage format')
		pot.setVerbosity(verb)
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k1, v)       ).toBe(null)
		expect( kvs.getSync(k1)          ).toStrictEqual(v) // softer than toBe
	});

	test('Create a KVS, write maximal numeric value - sync', async () => {
		let v = Number.MAX_VALUE
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(v)
		pot.log('The logging does not represent the IEEE 754 storage format')
		pot.setVerbosity(verb)
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k1, v)       ).toBe(null)
		expect( kvs.getSync(k1)          ).toStrictEqual(v) // softer than toBe
	});

	test('Create a KVS, write mininmal positive numeric value - sync', async () => {
		let v = Number.MIN_VALUE
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(v)
		pot.log('The logging does not represent the IEEE 754 storage format')
		pot.setVerbosity(verb)
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k1, v)       ).toBe(null)
		expect( kvs.getSync(k1)          ).toStrictEqual(v) // softer than toBe
	});

	test('Create a KVS, write positive infinity numeric value - sync', async () => {
		let v = Number.POSITIVE_INFINITY
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(v)
		pot.log('The logging does not represent the IEEE 754 storage format')
		pot.setVerbosity(verb)
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k1, v)       ).toBe(null)
		expect( kvs.getSync(k1)          ).toStrictEqual(v) // softer than toBe
	});

	test('Create a KVS, write negative infinity numeric value - sync', async () => {
		let v = Number.NEGATIVE_INFINITY
		let verb = pot.setVerbosity(pot.INFO | pot.NOCUT)
		pot.log(v)
		pot.log('The logging does not represent the IEEE 754 storage format')
		pot.setVerbosity(verb)
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k1, v)       ).toBe(null)
		expect( kvs.getSync(k1)          ).toStrictEqual(v) // softer than toBe
	});

	test('Create a KVS, writing a 10,000 character string value - sync', async () => {
		let v = "x".repeat(10000)
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k1, v)       ).toBe(null)
		expect( kvs.getSync(k1)          ).toStrictEqual(v) // softer than toBe
	});

	test('Create a KVS, writing a 10,000 byte value - sync', async () => {
		let v = new Uint8Array(10000).fill(255)
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k1, v)       ).toBe(null)
		expect( kvs.getSync(k1)          ).toStrictEqual(v) // softer than toBe
	});

	test('Create a KVS, immediately read from it - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.getSync(k1)          ).toBeUndefined()
	});

	test('Create a KVS, immediately delete inexistant value from it - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.deleteSync(k1)       ).toBe(null)
	});

	test('Create a KVS, write to it, delete twice - sync', async () => {
		expect( kvs = pot.newSync()      ).toBeDefined()
		expect( kvs.putSync(k1, v1)      ).toBe(null)
		expect( kvs.deleteSync(k1)       ).toBe(null)
		expect( kvs.deleteSync(k1)       ).toBe(null)
	});

	test('Create a KVS, saving it empty fails - sync', async () => {
		expect( kvs  = pot.newSync()     ).toBeDefined()
		expect( kvs.saveSync()           ).toBeInstanceOf(Error)
	});
});
