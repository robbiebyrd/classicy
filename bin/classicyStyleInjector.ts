/** The id of the `<style>` element the library injects its stylesheet into. */
export const CLASSICY_STYLE_ELEMENT_ID = "classicy-styles";

/**
 * The cascade layer order, declared once before any Classicy rule. Every
 * component stylesheet is compiled into `classicy.base` (see
 * classicyCssLayerPlugin.ts); appearance packages layer into
 * `classicy.package` and host overrides into `classicy.user`, so each beats
 * the one before it whatever its specificity. Unlayered host CSS beats all
 * three.
 */
export const CLASSICY_LAYER_ORDER =
	"@layer classicy.base, classicy.package, classicy.user;";

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
 * vite.config.ts): when it first runs in a browser, it inserts `css`,
 * prefixed with CLASSICY_LAYER_ORDER so the order is fixed before any layer
 * is used, as `<style id="classicy-styles">` at the top of <head> (host
 * stylesheets come later; unlayered host rules beat the layered Classicy
 * rules whatever their order or specificity). It does nothing without a
 * `document` (SSR) or when the element already exists (a second copy of the
 * library, HMR).
 */
export function classicyStyleInjector(css: string): string {
	const id = jsStringLiteral(CLASSICY_STYLE_ELEMENT_ID);
	const text = `${CLASSICY_LAYER_ORDER}\n${css}`;
	return `;(function(){if(typeof document==="undefined"||document.getElementById(${id}))return;var s=document.createElement("style");s.id=${id};s.textContent=${jsStringLiteral(text)};var h=document.head||document.getElementsByTagName("head")[0];h.insertBefore(s,h.firstChild);})();\n`;
}
