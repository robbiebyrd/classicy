import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
// The Windows-layout package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import {
	ClassicyContextualMenuProvider,
	useClassicyContextualMenu,
} from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import { ClassicyContextualMenuTarget } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

const windows98Layout = windows98.layout;

const menuA: ClassicyMenuItem[] = [{ id: "a1", title: "Alpha One" }];
const menuB: ClassicyMenuItem[] = [{ id: "b1", title: "Beta One" }];

const Trigger = ({
	items,
	label,
}: {
	items: ClassicyMenuItem[];
	label: string;
}) => {
	const { showContextMenu, hideContextMenu } = useClassicyContextualMenu();
	return (
		<>
			<button type="button" onClick={() => showContextMenu(items, [100, 100])}>
				{label}
			</button>
			<button type="button" onClick={() => hideContextMenu()}>
				hide-{label}
			</button>
		</>
	);
};

describe("ClassicyContextualMenuProvider", () => {
	it("shows the menu when showContextMenu is called", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
		fireEvent.click(screen.getByText("show-a"));
		expect(screen.getByText("Alpha One")).toBeInTheDocument();
	});

	it("replaces an open menu when showContextMenu is called again", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
				<Trigger items={menuB} label="show-b" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		fireEvent.click(screen.getByText("show-b"));
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
		expect(screen.getByText("Beta One")).toBeInTheDocument();
	});

	it("hides the menu when hideContextMenu is called", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		fireEvent.click(screen.getByText("hide-show-a"));
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
	});

	it("hides the menu on outside mousedown (existing ClassicyContextualMenu behavior)", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		fireEvent.mouseDown(document.body);
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
	});

	it("applies the HIG +1px down-right click offset to the menu position", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		// clickAt [100,100] + [1,1] offset
		expect(wrapper.style.left).toBe("101px");
		expect(wrapper.style.top).toBe("101px");
	});

	it("injects a disabled Help item as the first item when none is supplied", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		const items = Array.from(
			document.querySelectorAll(".classicyContextMenu > li"),
		);
		expect(items[0]).toHaveTextContent("Help");
		expect(items[0]).toHaveClass("disabled");
		// The caller's own items still render after Help.
		expect(screen.getByText("Alpha One")).toBeInTheDocument();
	});

	it("does not inject a second Help item when the caller supplied one", () => {
		const withHelp: ClassicyMenuItem[] = [
			{ id: "help", title: "Help", disabled: true },
			{ id: "x1", title: "Extra One" },
		];
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={withHelp} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		expect(screen.getAllByText("Help")).toHaveLength(1);
	});

	it("flips the root menu leftward when it would overflow the right edge", () => {
		const rectSpy = vi
			.spyOn(Element.prototype, "getBoundingClientRect")
			.mockReturnValue({
				width: 300,
				height: 0,
				top: 0,
				bottom: 0,
				left: 0,
				right: 0,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			} as DOMRect);
		const WideTrigger = () => {
			const { showContextMenu } = useClassicyContextualMenu();
			return (
				<button
					type="button"
					onClick={() => showContextMenu(menuA, [window.innerWidth - 5, 100])}
				>
					show-wide
				</button>
			);
		};
		render(
			<ClassicyContextualMenuProvider>
				<WideTrigger />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-wide"));
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		// left was innerWidth-5+1; with a 300px menu overflowing, it flips to
		// (clickX - width), clamped to >= 0.
		const expected = Math.max(0, window.innerWidth - 5 + 1 - 300);
		expect(wrapper.style.left).toBe(`${expected}px`);
		rectSpy.mockRestore();
	});

	it("flips the root menu upward when it would overflow the bottom edge", () => {
		const rectSpy = vi
			.spyOn(Element.prototype, "getBoundingClientRect")
			.mockReturnValue({
				width: 100,
				height: 200,
				top: 0,
				bottom: 0,
				left: 0,
				right: 0,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			} as DOMRect);
		const LowTrigger = () => {
			const { showContextMenu } = useClassicyContextualMenu();
			return (
				<button
					type="button"
					onClick={() => showContextMenu(menuA, [10, window.innerHeight - 5])}
				>
					show-low
				</button>
			);
		};
		render(
			<ClassicyContextualMenuProvider>
				<LowTrigger />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-low"));
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		// top was innerHeight-5+1; a 200px menu overflows, so it opens above
		// the click: (clickY - height), clamped to >= 0.
		const expected = Math.max(0, window.innerHeight - 5 + 1 - 200);
		expect(wrapper.style.top).toBe(`${expected}px`);
		expect(wrapper.style.left).toBe("11px");
		rectSpy.mockRestore();
	});

	it("hook is a no-op without a provider", () => {
		render(<Trigger items={menuA} label="show-a" />);
		fireEvent.click(screen.getByText("show-a"));
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
	});
});

