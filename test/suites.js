/*
**  SWARM POT JS Test Suite 1 / Deep Tests
**
**  This suite is called in twelve different test modes, different ways of
**  mocking real operation, as well as from the browser and from node
**  respectively:
**
**  browser / node | in-memory / simulated / network | standard / stress.
**
**  browser    web        Javascript running in the browser
**  node       node       Javascript running in the terminal using node.js
**  ----------------------------------------------------------------------
**  in-memory  inmem      non-persistent, in-memory storage
**  simulated  sim        simulated storage for testing exceptions
**  network    locnet     local Swarm network storage
**  ----------------------------------------------------------------------
**  standard   test       172 test suites of various flavors
**             quick      like *_locnet_test but re-using the batch id
**  stress     stress     4 longer-running suites; mass & concurrent access
**
**  The following are the make rules for deep tests:
**
**  nodetest              explain test modes and run node_inmem_test
**  webtest               explain test modes and run web_inmem_test
**  web_inmem_test        test api interaction with go pot in-memory persisting, web
**  web_inmem_stress      stress test with go pot in-memory persisting, web
**  web_sim_test          extended exceptions tests w/out go pot connection, web
**  web_locnet_test       standard tests with a locally installed Swarm network, web
**  web_locnet_quick      like web_locnet_test but re-using the last batch id, web
**  web_locnet_stress     stress test with a locally installed Swarm network, web
**  node_inmem_test       test api interaction with go pot in-memory persisting, node
**  node_inmem_stress     stress test with go pot in-memory persisting, node
**  node_sim_test         extended exceptions tests w/out go pot connection, node
**  node_locnet_test      test with a locally installed Swarm network, node
**  node_locnet_quick     like node_locnet_test but re-using the last batch id, node
**  node_locnet_stress    stress test with a locally installed Swarm network, node
**
**  All node_* tests are run on push by github CI workloads, except *_quick.
**  CI runs all those tests for ubuntu-latest, and all non-locnet for MacOS.
**
**  Some tests are skipped in some modes, e.g., special failure cases that
**  are relevant only in the context of the mode that was created to test
**  them.
**
**  This suite is called via test.html for browsers tests, and from node.js for
**  node tests. It comprises standard functionality tests covering all
**  POT JS API functions. It uses some functions that were added to the API
**  for testing.
**
**  All tests are self-contained and consist only of the block of code that
**  is headed by a T.start() call. But some tests are asynchronous and can
**  overlap with succeeding tests when they are failing unexpectedly or take
**  too long.
**
**  Note that suite and case numbers are dynamically assigned while running the
**  tests, they are not be found in the source; use the line number that are
**  shown in the right margin.
**
**  Tests log approximate response times. They are crudely taken as diff from
**  the previous case head or last assertion.
*/

const t0 = null
const massmax = 20 // a lower iteration count for concurrent tests
const massmax2 = 100 // a higher iteration count for concurrent tests

var map
var map1
var map2
var map3
var map4
var map5

fmt = (n) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")

potlogmargin = "           "

// ·············································································
// Browser-only, global catch of uncaught promise rejections.
// ·············································································


let noUncaughtRejectionExpected = "[ not expecting unhandled rejections ]"
let expectedUncaughtRejection = noUncaughtRejectionExpected
if(typeof window === 'undefined') {
	process.on("unhandledRejection", (err) => {
		T.log("◊◊◊ unhandled rejection :" + err.message)
		T.attestExpectedError(t0, T, err, expectedUncaughtRejection ? expectedUncaughtRejection : noUncaughtRejectionExpected )
	})
}


// ·············································································
// Start of Tests
// ·············································································

function TestPotKvsSync(T, bee_url, batch_id) {

	T.head("Simple gets and puts of KVS, synchronous", bee_url)

	T.log("--- b o o l e a n")

	key1 = "K1"
	val1 = false

	T.start("• put " + key1 + ": " + val1)

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	T.assertNoError(t0, T, err)

	T.log("• getBooleanSync " + key1)
	val = map.getBooleanSync(key1)
	T.assertEqual(t0, T, val, val1)

	val1 = true

	T.start("• put " + key1 + ": " + val1)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	T.assertNoError(t0, T, err)

	T.log("• getBooleanSync " + key1)
	val = map.getBooleanSync(key1)
	T.assertEqual(t0, T, val, val1)

	T.log("• delete " + key1)
	err = map.deleteSync(key1)
	T.assertNoError(t0, T, err)

	T.log("• getBooleanSync " + key1)
	val = map.getBooleanSync(key1)
	T.assertEqual(t0, T, val, undefined)


	T.log("--- s t r i n g")

	key1 = "K1"
	val1 = "V1"

	T.start("• put " + key1 + ": " + val1)

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	T.assertNoError(t0, T, err)

	T.log("• getStringSync " + key1)
	val = map.getStringSync(key1)
	T.assertEqual(t0, T, val, val1)


	T.log("--- n u m b e r")
	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	key1 = "K1"
	val1 = 123

	T.start("• put " + key1 + ": " + val1)

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	T.assertNoError(t0, T, err)

	T.log("• getNumberSync " + key1)
	val = map.getNumberSync(key1)
	T.assertEqual(t0, T, val, val1)


	val1 = 123.456

	T.start("• put " + key1 + ": " + val1)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	T.assertNoError(t0, T, err)

	T.log("• getNumberSync " + key1)
	val = map.getNumberSync(key1)
	T.assertEqual(t0, T, val, val1)


	T.log("--- r a w")

	key2 = pot.randKey()
	val2 = pot.randValue()

	T.start("• put raw sync")

	T.log("• put ")
	err = map.putRawSync(key2, val2)
	T.assertNoError(t0, T, err)

	T.log("• get ")
	val = map.getRawSync(key2)
	T.assertEqual(t0, T, T.hex(val), T.hex(val2)) // No direct equality check for Uint8Arrays


	T.log("--- s a v e")

	T.start("• save")

	T.log("• save")
	ref = map.saveSync()
	T.assertNotAnError(t0, T, ref)
}


