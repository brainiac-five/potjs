/*
**    SWARM POT JS Test Suite 6 / Node Jest, Large-value performance (see doc/PERFORMANCE.md)
**
** Unlike jest.async/sync/util, this suite talks over a real (loopback) HTTP
** connection, because the bug it guards against only exists on that path:
** pot-node.js's vendored synchronous XHR spawns a helper node process per
** request and used to embed the request body directly in that child's
** source code. Past ~100KB that made the `-e` argument exceed the OS's
** command-line length limit and spawn() failed with E2BIG - silently, from
** the caller's point of view, since the vendored code's single catch-all
** reported every failure as "Unable to access the OS temporary directory"
** regardless of the real cause.
**
** The mock server below runs as a genuinely separate forked process, not an
** in-process http.createServer - see the comment above its startup code for
** why that specifically matters here (it isn't just a style choice).
*/

const config = require('./jest.json');
const verbosity = config?.verbose ? 3 : 1

potVerbosity = verbosity
require("../lib/pot-node.js")

const { fork } = require('child_process')

const jestConsole = console
beforeAll(() => { global.console = require('console') ; if(verbosity < 2) console.log = () => {} })
afterAll(() => { global.console = jestConsole })

beforeEach(() => { console.log(mid + expect.getState().currentTestName + off) })
afterEach(() => { console.log() })
afterAll(() => { return new Promise(r => setTimeout(r, 500)) })

const hi   = "\x1b[97m"
const mid  = "\x1b[37m"
const low  = "\x1b[90m"
const erm  = "\x1b[91m"
const warn = "\x1b[38;5;214m"
const ok   = "\x1b[36m"
const off  = "\x1b[0m"

beforeAll(() => { return pot.ready() })

// The mock Bee stand-in MUST be a genuinely separate OS process, not an
// in-process http.createServer: pot-node.js's vendored sync XHR blocks its
// *own* event loop while it waits (Atomics.wait / the busy-wait it replaces)
// for a spawned helper process to finish the real request. A server on the
// same event loop would never get a turn to accept that connection - the
// two would deadlock. A `fork()`ed child has its own event loop and isn't
// affected by the parent blocking.
const PORT = 19347
let serverProc, baseUrl
beforeAll(() => {
	return new Promise((resolve, reject) => {
		serverProc = fork(require('path').join(__dirname, 'helpers', 'mock-bee-server.js'), [String(PORT)], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] })
		serverProc.once('message', (m) => { if (m === 'ready') resolve() })
		serverProc.once('error', reject)
	})
})
beforeAll(() => { baseUrl = `http://127.0.0.1:${PORT}` })
afterAll(() => { serverProc.kill() })

const BATCH = 'f'.repeat(64)

describe('Large values over the vendored sync XHR (network path, not in-memory)', () => {

	test('a value well past the old ~100KB ceiling round-trips correctly', async () => {
		const prevLimit = pot.getValueSizeLimit()
		pot.setValueSizeLimit(20_000_000)
		try {
			const kvs = new pot.Kvs(baseUrl, BATCH)
			const big = Buffer.alloc(2_000_000)
			for (let i = 0; i < big.length; i++) big[i] = i % 256
			await expect(kvs.put('big', big)).resolves.toBeNull()
		} finally {
			pot.setValueSizeLimit(prevLimit)
		}
	})

	test('several sizes spanning the old ceiling all complete without the old E2BIG failure', async () => {
		const prevLimit = pot.getValueSizeLimit()
		pot.setValueSizeLimit(20_000_000)
		try {
			const kvs = new pot.Kvs(baseUrl, BATCH)
			for (const n of [1_000, 50_000, 100_000, 250_000, 1_000_000]) {
				await expect(kvs.put('k' + n, Buffer.alloc(n, 9))).resolves.toBeNull()
			}
		} finally {
			pot.setValueSizeLimit(prevLimit)
		}
	})

	test('the configured soft cap is still enforced above the new default', async () => {
		const prevLimit = pot.getValueSizeLimit()
		pot.setValueSizeLimit(1_000)
		try {
			const kvs = new pot.Kvs(baseUrl, BATCH)
			await expect(kvs.put('over', Buffer.alloc(1_001))).rejects.toThrow(/too large/)
		} finally {
			pot.setValueSizeLimit(prevLimit)
		}
	})
})
