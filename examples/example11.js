console.log(`


	POT JS Example 11: error handling

	Check source and terminal.

`)

require("./lib/pot-node")(1)

; (async () => {

	await pot.ready()

	kvs = new pot.Kvs()

	// .catch
	console.log("      ► chained .catch()")
	pot.setFail(true)
	await kvs.put("hello", "node")
		 .catch(e=>console.log("      ⟶   caught in chained .catch: " + e))

	// cancel()
	console.log("      ► cancel")
	pot.setHang(true)
	put = kvs.put("hello", "node") // cancel() works only when .catch() is not chained to put() itself
	put.catch(e=>console.log("      ⟶   caught in cancel .catch: " + e))
	put.cancel()

	// timout
	console.log("      ► timeout")
	pot.setHang(true)
	timeout = 10 // ms
	put = kvs.put("hello", "node", timeout)
	put.catch(e=>console.log("      ⟶   caught in timeout .catch: " + e))

	// try-catch
	console.log("      ► try-catch block")
	pot.setFail(true)
	try {
		await kvs.put("hello", "node")
	} catch(e) {
		console.log("      ⟶   caught in try-catch block: " + e)
	}

	// sync call
	console.log("      ► sync call")
	pot.setFail(true)
	e = kvs.putSync("hello", "node") // sync calls don't throw but return errors
	if(e) {
		console.log("      ⟶   returned from sync call: " + e)
	}
})()

