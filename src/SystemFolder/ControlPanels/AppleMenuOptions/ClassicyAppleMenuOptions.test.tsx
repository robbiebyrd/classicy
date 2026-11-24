// The Apple Menu Options control panel (story 0226-a6f): Mac OS 8.1's
// "Recent Items" group, observed on Infinite Mac: "Remember recently used
// items" (on), Documents 10, Applications 10; off dims and empties the
// fields; a count is 0 to 99.
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ClassicyAppleMenuOptions } from "@/SystemFolder/ControlPanels/AppleMenuOptions/ClassicyAppleMenuOptions";
import { APPLE_MENU_OPTIONS_APP_ID } from "@/SystemFolder/ControlPanels/AppleMenuOptions/ClassicyAppleMenuOptionsManifest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppManifest } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyControlPanels } from "@/SystemFolder/ControlPanels/ClassicyControlPanels";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const recent = () =>
	useAppManager.getState().System.Manager.Desktop.recentItems;

const field = (id: string) =>
	document.getElementById(id) as HTMLInputElement | null;

const renderOpen = () => {
	dispatch({
		type: "ClassicyAppOpen",
		app: {
			id: APPLE_MENU_OPTIONS_APP_ID,
			name: "Apple Menu Options",
			icon: "",
		},
	});
	return render(<ClassicyAppleMenuOptions />);
};

beforeEach(() => {
	useAppManager.setState(structuredClone(DefaultAppManagerState), true);
});

afterEach(() => {
	cleanup();
});

describe("ClassicyAppleMenuOptions", () => {
	it("is a described control panel, listed with the others", () => {
		expect(getAppManifest(APPLE_MENU_OPTIONS_APP_ID)?.description).toMatch(
			/Recent Applications/,
		);
		expect(getAppManifest(APPLE_MENU_OPTIONS_APP_ID)?.controlPanel).toBe(true);
		render(<ClassicyControlPanels />);
		expect(
			useAppManager.getState().System.Manager.Applications.apps[
				APPLE_MENU_OPTIONS_APP_ID
			]?.name,
		).toBe("Apple Menu Options");
	});

	it("shows the Mac's defaults: on, 10 documents, 10 applications", () => {
		renderOpen();
		expect(screen.getByText("Recent Items")).toBeInTheDocument();
		expect(
			screen.getByRole("checkbox", { name: "Remember recently used items" }),
		).toBeChecked();
		expect(field("AppleMenuOptions_documents")?.value).toBe("10");
		expect(field("AppleMenuOptions_applications")?.value).toBe("10");
		expect(screen.getByText("Documents:")).toBeInTheDocument();
		expect(screen.getByText("Applications:")).toBeInTheDocument();
	});

	it("carries the control-panel File menu and an Edit menu for its fields", () => {
		renderOpen();
		const window = getAppWindow(
			useAppManager.getState().System.Manager.Applications.apps[
				APPLE_MENU_OPTIONS_APP_ID
			],
			"AppleMenuOptions_1",
		);
		const menus = window?.menuBar as ClassicyMenuItem[];
		expect(menus.map((m) => m.title)).toEqual(["File", "Edit"]);
		expect(menus[0].menuChildren?.map((c) => c.title)).toEqual([
			"About Apple Menu Options",
			"Close Window",
			undefined,
			"Quit",
		]);
	});

	it("turns tracking off (fields dimmed and empty, items forgotten) and on", () => {
		act(() =>
			dispatch({
				type: "ClassicyDesktopRecentItemsSetCount",
				kind: "document",
				count: 3,
			}),
		);
		useAppManager.setState((s) => {
			const next = structuredClone(s);
			next.System.Manager.Desktop.recentItems = {
				...next.System.Manager.Desktop.recentItems!,
				items: [{ kind: "document", path: "Macintosh HD:A", name: "A", at: 1 }],
			};
			return next;
		});
		renderOpen();
		const box = screen.getByRole("checkbox", {
			name: "Remember recently used items",
		});
		fireEvent.click(box);
		expect(recent()).toMatchObject({ enabled: false, items: [] });
		expect(field("AppleMenuOptions_documents")).toBeDisabled();
		expect(field("AppleMenuOptions_documents")?.value).toBe("");
		expect(field("AppleMenuOptions_applications")).toBeDisabled();
		expect(screen.getByText("Documents:").closest(".disabled")).not.toBeNull();
		fireEvent.click(box);
		expect(recent()?.enabled).toBe(true);
		expect(field("AppleMenuOptions_documents")).not.toBeDisabled();
		expect(field("AppleMenuOptions_documents")?.value).toBe("3");
	});

	it("sets each count from its field: digits only, 999 stored as 99", () => {
		renderOpen();
		fireEvent.change(field("AppleMenuOptions_documents") as HTMLInputElement, {
			target: { value: "4" },
		});
		expect(recent()?.counts).toEqual({ application: 10, document: 4 });
		fireEvent.change(
			field("AppleMenuOptions_applications") as HTMLInputElement,
			{ target: { value: "999" } },
		);
		expect(recent()?.counts.application).toBe(99);
		fireEvent.change(
			field("AppleMenuOptions_applications") as HTMLInputElement,
			{ target: { value: "0" } },
		);
		expect(recent()?.counts.application).toBe(0);
		fireEvent.change(
			field("AppleMenuOptions_applications") as HTMLInputElement,
			{ target: { value: "" } },
		);
		expect(recent()?.counts.application).toBe(0);
	});
});
