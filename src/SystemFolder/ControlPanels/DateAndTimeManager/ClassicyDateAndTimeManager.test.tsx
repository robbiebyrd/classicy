import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { dispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDateAndTimeManager } from "./ClassicyDateAndTimeManager";

const APP_ID = "DateAndTimeManager.app";

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

describe("ClassicyDateAndTimeManager — dateTimeLocked", () => {
	it("disables the date and time editors but not the timezone picker when locked", () => {
		dispatch({ type: "ClassicyManagerDateTimeLock" });
		const { container } = renderOpen();

		const dateColumn = container.querySelector(".classicyDateAndTimeManagerDateColumn");
		const timeColumn = container.querySelector(".classicyDateAndTimeManagerTimeColumn");
		for (const col of [dateColumn, timeColumn]) {
			const inputs = col?.querySelectorAll("input") ?? ([] as HTMLInputElement[]);
			expect(inputs.length).toBeGreaterThan(0);
			for (const input of inputs) expect((input as HTMLInputElement).disabled).toBe(true);
		}

		const tzSelect = container.querySelector("select") as HTMLSelectElement;
		expect(tzSelect).not.toBeNull();
		expect(tzSelect.disabled).toBe(false);
	});

	it("editors are enabled when not locked", () => {
		const { container } = renderOpen();
		// Scoped to the date/time columns (the "editors" this feature controls) —
		// the separate Time Format control group has its own permanently
		// disabled "Military Time" radio (24-hour not yet implemented), which
		// is unrelated to dateTimeLocked and must not affect this assertion.
		const dateColumn = container.querySelector(".classicyDateAndTimeManagerDateColumn");
		const timeColumn = container.querySelector(".classicyDateAndTimeManagerTimeColumn");
		for (const col of [dateColumn, timeColumn]) {
			const inputs = col?.querySelectorAll("input") ?? ([] as HTMLInputElement[]);
			expect(inputs.length).toBeGreaterThan(0);
			for (const input of inputs) expect((input as HTMLInputElement).disabled).toBe(false);
		}
	});
});
