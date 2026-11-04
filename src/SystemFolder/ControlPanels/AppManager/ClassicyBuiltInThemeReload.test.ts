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
	const store = await import(STORE);
	store.stopAppManagerPersistence();
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
 * every built-in stored whole, edited by `edit`.
 */
const legacySaved = async (
	edit: (appearance: ClassicyStore["System"]["Manager"]["Appearance"]) => void,
) => {
	const b = await boot();
	const state = JSON.parse(JSON.stringify(b.state())) as ClassicyStore;
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
		expect(a.availableThemes?.map(strip)).toEqual(
			b.appearance.getAllThemes().map(strip),
		);
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

	it("keeps a whole built-in active theme that differs from its preset (edits made before custom themes)", async () => {
		const legacy = await legacySaved((a) => {
			const azul = strip(
				(a.availableThemes as ClassicyTheme[]).find((t) => t.id === "azul")!,
			);
			azul.desktop.backgroundImage = "https://example.com/mine.png";
			a.activeTheme = azul;
		});
		const b = await boot(legacy);
		const active = b.state().System.Manager.Appearance.activeTheme;
		expect(active.id).toBe("azul");
		expect(active.desktop.backgroundImage).toBe("https://example.com/mine.png");
		// Saved whole again, so the edit survives every later load too.
		expect(
			saved(b).System.Manager.Appearance.activeTheme.desktop.backgroundImage,
		).toBe("https://example.com/mine.png");
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

	it("saves an unchanged whole built-in as a reference once the package registers", async () => {
		const first = await boot();
		const night = pack(first.appearance.getTheme("default"), [{ id: "night" }]);
		const legacy = await savedOnLatePack(strip(night.presets![0]));
		const b = await boot(legacy);
		// Unregistered: its built-ins cannot be told apart yet, so it stays whole.
		expect(saved(b).System.Manager.Appearance.activeTheme.color).toBeDefined();
		b.registry.registerClassicyAppearancePackage(night);
		expect(saved(b).System.Manager.Appearance.activeTheme).toEqual({
			id: "night",
			package: "late-pack",
		});
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
