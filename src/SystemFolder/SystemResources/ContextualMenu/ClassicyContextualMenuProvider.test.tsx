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
import { ClassicyBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp";
import {
	getClassicyContextHelpPopup,
	isClassicyWhatsThisActive,
	resetClassicyWhatsThisForTests,
} from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyWhatsThis.internal";
import {
	type ClassicyContextualMenuOptions,
	ClassicyContextualMenuProvider,
	useClassicyContextualMenu,
} from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import { ClassicyContextualMenuTarget } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget";
import {
	classicyRedirectKeyboardContextMenu,
	isClassicyKeyboardContextMenuEvent,
} from "@/SystemFolder/SystemResources/ContextualMenu/useClassicyContextMenuKey.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { setClassicyTaskbarBand } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

// F1's Help Topics, heard here rather than reduced (the provider's other
// tests dispatch nothing).
const { dispatched } = vi.hoisted(() => ({
	dispatched: [] as { type: string }[],
}));
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	async (importOriginal) => ({
		...(await importOriginal<
			typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")
		>()),
		useAppManagerDispatch: () => (action: { type: string }) =>
			dispatched.push(action),
	}),
);

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

	// Plan 0020-w98 §2 "Menus": a mounted taskbar's band is off the bottom of
	// the box a menu keeps to, so a menu that would run under the taskbar
	// opens above the point instead; with no band it opens below as before.
	it.each([
		[0, 561],
		[28, 361],
	])("keeps a menu above a %i px taskbar band", (band, top) => {
		setClassicyTaskbarBand(band);
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
		// 561 + 200 = 761: inside jsdom's 768 px viewport, past 768 − 28.
		const NearBottomTrigger = () => {
			const { showContextMenu } = useClassicyContextualMenu();
			return (
				<button type="button" onClick={() => showContextMenu(menuA, [10, 560])}>
					show-near-bottom
				</button>
			);
		};
		render(
			<ClassicyContextualMenuProvider>
				<NearBottomTrigger />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-near-bottom"));
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		expect(wrapper.style.top).toBe(`${top}px`);
		rectSpy.mockRestore();
	});

	it("hook is a no-op without a provider", () => {
		render(<Trigger items={menuA} label="show-a" />);
		fireEvent.click(screen.getByText("show-a"));
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
	});
});

