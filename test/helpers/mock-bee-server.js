// Standalone process (not required as a module): a minimal stand-in for
// Bee's PUT /bytes. Must run as a genuinely separate OS process from
// whatever calls pot.Kvs.put() against it - see jest.performance.js's
// top-of-file comment for why an in-process http.createServer cannot work
// here: the vendored sync XHR blocks its *own* event loop while waiting for
// its spawned helper process, so a same-process server could never get a
// chance to accept the connection that helper makes.
const http = require('http')
const port = Number(process.argv[2])
const server = http.createServer((req, res) => {
	const chunks = []
	req.on('data', (c) => chunks.push(c))
	req.on('end', () => {
		const body = Buffer.concat(chunks)
		res.writeHead(201, { 'content-type': 'application/json' })
		res.end(JSON.stringify({ reference: 'b'.repeat(64), receivedBytes: body.length }))
	})
})
server.listen(port, '127.0.0.1', () => {
	if (process.send) process.send('ready')
})
