console.log(`


	POT JS Example 7: node.js

	Check source and terminal.

`)

require("./lib/pot-node")

; (async () => {

	await pot.ready()

	kvs = new pot.Kvs()

	await kvs.put("hello", "node")

	value = await kvs.get("hello")

	console.log("hello:", value)
})()

