require("./potjs/lib/pot-node")

; (async () => {
	await pot.ready()
	swarmUrl = process.argv[2]
	batchId = process.argv[3]

	kvs = new pot.Kvs(swarmUrl, batchId)

	await kvs.put("user/ada", "Ada Lovelace")
	await kvs.put("user/bob", "Bob")
	await kvs.put("ticket/SB-1", "Fix the thing")
	await kvs.put("ticket/SB-2", "Write the docs")

	// Every key, in ascending byte order — no need to already know they exist.
	keys = await kvs.keys()
	console.log("all keys:", keys.map(pot.keyString))

	// Only the ones starting with "ticket/" — descends straight to that
	// part of the trie, so this costs roughly the size of the *match*,
	// not the size of the whole store.
	tickets = await kvs.entries("ticket/")
	for (const [key, value] of tickets) {
		console.log("ticket:", pot.keyString(key), "=", value)
	}

	// Just a count, when you don't need the values at all.
	n = await kvs.count("user/")
	console.log("user count:", n)
})()
