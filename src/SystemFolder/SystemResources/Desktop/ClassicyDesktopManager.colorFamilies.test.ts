// Package color families in the store (plan 0018-dbd, Batch F-b): the
// family form of ClassicyDesktopChangeColor, persistence and theme files.
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { defaultStateWithPlatinumThemes } from "@/__tests__/platinumBuiltInThemes";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	type ClassicyTheme,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	classicyCustomThemeSlotId,
	cloneClassicyTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";
import {
	exportClassicyTheme,
	parseClassicyThemeFile,
	readClassicyLoadedThemes,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { sanitizeStateForPersistence } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { classicyDesktopEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const PACK = "family-store-test";
const SINK = "color-families-store";

const FAMILIES = {
	grayRamp: { step2: 0x222222, step8: 0x888888 },
	ink: { triangle: 0x9999ff },
};

const familyPack = (): ClassicyAppearancePackage => {
	const defaults: ClassicyTheme = {
		...structuredClone(getTheme("default")),
		id: "family-default",
		name: "Family Default",
		package: PACK,
	};
	defaults.color.families = structuredClone(FAMILIES);
	return {
		id: PACK,
		name: "Family Store Test",
		css: "",
		defaults,
		layout: {
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
		},
		colorFamilies: {
			grayRamp: {
				label: "Gray Ramp",
				colors: { step2: { label: "2" }, step8: { label: "8" } },
			},
			ink: { label: "Ink", colors: { triangle: { label: "Triangle" } } },
		},
	};
};

/** The default state with the family package registered and active, its
 * defaults theme active and listed as a built-in. */
const makeStore = (): ClassicyStore => {
	const pkg = familyPack();
	registerClassicyAppearancePackage(pkg);
	const ds = defaultStateWithPlatinumThemes();
	const a = ds.System.Manager.Appearance;
	a.packageId = PACK;
	a.availableThemes = [...(a.availableThemes ?? []), pkg.defaults];
	a.activeTheme = cloneClassicyTheme(pkg.defaults);
	return ds;
};

const run = (ds: ClassicyStore, action: ActionMessage) =>
	classicyDesktopEventHandler(ds, action);

const warnings = (): ClassicyLogEntry[] => {
	vi.spyOn(console, "warn").mockImplementation(() => {});
	const entries: ClassicyLogEntry[] = [];
	registerClassicyLogSink({
		id: SINK,
		onLog: (entry) => {
			if (entry.level === "warn") entries.push(entry);
		},
	});
	return entries;
};

afterEach(() => {
	unregisterClassicyLogSink(SINK);
	vi.restoreAllMocks();
	if (getClassicyAppearancePackage(PACK))
		unregisterClassicyAppearancePackage(PACK);
});

describe("ClassicyDesktopChangeColor family form", () => {
	it("forks the built-in into the package's Custom theme and applies", () => {
		const ds = makeStore();
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			family: "ink",
			key: "triangle",
			color: 0x123456,
		});
		const a = ds.System.Manager.Appearance;
		expect(a.activeTheme.id).toBe(classicyCustomThemeSlotId(PACK));
		expect(a.activeTheme.color.families?.ink.triangle).toBe(0x123456);
		expect(
			(getThemeVars(a.activeTheme) as Record<string, string>)[
				"--package-color-ink-triangle"
			],
		).toBe("#123456");
		// The built-in is never edited.
		expect(
			a.availableThemes?.find((t) => t.id === "family-default")?.color.families
				?.ink.triangle,
		).toBe(0x9999ff);
		// The 28 core colors are untouched.
		expect(a.activeTheme.color.system).toEqual(
			getTheme("default").color.system,
		);
	});

	it("edits a custom theme in place", () => {
		const ds = makeStore();
		const edit = (color: number) =>
			run(ds, {
				type: "ClassicyDesktopChangeColor",
				family: "grayRamp",
				key: "step2",
				color,
			});
		edit(0x111111);
		edit(0x333333);
		const a = ds.System.Manager.Appearance;
		expect(a.customThemes).toHaveLength(1);
		expect(a.activeTheme.color.families?.grayRamp.step2).toBe(0x333333);
		expect(a.customThemes?.[0].color.families?.grayRamp.step2).toBe(0x333333);
	});

	it("refuses an undeclared color, a bad color and a bad name without forking", () => {
		const logged = warnings();
		const ds = makeStore();
		const before = JSON.stringify(ds.System.Manager.Appearance);
		for (const payload of [
			{ family: "ink", key: "nope", color: 0 },
			{ family: "nope", key: "triangle", color: 0 },
			{ family: "ink", key: "triangle", color: 0x1000000 },
			{ family: "ink", key: "triangle", color: 1.5 },
			{ family: "__proto__", key: "x", color: 0 },
			{ family: "constructor", key: "x", color: 0 },
		]) {
			run(ds, { type: "ClassicyDesktopChangeColor", ...payload });
		}
		expect(JSON.stringify(ds.System.Manager.Appearance)).toBe(before);
		// The two well-formed but undeclared colors are reported.
		expect(logged).toHaveLength(2);
	});

	// The colors are the active theme's package's, whatever package the
	// desktop draws: the Colors tab lists them by theme.package too, so an
	// edit never writes a family the theme's package does not draw.
	it("validates against the active theme's package, not the drawn one", () => {
		const logged = warnings();
		const ds = makeStore();
		ds.System.Manager.Appearance.packageId = "platinum";
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			family: "ink",
			key: "triangle",
			color: 0x123456,
		});
		expect(
			ds.System.Manager.Appearance.activeTheme.color.families?.ink.triangle,
		).toBe(0x123456);
		// Platinum's gray ramp is not this theme's package's color.
		const before = JSON.stringify(ds.System.Manager.Appearance);
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			family: "grayRamp",
			key: "step4",
			color: 0x123456,
		});
		expect(JSON.stringify(ds.System.Manager.Appearance)).toBe(before);
		expect(logged).toHaveLength(1);
	});

	it("keeps the core form exactly as it was", () => {
		const ds = makeStore();
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "system",
			index: 2,
			color: 0x010203,
		});
		const theme = ds.System.Manager.Appearance.activeTheme;
		expect(theme.color.system[2]).toBe(0x010203);
		expect(theme.color.families).toEqual(FAMILIES);
	});
});

