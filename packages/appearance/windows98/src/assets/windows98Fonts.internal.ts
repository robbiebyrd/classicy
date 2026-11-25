// Windows 98's two bundled font faces: the one list that both the runtime
// registration (windows98Assets.ts, which writes
// `<style id="classicy-fonts-windows98">`) and the static stylesheet for
// strict-CSP hosts (dist/classicy-windows98.fonts.css, emitted by
// classicyPackageStylesheetsPlugin in vite.config.ts and checked by
// bin/verify-dist.mjs invariant 6) are built from. `file` is the face's
// basename in ./fonts, without `.woff2`, named as Platinum names its faces
// (`<family without spaces>-<weight>-<style>`).
//
// The family is "Pixelated MS Sans Serif", the name every Windows 98 theme
// gives first in its `ui`, `header` and `body` stacks (windows98.json): a
// pixel-for-pixel recreation of MS Sans Serif 8 pt at 96 dpi, the face
// Windows 98 drew its interface in (sserife.fon, a bitmap font no browser
// loads), by FontStruct user "lou" as distributed by 98.css, licensed CC
// BY-SA 3.0. Its readme and license files sit beside the faces in ./fonts and
// ship in the package (`files`), as the readmes require.
//
// Import-free, erasable TypeScript: bin/verify-dist.mjs loads it through
// Node's type stripping.

/** One bundled face: its family, its file in ./fonts and its descriptors. */
export type Windows98FontFace = {
	family: string;
	file: string;
	weight: string;
	style: string;
};

/** The family the themes name first, and the faces register under. */
export const WINDOWS98_FONT_FAMILY = "Pixelated MS Sans Serif";

const face = (
	family: string,
	file: string,
	weight = "normal",
	style = "normal",
): Windows98FontFace => ({ family, file, weight, style });

export const WINDOWS98_FONT_FACES: readonly Windows98FontFace[] = [
	face(WINDOWS98_FONT_FAMILY, "PixelatedMSSansSerif-normal-normal"),
	face(WINDOWS98_FONT_FAMILY, "PixelatedMSSansSerif-bold-normal", "bold"),
];
