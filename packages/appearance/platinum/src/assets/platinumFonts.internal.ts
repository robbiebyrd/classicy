// Platinum's thirteen bundled font faces: the one list that both the runtime
// registration (platinumAssets.ts, which writes
// `<style id="classicy-fonts-platinum">`) and the static stylesheet for
// strict-CSP hosts (dist/classicy-platinum.fonts.css, emitted by
// injectCssPlugin in vite.config.ts and checked by verify:dist invariant 12)
// are built from. `file` is the face's basename in ./fonts, without `.woff2`.
// Order is the Fonts tab's order: Charcoal, ChicagoFLF, Geneva,
// AppleGaramond, Monaco, then VCR OSD Mono ("Digital").
//
// Import-free, erasable TypeScript: bin/check-dist-imports.mjs loads it
// through Node's type stripping.

/** One bundled face: its family, its file in ./fonts and its descriptors. */
export type PlatinumFontFace = {
	family: string;
	file: string;
	weight: string;
	style: string;
};

const face = (
	family: string,
	file: string,
	weight = "normal",
	style = "normal",
): PlatinumFontFace => ({ family, file, weight, style });

export const PLATINUM_FONT_FACES: readonly PlatinumFontFace[] = [
	face("Charcoal", "Charcoal-normal-normal"),
	face("ChicagoFLF", "ChicagoFLF-normal-normal"),
	face("Geneva", "Geneva-normal-normal"),
	face("Geneva", "Geneva-bold-normal", "bold"),
	face("Geneva", "Geneva-normal-italic", "normal", "italic"),
	face("AppleGaramond", "AppleGaramond-normal-normal"),
	face("AppleGaramond", "AppleGaramond-bold-normal", "bold"),
	face("AppleGaramond", "AppleGaramond-bold-italic", "bold", "italic"),
	face("AppleGaramond", "AppleGaramond-normal-italic", "normal", "italic"),
	face("AppleGaramond", "AppleGaramond-300-normal", "300"),
	face("AppleGaramond", "AppleGaramond-300-italic", "300", "italic"),
	face("Monaco", "Monaco-normal-normal"),
	face("VCR OSD Mono", "VCROSDMono-normal-normal"),
];
