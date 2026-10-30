// The flash class comes from Platinum's MenuItem press hook.
import "@/Appearance/Platinum";
import { afterEach, describe, expect, it, vi } from "vitest";
import { dispatchAnimationEnd } from "@/__tests__/animationEnd";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@/__tests__/test-utils";

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

afterEach(() => {
	vi.useRealTimers();
});

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

	it("renders every divider when a menu holds more than one spacer, with no duplicate-key warning", () => {
		// Dividers all share id "spacer"; ClassicyMenu keys them by position, so
		// a menu may hold any number. Pin that so a one-divider limit can't
		// come back unnoticed.
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			const items = [
				{ id: "item-1", title: "New" },
				{ id: "spacer" },
				{ id: "item-2", title: "Open" },
				{ id: "spacer" },
				{ id: "item-3", title: "Quit" },
			];
			render(<ClassicyMenu name="test-menu" menuItems={items} />);
			expect(screen.getAllByRole("separator")).toHaveLength(2);
			const keyWarnings = errorSpy.mock.calls.filter((args) =>
				args.some(
					(arg) =>
						typeof arg === "string" &&
						arg.includes("Encountered two children with the same key"),
				),
			);
			expect(keyWarnings).toEqual([]);
		} finally {
			errorSpy.mockRestore();
		}
	});

	it("renders keyboard shortcut text when keyboardShortcut is provided", () => {
		const items = [
			{ id: "item-1", title: "Save", keyboardShortcut: "&#8984;S" },
		];
		const { container } = render(
			<ClassicyMenu name="test-menu" menuItems={items} />,
		);
		// he.decode converts &#8984; to the Command symbol (each modifier is its
		// own span inside the <kbd>, so match the element's whole text).
		expect(container.querySelector("kbd")).toHaveTextContent(/^\u2318S$/);
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
		const { container } = render(
			<ClassicyMenu name="test-menu" menuItems={items} />,
		);
		expect(container.querySelector("kbd")).toHaveTextContent(/^⇧⌘S$/);
	});

	it("renders the shortcut as a semantic <kbd> via ClassicyKbd", () => {
		const items = [
			{ id: "save-as", title: "Save As", keyboardShortcut: "Cmd+Shift+S" },
			{ id: "plain", title: "Plain" },
		];
		const { container } = render(
			<ClassicyMenu name="test-menu" menuItems={items} />,
		);
		const kbds = container.querySelectorAll("kbd");
		expect(kbds).toHaveLength(1);
		expect(kbds[0]).toHaveTextContent("⇧⌘S");
		// The menu's layout class stays on the element for CSS compatibility.
		expect(kbds[0]).toHaveClass("classicyMenuItemKeyboardShortcut");
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

	it("renders a checkmark for a checked item", () => {
		const items = [{ id: "tools", title: "Tools", checked: true }];
		const { container } = render(
			<ClassicyMenu name="test-menu" menuItems={items} />,
		);
		const check = container.querySelector(".classicyMenuItemCheck");
		expect(check).not.toBeNull();
		// The ✓ itself is package CSS on `.checked::before`.
		expect(check).toHaveClass("checked");
	});

	it("reserves the check gutter but shows no glyph for a checked:false item", () => {
		const items = [{ id: "info", title: "Info", checked: false }];
		const { container } = render(
			<ClassicyMenu name="test-menu" menuItems={items} />,
		);
		const check = container.querySelector(".classicyMenuItemCheck");
		expect(check).not.toBeNull();
		expect(check?.textContent).toBe("");
	});

	it("renders no check gutter for an item without a checked prop", () => {
		const items = [{ id: "plain", title: "Plain" }];
		const { container } = render(
			<ClassicyMenu name="test-menu" menuItems={items} />,
		);
		expect(container.querySelector(".classicyMenuItemCheck")).toBeNull();
	});

	it("never renders both an icon and a checkmark (checkmark wins)", () => {
		const items = [
			{ id: "tools", title: "Tools", checked: true, icon: "tool.png" },
		];
		const { container } = render(
			<ClassicyMenu name="test-menu" menuItems={items} />,
		);
		expect(container.querySelector(".classicyMenuItemCheck")).not.toBeNull();
		expect(container.querySelector("img")).toBeNull();
	});
});

describe("ClassicyMenu — titleWidthSamples (reserved title width)", () => {
	const sampleItem = {
		id: "switcher",
		title: "Finder",
		titleWidthSamples: ["Finder", "PictureViewer", "SimpleText"],
	};

	it("renders the other sample labels hidden so the title reserves their width", () => {
		const { container } = render(
			<ClassicyMenu name="test-menu" menuItems={[sampleItem]} />,
		);
		const samples = container.querySelectorAll(".classicyMenuItemTitleSample");
		expect([...samples].map((s) => s.textContent)).toEqual([
			"PictureViewer",
			"SimpleText",
		]);
		for (const sample of samples) {
			expect(sample).toHaveAttribute("aria-hidden", "true");
		}
	});

	it("keeps the current title as the only visible, readable label", () => {
		render(<ClassicyMenu name="test-menu" menuItems={[sampleItem]} />);
		// Would fail if the current title were also emitted as a hidden sample:
		// getByText throws on multiple matches.
		const visible = screen.getByText("Finder");
		expect(visible).not.toHaveAttribute("aria-hidden");
	});

	it("renders a plain title when no samples are given", () => {
		const { container } = render(
			<ClassicyMenu
				name="test-menu"
				menuItems={[{ id: "f", title: "File" }]}
			/>,
		);
		expect(container.querySelector(".classicyMenuItemTitleSizer")).toBeNull();
		expect(screen.getByText("File")).toBeInTheDocument();
	});

	// A leaf item's action runs when its flash finishes. In the real app that is
	// the flash `animationend`; jsdom never animates, so without the fallback
	// timer the action would never run and nothing driven through a menu — Save,
	// Open, New — could be exercised in a unit test. Pin that it fires anyway.
	it("runs a leaf item's action on click even when animationend never fires", async () => {
		const onClickFunc = vi.fn();
		render(
			<ClassicyMenu
				name="test-menu"
				menuItems={[{ id: "save", title: "Save", onClickFunc }]}
			/>,
		);
		fireEvent.click(screen.getByText("Save"));
		await waitFor(() => expect(onClickFunc).toHaveBeenCalledTimes(1), {
			timeout: 2000,
		});
	});

	// The fallback timer and `animationend` both call finishFlash; whichever
	// fires first must win exactly once. The real event (dispatchAnimationEnd;
	// `fireEvent.animationEnd` never reaches React under jsdom) runs the event
	// path first, and the fallback's moment then passes.
	it("runs a leaf item's action exactly once when animationend also fires", () => {
		vi.useFakeTimers();
		const onClickFunc = vi.fn();
		render(
			<ClassicyMenu
				name="test-menu"
				menuItems={[{ id: "save", title: "Save", onClickFunc }]}
			/>,
		);
		const item = screen.getByRole("menuitem");
		fireEvent.click(item);
		expect(item).toHaveClass("classicyMenuItemFlash");
		dispatchAnimationEnd(item);
		// The event, not the 400 ms fallback, ended the flash.
		expect(item).not.toHaveClass("classicyMenuItemFlash");
		act(() => {
			vi.advanceTimersByTime(20);
		});
		expect(onClickFunc).toHaveBeenCalledTimes(1);
		// Let the fallback's moment pass: it must not fire a second time.
		act(() => {
			vi.advanceTimersByTime(600);
		});
		expect(onClickFunc).toHaveBeenCalledTimes(1);
	});
});
