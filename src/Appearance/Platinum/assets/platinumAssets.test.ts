import { describe, expect, it } from "vitest";
import {
	type ClassicySystemArtKey,
	resolveClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";
import "@/Appearance/Platinum/assets/platinumAssets";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

const REGISTERED: ClassicySystemArtKey[] = [
	"appleMenu",
	"sadMac",
	"startupLogo",
	"trashEmpty",
	"trashFull",
	"aliasBadge",
	"helpButton",
	"aboutLogo",
	"windowStripes",
	"windowStripesRed",
	"windowGrip",
	"windowDither",
	"zoomGlyph",
	"collapseGlyph",
	"triangle",
	"downArrow",
	"submenuArrow",
	"popupArrows",
	"sliderThumb",
	"sliderStrikes",
	"tabOutline",
];

const UNREGISTERED: ClassicySystemArtKey[] = [
	"startupWordmark" as ClassicySystemArtKey,
	"paradeDefault" as ClassicySystemArtKey,
	"menuCheck",
	"menuDash",
];

describe("Platinum system art", () => {
	it.each(REGISTERED)("registers system art %s", (key) => {
		expect(resolveClassicyAsset("systemArt", key)).toMatch(/\S/);
	});

	it.each(
		UNREGISTERED,
	)("leaves %s unregistered (Platinum has no art for it)", (key) => {
		expect(resolveClassicyAsset("systemArt", key)).toBeUndefined();
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
