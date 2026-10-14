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
	doubleClickTitleToCollapse: true,
	toggleDoubleClickTitleToCollapse: vi.fn(),
};

const Host = (props: Partial<typeof baseProps>) => {
	const tab = useThemesTab({ ...baseProps, ...props });
	return <div>{tab.children}</div>;
};

const smartScrollingBox = () =>
	screen.getByRole("checkbox", { name: /Smart Scrolling/ });
const doubleClickBox = () =>
	screen.getByRole("checkbox", {
		name: "Double-click title bar to collapse windows",
	});

describe("useThemesTab — Smart Scrolling", () => {
	it("is titled 'Themes'", () => {
		const { result } = renderHook(() => useThemesTab(baseProps));
		expect(result.current.title).toBe("Themes");
	});

	it("renders the Smart Scrolling checkbox checked when on", () => {
		render(<Host smartScrolling={true} />);
		expect(smartScrollingBox()).toBeChecked();
	});

	it("renders the Smart Scrolling checkbox unchecked when off", () => {
		render(<Host smartScrolling={false} />);
		expect(smartScrollingBox()).not.toBeChecked();
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
		await user.click(smartScrollingBox());
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
		await user.click(smartScrollingBox());
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

// #280: Smart Scrolling's neighbour on the Mac OS 8 Appearance Options tab.
describe("useThemesTab — Double-click title bar to collapse", () => {
	it("renders the checkbox checked when on", () => {
		render(<Host doubleClickTitleToCollapse={true} />);
		expect(doubleClickBox()).toBeChecked();
	});

	it("renders the checkbox unchecked when off", () => {
		render(<Host doubleClickTitleToCollapse={false} />);
		expect(doubleClickBox()).not.toBeChecked();
	});

	it("sits directly after the Smart Scrolling checkbox", () => {
		render(<Host />);
		const boxes = screen.getAllByRole("checkbox");
		expect(boxes.indexOf(doubleClickBox())).toBe(
			boxes.indexOf(smartScrollingBox()) + 1,
		);
	});

	it("fires toggleDoubleClickTitleToCollapse(false) when unchecked", async () => {
		const toggleDoubleClickTitleToCollapse = vi.fn();
		const toggleSmartScrolling = vi.fn();
		const user = userEvent.setup();
		render(
			<Host
				doubleClickTitleToCollapse={true}
				toggleDoubleClickTitleToCollapse={toggleDoubleClickTitleToCollapse}
				toggleSmartScrolling={toggleSmartScrolling}
			/>,
		);
		await user.click(doubleClickBox());
		expect(toggleDoubleClickTitleToCollapse).toHaveBeenCalledWith(false);
		expect(toggleSmartScrolling).not.toHaveBeenCalled();
	});

	it("fires toggleDoubleClickTitleToCollapse(true) when checked", async () => {
		const toggleDoubleClickTitleToCollapse = vi.fn();
		const user = userEvent.setup();
		render(
			<Host
				doubleClickTitleToCollapse={false}
				toggleDoubleClickTitleToCollapse={toggleDoubleClickTitleToCollapse}
			/>,
		);
		await user.click(doubleClickBox());
		expect(toggleDoubleClickTitleToCollapse).toHaveBeenCalledWith(true);
	});
});
