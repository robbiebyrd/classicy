// A theme's `assetVariant` (plan 0018-dbd 1.1) survives a save and a load:
// a built-in saved as its reference `{ id, package }` comes back from its
// preset, which carries the field; a custom theme is saved whole. Each test
// boots a fresh module graph from saved state, as a page load does, and the
// asset registry then resolves the variant's art.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

const STORE = "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
const APPEARANCE =
	"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
const REGISTRY = "@/Appearance/ClassicyAppearancePackageRegistry";
const ASSETS = "@/Appearance/ClassicyAssetRegistry";
const KEY = "classicyDesktopState";
const PACKAGE = "variant-pack";

const strip = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** A package whose `bw` preset names the `bw` variant of its assets. */
const variantPack = (base: ClassicyTheme): ClassicyAppearancePackage => ({
	id: PACKAGE,
	name: "Variant Pack",
	css: "",
	defaults: { ...strip(base), id: "variant-color", package: PACKAGE },
	presets: [
		{
			...strip(base),
			id: "variant-bw",
			name: "Variant B&W",
			package: PACKAGE,
			assetVariant: "bw",
		},
	],
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
});

/** A fresh module graph whose store hydrates from `saved`, with Platinum
 * and the variant package registered, and the package's art. */
const boot = async (saved?: unknown) => {
	vi.resetModules();
	localStorage.clear();
	if (saved !== undefined) localStorage.setItem(KEY, JSON.stringify(saved));
	vi.spyOn(console, "warn").mockImplementation(() => {});
	const store = await import(STORE);
	store.stopAppManagerPersistence();
	await import("@classicy/appearance-platinum");
	const appearance = await import(APPEARANCE);
	const registry = await import(REGISTRY);
	const assets = await import(ASSETS);
	registry.registerClassicyAppearancePackage(
		variantPack(appearance.getTheme("default")),
	);
	assets.registerClassicySystemArt(PACKAGE, { appleMenu: "/rainbow.png" });
	assets.registerClassicySystemArt(
		PACKAGE,
		{ appleMenu: "/black.png" },
		{ variant: "bw" },
	);
	const state = (): ClassicyStore => store.useAppManager.getState();
	const setAppearance = (
		edit: (a: ClassicyStore["System"]["Manager"]["Appearance"]) => void,
	) =>
		store.useAppManager.setState((s: ClassicyStore) => {
			const next = strip(s);
			edit(next.System.Manager.Appearance);
			return next;
		});
	return {
		store,
		assets,
		registry,
		state,
		setAppearance,
		active: (): ClassicyTheme => state().System.Manager.Appearance.activeTheme,
		saved: (): ClassicyStore =>
			strip(store.sanitizeStateForPersistence(state())),
	};
};

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
	vi.resetModules();
});

describe("assetVariant across a save and a load", () => {
	it("a built-in theme is saved as its reference and comes back with its preset's variant", async () => {
		const first = await boot();
		const preset = first.registry.getClassicyAppearancePackage(PACKAGE)
			.presets[0] as ClassicyTheme;
		first.setAppearance((a) => {
			a.packageId = PACKAGE;
			a.activeTheme = strip(preset);
		});
		expect(first.assets.resolveClassicyAsset("systemArt", "appleMenu")).toBe(
			"/black.png",
		);
		const saved = first.saved();
		expect(saved.System.Manager.Appearance.activeTheme).toEqual({
			id: "variant-bw",
			package: PACKAGE,
		});

		const second = await boot(saved);
		expect(second.active().id).toBe("variant-bw");
		expect(second.active().assetVariant).toBe("bw");
		expect(second.assets.resolveClassicyAsset("systemArt", "appleMenu")).toBe(
			"/black.png",
		);
	});

	it("a custom theme is saved whole, its variant included", async () => {
		const first = await boot();
		const preset = first.registry.getClassicyAppearancePackage(PACKAGE)
			.presets[0] as ClassicyTheme;
		const custom: ClassicyTheme = {
			...strip(preset),
			id: `custom-${PACKAGE}`,
			name: "Custom",
		};
		first.setAppearance((a) => {
			a.packageId = PACKAGE;
			a.customThemes = [custom];
			a.activeTheme = strip(custom);
		});
		const saved = first.saved();
		expect(saved.System.Manager.Appearance.activeTheme.assetVariant).toBe("bw");
		expect(
			saved.System.Manager.Appearance.customThemes?.[0]?.assetVariant,
		).toBe("bw");

		const second = await boot(saved);
		expect(second.active().id).toBe(`custom-${PACKAGE}`);
		expect(second.active().assetVariant).toBe("bw");
		expect(second.assets.resolveClassicyAsset("systemArt", "appleMenu")).toBe(
			"/black.png",
		);
	});

	it("a theme with no variant saves and loads without one", async () => {
		const first = await boot();
		const defaults = first.registry.getClassicyAppearancePackage(PACKAGE)
			.defaults as ClassicyTheme;
		const custom: ClassicyTheme = {
			...strip(defaults),
			id: `custom-${PACKAGE}`,
			name: "Custom",
		};
		first.setAppearance((a) => {
			a.packageId = PACKAGE;
			a.customThemes = [custom];
			a.activeTheme = strip(custom);
		});
		const second = await boot(first.saved());
		expect(second.active()).not.toHaveProperty("assetVariant");
		expect(second.assets.resolveClassicyAsset("systemArt", "appleMenu")).toBe(
			"/rainbow.png",
		);
	});
});
