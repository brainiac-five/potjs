/*
**    SWARM POT JS Test Suite / Node
*/

const fs = require("fs")
//potjs_verbosity = 3 // memory stats: + 2048
potjs_verbosity = 3 + 2048
require("../lib/pot-node.js")
require("./test")
const tests = require("./suites")

/* optional mode parameter */

const tag    = process.argv[2]
const bee    = process.argv[3] != "-" ? process.argv[3] : null
const batch  = process.argv[4] != "-" ? process.argv[4] : null
const branch = process.argv[5]
const iter   = process.argv[6]

console.log()
console.log("tag   ", tag)
console.log("bee   ", bee)
console.log("batch ", batch)
console.log("branch", branch)
console.log("iter  ", iter)

T.tag = tag

if(batch && batch.length != 64) throw new Error(`wrong batch id hex string length ${batch.length} (should be 64)`)

/* date */

const date = (new Date()).toString()

/* mode */

const note = modenote(tag)

/* network info */

const screen_bee_url  = bee   ? bee   : "(in-memory)"
const screen_batch_id = batch ? batch : "(none)"

console.log(`
-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

	SWARM POT JS Test Suite / Node

	${tag}

-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --

	${date}

	This is a test suite for POT JS, the Javascript API to the Go implementation
	of the Proximity-Order-Trie (POT).

	Also see examples/ folder and README.MD.


	Notes

	${note}

	Tests are using different random byte sequences for keys and values
	every run.


	Network

	Bee node URL ${screen_bee_url}
	Batch ID     ${screen_batch_id}



	K V S   T E S T S

-- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
`)

; (async () => {

	await pot.ready()
	pot.setVerbosity(pot.INFO | pot.MEMORY)

	/* Test Test */

	if (branch != "resources") {

		T.head("Example Test")
		T.log("Test setup test outside of main test files.")

		T.start("script inline")
		T.log("• put and get K: V")
		try {
			map = await pot.new(bee, batch)
			await map.put("K", "V")
			r = await map.get("K")
			T.assertEqual(null, T, r, "V")
		} catch(err) {
			T.log(err)
		}
	}

	/* Tests */

	try {

		if(!branch || branch == "std") {

			tests.TestPotKvsSync(T, bee, batch)
			await tests.TestPotKvsAsync(T, bee, batch)

			tests.TestPotKvs_TypeEncoding(T, bee, batch)

			tests.TestPotKvs_EdgeValuesSync(T, bee, batch)
			await tests.TestPotKvs_EdgeValuesAsync(T, bee, batch)

			tests.TestPotKvs_TypedAccessSync(T, bee, batch)
			await tests.TestPotKvs_TypedAccessAsync(T, bee, batch)

			await tests.TestPotKvs_MassSequentialSync(T, bee, batch)
			await tests.TestPotKvs_MassSequentialAsync(T, bee, batch)
			await tests.TestPotKvs_ComplexConcurrent(T, bee, batch)

			await tests.TestPotKvs_Save(T, bee, batch)
			await tests.TestPotKvs_ComplexSave(T, bee, batch)

			await tests.TestPotKvs_Cancellation(T, bee, batch)
			await tests.TestPotKvs_InternalErrors(T, bee, batch)

			await tests.TestPotKvs_InvalidArguments(T, bee, batch)
			await tests.TestPotKvs_Failures(T, bee, batch)

		} else if (branch == "stress") {

			await tests.TestPotKvs_Stress(T, bee, batch, iter)

		} else if (branch == "resources") {

			await tests.TestPotKvs_Release(T, bee, batch, iter)
		}

		T.balance()

	} catch(err) {
		T.log(err)
	}

})()

function modenote(tag) {

	var note = ""

	b = "*"
	unb = "*"

	switch(tag) {
	case "ext-api":
		note = `The extended test suite runs on ${b}mock storage${unb} that leaves out the\n\tGo POT implementation to emulate exceptions.`
		break
	case "in-mem":
		note = `The test suite runs ${b}in-memory of the Go POT implementation${unb}.`
		break
	case "loc-net":
		note = `The test suite runs on ${b}a local Swarm test network${unb}.`
		break
	case "testnet":
		note = `The test suite runs on ${b}Swarm testnet${unb}.`
		break
	case "mainnet":
		note = `The test suite runs on ${b}Swarm mainnet${unb}.`
		break
	}

	return note
}
