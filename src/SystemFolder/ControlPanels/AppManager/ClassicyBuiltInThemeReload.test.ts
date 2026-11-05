// Built-in themes come from the code on every load: persisted state keeps
// only custom themes and the user's choice (the active theme's id and
// package). A preset fixed, added or removed by a later release reaches
// existing users, and state saved before this rule (built-ins stored whole)
// still loads.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type { ClassicyLogEntry } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const STORE = "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
const APPEARANCE =
	"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
const REGISTRY = "@/Appearance/ClassicyAppearancePackageRegistry";
const LOG = "@/SystemFolder/SystemResources/Log/ClassicyLog";
const KEY = "classicyDesktopState";

/**
 * A fresh module graph whose store hydrates from `saved` (when given), with a
 * log sink registered before the store evaluates.
 */
const boot = async (saved?: unknown) => {
	vi.resetModules();
	localStorage.clear();
	if (saved !== undefined) localStorage.setItem(KEY, JSON.stringify(saved));
	vi.spyOn(console, "warn").mockImplementation(() => {});
	const entries: ClassicyLogEntry[] = [];
	const log = await import(LOG);
	log.registerClassicyLogSink({
		id: "built-in-theme-reload",
		onLog: (entry: ClassicyLogEntry) => entries.push(entry),
	});
	// The fresh graph's sound registry is empty; the Platinum themes the
	// packages below build on name Platinum's pack.
	await import("@/Appearance/Platinum/assets/sounds/platinum");
	const store = await import(STORE);
	store.stopAppManagerPersistence();
	// Platinum registers after the store, as the library barrel loads them:
	// its built-ins come from its registration, not from the store's load.
	await import("@/Appearance/Platinum");
	return {
		store,
		appearance: await import(APPEARANCE),
		registry: await import(REGISTRY),
		warnings: () => entries.filter((e) => e.level === "warn"),
		state: (): ClassicyStore => store.useAppManager.getState(),
	};
};

type Booted = Awaited<ReturnType<typeof boot>>;

/** The JSON object the persistence subscriber would write. */
const saved = (b: Booted) =>
	JSON.parse(JSON.stringify(b.store.sanitizeStateForPersistence(b.state())));

/**
 * State as a build before this change persisted it: the default state with
 * every built-in stored whole (the list a mounted desktop had loaded), edited
 * by `edit`.
 */
const legacySaved = async (
	edit: (appearance: ClassicyStore["System"]["Manager"]["Appearance"]) => void,
) => {
	const b = await boot();
	const state = JSON.parse(JSON.stringify(b.state())) as ClassicyStore;
	state.System.Manager.Appearance.availableThemes = JSON.parse(
		JSON.stringify(b.appearance.getAllThemes()),
	);
	edit(state.System.Manager.Appearance);
	return state;
};

const strip = (t: ClassicyTheme) => JSON.parse(JSON.stringify(t));

