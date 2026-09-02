import { act, cleanup, render, screen } from "@testing-library/react";
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

afterEach(() => {
	dispatch({ type: "ClassicyAppClose", app: { id: APP_ID } });
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
