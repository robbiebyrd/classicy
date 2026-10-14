import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, renderHook, screen } from "@/__tests__/test-utils";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	appearanceColorPickerId,
	useColorsTab,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Colors";
import {
	CLASSICY_THEME_COLOR_TARGETS,
	type ClassicyThemeColorChange,
	getThemeColor,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeColorTargets";

// Stand-in picker: exposes the props the tab binds, and "picks" 0xabcdef on
// click. The real picker (and its dialog window) is covered by its own tests.
vi.mock(
	"@/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker",
	() => ({
		ClassicyColorPicker: ({
			id,
			appId,
			value,
			labelTitle,
			onChangeFunc,
		}: {
			id: string;
			appId?: string;
			value?: number;
			labelTitle?: string;
			onChangeFunc?: (color: number) => void;
		}) => (
			<button
				type="button"
				data-testid="colors-tab-picker"
				id={id}
				data-app-id={appId}
				data-value={value}
				onClick={() => onChangeFunc?.(0xabcdef)}
			>
				{labelTitle}
			</button>
		),
	}),
);

const theme: ClassicyTheme = getTheme("azul");

const Host = ({
	changeColor = vi.fn(),
	editingCustomTheme = false,
	activeTheme = theme,
}: {
	changeColor?: (change: ClassicyThemeColorChange) => void;
	editingCustomTheme?: boolean;
	activeTheme?: ClassicyTheme;
}) => {
	const tab = useColorsTab({
		theme: activeTheme,
		editingCustomTheme,
		changeColor,
		appId: "AppearanceManager.app",
	});
	return <div>{tab.children}</div>;
};

describe("useColorsTab", () => {
	it("is titled 'Colors'", () => {
		const { result } = renderHook(() =>
			useColorsTab({
				theme,
				editingCustomTheme: false,
				changeColor: vi.fn(),
				appId: "AppearanceManager.app",
			}),
		);
		expect(result.current.title).toBe("Colors");
	});

	it("renders all 28 pickers bound to the active theme's values", () => {
		render(<Host />);
		const pickers = screen.getAllByTestId("colors-tab-picker");
		expect(pickers).toHaveLength(28);
		for (const info of CLASSICY_THEME_COLOR_TARGETS) {
			const picker = document.getElementById(
				appearanceColorPickerId(info.target),
			);
			expect(picker, info.cssVar).not.toBeNull();
			expect(picker?.dataset.value).toBe(
				String(getThemeColor(theme, info.target)),
			);
			expect(picker?.dataset.appId).toBe("AppearanceManager.app");
		}
	});

	it("gives every picker a unique id", () => {
		render(<Host />);
		const ids = screen.getAllByTestId("colors-tab-picker").map((p) => p.id);
		expect(new Set(ids).size).toBe(28);
	});

	it("groups the swatches under the six group titles", () => {
		render(<Host />);
		for (const title of [
			"Base",
			"System Palette",
			"Theme Palette",
			"Window",
			"Selection",
			"Desktop",
		]) {
			expect(screen.getByText(title)).toBeInTheDocument();
		}
	});

	it.each(
		CLASSICY_THEME_COLOR_TARGETS.map((info) => [info.cssVar, info] as const),
	)("dispatches the %s payload", (_cssVar, info) => {
		const changeColor = vi.fn();
		render(<Host changeColor={changeColor} />);
		const picker = document.getElementById(
			appearanceColorPickerId(info.target),
		) as HTMLElement;
		fireEvent.click(picker);
		expect(changeColor).toHaveBeenCalledTimes(1);
		expect(changeColor).toHaveBeenCalledWith({
			...info.target,
			color: 0xabcdef,
		});
	});

	it("dispatches palette indices as 0-based tuple positions", () => {
		const changeColor = vi.fn();
		render(<Host changeColor={changeColor} />);
		fireEvent.click(
			document.getElementById("appearance_color_theme_7") as HTMLElement,
		);
		expect(changeColor).toHaveBeenCalledWith({
			colorKey: "theme",
			index: 6,
			color: 0xabcdef,
		});
	});

	it("explains that editing a built-in creates a Custom theme", () => {
		render(<Host />);
		expect(
			screen.getByText(/creates a Custom theme from “Azul”/),
		).toBeInTheDocument();
	});

	it("names the custom theme being edited", () => {
		render(
			<Host
				editingCustomTheme
				activeTheme={{ ...theme, id: "custom", name: "Custom" }}
			/>,
		);
		expect(screen.getByText(/Editing the “Custom” theme/)).toBeInTheDocument();
	});

	it("re-renders swatches when the active theme's colour changes", () => {
		const { rerender } = render(<Host />);
		const edited = structuredClone(theme);
		edited.color.system[2] = 0x010203;
		rerender(<Host activeTheme={edited} />);
		expect(
			document.getElementById("appearance_color_system_3")?.dataset.value,
		).toBe(String(0x010203));
	});
});
