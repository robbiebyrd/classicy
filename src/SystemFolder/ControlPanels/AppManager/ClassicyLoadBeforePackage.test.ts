// The store loads before any package registers (the library barrel
// evaluates it first), and Platinum gets no special case for that: a saved
// theme of a package that is not registered yet, Platinum's included, is
// kept whole (not stripped, healed or reset) until its package registers,
// and is refreshed then: a built-in by its current preset, a wallpaper by its
// filename. Each test boots a fresh module graph from saved state and
// registers Platinum afterward, as a host's entry (and the library build) does.
import { afterEach, describe, expect, it, vi } from "vitest";
import { AZUL_DARK_2_1_8 } from "@/Appearance/__tests__/platinumLegacyWallpaperFixture";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type { ClassicyLogEntry } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const STORE = "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
const APPEARANCE =
	"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
const REGISTRY = "@/Appearance/ClassicyAppearancePackageRegistry";
const SOUND_PACKS =
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
const LOG = "@/SystemFolder/SystemResources/Log/ClassicyLog";
const KEY = "classicyDesktopState";

type Appearance = ClassicyStore["System"]["Manager"]["Appearance"];

const strip = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/**
 * A fresh module graph whose store hydrates from `saved`, with nothing
 * registered: `registerPlatinum` imports Platinum afterward.
 */
const boot = async (saved?: unknown) => {
	vi.resetModules();
	localStorage.clear();
	if (saved !== undefined) localStorage.setItem(KEY, JSON.stringify(saved));
	vi.spyOn(console, "warn").mockImplementation(() => {});
	const entries: ClassicyLogEntry[] = [];
	const log = await import(LOG);
	log.registerClassicyLogSink({
		id: "load-before-package",
		onLog: (entry: ClassicyLogEntry) => entries.push(entry),
	});
	const store = await import(STORE);
	store.stopAppManagerPersistence();
	const registry = await import(REGISTRY);
	const state = (): ClassicyStore => store.useAppManager.getState();
	return {
		store,
		registry,
		appearance: await import(APPEARANCE),
		soundPacks: await import(SOUND_PACKS),
		state,
		active: (): ClassicyTheme => state().System.Manager.Appearance.activeTheme,
		/** The JSON object the persistence subscriber would write. */
		saved: (): ClassicyStore =>
			strip(store.sanitizeStateForPersistence(state())),
		warnings: () => entries.filter((e) => e.level === "warn"),
		registerPlatinum: () => import("@/Appearance/Platinum"),
	};
};

/**
 * Saved state as a mounted desktop with Platinum registered wrote it, then
 * edited by `edit`, plus Platinum's `azul` preset (whole, as registered) to
 * build themes from.
 */
const savedWith = async (
	edit: (appearance: Appearance, azul: ClassicyTheme) => void,
) => {
	const b = await boot();
	await b.registerPlatinum();
	const state = b.saved();
	edit(state.System.Manager.Appearance, strip(b.appearance.getTheme("azul")));
	return state;
};

/** A Platinum custom theme saved whole (as builds before H-R17 saved every
 * theme): every knob present, a wallpaper filename and one knob changed. */
const wholeCustom = (azul: ClassicyTheme): ClassicyTheme => {
	const theme = strip(azul);
	theme.id = "custom";
	theme.name = "Custom";
	theme.desktop.backgroundImage = "azul_dark.png";
	const measurements = theme.measurements as Record<
		string,
		Record<string, number>
	>;
	measurements.menuFrame.shadowWidth = 2;
	return theme;
};

/** A test package registered after Platinum, whose themes build on `base`. */
const latePack = (base: ClassicyTheme): ClassicyAppearancePackage => ({
	id: "late-pack",
	name: "Late Pack",
	css: "",
	defaults: { ...strip(base), id: "late-default", package: "late-pack" },
	presets: [],
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
});

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
	vi.resetModules();
});

describe("a saved Platinum built-in, loaded before Platinum registers", () => {
	// After registration, ClassicyBuiltInThemeReload pins the preset itself.
	it("stays a pending reference, with no fallback warning, until Platinum resolves it", async () => {
		const legacy = await savedWith((a) => {
			a.activeTheme = { id: "bondi", package: "platinum" } as ClassicyTheme;
		});
		const b = await boot(legacy);
		expect(b.registry.getClassicyAppearancePackage("platinum")).toBeUndefined();
		expect(b.active().id).toBe("bondi");
		expect(b.saved().System.Manager.Appearance.activeTheme).toEqual({
			id: "bondi",
			package: "platinum",
		});
		await b.registerPlatinum();
		expect(strip(b.active())).toEqual(strip(b.appearance.getTheme("bondi")));
		expect(b.warnings()).toEqual([]);
	});
});

