import { produce } from "immer";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchAnimationEnd } from "@/__tests__/animationEnd";
import {
	act,
	cleanup,
	fireEvent,
	render,
	waitFor,
} from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_SYSTEM_MENU_LAYOUT,
	TEST_SYSTEM_MENU_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { isClassicyWindowKeyboardModeActive } from "@/SystemFolder/SystemResources/Window/ClassicyWindowKeyboardMove.internal";
import {
	type ClassicyWindowCommand,
	runClassicyWindowCommand,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal";
import type { ClassicyWindowSystemMenuCommand } from "@/SystemFolder/SystemResources/Window/ClassicyWindowSystemMenu";
import { useClassicyWindowShellKeys } from "@/SystemFolder/SystemResources/Window/useClassicyWindowShellKeys.internal";

// Plan 0020-w98 §5, "The window pop-up (system) menu": under a layout that
// declares `window.systemMenu: true` (Windows 98) a right-click on the title
// bar, a press on its icon, ALT+SPACE and the registry's `systemMenu`
// command open the window pop-up menu (WIG Ch.6 "Title Bars", "Title Bar
// Icons", "Title Bar Buttons", pp.76-80; Ch.7 "The Window Pop-up Menu",
// p.102), and a double-click on the icon and ALT+F4 close the window. Under
// every other layout the icon is inert and nothing is bound. The window runs
// on the real store and reducer.

const track = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => vi.fn() }),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track, page: vi.fn() }),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
	() => ({}),
);

const APP = "Sys.app";
const VIEWPORT: [number, number] = [1024, 768];
// The window's frame, 4 px a side, and its caption, 18 px tall, inside it.
const FRAME = 4;
const CAPTION = 18;
const CHROME = 2 * FRAME;
const LEFT = 50;
const TOP = 200;
const WIDTH = 400;
const HEIGHT = 300;

// jsdom lays nothing out: a window's rect is its inline geometry plus its
// frame, and its title bar is the caption inside the frame at its top.
const windowRectOf = (el: HTMLElement) => {
	const left = Number.parseFloat(el.style.left) || 0;
	const top = Number.parseFloat(el.style.top) || 0;
	const width = (Number.parseFloat(el.style.width) || 0) + CHROME;
	const height = (Number.parseFloat(el.style.height) || 0) + CHROME;
	return { left, top, width, height };
};
const rect = (left: number, top: number, width: number, height: number) =>
	({
		left,
		top,
		right: left + width,
		bottom: top + height,
		width,
		height,
		x: left,
		y: top,
		toJSON: () => {},
	}) as DOMRect;
const rectOf = (el: HTMLElement): DOMRect => {
	if (el.classList.contains("classicyWindow")) {
		const r = windowRectOf(el);
		return rect(r.left, r.top, r.width, r.height);
	}
	if (
		el.classList.contains("classicyWindowTitleBar") &&
		el.parentElement?.classList.contains("classicyWindow")
	) {
		const r = windowRectOf(el.parentElement);
		return rect(r.left + FRAME, r.top + FRAME, r.width - CHROME, CAPTION);
	}
	return rect(0, 0, 0, 0);
};

const record = (id = "main") =>
	getAppWindow(
		useAppManager.getState().System.Manager.Applications.apps[APP],
		id,
	);
const root = (id = "main") =>
	document.getElementById(`${APP}_${id}`) as HTMLElement;
const titleBar = (id = "main") =>
	root(id).querySelector(":scope > .classicyWindowTitleBar") as HTMLElement;
const icon = (id = "main") =>
	root(id).querySelector(".classicyWindowIcon") as HTMLElement;
const menu = () =>
	document.querySelector<HTMLElement>(".classicyContextMenuWrapper");
const items = () =>
	Array.from(
		menu()?.querySelectorAll<HTMLLIElement>("li.classicyMenuItem") ?? [],
	);
// Each item's title, `!` before a dimmed one.
const menuTitles = () =>
	items().map(
		(li) =>
			`${li.classList.contains("disabled") ? "!" : ""}${li.querySelector(":scope > p")?.textContent ?? ""}`,
	);
const item = (command: ClassicyWindowSystemMenuCommand, id = "main") =>
	document.getElementById(`${APP}_${id}_system_${command}`) as HTMLLIElement;

