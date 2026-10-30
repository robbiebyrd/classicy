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
			windows: {},
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

	// A blob saved mid-gesture by an older build still carries the gesture
	// flags; a loaded `dragging: true` would make the window jump to the
	// pointer on its first mouse move.
	it("drops a persisted window's resizing, dragging and moving on load", async () => {
		const stored = makeValidStoredState();
		(
			stored.System as Record<string, unknown> & {
				Manager: { Applications: { apps: Record<string, unknown> } };
			}
		).Manager.Applications.apps["Persisted.app"] = {
			id: "Persisted.app",
			name: "Persisted",
			icon: "",
			open: true,
			windows: {
				w: {
					id: "w",
					closed: false,
					resizing: true,
					dragging: true,
					moving: true,
					size: [100, 100],
					position: [10, 40],
				},
			},
		};
		localStorage.setItem("classicyDesktopState", JSON.stringify(stored));

		vi.resetModules();
		const { useAppManager, stopAppManagerPersistence } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		stopAppManagerPersistence();

		const win =
			useAppManager.getState().System.Manager.Applications.apps["Persisted.app"]
				.windows.w;
		expect(win.position).toEqual([10, 40]);
		expect("resizing" in win).toBe(false);
		expect("dragging" in win).toBe(false);
		expect("moving" in win).toBe(false);
	});

	/** Hydrate a fresh store from a persisted `activeTheme.desktop.backgroundImage`. */
	async function hydrateBackground(backgroundImage: string): Promise<string> {
		const stored = makeValidStoredState();
		(
			stored.System as Record<string, unknown> & {
				Manager: { Appearance: Record<string, unknown> };
			}
		).Manager.Appearance = {
			activeTheme: { id: "default", desktop: { backgroundImage } },
			availableThemes: [],
		};
		localStorage.setItem("classicyDesktopState", JSON.stringify(stored));

		vi.resetModules();
		const { useAppManager, stopAppManagerPersistence } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		stopAppManagerPersistence();

		return useAppManager.getState().System.Manager.Appearance.activeTheme
			.desktop.backgroundImage;
	}

	// Persisted state merges *over* the defaults, so a background saved by an
	// older build — when themes carried a literal path no consuming app serves —
	// would outlive the fix and keep 404ing without healing on hydration.
	//
	// These inputs are deliberately chosen so that input !== resolved output in
	// BOTH environments. Under vitest a bundled asset resolves to its own source
	// path, so asserting against a stored "/assets/img/wallpapers/*.png" would
	// hold whether or not healing ran — the same dev/production aliasing that hid
	// the original bug.
	it("re-resolves a stale wallpaper path persisted by an older build", async () => {
		const { resolveWallpaper } = await import(
			"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers"
		);
		expect(await hydrateBackground("/legacy/wallpapers/default.png")).toBe(
			resolveWallpaper("default.png"),
		);
	});

	it("blanks a persisted wallpaper that no longer ships, rather than 404ing", async () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		expect(await hydrateBackground("retired_wallpaper.png")).toBe("");
		warnSpy.mockRestore();
	});

	it("keeps a background URL the user set themselves", async () => {
		expect(
			await hydrateBackground("https://example.com/my-wallpaper.png"),
		).toBe("https://example.com/my-wallpaper.png");
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

// ─── sanitizeStateForPersistence — Keyboard exclusion ─────────────────────────

describe("sanitizeStateForPersistence — Keyboard registry", () => {
	it("strips System.Manager.Keyboard from the persisted snapshot", async () => {
		const { sanitizeStateForPersistence } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		const { DefaultAppManagerState } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager"
		);
		const state = structuredClone(DefaultAppManagerState);
		state.System.Manager.Keyboard.app["X.app"] = ["command+s"];
		const out = sanitizeStateForPersistence(state);
		expect(out.System.Manager.Keyboard.app).toEqual({});
		expect(out.System.Manager.Keyboard.system).toEqual([]);
		expect(out.System.Manager.Keyboard.global).toEqual({});
	});
});

describe("sanitizeStateForPersistence — closedThisSession", () => {
	it("strips the session-only reopen marker from every window", async () => {
		const { sanitizeStateForPersistence } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		const { DefaultAppManagerState } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager"
		);
		const state = structuredClone(DefaultAppManagerState);
		state.System.Manager.Applications.apps["X.app"] = {
			id: "X.app",
			name: "X",
			icon: "",
			open: true,
			data: {},
			windows: {
				w: {
					id: "w",
					closed: true,
					closedThisSession: true,
					size: [100, 100],
					position: [0, 0],
					minimumSize: [0, 0],
				},
			},
		};
		const out = sanitizeStateForPersistence(state);
		const win = out.System.Manager.Applications.apps["X.app"].windows.w;
		expect(win.closed).toBe(true);
		expect("closedThisSession" in win).toBe(false);
	});
});

