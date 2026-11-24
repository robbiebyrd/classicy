// Platinum registered: a built-in active theme is saved as its reference
// only when its package is known, which is what a host's state looks like.
import "@/__tests__/withPlatinum";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAllThemes } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	type ClassicyStore,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	sanitizeStateForPersistence,
	startAppManagerPersistence,
	useAppManager,
	wasHydratedFromStorage,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type ClassicyStateAdapter,
	type ClassicyStateReconcileResult,
	type ClassicyStateSnapshot,
	flushClassicyState,
	getClassicyStateAdapters,
	reconcileClassicyState,
	registerClassicyStateAdapter,
	unregisterClassicyStateAdapter,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateAdapter";
import {
	resetClassicyPersistedState,
	resetClassicyStateSyncForTests,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateSync.internal";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { classicySha256Hex } from "@/SystemFolder/SystemResources/Utils/ClassicySyncAdapterHook.internal";

const KEY = "classicyDesktopState";

let logs: ClassicyLogEntry[] = [];
const warnings = () =>
	logs.filter(
		(entry) =>
			entry.subsystem === "ClassicyStateAdapter" && entry.level === "warn",
	);

/** An adapter collecting its snapshots. */
function collector(id = "collector"): {
	adapter: ClassicyStateAdapter;
	snapshots: ClassicyStateSnapshot[];
} {
	const snapshots: ClassicyStateSnapshot[] = [];
	return {
		snapshots,
		adapter: {
			id,
			onSnapshot: (snapshot) => {
				snapshots.push(snapshot);
			},
		},
	};
}

/** A real change to the saved state: a new app record. */
const openApp = (id: string) =>
	dispatch({ type: "ClassicyAppOpen", app: { id, name: id, icon: "" } });

/** A change to session state only: the saved state is the same. */
const addParadeIcon = (id: string) =>
	dispatch({ type: "ClassicyBootParadeIconAdd", id, icon: `/${id}.png` });

/** A deferred promise for a reconcile the test answers. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

/** Saved desktop state with a custom active theme and one window, as an
 * adapter would hand it back from another device. */
function remoteState(name = "Remote Theme"): ClassicyStore {
	const base = produce(DefaultAppManagerState, (draft) => {
		const custom = {
			...structuredClone(getAllThemes()[0]),
			id: "custom",
			name,
		};
		draft.System.Manager.Appearance.activeTheme = custom;
		draft.System.Manager.Appearance.customThemes = [structuredClone(custom)];
		draft.System.Manager.Applications.apps["Remote.app"] = {
			id: "Remote.app",
			name: "Remote",
			icon: "",
			open: true,
			windows: {
				main: {
					id: "main",
					closed: false,
					size: [320, 200],
					position: [111, 222],
				},
			},
		} as never;
	});
	return JSON.parse(JSON.stringify(sanitizeStateForPersistence(base)));
}

beforeEach(() => {
	vi.useFakeTimers();
	resetClassicyStateSyncForTests();
	localStorage.clear();
	useAppManager.setState(DefaultAppManagerState, true);
	// A Reset PRAM case stops persistence; every case starts with it on.
	startAppManagerPersistence();
	logs = [];
	registerClassicyLogSink({ id: "test", onLog: (entry) => logs.push(entry) });
});

afterEach(() => {
	unregisterClassicyLogSink("test");
	resetClassicyStateSyncForTests();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("registry", () => {
	it("registers, replaces by id and unregisters", () => {
		const first = collector("a").adapter;
		const second = collector("a").adapter;
		registerClassicyStateAdapter(first);
		registerClassicyStateAdapter(second);
		expect(getClassicyStateAdapters()).toEqual([second]);
		unregisterClassicyStateAdapter("a");
		expect(getClassicyStateAdapters()).toEqual([]);
	});

	it("refuses an unbounded or invalid reconcileTimeoutMs, keeping the default", async () => {
		for (const reconcileTimeoutMs of [Number.POSITIVE_INFINITY, 0, -1, NaN]) {
			resetClassicyStateSyncForTests();
			const reconcile = vi.fn(() => new Promise<never>(() => {}));
			registerClassicyStateAdapter(
				{ id: "slow", reconcile },
				{ reconcileTimeoutMs },
			);
			const done = reconcileClassicyState();
			await vi.advanceTimersByTimeAsync(4999);
			let settled = false;
			void done.then(() => {
				settled = true;
			});
			await vi.advanceTimersByTimeAsync(0);
			expect(settled).toBe(false);
			await vi.advanceTimersByTimeAsync(1);
			expect(await done).toBe(false);
		}
		expect(
			warnings().filter((w) => w.message.includes("reconcileTimeoutMs")),
		).toHaveLength(4);
	});
});

describe("snapshots", () => {
	it("hold exactly what localStorage saves: no built-in theme, no session state", () => {
		const { adapter, snapshots } = collector();
		registerClassicyStateAdapter(adapter);
		dispatch({
			type: "ClassicyDesktopLoadThemes",
			availableThemes: getAllThemes(),
		});
		openApp("Notes.app");
		addParadeIcon("brand");
		dispatch({ type: "ClassicyDesktopShowSystemDialog", dialog: "emptyTrash" });
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				const apps = draft.System.Manager.Applications.apps;
				apps["Notes.app"].hidden = true;
				apps["Notes.app"].windows = {
					w: {
						id: "w",
						closed: false,
						dragging: true,
						resizing: true,
						closedThisSession: true,
						size: [100, 100],
						position: [10, 40],
					},
				} as never;
				// A field this build does not know (another feature's), kept as
				// sanitizeStateForPersistence keeps it: no field list here.
				(apps["Notes.app"] as unknown as { data: unknown }).data = {
					recentItems: ["Macintosh HD:Read Me"],
				};
				draft.System.Manager.Keyboard.global = {
					x: { appId: "Notes.app" },
				} as never;
			}),
		);
		vi.advanceTimersByTime(500);

		expect(snapshots).toHaveLength(1);
		const [snapshot] = snapshots;
		const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
		// The same JSON localStorage holds, byte for byte.
		expect(JSON.stringify(snapshot.state)).toBe(JSON.stringify(saved));
		expect(snapshot.state).toEqual(
			JSON.parse(
				JSON.stringify(sanitizeStateForPersistence(useAppManager.getState())),
			),
		);
		const { Appearance, Boot, Keyboard, Desktop, Applications } =
			snapshot.state.System.Manager;
		// Built-ins come from the code: no list, the active one by reference.
		expect("availableThemes" in Appearance).toBe(false);
		expect(Object.keys(Appearance.activeTheme).sort()).toEqual(
			["defaults", "id", "package"].filter(
				(key) => key in Appearance.activeTheme,
			),
		);
		expect(Appearance.activeTheme.package).toBe("platinum");
		// Session state is stripped.
		expect(Boot.paradeIcons).toEqual([]);
		expect(Keyboard).toEqual({ app: {}, system: [], global: {} });
		expect(Desktop.systemDialog).toBeNull();
		const notes = Applications.apps["Notes.app"];
		expect("hidden" in notes).toBe(false);
		expect(notes.windows.w).toEqual({
			id: "w",
			closed: false,
			size: [100, 100],
			position: [10, 40],
		});
		expect(notes.data).toEqual({ recentItems: ["Macintosh HD:Read Me"] });
		// The envelope.
		expect(snapshot.hash).toBe(
			classicySha256Hex(JSON.stringify(snapshot.state)),
		);
		expect(snapshot.seq).toBe(1);
		expect(snapshot.storageKey).toBe(KEY);
		expect(Number.isNaN(Date.parse(snapshot.timestamp))).toBe(false);
	});

	it("is debounced: one delivery 500 ms after the last of many changes", () => {
		const { adapter, snapshots } = collector();
		registerClassicyStateAdapter(adapter);
		for (let i = 0; i < 10; i++) {
			openApp(`App${i}.app`);
			vi.advanceTimersByTime(100);
		}
		expect(snapshots).toHaveLength(0);
		vi.advanceTimersByTime(399);
		expect(snapshots).toHaveLength(0);
		vi.advanceTimersByTime(1);
		expect(snapshots).toHaveLength(1);
		expect(
			Object.keys(snapshots[0].state.System.Manager.Applications.apps),
		).toContain("App9.app");
	});

	it("honors snapshotDebounceMs, the shared timer taking the shortest", () => {
		const slow = collector("slow");
		registerClassicyStateAdapter(slow.adapter, { snapshotDebounceMs: 3000 });
		openApp("A.app");
		vi.advanceTimersByTime(2999);
		expect(slow.snapshots).toHaveLength(0);
		vi.advanceTimersByTime(1);
		expect(slow.snapshots).toHaveLength(1);

		const fast = collector("fast");
		registerClassicyStateAdapter(fast.adapter, { snapshotDebounceMs: 100 });
		openApp("B.app");
		vi.advanceTimersByTime(100);
		expect(fast.snapshots).toHaveLength(1);
		expect(slow.snapshots).toHaveLength(2);
	});

	it("skips a snapshot whose hash is unchanged, and sends again after a failed delivery", async () => {
		const seen: string[] = [];
		let fail = true;
		registerClassicyStateAdapter({
			id: "flaky",
			onSnapshot: async (snapshot) => {
				seen.push(snapshot.hash);
				if (fail) throw new Error("offline");
			},
		});
		openApp("A.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(seen).toHaveLength(1);
		// The failure was logged, and the next change (session state only:
		// the same hash) sends it again.
		expect(
			logs.some(
				(e) =>
					e.level === "error" &&
					e.message === 'adapter "flaky" failed in onSnapshot',
			),
		).toBe(true);
		fail = false;
		addParadeIcon("one");
		await vi.advanceTimersByTimeAsync(500);
		expect(seen).toHaveLength(2);
		expect(seen[1]).toBe(seen[0]);
		// Delivered now: the same hash again is skipped.
		addParadeIcon("two");
		await vi.advanceTimersByTimeAsync(500);
		expect(seen).toHaveLength(2);
		// A real change is sent.
		openApp("B.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(seen).toHaveLength(3);
		expect(seen[2]).not.toBe(seen[1]);
	});

	it("numbers saved states with a seq that persists and only grows", () => {
		const { adapter, snapshots } = collector();
		registerClassicyStateAdapter(adapter);
		openApp("A.app");
		vi.advanceTimersByTime(500);
		openApp("B.app");
		vi.advanceTimersByTime(500);
		expect(snapshots.map((s) => s.seq)).toEqual([1, 2]);
		expect(localStorage.getItem(`${KEY}:seq`)).toBe("2");
		expect(localStorage.getItem(`${KEY}:hash`)).toBe(snapshots[1].hash);

		// A reload: the in-memory count is gone, the stored one carries on.
		resetClassicyStateSyncForTests();
		const after = collector("after");
		registerClassicyStateAdapter(after.adapter);
		// The same saved state keeps its number.
		addParadeIcon("x");
		vi.advanceTimersByTime(500);
		expect(after.snapshots.map((s) => s.seq)).toEqual([2]);
		openApp("C.app");
		vi.advanceTimersByTime(500);
		expect(after.snapshots.map((s) => s.seq)).toEqual([2, 3]);

		// Another tab that counted further: this one follows it.
		localStorage.setItem(`${KEY}:seq`, "10");
		openApp("D.app");
		vi.advanceTimersByTime(500);
		expect(after.snapshots.at(-1)?.seq).toBe(11);
	});

	it("sends a waiting snapshot when the page hides", () => {
		const { adapter, snapshots } = collector();
		registerClassicyStateAdapter(adapter, { snapshotDebounceMs: 3000 });
		openApp("A.app");
		window.dispatchEvent(new Event("pagehide"));
		expect(snapshots).toHaveLength(1);
		vi.advanceTimersByTime(3000);
		expect(snapshots).toHaveLength(1);
	});

	it("flushClassicyState saves now and resolves once delivered", async () => {
		const { adapter, snapshots } = collector();
		registerClassicyStateAdapter(adapter, { snapshotDebounceMs: 3000 });
		openApp("A.app");
		expect(localStorage.getItem(KEY)).toBeNull();
		await expect(flushClassicyState()).resolves.toBe(true);
		expect(snapshots).toHaveLength(1);
		expect(
			JSON.parse(localStorage.getItem(KEY) ?? "null").System.Manager
				.Applications.apps["A.app"],
		).toBeDefined();
		// The pending debounce was canceled.
		vi.advanceTimersByTime(3000);
		expect(snapshots).toHaveLength(1);

		registerClassicyStateAdapter({
			id: "broken",
			onSnapshot: () => Promise.reject(new Error("down")),
		});
		openApp("B.app");
		await expect(flushClassicyState()).resolves.toBe(false);
	});
});

describe("reconcile", () => {
	it("useLocal keeps the local state; the adapter is offered the local snapshot", async () => {
		const reconcile = vi.fn(
			async (): Promise<ClassicyStateReconcileResult> => ({
				action: "useLocal",
			}),
		);
		registerClassicyStateAdapter({ id: "remote", reconcile });
		openApp("Local.app");
		const before = useAppManager.getState();
		await expect(reconcileClassicyState()).resolves.toBe(false);
		expect(useAppManager.getState()).toBe(before);
		const [local, context] = reconcile.mock.calls[0] as unknown as [
			ClassicyStateSnapshot,
			{ signal: AbortSignal },
		];
		expect(local.state).toEqual(
			JSON.parse(JSON.stringify(sanitizeStateForPersistence(before))),
		);
		expect(
			local.state.System.Manager.Applications.apps["Local.app"],
		).toBeDefined();
		expect(context.signal.aborted).toBe(false);
	});

	it("replace adopts the state: applied, saved at once, and the seed no longer applies", async () => {
		registerClassicyStateAdapter({
			id: "remote",
			reconcile: async () => ({ action: "replace", state: remoteState() }),
		});
		dispatch({
			type: "ClassicyDesktopLoadThemes",
			availableThemes: getAllThemes(),
		});
		const loadedThemes =
			useAppManager.getState().System.Manager.Appearance.availableThemes;
		await expect(reconcileClassicyState()).resolves.toBe(true);
		const { Appearance, Applications } =
			useAppManager.getState().System.Manager;
		expect(Appearance.activeTheme.name).toBe("Remote Theme");
		expect(Applications.apps["Remote.app"].windows.main.position).toEqual([
			111, 222,
		]);
		// The session's loaded themes are kept: they come from the code.
		expect(Appearance.availableThemes).toBe(loadedThemes);
		// Saved before the 500 ms debounce.
		const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
		expect(saved.System.Manager.Appearance.activeTheme.name).toBe(
			"Remote Theme",
		);
		expect(wasHydratedFromStorage()).toBe(true);
	});

	it("keeps the local state when reconcile rejects or throws", async () => {
		registerClassicyStateAdapter({
			id: "rejects",
			reconcile: () => Promise.reject(new Error("500")),
		});
		registerClassicyStateAdapter({
			id: "throws",
			reconcile: () => {
				throw new Error("bug");
			},
		});
		const before = useAppManager.getState();
		await expect(reconcileClassicyState()).resolves.toBe(false);
		expect(useAppManager.getState()).toBe(before);
		expect(warnings().map((w) => w.message)).toEqual([
			'adapter "rejects" failed in reconcile; keeping the local state',
			'adapter "throws" failed in reconcile; keeping the local state',
		]);
	});

	it("keeps the local state when reconcile outlasts its timeout, and ignores a late answer", async () => {
		const answer = deferred<ClassicyStateReconcileResult>();
		let signal: AbortSignal | undefined;
		registerClassicyStateAdapter(
			{
				id: "slow",
				reconcile: (_local, context) => {
					signal = context.signal;
					return answer.promise;
				},
			},
			{ reconcileTimeoutMs: 2000 },
		);
		const before = useAppManager.getState();
		const done = reconcileClassicyState();
		await vi.advanceTimersByTimeAsync(1999);
		expect(signal?.aborted).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		await expect(done).resolves.toBe(false);
		expect(signal?.aborted).toBe(true);
		expect(warnings().map((w) => w.message)).toEqual([
			'adapter "slow" did not answer reconcile within 2000 ms; keeping the local state',
		]);
		answer.resolve({ action: "replace", state: remoteState() });
		await vi.advanceTimersByTimeAsync(0);
		expect(useAppManager.getState()).toBe(before);
	});

	it("waits 5000 ms by default", async () => {
		registerClassicyStateAdapter({
			id: "hangs",
			reconcile: () => new Promise<never>(() => {}),
		});
		let settled = false;
		void reconcileClassicyState().then(() => {
			settled = true;
		});
		await vi.advanceTimersByTimeAsync(4999);
		expect(settled).toBe(false);
		await vi.advanceTimersByTimeAsync(1);
		expect(settled).toBe(true);
	});

	it("refuses a replacement that is not saved desktop state", async () => {
		const cyclic: Record<string, unknown> = { System: {} };
		cyclic.self = cyclic;
		const invalid: unknown[] = [
			undefined,
			"{}",
			{},
			{ System: { Manager: { Applications: { apps: {} }, Desktop: {} } } },
			cyclic,
		];
		for (const state of invalid) {
			registerClassicyStateAdapter({
				id: "bad",
				reconcile: async () => ({ action: "replace", state }) as never,
			});
			const before = useAppManager.getState();
			await expect(reconcileClassicyState()).resolves.toBe(false);
			expect(useAppManager.getState()).toBe(before);
		}
		expect(
			warnings().filter((w) => w.message.includes("invalid state")),
		).toHaveLength(invalid.length);
	});

	it("drops a __proto__ key in a remote state", async () => {
		const state = remoteState();
		const json = JSON.stringify(state).replace(
			'"Applications":{',
			'"Applications":{"__proto__":{"polluted":true},',
		);
		registerClassicyStateAdapter({
			id: "remote",
			reconcile: async () => ({ action: "replace", state: JSON.parse(json) }),
		});
		await expect(reconcileClassicyState()).resolves.toBe(true);
		const applications = useAppManager.getState().System.Manager.Applications;
		expect((applications as unknown as { polluted?: boolean }).polluted).toBe(
			undefined,
		);
		expect(Object.getPrototypeOf(applications)).toBe(Object.prototype);
	});

	it("asks the adapters in order; the first replace wins", async () => {
		const later = vi.fn(async () => ({ action: "useLocal" }) as const);
		registerClassicyStateAdapter({
			id: "local",
			reconcile: async () => ({ action: "useLocal" }),
		});
		registerClassicyStateAdapter({
			id: "first",
			reconcile: async () => ({ action: "replace", state: remoteState("One") }),
		});
		registerClassicyStateAdapter({ id: "later", reconcile: later });
		await expect(reconcileClassicyState()).resolves.toBe(true);
		expect(
			useAppManager.getState().System.Manager.Appearance.activeTheme.name,
		).toBe("One");
		expect(later).not.toHaveBeenCalled();
	});

	it("shares one run between concurrent calls", async () => {
		const answer = deferred<ClassicyStateReconcileResult>();
		const reconcile = vi.fn(() => answer.promise);
		registerClassicyStateAdapter({ id: "remote", reconcile });
		const first = reconcileClassicyState();
		const second = reconcileClassicyState();
		expect(second).toBe(first);
		answer.resolve({ action: "useLocal" });
		await first;
		expect(reconcile).toHaveBeenCalledTimes(1);
	});

	it("holds snapshots while a reconcile runs, and before the first one", async () => {
		const answer = deferred<ClassicyStateReconcileResult>();
		const snapshots: ClassicyStateSnapshot[] = [];
		registerClassicyStateAdapter({
			id: "both",
			onSnapshot: (snapshot) => {
				snapshots.push(snapshot);
			},
			reconcile: () => answer.promise,
		});
		// Before the boot reconcile: the local state must not overwrite the
		// copy it is about to read.
		openApp("Early.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(0);
		const done = reconcileClassicyState();
		openApp("During.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(0);
		answer.resolve({ action: "replace", state: remoteState() });
		await done;
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(1);
		// What is sent is the adopted state.
		expect(snapshots[0].state.System.Manager.Appearance.activeTheme.name).toBe(
			"Remote Theme",
		);
	});

	it("skips the boot reconcile after Reset PRAM, once", async () => {
		const reconcile = vi.fn(
			async (): Promise<ClassicyStateReconcileResult> => ({
				action: "useLocal",
			}),
		);
		registerClassicyStateAdapter({ id: "remote", reconcile });
		localStorage.setItem(`${KEY}:reset`, "1");
		await expect(reconcileClassicyState()).resolves.toBe(false);
		expect(reconcile).not.toHaveBeenCalled();
		expect(localStorage.getItem(`${KEY}:reset`)).toBeNull();
		expect(
			logs.some(
				(e) => e.level === "info" && e.message.startsWith("Reset PRAM"),
			),
		).toBe(true);
		// A later call reconciles.
		await reconcileClassicyState();
		expect(reconcile).toHaveBeenCalledTimes(1);
	});
});

describe("Reset PRAM", () => {
	it("restarts at once, leaving no mark, with no adapter", () => {
		openApp("A.app");
		vi.advanceTimersByTime(500);
		const restart = vi.fn();
		resetClassicyPersistedState(restart);
		expect(restart).toHaveBeenCalledTimes(1);
		expect(localStorage.getItem(KEY)).toBeNull();
		expect(localStorage.getItem(`${KEY}:reset`)).toBeNull();
		// A change after the reset no longer brings the saved state back.
		openApp("B.app");
		vi.advanceTimersByTime(500);
		expect(localStorage.getItem(KEY)).toBeNull();
	});

	it("hands the adapters a first session's state, then restarts", async () => {
		const delivery = deferred<void>();
		const snapshots: ClassicyStateSnapshot[] = [];
		registerClassicyStateAdapter({
			id: "remote",
			onSnapshot: (snapshot) => {
				snapshots.push(snapshot);
				return delivery.promise;
			},
		});
		openApp("Mine.app");
		const restart = vi.fn();
		resetClassicyPersistedState(restart);
		expect(localStorage.getItem(KEY)).toBeNull();
		expect(localStorage.getItem(`${KEY}:reset`)).toBe("1");
		expect(snapshots).toHaveLength(1);
		const apps = snapshots[0].state.System.Manager.Applications.apps;
		expect(apps["Mine.app"]).toBeUndefined();
		expect(Object.keys(apps)).toEqual(
			Object.keys(DefaultAppManagerState.System.Manager.Applications.apps),
		);
		expect(restart).not.toHaveBeenCalled();
		delivery.resolve();
		await vi.advanceTimersByTimeAsync(0);
		expect(restart).toHaveBeenCalledTimes(1);
		// The debounced snapshot of the old state never goes out.
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(1);
	});

	it("restarts after 5000 ms when an adapter does not take it", async () => {
		registerClassicyStateAdapter({
			id: "hangs",
			onSnapshot: () => new Promise<void>(() => {}),
		});
		const restart = vi.fn();
		resetClassicyPersistedState(restart);
		await vi.advanceTimersByTimeAsync(4999);
		expect(restart).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(1);
		expect(restart).toHaveBeenCalledTimes(1);
	});
});
