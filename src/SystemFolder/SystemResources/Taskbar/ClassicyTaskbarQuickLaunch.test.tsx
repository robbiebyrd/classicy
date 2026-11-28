import { produce } from "immer";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/__tests__/withPlatinum";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_MINIMIZE_LAYOUT,
	TEST_MINIMIZE_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
// Registers the Finder's actions (ClassicyAppFinderOpenFolder).
import "@/SystemFolder/Finder/FinderContext";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	addClassicyQuickLaunchApp,
	getClassicyQuickLaunchApps,
} from "@/SystemFolder/SystemResources/App/ClassicyQuickLaunchApps.internal";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { CLASSICY_TASKBAR_MENU_IDS } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarMenu.internal";
import {
	CLASSICY_QUICK_LAUNCH_OPEN_ITEM_ID,
	CLASSICY_QUICK_LAUNCH_SHOW_DESKTOP_LABEL,
	classicyQuickLaunchItems,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarQuickLaunch.internal";
import { CLASSICY_TASKBAR_TOOLTIP_DELAY_MS } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTasks.internal";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

// Plan 0020-w98 E1, "Quick Launch": the Windows 98 toolbar band after the
// Start button, with the file browser's launcher, Show Desktop and the
// apps the host marks, each a flat button whose name is its tooltip.

describe("classicyQuickLaunchItems", () => {
	const noop = () => {};
	const app = (id: string, label = id) => ({
		id,
		name: id,
		icon: `${id}.png`,
		label,
		shown: `${id}-shown.png`,
	});

	it("is the file browser, Show Desktop, then the marked apps in order, as Windows 98 SE's Quick Launch", () => {
		const items = classicyQuickLaunchItems({
			finder: { label: "Finder", icon: "finder.png" },
			apps: [app("B.app", "Bee"), app("A.app", "Ay")],
			onFinder: noop,
			onShowDesktop: noop,
			onApp: noop,
		});
		expect(items.map((i) => [i.key, i.label, i.icon])).toEqual([
			["Finder.app", "Finder", "finder.png"],
			["show-desktop", CLASSICY_QUICK_LAUNCH_SHOW_DESKTOP_LABEL, undefined],
			["B.app", "Bee", "B.app-shown.png"],
			["A.app", "Ay", "A.app-shown.png"],
		]);
	});

	it("gives an app one button, the Finder's included, and none to an absent Finder", () => {
		const items = classicyQuickLaunchItems({
			apps: [app("A.app"), app("A.app"), app("Finder.app")],
			onFinder: noop,
			onShowDesktop: noop,
			onApp: noop,
		});
		expect(items.map((i) => i.key)).toEqual([
			"show-desktop",
			"A.app",
			"Finder.app",
		]);
		const marked = classicyQuickLaunchItems({
			finder: { label: "Finder", icon: "" },
			apps: [app("Finder.app")],
			onFinder: noop,
			onShowDesktop: noop,
			onApp: noop,
		});
		expect(marked.map((i) => i.key)).toEqual(["Finder.app", "show-desktop"]);
	});

	it("runs each button's own command", () => {
		const onFinder = vi.fn();
		const onShowDesktop = vi.fn();
		const onApp = vi.fn();
		const items = classicyQuickLaunchItems({
			finder: { label: "Finder", icon: "" },
			apps: [app("A.app")],
			onFinder,
			onShowDesktop,
			onApp,
		});
		for (const item of items) item.launch();
		expect(onFinder).toHaveBeenCalledTimes(1);
		expect(onShowDesktop).toHaveBeenCalledTimes(1);
		expect(onApp).toHaveBeenCalledWith(
			expect.objectContaining({ id: "A.app" }),
		);
	});
});

describe("the Quick Launch app list", () => {
	it("lists an app while a registration of it remains, in the order apps were first marked", () => {
		const removeB = addClassicyQuickLaunchApp({
			id: "B.app",
			name: "B",
			icon: "",
		});
		const removeA = addClassicyQuickLaunchApp({
			id: "A.app",
			name: "A",
			icon: "",
		});
		const removeB2 = addClassicyQuickLaunchApp({
			id: "B.app",
			name: "B2",
			icon: "",
		});
		expect(getClassicyQuickLaunchApps().map((a) => [a.id, a.name])).toEqual([
			["B.app", "B2"],
			["A.app", "A"],
		]);
		removeB2();
		expect(getClassicyQuickLaunchApps().map((a) => a.name)).toEqual(["B", "A"]);
		removeB();
		removeB();
		removeA();
		expect(getClassicyQuickLaunchApps()).toEqual([]);
	});
});

describe("ClassicyTaskbar's Quick Launch", () => {
	const APP_ID = "T.app";
	const appRecord = (id = APP_ID) =>
		useAppManager.getState().System.Manager.Applications.apps[id];
	const quickLaunchButton = (label: string) =>
		document.querySelector(
			`.classicyTaskbarQuickLaunchButton[aria-label="${label}"]`,
		) as HTMLButtonElement | null;
	const renderShell = (children: ReactNode) =>
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false}>{children}</ClassicyDesktop>
			</ClassicyAppManagerProvider>,
		);
	const twoWindows = (
		<ClassicyApp id={APP_ID} name="T" icon="">
			<ClassicyWindow id="main" appId={APP_ID} title="Main">
				<p>main</p>
			</ClassicyWindow>
			<ClassicyWindow id="second" appId={APP_ID} title="Second">
				<p>second</p>
			</ClassicyWindow>
		</ClassicyApp>
	);

	beforeEach(() => {
		localStorage.clear();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		// The windows' app, open, so its windows draw.
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
		);
		registerTestTaskbarPackage(TEST_MINIMIZE_LAYOUT, TEST_MINIMIZE_PACKAGE_ID);
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: TEST_MINIMIZE_PACKAGE_ID,
			}),
		);
	});

	afterEach(() => {
		unregisterClassicyAppearancePackage(TEST_MINIMIZE_PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		vi.useRealTimers();
	});

	it("is a labelled toolbar after the Start button, led by a gripper, with the Finder, Show Desktop and the marked apps only", () => {
		renderShell(
			<>
				<ClassicyApp
					id="Marked.app"
					name="Marked"
					icon="marked.png"
					showInQuickLaunch
				/>
				<ClassicyApp id="Plain.app" name="Plain" icon="plain.png" />
			</>,
		);
		const toolbar = document.querySelector(".classicyTaskbarQuickLaunch");
		expect(toolbar).toHaveAttribute("role", "toolbar");
		expect(toolbar).toHaveAttribute("aria-label", "Quick Launch");
		expect(toolbar).toHaveAttribute(
			"data-classicy-part",
			"taskbar-quick-launch",
		);
		expect(toolbar?.firstElementChild).toHaveClass("classicyTaskbarGripper");
		expect(toolbar?.previousElementSibling).toHaveClass("classicyTaskbarStart");
		const labels = Array.from(
			document.querySelectorAll(".classicyTaskbarQuickLaunchButton"),
			(b) => b.getAttribute("aria-label"),
		);
		// The desktop mounts the Finder, the file browser's launcher.
		expect(labels).toEqual([
			"Finder",
			CLASSICY_QUICK_LAUNCH_SHOW_DESKTOP_LABEL,
			"Marked",
		]);
		// Show Desktop's glyph is the package's to draw.
		const glyph = quickLaunchButton(
			CLASSICY_QUICK_LAUNCH_SHOW_DESKTOP_LABEL,
		)?.querySelector(".classicyTaskbarShowDesktopIcon");
		expect(glyph).toBeEmptyDOMElement();
		expect(
			quickLaunchButton("Marked")?.querySelector(
				"img.classicyTaskbarQuickLaunchIcon",
			),
		).toHaveAttribute("src", "marked.png");
	});

	it("shows each button's name as a tooltip after the ToolTip delay, whatever Balloon Help says", () => {
		vi.useFakeTimers();
		renderShell(
			<ClassicyApp id="Marked.app" name="Marked" icon="" showInQuickLaunch />,
		);
		act(() =>
			dispatch({
				type: "ClassicyDesktopSetBalloonHelp",
				disableBalloonHelp: true,
			}),
		);
		const target = quickLaunchButton("Marked") as HTMLButtonElement;
		fireEvent.mouseEnter(target);
		act(() => {
			vi.advanceTimersByTime(CLASSICY_TASKBAR_TOOLTIP_DELAY_MS - 1);
		});
		expect(document.querySelector(".classicyBalloonHelp")).toBeNull();
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(document.querySelector(".classicyBalloonHelp")).toHaveTextContent(
			"Marked",
		);
		fireEvent.mouseLeave(target);
	});

	it("opens a marked app, and keeps the focus where it was on the press", () => {
		renderShell(
			<ClassicyApp id="Marked.app" name="Marked" icon="" showInQuickLaunch />,
		);
		expect(appRecord("Marked.app")?.open).not.toBe(true);
		const target = quickLaunchButton("Marked") as HTMLButtonElement;
		const press = new MouseEvent("mousedown", {
			bubbles: true,
			cancelable: true,
			button: 0,
		});
		target.dispatchEvent(press);
		expect(press.defaultPrevented).toBe(true);
		fireEvent.click(target);
		expect(appRecord("Marked.app")?.open).toBe(true);
	});

	it("shows the desktop, minimizing every window, and a second press restores them", () => {
		renderShell(twoWindows);
		const showDesktop = () =>
			quickLaunchButton(
				CLASSICY_QUICK_LAUNCH_SHOW_DESKTOP_LABEL,
			) as HTMLButtonElement;
		const collapsed = (id: string) =>
			getAppWindow(appRecord(), id)?.collapsed === true;
		fireEvent.click(showDesktop());
		expect(collapsed("main")).toBe(true);
		expect(collapsed("second")).toBe(true);
		expect(appRecord()?.focused).not.toBe(true);
		fireEvent.click(showDesktop());
		expect(collapsed("main")).toBe(false);
		expect(collapsed("second")).toBe(false);
		expect(getAppWindow(appRecord(), "second")?.focused).toBe(true);
		// A window restored by hand forgets the list; the next press
		// minimizes what is shown again.
		fireEvent.click(showDesktop());
		fireEvent.click(
			document.querySelector(
				'.classicyTaskbarTask[aria-pressed="false"]',
			) as HTMLButtonElement,
		);
		fireEvent.click(showDesktop());
		expect(collapsed("main")).toBe(true);
		expect(collapsed("second")).toBe(true);
	});

	it("launches the Finder on the startup disk, and brings its window forward once open", () => {
		renderShell(twoWindows);
		const openPaths = () =>
			(appRecord("Finder.app")?.data as { openPaths?: string[] } | undefined)
				?.openPaths ?? [];
		const disk = () => getAppWindow(appRecord("Finder.app"), "Macintosh HD");
		expect(openPaths()).not.toContain("Macintosh HD");
		fireEvent.click(quickLaunchButton("Finder") as HTMLButtonElement);
		expect(openPaths()).toContain("Macintosh HD");
		expect(disk()?.closed).toBe(false);
		// Open: the next press brings it forward, restoring it when minimized.
		fireEvent.click(
			Array.from(
				document.querySelectorAll<HTMLButtonElement>(".classicyTaskbarTask"),
			).find((b) => b.textContent === "Main") as HTMLButtonElement,
		);
		expect(disk()?.focused).not.toBe(true);
		fireEvent.click(quickLaunchButton("Finder") as HTMLButtonElement);
		expect(disk()?.focused).toBe(true);
	});

	it("opens the taskbar's menu on button 2, led by the button's Open, its default item", () => {
		renderShell(
			<ClassicyApp id="Marked.app" name="Marked" icon="" showInQuickLaunch />,
		);
		fireEvent.contextMenu(quickLaunchButton("Marked") as HTMLButtonElement, {
			clientX: 40,
			clientY: 750,
		});
		const open = document.getElementById(CLASSICY_QUICK_LAUNCH_OPEN_ITEM_ID);
		expect(open).toHaveTextContent("Open");
		expect(open).toHaveClass("default");
		expect(
			document.getElementById(CLASSICY_TASKBAR_MENU_IDS.toolbars),
		).not.toBeNull();
		expect(
			document.getElementById(CLASSICY_TASKBAR_MENU_IDS.properties),
		).not.toBeNull();
	});

	it("is not drawn, and the mark stores nothing, under a package with no taskbar", () => {
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: "platinum",
			}),
		);
		renderShell(
			<ClassicyApp id="Marked.app" name="Marked" icon="" showInQuickLaunch />,
		);
		expect(document.querySelector(".classicyTaskbar")).toBeNull();
		expect(document.querySelector(".classicyTaskbarQuickLaunch")).toBeNull();
		// A runtime mark only: the app's record holds nothing of it, and the
		// desktop no taskbar preference.
		expect(getClassicyQuickLaunchApps().map((a) => a.id)).toEqual([
			"Marked.app",
		]);
		expect(JSON.stringify(appRecord("Marked.app"))).not.toMatch(/quick/i);
		expect(
			useAppManager.getState().System.Manager.Desktop.taskbar,
		).toBeUndefined();
	});
});
