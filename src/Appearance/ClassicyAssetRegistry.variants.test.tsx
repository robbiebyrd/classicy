// Per-theme asset variants (plan 0018-dbd 1.1, design 0017-6me "Per-theme
// art"): a package registers extra trees under a variant name, a theme names
// its variant (`assetVariant`), and lookups resolve the active package's
// variant tree, then its base tree, then the default package's base tree.
import { act, render } from "@testing-library/react";
import { produce } from "immer";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Registers Platinum's sound pack, which the themes used here name.
import "../../packages/appearance/platinum/src/assets/sounds/platinum";
import {
	type ClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	registerClassicyAssets,
	registerClassicyCursors,
	registerClassicySystemArt,
	resetClassicyAssets,
	resolveClassicyAsset,
	resolveClassicyThemeAsset,
	useClassicyAsset,
	useClassicyAssetTree,
	useClassicyAssetVars,
} from "@/Appearance/ClassicyAssetRegistry";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const stub = (id: string): ClassicyAppearancePackage => ({
	id,
	name: id,
	css: "",
	defaults: { ...getTheme("default"), package: id },
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
});

/** A theme of `packageId`, naming `assetVariant` when given. */
const themeOf = (packageId: string, assetVariant?: string): ClassicyTheme => {
	const theme: ClassicyTheme = {
		...getTheme("default"),
		id: `${packageId}-${assetVariant ?? "base"}`,
		package: packageId,
	};
	if (assetVariant !== undefined) theme.assetVariant = assetVariant;
	return theme;
};

/** Makes `packageId` the stored package and `theme` the active theme. */
const activate = (packageId: string, theme: ClassicyTheme) =>
	act(() => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Appearance.packageId = packageId;
				draft.System.Manager.Appearance.activeTheme = theme;
			}),
		);
	});

const captureHook = <T,>(hook: () => T) => {
	const seen: T[] = [];
	const Probe = () => {
		seen.push(hook());
		return null;
	};
	render(createElement(Probe));
	return seen;
};

const SINK = "asset-variants-test";
let entries: ClassicyLogEntry[] = [];
const variantWarnings = () =>
	entries.filter(
		(e) =>
			e.level === "warn" &&
			e.subsystem === "ClassicyAssetRegistry" &&
			/variant/.test(e.message),
	);

beforeEach(() => {
	resetClassicyAssets();
	resetClassicyAppearancePackagesForTests();
	useAppManager.setState(DefaultAppManagerState, true);
	entries = [];
	vi.spyOn(console, "warn").mockImplementation(() => {});
	registerClassicyLogSink({ id: SINK, onLog: (e) => entries.push(e) });
	registerClassicyAppearancePackage(stub("platinum"));
	registerClassicyAppearancePackage(stub("sys7"));
	// The default package's base tree: the last resort.
	registerClassicyAssets("icons", "platinum", {
		app: "/platinum-app.png",
		core: "/platinum-core.png",
	});
	// sys7's base (color) tree and its `bw` variant.
	registerClassicyAssets("icons", "sys7", {
		app: "/sys7-app.png",
		trash: "/sys7-trash.png",
	});
	registerClassicyAssets(
		"icons",
		"sys7",
		{ app: "/sys7-bw-app.png" },
		{
			variant: "bw",
		},
	);
	registerClassicySystemArt("sys7", { appleMenu: "/apple-rainbow.png" });
	registerClassicySystemArt(
		"sys7",
		{ appleMenu: "/apple-black.png" },
		{ variant: "bw" },
	);
	registerClassicyCursors("sys7", { arrow: "/arrow-color.png" });
	registerClassicyCursors(
		"sys7",
		{ arrow: "/arrow-bw.png" },
		{ variant: "bw" },
	);
});

afterEach(() => {
	unregisterClassicyLogSink(SINK);
	vi.restoreAllMocks();
	resetClassicyAssets();
	resetClassicyAppearancePackagesForTests();
	useAppManager.setState(DefaultAppManagerState, true);
});