async function TestPotKvsAsync(T, bee_url, batch_id) {

	T.head("Simple gets and puts, typed and raw, async")

	T.log("--- b o o l e a n")

	key1 = "K1"
	val1 = false

	T.start("• put " + key1 + ": " + val1)

	try {
		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		T.assertEqual(t0, T, val, val1)

		T.log("• delete " + key1)
		err = await map.delete(key1)
		T.assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		T.assertEqual(t0, T, val, undefined)

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.start("• put raw " + key1 + ": " + val1)

	try {
		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• putRaw " + key1 + ": " + val1)
		err = await map.putRaw(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• getBoolean " + key1)
		val = await map.getBoolean(key1)
		T.assertEqual(t0, T, val, val1)

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	val1 = true

	T.start("• put " + key1 + ": " + val1)

	try {
		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		T.assertEqual(t0, T, val, val1)


	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.start("• put raw " + key1 + ": " + val1)

	try {
		T.log("• putRaw " + key1 + ": " + val1)
		err = await map.putRaw(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• getBoolean " + key1)
		val = await map.getBoolean(key1)
		T.assertEqual(t0, T, val, val1)


	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("--- s t r i n g")

	key1 = "K1"
	val1 = "V1"

	T.start("• put " + key1 + ": " + val1)

	try {
		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		T.assertEqual(t0, T, val, val1)

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.start("• put raw " + key1 + ": " + val1)

	try {
		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• putRaw " + key1 + ": " + val1)
		err = await map.putRaw(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• getString " + key1)
		val = await map.getString(key1)
		T.assertEqual(t0, T, val, val1)

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}


	T.log("--- n u m b e r")
	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	key1 = "K1"
	val1 = 123

	T.start("• put " + key1 + ": " + val1)

	try {
		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		T.assertEqual(t0, T, val, val1)

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.start("• put raw " + key1 + ": " + val1)

	try {
		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• put raw " + key1 + ": " + val1)
		err = await map.putRaw(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• getNumber " + key1)
		val = await map.getNumber(key1)
		T.assertEqual(t0, T, val, val1)

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	val1 = 123.456

	T.start("• put " + key1 + ": " + val1)

	try {
		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		T.assertEqual(t0, T, val, val1)

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.start("• put raw " + key1 + ": " + val1)

	try {
		T.log("• putRaw " + key1 + ": " + val1)
		err = await map.putRaw(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• getNumber " + key1)
		val = await map.getNumber(key1)
		T.assertEqual(t0, T, val, val1)

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}


	T.log("--- r a w")

	key2 = pot.randKey()
	val2 = pot.randValue()

	T.start("• put raw")

	try {
		T.log("• put raw")
		err = await map.putRaw(key2, val2)
		T.assertNoError(t0, T, err)

		T.log("• get raw")
		val = await map.getRaw(key2)
		T.assertEqual(t0, T, T.hex(val), T.hex(val2)) // No direct equality check for Uint8Arrays

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("--- s a v e")

	T.start("• save")

	try {
		T.log("• save")
		ref = await map.save()
		T.assertNotAnError(t0, T, ref)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
}


function TestPotKvs_EdgeValuesSync(T, bee_url, batch_id) {


	T.head("Edge cases, untyped, synchronous calls")


	T.log("--- b o o l e a n")

	key1 = "K1"
	val1 = new Uint8Array([2])

	T.start("• put " + key1 + ": " + val1)

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	T.assertNoError(t0, T, err)

	T.log("• getBooleanSync " + key1)
	val = map.getBooleanSync(key1)
	T.assertEqual(t0, T, val, true)


	val1 = new Uint8Array([0,1])

	T.start("• put " + key1 + ": " + val1)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	T.assertNoError(t0, T, err)

	T.log("• getBooleanSync " + key1)
	val = map.getBooleanSync(key1)
	T.assertEqual(t0, T, val, false)


	T.log("--- s t r i n g")

	key1 = "K1"
	val1 = ""

	T.start("• put " + key1 + ": " + val1)

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	T.assertNoError(t0, T, err)

	T.log("• getStringSync " + key1)
	val = map.getStringSync(key1)
	T.assertEqual(t0, T, val, val1)


	T.log("--- n u m b e r")
	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	key1 = "K1"
	val1 = 0

	T.start("• put " + key1 + ": " + val1)

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	T.assertNoError(t0, T, err)

	T.log("• getNumberSync " + key1)
	val = map.getNumberSync(key1)
	T.assertEqual(t0, T, val, val1)


	val1 = 10/3

	T.start("• put " + key1 + ": " + val1)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	T.assertNoError(t0, T, err)

	T.log("• getNumberSync " + key1)
	val = map.getNumberSync(key1)
	T.assertEqual(t0, T, val, val1)


	T.log("--- r a w")

	key2 = new Uint8Array([0])
	val2 = new Uint8Array([])

	T.start("• put one-zero key " + T.hex(key2) + ": " + T.hex(val2))

	T.log("• put " + T.hex(key2) + ": " + T.hex(val2))
	err = map.putRawSync(key2, val2)
	T.assertNoError(t0, T, err)

	T.log("• get " + T.hex(key2))
	val = map.getRawSync(key2)
	T.assertEqual(t0, T, T.hex(val), T.hex(val2)) // no direct equality check for uint8arrays


	key2 = new Uint8Array([0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])
	val2 = new Uint8Array([])

	T.start("• put all-zero key")

	T.log("• put " + T.hex(key2) + ": " + T.hex(val2))
	err = map.putRawSync(key2, val2)
	T.assertNoError(t0, T, err)

	T.log("• get " + T.hex(key2))
	val = map.getRawSync(key2)
	T.assertEqual(t0, T, T.hex(val), T.hex(val2)) // no direct equality check for uint8arrays


	key2 = pot.randKey()
	val2 = new Uint8Array([])

	T.start("• put random key and empty value")

	T.log("• put " + T.hex(key2) + ": " + T.hex(val2))
	err = map.putRawSync(key2, val2)
	T.assertNoError(t0, T, err)

	T.log("• get " + T.hex(key2))
	val = map.getRawSync(key2)
	T.assertEqual(t0, T, T.hex(val), T.hex(val2)) // no direct equality check for uint8arrays

	key2 = pot.randKey()
	val2 = new Uint8Array([0])

	T.start("• put random key and binary zero")

	T.log("• put " + T.hex(key2) + ": " + T.hex(val2))
	err = map.putRawSync(key2, val2)
	T.assertNoError(t0, T, err)

	T.log("• get " + T.hex(key2))
	val = map.getRawSync(key2)
	T.assertEqual(t0, T, T.hex(val), T.hex(val2)) // No direct equality check for Uint8Arrays

	key2 = pot.randKey()
	val2 = new Uint8Array([1])

	T.start("• put random key and binary 1")

	T.log("• put " + T.hex(key2) + ": " + T.hex(val2))
	err = map.putRawSync(key2, val2)
	T.assertNoError(t0, T, err)

	T.log("• get " + T.hex(key2))
	val = map.getRawSync(key2)
	T.assertEqual(t0, T, T.hex(val), T.hex(val2)) // No direct equality check for Uint8Arrays

	key2 = pot.randKey()
	val2 = new Uint8Array([255,0])

	T.start("• put random key and binary ff00")

	T.log("• put " + T.hex(key2) + ": " + T.hex(val2))
	err = map.putRawSync(key2, val2)
	T.assertNoError(t0, T, err)

	T.log("• get " + T.hex(key2))
	val = map.getRawSync(key2)
	T.assertEqual(t0, T, T.hex(val), T.hex(val2)) // No direct equality check for Uint8Arrays
}


async function TestPotKvs_EdgeValuesAsync(T, bee_url, batch_id) {

	T.head("Edge cases for storing one item, typed, async")

	T.log("These tests do not include the untyped functions that exist only in synchronous form.")


	T.log("--- b o o l e a n")

	key1 = "K1"
	val1 = new Uint8Array([1,1]) // different from sync test

	try {
		T.start("• put " + key1 + ": " + val1)

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• putRaw " + key1 + ": " + val1)

		err = await map.putRaw(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		T.assertEqual(t0, T, val, true)

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	key1 = "K1"
	val1 = 1

	try {
		T.start("• put " + key1 + ": " + val1)

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• put " + key1 + ": " + val1)

		err = await map.put(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		T.assertEqual(t0, T, val, 1)

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	try {
		val1 = new Uint8Array([1,0]) // different from sync test

		T.start("• put " + key1 + ": " + val1)

		T.log("• putRaw " + key1 + ": " + val1)
		err = await map.putRaw(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		T.assertEqual(t0, T, val, false)

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	try {
		val1 = new Uint8Array([1,0,1]) // different from sync test

		T.start("• put " + key1 + ": " + val1)

		T.log("• putRaw " + key1 + ": " + val1)
		err = await map.putRaw(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		T.assertEqual(t0, T, val, false)

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	try {
		val1 = 0

		T.start("• put " + key1 + ": " + val1)

		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1) // will put number
		T.assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		T.assertEqual(t0, T, val, 0)

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}


	T.log("--- s t r i n g")

	try {
		key1 = "K1"
		val1 = ""

		T.start("• put " + key1 + ": " + val1)

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		T.assertEqual(t0, T, val, val1)

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("--- n u m b e r")

	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	try {
		key1 = "K1"
		val1 = 0

		T.start("• put " + key1 + ": " + val1)

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		T.assertEqual(t0, T, val, val1)

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	try {
		val1 = 10/3

		T.start("• put " + key1 + ": " + val1)

		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = await map.get(key1)
		T.assertEqual(t0, T, val, val1)

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}


	T.log("--- r a w")

	try {
		key2 = pot.randKey()
		val2 = new Uint8Array([])

		T.start("• put random key and empty byte array")

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• putRaw " + T.hex(key2) + ":")
		err = await map.putRaw(key2, val2)
		T.assertNoError(t0, T, err)

		T.log("• getRaw " + T.hex(key2))
		val = await map.getRaw(key2)
		T.assertEqual(t0, T, T.hex(val), T.hex(val2)) // No direct equality check for Uint8Arrays

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	try {
		key2 = pot.randKey()
		val2 = new Uint8Array([0])

		T.start("• put random key and " + T.hex(val2))

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• putRaw " + T.hex(key2) + ": " + T.hex(val2))
		err = await map.putRaw(key2, val2)
		T.assertNoError(t0, T, err)

		T.log("• getRaw " + T.hex(key2))
		val = await map.getRaw(key2)
		T.assertEqual(t0, T, T.hex(val), T.hex(val2)) // No direct equality check for Uint8Arrays


	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	try {
		key2 = pot.randKey()
		val2 = new Uint8Array([1])

		T.start("• put random key and " + T.hex(val2))

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• putRaw " + T.hex(key2) + ": " + T.hex(val2))
		err = await map.putRaw(key2, val2)
		T.assertNoError(t0, T, err)

		T.log("• getRaw " + T.hex(key2))
		val = await map.getRaw(key2)
		T.assertEqual(t0, T, T.hex(val), T.hex(val2)) // No direct equality check for Uint8Arrays

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	try {
		key2 = pot.randKey()
		val2 = new Uint8Array([255,0])

		T.start("• put random key and " + T.hex(val2))

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• putRaw " + T.hex(key2) + ": " + T.hex(val2))
		err = await map.putRaw(key2, val2)
		T.assertNoError(t0, T, err)

		T.log("• getRaw " + T.hex(key2))
		val = await map.getRaw(key2)
		T.assertEqual(t0, T, T.hex(val), T.hex(val2)) // No direct equality check for Uint8Arrays

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.start("• put random key with size 3000 value")

	try {
		key2 = pot.randKey()
		val2 = new Uint8Array(3000)
		val2[0] = 1
		val2[2999] = 1

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• putRaw ")
		err = await map.putRaw(key2, val2)
		T.assertNoError(t0, T, err)

		T.log("• getRaw ")
		val = await map.getRaw(key2)
		T.assertEqual(t0, T, T.hex(val), T.hex(val2)) // No direct equality check for Uint8Arrays

		T.log("• save")
		ref = await map.save()
		T.assertNotAnError(t0, T, ref)

		T.log("• retrieve map " + T.hex(ref))
		map3 = await pot.load(ref, bee_url, batch_id)
		T.assertNotAnError(t0, T, map3)
		T.assertNotEqual(t0, T, map3, null)

		T.log("• getRaw from retrieved map " + T.hex(key2))
		val2 = await map3.getRaw(key2)
		T.assertEqual(t0, T, T.hex(val), T.hex(val2)) // No direct equality check for Uint8Arrays

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.start("• put random key with 4096 byte size value")

	try {
		key2 = pot.randKey()
		val2 = new Uint8Array(4096)
		val2[0] = 1
		val2[4095] = 1

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• putRaw ")
		err = await map.putRaw(key2, val2)
		T.assertNoError(t0, T, err)

		T.log("• getRaw " + T.hex(key2))
		val = await map.getRaw(key2)
		T.assertEqual(t0, T, T.hex(val), T.hex(val2)) // No direct equality check for Uint8Arrays

		T.log("• save")
		ref = await map.save()
		T.assertNotAnError(t0, T, ref)

		T.log("• retrieve map " + T.hex(ref))
		map3 = await pot.load(ref, bee_url, batch_id)
		T.assertNotAnError(t0, T, map3)
		T.assertNotEqual(t0, T, map3, null)

		T.log("• getRaw from retrieved map " + T.hex(key2))
		val3 = await map3.getRaw(key2)
		T.assertEqual(t0, T, T.hex(val3), T.hex(val2)) // No direct equality check for Uint8Arrays

	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}


	T.log("--- s a v e")

	T.start("• save")

	try {
		T.log("• save")
		ref = await map.save()
		T.assertNotAnError(t0, T, ref)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
}


function TestPotKvs_TypeEncoding(T, bee_url, batch_id) {

	T.head("type-enccoding")


	T.log("--- b o o l e a n")

	v = true
	T.start("• testing " + v)
	e = pot.typeEncodedBytes(v)
	T.log("encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = false
	T.start("• testing " + v)
	e = pot.typeEncodedBytes(v)
	T.log("encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)


	T.log("--- n u m b e r")
	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	v = 0
	T.start("• testing " + v)
	e = pot.typeEncodedBytes(v)
	T.log("IEEE 754 encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = 1
	T.start("• testing " + v)
	e = pot.typeEncodedBytes(v)
	T.log("IEEE 754 encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = 100000000000000
	T.start("• testing " + v)
	e = pot.typeEncodedBytes(v)
	T.log("IEEE 754 encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = 1e20
	T.start("• testing " + v)
	e = pot.typeEncodedBytes(v)
	T.log("IEEE 754 encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = 0.1
	T.start("• testing " + v)
	e = pot.typeEncodedBytes(v)
	T.log("IEEE 754 encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = 1/3
	T.start("• testing " + v)
	e = pot.typeEncodedBytes(v)
	T.log("IEEE 754 encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = 10/3
	T.start("• testing " + v)
	e = pot.typeEncodedBytes(v)
	T.log("IEEE 754 encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = Math.PI
	T.start("• testing " + v)
	e = pot.typeEncodedBytes(v)
	T.log("IEEE 754 encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = Math.PI^2
	T.start("• testing " + v)
	e = pot.typeEncodedBytes(v)
	T.log("IEEE 754 encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = 10000n * 10n^18n
	T.start("• testing bigint " + v)
	e = pot.typeEncodedBytes(v)
	T.assertEqual(t0, T, typeof e, typeof new Uint8Array())


	T.log("--- s t r i n g")

	v = "A"
	T.start("• testing " + v)
	e = pot.typeEncodedBytes(v)
	T.log("encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = "The fox and such hunting that hen and jumping fences? "
	T.start("• testing the fox ...")
	T.log("• testing " + v)
	e = pot.typeEncodedBytes(v)
	T.log("encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = " "
	T.start("• testing space")
	e = pot.typeEncodedBytes(v)
	T.log("encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = "  "
	T.start("• testing spaces")
	e = pot.typeEncodedBytes(v)
	T.log("encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = "0"
	T.start("• testing " + v)
	e = pot.typeEncodedBytes(v)
	T.log("encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = "1.1.1"
	T.start("• testing " + v)
	e = pot.typeEncodedBytes(v)
	T.log("encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = "0\n\t\b\0"
	T.start("• testing zero digit and special chars")
	e = pot.typeEncodedBytes(v)
	T.log("encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = "\n"
	T.start("• testing line break" + v)
	e = pot.typeEncodedBytes(v)
	T.log("encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)

	v = "\n\t\b\0"
	T.start("• testing special chars")
	e = pot.typeEncodedBytes(v)
	T.log("encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, r, v)


	T.log("--- r a w")

	T.start("• testing random raw bytes")
	v = pot.randValue()
	e = pot.typeEncodedBytes(v)
	T.log("encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, T.hexa(r), T.hexa(v))

	T.start("• testing empty array")
	v = new Uint8Array()
	e = pot.typeEncodedBytes(v)
	T.log("encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, T.hexa(r), T.hexa(v))

	T.start("• testing array of sole 0")
	v = new Uint8Array([0])
	e = pot.typeEncodedBytes(v)
	T.log("encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, T.hexa(r), T.hexa(v))

	T.start("• testing array starting on 0")
	v = new Uint8Array([0,1,2,3])
	e = pot.typeEncodedBytes(v)
	T.log("encoded bytes: " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	T.assertEqual(t0, T, T.hexa(r), T.hexa(v))


	T.log("--- w r o n g  t y p e")

	T.start("• testing wrong type code")
	v = pot.randValue()
	v[0] = 10 // not a type code
	e = v
	T.log("• testing wrongly marked bytes")
	T.log(T.hexa(e))
	r = pot.typeDecodedValue(e)
	if(r instanceof Error) T.attestExpectedError(t0, T, r.message)
	else T.attestMissingError(t, T)

	T.start("• testing byte sequence too short for a number")
	e = new Uint8Array([2,1,0]) // 2 = number, which expects 9 bytes total
	T.log("• testing these too short bytes (for a number): " + T.hexa(e))
	r = pot.typeDecodedValue(e)
	if(r instanceof Error) T.attestExpectedError(t0, T, r.message)
	else T.attestMissingError(t, T)
}


function TestPotKvs_TypedAccessSync(T, bee_url, batch_id) {

	T.head("typed access")

	k = 'K1'

	T.log("--- b o o l e a n")

	v = true
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)

	v = false
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !pot)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)


	T.log("--- n u m b e r")
	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	v = 0
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)

	v = 1
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)

	v = 100000000000000

	v = 1e20
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)

	v = 0.1
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)

	v = 1/3
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)

	v = 10/3
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)

	v = Math.PI
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)

	v = Math.PI^2
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)

	v = 10000n * 10n^18n
	T.start("• put " + k + ": " + v + " as bigint")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertError(t0, T, err) // can't write bigint
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, undefined) // because not written


	T.log("--- s t r i n g")

	v = "A"
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)

	v = "The fox and such hunting that hen and jumping fences? "
	T.start("• put " + k + ": The fox ...")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)

	v = " "
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)

	v = "  "
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)

	v = "0"
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)

	v = "1.1.1"
	T.start("• put " + k + ": " + v)
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)

	v = "0\n\t\b\0"
	T.start("• put " + k + ": 0\\n\\t\\b\\0")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)

	v = "\n"
	T.start("• put " + k + ": \\n")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)

	v = "\n\t\b\0"
	T.start("• put " + k + ": \\n\\t\\b\\0")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	T.assertEqual(t0, T, r, v)


	T.log("--- r a w")

	T.start("• testing random raw bytes")
	v = pot.randValue()
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putRawSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getRawSync(k)
	T.assertEqual(t0, T, T.hexa(r), T.hexa(v))

	T.start("• testing empty array")
	v = new Uint8Array()
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putRawSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getRawSync(k)
	T.assertEqual(t0, T, T.hexa(r), T.hexa(v))

	T.start("• testing array of sole 0")
	v = new Uint8Array([0])
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putRawSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getRawSync(k)
	T.assertEqual(t0, T, T.hexa(r), T.hexa(v))

	T.start("• testing array starting on 0")
	v = new Uint8Array([0,1,2,3])
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putRawSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getRawSync(k)
	T.assertEqual(t0, T, T.hexa(r), T.hexa(v))


	T.log("--- w r o n g  t y p e")

	T.start("• testing wrong type code")
	v = pot.randValue()
	v[0] = 10 // not a type code
	T.log("• testing these wrongly marked bytes: ")
	T.log(T.hexa(v))
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putRawSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	if(r instanceof Error) T.attestExpectedError(t0, T, r.message)
	else T.attestMissingError(t, T)

	T.start("• testing byte sequence too short for a number")
	v = new Uint8Array([2,1,0]) // 2 = number, which expects 9 bytes total
	T.log("• testing these too short bytes (for a number): " + T.hexa(v))
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	err = map.putRawSync(k, v)
	T.assertNoError(t0, T, err)
	T.log("• get " + k)
	r = map.getSync(k)
	if(r instanceof Error) T.attestExpectedError(t0, T, r.message)
	else T.attestMissingError(t, T)
}


async function TestPotKvs_TypedAccessAsync(T, bee_url, batch_id) {

	T.head("typed access by promise")

	k = 'K1'

	T.log("--- b o o l e a n")

	v = true
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	v = false
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}


	T.log("--- n u m b e r")
	T.log("Note that Javascript has no native integer type but uses IEEE 753 float for all numbers.")

	v = 0
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	v = 1
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}


	v = 100000000000000
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	v = 1e20
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	v = 0.1
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	v = 1/3
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	v = 10/3
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	v = Math.PI
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	v = Math.PI^2
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}


	T.log("--- s t r i n g")

	v = "A"
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	v = "The fox and such hunting that hen and jumping fences? "
	T.start("• put " + k + ": The fox ..., by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	v = " "
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	v = "  "
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	v = "0"
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	v = "1.1.1"
	T.start("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	v = "0\n\t\b\0"
	T.start("• put " + k + ": 0\\n\\t\\b\\0 by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	v = "\n"
	T.start("• put " + k + ": \\n by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	v = "\n\t\b\0"
	T.start("• put " + k + ": \\n\\t\\b\\0 by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, r, v)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}


	T.log("--- r a w")

	T.start("• testing random raw bytes" + " by promise")
	v = pot.randValue()
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, T.hexa(r), T.hexa(v)) // no direct comparison between Uint8Arrays
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	T.start("• testing empty array" + " by promise")
	v = new Uint8Array()
	T.log("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, T.hexa(r), T.hexa(v)) // no direct comparison between Uint8Arrays
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	T.start("• testing array of sole 0" + " by promise")
	v = new Uint8Array([0])
	T.log("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, T.hexa(r), T.hexa(v)) // no direct comparison between Uint8Arrays
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}

	T.start("• testing array starting on 0" + " by promise")
	v = new Uint8Array([0,1,2,3])
	T.log("• put " + k + ": " + v + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	try {
		await map.put(k, v)
		T.attestNoError(t0, T)
		T.log("• get " + k + " by promise")
		r = await map.get(k)
		T.attestNoError(t0, T)
		T.assertEqual(t0, T, T.hexa(r), T.hexa(v)) // no direct comparison between Uint8Arrays
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}


	T.log("--- w r o n g  t y p e")

	v = 1n
	T.start("• put " + k + ": " + v + " as bigint" + " by promise")
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	errored = false
	try {
		await map.put(k, v)
		T.attestMissingError(t, T)
	} catch(e) {
		T.attestExpectedError(t0, T, e)
	}

	T.start("• testing wrong type code by promise")
	v = pot.randValue()
	v[0] = 10 // not a type code
	T.log("This would be an internal error, or trying to access an entry put raw with a type-aware get*().")
	T.log("• testing these wrongly marked bytes: ")
	T.log(T.hexa(v))
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	T.log("• putting bytes raw")
	try {
		err = await map.putRaw(k, v)
		T.attestNoError(t0, T)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}
	T.assertNoError(t0, T, err)
	errored = false
	T.log("• get " + k + " by promise")
	try {
		await map.get(k)
		T.attestMissingError(t, T)
	} catch(err) {
		T.attestExpectedError(t0, T, err)
	}

	T.start("• too-short byte sequence for a number" + " by promise")
	v = new Uint8Array([2,1,0]) // 2 = number, which expects 9 bytes total
	T.log("This would be an internal error, or trying to access an entry put raw with a type-aware get*().")
	T.log("• testing these too short bytes (for a number): " + T.hexa(v))
	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)
	T.log("• putting bytes raw")
	try {
		err = await map.putRaw(k, v)
		T.attestNoError(t0, T)
	} catch(e) {
		T.attestUnexpectedError(t0, T, e)
	}
	T.assertNoError(t0, T, err)
	errored = false
	try {
	T.log("• get " + k + " by promise")
		await map.get(k)
		T.attestMissingError(t, T)
	} catch(err) {
		T.attestExpectedError(t0, T, err)
	}


	T.log("--- s a v e")

	T.start("• save")

	try {
		T.log("• save")
		ref = await map.save()
		T.assertNotAnError(t0, T, ref)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
}


async function TestPotKvs_Save(T, bee_url, batch_id) {

	T.head("Saving and Loading")


	T.start("Save empty KVS, return error (sync)")

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	T.log("• save")
	ref = map.saveSync()
	T.assertIsError(t0, T, ref)


	T.start("Save empty KVS, catch error (async)")

	try {
		T.log("• new map")
		map = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• save")
		ref = await map.save()
		T.attestMissingError(t0, T)
	} catch(err) {
		T.attestExpectedError(t0, T, err)
	}

	if(T.NODE || !bee_url && !batch_id) {

		T.start("Save non-empty KVS, return reference, synchronous")

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		key1 = "K1"
		val1 = "V1"

		T.log("• put " + key1 + ": " + val1)
		err = map.putSync(key1, val1)
		T.attestNoError(t0, T)

		T.log("• get " + key1)
		val = map.getSync(key1)
		T.assertEqual(t0, T, val, val1)

		T.log("• save")
		ref = map.saveSync()
		T.assertNotAnError(t0, T, ref)
	}

	T.start("Save non-empty KVS, return reference, with Promises")

	key1 = "K1"
	val1 = "V1"

	try {
		T.log("• new map")
		map = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !map)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key1 + ": " + val1)
	try {
		err = await map.put(key1, val1)
		T.assertNoError(t0, T, err)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key1)
	try {
		val = await map.get(key1)
		T.assertEqual(t0, T, val, val1)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• save")
	try {
		save_ref = map.save()
		T.assertNotAnError(t0, T, save_ref)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	if(!(bee_url && !T.NODE))
	{
		T.start("Value persistence after saving")
		T.log("Note, this order is worth testing because of how POT internally stores values.")

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		key1 = "K1"
		val1 = "V1"

		T.log("• put " + key1 + ": " + val1)
		err = map.putSync(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = map.getSync(key1)
		T.assertEqual(t0, T, val, val1)

		T.log("• save")
		save_ref = map.saveSync()
		T.assertNotAnError(t0, T, save_ref)

		T.log("• getStringSync " + key1)
		val = map.getSync(key1)
		T.assertEqual(t0, T, val, val1)
	}

	if(!(bee_url && !T.NODE))
	{
		T.start("Add after save, activate new, re-activate previous")

		key1 = "K1"
		val1 = "V1"

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• put " + key1 + ": " + val1)
		err = map.putSync(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• get " + key1)
		val = map.getSync(key1)
		T.assertEqual(t0, T, val, val1)

		T.log("• save")
		save_ref = map.saveSync()
		T.assertNotAnError(t0, T, save_ref)
		T.log("√ KVS saved under key " + T.hex(save_ref))

		T.log("• new map")
		map2 = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map2)

		// lookup in all-new map: will fail
		T.log("• get " + key1 + " from new map")
		val = map2.getSync(key1)
		T.assertEqual(t0, T, val, undefined)

		T.log("• retrieve map " + T.hex(save_ref))
		map3 = pot.loadSync(save_ref, bee_url, batch_id)
		T.assertNotAnError(t0, T, map3)
		T.assertNotEqual(t0, T, map3, null)

		T.log("• get " + key1 + " from reloaded map")
		val = map3.getSync(key1)
		T.assertEqual(t0, T, val, val1)
	}

	if(!(bee_url && !T.NODE))
	{
		T.start("Sync value persistence re-loaded kvs")
		T.log("Regression test for go pot issue #15")

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		key1 = "K1"
		val1 = "V1"
		key2 = "K2"
		val2 = "V2"

		T.log("• put " + key1 + ": " + val1)
		err = map.putSync(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• put " + key2 + ": " + val2)
		err = map.putSync(key2, val2)
		T.assertNoError(t0, T, err)

		T.log("• save")
		save_ref = map.saveSync()
		T.assertNotAnError(t0, T, save_ref)

		T.log("• retrieve map " + T.hex(save_ref))
		map3 = pot.loadSync(save_ref, bee_url, batch_id)
		T.assertNotAnError(t0, T, map3)
		T.assertNotEqual(t0, T, map3, null)

		T.log("• get " + key1 + " from reloaded map")
		val = map3.getSync(key1)
		T.assertEqual(t0, T, val, val1)

		T.log("• get " + key2 + " from reloaded map")
		val = map3.getSync(key2)
		T.assertEqual(t0, T, val, val2)
	}

	if(!(bee_url && !T.NODE))
	{
		T.start("Async value persistence re-loaded kvs")
		T.log("Regression test for go pot issue #15")

		T.log("• new map")
		map = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		key1 = "K1"
		val1 = "V1"
		key2 = "K2"
		val2 = "V2"

		T.log("• put " + key1 + ": " + val1)
		err = await map.put(key1, val1)
		T.assertNoError(t0, T, err)

		T.log("• put " + key2 + ": " + val2)
		err = await map.put(key2, val2)
		T.assertNoError(t0, T, err)

		T.log("• save")
		save_ref = await map.save()
		T.assertNotAnError(t0, T, save_ref)

		T.log("• retrieve map " + T.hex(save_ref))
		map3 = await pot.load(save_ref, bee_url, batch_id)
		T.assertNotAnError(t0, T, map3)
		T.assertNotEqual(t0, T, map3, null)

		T.log("• get " + key1 + " from reloaded map")
		val = await map3.get(key1)
		T.assertEqual(t0, T, val, val1)

		T.log("• get " + key2 + " from reloaded map")
		val = await map3.get(key2)
		T.assertEqual(t0, T, val, val2)
	}
}


async function TestPotKvs_ComplexSave(T, bee_url, batch_id) {

	T.head("Saving and Loading, Switching, with Promises")

	T.start("Save, add, load, re-activate previous, w/promises")

	key1 = "K1"
	val1 = "V1"

	try {
		T.log("• new map")
		map = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !map)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key1 + ": " + val1)
	try {
		err = await map.put(key1, val1)
		T.assertNoError(t0, T, err)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key1)
	try {
		val = await map.get(key1)
		T.assertEqual(t0, T, val, val1)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• save")
	try {
		save_ref = await map.save()
		T.assertNotAnError(t0, T, save_ref)
		T.log("√ KVS saved under key " + T.hex(save_ref))
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• new map")
	try {
		map2 = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !map2)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup in all-new map: will not find it
	T.log("• get " + key1 + " from new map")
	try {
		val = await map2.get(key1)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• retrieve map " + T.hex(save_ref))
	try {
		map3 = await pot.load(save_ref, bee_url, batch_id)
		T.assertNotAnError(t0, T, map3)
		T.assertNotEqual(t0, T, map3, null)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}


	T.start("Save, re-activate previous, interact, with promises")

	key1 = "K1"
	val1 = "V1"
	key2 = "K2"
	val2 = "V2"
	key3 = "K3"
	val3 = "V3"

	try {
		T.log("• new map")
		map = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !map)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key1 + ": " + val1)
	try {
		err = await map.put(key1, val1)
		T.assertNoError(t0, T, err)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key1)
	try {
		val = await map.get(key1)
		T.assertEqual(t0, T, val, val1)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup in all-new map: will not find it
	T.log("• get " + key2 + " that should not exist")
	try {
		val = await map.get(key2)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• save")
	try {
		save_ref = await map.save()
		T.assertNotAnError(t0, T, save_ref)
		T.log("√ KVS saved under key " + T.hex(save_ref))
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• new map")
	try {
		map2 = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !map2)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 1 in all-new map: will not find it
	T.log("• get " + key1 + " from new map")
	try {
		val = await map2.get(key1)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in all-new map: will not find it
	T.log("• get " + key2 + " from new map")
	try {
		val = await map2.get(key2)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key2 + ": " + val2)
	try {
		err = await map2.put(key2, val2)
		T.assertNoError(t0, T, err)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key2)
	try {
		val = await map2.get(key2)
		T.assertEqual(t0, T, val, val2)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// no saving of 2nd map

	T.log("• retrieve first map " + T.hex(save_ref))
	try {
		map3 = await pot.load(save_ref, bee_url, batch_id)
		T.assertNotAnError(t0, T, map3)
		T.assertNotEqual(t0, T, map3, null)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key1 + " from first map")
	try {
		val = await map3.get(key1)
		T.assertEqual(t0, T, val, val1)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in all-new map: should not find it
	T.log("• get " + key2 + " from first map")
	try {
		val = await map3.get(key2)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key3 + ": " + val3 + " to first map")
	try {
		err = await map3.put(key3, val3)
		T.assertNoError(t0, T, err)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key3 + " from first map")
	try {
		val = await map3.get(key3)
		T.assertEqual(t0, T, val, val3)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• save first map again")
	try {
		save_ref_again = await map.save()
		T.assertNotAnError(t0, T, save_ref_again)
		T.log("√ KVS saved under key " + T.hex(save_ref_again))
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• third new map")
	try {
		// called map4 because map3 is the retrieved first
		map4 = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !map4)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 1 in all-new map: will not find it
	T.log("• get " + key1 + " from third map")
	try {
		val = await map4.get(key1)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in all-new map: will not find it
	T.log("• get " + key2 + " from third map")
	try {
		val = await map4.get(key2)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 3 in all-new map: will not find it
	T.log("• get " + key3 + " from third map")
	try {
		val = await map4.get(key3)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}


	T.start("Save, re-activate, interact, with promises II")

	key1 = "K1"
	val1 = "V1"
	key2 = "K2"
	val2 = "V2"
	key3 = "K3"
	val3 = "V3"

	try {
		T.log("• new map")
		map = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !map)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key1 + ": " + val1)
	try {
		err = await map.put(key1, val1)
		T.assertNoError(t0, T, err)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key1)
	try {
		val = await map.get(key1)
		T.assertEqual(t0, T, val, val1)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup in all-new map: will not find it
	T.log("• get " + key2 + " that should not exist")
	try {
		val = await map.get(key2)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• save")
	try {
		save_ref = await map.save()
		T.assertNotAnError(t0, T, save_ref)
		T.log("√ KVS saved under key " + T.hex(save_ref))
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• new map")
	try {
		map2 = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !map2)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 1 in all-new map: will not find it
	T.log("• get " + key1 + " from new map")
	try {
		val = await map2.get(key1)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in all-new map: will not find it
	T.log("• get " + key2 + " from new map")
	try {
		val = await map2.get(key2)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key2 + ": " + val2)
	try {
		err = await map2.put(key2, val2)
		T.assertNoError(t0, T, err)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key2)
	try {
		val = await map2.get(key2)
		T.assertEqual(t0, T, val, val2)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• save second map")
	try {
		save_ref_2 = await map2.save()
		T.assertNotAnError(t0, T, save_ref_2)
		T.log("√ KVS saved under key " + T.hex(save_ref_2))
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• retrieve first map " + T.hex(save_ref))
	try {
		map3 = await pot.load(save_ref, bee_url, batch_id)
		T.assertNotAnError(t0, T, map3)
		T.assertNotEqual(t0, T, map3, null)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key1 + " from first map")
	try {
		val = await map3.get(key1)
		T.assertEqual(t0, T, val, val1)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in first map: should not find it
	T.log("• get " + key2 + " from first map")
	try {
		val = await map3.get(key2)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key3 + ": " + val3 + " to first map")
	try {
		err = await map3.put(key3, val3)
		T.assertNoError(t0, T, err)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key3 + " from first map")
	try {
		val = await map3.get(key3)
		T.assertEqual(t0, T, val, val3)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• save first map again")
	try {
		save_ref_again = await map.save()
		T.assertNotAnError(t0, T, save_ref_again)
		T.log("√ KVS saved under key " + T.hex(save_ref_again))
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• third new map")
	try {
		// called map4 because map3 is the retrieved first
		map4 = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !map4)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 1 in all-new map: will not find it
	T.log("• get " + key1 + " from third map")
	try {
		val = await map4.get(key1)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in all-new map: will not find it
	T.log("• get " + key2 + " from third map")
	try {
		val = await map4.get(key2)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 3 in all-new map: will not find it
	T.log("• get " + key3 + " from third map")
	try {
		val = await map4.get(key3)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• retrieve second map " + T.hex(save_ref_2))
	try {
		map5 = await pot.load(save_ref_2, bee_url, batch_id)
		T.assertNotAnError(t0, T, map5)
		T.assertNotEqual(t0, T, map5, null)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// The simulation mode does not manage to get these most interesting
	// test cases right and it is not worth the effort to enhance it
	// because it has a different purpose from testing cases like this.
	if(T.tag != "ext-api") { // = simulation mode

		// lookup key 1 in 2nd ('new') map: will not find it
		T.log("• get " + key1 + " from retrieved second map")
		try {
			val = await map5.get(key1)
			T.assertEqual(t0, T, val, undefined)
		} catch(err) {
			T.attestUnexpectedError(t0, T, err)
		}

		T.log("• get " + key2 + " from second map")
		try {
			val = await map5.get(key2)
			T.assertEqual(t0, T, val, val2)
		} catch(err) {
			T.attestUnexpectedError(t0, T, err)
		}

		// lookup key 3 in 2nd map: will not find it
		T.log("• get " + key3 + " from second map")
		try {
			val = await map5.get(key3)
			T.assertEqual(t0, T, val, undefined)
		} catch(err) {
			T.attestUnexpectedError(t0, T, err)
		}
	}

	T.start("Interacting with 2 maps, w/o save, w/promises II")

	key1 = "K1"
	val1 = "V1"
	key2 = "K2"
	val2 = "V2"
	key3 = "K3"
	val3 = "V3"

	T.log("• new map")
	try {
		map = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !map)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key1 + ": " + val1)
	try {
		err = await map.put(key1, val1)
		T.assertNoError(t0, T, err)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key1)
	try {
		val = await map.get(key1)
		T.assertEqual(t0, T, val, val1)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup in map: will not find it
	T.log("• get " + key2 + " that should not exist")
	try {
		val = await map.get(key2)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• new map")
	try {
		map2 = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !map2)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 1 in new map: will not find it
	T.log("• get " + key1 + " from new map")
	try {
		val = await map2.get(key1)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in new map: will not find it
	T.log("• get " + key2 + " from new map")
	try {
		val = await map2.get(key2)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key2 + ": " + val2)
	try {
		err = await map2.put(key2, val2)
		T.assertNoError(t0, T, err)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key2 + " from second map")
	try {
		val = await map2.get(key2)
		T.assertEqual(t0, T, val, val2)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key1 + " from first map")
	try {
		val = await map.get(key1)
		T.assertEqual(t0, T, val, val1)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in first map: should not find it
	T.log("• get " + key2 + " from first map")
	try {
		val = await map.get(key2)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• put " + key3 + ": " + val3 + " to first map")
	try {
		err = await map.put(key3, val3)
		T.assertNoError(t0, T, err)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key3 + " from first map")
	try {
		val = await map.get(key3)
		T.assertEqual(t0, T, val, val3)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• third new map")
	try {
		map3 = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !map3)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 1 in all-new map: will not find it
	T.log("• get " + key1 + " from third map")
	try {
		val = await map3.get(key1)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 2 in all-new map: will not find it
	T.log("• get " + key2 + " from third map")
	try {
		val = await map3.get(key2)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 3 in all-new map: will not find it
	T.log("• get " + key3 + " from third map")
	try {
		val = await map3.get(key3)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 1 in 2nd new map: will not find it
	T.log("• get " + key1 + " from second map")
	try {
		val = await map2.get(key1)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• get " + key2 + " from second map")
	try {
		val = await map2.get(key2)
		T.assertEqual(t0, T, val, val2)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	// lookup key 3 in 2nd map: will not find it
	T.log("• get " + key3 + " from second map")
	try {
		val = await map2.get(key3)
		T.assertEqual(t0, T, val, undefined)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
}


async function TestPotKvs_ComplexConcurrent(T, bee_url, batch_id) {

	T.head("Concurrent Access")

	if(!(bee_url && !T.NODE))
	{

		T.start("put, get "+massmax+" values concurrently, sync calls")

		T.log("• new map")
		let map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• put, get "+massmax+" random values and keys concurrently, parallel sync calls")
		let group = 0
		for(let i=0; i<massmax; i++) {
			; (async() => {
				let t = i+1
				try {
					group++
					let key = pot.randKey()
					let val = pot.randValue()
					let e = map.putSync(key, val)
					T.assertNoError(t, T, e, true) // suppress ok
					let res = map.getSync(key)
					T.attestNoError(t, T, true) // suppress ok
					T.assertEqual(t, T, res, val, true) // suppress ok
					group--
				} catch(err) {
					T.attestUnexpectedError(t, T, err)
					group--
				}
			})()
		}

		await T.completion(null, T, ()=>{return group}, 100, 10000)


		T.log("--- s a v e")

		T.start("• save")

		try {
			T.log("• save")
			ref = await map.save()
			T.assertNotAnError(t0, T, ref)
		} catch(err) {
			T.attestUnexpectedError(t0, T, err)
		}

		await T.delay(100)
	}{

		T.start("Concurrent store and retrieve "+massmax+", with promises")

		T.log("Store and retrieve "+massmax+" values concurrently, awaiting promises")

		timeout = massmax * 100

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• store and retrieve "+massmax+" random values keys concurrently, awaiting promises")
		let group = 0
		for(let i=0; i<massmax; i++) {
			; (async() => {
				let t = i+1
				let box = T.box
				try {
					group++
					let key = pot.randKey()
					let val = pot.randValue()
					let e = await map.put(key, val)
					T.assertNoError(t, T, e, true, box) // suppress ok
					let res = await map.get(key)
					T.attestNoError(t, T, true, box) // suppress ok
					T.assertEqual(t, T, res, val, true, box) // suppress ok
					group--
				} catch(err) {
					T.attestUnexpectedError(t, T, err, box)
					group--
				}
			})()
		}

		await T.completion(null, T, ()=>{return group}, 1000, timeout)


		T.log("--- s a v e")

		T.start("• save")

		try {
			T.log("• save")
			ref = await map.save()
			T.assertNotAnError(t0, T, ref)
		} catch(err) {
			T.attestUnexpectedError(t0, T, err)
		}

		await T.delay(100)

	}{

		T.start("Concurrency, with Promises")

		T.log("Concurrent Putting, Getting, Saving, Loading, Switching Maps, with Promises")

		key1 = "K1"
		val1 = "V1"
		key2 = pot.randKey()
		val2 = pot.randValue()
		key3 = pot.randKey()
		val3 = pot.randValue()
		let group = 0

		; (async ()=>{

			group++
			let t = 1

			T.log(1, "• new map")
			try {
				map = await pot.new(bee_url, batch_id)
				T.attestNoError(t, T, !map)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• put " + key1 + ": " + val1)
			try {
				err = await map.put(key1, val1)
				T.assertNoError(t, T, err)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + key1)
			try {
				val = await map.get(key1)
				T.assertEqual(t, T, val, val1)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• save")
			try {
				save_ref = await map.save()
				T.assertNotAnError(t, T, save_ref)
				T.log(t, "√ KVS saved under key " + T.hex(save_ref))
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• put after save ")
			try {
				err = await map.put(key2, val2)
				T.assertNoError(t, T, err)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + T.hexa(key2))
			try {
				val = await map.get(key2)
				T.assertEqual(t, T, val, val2)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• retrieve map as saved as " + T.hex(save_ref))
			try {
				map3 = await pot.load(save_ref, bee_url, batch_id)
				T.assertNotAnError(t, T, map3)
				T.assertNotEqual(t, T, map3, null)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + key1 + " from retrieved map")
			try {
				val = await map3.get(key1)
				T.assertEqual(t, T, val, val1)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + key1 + " from original map")
			try {
				val = await map.get(key1)
				T.assertEqual(t, T, val, val1)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + key1 + " from retrieved map again")
			try {
				val = await map3.get(key1)
				T.assertEqual(t, T, val, val1)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + T.hexa(key2) + " from original map")
			try {
				val = await map.get(key2)
				T.assertEqual(t, T, val, val2)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in retrieved map: will not find it
			T.log(1, "• get " + T.hexa(key2) + " from retrieved map")
			try {
				val = await map3.get(key2)
				T.assertEqual(1, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(1, T, err)
			}

			T.log(1, "• put " + T.hexa(key2) + ": " + T.hexa(val2) + " to retrieved map")
			try {
				err = await map3.put(key2, val2)
				T.assertNoError(1, T, err)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + T.hexa(key2) + " from retrieved map")
			try {
				val = await map3.get(key2)
				T.assertEqual(t, T, val, val2)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			group--
		})()

		; (async ()=>{

			group++
			let t = 2

			T.log(t, "• second new map")
			try {
				map2 = await pot.new(bee_url, batch_id)
				T.assertNoError(t, T, !map2)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup in all-new map: will not find it
			T.log(t, "• get " + key1 + " from second map")
			try {
				val = await map2.get(key1)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• put " + key1 + ": " + val1)
			try {
				err = await map2.put(key1, val1)
				T.assertNoError(t, T, err)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key1)
			try {
				val = await map2.get(key1) /// xxx
				T.assertEqual(t, T, val, val1)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in 2nd map: will not find it
			T.log(t, "• get " + T.hexa(key2) + " from 2nd (new) map")
			try {
				val = await map2.get(key2)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t0, T, err)
			}

			T.log(t, "• put " + T.hexa(key2) + ": " + T.hexa(val2) + " to 2nd map")
			try {
				err = await map2.put(key2, val2)
				T.assertNoError(t, T, err)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + T.hexa(key2) + " from 2nd map")
			try {
				val = await map2.get(key2)
				T.assertEqual(t, T, val, val2)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			group--
		})()

		await T.completion(null, T, ()=>{return group}, 100, 1000)

	}{

		T.start("Cross-KVS Concurrency with Promises")

		T.log("Crossover concurrent putting, getting, saving, loading, switching maps across threads, with promises")

		key1 = "K1"
		val1 = "V1"
		key2 = pot.randKey()
		val2 = pot.randValue()
		key3 = pot.randKey()
		val3 = pot.randValue()

		// key2 etc from before, random bytes
		let group = 0

		; (async ()=>{

			group++
			let t = 1

			T.log(1, "• new map")
			try {
				map = await pot.new(bee_url, batch_id)
				T.attestNoError(t, T, !map)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• put" + key1 + ": " + val1)
			try {
				err = await map.put(key1, val1)
				T.assertNoError(t, T, err)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + key1)
			try {
				val = await map.get(key1)
				T.assertEqual(t, T, val, val1)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• save")
			try {
				save_ref = await map.save()
				T.assertNotAnError(t, T, save_ref)
				T.log(t, "√ KVS saved under key " + T.hex(save_ref))
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• put " + T.hexa(key2) + ": " + T.hexa(val2))

			try {
				err = await map.put(key2, val2)
				T.assertNoError(t, T, err)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + T.hexa(key2))
			try {
				val = await map.get(key2)
				T.assertEqual(t, T, val, val2)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• retrieve first map as saved as " + T.hex(save_ref))
			try {
				map3 = await pot.load(save_ref, bee_url, batch_id)
				T.assertNotAnError(t, T, map3)
				T.assertNotEqual(t, T, map3, null)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + key1 + " from retrieved map")
			try {
				val = await map3.get(key1)
				T.assertEqual(t, T, val, val1)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + key1 + " from original map")
			try {
				val = await map3.get(key1)
				T.assertEqual(t, T, val, val1)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + key1 + " from retrieved map again")
			try {
				val = await map3.get(key1)
				T.assertEqual(t, T, val, val1)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + T.hexa(key2) + " from original map")
			try {
				val = await map.get(key2)
				T.assertEqual(t, T, val, val2)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in retrieved map: will not find it
			T.log(1, "• get " + T.hexa(key2) + " from retrieved map")
			try {
				val = await map3.get(key2)
				T.assertEqual(1, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(1, T, err)
			}

			T.log(1, "• put " + T.hexa(key2) + ": " + T.hexa(val2) + " to retrieved map")
			try {
				err = await map3.put(key2, val2)
				T.assertNoError(1, T, err)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(1, "• get " + T.hexa(key2) + " from retrieved map")
			try {
				val = await map3.get(key2)
				T.assertEqual(t, T, val, val2)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			group--
		})()

		; (async ()=>{

			group++
			let t = 2

			T.log(t, "• second new map")
			try {
				map2 = await pot.new(bee_url, batch_id)
				T.assertNoError(t, T, !map2)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup in all-new map: will not find it
			T.log(t, "• get " + key1 + " from second map")
			try {
				val = await map2.get(key1)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• put " + key1 + ": " + val1 + " to second map")
			try {
				err = await map2.put(key1, val1)
				T.assertNoError(t, T, err)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key1 + " from second map")
			try {
				val = await map2.get(key1)
				T.assertEqual(t, T, val, val1)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in 2nd map: will not find it
			T.log(t, "• get " + T.hexa(key2) + " from 2nd (new) map")
			try {
				val = await map2.get(key2)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t0, T, err)
			}

			T.log(t, "• put " + T.hexa(key2) + ": " + T.hexa(val2) + " to 2nd map")
			try {
				err = await map2.put(key2, val2)
				T.assertNoError(t, T, err)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + T.hexa(key2) + " from 2nd map")
			try {
				val = await map2.get(key2)
				T.assertEqual(t, T, val, val2)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			/// GETTING FROM FIRST MAP

			await T.delay(100)

			T.log(t, "• get " + key1 + " from FIRST map")
			T.log(t, "Note, this get can fail if the the 1st thread is much delayed. It means no real error.") ///
			try {
				val = await map.get(key1)
				T.assertEqual(t, T, val, val1)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			group--
		})()

		await T.completion(null, T, ()=>{return group}, 100, 1000)

	}{

		T.start("Concurrent save, re-activate, w/romises II")

		key1 = "K1"
		val1 = "V1"
		key2 = "K2"
		val2 = "V2"
		key3 = "K3"
		val3 = "V3"

		let map
		let map2
		let map3
		let map4
		let map5

		group = 0

		; (async () => {

			T.log("» first thread")
			group++
			let t = 1

			T.log(t, "• new map")
			try {
				map = await pot.new(bee_url, batch_id)
				T.assertNoError(t, T, !map)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• put " + key1 + ": " + val1)
			try {
				err = await map.put(key1, val1)
				T.assertNoError(t, T, err)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key1)
			try {
				val = await map.get(key1)
				T.assertEqual(t, T, val, val1)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup in all-new map: will not find it
			T.log(t, "• get " + key2 + " that should not exist")
			try {
				val = await map.get(key2)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• save")
			try {
				save_ref = await map.save()
				T.assertNotAnError(t, T, save_ref)
				T.log(t, "√ KVS saved under key " + T.hex(save_ref))
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• retrieve first map " + T.hex(save_ref))
			try {
				map3 = await pot.load(save_ref, bee_url, batch_id)
				T.assertNotAnError(t, T, map3)
				T.assertNotEqual(t, T, map3, null)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key1 + " from retrieved first map")
			try {
				val = await map3.get(key1)
				T.assertEqual(t, T, val, val1)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in retrieved map: should not find it
			T.log(t, "• get " + key2 + " from retrieved first map")
			try {
				val = await map3.get(key2)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• put " + key3 + ": " + val3 + " to retrieved first map")
			try {
				err = await map3.put(key3, val3)
				T.assertNoError(t, T, err)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key3 + " from retrieved first map")
			try {
				val = await map3.get(key3)
				T.assertEqual(t, T, val, val3)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• save first map again")
			try {
				save_ref_again = await map.save()
				T.assertNotAnError(t, T, save_ref_again)
				T.log(t, "√ KVS saved under key " + T.hex(save_ref_again))
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}
			group--
		})()

		; (async () => {

			group++
			let t = 2

			T.log(t, "» second thread")

			T.log(t, "• second new map")
			try {
				map2 = await pot.new(bee_url, batch_id)
				T.assertNoError(t, T, !map2)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 1 in all-new map: will not find it
			T.log(t, "• get " + key1 + " from new map")
			try {
				val = await map2.get(key1)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in all-new map: will not find it
			T.log(t, "• get " + key2 + " from new map")
			try {
				val = await map2.get(key2)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• put " + key2 + ": " + val2)
			try {
				err = await map2.put(key2, val2)
				T.assertNoError(t, T, err)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key2)
			try {
				val = await map2.get(key2)
				T.assertEqual(t, T, val, val2)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• save second map")
			try {
				save_ref_2 = await map2.save()
				T.assertNotAnError(t, T, save_ref_2)
				T.log(t, "√ KVS saved under key " + T.hex(save_ref_2))
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• retrieve second map " + T.hex(save_ref_2))
			try {
				map5 = await pot.load(save_ref_2, bee_url, batch_id)
				T.assertNotAnError(t, T, map5)
				T.assertNotEqual(t, T, map5, null)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 1 in 2nd new map: will not find it
			T.log(t, "• get " + key1 + " from second map")
			try {
				val = await map5.get(key1)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key2 + " from second map")
			try {
				val = await map5.get(key2)
				T.assertEqual(t, T, val, val2)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 3 in all-new map: will not find it
			T.log(t, "• get " + key3 + " from second map")
			try {
				val = await map5.get(key3)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}
			group--
		})()

		; (async () => {

			group++
			let t = 3

			T.log(t, "» third thread")

			T.log(t, "• third new map")
			try {
				// called map4 because map3 is the retrieved first
				map4 = await pot.new(bee_url, batch_id)
				T.assertNoError(t, T, !map4)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 1 in all-new map: will not find it
			T.log(t, "• get " + key1 + " from third map")
			try {
				val = await map4.get(key1)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in all-new map: will not find it
			T.log(t, "• get " + key2 + " from third map")
			try {
				val = await map4.get(key2)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 3 in all-new map: will not find it
			T.log(t, "• get " + key3 + " from third map")
			try {
				val = await map4.get(key3)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}
			group--
		})()

		await T.completion(null, T, ()=>{return group}, 100, 1000)

	}{

		T.start("Interacting with different maps, w/promises II")

		key1 = "K1"
		val1 = "V1"
		key2 = "K2"
		val2 = "V2"
		key3 = "K3"
		val3 = "V3"

		let group = 0

		; (async () => {

			group++
			let t=1

			T.log(t, "• new map")
			try {
				map = await pot.new(bee_url, batch_id)
				T.assertNoError(t, T, !map)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• put " + key1 + ": " + val1)
			try {
				err = await map.put(key1, val1)
				T.assertNoError(t, T, err)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key1)
			try {
				val = await map.get(key1)
				T.assertEqual(t, T, val, val1)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup in all-new map: will not find it
			T.log(t, "• get " + key2 + " that should not exist")
			try {
				val = await map.get(key2)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key1 + " from first map")
			try {
				val = await map.get(key1)
				T.assertEqual(t, T, val, val1)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in new map: should not find it
			T.log(t, "• get " + key2 + " from first map")
			try {
				val = await map.get(key2)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• put " + key3 + ": " + val3 + " to first map")
			try {
				err = await map.put(key3, val3)
				T.assertNoError(t, T, err)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key3 + " from first map")
			try {
				val = await map.get(key3)
				T.assertEqual(t, T, val, val3)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			group--
		})()

		; (async () => {

			group++
			let t=2

			T.log(t, "• new map")
			try {
				map2 = await pot.new(bee_url, batch_id)
				T.assertNoError(t, T, !map2)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 1 in all-new map: will not find it
			T.log(t, "• get " + key1 + " from new map")
			try {
				val = await map2.get(key1)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in all-new map: will not find it
			T.log(t, "• get " + key2 + " from new map")
			try {
				val = await map2.get(key2)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• put " + key2 + ": " + val2)
			try {
				err = await map2.put(key2, val2)
				T.assertNoError(t, T, err)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key2 + " from second map")
			try {
				val = await map2.get(key2)
				T.assertEqual(t, T, val, val2)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 1 in 2nd new map: will not find it
			T.log(t, "• get " + key1 + " from second map")
			try {
				val = await map2.get(key1)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			T.log(t, "• get " + key2 + " from second map")
			try {
				val = await map2.get(key2)
				T.assertEqual(t, T, val, val2)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 3 in all-new map: will not find it
			T.log(t, "• get " + key3 + " from second map")
			try {
				val = await map2.get(key3)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			group--

		})()

		; (async () => {

			group++
			let t=3

			T.log(t, "• third new map")
			try {
				map3 = await pot.new(bee_url, batch_id)
				T.assertNoError(t, T, !map3)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 1 in all-new map: will not find it
			T.log(t, "• get " + key1 + " from third map")
			try {
				val = await map3.get(key1)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 2 in all-new map: will not find it
			T.log(t, "• get " + key2 + " from third map")
			try {
				val = await map3.get(key2)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			// lookup key 3 in all-new map: will not find it
			T.log(t, "• get " + key3 + " from third map")
			try {
				val = await map3.get(key3)
				T.assertEqual(t, T, val, undefined)
			} catch(err) {
				T.attestUnexpectedError(t, T, err)
			}

			group--
		})()

		await T.completion(null, T, ()=>{return group}, 100, 2000)

	}
}


async function TestPotKvs_Cancellation(T, bee_url, batch_id) {

	T.head("Timeout and Cancellations")


	if(pot.testMode() != "simulation") {
		T.log("Timeout and Cancellation tests are available in `simulation` test mode. Use `make web_sim_test` or `make node_sim_test`.")
		return
	}

	T.log("This tests the cancellable promises created in Go to control resource leakage.")
	T.log("It uses mock promises that hang until cancelled.")


	T.start("Timeout of Test Function")

	T.log("• create hanging test promise and let it time out (try-catch)")
	try {
		ref = await pot.hangingPromise()
		T.attestMissingError(t0, T)
	} catch(err) {
		T.attestExpectedError(t0, T, err, "Error: done sleeping, nothing happened")
	}


	T.start("Timeout of Test Function II")

	T.log("• create hanging test promise and let it time out (chained catch)")
	ref = await pot.hangingPromise()
		.then(()=>T.attestMissingError(t0, T))
		.catch((err)=>T.attestExpectedError(t0, T, err, "Error: done sleeping, nothing happened"))



	// ---------------------------------------------------------------------
	// Timeouts of standard operations


	T.start("Timeout of sync Put")

	key = pot.randKey()
	val = pot.randValue()

	if(T.NODE || !bee_url && !batch_id) {
		kvs = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !kvs)
		pot.setHang(true)
		ret = kvs.putSync(key, val, 100)
		T.assertError(t0, T, ret, /context deadline exceeded/)
	} else {
		T.log("n/a in-browser with network")
	}

	T.start("Timeout of async Put (try/catch)")

	key = pot.randKey()
	val = pot.randValue()

	try {
		kvs = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !kvs)
		pot.setHang(true)
		await kvs.put(key, val, 100)
		T.attestMissingError(t0, T)
	} catch(err) {
		T.attestExpectedError(t0, T, err, "context deadline exceeded")
	}

	T.start("Timeout of async Put (chained .catch())")

	kvs = await pot.new(bee_url, batch_id)
	T.assertNoError(t0, T, !kvs)
	err = await kvs.put(key, val)
	T.assertNoError(t0, T, err)
	pot.setHang(true)
	await kvs.put(key, val, 100)
		.then(()=>T.attestMissingError(t0, T))
		.catch((err)=>T.attestExpectedError(t0, T, err, "context deadline exceeded"))


	T.start("Timeout of sync Get")

	key = pot.randKey()
	val = pot.randValue()

	if(T.NODE || !bee_url && !batch_id) {
		kvs = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !kvs)
		err = await kvs.put(key, val)
		T.assertNoError(t0, T, err)
		pot.setHang(true)
		ret = kvs.getSync(key, 100)
		T.assertError(t0, T, ret, /context deadline exceeded/)
	} else {
		T.log("n/a in-browser with network")
	}

	T.start("Timeout of async Get (try/catch)")

	key = pot.randKey()
	val = pot.randValue()

	try {
		kvs = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !kvs)
		err = await kvs.put(key, val)
		T.assertNoError(t0, T, err)
		pot.setHang(true)
		val1 = await kvs.get(key, 100)
		T.attestMissingError(t0, T)
	} catch(err) {
		T.attestExpectedError(t0, T, err, "context deadline exceeded")
	}

	T.start("Timeout of async Get (chained .catch)")

	kvs = await pot.new(bee_url, batch_id)
	T.assertNoError(t0, T, !kvs)
	err = await kvs.put(key, val)
	T.assertNoError(t0, T, err)
	pot.setHang(true)
	val1 = await kvs.get(key, 100)
		.then(()=>T.attestMissingError(t0, T))
		.catch((err)=>T.attestExpectedError(t0, T, err, "context deadline exceeded"))


	T.start("Timeout of sync Get Boolean")

	key = pot.randKey()
	val = pot.randValue()

	if(T.NODE || !bee_url && !batch_id) {
		kvs = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !kvs)
		err = await kvs.putRaw(key, val)
		T.assertNoError(t0, T, err)
		pot.setHang(true)
		ret = kvs.getBooleanSync(key, 100)
		T.assertError(t0, T, ret, /context deadline exceeded/)
	} else {
		T.log("n/a in-browser with network")
	}

	T.start("Timeout of async Get Boolean (try/catch)")

	key = pot.randKey()
	val = true

	try {
		kvs = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !kvs)
		err = await kvs.putRaw(key, val)
		T.assertNoError(t0, T, err)
		pot.setHang(true)
		val1 = await kvs.getBoolean(key, 100)
		T.attestMissingError(t0, T)
	} catch(err) {
		T.attestExpectedError(t0, T, err, "context deadline exceeded")
	}

	T.start("Timeout of async Get Boolean (chained .catch)")

	kvs = await pot.new(bee_url, batch_id)
	T.assertNoError(t0, T, !kvs)
	err = await kvs.putRaw(key, val)
	T.assertNoError(t0, T, err)
	pot.setHang(true)
	val1 = await kvs.getBoolean(key, 100)
		.then(()=>T.attestMissingError(t0, T))
		.catch((err)=>T.attestExpectedError(t0, T, err, "context deadline exceeded"))


	T.start("Timeout of sync Get Number")

	key = pot.randKey()
	val = pot.randValue()

	if(T.NODE || !bee_url && !batch_id) {
		kvs = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !kvs)
		err = await kvs.putRaw(key, val)
		T.assertNoError(t0, T, err)
		pot.setHang(true)
		ret = kvs.getNumberSync(key, 100)
		T.assertError(t0, T, ret, /context deadline exceeded/)
	} else {
		T.log("n/a in-browser with network")
	}

	T.start("Timeout of async Get Number (try/catch)")

	key = pot.randKey()
	val = 2137

	try {
		kvs = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !kvs)
		err = await kvs.putRaw(key, val)
		T.assertNoError(t0, T, err)
		pot.setHang(true)
		val1 = await kvs.getNumber(key, 100)
		T.attestMissingError(t0, T)
	} catch(err) {
		T.attestExpectedError(t0, T, err, "context deadline exceeded")
	}

	T.start("Timeout of async Get Number (chained .catch)")

	kvs = await pot.new(bee_url, batch_id)
	T.assertNoError(t0, T, !kvs)
	err = await kvs.putRaw(key, val)
	T.assertNoError(t0, T, err)
	pot.setHang(true)
	val1 = await kvs.getNumber(key, 100)
		.then(()=>T.attestMissingError(t0, T))
		.catch((err)=>T.attestExpectedError(t0, T, err, "context deadline exceeded"))


	T.start("Timeout of sync Get String")

	key = pot.randKey()
	val = pot.randValue()

	if(T.NODE || !bee_url && !batch_id) {
		kvs = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !kvs)
		err = await kvs.putRaw(key, val)
		T.assertNoError(t0, T, err)
		pot.setHang(true)
		ret = kvs.getStringSync(key, 100)
		T.assertError(t0, T, ret, /context deadline exceeded/)
	} else {
		T.log("n/a in-browser with network")
	}

	T.start("Timeout of async Get String (try/catch)")

	key = pot.randKey()
	val = "abc"

	try {
		kvs = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !kvs)
		err = await kvs.putRaw(key, val)
		T.assertNoError(t0, T, err)
		pot.setHang(true)
		val1 = await kvs.getString(key, 100)
		T.attestMissingError(t0, T)
	} catch(err) {
		T.attestExpectedError(t0, T, err, "context deadline exceeded")
	}

	T.start("Timeout of async Get String (chained .catch)")

	kvs = await pot.new(bee_url, batch_id)
	T.assertNoError(t0, T, !kvs)
	err = await kvs.putRaw(key, val)
	T.assertNoError(t0, T, err)
	pot.setHang(true)
	val1 = await kvs.getString(key, 100)
		.then(()=>T.attestMissingError(t0, T))
		.catch((err)=>T.attestExpectedError(t0, T, err, "context deadline exceeded"))


	T.start("Timeout of sync Delete")

	key = pot.randKey()
	val = pot.randValue()

	if(T.NODE || !bee_url && !batch_id) {
		kvs = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !kvs)
		err = await kvs.put(key, val)
		T.assertNoError(t0, T, err)
		pot.setHang(true)
		ret = kvs.deleteSync(key, 100)
		T.assertError(t0, T, ret, /context deadline exceeded/)
	} else {
		T.log("n/a in-browser with network")
	}

	T.start("Timeout of async Delete (try/catch)")

	key = pot.randKey()
	val = "abc"

	try {
		kvs = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !kvs)
		err = await kvs.put(key, val)
		T.assertNoError(t0, T, err)
		pot.setHang(true)
		await kvs.delete(key, 100)
		T.attestMissingError(t0, T)
	} catch(err) {
		T.attestExpectedError(t0, T, err, "context deadline exceeded")
	}

	T.start("Timeout of async Delete (chained .catch)")

	kvs = await pot.new(bee_url, batch_id)
	T.assertNoError(t0, T, !kvs)
	err = await kvs.put(key, val)
	T.assertNoError(t0, T, err)
	pot.setHang(true)
	await kvs.delete(key, 100)
		.then(()=>T.attestMissingError(t0, T))
		.catch((err)=>T.attestExpectedError(t0, T, err, "context deadline exceeded"))


	T.start("Timeout of sync Save")

	key = pot.randKey()
	val = pot.randValue()

	if(T.NODE || !bee_url && !batch_id) {
		kvs = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !kvs)
		err = await kvs.put(key, val)
		T.assertNoError(t0, T, err)
		pot.setHang(true)
		ret = kvs.saveSync(100)
		T.assertError(t0, T, ret, /context deadline exceeded/)
	} else {
		T.log("n/a in-browser with network")
	}

	T.start("Timeout of async Save (try/catch)")

	key = pot.randKey()
	val = pot.randValue()

	try {
		kvs = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !kvs)
		err = await kvs.put(key, val)
		T.assertNoError(t0, T, err)
		pot.setHang(true)
		await kvs.save(100)
		T.attestMissingError(t0, T)
	} catch(err) {
		T.attestExpectedError(t0, T, err, "context deadline exceeded")
	}

	T.start("Timeout of async Save (chained .catch)")

	kvs = await pot.new(bee_url, batch_id)
	T.assertNoError(t0, T, !kvs)
	err = await kvs.put(key, val)
	T.assertNoError(t0, T, err)
	pot.setHang(true)
	await kvs.save(100)
		.then(()=>T.attestMissingError(t0, T))
		.catch((err)=>T.attestExpectedError(t0, T, err, "context deadline exceeded"))


	T.start("Timeout of sync Load")

	key = pot.randKey()
	val = pot.randValue()

	if(T.NODE || !bee_url && !batch_id) {
		kvs = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !kvs)
		err = await kvs.put(key, val)
		T.assertNoError(t0, T, err)
		ref = await kvs.save()
		T.assertNotAnError(t0, T, ref)
		pot.setHang(true)
		ret = pot.loadSync(ref, bee_url, batch_id, 100)
		T.assertError(t0, T, ret, /context deadline exceeded/)
	} else {
		T.log("n/a in-browser with network")
	}

	T.start("Timeout of async Load (try/catch)")

	key = pot.randKey()
	val = pot.randValue()

	try {
		kvs = await pot.new(bee_url, batch_id)
		T.assertNoError(t0, T, !kvs)
		err = await kvs.put(key, val)
		T.assertNoError(t0, T, err)
		ref = await kvs.save()
		T.assertNotAnError(t0, T, ref)
		pot.setHang(true)
		await pot.load(ref, bee_url, batch_id, 100)
		T.attestMissingError(t0, T)
	} catch(err) {
		T.attestExpectedError(t0, T, err, "context deadline exceeded")
	}

	T.start("Timeout of async Load (chained .catch)")

	kvs = await pot.new(bee_url, batch_id)
	T.assertNoError(t0, T, !kvs)
	err = await kvs.put(key, val)
	T.assertNoError(t0, T, err)
	ref = await kvs.save()
	T.assertNotAnError(t0, T, ref)
	pot.setHang(true)
	await pot.load(ref, bee_url, batch_id, 100)
		.then(()=>T.attestMissingError(t0, T))
		.catch((err)=>T.attestExpectedError(t0, T, err, "context deadline exceeded"))


	await T.delay(10)

	// ---------------------------------------------------------------------

	T.start("Cancel Timer")

	T.log("• create hanging test promise and cancel it (by timer, try-catch)")
	try {
		ref = pot.hangingPromise()
		setTimeout(ref.cancel, 100)
		await ref
		T.attestMissingError(t0, T)
	} catch(err) {
		T.attestExpectedError(t0, T, err, "Error: canceled")
	}

	await T.delay(10)

	T.start("Cancel Timer II")

	T.log("• create hanging test promise and cancel it (by timer, chain .catch)")
	try {
		ref = pot.hangingPromise()
		setTimeout(ref.cancel, 100)
		// note, chaining the .catch immediatelly above gives the wrong ref for cancel().
		await ref
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "Error: canceled"))
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(10)

	T.start("Cancel Delay")

	T.log("• create hanging test promise and cancel it (delay, chain .catch)")
	try {
		ref = pot.hangingPromise()
		// note, chaining the .catch immediatelly above gives the wrong ref for cancel().
		ref
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "Error: canceled"))
		await T.delay(100)
		ref.cancel()
		T.attestNoError(t0, T)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(10)

/* Does not work, although X1 does. Throws Uncaught (in promise) Error: canceled

	T.start("Immediate Cancel")

	T.log("create hanging test promise and cancel it immediately (try-catch)")
	try {
		ref = pot.hangingPromise()
		ref.cancel()
		// also does not work with 500ms delay here
		T.attestMissingError(t, T)
	} catch(err) {
		T.attestExpectedError(t0, T, err, "Error: canceled")
	}
*/
	T.start("Immediate Cancel II")

	T.log("• create hanging test promise and cancel it immediately (chain .catch)")
	try {
		ref = pot.hangingPromise()
		// note, chaining the .catch immediatelly above gives the wrong ref for cancel().
		ref
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "Error: canceled"))
		ref.cancel()
		T.attestNoError(t0, T)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(10)

	// ---------------------------------------------------------------------

	T.start("Cancel put()")

	T.log("• cancel put immediately (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		pot.setHang(true)
		promise = map.put(key, val)
		promise.cancel()
		// -> unhandledRejection event
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(1)

	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel put immediately (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		pot.setHang(true)
		promise = map.put(key, val)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	await T.delay(1)

	T.log("• cancel put after 50ms (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		pot.setHang(true)
		promise = map.put(key, val)
		await T.delay(50)
		promise.cancel()
		// -> unhandledRejection event
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel put after 50ms (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		pot.setHang(true)
		promise = map.put(key, val)
		await T.delay(40)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	await T.delay(1)

	T.log("• cancel put immediately (.catch)")
	try {
		map = await pot.new()
		pot.setHang(true)
		promise = map.put(key, val)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(1)

	T.log("• cancel put after 50ms (.catch)")
	try {
		map = await pot.new()
		pot.setHang(true)
		promise = map.put(key, val)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(70)

	T.log("• cancel wrong promise (.catch)")
	try {
		map = await pot.new()
		pot.setHang(true)
		// chaining the .catch immediatelly gives the wrong promise for cancel().
		promise = map.put(key, val).catch(e => T.attestMissingError(t0, T))
		promise.cancel()
	} catch(err) {
		T.attestExpectedError(t0, T, err, "is not a function")
	}

	await T.delay(10)

	// ---------------------------------------------------------------------

	T.start("Cancel raw put")

	T.log("• cancel raw put immediately (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		pot.setHang(true)
		promise = map.putRaw(key, val)
		promise.cancel()
		// -> unhandledRejection event
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(1)

	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel raw put immediately (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		pot.setHang(true)
		promise = map.putRaw(key, val)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	await T.delay(1)

	T.log("• cancel raw put after 50ms (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		pot.setHang(true)
		promise = map.putRaw(key, val)
		await T.delay(50)
		promise.cancel()
		// -> unhandledRejection event
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel raw put after 50ms (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		pot.setHang(true)
		promise = map.putRaw(key, val)
		await T.delay(40)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	await T.delay(1)

	T.log("• cancel raw put immediately (.catch)")
	try {
		map = await pot.new()
		pot.setHang(true)
		promise = map.putRaw(key, val)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(1)

	T.log("• cancel raw put after 50ms (.catch)")
	try {
		map = await pot.new()
		pot.setHang(true)
		promise = map.putRaw(key, val)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(70)

	T.log("• cancel wrong promise (.catch)")
	try {
		map = await pot.new()
		pot.setHang(true)
		// chaining the .catch immediatelly gives the wrong promise for cancel().
		promise = map.putRaw(key, val).catch(e => T.attestMissingError(t0, T))
		promise.cancel()
	} catch(err) {
		T.attestExpectedError(t0, T, err, "is not a function")
	}

	await T.delay(10)

	// ---------------------------------------------------------------------

	T.start("Cancel get()")

	T.log("• cancel get immediately (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.get(key)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel get immediately (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.get(key)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	await T.delay(1)

	T.log("• cancel get after 50ms (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.get(key)
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel get after 50ms (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.get(key)
		await T.delay(40)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	T.log("• cancel get immediately (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.get(key)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(1)

	T.log("• cancel get after 50ms (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.get(key)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(70)

	T.log("• cancel wrong promise (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		// chaining the .catch immediatelly gives the wrong promise for cancel().
		promise = map.get(key).catch(e => T.attestMissingError(t0, T))
		promise.cancel()
	} catch(err) {
		T.attestExpectedError(t0, T, err, "is not a function")
	}

	await T.delay(10)


	// ---------------------------------------------------------------------

	T.start("Cancel raw get")

	T.log("• cancel raw get immediately (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getRaw(key)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel raw get immediately (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getRaw(key)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	await T.delay(1)

	T.log("• cancel raw get after 50ms (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getRaw(key)
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel raw get after 50ms (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getRaw(key)
		await T.delay(40)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	T.log("• cancel raw get immediately (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getRaw(key)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(1)

	T.log("• cancel raw get after 50ms (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getRaw(key)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(70)

	T.log("• cancel wrong promise (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		// chaining the .catch immediatelly gives the wrong promise for cancel().
		promise = map.getRaw(key).catch(e => T.attestMissingError(t0, T))
		promise.cancel()
	} catch(err) {
		T.attestExpectedError(t0, T, err, "is not a function")
	}

	await T.delay(10)


	// ---------------------------------------------------------------------

	T.start("Cancel getBoolean()")

	T.log("• cancel getBoolean() immediately (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getBoolean(key)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel getBoolean() immediately (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getBoolean(key)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	await T.delay(1)

	T.log("• cancel getBoolean() after 50ms (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getBoolean(key)
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel getBoolean() after 50ms (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getBoolean(key)
		await T.delay(40)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	T.log("• cancel getBoolean() immediately (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getBoolean(key)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(1)

	T.log("• cancel getBoolean() after 50ms (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getBoolean(key)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(70)

	T.log("• cancel wrong promise (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		// chaining the .catch immediatelly gives the wrong promise for cancel().
		promise = map.getBoolean(key).catch(e => T.attestMissingError(t0, T))
		promise.cancel()
	} catch(err) {
		T.attestExpectedError(t0, T, err, "is not a function")
	}

	await T.delay(10)


	// ---------------------------------------------------------------------

	T.start("Cancel getNumber()")

	T.log("• cancel getNumber() immediately (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getNumber(key)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel getNumber() immediately (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getNumber(key)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	await T.delay(1)

	T.log("• cancel getNumber() after 50ms (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getNumber(key)
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel getNumber() after 50ms (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getNumber(key)
		await T.delay(40)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	T.log("• cancel getNumber() immediately (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getNumber(key)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(1)

	T.log("• cancel getNumber() after 50ms (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getNumber(key)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(70)

	T.log("• cancel wrong promise (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		// chaining the .catch immediatelly gives the wrong promise for cancel().
		promise = map.getNumber(key).catch(e => T.attestMissingError(t0, T))
		promise.cancel()
	} catch(err) {
		T.attestExpectedError(t0, T, err, "is not a function")
	}

	await T.delay(10)


	// ---------------------------------------------------------------------

	T.start("Cancel getString()")

	T.log("• cancel getString() immediately (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getString(key)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel getString() immediately (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getString(key)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	await T.delay(1)

	T.log("• cancel getString() after 50ms (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getString(key)
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel getString() after 50ms (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getString(key)
		await T.delay(40)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	T.log("• cancel getString() immediately (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getString(key)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(1)

	T.log("• cancel getString() after 50ms (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.getString(key)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(70)

	T.log("• cancel wrong promise (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		// chaining the .catch immediatelly gives the wrong promise for cancel().
		promise = map.getString(key).catch(e => T.attestMissingError(t0, T))
		promise.cancel()
	} catch(err) {
		T.attestExpectedError(t0, T, err, "is not a function")
	}

	await T.delay(10)


	// ---------------------------------------------------------------------

	T.start("Cancel delete()")

	T.log("• cancel delete immediately (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.delete(key)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel delete immediately (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.delete(key)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	await T.delay(1)

	T.log("• cancel delete after 50ms (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.delete(key)
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel delete after 50ms (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.delete(key)
		await T.delay(40)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	T.log("• cancel delete immediately (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.delete(key)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(1)

	T.log("• cancel delete after 50ms (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.delete(key)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(70)

	T.log("• cancel wrong promise (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		// chaining the .catch immediatelly gives the wrong promise for cancel().
		promise = map.delete(key).catch(e => T.attestMissingError(t0, T))
		promise.cancel()
	} catch(err) {
		T.attestExpectedError(t0, T, err, "is not a function")
	}

	await T.delay(10)

	// ---------------------------------------------------------------------

	T.start("Cancel save()")

	T.log("• cancel save immediately (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.save()
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel save immediately (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.save()
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	await T.delay(1)

	T.log("• cancel save after 50ms (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.save()
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel save after 50ms (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.save()
		await T.delay(40)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	T.log("• cancel save immediately (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.save()
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(1)

	T.log("• cancel save after 50ms (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		promise = map.save()
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(70)

	T.log("• cancel wrong promise (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		pot.setHang(true)
		// chaining the .catch immediatelly gives the wrong promise for cancel().
		promise = map.save().catch(e => T.attestMissingError(t0, T))
		promise.cancel()
	} catch(err) {
		T.attestExpectedError(t0, T, err, "is not a function")
	}

	await T.delay(10)

	// ---------------------------------------------------------------------

	T.start("Cancel load()")

	T.log("• cancel load immediately (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		await map.put(key, val)
		ref = await map.save()
		pot.setHang(true)
		promise = pot.load(ref, bee_url, batch_id)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel load immediately (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		await map.put(key, val)
		ref = await map.save()
		pot.setHang(true)
		promise = pot.load(ref, bee_url, batch_id)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	await T.delay(1)

	T.log("• cancel load after 50ms (try-catch)")
	// ·····································································
	expectedUncaughtRejection = "context canceled"
	// ·····································································
	try {
		map = await pot.new()
		await map.put(key, val)
		ref = await map.save()
		pot.setHang(true)
		promise = pot.load(ref, bee_url, batch_id)
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}
	await T.delay(1)
	// ·····································································
	expectedUncaughtRejection = null
	// ·····································································

	T.log("• cancel load after 50ms (try-await-catch, cancel by timer)")
	try {
		map = await pot.new()
		await map.put(key, val)
		ref = await map.save()
		pot.setHang(true)
		promise = pot.load(ref, bee_url, batch_id)
		await T.delay(40)
		setTimeout(promise.cancel, 10)
		await promise
	} catch(err) {
		T.attestExpectedError(t0, T, err, "canceled")
	}

	T.log("• cancel load immediately (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		ref = await map.save()
		pot.setHang(true)
		promise = pot.load(ref, bee_url, batch_id)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(1)

	T.log("• cancel load after 50ms (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		ref = await map.save()
		pot.setHang(true)
		promise = pot.load(ref, bee_url, batch_id)
		// note, chaining the .catch immediatelly above would give the wrong promise for cancel().
		promise
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "context canceled"))
		await T.delay(50)
		promise.cancel()
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	await T.delay(70)

	T.log("• cancel wrong promise (.catch)")
	try {
		map = await pot.new()
		await map.put(key, val)
		ref = await map.save()
		pot.setHang(true)
		// chaining the .catch immediatelly gives the wrong promise for cancel().
		promise = pot.load(ref, bee_url, batch_id).catch(e => T.attestMissingError(t0, T))
		promise.cancel()
	} catch(err) {
		T.attestExpectedError(t0, T, err, "is not a function")
	}

	await T.delay(10)
}


async function TestPotKvs_InternalErrors(T, bee_url, batch_id) {

	T.head("Internal Error Conditions")

	T.log("This suite tests how errors are propagated.")

	T.start("Panic in promise executor (.catch)")

	T.log("• create panicking test promise and catch it (.catch)")
	try {
		pot.panickingPromise()
			.then(()=>T.attestMissingError(t0, T))
			.catch((err)=>T.attestExpectedError(t0, T, err, "### panic in panickingPromise executor: test panic of panickingPromise"))
		await T.delay(100)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.start("Panic in promise executor (try-catch)")

	T.log("• create panicking test promise and catch it (try-catch)")
	try {
		await pot.panickingPromise()
		T.attestMissingError(t, T)
	} catch(err) {
		T.attestExpectedError(t0, T, err, "### panic in panickingPromise executor: test panic of panickingPromise")
	}
}


async function TestPotKvs_MassSequentialSync(T, bee_url, batch_id) {

	T.head("Mass Access")

	if(bee_url && !T.NODE) {
		T.log("No sequential cases for in-browser network mode.")
		return
	}

	T.start("sync store and retrieve "+massmax+" values sequentially, w/o save")

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	k = []
	v = []

	T.log("• store "+massmax+" random values under random keys")
	for(let i=0; i<massmax; i++) {
		k.push(key = pot.randKey())
		v.push(val = pot.randValue())
		e = map.putSync(key, val)
		T.assertNotAnError(t0, T, e, true) // suppress ok
	}
	T.attestNoError(t0, T)

	T.log("• retrieve "+massmax+" random values under random keys")
	for(let i=0; i<massmax; i++) {
		val = map.getSync(k[i])
		T.assertEqual(t0, T, val, v[i], true) // suppress ok
	}
	T.attestNoError(t0, T)


	T.start("sync store and retrieve "+massmax+" values sequentially, with save")

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	k = []
	v = []

	T.log("• store "+massmax+" random values under random keys")
	for(let i=0; i<massmax; i++) {
		k.push(key = pot.randKey())
		v.push(val = pot.randValue())
		e = map.putSync(key, val)
		T.assertNotAnError(t0, T, e, true) // suppress ok
	}
	T.attestNoError(t0, T)

	T.log("• save")
	try {
		ref = await map.save()
		T.assertNotAnError(t0, T, ref)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• retrieve "+massmax+" random values under random keys")
	for(let i=0; i<massmax; i++) {
		val = map.getSync(k[i])
		T.assertEqual(t0, T, val, v[i], true) // suppress ok
	}
	T.attestNoError(t0, T)


	T.start("sync store and retrieve "+massmax+" values sequentially, with save & load")

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	k = []
	v = []

	T.log("• store "+massmax+" random values under random keys")
	for(let i=0; i<massmax; i++) {
		k.push(key = pot.randKey())
		v.push(val = pot.randValue())
		e = map.putSync(key, val)
		T.assertNotAnError(t0, T, e, true) // suppress ok
	}
	T.attestNoError(t0, T)

	T.log("• save")
	var ref
	try {
		ref = await map.save()
		T.log("ref: " + ref)
		T.assertNotAnError(t0, T, ref)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• load " + ref)
	var map2
	try {
		map2 = await pot.load(ref, bee_url, batch_id)
		T.assertNotAnError(t0, T, map2)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• retrieve "+massmax+" random values under random keys")
	for(let i=0; i<massmax; i++) {
		val = map2.getSync(k[i])
		T.assertEqual(t0, T, val, v[i], true) // suppress ok
	}
	T.attestNoError(t0, T)

	T.start("sync store and retrieve "+massmax+" values sequentially, reverse, with save & load")

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	k = []
	v = []

	T.log("• store "+massmax+" random values under random keys")
	for(let i=0; i<massmax; i++) {
		k.push(key = pot.randKey())
		v.push(val = pot.randValue())
		e = map.putSync(key, val)
		T.assertNotAnError(t0, T, e, true) // suppress ok
	}
	T.attestNoError(t0, T)

	T.log("• save")
	var ref
	try {
		ref = await map.save()
		T.assertNotAnError(t0, T, ref)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• load")
	var map2
	try {
		map2 = await pot.load(ref, bee_url, batch_id)
		T.assertNotAnError(t0, T, map2)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• reverse retrieve of "+massmax+" random values under random keys")
	for(let i=massmax-1; i>=0; i--) {
		val = map2.getSync(k[i])
		T.assertEqual(t0, T, val, v[i], true) // suppress ok
	}
	T.attestNoError(t0, T)


	T.start("sync store and retrieve "+massmax+" values sequentially, random order, with save & load")

	T.log("• new map")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	k = []
	v = []

	T.log("• store "+massmax+" random values under random keys")
	for(let i=0; i<massmax; i++) {
		k.push(key = pot.randKey())
		v.push(val = pot.randValue())
		e = map.putSync(key, val)
		T.assertNotAnError(t0, T, e, true) // suppress ok
	}
	T.attestNoError(t0, T)

	T.log("• save")
	var ref

	try {
		ref = await map.save()
		T.assertNotAnError(t0, T, ref)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• load")
	var map2
	try {
		map2 = await pot.load(ref, bee_url, batch_id)
		T.assertNotAnError(t0, T, map2)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• random retrieve of "+massmax+" random values under random keys")
	let plog = ""
	for(let i=massmax-1; i>=0; i--) {
		j = Math.floor(Math.random() * (i+1))
		plog += j + "/" + i + " "
		if(!(i%10)) {
			T.log()
			T.log("⟶   " + plog)
			T.log()
			plog = ""
		}
		val = map2.getSync(k[j])
		T.assertEqual(t0, T, val, v[j], true) // suppress ok
		k.splice(j,1)
		v.splice(j,1)
	}
	T.attestNoError(t0, T)
}


async function TestPotKvs_MassSequentialAsync(T, bee_url, batch_id) {

	T.head("Mass Access / Async")

	T.start("async store and retrieve "+massmax+" values sequentially, w/o save")

	T.log("• new map")
	map = await pot.new(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	k = []
	v = []

	T.log("• store "+massmax+" random values under random keys")
	for(let i=0; i<massmax; i++) {
		k.push(key = pot.randKey())
		v.push(val = pot.randValue())
		e = await map.put(key, val)
		T.assertNotAnError(t0, T, e, true) // suppress ok
	}
	T.attestNoError(t0, T)

	T.log("• retrieve "+massmax+" random values under random keys")
	for(let i=0; i<massmax; i++) {
		val = await map.get(k[i])
		T.assertEqual(t0, T, val, v[i], true) // suppress ok
	}
	T.attestNoError(t0, T)


	T.start("async store and retrieve "+massmax+" values sequentially, with save")

	T.log("• new map")
	map = await pot.new(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	k = []
	v = []

	T.log("• store "+massmax+" random values under random keys")
	for(let i=0; i<massmax; i++) {
		k.push(key = pot.randKey())
		v.push(val = pot.randValue())
		e = await map.put(key, val)
		T.assertNotAnError(t0, T, e, true) // suppress ok
	}
	T.attestNoError(t0, T)

	T.log("• save")
	try {
		ref = await map.save()
		T.assertNotAnError(t0, T, ref)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• retrieve "+massmax+" random values under random keys")
	for(let i=0; i<massmax; i++) {
		val = await map.get(k[i])
		T.assertEqual(t0, T, val, v[i], true) // suppress ok
	}
	T.attestNoError(t0, T)


	T.start("async store and retrieve "+massmax+" values sequentially, with save & load")

	T.log("• new map")
	map = await pot.new(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	k = []
	v = []

	T.log("• store "+massmax+" random values under random keys")
	for(let i=0; i<massmax; i++) {
		k.push(key = pot.randKey())
		v.push(val = pot.randValue())
		e = await map.put(key, val)
		T.assertNotAnError(t0, T, e, true) // suppress ok
	}
	T.attestNoError(t0, T)

	T.log("• save")
	var ref
	try {
		ref = await map.save()
		T.log("ref: " + ref)
		T.assertNotAnError(t0, T, ref)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• load " + ref)
	var map2
	try {
		map2 = await pot.load(ref, bee_url, batch_id)
		T.assertNotAnError(t0, T, map2)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• retrieve "+massmax+" random values under random keys")
	for(let i=0; i<massmax; i++) {
		val = await map2.get(k[i])
		T.assertEqual(t0, T, val, v[i], true) // suppress ok
	}
	T.attestNoError(t0, T)


	T.start("async store and retrieve "+massmax+" values sequentially, reverse, with save & load")

	T.log("• new map")
	map = await pot.new(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	k = []
	v = []

	T.log("• store "+massmax+" random values under random keys")
	for(let i=0; i<massmax; i++) {
		k.push(key = pot.randKey())
		v.push(val = pot.randValue())
		e = await map.put(key, val)
		T.assertNotAnError(t0, T, e, true) // suppress ok
	}
	T.attestNoError(t0, T)

	T.log("• save")
	var ref
	try {
		ref = await map.save()
		T.assertNotAnError(t0, T, ref)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• load")
	var map2
	try {
		map2 = await pot.load(ref, bee_url, batch_id)
		T.assertNotAnError(t0, T, map2)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• reverse retrieve of "+massmax+" random values under random keys")
	for(let i=massmax-1; i>=0; i--) {
		val = await map2.get(k[i])
		T.assertEqual(t0, T, val, v[i], true) // suppress ok
	}
	T.attestNoError(t0, T)


	T.start("async store and retrieve "+massmax2+" values sequentially, random order, with save & load")

	T.log("• new map")
	map = await pot.new(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	k = []
	v = []

	T.log("• store "+massmax2+" random values under random keys")
	for(let i=0; i<massmax2; i++) {
		k.push(key = pot.randKey())
		v.push(val = pot.randValue())
		e = await map.put(key, val)
		T.assertNotAnError(t0, T, e, true) // suppress ok
	}
	T.attestNoError(t0, T)

	T.log("• save")
	var ref

	try {
		ref = await map.save()
		T.assertNotAnError(t0, T, ref)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• load")
	var map2
	try {
		map2 = await pot.load(ref, bee_url, batch_id)
		T.assertNotAnError(t0, T, map2)
	} catch(err) {
		T.attestUnexpectedError(t0, T, err)
	}

	T.log("• random retrieve of "+massmax2+" random values under random keys")
	let plog = ""
	for(let i=massmax2-1; i>=0; i--) {
		j = Math.floor(Math.random() * (i+1))
		plog += j + "/" + i + " "
		if(!(i%10)) {
			T.log()
			T.log("⟶   " + plog)
			T.log()
			plog = ""
		}
		val = await map2.get(k[j])
		T.assertEqual(t0, T, val, v[j], true) // suppress ok
		k.splice(j,1)
		v.splice(j,1)
	}
	T.attestNoError(t0, T)
}

// Testing failure modes: internal error (returned), and Go panic.
async function TestPotKvs_Failures(T, bee_url, batch_id) {

	T.head("Failures", pot.testMode() != "simulation")

	if(pot.testMode() != "simulation") {
		T.log("Failure tests are available in `simulation` test mode. Use `make web_sim_test` or `make node_sim_test`.")
		return
	}

	// (This comes out as note right under the case head)
	T.log("Testing wether all error condition types are contained and don't bring down the Go executable.")


	if(!T.NODE) { // cf. printout below why this is left out in node.

		T.start("pot initialization failure")

		T.log("Using pot before wasm streaming initialization is complete.")
		T.log("NOTE THAT THIS TEST MIGHT FAIL without good cause if the" +
			" streaming completes so fast that the test cannot interject.")
		T.log(" This test adds the information how the error looks if the" +
			" failure happens, and that the test code as an example can" +
			" catch it.")
		{

			const go = new Go()
			potbak = pot
			pot = {}

			pot.start = new Promise((resolve, reject) => {
				WebAssembly.instantiateStreaming(fetch("../lib/pot.wasm"), go.importObject)
					.then((r) => { go.run(r.instance) ; resolve(pot) })
					.catch((e) => { reject(e) })
			})

			pot.ready = () => { return pot.start }

			// too early, fail. MIGHT SOMETIMES SUCCEED:
			// In case this error unintentionally succeeds,
			// cut it.
			T.log("• new map (first attempt, before pot is ready)")
			try {
				pot.newSync(bee_url, batch_id)
				T.attestMissingError(t0, T)
			} catch(err) {
				T.attestExpectedError(t0, T, err)
			}

			await pot.ready()

			// .. should work now
			T.log("• new map (second attempt, after pot is ready)")
			try {
				pot.newSync(bee_url, batch_id)
				T.attestNoError(t0, T)
			} catch(err) {
				T.attestUnexpectedError(t0, T, err)
			}

			// re original instance
			pot = potbak
		}
	}


	T.start("new map creation failure conditions")

	// happy path
	T.log("• new map, synchronous happy path")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	// fail synchronously
	T.log("• new map synchronous call failure")
	pot.setFail(true)
	map = pot.newSync(bee_url, batch_id)
	T.assertError(t0, T, map)

	// fail asynchronously
	T.log("• new map asynchronous call failure")
	pot.setFail(true)
	try {
		map = await pot.new(bee_url, batch_id)
		T.attestMissingError(t0, T)
	} catch(err) {
		T.attestExpectedError(t0, T, err)
	}

	// panic synchronously
	T.log("• new map synchronous call panic")
	pot.setPanic(true)
	map = pot.newSync(bee_url, batch_id)
	T.assertError(t0, T, map)

	// panic asynchronously
	T.log("• new map asynchronous call panic")
	pot.setPanic(true)
	try {
		map = await pot.new(bee_url, batch_id)
		T.attestMissingError(t0, T)
	} catch(err) {
		T.attestExpectedError(t0, T, err)
	}


	T.start("put - failure conditions")

	key1 = "kappa 1"
	val1 = "gamma 1"

	// happy path
	T.log("• new map, synchronous")
	map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	T.log("• put " + key1 + ": " + val1)
	err = map.putRawSync(key1, val1)
	T.assertNoError(t0, T, err)

	// fail raw synchronously
	T.log("• put raw - synchronous call failure")
	pot.setFail(true)
	err = map.putRawSync(key1, val1)
	T.assertError(t0, T, err, /mock fail/)

	// fail typed synchronously
	T.log("• put typed - synchronous call failure")
	pot.setFail(true)
	err = map.putSync(key1, val1)
	T.assertError(t0, T, err, /mock fail/)

	// fail typed asynchronously
	T.log("• put typed - asynchronous (promise) call failure")
	pot.setFail(true)
	try {
		err = await map.put(key1, val1)
		T.attestMissingError(t0, T)
	} catch(err) {
		T.assertError(t0, T, err, /mock fail/)
	}

	// panic raw synchronously
	T.log("• put raw sync - panic")
	pot.setPanic(true)
	err = map.putRawSync(key1, val1)
	T.assertError(t0, T, err, /mock panic/)

	// panic typed synchronously
	T.log("• put - synchronous call panic")
	pot.setPanic(true)
	try {
		err = map.putSync(key1, val1)
		T.assertError(t0, T, err, /mock panic/)
	} catch(err) {
		T.assertError(t0, T, err, /mock panic/)
	}

	// panic asynchronously
	T.log("• put - asynchronous call panic")
	pot.setPanic(true)
	try {
		err = await map.put(key1, val1)
		T.attestMissingError(t0, T)
	} catch(err) {
		T.assertError(t0, T, err, /mock panic/)
	}
}


async function TestPotKvs_Stress(T, bee_url, batch_id, iterations) {


	T.head("Oversize Value")

	T.start("Oversize Value")

	maxSize = pot.setValueSizeLimit()

	T.log("max value size is " + maxSize)

	T.log("• " + maxSize + " byte sized value should pass (async)")
	let key1 = "A"
	let val1 = pot.randBuffer(maxSize)

	map = await pot.new(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	T.log("• put " + maxSize + " byte buffer raw " + key1)
	let err = await map.putRaw(key1, val1)
	T.assertNoError(t0, T, err)

	T.log("• get " + maxSize + " byte buffer raw " + key1)
	val = await map.getRaw(key1)
	T.assertEqual(t0, T, val, val1)

	T.log("• " + maxSize + "+1 byte sized value should be stopped (async)")
	let key2 = "B"
	let val2 = pot.randBuffer(maxSize+1)

	let map2 = await pot.new(bee_url, batch_id)
	T.assertNoError(t0, T, !map2)

	T.log("• put " + (maxSize+1) + " byte buffer raw " + key2)
	T.assertNoError(t0, T, !map2)

	try {
		let err = await map2.putRaw(key2, val2)
		T.attestMissingError(t0, T)
	} catch(err) {
		T.assertError(t0, T, err, /value too large/)
	}


	T.head("Concurrent Access, " + iterations + " iterations")

	if(!(bee_url && !T.NODE))
	{

		T.start("store and retrieve "+iterations+" values concurrently, sync calls in async blocks")

		T.log("• new map")
		let map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• concurrently store and retrieve "+iterations+" random values under random keys")
		let group = 0
		for(let i=0; i<iterations; i++) {
			await T.delay(0)
			; (async() => {
				let t = i+1
				try {
					group++
					let key = pot.randKey()
					let val = pot.randValue()
					let e = map.putSync(key, val, 0, t)
					T.assertNoError(t, T, e, true) // suppress ok
					await T.delay(3*t % 1000)
					let res = map.getSync(key, 0, t)
					T.attestNoError(t, T, true) // suppress ok
					T.assertEqual(t, T, res, val, true) // suppress ok
					group--
				} catch(err) {
					T.attestUnexpectedError(t, T, err)
					group--
				}
			})()
		}

		await T.completion(null, T, ()=>{return group}, 100, 10000)

		T.log("• save")

		try {
			ref = await map.save()
			T.assertNotAnError(t0, T, ref)
		} catch(err) {
			T.attestUnexpectedError(t0, T, err)
		}

		await T.delay(100)
	}{

		T.start("store and retrieve "+iterations+" values concurrently, blocking promise calls in async blocks")

		timeout = iterations * 100

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• store and retrieve "+iterations+" random values under random keys")
		let group = 0
		for(let i=0; i<iterations; i++) {
			await T.delay(1)
			; (async() => {
				let t = i+1
				let box = T.box
				try {
					group++
					let key = pot.randKey()
					let val = pot.randValue()
					let e = await map.put(key, val, 0, t)
					T.assertNoError(t, T, e, true, box) // suppress ok
					await T.delay(t % 1000)
					let res = await map.get(key, 0, t)
					T.attestNoError(t, T, true, box) // suppress ok
					T.assertEqual(t, T, res, val, true, box) // suppress ok
					group--
				} catch(err) {
					T.attestUnexpectedError(t, T, err, box)
					group--
				}
			})()
		}

		await T.completion(null, T, ()=>{return group}, 1000, timeout)

	}{

		T.start("store, save, and retrieve "+iterations+" values concurrently, blocking promise calls in async blocks")

		timeout = iterations * 100

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• store and retrieve "+iterations+" random values under random keys")
		let group = 0
		for(let i=0; i<iterations; i++) {
			; (async() => {
				let t = i+1
				let box = T.box
				try {
					group++
					let key = pot.randKey()
					let val = pot.randValue()
					let e = await map.put(key, val, 0, t)
					T.assertNoError(t, T, e, true, box) // suppress ok
					ref = await map.save()
					T.assertNotAnError(t0, T, ref)
					let res = await map.get(key, 0, t)
					T.attestNoError(t, T, true, box) // suppress ok
					T.assertEqual(t, T, res, val, true, box) // suppress ok
					group--
				} catch(err) {
					T.attestUnexpectedError(t, T, err, box)
					group--
				}
			})()
		}

		await T.completion(null, T, ()=>{return group}, 1000, timeout)

	}{

		T.start("store and retrieve "+iterations+" of adjacent keys concurrently, blocking promise calls in async blocks")

		timeout = iterations * 100

		T.log("• new map")
		map = pot.newSync(bee_url, batch_id)
		T.assertNoError(t0, T, !map)

		T.log("• store and retrieve "+iterations+" of adjacent keys with random values")
		let group = 0
		for(let i=0; i<iterations; i++) {
			; (async() => {
				let t = i+1
				let box = T.box
				try {
					group++
					let key = new Uint8Array([i % 256, Math.floor(i / 256) % 256, Math.floor(i / 256 / 256) % 256, Math.floor(i / 256 / 256 / 256)])
					T.log("key: ", T.hex(key))
					let val = pot.randValue()
					let e = await map.put(key, val, 0, t)
					T.assertNoError(t, T, e, true, box) // suppress ok
					let res = await map.get(key, 0, t)
					T.attestNoError(t, T, true, box) // suppress ok
					T.assertEqual(t, T, res, val, true, box) // suppress ok
					group--
				} catch(err) {
					T.attestUnexpectedError(t, T, err, box)
					group--
				}
			})()
		}

		await T.completion(null, T, ()=>{return group}, 1000, timeout)
	}
}


async function TestPotKvs_Release(T, bee_url, batch_id, iterations, suite, tag, log_level) {

	T.head("Resource Release / Memory Leak Tests")

	if(suite=="all") suite = null

	// Maximum number of repeat runs when a test overruns the expected
	// threshold of bytes lost per iteration (many cases have >1 allowed)
	maxloop = iterations < 10001 ? 1 : 5

	// pot.setOptimization(false) // this will let the Go heap grow as resources are not released

	T.log("These tests automate memory leak checking to complement visual examination of heap size curves. ")
	T.log()
	if(tag == "ext-api") {
		T.log("This particular test run (ext-api) test POT JS alone, it simulates storage functionality with no-op stub functions. Nothing is actually stored in this run and therefore the Go heap should not increase. Go POT (proximity-order-trie) is not used in any way and leaks observed, if, will solely be caused by POT JS. The Go heap margin is therefore 1 byte per iteration. The JS heap received more lenient 10 bytes as it handles the test itself but should ideally be close to 0, too, the closer the more iterations are performed. ")
		T.log()
	}
	T.log("The leak test algorithm compares minimas of minimas of the beginning with the end of a run of x iterations. The minima can be assumed to be caused by garbage collector runs, for which there is no direct way to be informed about. The minimum of these minima towards the end of the run is compared with the minimum of minimas at the beginning of the run to make a best estimate what heap growth effectively might have taken place. There are limits to this approach because it can measure pure noise as can be seen from the occasional negative growth that is being reported. Anything below 100,000 iterations is of limited use. Failed runs can be repeated and if one run succeeds it justifies the assumption that there is no leak and the error signal was noise due to the unspecified behavior of the garbage collectors. ")
	T.log()
	T.log("The comparison of minima of minima is between the lowest values of the first fifth and the last fifth. Beforehand, all initial minima that are above average are cut to compensate for potential residual elevated heap sizes from unrelated activity before the start of the specific test case. Also at least the first tenth, or the first 30 minima are cut. All values, including those cut, are shown in the bar chart given before the calculated leak. The calculation of leakage per iteration is thus approximate as the difference between the two picked minima is simply divided by the number of iterations. Note that all values are minima: not all measurements of all iterations are included but only those that were lower than the measurement before, presumably right after a garbage collection took place. This yields the most useful approach to automate the leak tests. ")
	T.log()
	T.log(" |-cut-|== first 5th ==|------------|------------|------------|== last 5th ==| ")
	T.log()
	T.log("The allowed heap growth is in-memory and test overhead, and to account for unspecified GC behavior. Still, anything different than 0 is not really satisfactory, except for the Go heap after ‹inmem› runs. ")
	T.log()
	T.log("Test results also allow for visual examination as backup. Measurements should stay within a recurring range that does not shift upwards. Very small growth can be difficult to see. If it persists over multiple runs the algorithm should be trusted to be indicating a leak. ")

	log_level = log_level ?? pot.ERROR

	if (!suite || suite.includes("gc-response")) {

		T.start("JS Garbage Collector Response Test")

		T.log("Testing the Javacsript garbage collector with dummy data to see if a release is detectable in the first place.")

		let beaconCollected = false
		let stop = false
		let counter = 0

		const registry = new FinalizationRegistry(() => {
			T.log(`• iterations: ${counter} - beacon garbage collected`)
			beaconCollected = true
		})

		registry.register(["garbage collection beacon"]) // the dummy

		T.log("Allocate new empty function arrays until a dummy string is collected and released")

		// CPS style loop
		;(function allocateMemory() {

			// allocate a chunk of memory: 100,000 arrays elements
			// with empty functions as blind text.
			Array.from({ length: 100_000 }, () => () => {})

			counter++

			if (stop || beaconCollected) return

			// Use setTimeout to loop continuation passing style to
			// make each allocation a different job, so the JS GC
			// can fire inbetween.
			setTimeout(allocateMemory)
		})()

		T.log("▣ main job complete")

		// wait until beacon is collected. Show counter every second.
		// Time out after 10 seconds.
		await T.completion2(null, T, ()=>beaconCollected, ()=>counter, 1000, 10000)
		stop = true
	}

	if (!suite || suite.includes("gc-kvs-detection")) {

		T.start("KVS Garbage Collector Test")

		T.log("Note this will time out if the KVS is reachable on the Go side, which would prevent its collection.")

		let cannary = pot.newSync(bee_url, batch_id)
		let cannary_ref = cannary.slot_ref
		let stack = new Array()
		let beaconCollected = false
		let stop = false
		let counter = 0

		const registry = new FinalizationRegistry(() => {
			T.log(`• iterations: ${counter} - KVS garbage collected`)
			beaconCollected = true;
		});

		registry.register(pot.newSync(bee_url, batch_id)) // the KVS to be collected

		T.log("• Allocate memory until the KVS is garbage collected and released")

		;(async function allocateMemory() {

			await T.delay(0) // yield to cleanly stop

			if (stop || beaconCollected) return;

			// allocate a chunk of memory: 1,000,000 array elements
			// with empty functions as blind text.
			T.log("  allocating memory chunk #" + counter++)
			Array.from({ length: 1_000_000 }, () => () => {});

			// Trigger the Go GC to make sure the KVS handle is
			// collected on the go side.
			pot.gc()

			// Use setTimeout to loop continuation passing style to
			// make each allocation a different job, so the JS GC
			// can fire inbetween.
			setTimeout(allocateMemory);
		})();

		T.log("▣ main job complete")

		// wait until beacon is collected. Show counter every second.
		// Time out after 3 seconds.
		await T.completion2(null, T, ()=>beaconCollected, ()=>counter, 1_000, 3_000)
		stop = true
		await T.delay(0) // yield

		// This one shuld not have been collected.
		T.log("• Reachable KVS survives")
		T.assertEqual(t0, T, cannary.slot_ref, cannary_ref) 
	}


	if (!suite || suite.includes("gc-kvs-creation")) {

		T.start("Sync KVS Creation Leak Test")

		T.log("• leak test — "+iterations+" iterations")

		// limits empirical - github IC test logs 1.0.8 iterations
		// A .A-logs_57077246725-in-memory-leak-ubuntu.txt
		// B .B-logs_57076486965-in-memory-leak-ubuntu.txt
		// C .C-logs_57077246725-swarm-integration-ubuntu.txt
		// D .D-logs_57076307278-in-memory-leak-macos.txt

		let max = iterations
		let jsLimit = 0 // B 2,0 C 4 D 6,0
		let goLimit = 0 // B 0,-1 C 15! D 3,0

		if(tag == "loc-net") { jsLimit = 1000; goLimit = 1000 }

		T.log("  allocate and release "+iterations+" KVSs, check memory")

		for (let loop = 1; loop <= maxloop; loop++) {

			T.log("• test run #" + loop)

			let counter = 0

			let verb = pot.setVerbosity(log_level)

			if(tag == "in-mem") {
				T.log("  purge in-memory storage to start from a minimum Go heap size")
				pot.purge()
			}

			T.log("  trigger Go GC to start from a minimum Go heap size")
			pot.gc()

			let jsHeap0 = 0
			let goHeap0 = 0
			let jsMinima = new Array()
			let goMinima = new Array()

			;(async function allocate() {

				await T.delay(0) // yield to cleanly stop

				if (counter++ >= max) {
					process.stdout.write("\n")
					return
				}

				// create a new KVS and let it go out of scope
				let kvs = pot.newSync(bee_url, batch_id)

				 // log overriding status
				if(log_level <= pot.ERROR)
					process.stdout.write(`${potlogmargin}  ${counter}/${max} `.padEnd(16+potlogmargin.length) + pot.profile() + "\r")
					// console.log(`${potlogmargin}  ${counter}/${max} `.padEnd(16+potlogmargin.length) + pot.profile())

				// Go GC trigger every 1,000 iterations
				if (counter % 1000 == 0) {
					pot.prune()
					pot.gc()
					pot.gc()

					if(tag == "loc-net" && counter < max) {
						pot.setVerbosity(verb)
						checkMinima(T, "JS", counter, [...jsMinima], jsLimit, true)
						checkMinima(T, "Go", counter, [...goMinima], goLimit, true)
						pot.setVerbosity(log_level)
					}
				}

				// track heap size
				let goHeap = pot.getGoHeapSize()
				let jsHeap = pot.getJSHeapSize()

				if (jsHeap < jsHeap0)
					jsMinima.push(jsHeap)

				if (goHeap < goHeap0)
					goMinima.push(goHeap)

				jsHeap0 = jsHeap
				goHeap0 = goHeap

				// Use setTimeout to loop continuation passing style to
				// make each allocation a different job, so the JS GC
				// can fire inbetween.
				setTimeout(allocate);
			})();

			T.log("▣ main job complete")

			// wait until beacon is collected. No counter, no timout.
			await T.completion2(null, T, ()=>{ return counter >= max }, null, 1_000)

			await T.delay(100) // yield to give GC release messages a chance

			pot.setVerbosity(verb)

			ok1 = checkMinima(T, "JS", iterations, jsMinima, jsLimit, false, loop == maxloop)
			ok2 = checkMinima(T, "Go", iterations, goMinima, goLimit, false, loop == maxloop)

			if (ok1 && ok2) break;
		}
	}


	if (!suite || suite.includes("gc-put-sync")) {

		T.start("Sync Put Leak Test")

		T.log("• leak test — "+iterations+" iterations")

		let max = iterations
		let jsLimit = 0 // B 0 C 1 D -1
		let goLimit = tag == "ext-api" ? 0 : bee_url ? 0 : 200 // A 186 B 183 C -1 D 187

		if(tag == "loc-net") { jsLimit = 1000; goLimit = 1000 }

		T.log("  put(i, i) synchronously, check memory")

		for (let loop = 1; loop <= maxloop; loop++) {

			T.log("• test run #" + loop)

			let counter = 0

			let verb = pot.setVerbosity(log_level)

			if(tag == "in-mem") {
				T.log("  purge in-memory storage to start from a minimum Go heap size")
				pot.purge()
			}

			T.log("  trigger Go GC to start from a minimum Go heap size")
			pot.gc()

			let jsHeap0 = 0
			let goHeap0 = 0
			let jsMinima = new Array()
			let goMinima = new Array()

			let kvs = pot.newSync(bee_url, batch_id)

			;(async function allocate() {

				await T.delay(0) // yield to cleanly stop

				if (counter++ >= max) {
					process.stdout.write("\n")
					return
				}

				if(tag == "ext-api") pot.setNoop(true)
				kvs.putSync(counter, counter)
				T.log(" ".repeat(16)+pot.profile())

				 // log overriding status
				if(log_level <= pot.ERROR)
					process.stdout.write(`${potlogmargin}  ${counter}/${max} `.padEnd(16+potlogmargin.length) + pot.profile() + "\r")
					//console.log(`${potlogmargin}  ${counter}/${max} `.padEnd(16+potlogmargin.length) + pot.profile())

				if (counter % 1000 == 0 && counter < max) {
					kvs = pot.newSync(bee_url, batch_id)
					pot.prune()
					pot.gc()
					pot.gc()

					if(tag == "loc-net" && counter < max) {
						pot.setVerbosity(verb)
						checkMinima(T, "JS", counter, [...jsMinima], jsLimit, true)
						checkMinima(T, "Go", counter, [...goMinima], goLimit, true)
						pot.setVerbosity(log_level)
					}
				}

				// track heap size
				let goHeap = pot.getGoHeapSize()
				let jsHeap = pot.getJSHeapSize()

				if (jsHeap < jsHeap0)
					jsMinima.push(jsHeap)

				if (goHeap < goHeap0)
					goMinima.push(goHeap)

				jsHeap0 = jsHeap
				goHeap0 = goHeap

				// Use setTimeout to loop continuation passing style to
				// make each allocation a different job, so the JS GC
				// can fire inbetween.
				setTimeout(allocate);
			})();

			T.log("▣ main job complete")

			// wait until beacon is collected. No counter, no timeout.
			await T.completion2(null, T, ()=>{ return counter >= max }, null, 1_000)

			await T.delay(100) // yield to give GC release messages a chance

			pot.setVerbosity(verb)

			ok1 = checkMinima(T, "JS", iterations, jsMinima, jsLimit, false, loop == maxloop)
			ok2 = checkMinima(T, "Go", iterations, goMinima, goLimit, false, loop == maxloop)

			if (ok1 && ok2) break;
		}
	}

	if (!suite || suite.includes("gc-put-async")) {

		T.start("Async Put Leak Test")

		T.log("• leak test — "+iterations+" iterations")

		let max = iterations
		let jsLimit = 0 // B 0 D 0
		let goLimit = tag == "ext-api" ? 0 : bee_url ? 0 : 200 // A 186 B 183 D 184

		if(tag == "loc-net") { jsLimit = 1000; goLimit = 1000 }

		T.log("  put(-i, -i) asynchronously, check memory")

		for (let loop = 1; loop <= maxloop; loop++) {

			T.log("• test run #" + loop)

			let counter = 0

			let verb = pot.setVerbosity(log_level)

			if(tag == "in-mem") {
				T.log("  purge in-memory storage to start from a minimum Go heap size")
				pot.purge()
			}

			T.log("  trigger Go GC to start from a minimum Go heap size")
			pot.gc()

			let jsHeap0 = 0
			let goHeap0 = 0
			let jsMinima = new Array()
			let goMinima = new Array()

			let kvs = pot.newSync(bee_url, batch_id)

			;(async function allocate() {

				await T.delay(0) // yield to cleanly stop

				if (counter++ >= max) {
					process.stdout.write("\n")
					return
				}

				if(tag == "ext-api") pot.setNoop(true)
				await kvs.put(-counter, -counter)
				T.log(" ".repeat(16)+pot.profile())

				 // log overriding status
				if(log_level <= pot.ERROR)
					process.stdout.write(`${potlogmargin}  ${counter}/${max} `.padEnd(16+potlogmargin.length) + pot.profile() + "\r")

				if (counter % 1000 == 0) {
					kvs = pot.newSync(bee_url, batch_id)
					pot.prune()
					pot.gc()
					pot.gc()

					if(tag == "loc-net" && counter < max) {
						pot.setVerbosity(verb)
						checkMinima(T, "JS", counter, [...jsMinima], jsLimit, true)
						checkMinima(T, "Go", counter, [...goMinima], goLimit, true)
						pot.setVerbosity(log_level)
					}
				}

				// track heap size
				let goHeap = pot.getGoHeapSize()
				let jsHeap = pot.getJSHeapSize()

				if (jsHeap < jsHeap0)
					jsMinima.push(jsHeap)

				if (goHeap < goHeap0)
					goMinima.push(goHeap)

				jsHeap0 = jsHeap
				goHeap0 = goHeap

				// Use setTimeout to loop continuation passing style to
				// make each allocation a different job, so the JS GC
				// can fire inbetween.
				setTimeout(allocate);
			})();

			T.log("▣ main job complete")

			// wait until beacon is collected. No counter, no timeout.
			await T.completion2(null, T, ()=>{ return counter >= max }, null, 1_000)

			await T.delay(100) // yield to give GC release messages a chance

			pot.setVerbosity(verb)

			ok1 = checkMinima(T, "JS", iterations, jsMinima, jsLimit, false, loop == maxloop)
			ok2 = checkMinima(T, "Go", iterations, goMinima, goLimit, false, loop == maxloop)

			if (ok1 && ok2) break;
		}
	}


	if (!suite || suite.includes("gc-get-async-fix")) {

		T.start("Async Fix Key Get Leak Test")

		T.log("• leak test — "+iterations+" iterations")

		let max = iterations
		let jsLimit = 0 // B -2 D 0
		let goLimit = 0 // B 0 D 0

		if(tag == "loc-net") { jsLimit = 1000; goLimit = 1000 }

		T.log("  get('K') asynchronously, check memory")

		for (let loop = 1; loop <= maxloop; loop++) {

			T.log("• test run #" + loop)

			let counter = 0

			let verb = pot.setVerbosity(log_level)

			if(tag == "in-mem") {
				T.log("  purge in-memory storage to start from a minimum Go heap size")
				pot.purge()
			}

			T.log("  trigger Go GC to start from a minimum Go heap size")
			pot.gc()

			let jsHeap0 = 0
			let goHeap0 = 0
			let jsMinima = new Array()
			let goMinima = new Array()

			let kvs = pot.newSync(bee_url, batch_id)
			await kvs.put("k", "abc")

			;(async function allocate() {

				await T.delay(0) // yield to cleanly stop

				if (counter++ >= max) {
					process.stdout.write("\n")
					return
				}

				if(tag == "ext-api") pot.setNoop(true)
				await kvs.get("k") // returns fix "abc" for sim no-op mode
				T.log(counter + "/" + max + " ".repeat(Math.max(1,16-(counter+"/"+max).length)) + pot.profile())

				 // log overriding status
				if(log_level <= pot.ERROR)
					process.stdout.write(`${potlogmargin}  ${counter}/${max} `.padEnd(16+potlogmargin.length) + pot.profile() + "\r")

				if (counter % 1000 == 0) {
					kvs = pot.newSync(bee_url, batch_id)
					await kvs.put("k", "abc")
					pot.prune()
					pot.gc()
					pot.gc()

					if(tag == "loc-net" && counter < max) {
						pot.setVerbosity(verb)
						checkMinima(T, "JS", counter, [...jsMinima], jsLimit, true)
						checkMinima(T, "Go", counter, [...goMinima], goLimit, true)
						pot.setVerbosity(log_level)
					}
				}

				// track heap size
				let goHeap = pot.getGoHeapSize()
				let jsHeap = pot.getJSHeapSize()

				if (jsHeap < jsHeap0)
					jsMinima.push(jsHeap)

				if (goHeap < goHeap0)
					goMinima.push(goHeap)

				jsHeap0 = jsHeap
				goHeap0 = goHeap

				// Use setTimeout to loop continuation passing style to
				// make each allocation a different job, so the JS GC
				// can fire inbetween.
				setTimeout(allocate);
			})();

			T.log("▣ main job complete")

			// wait until beacon is collected. No counter, no timeout.
			await T.completion2(null, T, ()=>{ return counter >= max }, null, 1_000)

			await T.delay(100) // yield to give GC release messages a chance

			pot.setVerbosity(verb)

			ok1 = checkMinima(T, "JS", iterations, jsMinima, jsLimit, false, loop == maxloop)
			ok2 = checkMinima(T, "Go", iterations, goMinima, goLimit, false, loop == maxloop)

			if (ok1 && ok2) break;
		}
	}


	if (!suite || suite.includes("gc-put-get-sync-rand")) {

		T.start("Sync Put & Get Leak Test")

		T.log("• leak test — "+iterations+" iterations")

		let max = iterations
		let jsLimit = tag == "ext-api" ? 0 : tag == "loc-net" ? 0 : 0 // B 2,0 D 1,0
		let goLimit = tag == "ext-api" ? 0 : tag == "in-mem" ? 400 : 0 // A 379 B 385,395 D 385,397

		if(tag == "loc-net") { jsLimit = 1000; goLimit = 1000 }

		T.log("  put & get random values synchronously, check memory")

		for (let loop = 1; loop <= maxloop; loop++) {

			T.log("• test run #" + loop)

			let counter = 0

			let verb = pot.setVerbosity(log_level)

			if(tag == "in-mem") {
				T.log("  purge in-memory storage to start from a minimum Go heap size")
				pot.purge()
			}

			T.log("  trigger Go GC to start from a minimum Go heap size")
			pot.gc()

			let jsHeap0 = 0
			let goHeap0 = 0
			let jsMinima = new Array()
			let goMinima = new Array()

			let kvs = pot.newSync(bee_url, batch_id)

			;(async function allocate() {

				await T.delay(0) // yield to cleanly stop

				if (counter++ >= max) {
					process.stdout.write("\n")
					return
				}

				let key = pot.randKey()
				let val = pot.randValue()
				if(tag == "ext-api") pot.setNoop(true)  // for sim mode. Otherwise no-op
				kvs.putSync(key, val) // no-op for sim mode.
				if(tag == "ext-api") pot.setNoop(true)  // for sim mode. Otherwise no-op
				kvs.getSync(key) // returns fix "abc" for sim no-op mode
				T.log(counter + "/" + max + " ".repeat(Math.max(1,16-(counter+"/"+max).length)) + pot.profile())

				 // log overriding status
				if(log_level <= pot.ERROR)
					process.stdout.write(`${potlogmargin}  ${counter}/${max} `.padEnd(16+potlogmargin.length) + pot.profile() + "\r")

				if (counter % 1000 == 0) {

					kvs = pot.newSync(bee_url, batch_id)

					pot.prune()
					pot.gc()
					pot.gc()

					if(tag == "loc-net" && counter < max) {
						pot.setVerbosity(verb)
						checkMinima(T, "JS", counter, [...jsMinima], jsLimit, true)
						checkMinima(T, "Go", counter, [...goMinima], goLimit, true)
						pot.setVerbosity(log_level)
					}
				}

				// track heap size
				let goHeap = pot.getGoHeapSize()
				let jsHeap = pot.getJSHeapSize()

				if (jsHeap < jsHeap0)
					jsMinima.push(jsHeap)

				if (goHeap < goHeap0)
					goMinima.push(goHeap)

				jsHeap0 = jsHeap
				goHeap0 = goHeap

				// Use setTimeout to loop continuation passing style to
				// make each allocation a different job, so the JS GC
				// can fire inbetween.
				setTimeout(allocate);
			})();

			T.log("▣ main job complete")

			// wait until beacon is collected. No counter, no timeout.
			await T.completion2(null, T, ()=>{ return counter >= max }, null, 1_000)

			await T.delay(100) // yield to give GC release messages a chance

			pot.setVerbosity(verb)

			ok1 = checkMinima(T, "JS", iterations, jsMinima, jsLimit, false, loop == maxloop)
			ok2 = checkMinima(T, "Go", iterations, goMinima, goLimit, false, loop == maxloop)

			if (ok1 && ok2) break;
		}

	}

	if (!suite || suite.includes("gc-put-get-async-rand")) {

		T.start("Async Put & Get Leak Test")

		T.log("• leak test — "+iterations+" iterations")

		let max = iterations
		let jsLimit = tag == "ext-api" ? 0 : tag == "loc-net" ? 0 : 0 // B 1,0 D 0
		let goLimit = tag == "ext-api" ? 0 : tag == "in-mem" ? 440 : 0 // A 389 B 390,398 D 393

		if(tag == "loc-net") { jsLimit = 1000; goLimit = 1000 }

		T.log("  put & get random values asynchronously, check memory")

		for (let loop = 1; loop <= maxloop; loop++) {

			T.log("• test run #" + loop)

			let counter = 0

			let verb = pot.setVerbosity(log_level)

			if(tag == "in-mem") {
				T.log("  purge in-memory storage to start from a minimum Go heap size")
				pot.purge()
			}

			T.log("  trigger Go GC to start from a minimum Go heap size")
			pot.gc()

			let jsHeap0 = 0
			let goHeap0 = 0
			let jsMinima = new Array()
			let goMinima = new Array()

			let kvs = pot.newSync(bee_url, batch_id)

			;(async function allocate() {

				await T.delay(0) // yield to cleanly stop

				if (counter++ >= max) {
					process.stdout.write("\n")
					return
				}

				let key = pot.randKey()
				let val = pot.randValue()
				if(tag == "ext-api") pot.setNoop(true)  // for sim mode. Otherwise no-op
				await kvs.put(key, val) // no-op for sim mode.
				if(tag == "ext-api") pot.setNoop(true)  // for sim mode. Otherwise no-op
				await kvs.get(key) // returns fix "abc" for sim no-op mode
				T.log(counter + "/" + max + " ".repeat(Math.max(1,16-(counter+"/"+max).length)) + pot.profile())

				 // log overriding status
				if(log_level <= pot.ERROR)
					process.stdout.write(`${potlogmargin}  ${counter}/${max} `.padEnd(16+potlogmargin.length) + pot.profile() + "\r")

				if (counter % 1000 == 0) {

					kvs = pot.newSync(bee_url, batch_id)

					pot.prune()
					pot.gc()
					pot.gc()

					if(tag == "loc-net" && counter < max) {
						pot.setVerbosity(verb)
						checkMinima(T, "JS", counter, [...jsMinima], jsLimit, true)
						checkMinima(T, "Go", counter, [...goMinima], goLimit, true)
						pot.setVerbosity(log_level)
					}
				}

				// track heap size
				let goHeap = pot.getGoHeapSize()
				let jsHeap = pot.getJSHeapSize()

				if (jsHeap < jsHeap0)
					jsMinima.push(jsHeap)

				if (goHeap < goHeap0)
					goMinima.push(goHeap)

				jsHeap0 = jsHeap
				goHeap0 = goHeap

				// Use setTimeout to loop continuation passing style to
				// make each allocation a different job, so the JS GC
				// can fire inbetween.
				setTimeout(allocate);
			})();

			T.log("▣ main job complete")

			// wait until beacon is collected. No counter, no timeout.
			await T.completion2(null, T, ()=>{ return counter >= max }, null, 1_000)

			await T.delay(100) // yield to give GC release messages a chance

			pot.setVerbosity(verb)

			ok1 = checkMinima(T, "JS", iterations, jsMinima, jsLimit, false, loop == maxloop)
			ok2 = checkMinima(T, "Go", iterations, goMinima, goLimit, false, loop == maxloop)

			if (ok1 && ok2) break;
		}

	}


	if (!suite || suite.includes("gc-basics-sync-rand")) {

		T.start("Sync Basics Leak Test")

		T.log("• leak test — "+iterations+" iterations")

		let max = iterations
		let jsLimit = tag == "ext-api" ? 0 : tag == "loc-net" ? 0 : 0 // B 0 D 0
		let goLimit = tag == "ext-api" ? 0 : tag == "in-mem" ? 130 : 0 // A 117 B 118 D 118

		if(tag == "loc-net") { jsLimit = 1000; goLimit = 1000 }

		T.log("  put, get, delete, save, load random values synchronously, check memory")

		for (let loop = 1; loop <= maxloop; loop++) {

			T.log("• test run #" + loop)

			let counter = 0

			let verb = pot.setVerbosity(log_level)

			if(tag == "in-mem") {
				T.log("  purge in-memory storage to start from a minimum Go heap size")
				pot.purge()
			}

			T.log("  trigger Go GC to start from a minimum Go heap size")
			pot.gc()

			let jsHeap0 = 0
			let goHeap0 = 0
			let jsMinima = new Array()
			let goMinima = new Array()

			;(async function allocate() {

				await T.delay(0) // yield to cleanly stop

				if (counter++ >= max) {
					process.stdout.write("\n")
					return
				}

				let key = pot.randKey()
				let val = pot.randValue()

				let kvs = pot.newSync(bee_url, batch_id)

				if(tag == "ext-api") pot.setNoop(true)
				kvs.putSync(key, val)

				if(tag == "ext-api") pot.setNoop(true)
				let res = kvs.getSync(key)
				if(tag != "ext-api")
					T.assertEqual(t0, T, res, val)

				if(tag == "ext-api") pot.setNoop(true)
				let ref = kvs.saveSync()

				if(tag == "ext-api") pot.setNoop(true)
				kvs = pot.loadSync(ref, bee_url, batch_id)

				if(tag == "ext-api") pot.setNoop(true)
				res = kvs.getSync(key)
				if(tag != "ext-api")
					T.assertEqual(t0, T, res, val)

				if(tag == "ext-api") pot.setNoop(true)
				kvs.deleteSync(key)

				 // log overriding status
				if(log_level <= pot.ERROR)
					process.stdout.write(`${potlogmargin}  ${counter}/${max} `.padEnd(16+potlogmargin.length) + pot.profile() + "\r")

				if (counter % 1000 == 0) {

					kvs = pot.newSync(bee_url, batch_id)

					pot.prune()
					pot.gc()
					pot.gc()

					if(tag == "loc-net" && counter < max) {
						pot.setVerbosity(verb)
						checkMinima(T, "JS", counter, [...jsMinima], jsLimit, true)
						checkMinima(T, "Go", counter, [...goMinima], goLimit, true)
						pot.setVerbosity(log_level)
					}
				}

				// track heap size
				let goHeap = pot.getGoHeapSize()
				let jsHeap = pot.getJSHeapSize()

				if (jsHeap < jsHeap0)
					jsMinima.push(jsHeap)

				if (goHeap < goHeap0)
					goMinima.push(goHeap)

				jsHeap0 = jsHeap
				goHeap0 = goHeap

				// Use setTimeout to loop continuation passing style to
				// make each allocation a different job, so the JS GC
				// can fire inbetween.
				setTimeout(allocate);
			})();

			T.log("▣ main job complete")

			// wait until beacon is collected. No counter, no timeout.
			await T.completion2(null, T, ()=>{ return counter >= max }, null, 1_000)

			await T.delay(100) // yield to give GC release messages a chance

			pot.setVerbosity(verb)

			ok1 = checkMinima(T, "JS", iterations, jsMinima, jsLimit, false, loop == maxloop)
			ok2 = checkMinima(T, "Go", iterations, goMinima, goLimit, false, loop == maxloop)

			if (ok1 && ok2) break;
		}

	}


	if (!suite || suite.includes("gc-basics-async-rand")) {

		T.start("Async Basics Leak Test")

		T.log("• leak test — "+iterations+" iterations")

		let max = iterations
		let jsLimit = tag == "ext-api" ? 0 : tag == "loc-net" ? 0 : 0 // A 1! B 0 D 2,-1
		let goLimit = tag == "ext-api" ? 0 : tag == "in-mem" ? 130 : 0 // A 114 B 113 D 113,114

		if(tag == "loc-net") { jsLimit = 1000; goLimit = 1000 }

		T.log("  put, get, delete, save, load random values asynchronously, check memory")

		for (let loop = 1; loop <= maxloop; loop++) {

			T.log("• test run #" + loop)

			let counter = 0

			let verb = pot.setVerbosity(log_level)

			if(tag == "in-mem") {
				T.log("  purge in-memory storage to start from a minimum Go heap size")
				pot.purge()
			}

			T.log("  trigger Go GC to start from a minimum Go heap size")
			pot.gc()

			let jsHeap0 = 0
			let goHeap0 = 0
			let jsMinima = new Array()
			let goMinima = new Array()

			;(async function allocate() {

				await T.delay(0) // yield to cleanly stop

				if (counter++ >= max) {
					process.stdout.write("\n")
					return
				}

				let key = pot.randKey()
				let val = pot.randValue()

				let kvs = pot.newSync(bee_url, batch_id)

				if(tag == "ext-api") pot.setNoop(true)
				await kvs.put(key, val)

				if(tag == "ext-api") pot.setNoop(true)
				let res = await kvs.get(key)
				if(tag != "ext-api")
					T.assertEqual(t0, T, res, val)

				if(tag == "ext-api") pot.setNoop(true)
				let ref = await kvs.save()

				if(tag == "ext-api") pot.setNoop(true)
				kvs = await pot.load(ref, bee_url, batch_id)

				if(tag == "ext-api") pot.setNoop(true)
				res = await kvs.get(key)
				if(tag != "ext-api")
					T.assertEqual(t0, T, res, val)

				if(tag == "ext-api") pot.setNoop(true)
				await kvs.delete(key)

				 // log overriding status
				if(log_level <= pot.ERROR)
					process.stdout.write(`${potlogmargin}  ${counter}/${max} `.padEnd(16+potlogmargin.length) + pot.profile() + "\r")

				if (counter % 1000 == 0) {

					kvs = pot.newSync(bee_url, batch_id)

					pot.prune()
					pot.gc()
					pot.gc()

					if(tag == "loc-net" && counter < max) {
						pot.setVerbosity(verb)
						checkMinima(T, "JS", counter, [...jsMinima], jsLimit, true)
						checkMinima(T, "Go", counter, [...goMinima], goLimit, true)
						pot.setVerbosity(log_level)
					}
				}

				// track heap size
				let goHeap = pot.getGoHeapSize()
				let jsHeap = pot.getJSHeapSize()

				if (jsHeap < jsHeap0)
					jsMinima.push(jsHeap)

				if (goHeap < goHeap0)
					goMinima.push(goHeap)

				jsHeap0 = jsHeap
				goHeap0 = goHeap

				// Use setTimeout to loop continuation passing style to
				// make each allocation a different job, so the JS GC
				// can fire inbetween.
				setTimeout(allocate);
			})();

			T.log("▣ main job complete")

			// wait until beacon is collected. No counter, no timeout.
			await T.completion2(null, T, ()=>{ return counter >= max }, null, 1_000)

			await T.delay(100) // yield to give GC release messages a chance

			pot.setVerbosity(verb)

			ok1 = checkMinima(T, "JS", iterations, jsMinima, jsLimit, false, loop == maxloop)
			ok2 = checkMinima(T, "Go", iterations, goMinima, goLimit, false, loop == maxloop)

			if (ok1 && ok2) break;
		}

	}


	if (!suite || suite.includes("gc-multiop1-async-rand")) {

		T.start("Async Multiple Operations Leak Test 1")

		T.log("• leak test — "+iterations+" iterations")

		let max = iterations
		let jsLimit = tag == "ext-api" ? 0 : tag == "loc-net" ? 10 : 10 // A 9! B 8,0,2,-6,8 D 0
		let goLimit = tag == "ext-api" ? 0 : tag == "in-mem" ? 550 : 10 // A 386 B 386,519!,514,517,513 D 390

		if(tag == "loc-net") { jsLimit = 1000; goLimit = 1000 }

		T.log("  multiple put, get, delete, save, load random values asynchronously, check memory")

		for (let loop = 1; loop <= maxloop; loop++) {

			T.log("• test run #" + loop)

			let counter = 0

			let verb = pot.setVerbosity(log_level)

			if(tag == "in-mem") {
				T.log("  purge in-memory storage to start from a minimum Go heap size")
				pot.purge()
			}

			T.log("  trigger Go GC to start from a minimum Go heap size")
			pot.gc()

			let jsHeap0 = 0
			let goHeap0 = 0
			let jsMinima = new Array()
			let goMinima = new Array()

			;(async function allocate() {

				await T.delay(0) // yield to cleanly stop

				if (counter++ >= max) {
					process.stdout.write("\n")
					return
				}

				T.log("• " + counter + "/" + max)

				let key1 = pot.randKey()
				let key2 = pot.randKey()
				let key3 = pot.randKey()
				let val1 = pot.randValue()
				let val2 = pot.randValue()
				let val3 = pot.randValue()

				let kvs1 = await pot.new(bee_url, batch_id)

				if(tag == "ext-api") pot.setNoop(true)
				await kvs1.put(key1, val1)

				if(tag == "ext-api") pot.setNoop(true)
				await kvs1.put(key2, val2)

				if(tag == "ext-api") pot.setNoop(true)
				await kvs1.put(key3, val3)

				if(tag == "ext-api") pot.setNoop(true)
				let res = await kvs1.get(key1)
				if(tag != "ext-api")
					T.assertEqual(t0, T, res, val1)

				if(tag == "ext-api") pot.setNoop(true)
				let ref = await kvs1.save()
				if(tag == "ext-api") pot.setNoop(true)
				kvs11 = await pot.load(ref, bee_url, batch_id)

				if(tag == "ext-api") pot.setNoop(true)
				res = await kvs11.get(key1)
				if(tag != "ext-api")
					T.assertEqual(t0, T, res, val1)

				if(tag == "ext-api") pot.setNoop(true)
				res = await kvs11.get(key2)
				if(tag != "ext-api")
					T.assertEqual(t0, T, res, val2)

				if(tag == "ext-api") pot.setNoop(true)
				res = await kvs11.get(key3)
				if(tag != "ext-api")
					T.assertEqual(t0, T, res, val3)

				if(tag == "ext-api") pot.setNoop(true)
				await kvs11.delete(key1)

				if(tag == "ext-api") pot.setNoop(true)
				await kvs11.delete(key2)

				if(tag == "ext-api") pot.setNoop(true)
				await kvs11.delete(key3)

				if(tag == "ext-api") pot.setNoop(true)
				res = await kvs11.get(key1)
				if(tag != "ext-api")
					T.assertEqual(t0, T, res, undefined)

				if(tag == "ext-api") pot.setNoop(true)
				res = await kvs11.get(key2)
				if(tag != "ext-api")
					T.assertEqual(t0, T, res, undefined)

				if(tag == "ext-api") pot.setNoop(true)
				res = await kvs11.get(key3)
				if(tag != "ext-api")
					T.assertEqual(t0, T, res, undefined)

				T.log(" ".repeat(16) + pot.profile())

				 // log overriding status
				if(log_level <= pot.ERROR)
					process.stdout.write(`${potlogmargin}  ${counter}/${max} `.padEnd(16+potlogmargin.length) + pot.profile() + "\r")

				if (counter % 1000 == 0) {

					kvs = await pot.new(bee_url, batch_id)

					pot.prune()
					pot.gc()
					pot.gc()

					if(tag == "loc-net" && counter < max) {
						pot.setVerbosity(verb)
						checkMinima(T, "JS", counter, [...jsMinima], jsLimit, true)
						checkMinima(T, "Go", counter, [...goMinima], goLimit, true)
						pot.setVerbosity(log_level)
					}
				}

				// track heap size
				let goHeap = pot.getGoHeapSize()
				let jsHeap = pot.getJSHeapSize()

				if (jsHeap < jsHeap0)
					jsMinima.push(jsHeap)

				if (goHeap < goHeap0)
					goMinima.push(goHeap)

				jsHeap0 = jsHeap
				goHeap0 = goHeap

				// Use setTimeout to loop continuation passing style to
				// make each allocation a different job, so the JS GC
				// can fire inbetween.
				setTimeout(allocate);
			})();

			T.log("▣ main job complete")

			// wait until beacon is collected. No counter, no timeout.
			await T.completion2(null, T, ()=>{ return counter >= max }, null, 1_000)

			await T.delay(100) // yield to give GC release messages a chance

			pot.setVerbosity(verb)

			ok1 = checkMinima(T, "JS", iterations, jsMinima, jsLimit, false, loop == maxloop)
			ok2 = checkMinima(T, "Go", iterations, goMinima, goLimit, false, loop == maxloop)

			if (ok1 && ok2) break;
		}

	}


	if (!suite || suite.includes("gc-multiop2-async-rand")) {

		T.start("Async Multiple Operations Leak Test 2")

		T.log("• leak test — "+iterations+" iterations")

		let max = iterations
		let jsLimit = tag == "ext-api" ? 0 : tag == "loc-net" ? 10 : 10 // A 7,-4,3,-5,-5 B 8,-1 D 7,0
		let goLimit = tag == "ext-api" ? 0 : tag == "in-mem" ? 960 : 10 // A 926,914,916,914,914 B 926,914 D 926,914

		if(tag == "loc-net") { jsLimit = 1000; goLimit = 1000 }

		T.log("  multiple put, get, delete, save, load random values asynchronously, check memory")

		for (let loop = 1; loop <= maxloop; loop++) {

			T.log("• test run #" + loop)

			let counter = 0

			let verb = pot.setVerbosity(log_level)

			if(tag == "in-mem") {
				T.log("  purge in-memory storage to start from a minimum Go heap size")
				pot.purge()
			}

			T.log("  trigger Go GC to start from a minimum Go heap size")
			pot.gc()

			let jsHeap0 = 0
			let goHeap0 = 0
			let jsMinima = new Array()
			let goMinima = new Array()

			;(async function allocate() {

				await T.delay(0) // yield to cleanly stop

				if (counter++ >= max) {
					process.stdout.write("\n")
					return
				}

				T.log("• " + counter + "/" + max)

				let key1 = pot.randKey()
				let key2 = pot.randKey()
				let key3 = pot.randKey()
				let val1 = pot.randValue()
				let val2 = pot.randValue()
				let val3 = pot.randValue()

				let kvs1 = await pot.new(bee_url, batch_id)

				if(tag == "ext-api") pot.setNoop(true)
				await kvs1.put(key1, val1)

				if(tag == "ext-api") pot.setNoop(true)
				await kvs1.put(key2, val2)

				if(tag == "ext-api") pot.setNoop(true)
				await kvs1.put(key3, val3)

				if(tag == "ext-api") pot.setNoop(true)
				let res = await kvs1.get(key1)

				if(tag == "ext-api") pot.setNoop(true)
				res = await kvs1.get(key2)

				if(tag == "ext-api") pot.setNoop(true)
				res = await kvs1.get(key3)

				if(tag == "ext-api") pot.setNoop(true)
				await kvs1.delete(key1)

				if(tag == "ext-api") pot.setNoop(true)
				await kvs1.delete(key2)

				if(tag == "ext-api") pot.setNoop(true)
				await kvs1.delete(key3)

				if(tag == "ext-api") pot.setNoop(true)
				res = await kvs1.get(key1)

				if(tag == "ext-api") pot.setNoop(true)
				res = await kvs1.get(key2)

				if(tag == "ext-api") pot.setNoop(true)
				res = await kvs1.get(key3)

				T.log(" ".repeat(30) + pot.profile())

				 // log overriding status
				if(log_level <= pot.ERROR)
					process.stdout.write(`${potlogmargin}  ${counter}/${max} `.padEnd(16+potlogmargin.length) + pot.profile() + "\r")

				if (counter % 1000 == 0) {

					kvs = await pot.new(bee_url, batch_id)

					pot.prune()
					pot.gc()
					pot.gc()

					if(tag == "loc-net" && counter < max) {
						pot.setVerbosity(verb)
						checkMinima(T, "JS", counter, [...jsMinima], jsLimit, true)
						checkMinima(T, "Go", counter, [...goMinima], goLimit, true)
						pot.setVerbosity(log_level)
					}
				}

				// track heap size
				let goHeap = pot.getGoHeapSize()
				let jsHeap = pot.getJSHeapSize()

				if (jsHeap < jsHeap0)
					jsMinima.push(jsHeap)

				if (goHeap < goHeap0)
					goMinima.push(goHeap)

				jsHeap0 = jsHeap
				goHeap0 = goHeap

				// Use setTimeout to loop continuation passing style to
				// make each allocation a different job, so the JS GC
				// can fire inbetween.
				setTimeout(allocate);
			})();

			T.log("▣ main job complete")

			// wait until beacon is collected. No counter, no timeout.
			await T.completion2(null, T, ()=>{ return counter >= max }, null, 1_000)

			await T.delay(100) // yield to give GC release messages a chance

			pot.setVerbosity(verb)

			ok1 = checkMinima(T, "JS", iterations, jsMinima, jsLimit, false, loop == maxloop)
			ok2 = checkMinima(T, "Go", iterations, goMinima, goLimit, false, loop == maxloop)

			if (ok1 && ok2) break;
		}

	}
}

// Testing failure modes: function call arguments that should be caught and trigger an error
async function TestPotKvs_InvalidArguments(T, bee_url, batch_id) {

	T.head("Parameter Errors")

	T.log("Testing wether missing or invalid arguments are contained and don't bring down the Go executable.")


	T.start("put - parameter errors")

	T.log("• new map, synchronous")
	let map = pot.newSync(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	// 1 less

	// fail raw synchronously
	T.log("• put raw, synchronous - missing value parameter")
	err = map.putRawSync(key1)
	T.assertError(t0, T, err, /parameter count.*requires 2/)

	// fail typed synchronously
	T.log("• put typed, synchronous - missing value parameter")
	err = map.putSync(key1)
	T.assertError(t0, T, err, /parameter count.*requires 2/)

	// fail typed asynchronously
	T.log("• put typed, asynchronous (promise) - missing value parameter")
	try {
		err = await map.put(key1)
		T.attestMissingError(t0, T)
	} catch(err) {
		T.assertError(t0, T, err, /parameter count.*requires 2/)
	}

	// 2 less

	// fail raw synchronously
	T.log("• put raw, synchronous - missing both parameters")
	err = map.putRawSync()
	T.assertError(t0, T, err, /parameter count.*requires 2/)

	// fail typed synchronously
	T.log("• put typed, synchronous - missing both parameters")
	err = map.putSync()
	T.assertError(t0, T, err, /parameter count.*requires 2/)

	// fail typed asynchronously
	T.log("• put typed, asynchronous (promise) - missing both parameters")
	try {
		err = await map.put()
		T.attestMissingError(t0, T)
	} catch(err) {
		T.assertError(t0, T, err, /parameter count.*requires 2/)
	}


	// --------------------------------------------------------------------

	T.head("Invalid-Argument Protection")

	T.log("Testing wether invalid arguments are contained and don't bring down the Go executable.")


	T.start("Oversize Key")

	let maxSize = 32
	T.log("max key size is " + maxSize)

	map = await pot.new(bee_url, batch_id)
	T.assertNoError(t0, T, !map)

	T.log("• " + maxSize + " byte sized key should pass (async)")
	key1 = pot.randBuffer(maxSize)
	val1 = "+ some value +"

	T.log("• put wth " + maxSize + " byte key ‹" + T.hex(key1) + "›")

	err = await map.put(key1, val1)
	T.assertNoError(t0, T, err)

	T.log("• get from " + maxSize + " byte sized key ‹" + T.hex(key1) + "›")
	let val = await map.get(key1)
	T.assertEqual(t0, T, val, val1)

	T.log("• " + maxSize + "+1 byte sized key should be stopped (async)")
	key1 = pot.randBuffer(maxSize+1)

	T.log("• put with " + (maxSize+1) + " byte key ‹" + T.hex(key1) + "›")

	try {
		let err = await map.put(key1, val1)
		T.attestMissingError(t0, T)
	} catch(err) {
		T.assertError(t0, T, err, /key byte-array too long/)
	}

	T.log("• " + maxSize + " character sized string key should pass (async)")
	key1 = "X".repeat(maxSize)
	val1 = "+ some value +"

	T.log("• put wth " + maxSize + " character string key ‹" + key1 + "›")
	err = await map.put(key1, val1)
	T.assertNoError(t0, T, err)

	T.log("• get from " + maxSize + " character sized string key ‹" + key1 + "›")
	val = await map.get(key1)
	T.assertEqual(t0, T, val, val1)

	T.log("• " + maxSize + "+1 character sized string key should be stopped (async)")
	key1 = "Z".repeat(maxSize+1)

	T.log("• put wth " + (maxSize+1) + " character sized string key ‹" + key1 + "›")

	try {
		let err = await map.put(key1, val1)
		T.attestMissingError(t0, T)
	} catch(err) {
		T.assertError(t0, T, err, /key string too long/)
	}


	T.start("Oversize Value")
	maxSize = pot.setValueSizeLimit()
	T.log("max value size is " + maxSize + ". Storing the maximal value is part of the stress test batch.")

	T.log("• " + maxSize + "+1 byte sized value should be stopped (async)")
	let key2 = "B"
	let val2 = pot.randBuffer(maxSize+1)

	let map2 = await pot.new(bee_url, batch_id)
	T.assertNoError(t0, T, !map2)

	T.log("• put " + (maxSize+1) + " byte buffer raw " + key2)

	try {
		let err = await map2.putRaw(key2, val2)
		T.attestMissingError(t0, T)
	} catch(err) {
		T.assertError(t0, T, err, /value too large/)
	}
}

// Some lines of stats of lap and final verdict of memory test.
function checkMinima(T, tag, iterations, minima, allowed, isLap, lastRun) {

	// list out the detected relative minima of Go and JS heap size
	head = `• ${tag} Heap Minima over ${fmt(iterations)} iterations`
	T.log(head)
	T.log("—".repeat(head.length))

	minima.forEach((v) => T.log(T.ok + fmt(v).padStart(10," ") + "  " + pot.bar(v) + T.off+" "))

	T.log()
	if(!isLap) T.log(`At least 10 minima: ${minima.length}`)
	else T.log(`Minima: ${minima.length}`)
	if(!isLap) {
		if(lastRun || minima.length >= 10) {
			T.assertGreaterOrEqual(t0, T, minima.length, 10)
		} else if(minima.length < 10) {
			T.log(T.erm + "𐄂 failed. Rerunning"+T.off)
			T.log()
			return false
		}
	}

	if(minima.length < 10) {
		T.log()
		return false // does not stop laps
	}

	// cut initial outliers, at most 30, at least a tenth.
	let pre = minima.length
	let disc = Math.min(30, Math.floor(pre / 5))
	let jsAvg = minima.reduce((a,c)=>a+c) / minima.length
	while (minima[0] > jsAvg && minima.length > 2) minima.shift() // don't join with next line
	while (minima.length > pre - disc) minima.shift()

	T.log()
	if(!isLap) T.log(`At least 10 minima without the leading/outlier ${pre-minima.length}: ${minima.length}`)
	else T.log(`Minima without the leading/outlier ${pre-minima.length}: ${minima.length}`)
	if(!isLap) {
		if(lastRun || minima.length >= 10) {
			T.assertGreaterOrEqual(t0, T, minima.length, 10)
		} else if(minima.length < 10) {
			T.log(T.erm + "𐄂 failed. Rerunning"+T.off)
			T.log()
			return false
		}
	}

	if(minima.length < 10) {
		T.log()
		return false // does not stop laps
	}

	let split = minima.length < 40 ? 2 : 4
	span = Math.floor(minima.length / split)
	let min0 = Math.floor(minima.slice(0,span).reduce((a,c)=>Math.min(a,c)))
	let min1 = Math.floor(minima.slice(-span).reduce((a,c)=>Math.min(a,c)))
	let mgrowth = Math.floor((min1 - min0) / iterations)

	let mvar = Math.round(min1/min0*10000-10000)/100
	if(!isLap) T.log(`• ${tag} growth not more than ${allowed} byte per iteration? (${mgrowth})`)
	else {
		T.log()
		T.log(`${tag} growth limit: ${allowed} byte per iteration.`)
	}
	T.log(`Initial ${span} minima's minimum: ${fmt(min0)}`)
	T.log(`Final   ${span} minima's minimum: ${fmt(min1)}`)
	let color = allowed !== null ? mgrowth <= allowed ? T.ok : T.erm : ""
	T.log(`${tag} growth across minima-minima: ${mgrowth?"":"⩽"}${color}${fmt(mgrowth)}${T.off} byte`)
	if(isLap && tag == "Go") T.log() // because 2nd list out before next round of tests

	if(!isLap) {
		if(lastRun || mgrowth <= allowed) {
			T.assertLesserOrEqual(t0, T, mgrowth, allowed)
		} else if(mgrowth > allowed) {
			T.log(T.erm + `𐄂 ${tag} failed. Rerunning`+T.off)
			return false
		}
	}

	return true
}

if(T.NODE)

	module.exports = { TestPotKvsSync, TestPotKvsAsync, TestPotKvs_TypeEncoding,
		TestPotKvs_EdgeValuesSync, TestPotKvs_EdgeValuesAsync,
		TestPotKvs_TypedAccessSync, TestPotKvs_TypedAccessAsync,
		TestPotKvs_MassSequentialSync, TestPotKvs_MassSequentialAsync,
		TestPotKvs_ComplexConcurrent, TestPotKvs_Save,
		TestPotKvs_ComplexSave, TestPotKvs_Cancellation,
		TestPotKvs_Failures, TestPotKvs_Stress, TestPotKvs_Release,
		TestPotKvs_InternalErrors, TestPotKvs_InvalidArguments }
