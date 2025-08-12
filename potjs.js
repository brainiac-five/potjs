
	const go = new Go()

	if(typeof pot == 'undefined') pot = {}

	pot.start = new Promise((resolve, reject) => {
		WebAssembly.instantiateStreaming(fetch("pot.wasm"), go.importObject)
			.then((r) => { go.run(r.instance) ; resolve(pot) })
			.catch((e) => { reject(e) })
	})

	pot.ready = () => { return pot.start }



