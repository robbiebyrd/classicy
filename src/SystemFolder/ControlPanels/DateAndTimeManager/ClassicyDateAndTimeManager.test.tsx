import {
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from "@testing-library/react";
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
	it("exposes a File menu with Close Window (⌥W) and Quit (⌥Q) separated by a divider, plus About out of any Help menu", () => {
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
		// Close/Quit use Option equivalents: ⌘W/⌘Q are reserved by the browser
		// (⌘W would close the whole tab), so ⌥W/⌥Q are the reachable, working ones.
		expect(closeItem?.keyboardShortcut).toBe("⌥W");
		expect(quitItem?.keyboardShortcut).toBe("⌥Q");

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
		// the separate Time Format control group has its own 12-Hour / Military
		// Time radios, which are unrelated to dateTimeLocked and must not affect
		// this assertion.
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

describe("ClassicyDateAndTimeManager — Sync button", () => {
	it("dispatches ClassicyManagerDateTimeSync, moving the clock to the real current instant", () => {
		// Park the store far from real time so a successful sync is unambiguous.
		dispatch({
			type: "ClassicyManagerDateTimeSet",
			dateTime: new Date("1997-03-04T08:00:00.000Z"),
		});
		renderOpen();

		fireEvent.click(screen.getByRole("button", { name: "Sync" }));

		const synced = new Date(
			useAppManager.getState().System.Manager.DateAndTime.dateTime,
		).getTime();
		// Within a minute of now — clicking Sync must land on real time.
		expect(Math.abs(synced - Date.now())).toBeLessThan(60_000);
	});

	it("disables Sync when the clock is locked, so a locked clock cannot be re-synced", () => {
		dispatch({ type: "ClassicyManagerDateTimeLock" });
		renderOpen();

		expect(
			(screen.getByRole("button", { name: "Sync" }) as HTMLButtonElement)
				.disabled,
		).toBe(true);
	});

	it("enables Sync when the clock is not locked", () => {
		renderOpen();

		expect(
			(screen.getByRole("button", { name: "Sync" }) as HTMLButtonElement)
				.disabled,
		).toBe(false);
	});

	it("re-seeds the panel's own Current Date / Current Time fields after Sync, rather than leaving stale values displayed", () => {
		dispatch({
			type: "ClassicyManagerDateTimeSet",
			dateTime: new Date("1997-03-04T08:00:00.000Z"),
		});
		const { container } = renderOpen();

		fireEvent.click(screen.getByRole("button", { name: "Sync" }));

		const currentYear = String(new Date().getFullYear());
		const dateColumn = container.querySelector(
			".classicyDateAndTimeManagerDateColumn",
		);
		const yearInput = dateColumn?.querySelector(
			"#date_year",
		) as HTMLInputElement;
		expect(yearInput).not.toBeNull();
		expect(yearInput.value).toBe(currentYear);
	});
});

// Selects a timezone option from the standalone timezone ClassicyPopUpMenu
// (id="timezone") by opening it and clicking the option with the given label.
function selectTimeZone(container: HTMLElement, label: string) {
	fireEvent.click(container.querySelector("#timezone") as HTMLButtonElement);
	fireEvent.click(
		within(screen.getByRole("listbox")).getByRole("option", { name: label }),
	);
}

describe("ClassicyDateAndTimeManager — timezone changes must not corrupt the AM/PM period state", () => {
	// Regression test for updateSystemTimeZone previously calling
	// setPeriod(e.target.value), writing an offset string (e.g. "-6") into
	// state typed for 'am' | 'pm'. updateSystemTime then branched on
	// `period === "am"`, which went false after any timezone change, silently
	// adding 12 hours to every subsequent time edit.
	it("does not shift the dispatched dateTime hour by 12 after changing the timezone and then editing the time", () => {
		dispatch({ type: "ClassicyManagerDateTimeTZSet", tzOffset: "0" });
		dispatch({
			type: "ClassicyManagerDateTimeSet",
			// 08:00 under tzOffset "0" — unambiguously AM, no boundary edge cases.
			dateTime: new Date("1997-03-04T08:00:00.000Z"),
		});
		const { container } = renderOpen();

		// Change the timezone — this alone must not corrupt any AM/PM state.
		selectTimeZone(container, "America/Denver");
		expect(
			useAppManager.getState().System.Manager.DateAndTime.timeZoneOffset,
		).toBe("-6");

		// Edit the hour field directly (still displaying "8", unaffected by the
		// timezone change since the pickers only re-seed on an explicit Sync).
		const hourInput = container.querySelector("#time_hour") as HTMLInputElement;
		expect(hourInput).not.toBeNull();
		fireEvent.change(hourInput, { target: { value: "9" } });

		// Local hour 9 in tz -6 is UTC 15 (9 - (-6)). The pre-fix bug computed
		// hoursToSet = 9 + 12 = 21, i.e. UTC 27 -> wraps to hour 3 the next day.
		const dispatchedHour = new Date(
			useAppManager.getState().System.Manager.DateAndTime.dateTime,
		).getUTCHours();
		expect(dispatchedHour).toBe(15);
		expect(dispatchedHour).not.toBe((15 + 12) % 24);
	});

	it("keeps the AM/PM popup showing the correct period after a timezone change", () => {
		dispatch({ type: "ClassicyManagerDateTimeTZSet", tzOffset: "0" });
		dispatch({
			type: "ClassicyManagerDateTimeSet",
			dateTime: new Date("1997-03-04T08:00:00.000Z"),
		});
		const { container } = renderOpen();

		const amPm = container.querySelector("#am-pm") as HTMLButtonElement;
		expect(amPm).not.toBeNull();
		expect(amPm).toHaveTextContent("am");

		selectTimeZone(container, "America/Denver");

		// The timezone change must not reset or corrupt the AM/PM control.
		expect(amPm).toHaveTextContent("am");
	});
});
