import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	useClassicyAboutMenu,
	useClassicyEditMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";

function seedTestApp() {
	useAppManager.setState(DefaultAppManagerState, true);
	useAppManager.setState((state) => ({
		...state,
		System: {
			...state.System,
			Manager: {
				...state.System.Manager,
				Applications: {
					...state.System.Manager.Applications,
					apps: {
						...state.System.Manager.Applications.apps,
						"TestApp.app": {
							id: "TestApp.app",
							name: "Test App",
							icon: "",
							open: true,
							focused: true,
							windows: [
								{
									id: "win-1",
									closed: false,
									focused: true,
									zOrder: 0,
									size: [100, 100],
									position: [0, 0],
									minimumSize: [50, 50],
								},
							],
							data: { openFiles: ["test-path"] },
						},
					},
				},
			},
		},
	}));
}

describe("useClassicyWindowClose", () => {
	beforeEach(() => {
		seedTestApp();
	});

	it("marks the given window as closed", () => {
		const { result } = renderHook(() => useClassicyWindowClose("TestApp.app"));

		act(() => {
			result.current("win-1", {
				type: "ClassicyAppTestAppCloseFile",
				app: { id: "TestApp.app" },
				path: "test-path",
			});
		});

		const app =
			useAppManager.getState().System.Manager.Applications.apps["TestApp.app"];
		expect(app.windows[0].closed).toBe(true);
	});

	it("also dispatches the app cleanup action", () => {
		const { result } = renderHook(() => useClassicyWindowClose("TestApp.app"));

		act(() => {
			result.current("win-1", {
				type: "ClassicyAppTestAppCloseFile",
				app: { id: "TestApp.app" },
				path: "test-path",
			});
		});

		const app =
			useAppManager.getState().System.Manager.Applications.apps["TestApp.app"];
		expect(app.data?.openFiles).toEqual([]);
	});

	it("returns a stable function reference across re-renders with the same appId", () => {
		const { result, rerender } = renderHook(
			({ appId }) => useClassicyWindowClose(appId),
			{ initialProps: { appId: "TestApp.app" } },
		);
		const first = result.current;
		rerender({ appId: "TestApp.app" });
		expect(result.current).toBe(first);
	});
});

describe("useClassicyAboutMenu", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("builds an About menu item with the expected id and title", () => {
		const { result } = renderHook(() =>
			useClassicyAboutMenu("TestApp.app", "Test App", "icon.png"),
		);
		expect(result.current.aboutMenuItem.id).toBe("TestApp.app_about");
		expect(result.current.aboutMenuItem.title).toBe("About");
	});

	it("starts with no about window rendered", () => {
		const { result } = renderHook(() =>
			useClassicyAboutMenu("TestApp.app", "Test App", "icon.png"),
		);
		expect(result.current.aboutWindow).toBeNull();
	});

	it("renders the about window after the menu item is clicked", () => {
		const { result } = renderHook(() =>
			useClassicyAboutMenu("TestApp.app", "Test App", "icon.png"),
		);
		act(() => {
			result.current.aboutMenuItem.onClickFunc?.();
		});
		expect(result.current.aboutWindow).not.toBeNull();
	});
});

describe("useClassicyEditMenu", () => {
	it("builds an Edit menu with the standard HIG commands", () => {
		const { result } = renderHook(() => useClassicyEditMenu("TestApp.app"));
		const edit = result.current;
		expect(edit.title).toBe("Edit");
		const titles = (edit.menuChildren ?? [])
			.filter((c) => c.id !== "spacer")
			.map((c) => c.title);
		expect(titles).toEqual([
			"Undo",
			"Cut",
			"Copy",
			"Paste",
			"Clear",
			"Select All",
		]);
	});

	it("wires every command to a click handler and flags editing shortcuts native", () => {
		const { result } = renderHook(() => useClassicyEditMenu("TestApp.app"));
		const children = (result.current.menuChildren ?? []).filter(
			(c) => c.id !== "spacer",
		);
		// Every command is clickable.
		for (const c of children) {
			expect(typeof c.onClickFunc).toBe("function");
		}
		// The shortcut-bearing commands defer to native browser editing.
		const shortcutItems = children.filter((c) => c.keyboardShortcut);
		expect(shortcutItems.length).toBe(5);
		for (const c of shortcutItems) {
			expect(c.nativeShortcut).toBe(true);
		}
	});
});
