import { produce } from "immer";
import { type ReactNode, useLayoutEffect } from "react";
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
import { readClassicyThemeVar } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";
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
import {
	getAppWindow,
	listAppWindows,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { CONTROL_STRIP_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/ControlStripManager/ClassicyControlStripManagerManifest";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { useClassicyControlStripDisabledModules } from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import {
	CLASSICY_DROP_ACTIVATE_ATTRIBUTE,
	CLASSICY_DROP_ACTIVATE_DELAY_MS,
	CLASSICY_DROP_ACTIVATE_EVENT,
	startClassicyFileDrag,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import { ClassicyTaskbar } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbar";
import { getClassicyTaskbarBand } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";
import {
	CLASSICY_TASKBAR_MENU_IDS,
	classicyTaskbarMenuItems,
	classicyTaskbarMinimizeAllTargets,
	classicyTaskbarMinimizedAllStands,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarMenu.internal";
import {
	CLASSICY_TASKBAR_TOOLTIP_DELAY_MS,
	classicyTaskbarClickCommand,
	classicyTaskbarDropActivateCommand,
	classicyTaskbarOrder,
	classicyTaskbarTaskKey,
	classicyTaskbarTasks,
	classicyTaskbarTasksPerPage,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTasks.internal";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import {
	type ClassicyWindowCommand,
	type ClassicyWindowEntry,
	type ClassicyWindowRegistration,
	registerClassicyWindow,
	runClassicyWindowCommand,
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
	geometry: () => undefined,
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

describe("classicyTaskbarDropActivateCommand", () => {
	it("restores a minimized window and activates any other, the active one included", () => {
		expect(classicyTaskbarDropActivateCommand({ minimized: true })).toBe(
			"restore",
		);
		expect(classicyTaskbarDropActivateCommand({ minimized: false })).toBe(
			"activate",
		);
	});
});

describe("classicyTaskbarMinimizeAllTargets", () => {
	const tasksOf = (
		aWindows: ClassicyStoreSystemAppWindow[],
		entries = aWindows.map((w) => entry("A.app", w.id)),
	) =>
		classicyTaskbarTasks(
			entries,
			appsOf(app("A.app", aWindows, { focused: true })),
			NONE,
		);

	it("takes every window button's window that is not minimized and has a Minimize box, the active one last", () => {
		const tasks = tasksOf(
			[
				win("one", { zOrder: 1 }),
				win("front", { zOrder: 9, focused: true }),
				win("shut", { collapsed: true }),
				win("fixed"),
				win("three", { zOrder: 3 }),
			],
			[
				entry("A.app", "one"),
				entry("A.app", "front"),
				entry("A.app", "shut"),
				entry("A.app", "fixed", { collapsable: false }),
				entry("A.app", "three"),
			],
		);
		expect(keys(classicyTaskbarMinimizeAllTargets(tasks))).toEqual([
			k("A.app", "one"),
			k("A.app", "three"),
			k("A.app", "front"),
		]);
	});

	it("is none when every window is minimized", () => {
		expect(
			classicyTaskbarMinimizeAllTargets(
				tasksOf([win("one", { collapsed: true })]),
			),
		).toEqual([]);
	});
});

describe("classicyTaskbarMinimizedAllStands", () => {
	const minimized = {
		windows: [
			{ appId: "A.app", windowId: "one" },
			{ appId: "B.app", windowId: "two" },
		],
		active: { appId: "A.app", windowId: "one" },
	};
	const apps = (
		one: Partial<ClassicyStoreSystemAppWindow> = {},
		bOpen = true,
	) =>
		appsOf(
			app("A.app", [win("one", { collapsed: true, ...one })]),
			app("B.app", [win("two", { collapsed: true })], { open: bOpen }),
		);

	it("stands while every window it minimized is open and minimized", () => {
		expect(classicyTaskbarMinimizedAllStands(minimized, apps())).toBe(true);
	});

	it("falls once one is restored or closed, or its app quits", () => {
		expect(
			classicyTaskbarMinimizedAllStands(minimized, apps({ collapsed: false })),
		).toBe(false);
		expect(
			classicyTaskbarMinimizedAllStands(minimized, apps({ closed: true })),
		).toBe(false);
		expect(classicyTaskbarMinimizedAllStands(minimized, apps({}, false))).toBe(
			false,
		);
		expect(
			classicyTaskbarMinimizedAllStands(
				{ windows: [{ appId: "Gone.app", windowId: "x" }] },
				apps(),
			),
		).toBe(false);
	});

	it("is nothing to undo with no list, or an empty one", () => {
		expect(classicyTaskbarMinimizedAllStands(null, apps())).toBe(false);
		expect(classicyTaskbarMinimizedAllStands({ windows: [] }, apps())).toBe(
			false,
		);
	});
});

describe("classicyTaskbarMenuItems", () => {
	const handlers = {
		onCascade: () => {},
		onTile: () => {},
		onMinimizeAll: () => {},
		onUndo: () => {},
		onProperties: () => {},
	};
	const shape = (
		items: {
			id: string;
			title?: string;
			disabled?: boolean;
			checked?: boolean | "mixed";
			menuChildren?: { title?: string; checked?: boolean | "mixed" }[];
		}[],
	) =>
		items.map((i) =>
			i.id === "spacer"
				? "—"
				: `${i.title}${i.disabled ? " (off)" : ""}${
						i.menuChildren
							? ` ▸ ${i.menuChildren
									.map((c) => `${c.checked ? "✓" : ""}${c.title}`)
									.join(", ")}`
							: ""
					}`,
		);
	const ARRANGE = [
		"Cascade Windows",
		"Tile Windows Horizontally",
		"Tile Windows Vertically",
	];

	it("is Windows 98's: the arrangements, Minimize All Windows and Properties", () => {
		expect(
			shape(
				classicyTaskbarMenuItems({
					...handlers,
					canArrange: true,
					canMinimizeAll: true,
					undo: null,
				}),
			),
		).toEqual([...ARRANGE, "—", "Minimize All Windows", "—", "Properties"]);
		expect(
			shape(
				classicyTaskbarMenuItems({
					...handlers,
					canArrange: false,
					canMinimizeAll: false,
					undo: null,
				}),
			),
		).toEqual([
			...ARRANGE.map((t) => `${t} (off)`),
			"—",
			"Minimize All Windows (off)",
			"—",
			"Properties",
		]);
	});

	it("adds the Undo of the last arrangement or Minimize All after Minimize All Windows", () => {
		for (const [kind, title] of [
			["minimizeAll", "Undo Minimize All"],
			["cascade", "Undo Cascade"],
			["tile", "Undo Tile"],
		] as const) {
			const items = classicyTaskbarMenuItems({
				...handlers,
				canArrange: true,
				canMinimizeAll: false,
				undo: kind,
			});
			expect(shape(items)).toEqual([
				...ARRANGE,
				"—",
				"Minimize All Windows (off)",
				title,
				"—",
				"Properties",
			]);
			expect(items[5].id).toBe(CLASSICY_TASKBAR_MENU_IDS.undo);
		}
	});

	it("leads with Toolbars ▸ Quick Launch, checked while it shows, for the band site", () => {
		const shown = classicyTaskbarMenuItems({
			...handlers,
			canArrange: true,
			canMinimizeAll: true,
			undo: null,
			toolbars: { quickLaunch: true, onQuickLaunch: () => {} },
		});
		expect(shape(shown).slice(0, 2)).toEqual(["Toolbars ▸ ✓Quick Launch", "—"]);
		expect(shown[0].id).toBe(CLASSICY_TASKBAR_MENU_IDS.toolbars);
		expect(shown[0].menuChildren?.[0].id).toBe(
			CLASSICY_TASKBAR_MENU_IDS.quickLaunch,
		);
		const hidden = classicyTaskbarMenuItems({
			...handlers,
			canArrange: true,
			canMinimizeAll: true,
			undo: null,
			toolbars: { quickLaunch: false, onQuickLaunch: () => {} },
		});
		expect(shape(hidden)[0]).toBe("Toolbars ▸ Quick Launch");
	});

	it("leads with the caller's items and a divider, before Toolbars ▸", () => {
		expect(
			shape(
				classicyTaskbarMenuItems({
					...handlers,
					canArrange: true,
					canMinimizeAll: true,
					undo: null,
					leading: [{ id: "adjust", title: "Adjust Date/Time" }],
					toolbars: { quickLaunch: true, onQuickLaunch: () => {} },
				}),
			),
		).toEqual([
			"Adjust Date/Time",
			"—",
			"Toolbars ▸ ✓Quick Launch",
			"—",
			...ARRANGE,
			"—",
			"Minimize All Windows",
			"—",
			"Properties",
		]);
	});

	it("runs each arrangement through its handler", () => {
		const onTile = vi.fn();
		const onCascade = vi.fn();
		const items = classicyTaskbarMenuItems({
			...handlers,
			onTile,
			onCascade,
			canArrange: true,
			canMinimizeAll: true,
			undo: null,
		});
		items[0].onClickFunc?.();
		items[1].onClickFunc?.();
		items[2].onClickFunc?.();
		expect(onCascade).toHaveBeenCalledTimes(1);
		expect(onTile.mock.calls).toEqual([["horizontally"], ["vertically"]]);
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
		it("is a labelled nav with the Start button, Quick Launch, the window list and the status area, in that order", () => {
			const { container } = render(<ClassicyTaskbar />);
			const nav = container.querySelector("nav.classicyTaskbar");
			expect(nav).toHaveAttribute("aria-label", "Taskbar");
			// Two bands, each led by its gripper (comctl32's rebar draws one
			// once a second sizable band is there).
			expect(
				Array.from(nav?.children ?? [], (el) =>
					el.getAttribute("data-classicy-part"),
				),
			).toEqual([
				"taskbar-start",
				"taskbar-quick-launch",
				"taskbar-tasks-gripper",
				"taskbar-tasks",
				"taskbar-tray",
			]);
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

		// Plan 0020-w98 §2, "Drops" (WIG Ch.3 "Window Buttons", p.16; Ch.10,
		// p.211): a file drag resting on a button brings its window up.
		describe("a file drag resting on it", () => {
			const dropActivate = (button: HTMLButtonElement) =>
				act(() => {
					button.dispatchEvent(new Event(CLASSICY_DROP_ACTIVATE_EVENT));
				});

			it("marks every window button as one a resting drag activates", () => {
				register(entry("A.app", "one", { title: "One" }));
				register(entry("A.app", "two", { title: "Two" }));
				setApps(app("A.app", [win("one"), win("two", { collapsed: true })]));
				render(<ClassicyTaskbar />);
				for (const button of taskButtons())
					expect(button).toHaveAttribute(CLASSICY_DROP_ACTIVATE_ATTRIBUTE, "");
				// The Start button takes no part.
				expect(
					document.querySelector(".classicyTaskbarStart"),
				).not.toHaveAttribute(CLASSICY_DROP_ACTIVATE_ATTRIBUTE);
			});

			it("restores a minimized window and activates any other, never minimizing the active one", () => {
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
				expect(taskButton("One")).toHaveClass("active");
				dropActivate(taskButton("One"));
				dropActivate(taskButton("Two"));
				dropActivate(taskButton("Three"));
				expect(commands).toEqual([
					"one:activate",
					"two:activate",
					"three:restore",
				]);
			});

			it("decides on the store as it stands, not as it was drawn", () => {
				register(entry("A.app", "one", { title: "One" }));
				setApps(app("A.app", [win("one")]));
				render(<ClassicyTaskbar />);
				// Minimized since the last render, with no render in between.
				useAppManager.setState((state) =>
					produce(state, (draft) => {
						draft.System.Manager.Applications.apps[
							"A.app"
						].windows.one.collapsed = true;
					}),
				);
				dropActivate(taskButton("One"));
				expect(commands).toEqual(["one:restore"]);
			});

			it("is told by the drag engine once the drag has rested on it for 500 ms", () => {
				register(entry("A.app", "one", { title: "One" }));
				setApps(app("A.app", [win("one", { collapsed: true })]));
				render(<ClassicyTaskbar />);
				vi.useFakeTimers();
				const one = taskButton("One");
				const label = one.querySelector(".classicyTaskbarTaskLabel") as Element;
				const onDrop = vi.fn();
				const abandon = startClassicyFileDrag({
					start: { clientX: 40, clientY: 400 },
					parts: [],
					onDrop,
					elementsFromPoint: () => [label],
				});
				try {
					fireEvent.mouseMove(document, { clientX: 40, clientY: 700 });
					act(() => {
						vi.advanceTimersByTime(CLASSICY_DROP_ACTIVATE_DELAY_MS - 1);
					});
					expect(commands).toEqual([]);
					act(() => {
						vi.advanceTimersByTime(1);
					});
					expect(commands).toEqual(["one:restore"]);
					// Released on the button, nothing is dropped.
					fireEvent.mouseUp(document, { clientX: 40, clientY: 700 });
					expect(onDrop).toHaveBeenCalledWith(null, [40, 700], [40, 700]);
				} finally {
					abandon();
				}
			});

			it("stops listening once the button is gone", () => {
				register(entry("A.app", "one", { title: "One" }));
				setApps(app("A.app", [win("one")]));
				const { unmount } = render(<ClassicyTaskbar />);
				const one = taskButton("One");
				unmount();
				one.dispatchEvent(new Event(CLASSICY_DROP_ACTIVATE_EVENT));
				expect(commands).toEqual([]);
			});
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

	// Plan 0020-w98 E1, "Task-band paging": past one row at their least
	// width, the buttons show a row at a time behind an up/down control.
	// jsdom lays nothing out: the list's width and the control's are given,
	// and the package's least width and gap come from a stylesheet.
	describe("paging", () => {
		let style: HTMLStyleElement | null = null;
		let listWidth = 100;
		const withPackageStyle = () => {
			style = document.createElement("style");
			style.textContent =
				".classicyTaskbarTasks { column-gap: 3px; } .classicyTaskbarTasks > li { min-width: 22px; }";
			document.head.append(style);
		};
		const pager = () => document.querySelector(".classicyTaskbarPager");
		const up = () =>
			document.querySelector(".classicyTaskbarPagerUp") as HTMLButtonElement;
		const down = () =>
			document.querySelector(".classicyTaskbarPagerDown") as HTMLButtonElement;
		const shown = () => taskButtons().map((b) => b.textContent);
		const six = ["w1", "w2", "w3", "w4", "w5", "w6"];
		const seedSix = (focused = "w1") => {
			setApps(
				app(
					"A.app",
					six.map((id, i) =>
						win(id, { zOrder: i + 1, focused: id === focused }),
					),
					{ focused: true },
				),
			);
			for (const id of six) register(entry("A.app", id));
		};

		beforeEach(() => {
			listWidth = 100;
			vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
				function (this: HTMLElement) {
					return this.classList.contains("classicyTaskbarTasks")
						? listWidth
						: 0;
				},
			);
			vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(
				function (this: HTMLElement) {
					return this.classList.contains("classicyTaskbarPager") ? 16 : 0;
				},
			);
		});

		afterEach(() => {
			style?.remove();
			style = null;
			vi.restoreAllMocks();
		});

		it("shows a row of buttons at a time behind the up/down control once they no longer fit", () => {
			withPackageStyle();
			seedSix();
			render(<ClassicyTaskbar />);
			// Six buttons need 6 x 25; a 100 px row beside the control holds four.
			const list = document.querySelector(".classicyTaskbarTasks");
			expect(list).toHaveClass("classicyTaskbarTasksPaged");
			expect(shown()).toEqual(["w1", "w2", "w3", "w4"]);
			expect(pager()).toHaveAttribute("data-classicy-part", "taskbar-pager");
			expect(pager()?.previousElementSibling).toBe(list);
			expect(up()).toBeDisabled();
			expect(down()).not.toBeDisabled();
			expect(up()).toHaveAttribute(
				"aria-label",
				"Previous row of window buttons",
			);
			// The control acts at the press, taking no focus.
			const press = new MouseEvent("mousedown", {
				bubbles: true,
				cancelable: true,
				button: 0,
			});
			act(() => {
				down().dispatchEvent(press);
			});
			expect(press.defaultPrevented).toBe(true);
			expect(shown()).toEqual(["w5", "w6"]);
			expect(down()).toBeDisabled();
			expect(up()).not.toBeDisabled();
			// Enter or Space: a click with no press count.
			fireEvent.click(up(), { detail: 0 });
			expect(shown()).toEqual(["w1", "w2", "w3", "w4"]);
		});

		it("shows the active window's row when that window changes", () => {
			withPackageStyle();
			seedSix();
			render(<ClassicyTaskbar />);
			expect(shown()).toEqual(["w1", "w2", "w3", "w4"]);
			seedFocus("w6");
			expect(shown()).toEqual(["w5", "w6"]);
			expect(taskButton("w6")).toHaveClass("active");
			seedFocus("w2");
			expect(shown()).toEqual(["w1", "w2", "w3", "w4"]);
		});

		it("draws one row and no control again once the buttons fit", () => {
			withPackageStyle();
			seedSix();
			render(<ClassicyTaskbar />);
			expect(pager()).not.toBeNull();
			act(() => {
				for (const registration of made.splice(4))
					unregisterClassicyWindow(registration);
			});
			// Four buttons need 4 x 25, within the 100 px row and the 16 px
			// control's room.
			expect(pager()).toBeNull();
			expect(document.querySelector(".classicyTaskbarTasks")).not.toHaveClass(
				"classicyTaskbarTasksPaged",
			);
			expect(shown()).toEqual(["w1", "w2", "w3", "w4"]);
		});

		it("never pages under a package that gives the buttons no least width", () => {
			seedSix();
			render(<ClassicyTaskbar />);
			expect(pager()).toBeNull();
			expect(shown()).toEqual(six);
		});

		const seedFocus = (focused: string) =>
			act(() =>
				useAppManager.setState((state) =>
					produce(state, (draft) => {
						const own = draft.System.Manager.Applications.apps["A.app"];
						for (const w of Object.values(own.windows)) {
							w.focused = w.id === focused;
							if (w.id === focused) w.zOrder = 100 + Math.random();
						}
					}),
				),
			);
	});
});

describe("classicyTaskbarTasksPerPage", () => {
	const room = { listWidth: 100, pagerWidth: 0, minWidth: 22, gap: 3 };
	it("holds every button while each has its least width and gap", () => {
		expect(classicyTaskbarTasksPerPage({ ...room, count: 4 })).toBe(4);
		expect(classicyTaskbarTasksPerPage({ ...room, count: 0 })).toBe(0);
	});

	it("holds as many as fit beside the control past that, one at least", () => {
		// Before the control is drawn, the whole room.
		expect(classicyTaskbarTasksPerPage({ ...room, count: 6 })).toBe(4);
		// Beside it: the list's own width; without it the room is 116.
		expect(
			classicyTaskbarTasksPerPage({ ...room, count: 6, pagerWidth: 16 }),
		).toBe(4);
		expect(
			classicyTaskbarTasksPerPage({ ...room, count: 4, pagerWidth: 16 }),
		).toBe(4);
		expect(
			classicyTaskbarTasksPerPage({
				...room,
				count: 6,
				listWidth: 10,
				pagerWidth: 16,
			}),
		).toBe(1);
	});

	it("holds every button with no least width or no width laid out", () => {
		expect(
			classicyTaskbarTasksPerPage({ ...room, count: 9, minWidth: 0 }),
		).toBe(9);
		expect(
			classicyTaskbarTasksPerPage({ ...room, count: 9, listWidth: 0 }),
		).toBe(9);
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

	// Plan 0020-w98 §2, "Drops": "When the user drags an object over a
	// taskbar window button, the system automatically restores the window.
	// The user can then drop the object in the window" (WIG Ch.10, p.211).
	it("restores a minimized window through its own path when a file drag rests on its button", () => {
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
		fireEvent.click(button("Second"));
		expect(getAppWindow(appRecord(), "second")?.collapsed).toBe(true);
		expect(getAppWindow(appRecord(), "main")?.focused).toBe(true);

		vi.useFakeTimers();
		const onDrop = vi.fn();
		// Hit-testing as the browser would: the button, inside the taskbar,
		// inside the desktop that holds it.
		const abandon = startClassicyFileDrag({
			start: { clientX: 40, clientY: 300 },
			parts: [],
			onDrop,
			elementsFromPoint: () => [button("Second")],
		});
		try {
			fireEvent.mouseMove(document, { clientX: 140, clientY: 760 });
			act(() => {
				vi.advanceTimersByTime(CLASSICY_DROP_ACTIVATE_DELAY_MS);
			});
			expect(getAppWindow(appRecord(), "second")).toMatchObject({
				collapsed: false,
				focused: true,
			});
			expect(document.getElementById(`${APP_ID}_second`)).not.toHaveClass(
				"classicyWindowMinimized",
			);
			expect(button("Second")).toHaveClass("active");
			// Resting on: the window is not minimized again.
			act(() => {
				vi.advanceTimersByTime(CLASSICY_DROP_ACTIVATE_DELAY_MS * 4);
			});
			expect(getAppWindow(appRecord(), "second")?.collapsed).toBe(false);
			// The taskbar takes no drop.
			fireEvent.mouseUp(document, { clientX: 140, clientY: 760 });
			expect(onDrop).toHaveBeenCalledWith(null, [140, 760], [140, 760]);
		} finally {
			abandon();
			vi.useRealTimers();
		}
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

	// Plan 0020-w98 §2, "The taskbar's own menu": button 2 on the taskbar's
	// background (WIG App. B, Table B.3, p.359: WINDOWS+M, SHIFT+WINDOWS+M).
	describe("the taskbar's own menu", () => {
		const taskbarMenuItem = (id: string) => document.getElementById(id);
		const choose = async (id: string, settled: () => void) => {
			const item = taskbarMenuItem(id) as HTMLElement;
			fireEvent.click(item);
			dispatchAnimationEnd(item);
			await waitFor(settled);
		};
		const openTaskbarMenu = (target: Element = taskbar()) =>
			fireEvent.contextMenu(target, { clientX: 300, clientY: 750 });
		const taskbar = () =>
			document.querySelector(".classicyTaskbar") as HTMLElement;
		const collapsed = (id: string) =>
			getAppWindow(appRecord(), id)?.collapsed === true;
		const threeWindows = (
			<>
				<ClassicyWindow id="main" appId={APP_ID} title="Main">
					<p>main</p>
				</ClassicyWindow>
				<ClassicyWindow id="second" appId={APP_ID} title="Second">
					<p>second</p>
				</ClassicyWindow>
				<ClassicyWindow
					id="palette"
					appId={APP_ID}
					title="Palette"
					windowType="utility"
				>
					<p>palette</p>
				</ClassicyWindow>
			</>
		);

		beforeEach(() => {
			registerTestTaskbarPackage(
				TEST_MINIMIZE_LAYOUT,
				TEST_MINIMIZE_PACKAGE_ID,
			);
			act(() =>
				dispatch({
					type: "ClassicyDesktopChangeAppearancePackage",
					packageId: TEST_MINIMIZE_PACKAGE_ID,
				}),
			);
		});

		it("opens on the taskbar's background, with no Help item, and not on its buttons", () => {
			renderShell(threeWindows);
			openTaskbarMenu();
			expect(
				taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.minimizeAll),
			).toHaveTextContent("Minimize All Windows");
			expect(
				taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.properties),
			).toHaveTextContent("Properties");
			expect(document.getElementById("contextual-help")).toBeNull();
			// The list around the window buttons and the status area are
			// background too.
			for (const selector of [
				".classicyTaskbarTasks",
				".classicyTaskbarTray",
				".classicyTaskbarTrayIcons",
				".classicyTaskbarTrayExtensions",
			]) {
				act(() => {
					fireEvent.keyDown(document.activeElement ?? document.body, {
						key: "Escape",
					});
				});
				expect(
					taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.properties),
				).toBeNull();
				openTaskbarMenu(document.querySelector(selector) as Element);
				expect(
					taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.properties),
				).not.toBeNull();
			}
			act(() => {
				fireEvent.keyDown(document.activeElement ?? document.body, {
					key: "Escape",
				});
			});
			// The Start button shows nothing; a window button its window's.
			const start = document.querySelector(
				".classicyTaskbarStart",
			) as HTMLElement;
			const onStart = new MouseEvent("contextmenu", {
				bubbles: true,
				cancelable: true,
			});
			start.dispatchEvent(onStart);
			expect(onStart.defaultPrevented).toBe(true);
			expect(taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.properties)).toBeNull();
			openTaskbarMenu(button("Main"));
			expect(taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.properties)).toBeNull();
		});

		it("never lets the desktop's menu open over the taskbar", () => {
			renderShell(threeWindows);
			const onBar = new MouseEvent("contextmenu", {
				bubbles: true,
				cancelable: true,
			});
			taskbar().dispatchEvent(onBar);
			expect(onBar.defaultPrevented).toBe(true);
			// The desktop's own menu leads with its File menu.
			expect(document.getElementById("finder_file")).toBeNull();
		});

		it("minimizes every window with a Minimize box at once, the focus passing on in one commit", async () => {
			const commits: string[] = [];
			const Probe = () => {
				const snapshot = useAppManager((s) => {
					const own = s.System.Manager.Applications.apps[APP_ID];
					const shut = listAppWindows(own).filter(
						(w) => w.collapsed === true,
					).length;
					return `${shut}:${s.System.Manager.Applications.focusedAppId}`;
				});
				useLayoutEffect(() => {
					commits.push(snapshot);
				});
				return null;
			};
			renderShell(
				<>
					{threeWindows}
					<Probe />
				</>,
			);
			expect(button("Second")).toHaveClass("active");
			openTaskbarMenu();
			commits.length = 0;
			await choose(CLASSICY_TASKBAR_MENU_IDS.minimizeAll, () =>
				expect(collapsed("second")).toBe(true),
			);
			expect(collapsed("main")).toBe(true);
			// A palette has no button and no Minimize box: it is hidden with
			// its app's windows, its own record untouched.
			expect(collapsed("palette")).toBe(false);
			expect(getAppWindow(appRecord(), "main")?.focused).not.toBe(true);
			expect(getAppWindow(appRecord(), "second")?.focused).toBe(false);
			// Both went in the one commit, which took the focus to the
			// desktop (Finder): no window was focused on the way.
			expect(commits).toEqual([
				`2:${useAppManager.getState().System.Manager.Applications.focusedAppId}`,
			]);
			expect(
				useAppManager.getState().System.Manager.Applications.focusedAppId,
			).not.toBe(APP_ID);
			expect(button("Main")).toHaveClass("collapsed");
			expect(button("Second")).toHaveClass("collapsed");
		});

		it("then reads Undo Minimize All, which restores them and activates the window that was active", async () => {
			renderShell(threeWindows);
			openTaskbarMenu();
			await choose(CLASSICY_TASKBAR_MENU_IDS.minimizeAll, () =>
				expect(collapsed("second")).toBe(true),
			);
			openTaskbarMenu();
			// Both stand, as in explorer's menu: Minimize All Windows, dimmed
			// with nothing left to minimize, and its Undo below it.
			expect(
				taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.minimizeAll),
			).toHaveClass("disabled");
			expect(taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.undo)).toHaveTextContent(
				"Undo Minimize All",
			);
			await choose(CLASSICY_TASKBAR_MENU_IDS.undo, () =>
				expect(getAppWindow(appRecord(), "second")?.focused).toBe(true),
			);
			expect(collapsed("main")).toBe(false);
			expect(collapsed("second")).toBe(false);
			expect(button("Second")).toHaveClass("active");
			// Undone, it is forgotten.
			openTaskbarMenu();
			expect(taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.undo)).toBeNull();
			expect(
				taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.minimizeAll),
			).not.toHaveClass("disabled");
		});

		it("forgets what it minimized once one of those windows is restored by hand", async () => {
			renderShell(threeWindows);
			openTaskbarMenu();
			await choose(CLASSICY_TASKBAR_MENU_IDS.minimizeAll, () =>
				expect(collapsed("second")).toBe(true),
			);
			fireEvent.click(button("Main"));
			expect(collapsed("main")).toBe(false);
			// Minimized again, it is not the Undo's any more.
			fireEvent.click(button("Main"));
			expect(collapsed("main")).toBe(true);
			openTaskbarMenu();
			expect(taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.undo)).toBeNull();
			expect(
				taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.minimizeAll),
			).toHaveClass("disabled");
		});

		it("forgets what it minimized once one of those windows is closed", async () => {
			renderShell(threeWindows);
			openTaskbarMenu();
			await choose(CLASSICY_TASKBAR_MENU_IDS.minimizeAll, () =>
				expect(collapsed("second")).toBe(true),
			);
			act(() =>
				dispatch({
					type: "ClassicyWindowClose",
					app: { id: APP_ID },
					window: { id: "main" },
				}),
			);
			openTaskbarMenu();
			expect(taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.undo)).toBeNull();
		});

		it("dims Minimize All Windows while no window can be minimized", () => {
			renderShell(
				<ClassicyWindow
					id="main"
					appId={APP_ID}
					title="Main"
					collapsable={false}
				>
					<p>main</p>
				</ClassicyWindow>,
			);
			// Other apps' windows (Finder's) may hold buttons too.
			for (const other of Array.from(
				document.querySelectorAll<HTMLButtonElement>(".classicyTaskbarTask"),
			))
				if (
					!other.classList.contains("collapsed") &&
					other.textContent !== "Main"
				)
					throw new Error(`unexpected window button "${other.textContent}"`);
			openTaskbarMenu();
			expect(
				taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.minimizeAll),
			).toHaveClass("disabled");
		});

		it("opens the Control Strip control panel from Properties", async () => {
			renderShell(threeWindows);
			openTaskbarMenu();
			await choose(CLASSICY_TASKBAR_MENU_IDS.properties, () =>
				expect(
					useAppManager.getState().System.Manager.Applications.apps[
						CONTROL_STRIP_MANAGER_APP_ID
					]?.open,
				).toBe(true),
			);
		});

		// Plan 0020-w98 E1: Toolbars ▸ Quick Launch, the band site's menu
		// (browselc.dll's menu 268), over the bar and its bands only.
		it("leads with Toolbars ▸ Quick Launch over the bar, which hides Quick Launch and shows it again", async () => {
			renderShell(threeWindows);
			const quickLaunch = () =>
				document.querySelector(".classicyTaskbarQuickLaunch");
			const gripper = () =>
				document.querySelector('[data-classicy-part="taskbar-tasks-gripper"]');
			expect(quickLaunch()).not.toBeNull();
			expect(gripper()).not.toBeNull();
			openTaskbarMenu();
			const item = taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.quickLaunch);
			expect(item).toHaveTextContent("Quick Launch");
			expect(item).toHaveAttribute("aria-checked", "true");
			await choose(CLASSICY_TASKBAR_MENU_IDS.quickLaunch, () =>
				expect(quickLaunch()).toBeNull(),
			);
			// One band left: no gripper.
			expect(gripper()).toBeNull();
			expect(useAppManager.getState().System.Manager.Desktop.taskbar).toEqual({
				quickLaunch: false,
			});
			openTaskbarMenu();
			expect(
				taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.quickLaunch),
			).toHaveAttribute("aria-checked", "false");
			await choose(CLASSICY_TASKBAR_MENU_IDS.quickLaunch, () =>
				expect(quickLaunch()).not.toBeNull(),
			);
			// Over the status area: the tray's menu, with no Toolbars ▸.
			openTaskbarMenu(
				document.querySelector(".classicyTaskbarTray") as Element,
			);
			expect(
				taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.properties),
			).not.toBeNull();
			expect(taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.toolbars)).toBeNull();
		});

		// Plan 0020-w98 E1: Cascade Windows and Tile Windows (ReactOS
		// `CascadeWindows` and `TileWindows`), and the menu's one Undo
		// (explorer's "&Undo %s"). jsdom lays out no desktop and no frame, so
		// the work area is the 1024 x 768 viewport and each window's outer
		// rect is its content's.
		describe("Cascade and Tile", () => {
			const arranged = (
				<>
					<ClassicyWindow
						id="main"
						appId={APP_ID}
						title="Main"
						initialSize={[400, 300]}
						initialPosition={[100, 100]}
					>
						<p>main</p>
					</ClassicyWindow>
					<ClassicyWindow
						id="second"
						appId={APP_ID}
						title="Second"
						initialSize={[400, 300]}
						initialPosition={[200, 150]}
					>
						<p>second</p>
					</ClassicyWindow>
					<ClassicyWindow
						id="palette"
						appId={APP_ID}
						title="Palette"
						windowType="utility"
						initialPosition={[600, 40]}
					>
						<p>palette</p>
					</ClassicyWindow>
				</>
			);
			const rectOf = (id: string) => {
				const record = getAppWindow(appRecord(), id);
				return { position: record?.position, size: record?.size };
			};
			// SM_CXSIZEFRAME plus SM_CXSIZE from the theme, a whole pixel.
			const step = () =>
				Math.round(
					readClassicyThemeVar("--window-frame-inset") +
						readClassicyThemeVar("--window-title-bar-height"),
				);
			const ORIGINAL = {
				main: { position: [100, 100], size: [400, 300] },
				second: { position: [200, 150], size: [400, 300] },
			};

			it("cascades the shown windows from the back one, keeps the stacking and activates the front one, then undoes it", async () => {
				renderShell(arranged);
				expect(button("Second")).toHaveClass("active");
				const palette = rectOf("palette");
				openTaskbarMenu();
				await choose(CLASSICY_TASKBAR_MENU_IDS.cascade, () =>
					expect(rectOf("main").position).toEqual([0, 0]),
				);
				// 4/7 of the 1024 x 768 work area at least.
				expect(rectOf("main")).toEqual({ position: [0, 0], size: [585, 438] });
				expect(rectOf("second")).toEqual({
					position: [step(), step()],
					size: [585, 438],
				});
				// A palette has no button: it stays where it was.
				expect(rectOf("palette")).toEqual(palette);
				expect(getAppWindow(appRecord(), "second")?.focused).toBe(true);
				expect(
					getAppWindow(appRecord(), "second")?.zOrder ?? 0,
				).toBeGreaterThan(getAppWindow(appRecord(), "main")?.zOrder ?? 0);
				openTaskbarMenu();
				expect(
					taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.undo),
				).toHaveTextContent("Undo Cascade");
				await choose(CLASSICY_TASKBAR_MENU_IDS.undo, () =>
					expect(rectOf("main")).toEqual(ORIGINAL.main),
				);
				expect(rectOf("second")).toEqual(ORIGINAL.second);
				openTaskbarMenu();
				expect(taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.undo)).toBeNull();
			});

			it("tiles the windows side by side, vertically, and stacked, horizontally", async () => {
				renderShell(arranged);
				openTaskbarMenu();
				await choose(CLASSICY_TASKBAR_MENU_IDS.tileVertically, () =>
					expect(rectOf("second").position).toEqual([512, 0]),
				);
				expect(rectOf("main")).toEqual({ position: [0, 0], size: [512, 768] });
				expect(rectOf("second")).toEqual({
					position: [512, 0],
					size: [512, 768],
				});
				openTaskbarMenu();
				expect(
					taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.undo),
				).toHaveTextContent("Undo Tile");
				await choose(CLASSICY_TASKBAR_MENU_IDS.tileHorizontally, () =>
					expect(rectOf("second").position).toEqual([0, 384]),
				);
				expect(rectOf("main")).toEqual({ position: [0, 0], size: [1024, 384] });
				expect(rectOf("second")).toEqual({
					position: [0, 384],
					size: [1024, 384],
				});
				// The Undo of a run of arrangements returns to the places before
				// the first (ReactOS backs the windows up only when nothing is
				// arranged).
				openTaskbarMenu();
				await choose(CLASSICY_TASKBAR_MENU_IDS.undo, () =>
					expect(rectOf("main")).toEqual(ORIGINAL.main),
				);
				expect(rectOf("second")).toEqual(ORIGINAL.second);
			});

			it("dims the arrangements while no window is shown, and leaves minimized windows alone", async () => {
				renderShell(arranged);
				fireEvent.click(button("Second"));
				expect(getAppWindow(appRecord(), "second")?.collapsed).toBe(true);
				openTaskbarMenu();
				await choose(CLASSICY_TASKBAR_MENU_IDS.cascade, () =>
					expect(rectOf("main").position).toEqual([0, 0]),
				);
				// The lone shown window keeps its size.
				expect(rectOf("main")).toEqual({ position: [0, 0], size: [400, 300] });
				expect(rectOf("second")).toEqual(ORIGINAL.second);
				fireEvent.click(button("Main"));
				expect(getAppWindow(appRecord(), "main")?.collapsed).toBe(true);
				openTaskbarMenu();
				for (const id of [
					CLASSICY_TASKBAR_MENU_IDS.cascade,
					CLASSICY_TASKBAR_MENU_IDS.tileHorizontally,
					CLASSICY_TASKBAR_MENU_IDS.tileVertically,
				])
					expect(taskbarMenuItem(id)).toHaveClass("disabled");
				// With nothing to arrange, the arrangement's Undo is gone.
				expect(taskbarMenuItem(CLASSICY_TASKBAR_MENU_IDS.undo)).toBeNull();
			});

			it("restores a maximized window before it cascades it, and its Undo maximizes it again", async () => {
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
				try {
					renderShell(arranged);
					act(() => {
						runClassicyWindowCommand(APP_ID, "second", { type: "maximize" });
					});
					expect(getAppWindow(appRecord(), "second")?.zoomed).toBe(true);
					openTaskbarMenu();
					await choose(CLASSICY_TASKBAR_MENU_IDS.cascade, () =>
						expect(getAppWindow(appRecord(), "second")?.zoomed).toBe(false),
					);
					expect(rectOf("second")).toEqual({
						position: [step(), step()],
						size: [585, 438],
					});
					openTaskbarMenu();
					await choose(CLASSICY_TASKBAR_MENU_IDS.undo, () =>
						expect(getAppWindow(appRecord(), "second")?.zoomed).toBe(true),
					);
					expect(getAppWindow(appRecord(), "second")?.restoreRect).toEqual(
						ORIGINAL.second,
					);
					expect(rectOf("main")).toEqual(ORIGINAL.main);
				} finally {
					unregisterClassicyAppearancePackage(
						TEST_SHELL_SYSTEM_MENU_PACKAGE_ID,
					);
				}
			});
		});
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
		const windowRoot = (id: string) =>
			document.getElementById(`${APP_ID}_${id}`) as HTMLElement;
		// jsdom lays nothing out: give the desktop a size, so a maximized
		// window has a work area to take.
		const sizeDesktop = () => {
			const desktop = document.getElementById("classicyDesktop") as HTMLElement;
			Object.defineProperty(desktop, "clientWidth", {
				configurable: true,
				value: 1024,
			});
			Object.defineProperty(desktop, "clientHeight", {
				configurable: true,
				value: 768,
			});
		};
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

			// Windows clears WS_MAXIMIZE as it minimizes a maximized window
			// (keeping WPF_RESTORETOMAXIMIZED), so its menu offers Maximize
			// beside Restore (Wine's `MENU_InitSysMenuPopup`), and Maximize
			// shows it maximized (SC_MAXIMIZE).
			it("offers Maximize on a window minimized while maximized, which brings it back maximized", async () => {
				renderShell(twoWindows);
				sizeDesktop();
				fireEvent.click(
					windowRoot("second").querySelector(
						".classicyWindowZoomBox",
					) as HTMLElement,
				);
				expect(getAppWindow(appRecord(), "second")?.zoomed).toBe(true);
				const maximizedSize = getAppWindow(appRecord(), "second")?.size;
				expect(maximizedSize?.[0]).toBe(1024);
				fireEvent.click(button("Second"));
				expect(getAppWindow(appRecord(), "second")).toMatchObject({
					collapsed: true,
					zoomed: true,
				});
				fireEvent.contextMenu(button("Second"), {
					clientX: 90,
					clientY: 700,
				});
				expect(menuItem("second", "restore")).not.toHaveClass("disabled");
				expect(menuItem("second", "maximize")).not.toHaveClass("disabled");
				fireEvent.click(menuItem("second", "maximize"));
				dispatchAnimationEnd(menuItem("second", "maximize"));
				await waitFor(() =>
					expect(getAppWindow(appRecord(), "second")).toMatchObject({
						collapsed: false,
						zoomed: true,
						focused: true,
					}),
				);
				expect(getAppWindow(appRecord(), "second")?.size).toEqual(
					maximizedSize,
				);
				expect(windowRoot("second")).toHaveClass("classicyWindowMaximized");
			});

			it("maximizes a minimized window from its menu, storing the size it is drawn at", async () => {
				renderShell(twoWindows);
				sizeDesktop();
				fireEvent.click(button("Second"));
				expect(getAppWindow(appRecord(), "second")).toMatchObject({
					collapsed: true,
				});
				fireEvent.contextMenu(button("Second"), {
					clientX: 90,
					clientY: 700,
				});
				fireEvent.click(menuItem("second", "maximize"));
				dispatchAnimationEnd(menuItem("second", "maximize"));
				await waitFor(() =>
					expect(getAppWindow(appRecord(), "second")).toMatchObject({
						collapsed: false,
						zoomed: true,
					}),
				);
				const root = windowRoot("second");
				expect(root).toHaveClass("classicyWindowMaximized");
				expect(root.style.width).toBe("1024px");
				// The record holds the size the window is drawn at (stored
				// once it is drawn again: a minimized window stores none).
				expect(getAppWindow(appRecord(), "second")?.size).toEqual([
					Number.parseFloat(root.style.width),
					Number.parseFloat(root.style.height),
				]);
			});
		});
	});
});
