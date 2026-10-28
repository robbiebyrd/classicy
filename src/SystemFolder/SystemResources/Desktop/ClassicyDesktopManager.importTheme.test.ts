import { castDraft, produce } from "immer";
import { describe, expect, it, vi } from "vitest";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
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
