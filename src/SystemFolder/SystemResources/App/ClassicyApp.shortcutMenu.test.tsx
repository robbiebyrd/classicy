import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { runMenuItemAction } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import { ClassicyApp } from "./ClassicyApp";

vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow", () => ({
	ClassicyWindow: (): null => null,
}));

// The remaining chapters' audit's 5.23 (WIG Ch.5 "Default Operations and
// Shortcut Techniques", p.45): under Explorer's commands
// (`layout.finder.commands` "windows") an app's desktop icon's menu leads
// with Open, its default, which launches the app as a double-click does;
// Mac OS 8's Finder sets no default item (HIGOS8 "Contextual Menus",
// pp.94-95), and its app icons store no menu.

const APP = { id: "Notes.app", name: "Notes", icon: "notes.png" };
const appIcon = () =>
	useAppManager
		.getState()
		.System.Manager.Desktop.icons.find((i) => i.appId === APP.id);

beforeEach(() => {
	localStorage.clear();
	useAppManager.setState(DefaultAppManagerState, true);
});
afterEach(cleanup);

describe("ClassicyApp's desktop icon menu", () => {
	it("stores none under Mac OS 8's commands", async () => {
		render(<ClassicyApp {...APP} />);
		await waitFor(() => expect(appIcon()).toBeDefined());
		expect(appIcon()?.contextMenu).toBeUndefined();
	});

	it("leads with Open, the default, under Explorer's commands, and takes it away after", async () => {
		const restore = activateTestWindowsKeysPackage({
			menu: { keys: "windows", accessKeys: "auto" },
		});
		let restored = false;
		try {
			const view = render(<ClassicyApp {...APP} />);
			await waitFor(() =>
				expect(appIcon()?.contextMenu?.[0]).toMatchObject({
					title: "Open",
					accessKey: "o",
					isDefault: true,
					event: "ClassicyDesktopIconOpen",
					eventData: { iconId: `${APP.id}.shortcut`, app: APP },
				}),
			);
			const open = appIcon()?.contextMenu?.[0];
			if (open) runMenuItemAction(open, dispatch);
			expect(
				useAppManager.getState().System.Manager.Applications.apps[APP.id]?.open,
			).toBe(true);
			restore();
			restored = true;
			view.rerender(<ClassicyApp {...APP} />);
			await waitFor(() => expect(appIcon()?.contextMenu).toBeUndefined());
		} finally {
			if (!restored) restore();
		}
	});
});