// Mac OS 8's and System 7's contextual menus open from a Control-click or a
// right-click alone and close as sticky menus do (HIGOS8 "Contextual Menus",
// pp.93-94): with no `layout.keyboard.contextMenuKey` and no `layout.menu.keys`
// (no package registered here: the core's default layout, Mac OS 8's), neither
// key opens one, and Escape closes none.
describe("ClassicyContextualMenuProvider — the keyboard under Mac OS (no layout flags)", () => {
	it("opens no menu on Shift+F10 or the Application key, and leaves both keys to the browser", () => {
		render(
			<ClassicyContextualMenuProvider>
				<ClassicyContextualMenuTarget menuItems={menuA}>
					<button type="button">field</button>
				</ClassicyContextualMenuTarget>
			</ClassicyContextualMenuProvider>,
		);
		const field = screen.getByText("field");
		field.focus();
		expect(fireEvent.keyDown(field, { key: "F10", shiftKey: true })).toBe(true);
		expect(fireEvent.keyDown(field, { key: "ContextMenu" })).toBe(true);
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
		// The browser's own contextmenu for the key is not swallowed either.
		expect(fireEvent.contextMenu(field, { clientX: 5, clientY: 5 })).toBe(
			false,
		);
		expect(screen.getByText("Alpha One")).toBeInTheDocument();
	});

	it("keeps an open menu on Escape", () => {
		render(
			<ClassicyContextualMenuProvider>
				<ClassicyContextualMenuTarget menuItems={menuA}>
					<button type="button">field</button>
				</ClassicyContextualMenuTarget>
			</ClassicyContextualMenuProvider>,
		);
		const field = screen.getByText("field");
		fireEvent.contextMenu(field, { clientX: 5, clientY: 5 });
		field.focus();
		expect(fireEvent.keyDown(field, { key: "Escape" })).toBe(true);
		expect(screen.getByText("Alpha One")).toBeInTheDocument();
	});
});