describe("resolution with a theme naming a variant", () => {
	it("the variant's leaf wins over the base tree's", () => {
		activate("sys7", themeOf("sys7", "bw"));
		expect(resolveClassicyAsset("icons", "app")).toBe("/sys7-bw-app.png");
		expect(resolveClassicyAsset("systemArt", "appleMenu")).toBe(
			"/apple-black.png",
		);
		expect(resolveClassicyAsset("cursors", "arrow")).toBe("/arrow-bw.png");
	});

	it("the package's base tree fills a key the variant lacks", () => {
		activate("sys7", themeOf("sys7", "bw"));
		expect(resolveClassicyAsset("icons", "trash")).toBe("/sys7-trash.png");
	});

	it("the default package fills a key the package lacks", () => {
		activate("sys7", themeOf("sys7", "bw"));
		expect(resolveClassicyAsset("icons", "core")).toBe("/platinum-core.png");
	});

	it("the merged tree layers the variant over the base over the default", () => {
		activate("sys7", themeOf("sys7", "bw"));
		const seen = captureHook(() => useClassicyAssetTree("icons"));
		expect(seen.at(-1)).toEqual({
			app: "/sys7-bw-app.png",
			core: "/platinum-core.png",
			trash: "/sys7-trash.png",
		});
	});

	it("an explicit variant argument resolves without the store's theme", () => {
		activate("sys7", themeOf("sys7"));
		expect(resolveClassicyAsset("icons", "app", "sys7", "bw")).toBe(
			"/sys7-bw-app.png",
		);
		expect(resolveClassicyAsset("icons", "app", "sys7")).toBe("/sys7-app.png");
	});

	it('an explicit "" variant resolves the base tree under a variant theme', () => {
		activate("sys7", themeOf("sys7", "bw"));
		expect(resolveClassicyAsset("icons", "app", "sys7", "")).toBe(
			"/sys7-app.png",
		);
		expect(resolveClassicyAsset("icons", "app", "sys7")).toBe(
			"/sys7-bw-app.png",
		);
	});

	it("a theme's own lookup resolves its variant, never the active theme's", async () => {
		// A preview of a sibling theme: the active theme is sys7's bw one.
		activate("sys7", themeOf("sys7", "bw"));
		expect(resolveClassicyThemeAsset("icons", "app", themeOf("sys7"))).toBe(
			"/sys7-app.png",
		);
		expect(
			resolveClassicyThemeAsset("systemArt", "appleMenu", themeOf("sys7")),
		).toBe("/apple-rainbow.png");
		// And the other way round.
		activate("sys7", themeOf("sys7"));
		expect(
			resolveClassicyThemeAsset("icons", "app", themeOf("sys7", "bw")),
		).toBe("/sys7-bw-app.png");
		expect(
			resolveClassicyThemeAsset("cursors", "arrow", themeOf("sys7", "bw")),
		).toBe("/arrow-bw.png");
		// The theme's package, whatever the active one, then the default's.
		expect(resolveClassicyThemeAsset("icons", "app", themeOf("platinum"))).toBe(
			"/platinum-app.png",
		);
		expect(
			resolveClassicyThemeAsset("icons", "core", themeOf("sys7", "bw")),
		).toBe("/platinum-core.png");
		// A theme naming no package is Platinum's (the theme schema's default).
		expect(resolveClassicyThemeAsset("icons", "app", {})).toBe(
			"/platinum-app.png",
		);
		// A variant the package never registered: its base tree, unwarned.
		expect(
			resolveClassicyThemeAsset("icons", "app", themeOf("sys7", "sepia")),
		).toBe("/sys7-app.png");
		await Promise.resolve();
		expect(variantWarnings()).toEqual([]);
	});

	it("a variant of the package never reaches another package's lookups", () => {
		// The active theme is sys7's, but the drawn package is Platinum, which
		// registers a `bw` tree but ships no built-in theme naming it.
		registerClassicyAssets(
			"icons",
			"platinum",
			{ app: "/plat-bw.png" },
			{
				variant: "bw",
			},
		);
		activate("platinum", themeOf("sys7", "bw"));
		expect(resolveClassicyAsset("icons", "app")).toBe("/platinum-app.png");
	});

	// Story 0235-xgi, fix round 2: another package's theme naming a variant
	// one of the drawn package's built-in themes names draws the drawn
	// package's trees of that variant, as its knobs complete from that
	// built-in (classicyDrawnThemeMeasurements): one look, art and knobs.
	it("another package's theme draws the drawn package's variant when one of its built-ins names it", () => {
		const id = "sys7v";
		registerClassicyAppearancePackage({
			...stub(id),
			defaults: { ...stub(id).defaults, assetVariant: "bw" },
		});
		registerClassicyAssets("icons", id, { app: "/sys7v-app.png" });
		registerClassicyAssets(
			"icons",
			id,
			{ app: "/sys7v-bw-app.png" },
			{ variant: "bw" },
		);
		registerClassicyAssets(
			"icons",
			id,
			{ app: "/sys7v-sepia-app.png" },
			{ variant: "sepia" },
		);
		activate(id, themeOf("platinum", "bw"));
		expect(resolveClassicyAsset("icons", "app")).toBe("/sys7v-bw-app.png");
		// A variant it registers but no built-in names: its base tree.
		activate(id, themeOf("platinum", "sepia"));
		expect(resolveClassicyAsset("icons", "app")).toBe("/sys7v-app.png");
		// A theme naming no variant: its base tree.
		activate(id, themeOf("platinum"));
		expect(resolveClassicyAsset("icons", "app")).toBe("/sys7v-app.png");
		// Not the drawn package: none of its variants.
		activate("platinum", themeOf("sys7", "bw"));
		expect(resolveClassicyAsset("icons", "app", id)).toBe("/sys7v-app.png");
	});
});

