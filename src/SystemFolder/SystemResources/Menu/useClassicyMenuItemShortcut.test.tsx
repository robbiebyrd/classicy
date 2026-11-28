import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	useClassicyMenuItemShortcut,
	useClassicyMenuItemShortcuts,
} from "@/SystemFolder/SystemResources/Menu/useClassicyMenuItemShortcut";

// The menu builders' hook (the remaining chapters' audit's 4.15; WIG Ch.4
// "Shortcut Keys", p.27): the stored chord under
// `layout.keyboard.editableShortcuts`, the app's own without it.
const store = (overrides?: Record<string, string>) =>
	act(() => {
		const next = structuredClone(useAppManager.getState());
		if (overrides) next.System.Manager.Desktop.shortcutOverrides = overrides;
		else delete next.System.Manager.Desktop.shortcutOverrides;
		useAppManager.setState(next, true);
	});

beforeEach(() => {
	useAppManager.setState(structuredClone(DefaultAppManagerState), true);
});

describe("useClassicyMenuItemShortcut", () => {
	let restore: () => void = () => {};
	afterEach(() => {
		restore();
		restore = () => {};
	});

	it("gives the stored chord under the key, and follows a change", () => {
		restore = activateTestWindowsKeysPackage({
			keyboard: { contextMenuKey: true, editableShortcuts: true },
		});
		store({ finder_file_open: "command+k" });
		const { result } = renderHook(() =>
			useClassicyMenuItemShortcut("finder_file_open", "⌘O"),
		);
		expect(result.current).toBe("⌘K");
		store({ finder_file_open: "control+command+j" });
		expect(result.current).toBe("⌃⌘J");
		store(undefined);
		expect(result.current).toBe("⌘O");
	});

	it("gives the app's own chord without the key, whatever is stored", () => {
		store({ finder_file_open: "command+k" });
		const { result } = renderHook(() => useClassicyMenuItemShortcuts());
		expect(result.current("finder_file_open", "⌘O")).toBe("⌘O");
		// One identity without the key, so a builder's memo keeps.
		const first = result.current;
		store({ finder_file_open: "command+j" });
		expect(result.current).toBe(first);
	});
});
