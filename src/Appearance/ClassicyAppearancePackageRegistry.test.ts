import { afterEach, describe, expect, it } from "vitest";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	getRegisteredClassicyAppearancePackageOrDefault,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

const LAYOUT: ClassicyAppearancePackage["layout"] = {
	window: { growBoxCorner: "bottom-right" },
	menuBar: { placement: "screen" },
	desktop: { iconGridOrigin: "top-right" },
};

const platinum: ClassicyAppearancePackage = {
	id: "platinum",
	name: "Platinum",
	css: "",
	defaults: getTheme("default"),
	layout: LAYOUT,
};

const irix: ClassicyAppearancePackage = {
	id: "irix",
	name: "IRIX",
	css: "",
	defaults: { ...structuredClone(getTheme("azul")), package: "irix" },
	layout: LAYOUT,
};

afterEach(() => resetClassicyAppearancePackagesForTests());

describe("getRegisteredClassicyAppearancePackageOrDefault", () => {
	it("returns the registered package for its id", () => {
		registerClassicyAppearancePackage(platinum);
		registerClassicyAppearancePackage(irix);
		expect(getRegisteredClassicyAppearancePackageOrDefault("irix")).toBe(irix);
	});

	it("falls back to the registered default package", () => {
		registerClassicyAppearancePackage(platinum);
		expect(getRegisteredClassicyAppearancePackageOrDefault("beos")).toBe(
			platinum,
		);
		expect(getRegisteredClassicyAppearancePackageOrDefault(undefined)).toBe(
			platinum,
		);
	});

	it("returns undefined when neither package is registered", () => {
		registerClassicyAppearancePackage(irix);
		expect(
			getRegisteredClassicyAppearancePackageOrDefault("beos"),
		).toBeUndefined();
		resetClassicyAppearancePackagesForTests();
		expect(
			getRegisteredClassicyAppearancePackageOrDefault("platinum"),
		).toBeUndefined();
	});

	it("never matches an inherited property name", () =>
		expect(
			getRegisteredClassicyAppearancePackageOrDefault("constructor"),
		).toBeUndefined());
});
