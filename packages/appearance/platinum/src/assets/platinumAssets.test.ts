import path from "node:path";
import { describe, expect, it } from "vitest";
import { assetSourceFile } from "@/__tests__/assetSourceFile";
import {
	type ClassicyCursorRole,
	type ClassicySystemArtKey,
	resolveClassicyAsset,
	resolveClassicyIconImage,
} from "@/Appearance/ClassicyAssetRegistry";
import "./platinumAssets";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

/** The package's folder, this project's root: its own files live under it. */
const PACKAGE = path.resolve(import.meta.dirname, "../..");
const fileOf = (url: string | undefined) =>
	url === undefined ? undefined : assetSourceFile(url, PACKAGE);

/**
 * Every `ClassicySystemArtKey`, classified: `true` = Platinum registers it. A
 * `Record` over the union, so adding a key without classifying it is a type
 * error.
 */
const PLATINUM_REGISTERS: Record<ClassicySystemArtKey, boolean> = {
	appleMenu: true,
	sadMac: true,
	startupLogo: true,
	trashEmpty: true,
	trashFull: true,
	aliasBadge: true,
	helpButton: true,
	aboutLogo: true,
	aboutBackground: false,
	windowStripes: true,
	windowStripesRed: true,
	windowUtilityTexture: true,
	windowGrip: true,
	windowDither: true,
	zoomGlyph: true,
	collapseGlyph: true,
	submenuArrow: true,
	popupArrows: true,
	sliderThumb: true,
	sliderThumbRect: true,
	sliderStrikes: true,
	tabOutline: true,
	halftone: true,
	halftoneLarge: true,
	quickTimeThumbSlider: true,
	quickTimeVolumeSlider: true,
	controlStripTab: true,
	// Platinum mirrors its left tab docked right, labels New Folder in words
	// and draws the folder pop-up's current level as a folder (story 0214-c61),
	// and its tree's folders with the folder icon itself.
	controlStripTabRight: false,
	newFolderGlyph: false,
	openFolderIcon: false,
	fileDialogFolderIcon: false,
	controlStripCollapse: true,
	controlStripScrollLeft: true,
	controlStripScrollLeftDisabled: true,
	controlStripScrollRight: true,
	controlStripScrollRightDisabled: true,
	controlStripModuleArrow: true,
	popUpSliderTrack: true,
	popUpSliderThumb: true,
	menuCheck: false,
	menuDash: false,
	triangle: true,
	downArrow: true,
	// Platinum draws no dithers and titles its Help menu with the word.
	ditherChecker: false,
	helpMenuTitle: false,
};

const entries = Object.entries(PLATINUM_REGISTERS) as [
	ClassicySystemArtKey,
	boolean,
][];
const REGISTERED = entries.filter(([, yes]) => yes).map(([key]) => key);
const UNREGISTERED = entries.filter(([, yes]) => !yes).map(([key]) => key);

describe("Platinum system art", () => {
	it.each(REGISTERED)("registers system art %s", (key) => {
		expect(resolveClassicyAsset("systemArt", key)).toMatch(/\S/);
	});

	it.each(
		UNREGISTERED,
	)("leaves %s unregistered (Platinum has no art for it)", (key) => {
		expect(resolveClassicyAsset("systemArt", key)).toBeUndefined();
	});

	it("registers 36 of the 45 keys", () => {
		expect(REGISTERED).toHaveLength(36);
		expect(UNREGISTERED).toHaveLength(9);
	});

	it("draws the Apple menu, trash, alias badge, help button and Sad Mac from its own src/assets/art", () => {
		// Moved out of the core's assets/ with their icon-tree entries (plan
		// 0015-kxa §3.3): Platinum was their only reader. WebP since plan
		// 0019-fb7 §6.4, except the alias badge, which Chromium draws
		// differently from its WebP, so it stays a PNG.
		for (const [key, file] of [
			["appleMenu", "apple.webp"],
			["trashEmpty", "trash-empty.webp"],
			["trashFull", "trash-full.webp"],
			["aliasBadge", "alias.png"],
			["helpButton", "help-button.webp"],
			["sadMac", "sad-mac.webp"],
		] as const) {
			expect(fileOf(resolveClassicyAsset("systemArt", key)), key).toBe(
				path.join(PACKAGE, "src/assets/art", file),
			);
		}
	});

	it("still reads the art the core draws too from the core's icon tree", () => {
		expect(resolveClassicyAsset("systemArt", "startupLogo")).toBe(
			ClassicyIcons.system.macosSvg,
		);
		expect(resolveClassicyAsset("systemArt", "aboutLogo")).toBe(
			ClassicyIcons.classicy.logo,
		);
		expect(resolveClassicyAsset("systemArt", "halftoneLarge")).toBe(
			ClassicyIcons.ui.halftoneLarge,
		);
	});
});

