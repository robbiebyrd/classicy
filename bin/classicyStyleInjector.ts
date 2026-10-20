/** The id of the `<style>` element the library injects its stylesheet into. */
export const CLASSICY_STYLE_ELEMENT_ID = "classicy-styles";

const UNSAFE_IN_SCRIPT: Record<string, string> = {
	"<": "\\u003C",
	">": "\\u003E",
	"/": "\\u002F",
	"\u2028": "\\u2028",
	"\u2029": "\\u2029",
};

/**
 * `value` as a JS string literal that is safe to splice into generated code:
 * `JSON.stringify`, plus escapes for `<`, `>` and `/` (so the bundle can sit
 * inside a `<script>` without `</script>` ending it) and U+2028/U+2029 (line
 * terminators in pre-ES2019 engines).
 */
const jsStringLiteral = (value: string): string =>
	JSON.stringify(value).replace(
		/[<>/\u2028\u2029]/g,
		(ch) => UNSAFE_IN_SCRIPT[ch],
	);

/**
 * The code appended to each entry bundle (see `injectCssPlugin` in
 * vite.config.ts): when the module first runs in a browser, it inserts `css`
 * as `<style id="classicy-styles">` at the top of <head>, so host stylesheets
 * still win on equal specificity. It does nothing without a `document` (SSR)
 * or when the element already exists (a second copy of the library, HMR).
 */
export function classicyStyleInjector(css: string): string {
	const id = jsStringLiteral(CLASSICY_STYLE_ELEMENT_ID);
	return `;(function(){if(typeof document==="undefined"||document.getElementById(${id}))return;var s=document.createElement("style");s.id=${id};s.textContent=${jsStringLiteral(css)};var h=document.head||document.getElementsByTagName("head")[0];h.insertBefore(s,h.firstChild);})();\n`;
}
