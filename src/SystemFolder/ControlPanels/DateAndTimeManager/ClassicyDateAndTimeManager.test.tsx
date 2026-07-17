import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyDateAndTimeManager } from "./ClassicyDateAndTimeManager";

const APP_ID = "DateAndTimeManager.app";
const WINDOW_ID = "DateAndTimeManager_1";

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

// ClassicyApp only renders its children once the app is marked open in the
// store (real usage opens it via the menu-bar clock widget's ClassicyAppOpen
// dispatch); mirror that here so the window — and therefore the date/time
// pickers under test — actually mounts.
function renderOpen() {
	dispatch({
		type: "ClassicyAppOpen",
		app: { id: APP_ID, name: "Date and Time Manager", icon: "" },
	});
	return render(<ClassicyDateAndTimeManager />);
}

afterEach(() => {
	dispatch({ type: "ClassicyManagerDateTimeUnlock" });
	dispatch({ type: "ClassicyAppClose", app: { id: APP_ID } });
	cleanup();
});

describe("ClassicyDateAndTimeManager — HIG menu structure (audit ch. 6 §35)", () => {
	it("exposes a File menu with Close Window (⌘W) and Quit (⌘Q) separated by a divider, plus About out of any Help menu", () => {
		renderOpen();
		const menuBar = windowMenuBar();

		// No standalone Help menu — About was moved out of it.
		expect(menuBar.find((m) => m.title === "Help")).toBeUndefined();

		const file = menuBar.find((m) => m.title === "File");
		expect(file).toBeDefined();
		const fileChildren = file?.menuChildren ?? [];

		// About is the first File item and names the panel.
		expect(fileChildren[0]?.title).toBe("About Date and Time Manager");

		const closeItem = fileChildren.find((c) => c.title === "Close Window");
		const quitItem = fileChildren.find((c) => c.title === "Quit");
		expect(closeItem?.keyboardShortcut).toBe("⌘W");
		expect(quitItem?.keyboardShortcut).toBe("⌘Q");

		// Close and Quit are separated by exactly one divider ("spacer").
		const closeIdx = fileChildren.findIndex((c) => c.title === "Close Window");
		const quitIdx = fileChildren.findIndex((c) => c.title === "Quit");
		const between = fileChildren.slice(closeIdx + 1, quitIdx);
		expect(between.some((c) => c.id === "spacer")).toBe(true);
	});

	it("exposes an Edit menu with the standard commands (this panel has date/time entry fields)", () => {
		renderOpen();
		const edit = windowMenuBar().find((m) => m.title === "Edit");
		expect(edit).toBeDefined();
		const titles = childTitles(edit);
		for (const cmd of ["Undo", "Cut", "Copy", "Paste", "Clear", "Select All"]) {
			expect(titles).toContain(cmd);
		}
	});
});

describe("ClassicyDateAndTimeManager — dateTimeLocked", () => {
	it("disables the date and time editors — including the AM/PM popup — but not the timezone picker when locked", () => {
		dispatch({ type: "ClassicyManagerDateTimeLock" });
		const { container } = renderOpen();

		const dateColumn = container.querySelector(
			".classicyDateAndTimeManagerDateColumn",
		);
		const timeColumn = container.querySelector(
			".classicyDateAndTimeManagerTimeColumn",
		);
		for (const col of [dateColumn, timeColumn]) {
			const inputs =
				col?.querySelectorAll("input") ?? ([] as HTMLInputElement[]);
			expect(inputs.length).toBeGreaterThan(0);
			for (const input of inputs)
				expect((input as HTMLInputElement).disabled).toBe(true);
		}

		// The AM/PM popup is ClassicyTimePicker's nested ClassicyPopUpMenu — it
		// must be disabled too, otherwise a user can still flip AM/PM and shift
		// the clock 12 hours while "locked". The pop-up's visible control (a
		// <button>) carries the id and reflects disabled via the attribute.
		const amPm = container.querySelector("#am-pm") as HTMLButtonElement;
		expect(amPm).not.toBeNull();
		expect(amPm.disabled).toBe(true);

		// The timezone popup is a separate, standalone ClassicyPopUpMenu (not
		// nested inside a disabled editor) and must stay enabled while locked.
		const tz = container.querySelector("#timezone") as HTMLButtonElement;
		expect(tz).not.toBeNull();
		expect(tz.disabled).toBe(false);
	});

	it("editors — including the AM/PM popup — are enabled when not locked, and the timezone picker is always enabled", () => {
		const { container } = renderOpen();
		// Scoped to the date/time columns (the "editors" this feature controls) —
		// the separate Time Format control group has its own permanently
		// disabled "Military Time" radio (24-hour not yet implemented), which
		// is unrelated to dateTimeLocked and must not affect this assertion.
		const dateColumn = container.querySelector(
			".classicyDateAndTimeManagerDateColumn",
		);
		const timeColumn = container.querySelector(
			".classicyDateAndTimeManagerTimeColumn",
		);
		for (const col of [dateColumn, timeColumn]) {
			const inputs =
				col?.querySelectorAll("input") ?? ([] as HTMLInputElement[]);
			expect(inputs.length).toBeGreaterThan(0);
			for (const input of inputs)
				expect((input as HTMLInputElement).disabled).toBe(false);
		}

		const amPm = container.querySelector("#am-pm") as HTMLButtonElement;
		expect(amPm).not.toBeNull();
		expect(amPm.disabled).toBe(false);

		const tz = container.querySelector("#timezone") as HTMLButtonElement;
		expect(tz).not.toBeNull();
		expect(tz.disabled).toBe(false);
	});
});
