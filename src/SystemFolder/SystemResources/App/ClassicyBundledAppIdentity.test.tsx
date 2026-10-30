import { act, cleanup, render } from "@testing-library/react";
import type { FC } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerTestAppsPackage } from "@/__tests__/testAppsPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@/Appearance/Platinum";
import { ClassicyAppearanceManager } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager";
import { APPEARANCE_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
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
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

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

/** The File menu's About title. */
const aboutTitle = (appId: string, windowId: string) =>
	fileMenuItem(appId, windowId, "about")?.title;

/** The app the File menu's Quit closes: internal identity only. */
const quitApp = (appId: string, windowId: string) =>
	(fileMenuItem(appId, windowId, "quit")?.eventData as { app?: unknown })?.app;

beforeEach(() => {
	useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	registerTestAppsPackage(
		PACKAGE_ID,
		Object.fromEntries(
			[...PANELS.map(([id]) => id), HyperCardAppInfo.id].map((id) => [
				id,
				{ name: displayName(id), icon: displayIcon(id) },
			]),
		),
	);
	switchTo(PACKAGE_ID);
});

afterEach(() => {
	cleanup();
	switchTo(PLATINUM_APPEARANCE_PACKAGE_ID);
	unregisterClassicyAppearancePackage(PACKAGE_ID);
});

describe("bundled control panels follow the package's app identity", () => {
	it.each(
		PANELS,
	)("%s titles its window, proxy icon and About item with the display identity", (appId, appName, Panel, windowId) => {
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
		expect(aboutTitle(appId, windowId)).toBe(`About ${displayName(appId)}`);
		// Internal identity: the record and Quit keep the app's own name and
		// icon (the record's icon is the one the panel passes ClassicyApp).
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
	it("titles its no-stack window and About item with the display name", () => {
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
			`About ${displayName(HyperCardAppInfo.id)}`,
		);
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
