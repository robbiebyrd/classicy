import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, renderHook, screen } from "@/__tests__/test-utils";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	appearanceMetricSpinnerId,
	useMetricsTab,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics";
import {
	CLASSICY_THEME_METRIC_GROUPS,
	CLASSICY_THEME_METRIC_TARGETS,
	type ClassicyThemeMetricChange,
	getThemeMetric,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets";

const theme: ClassicyTheme = getTheme("azul");

const Host = ({
	changeMetric = vi.fn(),
	editingCustomTheme = false,
	activeTheme = theme,
}: {
	changeMetric?: (change: ClassicyThemeMetricChange) => void;
	editingCustomTheme?: boolean;
	activeTheme?: ClassicyTheme;
}) => {
	const tab = useMetricsTab({
		theme: activeTheme,
		editingCustomTheme,
		changeMetric,
	});
	return <div>{tab.children}</div>;
};

const spinner = (id: string) => document.getElementById(id) as HTMLInputElement;

describe("useMetricsTab", () => {
	it("is titled Metrics", () => {
		const { result } = renderHook(() =>
			useMetricsTab({
				theme,
				editingCustomTheme: false,
				changeMetric: vi.fn(),
			}),
		);
		expect(result.current.title).toBe("Metrics");
	});

	it("renders one spinner per metric target inside its group", () => {
		render(<Host />);
		expect(
			document.querySelectorAll('input[id^="appearance_metric_"]'),
		).toHaveLength(20);
		for (const info of CLASSICY_THEME_METRIC_TARGETS) {
			const input = document.getElementById(
				appearanceMetricSpinnerId(info.target),
			);
			expect(input).toHaveValue(getThemeMetric(theme, info.target));
			// The group box it sits in is titled with its own group's label.
			const groupLabel = CLASSICY_THEME_METRIC_GROUPS.find(
				(group) => group.id === info.group,
			)?.label;
			expect(
				input?.closest("fieldset")?.querySelector(":scope > legend"),
				info.target.metricKey,
			).toHaveTextContent(groupLabel ?? "");
		}
		expect(screen.getByText("Group Boxes")).toBeInTheDocument();
		for (const group of CLASSICY_THEME_METRIC_GROUPS) {
			expect(screen.getByText(group.label)).toBeInTheDocument();
		}
	});

	it("passes min and max from the target table", () => {
		// J-R14: ClassicySpinner writes no min/max attributes; it clamps to
		// minValue…maxValue, so the bounds show as the clamped value — and the
		// tab dispatches that same bound, never a value the reducer would refuse.
		const changeMetric = vi.fn();
		render(<Host changeMetric={changeMetric} />);
		const s = spinner("appearance_metric_windowControlSize");
		fireEvent.change(s, { target: { value: "0" } });
		expect(s).toHaveValue(1);
		expect(changeMetric).toHaveBeenLastCalledWith({
			metricKey: "windowControlSize",
			value: 1,
		});
		fireEvent.change(s, { target: { value: "9999" } });
		expect(s).toHaveValue(512);
		expect(changeMetric).toHaveBeenLastCalledWith({
			metricKey: "windowControlSize",
			value: 512,
		});
	});

	it("dispatches changeMetric with metricKey and the number", () => {
		const changeMetric = vi.fn();
		render(<Host changeMetric={changeMetric} />);
		fireEvent.change(spinner("appearance_metric_buttonGap"), {
			target: { value: "20" },
		});
		expect(changeMetric).toHaveBeenCalledWith({
			metricKey: "buttonGap",
			value: 20,
		});
	});

	it("ignores a non-numeric entry", () => {
		const changeMetric = vi.fn();
		render(<Host changeMetric={changeMetric} />);
		const s = spinner("appearance_metric_windowControlSize");
		fireEvent.change(s, { target: { value: "" } });
		expect(changeMetric).not.toHaveBeenCalled();
		// Known trade-off: ClassicySpinner shows an empty entry as its minimum
		// while the store keeps the old value, until the next edit or a theme
		// change re-syncs the field.
		expect(s).toHaveValue(1);
	});

	it("rounds a fractional entry to whole pixels before clamping", () => {
		const changeMetric = vi.fn();
		render(<Host changeMetric={changeMetric} />);
		fireEvent.change(spinner("appearance_metric_buttonGap"), {
			target: { value: "12.5" },
		});
		expect(changeMetric).toHaveBeenLastCalledWith({
			metricKey: "buttonGap",
			value: 13,
		});
		fireEvent.change(spinner("appearance_metric_windowControlSize"), {
			target: { value: "0.4" },
		});
		expect(changeMetric).toHaveBeenLastCalledWith({
			metricKey: "windowControlSize",
			value: 1,
		});
		fireEvent.change(spinner("appearance_metric_buttonGap"), {
			target: { value: "511.6" },
		});
		expect(changeMetric).toHaveBeenLastCalledWith({
			metricKey: "buttonGap",
			value: 512,
		});
	});

	it("shows the fork notice for a built-in and the editing notice for Custom", () => {
		const { unmount } = render(<Host />);
		expect(
			screen.getByText("Changing a metric creates a Custom theme from “Azul”."),
		).toBeInTheDocument();
		unmount();
		render(
			<Host
				editingCustomTheme
				activeTheme={{ ...theme, id: "custom", name: "Custom" }}
			/>,
		);
		expect(screen.getByText("Editing the “Custom” theme.")).toBeInTheDocument();
	});

	it("follows the active theme's metrics on re-render", () => {
		const { rerender } = render(<Host />);
		const edited = structuredClone(theme);
		edited.measurements.button.gap = 17;
		rerender(<Host activeTheme={edited} />);
		expect(spinner("appearance_metric_buttonGap")).toHaveValue(17);
	});
});
