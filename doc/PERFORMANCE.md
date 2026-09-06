# The vendored sync XHR: what it costs, why the ~100KB ceiling existed, and what a responsible cap looks like now

This is a proposal for `doc/` (matching the manual's own prose style) plus a
plain summary of what changed and why. Everything below was measured, not
estimated — a local loopback server standing in for Bee, no real network
involved, but exercising the actual code path.

## What the vendored XHR does, precisely

`pot-node.js`'s `jsFetchSync` (what Go's WASM runtime calls for every
networked `put`/`get`/`delete`/`save` in node.js) can't use a *real*
synchronous HTTP call — Node doesn't have one — so it works around that by,
per request: writing the request body to a temp file, **spawning a whole
second node.js process** (`spawn(process.argv[0], ["-e", execString])`) that
performs the actual (async) HTTP request and writes the response to two more
temp files, and busy-waiting (`while(fs.existsSync(syncFile)) {}`) on the
parent's main thread until the child signals completion by deleting a marker
file. This is a deliberate, documented trade-off (see the manual's own
footnote 28) — it's the only mechanism the author found that reliably blocks
without either deadlocking Go's side or leaving async work stranded — and
that architecture isn't what this proposal changes.

**What *was* an accident of that architecture, not a deliberate choice:**
until this fix, the request body for a `Uint8Array` value was embedded
*directly in the spawned child's source code*, as a JSON array of decimal
byte values — `req.write(new Uint8Array([137,45,12,...]))` — which for N
bytes produces roughly 3–4×N characters of source text the child has to
parse before it can even start the request. Past about 100,000 bytes of
payload, the resulting `-e` argument exceeds the OS's command-line length
limit (`ARG_MAX`/`MAX_ARG_STRLEN`) and `spawn()` fails outright with
`E2BIG`. The vendored code's single catch-all around the whole mechanism
reports every failure with the same message — *"Unable to access the OS
temporary directory for read/write operations"* — regardless of the real
cause, so this looked like a filesystem problem rather than what it actually
was. `maxValueSize = 100000` in `potjs.go` is, as far as we can tell, this
crash's blast radius made into a "soft cap" — a safety net for a specific
failure mode, not a value chosen by weighing what a responsible ceiling
should be.

## The fix

Write the payload to its own temp file before spawning, and have the child
read that file instead of parsing it out of an embedded array literal. The
spawned source string is now a small, *constant size* regardless of payload
— no more command-line ceiling. Separately, replaced the busy-wait with
`Atomics.wait(sleepBuf, 0, 0, 2)` between polls: a true, synchronous
2ms sleep with no event loop involved (so it doesn't change the blocking
semantics Go's side needs), instead of spinning one CPU core at 100% for the
full duration of every request.

## What we measured (local loopback server, no real Bee node)

| payload | before: wall / CPU | after: wall / CPU |
|---|---|---|
| 1 KB | 227ms / 116ms | 109ms / 29ms |
| 10 KB | 135ms / 59ms | 78ms / 7ms |
| 50 KB | 147ms / 70ms | 87ms / 12ms |
| 100 KB | **spawn E2BIG** | 104ms / 20ms |
| 250 KB | **spawn E2BIG** | 149ms / 53ms |
| 500 KB | **spawn E2BIG** | 170ms / 87ms |
| 1 MB | **spawn E2BIG** | 404ms / 262ms |
| 5 MB | *(untested — already broken)* | 2,665ms / 2,414ms |
| 10 MB | *(untested)* | 3,978ms / 3,677ms |
| 50 MB | *(untested)* | 33,828ms / 32,731ms |

Below the old ceiling: roughly 1.7–2× faster wall time, 4–8× less CPU spent
per call (the busy-wait fix dominates here). At and above it: the old
mechanism doesn't degrade, it *fails outright*; the new one keeps working,
verified correct up to 50MB (checked via `Find()`/`Get()` matching what was
put, not just "didn't throw").

## So what's a responsible size cap now?

**Not a single number** — this is the point the question was really asking,
and the honest answer has to split into two, because `maxValueSize` is
currently one global compiled into `pot.wasm` and applied identically to
node and browser, despite those having nothing in common resource-wise.

**Node (server-side, tests, tooling — not a real end user's device):** the
E2BIG ceiling is gone; the fix is confirmed working to 50MB. The remaining
constraint is pure wall-clock latency, since every call blocks the whole
process: ~4 seconds at 10MB, ~34 seconds at 50MB. A default in the low
single-digit megabytes (we'd suggest **4–8 MB**) gives comfortable headroom
over any realistic application value while keeping a worst-case blocked call
under a second or two. Anything larger should be a deliberate opt-in via the
existing `pot.setValueSizeLimit()` — which already exists for exactly this,
it just needs a less accidental default to opt up from.

**Browser (an actual end user's device):** completely different mechanism
(native `fetch`, no spawning, no command-line limits) and a completely
different constraint — holding the value in WASM linear memory, on a device
you don't control and can't assume much about. This is where "different
browsers will run out of resources at different points" has to be taken
literally rather than folded into one number:

- **Modern desktop/laptop** (8GB+ RAM): tens of MB in a single value is
  comfortable.
- **Recent flagship phones** (iPhone 14+/high-end Android, 6–8GB RAM): low
  single-digit MB is safe; tens of MB risks the tab/app being killed under
  memory pressure, especially with other apps open.
- **Budget/older Android** (2–4GB RAM, still a large share of real-world
  traffic) **and older iPhones**: iOS Safari in particular has historically
  been aggressive about killing tabs that balloon memory, within a total
  per-tab budget that can be a few hundred MB *including everything else the
  page is doing* — a single value should stay well under 1MB if the app
  needs to reliably work here.
- **Old computers** (4GB total RAM, integrated graphics sharing system
  memory, background swapping): closer to the budget-mobile end of this
  than to the modern-desktop end, for the same underlying reason — much
  less headroom than the device you're probably developing on has.

There's no single "correct" default that serves all of these — an
application aimed at a general consumer audience should size its own values
(and set `pot.setValueSizeLimit()`) for the *weakest* device class it needs
to support, not the strongest one it happens to be tested on. This project's
own default should stay conservative for exactly that reason, even though
node.js itself no longer has a reason to be this conservative.

## Testing

`test/jest.performance.js`: values from 1KB to 2MB, spanning the old ~100KB
ceiling, all round-trip correctly over a real (loopback) HTTP connection;
the configured soft cap is still enforced above whatever it's set to. This
needed a genuinely separate server process rather than an in-process
`http.createServer` — the vendored sync XHR blocks its *own* event loop
while waiting for its spawned helper, so a same-process server would never
get a turn to accept the connection that helper makes; the two would
deadlock. Worth calling out on its own, since it isn't obvious and would
trip up anyone else testing this mechanism the same way.

One regression surfaced by running the full suite together rather than this
new file alone: the three temp filenames (`contentFile`, `syncFile`, and the
new `dataFile`) were keyed on `process.pid` alone, both before and after
this change. That's fine if at most one sync call is ever in flight per
process, but isn't guaranteed — `jest.async.js` exercises overlapping calls
from the same process, and intermittently (not every run) two calls
racing on the same filenames corrupted each other's payload. Fixed by
keying all three names on a per-*call* id (pid + timestamp + a random
suffix), not just per-process; confirmed with five consecutive full-suite
runs after the fix, versus a reproducible failure before it.