const pack = (
	base: ClassicyTheme,
	presets: Array<Partial<ClassicyTheme> & { id: string }>,
	black = 0x101010,
): ClassicyAppearancePackage => ({
	id: "late-pack",
	name: "Late Pack",
	css: "",
	defaults: {
		...base,
		id: "late-default",
		name: "Late Default",
		package: "late-pack",
		color: { ...base.color, black },
	},
	presets: presets.map((p) => ({
		...base,
		name: p.id,
		...p,
		package: "late-pack",
	})),
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

describe("built-in themes are not persisted", () => {
	it("persists no availableThemes and a built-in active theme as its id and package", async () => {
		const b = await boot();
		b.store.dispatch({
			type: "ClassicyDesktopLoadThemes",
			availableThemes: b.appearance.getAllThemes(),
		});
		b.store.dispatch({
			type: "ClassicyDesktopChangeTheme",
			activeTheme: "azul",
		});
		const out = saved(b).System.Manager.Appearance;
		expect("availableThemes" in out).toBe(false);
		expect(out.activeTheme).toEqual({ id: "azul", package: "platinum" });
		// The live state is untouched.
		expect(b.state().System.Manager.Appearance.availableThemes).toHaveLength(
			b.appearance.getAllThemes().length,
		);
	});

	it("persists a custom active theme whole", async () => {
		const b = await boot();
		b.store.dispatch({
			type: "ClassicyDesktopChangeTheme",
			activeTheme: "azul",
		});
		b.store.dispatch({
			type: "ClassicyDesktopChangeColor",
			colorKey: "black",
			color: 0x123456,
		});
		const out = saved(b).System.Manager.Appearance;
		expect(out.activeTheme.id).toBe("custom");
		expect(out.activeTheme.color.black).toBe(0x123456);
		expect(out.customThemes).toHaveLength(1);
	});
});

describe("hydrate takes built-ins from the code", () => {
	it("replaces stale persisted built-ins with the current presets", async () => {
		const legacy = await legacySaved((a) => {
			const list = a.availableThemes as ClassicyTheme[];
			list[1].color.black = 0xabcdef; // a changed preset
			list.push({ ...strip(list[2]), id: "retired", name: "Retired" });
			list.splice(list.length - 2, 1); // a preset added since
		});
		const b = await boot(legacy);
		const a = b.state().System.Manager.Appearance;
		// None comes back: the default state's list applies, which is empty
		// until a desktop mounts and loads getAllThemes().
		expect(a.availableThemes).toEqual([]);
	});

	it("leaves custom themes alone", async () => {
		const legacy = await legacySaved((a) => {
			const custom = {
				...strip(a.activeTheme),
				id: "custom",
				name: "Custom",
			};
			custom.color.black = 0x123456;
			a.customThemes = [custom];
			a.activeTheme = strip(custom);
		});
		const b = await boot(legacy);
		const a = b.state().System.Manager.Appearance;
		expect(a.customThemes).toEqual(
			legacy.System.Manager.Appearance.customThemes,
		);
		expect(a.activeTheme).toEqual(legacy.System.Manager.Appearance.activeTheme);
	});

	it("replaces a stale whole built-in active theme by its preset, edits made before custom themes included", async () => {
		const legacy = await legacySaved((a) => {
			const azul = strip(
				(a.availableThemes as ClassicyTheme[]).find((t) => t.id === "azul")!,
			);
			azul.color.black = 0xabcdef; // a preset fixed since
			azul.desktop.backgroundImage = "https://example.com/mine.png"; // a v0.82 edit
			a.activeTheme = azul;
		});
		const b = await boot(legacy);
		const active = b.state().System.Manager.Appearance.activeTheme;
		expect(strip(active)).toEqual(strip(b.appearance.getTheme("azul")));
		expect(saved(b).System.Manager.Appearance.activeTheme).toEqual({
			id: "azul",
			package: "platinum",
		});
	});

	it("leaves a custom active theme carrying the same edits alone", async () => {
		const legacy = await legacySaved((a) => {
			const custom = {
				...strip(
					(a.availableThemes as ClassicyTheme[]).find((t) => t.id === "azul")!,
				),
				id: "custom",
				name: "Custom",
			};
			custom.color.black = 0xabcdef;
			custom.desktop.backgroundImage = "https://example.com/mine.png";
			a.customThemes = [custom];
			a.activeTheme = strip(custom);
		});
		const b = await boot(legacy);
		const active = b.state().System.Manager.Appearance.activeTheme;
		expect(active.color.black).toBe(0xabcdef);
		expect(active.desktop.backgroundImage).toBe("https://example.com/mine.png");
		expect(saved(b).System.Manager.Appearance.activeTheme.id).toBe("custom");
	});

	it("saves a whole built-in active theme equal to its preset as a reference", async () => {
		const legacy = await legacySaved((a) => {
			a.activeTheme = strip(
				(a.availableThemes as ClassicyTheme[]).find((t) => t.id === "azul")!,
			);
		});
		const b = await boot(legacy);
		expect(saved(b).System.Manager.Appearance.activeTheme).toEqual({
			id: "azul",
			package: "platinum",
		});
	});

	it("resolves a persisted reference to the current preset", async () => {
		const legacy = await legacySaved((a) => {
			delete a.availableThemes;
			a.activeTheme = { id: "bondi", package: "platinum" } as ClassicyTheme;
		});
		const b = await boot(legacy);
		const active = b.state().System.Manager.Appearance.activeTheme;
		expect(strip(active)).toEqual(strip(b.appearance.getTheme("bondi")));
		expect(b.warnings()).toEqual([]);
	});

	it("falls back to the package's defaults, once, when the referenced preset is gone", async () => {
		const legacy = await legacySaved((a) => {
			delete a.availableThemes;
			a.activeTheme = { id: "retired", package: "platinum" } as ClassicyTheme;
		});
		const b = await boot(legacy);
		const active = b.state().System.Manager.Appearance.activeTheme;
		expect(strip(active)).toEqual(strip(b.appearance.getTheme("default")));
		expect(b.warnings()).toHaveLength(1);
		expect(b.warnings()[0].message).toContain('"retired"');
	});

	it("keeps a whole active theme that is no built-in (a host-loaded theme)", async () => {
		const legacy = await legacySaved((a) => {
			const host = { ...strip(a.activeTheme), id: "hostTheme", name: "Host" };
			host.color.black = 0x0f0f0f;
			a.activeTheme = host;
		});
		const b = await boot(legacy);
		const active = b.state().System.Manager.Appearance.activeTheme;
		expect(active.id).toBe("hostTheme");
		expect(active.color.black).toBe(0x0f0f0f);
		expect(b.warnings()).toEqual([]);
	});

	it("is idempotent: save and reload twice gives the same state and bytes", async () => {
		for (const activeTheme of [
			{ id: "azul", package: "platinum" },
			{ id: "retired", package: "platinum" },
		]) {
			const legacy = await legacySaved((a) => {
				delete a.availableThemes;
				a.activeTheme = activeTheme as ClassicyTheme;
			});
			const first = await boot(legacy);
			const once = saved(first);
			const second = await boot(once);
			const twice = saved(second);
			expect(twice).toEqual(once);
			expect(second.state().System.Manager.Appearance).toEqual(
				first.state().System.Manager.Appearance,
			);
			expect(second.warnings()).toEqual([]);
		}
	});

	it("never rewrites the store at boot when nothing is stale", async () => {
		const b = await boot();
		const before = b.state();
		await import("@/Appearance/Platinum");
		expect(b.state()).toBe(before);
	});
});

describe("a reference to a package registered later", () => {
	const savedOnLatePack = async (
		activeTheme: Partial<ClassicyTheme> & { id: string },
	) =>
		legacySaved((a) => {
			delete a.availableThemes;
			a.packageId = "late-pack";
			a.activeTheme = activeTheme as ClassicyTheme;
		});

	it("resolves a reference to the package's preset once the package registers", async () => {
		const legacy = await savedOnLatePack({ id: "night", package: "late-pack" });
		const b = await boot(legacy);
		// Before registration the reference survives a save.
		expect(saved(b).System.Manager.Appearance.activeTheme).toEqual({
			id: "night",
			package: "late-pack",
		});
		const base = b.appearance.getTheme("default");
		b.registry.registerClassicyAppearancePackage(
			pack(base, [{ id: "night", color: { ...base.color, black: 0x222222 } }]),
		);
		const active = b.state().System.Manager.Appearance.activeTheme;
		expect(active.id).toBe("night");
		expect(active.package).toBe("late-pack");
		expect(active.color.black).toBe(0x222222);
		expect(b.warnings()).toEqual([]);
		expect(saved(b).System.Manager.Appearance.activeTheme).toEqual({
			id: "night",
			package: "late-pack",
		});
	});

	it("replaces a stale whole built-in by its preset once the package registers", async () => {
		const first = await boot();
		const base = first.appearance.getTheme("default");
		const night = pack(base, [
			{ id: "night", color: { ...base.color, black: 0x222222 } },
		]);
		const stale = strip(night.presets![0]);
		stale.color.black = 0xabcdef;
		const legacy = await savedOnLatePack(stale);
		const b = await boot(legacy);
		// Unregistered: its built-ins cannot be read yet, so it stays whole.
		expect(b.state().System.Manager.Appearance.activeTheme.color.black).toBe(
			0xabcdef,
		);
		expect(saved(b).System.Manager.Appearance.activeTheme.color).toBeDefined();
		b.registry.registerClassicyAppearancePackage(night);
		expect(b.state().System.Manager.Appearance.activeTheme.color.black).toBe(
			0x222222,
		);
		expect(saved(b).System.Manager.Appearance.activeTheme).toEqual({
			id: "night",
			package: "late-pack",
		});
		expect(b.warnings()).toEqual([]);
	});

	it("falls back to the package's defaults when the referenced preset is gone", async () => {
		const legacy = await savedOnLatePack({
			id: "retired",
			package: "late-pack",
		});
		const b = await boot(legacy);
		const base = b.appearance.getTheme("default");
		b.registry.registerClassicyAppearancePackage(
			pack(base, [{ id: "night" }], 0x303030),
		);
		const active = b.state().System.Manager.Appearance.activeTheme;
		expect(active.id).toBe("late-default");
		expect(active.color.black).toBe(0x303030);
		expect(b.warnings()).toHaveLength(1);
		// A second registration (any package) finds nothing left to do.
		b.registry.registerClassicyAppearancePackage({
			...pack(base, [{ id: "night" }], 0x303030),
			id: "other-pack",
			defaults: { ...base, id: "other", package: "other-pack" },
			presets: [],
		});
		expect(b.warnings()).toHaveLength(1);
	});

	it("never touches a custom theme of the package", async () => {
		const first = await boot();
		const base = first.appearance.getTheme("default");
		const custom = {
			...strip(base),
			id: "custom-late-pack",
			name: "Custom",
			package: "late-pack",
		};
		custom.color.black = 0x456789;
		const legacy = await legacySaved((a) => {
			a.packageId = "late-pack";
			a.customThemes = [custom];
			a.activeTheme = strip(custom);
		});
		const b = await boot(legacy);
		b.registry.registerClassicyAppearancePackage(
			pack(base, [{ id: "custom-late-pack" }]),
		);
		const active = b.state().System.Manager.Appearance.activeTheme;
		expect(active.color.black).toBe(0x456789);
	});
});
