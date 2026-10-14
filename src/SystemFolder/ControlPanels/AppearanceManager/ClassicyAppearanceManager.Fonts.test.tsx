import { describe, expect, it, vi } from "vitest";
import { render, renderHook, screen, userEvent } from "@/__tests__/test-utils";
import {
	type ClassicyThemeTypography,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { useFontsTab } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts";

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
});