// Shift+F10 and the Application key open the selection's contextual menu
// (WIG Ch.7 "Pop-up Menu Interaction", p.101; the audit's 7.9) under the
// package's `layout.keyboard.contextMenuKey` (Windows 98): the focused
// element gets a `contextmenu` of its own, at its center, so the targets a
// right-click reaches resolve it, innermost first. Under `layout.menu.keys`
// "windows", Escape closes the open menu (7.8), focus outside it or in it.
describe("ClassicyContextualMenuProvider — the keyboard's context-menu keys (layout.keyboard.contextMenuKey)", () => {
	let restore: () => void;
	beforeEach(() => {
		restore = activateTestWindowsKeysPackage();
	});
	afterEach(() => restore());

	const wrapper = () =>
		document.querySelector(".classicyContextMenuWrapper") as HTMLElement | null;
	const atRect = (el: Element, rect: Partial<DOMRect>) =>
		vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
			left: 0,
			top: 0,
			right: 0,
			bottom: 0,
			width: 0,
			height: 0,
			x: 0,
			y: 0,
			toJSON: () => ({}),
			...rect,
		} as DOMRect);

	const renderTarget = () =>
		render(
			<ClassicyContextualMenuProvider>
				<ClassicyContextualMenuTarget menuItems={menuA}>
					<button type="button">field</button>
				</ClassicyContextualMenuTarget>
				<button type="button">elsewhere</button>
			</ClassicyContextualMenuProvider>,
		);

	it("opens the focused target's menu on Shift+F10, at its center", () => {
		renderTarget();
		const field = screen.getByText("field");
		atRect(field, { left: 40, top: 20, right: 80, bottom: 40 });
		field.focus();
		const key = new KeyboardEvent("keydown", {
			key: "F10",
			shiftKey: true,
			bubbles: true,
			cancelable: true,
		});
		act(() => {
			field.dispatchEvent(key);
		});
		expect(key.defaultPrevented).toBe(true);
		expect(screen.getByText("Alpha One")).toBeInTheDocument();
		// The center [60, 30], then the HIG's 1 px down and right.
		expect(wrapper()?.style.left).toBe("61px");
		expect(wrapper()?.style.top).toBe("31px");
	});

	it("opens it on the Application key too, and on neither for F10 alone, a modified key or a key already taken", () => {
		renderTarget();
		const field = screen.getByText("field");
		field.focus();
		fireEvent.keyDown(field, { key: "F10" });
		fireEvent.keyDown(field, { key: "F10", shiftKey: true, ctrlKey: true });
		fireEvent.keyDown(field, { key: "ContextMenu", altKey: true });
		const taken = new KeyboardEvent("keydown", {
			key: "ContextMenu",
			bubbles: true,
			cancelable: true,
		});
		taken.preventDefault();
		act(() => {
			field.dispatchEvent(taken);
		});
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
		fireEvent.keyDown(field, { key: "ContextMenu" });
		expect(screen.getByText("Alpha One")).toBeInTheDocument();
	});

	it("sends it, with focus on nothing in particular, to where the pointer last went down, at that point", () => {
		renderTarget();
		const field = screen.getByText("field");
		fireEvent.mouseDown(field, { clientX: 12, clientY: 34 });
		(document.activeElement as HTMLElement | null)?.blur();
		fireEvent.keyDown(document.body, { key: "F10", shiftKey: true });
		expect(screen.getByText("Alpha One")).toBeInTheDocument();
		expect(wrapper()?.style.left).toBe("13px");
		expect(wrapper()?.style.top).toBe("35px");
	});

	it("leaves keys outside the desktop alone", () => {
		render(
			<>
				<div id="classicyDesktop">
					<ClassicyContextualMenuProvider>
						<ClassicyContextualMenuTarget menuItems={menuA}>
							<button type="button">inside</button>
						</ClassicyContextualMenuTarget>
					</ClassicyContextualMenuProvider>
				</div>
				<button type="button">host</button>
			</>,
		);
		const host = screen.getByText("host");
		host.focus();
		const key = new KeyboardEvent("keydown", {
			key: "ContextMenu",
			bubbles: true,
			cancelable: true,
		});
		act(() => {
			host.dispatchEvent(key);
		});
		expect(key.defaultPrevented).toBe(false);
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
		screen.getByText("inside").focus();
		fireEvent.keyDown(screen.getByText("inside"), { key: "ContextMenu" });
		expect(screen.getByText("Alpha One")).toBeInTheDocument();
	});

	it("closes the open menu on Escape, with focus outside it or in it", () => {
		renderTarget();
		const field = screen.getByText("field");
		fireEvent.contextMenu(field, { clientX: 5, clientY: 5 });
		expect(screen.getByText("Alpha One")).toBeInTheDocument();
		field.focus();
		fireEvent.keyDown(field, { key: "Escape" });
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
		// Opened from the keyboard and entered with Down, Escape closes it
		// and gives focus back to the target.
		fireEvent.keyDown(field, { key: "ContextMenu" });
		fireEvent.keyDown(field, { key: "ArrowDown" });
		expect(screen.getByText("Alpha One").closest("li")).toHaveFocus();
		fireEvent.keyDown(document.activeElement as HTMLElement, {
			key: "Escape",
		});
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
		expect(field).toHaveFocus();
	});

	it("gives focus back to the target when an item chosen from the keyboard closes the menu", () => {
		vi.useFakeTimers();
		try {
			renderTarget();
			const field = screen.getByText("field");
			field.focus();
			fireEvent.keyDown(field, { key: "ContextMenu" });
			fireEvent.keyDown(field, { key: "ArrowDown" });
			const alpha = screen.getByText("Alpha One").closest("li") as HTMLElement;
			expect(alpha).toHaveFocus();
			fireEvent.keyDown(alpha, { key: "Enter" });
			act(() => {
				vi.advanceTimersByTime(450);
			});
			expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
			expect(field).toHaveFocus();
		} finally {
			vi.useRealTimers();
		}
	});
});

