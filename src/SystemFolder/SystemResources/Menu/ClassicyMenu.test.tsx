import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManagerDispatch: () => vi.fn(),
	}),
);
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => vi.fn(),
	}),
);
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

vi.mock("@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss", () => ({}));

import { ClassicyMenu } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const basicItems = [
	{ id: "item-1", title: "File" },
	{ id: "item-2", title: "Edit" },
];

describe("ClassicyMenu", () => {
	it("renders menu items with their titles", () => {
		render(<ClassicyMenu name="test-menu" menuItems={basicItems} />);
		expect(screen.getByText("File")).toBeInTheDocument();
		expect(screen.getByText("Edit")).toBeInTheDocument();
	});

	it("renders nothing when menuItems is an empty array", () => {
		const { container } = render(
			<ClassicyMenu name="test-menu" menuItems={[]} />,
		);
		// Should render an empty fragment — no ul, no li
		expect(container.querySelector("ul")).not.toBeInTheDocument();
		expect(container.querySelector("li")).not.toBeInTheDocument();
	});

	it("renders a spacer as a ClassicySeparator for items with id='spacer'", () => {
		const items = [
			{ id: "item-1", title: "New" },
			{ id: "spacer" },
			{ id: "item-2", title: "Open" },
		];
		render(<ClassicyMenu name="test-menu" menuItems={items} />);
		const separator = screen.getByRole("separator");
		expect(separator).toBeInTheDocument();
		// The divider is the standalone ClassicySeparator (horizontal engraving),
		// not a raw <hr>.
		expect(separator).toHaveClass("classicySeparator");
		expect(separator).toHaveClass("classicySeparatorHorizontal");
	});

	it("renders keyboard shortcut text when keyboardShortcut is provided", () => {
		const items = [
			{ id: "item-1", title: "Save", keyboardShortcut: "&#8984;S" },
		];
		render(<ClassicyMenu name="test-menu" menuItems={items} />);
		// he.decode converts &#8984; to the Command symbol
		expect(screen.getByText("\u2318S")).toBeInTheDocument();
	});

	it("flips a nested submenu to the left when it would overflow the viewport", () => {
		const items = [
			{
				id: "view",
				title: "View",
				menuChildren: [
					{
						id: "sort",
						title: "Sort By",
						menuChildren: [{ id: "name", title: "Name" }],
					},
				],
			},
		];
		const rectSpy = vi
			.spyOn(Element.prototype, "getBoundingClientRect")
			.mockReturnValue({
				right: window.innerWidth + 50,
				left: window.innerWidth - 100,
				top: 0,
				bottom: 0,
				width: 150,
				height: 0,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			} as DOMRect);

		const { container } = render(
			<ClassicyMenu
				name="test-menu"
				menuItems={items}
				navClass="classicyDesktopMenu"
				subNavClass="classicySubMenu"
			/>,
		);
		fireEvent.click(screen.getByText("View"));
		fireEvent.click(screen.getByText("Sort By"));

		const nestedSubMenu = container.querySelector(
			"ul.classicySubMenu ul.classicySubMenu",
		);
		expect(nestedSubMenu).toHaveClass("classicySubMenuFlipLeft");
		rectSpy.mockRestore();
	});

	it("does not flip a nested submenu that fits in the viewport", () => {
		const items = [
			{
				id: "view",
				title: "View",
				menuChildren: [
					{
						id: "sort",
						title: "Sort By",
						menuChildren: [{ id: "name", title: "Name" }],
					},
				],
			},
		];
		const { container } = render(
			<ClassicyMenu
				name="test-menu"
				menuItems={items}
				navClass="classicyDesktopMenu"
				subNavClass="classicySubMenu"
			/>,
		);
		fireEvent.click(screen.getByText("View"));
		fireEvent.click(screen.getByText("Sort By"));

		const nestedSubMenu = container.querySelector(
			"ul.classicySubMenu ul.classicySubMenu",
		);
		expect(nestedSubMenu).not.toHaveClass("classicySubMenuFlipLeft");
	});

	it("renders keyboard shortcut modifiers as glyphs (Cmd+Shift+S -> ⇧⌘S)", () => {
		const items = [
			{ id: "save-as", title: "Save As", keyboardShortcut: "Cmd+Shift+S" },
		];
		render(<ClassicyMenu name="test-menu" menuItems={items} />);
		expect(screen.getByText("⇧⌘S")).toBeInTheDocument();
	});

	it("fires a menu item's action on its command-key press (closes-and-executes)", () => {
		const onClickFunc = vi.fn();
		const items = [
			{ id: "find", title: "Find", keyboardShortcut: "⌘F", onClickFunc },
		];
		render(<ClassicyMenu name="test-menu" menuItems={items} />);
		fireEvent.keyDown(document, { key: "f", metaKey: true });
		expect(onClickFunc).toHaveBeenCalledOnce();
	});

	it("fires a menu item's action on a Control (⌃) shortcut", () => {
		const onClickFunc = vi.fn();
		const items = [
			{ id: "dim", title: "Dim", keyboardShortcut: "⌃D", onClickFunc },
		];
		render(<ClassicyMenu name="test-menu" menuItems={items} />);
		fireEvent.keyDown(document, { key: "d", ctrlKey: true });
		expect(onClickFunc).toHaveBeenCalledOnce();
	});

	it("fires a menu item's action on an Option (⌥) shortcut, matching the physical key", () => {
		const onClickFunc = vi.fn();
		const items = [
			{ id: "expand", title: "Expand", keyboardShortcut: "⌥X", onClickFunc },
		];
		render(<ClassicyMenu name="test-menu" menuItems={items} />);
		// macOS remaps Option+X's `key`; the dispatcher matches on `code`.
		fireEvent.keyDown(document, { key: "≈", code: "KeyX", altKey: true });
		expect(onClickFunc).toHaveBeenCalledOnce();
	});

	it("does not fire an Option shortcut while typing in a text field", () => {
		const onClickFunc = vi.fn();
		const items = [
			{ id: "expand", title: "Expand", keyboardShortcut: "⌥X", onClickFunc },
		];
		render(
			<>
				<input data-testid="field" />
				<ClassicyMenu name="test-menu" menuItems={items} />
			</>,
		);
		const field = screen.getByTestId("field");
		field.focus();
		fireEvent.keyDown(field, { key: "≈", code: "KeyX", altKey: true });
		expect(onClickFunc).not.toHaveBeenCalled();
	});

	it("renders a nested submenu for items with menuChildren", () => {
		const items = [
			{
				id: "item-1",
				title: "View",
				menuChildren: [
					{ id: "child-1", title: "Zoom In" },
					{ id: "child-2", title: "Zoom Out" },
				],
			},
		];
		render(<ClassicyMenu name="test-menu" menuItems={items} />);
		expect(screen.getByText("View")).toBeInTheDocument();
		expect(screen.getByText("Zoom In")).toBeInTheDocument();
		expect(screen.getByText("Zoom Out")).toBeInTheDocument();
	});
});
