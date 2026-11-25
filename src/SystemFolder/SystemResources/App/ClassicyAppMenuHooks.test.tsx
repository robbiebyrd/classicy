import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { windowsRecord } from "@/__tests__/windowsRecord";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { listAppWindows } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import {
	useClassicyAboutMenu,
	useClassicyEditMenu,
	useClassicyHelpMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import { __resetUndoTrackingForTests } from "@/SystemFolder/SystemResources/App/ClassicyEditCommands";

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
							windows: windowsRecord({
								id: "win-1",
								closed: false,
								focused: true,
								zOrder: 0,
								size: [100, 100],
								position: [0, 0],
								minimumSize: [50, 50],
							}),
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
		expect(listAppWindows(app)[0].closed).toBe(true);
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
		// Undo reads "Can't Undo" with no editable field focused and no history
		// (HIG 4.6: it is dimmed and names its unavailability).
		expect(titles).toEqual([
			"Can't Undo",
			"Cut",
			"Copy",
			"Paste",
			"Clear",
			"Select All",
		]);
	});

	it("names the pending action and enables Undo after an edit", () => {
		__resetUndoTrackingForTests();
		const input = document.createElement("input");
		document.body.appendChild(input);

		const { result } = renderHook(() => useClassicyEditMenu("TestApp.app"));
		const undoOf = () =>
			(result.current.menuChildren ?? []).find((c) => c.id?.endsWith("_undo"));

		// Nothing to undo yet.
		expect(undoOf()?.title).toBe("Can't Undo");
		expect(undoOf()?.disabled).toBe(true);

		act(() => {
			input.focus();
			input.dispatchEvent(
				new InputEvent("input", { inputType: "insertText", bubbles: true }),
			);
		});

		expect(undoOf()?.title).toBe("Undo Typing");
		expect(undoOf()?.disabled).toBe(false);

		input.remove();
		__resetUndoTrackingForTests();
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

describe("useClassicyHelpMenu", () => {
	it("registers items under the app id on mount", () => {
		const items = [{ id: "Weather.app_about_data", title: "About Weather…" }];
		renderHook(() => useClassicyHelpMenu("Weather.app", items));

		expect(useAppManager.getState().System.Manager.Desktop.helpMenu).toEqual({
			"Weather.app": items,
		});
	});

	it("removes its items on unmount", () => {
		const items = [{ id: "Weather.app_about_data", title: "About Weather…" }];
		const { unmount } = renderHook(() =>
			useClassicyHelpMenu("Weather.app", items),
		);
		unmount();

		expect(
			useAppManager.getState().System.Manager.Desktop.helpMenu?.["Weather.app"],
		).toBeUndefined();
	});
});

// The remaining chapters' audit's 4.12 and 5.30: under a package with
// access keys (`layout.menu.accessKeys`) the About item and the Edit menu
// carry Windows 98's letters (Table B.5; notepad.exe's and mspaint.exe's
// Edit menus: "&Undo", "Cu&t", "&Copy", "&Paste", "C&lear Selection",
// "Select &All"), and under its names spelling Clear shows the Delete key;
// Platinum's carry none.
describe("the bundled menus' access keys", () => {
	let restore: (() => void) | undefined;
	afterEach(() => {
		restore?.();
		restore = undefined;
	});
	const keysOf = (menu: { accessKey?: string; menuChildren?: unknown[] }) => [
		menu.accessKey,
		...(menu.menuChildren as { id: string; accessKey?: string }[])
			.filter((item) => item.id !== "spacer")
			.map((item) => item.accessKey),
	];

	it("gives About and the Edit menu Windows 98's letters under the Windows layout", () => {
		restore = activateTestWindowsKeysPackage({
			menu: { keys: "windows", accessKeys: "auto", shortcutSpelling: "names" },
		});
		const about = renderHook(() =>
			useClassicyAboutMenu("TestApp.app", "Test App", ""),
		);
		expect(about.result.current.aboutMenuItem.accessKey).toBe("a");
		const edit = renderHook(() => useClassicyEditMenu("test"));
		expect(keysOf(edit.result.current)).toEqual([
			"e",
			"u",
			"t",
			"c",
			"p",
			"l",
			"A",
		]);
		const clear = edit.result.current.menuChildren?.find(
			(item) => item.id === "test_clear",
		);
		expect(clear).toMatchObject({
			keyboardShortcut: "⌦",
			nativeShortcut: true,
		});
	});

	it("gives none, and Clear no shortcut, by default (Platinum)", () => {
		const about = renderHook(() =>
			useClassicyAboutMenu("TestApp.app", "Test App", ""),
		);
		expect(about.result.current.aboutMenuItem.accessKey).toBeUndefined();
		const edit = renderHook(() => useClassicyEditMenu("test"));
		expect(keysOf(edit.result.current).every((k) => k === undefined)).toBe(
			true,
		);
		const clear = edit.result.current.menuChildren?.find(
			(item) => item.id === "test_clear",
		);
		expect(clear?.keyboardShortcut).toBeUndefined();
		expect(clear?.nativeShortcut).toBeUndefined();
		// Serialized as before: no key appears in the menu's JSON.
		expect(JSON.stringify(edit.result.current)).not.toContain("accessKey");
	});
});

// The Edit menu's Windows form (`edit.menu: "windows"`; the shell's 5.44,
// built here): Windows 98 SE's Notepad's Edit menu ("&Undo\tCtrl+Z",
// "Cu&t\tCtrl+X", "&Copy\tCtrl+C", "&Paste\tCtrl+V", "De&lete\tDel",
// "Select &All"), its items dimmed as Notepad's menu-init dims them.
describe("useClassicyEditMenu's Windows form", () => {
	let restore: (() => void) | undefined;
	afterEach(() => {
		restore?.();
		restore = undefined;
		document.body.innerHTML = "";
		__resetUndoTrackingForTests();
	});
	const windowsLayout = {
		menu: {
			keys: "windows" as const,
			accessKeys: "auto" as const,
			shortcutSpelling: "names" as const,
		},
		edit: { scope: "window" as const, menu: "windows" as const },
	};
	type Item = {
		id: string;
		title?: string;
		accessKey?: string;
		disabled?: boolean;
		keyboardShortcut?: string;
	};
	const itemsOf = (menu: { menuChildren?: unknown[] }) =>
		menu.menuChildren as Item[];
	const byId = (menu: { menuChildren?: unknown[] }, id: string) =>
		itemsOf(menu).find((item) => item.id === id);

	it("draws Notepad's Edit menu: Undo, Cut, Copy, Paste, Delete with Del, Select All, its letters and dividers", () => {
		restore = activateTestWindowsKeysPackage(windowsLayout);
		const { result } = renderHook(() => useClassicyEditMenu("test"));
		expect(result.current.accessKey).toBe("e");
		expect(
			itemsOf(result.current).map((item) => [
				item.id,
				item.title,
				item.accessKey,
				item.keyboardShortcut,
			]),
		).toEqual([
			["test_undo", "Undo", "u", "⌘Z"],
			["spacer", undefined, undefined, undefined],
			["test_cut", "Cut", "t", "⌘X"],
			["test_copy", "Copy", "c", "⌘C"],
			["test_paste", "Paste", "p", "⌘V"],
			["test_clear", "Delete", "l", "⌦"],
			["spacer", undefined, undefined, undefined],
			["test_select_all", "Select All", "A", "⌘A"],
		]);
	});

	it("dims every command with no field, and Undo reads Undo, never Can't Undo", () => {
		restore = activateTestWindowsKeysPackage(windowsLayout);
		const { result } = renderHook(() => useClassicyEditMenu("test"));
		for (const item of itemsOf(result.current).filter(
			(i) => i.id !== "spacer",
		)) {
			expect(item.disabled, item.id).toBe(true);
		}
		expect(byId(result.current, "test_undo")?.title).toBe("Undo");
	});

	it("dims Cut, Copy and Delete while the field has no selection, and lights them with one", () => {
		restore = activateTestWindowsKeysPackage(windowsLayout);
		const win = document.createElement("div");
		win.className = "classicyWindow active";
		const input = document.createElement("input");
		input.value = "hello world";
		win.appendChild(input);
		document.body.appendChild(win);
		const { result } = renderHook(() => useClassicyEditMenu("test"));
		act(() => {
			input.focus();
			input.setSelectionRange(0, 0);
			document.dispatchEvent(new Event("selectionchange"));
		});
		const state = () =>
			Object.fromEntries(
				itemsOf(result.current)
					.filter((i) => i.id !== "spacer")
					.map((i) => [i.title, i.disabled]),
			);
		expect(state()).toEqual({
			Undo: true,
			Cut: true,
			Copy: true,
			Paste: false,
			Delete: true,
			"Select All": false,
		});
		act(() => {
			input.setSelectionRange(0, 5);
			document.dispatchEvent(new Event("selectionchange"));
			input.dispatchEvent(
				new InputEvent("input", { inputType: "insertText", bubbles: true }),
			);
		});
		expect(state()).toEqual({
			Undo: false,
			Cut: false,
			Copy: false,
			Paste: false,
			Delete: false,
			"Select All": false,
		});
		// Undo stays "Undo", never "Undo Typing".
		expect(byId(result.current, "test_undo")?.title).toBe("Undo");
		act(() => {
			input.readOnly = true;
			document.dispatchEvent(new Event("selectionchange"));
		});
		expect(state()).toMatchObject({
			Cut: true,
			Copy: false,
			Paste: true,
			Delete: true,
		});
	});

	it("keeps the Preferences item after a divider", () => {
		restore = activateTestWindowsKeysPackage(windowsLayout);
		const preferences = { id: "prefs", title: "Preferences…" };
		const { result } = renderHook(() =>
			useClassicyEditMenu("test", preferences),
		);
		expect(itemsOf(result.current).slice(-2)).toEqual([
			{ id: "spacer" },
			preferences,
		]);
	});

	it("keeps the Mac form under every other layout, the scope alone included", () => {
		const platinum = renderHook(() => useClassicyEditMenu("test"));
		const macJson = JSON.stringify(platinum.result.current);
		restore = activateTestWindowsKeysPackage({ edit: { scope: "window" } });
		const scoped = renderHook(() => useClassicyEditMenu("test"));
		expect(JSON.stringify(scoped.result.current)).toBe(macJson);
		expect(
			itemsOf(scoped.result.current)
				.filter((i) => i.id !== "spacer")
				.map((i) => i.title),
		).toEqual(["Can't Undo", "Cut", "Copy", "Paste", "Clear", "Select All"]);
		// The Mac form dims Undo alone, never by the selection.
		expect(byId(scoped.result.current, "test_cut")).not.toHaveProperty(
			"disabled",
		);
	});
});
