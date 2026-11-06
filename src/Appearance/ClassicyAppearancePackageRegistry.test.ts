import { afterEach, describe, expect, it, vi } from "vitest";
// Registers Platinum's sound pack, which the Platinum themes used here name
// (`sound.pack` must name a registered pack).
import "@classicy/appearance-platinum";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	getClassicyAppearancePackage,
	getRegisteredClassicyAppearancePackageOrDefault,
	listClassicyAppearancePackages,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
	subscribeClassicyAppearancePackages,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	getClassicyAppIdentityOverrides,
	resolveClassicyAppIdentity,
} from "@/Appearance/ClassicyAppIdentity";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import * as ClassicyLog from "@/SystemFolder/SystemResources/Log/ClassicyLog";

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

	it("falls back to the first registered package when neither is registered", () => {
		registerClassicyAppearancePackage(irix);
		expect(getRegisteredClassicyAppearancePackageOrDefault("beos")).toBe(irix);
		expect(getRegisteredClassicyAppearancePackageOrDefault(undefined)).toBe(
			irix,
		);
	});

	it("returns undefined only when no package is registered", () => {
		expect(
			getRegisteredClassicyAppearancePackageOrDefault("platinum"),
		).toBeUndefined();
		expect(
			getRegisteredClassicyAppearancePackageOrDefault(undefined),
		).toBeUndefined();
	});

	it("never matches an inherited property name", () => {
		registerClassicyAppearancePackage(platinum);
		expect(getRegisteredClassicyAppearancePackageOrDefault("constructor")).toBe(
			platinum,
		);
	});
});

describe("unregisterClassicyAppearancePackage", () => {
	it("removes the package and its stylesheet, and notifies", () => {
		registerClassicyAppearancePackage(platinum);
		registerClassicyAppearancePackage({
			...irix,
			css: '@layer classicy.package { .classicyDesktop[data-classicy-appearance="irix"] { color: red; } }',
		});
		expect(document.getElementById("classicy-appearance-irix")).not.toBeNull();
		let notified = 0;
		const unsubscribe = subscribeClassicyAppearancePackages(() => {
			notified++;
		});
		expect(unregisterClassicyAppearancePackage("irix")).toBe(true);
		unsubscribe();
		expect(notified).toBe(1);
		expect(getClassicyAppearancePackage("irix")).toBeUndefined();
		expect(listClassicyAppearancePackages()).toEqual([platinum]);
		expect(document.getElementById("classicy-appearance-irix")).toBeNull();
		// An unregistered id now resolves like any other: to the default.
		expect(getRegisteredClassicyAppearancePackageOrDefault("irix")).toBe(
			platinum,
		);
	});

	it("returns false, and notifies nobody, for an id that is not registered", () => {
		registerClassicyAppearancePackage(platinum);
		let notified = 0;
		const unsubscribe = subscribeClassicyAppearancePackages(() => {
			notified++;
		});
		expect(unregisterClassicyAppearancePackage("irix")).toBe(false);
		unsubscribe();
		expect(notified).toBe(0);
		expect(listClassicyAppearancePackages()).toEqual([platinum]);
	});

	it("refuses the default package: logs a warning, keeps it and its stylesheet", () => {
		const log = vi
			.spyOn(ClassicyLog, "classicyLog")
			.mockImplementation(() => {});
		registerClassicyAppearancePackage({
			...platinum,
			css: '@layer classicy.package { .classicyDesktop[data-classicy-appearance="platinum"] { color: red; } }',
		});
		let notified = 0;
		const unsubscribe = subscribeClassicyAppearancePackages(() => {
			notified++;
		});
		expect(unregisterClassicyAppearancePackage("platinum")).toBe(false);
		unsubscribe();
		expect(notified).toBe(0);
		expect(getClassicyAppearancePackage("platinum")?.id).toBe("platinum");
		expect(listClassicyAppearancePackages().map((pkg) => pkg.id)).toEqual([
			"platinum",
		]);
		expect(
			document.getElementById("classicy-appearance-platinum"),
		).not.toBeNull();
		expect(log).toHaveBeenCalledWith(
			"warn",
			"ClassicyAppearance",
			expect.stringContaining('"platinum"'),
		);
		log.mockRestore();
	});
});

describe("registerClassicyAppearancePackage", () => {
	it("logs and does not register a package with invalid apps", () => {
		const log = vi
			.spyOn(ClassicyLog, "classicyLog")
			.mockImplementation(() => {});
		registerClassicyAppearancePackage({
			...irix,
			css: '@layer classicy.package { .classicyDesktop[data-classicy-appearance="irix"] { color: red; } }',
			apps: { "A.app": { name: "_x" } },
		});
		expect(getClassicyAppearancePackage("irix")).toBeUndefined();
		expect(document.getElementById("classicy-appearance-irix")).toBeNull();
		expect(log).toHaveBeenCalledWith(
			"error",
			"ClassicyAppearance",
			expect.stringContaining("apps.A.app.name"),
		);
		log.mockRestore();
	});

	it("replaces a package's apps map on re-registration", () => {
		const first = { "A.app": { name: "A" } };
		const second = { "B.app": { name: "B" } };
		registerClassicyAppearancePackage({ ...irix, apps: first });
		expect(getClassicyAppearancePackage("irix")?.apps).toEqual(first);
		registerClassicyAppearancePackage({ ...irix, apps: second });
		expect(getClassicyAppearancePackage("irix")?.apps).toEqual(second);
		registerClassicyAppearancePackage(irix);
		expect(getClassicyAppearancePackage("irix")?.apps).toBeUndefined();
	});

	// K-R13 (m5): what is stored is what was validated, so a later change to
	// the caller's object can never bypass the schema.
	it("stores a frozen, validated copy of apps, so mutating the caller's object changes nothing", () => {
		const apps: Record<string, { name?: string; icon?: string }> = {
			"A.app": { name: "A" },
		};
		registerClassicyAppearancePackage({ ...irix, apps });
		apps["A.app"].name = "_not:valid";
		apps["A.app"].icon = "javascript:alert(1)";
		apps["B.app"] = { name: "B" };
		delete apps["A.app"];

		const stored = getClassicyAppearancePackage("irix")?.apps;
		expect(stored).toEqual({ "A.app": { name: "A" } });
		expect(Object.isFrozen(stored)).toBe(true);
		expect(Object.isFrozen(stored?.["A.app"])).toBe(true);
		expect(
			resolveClassicyAppIdentity(
				"A.app",
				{ name: "Own", icon: "/a.png" },
				"irix",
			),
		).toEqual({ name: "A", icon: "/a.png" });
		expect(getClassicyAppIdentityOverrides("irix")).toBe(stored);
	});

	it("keeps a package with no apps as given", () => {
		registerClassicyAppearancePackage(irix);
		expect(getClassicyAppearancePackage("irix")).toBe(irix);
	});
});
