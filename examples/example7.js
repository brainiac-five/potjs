console.log(`


	POT JS Example 7: Node, in-memory, w/o pot-node.js

	Check out the source in examples/example7.js.

`)

fs = require("fs")
require("./lib/wasm_exec")

var go = new Go()

global.potjs_verbosity = 3

WebAssembly.instantiate(fs.readFileSync("lib/pot.wasm"), go.importObject)
	.then((r) => { go.run(r.instance) })

onWasmLoaded = async () => {

	console.log("wasm loaded-function called")
	map = await global.pot.new()
	await map.put("hello", "node")
	value = await map.get("hello")
	console.log("hello:", value)
}

