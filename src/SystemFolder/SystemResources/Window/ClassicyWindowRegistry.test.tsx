import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook } from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_MAXIMIZE_LAYOUT,
	TEST_MAXIMIZE_PACKAGE_ID,
	TEST_MINIMIZE_LAYOUT,
	TEST_MINIMIZE_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import {
	type ClassicyWindowCommand,
	type ClassicyWindowEntry,
	type ClassicyWindowRegistration,
	getClassicyWindowEntries,
	getClassicyWindowEntry,
	registerClassicyWindow,
	runClassicyWindowCommand,
	subscribeClassicyWindowEntries,
	unregisterClassicyWindow,
	updateClassicyWindow,
	useClassicyWindowEntries,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal";

// Plan 0020-w98 §5, "Shared plumbing". The registry is module state; every
// registration a test makes is removed after it, and RTL's cleanup unmounts
// the rendered windows, which unregister themselves.

const mockPlayer = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => mockPlayer }),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn(), page: vi.fn() }),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
	() => ({}),
);

const entry = (
	appId: string,
	windowId: string,
	overrides: Partial<ClassicyWindowEntry> = {},
): ClassicyWindowEntry => ({
	appId,
	windowId,
	title: windowId,
	icon: "icon.png",
	modal: false,
	windowType: "document",
	closable: true,
	zoomable: true,
	collapsable: true,
	resizable: true,
	movable: true,
	geometry: () => undefined,
	run: () => true,
	...overrides,
});

const made: ClassicyWindowRegistration[] = [];
const register = (e: ClassicyWindowEntry) => {
	const registration = registerClassicyWindow(e);
	made.push(registration);
	return registration;
};

const ids = () =>
	getClassicyWindowEntries().map((e) => `${e.appId}/${e.windowId}`);

