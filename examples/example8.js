console.log(`

	POT JS Example 8: Node.js Web App Server

	This is a self-contained web app, serving
	a page to receive input, returning results.

`)

const http = require('http')
const qs = require('querystring')

const form = `<pre>


		POT JS Example 8: Node.js Web App

		<form method=post action="http://localhost:3000">

		key    <input name=key>

		value  <input name=value>

		       <input type=submit name=button value=put>


	<hr />


		key    <input name=search>

		       <input type=submit name=button value=get>

		value  <input name=result>

		</form>

	</pre>

	<script> console.log('see server log') </script>`

const fs = require("fs")
require("./lib/wasm_exec") // note the ./

var go = new Go()
var kvs

WebAssembly.instantiate(fs.readFileSync("lib/pot.wasm"), go.importObject)
	.then((r) => { go.run(r.instance) })

global.onWasmLoaded = () => {

	bee = process.argv[2]
	batch = process.argv[3]
	console.log(bee, batch)

	pot.setVerbosity(pot.INFO)

	kvs = pot.newSync(bee, batch)
	console.log('srv: KVS initialized')

	// Notes:
	// * The "pot: " log entries are coming from Go pot.wasm.
	// * There is no catching of early calls of put() and get()
	// * onWasmLoaded could be defined async, for await pot.new()
	// * onWasmLoaded has to be added to global to get detected
}

async function put(key, value) {

	await kvs.put(key, value)

	return `put ${key}: ${value}`
}

async function get(search) {

	value = await kvs.get(search)

	return `get ${search}: ${value}
		<script>
		document.getElementsByName('result')[0].value = '${value}'
		</script>`
}

const server = http.createServer(function(request, response) {

	if (request.method == 'POST') {

		var body = ''
		request.on('data', function(data) {
			body += data
		})

		request.on('end', async function() {

			var log
			const post = qs.parse(body)

			if(post.button == 'put')
				log = await put(post.key, post.value)
			else
				log = await get(post.search)

			console.log("srv: " + log.match(/.*/)[0])

			response.writeHead(200, {'Content-Type': 'text/html'})
			response.end(form + '<hr><br><pre>\t\t' + log)
		})
	}
	else {
		response.writeHead(200, {'Content-Type': 'text/html'})
		response.end(form)
	}
})
.listen(3000, '127.0.0.1')

console.log(`srv: listening at http://127.0.0.1:3000`)