// Chooses an item as a click does: its flash ends, the menu closes and the
// item's action runs on the next frame, which `until` waits for.
const choose = async (
	command: ClassicyWindowSystemMenuCommand,
	until: () => void,
	id = "main",
) => {
	const li = item(command, id);
	fireEvent.click(li);
	dispatchAnimationEnd(li);
	expect(menu()).toBeNull();
	await waitFor(until);
};

const run = (command: ClassicyWindowCommand, id = "main") => {
	let result = false;
	act(() => {
		result = runClassicyWindowCommand(APP, id, command);
	});
	return result;
};

const altSpace = (target: Element = document.body) =>
	fireEvent.keyDown(target, { key: " ", code: "Space", altKey: true });
const altF4 = (target: Element = document.body) =>
	fireEvent.keyDown(target, { key: "F4", code: "F4", altKey: true });

const ShellKeys = ({ enabled }: { enabled: boolean }) => {
	useClassicyWindowShellKeys(enabled);
	return null;
};

const sysWindow = (
	props: Partial<Parameters<typeof ClassicyWindow>[0]> = {},
) => (
	<ClassicyWindow
		id="main"
		appId={APP}
		title="Main"
		initialSize={[WIDTH, HEIGHT]}
		initialPosition={[LEFT, TOP]}
		minimumSize={[0, 0]}
		style={{ padding: `${FRAME}px` }}
		{...props}
	>
		{props.children ?? <p>main content</p>}
	</ClassicyWindow>
);

const renderShell = (windows: ReactNode, keys = true) =>
	render(
		<ClassicyContextualMenuProvider>
			<ShellKeys enabled={keys} />
			{windows}
		</ClassicyContextualMenuProvider>,
	);

const usePackage = (id: string) =>
	act(() =>
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId: id }),
	);

const windowMenu: ClassicyMenuItem[] = [{ id: "w1", title: "Window Item" }];

