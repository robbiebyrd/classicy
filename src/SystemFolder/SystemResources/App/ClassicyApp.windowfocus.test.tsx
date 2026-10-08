import { act, fireEvent, render, screen } from "@testing-library/react";
import { StrictMode, useState } from "react";
import { describe, expect, it } from "vitest";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

// Integration coverage for window ordering and focus succession, against the
// real (module-level) store. Each test uses its own app id so state left in
// the shared store by one test can't leak into the next.

let appCounter = 0;
const nextAppId = () => `FocusTest${++appCounter}.app`;

const windowsOf = (appId: string) =>
	useAppManager.getState().System.Manager.Applications.apps[appId]?.windows ??
	[];
const focusedWindowId = (appId: string) =>
	windowsOf(appId).find((w) => w.focused)?.id;
const windowRecord = (appId: string, windowId: string) =>
	windowsOf(appId).find((w) => w.id === windowId);

// Lets the deferred close a window schedules on unmount run.
const flushDeferredClose = () =>
	act(async () => {
		await new Promise((resolve) => setTimeout(resolve, 0));
	});

const TestApp = ({
	appId,
	focusBeforeMount = false,
}: {
	appId: string;
	focusBeforeMount?: boolean;
}) => {
	const [showDialog, setShowDialog] = useState(false);
	const desktopDispatch = useAppManagerDispatch();
	return (
		<ClassicyApp id={appId} name="Focus Test" icon="" defaultWindow="main">
			<ClassicyWindow id="main" appId={appId} title="Main">
				<button
					type="button"
					onClick={() => {
						setShowDialog(true);
						// The pattern that used to send a dialog behind its parent:
						// focusing a window in the same click that first renders it.
						if (focusBeforeMount) {
							desktopDispatch({
								type: "ClassicyWindowFocus",
								app: { id: appId },
								window: { id: "dialog" },
							});
						}
					}}
				>
					Show dialog
				</button>
			</ClassicyWindow>
			{showDialog && (
				<ClassicyWindow id="dialog" appId={appId} title="Dialog">
					<button type="button" onClick={() => setShowDialog(false)}>
						Cancel
					</button>
				</ClassicyWindow>
			)}
		</ClassicyApp>
	);
};

const renderApp = (
	appId: string,
	opts: { strict?: boolean; focusBeforeMount?: boolean } = {},
) => {
	act(() => {
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: appId, name: "Focus Test", icon: "" },
		});
	});
	const tree = (
		<ClassicyAppManagerProvider>
			<TestApp appId={appId} focusBeforeMount={opts.focusBeforeMount} />
		</ClassicyAppManagerProvider>
	);
	return render(opts.strict ? <StrictMode>{tree}</StrictMode> : tree);
};

describe("ClassicyApp window ordering and focus succession", () => {
	it("focuses a newly opened window, and hands focus back when it unmounts", async () => {
		const appId = nextAppId();
		renderApp(appId);
		expect(focusedWindowId(appId)).toBe("main");

		fireEvent.click(screen.getByText("Show dialog"));
		expect(focusedWindowId(appId)).toBe("dialog");

		// Dismissed by unmounting (no close box): the record is closed and the
		// most recently focused remaining window takes focus.
		fireEvent.click(screen.getByText("Cancel"));
		await flushDeferredClose();
		expect(windowRecord(appId, "dialog")?.closed).toBe(true);
		expect(focusedWindowId(appId)).toBe("main");
	});

	it("brings a reopened window back to the front", async () => {
		const appId = nextAppId();
		renderApp(appId);
		fireEvent.click(screen.getByText("Show dialog"));
		fireEvent.click(screen.getByText("Cancel"));
		await flushDeferredClose();
		expect(focusedWindowId(appId)).toBe("main");

		fireEvent.click(screen.getByText("Show dialog"));
		expect(windowRecord(appId, "dialog")?.closed).toBe(false);
		expect(focusedWindowId(appId)).toBe("dialog");
		const dialog = windowRecord(appId, "dialog");
		const main = windowRecord(appId, "main");
		expect(dialog?.zOrder ?? 0).toBeGreaterThanOrEqual(main?.zOrder ?? 0);
	});

	it("keeps a dialog on top when it is focused in the same click that mounts it", () => {
		const appId = nextAppId();
		renderApp(appId, { focusBeforeMount: true });
		fireEvent.click(screen.getByText("Show dialog"));
		expect(focusedWindowId(appId)).toBe("dialog");
	});

	it("does not close or refocus windows on StrictMode's phantom remount", async () => {
		const appId = nextAppId();
		renderApp(appId, { strict: true });
		fireEvent.click(screen.getByText("Show dialog"));
		await flushDeferredClose();
		expect(windowRecord(appId, "main")?.closed).toBe(false);
		expect(windowRecord(appId, "dialog")?.closed).toBe(false);
		expect(focusedWindowId(appId)).toBe("dialog");
	});
});
