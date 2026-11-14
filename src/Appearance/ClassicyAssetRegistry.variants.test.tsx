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

	it("a variant of the package never reaches another package's lookups", () => {
		// The active theme is sys7's, but the drawn package is Platinum.
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
