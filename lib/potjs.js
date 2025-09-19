
	const go = new Go()

	if(typeof pot == 'undefined') pot = {}


	pot.start = new Promise((resolve, reject) => {
		let wasm = document.currentScript.getAttribute('wasm')
		if(!wasm) wasm = "pot.wasm"
		WebAssembly.instantiateStreaming(fetch(wasm), go.importObject)
			.then((r) => { go.run(r.instance) ; resolve(pot) })
			.catch((e) => { reject(e) })
	})

	pot.ready = () => { return pot.start }



