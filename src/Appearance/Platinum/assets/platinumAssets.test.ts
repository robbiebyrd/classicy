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
	quickTimeThumbSlider: false,
	quickTimeVolumeSlider: false,
	controlStripTab: true,
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

	it("registers 34 of the 39 keys", () => {
		expect(REGISTERED).toHaveLength(34);
		expect(UNREGISTERED).toHaveLength(5);
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