describe("a theme with no assetVariant", () => {
	it("resolves exactly as before: the package's base tree, then the default", () => {
		activate("sys7", themeOf("sys7"));
		expect(resolveClassicyAsset("icons", "app")).toBe("/sys7-app.png");
		expect(resolveClassicyAsset("icons", "core")).toBe("/platinum-core.png");
		expect(resolveClassicyAsset("systemArt", "appleMenu")).toBe(
			"/apple-rainbow.png",
		);
		const vars = captureHook(() => useClassicyAssetVars());
		expect(vars.at(-1)?.["--classicy-art-apple-menu"]).toBe(
			'url("/apple-rainbow.png")',
		);
		expect(variantWarnings()).toEqual([]);
	});

	it("registering a variant leaves the base tree's consumers alone", () => {
		activate("sys7", themeOf("sys7"));
		const seen = captureHook(() => useClassicyAssetTree("icons"));
		expect(seen.at(-1)).toEqual({
			app: "/sys7-app.png",
			core: "/platinum-core.png",
			trash: "/sys7-trash.png",
		});
	});
});

describe("switching themes", () => {
	it("switches useClassicyAsset and the published variables", () => {
		activate("sys7", themeOf("sys7"));
		const icons = captureHook(() => useClassicyAsset("icons", "app"));
		const vars = captureHook(() => useClassicyAssetVars());
		expect(icons.at(-1)).toBe("/sys7-app.png");
		expect(vars.at(-1)?.["--classicy-art-apple-menu"]).toBe(
			'url("/apple-rainbow.png")',
		);
		expect(vars.at(-1)?.["--classicy-cursor-arrow"]).toBe(
			'url("/arrow-color.png")',
		);
		activate("sys7", themeOf("sys7", "bw"));
		expect(icons.at(-1)).toBe("/sys7-bw-app.png");
		expect(vars.at(-1)?.["--classicy-art-apple-menu"]).toBe(
			'url("/apple-black.png")',
		);
		expect(vars.at(-1)?.["--classicy-cursor-arrow"]).toBe(
			'url("/arrow-bw.png")',
		);
		activate("sys7", themeOf("sys7"));
		expect(icons.at(-1)).toBe("/sys7-app.png");
		expect(vars.at(-1)?.["--classicy-art-apple-menu"]).toBe(
			'url("/apple-rainbow.png")',
		);
	});

	it("switches useClassicyAssetTree", () => {
		activate("sys7", themeOf("sys7"));
		const trees = captureHook(() => useClassicyAssetTree("icons"));
		expect(trees.at(-1)?.app).toBe("/sys7-app.png");
		activate("sys7", themeOf("sys7", "bw"));
		expect(trees.at(-1)?.app).toBe("/sys7-bw-app.png");
	});

	it("does not re-render a consumer for store changes that keep the theme's variant", () => {
		activate("sys7", themeOf("sys7", "bw"));
		const seen = captureHook(() => useClassicyAsset("icons", "app"));
		const renders = seen.length;
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Appearance.alertVolume = 50;
				}),
			);
		});
		expect(seen.length).toBe(renders);
	});

	it("a variant registered after mount re-renders its consumers", () => {
		activate("sys7", themeOf("sys7", "bw"));
		const seen = captureHook(() => useClassicyAsset("icons", "trash"));
		expect(seen.at(-1)).toBe("/sys7-trash.png");
		act(() =>
			registerClassicyAssets(
				"icons",
				"sys7",
				{ trash: "/bw-trash.png" },
				{
					variant: "bw",
				},
			),
		);
		expect(seen.at(-1)).toBe("/bw-trash.png");
	});
});

