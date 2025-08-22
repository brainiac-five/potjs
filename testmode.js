
function modecolor() {

	document.getElementById("modetag").innerHTML = "Go POT"

	document.getElementById("modetag").style.background = "navy"

	const stylesheet = document.styleSheets[0];
	const rule = [...stylesheet.cssRules].find((r) => r.selectorText === "h3",);
	rule.style.setProperty("background", "navy")

	document.getElementById("modenote").innerHTML = "This test runs <em>in direct interaction with the Go POT implementation</em>."
}
