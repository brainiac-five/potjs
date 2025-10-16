console.log(`

	POT JS Example 9: Node.js Web App Server / local Swarm network

	This is a self-contained web app, serving
	a page to receive input, returning results.

`)

const http = require('http')
const qs = require('querystring')
const XMLHttpRequest = require("../lib/xmlhttprequest").XMLHttpRequest;

globalThis.jsFetchSync = function(method, url, data, headers) {

	console.log("js:  fetch sync start")

	console.log("js:  fetch sync url    :", url)
	console.log("js:  fetch sync headers:", headers)
	console.log("js:  fetch sync data   :", data)

	var xhr = new XMLHttpRequest({syncPolicy:"enabled"}); // suppresses deprec warning
	if(method=='GET') xhr.responseType = 'arraybuffer' 
	try {
		xhr.open(method, url, false)

		if(headers)
			for (const hi in headers)
				xhr.setRequestHeader(hi, headers[hi])

		xhr.send(fromHex(data))

		console.log("js:  fetch sync response status: ")
		console.log(xhr.status);
		console.log("js:  fetch sync response original: ")
		console.log(xhr.response);
		console.log("js:  fetch sync response in hex: ")
		console.log(Array.from(new Uint8Array(xhr.response)).map(n=>{return (n<16?"0":"")+n.toString(16)}).join(''))

	}
	catch (error) {
		console.error(error.message);
	}

	return xhr.response
}

const fs = require("fs")
require("../lib/wasm_exec")

var go = new Go()
var kvs

WebAssembly.instantiate(fs.readFileSync("lib/pot.wasm"), go.importObject)
	.then((r) => { go.run(r.instance) })

global.onWasmLoaded = async () => {

	bee = process.argv[2]
	batch = process.argv[3]
	console.log(bee, batch)

	pot.setVerbosity(pot.INFO)

	kvs = pot.newSync(bee, batch)
	console.log('js :  KVS initialized')

	// key = pot.randKey()
	key = fromHex("a4260460149e02cd61b877a576921a7135122d58af0c230549b28c75e9717f11")
	value = new Uint8Array(3000)
	value[0] = 1
	value[2999] = 1

	console.log('js :  value ' + value.map(v=>v<=15?"0":""+v.toString(16)).join(''))

	await kvs.putRaw(key, value)
	result = await kvs.getRaw(key)

	console.log('js :  got ' + result)

	ref = await kvs.save(bee, batch)

	kvs2 = await pot.load(ref, bee, batch)

	result2 = await kvs2.getRaw(key)

	// Notes:
	// * The "pot: " log entries are coming from Go pot.wasm.
	// * There is no catching of early calls of put() and get()
	// * onWasmLoaded could be defined async, for await pot.new()
	// * onWasmLoaded has to be added to global to get detected
}

function fromHex(hexString) {
	if(!hexString) return new Uint8Array()
	return Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}

