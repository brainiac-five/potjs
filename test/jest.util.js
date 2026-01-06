/*
**    SWARM POT JS Test Suite 4 / Node Jest, Utilities
*/

const config = require('./jest.json');
const verbosity = config?.verbose ? 3 : 1

potjs_verbosity = verbosity
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

describe('Utility', () => {

	test('String sizes', async () => {
		expect( pot.byteSize("abc") ).toBe(3)
		expect( pot.byteSize("€") ).toBe(3)
		expect( pot.byteSize("") ).toBe(0)
	});

	test('High string sizes', async () => {
		s = "X".repeat(100000)
		expect( pot.byteSize(s) ).toBe(100000)
		expect( pot.byteSize("€"+s) ).toBe(100003)
		s = "X".repeat(10000000)
		expect( pot.byteSize(s) ).toBe(10000000)
		expect( pot.byteSize("€"+s) ).toBe(10000003)
		s = "X".repeat(100000000)
		expect( pot.byteSize(s) ).toBe(100000000)
		expect( pot.byteSize("€"+s) ).toBe(100000003)
	});

	test('Invalid string\'s sizes', async () => {
		expect( pot.byteSize().message ).toBe("missing string parameter.")
		expect( pot.byteSize(0).message ).toBe("parameter type error. String expected.")
		expect( pot.byteSize(true).message ).toBe("parameter type error. String expected.")
	});

	test('String sizes', async () => {
		expect( pot.truncString("abc", 10000000) ).toBe("abc")
		expect( pot.truncString("abc", 4) ).toBe("abc")
		expect( pot.truncString("abc", 3) ).toBe("abc")
		expect( pot.truncString("abc", 2) ).toBe("ab")
		expect( pot.truncString("abc", 1) ).toBe("a")
		expect( pot.truncString("abc", 0).message ).toBe("no valid utf-8 slice found within given length")

		expect( pot.truncString("€abc", 10000000) ).toBe("€abc")
		expect( pot.truncString("€abc", 7) ).toBe("€abc")
		expect( pot.truncString("€abc", 6) ).toBe("€abc")
		expect( pot.truncString("€abc", 5) ).toBe("€ab")
		expect( pot.truncString("€abc", 4) ).toBe("€a")
		expect( pot.truncString("€abc", 3) ).toBe("€")
		expect( pot.truncString("€abc", 2).message ).toBe("no valid utf-8 slice found within given length")
		expect( pot.truncString("€abc", 1).message ).toBe("no valid utf-8 slice found within given length")
		expect( pot.truncString("€abc", 0).message ).toBe("no valid utf-8 slice found within given length")

		expect( pot.truncString("abc€", 10000000) ).toBe("abc€")
		expect( pot.truncString("abc€", 7) ).toBe("abc€")
		expect( pot.truncString("abc€", 6) ).toBe("abc€")
		expect( pot.truncString("abc€", 5) ).toBe("abc")
		expect( pot.truncString("abc€", 4) ).toBe("abc")
		expect( pot.truncString("abc€", 3) ).toBe("abc")
		expect( pot.truncString("abc€", 2) ).toBe("ab")
		expect( pot.truncString("abc€", 1) ).toBe("a")
		expect( pot.truncString("abc€", 0).message ).toBe("no valid utf-8 slice found within given length")

		s = "X".repeat(100000)
		expect( pot.truncString(s, 100002) ).toBe(s)
		expect( pot.truncString(s, 100001) ).toBe(s)
		expect( pot.truncString(s, 100000) ).toBe(s)
		expect( pot.truncString(s,  99999) ).toBe(s.slice(0,-1))
		expect( pot.truncString(s,  99998) ).toBe(s.slice(0,-2))

		expect( pot.truncString(s+"€", 100003) ).toBe(s+"€")
		expect( pot.truncString(s+"€", 100002) ).toBe(s)
		expect( pot.truncString(s+"€", 100001) ).toBe(s)
		expect( pot.truncString(s+"€", 100000) ).toBe(s)
		expect( pot.truncString(s+"€",  99999) ).toBe(s.slice(0,-1))
		expect( pot.truncString(s+"€",  99998) ).toBe(s.slice(0,-2))

		expect( pot.truncString(s+"€€", 10000000) ).toBe(s+"€€")
		expect( pot.truncString(s+"€€", 100007) ).toBe(s+"€€")
		expect( pot.truncString(s+"€€", 100006) ).toBe(s+"€€")
		expect( pot.truncString(s+"€€", 100005) ).toBe(s+"€")
		expect( pot.truncString(s+"€€", 100004) ).toBe(s+"€")
		expect( pot.truncString(s+"€€", 100003) ).toBe(s+"€")
		expect( pot.truncString(s+"€€", 100002) ).toBe(s)
		expect( pot.truncString(s+"€€", 100001) ).toBe(s)
		expect( pot.truncString(s+"€€", 100000) ).toBe(s)
		expect( pot.truncString(s+"€€",  99999) ).toBe(s.slice(0,-1))
		expect( pot.truncString(s+"€€",  99998) ).toBe(s.slice(0,-2))

	});
});
