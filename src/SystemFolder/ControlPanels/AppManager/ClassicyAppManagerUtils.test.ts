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
					icons: [],
					systemMenu: [],
					appMenu: [],
					selectBox: { size: [0, 0], start: [0, 0], active: false },
					disableBalloonHelp: false,
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
		expect(state.System.Manager.Applications.apps["Notes.app"].open).toBe(
			false,
		);
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
	let useAppManager: typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")["useAppManager"];
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
		useAppManager = mod.useAppManager;
		startAppManagerPersistence = mod.startAppManagerPersistence;
		stopAppManagerPersistence = mod.stopAppManagerPersistence;
	});

	afterEach(() => {
		stopAppManagerPersistence();
		localStorage.clear();
		vi.useRealTimers();
	});

	it("writes state to localStorage after 500ms debounce", () => {
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: "Test.app", name: "Test", icon: "" },
		});

		// Before debounce fires nothing should be written
		expect(localStorage.getItem("classicyDesktopState")).toBeNull();

		vi.advanceTimersByTime(500);

		const raw = localStorage.getItem("classicyDesktopState");
		expect(raw).not.toBeNull();
		const parsed = JSON.parse(raw ?? "");
		expect(parsed.System.Manager.Applications.apps["Test.app"]).toBeDefined();
	});

	it("does not write to localStorage before 500ms", () => {
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: "Test.app", name: "Test", icon: "" },
		});
		vi.advanceTimersByTime(499);
		expect(localStorage.getItem("classicyDesktopState")).toBeNull();
	});

	it("stopAppManagerPersistence prevents further writes", () => {
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: "Test.app", name: "Test", icon: "" },
		});
		vi.advanceTimersByTime(500);

		// State is now persisted; stop and clear storage
		stopAppManagerPersistence();
		localStorage.clear();

		// Further dispatch should not reach localStorage
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: "Another.app", name: "Another", icon: "" },
		});
		vi.advanceTimersByTime(500);

		expect(localStorage.getItem("classicyDesktopState")).toBeNull();
	});

	it("startAppManagerPersistence is idempotent — calling twice returns the same unsubscribe function", () => {
		const unsub1 = startAppManagerPersistence();
		const unsub2 = startAppManagerPersistence();
		expect(unsub1).toBe(unsub2);
	});

	it("strips boot parade icons from persisted state but keeps them live", () => {
		dispatch({
			type: "ClassicyBootParadeIconAdd",
			id: "brand",
			icon: "/brand.png",
			name: "Brand",
		});
		vi.advanceTimersByTime(500);

		// Live store keeps the icon…
		expect(
			useAppManager.getState().System.Manager.Boot.paradeIcons,
		).toHaveLength(1);

		// …but the persisted snapshot is always empty (session-only slice).
		const raw = localStorage.getItem("classicyDesktopState");
		expect(raw).not.toBeNull();
		const parsed = JSON.parse(raw ?? "");
		expect(parsed.System.Manager.Boot.paradeIcons).toEqual([]);
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
		expect(
			state.System.Manager.Applications.apps["Persisted.app"],
		).toBeDefined();
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

// ─── Persistence exclusions ───────────────────────────────────────────────────

describe("persistence exclusions", () => {
	let dispatch: typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")["dispatch"];
	let useAppManager: typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")["useAppManager"];
	let stopAppManagerPersistence: typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")["stopAppManagerPersistence"];

	beforeEach(async () => {
		vi.useFakeTimers();
		vi.resetModules();
		localStorage.clear();

		// Import ClassicyAppManager first so we can register test event handlers
		// in the fresh module instance, before the utils module auto-starts persistence.
		const appManagerMod = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager"
		);

		// Register a test handler that populates Browser.app data.history.
		appManagerMod.registerAppEventHandler(
			"ClassicyAppBrowserTest",
			(
				ds: import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager").ClassicyStore,
				action,
			) => {
				if (action.type === "ClassicyAppBrowserTestSetHistory") {
					const appId = "Browser.app";
					if (!ds.System.Manager.Applications.apps[appId]) return ds;
					ds.System.Manager.Applications.apps[appId].data = {
						...(ds.System.Manager.Applications.apps[appId].data ?? {}),
						history: (action as { type: string; history: unknown[] }).history,
					};
				}
				return ds;
			},
		);

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
		vi.useRealTimers();
	});

	it("excludes Browser.app data.history from localStorage snapshot", () => {
		// Open Browser.app so it exists in state
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: "Browser.app", name: "Browser", icon: "" },
		});
		// Populate history via the registered test handler
		dispatch({
			type: "ClassicyAppBrowserTestSetHistory",
			history: [
				{ url: "https://example.com", visitedAt: "2024-01-01T00:00:00Z" },
			],
		} as Parameters<typeof dispatch>[0]);

		vi.advanceTimersByTime(500);

		const raw = localStorage.getItem("classicyDesktopState");
		expect(raw).not.toBeNull();
		const parsed = JSON.parse(raw ?? "");
		const browserApp =
			parsed.System?.Manager?.Applications?.apps?.["Browser.app"];
		expect(browserApp).toBeDefined();
		// history must NOT appear in the persisted snapshot
		expect(browserApp.data?.history).toBeUndefined();
	});

	it("does not mutate live state when stripping history for persistence", () => {
		dispatch({
			type: "ClassicyAppOpen",
			app: { id: "Browser.app", name: "Browser", icon: "" },
		});
		dispatch({
			type: "ClassicyAppBrowserTestSetHistory",
			history: [
				{ url: "https://example.com", visitedAt: "2024-01-01T00:00:00Z" },
			],
		} as Parameters<typeof dispatch>[0]);

		vi.advanceTimersByTime(500);

		// Live store must still hold the history after persistence ran
		const liveState = useAppManager.getState();
		const liveHistory =
			liveState.System.Manager.Applications.apps["Browser.app"].data?.history;
		expect(liveHistory).toBeDefined();
		expect(Array.isArray(liveHistory)).toBe(true);
	});

	it("empties HyperCard edit-session undo/redo stacks in the localStorage snapshot but keeps draft/dirty", async () => {
		// Register a test handler that seeds an edit session the way the editor
		// reducer would (undo/redo holding full HCStack snapshots).
		const appManagerMod = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager"
		);
		appManagerMod.registerAppEventHandler(
			"ClassicyAppHCEditTest",
			(
				ds: import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager").ClassicyStore,
				action,
			) => {
				if (action.type === "ClassicyAppHCEditTestSeed") {
					const appId = "HyperCard.app";
					if (!ds.System.Manager.Applications.apps[appId]) return ds;
					ds.System.Manager.Applications.apps[appId].data = {
						...(ds.System.Manager.Applications.apps[appId].data ?? {}),
						edits: {
							demo: {
								draft: { name: "Demo", cards: [{ id: "c1" }] },
								currentCardId: "c1",
								layer: "card",
								tool: "pointer",
								undo: [{ name: "Demo", cards: [{ id: "c1" }] }],
								redo: [{ name: "Demo", cards: [{ id: "c1" }] }],
								dirty: true,
							},
						},
					};
				}
				return ds;
			},
		);

		dispatch({
			type: "ClassicyAppOpen",
			app: { id: "HyperCard.app", name: "HyperCard", icon: "" },
		});
		dispatch({
			type: "ClassicyAppHCEditTestSeed",
		} as Parameters<typeof dispatch>[0]);

		vi.advanceTimersByTime(500);

		const raw = localStorage.getItem("classicyDesktopState");
		expect(raw).not.toBeNull();
		const parsed = JSON.parse(raw ?? "");
		const editSession =
			parsed.System?.Manager?.Applications?.apps?.["HyperCard.app"]?.data?.edits
				?.demo;
		expect(editSession).toBeDefined();
		expect(editSession.undo).toEqual([]);
		expect(editSession.redo).toEqual([]);
		expect(editSession.dirty).toBe(true);
		expect(editSession.draft).toEqual({ name: "Demo", cards: [{ id: "c1" }] });

		// Live state must be untouched by sanitization.
		const liveData = useAppManager.getState().System.Manager.Applications.apps[
			"HyperCard.app"
		].data as { edits?: Record<string, { undo: unknown[]; redo: unknown[] }> };
		const liveEdit = liveData.edits?.demo;
		expect(liveEdit?.undo).toHaveLength(1);
		expect(liveEdit?.redo).toHaveLength(1);
	});

	it("does not strip history from non-Browser apps", async () => {
		// Register a second handler for a non-Browser app with a history field
		const appManagerMod = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager"
		);
		appManagerMod.registerAppEventHandler(
			"ClassicyAppOtherTest",
			(
				ds: import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager").ClassicyStore,
				action,
			) => {
				if (action.type === "ClassicyAppOtherTestSetHistory") {
					const appId = "Other.app";
					if (!ds.System.Manager.Applications.apps[appId]) return ds;
					ds.System.Manager.Applications.apps[appId].data = {
						...(ds.System.Manager.Applications.apps[appId].data ?? {}),
						history: (action as { type: string; history: unknown[] }).history,
					};
				}
				return ds;
			},
		);

		dispatch({
			type: "ClassicyAppOpen",
			app: { id: "Other.app", name: "Other", icon: "" },
		});
		dispatch({
			type: "ClassicyAppOtherTestSetHistory",
			history: [{ url: "https://example.com" }],
		} as Parameters<typeof dispatch>[0]);

		vi.advanceTimersByTime(500);

		const raw = localStorage.getItem("classicyDesktopState");
		const parsed = JSON.parse(raw ?? "");
		const otherApp = parsed.System?.Manager?.Applications?.apps?.["Other.app"];
		// history on non-Browser apps must be preserved as-is
		expect(otherApp?.data?.history).toBeDefined();
	});
});

// ─── wasHydratedFromStorage ───────────────────────────────────────────────────

describe("wasHydratedFromStorage", () => {
	afterEach(() => {
		localStorage.clear();
	});

	it("returns false when no persisted state exists at import", async () => {
		vi.resetModules();
		localStorage.clear();
		const mod = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		expect(mod.wasHydratedFromStorage()).toBe(false);
		mod.stopAppManagerPersistence();
	});

	it("returns true when valid persisted state exists at import", async () => {
		vi.resetModules();
		localStorage.setItem(
			"classicyDesktopState",
			JSON.stringify(makeValidStoredState()),
		);
		const mod = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		expect(mod.wasHydratedFromStorage()).toBe(true);
		mod.stopAppManagerPersistence();
	});

	it("returns false when persisted state is schema-invalid", async () => {
		vi.resetModules();
		localStorage.setItem(
			"classicyDesktopState",
			JSON.stringify({ bogus: true }),
		);
		const mod = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		expect(mod.wasHydratedFromStorage()).toBe(false);
		mod.stopAppManagerPersistence();
	});
});