// Under a package whose layout says `contextMenu.openOn: "release"` (Windows
// 98; WIG Ch.5 "Selection with the Mouse", p.38; Ch.7 "Pop-up Menu
// Interaction", p.101) a menu asked for while button 2 is down opens at its
// release; under any other it opens at the call (Mac OS 8's Control-press).
describe("ClassicyContextualMenuProvider — menus at button 2's release (layout.contextMenu.openOn)", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());
	// The open menu's text (the Windows layout underlines access keys, so a
	// title is split across elements), or null with none open.
	const openMenu = () =>
		document.querySelector(".classicyContextMenuWrapper")?.textContent ?? null;
	const useReleaseLayout = () =>
		registerClassicyAppearancePackage({
			id: "windows-release",
			name: "Windows release",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-release-default",
				package: "windows-release",
			},
			layout: windows98Layout as never,
		});
	const renderTargets = () =>
		render(
			<ClassicyContextualMenuProvider>
				<ClassicyContextualMenuTarget menuItems={menuA}>
					<button type="button">first</button>
				</ClassicyContextualMenuTarget>
				<ClassicyContextualMenuTarget menuItems={menuB}>
					<button type="button">second</button>
				</ClassicyContextualMenuTarget>
				<Trigger items={menuB} label="show-b" />
			</ClassicyContextualMenuProvider>,
		);

	it("opens at the call without the key, as a macOS host raises it at the press", () => {
		renderTargets();
		const first = screen.getByText("first");
		fireEvent.mouseDown(first, { button: 2 });
		fireEvent.contextMenu(first, { button: 2 });
		expect(openMenu()).toContain("Alpha One");
	});

	it("holds a menu asked for while button 2 is down, and opens it at the release", () => {
		useReleaseLayout();
		renderTargets();
		const first = screen.getByText("first");
		fireEvent.mouseDown(first, { button: 2 });
		fireEvent.contextMenu(first, { button: 2 });
		expect(openMenu() ?? "").not.toContain("Alpha One");
		// Another button's release is not button 2's.
		fireEvent.mouseUp(first, { button: 0 });
		expect(openMenu() ?? "").not.toContain("Alpha One");
		fireEvent.mouseUp(first, { button: 2 });
		expect(openMenu()).toContain("Alpha One");
	});

	it("opens at once when the event comes after the release, as a Windows host raises it", () => {
		useReleaseLayout();
		renderTargets();
		const first = screen.getByText("first");
		fireEvent.mouseDown(first, { button: 2 });
		fireEvent.mouseUp(first, { button: 2 });
		fireEvent.contextMenu(first, { button: 2 });
		expect(openMenu()).toContain("Alpha One");
	});

	it("holds a macOS host's Control-click menu for that press's release too", () => {
		useReleaseLayout();
		renderTargets();
		const first = screen.getByText("first");
		fireEvent.mouseDown(first, { button: 0, ctrlKey: true });
		fireEvent.contextMenu(first, { button: 0, ctrlKey: true });
		expect(openMenu() ?? "").not.toContain("Alpha One");
		fireEvent.mouseUp(first, { button: 0, ctrlKey: true });
		expect(openMenu()).toContain("Alpha One");
	});

	it("lets a newer call replace the held menu", () => {
		useReleaseLayout();
		renderTargets();
		const first = screen.getByText("first");
		fireEvent.mouseDown(first, { button: 2 });
		fireEvent.contextMenu(first, { button: 2 });
		fireEvent.contextMenu(screen.getByText("second"), { button: 2 });
		fireEvent.mouseUp(first, { button: 2 });
		expect(openMenu() ?? "").not.toContain("Alpha One");
		expect(openMenu()).toContain("Beta One");
	});

	it.each([
		["window blur", () => fireEvent.blur(window)],
		["pointercancel", () => fireEvent.pointerCancel(document)],
	])("drops the held menu when the pointer stream is lost (%s)", (_, lose) => {
		useReleaseLayout();
		renderTargets();
		const first = screen.getByText("first");
		fireEvent.mouseDown(first, { button: 2 });
		fireEvent.contextMenu(first, { button: 2 });
		act(() => lose());
		fireEvent.mouseUp(first, { button: 2 });
		expect(openMenu() ?? "").not.toContain("Alpha One");
		// The next call is no longer held: no button is down.
		fireEvent.click(screen.getByText("show-b"));
		expect(openMenu()).toContain("Beta One");
	});

	it("drops the held menu on hideContextMenu", () => {
		useReleaseLayout();
		renderTargets();
		const first = screen.getByText("first");
		fireEvent.mouseDown(first, { button: 2 });
		fireEvent.contextMenu(first, { button: 2 });
		fireEvent.click(screen.getByText("hide-show-b"));
		fireEvent.mouseUp(first, { button: 2 });
		expect(openMenu() ?? "").not.toContain("Alpha One");
	});
});
