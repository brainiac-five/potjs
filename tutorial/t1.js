require("./potjs/lib/pot-node")

; (async () => {
	await pot.ready()
	kvs = new pot.Kvs()
	await kvs.put("hello", "P.O.T.")
	value = await kvs.get("hello")
	console.log("hello:", value)
})()