describe("sanitizeStateForPersistence — gesture flags", () => {
	// A reload ends any drag or resize; a persisted `resizing: true` would keep
	// the window acting as if resized until its first click.
	it("strips resizing, dragging and moving from every window", async () => {
		const { sanitizeStateForPersistence } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		const { DefaultAppManagerState } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager"
		);
		const state = structuredClone(DefaultAppManagerState);
		state.System.Manager.Applications.apps["X.app"] = {
			id: "X.app",
			name: "X",
			icon: "",
			open: true,
			data: {},
			windows: {
				w: {
					id: "w",
					closed: false,
					resizing: true,
					dragging: true,
					moving: true,
					size: [100, 100],
					position: [0, 0],
					minimumSize: [0, 0],
				},
			},
		};
		const out = sanitizeStateForPersistence(state);
		const win = out.System.Manager.Applications.apps["X.app"].windows.w;
		expect(win.size).toEqual([100, 100]);
		expect("resizing" in win).toBe(false);
		expect("dragging" in win).toBe(false);
		expect("moving" in win).toBe(false);
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

// ─── 0.x → 1.0 migration: apps[id].windows array → record ─────────────────────

describe("windows record migration (0.x saved state)", () => {
	type UtilsModule =
		typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils");

	function legacyWindow(id: string, extra: Record<string, unknown> = {}) {
		return {
			id,
			closed: false,
			size: [400, 300],
			position: [20, 20],
			minimumSize: [100, 100],
			...extra,
		};
	}

	/** Persist a 0.x-shaped state whose apps carry `windows` arrays. */
	function storeLegacyApps(apps: Record<string, unknown>) {
		const stored = makeValidStoredState();
		(
			stored.System as { Manager: { Applications: { apps: unknown } } }
		).Manager.Applications.apps = apps;
		localStorage.setItem("classicyDesktopState", JSON.stringify(stored));
	}

	async function loadStore(): Promise<UtilsModule> {
		vi.resetModules();
		const mod = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		mod.stopAppManagerPersistence();
		return mod;
	}

	afterEach(() => {
		vi.resetModules();
		localStorage.clear();
		vi.useRealTimers();
	});

	it("converts a persisted windows array into a record keyed by id", async () => {
		storeLegacyApps({
			"Finder.app": {
				id: "Finder.app",
				name: "Finder",
				icon: "",
				open: true,
				windows: [legacyWindow("Macintosh HD:")],
			},
			"Notes.app": {
				id: "Notes.app",
				name: "Notes",
				icon: "",
				open: true,
				windows: [
					legacyWindow("notes_main", { zOrder: 5 }),
					legacyWindow("notes_prefs", { closed: true }),
				],
			},
		});

		const { useAppManager } = await loadStore();
		const apps = useAppManager.getState().System.Manager.Applications.apps;

		expect(Array.isArray(apps["Notes.app"].windows)).toBe(false);
		expect(Object.keys(apps["Notes.app"].windows)).toEqual([
			"notes_main",
			"notes_prefs",
		]);
		expect(apps["Notes.app"].windows.notes_main).toMatchObject({
			id: "notes_main",
			zOrder: 5,
		});
		expect(apps["Notes.app"].windows.notes_prefs.closed).toBe(true);
		// Finder's array replaced the default `{}` wholesale during the merge;
		// the migration pass still converts it.
		expect(Object.keys(apps["Finder.app"].windows)).toEqual(["Macintosh HD:"]);
	});

	it("keeps the last entry when a persisted array repeats an id", async () => {
		storeLegacyApps({
			"Notes.app": {
				id: "Notes.app",
				name: "Notes",
				icon: "",
				open: true,
				windows: [
					legacyWindow("dup", { title: "first" }),
					legacyWindow("other"),
					legacyWindow("dup", { title: "second" }),
				],
			},
		});

		const { useAppManager } = await loadStore();
		const windows =
			useAppManager.getState().System.Manager.Applications.apps["Notes.app"]
				.windows;

		expect(Object.keys(windows)).toEqual(["dup", "other"]);
		expect(windows.dup.title).toBe("second");
	});

	it("drops array entries without a usable string id", async () => {
		storeLegacyApps({
			"Notes.app": {
				id: "Notes.app",
				name: "Notes",
				icon: "",
				open: true,
				windows: [
					legacyWindow("kept"),
					{ closed: false },
					{ id: 42, closed: false },
					{ id: "", closed: false },
					null,
					"window",
					7,
					[legacyWindow("nested")],
				],
			},
		});

		const { useAppManager } = await loadStore();
		const windows =
			useAppManager.getState().System.Manager.Applications.apps["Notes.app"]
				.windows;

		expect(Object.keys(windows)).toEqual(["kept"]);
	});

	it("replaces a garbage windows value with an empty record", async () => {
		storeLegacyApps({
			"A.app": { id: "A.app", name: "A", icon: "", open: true, windows: "x" },
			"B.app": { id: "B.app", name: "B", icon: "", open: true, windows: 3 },
			"C.app": { id: "C.app", name: "C", icon: "", open: true, windows: null },
			"D.app": { id: "D.app", name: "D", icon: "", open: true },
		});

		const { useAppManager } = await loadStore();
		const apps = useAppManager.getState().System.Manager.Applications.apps;

		for (const id of ["A.app", "B.app", "C.app", "D.app"]) {
			expect(apps[id].windows).toEqual({});
		}
	});

	it("loads state already saved as a record unchanged", async () => {
		const windows = {
			notes_main: legacyWindow("notes_main", { zOrder: 9 }),
			"Macintosh HD:Docs": legacyWindow("Macintosh HD:Docs"),
		};
		storeLegacyApps({
			"Notes.app": {
				id: "Notes.app",
				name: "Notes",
				icon: "",
				open: true,
				windows,
			},
		});

		const { useAppManager } = await loadStore();

		expect(
			useAppManager.getState().System.Manager.Applications.apps["Notes.app"]
				.windows,
		).toEqual(windows);
	});

	it("saves the migrated record and reloads it identically", async () => {
		storeLegacyApps({
			"Notes.app": {
				id: "Notes.app",
				name: "Notes",
				icon: "",
				open: true,
				windows: [legacyWindow("a", { zOrder: 1 }), legacyWindow("b")],
			},
		});

		vi.useFakeTimers();
		const first = await loadStore();
		first.startAppManagerPersistence();
		first.dispatch({
			type: "ClassicyWindowMove",
			app: { id: "Notes.app" },
			window: { id: "b" },
			position: [70, 80],
			moving: false,
		});
		vi.advanceTimersByTime(500);
		first.stopAppManagerPersistence();

		const saved = JSON.parse(
			localStorage.getItem("classicyDesktopState") ?? "",
		);
		const savedWindows =
			saved.System.Manager.Applications.apps["Notes.app"].windows;
		expect(Array.isArray(savedWindows)).toBe(false);
		expect(Object.keys(savedWindows)).toEqual(["a", "b"]);
		expect(savedWindows.b.position).toEqual([70, 80]);

		const second = await loadStore();
		const reloaded = second.useAppManager.getState();
		// The reload is the live state as persisted: session-only fields (the
		// move's `moving: false` among them) are stripped on save.
		expect(reloaded.System.Manager.Applications.apps).toEqual(
			first.sanitizeStateForPersistence(first.useAppManager.getState()).System
				.Manager.Applications.apps,
		);
		expect(
			JSON.parse(JSON.stringify(second.sanitizeStateForPersistence(reloaded))),
		).toEqual(saved);
	});
});

describe("migrateClassicyState", () => {
	it("is idempotent and returns current-shape state by reference", async () => {
		const { DefaultAppManagerState } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager"
		);
		const { migrateClassicyState } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations"
		);

		expect(migrateClassicyState(DefaultAppManagerState)).toBe(
			DefaultAppManagerState,
		);

		const legacy = structuredClone(DefaultAppManagerState);
		(
			legacy.System.Manager.Applications.apps["Finder.app"] as {
				windows: unknown;
			}
		).windows = [
			{
				id: "w",
				closed: false,
				size: [1, 1],
				position: [0, 0],
				minimumSize: [0, 0],
			},
		];
		const once = migrateClassicyState(legacy);
		const twice = migrateClassicyState(once);

		expect(once).not.toBe(legacy);
		expect(twice).toBe(once);
		expect(
			Object.keys(once.System.Manager.Applications.apps["Finder.app"].windows),
		).toEqual(["w"]);
		// Copy-on-write: the input is left as it was.
		expect(
			Array.isArray(
				legacy.System.Manager.Applications.apps["Finder.app"].windows,
			),
		).toBe(true);
	});

	it("tolerates state without an apps map", async () => {
		const { migrateClassicyState } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations"
		);
		const odd = { System: { Manager: {} } } as unknown as Parameters<
			typeof migrateClassicyState
		>[0];
		expect(migrateClassicyState(odd)).toBe(odd);
	});
});

