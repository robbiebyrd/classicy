// Opening an application that is already running with no window open: Finder
// 8 sends it the reopen application Apple event, and "if no windows are open
// in the application, the action taken should be similar to what happens
// when the open application ('oapp') Apple event is received after the
// application is launched" (Apple Technote TN1102, "Mac OS 8",
// https://developer.apple.com/library/archive/technotes/tn/tn1102.html). Mac OS 8.1's
// SimpleText, observed on Infinite Mac (story 0226-a6f), opens a new untitled
// window. `openApp` counts the reopen; `ClassicyApp` calls its `onReopen`.
import { act } from "@testing-library/react";
import { produce } from "immer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { openApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import {
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	sanitizeStateForPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { markClassicyAppMounted } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";

const APP = { id: "Notes.app", name: "Notes", icon: "" };

const withNotes = (
	windows: Record<string, { closed: boolean; windowType?: string }>,
	open = true,
): ClassicyStore =>
	produce(DefaultAppManagerState, (draft) => {
		draft.System.Manager.Applications.apps[APP.id] = {
			...APP,
			open,
			data: {},
			windows: Object.fromEntries(
				Object.entries(windows).map(([id, w]) => [
					id,
					{
						id,
						closed: w.closed,
						size: [100, 100],
						position: [0, 0],
						minimumSize: [10, 10],
						...(w.windowType ? { windowType: w.windowType } : {}),
					},
				]),
			) as never,
		};
	});

// The reducer edits its draft in place, as the store's immer recipe lets it.
const reduce = (ds: ClassicyStore, action: Record<string, unknown>) =>
	classicyDesktopStateEventReducer(structuredClone(ds), action as never);
const reopened = (ds: ClassicyStore) =>
	ds.System.Manager.Applications.apps[APP.id].reopened;
const openNotes = (ds: ClassicyStore, extra: Record<string, unknown> = {}) =>
	reduce(ds, { type: "ClassicyAppOpen", app: APP, ...extra });

describe("openApp's reopen count (TN1102)", () => {
	it("counts a plain open of a running app with no window open", () => {
		let ds = openNotes(withNotes({ doc: { closed: true } }));
		expect(reopened(ds)).toBe(1);
		ds = openNotes(ds);
		expect(reopened(ds)).toBe(2);
	});

	it("counts nothing while any window is open, a palette included", () => {
		expect(reopened(openNotes(withNotes({ doc: { closed: false } })))).toBe(
			undefined,
		);
		expect(
			reopened(
				openNotes(
					withNotes({ tools: { closed: false, windowType: "utility" } }),
				),
			),
		).toBe(undefined);
	});

	it("counts nothing for a launch or a document open", () => {
		// A launch: the app was not running.
		expect(reopened(openNotes(withNotes({}, false)))).toBe(undefined);
		// A document open of the running app (as the apps' OpenFile cases
		// and Finder's routing call it).
		const ds = structuredClone(withNotes({}));
		openApp(ds, APP.id, APP.name, APP.icon, {
			document: "Macintosh HD:Plan.txt",
		});
		expect(reopened(ds)).toBe(undefined);
	});

	// Review M6: a second plain open while the app is still launching (its
	// windows not mounted yet) is part of the launch, not a reopen.
	it("counts nothing for a plain open while the app is still launching", () => {
		const release = markClassicyAppMounted(APP.id);
		try {
			const launched = openNotes(withNotes({}, false));
			expect(launched.System.Manager.Applications.apps[APP.id].launching).toBe(
				true,
			);
			expect(reopened(openNotes(launched))).toBe(undefined);
		} finally {
			release();
		}
	});

	// Review M5: the generic OpenFile queue's open of a document it cannot
	// name the window of (an app drawing its own windows under ids of its
	// own) is a plain open, but a document's: it counts no reopen.
	it("counts nothing for the generic queue's open of a document the app draws itself", () => {
		const PATH = "Macintosh HD:Plan.txt";
		const ds = produce(withNotes({}), (draft) => {
			draft.System.Manager.Applications.apps[APP.id].data = {
				openFiles: [PATH],
			};
		});
		const opened = reduce(ds, {
			type: "ClassicyAppNotesOpenFile",
			app: { id: APP.id },
			path: PATH,
		});
		expect(opened.System.Manager.Applications.apps[APP.id].open).toBe(true);
		expect(reopened(opened)).toBe(undefined);
	});

	it("is cleared by a quit and never saved", () => {
		const ds = openNotes(withNotes({}));
		expect(reopened(ds)).toBe(1);
		const saved = sanitizeStateForPersistence(ds);
		expect(saved.System.Manager.Applications.apps[APP.id].reopened).toBe(
			undefined,
		);
		const quit = reduce(ds, { type: "ClassicyAppClose", app: { id: APP.id } });
		expect(reopened(quit)).toBe(undefined);
	});
});

describe("ClassicyApp onReopen", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("is called once for each reopen while it is mounted, never for an older one", () => {
		// A count left from before the app mounted is not answered.
		useAppManager.setState(
			produce(withNotes({}), (draft) => {
				draft.System.Manager.Applications.apps[APP.id].reopened = 4;
			}),
			true,
		);
		const onReopen = vi.fn();
		render(<ClassicyApp {...APP} onReopen={onReopen} />);
		expect(onReopen).not.toHaveBeenCalled();

		act(() => {
			dispatch({ type: "ClassicyAppOpen", app: APP });
		});
		expect(onReopen).toHaveBeenCalledTimes(1);
		act(() => {
			dispatch({ type: "ClassicyAppOpen", app: APP });
		});
		expect(onReopen).toHaveBeenCalledTimes(2);
	});

	// Review C1: a quit clears the count, so the next run counts from 1
	// again; its first reopen is answered even though 1 was answered before.
	it("answers a reopen after a quit and a relaunch, the count started over", () => {
		useAppManager.setState(withNotes({}), true);
		const onReopen = vi.fn();
		render(<ClassicyApp {...APP} onReopen={onReopen} />);
		act(() => {
			dispatch({ type: "ClassicyAppOpen", app: APP });
		});
		expect(onReopen).toHaveBeenCalledTimes(1);
		expect(
			useAppManager.getState().System.Manager.Applications.apps[APP.id]
				.reopened,
		).toBe(1);
		act(() => {
			dispatch({ type: "ClassicyAppClose", app: { id: APP.id } });
		});
		// The relaunch: a launch, not a reopen.
		act(() => {
			dispatch({ type: "ClassicyAppOpen", app: APP });
		});
		expect(onReopen).toHaveBeenCalledTimes(1);
		// Opened again with no window: the new run's first reopen, count 1.
		act(() => {
			dispatch({ type: "ClassicyAppOpen", app: APP });
		});
		expect(
			useAppManager.getState().System.Manager.Applications.apps[APP.id]
				.reopened,
		).toBe(1);
		expect(onReopen).toHaveBeenCalledTimes(2);
	});
});
