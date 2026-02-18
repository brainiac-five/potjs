console.log(`

	POT JS Example 9: Node.js, local Swarm network, synchronous

	This is a self-contained web app, serving a page to receive input,
	returning the results.

	Functionally identical to example 8, just: started with different
	arguments — a network url and a batch id — by the calling make rule;
	and POT calls used are synchronously blocking instead of promises.

	open http://localhost:3000

`)

const http = require("http")
const qs = require("querystring")
require("./lib/pot-node")

const form = `<!DOCTYPE html><head><meta charset="UTF-8"></head>
	<pre>

		POT JS Example 9: Node.js Web App / local Swarm network

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

global.onPotInitialized = () => {

	bee = process.argv[2]
	batch = process.argv[3]
	kvs = new pot.Kvs(bee, batch)

	// There is no catching of early calls of put() and get()
	// in this example, which in theory could race the loading
	// of pot.wasm and the creation of kvs.
}

function put(key, value) {

	kvs.putSync(key, value)

	return `put ${key}: ${value}`
}

function get(search) {

	value = kvs.getSync(search)

	return `get ${search}: ${value}

		<script>
		document.getElementsByName('result')[0].value = '${value}'
		</script>`
}

const server = http.createServer((request, response) => {

	var log  = ''
	var body = ''

	request.on('data', (data) => body += data)
		.on('end', () => {
			const { button, key, value, search } = qs.parse(body)
			switch(button) {
			case 'put': log = put(key, value) ; break
			case 'get': log = get(search)
			}
			response.writeHead(200)
			response.end(form + log)
	})
})
.listen(3000, '127.0.0.1')

console.log('srv: listening at http://127.0.0.1:3000')