describe("a variant the package never registered", () => {
	it("uses the base tree and warns once per package and variant", async () => {
		activate("sys7", themeOf("sys7", "sepia"));
		expect(resolveClassicyAsset("icons", "app")).toBe("/sys7-app.png");
		expect(resolveClassicyAsset("systemArt", "appleMenu")).toBe(
			"/apple-rainbow.png",
		);
		await Promise.resolve();
		expect(resolveClassicyAsset("cursors", "arrow")).toBe("/arrow-color.png");
		await Promise.resolve();
		expect(variantWarnings()).toHaveLength(1);
		expect(variantWarnings()[0].message).toContain('"sepia"');
		expect(variantWarnings()[0].message).toContain('"sys7"');
		// Another variant name is its own warning.
		activate("sys7", themeOf("sys7", "noir"));
		resolveClassicyAsset("icons", "app");
		await Promise.resolve();
		expect(variantWarnings()).toHaveLength(2);
	});

	it("does not warn when the variant registers in the same task as the first lookup", async () => {
		activate("sys7", themeOf("sys7", "sepia"));
		resolveClassicyAsset("icons", "app");
		registerClassicyAssets(
			"icons",
			"sys7",
			{ app: "/sepia.png" },
			{
				variant: "sepia",
			},
		);
		await Promise.resolve();
		expect(variantWarnings()).toEqual([]);
		expect(resolveClassicyAsset("icons", "app")).toBe("/sepia.png");
	});

	it("a variant whose every leaf was rejected is not registered, and is warned", async () => {
		registerClassicyAssets(
			"icons",
			"sys7",
			{ app: "javascript:alert(1)", system: { trash: 'x".png' } },
			{ variant: "sepia" },
		);
		// Nothing to accept at all: an empty tree, or namespaces with no leaf.
		registerClassicyAssets("cursors", "sys7", {}, { variant: "sepia" });
		registerClassicyAssets("systemArt", "sys7", { nested: {} } as never, {
			variant: "sepia",
		});
		registerClassicyCursors("sys7", { arrow: "" }, { variant: "sepia" });
		activate("sys7", themeOf("sys7", "sepia"));
		expect(resolveClassicyAsset("icons", "app")).toBe("/sys7-app.png");
		await Promise.resolve();
		expect(variantWarnings()).toHaveLength(1);
		expect(variantWarnings()[0].message).toContain('"sepia"');
	});

	it("one accepted leaf registers the variant, with no warning", async () => {
		registerClassicyAssets(
			"icons",
			"sys7",
			{ app: "javascript:alert(1)", trash: "/sepia-trash.png" },
			{ variant: "sepia" },
		);
		activate("sys7", themeOf("sys7", "sepia"));
		expect(resolveClassicyAsset("icons", "app")).toBe("/sys7-app.png");
		expect(resolveClassicyAsset("icons", "trash")).toBe("/sepia-trash.png");
		await Promise.resolve();
		expect(variantWarnings()).toEqual([]);
	});

	it("a variant registered for one kind counts as registered for every kind", async () => {
		activate("sys7", themeOf("sys7", "bw"));
		// No `bw` wallpapers: the base tree, silently.
		registerClassicyAssets("wallpapers", "sys7", { Default: "/wall.png" });
		expect(resolveClassicyAsset("wallpapers", "Default")).toBe("/wall.png");
		await Promise.resolve();
		expect(variantWarnings()).toEqual([]);
	});
});