describe("ClassicyWindow's window pop-up menu", () => {
	let rectSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		localStorage.clear();
		track.mockClear();
		Object.assign(window, {
			innerWidth: VIEWPORT[0],
			innerHeight: VIEWPORT[1],
		});
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		act(() =>
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Applications.apps[APP] = {
						id: APP,
						name: "Sys",
						icon: "",
						windows: {},
						open: true,
						data: {},
					};
				}),
			),
		);
		rectSpy = vi
			.spyOn(Element.prototype, "getBoundingClientRect")
			.mockImplementation(function (this: Element) {
				return rectOf(this as HTMLElement);
			});
	});

	afterEach(() => {
		cleanup();
		rectSpy.mockRestore();
		unregisterClassicyAppearancePackage(TEST_SYSTEM_MENU_PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	describe("under a layout without the system menu (the default)", () => {
		it("keeps the icon inert: a press arms a move and opens nothing, a double-click closes nothing", () => {
			renderShell(sysWindow(), false);
			fireEvent.mouseDown(icon(), {
				button: 0,
				detail: 1,
				clientX: 60,
				clientY: 210,
			});
			expect(menu()).toBeNull();
			// The press is the title bar's: past the drag threshold it moves.
			fireEvent.mouseMove(document.body, { clientX: 80, clientY: 230 });
			expect(record()?.moving).toBe(true);
			fireEvent.mouseUp(document.body, { clientX: 80, clientY: 230 });
			fireEvent.doubleClick(icon());
			expect(record()?.closed).toBe(false);
			expect(menu()).toBeNull();
		});

		it("shows the window's own contextual menu on a right-click on the title bar", () => {
			renderShell(sysWindow({ contextMenu: windowMenu }), false);
			fireEvent.contextMenu(titleBar(), { clientX: 100, clientY: 210 });
			expect(menuTitles()).toEqual(["!Help", "Window Item"]);
		});

		it("refuses the systemMenu command", () => {
			renderShell(sysWindow(), false);
			expect(run({ type: "systemMenu" })).toBe(false);
			expect(run({ type: "systemMenu", at: [10, 20] })).toBe(false);
			expect(menu()).toBeNull();
		});

		it("binds no key: ALT+SPACE and ALT+F4 reach the page", () => {
			renderShell(sysWindow(), false);
			expect(record()?.focused).toBe(true);
			expect(altSpace()).toBe(true);
			expect(altF4()).toBe(true);
			expect(menu()).toBeNull();
			expect(record()?.closed).toBe(false);
		});
	});

	describe("under window.systemMenu: true (Windows 98's window layout)", () => {
		beforeEach(() => {
			registerTestTaskbarPackage(
				TEST_SYSTEM_MENU_LAYOUT,
				TEST_SYSTEM_MENU_PACKAGE_ID,
			);
			usePackage(TEST_SYSTEM_MENU_PACKAGE_ID);
		});

		describe("the title bar's right-click", () => {
			it("shows the window pop-up menu at the pointer, with no Help item", () => {
				renderShell(sysWindow({ contextMenu: windowMenu }));
				fireEvent.contextMenu(titleBar(), { clientX: 100, clientY: 210 });
				expect(menuTitles()).toEqual([
					"!Restore",
					"Move",
					"Size",
					"Minimize",
					"Maximize",
					"Close",
				]);
				// 1 px below and right of the click, as every right-click menu.
				expect(menu()?.style.left).toBe("101px");
				expect(menu()?.style.top).toBe("211px");
				expect(item("close")).toHaveClass("default");
				// Close shows ALT+F4 in the menu-item glyphs.
				expect(
					item("close").querySelector(".classicyMenuItemKeyboardShortcut")
						?.textContent,
				).toContain("F4");
				expect(track).toHaveBeenCalledWith(
					"contextMenu",
					expect.objectContaining({ type: "ClassicyWindow", show: true }),
				);
			});

			it("shows it on a caption box and on the icon too", () => {
				renderShell(sysWindow());
				fireEvent.contextMenu(
					root().querySelector(".classicyWindowCloseBox") as Element,
					{ clientX: 60, clientY: 210 },
				);
				expect(item("close")).not.toBeNull();
				act(() => {
					fireEvent.mouseDown(document.body);
				});
				expect(menu()).toBeNull();
				fireEvent.contextMenu(icon(), { clientX: 60, clientY: 210 });
				expect(item("close")).not.toBeNull();
			});

			it("keeps the window's contextual menu for a right-click in its body", () => {
				renderShell(sysWindow({ contextMenu: windowMenu }));
				fireEvent.contextMenu(
					root().querySelector(".classicyWindowContentsInner p") as Element,
					{ clientX: 100, clientY: 300 },
				);
				expect(menuTitles()).toEqual(["!Help", "Window Item"]);
			});

			it("activates the window it was shown for", () => {
				renderShell(
					<>
						{sysWindow()}
						{sysWindow({
							id: "other",
							title: "Other",
							initialPosition: [600, 100],
						})}
					</>,
				);
				expect(record("other")?.focused).toBe(true);
				fireEvent.contextMenu(titleBar(), { clientX: 100, clientY: 210 });
				expect(record()?.focused).toBe(true);
				expect(record("other")?.focused).toBe(false);
			});
		});

		describe("each kind of window's menu", () => {
			it("gives a modal Move and Close, and a fixed one Close alone", () => {
				renderShell(sysWindow({ modal: true, title: "Dialog" }));
				fireEvent.contextMenu(titleBar(), { clientX: 100, clientY: 210 });
				expect(menuTitles()).toEqual(["Move", "Close"]);
				cleanup();
				renderShell(
					sysWindow({
						modal: true,
						title: "Alert",
						type: "error",
						closable: false,
					}),
				);
				fireEvent.contextMenu(titleBar(), { clientX: 100, clientY: 210 });
				expect(menuTitles()).toEqual(["!Move", "!Close"]);
			});

			it("gives a palette Move, Size and Close", () => {
				renderShell(sysWindow({ windowType: "utility", title: "Tools" }));
				fireEvent.contextMenu(titleBar(), { clientX: 100, clientY: 210 });
				expect(menuTitles()).toEqual(["Move", "Size", "Close"]);
			});

			it("dims what a fixed-size window without boxes cannot do", () => {
				renderShell(
					sysWindow({ resizable: false, zoomable: false, collapsable: false }),
				);
				fireEvent.contextMenu(titleBar(), { clientX: 100, clientY: 210 });
				expect(menuTitles()).toEqual([
					"!Restore",
					"Move",
					"!Size",
					"!Minimize",
					"!Maximize",
					"Close",
				]);
			});

			it("enables Restore and dims Move, Size and Maximize while maximized", () => {
				renderShell(sysWindow());
				run({ type: "maximize" });
				expect(record()?.zoomed).toBe(true);
				fireEvent.contextMenu(titleBar(), { clientX: 100, clientY: 10 });
				expect(menuTitles()).toEqual([
					"Restore",
					"!Move",
					"!Size",
					"Minimize",
					"!Maximize",
					"Close",
				]);
			});
		});

		describe("its items run the window's own commands", () => {
			it("Maximize maximizes and Restore restores", async () => {
				renderShell(sysWindow());
				fireEvent.contextMenu(titleBar(), { clientX: 100, clientY: 210 });
				await choose("maximize", () => expect(record()?.zoomed).toBe(true));
				expect(root()).toHaveClass("classicyWindowMaximized");
				fireEvent.contextMenu(titleBar(), { clientX: 100, clientY: 10 });
				await choose("restore", () => expect(record()?.zoomed).toBe(false));
				expect(record()).toMatchObject({
					zoomed: false,
					position: [LEFT, TOP],
					size: [WIDTH, HEIGHT],
				});
			});

			it("Minimize collapses the window, and Restore expands it", async () => {
				renderShell(sysWindow());
				fireEvent.contextMenu(titleBar(), { clientX: 100, clientY: 210 });
				await choose("minimize", () => expect(record()?.collapsed).toBe(true));
				fireEvent.contextMenu(titleBar(), { clientX: 100, clientY: 210 });
				expect(menuTitles()).toEqual([
					"Restore",
					"Move",
					"!Size",
					"!Minimize",
					"Maximize",
					"Close",
				]);
				await choose("restore", () => expect(record()?.collapsed).toBe(false));
			});

			it("Move and Size start the keyboard modes", async () => {
				renderShell(sysWindow());
				fireEvent.contextMenu(titleBar(), { clientX: 100, clientY: 210 });
				await choose("move", () =>
					expect(isClassicyWindowKeyboardModeActive()).toBe(true),
				);
				expect(record()?.moving).toBe(true);
				fireEvent.keyDown(document.body, { key: "ArrowLeft" });
				fireEvent.keyDown(document.body, { key: "Enter" });
				expect(record()).toMatchObject({
					moving: false,
					position: [LEFT - 8, TOP],
				});

				fireEvent.contextMenu(titleBar(), { clientX: 100, clientY: 210 });
				await choose("size", () =>
					expect(isClassicyWindowKeyboardModeActive()).toBe(true),
				);
				expect(record()?.resizing).toBe(true);
				fireEvent.keyDown(document.body, { key: "Escape" });
				expect(record()?.resizing).toBe(false);
				expect(isClassicyWindowKeyboardModeActive()).toBe(false);
			});

			it("Close closes the window through its veto", async () => {
				const onBeforeClose = vi.fn(() => false);
				renderShell(sysWindow({ onBeforeClose }));
				fireEvent.contextMenu(titleBar(), { clientX: 100, clientY: 210 });
				await choose("close", () =>
					expect(onBeforeClose).toHaveBeenCalledWith("main"),
				);
				expect(record()?.closed).toBe(false);
			});
		});

		describe("the icon", () => {
			it("drops the menu from the caption's bottom-left on a press, arming no move", () => {
				renderShell(sysWindow());
				fireEvent.mouseDown(icon(), {
					button: 0,
					detail: 1,
					clientX: 60,
					clientY: 210,
				});
				expect(menu()).not.toBeNull();
				// The caption's bottom-left, exactly: Wine's NC_GetSysPopupPos.
				expect(menu()?.style.left).toBe(`${LEFT + FRAME}px`);
				expect(menu()?.style.top).toBe(`${TOP + FRAME + CAPTION}px`);
				// No item is selected: a click opened it.
				expect(menu()?.contains(document.activeElement)).toBe(false);
				fireEvent.mouseMove(document.body, { clientX: 90, clientY: 240 });
				expect(record()).toMatchObject({
					moving: false,
					position: [LEFT, TOP],
				});
				fireEvent.mouseUp(icon(), { button: 0 });
				// A click leaves it open, as Windows' menus stay open.
				expect(menu()).not.toBeNull();
			});

			it("chooses the item a held press is released over", async () => {
				renderShell(sysWindow());
				fireEvent.mouseDown(icon(), { button: 0, detail: 1 });
				fireEvent.mouseUp(item("maximize"), { button: 0 });
				dispatchAnimationEnd(item("maximize"));
				await waitFor(() => expect(record()?.zoomed).toBe(true));
			});

			it("leaves another contextual menu to close itself on a press, opening nothing", () => {
				renderShell(sysWindow({ contextMenu: windowMenu }));
				fireEvent.contextMenu(
					root().querySelector(".classicyWindowContentsInner p") as Element,
					{ clientX: 100, clientY: 300 },
				);
				expect(menuTitles()).toEqual(["!Help", "Window Item"]);
				fireEvent.mouseDown(icon(), { button: 0, detail: 1 });
				expect(menu()).toBeNull();
			});

			it("closes the menu on a second press instead of opening it again", () => {
				renderShell(sysWindow());
				fireEvent.mouseDown(icon(), { button: 0, detail: 1 });
				fireEvent.mouseUp(icon(), { button: 0 });
				expect(menu()).not.toBeNull();
				fireEvent.mouseDown(icon(), { button: 0, detail: 1 });
				expect(menu()).toBeNull();
			});

			it("closes the window on a double-click, leaving no menu open and maximizing nothing", () => {
				renderShell(sysWindow());
				fireEvent.mouseDown(icon(), { button: 0, detail: 1 });
				fireEvent.mouseUp(icon(), { button: 0 });
				fireEvent.click(icon(), { detail: 1 });
				fireEvent.mouseDown(icon(), { button: 0, detail: 2 });
				// The icon is the menu's anchor: its press, reaching the
				// menu's outside-press listener, closes nothing.
				expect(menu()).not.toBeNull();
				fireEvent.mouseUp(icon(), { button: 0 });
				fireEvent.click(icon(), { detail: 2 });
				fireEvent.doubleClick(icon());
				expect(record()).toMatchObject({ closed: true, zoomed: false });
				expect(menu()).toBeNull();
			});

			it("closes nothing on a double-click when the window cannot close", () => {
				renderShell(sysWindow({ closable: false }));
				fireEvent.mouseDown(icon(), { button: 0, detail: 1 });
				fireEvent.mouseDown(icon(), { button: 0, detail: 2 });
				fireEvent.doubleClick(icon());
				expect(record()?.closed).toBe(false);
				expect(menu()).toBeNull();
			});
		});

		describe("ALT+SPACE", () => {
			it("drops the focused window's menu from its caption, the first item selected", () => {
				renderShell(sysWindow());
				expect(altSpace()).toBe(false);
				expect(menu()?.style.left).toBe(`${LEFT + FRAME}px`);
				expect(menu()?.style.top).toBe(`${TOP + FRAME + CAPTION}px`);
				expect(document.activeElement).toBe(item("restore"));
			});

			it("walks the items on the arrows, the dimmed ones included, and closes on ESC, giving the focus back", () => {
				renderShell(
					sysWindow({
						children: <input aria-label="field" defaultValue="text" />,
					}),
				);
				const field = root().querySelector("input") as HTMLInputElement;
				field.focus();
				altSpace(field);
				expect(document.activeElement).toBe(item("restore"));
				fireEvent.keyDown(document.activeElement as Element, {
					key: "ArrowDown",
				});
				expect(document.activeElement).toBe(item("move"));
				fireEvent.keyDown(document.activeElement as Element, {
					key: "ArrowUp",
				});
				fireEvent.keyDown(document.activeElement as Element, {
					key: "ArrowUp",
				});
				// Wrapped round to the last item.
				expect(document.activeElement).toBe(item("close"));
				const escaped = fireEvent.keyDown(document.activeElement as Element, {
					key: "Escape",
				});
				expect(escaped).toBe(false);
				expect(menu()).toBeNull();
				expect(document.activeElement).toBe(field);
			});

			it("chooses the focused item on ENTER", async () => {
				renderShell(sysWindow());
				altSpace();
				fireEvent.keyDown(document.activeElement as Element, {
					key: "ArrowDown",
				});
				fireEvent.keyDown(document.activeElement as Element, { key: "Enter" });
				dispatchAnimationEnd(item("move"));
				await waitFor(() =>
					expect(isClassicyWindowKeyboardModeActive()).toBe(true),
				);
				fireEvent.keyDown(document.body, { key: "Escape" });
			});

			it("gives way in a text field, where Option+Space would type a non-breaking space", () => {
				renderShell(sysWindow({ children: <input aria-label="field" /> }));
				const field = root().querySelector("input") as HTMLInputElement;
				field.focus();
				expect(
					fireEvent.keyDown(field, {
						key: String.fromCharCode(0xa0),
						code: "Space",
						altKey: true,
					}),
				).toBe(false);
				expect(menu()).not.toBeNull();
			});

			it("opens a modal's menu over its owner", () => {
				renderShell(
					<>
						{sysWindow()}
						{sysWindow({ id: "dialog", title: "Dialog", modal: true })}
					</>,
				);
				expect(record("dialog")?.focused).toBe(true);
				altSpace();
				expect(menuTitles()).toEqual(["Move", "Close"]);
				expect(item("close", "dialog")).not.toBeNull();
			});

			it("leaves a key another listener handled alone", () => {
				renderShell(sysWindow({ children: <input aria-label="field" /> }));
				const field = root().querySelector("input") as HTMLInputElement;
				field.addEventListener("keydown", (e) => e.preventDefault());
				altSpace(field);
				expect(menu()).toBeNull();
			});

			it("opens nothing with no window focused", () => {
				renderShell(sysWindow());
				act(() =>
					dispatch({
						type: "ClassicyWindowClose",
						app: { id: APP },
						window: { id: "main" },
					}),
				);
				expect(altSpace()).toBe(true);
				expect(menu()).toBeNull();
			});
		});

		describe("ALT+F4", () => {
			it("closes the focused window", () => {
				renderShell(sysWindow());
				expect(altF4()).toBe(false);
				expect(record()?.closed).toBe(true);
			});

			it("closes the menu with it", () => {
				renderShell(sysWindow());
				altSpace();
				expect(menu()).not.toBeNull();
				altF4(document.activeElement as Element);
				expect(record()?.closed).toBe(true);
				expect(menu()).toBeNull();
			});

			it("honors the window's veto", () => {
				const onBeforeClose = vi.fn(() => false);
				renderShell(sysWindow({ onBeforeClose }));
				altF4();
				expect(onBeforeClose).toHaveBeenCalledWith("main");
				expect(record()?.closed).toBe(false);
			});

			it("closes nothing that cannot close, and still takes the key", () => {
				renderShell(sysWindow({ closable: false }));
				expect(altF4()).toBe(false);
				expect(record()?.closed).toBe(false);
			});

			it("leaves a key another listener handled alone", () => {
				renderShell(sysWindow({ children: <input aria-label="field" /> }));
				const field = root().querySelector("input") as HTMLInputElement;
				field.addEventListener("keydown", (e) => e.preventDefault());
				altF4(field);
				expect(record()?.closed).toBe(false);
			});

			it("does nothing with no window focused", () => {
				renderShell(sysWindow());
				act(() =>
					dispatch({
						type: "ClassicyWindowClose",
						app: { id: APP },
						window: { id: "main" },
					}),
				);
				expect(altF4()).toBe(true);
			});

			it("is not bound while the hook is off", () => {
				renderShell(sysWindow(), false);
				expect(altF4()).toBe(true);
				expect(record()?.closed).toBe(false);
			});
		});

		describe("the systemMenu command", () => {
			it("opens the menu at a given point, activating the window", () => {
				renderShell(
					<>
						{sysWindow()}
						{sysWindow({
							id: "other",
							title: "Other",
							initialPosition: [600, 100],
						})}
					</>,
				);
				expect(run({ type: "systemMenu", at: [300, 700] })).toBe(true);
				expect(record()?.focused).toBe(true);
				expect(menu()?.style.left).toBe("301px");
				expect(menu()?.style.top).toBe("701px");
				expect(menu()?.contains(document.activeElement)).toBe(false);
			});

			it("with no point, drops it from the caption with the first item selected", () => {
				renderShell(sysWindow());
				expect(run({ type: "systemMenu" })).toBe(true);
				expect(menu()?.style.top).toBe(`${TOP + FRAME + CAPTION}px`);
				expect(document.activeElement).toBe(item("restore"));
			});

			it("reports false for a closed window", () => {
				renderShell(sysWindow());
				act(() =>
					dispatch({
						type: "ClassicyWindowClose",
						app: { id: APP },
						window: { id: "main" },
					}),
				);
				expect(run({ type: "systemMenu", at: [1, 2] })).toBe(false);
				expect(menu()).toBeNull();
			});
		});
	});
});
