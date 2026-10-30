// H-R17: knob families are persisted only where they differ from the theme's
// package defaults, and healed at read time from whichever package is
// registered by then.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

const STORE = "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
const APPEARANCE =
	"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
const REGISTRY = "@/Appearance/ClassicyAppearancePackageRegistry";
const CORE = ["window", "control", "button", "groupBox", "layout"];

/** A fresh module graph: the store reads localStorage as it evaluates. */
const freshStore = async () => {
	vi.resetModules();
	const store = await import(STORE);
	store.stopAppManagerPersistence();
	return {
		store,
		appearance: await import(APPEARANCE),
		registry: await import(REGISTRY),
	};
};

/** The JSON the persistence subscriber writes for `state`. */
const persisted = (
	sanitize: (s: ClassicyStore) => ClassicyStore,
	state: ClassicyStore,
): string => JSON.stringify(sanitize(state));

const latePack = (base: ClassicyTheme): ClassicyAppearancePackage => ({
	id: "late-pack",
	name: "Late Pack",
	css: "",
	defaults: {
		...base,
		id: "late-pack",
		name: "Late Pack",
		package: "late-pack",
		measurements: {
			...base.measurements,
			controlStrip: { ...base.measurements.controlStrip, cellHeight: 30 },
		},
	},
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
});

afterEach(() => {
	localStorage.clear();
	vi.resetModules();
});

describe("sanitizeStateForPersistence — theme measurements (H-R17)", () => {
	it("persists a default-only theme without its knob families", async () => {
		const { store } = await freshStore();
		const out = store.sanitizeStateForPersistence(
			store.useAppManager.getState(),
		);
		const a = out.System.Manager.Appearance;
		expect(Object.keys(a.activeTheme.measurements)).toEqual(CORE);
		for (const theme of a.availableThemes ?? []) {
			expect(Object.keys(theme.measurements), theme.id).toEqual(CORE);
		}
		// The live state keeps its families; only the saved copy drops them.
		expect(
			store.useAppManager.getState().System.Manager.Appearance.activeTheme
				.measurements.controlStrip.cellHeight,
		).toBe(22);
	});

	it("persists an edited knob leaf and a package's extra key, and nothing else of the family", async () => {
		const { store } = await freshStore();
		const state = structuredClone(store.useAppManager.getState());
		const m = state.System.Manager.Appearance.activeTheme.measurements;
		m.controlStrip = { ...m.controlStrip, cellHeight: 30, tabWidth: 12 };
		const custom = structuredClone(state.System.Manager.Appearance.activeTheme);
		custom.id = "custom";
		custom.measurements.pager = { ...custom.measurements.pager, fontSize: 13 };
		state.System.Manager.Appearance.customThemes = [custom];
		const out =
			store.sanitizeStateForPersistence(state).System.Manager.Appearance;
		expect(out.activeTheme.measurements.controlStrip).toEqual({
			cellHeight: 30,
			tabWidth: 12,
		});
		expect(out.activeTheme.measurements.pager).toBeUndefined();
		expect(out.customThemes?.[0].measurements.pager).toEqual({ fontSize: 13 });
		expect(
			Object.keys(out.customThemes?.[0].measurements ?? {}).sort(),
		).toEqual([...CORE, "controlStrip", "pager"].sort());
		// The core five are always kept, default values included.
		expect(out.activeTheme.measurements.window.borderSize).toBe(1);
	});

	it("round trip: persist, reload, and getThemeVars is unchanged", async () => {
		const first = await freshStore();
		first.store.dispatch({
			type: "ClassicyDesktopChangeTheme",
			activeTheme: "azul",
		});
		const before =
			first.store.useAppManager.getState().System.Manager.Appearance;
		const varsBefore = first.appearance.getThemeVars(before.activeTheme);
		const themesBefore = (before.availableThemes ?? []).map(
			(t: ClassicyTheme) => first.appearance.getThemeVars(t),
		);
		localStorage.setItem(
			"classicyDesktopState",
			persisted(
				first.store.sanitizeStateForPersistence,
				first.store.useAppManager.getState(),
			),
		);
		const second = await freshStore();
		const after =
			second.store.useAppManager.getState().System.Manager.Appearance;
		expect(after.activeTheme.id).toBe("azul");
		expect(second.appearance.getThemeVars(after.activeTheme)).toEqual(
			varsBefore,
		);
		expect(
			(after.availableThemes ?? []).map((t: ClassicyTheme) =>
				second.appearance.getThemeVars(t),
			),
		).toEqual(themesBefore);
	});

	it("a host package registered after the store loads gets its own knob value", async () => {
		const first = await freshStore();
		const base = first.appearance.getTheme("default");
		first.registry.registerClassicyAppearancePackage(latePack(base));
		first.store.dispatch({
			type: "ClassicyDesktopChangeAppearancePackage",
			packageId: "late-pack",
		});
		const active =
			first.store.useAppManager.getState().System.Manager.Appearance
				.activeTheme;
		expect(active.package).toBe("late-pack");
		expect(
			first.appearance.getThemeVars(active)["--control-strip-cell-height"],
		).toBe("30px");
		localStorage.setItem(
			"classicyDesktopState",
			persisted(
				first.store.sanitizeStateForPersistence,
				first.store.useAppManager.getState(),
			),
		);
		// Reload: the store loads before the host registers its package again.
		const second = await freshStore();
		second.registry.registerClassicyAppearancePackage(
			latePack(second.appearance.getTheme("default")),
		);
		const reloaded =
			second.store.useAppManager.getState().System.Manager.Appearance
				.activeTheme;
		expect(reloaded.package).toBe("late-pack");
		expect(
			second.appearance.getThemeVars(reloaded)["--control-strip-cell-height"],
		).toBe("30px");
	}, 60_000);
});
