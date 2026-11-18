import type { ClassicyIconDimming } from "@classicy/classicy";

// How System 7.5.5 dims a hidden application's icon in the Application menu
// (HIG7 p.127), and Standard File a file's that cannot be chosen, measured
// from the emulator (story 0214-c61 fix round 3): each channel averaged with
// white, rounding down; its top four bits kept, widened by repeating them
// (0x7 is 0x77); then the nearest color of the 8-bit system palette over all
// three channels at once. The core draws it on a canvas (`iconDimming`); an
// icon a canvas cannot read is dimmed by the stylesheet's opacity instead.

const hex = (r: number, g: number, b: number): string =>
	`#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`.toUpperCase();

/**
 * The Macintosh 8-bit system palette, in color table order: the 6x6x6 cube
 * from white down (black last), then the red, green, blue and gray ramps of
 * the sixteenths the cube lacks.
 */
const systemPalette = (): string[] => {
	const cube = [0xff, 0xcc, 0x99, 0x66, 0x33, 0x00];
	const ramp = [0xee, 0xdd, 0xbb, 0xaa, 0x88, 0x77, 0x55, 0x44, 0x22, 0x11];
	const palette: string[] = [];
	for (const r of cube)
		for (const g of cube)
			for (const b of cube) if (r || g || b) palette.push(hex(r, g, b));
	for (const v of ramp) palette.push(hex(v, 0, 0));
	for (const v of ramp) palette.push(hex(0, v, 0));
	for (const v of ramp) palette.push(hex(0, 0, v));
	for (const v of ramp) palette.push(hex(v, v, v));
	palette.push(hex(0, 0, 0));
	return palette;
};

const dimmedInSystemPalette = {
	blend: { color: "#FFFFFF", amount: 0.5 },
	bits: 4,
	palette: systemPalette(),
};

export const SYSTEM7_ICON_DIMMING: ClassicyIconDimming = {
	hiddenApp: dimmedInSystemPalette,
	// Standard File dims the icons of the files a Save box cannot choose the
	// same way (`color-dialog-standardfile-save.png`, SimpleText's icon:
	// every pixel).
	disabledItem: dimmedInSystemPalette,
	// 1-bit (the `bw` themes): no rule; the stylesheet's 50% checker dims
	// the icon, as 7.5.5 does in black and white.
	variants: { bw: { hiddenApp: null, disabledItem: null } },
};
