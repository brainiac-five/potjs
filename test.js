/* POT JS Test Frame */

var T = {
	tests:   0,
	errors:  0,
	suites:  0,
	cases:   0,

	head:    suitehead,
	start:   teststart,
	log:     log_and_display,
	box_display: box_display,
	balance: balance,
	inside:  false
}

function balance() {

	T.log("••• tests cases run: " + T.cases + " • assertions: " + T.tests + "  •••")
	if(T.errors) {
		T.log("<h4 class=err> errors: " + T.errors + " </h4>")
		document.getElementById("status").className="err"
		document.getElementById("status").innerHTML="errors: " + T.errors
	}
	else {
		T.log("<h4 class=ok> no errors </h4>")
		document.getElementById("status").className="ok"
		document.getElementById("status").innerHTML=T.suites + " suites • " + T.cases + " cases • " + T.tests + " assertions • passed with no errors."
	}
}

// Write both to browser consol and, briefer and more formatted, to web page.
function log_and_display(one, two, three) {

	if(two) {
		thread = one
		msg = two
	} else {
		thread = null
		msg = one
	}
	gray = three

	if(!msg) msg = ""
	if(typeof msg == 'number')
		msg = msg.toString()
	if(!(typeof msg == 'string')) {
		console.log("xxx msg type error", msg)
		msg = "xxx msg type error"
	}

	msg = msg.replace("\n","\\n")
	msg = msg.replace("\r","\\rn")
	msg = msg.replace("\t","\\t")
	msg = msg.replace("\b","\\b")
	msg = msg.replace("\0","\\0")

	first = msg.substring(0,1)
	trail = msg.substring(0,3)

	if(thread) threadno = thread + ": "
	else threadno = ""

	stack = new Error().stack
	loc = stack.match(/[a-zA-Z0-9:._]+$/)
	if(!loc) { loc = stack.match(/([a-zA-Z0-9:._]+)\)\s+at (async )*main/); if(loc) loc = loc[1] }
	if(!loc) loc = stack

	// console log
	logmsg = msg.replace(/\<[^>]*\>/, "▶︎").replace(/\<[^>]*\>/g, "◀︎")
	if(trail == "•••" || trail == "---") pot.log()
	if(pot.log) pot.log(threadno + logmsg)
	else {
		console.log(">>> direct to console log (top.log unavailable):")
		console.log(threadno + logmsg)
	}

	// web page display
	if(thread) {
		threadtag = "<div class='threadtag color" + thread + "'>" + thread + "</div>"
		threadtag += new String(" &nbsp; ").repeat((thread-1) * 8)
	} else
		threadtag = ""

	if(first == "<")
		display(msg)
	else if(first == "✦") {
		// stack = new Error().stack
		// loc = stack.match(/([a-zA-Z0-9:._]+)\)\s+at (async )*main/)
		// if(loc) loc = loc[1]
		// else loc = stack
		insert = "<div style='float:right'>" + loc + "</div>"
		pot.log(loc)
		display("<div class=box id=box" + T.cases + "> <div class=casehead> " + msg + insert + " </div> </div>"), this.inside = true
	}
	else if(first == "#") {
		T.box_display("<div class=error> " + threadtag + msg.substring(4) + " at " + loc + "</div>", true)
		pot.log(loc)
	}
	else if(trail == "•••")
		if(!gray)
			display("<h3> " + threadtag + msg.substring(4).slice(0,-4) + " </h3>"), this.inside = false
		else
			display("<h3 class=gray> " + threadtag + msg.substring(4).slice(0,-4) + " </h3>"), this.inside = false
	else if(trail == "---")
		display("<div class=sub> " + threadtag + msg.substring(4) + " </div>"), this.inside = false
	///else if(msg == "√ no error raised.")
	///	;
	else if(first == "√")
		T.box_display("<div class=check> " + threadtag + " <div class=text> " + msg + " </div> </div>")
	else if(first == "›")
		T.box_display("<div class=detail> <div class='threadtag color0'>0</div> " + " <div class=text> " + msg + " </div> </div>")
	else if(msg && T.inside)
		T.box_display("<div class=detail> " + threadtag + " <div class=text> " + msg + " </div> <div class=loc>" + loc + "</div> </div>")
	else if(msg)
		T.box_display("<div class=detail> " + threadtag + " <div class=note> " + msg + " </div> </div>")

}

function display(msg) {
	document.body.innerHTML += msg
}

function box_display(msg, teint) {
	let o = document.getElementById("box" + this.cases)
	if(o && teint) o.className = "err"
	if(!this.inside || !o) o = document.body
	o.innerHTML += msg
}

function set_counter(count) {
	let o = document.getElementById("counter")
	if(o) o.innerHTML = count
}

function suitehead(msg, gray) {
	T.log(null, "••• Test Suite #" + ++(this.suites) + " ••• " + msg.toUpperCase() + " •••", gray)
}

function teststart(msg) {
	T.log()
	T.log("✦ case #" + ++(this.cases) + " » " + msg)
}

// -----------------------------------------------------------------------------

function assertNoError(t, T, err, suppress_ok) {
	T.tests++
	set_counter(T.tests)
	if(err) {
		T.log(t, "### Test Error: ‹" + err + "› ###")
		T.errors++
	}
	else if(!suppress_ok) T.log(t, "√ no error raised.")
}