describe("the window registry", () => {
	afterEach(() => {
		for (const registration of made.splice(0))
			unregisterClassicyWindow(registration);
	});

	it("starts empty", () => {
		expect(getClassicyWindowEntries()).toEqual([]);
	});

	it("lists a registered window, as a frozen copy", () => {
		const given = entry("A.app", "main", { title: "Main" });
		register(given);
		const listed = getClassicyWindowEntries();
		expect(listed).toHaveLength(1);
		expect(listed[0]).toEqual(given);
		expect(listed[0]).not.toBe(given);
		expect(Object.isFrozen(listed)).toBe(true);
		expect(Object.isFrozen(listed[0])).toBe(true);
		expect(getClassicyWindowEntry("A.app", "main")).toBe(listed[0]);
		// A later change to the caller's object changes nothing.
		(given as { title: string }).title = "Changed";
		expect(getClassicyWindowEntry("A.app", "main")?.title).toBe("Main");
	});

	it("lists windows in the order they first registered", () => {
		register(entry("A.app", "one"));
		register(entry("B.app", "two"));
		register(entry("A.app", "three"));
		expect(ids()).toEqual(["A.app/one", "B.app/two", "A.app/three"]);
	});

	it("updates an entry in place, keeping its position", () => {
		const one = register(entry("A.app", "one"));
		register(entry("A.app", "two"));
		const before = getClassicyWindowEntries();
		expect(
			updateClassicyWindow(one, entry("A.app", "one", { title: "Renamed" })),
		).toBe(true);
		const after = getClassicyWindowEntries();
		expect(after).not.toBe(before);
		expect(ids()).toEqual(["A.app/one", "A.app/two"]);
		expect(after[0].title).toBe("Renamed");
		expect(after[1]).toBe(before[1]);
	});

	it("refuses an update that names another window", () => {
		const one = register(entry("A.app", "one"));
		const before = getClassicyWindowEntries();
		expect(updateClassicyWindow(one, entry("A.app", "other"))).toBe(false);
		expect(getClassicyWindowEntries()).toBe(before);
		expect(getClassicyWindowEntry("A.app", "other")).toBeUndefined();
	});

	it("unregisters a window", () => {
		const one = register(entry("A.app", "one"));
		register(entry("A.app", "two"));
		expect(unregisterClassicyWindow(one)).toBe(true);
		expect(ids()).toEqual(["A.app/two"]);
		expect(getClassicyWindowEntry("A.app", "one")).toBeUndefined();
	});

	it("removes nothing with a stale token", () => {
		// StrictMode: the first registration's cleanup has run, the remount
		// registered again, and a phantom cleanup arrives with the old token.
		const first = register(entry("A.app", "main"));
		expect(unregisterClassicyWindow(first)).toBe(true);
		const second = register(entry("A.app", "main", { title: "Again" }));
		const before = getClassicyWindowEntries();
		expect(unregisterClassicyWindow(first)).toBe(false);
		expect(updateClassicyWindow(first, entry("A.app", "main"))).toBe(false);
		expect(getClassicyWindowEntries()).toBe(before);
		expect(getClassicyWindowEntry("A.app", "main")?.title).toBe("Again");
		expect(unregisterClassicyWindow(second)).toBe(true);
		expect(getClassicyWindowEntries()).toEqual([]);
	});

	it("keeps a window listed while another registration of it remains", () => {
		// A replacement instance mounted before the one it replaces unmounts.
		register(entry("A.app", "before"));
		const older = register(entry("A.app", "main", { title: "Older" }));
		const newer = register(entry("A.app", "main", { title: "Newer" }));
		register(entry("A.app", "after"));
		expect(ids()).toEqual(["A.app/before", "A.app/main", "A.app/after"]);
		expect(getClassicyWindowEntry("A.app", "main")?.title).toBe("Newer");

		// The older one's update and removal change nothing listed.
		const listener = vi.fn();
		const unsubscribe = subscribeClassicyWindowEntries(listener);
		const before = getClassicyWindowEntries();
		expect(
			updateClassicyWindow(older, entry("A.app", "main", { title: "Old 2" })),
		).toBe(true);
		expect(unregisterClassicyWindow(older)).toBe(true);
		expect(getClassicyWindowEntries()).toBe(before);
		expect(listener).not.toHaveBeenCalled();

		// The newer one's removal does.
		expect(unregisterClassicyWindow(newer)).toBe(true);
		expect(ids()).toEqual(["A.app/before", "A.app/after"]);
		expect(listener).toHaveBeenCalledTimes(1);
		unsubscribe();
	});

	it("keeps the snapshot's identity between changes", () => {
		register(entry("A.app", "one"));
		const first = getClassicyWindowEntries();
		expect(getClassicyWindowEntries()).toBe(first);
		expect(getClassicyWindowEntries()).toBe(first);
		register(entry("A.app", "two"));
		expect(getClassicyWindowEntries()).not.toBe(first);
	});

	it("notifies each subscriber on a register, an update and an unregister", () => {
		const listener = vi.fn();
		const unsubscribe = subscribeClassicyWindowEntries(listener);
		const one = register(entry("A.app", "one"));
		expect(listener).toHaveBeenCalledTimes(1);
		updateClassicyWindow(one, entry("A.app", "one", { title: "New" }));
		expect(listener).toHaveBeenCalledTimes(2);
		unregisterClassicyWindow(one);
		expect(listener).toHaveBeenCalledTimes(3);
		unsubscribe();
		register(entry("A.app", "two"));
		expect(listener).toHaveBeenCalledTimes(3);
	});

	it("re-renders a useClassicyWindowEntries reader on a change", () => {
		const { result } = renderHook(() => useClassicyWindowEntries());
		expect(result.current).toEqual([]);
		act(() => {
			register(entry("A.app", "one", { title: "One" }));
		});
		expect(result.current.map((e) => e.title)).toEqual(["One"]);
	});

	it("runs a command on the registered window", () => {
		const run = vi.fn((command: ClassicyWindowCommand) =>
			Boolean(command.type === "minimize"),
		);
		register(entry("A.app", "one", { run }));
		expect(runClassicyWindowCommand("A.app", "one", { type: "minimize" })).toBe(
			true,
		);
		expect(
			runClassicyWindowCommand("A.app", "one", {
				type: "systemMenu",
				at: [4, 5],
			}),
		).toBe(false);
		expect(run).toHaveBeenNthCalledWith(1, { type: "minimize" });
		expect(run).toHaveBeenNthCalledWith(2, { type: "systemMenu", at: [4, 5] });
	});

	it("reports false for a window that is not registered", () => {
		expect(runClassicyWindowCommand("A.app", "none", { type: "close" })).toBe(
			false,
		);
	});
});

