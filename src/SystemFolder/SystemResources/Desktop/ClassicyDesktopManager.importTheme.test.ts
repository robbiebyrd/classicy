import { castDraft, produce } from "immer";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { listClassicyPackageThemes } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";
import {
	exportClassicyTheme,
	parseClassicyThemeFile,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import { resolveWallpaper } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers";
import { isUntrustedActionAllowed } from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust";
import {
	type ActionMessage,
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	DefaultAppManagerState,
	mergeClassicyState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const makeStore = (): ClassicyStore =>
	mergeClassicyState(DefaultAppManagerState, {});

const appearance = (ds: ClassicyStore) => ds.System.Manager.Appearance;

/** Runs actions through the real Immer-backed kernel, as the store does. */
const run = (
	state: ClassicyStore,
	action: ActionMessage,
	trust: "trusted" | "untrusted" = "trusted",
) =>
	produce(state, (draft) => {
		classicyDesktopStateEventReducer(
			castDraft(draft) as ClassicyStore,
			action,
			trust,
		);
	});

/** A theme as a file would deliver it: named, with its own (ignored) id. */
const fileTheme = (overrides: Partial<ClassicyTheme> = {}): ClassicyTheme => ({
	...structuredClone(getTheme("bondi")),
	id: "whatever-the-file-says",
	name: "Ocean",
	...overrides,
});

const importTheme = (theme: unknown): ActionMessage => ({
	type: "ClassicyDesktopImportTheme",
	theme,
});

describe("ClassicyDesktopImportTheme", () => {
	it("adds the theme to customThemes and activates a copy of it", () => {
		const state = run(makeStore(), importTheme(fileTheme()));
		const { customThemes, activeTheme } = appearance(state);
		expect(customThemes).toHaveLength(1);
		expect(customThemes?.[0].id).toBe("custom-ocean");
		expect(customThemes?.[0].name).toBe("Ocean");
		expect(activeTheme).toEqual(customThemes?.[0]);
		expect(activeTheme).not.toBe(customThemes?.[0]);
		expect(activeTheme.color).toEqual(getTheme("bondi").color);
	});

	it("leaves the built-in themes untouched", () => {
		const before = appearance(makeStore()).availableThemes;
		const state = run(makeStore(), importTheme(fileTheme({ name: "Bondi" })));
		expect(appearance(state).availableThemes).toEqual(before);
		expect(appearance(state).activeTheme.id).toBe("custom-bondi-2");
		expect(appearance(state).activeTheme.name).toBe("Bondi 2");
	});

	it("imports a parsed theme file end to end", () => {
		const parsed = parseClassicyThemeFile(
			exportClassicyTheme(getTheme("azul")),
		);
		if (!parsed.ok) throw new Error(parsed.error);
		const state = run(makeStore(), importTheme(parsed.theme));
		expect(appearance(state).activeTheme.name).toBe("Azul 2");
		expect(appearance(state).activeTheme.desktop.backgroundImage).toBe(
			resolveWallpaper("azul_dark.png"),
		);
	});

	it("resolves a wallpaper filename in the payload for this build", () => {
		const theme = fileTheme();
		theme.desktop.backgroundImage = "waves_bondi.png";
		const state = run(makeStore(), importTheme(theme));
		expect(appearance(state).activeTheme.desktop.backgroundImage).toBe(
			resolveWallpaper("waves_bondi.png"),
		);
	});

	it("strips keys the schema does not declare", () => {
		const state = run(
			makeStore(),
			importTheme({ ...fileTheme(), extra: "<script>" }),
		);
		expect(appearance(state).activeTheme).not.toHaveProperty("extra");
	});

	it("gives a re-import of the same name a new id instead of overwriting", () => {
		let state = run(makeStore(), importTheme(fileTheme()));
		state = run(state, importTheme(fileTheme()));
		const customs = appearance(state).customThemes ?? [];
		expect(customs.map((t) => t.id)).toEqual([
			"custom-ocean",
			"custom-ocean-2",
		]);
		expect(customs.map((t) => t.name)).toEqual(["Ocean", "Ocean 2"]);
		expect(appearance(state).activeTheme.id).toBe("custom-ocean-2");
	});

	it("cannot take over the Custom fork slot or a built-in id", () => {
		let state = run(makeStore(), {
			type: "ClassicyDesktopChangeColor",
			colorKey: "select",
			color: 0x123456,
		});
		state = run(
			state,
			importTheme(fileTheme({ id: "custom", name: "Custom" })),
		);
		state = run(state, importTheme(fileTheme({ id: "default", name: "x" })));
		const customs = appearance(state).customThemes ?? [];
		expect(customs.map((t) => t.id)).toEqual([
			"custom",
			"custom-custom-2",
			"custom-x",
		]);
		expect(customs[0].color.select).toBe(0x123456);
		expect(
			appearance(state).availableThemes?.find((t) => t.id === "default")?.name,
		).toBe("Default");
	});

	it("edits the imported theme in place rather than forking", () => {
		let state = run(makeStore(), importTheme(fileTheme()));
		state = run(state, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "highlight",
			color: 0xabcdef,
		});
		state = run(state, {
			type: "ClassicyDesktopChangeFont",
			fontType: "body",
			font: "Monaco",
		});
		const customs = appearance(state).customThemes ?? [];
		expect(customs).toHaveLength(1);
		expect(customs[0].id).toBe("custom-ocean");
		expect(customs[0].color.highlight).toBe(0xabcdef);
		expect(customs[0].typography.body).toBe("Monaco");
		expect(appearance(state).activeTheme.id).toBe("custom-ocean");
		expect(appearance(state).activeTheme.color.highlight).toBe(0xabcdef);

		// Switching away and back restores the edited import.
		state = run(state, {
			type: "ClassicyDesktopChangeTheme",
			activeTheme: "default",
		});
		state = run(state, {
			type: "ClassicyDesktopChangeTheme",
			activeTheme: "custom-ocean",
		});
		expect(appearance(state).activeTheme.color.highlight).toBe(0xabcdef);
	});

	it.each([
		["no theme", undefined],
		["a non-object", "azul"],
		["an empty object", {}],
		[
			"an out-of-range colour",
			(() => {
				const t = fileTheme();
				t.color.select = 0x1000000;
				return t;
			})(),
		],
		[
			"a short palette",
			(() => {
				const t = fileTheme() as unknown as { color: { theme: number[] } };
				t.color.theme = [0, 0, 0];
				return t;
			})(),
		],
		[
			"an unknown sound",
			(() => {
				const t = fileTheme();
				t.sound.pack = "sosumi";
				return t;
			})(),
		],
		[
			"an unsafe backgroundImage",
			(() => {
				const t = fileTheme();
				t.desktop.backgroundImage = "x) ; background:url(https://evil.test)";
				return t;
			})(),
		],
	])("ignores a payload with %s", (_label, theme) => {
		const before = makeStore();
		const state = run(before, importTheme(theme));
		expect(appearance(state).customThemes ?? []).toEqual(
			appearance(before).customThemes ?? [],
		);
		expect(appearance(state).activeTheme).toEqual(
			appearance(before).activeTheme,
		);
	});

	it("is unreachable to untrusted (HyperCard) dispatches", () => {
		expect(isUntrustedActionAllowed("ClassicyDesktopImportTheme")).toBe(false);
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const state = run(makeStore(), importTheme(fileTheme()), "untrusted");
		warn.mockRestore();
		expect(appearance(state).customThemes ?? []).toHaveLength(0);
		expect(appearance(state).activeTheme.id).toBe("default");
	});
});

describe("ClassicyDesktopImportTheme — appearance packages", () => {
	const SINK_ID = "import-theme-package-test";

	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		unregisterClassicyLogSink(SINK_ID);
		vi.restoreAllMocks();
	});

	it("refuses an uninstalled package with the error dialog", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const entries: ClassicyLogEntry[] = [];
		registerClassicyLogSink({
			id: SINK_ID,
			onLog: (entry) => entries.push(entry),
		});
		const before = makeStore();
		const state = run(before, importTheme(fileTheme({ package: "irix" })));
		expect(appearance(state).customThemes ?? []).toEqual(
			appearance(before).customThemes ?? [],
		);
		expect(appearance(state).activeTheme).toEqual(
			appearance(before).activeTheme,
		);
		expect(state.System.Manager.Desktop.errorDialog).toEqual({
			title: "Appearance",
			message:
				'This theme needs the "irix" appearance package, which is not installed.',
		});
		expect(entries).toEqual([
			expect.objectContaining({
				level: "warn",
				subsystem: "ClassicyAppearance",
				message:
					'This theme needs the "irix" appearance package, which is not installed.',
			}),
		]);
	});

	it("imports a platinum theme with no package registered (R16)", () => {
		resetClassicyAppearancePackagesForTests();
		const state = run(
			makeStore(),
			importTheme(fileTheme({ package: "platinum" })),
		);
		expect(appearance(state).customThemes).toHaveLength(1);
		expect(appearance(state).activeTheme.package).toBe("platinum");
		expect(state.System.Manager.Desktop.errorDialog ?? null).toBeNull();
	});

	it("accepts a registered package", () => {
		registerClassicyAppearancePackage({
			id: "irix",
			name: "IRIX",
			css: "",
			defaults: { ...structuredClone(getTheme("azul")), package: "irix" },
			layout: {
				window: { growBoxCorner: "bottom-right" },
				menuBar: { placement: "screen" },
				desktop: { iconGridOrigin: "top-right" },
			},
		});
		const state = run(makeStore(), importTheme(fileTheme({ package: "irix" })));
		expect(appearance(state).customThemes).toHaveLength(1);
		expect(appearance(state).activeTheme.id).toBe("custom-ocean");
		expect(appearance(state).activeTheme.package).toBe("irix");
		expect(state.System.Manager.Desktop.errorDialog ?? null).toBeNull();
	});

	it("an imported theme survives a fork into a later package's Custom slot", () => {
		// Imported while no "ocean" package exists: custom-ocean is free.
		let state = run(makeStore(), importTheme(fileTheme({ name: "Ocean" })));
		expect(appearance(state).customThemes?.map((t) => t.id)).toEqual([
			"custom-ocean",
		]);
		const importedColor = appearance(state).activeTheme.color;
		const oceanPreset = {
			...structuredClone(getTheme("azul")),
			id: "ocean-one",
			name: "Ocean One",
			package: "ocean",
		};
		const oceanPackage: ClassicyAppearancePackage = {
			id: "ocean",
			name: "Ocean",
			css: "",
			defaults: oceanPreset,
			presets: [oceanPreset],
			layout: {
				window: { growBoxCorner: "bottom-right" },
				menuBar: { placement: "screen" },
				desktop: { iconGridOrigin: "top-right" },
			},
		};
		registerClassicyAppearancePackage(structuredClone(oceanPackage));
		state = run(state, {
			type: "ClassicyDesktopChangeAppearancePackage",
			packageId: "ocean",
		});
		// The first edit on an Ocean preset forks into Ocean's slot, custom-ocean.
		state = run(state, {
			type: "ClassicyDesktopChangeColor",
			colorKey: "black",
			color: 0x010101,
		});
		const a = appearance(state);
		expect(a.activeTheme.id).toBe("custom-ocean");
		expect(a.activeTheme.package).toBe("ocean");
		// The import moved aside, name and data intact.
		const imported = a.customThemes?.find((t) => t.package === "platinum");
		expect(imported?.id).toBe("custom-ocean-2");
		expect(imported?.name).toBe("Ocean");
		expect(imported?.color).toEqual(importedColor);
		expect(a.customThemes).toHaveLength(2);

		// Both are listed under their own package and selectable.
		expect(
			listClassicyPackageThemes(a, { id: "platinum" }).map((t) => t.id),
		).toContain("custom-ocean-2");
		expect(listClassicyPackageThemes(a, oceanPackage).map((t) => t.id)).toEqual(
			["ocean-one", "custom-ocean"],
		);
		state = run(state, {
			type: "ClassicyDesktopChangeTheme",
			activeTheme: "custom-ocean-2",
		});
		expect(appearance(state).activeTheme.name).toBe("Ocean");
		expect(appearance(state).activeTheme.color).toEqual(importedColor);
		state = run(state, {
			type: "ClassicyDesktopChangeTheme",
			activeTheme: "custom-ocean",
		});
		expect(appearance(state).activeTheme.package).toBe("ocean");
		expect(appearance(state).activeTheme.color.black).toBe(0x010101);
	});

	it("never duplicates a preset name or id of the active package", () => {
		const preset = (id: string, name: string) => ({
			...structuredClone(getTheme("azul")),
			id,
			name,
			package: "presets-pack",
		});
		registerClassicyAppearancePackage({
			id: "presets-pack",
			name: "Presets Pack",
			css: "",
			defaults: preset("tp-one", "TP One"),
			presets: [preset("tp-one", "TP One"), preset("custom-sea", "Sea Star")],
			layout: {
				window: { growBoxCorner: "bottom-right" },
				menuBar: { placement: "screen" },
				desktop: { iconGridOrigin: "top-right" },
			},
		});
		let state = run(makeStore(), {
			type: "ClassicyDesktopChangeAppearancePackage",
			packageId: "presets-pack",
		});
		state = run(state, importTheme(fileTheme({ name: "TP One" })));
		state = run(state, importTheme(fileTheme({ name: "Sea" })));
		expect(
			(appearance(state).customThemes ?? []).map((t) => [t.id, t.name]),
		).toEqual([
			["custom-tp-one-2", "TP One 2"],
			// custom-sea is a preset's id: an import there would be unreachable.
			["custom-sea-2", "Sea"],
		]);
	});

	it("never takes a package's Custom fork slot id", () => {
		registerClassicyAppearancePackage({
			id: "irix",
			name: "IRIX",
			css: "",
			defaults: { ...structuredClone(getTheme("azul")), package: "irix" },
			layout: {
				window: { growBoxCorner: "bottom-right" },
				menuBar: { placement: "screen" },
				desktop: { iconGridOrigin: "top-right" },
			},
		});
		// "Irix" slugs to the IRIX package's slot id, custom-irix, whichever
		// package the theme belongs to.
		let state = run(
			makeStore(),
			importTheme(fileTheme({ name: "Irix", package: "irix" })),
		);
		state = run(state, importTheme(fileTheme({ name: "Irix Two" })));
		state = run(
			state,
			importTheme(fileTheme({ name: "Platinum", package: "platinum" })),
		);
		expect((appearance(state).customThemes ?? []).map((t) => t.id)).toEqual([
			"custom-irix-2",
			"custom-irix-two",
			"custom-platinum",
		]);
	});
});
