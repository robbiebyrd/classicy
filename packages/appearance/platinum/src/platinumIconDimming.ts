import type { ClassicyIconDimming } from "@classicy/classicy";

// How Mac OS 8.5 dims an icon in a menu, measured from Infinite Mac's Power
// Macintosh 9500 at true color (the 8.5 audit's M10): a plain 50% blend
// toward white on QuickDraw's 16-bit components, each channel the high byte
// of (c * 257 + 65535) / 2: 0x00 to 0x7F, 0x33 to 0x99, 0x44 to 0xA2, 0x88
// to 0xC4, 0xBB to 0xDD, 0xCC to 0xE6, with no step to fewer bits and no
// palette. The hidden Stickies icon in the Application menu
// (`resources/screenshots/mac-os-8.5/platinum-85-appmenu-hidden-app.png`:
// #7F7F7F, #FFFF7F, #FFE6CC, #E6CCB3, #D5D5D5) and the Apple title dimmed
// under an alert (#444444 to #A2A2A2, #00BB00 to #7FDD7F) agree, and so
// does 8.1 on the same machine (Script Editor's dimmed Application icon,
// #888888 to #C4C4C4), so it is a screen depth, not a release, that set
// story 0214-c61's rule (4 bits, then the 8-bit system palette, measured on
// the Quadra 650's lower depth) apart. The core draws it on a canvas
// (`iconDimming`); an icon a canvas cannot read is dimmed by the
// stylesheet's opacity instead (`_Menu.scss`).
export const PLATINUM_ICON_DIMMING: ClassicyIconDimming = {
	hiddenApp: {
		blend: { color: "#FFFFFF", amount: 0.5, depth: 16 },
	},
};