const APP = "TestApp.app";

function seedApp() {
	const app: ClassicyStoreSystemApp = {
		id: APP,
		name: "Test",
		icon: "",
		open: true,
		focused: true,
		windows: {},
	};
	useAppManager.setState(DefaultAppManagerState, true);
	useAppManager.setState((state) => ({
		...state,
		System: {
			...state.System,
			Manager: {
				...state.System.Manager,
				Applications: {
					...state.System.Manager.Applications,
					apps: { ...state.System.Manager.Applications.apps, [APP]: app },
				},
			},
		},
	}));
}

const record = (id: string) =>
	getAppWindow(
		useAppManager.getState().System.Manager.Applications.apps[APP],
		id,
	);

const run = (id: string, command: ClassicyWindowCommand) => {
	let result = false;
	act(() => {
		result = runClassicyWindowCommand(APP, id, command);
	});
	return result;
};

describe("ClassicyWindow in the window registry", () => {
	beforeEach(() => {
		mockPlayer.mockClear();
		seedApp();
	});

	it("registers what it publishes, and unregisters on unmount", () => {
		const { unmount } = render(
			<>
				<ClassicyWindow
					id="doc"
					appId={APP}
					title="Document"
					icon="doc.png"
					zoomable={false}
				>
					<p>doc</p>
				</ClassicyWindow>
				<ClassicyWindow
					id="palette"
					appId={APP}
					title="Tools"
					windowType="utility"
					resizable={false}
				>
					<p>tools</p>
				</ClassicyWindow>
				<ClassicyWindow
					id="alert"
					appId={APP}
					modal
					type="error"
					closable={false}
					collapsable={false}
				>
					<p>alert</p>
				</ClassicyWindow>
			</>,
		);
		const listed = getClassicyWindowEntries();
		expect(listed.map((e) => e.windowId)).toEqual(["doc", "palette", "alert"]);
		const [doc, palette, alert] = listed;
		expect(doc).toMatchObject({
			appId: APP,
			windowId: "doc",
			title: "Document",
			icon: "doc.png",
			modal: false,
			windowType: "document",
			closable: true,
			zoomable: false,
			collapsable: true,
			resizable: true,
			movable: true,
		});
		expect(palette).toMatchObject({
			title: "Tools",
			windowType: "utility",
			resizable: false,
			movable: true,
		});
		// A fixed alert does not move; a modal registers like any window.
		expect(alert).toMatchObject({
			title: "",
			modal: true,
			closable: false,
			collapsable: false,
			movable: false,
		});
		// The resolved icon: the generic file icon when none is given.
		expect(alert.icon).not.toBe("");
		unmount();
		expect(getClassicyWindowEntries()).toEqual([]);
	});

	it("updates its entry in place when a published value changes", () => {
		const view = (title: string) => (
			<>
				<ClassicyWindow id="one" appId={APP} title={title}>
					<p>one</p>
				</ClassicyWindow>
				<ClassicyWindow id="two" appId={APP} title="Two">
					<p>two</p>
				</ClassicyWindow>
			</>
		);
		const { rerender } = render(view("One"));
		const first = getClassicyWindowEntries();
		// A render that publishes nothing new keeps the snapshot.
		rerender(view("One"));
		expect(getClassicyWindowEntries()).toBe(first);
		rerender(view("Renamed"));
		const renamed = getClassicyWindowEntries();
		expect(renamed).not.toBe(first);
		expect(renamed.map((e) => e.title)).toEqual(["Renamed", "Two"]);
		expect(renamed[1]).toBe(first[1]);
	});

	it("registers anew under a new id", () => {
		const { rerender } = render(
			<ClassicyWindow id="old" appId={APP} title="Window">
				<p>w</p>
			</ClassicyWindow>,
		);
		rerender(
			<ClassicyWindow id="new" appId={APP} title="Window">
				<p>w</p>
			</ClassicyWindow>,
		);
		expect(getClassicyWindowEntries().map((e) => e.windowId)).toEqual(["new"]);
	});

	it("is listed once under StrictMode, and its commands reach it", () => {
		const { unmount } = render(
			<StrictMode>
				<ClassicyWindow id="main" appId={APP} title="Main">
					<p>main</p>
				</ClassicyWindow>
			</StrictMode>,
		);
		expect(getClassicyWindowEntries().map((e) => e.windowId)).toEqual(["main"]);
		expect(run("main", { type: "minimize" })).toBe(true);
		expect(record("main")?.collapsed).toBe(true);
		unmount();
		expect(getClassicyWindowEntries()).toEqual([]);
	});

	it("activates through its own focus path", () => {
		render(
			<>
				<ClassicyWindow id="first" appId={APP} title="First">
					<p>first</p>
				</ClassicyWindow>
				<ClassicyWindow id="second" appId={APP} title="Second">
					<p>second</p>
				</ClassicyWindow>
			</>,
		);
		// The window that opened last took focus.
		expect(record("second")?.focused).toBe(true);
		expect(run("first", { type: "activate" })).toBe(true);
		expect(record("first")?.focused).toBe(true);
		expect(record("second")?.focused).toBe(false);
	});

	it("minimizes through its collapse box's path", () => {
		render(
			<>
				<ClassicyWindow id="main" appId={APP} title="Main">
					<p>main</p>
				</ClassicyWindow>
				<ClassicyWindow
					id="fixed"
					appId={APP}
					title="Fixed"
					collapsable={false}
				>
					<p>fixed</p>
				</ClassicyWindow>
			</>,
		);
		expect(run("main", { type: "minimize" })).toBe(true);
		expect(record("main")?.collapsed).toBe(true);
		// Already collapsed: nothing to do.
		expect(run("main", { type: "minimize" })).toBe(false);
		// No collapse box: it cannot.
		expect(run("fixed", { type: "minimize" })).toBe(false);
		expect(record("fixed")?.collapsed).toBe(false);
	});

	it("maximizes through its zoom box's path, and restores", () => {
		render(
			<>
				<ClassicyWindow id="main" appId={APP} title="Main">
					<p>main</p>
				</ClassicyWindow>
				<ClassicyWindow id="fixed" appId={APP} title="Fixed" zoomable={false}>
					<p>fixed</p>
				</ClassicyWindow>
				<ClassicyWindow id="dialog" appId={APP} title="Dialog" modal>
					<p>dialog</p>
				</ClassicyWindow>
			</>,
		);
		// Neither collapsed nor zoomed: nothing to restore.
		expect(run("main", { type: "restore" })).toBe(false);
		expect(run("main", { type: "maximize" })).toBe(true);
		expect(record("main")?.zoomed).toBe(true);
		expect(record("main")?.focused).toBe(true);
		// Already zoomed.
		expect(run("main", { type: "maximize" })).toBe(false);
		expect(run("main", { type: "restore" })).toBe(true);
		expect(record("main")?.zoomed).toBe(false);
		// No zoom box, and a modal draws none.
		expect(run("fixed", { type: "maximize" })).toBe(false);
		expect(run("dialog", { type: "maximize" })).toBe(false);
		expect(record("fixed")?.zoomed).toBe(false);
		expect(record("dialog")?.zoomed).toBe(false);
	});

	it("restores a collapsed window and activates it", () => {
		render(
			<>
				<ClassicyWindow id="main" appId={APP} title="Main">
					<p>main</p>
				</ClassicyWindow>
				<ClassicyWindow id="other" appId={APP} title="Other">
					<p>other</p>
				</ClassicyWindow>
			</>,
		);
		expect(run("main", { type: "minimize" })).toBe(true);
		expect(record("other")?.focused).toBe(true);
		expect(run("main", { type: "restore" })).toBe(true);
		expect(record("main")?.collapsed).toBe(false);
		expect(record("main")?.focused).toBe(true);
	});

	it("closes through its close box's path, the veto included", () => {
		const onBeforeClose = vi.fn(() => false);
		render(
			<>
				<ClassicyWindow id="main" appId={APP} title="Main">
					<p>main</p>
				</ClassicyWindow>
				<ClassicyWindow
					id="guarded"
					appId={APP}
					title="Guarded"
					onBeforeClose={onBeforeClose}
				>
					<p>guarded</p>
				</ClassicyWindow>
				<ClassicyWindow id="fixed" appId={APP} title="Fixed" closable={false}>
					<p>fixed</p>
				</ClassicyWindow>
			</>,
		);
		expect(run("main", { type: "close" })).toBe(true);
		expect(record("main")?.closed).toBe(true);
		// The close path ran; its veto kept the window open.
		expect(run("guarded", { type: "close" })).toBe(true);
		expect(onBeforeClose).toHaveBeenCalledWith("guarded");
		expect(record("guarded")?.closed).toBe(false);
		// No close box: it cannot.
		expect(run("fixed", { type: "close" })).toBe(false);
		expect(record("fixed")?.closed).toBe(false);
	});

	// Its menu itself, under a layout that has one:
	// ClassicyWindow.systemMenu.test.tsx.
	it("reports false for systemMenu under a layout without the window pop-up menu", () => {
		render(
			<ClassicyWindow id="main" appId={APP} title="Main">
				<p>main</p>
			</ClassicyWindow>,
		);
		expect(run("main", { type: "systemMenu" })).toBe(false);
		expect(run("main", { type: "systemMenu", at: [10, 20] })).toBe(false);
	});

	// The keyboard modes themselves: ClassicyWindow.keyboardMoveSize.test.tsx.
	it("starts its keyboard Move and Size modes", () => {
		render(
			<ClassicyWindow id="main" appId={APP} title="Main">
				<p>main</p>
			</ClassicyWindow>,
		);
		expect(run("main", { type: "move" })).toBe(true);
		expect(record("main")?.moving).toBe(true);
		act(() => {
			document.body.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
			);
		});
		expect(record("main")?.moving).toBe(false);
		expect(run("main", { type: "size" })).toBe(true);
		expect(record("main")?.resizing).toBe(true);
		act(() => {
			document.body.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
			);
		});
		expect(record("main")?.resizing).toBe(false);
	});

	// Plan 0020-w98 E1: the taskbar's Cascade and Tile read each window's
	// geometry and place it through its own path.
	it("reports its geometry while it is drawn, and none while it is shaded or closed", () => {
		render(
			<ClassicyWindow
				id="main"
				appId={APP}
				title="Main"
				initialSize={[300, 200]}
				initialPosition={[40, 50]}
				minimumSize={[120, 80]}
			>
				<p>main</p>
			</ClassicyWindow>,
		);
		const geometry = () => getClassicyWindowEntry(APP, "main")?.geometry();
		expect(geometry()).toEqual({
			rect: { position: [40, 50], size: [300, 200] },
			restoreRect: { position: [40, 50], size: [300, 200] },
			maximized: false,
			// jsdom lays out no frame.
			chrome: [0, 0],
			minimumSize: [120, 80],
		});
		expect(run("main", { type: "minimize" })).toBe(true);
		expect(geometry()).toBeUndefined();
		expect(run("main", { type: "restore" })).toBe(true);
		expect(geometry()).toBeDefined();
		expect(run("main", { type: "close" })).toBe(true);
		expect(geometry()).toBeUndefined();
	});

	it("places itself at the rect given, sized when it is resizable, never activated", () => {
		render(
			<>
				<ClassicyWindow
					id="main"
					appId={APP}
					title="Main"
					initialSize={[300, 200]}
					initialPosition={[40, 50]}
					minimumSize={[120, 80]}
				>
					<p>main</p>
				</ClassicyWindow>
				<ClassicyWindow
					id="fixed"
					appId={APP}
					title="Fixed"
					resizable={false}
					initialSize={[200, 100]}
					initialPosition={[10, 20]}
				>
					<p>fixed</p>
				</ClassicyWindow>
			</>,
		);
		const focusedBefore = record("main")?.focused;
		expect(
			run("main", { type: "place", position: [5.4, 30], size: [250, 150] }),
		).toBe(true);
		expect(record("main")).toMatchObject({
			position: [5, 30],
			size: [250, 150],
			zoomed: false,
		});
		expect(record("main")?.focused).toBe(focusedBefore);
		// Never below its minimum.
		expect(
			run("main", { type: "place", position: [0, 0], size: [50, 40] }),
		).toBe(true);
		expect(record("main")?.size).toEqual([120, 80]);
		// A window that does not size only moves.
		expect(
			run("fixed", { type: "place", position: [70, 80], size: [400, 400] }),
		).toBe(true);
		expect(record("fixed")).toMatchObject({
			position: [70, 80],
			size: [200, 100],
		});
		mockPlayer.mockClear();
		expect(mockPlayer).not.toHaveBeenCalled();
		// Not drawn: refused.
		expect(run("main", { type: "minimize" })).toBe(true);
		expect(run("main", { type: "place", position: [1, 1] })).toBe(false);
		expect(record("main")?.position).toEqual([0, 0]);
	});

	it("refuses to place a fixed alert", () => {
		render(
			<ClassicyWindow id="alert" appId={APP} title="" modal type="error">
				<p>alert</p>
			</ClassicyWindow>,
		);
		const before = record("alert")?.position;
		expect(run("alert", { type: "place", position: [1, 2] })).toBe(false);
		expect(record("alert")?.position).toEqual(before);
	});

	it("carries out nothing while it is closed", () => {
		render(
			<ClassicyWindow id="main" appId={APP} title="Main">
				<p>main</p>
			</ClassicyWindow>,
		);
		expect(run("main", { type: "close" })).toBe(true);
		expect(record("main")?.closed).toBe(true);
		// Still mounted, so still registered: it draws nothing to act on.
		expect(getClassicyWindowEntry(APP, "main")).toBeDefined();
		for (const type of [
			"activate",
			"minimize",
			"restore",
			"maximize",
			"close",
		] as const)
			expect(run("main", { type })).toBe(false);
		expect(record("main")).toMatchObject({
			closed: true,
			collapsed: false,
			zoomed: false,
		});
	});
});

