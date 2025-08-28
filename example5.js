globalThis.require = require;
globalThis.fs = require("fs");
globalThis.TextEncoder = require("util").TextEncoder;
globalThis.TextDecoder = require("util").TextDecoder;

globalThis.performance = {
    now() {
        const [sec, nsec] = process.hrtime();
        return sec * 1000 + nsec / 1000000;
    },
};

const crypto = require("crypto");
globalThis.crypto = {
    getRandomValues(b) {
        crypto.randomFillSync(b);
    },
};

async function delay(millisec) {
	await new Promise(resolve => setTimeout(resolve, millisec))
}

require("./wasm_exec");

var go = new Go();
go.argv = process.argv.slice(2);
go.env = Object.assign({ TMPDIR: require("os").tmpdir() }, process.env);
go.exit = process.exit;

var map
var pot

global.wasm_loaded = async () => {
	console.log("wasm loaded-function called")
	map = await global.pot.newSwarmKvsPromise()
	await map.putTypedPromise("hello", "node")
	value = await map.getTypedPromise("hello")
	console.log("hello:", value)
}

WebAssembly.instantiate(fs.readFileSync("pot.wasm"), go.importObject)
	.then((r) => { go.run(r.instance) })
	.catch((e) => console.log(e))

