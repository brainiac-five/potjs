const http = require("http")
const qs = require("querystring")
require("./potjs/lib/pot-node")

const form = `<pre>

		<form method=post action="http://localhost:3000">

		key    <input name=key>

		value  <input name=value>

		       <input type=submit name=button value=put>


	<hr />


		key    <input name=search>

		       <input type=submit name=button value=get>

		value  <input name=result>

		</form>

	</pre>`

var kvs

; (async () => {
	await pot.ready()
	kvs = pot.newSync()
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
