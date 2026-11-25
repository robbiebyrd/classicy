import { produce } from "immer";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/__tests__/withPlatinum";
import { dispatchAnimationEnd } from "@/__tests__/animationEnd";
import { act, fireEvent, render, waitFor } from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_MINIMIZE_LAYOUT,
	TEST_MINIMIZE_PACKAGE_ID,
	TEST_SHELL_SYSTEM_MENU_LAYOUT,
	TEST_SHELL_SYSTEM_MENU_PACKAGE_ID,
	TEST_TASKBAR_LAYOUT,
	TEST_TASKBAR_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { windowsRecord } from "@/__tests__/windowsRecord";
import "@classicy/appearance-platinum";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	CLASSICY_NO_APP_IDENTITY_OVERRIDES,
	type ClassicyAppIdentityOverrides,
} from "@/Appearance/ClassicyAppIdentity";
import {
	type ClassicyStoreSystemApp,
	type ClassicyStoreSystemAppWindow,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { useClassicyControlStripDisabledModules } from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyTaskbar } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbar";
import { getClassicyTaskbarBand } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";
import {
	CLASSICY_TASKBAR_TOOLTIP_DELAY_MS,
	classicyTaskbarClickCommand,
	classicyTaskbarOrder,
	classicyTaskbarTaskKey,
	classicyTaskbarTasks,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTasks.internal";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import {
	type ClassicyWindowCommand,
	type ClassicyWindowEntry,
	type ClassicyWindowRegistration,
	registerClassicyWindow,
	unregisterClassicyWindow,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal";

// Plan 0020-w98 §2, "The taskbar": its skeleton (the Start button, the band)
// and its window buttons, from the window registry and the store. Most cases
// register windows by hand with recording `run`s, so every command a button
// sends is seen; ClassicyDesktop.layout.test.tsx and the cases at the end
// drive real windows.

const entry = (
	appId: string,
	windowId: string,
	overrides: Partial<ClassicyWindowEntry> = {},
): ClassicyWindowEntry => ({
	appId,
	windowId,
	title: windowId,
	icon: "icon.png",
	modal: false,
	windowType: "document",
	closable: true,
	zoomable: true,
	collapsable: true,
	resizable: true,
	movable: true,
	run: () => true,
	...overrides,
});

const win = (
	id: string,
	overrides: Partial<ClassicyStoreSystemAppWindow> = {},
): ClassicyStoreSystemAppWindow => ({
	id,
	closed: false,
	size: [100, 100],
	position: [0, 0],
	minimumSize: [0, 0],
	...overrides,
});

const app = (
	id: string,
	windows: ClassicyStoreSystemAppWindow[],
	overrides: Partial<ClassicyStoreSystemApp> = {},
): ClassicyStoreSystemApp => ({
	id,
	name: id.replace(/\.app$/, ""),
	icon: `${id}.png`,
	windows: windowsRecord(...windows),
	open: true,
	...overrides,
});

const appsOf = (...list: ClassicyStoreSystemApp[]) =>
	Object.fromEntries(list.map((a) => [a.id, a]));

const keys = (tasks: { key: string }[]) => tasks.map((t) => t.key);
const k = classicyTaskbarTaskKey;
const NONE: ClassicyAppIdentityOverrides = CLASSICY_NO_APP_IDENTITY_OVERRIDES;

describe("classicyTaskbarTasks", () => {
	it("gives each open primary window a button, and none to a modal, a palette or a closed window", () => {
		const entries = [
			entry("A.app", "doc"),
			entry("A.app", "dialog", { modal: true }),
			entry("A.app", "palette", { windowType: "utility" }),
			entry("A.app", "shut"),
			entry("A.app", "unstored"),
			entry("B.app", "doc"),
			entry("Help.app", "topic"),
		];
		const apps = appsOf(
			app("A.app", [
				win("doc"),
				win("dialog", { modal: true }),
				win("palette", { windowType: "utility" }),
				win("shut", { closed: true }),
			]),
			app("B.app", [win("doc")], { open: false }),
			app("Help.app", [win("topic")], { extension: true }),
		);
		expect(keys(classicyTaskbarTasks(entries, apps, NONE))).toEqual([
			k("A.app", "doc"),
			k("Help.app", "topic"),
		]);
	});

	it("labels a button with the window's title, else the app's display name", () => {
		const entries = [
			entry("A.app", "titled", { title: "Report - Editor" }),
			entry("A.app", "untitled", { title: "" }),
			entry("B.app", "blank", { title: "  " }),
		];
		const apps = appsOf(
			app("A.app", [win("titled"), win("untitled")], { name: "Editor" }),
			app("B.app", [win("blank")], { name: "Viewer" }),
		);
		expect(
			classicyTaskbarTasks(entries, apps, NONE).map((t) => t.label),
		).toEqual(["Report - Editor", "Editor", "Viewer"]);
		const renamed: ClassicyAppIdentityOverrides = { "B.app": { name: "Pix" } };
		expect(classicyTaskbarTasks(entries, apps, renamed)[2].label).toBe("Pix");
	});

	it("carries the window's icon, zOrder and collapse", () => {
		const [task] = classicyTaskbarTasks(
			[entry("A.app", "doc", { icon: "doc.png" })],
			appsOf(app("A.app", [win("doc", { zOrder: 42, collapsed: true })])),
			NONE,
		);
		expect(task).toMatchObject({
			icon: "doc.png",
			zOrder: 42,
			minimized: true,
		});
	});

	describe("the active button", () => {
		const entries = [
			entry("A.app", "one"),
			entry("A.app", "two"),
			entry("A.app", "dialog", { modal: true }),
			entry("A.app", "palette", { windowType: "utility" }),
			entry("B.app", "doc"),
		];
		const active = (
			aWindows: ClassicyStoreSystemAppWindow[],
			aFocused = true,
		) =>
			classicyTaskbarTasks(
				entries,
				appsOf(
					app("A.app", aWindows, { focused: aFocused }),
					app("B.app", [win("doc", { zOrder: 99 })]),
				),
				NONE,
			)
				.filter((t) => t.active)
				.map((t) => t.key);

		it("is the focused window's", () => {
			expect(
				active([win("one", { zOrder: 1 }), win("two", { focused: true })]),
			).toEqual([k("A.app", "two")]);
		});

		it("is no button while the focused window is minimized", () => {
			expect(
				active([win("one"), win("two", { focused: true, collapsed: true })]),
			).toEqual([]);
		});

		it("is no button while the desktop holds focus", () => {
			expect(active([win("one"), win("two")], false)).toEqual([]);
		});

		it.each([
			["a modal", "dialog", { modal: true }],
			["a palette", "palette", { windowType: "utility" as const }],
		])("stays with the app's front unminimized window while %s of its app holds focus", (_name, id, kind) => {
			expect(
				active([
					win("one", { zOrder: 5 }),
					win("two", { zOrder: 9, collapsed: true }),
					win(id, { ...kind, focused: true, zOrder: 10 }),
				]),
			).toEqual([k("A.app", "one")]);
		});

		it("is no button while a modal holds focus over minimized windows only", () => {
			expect(
				active([
					win("one", { collapsed: true }),
					win("dialog", { modal: true, focused: true }),
				]),
			).toEqual([]);
		});
	});
});

describe("classicyTaskbarOrder", () => {
	const t = (key: string, zOrder = 0) => ({ key, zOrder });

	it("orders the buttons shown at mount by ascending zOrder", () => {
		expect(classicyTaskbarOrder([], [t("c", 3), t("a", 1), t("b", 2)])).toEqual(
			["a", "b", "c"],
		);
	});

	it("keeps ties in the order given", () => {
		expect(classicyTaskbarOrder([], [t("x"), t("y"), t("z")])).toEqual([
			"x",
			"y",
			"z",
		]);
	});

	it("appends a new window's button, whatever its zOrder", () => {
		expect(
			classicyTaskbarOrder(["b", "c"], [t("a", 1), t("b", 5), t("c", 9)]),
		).toEqual(["b", "c", "a"]);
	});

	it("moves nothing on activation or minimize (a zOrder change)", () => {
		expect(
			classicyTaskbarOrder(["a", "b", "c"], [t("a", 99), t("b", 1), t("c", 2)]),
		).toEqual(["a", "b", "c"]);
	});

	it("drops a closed window's button, and appends it again when it reopens", () => {
		const closed = classicyTaskbarOrder(["a", "b", "c"], [t("a"), t("c")]);
		expect(closed).toEqual(["a", "c"]);
		expect(classicyTaskbarOrder(closed, [t("a"), t("b"), t("c")])).toEqual([
			"a",
			"c",
			"b",
		]);
	});
});

describe("classicyTaskbarClickCommand", () => {
	it("restores a minimized window, minimizes the active one and activates any other", () => {
		expect(
			classicyTaskbarClickCommand({ minimized: true, active: false }),
		).toBe("restore");
		expect(
			classicyTaskbarClickCommand({ minimized: false, active: true }),
		).toBe("minimize");
		expect(
			classicyTaskbarClickCommand({ minimized: false, active: false }),
		).toBe("activate");
	});
});

describe("ClassicyTaskbar", () => {
	const made: ClassicyWindowRegistration[] = [];
	const commands: string[] = [];
	const register = (e: ClassicyWindowEntry) => {
		const registration = registerClassicyWindow({
			...e,
			run: (command: ClassicyWindowCommand) => {
				commands.push(
					`${e.windowId}:${command.type}${
						command.type === "systemMenu" && command.at
							? `@${command.at.join(",")}`
							: ""
					}`,
				);
				return command.type !== "systemMenu";
			},
		});
		made.push(registration);
		return registration;
	};
	// One app holds focus at a time (markAppFocused): an app given as focused
	// takes it from the default state's Finder.
	const setApps = (...list: ClassicyStoreSystemApp[]) =>
		act(() =>
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					const apps = draft.System.Manager.Applications.apps;
					if (list.some((a) => a.focused))
						for (const other of Object.values(apps)) other.focused = false;
					for (const a of list) apps[a.id] = a;
				}),
			),
		);

	const taskButtons = () =>
		Array.from(
			document.querySelectorAll<HTMLButtonElement>(".classicyTaskbarTask"),
		);
	const taskButton = (label: string) => {
		const found = taskButtons().find((b) => b.textContent === label);
		if (!found) throw new Error(`no button "${label}"`);
		return found;
	};

	beforeEach(() => {
		localStorage.clear();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		commands.length = 0;
	});

	afterEach(() => {
		for (const registration of made.splice(0))
			unregisterClassicyWindow(registration);
		unregisterClassicyAppearancePackage(TEST_TASKBAR_PACKAGE_ID);
		unregisterClassicyAppearancePackage("test-taskbar-relabelled");
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		vi.useRealTimers();
	});

	describe("structure", () => {
		it("is a labelled nav with the Start button, the window list and the status area, in that order", () => {
			const { container } = render(<ClassicyTaskbar />);
			const nav = container.querySelector("nav.classicyTaskbar");
			expect(nav).toHaveAttribute("aria-label", "Taskbar");
			expect(
				Array.from(nav?.children ?? [], (el) =>
					el.getAttribute("data-classicy-part"),
				),
			).toEqual(["taskbar-start", "taskbar-tasks", "taskbar-tray"]);
			const list = nav?.querySelector(".classicyTaskbarTasks");
			expect(list?.tagName).toBe("UL");
			expect(list).toHaveAttribute("aria-label", "Running windows");
			const tray = nav?.querySelector(".classicyTaskbarTray");
			expect(tray).toHaveAttribute("role", "group");
			expect(tray).toHaveAttribute("aria-label", "Notification area");
		});

		it("labels the Start button from the layout, with an empty icon span the package draws", () => {
			registerTestTaskbarPackage();
			act(() =>
				dispatch({
					type: "ClassicyDesktopChangeAppearancePackage",
					packageId: TEST_TASKBAR_PACKAGE_ID,
				}),
			);
			const { container } = render(<ClassicyTaskbar />);
			const start = container.querySelector(".classicyTaskbarStart");
			expect(start?.tagName).toBe("BUTTON");
			expect(start).toHaveAttribute("aria-haspopup", "menu");
			expect(start).toHaveAttribute("aria-expanded", "false");
			const icon = start?.querySelector(".classicyTaskbarStartIcon");
			expect(icon).toBeEmptyDOMElement();
			expect(icon).toHaveAttribute("aria-hidden", "true");
			expect(
				start?.querySelector(".classicyTaskbarStartLabel"),
			).toHaveTextContent("Start");

			registerTestTaskbarPackage(
				{ ...TEST_TASKBAR_LAYOUT, taskbar: { startLabel: "Démarrer" } },
				"test-taskbar-relabelled",
			);
			act(() =>
				dispatch({
					type: "ClassicyDesktopChangeAppearancePackage",
					packageId: "test-taskbar-relabelled",
				}),
			);
			expect(
				container.querySelector(".classicyTaskbarStartLabel"),
			).toHaveTextContent("Démarrer");
		});

		it('labels the Start button "Start" under a layout without a taskbar', () => {
			render(<ClassicyTaskbar />);
			expect(
				document.querySelector(".classicyTaskbarStartLabel"),
			).toHaveTextContent("Start");
		});

		it("suppresses the browser's menu over the taskbar and the Start button", () => {
			const { container } = render(<ClassicyTaskbar />);
			for (const target of [
				container.querySelector(".classicyTaskbar"),
				container.querySelector(".classicyTaskbarStart"),
				container.querySelector(".classicyTaskbarTray"),
			] as Element[]) {
				const event = new MouseEvent("contextmenu", {
					bubbles: true,
					cancelable: true,
				});
				target.dispatchEvent(event);
				expect(event.defaultPrevented).toBe(true);
			}
		});
	});

	describe("the Start button", () => {
		const start = () =>
			document.querySelector(".classicyTaskbarStart") as HTMLButtonElement;

		it("toggles open on a press, not on the click that ends it", () => {
			render(<ClassicyTaskbar />);
			fireEvent.mouseDown(start(), { button: 0 });
			expect(start()).toHaveClass("open");
			expect(start()).toHaveAttribute("aria-expanded", "true");
			fireEvent.mouseUp(start(), { button: 0 });
			fireEvent.click(start(), { detail: 1 });
			expect(start()).toHaveClass("open");
			fireEvent.mouseDown(start(), { button: 0 });
			expect(start()).not.toHaveClass("open");
			expect(start()).toHaveAttribute("aria-expanded", "false");
		});

		it("ignores a button-2 press", () => {
			render(<ClassicyTaskbar />);
			fireEvent.mouseDown(start(), { button: 2 });
			expect(start()).not.toHaveClass("open");
		});

		it("toggles on Enter and Space (a click with no press count)", () => {
			render(<ClassicyTaskbar />);
			fireEvent.click(start(), { detail: 0 });
			expect(start()).toHaveClass("open");
			fireEvent.click(start(), { detail: 0 });
			expect(start()).not.toHaveClass("open");
		});

		it("closes on Escape, keeping the focus on the button", () => {
			render(<ClassicyTaskbar />);
			start().focus();
			fireEvent.mouseDown(start(), { button: 0 });
			expect(start()).toHaveClass("open");
			fireEvent.keyDown(start(), { key: "Escape" });
			expect(start()).not.toHaveClass("open");
			expect(document.activeElement).toBe(start());
		});
	});

	describe("window buttons", () => {
		it("draws the window's icon and title, in the order the windows opened", () => {
			register(entry("A.app", "one", { title: "One", icon: "one.png" }));
			register(entry("A.app", "two", { title: "Two" }));
			register(entry("A.app", "dialog", { title: "Dialog", modal: true }));
			setApps(
				app("A.app", [
					win("one", { zOrder: 9 }),
					win("two", { zOrder: 3 }),
					win("dialog", { modal: true }),
				]),
			);
			render(<ClassicyTaskbar />);
			expect(taskButtons().map((b) => b.textContent)).toEqual(["Two", "One"]);
			const one = taskButton("One");
			expect(one.closest("li")?.parentElement).toHaveClass(
				"classicyTaskbarTasks",
			);
			const icon = one.querySelector("img.classicyTaskbarTaskIcon");
			expect(icon).toHaveAttribute("src", "one.png");
			expect(icon).toHaveAttribute("alt", "");
			expect(one.querySelector(".classicyTaskbarTaskLabel")).toHaveTextContent(
				"One",
			);
		});

		it("appends a window that opens later, and moves a reopened one to the end", () => {
			register(entry("A.app", "one", { title: "One" }));
			register(entry("A.app", "two", { title: "Two" }));
			setApps(
				app("A.app", [win("one", { zOrder: 1 }), win("two", { zOrder: 2 })]),
			);
			render(<ClassicyTaskbar />);
			register(entry("A.app", "three", { title: "Three" }));
			setApps(
				app("A.app", [
					win("one", { zOrder: 1 }),
					win("two", { zOrder: 2 }),
					win("three", { zOrder: 0 }),
				]),
			);
			expect(taskButtons().map((b) => b.textContent)).toEqual([
				"One",
				"Two",
				"Three",
			]);
			setApps(
				app("A.app", [
					win("one", { zOrder: 1, closed: true }),
					win("two", { zOrder: 2 }),
					win("three"),
				]),
			);
			expect(taskButtons().map((b) => b.textContent)).toEqual(["Two", "Three"]);
			setApps(
				app("A.app", [
					win("one", { zOrder: 50 }),
					win("two", { zOrder: 2 }),
					win("three"),
				]),
			);
			expect(taskButtons().map((b) => b.textContent)).toEqual([
				"Two",
				"Three",
				"One",
			]);
		});

		it("marks the active window's button active and aria-pressed, and a minimized one collapsed", () => {
			register(entry("A.app", "one", { title: "One" }));
			register(entry("A.app", "two", { title: "Two" }));
			register(entry("A.app", "three", { title: "Three" }));
			setApps(
				app(
					"A.app",
					[
						win("one", { focused: true }),
						win("two"),
						win("three", { collapsed: true }),
					],
					{ focused: true },
				),
			);
			render(<ClassicyTaskbar />);
			expect(taskButton("One")).toHaveClass("classicyTaskbarTask", "active");
			expect(taskButton("One")).toHaveAttribute("aria-pressed", "true");
			expect(taskButton("Two")).not.toHaveClass("active");
			expect(taskButton("Two")).toHaveAttribute("aria-pressed", "false");
			expect(taskButton("Three")).toHaveClass("collapsed");
			expect(taskButton("Three")).not.toHaveClass("active");
		});

		it("is pressed while a press is held over it", () => {
			register(entry("A.app", "one", { title: "One" }));
			setApps(app("A.app", [win("one")]));
			render(<ClassicyTaskbar />);
			const one = taskButton("One");
			const down = new MouseEvent("mousedown", {
				bubbles: true,
				cancelable: true,
				button: 0,
			});
			act(() => {
				one.dispatchEvent(down);
			});
			// A pointer press takes no focus.
			expect(down.defaultPrevented).toBe(true);
			expect(one).toHaveClass("pressed");
			fireEvent.mouseLeave(one);
			expect(one).not.toHaveClass("pressed");
			fireEvent.mouseEnter(one);
			expect(one).toHaveClass("pressed");
			fireEvent.mouseUp(document);
			expect(one).not.toHaveClass("pressed");
			fireEvent.mouseEnter(one);
			expect(one).not.toHaveClass("pressed");
		});

		it("is pressed while Space is held on it", () => {
			register(entry("A.app", "one", { title: "One" }));
			setApps(app("A.app", [win("one")]));
			render(<ClassicyTaskbar />);
			const one = taskButton("One");
			fireEvent.keyDown(one, { key: " " });
			expect(one).toHaveClass("pressed");
			fireEvent.keyUp(one, { key: " " });
			expect(one).not.toHaveClass("pressed");
		});

		it("releases a held press when the pointer stream is lost", () => {
			register(entry("A.app", "one", { title: "One" }));
			setApps(app("A.app", [win("one")]));
			render(<ClassicyTaskbar />);
			const one = taskButton("One");
			fireEvent.mouseDown(one, { button: 0 });
			expect(one).toHaveClass("pressed");
			act(() => {
				window.dispatchEvent(new Event("blur"));
			});
			expect(one).not.toHaveClass("pressed");
		});

		it("minimizes the active window, activates another and restores a minimized one", () => {
			register(entry("A.app", "one", { title: "One" }));
			register(entry("A.app", "two", { title: "Two" }));
			register(entry("A.app", "three", { title: "Three" }));
			setApps(
				app(
					"A.app",
					[
						win("one", { focused: true }),
						win("two"),
						win("three", { collapsed: true }),
					],
					{ focused: true },
				),
			);
			render(<ClassicyTaskbar />);
			fireEvent.click(taskButton("One"));
			fireEvent.click(taskButton("Two"));
			fireEvent.click(taskButton("Three"));
			expect(commands).toEqual([
				"one:minimize",
				"two:activate",
				"three:restore",
			]);
		});

		it("decides a click on the store as it stands, not as it was drawn", () => {
			register(entry("A.app", "one", { title: "One" }));
			setApps(app("A.app", [win("one")]));
			render(<ClassicyTaskbar />);
			// Focused since the last render, with no render in between.
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					const apps = draft.System.Manager.Applications.apps;
					for (const other of Object.values(apps)) other.focused = false;
					apps["A.app"].focused = true;
					apps["A.app"].windows.one.focused = true;
				}),
			);
			fireEvent.click(taskButton("One"));
			expect(commands).toEqual(["one:minimize"]);
		});

		it("activates a window on button 2, then asks for its pop-up menu at the pointer", () => {
			register(entry("A.app", "one", { title: "One" }));
			register(entry("A.app", "two", { title: "Two" }));
			setApps(app("A.app", [win("one"), win("two", { collapsed: true })]));
			render(<ClassicyTaskbar />);
			const event = new MouseEvent("contextmenu", {
				bubbles: true,
				cancelable: true,
				clientX: 40,
				clientY: 700,
			});
			act(() => {
				taskButton("One").dispatchEvent(event);
			});
			expect(event.defaultPrevented).toBe(true);
			// A minimized window's menu opens without restoring it.
			fireEvent.contextMenu(taskButton("Two"), { clientX: 90, clientY: 700 });
			expect(commands).toEqual([
				"one:activate",
				"one:systemMenu@40,700",
				"two:systemMenu@90,700",
			]);
		});

		describe("the tooltip", () => {
			const truncate = (button: HTMLButtonElement, cut: boolean) => {
				const label = button.querySelector(
					".classicyTaskbarTaskLabel",
				) as HTMLElement;
				Object.defineProperty(label, "scrollWidth", {
					configurable: true,
					value: cut ? 240 : 80,
				});
				Object.defineProperty(label, "clientWidth", {
					configurable: true,
					value: 80,
				});
			};
			const balloonText = () =>
				document.querySelector(".classicyBalloonHelpContent")?.textContent;

			beforeEach(() => {
				register(
					entry("A.app", "one", { title: "Quarterly report - SimpleText" }),
				);
				setApps(app("A.app", [win("one")]));
			});

			it("shows the whole title after 500 ms when it is cut short, Balloon Help off", () => {
				vi.useFakeTimers();
				act(() =>
					dispatch({
						type: "ClassicyDesktopSetBalloonHelp",
						disableBalloonHelp: true,
					}),
				);
				render(<ClassicyTaskbar />);
				const one = taskButtons()[0];
				truncate(one, true);
				fireEvent.mouseEnter(one);
				act(() => {
					vi.advanceTimersByTime(CLASSICY_TASKBAR_TOOLTIP_DELAY_MS - 1);
				});
				expect(balloonText()).toBeUndefined();
				act(() => {
					vi.advanceTimersByTime(1);
				});
				expect(balloonText()).toBe("Quarterly report - SimpleText");
				expect(one).toHaveAttribute("aria-describedby");
				fireEvent.mouseLeave(one);
				expect(balloonText()).toBeUndefined();
			});

			it("shows nothing when the title fits", () => {
				vi.useFakeTimers();
				render(<ClassicyTaskbar />);
				const one = taskButtons()[0];
				truncate(one, false);
				fireEvent.mouseEnter(one);
				act(() => {
					vi.advanceTimersByTime(CLASSICY_TASKBAR_TOOLTIP_DELAY_MS * 2);
				});
				expect(balloonText()).toBeUndefined();
			});
		});
	});

	describe("the band", () => {
		const restore: (() => void)[] = [];
		afterEach(() => {
			for (const undo of restore.splice(0)) undo();
		});
		const taskbarHeight = (height: () => number) => {
			const original = Object.getOwnPropertyDescriptor(
				HTMLElement.prototype,
				"offsetHeight",
			);
			Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
				configurable: true,
				get(this: HTMLElement) {
					return this.classList.contains("classicyTaskbar") ? height() : 0;
				},
			});
			restore.push(() => {
				if (original)
					Object.defineProperty(
						HTMLElement.prototype,
						"offsetHeight",
						original,
					);
			});
		};

		it("publishes the taskbar's height, and withdraws it on unmount", () => {
			taskbarHeight(() => 28);
			const { unmount } = render(<ClassicyTaskbar />);
			expect(getClassicyTaskbarBand()).toBe(28);
			unmount();
			expect(getClassicyTaskbarBand()).toBe(0);
		});

		it("publishes it again when the taskbar resizes", () => {
			const observers: { callback: () => void; disconnected: boolean }[] = [];
			class FakeResizeObserver {
				record: { callback: () => void; disconnected: boolean };
				constructor(callback: () => void) {
					this.record = { callback, disconnected: false };
					observers.push(this.record);
				}
				observe() {}
				disconnect() {
					this.record.disconnected = true;
				}
			}
			vi.stubGlobal("ResizeObserver", FakeResizeObserver);
			restore.push(() => vi.unstubAllGlobals());
			let height = 28;
			taskbarHeight(() => height);
			const { unmount } = render(<ClassicyTaskbar />);
			expect(getClassicyTaskbarBand()).toBe(28);
			height = 56;
			act(() => {
				for (const o of observers) if (!o.disconnected) o.callback();
			});
			expect(getClassicyTaskbarBand()).toBe(56);
			unmount();
			expect(observers.every((o) => o.disconnected)).toBe(true);
			expect(getClassicyTaskbarBand()).toBe(0);
		});

		it("is 0 for a taskbar with no height", () => {
			render(<ClassicyTaskbar />);
			expect(getClassicyTaskbarBand()).toBe(0);
		});
	});

	it("publishes the host's disabled modules for the Control Strip control panel", () => {
		const seen: (readonly string[])[] = [];
		const Probe = (): ReactNode => {
			seen.push(useClassicyControlStripDisabledModules());
			return null;
		};
		const { rerender, unmount } = render(
			<>
				<ClassicyTaskbar disabledModules={["classicy-sound"]} />
				<Probe />
			</>,
		);
		expect(seen.at(-1)).toEqual(["classicy-sound"]);
		rerender(
			<>
				<ClassicyTaskbar />
				<Probe />
			</>,
		);
		expect(seen.at(-1)).toEqual([]);
		unmount();
	});
});