// Plan 0020-w98 §5, "Minimize": under `window.collapse: "minimize"` a modal
// or palette has no Minimize box, and a minimized window comes back as it
// was, maximized included.
describe('ClassicyWindow\'s commands under window.collapse: "minimize"', () => {
	beforeEach(() => {
		mockPlayer.mockClear();
		seedApp();
		registerTestTaskbarPackage(TEST_MINIMIZE_LAYOUT, TEST_MINIMIZE_PACKAGE_ID);
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: TEST_MINIMIZE_PACKAGE_ID,
			}),
		);
	});

	afterEach(() => {
		unregisterClassicyAppearancePackage(TEST_MINIMIZE_PACKAGE_ID);
	});

	it("publishes no collapse box for a modal or palette, and refuses to minimize either", () => {
		render(
			<>
				<ClassicyWindow id="main" appId={APP} title="Main">
					<p>main</p>
				</ClassicyWindow>
				<ClassicyWindow
					id="tools"
					appId={APP}
					title="Tools"
					windowType="utility"
				>
					<p>tools</p>
				</ClassicyWindow>
				<ClassicyWindow id="dialog" appId={APP} title="Dialog" modal>
					<p>dialog</p>
				</ClassicyWindow>
			</>,
		);
		expect(getClassicyWindowEntry(APP, "main")?.collapsable).toBe(true);
		expect(getClassicyWindowEntry(APP, "tools")?.collapsable).toBe(false);
		expect(getClassicyWindowEntry(APP, "dialog")?.collapsable).toBe(false);
		expect(run("tools", { type: "minimize" })).toBe(false);
		expect(run("dialog", { type: "minimize" })).toBe(false);
		expect(record("tools")?.collapsed).toBe(false);
		expect(record("dialog")?.collapsed).toBe(false);
	});

	it("restores a minimized maximized window maximized", () => {
		render(
			<ClassicyWindow id="main" appId={APP} title="Main">
				<p>main</p>
			</ClassicyWindow>,
		);
		expect(run("main", { type: "maximize" })).toBe(true);
		expect(run("main", { type: "minimize" })).toBe(true);
		expect(record("main")).toMatchObject({ collapsed: true, zoomed: true });
		expect(run("main", { type: "restore" })).toBe(true);
		expect(record("main")).toMatchObject({
			collapsed: false,
			zoomed: true,
			focused: true,
		});
	});

	// Windows clears WS_MAXIMIZE as it minimizes, so SC_MAXIMIZE is
	// available on a window minimized while maximized, and shows it maximized.
	it("brings a minimized maximized window back maximized on maximize, and refuses one zoomed on the screen", () => {
		render(
			<ClassicyWindow id="main" appId={APP} title="Main">
				<p>main</p>
			</ClassicyWindow>,
		);
		expect(run("main", { type: "maximize" })).toBe(true);
		expect(run("main", { type: "maximize" })).toBe(false);
		expect(run("main", { type: "minimize" })).toBe(true);
		expect(run("main", { type: "maximize" })).toBe(true);
		expect(record("main")).toMatchObject({
			collapsed: false,
			zoomed: true,
			focused: true,
		});
	});

	it("restores nothing for a palette whose stored collapse is ignored", () => {
		render(
			<ClassicyWindow id="tools" appId={APP} title="Tools" windowType="utility">
				<p>tools</p>
			</ClassicyWindow>,
		);
		act(() =>
			useAppManager.setState((state) => {
				const app = state.System.Manager.Applications.apps[APP];
				const tools = getAppWindow(app, "tools");
				if (!tools) throw new Error("tools");
				return {
					...state,
					System: {
						...state.System,
						Manager: {
							...state.System.Manager,
							Applications: {
								...state.System.Manager.Applications,
								apps: {
									...state.System.Manager.Applications.apps,
									[APP]: {
										...app,
										windows: {
											...app.windows,
											tools: { ...tools, collapsed: true },
										},
									},
								},
							},
						},
					},
				};
			}),
		);
		expect(run("tools", { type: "restore" })).toBe(false);
		expect(record("tools")?.collapsed).toBe(true);
	});
});

