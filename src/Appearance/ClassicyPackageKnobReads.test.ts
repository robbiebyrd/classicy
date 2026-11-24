import "@classicy/appearance-platinum";
import "@classicy/appearance-system7";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { compile, NodePackageImporter } from "sass";
import { afterAll, describe, expect, it } from "vitest";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	getClassicyAppearancePackage,
	listClassicyAppearancePackages,
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	type ClassicyTheme,
	getAllThemes,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_DEFAULT_THEME_METRICS,
	classicyDrawnThemeMeasurements,
	classicyMeasurementVars,
	classicyThemeMeasurementDefaults,
	withoutDefaultThemeMeasurements,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import {
	blankClassicyScssComments,
	listClassicyScssFiles,
} from "../../bin/classicyScssSource.ts";

// Stories 0225-ci7 and 0235-xgi: `ChangeTheme` may draw a theme of one
// Appearance Package under another (a Platinum preset or Custom theme kept
// when System 7 becomes the active package, say), and the drawing package's
// stylesheet then reads the variables that theme emits. A System 7 theme
// drawn under Platinum once emitted no `--slider-*` (0225-ci7), and a
// Platinum theme drawn under System 7 lacked 156 of System 7's own knobs
// (its title bars, menus and Standard File box; 0235-xgi). So every
// registered package's themes, drawn under every registered package, must
// emit every variable that package's sheet and the core's base sheets read
// without a fallback, and every knob the drawing package declares.

const REPO = path.resolve(import.meta.dirname, "../..");

// Each workspace Appearance Package's stylesheet, by package id.
// Each workspace Appearance Package's stylesheet, by package id: every
// `packages/appearance/<id>/` holds `src/styles/<id>.scss` (asserted below),
// so a new package's sheet is read without editing this list.
const WORKSPACE_PACKAGES = readdirSync(path.join(REPO, "packages/appearance"), {
	withFileTypes: true,
})
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name);
const PACKAGE_SHEETS: Readonly<Record<string, string>> = Object.fromEntries(
	WORKSPACE_PACKAGES.map((id) => [
		id,
		`packages/appearance/${id}/src/styles/${id}.scss`,
	]),
);

// Every `var(--name)` with no fallback.
const NO_FALLBACK = /var\((--[\w-]+)\)/g;
const readsIn = (css: string): Set<string> =>
	new Set([...css.matchAll(NO_FALLBACK)].map((m) => m[1]));

const packageReads = new Map(
	Object.entries(PACKAGE_SHEETS).map(([id, file]) => [
		id,
		readsIn(
			compile(path.join(REPO, file), {
				loadPaths: [
					path.join(REPO, "src"),
					path.join(REPO, path.dirname(file)),
				],
				importers: [new NodePackageImporter()],
			}).css,
		),
	]),
);

// The core's base sheets (every `src/**/*.scss`), comments blanked.
const baseReads = readsIn(
	listClassicyScssFiles(path.join(REPO, "src"))
		.map((file) => blankClassicyScssComments(readFileSync(file, "utf8")))
		.join("\n"),
);

const emitted = (theme: ClassicyTheme, drawnPackageId?: string) =>
	new Set(Object.keys(getThemeVars(theme, drawnPackageId)));

// The knob variables `drawnPackageId` declares (the core floor's and its own
// defaults'), with the values `theme` emits for them under it.
const knobVars = (
	theme: ClassicyTheme,
	drawnPackageId: string,
): Record<string, string> => {
	const all = getThemeVars(theme, drawnPackageId) as Record<string, string>;
	return Object.fromEntries(
		Object.keys(
			classicyMeasurementVars(classicyThemeMeasurementDefaults(drawnPackageId)),
		).map((name) => [name, all[name]]),
	);
};

