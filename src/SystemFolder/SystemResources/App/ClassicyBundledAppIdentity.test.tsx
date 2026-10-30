import { act, cleanup, fireEvent, render } from "@testing-library/react";
import type { FC } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerTestAppsPackage } from "@/__tests__/testAppsPackage";
import {
	type ClassicyAppIdentityOverride,
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@/Appearance/Platinum";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicyAppearanceManager } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager";
import { APPEARANCE_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	sanitizeStateForPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyControlStripManager } from "@/SystemFolder/ControlPanels/ControlStripManager/ClassicyControlStripManager";
import {
	CONTROL_STRIP_MANAGER_APP_ID,
	CONTROL_STRIP_MANAGER_APP_NAME,
} from "@/SystemFolder/ControlPanels/ControlStripManager/ClassicyControlStripManagerManifest";
import { ClassicyDateAndTimeManager } from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManager";
import { DATE_AND_TIME_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerManifest";
import { ClassicyDriveSetup } from "@/SystemFolder/ControlPanels/DriveSetup/ClassicyDriveSetup";
import { DRIVE_SETUP_APP_ID } from "@/SystemFolder/ControlPanels/DriveSetup/ClassicyDriveSetupManifest";
import { ClassicyScreenSaverManager } from "@/SystemFolder/ControlPanels/ScreenSaverManager/ClassicyScreenSaverManager";
import { SCREEN_SAVER_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/ScreenSaverManager/ClassicyScreenSaverManagerManifest";
import { ClassicySoundManager } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManager";
import { SOUND_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerManifest";
import { HyperCard } from "@/SystemFolder/HyperCard/HyperCard";
import { HyperCardDialog } from "@/SystemFolder/HyperCard/HyperCardDialog";
import { HyperCardAppInfo } from "@/SystemFolder/HyperCard/HyperCardUtils";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindowMenuBar } from "@/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar";

// The control panels play feedback sounds; no sound provider is mounted here.
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		useSound: () => ({ disabled: [], labels: [], volume: 70 }),
		useSoundDispatch: () => () => {},
	}),
);

const PACKAGE_ID = "test-bundled-identity";

/** The same overrides, with each window drawing its own menu bar. */
const WINDOW_MENUS_PACKAGE_ID = "test-bundled-identity-window-menus";

/** The display icon the fixture gives `appId`. */
const displayIcon = (appId: string) => `/test-bundled-identity/${appId}.png`;

/** The display name the fixture gives `appId`. */
const displayName = (appId: string) => `${appId.replace(/\.app$/, "")} Display`;

// [app id, the app's own name, the panel, its window id]
const PANELS: [string, string, FC, string][] = [
	[
		DATE_AND_TIME_MANAGER_APP_ID,
		"Date and Time Manager",
		ClassicyDateAndTimeManager,
		"DateAndTimeManager_1",
	],
	[
		APPEARANCE_MANAGER_APP_ID,
		"Appearance Manager",
		ClassicyAppearanceManager,
		"AppearanceManager_1",
	],
	[DRIVE_SETUP_APP_ID, "Drive Setup", ClassicyDriveSetup, "DriveSetup_1"],
	[
		CONTROL_STRIP_MANAGER_APP_ID,
		CONTROL_STRIP_MANAGER_APP_NAME,
		ClassicyControlStripManager,
		"ControlStripManager_1",
	],
	[
		SOUND_MANAGER_APP_ID,
		"Sound Manager",
		ClassicySoundManager,
		"SoundManager_1",
	],
	[
		SCREEN_SAVER_MANAGER_APP_ID,
		"Screen Saver",
		ClassicyScreenSaverManager,
		"ScreenSaverManager_1",
	],
];

// The panels plus HyperCard: every bundled app whose About item the menu
// bars title (K 4.1 review m2).
const MENU_BAR_APPS: [string, string, FC, string][] = [
	...PANELS,
	[HyperCardAppInfo.id, HyperCardAppInfo.name, HyperCard, "hypercard_main"],
];

const switchTo = (packageId: string) =>
	act(() =>
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId }),
	);

const apps = () => useAppManager.getState().System.Manager.Applications.apps;

/** The one window's title text and proxy-icon `src`. */
const titleBar = (container: HTMLElement) => {
	const titles = container.querySelectorAll(".classicyWindowTitleText");
	expect(titles).toHaveLength(1);
	return {
		title: titles[0].textContent,
		icon: container
			.querySelector(".classicyWindowIcon img")
			?.getAttribute("src"),
	};
};