describe("a saved Platinum custom theme, loaded before Platinum registers", () => {
	it("is saved whole before registration: no knob stripped, no wallpaper blanked", async () => {
		let custom!: ClassicyTheme;
		const legacy = await savedWith((a, azul) => {
			custom = wholeCustom(azul);
			a.customThemes = [custom];
			a.activeTheme = strip(custom);
		});
		const b = await boot(legacy);
		const out = b.saved().System.Manager.Appearance;
		expect(out.activeTheme).toEqual(custom);
		expect(out.customThemes).toEqual([custom]);
	});

	it("comes out unchanged after registration: the wallpaper renders and the override survives", async () => {
		let custom!: ClassicyTheme;
		const legacy = await savedWith((a, azul) => {
			custom = wholeCustom(azul);
			a.customThemes = [custom];
			a.activeTheme = strip(custom);
		});
		const b = await boot(legacy);
		await b.registerPlatinum();
		expect(strip(b.active())).toEqual(custom);
		const vars = b.appearance.getThemeVars(b.active());
		expect(vars["--desktop-background-image"]).toMatch(/^url\(".*azul_dark/);
		expect(vars["--menu-frame-shadow-width"]).toBe("2px");
		// Saved now against Platinum's own defaults: only the change is kept.
		const out = b.saved().System.Manager.Appearance;
		expect(out.activeTheme.measurements).toEqual({
			...Object.fromEntries(
				["window", "control", "button", "groupBox", "layout"].map((f) => [
					f,
					(custom.measurements as Record<string, unknown>)[f],
				]),
			),
			menuFrame: { shadowWidth: 2 },
		});
		expect(out.activeTheme.desktop.backgroundImage).toBe("azul_dark.png");
	});

	it("keeps a theme saved as Platinum registered (only its changes) as saved, before and after", async () => {
		// The load merges saved state over the default state; the default
		// theme's knobs must not fill the families the saved theme leaves to
		// its package.
		const sparse = await savedWith(() => {});
		{
			const b = await boot();
			await b.registerPlatinum();
			const custom = wholeCustom(strip(b.appearance.getTheme("azul")));
			b.store.useAppManager.setState((s: ClassicyStore) => ({
				...s,
				System: {
					...s.System,
					Manager: {
						...s.System.Manager,
						Appearance: {
							...s.System.Manager.Appearance,
							customThemes: [custom],
							activeTheme: custom,
						},
					},
				},
			}));
			sparse.System.Manager.Appearance = b.saved().System.Manager.Appearance;
		}
		const theme = sparse.System.Manager.Appearance.activeTheme;
		expect(theme.measurements).toHaveProperty("menuFrame", { shadowWidth: 2 });
		expect(theme.measurements).not.toHaveProperty("controlStrip");
		const b = await boot(sparse);
		expect(strip(b.active())).toEqual(theme);
		await b.registerPlatinum();
		expect(strip(b.active())).toEqual(theme);
	});
});

describe("a theme of a package that is not registered", () => {
	it("is saved whole, whichever packages are registered", async () => {
		let custom!: ClassicyTheme;
		const legacy = await savedWith((a, azul) => {
			custom = {
				...wholeCustom(azul),
				id: "custom-late-pack",
				package: "late-pack",
			};
			a.customThemes = [custom];
		});
		const b = await boot(legacy);
		expect(b.saved().System.Manager.Appearance.customThemes).toEqual([custom]);
		await b.registerPlatinum();
		expect(b.saved().System.Manager.Appearance.customThemes).toEqual([custom]);
	});
});

describe("wallpapers heal when their theme's package registers", () => {
	/** Saved state holding the 2.1.8 build's inlined Azul Dark on a Platinum
	 * custom theme (active too) and on a custom theme of `late-pack`. */
	const legacyWallpapers = () =>
		savedWith((a, azul) => {
			const custom = wholeCustom(azul);
			custom.desktop.backgroundImage = AZUL_DARK_2_1_8;
			a.customThemes = [
				custom,
				{ ...strip(custom), id: "custom-late-pack", package: "late-pack" },
			];
			a.activeTheme = strip(custom);
		});

	const backgrounds = (b: Awaited<ReturnType<typeof boot>>) => {
		const a = b.state().System.Manager.Appearance;
		return {
			active: a.activeTheme.desktop.backgroundImage,
			custom: (a.customThemes ?? []).map((t) => t.desktop.backgroundImage),
			available: (a.availableThemes ?? []).map(
				(t) => t.desktop.backgroundImage,
			),
		};
	};

	it("maps a data: URI saved before Platinum registered to its filename, in one store write", async () => {
		const b = await boot(await legacyWallpapers());
		// A host-loaded Platinum theme holding it too.
		b.store.useAppManager.setState((s: ClassicyStore) => {
			const host = {
				...strip(s.System.Manager.Appearance.activeTheme),
				id: "host",
				name: "Host",
			};
			return {
				...s,
				System: {
					...s.System,
					Manager: {
						...s.System.Manager,
						Appearance: {
							...s.System.Manager.Appearance,
							availableThemes: [host],
						},
					},
				},
			};
		});
		// Nothing is registered at load, so nothing matched.
		expect(backgrounds(b)).toEqual({
			active: AZUL_DARK_2_1_8,
			custom: [AZUL_DARK_2_1_8, AZUL_DARK_2_1_8],
			available: [AZUL_DARK_2_1_8],
		});
		let writes = 0;
		const unsubscribe = b.store.useAppManager.subscribe(() => {
			writes += 1;
		});
		await b.registerPlatinum();
		unsubscribe();
		expect(backgrounds(b)).toEqual({
			active: "azul_dark.png",
			// late-pack is not registered: its theme is not healed yet.
			custom: ["azul_dark.png", AZUL_DARK_2_1_8],
			available: ["azul_dark.png"],
		});
		expect(writes).toBe(1);
	});

	it("heals a package's themes when that package registers", async () => {
		const b = await boot(await legacyWallpapers());
		await b.registerPlatinum();
		b.registry.registerClassicyAppearancePackage(
			latePack(b.appearance.getTheme("default")),
		);
		expect(backgrounds(b).custom).toEqual(["azul_dark.png", "azul_dark.png"]);
	});

	it("writes nothing when a registration has nothing to heal", async () => {
		const b = await boot(await savedWith(() => {}));
		await b.registerPlatinum();
		let writes = 0;
		const unsubscribe = b.store.useAppManager.subscribe(() => {
			writes += 1;
		});
		b.registry.registerClassicyAppearancePackage(
			latePack(b.appearance.getTheme("default")),
		);
		unsubscribe();
		expect(writes).toBe(0);
	});
});

describe("Platinum imported twice, or re-registered by HMR", () => {
	it.each<[string, ClassicyTheme | ((azul: ClassicyTheme) => ClassicyTheme)]>([
		["a built-in", { id: "bondi", package: "platinum" } as ClassicyTheme],
		["a custom theme", wholeCustom],
	])(
		"leaves one package, one sound pack and the active theme unchanged: %s",
		async (_name, activeTheme) => {
			const legacy = await savedWith((a, azul) => {
				const theme =
					typeof activeTheme === "function" ? activeTheme(azul) : activeTheme;
				if (typeof activeTheme === "function") a.customThemes = [theme];
				a.activeTheme = theme;
			});
			const b = await boot(legacy);
			await b.registerPlatinum();
			const active = b.active();
			const ids = (list: readonly { id: string }[]) => list.map((p) => p.id);
			const packages = ids(b.registry.listClassicyAppearancePackages());
			const packs = ids(b.soundPacks.listClassicySoundPacks());
			const first = b.registry.getClassicyAppearancePackage("platinum");
			let writes = 0;
			const unsubscribe = b.store.useAppManager.subscribe(() => {
				writes += 1;
			});
			// A second copy of each module (another bundle, or HMR's new
			// instance) registers new objects under the same ids. The query
			// makes each a module of its own, evaluated again.
			for (const copy of [
				"@/Appearance/Platinum/assets/sounds/platinum.ts?copy",
				"@/Appearance/Platinum/assets/platinumAssets.ts?copy",
				"@/Appearance/Platinum/index.ts?copy",
			]) {
				await import(/* @vite-ignore */ copy);
			}
			const second = b.registry.getClassicyAppearancePackage("platinum");
			expect(second).not.toBe(first);
			// And the same object again, then a copy of it.
			b.registry.registerClassicyAppearancePackage(second);
			b.registry.registerClassicyAppearancePackage({ ...second });
			unsubscribe();
			expect(ids(b.registry.listClassicyAppearancePackages())).toEqual(
				packages,
			);
			expect(packages).toEqual(["platinum"]);
			expect(ids(b.soundPacks.listClassicySoundPacks())).toEqual(packs);
			expect(packs.filter((id) => id === "platinum")).toHaveLength(1);
			expect(b.active()).toBe(active);
			expect(writes).toBe(0);
			expect(b.warnings()).toEqual([]);
		},
		60_000,
	);
});