// The options a caller opens a menu with (`ClassicyContextualMenuOptions`):
// the Windows shell's window pop-up menu opens with every one of them, and
// with none a menu opens exactly as above.
describe("ClassicyContextualMenuProvider options", () => {
	const items: ClassicyMenuItem[] = [
		{ id: "o1", title: "One" },
		{ id: "o2", title: "Two", disabled: true },
		{ id: "spacer" },
		{ id: "o3", title: "Three" },
	];

	const OptionsTrigger = ({
		options,
	}: {
		options?: ClassicyContextualMenuOptions;
	}) => {
		const { showContextMenu } = useClassicyContextualMenu();
		return (
			<>
				<input aria-label="field" />
				<button
					type="button"
					onClick={() => showContextMenu(items, [100, 100], options)}
				>
					open
				</button>
			</>
		);
	};

	const open = (options?: ClassicyContextualMenuOptions) => {
		render(
			<ClassicyContextualMenuProvider>
				<OptionsTrigger options={options} />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("open"));
	};
	const wrapper = () =>
		document.querySelector<HTMLElement>(".classicyContextMenuWrapper");
	const listItems = () =>
		Array.from(
			document.querySelectorAll<HTMLElement>(".classicyContextMenu > li"),
		);
	const byId = (id: string) => document.getElementById(id) as HTMLElement;

	afterEach(() => {
		vi.useRealTimers();
	});

	it("opens as always with none: Help first, 1 px off the click, the focus kept, Escape and the arrows passing", () => {
		open();
		expect(listItems()[0]).toHaveTextContent("Help");
		expect(wrapper()?.style.left).toBe("101px");
		const focused = document.activeElement;
		expect(fireEvent.keyDown(document.body, { key: "ArrowDown" })).toBe(true);
		expect(document.activeElement).toBe(focused);
		expect(fireEvent.keyDown(document.body, { key: "Escape" })).toBe(true);
		expect(wrapper()).not.toBeNull();
	});

	it("leaves the Help item out with helpItem: false", () => {
		open({ helpItem: false });
		expect(listItems().map((li) => li.textContent)).toEqual([
			"One",
			"Two",
			"Three",
		]);
	});

	it('puts its top-left corner at the point with placement: "corner"', () => {
		open({ placement: "corner" });
		expect(wrapper()?.style.left).toBe("100px");
		expect(wrapper()?.style.top).toBe("100px");
	});

	it("focuses the first item with focusFirstItem, and gives the focus back when it closes", () => {
		render(
			<ClassicyContextualMenuProvider>
				<OptionsTrigger
					options={{ helpItem: false, focusFirstItem: true, keyboard: true }}
				/>
			</ClassicyContextualMenuProvider>,
		);
		const field = screen.getByLabelText("field");
		field.focus();
		// Opened as a key would open it: the field has the focus.
		act(() => {
			(screen.getByText("open") as HTMLButtonElement).click();
		});
		expect(document.activeElement).toBe(byId("o1"));
		fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
		expect(wrapper()).toBeNull();
		expect(document.activeElement).toBe(field);
	});

	it("walks the items, the dimmed one included, on the arrows with keyboard, wrapping at the ends", () => {
		open({ helpItem: false, keyboard: true });
		// None focused: Down takes the first, Up the last.
		expect(fireEvent.keyDown(document.body, { key: "ArrowDown" })).toBe(false);
		expect(document.activeElement).toBe(byId("o1"));
		fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
		expect(document.activeElement).toBe(byId("o2"));
		fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
		expect(document.activeElement).toBe(byId("o3"));
		fireEvent.keyDown(document.activeElement as Element, { key: "ArrowDown" });
		expect(document.activeElement).toBe(byId("o1"));
		fireEvent.keyDown(document.activeElement as Element, { key: "ArrowUp" });
		expect(document.activeElement).toBe(byId("o3"));
	});

	it("keeps the arrows and Escape from everything else, Escape closing it", () => {
		const outer = vi.fn();
		document.addEventListener("keydown", outer);
		open({ helpItem: false, keyboard: true });
		fireEvent.keyDown(document.body, { key: "ArrowUp" });
		expect(document.activeElement).toBe(byId("o3"));
		expect(fireEvent.keyDown(document.body, { key: "Escape" })).toBe(false);
		expect(wrapper()).toBeNull();
		expect(outer).not.toHaveBeenCalled();
		// Closed, it holds nothing.
		fireEvent.keyDown(document.body, { key: "Escape" });
		expect(outer).toHaveBeenCalledTimes(1);
		document.removeEventListener("keydown", outer);
	});

	it("leaves a press on its anchor to the anchor's owner, and closes on any other", () => {
		const Anchored = () => {
			const { showContextMenu } = useClassicyContextualMenu();
			return (
				<button
					type="button"
					onClick={(e) =>
						showContextMenu(items, [100, 100], { anchor: e.currentTarget })
					}
				>
					anchor
				</button>
			);
		};
		render(
			<ClassicyContextualMenuProvider>
				<Anchored />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("anchor"));
		fireEvent.mouseDown(screen.getByText("anchor"));
		expect(wrapper()).not.toBeNull();
		fireEvent.mouseDown(document.body);
		expect(wrapper()).toBeNull();
	});

	it("waits for the keyboard with keyboard, with no idle timeout", () => {
		vi.useFakeTimers();
		open({ keyboard: true });
		act(() => {
			vi.advanceTimersByTime(20000);
		});
		expect(wrapper()).not.toBeNull();
	});

	it("closes after 15 s idle without it, as always", () => {
		vi.useFakeTimers();
		open();
		act(() => {
			vi.advanceTimersByTime(20000);
		});
		expect(wrapper()).toBeNull();
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

// The key opens the focused selection's menu (the remaining chapters'
// audit's 4.17, 11.4 and B.6; WIG Ch.4 "Shortcut Keys", p.28; App. B Tables
// B.2 and B.3): in a file view the selected item's, on the desktop the
// selected icon's, at the center of the item's icon (ReactOS's
// `CDefView::OnContextMenu`, LVIR_ICON); a keyboard-raised `contextmenu`
// with no pointer position goes the same way.
describe("ClassicyContextualMenuProvider — the context-menu keys target the selection (layout.keyboard.contextMenuKey)", () => {
	let restore: () => void;
	beforeEach(() => {
		restore = activateTestWindowsKeysPackage();
	});
	afterEach(() => restore());

	const rectOf = (el: Element, left: number, top: number) =>
		vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
			left,
			top,
			right: left + 40,
			bottom: top + 30,
			width: 40,
			height: 30,
			x: left,
			y: top,
			toJSON: () => ({}),
		} as DOMRect);

	type Heard = { target: string; at: [number, number] };
	const listen = () => {
		const heard: Heard[] = [];
		const onContextMenu = (e: React.MouseEvent) => {
			heard.push({
				target:
					(e.target as Element).getAttribute("data-classicy-file-path") ??
					(e.target as Element).id,
				at: [e.clientX, e.clientY],
			});
		};
		return { heard, onContextMenu };
	};

	it("sends it to a file view's first selected icon, at its image's center, with focus on the view", () => {
		const { heard, onContextMenu } = listen();
		render(
			<ClassicyContextualMenuProvider>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: a stand-in for a file view */}
				<div
					className="classicyFileBrowserFill"
					tabIndex={-1}
					data-testid="view"
					onContextMenu={onContextMenu}
				>
					<div className="classicyIcon" data-classicy-file-path="D:a" />
					<div className="classicyIcon selected" data-classicy-file-path="D:b">
						<div className="classicyIconMaskOuter" data-testid="b-image" />
						<p>b</p>
					</div>
					<div
						className="classicyIcon selected"
						data-classicy-file-path="D:c"
					/>
				</div>
			</ClassicyContextualMenuProvider>,
		);
		const b = document.querySelector(
			'[data-classicy-file-path="D:b"]',
		) as Element;
		rectOf(b, 90, 50);
		// The icon's image, not its label: LVIR_ICON's center.
		rectOf(screen.getByTestId("b-image"), 100, 50);
		const view = screen.getByTestId("view");
		view.focus();
		fireEvent.keyDown(view, { key: "F10", shiftKey: true });
		expect(heard).toEqual([{ target: "D:b", at: [120, 65] }]);
	});

	it("keeps the focused item when it is selected, and takes a list view's selected row", () => {
		const { heard, onContextMenu } = listen();
		render(
			<ClassicyContextualMenuProvider>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: a stand-in for a file view */}
				<div className="classicyFileBrowserFill" onContextMenu={onContextMenu}>
					<table>
						<tbody>
							<tr className="classicyTableRow">
								<td>
									<div data-classicy-file-path="D:a" tabIndex={-1} />
								</td>
							</tr>
							<tr className="classicyTableRow selected">
								<td>
									<div data-classicy-file-path="D:b" tabIndex={-1} />
								</td>
							</tr>
							<tr className="classicyTableRow selected">
								<td>
									<div data-classicy-file-path="D:c" tabIndex={-1} />
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</ClassicyContextualMenuProvider>,
		);
		const item = (path: string) =>
			document.querySelector(
				`[data-classicy-file-path="${path}"]`,
			) as HTMLElement;
		rectOf(item("D:c"), 10, 200);
		item("D:c").focus();
		fireEvent.keyDown(item("D:c"), { key: "ContextMenu" });
		// An unselected focused row: the first selected one.
		rectOf(item("D:b"), 10, 170);
		item("D:a").focus();
		fireEvent.keyDown(item("D:a"), { key: "ContextMenu" });
		expect(heard).toEqual([
			{ target: "D:c", at: [30, 215] },
			{ target: "D:b", at: [30, 185] },
		]);
	});

	it("leaves the view's white space its own menu with nothing selected, and a text field its own", () => {
		const { heard, onContextMenu } = listen();
		render(
			<ClassicyContextualMenuProvider>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: a stand-in for a file view */}
				<div
					className="classicyFileBrowserFill"
					id="view"
					tabIndex={-1}
					onContextMenu={onContextMenu}
				>
					<div className="classicyIcon" data-classicy-file-path="D:a" />
					<div className="classicyIcon selected" data-classicy-file-path="D:b">
						<input aria-label="rename" id="rename" />
					</div>
				</div>
			</ClassicyContextualMenuProvider>,
		);
		const field = screen.getByLabelText("rename");
		rectOf(field, 20, 20);
		field.focus();
		fireEvent.keyDown(field, { key: "ContextMenu" });
		document.querySelector(".selected")?.classList.remove("selected");
		const view = document.getElementById("view") as HTMLElement;
		rectOf(view, 0, 0);
		view.focus();
		fireEvent.keyDown(view, { key: "ContextMenu" });
		// The field at its center (Windows' edit control), the white space at
		// the view's.
		expect(heard).toEqual([
			{ target: "rename", at: [40, 35] },
			{ target: "view", at: [20, 15] },
		]);
	});

	it("sends it, with the desktop focused, to its first selected icon at the icon's center, never one in a window", () => {
		const { heard, onContextMenu } = listen();
		render(
			// biome-ignore lint/a11y/noStaticElementInteractions: a stand-in for the desktop
			<div id="classicyDesktop" tabIndex={-1} onContextMenu={onContextMenu}>
				<ClassicyContextualMenuProvider>
					<div className="classicyWindow">
						<div className="classicyDesktopIcon selected" id="inWindow" />
					</div>
					<div className="classicyDesktopIcon" id="trash" />
					<div className="classicyDesktopIcon selected" id="drive" />
				</ClassicyContextualMenuProvider>
			</div>,
		);
		rectOf(document.getElementById("drive") as Element, 500, 40);
		const desktop = document.getElementById("classicyDesktop") as HTMLElement;
		desktop.focus();
		fireEvent.keyDown(desktop, { key: "F10", shiftKey: true });
		expect(heard).toEqual([{ target: "drive", at: [520, 55] }]);
	});

	it("takes a keyboard-raised contextmenu with no pointer position and sends it the same way", () => {
		const desktop = document.createElement("div");
		desktop.id = "classicyDesktop";
		const target = document.createElement("div");
		desktop.append(target);
		document.body.append(desktop);
		try {
			const open = vi.fn(() => true);
			const keyboardRaised = new MouseEvent("contextmenu", {
				bubbles: true,
				cancelable: true,
			});
			target.addEventListener("contextmenu", (e) =>
				classicyRedirectKeyboardContextMenu(e, open, desktop),
			);
			target.dispatchEvent(keyboardRaised);
			expect(keyboardRaised.defaultPrevented).toBe(true);
			expect(open).toHaveBeenCalledTimes(1);
			// A pointer's, with a position or a button, is left alone.
			const pointer = new MouseEvent("contextmenu", {
				bubbles: true,
				cancelable: true,
				clientX: 5,
				clientY: 5,
				button: 2,
			});
			target.dispatchEvent(pointer);
			expect(pointer.defaultPrevented).toBe(false);
			expect(open).toHaveBeenCalledTimes(1);
			expect(
				isClassicyKeyboardContextMenuEvent(
					new MouseEvent("contextmenu", { button: 2, detail: 1 }),
				),
			).toBe(false);
		} finally {
			desktop.remove();
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

// Context-sensitive Help (the WIG audit's 12.2-12.4 / B.5; WIG Ch.12
// "Context-Sensitive Help", pp.273-275, Figure 12.4; App. B Table B.2,
// p.358) under the package's `balloonHelp.contextHelp` "whatsThis" (Windows
// 98): F1 shows the focused element's help below it, else Help Topics;
// Shift+F1 starts What's This? on the active window; and a right-click on a
// described control in a window that opens no menu of its own shows a menu
// holding "What's This?". Under any other package none of it.
describe("ClassicyContextualMenuProvider — F1, Shift+F1 and What's This? (layout.balloonHelp.contextHelp)", () => {
	afterEach(() => {
		resetClassicyWhatsThisForTests();
		resetClassicyAppearancePackagesForTests();
		dispatched.length = 0;
	});
	const useWindowsLayout = () =>
		registerClassicyAppearancePackage({
			id: "windows-help",
			name: "Windows help",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-help-default",
				package: "windows-help",
			},
			layout: windows98Layout as never,
		});
	const openMenu = () =>
		document.querySelector(".classicyContextMenuWrapper")?.textContent ?? null;
	const settle = () =>
		act(() => new Promise((resolve) => setTimeout(resolve, 0)));
	const renderDesk = () =>
		render(
			<ClassicyContextualMenuProvider>
				<div id="classicyDesktop" className="classicyDesktop">
					<div className="classicyWindow active" data-testid="window">
						<ClassicyBalloonHelp content="Adjusts the speed.">
							<button type="button">described</button>
						</ClassicyBalloonHelp>
						<ClassicyBalloonHelp content="Has a menu.">
							<ClassicyContextualMenuTarget menuItems={menuA}>
								<button type="button">targeted</button>
							</ClassicyContextualMenuTarget>
						</ClassicyBalloonHelp>
						<button type="button">plain</button>
					</div>
					<ClassicyBalloonHelp content="On the desktop.">
						<button type="button">loose</button>
					</ClassicyBalloonHelp>
				</div>
				<button type="button">elsewhere</button>
			</ClassicyContextualMenuProvider>,
		);

	it("binds neither key and adds no menu without the key", async () => {
		renderDesk();
		const described = screen.getByText("described");
		described.focus();
		expect(fireEvent.keyDown(described, { key: "F1" })).toBe(true);
		expect(fireEvent.keyDown(described, { key: "F1", shiftKey: true })).toBe(
			true,
		);
		expect(getClassicyContextHelpPopup()).toBeNull();
		expect(isClassicyWhatsThisActive()).toBe(false);
		expect(dispatched).toEqual([]);
		fireEvent.contextMenu(described, { clientX: 10, clientY: 10 });
		await settle();
		expect(openMenu()).toBeNull();
	});

	it("F1 shows the focused element's help below it, taking the key", () => {
		useWindowsLayout();
		renderDesk();
		const described = screen.getByText("described");
		described.focus();
		expect(fireEvent.keyDown(described, { key: "F1" })).toBe(false);
		const popup = getClassicyContextHelpPopup();
		expect(popup?.help.content).toBe("Adjusts the speed.");
		expect(popup?.placement.kind).toBe("below");
		expect(
			document.querySelector(".classicyBalloonHelpContext"),
		).toHaveTextContent("Adjusts the speed.");
		expect(dispatched).toEqual([]);
	});

	it("F1 with nothing described focused opens Help Topics", () => {
		useWindowsLayout();
		renderDesk();
		const plain = screen.getByText("plain");
		plain.focus();
		expect(fireEvent.keyDown(plain, { key: "F1" })).toBe(false);
		expect(dispatched).toEqual([{ type: "ClassicyAppAppleGuideShowTopics" }]);
		expect(getClassicyContextHelpPopup()).toBeNull();
		// Focus on nothing at all: the same.
		plain.blur();
		expect(fireEvent.keyDown(document.body, { key: "F1" })).toBe(false);
		expect(dispatched).toHaveLength(2);
	});

	it("leaves F1 alone outside the desktop, with a modifier, or already taken; takes a repeat but does nothing", () => {
		useWindowsLayout();
		renderDesk();
		const elsewhere = screen.getByText("elsewhere");
		elsewhere.focus();
		expect(fireEvent.keyDown(elsewhere, { key: "F1" })).toBe(true);
		const described = screen.getByText("described");
		described.focus();
		expect(fireEvent.keyDown(described, { key: "F1", ctrlKey: true })).toBe(
			true,
		);
		const taken = (e: KeyboardEvent) => e.preventDefault();
		described.addEventListener("keydown", taken);
		fireEvent.keyDown(described, { key: "F1" });
		described.removeEventListener("keydown", taken);
		expect(getClassicyContextHelpPopup()).toBeNull();
		expect(fireEvent.keyDown(described, { key: "F1", repeat: true })).toBe(
			false,
		);
		expect(getClassicyContextHelpPopup()).toBeNull();
		expect(dispatched).toEqual([]);
	});

	it("Shift+F1 starts What's This? on the active window, and ends it again", () => {
		useWindowsLayout();
		renderDesk();
		const plain = screen.getByText("plain");
		plain.focus();
		expect(fireEvent.keyDown(plain, { key: "F1", shiftKey: true })).toBe(false);
		expect(isClassicyWhatsThisActive()).toBe(true);
		fireEvent.keyDown(plain, { key: "F1", shiftKey: true });
		expect(isClassicyWhatsThisActive()).toBe(false);
	});

	it("a right-click on a described control in a window with no menu shows What's This?, which shows its help at the click", async () => {
		useWindowsLayout();
		renderDesk();
		fireEvent.contextMenu(screen.getByText("described"), {
			clientX: 30,
			clientY: 40,
		});
		await settle();
		const items = [...document.querySelectorAll(".classicyContextMenu > li")];
		expect(items.map((item) => item.textContent)).toEqual(["What's This?"]);
		// user.exe's "&What's This?": W underlined.
		expect(
			items[0]?.querySelector("[data-classicy-part=access-key]"),
		).toHaveTextContent("W");
		// The item runs once its flash is over (no package flash here: the
		// 400 ms fallback).
		fireEvent.click(items[0] as Element);
		await act(() => new Promise((resolve) => setTimeout(resolve, 450)));
		const popup = getClassicyContextHelpPopup();
		expect(popup?.help.content).toBe("Adjusts the speed.");
		expect(popup?.placement).toEqual({ kind: "point", at: [30, 40] });
	});

	it("answers a right-click once with two providers mounted", async () => {
		useWindowsLayout();
		renderDesk();
		render(
			<ClassicyContextualMenuProvider>
				<span>second desktop</span>
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.contextMenu(screen.getByText("described"), {
			clientX: 30,
			clientY: 40,
		});
		await settle();
		expect(
			document.querySelectorAll(".classicyContextMenuWrapper"),
		).toHaveLength(1);
	});

	it("leaves a control's own menu alone, and adds none outside a window or with no help", async () => {
		useWindowsLayout();
		renderDesk();
		fireEvent.contextMenu(screen.getByText("targeted"), {
			clientX: 5,
			clientY: 5,
		});
		await settle();
		expect(openMenu()).toContain("Alpha One");
		expect(openMenu()).not.toContain("What's This?");
		act(() => {
			fireEvent.mouseDown(document.body);
		});
		for (const label of ["loose", "plain"]) {
			fireEvent.contextMenu(screen.getByText(label), {
				clientX: 5,
				clientY: 5,
			});
			await settle();
			expect(openMenu(), label).toBeNull();
		}
	});
});
