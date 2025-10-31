require("./potjs/lib/pot-node")

; (async () => {
	await pot.ready()
        swarm_url = process.argv[2]
        batch_id = process.argv[3]
	kvs = await pot.new(swarm_url, batch_id)
	await kvs.put("hello", "P.O.T.")
	pot.setVerbosity(pot.TRACE)
	await kvs.save()
	value = await kvs.get("hello")
	console.log("hello:", value)
})()