// A registered package whose themes declare only the core five: completed
// from the core floor alone, and drawing with nothing of its own.
const BARE = "bare-package";
const platinumDefault = getTheme("default");
const bare: ClassicyTheme = {
	...platinumDefault,
	id: BARE,
	name: "Bare",
	package: BARE,
	measurements: structuredClone(
		CLASSICY_DEFAULT_THEME_METRICS,
	) as ClassicyTheme["measurements"],
};
registerClassicyAppearancePackage({
	id: BARE,
	name: "Bare",
	css: "",
	defaults: bare,
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
});
afterAll(() => unregisterClassicyAppearancePackage(BARE));

const drawingPackages = listClassicyAppearancePackages().map((p) => p.id);

// Every registered package's themes: built in, and as persistence stores a
// Custom copy of each (without the knob values equal to its package's
// defaults, H-R17), which is what a reload hands getThemeVars.
const asStored = (theme: ClassicyTheme): ClassicyTheme =>
	withoutDefaultThemeMeasurements(
		{ ...theme, id: `custom-${theme.id}` },
		classicyThemeMeasurementDefaults(theme.package),
	);
const themes: ClassicyTheme[] = [
	...getAllThemes(),
	bare,
	...getAllThemes().map(asStored),
	asStored(bare),
];

// What `drawn`'s own themes emit, of what its sheet and the base sheets read
// without a fallback: the variables its sheet takes from a theme.
const neededBy = (drawn: string): string[] => {
	const own = new Set(
		getAllThemes()
			.filter((t) => t.package === drawn)
			.concat(drawn === BARE ? [bare] : [])
			.flatMap((t) => [...emitted(t, drawn)]),
	);
	return [...(packageReads.get(drawn) ?? []), ...baseReads].filter((name) =>
		own.has(name),
	);
};

describe("a theme drawn under any registered package (0235-xgi)", () => {
	it("registers every workspace package and the bare stand-in, and reads each workspace package's sheet", () => {
		expect(WORKSPACE_PACKAGES).toEqual(
			expect.arrayContaining(["platinum", "system7"]),
		);
		for (const file of Object.values(PACKAGE_SHEETS))
			expect(existsSync(path.join(REPO, file)), file).toBe(true);
		expect(drawingPackages).toEqual(
			expect.arrayContaining([...WORKSPACE_PACKAGES, BARE]),
		);
		// The sheets read their own knobs without a fallback: the slider's
		// and the menu marks' grid in Platinum's (0225-ci7), the title bar's
		// boxes and Standard File's layout in System 7's.
		for (const name of [
			"--slider-pixel",
			"--menu-frame-border-width",
			"--checkbox-pixel",
			"--menu-mark-pixel",
		])
			expect(neededBy("platinum")).toContain(name);
		for (const name of [
			"--title-bar-box-gap",
			"--menu-item-height",
			"--file-dialog-list-left",
		])
			expect(neededBy("system7")).toContain(name);
		expect(neededBy("system7").length).toBeGreaterThan(150);
	});

	describe.each(drawingPackages)("drawn under %s", (drawn) => {
		const needed = neededBy(drawn);
		const ownKnobs = Object.keys(
			classicyMeasurementVars(classicyThemeMeasurementDefaults(drawn)),
		);

		it.each(
			themes.map((t) => [`${t.package}/${t.id}`, t] as const),
		)("%s emits every variable its sheets read without a fallback", (_name, theme) => {
			const own = emitted(theme, drawn);
			expect(needed.filter((name) => !own.has(name))).toEqual([]);
		});

		it.each(
			themes.map((t) => [`${t.package}/${t.id}`, t] as const),
		)("%s emits every knob the drawing package declares", (_name, theme) => {
			const own = emitted(theme, drawn);
			expect(ownKnobs.filter((name) => !own.has(name))).toEqual([]);
		});
	});
});

// A theme's values that differ from its own package's defaults: its edits.
const isUnedited = (theme: ClassicyTheme): boolean => {
	const defaults = classicyThemeMeasurementDefaults(theme.package);
	return Object.entries(theme.measurements).every(([family, keys]) =>
		Object.entries(keys).every(
			([key, value]) => defaults[family]?.[key] === value,
		),
	);
};

