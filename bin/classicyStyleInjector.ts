/** The id of the `<style>` element the library injects its stylesheet into. */
export const CLASSICY_STYLE_ELEMENT_ID = "classicy-styles";

/**
 * The code appended to each entry bundle (see `injectCssPlugin` in
 * vite.config.ts): when the module first runs in a browser, it inserts `css`
 * as `<style id="classicy-styles">` at the top of <head>, so host stylesheets
 * still win on equal specificity. It does nothing without a `document` (SSR)
 * or when the element already exists (a second copy of the library, HMR).
 */
export function classicyStyleInjector(css: string): string {
	const id = JSON.stringify(CLASSICY_STYLE_ELEMENT_ID);
	return `;(function(){if(typeof document==="undefined"||document.getElementById(${id}))return;var s=document.createElement("style");s.id=${id};s.textContent=${JSON.stringify(css)};var h=document.head||document.getElementsByTagName("head")[0];h.insertBefore(s,h.firstChild);})();\n`;
}
