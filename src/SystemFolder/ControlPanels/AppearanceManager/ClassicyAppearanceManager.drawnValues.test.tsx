// The Options and Metrics tabs under a theme of another package (story
// 0235-xgi): each field shows the value the active package draws the theme
// with, its own edits included, as getThemeVars emits it.
import "@classicy/appearance-platinum";
import "@classicy/appearance-system7";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	type ClassicyTheme,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	appearanceMetricSpinnerId,
	useMetricsTab,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics";
import {
	appearanceOptionInputId,
	useOptionsTab,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Options";

const platinum = getClassicyAppearancePackage(
	"platinum",
) as ClassicyAppearancePackage;
const system7Theme = getClassicyAppearancePackage("system7")
	?.defaults as ClassicyTheme;

const Options = ({
	pkg,
	theme,
}: {
	pkg: ClassicyAppearancePackage;
	theme: ClassicyTheme;
}) => (
	<div>
		{
			useOptionsTab({
				pkg,
				theme,
				editingCustomTheme: true,
				changeMetric: vi.fn(),
			}).children
		}
	</div>
);

const Metrics = ({
	packageId,
	theme,
}: {
	packageId: string;
	theme: ClassicyTheme;
}) => (
	<div>
		{
			useMetricsTab({
				theme,
				packageId,
				editingCustomTheme: true,
				changeMetric: vi.fn(),
			}).children
		}
	</div>
);

const field = (id: string) => document.getElementById(id) as HTMLInputElement;
const option = (family: string, key: string) =>
	field(appearanceOptionInputId({ family, key }));
const metric = (
	metricKey: Parameters<typeof appearanceMetricSpinnerId>[0]["metricKey"],
) => field(appearanceMetricSpinnerId({ metricKey }));

describe("a theme of another package in the Appearance Manager", () => {
	it("shows Platinum's knob values for a System 7 theme under Platinum, its edits kept", () => {
		const theme = structuredClone(system7Theme);
		theme.measurements.controlStrip.cellHeight = 30;
		const vars = getThemeVars(theme, "platinum") as Record<string, string>;
		render(<Options pkg={platinum} theme={theme} />);
		// System 7 declares 2; Platinum draws 1, and the field says so.
		expect(vars["--menu-frame-shadow-start"]).toBe("1px");
		expect(option("menuFrame", "shadowStart")).toHaveValue(1);
		// The theme's own edit.
		expect(option("controlStrip", "cellHeight")).toHaveValue(30);
	});

	it("shows the drawing package's core metrics, the theme's edits kept", () => {
		const theme = structuredClone(getTheme("default"));
		theme.measurements.window.controlSize = 14;
		render(<Metrics packageId="system7" theme={theme} />);
		// Platinum's 17 and 10 are its defaults, so System 7's draw.
		expect(metric("windowScrollbarSize")).toHaveValue(16);
		expect(metric("windowUtilityTitleBarHeight")).toHaveValue(13);
		expect(metric("windowControlSize")).toHaveValue(14);
	});

	it("shows the theme's own values under its own package", () => {
		render(<Metrics packageId="platinum" theme={getTheme("default")} />);
		expect(metric("windowScrollbarSize")).toHaveValue(17);
		expect(metric("windowUtilityTitleBarHeight")).toHaveValue(10);
	});
});
