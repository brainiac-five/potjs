console.log(`

	POT JS Example 9: Node.js Web App Server / local Swarm network

	This is a self-contained web app, serving
	a page to receive input, returning results.

	Identical to example 8, just started with different arguments,
	giving a network url and a batch id, by make.

`)

const http = require("http")
const qs = require("querystring")
const pot = require("./lib/pot-node")("./lib/pot.wasm", 2) // 2 = ERROR log level

const form = `<pre>


		POT JS Example 9: Node.js Web App / local Swarm network

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

	<script> console.log('see server log in terminal') </script>`

var kvs

; (async () => {

	await pot.ready()

	bee = process.argv[2]
	batch = process.argv[3]
	console.log("srv:  network parameters:", bee, batch)

	kvs = pot.newSync(bee, batch)
	console.log("srv:  KVS initialized")

	// Notes:
	// * onWasmLoaded has to be added to `global` to be detected
	// * There is no catching of early calls of put() and get()
	//   in this example, which in theory could race the loading
	//   of pot.wasm and the creation of kvs.
	// * onWasmLoaded could be defined async to use `await pot.new()`
	// * The "pot: " log entries are coming from pot.wasm.
})()

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
