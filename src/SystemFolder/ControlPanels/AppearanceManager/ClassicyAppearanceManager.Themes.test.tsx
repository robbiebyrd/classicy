import { describe, expect, it, vi } from "vitest";
import { render, renderHook, screen, userEvent } from "@/__tests__/test-utils";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { useThemesTab } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Themes";
import { listClassicyThemes } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";

const baseProps = {
	themesList: [{ value: "default", label: "Platinum" }],
	switchTheme: vi.fn(),
	activeThemeId: "default",
	smartScrolling: true,
	toggleSmartScrolling: vi.fn(),
};

const Host = (props: Partial<typeof baseProps>) => {
	const tab = useThemesTab({ ...baseProps, ...props });
	return <div>{tab.children}</div>;
};

describe("useThemesTab — Smart Scrolling", () => {
	it("is titled 'Themes'", () => {
		const { result } = renderHook(() => useThemesTab(baseProps));
		expect(result.current.title).toBe("Themes");
	});

	it("renders the Smart Scrolling checkbox checked when on", () => {
		render(<Host smartScrolling={true} />);
		expect(screen.getByRole("checkbox")).toBeChecked();
	});

	it("renders the Smart Scrolling checkbox unchecked when off", () => {
		render(<Host smartScrolling={false} />);
		expect(screen.getByRole("checkbox")).not.toBeChecked();
	});

	it("fires toggleSmartScrolling(false) when unchecked", async () => {
		const toggleSmartScrolling = vi.fn();
		const user = userEvent.setup();
		render(
			<Host
				smartScrolling={true}
				toggleSmartScrolling={toggleSmartScrolling}
			/>,
		);
		await user.click(screen.getByRole("checkbox"));
		expect(toggleSmartScrolling).toHaveBeenCalledWith(false);
	});

	it("fires toggleSmartScrolling(true) when checked", async () => {
		const toggleSmartScrolling = vi.fn();
		const user = userEvent.setup();
		render(
			<Host
				smartScrolling={false}
				toggleSmartScrolling={toggleSmartScrolling}
			/>,
		);
		await user.click(screen.getByRole("checkbox"));
		expect(toggleSmartScrolling).toHaveBeenCalledWith(true);
	});
});

describe("useThemesTab — custom themes", () => {
	it("shows Custom as the selected theme when it is active", () => {
		render(
			<Host
				themesList={[
					{ value: "default", label: "Platinum" },
					{ value: "custom", label: "Custom" },
				]}
				activeThemeId="custom"
			/>,
		);
		expect(
			screen.getByRole("combobox", { name: "Selected Theme" }),
		).toHaveTextContent("Custom");
	});
});

describe("listClassicyThemes", () => {
	const theme = (id: string) => ({ id, name: id }) as unknown as ClassicyTheme;

	it("lists built-ins first, then custom themes", () => {
		expect(
			listClassicyThemes({
				availableThemes: [theme("default"), theme("azul")],
				customThemes: [theme("custom")],
			}).map((t) => t.id),
		).toEqual(["default", "azul", "custom"]);
	});

	it("tolerates state without customThemes", () => {
		expect(
			listClassicyThemes({ availableThemes: [theme("default")] }).map(
				(t) => t.id,
			),
		).toEqual(["default"]);
	});
});