describe("what wins (0235-xgi)", () => {
	const system7 = getClassicyAppearancePackage("system7")
		?.defaults as ClassicyTheme;

	// The built-in a package completes another package's theme from: the one
	// its `foreignThemeDefaults` names (System 7: its color preset), else its
	// defaults (Platinum and the bare package). Fix round 1, review I1.
	const foreignReference = (id: string): ClassicyTheme => {
		const pkg = getClassicyAppearancePackage(id);
		const ref = pkg?.foreignThemeDefaults;
		return (
			(ref === undefined
				? undefined
				: [pkg?.defaults, ...(pkg?.presets ?? [])].find(
						(theme) => theme?.id === ref,
					)) ?? (pkg?.defaults as ClassicyTheme)
		);
	};

	it("names System 7's color preset for foreign themes, and nothing for Platinum", () => {
		expect(getClassicyAppearancePackage("system7")?.foreignThemeDefaults).toBe(
			"system7-color",
		);
		expect(
			getClassicyAppearancePackage("platinum")?.foreignThemeDefaults,
		).toBeUndefined();
		expect(foreignReference("platinum").id).toBe("default");
	});

	it("refuses a foreignThemeDefaults that names none of the package's built-ins", () => {
		const id = "foreign-reference-probe";
		const probe = { ...bare, id, package: id };
		const base: ClassicyAppearancePackage = {
			id,
			name: "Probe",
			css: "",
			defaults: probe,
			presets: [probe, { ...probe, id: `${id}-color` }],
			layout: {
				window: { growBoxCorner: "bottom-right" },
				menuBar: { placement: "screen" },
				desktop: { iconGridOrigin: "top-right" },
			},
		};
		try {
			registerClassicyAppearancePackage({
				...base,
				foreignThemeDefaults: "nope",
			});
			expect(getClassicyAppearancePackage(id)).toBeUndefined();
			registerClassicyAppearancePackage({
				...base,
				foreignThemeDefaults: `${id}-color`,
			});
			expect(getClassicyAppearancePackage(id)?.foreignThemeDefaults).toBe(
				`${id}-color`,
			);
		} finally {
			unregisterClassicyAppearancePackage(id);
		}
	});

	it("an unedited theme of another package draws the drawing package's foreign reference's knob values", () => {
		const unedited = themes.filter(isUnedited);
		// Platinum's 21 built-ins, System 7's defaults and the bare theme, and
		// their stored copies.
		expect(unedited.length).toBeGreaterThan(40);
		for (const drawn of drawingPackages) {
			const expected = knobVars(foreignReference(drawn), drawn);
			for (const theme of unedited.filter((t) => t.package !== drawn)) {
				expect(
					knobVars(theme, drawn),
					`${theme.package}/${theme.id} under ${drawn}`,
				).toEqual(expected);
			}
		}
		// So a Platinum theme under System 7 keeps System 7's core five too,
		// and its color look, not the 1-bit one.
		const vars = getThemeVars(platinumDefault, "system7") as Record<
			string,
			string
		>;
		expect(vars["--window-control-size"]).toBe("11px");
		expect(vars["--window-scrollbar-size"]).toBe("16px");
		expect(vars["--window-utility-title-bar-height"]).toBe("13px");
		expect(vars["--title-bar-box-gap"]).toBe("1px");
		const color = getThemeVars(foreignReference("system7")) as Record<
			string,
			string
		>;
		for (const [name, value] of [
			["--dither-tile-size", "0px"],
			["--scroll-bar-bevel", "1px"],
			["--scroll-bar-grip", "6px"],
			["--box-bevel", "1px"],
			["--dialog-frame-bevel", "1px"],
			["--icon-selection-invert", "0px"],
			["--menu-bar-title-art-invert", "0px"],
			["--menu-item-hidden-icon-opacity", "53px"],
		] as const) {
			expect(color[name], name).toBe(value);
			expect(vars[name], name).toBe(value);
		}
		const reverse = getThemeVars(system7, "platinum") as Record<string, string>;
		expect(reverse["--window-control-size"]).toBe("12px");
		expect(reverse["--window-scrollbar-size"]).toBe("17px");
		expect(reverse["--slider-pixel"]).toBe("1px");
		expect(reverse).not.toHaveProperty("--title-bar-box-gap");
	});

	it("keeps a theme's own edits over the drawing package's defaults", () => {
		const edited: ClassicyTheme = {
			...structuredClone(platinumDefault),
			id: "custom",
			name: "Custom",
		};
		edited.measurements.window.controlSize = 14;
		edited.measurements.controlStrip.cellHeight = 30;
		edited.measurements.zoomRects.enabled = 0;
		const vars = getThemeVars(edited, "system7") as Record<string, string>;
		expect(vars["--window-control-size"]).toBe("14px");
		expect(vars["--control-strip-cell-height"]).toBe("30px");
		expect(vars["--zoom-rects-enabled"]).toBe("0px");
		// The rest is System 7's.
		expect(vars["--window-scrollbar-size"]).toBe("16px");
		expect(vars["--zoom-rects-trail"]).toBe("4px");
		expect(vars["--menu-item-height"]).toBe("16px");
		// The stored copy draws the same.
		expect(getThemeVars(asStored(edited), "system7")).toEqual(vars);
		// And a System 7 theme's edit wins under Platinum.
		const s7 = structuredClone(system7);
		s7.measurements.menuFrame.shadowStart = 4;
		expect(
			(getThemeVars(s7, "platinum") as Record<string, string>)[
				"--menu-frame-shadow-start"
			],
		).toBe("4px");
	});

	it("draws every theme as its stored copy does, under every package", () => {
		for (const drawn of drawingPackages) {
			for (const theme of [...getAllThemes(), bare]) {
				expect(
					getThemeVars(asStored(theme), drawn),
					`${theme.package}/${theme.id} under ${drawn}`,
				).toEqual(getThemeVars({ ...theme, id: `custom-${theme.id}` }, drawn));
			}
		}
	});

	it("follows the drawing package's zoom opt-in, unless the theme turned it off", () => {
		// The bare package has not opted in: no zoom for Platinum's theme there.
		expect(emitted(platinumDefault, BARE).has("--zoom-rects-enabled")).toBe(
			false,
		);
		// Platinum has: the bare theme zooms under Platinum.
		expect(
			(getThemeVars(bare, "platinum") as Record<string, string>)[
				"--zoom-rects-enabled"
			],
		).toBe("1px");
		// Turned off by the theme, off under every package.
		const off = structuredClone(platinumDefault);
		off.measurements.zoomRects.enabled = 0;
		for (const drawn of drawingPackages)
			expect(
				(getThemeVars(off, drawn) as Record<string, string>)[
					"--zoom-rects-enabled"
				],
				drawn,
			).toBe("0px");
	});

	it("keeps every value of a theme whose package is not registered", () => {
		const ghost: ClassicyTheme = {
			...structuredClone(platinumDefault),
			id: "ghost",
			package: "ghost-package",
		};
		const vars = getThemeVars(ghost, "system7") as Record<string, string>;
		// Its own values, which no registered package's defaults tell apart
		// from edits.
		expect(vars["--window-scrollbar-size"]).toBe("17px");
		expect(vars["--control-strip-cell-height"]).toBe("22px");
		// And System 7's knobs it lacks.
		expect(vars["--title-bar-box-gap"]).toBe("1px");
		expect(vars["--file-dialog-list-left"]).toBe("15px");
	});

	it("is the theme's own completion under its own package, or with no drawing package", () => {
		for (const theme of [...getAllThemes(), bare]) {
			expect(getThemeVars(theme, theme.package)).toEqual(getThemeVars(theme));
		}
		// An unregistered drawing id draws as the registered default (Platinum).
		expect(classicyDrawnThemeMeasurements(system7, "nope")).toEqual(
			classicyDrawnThemeMeasurements(system7, "platinum"),
		);
	});
});
