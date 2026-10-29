import { describe, expect, it } from "vitest";
import {
	type ClassicySystemArtKey,
	resolveClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";
import "@/Appearance/Platinum/assets/platinumAssets";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

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
	windowUtilityShade: false,
	windowUtilityHighlight: false,
	titleBarCapLeft: false,
	titleBarCapRight: false,
	titleBarCapLeftRed: false,
	titleBarCapRightRed: false,
	windowGrip: true,
	windowDither: true,
	zoomGlyph: true,
	collapseGlyph: true,
	submenuArrow: true,
	popupArrows: true,
	sliderThumb: true,
	sliderThumbRect: false,
	sliderStrikes: true,
	tabOutline: true,
	halftone: false,
	halftoneLarge: false,
	quickTimeThumbSlider: false,
	quickTimeVolumeSlider: false,
	controlStripTab: false,
	controlStripCollapse: false,
	controlStripScrollLeft: false,
	controlStripScrollLeftDisabled: false,
	controlStripScrollRight: false,
	controlStripScrollRightDisabled: false,
	controlStripModuleArrow: false,
	popUpSliderTrack: false,
	popUpSliderThumb: false,
	menuCheck: false,
	menuDash: false,
	triangle: true,
	downArrow: true,
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

	it("registers 21 of the 44 keys", () => {
		expect(REGISTERED).toHaveLength(21);
		expect(UNREGISTERED).toHaveLength(23);
	});

	it("the Apple menu, trash, alias badge and help button are the icon-tree leaves", () => {
		expect(resolveClassicyAsset("systemArt", "appleMenu")).toBe(
			ClassicyIcons.system.apple,
		);
		expect(resolveClassicyAsset("systemArt", "trashFull")).toBe(
			ClassicyIcons.system.desktop.trashFull,
		);
		expect(resolveClassicyAsset("systemArt", "trashEmpty")).toBe(
			ClassicyIcons.system.desktop.trashEmpty,
		);
		expect(resolveClassicyAsset("systemArt", "aliasBadge")).toBe(
			ClassicyIcons.system.alias,
		);
		expect(resolveClassicyAsset("systemArt", "helpButton")).toBe(
			ClassicyIcons.ui.helpButton,
		);
	});
});
