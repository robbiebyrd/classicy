// System 7's four bundled font faces: the one list that both the runtime
// registration (system7Assets.ts, which writes
// `<style id="classicy-fonts-system7">`) and the static stylesheet for
// strict-CSP hosts (dist/classicy-system7.fonts.css, emitted by
// classicyPackageStylesheetsPlugin in vite.config.ts and checked by
// bin/verify-dist.mjs invariant 6) are built from. `file` is the face's
// basename in ./fonts, without `.woff2`. Each file is a byte-identical copy of
// Platinum's face of the same name (design 0017-6me, "Fonts"): Chicago
// (ChicagoFLF) for interface text and Geneva for small text and icon labels,
// the two faces System 7 draws with.
//
// Import-free, erasable TypeScript: bin/verify-dist.mjs loads it through
// Node's type stripping.

/** One bundled face: its family, its file in ./fonts and its descriptors. */
export type System7FontFace = {
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
): System7FontFace => ({ family, file, weight, style });

export const SYSTEM7_FONT_FACES: readonly System7FontFace[] = [
	face("ChicagoFLF", "ChicagoFLF-normal-normal"),
	face("Geneva", "Geneva-normal-normal"),
	face("Geneva", "Geneva-bold-normal", "bold"),
	face("Geneva", "Geneva-normal-italic", "normal", "italic"),
];
