import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Minimal valid persisted-state shape that passes schema validation. */
function makeValidStoredState(
	overrides: Record<string, unknown> = {},
): Record<string, unknown> {
	return {
		System: {
			Manager: {
				Applications: { apps: {} },
				Desktop: {
					selectedIcons: [],
					contextMenu: [],
					showContextMenu: false,
					icons: [],
					systemMenu: [],
					appMenu: [],
					selectBox: { size: [0, 0], start: [0, 0], active: false },
				},
				Appearance: { activeTheme: { id: "default" }, availableThemes: [] },
				Sound: { volume: 100, labels: {}, disabled: [] },
				DateAndTime: {
					show: true,
					dateTime: new Date().toISOString(),
					timeZoneOffset: "0",
					militaryTime: false,
					displaySeconds: true,
					displayPeriod: true,
					displayDay: true,
					displayLongDay: false,
					flashSeparators: false,
				},
			},
		},
		...overrides,
	};
}

// ─── dispatch + useAppManager ─────────────────────────────────────────────────

describe("dispatch", () => {
	// Import fresh module after each test group so module-level side-effects
	// (startAppManagerPersistence auto-call) are contained.
	let dispatch: typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")["dispatch"];
	let useAppManager: typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")["useAppManager"];
	let stopAppManagerPersistence: typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")["stopAppManagerPersistence"];

	beforeEach(async () => {
		vi.resetModules();
		localStorage.clear();
		const mod = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		dispatch = mod.dispatch;
		useAppManager = mod.useAppManager;
		stopAppManagerPersistence = mod.stopAppManagerPersistence;
	});

	afterEach(() => {
		stopAppManagerPersistence();
		localStorage.clear();
	});

	it("ClassicyAppOpen adds the app to state with open=true", () => {
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: "Calculator.app", name: "Calculator", icon: "" },
		});
		const state = useAppManager.getState();
		const app = state.System.Manager.Applications.apps["Calculator.app"];
		expect(app).toBeDefined();
		expect(app.open).toBe(true);
		expect(app.id).toBe("Calculator.app");
		expect(app.name).toBe("Calculator");
	});

	it("ClassicyAppClose marks the app as closed", () => {
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: "Notes.app", name: "Notes", icon: "" },
		});
		dispatch({ type: "ClassicyAppClose", app: { id: "Notes.app" } });
		const state = useAppManager.getState();
		expect(state.System.Manager.Applications.apps["Notes.app"].open).toBe(false);
	});

	it("multiple dispatches accumulate correctly", () => {
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: "App1.app", name: "App One", icon: "" },
		});
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: "App2.app", name: "App Two", icon: "" },
		});
		dispatch({ type: "ClassicyAppClose", app: { id: "App1.app" } });

		const state = useAppManager.getState();
		expect(state.System.Manager.Applications.apps["App1.app"].open).toBe(false);
		expect(state.System.Manager.Applications.apps["App2.app"].open).toBe(true);
	});
});

// ─── Persistence lifecycle ────────────────────────────────────────────────────

describe("persistence lifecycle", () => {
	let dispatch: typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")["dispatch"];
	let startAppManagerPersistence: typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")["startAppManagerPersistence"];
	let stopAppManagerPersistence: typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")["stopAppManagerPersistence"];

	beforeEach(async () => {
		vi.useFakeTimers();
		vi.resetModules();
		localStorage.clear();
		const mod = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		dispatch = mod.dispatch;
		startAppManagerPersistence = mod.startAppManagerPersistence;
		stopAppManagerPersistence = mod.stopAppManagerPersistence;
	});

	afterEach(() => {
		stopAppManagerPersistence();
		localStorage.clear();
		vi.useRealTimers();
	});

	it("writes state to localStorage immediately on dispatch", () => {
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: "Test.app", name: "Test", icon: "" },
		});

		const raw = localStorage.getItem("classicyDesktopState");
		expect(raw).not.toBeNull();
		const parsed = JSON.parse(raw ?? "");
		expect(parsed.System.Manager.Applications.apps["Test.app"]).toBeDefined();
	});

	it("stopAppManagerPersistence prevents further writes", () => {
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: "Test.app", name: "Test", icon: "" },
		});

		// State is now persisted; stop and clear storage
		stopAppManagerPersistence();
		localStorage.clear();

		// Further dispatch should not reach localStorage
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: "Another.app", name: "Another", icon: "" },
		});

		expect(localStorage.getItem("classicyDesktopState")).toBeNull();
	});

	it("startAppManagerPersistence is idempotent — calling twice returns the same unsubscribe function", () => {
		const unsub1 = startAppManagerPersistence();
		const unsub2 = startAppManagerPersistence();
		expect(unsub1).toBe(unsub2);
	});
});