/** A File menu item, as the window publishes it. */
const fileMenuItem = (appId: string, windowId: string, itemId: string) => {
	const menuBar = getAppWindow(apps()[appId], windowId)?.menuBar as
		| ClassicyMenuItem[]
		| undefined;
	const file = menuBar?.find((m) => m.title === "File");
	return file?.menuChildren?.find((c) => c.id === `${appId}_${itemId}`);
};

/**
 * The persisted form of the store. It must hold no display name or icon:
 * menus are stored under the app's own name, and the bars title the About
 * item where they draw it (K-R8).
 */
const persisted = () =>
	JSON.stringify(sanitizeStateForPersistence(useAppManager.getState()));

/** The File menu's About title, as stored. */
const aboutTitle = (appId: string, windowId: string) =>
	fileMenuItem(appId, windowId, "about")?.title;

/** The app the File menu's Quit closes: internal identity only. */
const quitApp = (appId: string, windowId: string) =>
	(fileMenuItem(appId, windowId, "quit")?.eventData as { app?: unknown })?.app;

const OVERRIDES: Record<string, ClassicyAppIdentityOverride> =
	Object.fromEntries(
		[...PANELS.map(([id]) => id), HyperCardAppInfo.id].map((id) => [
			id,
			{ name: displayName(id), icon: displayIcon(id) },
		]),
	);

/** Registers (or replaces) the window-menus fixture with `apps`. */
const registerWindowMenusPackage = (
	apps: Record<string, ClassicyAppIdentityOverride>,
) =>
	registerClassicyAppearancePackage({
		id: WINDOW_MENUS_PACKAGE_ID,
		name: WINDOW_MENUS_PACKAGE_ID,
		css: "",
		defaults: {
			...getTheme("default"),
			id: `${WINDOW_MENUS_PACKAGE_ID}-default`,
			package: WINDOW_MENUS_PACKAGE_ID,
		},
		layout: {
			...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
			menuBar: { placement: "window" },
		},
		apps,
	});

beforeEach(() => {
	useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	registerTestAppsPackage(PACKAGE_ID, OVERRIDES);
	registerWindowMenusPackage(OVERRIDES);
	switchTo(PACKAGE_ID);
});

afterEach(() => {
	cleanup();
	switchTo(PLATINUM_APPEARANCE_PACKAGE_ID);
	unregisterClassicyAppearancePackage(PACKAGE_ID);
	unregisterClassicyAppearancePackage(WINDOW_MENUS_PACKAGE_ID);
});

describe("bundled control panels follow the package's app identity", () => {
	it.each(
		PANELS,
	)("%s titles its window and proxy icon with the display identity and stores none of it", (appId, appName, Panel, windowId) => {
		act(() =>
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: appId, name: appName, icon: "" },
			}),
		);
		const { container } = render(<Panel />);

		expect(titleBar(container)).toEqual({
			title: displayName(appId),
			icon: displayIcon(appId),
		});
		// Internal identity: the stored menu (K-R8), the record and Quit keep
		// the app's own name and icon (the record's icon is the one the panel
		// passes ClassicyApp), so nothing display-derived is persisted.
		expect(aboutTitle(appId, windowId)).toBe(`About ${appName}`);
		expect(persisted()).not.toContain(displayName(appId));
		expect(persisted()).not.toContain(displayIcon(appId));
		expect(apps()[appId].name).toBe(appName);
		expect(quitApp(appId, windowId)).toEqual({
			id: appId,
			title: appName,
			icon: apps()[appId].icon,
		});

		switchTo(PLATINUM_APPEARANCE_PACKAGE_ID);

		const ownIcon = apps()[appId].icon;
		expect(ownIcon).not.toBe("");
		expect(ownIcon).not.toBe(displayIcon(appId));
		expect(titleBar(container)).toEqual({ title: appName, icon: ownIcon });
		expect(aboutTitle(appId, windowId)).toBe(`About ${appName}`);
	});
});

