require("./potjs/lib/pot-node")

; (async () => {
	await pot.ready()
        swarm_url = process.argv[2]
        batch_id = process.argv[3]
        save_ref = process.argv[4]
	kvs = await pot.load(save_ref, swarm_url, batch_id)
	value = await kvs.get("hello")
	console.log("hello:", value)
})()

