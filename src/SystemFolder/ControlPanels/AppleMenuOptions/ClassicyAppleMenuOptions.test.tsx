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

	/** Type into a field: one change per keystroke, as a user does. */
	const typeInto = (id: string, text: string) => {
		const input = field(id) as HTMLInputElement;
		act(() => input.focus());
		for (let n = 1; n <= text.length; n += 1)
			fireEvent.change(input, { target: { value: text.slice(0, n) } });
	};
	const leave = (id: string) =>
		act(() => (field(id) as HTMLInputElement).blur());

	it("sets each count when the field is left: digits only, 999 stored as 99", () => {
		renderOpen();
		typeInto("AppleMenuOptions_documents", "4");
		expect(recent()?.counts.document).toBe(10);
		leave("AppleMenuOptions_documents");
		expect(recent()?.counts).toEqual({ application: 10, document: 4 });
		typeInto("AppleMenuOptions_applications", "999");
		leave("AppleMenuOptions_applications");
		expect(recent()?.counts.application).toBe(99);
		expect(field("AppleMenuOptions_applications")?.value).toBe("99");
		typeInto("AppleMenuOptions_applications", "0");
		fireEvent.keyDown(field("AppleMenuOptions_applications") as HTMLElement, {
			key: "Enter",
		});
		expect(recent()?.counts.application).toBe(0);
	});

	it("never forgets items while a count is typed digit by digit (review I1)", () => {
		useAppManager.setState((s) => {
			const next = structuredClone(s);
			next.System.Manager.Desktop.recentItems = {
				...next.System.Manager.Desktop.recentItems!,
				items: Array.from({ length: 10 }, (_, i) => ({
					kind: "document" as const,
					path: `Macintosh HD:Doc ${i}`,
					name: `Doc ${i}`,
					at: 100 - i,
				})),
			};
			return next;
		});
		renderOpen();
		// "10" becomes "15": the field passes through "1" on the way.
		typeInto("AppleMenuOptions_documents", "15");
		expect(recent()?.items).toHaveLength(10);
		leave("AppleMenuOptions_documents");
		expect(recent()?.counts.document).toBe(15);
		expect(recent()?.items).toHaveLength(10);
	});

	it("puts the stored count back in a field the user cleared (review M8)", () => {
		renderOpen();
		typeInto("AppleMenuOptions_documents", "");
		fireEvent.change(field("AppleMenuOptions_documents") as HTMLInputElement, {
			target: { value: "" },
		});
		expect(field("AppleMenuOptions_documents")?.value).toBe("");
		leave("AppleMenuOptions_documents");
		expect(recent()?.counts.document).toBe(10);
		expect(field("AppleMenuOptions_documents")?.value).toBe("10");
	});

	// Re-review N4: Return sets the count and leaves the keyboard focus in
	// the field (the field is drawn again with the stored count).
	it("keeps the keyboard focus in the field after Return", () => {
		renderOpen();
		typeInto("AppleMenuOptions_documents", "6");
		const before = field("AppleMenuOptions_documents");
		act(() => {
			fireEvent.keyDown(before as HTMLElement, { key: "Enter" });
		});
		expect(recent()?.counts.document).toBe(6);
		const after = field("AppleMenuOptions_documents");
		expect(after?.value).toBe("6");
		expect(document.activeElement).toBe(after);
		// Typing on goes into the field, and leaving it sets the count.
		typeInto("AppleMenuOptions_documents", "8");
		leave("AppleMenuOptions_documents");
		expect(recent()?.counts.document).toBe(8);
		expect(document.activeElement).not.toBe(
			field("AppleMenuOptions_documents"),
		);
	});

	it("sets a count still being typed when the panel closes", () => {
		const { unmount } = renderOpen();
		typeInto("AppleMenuOptions_documents", "7");
		unmount();
		expect(recent()?.counts.document).toBe(7);
	});
});