describe("HyperCard follows the package's app identity", () => {
	it("titles its no-stack window with the display name and stores none of it", () => {
		act(() =>
			dispatch({
				type: "ClassicyAppOpen",
				app: {
					id: HyperCardAppInfo.id,
					name: HyperCardAppInfo.name,
					icon: "",
				},
			}),
		);
		const { container } = render(<HyperCard />);

		expect(titleBar(container).title).toBe(displayName(HyperCardAppInfo.id));
		expect(aboutTitle(HyperCardAppInfo.id, "hypercard_main")).toBe(
			`About ${HyperCardAppInfo.name}`,
		);
		expect(persisted()).not.toContain(displayName(HyperCardAppInfo.id));
		expect(persisted()).not.toContain(displayIcon(HyperCardAppInfo.id));
		expect(apps()[HyperCardAppInfo.id].name).toBe(HyperCardAppInfo.name);
		expect(quitApp(HyperCardAppInfo.id, "hypercard_main")).toEqual({
			id: HyperCardAppInfo.id,
			title: HyperCardAppInfo.name,
			icon: apps()[HyperCardAppInfo.id].icon,
		});

		switchTo(PLATINUM_APPEARANCE_PACKAGE_ID);

		expect(titleBar(container).title).toBe(HyperCardAppInfo.name);
		expect(aboutTitle(HyperCardAppInfo.id, "hypercard_main")).toBe(
			`About ${HyperCardAppInfo.name}`,
		);
	});

	it("titles an answer dialog with the display name and keeps Ask", () => {
		const { rerender } = render(
			<HyperCardDialog
				dialog={{ kind: "answer", message: "Hello", token: "t1" }}
				stackId="demo"
			/>,
		);
		const dialogTitle = () =>
			document.querySelector(".classicyWindowTitleText")?.textContent;

		expect(dialogTitle()).toBe(displayName(HyperCardAppInfo.id));

		rerender(
			<HyperCardDialog
				dialog={{ kind: "ask", message: "Name?", token: "t2" }}
				stackId="demo"
			/>,
		);
		expect(dialogTitle()).toBe("Ask");

		rerender(
			<HyperCardDialog
				dialog={{ kind: "answer", message: "Hello", token: "t3" }}
				stackId="demo"
			/>,
		);
		switchTo(PLATINUM_APPEARANCE_PACKAGE_ID);
		expect(dialogTitle()).toBe(HyperCardAppInfo.name);
	});
});

describe("the menu bars title a renamed app's About item (K-R8)", () => {
	const open = (appId: string, appName: string) =>
		act(() =>
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: appId, name: appName, icon: "" },
			}),
		);

	it.each(
		MENU_BAR_APPS,
	)("%s: the screen bar's Apple menu shows About <display name>", (appId, appName, Panel) => {
		open(appId, appName);
		render(
			<>
				<ClassicyDesktopMenuBar />
				<Panel />
			</>,
		);
		const apple = document.querySelector<HTMLElement>(
			'[data-classicy-part="apple"]',
		) as HTMLElement;
		fireEvent.click(apple.querySelector("p") ?? apple);
		const about = document.getElementById(`${appId}_about_apple`);
		expect(about).toHaveTextContent(`About ${displayName(appId)}`);
		expect(persisted()).not.toContain(displayName(appId));
	});

	it.each(
		MENU_BAR_APPS,
	)("%s: the window's own menu bar shows About <display name>", (appId, appName, Panel, windowId) => {
		switchTo(WINDOW_MENUS_PACKAGE_ID);
		open(appId, appName);
		const { container } = render(<Panel />);
		const bar = container.querySelector(".classicyWindowMenuBar");
		expect(bar).not.toBeNull();
		const file = Array.from((bar as HTMLElement).querySelectorAll("li")).find(
			(li) => li.querySelector(":scope > p")?.textContent === "File",
		);
		fireEvent.click(file?.querySelector(":scope > p") as HTMLElement);
		const about = document.getElementById(`${appId}_about`);
		expect(about).toHaveTextContent(`About ${displayName(appId)}`);
		// Stored under the app's own name.
		expect(aboutTitle(appId, windowId)).toBe(`About ${appName}`);
		expect(persisted()).not.toContain(displayName(appId));

		// Live: the package dropping its override retitles the drawn item.
		act(() => registerWindowMenusPackage({}));
		expect(document.getElementById(`${appId}_about`)).toHaveTextContent(
			`About ${appName}`,
		);
	});
});

