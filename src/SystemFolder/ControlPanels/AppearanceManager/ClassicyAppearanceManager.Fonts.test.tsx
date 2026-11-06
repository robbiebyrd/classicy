import { act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	fireEvent,
	render,
	renderHook,
	screen,
	userEvent,
} from "@/__tests__/test-utils";
import "../../../../packages/appearance/platinum/src/assets/platinumAssets";
import { registerClassicyFonts } from "@/Appearance/ClassicyAssetRegistry";
import {
	type ClassicyThemeTypography,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { useFontsTab } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts";
import {
	CLASSICY_THEME_FONT_SIZE_MAX,
	CLASSICY_THEME_FONT_SIZE_MIN,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFontSizes";

const defaultTypography = getTheme("default").typography;

type HostProps = {
	typography?: ClassicyThemeTypography;
	changeFont?: (fontType: string, font: string) => void;
	changeFontSize?: (fontType: string, size: number) => void;
};

const Host = ({
	typography = defaultTypography,
	changeFont = vi.fn(),
	changeFontSize = vi.fn(),
}: HostProps) => {
	const tab = useFontsTab({ typography, changeFont, changeFontSize });
	return <div>{tab.children}</div>;
};

// Rows render in this order: System, Small System, Header, Monospaced, Digital.
const ROWS = ["ui", "body", "header", "mono", "digital"] as const;
const menu = (key: (typeof ROWS)[number]) =>
	screen.getAllByRole("combobox")[ROWS.indexOf(key)];

describe("useFontsTab", () => {
	it("is titled 'Fonts'", () => {
		const { result } = renderHook(() =>
			useFontsTab({
				typography: defaultTypography,
				changeFont: vi.fn(),
				changeFontSize: vi.fn(),
			}),
		);
		expect(result.current.title).toBe("Fonts");
	});

	it("shows the primary family of each of the default theme's stacks", () => {
		render(<Host />);
		expect(menu("ui")).toHaveTextContent("Charcoal");
		expect(menu("body")).toHaveTextContent("Geneva");
		expect(menu("header")).toHaveTextContent("AppleGaramond");
		expect(menu("mono")).toHaveTextContent("Monaco");
		expect(menu("digital")).toHaveTextContent("Digital");
	});

	it("follows the stored stack when it changes", () => {
		const { rerender } = render(<Host />);
		rerender(
			<Host
				typography={{
					...defaultTypography,
					ui: '"Geneva", "Charcoal", "ChicagoFLF", sans-serif',
				}}
			/>,
		);
		expect(menu("ui")).toHaveTextContent("Geneva");
	});

	it("shows 'Custom' for a family outside the list", () => {
		render(
			<Host
				typography={{ ...defaultTypography, header: '"Helvetica", serif' }}
			/>,
		);
		expect(menu("header")).toHaveTextContent("Custom");
	});

	it("calls changeFont('ui', 'Geneva') when Geneva is picked for the System Font", async () => {
		const changeFont = vi.fn();
		const user = userEvent.setup();
		render(<Host changeFont={changeFont} />);
		await user.click(menu("ui"));
		await user.click(screen.getByRole("option", { name: "Geneva" }));
		expect(changeFont).toHaveBeenCalledExactlyOnceWith("ui", "Geneva");
	});

	it.each([
		["body", "Charcoal", "Charcoal"],
		["header", "Monaco", "Monaco"],
		["mono", "ChicagoFLF", "ChicagoFLF"],
		["digital", "Geneva", "Geneva"],
		["mono", "Digital", "VCR OSD Mono"],
	] as const)("routes the %s menu's %s choice to changeFont", async (key, label, value) => {
		const changeFont = vi.fn();
		const user = userEvent.setup();
		render(<Host changeFont={changeFont} />);
		await user.click(menu(key));
		await user.click(screen.getByRole("option", { name: label }));
		expect(changeFont).toHaveBeenCalledExactlyOnceWith(key, value);
	});

	it("lists the registered font families in registration order with the Digital label", async () => {
		const user = userEvent.setup();
		render(<Host />);
		await user.click(menu("ui"));
		const options = screen.getAllByRole("option");
		expect(options.map((o) => o.textContent?.replace(/^✓/, ""))).toEqual([
			"Charcoal",
			"ChicagoFLF",
			"Geneva",
			"AppleGaramond",
			"Monaco",
			"Digital",
		]);
	});

	it("a family registered after mount appears", async () => {
		const changeFont = vi.fn();
		const user = userEvent.setup();
		render(<Host changeFont={changeFont} />);
		act(() =>
			registerClassicyFonts("platinum", [
				{ family: "Espy Sans", src: "espy.woff2" },
			]),
		);
		await user.click(menu("ui"));
		await user.click(screen.getByRole("option", { name: "Espy Sans" }));
		expect(changeFont).toHaveBeenCalledExactlyOnceWith("ui", "Espy Sans");
	});

	it("lists registered font families", async () => {
		// Registered before render; runs after the registration-order test,
		// since registrations outlive a test.
		registerClassicyFonts("platinum", [
			{ family: "TestFace", src: "data:font/woff2;base64,AA==" },
		]);
		const user = userEvent.setup();
		render(<Host />);
		for (const key of ROWS) {
			await user.click(menu(key));
			const option = screen.getByRole("option", { name: "TestFace" });
			expect(option).toBeInTheDocument();
			await user.keyboard("{Escape}");
		}
	});
});

// Story 0099-rlc: the size fields use the shared font-size bounds, and a typed
// size is reported clamped to them, as the field shows it.
describe("useFontsTab — font sizes", () => {
	const SIZE_KEYS = [
		"uiSize",
		"bodySize",
		"headerSize",
		"monoSize",
		"digitalSize",
	] as const;
	const sizeField = (key: (typeof SIZE_KEYS)[number]) =>
		document.getElementById(key) as HTMLInputElement;

	it.each(SIZE_KEYS)("reports a typed %s as typed when in range", (key) => {
		const changeFontSize = vi.fn();
		render(<Host changeFontSize={changeFontSize} />);
		fireEvent.change(sizeField(key), { target: { value: "18" } });
		expect(changeFontSize).toHaveBeenCalledExactlyOnceWith(key, 18);
	});

	it.each([
		["500", CLASSICY_THEME_FONT_SIZE_MAX],
		["73", CLASSICY_THEME_FONT_SIZE_MAX],
		["7", CLASSICY_THEME_FONT_SIZE_MIN],
		["-1", CLASSICY_THEME_FONT_SIZE_MIN],
	])("reports a typed %s clamped to %s", (typed, expected) => {
		const changeFontSize = vi.fn();
		render(<Host changeFontSize={changeFontSize} />);
		fireEvent.change(sizeField("uiSize"), { target: { value: typed } });
		expect(changeFontSize).toHaveBeenCalledExactlyOnceWith("uiSize", expected);
		expect(sizeField("uiSize").value).toBe(String(expected));
	});
});
