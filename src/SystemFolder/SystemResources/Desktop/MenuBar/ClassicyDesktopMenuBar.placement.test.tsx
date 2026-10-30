import { act, fireEvent, render } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	registerTestMirrorPackage,
	TEST_MIRROR_PACKAGE_ID,
} from "@/__tests__/testMirrorPackage";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@/Appearance/Platinum";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

/**
 * A package switch that moves the menus into the windows while a screen-bar
 * menu is open (a keyboard equivalent or host code, with no mouse-down
 * first) must not leave the hidden bar's provider active: back on the
 * screen, hovering a title would otherwise open its menu with no click.
 */

const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

const APP_ID = "T.app";
const appMenu: ClassicyMenuItem[] = [
	{
		id: "file",
		title: "File",
		menuChildren: [{ id: "new", title: "New" }],
	},
	{
		id: "edit",
		title: "Edit",
		menuChildren: [{ id: "undo", title: "Undo" }],
	},
];

const openApp = () =>
	act(() =>
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
				draft.System.Manager.Applications.focusedAppId = APP_ID;
			}),
		),
	);

const renderDesktop = () =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop startupScreen={false}>
				<ClassicyApp id={APP_ID} name="T" icon="">
					<ClassicyWindow
						id="main"
						appId={APP_ID}
						title="Main"
						appMenu={appMenu}
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

/** The screen bar's top-level `<li>` for the menu titled `title`. */
const screenTitle = (title: string) =>
	Array.from(document.querySelectorAll(".classicyDesktopMenuBar li")).find(
		(li) =>
			li.textContent?.startsWith(title) && li.querySelector(".classicySubMenu"),
	) as HTMLElement;

describe("ClassicyDesktopMenuBar — placement switch with a menu open", () => {
	beforeEach(() => {
		localStorage.clear();
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage(platinum);
		registerTestMirrorPackage();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	afterEach(() => {
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage(platinum);
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("closes the screen bar's menus when the placement becomes window", async () => {
		openApp();
		await act(async () => {
			renderDesktop();
		});
		const fileTitle = Array.from(
			document.querySelectorAll(
				".classicyDesktopMenuBar p, .classicyDesktopMenuBar span",
			),
		).find((node) => node.textContent === "File") as HTMLElement;
		fireEvent.click(fileTitle);
		expect(screenTitle("File")).toHaveClass("open");

		// A programmatic round trip: no mouse-down reaches the bar first.
		activate(TEST_MIRROR_PACKAGE_ID);
		activate(PLATINUM_APPEARANCE_PACKAGE_ID);

		expect(screenTitle("File")).not.toHaveClass("open");
		// An active bar opens a menu on hover alone; a closed one does not.
		fireEvent.mouseEnter(screenTitle("Edit"));
		expect(screenTitle("Edit")).not.toHaveClass("open");
	});

	it("opens nothing on hover alone on a fresh bar", async () => {
		openApp();
		await act(async () => {
			renderDesktop();
		});
		fireEvent.mouseEnter(screenTitle("Edit"));
		expect(screenTitle("Edit")).not.toHaveClass("open");
	});
});
