import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-platinum";
import { act, fireEvent, render } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
import {
	type ClassicyStore,
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/**
 * End-to-end integration coverage for the central keyboard-shortcut dispatcher
 * (Task 5) mounted by the real `ClassicyDesktopMenuBar` (Task 4's
 * auto-registration effects + Task 2's reducer), asserting the two guarantees
 * the whole registry exists for:
 *   - an app's own menu shortcut only fires while that app is focused
 *   - an extension's global shortcut fires no matter which app is focused
 *
 * Deliberately renders the real menu bar under the real Zustand store (rather
 * than mocking the store or the dispatcher hook) so this exercises the actual
 * wiring: `ClassicyMenu` no longer owns any keydown listener (Task 6) — only
 * `useClassicyShortcutDispatcher` handles chords.
 */

/** Replace the whole store with defaults plus the given mutations. */
function setStore(mutate: (draft: ClassicyStore) => void): void {
	act(() => {
		useAppManager.setState(produce(DefaultAppManagerState, mutate), true);
	});
}

// Importing the Platinum module registered it; the window-placement case
// resets the registry and puts this object back afterwards.
const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

function makeApp(id: string, focused: boolean): ClassicyStoreSystemApp {
	return {
		id,
		name: id,
		icon: "/icons/app.png",
		windows: {},
		open: true,
		focused,
		data: {},
	};
}

describe("ClassicyShortcutDispatcher — end-to-end via the real menu bar", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("app shortcut fires only when its app is focused; extension global fires regardless", async () => {
		const focusedAppAction = vi.fn();

		const focusedAppMenu: ClassicyMenuItem[] = [
			{
				id: "FocusedApp.app_view",
				title: "View",
				menuChildren: [
					{
						id: "FocusedApp.app_tools",
						title: "Tools",
						keyboardShortcut: "Ctrl+T",
						onClickFunc: focusedAppAction,
					},
				],
			},
		];
		const otherAppMenu: ClassicyMenuItem[] = [
			{
				id: "OtherApp.app_file",
				title: "File",
				menuChildren: [{ id: "OtherApp.app_noop", title: "Noop" }],
			},
		];

		// Seed: FocusedApp.app is focused and has published a menu with Ctrl+T.
		// An extension has separately claimed the global Ctrl+Space, wired to a
		// real, observable reducer action (ClassicyDesktopSetBalloonHelp) so its
		// firing can be asserted on real store state rather than a mock.
		setStore((draft) => {
			draft.System.Manager.Applications.apps = {
				"FocusedApp.app": makeApp("FocusedApp.app", true),
				"OtherApp.app": makeApp("OtherApp.app", false),
			};
			draft.System.Manager.Applications.focusedAppId = "FocusedApp.app";
			draft.System.Manager.Desktop.appMenu = focusedAppMenu;
			draft.System.Manager.Keyboard.global = {
				"control+space": {
					appId: "BalloonExt",
					event: "ClassicyDesktopSetBalloonHelp",
					eventData: { disableBalloonHelp: true },
				},
			};
		});

		await act(async () => {
			render(<ClassicyDesktopMenuBar />);
		});

		// Sanity: the app-scope auto-registration effect (Task 4) claimed Ctrl+T
		// under the focused app, and the global claim seeded above survived it.
		expect(
			useAppManager.getState().System.Manager.Keyboard.app["FocusedApp.app"],
		).toEqual(expect.arrayContaining(["control+t"]));
		expect(
			useAppManager.getState().System.Manager.Keyboard.global["control+space"],
		).toBeDefined();

		// 1) FocusedApp.app is focused: its Ctrl+T fires, and the global
		// Ctrl+Space fires too (it's not shadowed by any app/system claim).
		fireEvent.keyDown(document, { key: "t", ctrlKey: true });
		expect(focusedAppAction).toHaveBeenCalledTimes(1);

		fireEvent.keyDown(document, { key: " ", code: "Space", ctrlKey: true });
		expect(
			useAppManager.getState().System.Manager.Desktop.disableBalloonHelp,
		).toBe(true);

		// Reset the observable side effect so the second firing is unambiguous.
		setStore((draft) => {
			draft.System.Manager.Applications.apps = {
				"FocusedApp.app": makeApp("FocusedApp.app", true),
				"OtherApp.app": makeApp("OtherApp.app", false),
			};
			draft.System.Manager.Applications.focusedAppId = "FocusedApp.app";
			draft.System.Manager.Desktop.appMenu = focusedAppMenu;
			draft.System.Manager.Desktop.disableBalloonHelp = false;
			draft.System.Manager.Keyboard.global = {
				"control+space": {
					appId: "BalloonExt",
					event: "ClassicyDesktopSetBalloonHelp",
					eventData: { disableBalloonHelp: true },
				},
			};
		});

		// 2) Switch focus to OtherApp.app, which publishes its own menu with no
		// Ctrl+T claim (mirroring how a real app republishes Desktop.appMenu on
		// focus). FocusedApp.app's action must no longer fire...
		await act(async () => {
			useAppManager.setState((s) =>
				produce(s, (draft) => {
					draft.System.Manager.Applications.apps["FocusedApp.app"].focused =
						false;
					draft.System.Manager.Applications.apps["OtherApp.app"].focused = true;
					draft.System.Manager.Applications.focusedAppId = "OtherApp.app";
					draft.System.Manager.Desktop.appMenu = otherAppMenu;
				}),
			);
		});

		expect(
			useAppManager.getState().System.Manager.Keyboard.app["OtherApp.app"],
		).toEqual([]);

		fireEvent.keyDown(document, { key: "t", ctrlKey: true });
		expect(focusedAppAction).toHaveBeenCalledTimes(1); // unchanged — no new fire

		// ...but the extension's global still fires, regardless of which app is
		// focused.
		fireEvent.keyDown(document, { key: " ", code: "Space", ctrlKey: true });
		expect(
			useAppManager.getState().System.Manager.Desktop.disableBalloonHelp,
		).toBe(true);
	});

	// Plan 0020-w98 §4: the Help merge moves an app's Help items into the
	// system Help menu, but not their chords: the app scope still claims what
	// its raw menus hold and the system scope the system's own Help items and
	// the registered ones, exactly as before the merge, so the Keyboard
	// Equivalent dialog's owner names stay the same. Every chord still fires.
	it("keeps each scope's chords through the Help merge (a Finder window, a host Help item)", async () => {
		const registeredAction = vi.fn();
		const ownHelpAction = vi.fn();
		const fileAction = vi.fn();
		const finderWindowMenu: ClassicyMenuItem[] = [
			{
				id: "Finder.app_Macintosh HD_file",
				title: "File",
				menuChildren: [
					{
						id: "Finder.app_Macintosh HD_file_k",
						title: "Get Info",
						keyboardShortcut: "Ctrl+K",
						onClickFunc: fileAction,
					},
				],
			},
			{
				id: "Finder.app_Macintosh HD_help",
				title: "Help",
				menuChildren: [
					{
						id: "Finder.app_Macintosh HD_help_balloon",
						title: "Hide Balloon Help",
						event: "ClassicyDesktopSetBalloonHelp",
						eventData: { disableBalloonHelp: true },
					},
					{
						id: "Finder.app_shortcuts",
						title: "Finder Shortcuts",
						keyboardShortcut: "Ctrl+J",
						onClickFunc: ownHelpAction,
					},
					{ id: "Finder.app_about", title: "About", onClickFunc: vi.fn() },
				],
			},
		];

		setStore((draft) => {
			draft.System.Manager.Applications.focusedAppId = "Finder.app";
			draft.System.Manager.Desktop.appMenu = finderWindowMenu;
			draft.System.Manager.Desktop.helpMenu = {
				"Finder.app": [
					{
						id: "host_finder_guide",
						title: "Finder Guide",
						keyboardShortcut: "Ctrl+G",
						onClickFunc: registeredAction,
					},
				],
			};
		});

		await act(async () => {
			render(<ClassicyDesktopMenuBar />);
		});

		const keyboard = () => useAppManager.getState().System.Manager.Keyboard;
		// The app scope: its raw menus' chords, its Help's included.
		expect([...(keyboard().app["Finder.app"] ?? [])].sort()).toEqual([
			"control+j",
			"control+k",
		]);
		// The system scope: the balloon toggle and the registered item.
		expect([...keyboard().system].sort()).toEqual(["control+g", "option+h"]);

		fireEvent.keyDown(document, { key: "j", ctrlKey: true });
		expect(ownHelpAction).toHaveBeenCalledTimes(1);
		fireEvent.keyDown(document, { key: "g", ctrlKey: true });
		expect(registeredAction).toHaveBeenCalledTimes(1);
		fireEvent.keyDown(document, { key: "k", ctrlKey: true });
		expect(fileAction).toHaveBeenCalledTimes(1);
		fireEvent.keyDown(document, { key: "h", altKey: true });
		expect(
			useAppManager.getState().System.Manager.Desktop.disableBalloonHelp,
		).toBe(true);
	});

	describe("with menus placed in windows", () => {
		afterEach(() => {
			resetClassicyAppearancePackagesForTests();
			registerClassicyAppearancePackage(platinum);
			useAppManager.setState(DefaultAppManagerState, true);
		});

		it("still fires with the screen bar headless (placement window)", async () => {
			registerTestMirrorPackage();
			const focusedAppAction = vi.fn();

			const focusedAppMenu: ClassicyMenuItem[] = [
				{
					id: "FocusedApp.app_view",
					title: "View",
					menuChildren: [
						{
							id: "FocusedApp.app_tools",
							title: "Tools",
							keyboardShortcut: "Ctrl+T",
							onClickFunc: focusedAppAction,
						},
					],
				},
			];

			setStore((draft) => {
				draft.System.Manager.Appearance.packageId = TEST_MIRROR_PACKAGE_ID;
				draft.System.Manager.Applications.apps = {
					"FocusedApp.app": makeApp("FocusedApp.app", true),
					"OtherApp.app": makeApp("OtherApp.app", false),
				};
				draft.System.Manager.Applications.focusedAppId = "FocusedApp.app";
				draft.System.Manager.Desktop.appMenu = focusedAppMenu;
				draft.System.Manager.Keyboard.global = {
					"control+space": {
						appId: "BalloonExt",
						event: "ClassicyDesktopSetBalloonHelp",
						eventData: { disableBalloonHelp: true },
					},
				};
			});

			let container: HTMLElement | undefined;
			await act(async () => {
				({ container } = render(<ClassicyDesktopMenuBar />));
			});

			// Headless: the bar renders nothing, but its hooks still ran.
			expect(container?.querySelector(".classicyDesktopMenuBar")).toBeNull();
			expect(
				useAppManager.getState().System.Manager.Keyboard.app["FocusedApp.app"],
			).toEqual(expect.arrayContaining(["control+t"]));

			fireEvent.keyDown(document, { key: "t", ctrlKey: true });
			expect(focusedAppAction).toHaveBeenCalledTimes(1);

			fireEvent.keyDown(document, { key: " ", code: "Space", ctrlKey: true });
			expect(
				useAppManager.getState().System.Manager.Desktop.disableBalloonHelp,
			).toBe(true);
		});
	});
});