describe("persistence", () => {
	it("stores a custom theme without the family colors equal to its package's", () => {
		const ds = makeStore();
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			family: "ink",
			key: "triangle",
			color: 0x123456,
		});
		const saved = sanitizeStateForPersistence(ds).System.Manager.Appearance;
		expect(saved.customThemes?.[0].color.families).toEqual({
			ink: { triangle: 0x123456 },
		});
		expect(saved.activeTheme.color.families).toEqual({
			ink: { triangle: 0x123456 },
		});
		// Completed again when read.
		expect(
			(getThemeVars(saved.activeTheme) as Record<string, string>)[
				"--package-color-gray-ramp-step2"
			],
		).toBe("#222222");
	});

	it("stores a built-in active theme as its reference", () => {
		const ds = makeStore();
		expect(
			sanitizeStateForPersistence(ds).System.Manager.Appearance.activeTheme,
		).toEqual({ id: "family-default", package: PACK, defaults: true });
	});

	it("keeps every family of a theme whose package is not registered", () => {
		const ds = makeStore();
		run(ds, {
			type: "ClassicyDesktopChangeColor",
			family: "ink",
			key: "triangle",
			color: 0x123456,
		});
		unregisterClassicyAppearancePackage(PACK);
		const saved = sanitizeStateForPersistence(ds).System.Manager.Appearance;
		expect(saved.customThemes?.[0].color.families).toEqual({
			...FAMILIES,
			ink: { triangle: 0x123456 },
		});
	});
});

describe("theme files", () => {
	it("export writes every family color, completed, and load keeps them", () => {
		registerClassicyAppearancePackage(familyPack());
		const stored: ClassicyTheme = {
			...structuredClone(getTheme("default")),
			id: "custom-x",
			name: "X",
			package: PACK,
		};
		stored.color.families = { ink: { triangle: 0x123456 } };
		const text = exportClassicyTheme(stored);
		expect(JSON.parse(text).theme.color.families).toEqual({
			...FAMILIES,
			ink: { triangle: 0x123456 },
		});
		const read = parseClassicyThemeFile(text);
		expect(read.ok).toBe(true);
		if (read.ok) {
			expect(read.theme.color.families).toEqual({
				...FAMILIES,
				ink: { triangle: 0x123456 },
			});
		}
	});

	it("loads a file without families, and refuses one with a malformed family", () => {
		registerClassicyAppearancePackage(familyPack());
		const theme = { ...structuredClone(getTheme("default")), package: PACK };
		const file = (t: unknown) =>
			JSON.stringify({ format: "classicy-theme", version: 1, theme: t });
		expect(parseClassicyThemeFile(file(theme)).ok).toBe(true);
		const bad = structuredClone(theme) as ClassicyTheme;
		bad.color.families = { ink: { triangle: -1 } };
		expect(parseClassicyThemeFile(file(bad)).ok).toBe(false);
		const badName = structuredClone(theme) as ClassicyTheme;
		badName.color.families = { "bad name": { triangle: 0 } };
		expect(parseClassicyThemeFile(file(badName)).ok).toBe(false);
		// The prototype keys, refused as the package schema refuses them.
		for (const families of <Record<string, Record<string, number>>[]>[
			{ constructor: { triangle: 0 } },
			{ prototype: { triangle: 0 } },
			{ ink: { constructor: 0 } },
			{ ink: { prototype: 0 } },
		]) {
			const reserved = structuredClone(theme) as ClassicyTheme;
			reserved.color.families = families;
			expect(
				parseClassicyThemeFile(file(reserved)).ok,
				JSON.stringify(families),
			).toBe(false);
		}
	});

	it("completes a host-loaded theme of a registered package", () => {
		registerClassicyAppearancePackage(familyPack());
		const host = {
			...structuredClone(getTheme("default")),
			id: "host",
			package: PACK,
		};
		delete host.color.families;
		const { themes } = readClassicyLoadedThemes([host]);
		expect(themes[0].color.families).toEqual(FAMILIES);
	});
});
