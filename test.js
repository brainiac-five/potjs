/* POT JS Test Frame */

var T = {
	tests:   0,
	errors:  0,
	suites:  0,
	cases:   0,

	head:    suitehead,
	start:   teststart,
	log:     log_and_display,
	balance: balance,
	inside:  false
}

function balance() {

	T.log("••• tests run: " + T.tests + " •••")
	if(T.errors) {
		T.log("<h4 class=err> errors: " + T.errors + " </h4>")
		document.getElementById("status").className="err"
		document.getElementById("status").innerHTML="errors: " + T.errors
	}
	else {
		T.log("<h4 class=ok> no errors </h4>")
		document.getElementById("status").className="ok"
		document.getElementById("status").innerHTML=T.tests + " tests complete, no errors."
	}
}

// Write both to browser consol and, briefer and more formatted, to web page.
function log_and_display(msg) {

	if(!msg) msg = ""

	msg = msg.replace("\n","\\n")
	msg = msg.replace("\r","\\rn")
	msg = msg.replace("\t","\\t")
	msg = msg.replace("\b","\\b")
	msg = msg.replace("\0","\\0")

	first = msg.substring(0,1)
	trail = msg.substring(0,3)

	// console log
	logmsg = msg.replace(/\<[^>]*\>/, "▶︎").replace(/\<[^>]*\>/g, "◀︎")
	if(trail == "•••" || trail == "---") pot.log()
	pot.log(logmsg)

	// web page display
	if(first == "<")
		display(msg)
	else if(first == "✦")
		display("<div class=box id=box" + T.cases + "> <div class=casehead> " + msg + " </div> </div>"), inside = true 
	else if(first == "#")
		box_display("<p class=err> " + msg.substring(4) + " </p>", true)
	else if(trail == "•••")
		display("<h3> " + msg.substring(4).slice(0,-4) + " </h3>"), inside = false
	else if(trail == "---")
		display("<p class=sub> " + msg.substring(4) + " </p>"), inside = false
	else if(msg == "√ no error raised.")
		;
	else if(first == "√")
		box_display("<p class=check> " + msg + " </p>")
	else
		box_display("<p class=detail> " + msg + " </p>")
}

function display(msg) {
	document.body.innerHTML += msg
}

function box_display(msg, teint) {
	let o = document.getElementById("box" + T.cases)
	if(o && teint) o.className = "err"
	if(!inside || !o) o = document.body
	o.innerHTML += msg
}

function suitehead(msg) {
	T.log("••• Test Suite #" + ++(this.suites) + " ••• " + msg.toUpperCase() + " •••")
}

function teststart(msg) {
	T.log()
	T.log("✦ case #" + ++(this.cases) + " » " + msg)
}

function assertNoError(T, err) {
	T.tests++
	if(err) {
		T.log("### test error: ‹" + err + "› ###")
		T.errors++
	}
	else T.log("√ no error raised.")
}

function assertIsError(T, err) {
	T.tests++
	if(!(err instanceof Error)) {
		T.log("### should have returned error, instead of ‹" + err + "› ###")
		T.errors++
	}
	else T.log("√ returned error, as expected.")
}

function assertNotAnError(T, err) {
	T.tests++
	console.log(err)
	if(err instanceof Error) {
		T.log("### unexpected, returned error: ‹" + err + "› ###")
		T.errors++
	}
	else T.log("√ no error returned.")
}

function assertError(T, err) {
	T.tests++
	if(!err) {
		T.log("### Test Error: should have errored. ###")
		T.errors++
	}
	else T.log("√ error raised, as expected.")
}

function attestError(T, err) {
	T.tests++
	T.log("### test error: ‹" + err + "› ###")
	T.errors++
}

function attestExpectedError(T, err, exp) {
	T.tests++
	if(exp && err != exp) {
		T.log("### wrong error: ‹" + err + "›, expected ‹" + exp + "› ###")
		T.errors++
	}
	else
		T.log("√ expected error: ‹" + err + "›")
}

// for catch block when it should not be entered
function attestUnexpectedError(T, err) {
	T.tests++
	T.log("### test error (exception): ‹" + err + "›")
	T.errors++
}

function attestMissingError(T, err) {
	T.tests++
	T.log("### test error: should have errored ###")
	T.errors++
}

function attestNoError(T, err) {
	T.tests++
	T.log("√ no error raised.")
}

function assertUndefined(T, val) {
	T.tests++
	if(!(val === undefined)) {
		T.log("### Test Error » not undefined but ‹" + (typeof val) + "› ###")
		T.errors++
	}
	else T.log("√ as expected, undefined.")
}

function assertNil(T, val) {
	T.tests++
	if(val !== nil) {
		T.log("### Test Error » not nil but ‹" + val + "› ###")
		T.errors++
	}
	else T.log("√ as expected, nil.")
}

function assertEqual(T, res, exp) {
	T.tests++;
	if(res != exp) {
		T.log("### Test Error: result ‹" + res + "› was expected to be ‹" + exp + "› ###")
		T.errors++
	}
	else T.log("√ as expected, ‹" + res + "›.")
}

function assertNotEqual(T, res, exp) {
	T.tests++;
	if(res == exp) {
		T.log("### Test Error: result was expected to not be ‹" + exp + "› ###")
		T.errors++
	}
	else T.log("√ as expected, ‹" + res + "› not ‹" + exp + "›.")
}

async function delay(millisec) {
	await new Promise(resolve => setTimeout(resolve, millisec));
}

function hex(buf) {
	return Array.from(new Uint8Array(buf)).map((n)=>{return (n>15?"":"0") + n.toString(16)}).join('')
}

function hexa(buf) {
	return Array.from(buf).map((n)=>{return (n>15?"":"0") + n.toString(16)}).join('')
}
