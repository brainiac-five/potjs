console.log(`


	POT JS Example 11b: node, sync new crashing

`)

fs = require("fs");
require("./lib/wasm_exec");

var go = new Go();

WebAssembly.instantiate(fs.readFileSync("lib/pot.wasm"), go.importObject)
	.then((r) => { go.run(r.instance) })

onWasmLoaded = async () => {

	map = global.pot.newSync()
}

