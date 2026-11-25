import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-platinum";
import { WINDOWS98_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-windows98";
import { act, fireEvent, render } from "@testing-library/react";
import { produce } from "immer";
import type { ComponentProps, CSSProperties } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	registerTestMirrorPackage,
	TEST_MIRROR_PACKAGE_ID,
} from "@/__tests__/testMirrorPackage";
import {
	registerTestTaskbarPackage,
	TEST_SYSTEM_MENU_LAYOUT,
	TEST_SYSTEM_MENU_PACKAGE_ID,
	TEST_TASKBAR_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { classicyCascadeWinner } from "@/Appearance/__tests__/classicyCascadeWinner";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import type { ClassicyControlStripProps } from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStrip";
import { useClassicyControlStripDisabledModules } from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

// Importing the Platinum module registered it; keep that object so every test
// starts from the real Platinum registration (platinum.json's layout), not
// from an empty registry's CLASSICY_DEFAULT_APPEARANCE_LAYOUT fallback.
const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;
// The Windows 98 package's registration as its module made it, for the
// shell's case (its own layout, plan 0020-w98 step 16).
const windows98 = getClassicyAppearancePackage(
	WINDOWS98_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

const renderDesktop = (
	style?: CSSProperties,
	controlStrip?: boolean | ClassicyControlStripProps,
) =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop
				startupScreen={false}
				style={style}
				controlStrip={controlStrip}
			/>
		</ClassicyAppManagerProvider>,
	);

const APP_ID = "T.app";

const fileMenu: ClassicyMenuItem[] = [
	{ id: "file", title: "File", menuChildren: [{ id: "new", title: "New" }] },
];

const openApp = () =>
	useAppManager.setState((state) =>
		produce(state, (draft) => {
			draft.System.Manager.Applications.apps[APP_ID] = {
				id: APP_ID,
				name: "T",
				icon: "",
				windows: {},
				open: true,
				focused: true,
				data: {},
			};
		}),
	);

const renderDesktopWithWindow = (
	windowProps: Partial<ComponentProps<typeof ClassicyWindow>> = {},
) =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop startupScreen={false}>
				<ClassicyApp id={APP_ID} name="T" icon="">
					<ClassicyWindow
						id="main"
						appId={APP_ID}
						title="Main"
						appMenu={fileMenu}
						{...windowProps}
					>
						<p>body</p>
					</ClassicyWindow>
				</ClassicyApp>
			</ClassicyDesktop>
		</ClassicyAppManagerProvider>,
	);

const activate = (packageId: string) =>
	act(() =>
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId }),
	);

const desktopRoot = (container: HTMLElement) =>
	container.querySelector(".classicyDesktop") as HTMLElement | null;

