/* POT JS Test Frame */

const hi   = "\033[97m"
const mid  = "\033[37m"
const low  = "\033[90m"
const erm  = "\033[91m"
const warn = "\033[38;5;214m"
const ok   = "\033[36m"
const off  = "\033[0m"

const NODE = (typeof window === 'undefined')

globalThis.T = {
	tests:            0,
	errors:           0,
	suites:           0,
	cases:            0,
	head:             suitehead,
	start:            teststart,
	log:              log_and_display,
	box_display:      box_display,
	balance:          balance,
	tag:              null,
	inside:           false,
	connection_issue: null,
	time:             null,
	NODE:		  NODE
}

// Write both to browser consol and, briefer and more formatted, to web page.
function log_and_display(one, two, three, four) {

	if(two) {
		thread = one
		msg = two
	} else {
		thread = null
		msg = one
	}
	gray = three
	let box = four

	if(!msg) msg = ""
	if(typeof msg == 'number')
		msg = msg.toString()
	else if(typeof msg == 'string')
		;
	else if(msg.stack && msg.message)
		msg = "### error: " +  msg.message
	else {
		console.log("xxx msg type error -- ", msg)
		msg = "xxx msg type error" ///
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
	loc = stack.match(/[a-zA-Z0-9:._]+_test\.js:[0-9]+/)
	//if(!loc) loc = stack.match(/[a-zA-Z_-]+\.html/) + stack.match(/(:[0-9]+):[0-9]+\s*$/)[1]
	if(!loc) loc = "--" // stack

	// console log
	if(box && box != T.box) console.log("◊◊◊ out-of-sync message from earlier case follows: " + box.id)
	logmsg = msg.replace(/\<[^>]*\>/, "▶︎").replace(/\<[^>]*\>/g, "◀︎")
	if(trail == "•••" || trail == "---") pot.log()
	if(NODE && trail == "•••") pot.log()
	if(NODE && trail == "•••") pot.log("=".repeat(80))
	if(NODE && first == "✦") pot.log("-".repeat(80))
	if(NODE && first == "•" && trail != "•••") pot.log()
	if(NODE && trail == "•••") logmsg = hi + logmsg + off
	else if(NODE && first == "✦") logmsg = mid + logmsg + off + " | " + loc
	else if(NODE && first == "•") logmsg = mid + logmsg + off
	if(pot.log)
		pot.log(threadno + logmsg)
	else {
		console.log(">>> direct to console log (pot.log unavailable):")
		console.log(threadno + logmsg)
	}
	if(NODE && trail == "•••") pot.log("=".repeat(80))
	if(NODE && first == "✦") pot.log("-".repeat(80))

	if(NODE) return

	// web page display
	if(thread) {
		threadtag = "<div class='threadtag color" + thread + "'>" + thread + "</div>"
		reps = thread <= 3 ? thread -1 : 2
		threadtag += new String(" &nbsp; ").repeat((reps) * 8)
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
		display("<a name=acase_" + T.cases + "></a> <div class=box id=case_" + T.cases + "> <div class=casehead> " + msg + insert + " </div> </div>")
		this.inside = true
	}
	else if(first == "#") {
		T.box_display("<div class=error> " + threadtag + msg.substring(4) + " at " + loc + profile() + "</div>", true, box)
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
		T.box_display("<div class=check> " + threadtag + " <div class=text> " + msg + " </div> " + profile() + " </div>", false, box)
	else if(first == "›")
		T.box_display("<div class=detail> <div class='threadtag color0'>0</div> " + " <div class=text> " + msg + " </div> </div>", false, box)
	else if(msg && T.inside)
		T.box_display("<div class=detail> " + threadtag + " <div class=text> " + msg + " </div> <div class=loc>" + loc + "</div> </div>", false, box)
	else if(msg)
		T.box_display("<div class=detail> " + threadtag + " <div class=note> " + msg + " </div> </div>", false, box)

}

// browser only
function display(msg) {
	document.body.innerHTML += msg
}

// browser only
var linked_cases = {}
function box_display(msg, teint, box) {
	let loc = box ? box : (this.box && this.inside ? this.box : null)
	if(loc && teint) loc.className = "err"
	let o = loc ? loc : document.body
	o.insertAdjacentHTML("beforeend", msg)  /// TODO: make append to higher up box from async processes
						/// To test, make the timeout in massmax parallel tests too small
						/// and make the individual processes error
	try {
		errlinks = document.getElementById("errorlinks")
		if(teint && errlinks && loc && !linked_cases[loc.id]) {
			errlinks.innerHTML += (" <a class=errlink href=#a" + loc.id + ">" + loc.id.replace(/_/," ") + "</a> ")
			linked_cases[loc.id] = true
		}
	} catch(e) {}
}

// browser only
function set_counter(count) {
	if(NODE) return
	let o = document.getElementById("counter")
	if(o) o.innerHTML = count
}

// node/web mix
function profile() {
	if(T.time) {
		let t = Date.now() - T.time
		T.time = Date.now()
		if(t < 60000) {
			if(t < 1) t = "<1"
			return (NODE ? " | " + t : "<div class=time>" + t + "ms</div>")
		}
	}
	T.time = Date.now()
	return ""
}

// node/web mix
function suitehead(msg, gray) {
	T.log(null,
	      "••• Test Suite #" + ++(this.suites) + " ••• " + msg.toUpperCase() + " •••"
	        + (T.tag ? (NODE ? " | " : "<div class=righttag>") + T.tag.toUpperCase() + (NODE ? "" : "</div>") : ""), 
	      gray)
	T.time = Date.now()
}

// node/web mix
function teststart(msg) {
	T.log()
	T.log("✦ case #" + ++(this.cases) + " » " + msg)
	if(!NODE) {
		this.box = document.getElementById("case_" + this.cases)
		if(!this.box) throw("harness fail for box" + this.cases)
	}
	T.time = Date.now()
}

// node/web mix
function balance() {

	T.log("••• tests cases run: " + T.cases + " • assertions: " + T.tests + "  •••")

	if(NODE) {
		if(T.errors)
			T.log("errors: " + T.errors + "")
		else
			T.log("no errors")
	} else {
		if(T.errors) {
			T.log("<h4 class=err> errors: " + T.errors + " </h4>")
			document.getElementById("status").className="err"
			document.getElementById("status").innerHTML="errors: " + T.errors
		} else {
			T.log("<h4 class=ok> no errors </h4>")
			document.getElementById("status").className="ok"
			document.getElementById("status").innerHTML=T.suites + " suites • " + T.cases + " cases • " + T.tests + " assertions • passed with no errors."
		}
	}
}

// -----------------------------------------------------------------------------

T.assertNoError = function(t, T, err, suppress_ok, box) {
	T.tests++
	set_counter(T.tests)
	if(err) {
		T.log(t, "### Test Error: ‹" + err + "› ###", false, box)
		T.errors++
	}
	else if(!suppress_ok) T.log(t, "√ no error raised.", false, box)
}

T.assertIsError = function(t, T, err) {
	T.tests++
	set_counter(T.tests)
	if(!(err instanceof Error)) {
		T.log(t, "### Should Have Returned Error, instead of ‹" + err + "› ###")
		T.errors++
	}
	else T.log(t, "√ returned error, as expected.")
}

T.assertNotAnError = function(t, T, err, suppress_ok) {
	T.tests++
	set_counter(T.tests)
	if(err instanceof Error) {
		T.log(t, "### Unexpected, Returned Error: ‹" + err + "› ###")
		T.errors++
	}
	else if(!suppress_ok)
		T.log(t, "√ no error returned.")
}

T.assertError = function(t, T, err, pattern) {
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

T.attestError = function(t, T, err) {
	T.tests++
	set_counter(T.tests)
	T.log(t, "### test error: ‹" + err + "› ###")
	T.errors++
}

T.attestExpectedError = function(t, T, err, exp) {
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
T.attestUnexpectedError = function(t, T, err, box) {
	T.tests++
	set_counter(T.tests)
	T.log(t, "### Test Error (Exception): ‹" + err + "›", false, box)
	if(err.message.match(/fetch.. failed/)) T.connection_issue = true
	T.errors++
}

T.attestMissingError = function(t, T, err) {
	T.tests++
	set_counter(T.tests)
	T.log(t, "### Test Error: should have errored ###")
	T.errors++
}

T.attestNoError = function(t, T, suppress_ok, box) {
	T.tests++
	set_counter(T.tests)
	if(!suppress_ok)
		T.log(t, "√ no error raised.", false, box)
}

T.attestCompletion = function(t, T, suppress_ok) {
	T.tests++
	set_counter(T.tests)
	if(!suppress_ok)
		T.log(t, "› √ complete.")
}

T.assertUndefined = function(t, T, val) {
	T.tests++
	set_counter(T.tests)
	if(!(val === undefined)) {
		T.log(t, "### Test Error » not undefined but ‹" + (typeof val) + "› ###")
		T.errors++
	}
	else T.log(t, "√ as expected, undefined.")
}

T.assertNil = function(t, T, val) {
	T.tests++
	set_counter(T.tests)
	if(val !== null) {
		T.log(t, "### Test Error » not nil but ‹" + val + "› ###")
		T.errors++
	}
	else T.log(t, "√ as expected, nil.")
}

T.assertEqual = function(t, T, res, exp, suppress_ok, box) {
	T.tests++
	set_counter(T.tests)
	equal = false
	if(res != null && exp != null && typeof res == 'object' && typeof exp == 'object') // Uint8Array
		equal = isEqualArray(res, exp)
	else
		equal = (res == exp)

	lres = (res && (typeof res == 'object')) ? T.hex(res) : res
	lexp = (exp && (typeof exp == 'object')) ? T.hex(exp) : exp

	if(!equal) {
		T.log(t, "### Test Error: result ‹" + lres + "› was expected to be ‹" + lexp + "› ###", false, box)
		T.errors++
	}
	else if(!suppress_ok)
		T.log(t, "√ as expected, ‹" + lres + "›.", false, box)
}

T.assertNotEqual = function(t, T, res, exp) {
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

T.completion = async function(t, T, threads, interval, max) {
	T.log(t, "› waiting for completion")
	let snap = ""
	for(let count = 0; threads() && count++ < max / interval;) {
		T.log(t, "› concurrent threads: " + threads())
		snap += (snap ? " • ":"") + threads()
		await T.delay(interval)
	}
	if(threads())
		T.attestError(t, T, "timed out (" + max + "ms) with " + threads() + " threads uncleared")
	else {
		if(snap.includes("•")) T.log(t, snap)
		T.attestCompletion(t, T)
	}
}

T.delay = async function(millisec) {
	await new Promise(resolve => setTimeout(resolve, millisec))
}

T.hex = function(buf) {
	return Array.from(new Uint8Array(buf)).map((n)=>{return (n>15?"":"0") + n.toString(16)}).join('')
}

T.hexa = function(buf) {
	return Array.from(buf).map((n)=>{return (n>15?"":"0") + n.toString(16)}).join('')
}

function fromHex(hexString) {
	if(!hexString) return "[empty]"
	return Uint8Array.from(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)));
}