describe("mergeClassicyState with window overrides", () => {
	it("normalises a 0.x windows array in the overrides", async () => {
		const { DefaultAppManagerState, mergeClassicyState } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager"
		);
		const merged = mergeClassicyState(DefaultAppManagerState, {
			System: {
				Manager: {
					Applications: {
						apps: {
							"Finder.app": {
								windows: [
									{ id: "one", closed: false },
									{ id: "two", closed: true },
								],
							},
						},
					},
				},
			},
		} as never);

		const finder = merged.System.Manager.Applications.apps["Finder.app"];
		expect(Array.isArray(finder.windows)).toBe(false);
		expect(Object.keys(finder.windows)).toEqual(["one", "two"]);
		expect(finder.windows.two.closed).toBe(true);
		// The rest of the Finder app still comes from the base.
		expect(finder.name).toBe("Finder");
	});

	it("merges a windows record per window id", async () => {
		const { DefaultAppManagerState, mergeClassicyState } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager"
		);
		const window = (id: string) => ({
			id,
			closed: false,
			size: [1, 1] as [number, number],
			position: [0, 0] as [number, number],
			minimumSize: [0, 0] as [number, number],
		});
		const base = mergeClassicyState(DefaultAppManagerState, {
			System: {
				Manager: {
					Applications: {
						apps: { "Finder.app": { windows: { a: window("a") } } },
					},
				},
			},
		});
		const merged = mergeClassicyState(base, {
			System: {
				Manager: {
					Applications: {
						apps: {
							"Finder.app": {
								windows: { a: { closed: true }, b: window("b") },
							},
						},
					},
				},
			},
		});

		const windows =
			merged.System.Manager.Applications.apps["Finder.app"].windows;
		expect(Object.keys(windows)).toEqual(["a", "b"]);
		expect(windows.a).toMatchObject({ id: "a", closed: true, size: [1, 1] });
	});
});
