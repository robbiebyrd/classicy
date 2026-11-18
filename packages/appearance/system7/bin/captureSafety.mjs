// What capture-references.mjs may write and whom its `serve` endpoint obeys
// (final review M2). It writes each capture to `<out>/<name>.png`, and in
// `serve` mode it plays any steps POSTed to 127.0.0.1:<port>, so:
//
// - a capture's name is letters, digits, `_`, `.` and `-` only: with `.png`
//   after it, a plain file in `<out>`, never a path out of it;
// - a request a web page sends is refused: one with an `Origin` header (a
//   page's fetch, XHR or form POST), or one the browser marks as a page's
//   with `Sec-Fetch-Site` (an <img> or other no-cors GET, which sends no
//   Origin). A script (curl, node) sends neither, and a URL the developer
//   types is `Sec-Fetch-Site: none`.

/** `<name>.png`, or an error when `name` is not letters, digits, `_`, `.` and `-`. */
export const captureFileName = (name) => {
	if (typeof name !== "string" || !/^[\w.-]+$/.test(name))
		throw new Error(
			`capture name ${JSON.stringify(name)}: letters, digits, _, . and - only`,
		);
	return `${name}.png`;
};

/**
 * Why `serve` refuses a request with these (lower-cased, as Node gives them)
 * headers, or null when a script or the developer sent it.
 */
export const refusedCaptureRequest = (headers) => {
	if (headers.origin !== undefined)
		return "refused: a request with an Origin header comes from a web page";
	const site = headers["sec-fetch-site"];
	if (site !== undefined && site !== "none")
		return `refused: a request with Sec-Fetch-Site: ${site} comes from a web page`;
	return null;
};
