import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyControlStripManager } from "@/SystemFolder/ControlPanels/ControlStripManager/ClassicyControlStripManager";
import { CONTROL_STRIP_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/ControlStripManager/ClassicyControlStripManagerManifest";
import {
	CLASSICY_CONTROL_STRIP_MODULE_IDS,
	registerClassicyControlStripModule,
	setClassicyControlStripDisabledModules,
	unregisterClassicyControlStripModule,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const WINDOW_ID = "ControlStripManager_1";
const TEST_IDS = ["cp-alpha", "cp-beta", "cp-gamma"];

const strip = () =>
	useAppManager.getState().System.Manager.Desktop.controlStrip;

function renderOpen() {
	dispatch({
		type: "ClassicyAppOpen",
		app: { id: CONTROL_STRIP_MANAGER_APP_ID, name: "Control Strip", icon: "" },
	});
	return render(<ClassicyControlStripManager />);
}

const optionLabels = () =>
	screen.getAllByRole("option").map((o) => o.textContent?.trim());

beforeEach(() => {
	useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	// Only this file's modules: the built-ins are host-disabled.
	setClassicyControlStripDisabledModules(
		Object.values(CLASSICY_CONTROL_STRIP_MODULE_IDS),
	);
	for (const [i, id] of TEST_IDS.entries()) {
		registerClassicyControlStripModule({
			id,
			label: ["Alpha", "Beta", "Gamma"][i],
			icon: `${id}.png`,
		});
	}
});

afterEach(() => {
	cleanup();
	for (const id of TEST_IDS) unregisterClassicyControlStripModule(id);
	setClassicyControlStripDisabledModules([]);
});

describe("ClassicyControlStripManager", () => {
	it("carries the control-panel File menu (About, Close Window, Quit)", () => {
		renderOpen();
		const window = getAppWindow(
			useAppManager.getState().System.Manager.Applications.apps[
				CONTROL_STRIP_MANAGER_APP_ID
			],
			WINDOW_ID,
		);
		const file = (window?.menuBar as ClassicyMenuItem[]).find(
			(m) => m.title === "File",
		);
		expect(file?.menuChildren?.map((c) => c.title)).toEqual([
			"About Control Strip",
			"Close Window",
			undefined,
			"Quit",
		]);
	});

	it("shows and hides the whole strip", () => {
		renderOpen();
		const show = screen.getByRole("checkbox", { name: "Show Control Strip" });
		expect(show).toBeChecked();
		act(() => show.click());
		expect(strip()?.visible).toBe(false);
	});

	it("lists installed modules, leaving out host-disabled ones", () => {
		act(() => setClassicyControlStripDisabledModules(["cp-beta"]));
		renderOpen();
		expect(optionLabels()).toEqual(["Alpha", "Gamma"]);
	});

	it("hides the selected module, and marks it hidden in the list", () => {
		renderOpen();
		const shown = screen.getByRole("checkbox", {
			name: "Show “Alpha” in the Control Strip",
		});
		act(() => shown.click());
		expect(strip()?.hiddenModules).toEqual(["cp-alpha"]);
		expect(optionLabels()).toContain("Alpha (Hidden)");
	});

	it("moves the selected module and restores the standard order", () => {
		renderOpen();
		act(() => screen.getByRole("option", { name: /Beta/ }).click());
		act(() => screen.getByRole("button", { name: "Move Left" }).click());
		expect(strip()?.moduleOrder).toEqual(["cp-beta", "cp-alpha", "cp-gamma"]);
		expect(optionLabels()).toEqual(["Beta", "Alpha", "Gamma"]);
		expect(screen.getByRole("button", { name: "Move Left" })).toBeDisabled();

		act(() =>
			screen.getByRole("button", { name: "Use Standard Order" }).click(),
		);
		expect(strip()?.moduleOrder).toEqual([]);
		expect(optionLabels()).toEqual(["Alpha", "Beta", "Gamma"]);
	});
});
