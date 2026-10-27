import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
// Registers the built-in savers, so the panel has one to select and an
// "Options for …" group to render — as it does in the app, where the Screen
// Saver extension imports them.
import "@/SystemFolder/Extensions/ScreenSaver/savers/ClassicyScreenSaverBuiltIns";
import { SCREEN_SAVER_APP_ID } from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverContext";
import { ClassicyScreenSaverManager } from "./ClassicyScreenSaverManager";

const APP_ID = "ScreenSaverManager.app";
const WINDOW_ID = "ScreenSaverManager_1";

function windowMenuBar(): ClassicyMenuItem[] {
	const window = getAppWindow(
		useAppManager.getState().System.Manager.Applications.apps[APP_ID],
		WINDOW_ID,
	);
	return (window?.menuBar as ClassicyMenuItem[]) ?? [];
}

// ClassicyApp only renders its children once the app is marked open in the
// store, so mirror that here (as ClassicyDateAndTimeManager.test.tsx does)
// for the window — and its menu bar — to actually mount.
function renderOpen() {
	dispatch({
		type: "ClassicyAppOpen",
		app: { id: APP_ID, name: "Screen Saver", icon: "" },
	});
	return render(<ClassicyScreenSaverManager />);
}

// The panel edits ScreenSaver.app's data, and its reducer only acts once
// that app has a record in the store — in the app the extension opens it.
function openScreenSaverApp() {
	dispatch({
		type: "ClassicyAppOpen",
		app: { id: SCREEN_SAVER_APP_ID, name: "Screen Saver", icon: "" },
	});
}

function selectSaver(saverId: string) {
	act(() => {
		dispatch({ type: "ClassicyAppScreenSaverSetSaver", saverId });
	});
}

afterEach(() => {
	dispatch({ type: "ClassicyAppClose", app: { id: APP_ID } });
	dispatch({ type: "ClassicyAppClose", app: { id: SCREEN_SAVER_APP_ID } });
	cleanup();
});

describe("ClassicyScreenSaverManager — About menu (#252)", () => {
	it("exposes 'About Screen Saver' as the first File menu item", () => {
		renderOpen();
		const file = windowMenuBar().find((m) => m.title === "File");
		expect(file).toBeDefined();
		expect(file?.menuChildren?.[0]?.title).toBe("About Screen Saver");
	});

	it("opens the about window when the About item is clicked", () => {
		renderOpen();
		const file = windowMenuBar().find((m) => m.title === "File");
		const aboutItem = file?.menuChildren?.[0];

		expect(
			screen.queryByText("Not Copyright © 1997 Apple Computer, Inc."),
		).toBeNull();

		act(() => {
			aboutItem?.onClickFunc?.();
		});

		// The About dialog shows the app name and the Not-Copyright line
		// (ClassicyAboutWindow); the version amendment on #252 explicitly
		// declined adding a version number.
		expect(screen.getAllByText("Screen Saver").length).toBeGreaterThan(0);
		expect(
			screen.getByText("Not Copyright © 1997 Apple Computer, Inc."),
		).toBeInTheDocument();
	});
});

// HIGOS8 Ch.3 "Layout Guidelines": static text labels and the items they
// define line up in two columns (p.84), group boxes stack 12px apart
// (Figure 3-29), and the push button sits at the group's lower right (p.72).
describe("ClassicyScreenSaverManager — HIG control layout", () => {
	it("lays both group boxes out as label/control form grids inside a stack", () => {
		const { container } = renderOpen();
		const stack = container.querySelector(".classicyControlGroupStack");
		expect(stack).toBeInTheDocument();
		const grids = stack?.querySelectorAll(
			":scope > fieldset > .classicyControlGroupFormContent",
		);
		expect(grids).toHaveLength(2);
	});

	it("gives the enable checkbox a full-width row so its box aligns with the labels", () => {
		renderOpen();
		const checkbox = screen.getByLabelText("Start screen saver when idle");
		expect(
			checkbox.closest(".classicyControlGroupFormRow"),
		).toBeInTheDocument();
	});

	it("places the Test button in a right-aligned row of its group", () => {
		renderOpen();
		const row = screen
			.getByRole("button", { name: "Test" })
			.closest(".classicyControlGroupFormRow");
		expect(row).toHaveClass("classicyControlGroupFormRowEnd");
	});

	it("keeps the saver pop-up and timeout spinner as label/control pairs (no row wrapper)", () => {
		renderOpen();
		const popUp = screen.getByRole("combobox", { name: "Screen saver" });
		expect(popUp.closest(".classicyControlGroupFormRow")).toBeNull();
		const spinner = screen.getByLabelText("Minutes of inactivity");
		expect(spinner.closest(".classicyControlGroupFormRow")).toBeNull();
	});

	it("lays a schema-derived options form out as rows of the same grid", () => {
		openScreenSaverApp();
		renderOpen();
		selectSaver("flying-toasters");
		const grids = document.querySelectorAll(
			".classicyControlGroupStack > fieldset > .classicyControlGroupFormContent",
		);
		expect(grids).toHaveLength(2);
		// Number fields are label/control pairs: direct children of the grid.
		const toasters = screen.getByLabelText("How many toasters fly past.");
		expect(toasters.closest(".classicyControlGroupFormRow")).toBeNull();
		expect(toasters.closest(".classicyControlGroupFormContent")).toBe(grids[1]);
	});

	it("gives a schema-derived text field a full-width row with its label above", () => {
		openScreenSaverApp();
		renderOpen();
		selectSaver("messages");
		const text = screen.getByLabelText("The message to crawl.");
		expect(text.closest(".classicyControlGroupFormRow")).toBeInTheDocument();
		expect(text.closest(".classicyInputHolder")).toHaveClass(
			"classicyLabelAbove",
		);
	});
});