describe("ClassicyDesktop layout", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage(platinum);
		useAppManager.setState(DefaultAppManagerState, true);
	});

	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("publishes the layout on the desktop root", () => {
		expect(platinum.layout).toEqual({
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
			slider: { thumbDrag: "onRelease" },
		});
		expect(getClassicyAppearancePackage(PLATINUM_APPEARANCE_PACKAGE_ID)).toBe(
			platinum,
		);
		const { container } = renderDesktop();
		const root = desktopRoot(container);
		expect(root?.getAttribute("data-classicy-menu-bar")).toBe("screen");
		expect(root?.getAttribute("data-classicy-grow-box")).toBe("bottom-right");
		expect(
			root?.style.getPropertyValue("--classicy-layout-grow-box-corner"),
		).toBe("bottom-right");
		expect(
			root?.style.getPropertyValue("--classicy-layout-menu-bar-placement"),
		).toBe("screen");
		expect(
			root?.style.getPropertyValue("--classicy-layout-icon-grid-origin"),
		).toBe("top-right");
	});

	it("follows a switch to another package", () => {
		registerTestMirrorPackage();
		const { container } = renderDesktop();
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: TEST_MIRROR_PACKAGE_ID,
			}),
		);
		const root = desktopRoot(container);
		expect(root?.getAttribute("data-classicy-menu-bar")).toBe("window");
		expect(root?.getAttribute("data-classicy-grow-box")).toBe("bottom-left");
		expect(
			root?.style.getPropertyValue("--classicy-layout-grow-box-corner"),
		).toBe("bottom-left");
		expect(
			root?.style.getPropertyValue("--classicy-layout-menu-bar-placement"),
		).toBe("window");
		expect(
			root?.style.getPropertyValue("--classicy-layout-icon-grid-origin"),
		).toBe("top-left");
	});

	// R6: an unregistered packageId resolves to Platinum, and the layout
	// attributes come from the same resolved package as the appearance id.
	it("agrees with data-classicy-appearance for an unregistered packageId", () => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Appearance.packageId = "nope";
			}),
		);
		const { container } = renderDesktop();
		const root = desktopRoot(container);
		expect(root?.getAttribute("data-classicy-appearance")).toBe("platinum");
		expect(root?.getAttribute("data-classicy-menu-bar")).toBe("screen");
		expect(root?.getAttribute("data-classicy-grow-box")).toBe("bottom-right");
	});

	// R18 / F-R1: the active package is Appearance.packageId; a theme
	// authored for another package does not switch the arrangement.
	it("reads the active package, never activeTheme.package", () => {
		registerTestMirrorPackage();
		const { container } = renderDesktop();
		act(() =>
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Appearance.activeTheme.package =
						TEST_MIRROR_PACKAGE_ID;
				}),
			),
		);
		const root = desktopRoot(container);
		expect(root?.getAttribute("data-classicy-menu-bar")).toBe("screen");
		expect(root?.getAttribute("data-classicy-grow-box")).toBe("bottom-right");
		expect(
			root?.style.getPropertyValue("--classicy-layout-grow-box-corner"),
		).toBe("bottom-right");
	});

	it("lets the consumer's style override a layout variable", () => {
		const { container } = renderDesktop({
			"--classicy-layout-grow-box-corner": "top-left",
		} as CSSProperties);
		expect(
			desktopRoot(container)?.style.getPropertyValue(
				"--classicy-layout-grow-box-corner",
			),
		).toBe("top-left");
	});

	describe("menuBar.placement", () => {
		it("hides the screen bar when the active package places menus in windows", () => {
			registerTestMirrorPackage();
			const { container } = renderDesktop();
			expect(container.querySelector(".classicyDesktopMenuBar")).not.toBeNull();
			activate(TEST_MIRROR_PACKAGE_ID);
			expect(container.querySelector(".classicyDesktopMenuBar")).toBeNull();
		});

		// G17: the screen bar is headless under window placement, so its band
		// is 0 on the root; the layout's override follows the theme's 30px,
		// and a host style still beats both.
		it("zeroes --menu-bar-height on the root under window placement", () => {
			registerTestMirrorPackage();
			const { container } = renderDesktop();
			const height = () =>
				desktopRoot(container)?.style.getPropertyValue("--menu-bar-height");
			expect(height()).toBe("30px");
			activate(TEST_MIRROR_PACKAGE_ID);
			expect(height()).toBe("0px");
			activate(PLATINUM_APPEARANCE_PACKAGE_ID);
			expect(height()).toBe("30px");
		});

		it("lets the host's style override --menu-bar-height under window placement", () => {
			registerTestMirrorPackage();
			const { container } = renderDesktop({
				"--menu-bar-height": "42px",
			} as CSSProperties);
			activate(TEST_MIRROR_PACKAGE_ID);
			expect(
				desktopRoot(container)?.style.getPropertyValue("--menu-bar-height"),
			).toBe("42px");
		});

		it("renders each window's menus in the window, and back on the screen bar", () => {
			registerTestMirrorPackage();
			openApp();
			const { container } = renderDesktopWithWindow();
			activate(TEST_MIRROR_PACKAGE_ID);
			expect(
				container.querySelector(".classicyWindow .classicyWindowMenuBar"),
			).not.toBeNull();
			expect(container.querySelector(".classicyDesktopMenuBar")).toBeNull();

			activate(PLATINUM_APPEARANCE_PACKAGE_ID);
			expect(container.querySelector(".classicyWindowMenuBar")).toBeNull();
			expect(container.querySelector(".classicyDesktopMenuBar")).not.toBeNull();
		});

		// The window's own class keys the bar's height and the contents'
		// shrink, so a browser without :has() still fits the window together.
		it("marks a window that draws a menu bar with classicyWindowWithMenuBar", () => {
			registerTestMirrorPackage();
			openApp();
			renderDesktopWithWindow();
			const win = () => document.querySelector(".classicyWindow");
			expect(win()).not.toHaveClass("classicyWindowWithMenuBar");
			activate(TEST_MIRROR_PACKAGE_ID);
			expect(win()).toHaveClass("classicyWindowWithMenuBar");
			act(() =>
				dispatch({
					type: "ClassicyWindowCollapse",
					app: { id: APP_ID },
					window: { id: "main" },
				}),
			);
			expect(win()).not.toHaveClass("classicyWindowWithMenuBar");
			activate(PLATINUM_APPEARANCE_PACKAGE_ID);
			expect(win()).not.toHaveClass("classicyWindowWithMenuBar");
		});

		// The contents' height takes off the title bar's chrome (the header's
		// too, when there is one) and the window's menu bar, whichever of the
		// two stylesheets loads first: each height rule matches only its own
		// case, so no two of them tie on one element.
		it.each([
			["header", { header: <span>Header</span> }, "contents-header-chrome"],
			["no header", {}, "contents-chrome"],
		] as const)("fits the contents (%s) under a window menu bar in either stylesheet order", (_name, windowProps, chrome) => {
			registerTestMirrorPackage();
			openApp();
			renderDesktopWithWindow(windowProps);
			activate(TEST_MIRROR_PACKAGE_ID);
			const contents = document.querySelector(
				".classicyWindowWithMenuBar .classicyWindowContents",
			);
			if (!contents) throw new Error("no contents");
			const sheets = [
				"src/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
				"src/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar.scss",
			];
			const bar =
				"var(--classicy-window-menu-bar-height, var(--window-menu-bar-height))";
			for (const order of [sheets, [...sheets].reverse()])
				expect(classicyCascadeWinner(contents, order, "height")?.value).toBe(
					`calc(100% - var(--window-${chrome}-height) - ${bar})`,
				);
		});

		// The slot's negative branches: utility windows, modals (Mac OS 8
		// movable modals have no menu bar), collapsed windows and an empty
		// appMenu get no bar.
		it.each([
			["a utility window", { windowType: "utility" as const }],
			["a modal window", { modal: true }],
			["an empty appMenu", { appMenu: [] }],
		])("draws no window menu bar for %s", (_name, windowProps) => {
			registerTestMirrorPackage();
			openApp();
			renderDesktopWithWindow(windowProps);
			activate(TEST_MIRROR_PACKAGE_ID);
			expect(document.querySelector(".classicyWindow")).not.toBeNull();
			expect(document.querySelector(".classicyWindowMenuBar")).toBeNull();
			expect(document.querySelector(".classicyWindowWithMenuBar")).toBeNull();
		});

		it("draws no window menu bar while the window is collapsed", () => {
			registerTestMirrorPackage();
			openApp();
			renderDesktopWithWindow();
			activate(TEST_MIRROR_PACKAGE_ID);
			expect(document.querySelector(".classicyWindowMenuBar")).not.toBeNull();
			act(() =>
				dispatch({
					type: "ClassicyWindowCollapse",
					app: { id: APP_ID },
					window: { id: "main" },
				}),
			);
			expect(document.querySelector(".classicyWindowMenuBar")).toBeNull();
		});
	});

	// Plan 0020-w98 §2, "Mounting": the taskbar takes the Control Strip's
	// place among the desktop's children, and only under a layout that
	// declares one.
	describe("taskbar", () => {
		// Each child of the desktop root, by tag, first class and id: the app
		// containers are bare divs, the desktop icons carry their ids.
		const children = (container: HTMLElement) =>
			Array.from(
				desktopRoot(container)?.children ?? [],
				(el) =>
					`${el.tagName.toLowerCase()}.${el.classList[0] ?? ""}${el.id ? `#${el.id}` : ""}`,
			);

		it("draws the Control Strip and no taskbar under Platinum, the desktop's children and root attributes as before", () => {
			const { container } = renderDesktop();
			expect(container.querySelector(".classicyControlStrip")).not.toBeNull();
			expect(container.querySelector(".classicyTaskbar")).toBeNull();
			// Nothing a resting file drag activates (the taskbar's buttons).
			expect(
				container.querySelector("[data-classicy-drop-activate]"),
			).toBeNull();
			const list = children(container);
			// The menu bar, then the apps' containers, then the strip, then
			// the desktop icons.
			expect(list[0]).toBe("nav.classicyDesktopMenuBar");
			const strip = list.indexOf("div.classicyControlStrip");
			const firstIcon = list.findIndex((c) =>
				c.startsWith("div.classicyDesktopIcon"),
			);
			expect(strip).toBe(firstIcon - 1);
			expect(list.slice(1, strip).every((c) => c === "div.")).toBe(true);
			expect(list.slice(firstIcon)).toEqual([
				"div.classicyDesktopIcon#Finder.app.shortcut",
				"div.classicyDesktopIcon#Trash.shortcut",
			]);
			expect(desktopRoot(container)?.getAttributeNames()).toEqual([
				"role",
				"id",
				"data-classicy-appearance",
				"data-classicy-menu-bar",
				"data-classicy-grow-box",
				"tabindex",
				"style",
				"class",
				"data-classicy-drop-desktop",
			]);
		});

		it("draws a taskbar in the Control Strip's place under a layout that declares one", () => {
			registerTestMirrorPackage();
			registerTestTaskbarPackage();
			const { container } = renderDesktop();
			// The same window placement without a taskbar, for the comparison.
			activate(TEST_MIRROR_PACKAGE_ID);
			const withStrip = children(container);
			expect(withStrip).toContain("div.classicyControlStrip");

			activate(TEST_TASKBAR_PACKAGE_ID);
			expect(container.querySelector(".classicyControlStrip")).toBeNull();
			const taskbar = container.querySelectorAll(".classicyTaskbar");
			expect(taskbar).toHaveLength(1);
			expect(taskbar[0].parentElement).toBe(desktopRoot(container));
			expect(children(container)).toEqual(
				withStrip.map((c) =>
					c === "div.classicyControlStrip" ? "nav.classicyTaskbar" : c,
				),
			);
			// The root gains no attribute for it.
			expect(desktopRoot(container)?.getAttributeNames()).toEqual([
				"role",
				"id",
				"data-classicy-appearance",
				"data-classicy-menu-bar",
				"data-classicy-grow-box",
				"tabindex",
				"style",
				"class",
				"data-classicy-drop-desktop",
			]);

			activate(PLATINUM_APPEARANCE_PACKAGE_ID);
			expect(container.querySelector(".classicyTaskbar")).toBeNull();
			expect(container.querySelector(".classicyControlStrip")).not.toBeNull();
		});

		it("keeps the taskbar under controlStrip={false}, and forwards the strip's disabled modules", () => {
			registerTestTaskbarPackage();
			activate(TEST_TASKBAR_PACKAGE_ID);
			const hidden = renderDesktop(undefined, false);
			expect(hidden.container.querySelector(".classicyTaskbar")).not.toBeNull();
			expect(
				hidden.container.querySelector(".classicyControlStrip"),
			).toBeNull();
			hidden.unmount();

			const seen: (readonly string[])[] = [];
			const Probe = () => {
				seen.push(useClassicyControlStripDisabledModules());
				return null;
			};
			render(
				<ClassicyAppManagerProvider>
					<ClassicyDesktop
						startupScreen={false}
						controlStrip={{ disabledModules: ["classicy-sound"] }}
					>
						<Probe />
					</ClassicyDesktop>
				</ClassicyAppManagerProvider>,
			);
			expect(document.querySelector(".classicyTaskbar")).not.toBeNull();
			expect(seen.at(-1)).toEqual(["classicy-sound"]);
		});
	});

	// Plan 0020-w98 §2 "Keyboard" and §3: CTRL+ESC and the Start menu belong
	// to the taskbar, so they exist only where a layout mounts one.
	describe("the Start menu and CTRL+ESC", () => {
		const ctrlEscape = () =>
			fireEvent.keyDown(document.body, {
				key: "Escape",
				code: "Escape",
				ctrlKey: true,
			});
		const startMenu = () => document.getElementById("classicy-start-menu");
		const submenu = (id: string) =>
			Array.from(
				document
					.getElementById(id)
					?.querySelectorAll<HTMLElement>(
						":scope > .classicyMenuWrapper > ul > li.classicyMenuItem",
					) ?? [],
			);

		it("leaves CTRL+ESC to the browser under Platinum", () => {
			renderDesktop();
			expect(ctrlEscape()).toBe(true);
			expect(startMenu()).toBeNull();
		});

		it("opens the Start menu on CTRL+ESC under a taskbar, its Programs and Control Panel from the desktop's apps", () => {
			registerTestTaskbarPackage();
			activate(TEST_TASKBAR_PACKAGE_ID);
			renderDesktop();
			expect(ctrlEscape()).toBe(false);
			expect(startMenu()).not.toBeNull();
			// The bundled control panels that keep out of Applications, by name.
			const panels = submenu("start-menu_control-panel");
			expect(panels.map((li) => li.id).sort()).toEqual(
				[
					"AppearanceManager.app",
					"ControlStripManager.app",
					"DateAndTimeManager.app",
					"ScreenSaverManager.app",
					"SoundManager.app",
				].map((appId) => `start-menu_control-panel_${appId}`),
			);
			const names = panels.map((li) => li.textContent ?? "");
			expect(names).toEqual(
				[...names].sort((a, b) =>
					a.localeCompare(b, undefined, { sensitivity: "base" }),
				),
			);
			// Calculator and Drive Setup are listed in Applications: Programs.
			const programs = submenu("start-menu_programs").map((li) => li.id);
			expect(programs).toEqual(
				expect.arrayContaining([
					"start-menu_programs_Calculator.app",
					"start-menu_programs_DriveSetup.app",
				]),
			);
			expect(programs.some((id) => id.endsWith("Manager.app"))).toBe(false);
			expect(ctrlEscape()).toBe(false);
			expect(startMenu()).toBeNull();
		});

		it("opens nothing on CTRL+ESC while a modal dialog is open", () => {
			registerTestTaskbarPackage();
			activate(TEST_TASKBAR_PACKAGE_ID);
			act(() => openApp());
			renderDesktopWithWindow({ modal: true, appMenu: undefined });
			expect(
				document.querySelector(".classicyWindowModalScrim"),
			).not.toBeNull();
			expect(ctrlEscape()).toBe(true);
			expect(startMenu()).toBeNull();
		});
	});

	// Plan 0020-w98 §5: the desktop binds the shell's window keys
	// (`useClassicyWindowShellKeys`) only under a layout with the system menu.
	describe("window.systemMenu", () => {
		const mainRecord = () =>
			getAppWindow(
				useAppManager.getState().System.Manager.Applications.apps[APP_ID],
				"main",
			);
		const altF4 = () =>
			fireEvent.keyDown(document.body, { key: "F4", code: "F4", altKey: true });
		const altSpace = () =>
			fireEvent.keyDown(document.body, {
				key: " ",
				code: "Space",
				altKey: true,
			});

		it("binds neither ALT+F4 nor ALT+SPACE under Platinum", () => {
			act(() => openApp());
			renderDesktopWithWindow();
			expect(mainRecord()?.focused).toBe(true);
			expect(altSpace()).toBe(true);
			expect(document.querySelector(".classicyContextMenuWrapper")).toBeNull();
			expect(altF4()).toBe(true);
			expect(mainRecord()?.closed).toBe(false);
		});

		it("opens the focused window's menu on ALT+SPACE and closes it on ALT+F4 under a layout with the system menu", () => {
			registerTestTaskbarPackage(
				TEST_SYSTEM_MENU_LAYOUT,
				TEST_SYSTEM_MENU_PACKAGE_ID,
			);
			activate(TEST_SYSTEM_MENU_PACKAGE_ID);
			act(() => openApp());
			renderDesktopWithWindow();
			expect(mainRecord()?.focused).toBe(true);
			expect(altSpace()).toBe(false);
			expect(
				document.getElementById(`${APP_ID}_main_system_close`),
			).not.toBeNull();
			expect(altF4()).toBe(false);
			expect(mainRecord()?.closed).toBe(true);
			expect(document.querySelector(".classicyContextMenuWrapper")).toBeNull();
		});
	});

	// Plan 0020-w98 step 16: the Windows 98 package's own layout is the shell
	// (WIG Ch.3 "The Taskbar", pp.15-16, Figure 3.1; Ch.6 "Minimizing
	// Windows", p.85; Ch.7 "The Help Menu", p.99; Ch.10 "Taskbar
	// Integration", pp.211-212): no bar across the top of the screen, a
	// taskbar in the Control Strip's place whose tray holds the strip's
	// modules, each window's own menu bar ending with Help, and a window that
	// minimizes to its taskbar button and comes back from it.
	describe("under the registered Windows 98 package", () => {
		const windowRoot = () =>
			document.getElementById(`${APP_ID}_main`) as HTMLElement;
		const mainRecord = () =>
			getAppWindow(
				useAppManager.getState().System.Manager.Applications.apps[APP_ID],
				"main",
			);
		const taskButtons = () =>
			Array.from(
				document.querySelectorAll<HTMLButtonElement>(".classicyTaskbarTask"),
			);

		beforeEach(() => {
			registerClassicyAppearancePackage(windows98);
			activate(WINDOWS98_APPEARANCE_PACKAGE_ID);
		});

		it("draws the shell: a taskbar and no screen bar, the tray holding the three built-in modules, a window bar ending with Help, and Minimize sending the window to its button", () => {
			act(() => openApp());
			const { container } = renderDesktopWithWindow();
			const root = desktopRoot(container) as HTMLElement;
			expect(root.getAttribute("data-classicy-appearance")).toBe(
				WINDOWS98_APPEARANCE_PACKAGE_ID,
			);

			// No menu bar crosses the top of the screen: the screen bar is
			// headless and its band is 0.
			expect(container.querySelector(".classicyDesktopMenuBar")).toBeNull();
			// No menu title, Edit included, is drawn outside a window (C9).
			expect(
				Array.from(
					container.querySelectorAll(".classicyDesktopMenu > li"),
				).filter((title) => !title.closest(".classicyWindow")),
			).toEqual([]);
			expect(root.getAttribute("data-classicy-menu-bar")).toBe("window");
			expect(root.style.getPropertyValue("--menu-bar-height")).toBe("0px");

			// The taskbar in the Control Strip's place, Start at its left.
			expect(container.querySelector(".classicyControlStrip")).toBeNull();
			const taskbar = container.querySelectorAll("nav.classicyTaskbar");
			expect(taskbar).toHaveLength(1);
			expect(taskbar[0].parentElement).toBe(root);
			expect(
				container.querySelector(".classicyTaskbarStartLabel")?.textContent,
			).toBe("Start");

			// The tray: the Control Strip's three built-in modules, then the
			// menu bar extensions' region and the clock. The Appearance
			// module takes its app's display name, Windows 98's "Display"
			// (the package's `apps` override for AppearanceManager.app).
			const tray = container.querySelector(".classicyTaskbarTray");
			expect(
				Array.from(
					tray?.querySelectorAll(".classicyTaskbarTrayIcon") ?? [],
					(icon) => icon.getAttribute("aria-label"),
				),
			).toEqual(["Sound", "Screen Saver", "Display"]);
			expect(
				tray?.querySelector("#classicyDesktopMenuExtensions"),
			).not.toBeNull();
			expect(tray?.querySelector("time.classicyTaskbarClock")).not.toBeNull();

			// The window's own bar: its app's File, then one Help, last.
			const bar = windowRoot().querySelector(".classicyWindowMenuBar");
			expect(bar).not.toBeNull();
			const titles = Array.from(
				bar?.querySelectorAll(":scope > .classicyMenuWrapper > ul > li") ?? [],
				(li) => ({
					id: li.id,
					title: li.querySelector(":scope > p")?.textContent,
					part: li.getAttribute("data-classicy-part"),
				}),
			);
			expect(titles.map(({ title }) => title)).toEqual(["File", "Help"]);
			expect(titles.at(-1)).toMatchObject({
				id: `${APP_ID}_main_help-menu`,
				part: "help",
			});

			// One button, for the focused window, pressed.
			expect(taskButtons().map((b) => b.textContent)).toEqual(["Main"]);
			const [button] = taskButtons();
			expect(button).toHaveClass("active");
			expect(button).toHaveAttribute("aria-pressed", "true");

			// Minimize (the collapse box), as a mouse delivers it: the window
			// leaves the screen, not shaded, and keeps its button, released.
			const minimize = windowRoot().querySelector(
				".classicyWindowCollapseBox",
			) as HTMLElement;
			expect(minimize).toHaveAttribute("aria-label", "Minimize");
			fireEvent.mouseDown(minimize);
			fireEvent.mouseUp(minimize);
			fireEvent.click(minimize);
			expect(mainRecord()).toMatchObject({ collapsed: true, focused: false });
			expect(windowRoot()).toHaveClass("classicyWindowMinimized");
			expect(windowRoot()).not.toHaveClass("collapsed");
			expect(taskButtons()).toEqual([button]);
			expect(button).toHaveClass("collapsed");
			expect(button).not.toHaveClass("active");
			expect(button).toHaveAttribute("aria-pressed", "false");

			// Its button restores it.
			fireEvent.click(button);
			expect(mainRecord()).toMatchObject({ collapsed: false, focused: true });
			expect(windowRoot()).not.toHaveClass("classicyWindowMinimized");
			expect(button).toHaveClass("active");
			expect(button).not.toHaveClass("collapsed");
		});

		// Section C's desktop wiring under the package itself: Explorer's
		// white-space menu (C1), a button-2 press that starts the rectangle
		// rather than a menu (C2: `selection.secondaryButton` "select"), and
		// the desktop drawn as a multiple-selection list box (C3).
		it("gives the desktop Explorer's menu, button 2's rectangle and the list box role", () => {
			const { container } = renderDesktopWithWindow();
			const root = desktopRoot(container) as HTMLElement;
			expect(root.getAttribute("role")).toBe("listbox");
			expect(root.getAttribute("aria-multiselectable")).toBe("true");
			fireEvent.mouseDown(root, { button: 2, clientX: 300, clientY: 300 });
			expect(root.querySelector(".classicyDesktopSelect")).not.toBeNull();
			expect(document.querySelector(".classicyContextMenuWrapper")).toBeNull();
			fireEvent.mouseUp(root, { button: 2, clientX: 300, clientY: 300 });
			fireEvent.contextMenu(root, { button: 2, clientX: 300, clientY: 300 });
			const menu = document.querySelector(
				".classicyContextMenuWrapper",
			) as HTMLElement;
			expect(menu.textContent).toContain("Arrange Icons");
			expect(menu.textContent).not.toContain("Special");
		});

		it("draws the Control Strip and the screen bar again on a switch back to Platinum, the minimized window shaded there", () => {
			act(() => openApp());
			const { container } = renderDesktopWithWindow();
			const minimize = windowRoot().querySelector(
				".classicyWindowCollapseBox",
			) as HTMLElement;
			fireEvent.mouseDown(minimize);
			fireEvent.mouseUp(minimize);
			fireEvent.click(minimize);
			expect(windowRoot()).toHaveClass("classicyWindowMinimized");

			activate(PLATINUM_APPEARANCE_PACKAGE_ID);
			expect(container.querySelector(".classicyTaskbar")).toBeNull();
			expect(container.querySelector(".classicyControlStrip")).not.toBeNull();
			expect(container.querySelector(".classicyDesktopMenuBar")).not.toBeNull();
			expect(windowRoot().querySelector(".classicyWindowMenuBar")).toBeNull();
			// The same `collapsed` record, drawn as WindowShade.
			expect(mainRecord()?.collapsed).toBe(true);
			expect(windowRoot()).toHaveClass("collapsed");
			expect(windowRoot()).not.toHaveClass("classicyWindowMinimized");
		});
	});
});
