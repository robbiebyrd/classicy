/** Each package's stylesheet is `<style id="classicy-appearance-<packageId>">`. */
export const CLASSICY_APPEARANCE_STYLE_ELEMENT_PREFIX = "classicy-appearance-";

// The library stylesheet's element, written by bin/classicyStyleInjector.ts
// (CLASSICY_STYLE_ELEMENT_ID there; ClassicyAppearanceStyles.test.ts pins the
// two equal). Not imported: bin/ is build tooling, not library source.
const CLASSICY_STYLE_ELEMENT_ID = "classicy-styles";

/**
 * Write an Appearance Package's compiled CSS into
 * `<style id="classicy-appearance-<id>">`. The CSS must already be one
 * `@layer classicy.package { … }` block; it is written as given, never
 * wrapped. A new element goes directly after `#classicy-styles` when the
 * library stylesheet is present, else at the end of `<head>`; the layer order
 * statement at the head of the document decides precedence either way, not
 * the element order. Calling again for the same id replaces the text of the
 * existing element (a package re-registered). Blank CSS writes no element and
 * removes the id's existing one. Nothing happens without a `document` (SSR).
 */
export const injectClassicyAppearanceStyles = (
	id: string,
	css: string,
): void => {
	if (typeof document === "undefined") return;
	const elementId = `${CLASSICY_APPEARANCE_STYLE_ELEMENT_PREFIX}${id}`;
	const existing = document.getElementById(elementId);
	if (css.trim() === "") {
		existing?.remove();
		return;
	}
	if (existing) {
		if (existing.textContent !== css) existing.textContent = css;
		return;
	}
	const style = document.createElement("style");
	style.id = elementId;
	style.textContent = css;
	const base = document.getElementById(CLASSICY_STYLE_ELEMENT_ID);
	if (base?.parentNode) {
		base.parentNode.insertBefore(style, base.nextSibling);
		return;
	}
	(document.head ?? document.getElementsByTagName("head")[0]).appendChild(
		style,
	);
};
