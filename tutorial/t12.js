require("./potjs/lib/pot-node")

; (async () => {
	await pot.ready()
        swarmUrl = process.argv[2]
        batchId = process.argv[3]
	kvs = new pot.Kvs(swarmUrl, batchId)
	await kvs.put("hello", "P.O.T.")
	await kvs.save()
	value = await kvs.get("hello")
	console.log("hello:", value)
})()

