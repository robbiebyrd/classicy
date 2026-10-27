import { describe, expect, it } from "vitest";
import {
	getAllThemes,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_DEFAULT_THEME_METRICS,
	type ClassicyThemeWithPartialMetrics,
	withDefaultThemeMetrics,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";

/** A default theme carrying only the four pre-metrics window keys. */
const windowOnlyTheme = (): ClassicyThemeWithPartialMetrics => ({
	...getTheme("default"),
	measurements: {
		window: {
			borderSize: 1,
			controlSize: 12,
			paddingSize: 6,
			scrollbarSize: 17,
		},
	},
});

describe("CLASSICY_DEFAULT_THEME_METRICS", () => {
	it("defaults match the spec", () => {
		expect(CLASSICY_DEFAULT_THEME_METRICS).toEqual({
			window: {
				borderSize: 1,
				controlSize: 12,
				paddingSize: 6,
				scrollbarSize: 17,
				titleBarHeight: 19,
				utilityTitleBarHeight: 10,
			},
			control: { height: 20, labelGap: 5, staticTextHeight: 16 },
			button: { minWidth: 58, textPadding: 8, gap: 12 },
			groupBox: {
				marginSide: 10,
				marginTop: 12,
				marginBottom: 10,
				titlePad: 3,
				gap: 12,
			},
			layout: { itemGap: 4, groupGap: 16, dialogEdge: 12 },
		});
	});
});

describe("withDefaultThemeMetrics", () => {
	it("fills every missing group with the Platinum defaults", () => {
		const filled = withDefaultThemeMetrics(windowOnlyTheme());
		expect(filled.measurements).toEqual(CLASSICY_DEFAULT_THEME_METRICS);
	});

	it("keeps values that are present", () => {
		const theme = windowOnlyTheme();
		theme.measurements = { ...theme.measurements, control: { height: 30 } };
		const filled = withDefaultThemeMetrics(theme);
		expect(filled.measurements.control.height).toBe(30);
		expect(filled.measurements.control.labelGap).toBe(5);
		expect(filled.measurements.window.borderSize).toBe(1);
	});

	it("returns the same reference when complete", () => {
		const theme = getTheme("default");
		expect(withDefaultThemeMetrics(theme)).toBe(theme);
	});

	it("does not mutate a partial input", () => {
		const theme = windowOnlyTheme();
		const before = JSON.stringify(theme);
		withDefaultThemeMetrics(theme);
		expect(JSON.stringify(theme)).toBe(before);
	});

	it("is idempotent", () => {
		const once = withDefaultThemeMetrics(windowOnlyTheme());
		const twice = withDefaultThemeMetrics(once);
		expect(twice).toBe(once);
		expect(twice.measurements).toEqual(once.measurements);
	});

	it("every built-in theme is complete", () => {
		for (const theme of getAllThemes()) {
			expect(withDefaultThemeMetrics(theme)).toBe(theme);
		}
	});
});
