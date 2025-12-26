console.log(`

	POT JS Example 8: Node.js, in-memory, explict init, asynchronous


	This is a self-contained web app, serving a page to receive input,
	returning the results.

	open http://localhost:3000

`)

const http = require("http")
const qs = require("querystring")
const fs = require("fs")
require("./lib/wasm_exec")

const form = `<pre>


		POT JS Example 8: Node.js Web App Server

		<form method=post action="http://localhost:3000">

		key     <input name=key>

		value   <input name=value>

			<input type=submit name=button value=put>


	<hr />


		key     <input name=search>

			<input type=submit name=button value=get>

		value   <input name=result>

		</form>
	<hr />

	</pre>

	<script> console.log('see server log in terminal') </script>

	<pre>
		`

var kvs

var go = new Go()

WebAssembly.instantiate(fs.readFileSync("lib/pot.wasm"), go.importObject)
	.then((r) => { go.run(r.instance) })

global.onPotInitialized = async () => {

	bee = process.argv[2]
	batch = process.argv[3]

	kvs = await pot.new(bee, batch)

	// There is no catching of early calls of put() and get()
	// in this example, which in theory could race the loading
	// of pot.wasm and the creation of kvs.
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

const server = http.createServer((request, response) => {

	var log  = ''
	var body = ''

	request.on('data', (data) => body += data)
		.on('end', async () => {
			const { button, key, value, search } = qs.parse(body)
			switch(button) {
			case 'put': log = await put(key, value) ; break
			case 'get': log = await get(search)
			}
			response.writeHead(200)
			response.end(form + log)
	})
})
.listen(3000, '127.0.0.1')

console.log('srv: listening at http://127.0.0.1:3000')
