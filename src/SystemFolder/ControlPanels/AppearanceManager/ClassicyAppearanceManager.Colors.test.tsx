import { describe, expect, it, vi } from "vitest";
// getTheme serves the registered packages' themes: Platinum's.
import "@classicy/appearance-platinum";
import { fireEvent, render, renderHook, screen } from "@/__tests__/test-utils";
import type { ClassicyAppearanceColorFamilies } from "@/Appearance/ClassicyAppearancePackage";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	appearanceColorPickerId,
	useColorsTab,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Colors";
import type { ClassicyThemeColorFamilyChange } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeColorFamilies";
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
	colorFamilies,
}: {
	changeColor?: (
		change: ClassicyThemeColorChange | ClassicyThemeColorFamilyChange,
	) => void;
	editingCustomTheme?: boolean;
	activeTheme?: ClassicyTheme;
	colorFamilies?: ClassicyAppearanceColorFamilies;
}) => {
	const tab = useColorsTab({
		theme: activeTheme,
		editingCustomTheme,
		changeColor,
		appId: "AppearanceManager.app",
		colorFamilies,
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

	it("re-renders swatches when the active theme's color changes", () => {
		const { rerender } = render(<Host />);
		const edited = structuredClone(theme);
		edited.color.system[2] = 0x010203;
		rerender(<Host activeTheme={edited} />);
		expect(
			document.getElementById("appearance_color_system_3")?.dataset.value,
		).toBe(String(0x010203));
	});
});

// Package color families (plan 0018-dbd, Batch F-b): the active package's
// declared colors, after the core groups, one group per family.
describe("useColorsTab: package color families", () => {
	const colorFamilies: ClassicyAppearanceColorFamilies = {
		ink: {
			label: "Package Ink",
			colors: { triangle: { label: "Triangle" }, face: { label: "Face" } },
		},
	};
	const withFamilies = (): ClassicyTheme => {
		const t = structuredClone(theme);
		t.color.families = { ink: { triangle: 0x9999ff, face: 0xcccccc } };
		return t;
	};

	it("adds one labeled group per declared family, after the 28 core colors", () => {
		render(<Host activeTheme={withFamilies()} colorFamilies={colorFamilies} />);
		const pickers = screen.getAllByTestId("colors-tab-picker");
		expect(pickers).toHaveLength(30);
		expect(screen.getByText("Package Ink")).toBeInTheDocument();
		expect(pickers.slice(28).map((p) => p.textContent)).toEqual([
			"Triangle",
			"Face",
		]);
		expect(
			document.getElementById("appearance_color_family_ink_triangle")?.dataset
				.value,
		).toBe(String(0x9999ff));
		expect(new Set(pickers.map((p) => p.id)).size).toBe(30);
	});

	it("dispatches the family form", () => {
		const changeColor = vi.fn();
		render(
			<Host
				activeTheme={withFamilies()}
				colorFamilies={colorFamilies}
				changeColor={changeColor}
			/>,
		);
		fireEvent.click(
			document.getElementById(
				"appearance_color_family_ink_face",
			) as HTMLElement,
		);
		expect(changeColor).toHaveBeenCalledWith({
			family: "ink",
			key: "face",
			color: 0xabcdef,
		});
	});

	it("lists only the 28 core colors for a package that declares none", () => {
		render(<Host activeTheme={withFamilies()} />);
		expect(screen.getAllByTestId("colors-tab-picker")).toHaveLength(28);
	});
});
