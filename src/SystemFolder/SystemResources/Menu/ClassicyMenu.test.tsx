// The flash class comes from Platinum's MenuItem press hook.
import "@classicy/appearance-platinum";
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

import { losePointerStream } from "@/__tests__/losePointerStream";
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import {
	ClassicyMenu,
	type ClassicyMenuItem,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyMenuProvider } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

// The store is mocked, so nothing connects the active package id; stand in
// for the store's connection. Platinum (registered above) is the default
// layout, which declares no menu keys; `windows-menus` carries the Windows
// 98 package's own layout (`menu.submenuDelayMs` 400, `menu.disabledItems`
// "browse", `menuBar.idleTimeoutMs` 0).
const activePackage = { id: "platinum" };
connectClassicyAssetPackageSource({
	getId: () => activePackage.id,
	subscribe: () => () => {},
});
registerClassicyAppearancePackage({
	id: "windows-menus",
	name: "Windows menus",
	css: "",
	defaults: {
		...CLASSICY_CORE_DEFAULT_THEME,
		id: "windows-menus-default",
		package: "windows-menus",
	},
	layout: windows98.layout as never,
});

const basicItems = [
	{ id: "item-1", title: "File" },
	{ id: "item-2", title: "Edit" },
];

afterEach(() => {
	vi.useRealTimers();
	activePackage.id = "platinum";
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

	// Story 0214-c61: the Application menu checks the front application
	// beside its small icon (HIG7 p.127, 7.5.5's `*-755-appmenu-open.png`).
	it("renders the checkmark, then the icon, for an item with both", () => {
		const items = [
			{ id: "tools", title: "Tools", checked: true, icon: "tool.png" },
		];
		const { container } = render(
			<ClassicyMenu name="test-menu" menuItems={items} />,
		);
		const p = container.querySelector("#tools > p") as HTMLElement;
		expect(
			[...p.children].map((child) =>
				child.tagName === "IMG" ? "img" : child.className,
			),
		).toEqual(["classicyMenuItemCheck checked", "img"]);
	});

	// A package sizes an item drawn with an image (System 7's 18 px rows)
	// on a class, not `:has(> p > img)`, which Firefox 113-120 lacks: it is
	// set exactly when the item's title holds an image, from `icon` or
	// `image`.
	it("marks an item drawn with an image classicyMenuItemHasImage", () => {
		const items = [
			{ id: "with-icon", title: "Icon", icon: "tool.png" },
			{ id: "with-image", image: "apple.png", imageAlt: "Apple" },
			{ id: "plain", title: "Plain" },
		];
		const { container } = render(
			<ClassicyMenu name="test-menu" menuItems={items} />,
		);
		for (const id of ["with-icon", "with-image", "plain"]) {
			const item = container.querySelector(`#${id}`) as HTMLElement;
			expect(item.classList.contains("classicyMenuItemHasImage"), id).toBe(
				item.querySelector(":scope > p > img") !== null,
			);
		}
		expect(
			container.querySelectorAll(".classicyMenuItemHasImage"),
		).toHaveLength(2);
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

// A menu bar (a root menu under a provider without `startActive`): File
// (New, Open, a divider, a dimmed Close, Export with a submenu, Quit), Edit
// and View, before a button that had focus.
const barSpies = () => ({
	new: vi.fn(),
	open: vi.fn(),
	pdf: vi.fn(),
	quit: vi.fn(),
	undo: vi.fn(),
});
const barItems = (spies: ReturnType<typeof barSpies>): ClassicyMenuItem[] => [
	{
		id: "file",
		title: "File",
		menuChildren: [
			{ id: "new", title: "New", onClickFunc: spies.new },
			{ id: "open", title: "Open", onClickFunc: spies.open },
			{ id: "spacer" },
			{ id: "close", title: "Close", disabled: true },
			{
				id: "export",
				title: "Export",
				menuChildren: [
					{ id: "pdf", title: "As PDF", onClickFunc: spies.pdf },
					{ id: "text", title: "As Text" },
				],
			},
			{ id: "quit", title: "Quit", onClickFunc: spies.quit },
		],
	},
	{
		id: "edit",
		title: "Edit",
		menuChildren: [
			{ id: "undo", title: "Undo", onClickFunc: spies.undo },
			{ id: "cut", title: "Cut" },
		],
	},
	{
		id: "view",
		title: "View",
		menuChildren: [{ id: "icons", title: "Icons" }],
	},
];

const renderBar = (spies = barSpies(), onClose?: () => void) => {
	const result = render(
		<ClassicyMenuProvider onClose={onClose}>
			<button type="button">before</button>
			<ClassicyMenu
				name="bar"
				menuItems={barItems(spies)}
				navClass="classicyDesktopMenu"
				subNavClass="classicySubMenu"
			/>
		</ClassicyMenuProvider>,
	);
	return { ...result, spies };
};

const item = (id: string) => document.getElementById(id) as HTMLElement;
const key = (k: string, init: Record<string, unknown> = {}) =>
	fireEvent.keyDown((document.activeElement as HTMLElement) ?? document.body, {
		key: k,
		...init,
	});
const barList = () =>
	document.querySelector(".classicyDesktopMenu") as HTMLElement;

describe("ClassicyMenu — keyboard navigation (WIG Ch.7, p.98; the audit's 7.7)", () => {
	it("activates the bar on F10, walks its titles with wrap-around, and gives focus back on a second F10", () => {
		renderBar();
		const before = screen.getByText("before");
		before.focus();
		fireEvent.keyDown(before, { key: "F10" });
		expect(item("file")).toHaveFocus();
		// No menu opens: the titles alone are tracked.
		expect(item("file")).not.toHaveClass("open");
		key("ArrowRight");
		expect(item("edit")).toHaveFocus();
		expect(item("edit")).not.toHaveClass("open");
		key("ArrowLeft");
		key("ArrowLeft");
		expect(item("view")).toHaveFocus();
		key("Home");
		expect(item("file")).toHaveFocus();
		key("End");
		expect(item("view")).toHaveFocus();
		fireEvent.keyDown(item("view"), { key: "F10" });
		expect(before).toHaveFocus();
	});

	it("opens a title's menu on Down or Up with its first item focused, walking it past dividers and dimmed items, wrapping", () => {
		renderBar();
		item("file").focus();
		key("ArrowUp");
		expect(item("file")).toHaveClass("open");
		expect(item("new")).toHaveFocus();
		key("ArrowDown");
		expect(item("open")).toHaveFocus();
		// The divider and the dimmed Close are passed over (Mac OS 8's skip).
		key("ArrowDown");
		expect(item("export")).toHaveFocus();
		key("ArrowDown");
		expect(item("quit")).toHaveFocus();
		key("ArrowDown");
		expect(item("new")).toHaveFocus();
		key("ArrowUp");
		expect(item("quit")).toHaveFocus();
		key("Home");
		expect(item("new")).toHaveFocus();
		key("End");
		expect(item("quit")).toHaveFocus();
	});

	it("browses dimmed items under a package that declares menu.disabledItems browse (Windows 98)", () => {
		activePackage.id = "windows-menus";
		renderBar();
		item("file").focus();
		key("ArrowDown");
		key("ArrowDown");
		expect(item("open")).toHaveFocus();
		key("ArrowDown");
		expect(item("close")).toHaveFocus();
		// Choosing it does nothing, as a click on it does.
		key("Enter");
		expect(item("file")).toHaveClass("open");
	});

	it("opens a submenu on Right on its first item, and closes it on Left or Escape back to its item", () => {
		const { spies } = renderBar();
		item("file").focus();
		key("ArrowDown");
		key("End");
		key("ArrowUp");
		expect(item("export")).toHaveFocus();
		key("ArrowRight");
		expect(item("export")).toHaveClass("open");
		expect(item("pdf")).toHaveFocus();
		key("ArrowLeft");
		expect(item("export")).toHaveFocus();
		expect(item("export")).not.toHaveClass("open");
		expect(item("file")).toHaveClass("open");
		key("Enter");
		expect(item("pdf")).toHaveFocus();
		key("Escape");
		expect(item("export")).toHaveFocus();
		expect(item("export")).not.toHaveClass("open");
		expect(spies.pdf).not.toHaveBeenCalled();
	});

	it("moves across the bar from inside a menu: Right from a leaf, Left from the first level, each opening on its first item", () => {
		renderBar();
		item("file").focus();
		key("ArrowDown");
		key("End");
		key("ArrowRight");
		expect(item("edit")).toHaveClass("open");
		expect(item("file")).not.toHaveClass("open");
		expect(item("undo")).toHaveFocus();
		key("ArrowLeft");
		expect(item("file")).toHaveClass("open");
		expect(item("new")).toHaveFocus();
		key("ArrowLeft");
		expect(item("view")).toHaveClass("open");
		expect(item("icons")).toHaveFocus();
		// A title with its menu open moves with it.
		item("view").focus();
		key("ArrowRight");
		expect(item("file")).toHaveClass("open");
		expect(item("new")).toHaveFocus();
	});

	it("closes a menu on Escape leaving its title focused, then deactivates the bar on a second Escape, focus going back", () => {
		const onClose = vi.fn();
		renderBar(barSpies(), onClose);
		const before = screen.getByText("before");
		before.focus();
		fireEvent.keyDown(before, { key: "F10" });
		key("ArrowDown");
		expect(item("new")).toHaveFocus();
		key("Escape");
		expect(item("file")).not.toHaveClass("open");
		expect(item("file")).toHaveFocus();
		expect(onClose).toHaveBeenCalledTimes(1);
		key("Escape");
		expect(before).toHaveFocus();
	});

	it("chooses an item on Return or Space, focus going back where it was", () => {
		vi.useFakeTimers();
		const { spies } = renderBar();
		const before = screen.getByText("before");
		before.focus();
		fireEvent.keyDown(before, { key: "F10" });
		key("ArrowDown");
		key(" ");
		act(() => {
			vi.advanceTimersByTime(450);
		});
		expect(spies.new).toHaveBeenCalledTimes(1);
		expect(before).toHaveFocus();
		fireEvent.keyDown(before, { key: "F10" });
		key("ArrowRight");
		key("ArrowDown");
		key("Enter");
		act(() => {
			vi.advanceTimersByTime(450);
		});
		expect(spies.undo).toHaveBeenCalledTimes(1);
	});

	it("jumps to the next item a typed letter starts, wrapping, case-insensitively", () => {
		renderBar();
		item("file").focus();
		key("ArrowDown");
		key("q");
		expect(item("quit")).toHaveFocus();
		key("O");
		expect(item("open")).toHaveFocus();
		// The dimmed Close is passed over; nothing starts with "z".
		key("c");
		expect(item("open")).toHaveFocus();
		key("z");
		expect(item("open")).toHaveFocus();
	});

	// A package orders the bar's clusters with CSS `order`, so the titles
	// are walked as they show, left to right, not in document order.
	it("walks the bar's titles in the order they show", () => {
		renderBar();
		const lefts: Record<string, number> = { file: 100, edit: 200, view: 0 };
		for (const [id, left] of Object.entries(lefts))
			vi.spyOn(item(id), "getBoundingClientRect").mockReturnValue({
				left,
				right: left + 50,
				top: 0,
				bottom: 20,
				width: 50,
				height: 20,
				x: left,
				y: 0,
				toJSON: () => ({}),
			} as DOMRect);
		const before = screen.getByText("before");
		before.focus();
		fireEvent.keyDown(before, { key: "F10" });
		expect(item("view")).toHaveFocus();
		key("ArrowRight");
		expect(item("file")).toHaveFocus();
		key("ArrowLeft");
		key("ArrowLeft");
		expect(item("edit")).toHaveFocus();
	});

	it("leaves modified keys to their owners", () => {
		renderBar();
		item("file").focus();
		key("ArrowDown", { ctrlKey: true });
		expect(item("file")).not.toHaveClass("open");
		key("ArrowDown", { altKey: true });
		expect(item("file")).not.toHaveClass("open");
	});

	it("marks the root list focused while the keyboard moved the tracking, until the pointer moves, and starts from the pointer's item then", () => {
		renderBar();
		item("file").focus();
		expect(barList()).not.toHaveClass("focused");
		key("ArrowDown");
		expect(barList()).toHaveClass("focused");
		// The pointer moves onto Export: the tracking is its own again.
		fireEvent.mouseOver(item("export"));
		fireEvent.mouseMove(item("export"), { clientX: 10, clientY: 40 });
		expect(barList()).not.toHaveClass("focused");
		key("ArrowDown");
		expect(item("quit")).toHaveFocus();
		expect(barList()).toHaveClass("focused");
		// A move with no travel (content moving under a resting pointer) keeps it.
		fireEvent.mouseMove(item("export"), { clientX: 10, clientY: 40 });
		expect(barList()).toHaveClass("focused");
	});
});

describe("ClassicyMenu — a pop-up root menu and the keyboard (WIG Ch.7, p.101; the audit's 7.8)", () => {
	const renderPopup = (onClose = vi.fn()) => {
		render(
			<ClassicyMenuProvider startActive onClose={onClose}>
				<button type="button">target</button>
				<ClassicyMenu
					name="popup"
					navClass="classicyContextMenu"
					subNavClass="classicyContextSubMenu"
					menuItems={[
						{ id: "help", title: "Help", disabled: true },
						{ id: "copy", title: "Copy" },
						{
							id: "more",
							title: "More",
							menuChildren: [{ id: "deep", title: "Deep" }],
						},
						{ id: "paste", title: "Paste" },
					]}
				/>
			</ClassicyMenuProvider>,
		);
		return onClose;
	};

	it("takes Up and Down from the document while focus is outside it, and Escape closes it", () => {
		const onClose = renderPopup();
		const target = screen.getByText("target");
		target.focus();
		fireEvent.keyDown(target, { key: "ArrowDown" });
		expect(item("copy")).toHaveFocus();
		key("ArrowUp");
		expect(item("paste")).toHaveFocus();
		key("Escape");
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(target).toHaveFocus();
	});

	it("closes on Escape from outside it, a level at a time", () => {
		const onClose = renderPopup();
		const target = screen.getByText("target");
		target.focus();
		fireEvent.keyDown(target, { key: "ArrowDown" });
		key("ArrowDown");
		key("ArrowRight");
		expect(item("deep")).toHaveFocus();
		target.focus();
		fireEvent.keyDown(target, { key: "Escape" });
		expect(item("more")).not.toHaveClass("open");
		expect(onClose).not.toHaveBeenCalled();
		fireEvent.keyDown(target, { key: "Escape" });
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("is vertical: Left and Right at its root list do nothing", () => {
		const onClose = renderPopup();
		item("copy").focus();
		key("ArrowRight");
		expect(item("copy")).toHaveFocus();
		key("ArrowLeft");
		expect(item("copy")).toHaveFocus();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("never opens on a press: its items are not titles", () => {
		renderPopup();
		fireEvent.mouseDown(item("more"), { button: 0 });
		expect(item("more")).not.toHaveClass("open");
	});
});

describe("ClassicyMenu — press-drag-release on a title (WIG Ch.7, p.97; HIGOS8 p.92; the audit's 7.5)", () => {
	const title = (id: string) => item(id).querySelector("p") as HTMLElement;

	it("opens on the press, and a quick click keeps it open (sticky)", () => {
		renderBar();
		fireEvent.mouseDown(title("file"), { button: 0 });
		expect(item("file")).toHaveClass("open");
		fireEvent.mouseUp(title("file"), { button: 0 });
		fireEvent.click(title("file"));
		expect(item("file")).toHaveClass("open");
		// A click on the open title closes it, as before.
		fireEvent.mouseDown(title("file"), { button: 0 });
		fireEvent.mouseUp(title("file"), { button: 0 });
		fireEvent.click(title("file"));
		expect(item("file")).not.toHaveClass("open");
	});

	it("chooses the item it is released over", () => {
		vi.useFakeTimers();
		const { spies } = renderBar();
		fireEvent.mouseDown(title("file"), { button: 0 });
		fireEvent.mouseUp(item("open"), { button: 0 });
		// The browser's click lands on the title, the two's common ancestor;
		// it is the press's, so it does not toggle the menu shut.
		fireEvent.click(item("file"));
		expect(item("file")).toHaveClass("open");
		act(() => {
			vi.advanceTimersByTime(450);
		});
		expect(spies.open).toHaveBeenCalledTimes(1);
		expect(spies.new).not.toHaveBeenCalled();
		expect(item("file")).not.toHaveClass("open");
	});

	it("stays open released over a dimmed item, a divider or a submenu's item, and closes released off every menu", () => {
		const onClose = vi.fn();
		renderBar(barSpies(), onClose);
		fireEvent.mouseDown(title("file"), { button: 0 });
		fireEvent.mouseUp(item("close"), { button: 0 });
		fireEvent.click(item("file"));
		expect(item("file")).toHaveClass("open");
		expect(onClose).not.toHaveBeenCalled();
		// A press on the open title is a click on it, as before: released
		// anywhere but over an item it chooses, it closes the menu.
		fireEvent.mouseDown(title("file"), { button: 0 });
		fireEvent.mouseUp(item("export"), { button: 0 });
		fireEvent.click(item("file"));
		expect(item("file")).not.toHaveClass("open");
		// A press that opened it, released over Export (an item with a
		// submenu), keeps it open.
		fireEvent.mouseDown(title("file"), { button: 0 });
		fireEvent.mouseUp(item("export"), { button: 0 });
		fireEvent.click(item("file"));
		expect(item("file")).toHaveClass("open");
		// Off every menu: closed, nothing chosen.
		fireEvent.mouseDown(title("edit"), { button: 0 });
		expect(item("edit")).toHaveClass("open");
		fireEvent.mouseUp(document.body, { button: 0 });
		expect(item("edit")).not.toHaveClass("open");
		expect(onClose).toHaveBeenCalled();
	});

	it("chooses an item a press inside an open menu is released over", () => {
		vi.useFakeTimers();
		const { spies } = renderBar();
		fireEvent.click(title("file"));
		fireEvent.mouseDown(item("new"), { button: 0 });
		fireEvent.mouseUp(item("quit"), { button: 0 });
		// The browser's click on the list, the two's common ancestor, bubbles
		// to the title: swallowed, so the menu does not close under the flash.
		fireEvent.click(item("quit").parentElement as HTMLElement);
		expect(item("file")).toHaveClass("open");
		act(() => {
			vi.advanceTimersByTime(450);
		});
		expect(spies.quit).toHaveBeenCalledTimes(1);
		expect(spies.new).not.toHaveBeenCalled();
	});

	it("closes the menu its press opened when the pointer stream is lost", () => {
		renderBar();
		fireEvent.mouseDown(title("file"), { button: 0 });
		expect(item("file")).toHaveClass("open");
		losePointerStream("blur");
		expect(item("file")).not.toHaveClass("open");
	});

	it("leaves a press with another button alone", () => {
		renderBar();
		fireEvent.mouseDown(title("file"), { button: 2 });
		expect(item("file")).not.toHaveClass("open");
	});
});

describe("ClassicyMenu — submenu time-outs (layout.menu.submenuDelayMs; WIG Ch.7, pp.104-105; the audit's 7.12)", () => {
	it("opens a hovered submenu at once and keeps it under a leaf sibling with no delay declared (Mac OS 8)", () => {
		vi.useFakeTimers();
		renderBar();
		fireEvent.click(item("file").querySelector("p") as HTMLElement);
		fireEvent.mouseEnter(item("export"));
		expect(item("export")).toHaveClass("open");
		fireEvent.mouseEnter(item("quit"));
		act(() => {
			vi.advanceTimersByTime(2000);
		});
		expect(item("export")).toHaveClass("open");
	});

	it("opens a hovered submenu after the delay, and a leave first cancels it (Windows 98, 400 ms)", () => {
		vi.useFakeTimers();
		activePackage.id = "windows-menus";
		renderBar();
		fireEvent.click(item("file").querySelector("p") as HTMLElement);
		fireEvent.mouseEnter(item("export"));
		act(() => {
			vi.advanceTimersByTime(399);
		});
		expect(item("export")).not.toHaveClass("open");
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(item("export")).toHaveClass("open");
		// Off it and back: a pending open is canceled by the leave.
		fireEvent.mouseLeave(item("export"));
		fireEvent.mouseEnter(item("quit"));
		act(() => {
			vi.advanceTimersByTime(400);
		});
		expect(item("export")).not.toHaveClass("open");
		fireEvent.mouseEnter(item("export"));
		act(() => {
			vi.advanceTimersByTime(200);
		});
		fireEvent.mouseLeave(item("export"));
		act(() => {
			vi.advanceTimersByTime(400);
		});
		expect(item("export")).not.toHaveClass("open");
	});

	it("keeps an open submenu while the pointer comes back to it before the delay passes (a diagonal drag)", () => {
		vi.useFakeTimers();
		activePackage.id = "windows-menus";
		renderBar();
		fireEvent.click(item("file").querySelector("p") as HTMLElement);
		fireEvent.click(item("export").querySelector("p") as HTMLElement);
		expect(item("export")).toHaveClass("open");
		fireEvent.mouseEnter(item("quit"));
		act(() => {
			vi.advanceTimersByTime(200);
		});
		fireEvent.mouseEnter(item("pdf"));
		act(() => {
			vi.advanceTimersByTime(400);
		});
		expect(item("export")).toHaveClass("open");
	});

	it("switches menu bar titles at once under the delay", () => {
		activePackage.id = "windows-menus";
		renderBar();
		fireEvent.click(item("file").querySelector("p") as HTMLElement);
		fireEvent.mouseEnter(item("edit"));
		expect(item("edit")).toHaveClass("open");
		expect(item("file")).not.toHaveClass("open");
	});

	it("opens a pop-up menu's submenu on hover only under the delay", () => {
		vi.useFakeTimers();
		const popup = () =>
			render(
				<ClassicyMenuProvider startActive>
					<ClassicyMenu
						name="popup"
						navClass="classicyContextMenu"
						subNavClass="classicyContextSubMenu"
						menuItems={[
							{
								id: "send",
								title: "Send To",
								menuChildren: [{ id: "floppy", title: "Floppy" }],
							},
							{
								id: "dim",
								title: "Dimmed",
								disabled: true,
								menuChildren: [{ id: "none", title: "None" }],
							},
						]}
					/>
				</ClassicyMenuProvider>,
			);
		const first = popup();
		fireEvent.mouseEnter(item("send"));
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(item("send")).not.toHaveClass("open");
		first.unmount();
		activePackage.id = "windows-menus";
		popup();
		fireEvent.mouseEnter(item("send"));
		act(() => {
			vi.advanceTimersByTime(400);
		});
		expect(item("send")).toHaveClass("open");
		// A dimmed item's submenu never opens on hover.
		fireEvent.mouseEnter(item("dim"));
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(item("dim")).not.toHaveClass("open");
	});
});
