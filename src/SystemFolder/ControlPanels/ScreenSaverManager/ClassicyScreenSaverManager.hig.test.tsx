import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyScreenSaverManager } from "./ClassicyScreenSaverManager";

const APP_ID = "ScreenSaverManager.app";
const WINDOW_ID = "ScreenSaverManager_1";

function windowMenuBar(): ClassicyMenuItem[] {
	const window = useAppManager
		.getState()
		.System.Manager.Applications.apps[APP_ID]?.windows.find(
			(w) => w.id === WINDOW_ID,
		);
	return (window?.menuBar as ClassicyMenuItem[]) ?? [];
}

function childTitles(menu: ClassicyMenuItem | undefined): string[] {
	return (menu?.menuChildren ?? []).map((c) => c.title ?? "");
}

function renderOpen() {
	dispatch({
		type: "ClassicyAppOpen",
		app: { id: APP_ID, name: "Screen Saver", icon: "" },
	});
	return render(<ClassicyScreenSaverManager />);
}

afterEach(() => {
	dispatch({ type: "ClassicyAppClose", app: { id: APP_ID } });
	cleanup();
});

// HIGOS8 Ch.6 "Standard Menus" (p.118): a control panel must carry an
// About <panel> item (hoisted into the Apple menu), a File menu with Close
// Window and a divider-separated Quit, and — because this panel has edit-text
// fields (timeout spinner, per-saver options) — an Edit menu.
describe("ClassicyScreenSaverManager — HIG menu structure (audit ch. 6 §35)", () => {
	it("exposes File with About, Close Window (⌥W), and divider-separated Quit (⌥Q)", () => {
		renderOpen();
		const menuBar = windowMenuBar();

		expect(menuBar.find((m) => m.title === "Help")).toBeUndefined();

		const file = menuBar.find((m) => m.title === "File");
		expect(file).toBeDefined();
		const fileChildren = file?.menuChildren ?? [];

		expect(fileChildren[0]?.title).toBe("About Screen Saver");

		const closeItem = fileChildren.find((c) => c.title === "Close Window");
		const quitItem = fileChildren.find((c) => c.title === "Quit");
		expect(closeItem?.keyboardShortcut).toBe("⌥W");
		expect(quitItem?.keyboardShortcut).toBe("⌥Q");

		const closeIdx = fileChildren.findIndex((c) => c.title === "Close Window");
		const quitIdx = fileChildren.findIndex((c) => c.title === "Quit");
		const between = fileChildren.slice(closeIdx + 1, quitIdx);
		expect(between.some((c) => c.id === "spacer")).toBe(true);
	});

	it("exposes an Edit menu with the standard commands (this panel has edit-text fields)", () => {
		renderOpen();
		const edit = windowMenuBar().find((m) => m.title === "Edit");
		expect(edit).toBeDefined();
		const titles = childTitles(edit);
		// Undo is context-aware (HIG 4.6): with no field focused it reads
		// "Can't Undo" rather than the bare "Undo".
		for (const cmd of [
			"Can't Undo",
			"Cut",
			"Copy",
			"Paste",
			"Clear",
			"Select All",
		]) {
			expect(titles).toContain(cmd);
		}
	});
});