describe("registration", () => {
	it("an invalid variant name registers nothing, with a warning", () => {
		registerClassicyAssets(
			"icons",
			"sys7",
			{ app: "/x.png" },
			{
				variant: "b w",
			},
		);
		registerClassicyAssets(
			"icons",
			"sys7",
			{ app: "/y.png" },
			{
				variant: "",
			},
		);
		expect(resolveClassicyAsset("icons", "app", "sys7")).toBe("/sys7-app.png");
		expect(resolveClassicyAsset("icons", "app", "sys7", "b w")).toBe(
			"/sys7-app.png",
		);
		expect(variantWarnings()).toHaveLength(2);
	});

	it("a variant's trees deep-merge like the base tree", () => {
		registerClassicyAssets(
			"icons",
			"sys7",
			{ system: { a: "/a.png" } },
			{
				variant: "bw",
			},
		);
		registerClassicyAssets(
			"icons",
			"sys7",
			{ system: { b: "/b.png" } },
			{
				variant: "bw",
			},
		);
		expect(resolveClassicyAsset("icons", "system.a", "sys7", "bw")).toBe(
			"/a.png",
		);
		expect(resolveClassicyAsset("icons", "system.b", "sys7", "bw")).toBe(
			"/b.png",
		);
	});

	it("a variant's invalid leaves are dropped as the base tree's are", () => {
		registerClassicyAssets(
			"icons",
			"sys7",
			{ app: "javascript:alert(1)" },
			{ variant: "bw" },
		);
		expect(resolveClassicyAsset("icons", "app", "sys7", "bw")).toBe(
			"/sys7-bw-app.png",
		);
	});

	it("resetClassicyAssets clears the variant trees", () => {
		resetClassicyAssets();
		expect(resolveClassicyAsset("icons", "app", "sys7", "bw")).toBeUndefined();
	});

	it("system-art aliases are written in a variant too", () => {
		registerClassicySystemArt(
			"sys7",
			{ submenuArrow: "/bw-arrow.png" },
			{ variant: "bw" },
		);
		expect(resolveClassicyAsset("systemArt", "triangle", "sys7", "bw")).toBe(
			"/bw-arrow.png",
		);
	});
});

// Story 0235-xgi, Re-review 2 N4 and N5, and integration review G round 2
// (F9 to F11): a theme's variant draws art only as the drawn package's, when
// that package takes it (the theme is its own, or one of its built-ins names
// the variant) and registered trees for it. A Platinum theme naming `bw`
// drawn under a package whose built-in names `bw` draws that package's 1-bit
// art, and logs nothing: the lookups the core makes with Platinum's id
// (`classicyCoreIcon`, `iconImageByType(type, "platinum")`) read Platinum's
// base tree, as they should. A theme whose variant draws no art is warned
// once, whichever package draws it and whichever id a lookup is made with.
const NOT_REGISTERED = (variant: string, packageId: string) =>
	`Theme asset variant "${variant}" is not registered for package "${packageId}"; its base assets are used`;