describe("ClassicyWindowMenuBar titles the About item at render (K-R8)", () => {
	it("follows a package switch with the same stored menu", () => {
		// The bar reads the app's own name from its record (K-R9).
		act(() =>
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: DRIVE_SETUP_APP_ID, name: "Drive Setup", icon: "" },
			}),
		);
		// One menu array for every render: only the package changes.
		const menuItems: ClassicyMenuItem[] = [
			{
				id: `${DRIVE_SETUP_APP_ID}_file`,
				title: "File",
				menuChildren: [
					{ id: `${DRIVE_SETUP_APP_ID}_about`, title: "About Drive Setup" },
				],
			},
		];
		render(
			<ClassicyWindowMenuBar
				appId={DRIVE_SETUP_APP_ID}
				windowId="DriveSetup_1"
				menuItems={menuItems}
			/>,
		);
		const about = () => document.getElementById(`${DRIVE_SETUP_APP_ID}_about`);
		fireEvent.click(
			document.querySelector(".classicyWindowMenuBar li > p") as HTMLElement,
		);
		expect(about()).toHaveTextContent(
			`About ${displayName(DRIVE_SETUP_APP_ID)}`,
		);

		switchTo(PLATINUM_APPEARANCE_PACKAGE_ID);
		expect(about()).toHaveTextContent("About Drive Setup");
		expect(menuItems[0].menuChildren?.[0].title).toBe("About Drive Setup");
	});
});

// K-R9: the window bar retitles only the internal name's form. The screen
// bar's Apple menu builds its own "About <display name>" (HIG #209, K 3.2)
// whatever the stored wording, and strips the stored item from the app's
// menus, so the stored title is never drawn there.
describe("an About item's stored wording under a rename (K-R9)", () => {
	const APP_NAME = "Drive Setup";
	const ABOUT_ID = `${DRIVE_SETUP_APP_ID}_about`;
	const storedMenu = (title: string): ClassicyMenuItem[] => [
		{
			id: `${DRIVE_SETUP_APP_ID}_file`,
			title: "File",
			menuChildren: [
				{ id: ABOUT_ID, title },
				{ id: `${DRIVE_SETUP_APP_ID}_quit`, title: "Quit" },
			],
		},
	];
	const openApp = () =>
		act(() =>
			dispatch({
				type: "ClassicyAppOpen",
				app: { id: DRIVE_SETUP_APP_ID, name: APP_NAME, icon: "" },
			}),
		);

	// [case, stored title, the window bar's drawn title]
	const CASES: [string, string, string][] = [
		[
			"the internal name's form",
			`About ${APP_NAME}`,
			`About ${displayName(DRIVE_SETUP_APP_ID)}`,
		],
		["a plain About", "About", "About"],
		["a custom title", `About ${APP_NAME}…`, `About ${APP_NAME}…`],
	];

	it.each(
		CASES,
	)("the window bar draws %s as the app chose", (_case, stored, drawn) => {
		switchTo(WINDOW_MENUS_PACKAGE_ID);
		openApp();
		const menuItems = storedMenu(stored);
		render(
			<ClassicyWindowMenuBar
				appId={DRIVE_SETUP_APP_ID}
				windowId="DriveSetup_1"
				menuItems={menuItems}
			/>,
		);
		fireEvent.click(
			document.querySelector(".classicyWindowMenuBar li > p") as HTMLElement,
		);
		expect(document.getElementById(ABOUT_ID)?.textContent).toBe(drawn);
		expect(menuItems[0].menuChildren?.[0].title).toBe(stored);
	});

	it.each(
		CASES,
	)("the screen bar's Apple menu draws %s as About <display name>", (_case, stored) => {
		openApp();
		act(() =>
			dispatch({
				type: "ClassicyAppFocus",
				app: { id: DRIVE_SETUP_APP_ID },
			}),
		);
		act(() =>
			useAppManager.setState((s) => ({
				System: {
					...s.System,
					Manager: {
						...s.System.Manager,
						Desktop: {
							...s.System.Manager.Desktop,
							appMenu: storedMenu(stored),
						},
					},
				},
			})),
		);
		render(<ClassicyDesktopMenuBar />);
		const apple = document.querySelector<HTMLElement>(
			'[data-classicy-part="apple"]',
		) as HTMLElement;
		fireEvent.click(apple.querySelector("p") ?? apple);
		expect(
			document.getElementById(`${DRIVE_SETUP_APP_ID}_about_apple`)?.textContent,
		).toBe(`About ${displayName(DRIVE_SETUP_APP_ID)}`);
		// The stored item is hoisted, not drawn in the app's File menu too.
		expect(document.getElementById(ABOUT_ID)).toBeNull();
	});
});
