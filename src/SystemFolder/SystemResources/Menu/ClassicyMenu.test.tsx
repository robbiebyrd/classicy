// The flash class comes from Platinum's MenuItem press hook.
import "@classicy/appearance-platinum";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
		// An item's balloon reads the Balloon Help toggle.
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: { Manager: { Desktop: { disableBalloonHelp: false } } },
			}),
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

import { windows98AppearanceHooks } from "@classicy/appearance-windows98";
import { losePointerStream } from "@/__tests__/losePointerStream";
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { classicySpecialMenuItems } from "@/SystemFolder/SystemResources/Desktop/ClassicySpecialMenu";
import { resetClassicyAccessKeyReportsForTests } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import {
	ClassicyMenu,
	type ClassicyMenuItem,
	withClassicyConfirmEllipsis,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyMenuProvider } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";
import {
	ClassicyMenuStatusContext,
	resetClassicyMenuStatusTextForTests,
	useClassicyMenuStatusText,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenuStatusText.internal";
import system7 from "../../../../packages/appearance/system7/src/system7.json";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

// The store is mocked, so nothing connects the active package id; stand in
// for the store's connection. Platinum (registered above) is the default
// layout, which declares no menu keys (Mac OS 8's menus: Return alone, no
// access keys); `windows-menus` carries the Windows 98 package's own layout
// (`menu.keys` "windows", `menu.submenuDelayMs` 400, `menu.disabledItems`
// "browse", `menu.accessKeys` "auto", `menuBar.idleTimeoutMs` 0);
// `windows-keys` declares Windows' menu keyboard alone (dimmed items
// skipped, no access keys, no delays), and `windows-keys-explicit` adds
// explicit access keys to it.
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
for (const [id, menu] of [
	["windows-keys", { keys: "windows" }],
	["windows-keys-explicit", { keys: "windows", accessKeys: "explicit" }],
] as const)
	registerClassicyAppearancePackage({
		id,
		name: id,
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: `${id}-default`,
			package: id,
		},
		layout: {
			...windows98.layout,
			menuBar: { placement: "screen" },
			menu,
		} as never,
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

describe("ClassicyMenu — the keyboard under Mac OS menus (no layout.menu.keys: Platinum, System 7)", () => {
	// Mac OS 8's and System 7's menus had no keyboard navigation (HIGOS8
	// "Sticky Menus", p.92): Return alone chooses the focused item, as it
	// always did, and every other key is left to its owner.
	it("chooses the focused item on Return alone, and takes no other key", () => {
		vi.useFakeTimers();
		const onClose = vi.fn();
		const { spies } = renderBar(barSpies(), onClose);
		const before = screen.getByText("before");
		before.focus();
		expect(fireEvent.keyDown(before, { key: "F10" })).toBe(true);
		expect(before).toHaveFocus();
		item("file").focus();
		for (const k of ["ArrowDown", "ArrowUp", "ArrowRight", "Home", " ", "n"])
			expect(key(k)).toBe(true);
		expect(item("file")).not.toHaveClass("open");
		expect(item("file")).toHaveFocus();
		// Return opens the title's menu, as a click does, and leaves focus.
		expect(key("Enter")).toBe(false);
		expect(item("file")).toHaveClass("open");
		expect(item("file")).toHaveFocus();
		expect(barList()).not.toHaveClass("focused");
		// Escape closes nothing; a focused item is chosen by Return.
		expect(key("Escape")).toBe(true);
		expect(item("file")).toHaveClass("open");
		item("open").focus();
		expect(key("ArrowDown")).toBe(true);
		expect(item("open")).toHaveFocus();
		expect(key("Enter")).toBe(false);
		act(() => {
			vi.advanceTimersByTime(450);
		});
		expect(spies.open).toHaveBeenCalledTimes(1);
		expect(item("file")).not.toHaveClass("open");
		expect(barList()).not.toHaveClass("focused");
	});

	it("leaves a pop-up menu's keys to the document while focus is outside it", () => {
		const onClose = vi.fn();
		render(
			<ClassicyMenuProvider startActive onClose={onClose}>
				<button type="button">target</button>
				<ClassicyMenu
					name="popup"
					navClass="classicyContextMenu"
					menuItems={[
						{ id: "copy", title: "Copy", accessKey: "c" },
						{ id: "paste", title: "Paste" },
					]}
				/>
			</ClassicyMenuProvider>,
		);
		const target = screen.getByText("target");
		target.focus();
		for (const k of ["ArrowDown", "ArrowUp", "Escape", "c"])
			expect(fireEvent.keyDown(target, { key: k })).toBe(true);
		expect(target).toHaveFocus();
		expect(onClose).not.toHaveBeenCalled();
	});
});

describe("ClassicyMenu — keyboard navigation (layout.menu.keys windows; WIG Ch.7, p.98; the audit's 7.7)", () => {
	beforeEach(() => {
		activePackage.id = "windows-keys";
	});

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

describe("ClassicyMenu — a pop-up root menu and the keyboard (layout.menu.keys windows; WIG Ch.7, p.101; the audit's 7.8)", () => {
	beforeEach(() => {
		activePackage.id = "windows-keys";
	});

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

describe("ClassicyMenu — access keys (WIG Ch.7, pp.97, 106, 109; the audit's 7.1)", () => {
	const part = (id: string) =>
		item(id).querySelector(
			':scope > p [data-classicy-part="access-key"]',
		) as HTMLElement | null;
	const parts = () =>
		document.querySelectorAll('[data-classicy-part="access-key"]');
	const alt = (
		k: string,
		target: Element = document.activeElement as Element,
	) =>
		fireEvent.keyDown(target, {
			key: k,
			code: `Key${k.toUpperCase()}`,
			altKey: true,
		});
	const pressAlt = (target: Element = document.activeElement as Element) => {
		fireEvent.keyDown(target, { key: "Alt", code: "AltLeft", altKey: true });
		fireEvent.keyUp(target, { key: "Alt", code: "AltLeft" });
	};

	it("draws none and leaves Alt to the browser under a package without access keys (Platinum)", () => {
		const first = renderBar();
		expect(parts()).toHaveLength(0);
		expect(document.querySelector("[aria-keyshortcuts]")).toBeNull();
		const before = screen.getByText("before");
		before.focus();
		alt("f", before);
		expect(item("file")).not.toHaveClass("open");
		pressAlt(before);
		expect(before).toHaveFocus();
		// Under Windows' keys with no access keys, typing jumps by the first
		// letter (L2-A's type-ahead).
		first.unmount();
		activePackage.id = "windows-keys";
		renderBar();
		expect(parts()).toHaveLength(0);
		item("file").focus();
		key("ArrowDown");
		key("q");
		expect(item("quit")).toHaveFocus();
	});

	// Mac OS had no access keys: a host's explicit `accessKey` is inert under
	// a package that declares no `layout.menu.accessKeys`.
	it("ignores an explicit key under a package without access keys (Platinum): nothing drawn, named or taken", () => {
		vi.useFakeTimers();
		const open = vi.fn();
		render(
			<ClassicyMenuProvider>
				<button type="button">before</button>
				<ClassicyMenu
					name="bar"
					navClass="classicyDesktopMenu"
					subNavClass="classicySubMenu"
					menuItems={[
						{
							id: "file",
							title: "File",
							accessKey: "F",
							menuChildren: [
								{
									id: "open",
									title: "Open",
									accessKey: "p",
									onClickFunc: open,
								},
							],
						},
					]}
				/>
			</ClassicyMenuProvider>,
		);
		expect(parts()).toHaveLength(0);
		expect(document.querySelector("[aria-keyshortcuts]")).toBeNull();
		expect(item("file").querySelector("p")?.innerHTML).toBe("File");
		const before = screen.getByText("before");
		before.focus();
		expect(alt("f", before)).toBe(true);
		expect(item("file")).not.toHaveClass("open");
		fireEvent.click(item("file").querySelector("p") as HTMLElement);
		item("open").focus();
		expect(key("p")).toBe(true);
		act(() => {
			vi.advanceTimersByTime(450);
		});
		expect(open).not.toHaveBeenCalled();
	});

	it("underlines an explicit key's first match, in its own case first, and chooses its item when typed", () => {
		vi.useFakeTimers();
		activePackage.id = "windows-keys-explicit";
		const open = vi.fn();
		render(
			<ClassicyMenuProvider>
				<ClassicyMenu
					name="bar"
					navClass="classicyDesktopMenu"
					subNavClass="classicySubMenu"
					menuItems={[
						{
							id: "file",
							title: "File",
							accessKey: "F",
							menuChildren: [
								{ id: "save", title: "Save" },
								{ id: "saveAs", title: "Save As", accessKey: "A" },
								{
									id: "open",
									title: "Open",
									accessKey: "p",
									onClickFunc: open,
								},
							],
						},
					]}
				/>
			</ClassicyMenuProvider>,
		);
		expect(part("file")).toHaveTextContent("F");
		// "A" is the start of "As", not the a of "Save"; the title keeps its space.
		expect(part("saveAs")?.previousSibling?.textContent).toBe("Save ");
		expect(item("saveAs").querySelector("p")).toHaveTextContent("Save As", {
			normalizeWhitespace: false,
		});
		expect(part("save")).toBeNull();
		item("file").focus();
		key("ArrowDown");
		key("p");
		act(() => {
			vi.advanceTimersByTime(450);
		});
		expect(open).toHaveBeenCalledTimes(1);
	});

	it("gives every title and item a key of its own under a package that declares menu.accessKeys auto (Windows 98)", () => {
		vi.useFakeTimers();
		activePackage.id = "windows-menus";
		const { spies } = renderBar();
		expect(part("file")).toHaveTextContent("F");
		expect(part("edit")).toHaveTextContent("E");
		expect(part("view")).toHaveTextContent("V");
		expect(item("file")).toHaveAttribute("aria-keyshortcuts", "Alt+F");
		item("file").focus();
		key("ArrowDown");
		expect(
			["new", "open", "close", "export", "quit"].map(
				(id) => part(id)?.textContent,
			),
		).toEqual(["N", "O", "C", "E", "Q"]);
		expect(item("open")).toHaveAttribute("aria-keyshortcuts", "O");
		// A submenu's key opens it on its first item.
		key("e");
		expect(item("export")).toHaveClass("open");
		expect(item("pdf")).toHaveFocus();
		// As PDF takes A; As Text, A taken, the next word's first letter.
		expect(part("pdf")).toHaveTextContent("A");
		expect(part("text")).toHaveTextContent("T");
		key("a");
		act(() => {
			vi.advanceTimersByTime(450);
		});
		expect(spies.pdf).toHaveBeenCalledTimes(1);
	});

	it("opens a title's menu on Alt and its key, and takes Alt held through the item's key", () => {
		vi.useFakeTimers();
		activePackage.id = "windows-menus";
		const { spies } = renderBar();
		const before = screen.getByText("before");
		before.focus();
		alt("f", before);
		expect(item("file")).toHaveClass("open");
		expect(item("new")).toHaveFocus();
		alt("q");
		act(() => {
			vi.advanceTimersByTime(450);
		});
		expect(spies.quit).toHaveBeenCalledTimes(1);
		expect(before).toHaveFocus();
	});

	it("brings focus to the bar on Alt alone and back, and not when another key or a press comes between", () => {
		activePackage.id = "windows-menus";
		renderBar();
		const before = screen.getByText("before");
		before.focus();
		pressAlt(before);
		expect(item("file")).toHaveFocus();
		expect(item("file")).not.toHaveClass("open");
		// The bar has the keyboard: a title's key alone opens it.
		key("e");
		expect(item("edit")).toHaveClass("open");
		expect(item("undo")).toHaveFocus();
		pressAlt();
		expect(item("edit")).not.toHaveClass("open");
		expect(before).toHaveFocus();
		// Alt, then another key: no toggle.
		fireEvent.keyDown(before, { key: "Alt", altKey: true });
		fireEvent.keyDown(before, { key: "Tab", altKey: true });
		fireEvent.keyUp(before, { key: "Alt" });
		expect(before).toHaveFocus();
		fireEvent.keyDown(before, { key: "Alt", altKey: true });
		fireEvent.mouseDown(before);
		fireEvent.keyUp(before, { key: "Alt" });
		expect(before).toHaveFocus();
	});

	// The remaining chapters' audit's 4.14 (WIG Ch.4 "Shortcut Keys", p.27):
	// a title's access key wins over a menu item's ⌥ chord
	// (useClassicyMenuBarAccessKeys.test.tsx mounts the dispatcher too).
	it("takes Alt and a title's key over a menu item's Option chord, and leaves it to a modal window the bar is not in", () => {
		activePackage.id = "windows-menus";
		render(
			<ClassicyMenuProvider>
				<button type="button">before</button>
				<ClassicyMenu
					name="bar"
					navClass="classicyDesktopMenu"
					subNavClass="classicySubMenu"
					menuItems={[
						{
							id: "file",
							title: "File",
							menuChildren: [
								{ id: "find", title: "Find", keyboardShortcut: "⌥F" },
							],
						},
						{
							id: "edit",
							title: "Edit",
							menuChildren: [{ id: "undo", title: "Undo" }],
						},
					]}
				/>
				<div className="classicyWindow classicyWindowModal">
					<button type="button">in a dialog</button>
				</div>
			</ClassicyMenuProvider>,
		);
		const before = screen.getByText("before");
		before.focus();
		expect(alt("f", before)).toBe(false);
		expect(item("file")).toHaveClass("open");
		fireEvent.keyDown(item("find"), { key: "Escape" });
		fireEvent.keyDown(item("file"), { key: "Escape" });
		alt("e", before);
		expect(item("edit")).toHaveClass("open");
		fireEvent.keyDown(item("undo"), { key: "Escape" });
		fireEvent.keyDown(item("edit"), { key: "Escape" });
		const dialog = screen.getByText("in a dialog");
		dialog.focus();
		alt("e", dialog);
		expect(item("edit")).not.toHaveClass("open");
		pressAlt(dialog);
		expect(dialog).toHaveFocus();
	});

	it("moves between items sharing a key without choosing one, and only tracks a dimmed one it browses", () => {
		vi.useFakeTimers();
		const one = vi.fn();
		const two = vi.fn();
		const items: ClassicyMenuItem[] = [
			{
				id: "menu",
				title: "Menu",
				menuChildren: [
					{ id: "cut", title: "Cut", accessKey: "t", onClickFunc: one },
					{ id: "tab", title: "Tab", accessKey: "t", onClickFunc: two },
					{ id: "dim", title: "Dimmed", accessKey: "d", disabled: true },
				],
			},
		];
		const bar = () =>
			render(
				<ClassicyMenuProvider>
					<ClassicyMenu
						name="bar"
						navClass="classicyDesktopMenu"
						subNavClass="classicySubMenu"
						menuItems={items}
					/>
				</ClassicyMenuProvider>,
			);
		activePackage.id = "windows-keys-explicit";
		const first = bar();
		item("menu").focus();
		key("ArrowDown");
		expect(item("cut")).toHaveFocus();
		key("t");
		expect(item("tab")).toHaveFocus();
		key("t");
		expect(item("cut")).toHaveFocus();
		// Dimmed, passed over (the default skip): focus stays.
		key("d");
		expect(item("cut")).toHaveFocus();
		act(() => {
			vi.advanceTimersByTime(450);
		});
		expect(one).not.toHaveBeenCalled();
		expect(two).not.toHaveBeenCalled();
		first.unmount();
		activePackage.id = "windows-menus";
		bar();
		item("menu").focus();
		key("ArrowDown");
		key("d");
		expect(item("dim")).toHaveFocus();
		expect(item("menu")).toHaveClass("open");
	});

	it("chooses a pop-up menu's item by its key with focus outside it, and passes on a key no item has", () => {
		vi.useFakeTimers();
		activePackage.id = "windows-menus";
		const copy = vi.fn();
		const onClose = vi.fn();
		render(
			<ClassicyMenuProvider startActive onClose={onClose}>
				<input aria-label="field" />
				<ClassicyMenu
					name="popup"
					navClass="classicyContextMenu"
					subNavClass="classicyContextSubMenu"
					menuItems={[
						{ id: "copy", title: "Copy", onClickFunc: copy },
						{ id: "paste", title: "Paste" },
					]}
				/>
			</ClassicyMenuProvider>,
		);
		const field = screen.getByLabelText("field");
		field.focus();
		expect(fireEvent.keyDown(field, { key: "z" })).toBe(true);
		expect(fireEvent.keyDown(field, { key: "c" })).toBe(false);
		act(() => {
			vi.advanceTimersByTime(450);
		});
		expect(copy).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalled();
	});

	it("passes a pop-up menu's letters on under a package without access keys", () => {
		activePackage.id = "windows-keys";
		const copy = vi.fn();
		render(
			<ClassicyMenuProvider startActive>
				<input aria-label="field" />
				<ClassicyMenu
					name="popup"
					navClass="classicyContextMenu"
					menuItems={[{ id: "copy", title: "Copy", onClickFunc: copy }]}
				/>
			</ClassicyMenuProvider>,
		);
		const field = screen.getByLabelText("field");
		field.focus();
		expect(fireEvent.keyDown(field, { key: "c" })).toBe(true);
		expect(field).toHaveFocus();
	});
});

describe("ClassicyMenu — empty submenus (layout.menu.emptySubmenus)", () => {
	const items = (onClickFunc = vi.fn()): ClassicyMenuItem[] => [
		{
			id: "start",
			title: "Start",
			menuChildren: [
				{ id: "favorites", title: "Favorites", menuChildren: [], onClickFunc },
			],
		},
	];
	const renderStart = (onClickFunc = vi.fn()) =>
		render(
			<ClassicyMenuProvider>
				<ClassicyMenu
					name="bar"
					navClass="classicyDesktopMenu"
					subNavClass="classicySubMenu"
					menuItems={items(onClickFunc)}
				/>
			</ClassicyMenuProvider>,
		);

	it("keeps an item with an empty submenu a plain item by default (Platinum)", () => {
		vi.useFakeTimers();
		const onClickFunc = vi.fn();
		renderStart(onClickFunc);
		fireEvent.click(item("start").querySelector("p") as HTMLElement);
		expect(item("favorites")).not.toHaveClass(
			"classicyMenuItemChildMenuIndicator",
		);
		expect(document.getElementById("favorites_empty")).toBeNull();
		fireEvent.click(item("favorites"));
		act(() => {
			vi.advanceTimersByTime(450);
		});
		expect(onClickFunc).toHaveBeenCalledTimes(1);
	});

	it("shows one dimmed (Empty) item, with no access key, under a package that declares placeholder (Windows 98)", () => {
		activePackage.id = "windows-menus";
		renderStart();
		fireEvent.click(item("start").querySelector("p") as HTMLElement);
		expect(item("favorites")).toHaveClass("classicyMenuItemChildMenuIndicator");
		fireEvent.click(item("favorites"));
		expect(item("favorites")).toHaveClass("open");
		const empty = document.getElementById("favorites_empty") as HTMLElement;
		expect(empty).toHaveTextContent("(Empty)");
		expect(empty).toHaveClass("disabled");
		expect(empty.querySelector('[data-classicy-part="access-key"]')).toBeNull();
	});
});

// The remaining chapters' audit's 4.12 (WIG Ch.4 "Access Keys", p.27:
// unique "within the scope of its interaction"): in a development build two
// items of one menu sharing a key log a Menu warning, once; none under a
// package without access keys, where no item has one.
describe("ClassicyMenu — duplicate access keys", () => {
	const entries: ClassicyLogEntry[] = [];
	afterEach(() => {
		unregisterClassicyLogSink("menu-duplicates");
		entries.length = 0;
		resetClassicyAccessKeyReportsForTests();
	});
	const items = [
		{ id: "copy", title: "Copy", accessKey: "c" },
		{ id: "close", title: "Close", accessKey: "c" },
		{ id: "paste", title: "Paste", accessKey: "p" },
	];

	it("warns once when two items of one menu share a key", () => {
		activePackage.id = "windows-keys-explicit";
		registerClassicyLogSink({
			id: "menu-duplicates",
			onLog: (entry) => entries.push(entry),
		});
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const { rerender } = render(
			<ClassicyMenu name="m" menuItems={items} open={true} />,
		);
		rerender(<ClassicyMenu name="m" menuItems={[...items]} open={true} />);
		const menuWarnings = entries.filter((e) => e.subsystem === "Menu");
		expect(menuWarnings).toHaveLength(1);
		expect(menuWarnings[0].level).toBe("warn");
		expect(menuWarnings[0].message).toContain("“Copy”, “Close”");
		warn.mockRestore();
	});

	it("warns of nothing by default (Platinum)", () => {
		registerClassicyLogSink({
			id: "menu-duplicates",
			onLog: (entry) => entries.push(entry),
		});
		render(<ClassicyMenu name="m" menuItems={items} open={true} />);
		expect(entries.filter((e) => e.subsystem === "Menu")).toHaveLength(0);
	});
});

// The remaining chapters' audit's 12.13 (WIG Ch.12 "Status Bar Messages",
// pp.276-277, Figure 12.7; "Guidelines for Writing Status Bar Messages",
// p.278): under `layout.menu.itemHelp` "statusBar" a menu item's help is no
// balloon but the menus' status text while it is highlighted, by the
// pointer or the keyboard (its `disabledContent` while it is disabled),
// none for an item without help, until the menu closes; a bevel pop-up
// outside any window gives none. Under a Mac layout the balloon stands and
// no text is given.
describe("ClassicyMenu — item help in the status bar (layout.menu.itemHelp)", () => {
	afterEach(() => resetClassicyMenuStatusTextForTests());
	const Status = () => {
		const text = useClassicyMenuStatusText();
		return <output data-testid="status">{text ?? "(none)"}</output>;
	};
	const status = () => screen.getByTestId("status").textContent;
	const helpItems: ClassicyMenuItem[] = [
		{
			id: "file",
			title: "File",
			balloon: { content: "Contains commands for working with files." },
			menuChildren: [
				{
					id: "open",
					title: "Open",
					balloon: { content: "Opens a document." },
				},
				{
					id: "save",
					title: "Save",
					disabled: true,
					balloon: {
						content: "Saves the document.",
						disabledContent:
							"This command is not available because nothing has changed.",
					},
				},
				{
					id: "print",
					title: "Print",
					disabled: true,
					balloon: { content: "Prints the document." },
				},
				{ id: "quit", title: "Quit" },
			],
		},
	];
	const renderHelpBar = (scope = true) =>
		render(
			<ClassicyMenuProvider>
				<Status />
				<ClassicyMenuStatusContext.Provider value={scope}>
					<ClassicyMenu
						name="bar"
						menuItems={helpItems}
						navClass="classicyDesktopMenu"
						subNavClass="classicySubMenu"
					/>
				</ClassicyMenuStatusContext.Provider>
			</ClassicyMenuProvider>,
		);

	it("gives the highlighted item's help as the status text until the menu closes, with no balloons, under the Windows 98 layout", () => {
		activePackage.id = "windows-menus";
		const { unmount } = renderHelpBar();
		expect(document.querySelector(".classicyMenuItemBalloonAnchor")).toBeNull();
		// No menu shown: no status text, the title's help kept for its menu.
		fireEvent.mouseOver(item("file"));
		expect(status()).toBe("(none)");
		fireEvent.click(item("file").querySelector("p") as HTMLElement);
		expect(item("file")).toHaveClass("open");
		expect(status()).toBe("Contains commands for working with files.");
		fireEvent.mouseOver(item("open"));
		expect(status()).toBe("Opens a document.");
		fireEvent.mouseLeave(item("open"));
		expect(status()).toBe("");
		// A disabled item gives its reason, else its help.
		fireEvent.mouseOver(item("save"));
		expect(status()).toBe(
			"This command is not available because nothing has changed.",
		);
		fireEvent.mouseLeave(item("save"));
		fireEvent.mouseOver(item("print"));
		expect(status()).toBe("Prints the document.");
		fireEvent.mouseLeave(item("print"));
		// An item with no help gives none.
		fireEvent.mouseOver(item("quit"));
		expect(status()).toBe("");
		fireEvent.mouseLeave(item("quit"));
		// The keyboard's focus is a highlight too.
		fireEvent.focus(item("open"));
		expect(status()).toBe("Opens a document.");
		fireEvent.blur(item("open"));
		expect(status()).toBe("");
		fireEvent.focus(item("open"));
		unmount();
		render(<Status />);
		expect(status()).toBe("(none)");
	});

	it("ends the status text when the menu closes", () => {
		activePackage.id = "windows-menus";
		renderHelpBar();
		fireEvent.click(item("file").querySelector("p") as HTMLElement);
		fireEvent.mouseOver(item("open"));
		expect(status()).toBe("Opens a document.");
		fireEvent.click(item("file").querySelector("p") as HTMLElement);
		expect(item("file")).not.toHaveClass("open");
		expect(status()).toBe("(none)");
	});

	it("gives no status text, and draws no balloon, in a menu that gives none (a bevel pop-up outside a window)", () => {
		activePackage.id = "windows-menus";
		renderHelpBar(false);
		fireEvent.click(item("file").querySelector("p") as HTMLElement);
		fireEvent.mouseOver(item("open"));
		expect(status()).toBe("(none)");
		expect(document.querySelector(".classicyMenuItemBalloonAnchor")).toBeNull();
	});

	it("keeps each item's balloon and gives no status text under a Mac layout", () => {
		renderHelpBar();
		// The title's and its three items' (a closed menu's items are drawn
		// hidden).
		expect(
			document.querySelectorAll(".classicyMenuItemBalloonAnchor"),
		).toHaveLength(4);
		fireEvent.click(item("file").querySelector("p") as HTMLElement);
		fireEvent.mouseOver(item("open"));
		expect(status()).toBe("(none)");
	});
});

// A confirming item (`confirms`: Empty Trash, Reset PRAM, which only open a
// warning alert) takes the ellipsis Mac OS 8 and System 7 wrote, and none
// under `layout.menu.confirmEllipsis` false (Windows 98: WIG Ch.7 "Types of
// Menu Items", pp.107-108; the audit's 1.13). The Special menu's and the
// Trash icon's items carry it.
describe("ClassicyMenu — a confirming item's ellipsis (layout.menu.confirmEllipsis)", () => {
	registerClassicyAppearancePackage({
		id: "system7-menus",
		name: "System 7 menus",
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: "system7-menus-default",
			package: "system7-menus",
		},
		layout: system7.layout as never,
	});
	const titles = () =>
		screen.getAllByRole("menuitem").map((el) => el.textContent);
	const specialMenu = () =>
		render(
			<ClassicyMenu
				name="special"
				menuItems={[
					...classicySpecialMenuItems(vi.fn(), "x"),
					{ id: "trash_empty", title: "Empty Trash", confirms: true },
					{ id: "plain", title: "Erase Disk" },
				]}
			/>,
		);

	it.each([
		["platinum"],
		["system7-menus"],
	])("appends the ellipsis under %s, byte for byte", (id) => {
		activePackage.id = id;
		specialMenu();
		expect(titles()).toEqual([
			"Empty Trash…",
			"Reset PRAM…",
			"Empty Trash…",
			"Erase Disk",
		]);
	});

	it("writes the title as given under the Windows 98 layout", () => {
		activePackage.id = "windows-menus";
		specialMenu();
		expect(titles()).toEqual([
			"Empty Trash",
			"Reset PRAM",
			"Empty Trash",
			"Erase Disk",
		]);
	});

	it("leaves an array with no confirming item, or no ellipsis, as it is", () => {
		const plain = [{ id: "a", title: "A" }];
		expect(withClassicyConfirmEllipsis(plain, true)).toBe(plain);
		const confirming = [{ id: "a", title: "A", confirms: true }];
		expect(withClassicyConfirmEllipsis(confirming, false)).toBe(confirming);
		expect(withClassicyConfirmEllipsis(confirming, true)[0].title).toBe("A…");
		// The caller's item is never changed.
		expect(confirming[0].title).toBe("A");
	});
});

// Windows runs a chosen command at once, with no flash (WIG Ch.4 "Mouse
// Actions", p.24; Ch.7 "Drop-down Menu Interaction", p.97; the audit's 1.19
// / 4.7): the package's MenuItem press class carries a 1 ms animation whose
// end runs the action, long before the 400 ms fallback; with no package
// hook at all the fallback stands, and Platinum flashes.
describe("ClassicyMenu — Windows 98's chosen item (its MenuItem hooks)", () => {
	registerClassicyAppearancePackage({
		id: "windows98-hooks",
		name: "Windows 98 hooks",
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: "windows98-hooks-default",
			package: "windows98-hooks",
		},
		layout: windows98.layout as never,
		hooks: windows98AppearanceHooks,
	});

	it("runs the item's action when its 1 ms animation ends, with no flash", () => {
		vi.useFakeTimers();
		activePackage.id = "windows98-hooks";
		const onClickFunc = vi.fn();
		render(
			<ClassicyMenu
				name="test-menu"
				menuItems={[{ id: "save", title: "Save", onClickFunc }]}
			/>,
		);
		const item = screen.getByRole("menuitem");
		fireEvent.click(item);
		expect(item).toHaveClass("windows98MenuItemChosen");
		expect(item).not.toHaveClass("classicyMenuItemFlash");
		dispatchAnimationEnd(item, "windows98MenuItemChosen");
		// The menu closes, and the action runs on the next frame.
		act(() => {
			vi.advanceTimersByTime(20);
		});
		expect(onClickFunc).toHaveBeenCalledTimes(1);
		expect(item).not.toHaveClass("windows98MenuItemChosen");
		act(() => {
			vi.advanceTimersByTime(600);
		});
		expect(onClickFunc).toHaveBeenCalledTimes(1);
	});

	it("keeps Platinum's flash under Platinum", () => {
		activePackage.id = "platinum";
		render(
			<ClassicyMenu
				name="test-menu"
				menuItems={[{ id: "save", title: "Save", onClickFunc: vi.fn() }]}
			/>,
		);
		const item = screen.getByRole("menuitem");
		fireEvent.click(item);
		expect(item).toHaveClass("classicyMenuItemFlash");
		expect(item).not.toHaveClass("windows98MenuItemChosen");
	});
});
