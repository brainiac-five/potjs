console.log(`


	POT JS Example 7: Node

	Check out the source in example7.js.

`)

fs = require("fs");
require("./lib/wasm_exec"); // note the ./

var go = new Go();

WebAssembly.instantiate(fs.readFileSync("lib/pot.wasm"), go.importObject)
	.then((r) => { go.run(r.instance) })

onWasmLoaded = async () => {

	console.log("wasm loaded-function called")
	map = await global.pot.new()
	await map.put("hello", "node")
	value = await map.get("hello")
	console.log("hello:", value)
}