describe("ClassicyTaskbar on a desktop, with real windows", () => {
	const APP_ID = "T.app";
	const appRecord = () =>
		useAppManager.getState().System.Manager.Applications.apps[APP_ID];
	const ownButtons = () =>
		Array.from(
			document.querySelectorAll<HTMLButtonElement>(".classicyTaskbarTask"),
		).filter((b) =>
			["Main", "Second", "Palette", "Dialog"].includes(b.textContent ?? ""),
		);
	const button = (label: string) => {
		const found = ownButtons().find((b) => b.textContent === label);
		if (!found) throw new Error(`no button "${label}"`);
		return found;
	};

	beforeEach(() => {
		localStorage.clear();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		registerTestTaskbarPackage();
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: TEST_TASKBAR_PACKAGE_ID,
			}),
		);
		act(() =>
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Applications.apps[APP_ID] = {
						id: APP_ID,
						name: "T",
						icon: "",
						windows: {},
						open: true,
						data: {},
					};
				}),
			),
		);
	});

	afterEach(() => {
		unregisterClassicyAppearancePackage(TEST_TASKBAR_PACKAGE_ID);
		unregisterClassicyAppearancePackage(TEST_MINIMIZE_PACKAGE_ID);
		unregisterClassicyAppearancePackage(TEST_SHELL_SYSTEM_MENU_PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	const renderShell = (windows: ReactNode) =>
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false}>
					<ClassicyApp id={APP_ID} name="T" icon="">
						{windows}
					</ClassicyApp>
				</ClassicyDesktop>
			</ClassicyAppManagerProvider>,
		);

	it("gives a document window a button, and none to the app's palette or dialog", () => {
		renderShell(
			<>
				<ClassicyWindow id="main" appId={APP_ID} title="Main">
					<p>main</p>
				</ClassicyWindow>
				<ClassicyWindow
					id="palette"
					appId={APP_ID}
					title="Palette"
					windowType="utility"
				>
					<p>palette</p>
				</ClassicyWindow>
				<ClassicyWindow id="dialog" appId={APP_ID} title="Dialog" modal>
					<p>dialog</p>
				</ClassicyWindow>
			</>,
		);
		expect(ownButtons().map((b) => b.textContent)).toEqual(["Main"]);
		// The dialog holds focus; its owner's button stays pressed under it.
		expect(getAppWindow(appRecord(), "dialog")?.focused).toBe(true);
		expect(button("Main")).toHaveClass("active");
	});

	it("minimizes the active window and restores it through the window's own paths", () => {
		renderShell(
			<>
				<ClassicyWindow id="main" appId={APP_ID} title="Main">
					<p>main</p>
				</ClassicyWindow>
				<ClassicyWindow id="second" appId={APP_ID} title="Second">
					<p>second</p>
				</ClassicyWindow>
			</>,
		);
		expect(ownButtons().map((b) => b.textContent)).toEqual(["Main", "Second"]);
		expect(button("Second")).toHaveClass("active");

		fireEvent.click(button("Main"));
		expect(getAppWindow(appRecord(), "main")?.focused).toBe(true);
		expect(button("Main")).toHaveClass("active");
		expect(button("Second")).not.toHaveClass("active");

		fireEvent.click(button("Main"));
		expect(getAppWindow(appRecord(), "main")?.collapsed).toBe(true);
		expect(button("Main")).toHaveClass("collapsed");
		expect(button("Main")).not.toHaveClass("active");

		fireEvent.click(button("Main"));
		expect(getAppWindow(appRecord(), "main")?.collapsed).toBe(false);
		expect(getAppWindow(appRecord(), "main")?.focused).toBe(true);
		expect(button("Main")).toHaveClass("active");
		expect(button("Main")).not.toHaveClass("collapsed");
		// Activating and minimizing moved no button.
		expect(ownButtons().map((b) => b.textContent)).toEqual(["Main", "Second"]);
	});

	// Plan 0020-w98 §5, "Minimize": under a layout that minimizes, the
	// active window's button takes it off the screen and the press passes to
	// the next window down; the button brings it back.
	it('minimizes the active window off the screen under window.collapse: "minimize"', () => {
		registerTestTaskbarPackage(TEST_MINIMIZE_LAYOUT, TEST_MINIMIZE_PACKAGE_ID);
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: TEST_MINIMIZE_PACKAGE_ID,
			}),
		);
		renderShell(
			<>
				<ClassicyWindow id="main" appId={APP_ID} title="Main">
					<p>main</p>
				</ClassicyWindow>
				<ClassicyWindow id="second" appId={APP_ID} title="Second">
					<p>second</p>
				</ClassicyWindow>
			</>,
		);
		const windowRoot = (id: string) =>
			document.getElementById(`${APP_ID}_${id}`);
		expect(button("Second")).toHaveClass("active");

		fireEvent.click(button("Second"));
		expect(getAppWindow(appRecord(), "second")).toMatchObject({
			collapsed: true,
			focused: false,
		});
		expect(windowRoot("second")).toHaveClass("classicyWindowMinimized");
		expect(button("Second")).toHaveClass("collapsed");
		expect(getAppWindow(appRecord(), "main")?.focused).toBe(true);
		expect(button("Main")).toHaveClass("active");

		fireEvent.click(button("Second"));
		expect(getAppWindow(appRecord(), "second")).toMatchObject({
			collapsed: false,
			focused: true,
		});
		expect(windowRoot("second")).not.toHaveClass("classicyWindowMinimized");
		expect(button("Second")).toHaveClass("active");
		expect(ownButtons().map((b) => b.textContent)).toEqual(["Main", "Second"]);
	});

	it("drops a closed window's button", () => {
		renderShell(
			<ClassicyWindow id="main" appId={APP_ID} title="Main">
				<p>main</p>
			</ClassicyWindow>,
		);
		expect(ownButtons()).toHaveLength(1);
		act(() =>
			dispatch({
				type: "ClassicyWindowClose",
				app: { id: APP_ID },
				window: { id: "main" },
			}),
		);
		expect(ownButtons()).toHaveLength(0);
	});

	// Plan 0020-w98 §5, "The window pop-up (system) menu": a window button's
	// right-click asks its window for its pop-up menu at the pointer
	// (ReactOS `HandleTaskItemRightClick`), which a window has only under
	// `window.systemMenu`.
	describe("the window pop-up menu", () => {
		const menu = () => document.querySelector(".classicyContextMenuWrapper");
		const menuItem = (windowId: string, command: string) =>
			document.getElementById(
				`${APP_ID}_${windowId}_system_${command}`,
			) as HTMLElement;
		const twoWindows = (
			<>
				<ClassicyWindow id="main" appId={APP_ID} title="Main">
					<p>main</p>
				</ClassicyWindow>
				<ClassicyWindow id="second" appId={APP_ID} title="Second">
					<p>second</p>
				</ClassicyWindow>
			</>
		);

		it("opens nothing on a right-click under a layout without one", () => {
			renderShell(twoWindows);
			fireEvent.contextMenu(button("Main"), { clientX: 40, clientY: 700 });
			expect(menu()).toBeNull();
			// The window is activated all the same.
			expect(getAppWindow(appRecord(), "main")?.focused).toBe(true);
		});

		describe("under window.systemMenu", () => {
			beforeEach(() => {
				registerTestTaskbarPackage(
					TEST_SHELL_SYSTEM_MENU_LAYOUT,
					TEST_SHELL_SYSTEM_MENU_PACKAGE_ID,
				);
				act(() =>
					dispatch({
						type: "ClassicyDesktopChangeAppearancePackage",
						packageId: TEST_SHELL_SYSTEM_MENU_PACKAGE_ID,
					}),
				);
			});

			it("activates the window and opens its menu at the pointer", () => {
				renderShell(twoWindows);
				expect(button("Second")).toHaveClass("active");
				fireEvent.contextMenu(button("Main"), { clientX: 40, clientY: 700 });
				expect(getAppWindow(appRecord(), "main")?.focused).toBe(true);
				expect(menu()).not.toBeNull();
				expect(menuItem("main", "restore")).toHaveClass("disabled");
				expect(menuItem("main", "minimize")).not.toHaveClass("disabled");
				expect(menuItem("main", "close")).toHaveClass("default");
			});

			it("opens a minimized window's menu without restoring it, and its Restore restores it", async () => {
				renderShell(twoWindows);
				fireEvent.click(button("Second"));
				expect(getAppWindow(appRecord(), "second")?.collapsed).toBe(true);
				fireEvent.contextMenu(button("Second"), {
					clientX: 90,
					clientY: 700,
				});
				expect(getAppWindow(appRecord(), "second")).toMatchObject({
					collapsed: true,
					focused: false,
				});
				expect(menuItem("second", "restore")).not.toHaveClass("disabled");
				expect(menuItem("second", "move")).toHaveClass("disabled");
				expect(menuItem("second", "size")).toHaveClass("disabled");
				expect(menuItem("second", "minimize")).toHaveClass("disabled");
				expect(menuItem("second", "maximize")).not.toHaveClass("disabled");
				fireEvent.click(menuItem("second", "restore"));
				dispatchAnimationEnd(menuItem("second", "restore"));
				await waitFor(() =>
					expect(getAppWindow(appRecord(), "second")).toMatchObject({
						collapsed: false,
						focused: true,
					}),
				);
				expect(button("Second")).toHaveClass("active");
			});
		});
	});
});