function assertIsError(t, T, err) {
	T.tests++
	set_counter(T.tests)
	if(!(err instanceof Error)) {
		T.log(t, "### Should Have Returned Error, instead of ‹" + err + "› ###")
		T.errors++
	}
	else T.log(t, "√ returned error, as expected.")
}

function assertNotAnError(t, T, err, suppress_ok) {
	T.tests++
	set_counter(T.tests)
	console.log(t, err)
	if(err instanceof Error) {
		T.log(t, "### Unexpected, Returned Error: ‹" + err + "› ###")
		T.errors++
	}
	else if(!suppress_ok)
		T.log(t, "√ no error returned.")
}

function assertError(t, T, err, pattern) {
	T.tests++
	set_counter(T.tests)
	if(!err || !(err instanceof Error)) {
		T.log(t, "### Test Error: should have errored, instead returned ‹" + err + "›. ###")
		T.errors++
	} else {
		if(pattern) {
			if(err.message.match(pattern))
				T.log(t, "√ expected error: ‹" + err + "›.")
			else {
				T.log(t, "### Test Error: wrong error, expected "+ pattern.toString() +" , instead got ‹" + err + "›. ###")
				T.errors++
			}
		} else {
			T.log(t, "√ some error raised as expected, in the instance: ‹" + err + "›.")
		}
	}
}

function attestError(t, T, err) {
	T.tests++
	set_counter(T.tests)
	T.log(t, "### test error: ‹" + err + "› ###")
	T.errors++
}

function attestExpectedError(t, T, err, exp) {
	T.tests++
	set_counter(T.tests)
	if(exp && err != exp) {
		T.log(t, "### Wrong Error: ‹" + err + "›, expected ‹" + exp + "› ###")
		T.errors++
	}
	else
		T.log(t, "√ expected error: ‹" + err + "›")
}

// for catch block when it should not be entered
function attestUnexpectedError(t, T, err) {
	T.tests++
	set_counter(T.tests)
	T.log(t, "### Test Error (Exception): ‹" + err + "›")
	T.errors++
}

function attestMissingError(t, T, err) {
	T.tests++
	set_counter(T.tests)
	T.log(t, "### Test Error: should have errored ###")
	T.errors++
}

function attestNoError(t, T, suppress_ok) {
	T.tests++
	set_counter(T.tests)
	if(!suppress_ok)
		T.log(t, "√ no error raised.")
}

function attestCompletion(t, T, suppress_ok) {
	T.tests++
	set_counter(T.tests)
	if(!suppress_ok)
		T.log(t, "› √ complete.")
}

function assertUndefined(t, T, val) {
	T.tests++
	set_counter(T.tests)
	if(!(val === undefined)) {
		T.log(t, "### Test Error » not undefined but ‹" + (typeof val) + "› ###")
		T.errors++
	}
	else T.log(t, "√ as expected, undefined.")
}

function assertNil(t, T, val) {
	T.tests++
	set_counter(T.tests)
	if(val !== null) {
		T.log(t, "### Test Error » not nil but ‹" + val + "› ###")
		T.errors++
	}
	else T.log(t, "√ as expected, nil.")
}

function assertEqual(t, T, res, exp, suppress_ok) {
	T.tests++
	set_counter(T.tests)
	equal = false
	if(res != null && exp != null && typeof res == 'object' && typeof exp == 'object') // Uint8Array
		equal = isEqualArray(res, exp)
	else
		equal = (res == exp)
	if(!equal) {
		T.log(t, "### Test Error: result ‹" + ((res && (typeof res == 'object')) ? hex(res) : res) + "› was expected to be ‹" + exp + "› ###")
		T.errors++
	}
	else if(!suppress_ok)
		T.log(t, "√ as expected, ‹" + ((res && (typeof res == 'object')) ? hex(res) : res) + "›.")
}

function assertNotEqual(t, T, res, exp) {
	T.tests++
	set_counter(T.tests)
	if(res == exp) {
		T.log(t, "### Test Error: result was expected to not be ‹" + exp + "› ###")
		T.errors++
	}
	else T.log(t, "√ as expected, ‹" + res + "› not ‹" + exp + "›.")
}

// -----------------------------------------------------------------------------

function isEqualArray(a, b) {
	if (a.length != b.length) return false;
	for (let i = 0; i < a.length; i++)
		if (a[i] != b[i]) return false;
	return true;
}

async function completion(t, T, threads, interval, max) {
	T.log(t, "› waiting for completion")
	let snap = ""
	for(let count = 0; threads() && count++ < max / interval;) {
		T.log(t, "› concurrent threads: " + threads())
		snap += (snap ? " • ":"") + threads()
		await delay(interval)
	}
	if(threads())
		attestError(t, T, "timed out (" + max + "ms) with " + threads() + " threads uncleared")
	else {
		if(snap.includes("•")) T.log(t, snap)
		attestCompletion(t, T)
	}
}

async function delay(millisec) {
	await new Promise(resolve => setTimeout(resolve, millisec))
}

function hex(buf) {
	return Array.from(new Uint8Array(buf)).map((n)=>{return (n>15?"":"0") + n.toString(16)}).join('')
}

function hexa(buf) {
	return Array.from(buf).map((n)=>{return (n>15?"":"0") + n.toString(16)}).join('')
}