// ─── getInitialState (via dynamic import after pre-seeding localStorage) ──────

describe("getInitialState — localStorage behaviour (via module re-import)", () => {
	afterEach(async () => {
		// Tear down persistence from the freshly loaded module before resetting
		vi.resetModules();
		localStorage.clear();
		vi.useRealTimers();
	});

	it("uses DefaultAppManagerState when localStorage is empty", async () => {
		localStorage.clear();
		vi.resetModules();
		const { useAppManager, stopAppManagerPersistence } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		stopAppManagerPersistence();

		// The DefaultAppManagerState is from ClassicyAppManager; the store was
		// initialised from it, so Finder.app (seeded in default state) must exist.
		const state = useAppManager.getState();
		expect(state.System.Manager.Applications.apps["Finder.app"]).toBeDefined();
	});

	it("restores valid persisted state from localStorage", async () => {
		const stored = makeValidStoredState();
		// Add a sentinel app to distinguish from default state
		(
			stored.System as Record<string, unknown> & {
				Manager: { Applications: { apps: Record<string, unknown> } };
			}
		).Manager.Applications.apps["Persisted.app"] = {
			id: "Persisted.app",
			name: "Persisted",
			icon: "",
			windows: [],
			open: true,
		};
		localStorage.setItem("classicyDesktopState", JSON.stringify(stored));

		vi.resetModules();
		const { useAppManager, stopAppManagerPersistence } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		stopAppManagerPersistence();

		const state = useAppManager.getState();
		expect(state.System.Manager.Applications.apps["Persisted.app"]).toBeDefined();
	});

	it("falls back to DefaultAppManagerState and calls console.error for malformed JSON", async () => {
		localStorage.setItem("classicyDesktopState", "{not valid json{{");
		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		vi.resetModules();
		const { useAppManager, stopAppManagerPersistence } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		stopAppManagerPersistence();

		expect(errorSpy).toHaveBeenCalledWith(
			expect.stringContaining("Failed to parse persisted desktop state"),
			expect.anything(),
		);
		// Falls back: Finder.app (from DefaultAppManagerState) must exist
		const state = useAppManager.getState();
		expect(state.System.Manager.Applications.apps["Finder.app"]).toBeDefined();

		errorSpy.mockRestore();
	});

	it("falls back to DefaultAppManagerState and calls console.warn when System.Manager.Applications is missing", async () => {
		const badState = makeValidStoredState();
		delete (
			badState.System as Record<string, unknown> & {
				Manager: Record<string, unknown>;
			}
		).Manager.Applications;
		localStorage.setItem("classicyDesktopState", JSON.stringify(badState));
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		vi.resetModules();
		const { useAppManager, stopAppManagerPersistence } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		stopAppManagerPersistence();

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Persisted state schema mismatch"),
		);
		const state = useAppManager.getState();
		expect(state.System.Manager.Applications.apps["Finder.app"]).toBeDefined();

		warnSpy.mockRestore();
	});

	it("falls back to DefaultAppManagerState and calls console.warn when Appearance.activeTheme is missing", async () => {
		const badState = makeValidStoredState();
		delete (
			badState.System as Record<string, unknown> & {
				Manager: { Appearance: Record<string, unknown> };
			}
		).Manager.Appearance.activeTheme;
		localStorage.setItem("classicyDesktopState", JSON.stringify(badState));
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		vi.resetModules();
		const { useAppManager, stopAppManagerPersistence } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		stopAppManagerPersistence();

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Persisted state schema mismatch"),
		);
		const state = useAppManager.getState();
		expect(state.System.Manager.Applications.apps["Finder.app"]).toBeDefined();

		warnSpy.mockRestore();
	});

	it("falls back when System key is absent entirely", async () => {
		localStorage.setItem(
			"classicyDesktopState",
			JSON.stringify({ NotSystem: {} }),
		);
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

		vi.resetModules();
		const { stopAppManagerPersistence } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		stopAppManagerPersistence();

		expect(warnSpy).toHaveBeenCalledWith(
			expect.stringContaining("Persisted state schema mismatch"),
		);
		warnSpy.mockRestore();
	});
});
