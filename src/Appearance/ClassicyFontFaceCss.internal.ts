// The one `@font-face` writer. registerClassicyFonts (ClassicyAssetRegistry.ts)
// writes these rules into `<style id="classicy-fonts-<packageId>">` at
// runtime, and the build (bin/classicyFontStylesheet.ts, from injectCssPlugin
// in vite.config.ts) writes the same rules into dist/classicy-platinum.fonts.css
// for hosts whose Content-Security-Policy blocks that inline element, so the
// two cannot drift.
//
// Import-free, erasable TypeScript: bin/check-dist-imports.mjs loads it
// through Node's type stripping.

/** A face as written: its family, sources in fallback order and descriptors. */
export type ClassicyFontFaceRuleInput = {
	family: string;
	sources: readonly string[];
	weight: string;
	style: string;
};

const FONT_FORMATS: Record<string, string> = {
	woff2: "woff2",
	woff: "woff",
	ttf: "truetype",
	truetype: "truetype",
	otf: "opentype",
	opentype: "opentype",
};

/** ` format("…")` from a data: mime or the file extension; empty if unknown. */
export const classicyFontFormat = (src: string): string => {
	const ext = src.startsWith("data:")
		? /^data:(?:font\/|application\/font-)([a-z0-9]+)/i.exec(src)?.[1]
		: /\.([a-z0-9]+)(?:[?#]|$)/i.exec(src)?.[1];
	const key = ext?.toLowerCase();
	return key && Object.hasOwn(FONT_FORMATS, key)
		? ` format("${FONT_FORMATS[key]}")`
		: "";
};

/**
 * One `@font-face` rule, minified. The caller has already checked the
 * family, descriptors and sources (registerClassicyFonts refuses unsafe ones).
 */
export const classicyFontFaceRule = (
	face: ClassicyFontFaceRuleInput,
): string => {
	const sources = face.sources
		.map((src) => `url("${src}")${classicyFontFormat(src)}`)
		.join(",");
	return `@font-face{font-family:"${face.family}";src:${sources};font-weight:${face.weight};font-style:${face.style};font-display:swap}`;
};
