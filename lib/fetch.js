const XMLHttpRequest = require("../lib/xmlhttprequest").XMLHttpRequest;

global.jsFetchSync = function(method, url, data, headers, verbosity) {

	log = msg => { if(verbosity >= 5) console.log(msg) }

	log("jsf:  ∙ fetch sync start")
	log("jsf:  ∙ fetch sync url     : " + url)
	log("jsf:  ∙ fetch sync headers : " + (headers ? Object.keys(headers).map(k => k + ":" + headers[k]).join() : ""))
	log("jsf:  ∙ fetch sync data    : " + data)

	var xhr = new XMLHttpRequest({syncPolicy:"enabled", verbosity: verbosity}); // policy: suppresses deprec warning
	if(method=='GET') xhr.responseType = 'arraybuffer'
	try {
		xhr.open(method, url, false) // false = sync

		for (const hi in headers)
			xhr.setRequestHeader(hi, headers[hi])

		bytes = data ? Uint8Array.from(data.match(/.{2}/g).map((byte) => parseInt(byte, 16))) : null
		if(bytes) log("jsf:  ∙ fetch sync byte len: " + bytes.length)

		xhr.send(bytes)

		if(typeof xhr.response == 'string')
			log("jsf:  ∙ fetch sync response: " + xhr.response.replaceAll("\n", "\\n"))
		if(xhr.response instanceof Uint8Array)
			log("jsf:  ∙ fetch sync response: " + Array.from(xhr.response).map(b=>b<=(15?"0":"")+b.toString(16)).join(''))

		return xhr.response
	}
	catch (error) {
		console.error(error.message);
	}
}

