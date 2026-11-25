import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/__tests__/withPlatinum";
import { dispatchAnimationEnd } from "@/__tests__/animationEnd";
import { act, fireEvent, render, waitFor } from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_TASKBAR_LAYOUT,
	TEST_TASKBAR_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import {
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { markClassicyAppMounted } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import {
	CLASSICY_CONTROL_STRIP_MODULE_IDS,
	type ClassicyControlStripModuleDefinition,
	type ClassicyControlStripModuleRegistration,
	registerClassicyControlStripModule,
	unregisterClassicyControlStripModule,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import {
	ClassicyTaskbar,
	type ClassicyTaskbarProps,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbar";
import { CLASSICY_TASKBAR_TOOLTIP_DELAY_MS } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTasks.internal";
import {
	CLASSICY_TASKBAR_DOUBLE_CLICK_MS,
	classicyTaskbarTrayDefaultItem,
	classicyTaskbarTrayModules,
	classicyTaskbarTrayPopupId,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTray.internal";

// Plan 0020-w98 §2, "The tray": the Control Strip's modules as the taskbar's
// notification icons (WIG Ch.10 "Status Notification", pp.211–212, Figure
// 10.2), their arrangement, their surfaces, clicks and tooltips. jsdom lays
// nothing out: the placement case stubs the boxes (a 640 × 480 desktop, a
// 28 px taskbar along its foot, an icon in its status area).

const BUILT_INS: string[] = Object.values(CLASSICY_CONTROL_STRIP_MODULE_IDS);
const RENAMED_PACKAGE_ID = "test-taskbar-renamed";

const registration = (
	id: string,
	overrides: Partial<ClassicyControlStripModuleDefinition> = {},
	sequence = 0,
): ClassicyControlStripModuleRegistration => ({
	definition: { id, label: id, icon: `${id}.png`, ...overrides },
	sequence,
	revision: 0,
});

const ids = (list: readonly ClassicyControlStripModuleRegistration[]) =>
	list.map((r) => r.definition.id);

describe("classicyTaskbarTrayModules", () => {
	const all = [
		registration("a", {}, 0),
		registration("b", {}, 1),
		registration("owned", { appId: "Owner.app" }, 2),
		registration("c", {}, 3),
	];
	const none = new Set<string>();

	it("keeps the declared order, the user's order leading", () => {
		expect(ids(classicyTaskbarTrayModules(all, { mountedApps: none }))).toEqual(
			["a", "b", "c"],
		);
		expect(
			ids(
				classicyTaskbarTrayModules(all, {
					mountedApps: none,
					stored: { moduleOrder: ["c", "a"] },
				}),
			),
		).toEqual(["c", "a", "b"]);
	});

	it("shows a module an app owns only while its app is mounted", () => {
		expect(
			ids(
				classicyTaskbarTrayModules(all, {
					mountedApps: new Set(["Owner.app"]),
				}),
			),
		).toEqual(["a", "b", "owned", "c"]);
	});

	it("leaves out the host's disabled modules and the user's hidden ones", () => {
		expect(
			ids(
				classicyTaskbarTrayModules(all, {
					mountedApps: none,
					disabledModules: ["a"],
					stored: { hiddenModules: ["c"] },
				}),
			),
		).toEqual(["b"]);
	});

	it("shows none while the user has turned the Control Strip off, or the host hides the modules", () => {
		expect(
			classicyTaskbarTrayModules(all, {
				mountedApps: none,
				stored: { visible: false },
			}),
		).toEqual([]);
		expect(
			classicyTaskbarTrayModules(all, { mountedApps: none, hide: true }),
		).toEqual([]);
		expect(
			ids(
				classicyTaskbarTrayModules(all, {
					mountedApps: none,
					stored: { visible: true },
				}),
			),
		).toEqual(["a", "b", "c"]);
	});
});

describe("classicyTaskbarTrayDefaultItem", () => {
	it("is the first enabled item marked isDefault that runs a command", () => {
		const items: ClassicyMenuItem[] = [
			{ id: "status", title: "Status", disabled: true, isDefault: true },
			{ id: "spacer", isDefault: true },
			{
				id: "sub",
				title: "Sub",
				isDefault: true,
				menuChildren: [{ id: "child", title: "Child" }],
			},
			{ id: "plain", title: "Plain" },
			{ id: "open", title: "Open", isDefault: true },
			{ id: "later", title: "Later", isDefault: true },
		];
		expect(classicyTaskbarTrayDefaultItem(items)?.id).toBe("open");
	});

	it("is none for a menu without one, or no menu", () => {
		expect(
			classicyTaskbarTrayDefaultItem([{ id: "plain", title: "Plain" }]),
		).toBeUndefined();
		expect(classicyTaskbarTrayDefaultItem(undefined)).toBeUndefined();
	});
});

describe("the tray", () => {
	let registered: string[] = [];
	const register = (...modules: ClassicyControlStripModuleDefinition[]) => {
		for (const module of modules) {
			registerClassicyControlStripModule(module);
			registered.push(module.id);
		}
	};

	const icons = () =>
		Array.from(
			document.querySelectorAll<HTMLButtonElement>(".classicyTaskbarTrayIcon"),
		);
	const icon = (label: string) => {
		const found = icons().find((b) => b.getAttribute("aria-label") === label);
		if (!found) throw new Error(`no tray icon "${label}"`);
		return found;
	};
	const labels = () => icons().map((b) => b.getAttribute("aria-label"));
	const popup = (id: string) =>
		document.getElementById(classicyTaskbarTrayPopupId(id));
	const contextMenu = () =>
		document.querySelector(".classicyContextMenuWrapper");
	/** A mouse click: press and release, then the click. */
	const click = (el: Element, detail = 1) => {
		fireEvent.mouseDown(el, { button: 0, detail });
		fireEvent.mouseUp(el, { button: 0, detail });
		fireEvent.click(el, { button: 0, detail });
	};
	const doubleClick = (el: Element) => {
		click(el, 1);
		click(el, 2);
		fireEvent.doubleClick(el, { button: 0, detail: 2 });
	};

	const renderTaskbar = (props: ClassicyTaskbarProps = {}) =>
		render(
			<ClassicyContextualMenuProvider>
				<div className="classicyDesktop" id="classicyDesktop">
					<ClassicyTaskbar disabledModules={BUILT_INS} {...props} />
				</div>
			</ClassicyContextualMenuProvider>,
		);

	const onOpen = vi.fn();
	const onDefault = vi.fn();
	const menuModule: ClassicyControlStripModuleDefinition = {
		id: "sharing",
		label: "File Sharing",
		icon: "sharing.png",
		order: 50,
		menuItems: [
			{
				id: "sharing-status",
				title: "No Users Connected",
				disabled: true,
				className: "classicyControlStripStatus",
			},
			{ id: "spacer" },
			{ id: "sharing-open", title: "Open File Sharing", onClickFunc: onOpen },
		],
	};
	const defaultModule: ClassicyControlStripModuleDefinition = {
		id: "display",
		label: "Display",
		icon: "display.png",
		order: 60,
		menuItems: [
			{ id: "display-mode", title: "640 by 480 pixels" },
			{
				id: "display-properties",
				title: "Adjust Display Properties",
				isDefault: true,
				onClickFunc: onDefault,
			},
		],
	};
	const contentModule: ClassicyControlStripModuleDefinition = {
		id: "volume",
		label: "Volume",
		icon: "volume.png",
		order: 40,
		content: () => <input type="range" aria-label="Level" />,
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
		onOpen.mockClear();
		onDefault.mockClear();
	});

	afterEach(() => {
		for (const id of registered) unregisterClassicyControlStripModule(id);
		registered = [];
		vi.useRealTimers();
		vi.restoreAllMocks();
		unregisterClassicyAppearancePackage(TEST_TASKBAR_PACKAGE_ID);
		unregisterClassicyAppearancePackage(RENAMED_PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	describe("structure", () => {
		it("is the status area: the icons' list, the menu bar extensions' region, then the clock", () => {
			register(menuModule);
			renderTaskbar();
			const tray = document.querySelector(".classicyTaskbarTray");
			expect(tray).toHaveAttribute("data-classicy-part", "taskbar-tray");
			expect(tray).toHaveAttribute("role", "group");
			expect(tray).toHaveAttribute("aria-label", "Notification area");
			expect(tray?.children).toHaveLength(3);
			const [list, region, clock] = Array.from(tray?.children ?? []);
			expect(clock.tagName).toBe("TIME");
			expect(clock).toHaveClass("classicyTaskbarClock");
			expect(clock).toHaveAttribute("data-classicy-part", "clock");
			expect(list.tagName).toBe("UL");
			expect(list).toHaveClass("classicyTaskbarTrayIcons");
			expect(region.tagName).toBe("UL");
			expect(region).toHaveAttribute("id", "classicyDesktopMenuExtensions");
			expect(region).toHaveClass(
				"classicyDesktopMenuExtensions",
				"classicyTaskbarTrayExtensions",
			);
			expect(region).toHaveAttribute("data-classicy-part", "extensions");
		});

		it("draws each module as a labelled button with its 16 px icon", () => {
			register(menuModule);
			renderTaskbar();
			const sharing = icon("File Sharing");
			expect(sharing.tagName).toBe("BUTTON");
			expect(sharing).toHaveAttribute("type", "button");
			expect(sharing).toHaveAttribute("aria-haspopup", "menu");
			expect(sharing).toHaveAttribute("aria-expanded", "false");
			expect(sharing).not.toHaveClass("open");
			const img = sharing.querySelector("img");
			expect(img).toHaveAttribute("src", "sharing.png");
			expect(img).toHaveAttribute("alt", "");
		});
	});

	describe("which modules, in what order", () => {
		it("lists them in the strip's order, the user's order first", () => {
			register(defaultModule, menuModule, contentModule);
			renderTaskbar();
			expect(labels()).toEqual(["Volume", "File Sharing", "Display"]);
			act(() =>
				dispatch({
					type: "ClassicyDesktopControlStripSetModuleOrder",
					moduleOrder: ["display"],
				}),
			);
			expect(labels()).toEqual(["Display", "Volume", "File Sharing"]);
		});

		it("leaves out a module the user hid, and the host's disabled ones", () => {
			register(menuModule, contentModule);
			renderTaskbar({ disabledModules: [...BUILT_INS, "volume"] });
			expect(labels()).toEqual(["File Sharing"]);
			act(() =>
				dispatch({
					type: "ClassicyDesktopControlStripSetModuleHidden",
					moduleId: "sharing",
					hidden: true,
				}),
			);
			expect(labels()).toEqual([]);
		});

		it("shows a module an app owns only while its app is mounted", () => {
			register({ ...menuModule, appId: "Sharing.app" });
			renderTaskbar();
			expect(labels()).toEqual([]);
			let unmount = () => {};
			act(() => {
				unmount = markClassicyAppMounted("Sharing.app");
			});
			expect(labels()).toEqual(["File Sharing"]);
			act(() => unmount());
			expect(labels()).toEqual([]);
		});

		it("shows no module while the Control Strip is turned off, and keeps the extensions' region", () => {
			register(menuModule);
			renderTaskbar();
			act(() =>
				dispatch({
					type: "ClassicyDesktopControlStripSetVisible",
					visible: false,
				}),
			);
			expect(icons()).toHaveLength(0);
			expect(
				document.querySelector(
					".classicyTaskbarTray #classicyDesktopMenuExtensions",
				),
			).not.toBeNull();
			act(() =>
				dispatch({
					type: "ClassicyDesktopControlStripSetVisible",
					visible: true,
				}),
			);
			expect(labels()).toEqual(["File Sharing"]);
		});

		it("shows no module under hideModules", () => {
			register(menuModule);
			renderTaskbar({ hideModules: true });
			expect(icons()).toHaveLength(0);
			expect(
				document.getElementById("classicyDesktopMenuExtensions"),
			).not.toBeNull();
		});

		it("draws a hook-form module's icon and menu as their hooks return them", () => {
			register({
				id: "balloons",
				label: "Balloons",
				icon: () =>
					useAppManager((s) => s.System.Manager.Desktop.disableBalloonHelp)
						? "off.png"
						: "on.png",
				menuItems: () => [
					{
						id: "balloons-state",
						title: useAppManager(
							(s) => s.System.Manager.Desktop.disableBalloonHelp,
						)
							? "Balloons Off"
							: "Balloons On",
					},
				],
			});
			renderTaskbar();
			const image = () => icon("Balloons").querySelector("img");
			act(() =>
				dispatch({
					type: "ClassicyDesktopSetBalloonHelp",
					disableBalloonHelp: false,
				}),
			);
			expect(image()).toHaveAttribute("src", "on.png");
			act(() =>
				dispatch({
					type: "ClassicyDesktopSetBalloonHelp",
					disableBalloonHelp: true,
				}),
			);
			expect(image()).toHaveAttribute("src", "off.png");
			click(icon("Balloons"));
			expect(popup("balloons")).toHaveTextContent("Balloons Off");
		});
	});

	describe("on a desktop", () => {
		const renderDesktop = (controlStrip?: false) =>
			render(
				<ClassicyAppManagerProvider>
					<ClassicyDesktop
						startupScreen={false}
						{...(controlStrip === false ? { controlStrip } : {})}
					/>
				</ClassicyAppManagerProvider>,
			);

		it("holds the three built-in modules, Sound, Screen Saver and Appearance", () => {
			renderDesktop();
			expect(labels()).toEqual(["Sound", "Screen Saver", "Appearance"]);
			expect(document.querySelector(".classicyControlStrip")).toBeNull();
		});

		it("holds none under controlStrip={false}", () => {
			renderDesktop(false);
			expect(document.querySelector(".classicyTaskbarTray")).not.toBeNull();
			expect(icons()).toHaveLength(0);
		});
	});

	describe("button 1", () => {
		it("opens a module's content above its icon, and closes it on a second click", () => {
			register(contentModule);
			renderTaskbar();
			const volume = icon("Volume");
			expect(volume).toHaveAttribute("aria-haspopup", "dialog");
			click(volume);
			const panel = popup("volume");
			expect(panel).toHaveAttribute("role", "dialog");
			expect(panel).toHaveAttribute("aria-label", "Volume");
			expect(panel).toHaveClass(
				"classicyBevelButtonPopup",
				"classicyBevelButtonPopupPanel",
				"classicyTaskbarTrayPopup",
			);
			expect(panel?.querySelector('input[aria-label="Level"]')).not.toBeNull();
			expect(volume).toHaveClass("open");
			expect(volume).toHaveAttribute("aria-expanded", "true");
			expect(volume).toHaveAttribute(
				"aria-controls",
				classicyTaskbarTrayPopupId("volume"),
			);
			click(volume);
			expect(popup("volume")).toBeNull();
			expect(volume).not.toHaveClass("open");
			expect(volume).not.toHaveAttribute("aria-controls");
		});

		it("opens a module's content, not its menu, when it has both", () => {
			register({ ...contentModule, menuItems: menuModule.menuItems });
			renderTaskbar();
			click(icon("Volume"));
			expect(popup("volume")).toHaveAttribute("role", "dialog");
		});

		it("opens a menu at once when it has no default item, and runs a chosen item", async () => {
			register(menuModule);
			renderTaskbar();
			click(icon("File Sharing"));
			const menu = popup("sharing");
			expect(menu).toHaveAttribute("role", "menu");
			expect(menu).toHaveClass(
				"classicyBevelButtonPopup",
				"classicyTaskbarTrayPopup",
			);
			expect(menu).not.toHaveClass("classicyBevelButtonPopupPanel");
			const open = document.getElementById("sharing-open") as HTMLElement;
			fireEvent.click(open);
			dispatchAnimationEnd(open);
			await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
			expect(popup("sharing")).toBeNull();
			expect(icon("File Sharing")).not.toHaveClass("open");
		});

		it("waits out the double-click time before it opens a menu with a default item", () => {
			vi.useFakeTimers();
			register(defaultModule);
			renderTaskbar();
			click(icon("Display"));
			expect(popup("display")).toBeNull();
			act(() => {
				vi.advanceTimersByTime(CLASSICY_TASKBAR_DOUBLE_CLICK_MS - 1);
			});
			expect(popup("display")).toBeNull();
			act(() => {
				vi.advanceTimersByTime(1);
			});
			expect(popup("display")).toHaveAttribute("role", "menu");
			expect(icon("Display")).toHaveClass("open");
		});

		it("opens at once from the keyboard, its first item focused", () => {
			register(menuModule);
			renderTaskbar();
			// Enter and Space reach a button as a click with no press count.
			fireEvent.click(icon("File Sharing"), { detail: 0 });
			expect(popup("sharing")).not.toBeNull();
			expect(
				document.activeElement?.closest(
					`#${classicyTaskbarTrayPopupId("sharing")}`,
				),
			).not.toBeNull();
			fireEvent.keyDown(document.activeElement as Element, { key: "Escape" });
			expect(popup("sharing")).toBeNull();
			expect(document.activeElement).toBe(icon("File Sharing"));
		});

		it("does nothing on a module with neither content nor menu", () => {
			register({ id: "plain", label: "Plain", icon: "plain.png" });
			renderTaskbar();
			expect(icon("Plain")).not.toHaveAttribute("aria-haspopup");
			expect(icon("Plain")).not.toHaveAttribute("aria-expanded");
			click(icon("Plain"));
			expect(popup("plain")).toBeNull();
			expect(icon("Plain")).not.toHaveClass("open");
		});

		it("takes no focus from a pointer press", () => {
			register(menuModule);
			renderTaskbar();
			const press = new MouseEvent("mousedown", {
				bubbles: true,
				cancelable: true,
				button: 0,
			});
			icon("File Sharing").dispatchEvent(press);
			expect(press.defaultPrevented).toBe(true);
		});
	});

	describe("a double-click", () => {
		it("runs the menu's default item alone", () => {
			vi.useFakeTimers();
			register(defaultModule);
			renderTaskbar();
			doubleClick(icon("Display"));
			expect(onDefault).toHaveBeenCalledTimes(1);
			act(() => {
				vi.advanceTimersByTime(CLASSICY_TASKBAR_DOUBLE_CLICK_MS * 2);
			});
			expect(popup("display")).toBeNull();
			expect(onDefault).toHaveBeenCalledTimes(1);
		});

		it("runs a default item that dispatches an event", () => {
			register({
				id: "balloons",
				label: "Balloons",
				icon: "balloons.png",
				menuItems: [
					{
						id: "balloons-hide",
						title: "Hide Balloons",
						isDefault: true,
						event: "ClassicyDesktopSetBalloonHelp",
						eventData: { disableBalloonHelp: true },
					},
				],
			});
			renderTaskbar();
			act(() =>
				dispatch({
					type: "ClassicyDesktopSetBalloonHelp",
					disableBalloonHelp: false,
				}),
			);
			doubleClick(icon("Balloons"));
			expect(
				useAppManager.getState().System.Manager.Desktop.disableBalloonHelp,
			).toBe(true);
		});

		it("leaves the surface the first click opened when the menu has no default", () => {
			register(menuModule);
			renderTaskbar();
			doubleClick(icon("File Sharing"));
			expect(popup("sharing")).not.toBeNull();
			expect(onOpen).not.toHaveBeenCalled();
		});
	});

	describe("button 2", () => {
		it("opens the module's menu at the pointer, with no Help item, and nothing of the taskbar's", () => {
			register(menuModule);
			renderTaskbar();
			fireEvent.contextMenu(icon("File Sharing"), {
				clientX: 600,
				clientY: 470,
			});
			const menu = contextMenu();
			expect(menu).not.toBeNull();
			expect(document.getElementById("sharing-open")).not.toBeNull();
			expect(document.getElementById("contextual-help")).toBeNull();
			expect(document.getElementById("taskbar-minimize-all")).toBeNull();
			expect(popup("sharing")).toBeNull();
		});

		it("opens nothing for a module with content only", () => {
			register(contentModule);
			renderTaskbar();
			const event = new MouseEvent("contextmenu", {
				bubbles: true,
				cancelable: true,
				clientX: 600,
				clientY: 470,
			});
			icon("Volume").dispatchEvent(event);
			expect(event.defaultPrevented).toBe(true);
			expect(contextMenu()).toBeNull();
			expect(popup("volume")).toBeNull();
		});

		it("closes the icon's open surface and drops a click waiting out the double-click time", () => {
			vi.useFakeTimers();
			register(defaultModule, contentModule);
			renderTaskbar();
			click(icon("Volume"));
			expect(popup("volume")).not.toBeNull();
			fireEvent.contextMenu(icon("Volume"));
			expect(popup("volume")).toBeNull();
			click(icon("Display"));
			fireEvent.contextMenu(icon("Display"));
			act(() => {
				vi.advanceTimersByTime(CLASSICY_TASKBAR_DOUBLE_CLICK_MS);
			});
			expect(popup("display")).toBeNull();
			expect(contextMenu()).not.toBeNull();
		});
	});

	describe("the tooltip", () => {
		const balloonText = () =>
			document.querySelector(".classicyBalloonHelpContent")?.textContent;

		it("names the module after 500 ms, Balloon Help off, and goes at a press", () => {
			vi.useFakeTimers();
			act(() =>
				dispatch({
					type: "ClassicyDesktopSetBalloonHelp",
					disableBalloonHelp: true,
				}),
			);
			register(menuModule);
			renderTaskbar();
			const sharing = icon("File Sharing");
			fireEvent.mouseEnter(sharing);
			act(() => {
				vi.advanceTimersByTime(CLASSICY_TASKBAR_TOOLTIP_DELAY_MS - 1);
			});
			expect(balloonText()).toBeUndefined();
			act(() => {
				vi.advanceTimersByTime(1);
			});
			expect(balloonText()).toBe("File Sharing");
			expect(sharing).toHaveAttribute("aria-describedby");
			fireEvent.mouseDown(sharing, { button: 0 });
			expect(balloonText()).toBeUndefined();
		});

		it("names an app's module by the app's display name under a package that renames it", () => {
			registerClassicyAppearancePackage({
				id: RENAMED_PACKAGE_ID,
				name: "Renamed",
				css: "",
				defaults: {
					...getTheme("default"),
					id: `${RENAMED_PACKAGE_ID}-default`,
					package: RENAMED_PACKAGE_ID,
				},
				layout: TEST_TASKBAR_LAYOUT,
				apps: { "Sharing.app": { name: "Network" } },
			});
			act(() =>
				dispatch({
					type: "ClassicyDesktopChangeAppearancePackage",
					packageId: RENAMED_PACKAGE_ID,
				}),
			);
			register({ ...menuModule, appId: "Sharing.app" });
			let unmount = () => {};
			act(() => {
				unmount = markClassicyAppMounted("Sharing.app");
			});
			renderTaskbar();
			expect(labels()).toEqual(["Network"]);
			act(() => unmount());
		});
	});

	describe("placement", () => {
		const DESKTOP = { width: 640, height: 480 };
		const TASKBAR_HEIGHT = 28;
		const ICON = { left: 600, top: 456, right: 616, bottom: 472 };
		const PANEL = { width: 40, height: 120 };
		const box = (left: number, top: number, width: number, height: number) =>
			DOMRect.fromRect({ x: left, y: top, width, height });
		const pxOf = (value: string) => Number.parseFloat(value) || 0;
		let restoreOffsetHeight = () => {};

		beforeEach(() => {
			vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
				function (this: Element) {
					if (this.classList.contains("classicyDesktop"))
						return box(0, 0, DESKTOP.width, DESKTOP.height);
					if (this.classList.contains("classicyTaskbarTrayIcon"))
						return box(
							ICON.left,
							ICON.top,
							ICON.right - ICON.left,
							ICON.bottom - ICON.top,
						);
					// The surface and its menu's list share one box.
					const surface = this.closest(".classicyBevelButtonPopup");
					if (
						surface &&
						(this === surface || (this.tagName === "UL" && !this.closest("li")))
					) {
						const style = (surface as HTMLElement).style;
						return box(
							pxOf(style.left),
							pxOf(style.top),
							PANEL.width,
							PANEL.height,
						);
					}
					return box(0, 0, 0, 0);
				},
			);
			const computed = window.getComputedStyle;
			vi.spyOn(window, "getComputedStyle").mockImplementation(
				(el: Element, pseudo?: string | null) =>
					pseudo
						? ({ content: "none" } as unknown as CSSStyleDeclaration)
						: computed.call(window, el),
			);
			const original = Object.getOwnPropertyDescriptor(
				HTMLElement.prototype,
				"offsetHeight",
			);
			Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
				configurable: true,
				get(this: HTMLElement) {
					return this.classList.contains("classicyTaskbar")
						? TASKBAR_HEIGHT
						: 0;
				},
			});
			restoreOffsetHeight = () => {
				if (original)
					Object.defineProperty(
						HTMLElement.prototype,
						"offsetHeight",
						original,
					);
			};
		});

		afterEach(() => restoreOffsetHeight());

		it("opens a module's panel above its icon, on the taskbar band's top edge, centered on the icon", () => {
			register(contentModule);
			renderTaskbar();
			click(icon("Volume"));
			const panel = popup("volume") as HTMLElement;
			expect(panel.style.visibility).toBe("");
			// No room below (the menu bounds end at the band): it flips above
			// the icon and sits on the band's top edge.
			expect(pxOf(panel.style.top)).toBe(
				DESKTOP.height - TASKBAR_HEIGHT - PANEL.height,
			);
			expect(pxOf(panel.style.left)).toBe(
				(ICON.left + ICON.right) / 2 - PANEL.width / 2,
			);
		});

		it("opens a module's menu above its icon from its left edge, kept inside the desktop", () => {
			register(menuModule);
			renderTaskbar();
			click(icon("File Sharing"));
			const menu = popup("sharing") as HTMLElement;
			expect(pxOf(menu.style.top)).toBe(
				DESKTOP.height - TASKBAR_HEIGHT - PANEL.height,
			);
			expect(pxOf(menu.style.left)).toBe(ICON.left);
			// Flush on the band's top edge it fits, and is drawn whole: no
			// scroll cap held 4 px off the edge.
			const list = menu.querySelector(
				":scope > .classicyMenuWrapper > ul",
			) as HTMLElement;
			expect(list).not.toHaveClass("classicyMenuListScrolls");
			expect(list.style.maxHeight).toBe("");
		});
	});
});
