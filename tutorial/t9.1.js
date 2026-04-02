require("./potjs/lib/pot-node")("lib2/pot.wasm", 5 | 4096)

; (async () => {
	await pot.ready()
	kvs = new pot.Kvs()
	await kvs.put("hello", "P.O.T.")
	value = await kvs.get("hello")
	console.log("hello:", value)
})()

