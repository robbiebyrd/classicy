// jsdom's getComputedStyle reports inline custom properties set with
// `style.setProperty`, so these tests mount a real #classicyDesktop element
// and set the variables on it; no getComputedStyle stub is needed.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	classicyDefaultThemeVarPx,
	readClassicyThemeVar,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";

// Pass-through spy, so the "computed once" test can count default-theme
// computations without changing what getThemeVars returns.
vi.mock(
	"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance")
			>();
		return { ...actual, getThemeVars: vi.fn(actual.getThemeVars) };
	},
);

const mountDesktop = (vars: Record<string, string> = {}): HTMLElement => {
	const desktop = document.createElement("div");
	desktop.id = "classicyDesktop";
	for (const [name, value] of Object.entries(vars)) {
		desktop.style.setProperty(name, value);
	}
	document.body.append(desktop);
	return desktop;
};

afterEach(() => {
	document.getElementById("classicyDesktop")?.remove();
	vi.restoreAllMocks();
});

describe("readClassicyThemeVar", () => {
	it("reads the variable from #classicyDesktop", () => {
		const d = document.createElement("div");
		d.id = "classicyDesktop";
		d.style.setProperty("--menu-bar-height", "42px");
		document.body.append(d);
		expect(readClassicyThemeVar("--menu-bar-height")).toBe(42);
	});

	it("falls back to the default theme value when the desktop is absent", () =>
		expect(readClassicyThemeVar("--menu-bar-height")).toBe(30));

	it("falls back when the computed value is empty or NaN", () => {
		mountDesktop();
		expect(readClassicyThemeVar("--menu-bar-height")).toBe(30);
		expect(readClassicyThemeVar("--menu-bar-height", 7)).toBe(7);
	});

	it("falls back when the computed value is not a number", () => {
		mountDesktop({ "--menu-bar-height": "tall" });
		expect(readClassicyThemeVar("--menu-bar-height")).toBe(30);
	});

	it("falls back when the computed value is zero or negative", () => {
		const desktop = mountDesktop({ "--menu-bar-height": "0px" });
		expect(readClassicyThemeVar("--menu-bar-height")).toBe(30);
		desktop.style.setProperty("--menu-bar-height", "-4px");
		expect(readClassicyThemeVar("--menu-bar-height")).toBe(30);
	});

	it("reads from an explicit element before the desktop", () => {
		mountDesktop({ "--window-zoom-margin": "10px" });
		const el = document.createElement("div");
		el.style.setProperty("--window-zoom-margin", "3px");
		document.body.append(el);
		expect(readClassicyThemeVar("--window-zoom-margin", undefined, el)).toBe(3);
		el.remove();
	});

	it("returns the fallback when there is no document", () => {
		vi.stubGlobal("document", undefined);
		try {
			expect(readClassicyThemeVar("--menu-bar-height")).toBe(30);
			expect(readClassicyThemeVar("--menu-bar-height", 9)).toBe(9);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it("computes the default theme vars once across many reads", async () => {
		vi.resetModules();
		const appearance = await import(
			"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance"
		);
		const reader = await import(
			"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader"
		);
		const getThemeVars = vi.mocked(appearance.getThemeVars);
		getThemeVars.mockClear();
		for (let i = 0; i < 50; i++) {
			reader.readClassicyThemeVar("--menu-bar-height");
			reader.readClassicyThemeVar("--window-zoom-margin");
			reader.classicyDefaultThemeVarPx("--window-resize-inset");
		}
		expect(getThemeVars).toHaveBeenCalledTimes(1);
	});
});

describe("classicyDefaultThemeVarPx", () => {
	it("returns the default theme's emitted value in px", () => {
		expect(classicyDefaultThemeVarPx("--menu-bar-height")).toBe(30);
		expect(classicyDefaultThemeVarPx("--window-zoom-margin")).toBe(8);
		expect(classicyDefaultThemeVarPx("--window-resize-inset")).toBe(5);
		expect(classicyDefaultThemeVarPx("--window-collapsed-height")).toBe(15);
		expect(classicyDefaultThemeVarPx("--window-control-size")).toBe(12);
	});

	it("classicyDefaultThemeVarPx throws for an unknown name", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => classicyDefaultThemeVarPx("--nope")).toThrow(/not emitted/);
		expect(error).toHaveBeenCalledWith(
			expect.stringMatching(/^\[Theme\] .*--nope.*not emitted/),
		);
	});

	it("throws for an emitted variable that is not a number", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => classicyDefaultThemeVarPx("--ui-font")).toThrow(
			/not a number/,
		);
		expect(error).toHaveBeenCalledOnce();
	});
});
