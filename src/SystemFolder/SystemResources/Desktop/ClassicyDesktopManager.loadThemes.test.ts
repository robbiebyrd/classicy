import { castDraft, produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Registers Platinum's sound pack, which the Platinum themes used here name
// (`sound.pack` must name a registered pack).
import "@classicy/appearance-platinum";
import { defaultStateWithPlatinumThemes } from "@/__tests__/platinumBuiltInThemes";
import "@classicy/appearance-platinum";
import { resolveClassicyWallpaper } from "@/Appearance/ClassicyWallpaperIndex";
import {
	type ClassicyTheme,
	getAllThemes,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { readClassicyLoadedThemes } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import { isUntrustedActionAllowed } from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust";
import {
	type ActionMessage,
	type ClassicyStore,
	classicyDesktopStateEventReducer,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// A deep, unaliased copy of the default state with every built-in theme.
const makeStore = (): ClassicyStore => defaultStateWithPlatinumThemes();

const appearance = (ds: ClassicyStore) => ds.System.Manager.Appearance;

/** Runs actions through the real Immer-backed kernel, as the store does. */
const run = (state: ClassicyStore, action: ActionMessage) =>
	produce(state, (draft) => {
		classicyDesktopStateEventReducer(castDraft(draft) as ClassicyStore, action);
	});

const load = (state: ClassicyStore, availableThemes: unknown[]) =>
	run(state, { type: "ClassicyDesktopLoadThemes", availableThemes });

const theme = (id: string): ClassicyTheme => structuredClone(getTheme(id));

// biome-ignore lint/suspicious/noExplicitAny: the fixtures write deliberately ill-typed values (a string color, a numeric package) into a theme
type LooseTheme = Record<string, any>;

/** A copy of `id` under a new id, edited by `edit`. */
const edited = (
	id: string,
	newId: string,
	edit: (t: LooseTheme) => void,
): Record<string, unknown> => {
	const t = { ...theme(id), id: newId } as LooseTheme;
	edit(t);
	return t;
};

const SINK_ID = "load-themes-test";
let warnings: ClassicyLogEntry[] = [];

beforeEach(() => {
	warnings = [];
	vi.spyOn(console, "warn").mockImplementation(() => {});
	registerClassicyLogSink({
		id: SINK_ID,
		onLog: (entry) => {
			if (entry.level === "warn") warnings.push(entry);
		},
	});
});

afterEach(() => {
	unregisterClassicyLogSink(SINK_ID);
	vi.restoreAllMocks();
});

describe("ClassicyDesktopLoadThemes validates each theme", () => {
	it("loads valid themes unchanged, without warnings", () => {
		const themes = [theme("azul"), theme("bondi")];
		const state = load(makeStore(), themes);
		expect(appearance(state).availableThemes).toEqual(themes);
		expect(warnings).toEqual([]);
	});

	it("loads every built-in theme unchanged", () => {
		const state = load(makeStore(), getAllThemes());
		expect(appearance(state).availableThemes).toEqual(getAllThemes());
		expect(warnings).toEqual([]);
	});

	it("applies the schema's defaults: a missing package becomes platinum", () => {
		const { package: _package, ...noPackage } = theme("bondi");
		const state = load(makeStore(), [noPackage]);
		expect(appearance(state).availableThemes?.[0]?.package).toBe("platinum");
	});

	it("completes a theme with no measurements at all", () => {
		const { measurements: _m, ...noMetrics } = theme("azul");
		const state = load(makeStore(), [noMetrics]);
		expect(appearance(state).availableThemes?.[0]?.measurements).toEqual(
			theme("azul").measurements,
		);
		expect(warnings).toEqual([]);
	});

	it("strips keys the schema does not declare", () => {
		const state = load(makeStore(), [{ ...theme("azul"), extra: "<script>" }]);
		const loaded = appearance(state).availableThemes?.[0] as Record<
			string,
			unknown
		>;
		expect(loaded.id).toBe("azul");
		expect(Object.hasOwn(loaded, "extra")).toBe(false);
	});

	it("keeps a registered wallpaper's filename, which renders this build's URL", () => {
		const t = edited("azul", "by-name", (x) => {
			x.desktop.backgroundImage = "azul_dark.png";
		});
		const state = load(makeStore(), [t]);
		const loaded = appearance(state).availableThemes?.[0];
		expect(loaded?.desktop.backgroundImage).toBe("azul_dark.png");
		expect(resolveClassicyWallpaper("azul_dark.png")).not.toBe("azul_dark.png");
		expect(loaded && getThemeVars(loaded)["--desktop-background-image"]).toBe(
			`url("${resolveClassicyWallpaper("azul_dark.png")}")`,
		);
	});

	it("keeps an http(s) background as it is", () => {
		const url = "https://example.com/tile.png";
		const t = edited("azul", "remote", (x) => {
			x.desktop.backgroundImage = url;
		});
		const state = load(makeStore(), [t]);
		expect(
			appearance(state).availableThemes?.[0]?.desktop.backgroundImage,
		).toBe(url);
	});

	it("never mutates the themes it is handed", () => {
		const t = edited("azul", "frozen", (x) => {
			delete x.package;
			x.desktop.backgroundImage = "azul_dark.png";
		});
		const snapshot = structuredClone(t);
		load(makeStore(), [t]);
		expect(t).toEqual(snapshot);
	});

	it.each<[string, unknown, string]>([
		[
			"a 0 px font size",
			edited("azul", "tiny", (x) => {
				x.typography.bodySize = 0;
			}),
			"typography.bodySize",
		],
		[
			"a font-size knob above 72",
			edited("azul", "huge", (x) => {
				x.measurements.pager = { ...x.measurements.pager, fontSize: 400 };
			}),
			"measurements.pager.fontSize",
		],
		[
			"a color out of range",
			edited("azul", "ultra", (x) => {
				x.color.black = 0x1000000;
			}),
			"color.black",
		],
		[
			"a color that is not a number",
			edited("azul", "named", (x) => {
				x.color.select = "red";
			}),
			"color.select",
		],
		[
			"a backgroundImage that breaks out of url()",
			edited("azul", "evil", (x) => {
				x.desktop.backgroundImage = 'x");}body{background:red';
			}),
			"desktop.backgroundImage",
		],
		[
			"a package that is not a string",
			edited("azul", "pkg", (x) => {
				x.package = 7;
			}),
			"package",
		],
	])("drops a theme with %s and names its id and the issue path", (_label, bad, path) => {
		const good = theme("bondi");
		const state = load(makeStore(), [good, bad]);
		expect(appearance(state).availableThemes).toEqual([good]);
		expect(warnings).toHaveLength(1);
		expect(warnings[0].subsystem).toBe("ClassicyDesktopManager");
		expect(warnings[0].message).toContain(`"${(bad as { id: string }).id}"`);
		expect(warnings[0].message).toContain(`${path}:`);
	});

	it.each<[string, unknown]>([
		["a string", "azul"],
		["null", null],
		["a number", 42],
		["an array", [theme("azul")]],
	])("drops %s entry with a warning naming its index", (_label, bad) => {
		const good = theme("bondi");
		const state = load(makeStore(), [good, bad]);
		expect(appearance(state).availableThemes).toEqual([good]);
		expect(warnings).toHaveLength(1);
		expect(warnings[0].message).toContain("entry 1: not a theme object");
	});

	it("keeps the theme list when every theme is invalid, and says so", () => {
		const before = load(makeStore(), [theme("azul"), theme("bondi")]);
		const state = load(before, [
			null,
			edited("azul", "evil", (x) => {
				x.desktop.backgroundImage = 'x");}body{background:red';
			}),
		]);
		expect(appearance(state).availableThemes).toBe(
			appearance(before).availableThemes,
		);
		expect(state).toBe(before);
		// One warning per dropped entry, then one for the refused action.
		expect(warnings).toHaveLength(3);
		expect(warnings[2].message).toContain("unchanged");
	});

	it("still empties the list when handed an empty one (nothing was refused)", () => {
		const state = load(makeStore(), []);
		expect(appearance(state).availableThemes).toEqual([]);
		expect(warnings).toEqual([]);
	});

	it("an invalid theme can never become the active theme", () => {
		const evil = edited("azul", "evil", (x) => {
			x.desktop.backgroundImage = 'x");}body{background:red';
		});
		let state = load(makeStore(), [theme("bondi"), evil]);
		const active = appearance(state).activeTheme;
		state = run(state, {
			type: "ClassicyDesktopChangeTheme",
			activeTheme: "evil",
		});
		expect(appearance(state).activeTheme).toBe(active);
		expect(appearance(state).activeTheme.desktop.backgroundImage).not.toContain(
			"body{",
		);
	});

	it("an invalid theme reusing a built-in's id does not shadow it", () => {
		const bad = edited("azul", "azul", (x) => {
			x.desktop.backgroundImage = 'x");}body{background:red';
		});
		let state = load(makeStore(), [bad]);
		state = run(state, {
			type: "ClassicyDesktopChangeTheme",
			activeTheme: "azul",
		});
		expect(appearance(state).activeTheme.desktop.backgroundImage).not.toContain(
			"body{",
		);
	});

	it("stays unreachable to untrusted dispatches", () => {
		expect(isUntrustedActionAllowed("ClassicyDesktopLoadThemes")).toBe(false);
	});
});

describe("readClassicyLoadedThemes", () => {
	it("returns the valid themes in order and one report per dropped entry", () => {
		const result = readClassicyLoadedThemes([
			theme("azul"),
			"nope",
			edited("bondi", "tiny", (x) => {
				x.typography.uiSize = 4;
				x.typography.bodySize = 0;
			}),
			theme("bondi"),
		]);
		expect(result.themes.map((t) => t.id)).toEqual(["azul", "bondi"]);
		expect(result.dropped).toEqual([
			{ index: 1, id: undefined, issue: "not a theme object" },
			{
				index: 2,
				id: "tiny",
				issue: "typography.uiSize: must be at least 8",
			},
		]);
	});
});