const NOT_DRAWN = (variant: string, own: string, drawn: string) =>
	`Theme asset variant "${variant}" of package "${own}" is not drawn by package "${drawn}"; its base assets are used`;

describe("what a variant warns, for a theme of another package (0235-xgi N4, N5)", () => {
	const drawnWithBw = () => {
		const id = "sys7v";
		registerClassicyAppearancePackage({
			...stub(id),
			defaults: { ...stub(id).defaults, assetVariant: "bw" },
		});
		registerClassicyAssets("icons", id, { app: "/sys7v-app.png" });
		registerClassicyAssets(
			"icons",
			id,
			{ app: "/sys7v-bw-app.png" },
			{ variant: "bw" },
		);
		return id;
	};
	/** Lookups by the drawn package and by the default package's id. */
	const lookUp = async () => {
		const drawn = resolveClassicyAsset("icons", "app");
		const core = resolveClassicyAsset("icons", "core", "platinum");
		await Promise.resolve();
		await Promise.resolve();
		return { drawn, core };
	};

	it("logs nothing when the drawn package draws the theme's variant", async () => {
		const id = drawnWithBw();
		activate(id, themeOf("platinum", "bw"));
		const seen = await lookUp();
		expect(seen.drawn).toBe("/sys7v-bw-app.png");
		expect(seen.core).toBe("/platinum-core.png");
		expect(variantWarnings()).toEqual([]);
	});

	it("warns once, for the theme's own package, when no built-in of the drawn package names the variant", async () => {
		const id = drawnWithBw();
		activate(id, themeOf("platinum", "sepia"));
		const seen = await lookUp();
		expect(seen.drawn).toBe("/sys7v-app.png");
		await lookUp();
		expect(variantWarnings().map((e) => e.message)).toEqual([
			NOT_REGISTERED("sepia", "platinum"),
		]);
	});

	it("warns for a variant its own package draws and never registered", async () => {
		drawnWithBw();
		activate("platinum", themeOf("platinum", "bw"));
		const seen = await lookUp();
		expect(seen.drawn).toBe("/platinum-app.png");
		expect(variantWarnings().map((e) => e.message)).toEqual([
			NOT_REGISTERED("bw", "platinum"),
		]);
	});

	it("still warns once the theme's own package draws, after a page that drew the variant elsewhere", async () => {
		const id = drawnWithBw();
		activate(id, themeOf("platinum", "bw"));
		await lookUp();
		expect(variantWarnings()).toEqual([]);
		activate("platinum", themeOf("platinum", "bw"));
		await lookUp();
		expect(variantWarnings()).toHaveLength(1);
		expect(variantWarnings()[0].message).toContain('"platinum"');
	});

	// Review F9: each half of "the drawn package draws the variant", and the
	// check made after the current task.
	it("warns for the theme's own package when the drawn package has the variant's trees and no built-in naming it", async () => {
		// sys7 registers `bw` trees; none of its built-ins names `bw`, so a
		// Platinum theme naming it draws sys7's base tree.
		activate("sys7", themeOf("platinum", "bw"));
		const seen = await lookUp();
		expect(seen.drawn).toBe("/sys7-app.png");
		await lookUp();
		expect(variantWarnings().map((e) => e.message)).toEqual([
			NOT_REGISTERED("bw", "platinum"),
		]);
	});

	it("warns for both packages when the drawn package's built-in names a variant neither registered", async () => {
		const id = "named-only";
		registerClassicyAppearancePackage({
			...stub(id),
			defaults: { ...stub(id).defaults, assetVariant: "bw" },
		});
		registerClassicyAssets("icons", id, { app: "/named-only-app.png" });
		activate(id, themeOf("platinum", "bw"));
		const seen = await lookUp();
		expect(seen.drawn).toBe("/named-only-app.png");
		await lookUp();
		expect(
			variantWarnings()
				.map((e) => e.message)
				.sort(),
		).toEqual(
			[NOT_REGISTERED("bw", id), NOT_REGISTERED("bw", "platinum")].sort(),
		);
	});

	it("does not warn when the package that draws the variant registers in the same task as the first lookup", async () => {
		const id = "late";
		// The stored package is not registered yet: Platinum draws.
		activate(id, themeOf("platinum", "bw"));
		expect(resolveClassicyAsset("icons", "core", "platinum")).toBe(
			"/platinum-core.png",
		);
		expect(resolveClassicyAsset("icons", "app")).toBe("/platinum-app.png");
		act(() => {
			registerClassicyAppearancePackage({
				...stub(id),
				defaults: { ...stub(id).defaults, assetVariant: "bw" },
			});
			registerClassicyAssets(
				"icons",
				id,
				{ app: "/late-bw-app.png" },
				{ variant: "bw" },
			);
		});
		await Promise.resolve();
		await Promise.resolve();
		expect(variantWarnings()).toEqual([]);
		expect(resolveClassicyAsset("icons", "app")).toBe("/late-bw-app.png");
		// No mark was left: its own package drawing it is still warned.
		activate("platinum", themeOf("platinum", "bw"));
		await lookUp();
		expect(variantWarnings().map((e) => e.message)).toEqual([
			NOT_REGISTERED("bw", "platinum"),
		]);
	});

	// Review G round 3, F13: a theme that names no package is the default
	// package's ("missing → platinum"), never the drawing package's.
	it("takes a theme naming no package for the default package's", async () => {
		const theme: Partial<ClassicyTheme> = themeOf("platinum", "sepia");
		delete theme.package;
		activate("sys7", theme as ClassicyTheme);
		const seen = await lookUp();
		expect(seen.drawn).toBe("/sys7-app.png");
		expect(variantWarnings().map((e) => e.message)).toEqual([
			NOT_REGISTERED("sepia", "platinum"),
		]);
	});

	// Review G round 3, F10: a package that is not registered is not loaded,
	// so it is never named as lacking a variant; the variant is not drawn by
	// the package that draws, which holds whatever that package has.
	it("names a theme's package that is not registered only as not drawing its variant", async () => {
		// A host that dropped its package: a Custom of it naming `bw`.
		activate("platinum", themeOf("gone7", "bw"));
		const seen = await lookUp();
		expect(seen.drawn).toBe("/platinum-app.png");
		await lookUp();
		expect(variantWarnings().map((e) => e.message)).toEqual([
			NOT_DRAWN("bw", "gone7", "platinum"),
		]);
	});

	it("never names a package that registers a task later as lacking the variant", async () => {
		// Stored and the theme's own, but imported later (a dynamic import):
		// Platinum draws until it registers.
		activate("late7", themeOf("late7", "bw"));
		const before = await lookUp();
		expect(before.drawn).toBe("/platinum-app.png");
		await new Promise((resolve) => setTimeout(resolve, 0));
		act(() => {
			registerClassicyAppearancePackage(stub("late7"));
			registerClassicyAssets(
				"icons",
				"late7",
				{ app: "/late7-bw-app.png" },
				{ variant: "bw" },
			);
		});
		const after = await lookUp();
		expect(after.drawn).toBe("/late7-bw-app.png");
		await new Promise((resolve) => setTimeout(resolve, 0));
		await lookUp();
		// What held before it registered, and nothing once it draws.
		expect(variantWarnings().map((e) => e.message)).toEqual([
			NOT_DRAWN("bw", "late7", "platinum"),
		]);
	});

	// Review F11: the warning does not depend on a lookup made with the
	// theme's own package's id, which in the core only the default package
	// gets. A theme of any package naming a variant that draws no art warns,
	// under any package, through any lookup.
	describe.each([
		["the drawn package's id", () => resolveClassicyAsset("icons", "app")],
		[
			"the default package's id",
			() => resolveClassicyAsset("icons", "core", "platinum"),
		],
		[
			"the theme's own package's id",
			() => resolveClassicyAsset("icons", "app", "sys7"),
		],
		[
			"a third package's id",
			() => resolveClassicyAsset("icons", "app", "sys7v"),
		],
		[
			"a hook",
			() => {
				captureHook(() => useClassicyAsset("icons", "app"));
			},
		],
		[
			"the published variables",
			() => {
				captureHook(() => useClassicyAssetVars());
			},
		],
	])("through a lookup made with %s", (_how, read) => {
		const flush = async () => {
			await Promise.resolve();
			await Promise.resolve();
		};

		it("warns once for a non-default package's theme naming a variant nothing registered, drawn under the default package", async () => {
			drawnWithBw();
			activate("platinum", themeOf("sys7", "sepia"));
			read();
			await flush();
			read();
			read();
			await flush();
			expect(variantWarnings().map((e) => e.message)).toEqual([
				NOT_REGISTERED("sepia", "sys7"),
			]);
		});

		it("warns once for a variant of the theme's own package that the drawn package does not take", async () => {
			drawnWithBw();
			// `bw` is sys7's, registered; Platinum draws, and takes none of it.
			activate("platinum", themeOf("sys7", "bw"));
			read();
			await flush();
			read();
			read();
			await flush();
			expect(variantWarnings().map((e) => e.message)).toEqual([
				NOT_DRAWN("bw", "sys7", "platinum"),
			]);
		});

		it("logs nothing for a theme whose variant the drawn package draws", async () => {
			const id = drawnWithBw();
			// Its own package's theme, then another package's.
			activate("sys7", themeOf("sys7", "bw"));
			read();
			await flush();
			activate(id, themeOf("platinum", "bw"));
			read();
			await flush();
			activate(id, themeOf("sys7", "bw"));
			read();
			await flush();
			expect(variantWarnings()).toEqual([]);
		});
	});

	it("warns each mistake once in a page, and again for another", async () => {
		drawnWithBw();
		activate("platinum", themeOf("sys7", "sepia"));
		await lookUp();
		activate("platinum", themeOf("sys7", "bw"));
		await lookUp();
		activate("sys7", themeOf("sys7", "sepia"));
		await lookUp();
		activate("platinum", themeOf("sys7", "sepia"));
		await lookUp();
		activate("platinum", themeOf("sys7", "bw"));
		await lookUp();
		expect(variantWarnings().map((e) => e.message)).toEqual([
			NOT_REGISTERED("sepia", "sys7"),
			NOT_DRAWN("bw", "sys7", "platinum"),
		]);
		// Another name is its own warning. The same misspelling under another
		// drawing package is not: it is keyed by the theme's package and name.
		activate("platinum", themeOf("sys7", "noir"));
		await lookUp();
		activate("sys7v", themeOf("sys7", "sepia"));
		await lookUp();
		expect(variantWarnings().map((e) => e.message)).toEqual([
			NOT_REGISTERED("sepia", "sys7"),
			NOT_DRAWN("bw", "sys7", "platinum"),
			NOT_REGISTERED("noir", "sys7"),
		]);
	});

	it("warns of what holds after the task, and leaves no mark for what does not", async () => {
		drawnWithBw();
		// A lookup under a theme whose variant draws nothing, then, in the
		// same task, a theme naming none: nothing to warn of.
		activate("platinum", themeOf("sys7", "sepia"));
		resolveClassicyAsset("icons", "app");
		activate("platinum", themeOf("platinum"));
		await Promise.resolve();
		await Promise.resolve();
		expect(variantWarnings()).toEqual([]);
		// The same mistake later is still warned.
		activate("platinum", themeOf("sys7", "sepia"));
		await lookUp();
		expect(variantWarnings().map((e) => e.message)).toEqual([
			NOT_REGISTERED("sepia", "sys7"),
		]);
	});
});
