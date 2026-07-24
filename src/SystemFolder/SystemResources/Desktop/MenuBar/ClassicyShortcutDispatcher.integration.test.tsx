import { act, fireEvent, render } from "@testing-library/react";
import { produce } from "immer";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

function makeApp(id: string, focused: boolean): ClassicyStoreSystemApp {
	return {
		id,
		name: id,
		icon: "/icons/app.png",
		windows: [],
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
});