/**
 * Every `ClassicyCursorRole`, classified like the system art: `true` =
 * Platinum registers it.
 */
const PLATINUM_CURSORS: Record<ClassicyCursorRole, boolean> = {
	arrow: true,
	ibeam: false,
	crosshair: false,
	watch: true,
	hand: true,
	resizeLr: true,
	resizeUd: true,
	resizeNwse: false,
	resizeNesw: false,
	resizeU: true,
	resizeD: true,
	resizeL: true,
	resizeR: true,
	// The contextual Help pointer of Windows' What's This? (WIG Ch.12
	// "Context-Sensitive Help", p.273): Mac OS 8 had no such mode.
	help: false,
	// Windows' Unavailable and Working in Background pointers (WIG Ch.4
	// Table 4.1), read only by the Windows 98 package's stylesheet.
	notAllowed: false,
	appStarting: false,
};

describe("Platinum cursors", () => {
	const roles = Object.entries(PLATINUM_CURSORS) as [
		ClassicyCursorRole,
		boolean,
	][];

	it.each(
		roles.filter(([, yes]) => yes).map(([role]) => role),
	)("registers cursor %s", (role) => {
		expect(resolveClassicyAsset("cursors", role)).toMatch(/\S/);
	});

	it.each(
		roles.filter(([, yes]) => !yes).map(([role]) => role),
	)("leaves cursor %s unregistered", (role) => {
		expect(resolveClassicyAsset("cursors", role)).toBeUndefined();
	});

	it("draws the watch and resize cursors from its own src/assets/cursors", () => {
		for (const [role, name] of [
			["watch", "watch"],
			["resizeLr", "resize-lr"],
			["resizeUd", "resize-ud"],
			["resizeU", "resize-u"],
			["resizeD", "resize-d"],
			["resizeL", "resize-l"],
			["resizeR", "resize-r"],
		] as const)
			expect(fileOf(resolveClassicyAsset("cursors", role)), role).toBe(
				path.join(PACKAGE, "src/assets/cursors", `cursor-${name}.png`),
			);
	});

	it("still reads the hand from the core's icon tree (the PDF viewer draws it)", () => {
		expect(resolveClassicyAsset("cursors", "hand")).toBe(
			ClassicyIcons.ui.cursors.hand,
		);
	});
});

// Story 0214-c61: HIGOS8 Fig. 2-24 (p.38) and Fig. 2-43 (p.51) draw the list
// view's folders as a 16 px small icon of their own, not the 32 px folder
// scaled. Platinum registers it, cut pixel for pixel from Fig. 2-24, as the
// generic folder's small image; the 32 px image stays the core's.
describe("Platinum small icons", () => {
	const DIRECTORY = ClassicyIcons.system.folders.directory;

	it("draws the folder's own 16 px image at the small size", () => {
		expect(fileOf(resolveClassicyIconImage(DIRECTORY, 16))).toBe(
			path.join(PACKAGE, "src/assets/art/folder-small.webp"),
		);
	});

	it("keeps the core's 32 px folder at every larger size", () => {
		expect(resolveClassicyIconImage(DIRECTORY, 17)).toBe(DIRECTORY);
		expect(resolveClassicyIconImage(DIRECTORY, 32)).toBe(DIRECTORY);
		expect(resolveClassicyAsset("icons", "system.folders.directory")).toBe(
			DIRECTORY,
		);
	});
});