// Plan 0020-w98 §5, "Maximize and restore": under `window.zoom: "maximize"`
// the `maximize` and `restore` commands take the zoom box's path, which
// maximizes to the work area; a palette or a dialog has no Maximize button.
describe('ClassicyWindow\'s commands under window.zoom: "maximize"', () => {
	beforeEach(() => {
		mockPlayer.mockClear();
		seedApp();
		registerTestTaskbarPackage(TEST_MAXIMIZE_LAYOUT, TEST_MAXIMIZE_PACKAGE_ID);
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: TEST_MAXIMIZE_PACKAGE_ID,
			}),
		);
	});

	afterEach(() => {
		unregisterClassicyAppearancePackage(TEST_MAXIMIZE_PACKAGE_ID);
	});

	it("maximizes a primary window, storing the rect it restores", () => {
		render(
			<ClassicyWindow
				id="main"
				appId={APP}
				title="Main"
				initialSize={[400, 300]}
				initialPosition={[50, 60]}
			>
				<p>main</p>
			</ClassicyWindow>,
		);
		expect(getClassicyWindowEntry(APP, "main")?.zoomable).toBe(true);
		expect(run("main", { type: "maximize" })).toBe(true);
		expect(record("main")).toMatchObject({
			zoomed: true,
			focused: true,
			size: [window.innerWidth, expect.any(Number)],
			restoreRect: { position: [50, 60], size: [400, 300] },
		});
		expect(run("main", { type: "restore" })).toBe(true);
		expect(record("main")).toMatchObject({
			zoomed: false,
			position: [50, 60],
			size: [400, 300],
		});
		expect(record("main")?.restoreRect).toBeUndefined();
	});

	it("publishes no zoom box for a palette or a dialog, and refuses to maximize either", () => {
		render(
			<>
				<ClassicyWindow
					id="tools"
					appId={APP}
					title="Tools"
					windowType="utility"
				>
					<p>tools</p>
				</ClassicyWindow>
				<ClassicyWindow id="dialog" appId={APP} title="Dialog" modal>
					<p>dialog</p>
				</ClassicyWindow>
			</>,
		);
		expect(getClassicyWindowEntry(APP, "tools")?.zoomable).toBe(false);
		expect(getClassicyWindowEntry(APP, "dialog")?.zoomable).toBe(false);
		expect(run("tools", { type: "maximize" })).toBe(false);
		expect(run("dialog", { type: "maximize" })).toBe(false);
		expect(record("tools")?.zoomed).toBe(false);
		expect(record("dialog")?.zoomed).toBe(false);
	});

	// Plan 0020-w98 E1: Cascade and Tile restore a maximized window before
	// they place it (CascadeWindows' `ShowWindow(SW_RESTORE)`), and their Undo
	// maximizes it again around the rect it had (SetWindowPlacement with
	// SW_SHOWMAXIMIZED).
	it("reports a maximized window's rect to restore, and restores it to the rect it is placed at", () => {
		render(
			<ClassicyWindow
				id="main"
				appId={APP}
				title="Main"
				initialSize={[400, 300]}
				initialPosition={[50, 60]}
			>
				<p>main</p>
			</ClassicyWindow>,
		);
		expect(run("main", { type: "maximize" })).toBe(true);
		expect(getClassicyWindowEntry(APP, "main")?.geometry()).toMatchObject({
			maximized: true,
			restoreRect: { position: [50, 60], size: [400, 300] },
		});
		expect(
			run("main", { type: "place", position: [10, 20], size: [320, 240] }),
		).toBe(true);
		expect(record("main")).toMatchObject({
			zoomed: false,
			position: [10, 20],
			size: [320, 240],
		});
		expect(record("main")?.restoreRect).toBeUndefined();
		// No zoom sound for an arrangement.
		expect(mockPlayer).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: "ClassicySoundPlay" }),
		);
	});

	it("maximizes around the rect given with maximized: true", () => {
		render(
			<ClassicyWindow
				id="main"
				appId={APP}
				title="Main"
				initialSize={[400, 300]}
				initialPosition={[50, 60]}
			>
				<p>main</p>
			</ClassicyWindow>,
		);
		expect(
			run("main", {
				type: "place",
				position: [30, 40],
				size: [320, 240],
				maximized: true,
			}),
		).toBe(true);
		expect(record("main")).toMatchObject({
			zoomed: true,
			size: [window.innerWidth, expect.any(Number)],
			restoreRect: { position: [30, 40], size: [320, 240] },
		});
		expect(run("main", { type: "restore" })).toBe(true);
		expect(record("main")).toMatchObject({
			zoomed: false,
			position: [30, 40],
			size: [320, 240],
		});
	});
});
