require("./potjs/lib/pot-node")

; (async () => {
	await pot.ready()
        swarmUrl = process.argv[2]
        batchId = process.argv[3]
        saveRef = process.argv[4]
	kvs = await pot.load(saveRef, swarmUrl, batchId)
	value = await kvs.get("hello")
	console.log("hello:", value)
})()

