console.log(`


	POT JS Example 10: cancel

	Check source and terminal.

`)

require("./lib/pot-node")

; (async () => {

	await pot.ready()
	pot.setVerbosity(pot.INFO)

	kvs = await pot.new()

	pot.setDelay(1000)

	put = kvs.put("hello", "node")
	put.catch((e)=>console.log(">>>> ", e.message))
	put.cancel()

	console.log(">>>>  hello:", await kvs.get("hello"))
})()

