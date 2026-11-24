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
	noteClassicyStateUserAction,
	resetClassicyPersistedState,
	resetClassicyStateSyncForTests,
	resolveClassicyStateChoice,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateSync.internal";
import {
	noteClassicyClockTick,
	resetClassicyClockTickForTests,
} from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyClockTick.internal";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { classicySha256Hex } from "@/SystemFolder/SystemResources/Utils/ClassicySyncAdapterHook.internal";
import packageJson from "../../../../package.json";
import { rememberClassicyDefaultStateSeed } from "./ClassicyDefaultStateSeed.internal";

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
	resetClassicyClockTickForTests();
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

	it("honors snapshotDebounceMs, the shared timer taking the shortest", async () => {
		const slow = collector("slow");
		registerClassicyStateAdapter(slow.adapter, { snapshotDebounceMs: 3000 });
		openApp("A.app");
		await vi.advanceTimersByTimeAsync(2999);
		expect(slow.snapshots).toHaveLength(0);
		await vi.advanceTimersByTimeAsync(1);
		expect(slow.snapshots).toHaveLength(1);

		const fast = collector("fast");
		registerClassicyStateAdapter(fast.adapter, { snapshotDebounceMs: 100 });
		openApp("B.app");
		await vi.advanceTimersByTimeAsync(100);
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

	it("numbers saved states with a seq that persists and only grows", async () => {
		const { adapter, snapshots } = collector();
		registerClassicyStateAdapter(adapter);
		openApp("A.app");
		await vi.advanceTimersByTimeAsync(500);
		openApp("B.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots.map((s) => s.seq)).toEqual([1, 2]);
		expect(localStorage.getItem(`${KEY}:seq`)).toBe("2");

		// A reload: the in-memory count is gone, the stored one carries on.
		resetClassicyStateSyncForTests();
		const after = collector("after");
		registerClassicyStateAdapter(after.adapter);
		// The same saved state keeps its number.
		addParadeIcon("x");
		await vi.advanceTimersByTimeAsync(500);
		expect(after.snapshots.map((s) => s.seq)).toEqual([2]);
		openApp("C.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(after.snapshots.map((s) => s.seq)).toEqual([2, 3]);

		// Another tab that counted further: this one follows it.
		localStorage.setItem(`${KEY}:seq`, "10");
		openApp("D.app");
		await vi.advanceTimersByTimeAsync(500);
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

	it("asks the adapters in order; the first replace wins, and those after it are asked with it (review N5)", async () => {
		const later = vi.fn(
			async (
				local: ClassicyStateSnapshot,
			): Promise<ClassicyStateReconcileResult> =>
				local.state.System.Manager.Appearance.activeTheme.name === "One"
					? { action: "useLocal" }
					: { action: "replace", state: remoteState("Later") },
		);
		const laterSnapshots: ClassicyStateSnapshot[] = [];
		const third = vi.fn(
			async (): Promise<ClassicyStateReconcileResult> => ({
				action: "replace",
				state: remoteState("Third"),
			}),
		);
		const thirdSnapshots: ClassicyStateSnapshot[] = [];
		registerClassicyStateAdapter({
			id: "local",
			reconcile: async () => ({ action: "useLocal" }),
		});
		registerClassicyStateAdapter({
			id: "first",
			reconcile: async () => ({ action: "replace", state: remoteState("One") }),
		});
		registerClassicyStateAdapter({
			id: "later",
			reconcile: later,
			onSnapshot: (snapshot) => {
				laterSnapshots.push(snapshot);
			},
		});
		registerClassicyStateAdapter({
			id: "third",
			reconcile: third,
			onSnapshot: (snapshot) => {
				thirdSnapshots.push(snapshot);
			},
		});
		await expect(reconcileClassicyState()).resolves.toBe(true);
		expect(
			useAppManager.getState().System.Manager.Appearance.activeTheme.name,
		).toBe("One");
		// Asked, with the adopted state: it agrees, and takes snapshots.
		expect(later).toHaveBeenCalledTimes(1);
		// A replace after the winner's is not adopted; it stays held.
		expect(third).toHaveBeenCalledTimes(1);
		expect(
			warnings().some((w) =>
				w.message.includes("answered replace after another adapter's state"),
			),
		).toBe(true);
		openApp("After.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(laterSnapshots).toHaveLength(1);
		expect(thirdSnapshots).toHaveLength(0);
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
		const mirror = collector("mirror");
		registerClassicyStateAdapter({
			id: "both",
			onSnapshot: (snapshot) => {
				snapshots.push(snapshot);
			},
			reconcile: () => answer.promise,
		});
		registerClassicyStateAdapter(mirror.adapter);
		// Before the boot reconcile: the local state must not overwrite the
		// copy it is about to read.
		openApp("Early.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(0);
		expect(mirror.snapshots).toHaveLength(0);
		const done = reconcileClassicyState();
		openApp("During.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(0);
		expect(mirror.snapshots).toHaveLength(0);
		answer.resolve({ action: "replace", state: remoteState() });
		await done;
		await vi.advanceTimersByTimeAsync(500);
		// The adopted state goes to the other adapter, not back to the one it
		// came from (review M6).
		expect(snapshots).toHaveLength(0);
		expect(mirror.snapshots).toHaveLength(1);
		expect(
			mirror.snapshots[0].state.System.Manager.Appearance.activeTheme.name,
		).toBe("Remote Theme");
		// A real change afterwards goes to both.
		openApp("After.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(1);
		expect(mirror.snapshots).toHaveLength(2);
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

/** The saved clock's virtual time, in ms. */
const virtualNow = () =>
	Date.parse(useAppManager.getState().System.Manager.DateAndTime.dateTime);

/** The menu bar clock's minute tick, as the widget dispatches it. */
const tick = (date: Date) => {
	noteClassicyClockTick(date);
	dispatch({ type: "ClassicyManagerDateTimeSet", dateTime: date });
};

describe("the clock's minute tick (review I1)", () => {
	it("an idle desktop sends nothing over several minutes; a real edit still sends", async () => {
		const { adapter, snapshots } = collector();
		registerClassicyStateAdapter(adapter);
		openApp("A.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(1);
		const firstSeq = snapshots[0].seq;
		let virtual = virtualNow();
		for (let minute = 0; minute < 5; minute++) {
			await vi.advanceTimersByTimeAsync(60_000);
			virtual += 60_000;
			tick(new Date(virtual));
		}
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(1);
		openApp("Edit.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(2);
		// The ticks moved no seq; the snapshot carries the clock as it is.
		expect(snapshots[1].seq).toBe(firstSeq + 1);
		expect(
			Date.parse(snapshots[1].state.System.Manager.DateAndTime.dateTime),
		).toBe(virtual);
		expect(snapshots[1].hash).toBe(
			classicySha256Hex(JSON.stringify(snapshots[1].state)),
		);
	});

	it("the clock's tick is no change though the clock started late (a desktop drawn after a slow boot)", async () => {
		const { adapter, snapshots } = collector();
		registerClassicyStateAdapter(adapter);
		openApp("A.app");
		await vi.advanceTimersByTimeAsync(500);
		// The menu bar clock anchors the saved time when it mounts, here 3 s
		// after the page saw it: its ticks run 3 s behind the real time.
		const virtual = virtualNow();
		await vi.advanceTimersByTimeAsync(62_500);
		tick(new Date(virtual + 60_000));
		await vi.advanceTimersByTimeAsync(60_000);
		tick(new Date(virtual + 120_000));
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(1);
	});

	it("a host running the clock at real speed is no change either", async () => {
		const { adapter, snapshots } = collector();
		registerClassicyStateAdapter(adapter);
		openApp("A.app");
		await vi.advanceTimersByTimeAsync(500);
		let virtual = virtualNow();
		for (let step = 0; step < 3; step++) {
			await vi.advanceTimersByTimeAsync(20_000);
			virtual += 20_000;
			dispatch({
				type: "ClassicyManagerDateTimeSet",
				dateTime: new Date(virtual),
			});
		}
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(1);
	});

	it("an edit of the clock is a change", async () => {
		const { adapter, snapshots } = collector();
		registerClassicyStateAdapter(adapter);
		openApp("A.app");
		await vi.advanceTimersByTimeAsync(500);
		dispatch({
			type: "ClassicyManagerDateTimeSet",
			dateTime: new Date(virtualNow() + 3_600_000),
		});
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(2);
		expect(snapshots[1].seq).toBe(snapshots[0].seq + 1);
	});
});

describe("an adapter whose reconcile failed (review C1)", () => {
	it("takes no snapshot until a retry succeeds", async () => {
		const snapshots: ClassicyStateSnapshot[] = [];
		const reconcile = vi
			.fn<() => Promise<ClassicyStateReconcileResult>>()
			.mockRejectedValueOnce(new Error("500"))
			.mockResolvedValue({ action: "useLocal" });
		registerClassicyStateAdapter({
			id: "remote",
			reconcile,
			onSnapshot: (snapshot) => {
				snapshots.push(snapshot);
			},
		});
		await expect(reconcileClassicyState()).resolves.toBe(false);
		openApp("Defaults.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(0);
		await vi.advanceTimersByTimeAsync(10_000 - 500);
		expect(reconcile).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(1);
		expect(
			snapshots[0].state.System.Manager.Applications.apps["Defaults.app"],
		).toBeDefined();
	});

	it("after a timeout too; a replace on the retry is adopted and not sent back", async () => {
		const snapshots: ClassicyStateSnapshot[] = [];
		const reconcile = vi
			.fn<() => Promise<ClassicyStateReconcileResult>>()
			.mockReturnValueOnce(new Promise(() => {}))
			.mockResolvedValue({ action: "replace", state: remoteState() });
		registerClassicyStateAdapter({
			id: "remote",
			reconcile,
			onSnapshot: (snapshot) => {
				snapshots.push(snapshot);
			},
		});
		const boot = reconcileClassicyState();
		await vi.advanceTimersByTimeAsync(5000);
		await expect(boot).resolves.toBe(false);
		openApp("Defaults.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(0);
		// The retry, 10 s after the failure, adopts the account's copy.
		await vi.advanceTimersByTimeAsync(9500);
		expect(reconcile).toHaveBeenCalledTimes(2);
		expect(
			useAppManager.getState().System.Manager.Appearance.activeTheme.name,
		).toBe("Remote Theme");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(0);
		openApp("After.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(1);
	});

	it("is asked again twice as late after each failure", async () => {
		const reconcile = vi.fn(() => Promise.reject(new Error("down")));
		registerClassicyStateAdapter({ id: "down", reconcile });
		await reconcileClassicyState();
		expect(reconcile).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(10_000);
		expect(reconcile).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(19_999);
		expect(reconcile).toHaveBeenCalledTimes(2);
		await vi.advanceTimersByTimeAsync(1);
		expect(reconcile).toHaveBeenCalledTimes(3);
		await vi.advanceTimersByTimeAsync(40_000);
		expect(reconcile).toHaveBeenCalledTimes(4);
	});

	it("an invalid replace holds it too", async () => {
		const snapshots: ClassicyStateSnapshot[] = [];
		registerClassicyStateAdapter({
			id: "corrupt",
			reconcile: async () => ({ action: "replace", state: {} as never }),
			onSnapshot: (snapshot) => {
				snapshots.push(snapshot);
			},
		});
		await reconcileClassicyState();
		openApp("Local.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(0);
	});

	it("a later failed reconcile holds it again", async () => {
		const snapshots: ClassicyStateSnapshot[] = [];
		const reconcile = vi
			.fn<() => Promise<ClassicyStateReconcileResult>>()
			.mockResolvedValueOnce({ action: "useLocal" })
			.mockRejectedValue(new Error("401"));
		registerClassicyStateAdapter({
			id: "remote",
			reconcile,
			onSnapshot: (snapshot) => {
				snapshots.push(snapshot);
			},
		});
		await reconcileClassicyState();
		openApp("A.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(1);
		// A sign-in whose reconcile fails: this device's state stays here.
		await reconcileClassicyState();
		openApp("B.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(1);
	});

	it("flushClassicyState sends it nothing and resolves false", async () => {
		const onSnapshot = vi.fn();
		registerClassicyStateAdapter({
			id: "remote",
			reconcile: () => Promise.reject(new Error("down")),
			onSnapshot,
		});
		// Before the first reconcile too (review M9a).
		openApp("A.app");
		await expect(flushClassicyState()).resolves.toBe(false);
		await reconcileClassicyState();
		await expect(flushClassicyState()).resolves.toBe(false);
		expect(onSnapshot).not.toHaveBeenCalled();
	});

	it("does not hold an adapter that only takes snapshots", async () => {
		const mirror = collector("mirror");
		registerClassicyStateAdapter({
			id: "remote",
			reconcile: () => Promise.reject(new Error("down")),
		});
		registerClassicyStateAdapter(mirror.adapter);
		await reconcileClassicyState();
		openApp("A.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(mirror.snapshots).toHaveLength(1);
	});

	it("an adapter registered after the first reconcile is asked on its own", async () => {
		await reconcileClassicyState();
		const snapshots: ClassicyStateSnapshot[] = [];
		const reconcile = vi.fn(
			async (): Promise<ClassicyStateReconcileResult> => ({
				action: "useLocal",
			}),
		);
		registerClassicyStateAdapter({
			id: "late",
			reconcile,
			onSnapshot: (snapshot) => {
				snapshots.push(snapshot);
			},
		});
		openApp("A.app");
		await vi.advanceTimersByTimeAsync(0);
		expect(reconcile).toHaveBeenCalledTimes(1);
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(1);
	});
});

describe("deliveries (review M5)", () => {
	it("go one at a time, the latest after the one under way", async () => {
		const calls: ClassicyStateSnapshot[] = [];
		const pending: Array<() => void> = [];
		registerClassicyStateAdapter({
			id: "slow",
			onSnapshot: (snapshot) => {
				calls.push(snapshot);
				return new Promise<void>((resolve) => pending.push(resolve));
			},
		});
		openApp("A.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(calls).toHaveLength(1);
		for (const id of ["B.app", "C.app", "D.app"]) {
			openApp(id);
			await vi.advanceTimersByTimeAsync(500);
		}
		expect(calls).toHaveLength(1);
		pending[0]();
		await vi.advanceTimersByTimeAsync(0);
		expect(calls).toHaveLength(2);
		expect(
			Object.keys(calls[1].state.System.Manager.Applications.apps),
		).toEqual(expect.arrayContaining(["B.app", "C.app", "D.app"]));
		pending[1]();
		await vi.advanceTimersByTimeAsync(500);
		expect(calls).toHaveLength(2);
	});
});

describe("the snapshot's envelope and the page's end", () => {
	it("names the version of Classicy that built it (review M6)", async () => {
		const { adapter, snapshots } = collector();
		registerClassicyStateAdapter(adapter);
		openApp("A.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots[0].version).toBe(packageJson.version);
	});

	it("saves the state in this browser when it sends a snapshot as the page hides (review M8)", () => {
		const { adapter, snapshots } = collector();
		registerClassicyStateAdapter(adapter, { snapshotDebounceMs: 3000 });
		openApp("A.app");
		expect(localStorage.getItem(KEY)).toBeNull();
		window.dispatchEvent(new Event("pagehide"));
		expect(snapshots).toHaveLength(1);
		expect(
			JSON.parse(localStorage.getItem(KEY) ?? "null").System.Manager
				.Applications.apps["A.app"],
		).toBeDefined();
	});

	it("refuses a delay a browser timer cannot wait (review M9e)", async () => {
		const reconcile = vi.fn(() => new Promise<never>(() => {}));
		registerClassicyStateAdapter(
			{ id: "huge", reconcile },
			{ reconcileTimeoutMs: 2 ** 31 },
		);
		expect(
			warnings().some((w) => w.message.includes("reconcileTimeoutMs")),
		).toBe(true);
		let settled = false;
		void reconcileClassicyState().then(() => {
			settled = true;
		});
		await vi.advanceTimersByTimeAsync(10);
		expect(settled).toBe(false);
		await vi.advanceTimersByTimeAsync(4990);
		expect(settled).toBe(true);
	});
});

describe("adopting a remote state", () => {
	it("keeps this browser's file-system epoch (review M9d)", async () => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Desktop.fsVersion = 7;
			}),
		);
		const state = remoteState();
		(state.System.Manager.Desktop as { fsVersion?: number }).fsVersion = 2;
		registerClassicyStateAdapter({
			id: "remote",
			reconcile: async () => ({ action: "replace", state }),
		});
		await expect(reconcileClassicyState()).resolves.toBe(true);
		expect(useAppManager.getState().System.Manager.Desktop.fsVersion).toBe(7);
	});

	it("refuses one whose containers have the wrong kind (review M4)", async () => {
		const base = remoteState();
		const wrong: unknown[] = [
			{
				System: {
					Manager: {
						Applications: { apps: "x" },
						Desktop: 1,
						Appearance: { activeTheme: {} },
					},
				},
			},
			produce(base, (draft) => {
				(draft.System.Manager.Desktop as unknown as { icons: unknown }).icons =
					"x";
			}),
			produce(base, (draft) => {
				(draft.System.Manager.Applications.apps as Record<string, unknown>)[
					"Bad.app"
				] = "x";
			}),
		];
		for (const state of wrong) {
			resetClassicyStateSyncForTests();
			registerClassicyStateAdapter({
				id: "bad",
				reconcile: async () => ({ action: "replace", state }) as never,
			});
			const before = useAppManager.getState();
			await expect(reconcileClassicyState()).resolves.toBe(false);
			expect(useAppManager.getState()).toBe(before);
		}
	});
});

describe("Reset PRAM (reviews M1, M3)", () => {
	it("a second reset neither restarts early nor cuts the first short", async () => {
		const delivery = deferred<void>();
		registerClassicyStateAdapter({
			id: "remote",
			onSnapshot: () => delivery.promise,
		});
		const first = vi.fn();
		const second = vi.fn();
		resetClassicyPersistedState(first);
		resetClassicyPersistedState(second);
		await vi.advanceTimersByTimeAsync(1000);
		expect(first).not.toHaveBeenCalled();
		expect(second).not.toHaveBeenCalled();
		delivery.resolve();
		await vi.advanceTimersByTimeAsync(0);
		expect(first).toHaveBeenCalledTimes(1);
		expect(second).not.toHaveBeenCalled();
	});

	it("leaves no mark and restarts at once when no adapter takes snapshots", () => {
		registerClassicyStateAdapter({
			id: "readOnly",
			reconcile: async () => ({ action: "useLocal" }),
		});
		const restart = vi.fn();
		resetClassicyPersistedState(restart);
		expect(restart).toHaveBeenCalledTimes(1);
		expect(localStorage.getItem(`${KEY}:reset`)).toBeNull();
	});

	it("hands the adapters a first session's state with the provider's seed", async () => {
		rememberClassicyDefaultStateSeed({
			System: { Manager: { Desktop: { disableBalloonHelp: true } } },
		});
		const { adapter, snapshots } = collector();
		registerClassicyStateAdapter(adapter);
		const restart = vi.fn();
		resetClassicyPersistedState(restart);
		await vi.advanceTimersByTimeAsync(0);
		expect(snapshots).toHaveLength(1);
		expect(snapshots[0].state.System.Manager.Desktop.disableBalloonHelp).toBe(
			true,
		);
		expect(restart).toHaveBeenCalledTimes(1);
	});

	it("the boot after it sends its state, its reconcile skipped", async () => {
		const reconcile = vi.fn(
			async (): Promise<ClassicyStateReconcileResult> => ({
				action: "useLocal",
			}),
		);
		const snapshots: ClassicyStateSnapshot[] = [];
		registerClassicyStateAdapter({
			id: "remote",
			reconcile,
			onSnapshot: (snapshot) => {
				snapshots.push(snapshot);
			},
		});
		localStorage.setItem(`${KEY}:reset`, "1");
		await reconcileClassicyState();
		expect(reconcile).not.toHaveBeenCalled();
		openApp("A.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(1);
	});
});

/** The system alert the desktop shows, if any. */
const systemDialog = () =>
	useAppManager.getState().System.Manager.Desktop.systemDialog ?? null;

/** An adapter whose boot reconcile fails, then answers each retry with
 * `answer` (a replace of the account's copy by default). */
function failingAtBoot(
	answer: () => ClassicyStateReconcileResult = () => ({
		action: "replace",
		state: remoteState(),
	}),
) {
	const snapshots: ClassicyStateSnapshot[] = [];
	const contexts: Array<{ reason: string; userActed: boolean }> = [];
	const reconcile = vi.fn(
		async (
			_local: ClassicyStateSnapshot,
			context: { reason: string; userActed: boolean },
		): Promise<ClassicyStateReconcileResult> => {
			contexts.push({ reason: context.reason, userActed: context.userActed });
			if (contexts.length === 1) throw new Error("500");
			return answer();
		},
	);
	registerClassicyStateAdapter({
		id: "remote",
		reconcile,
		onSnapshot: (snapshot) => {
			snapshots.push(snapshot);
		},
	});
	return { snapshots, contexts, reconcile };
}

const themeName = () =>
	useAppManager.getState().System.Manager.Appearance.activeTheme.name;

describe("a retry's replace after the user acted (review R1)", () => {
	it("tells a boot reconcile it is the boot, with no user action (presses before the desktop is drawn do not count)", async () => {
		const contexts: Array<{ reason: string; userActed: boolean }> = [];
		registerClassicyStateAdapter({
			id: "remote",
			reconcile: async (_local, context) => {
				contexts.push({ reason: context.reason, userActed: context.userActed });
				return { action: "replace", state: remoteState() };
			},
		});
		noteClassicyStateUserAction();
		await expect(reconcileClassicyState()).resolves.toBe(true);
		expect(contexts).toEqual([{ reason: "boot", userActed: false }]);
		expect(themeName()).toBe("Remote Theme");
	});

	it("adopts a retry's replace as before when the user has not acted", async () => {
		const { contexts } = failingAtBoot();
		await reconcileClassicyState();
		// A press on the page before the desktop was drawn, or one no user
		// made (an untrusted event), counts for nothing.
		document.dispatchEvent(new Event("pointerdown"));
		document.dispatchEvent(new Event("keydown"));
		await vi.advanceTimersByTimeAsync(10_000);
		expect(contexts[1]).toEqual({ reason: "retry", userActed: false });
		expect(themeName()).toBe("Remote Theme");
		expect(systemDialog()).toBeNull();
	});

	it("asks the user instead, holding the adapter and stopping its timer", async () => {
		const { contexts, snapshots, reconcile } = failingAtBoot();
		await reconcileClassicyState();
		noteClassicyStateUserAction();
		openApp("Work.app");
		await vi.advanceTimersByTimeAsync(10_000);
		expect(contexts[1]).toEqual({ reason: "retry", userActed: true });
		expect(themeName()).not.toBe("Remote Theme");
		expect(systemDialog()).toBe("syncChoice");
		await vi.advanceTimersByTimeAsync(10 * 60_000);
		expect(reconcile).toHaveBeenCalledTimes(2);
		expect(snapshots).toHaveLength(0);
	});

	it("Use Saved adopts the account's copy, and sends it nothing back", async () => {
		const { snapshots } = failingAtBoot();
		await reconcileClassicyState();
		noteClassicyStateUserAction();
		openApp("Work.app");
		await vi.advanceTimersByTimeAsync(10_000);
		resolveClassicyStateChoice("adopt");
		expect(themeName()).toBe("Remote Theme");
		expect(
			useAppManager.getState().System.Manager.Applications.apps["Work.app"],
		).toBeUndefined();
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(0);
		openApp("After.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(1);
	});

	it("Keep Current sends this desktop, and the adapter takes snapshots", async () => {
		const { snapshots } = failingAtBoot();
		await reconcileClassicyState();
		noteClassicyStateUserAction();
		openApp("Work.app");
		await vi.advanceTimersByTimeAsync(10_000);
		resolveClassicyStateChoice("keep");
		expect(themeName()).not.toBe("Remote Theme");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(1);
		expect(
			snapshots[0].state.System.Manager.Applications.apps["Work.app"],
		).toBeDefined();
	});

	it("adopts a merged replace without asking", async () => {
		const { contexts } = failingAtBoot(() => ({
			action: "replace",
			state: remoteState("Merged"),
			merged: true,
		}));
		await reconcileClassicyState();
		noteClassicyStateUserAction();
		await vi.advanceTimersByTimeAsync(10_000);
		expect(contexts[1].userActed).toBe(true);
		expect(themeName()).toBe("Merged");
		expect(systemDialog()).toBeNull();
	});

	it("a host's request adopts as before, telling it the user acted", async () => {
		const contexts: Array<{ reason: string; userActed: boolean }> = [];
		registerClassicyStateAdapter({
			id: "remote",
			reconcile: async (_local, context) => {
				contexts.push({ reason: context.reason, userActed: context.userActed });
				return contexts.length === 1
					? { action: "useLocal" }
					: { action: "replace", state: remoteState() };
			},
		});
		await reconcileClassicyState();
		noteClassicyStateUserAction();
		await expect(reconcileClassicyState()).resolves.toBe(true);
		expect(contexts[1]).toEqual({ reason: "request", userActed: true });
		expect(themeName()).toBe("Remote Theme");
		expect(systemDialog()).toBeNull();
	});

	it("waits for another alert to close before asking", async () => {
		failingAtBoot();
		await reconcileClassicyState();
		noteClassicyStateUserAction();
		dispatch({ type: "ClassicyDesktopShowSystemDialog", dialog: "emptyTrash" });
		await vi.advanceTimersByTimeAsync(10_000);
		expect(systemDialog()).toBe("emptyTrash");
		dispatch({ type: "ClassicyDesktopShowSystemDialog", dialog: null });
		expect(systemDialog()).toBe("syncChoice");
	});

	it("a host's request while the user is asked settles it and closes the alert", async () => {
		let answer: ClassicyStateReconcileResult = {
			action: "replace",
			state: remoteState(),
		};
		const { snapshots } = failingAtBoot(() => answer);
		await reconcileClassicyState();
		noteClassicyStateUserAction();
		openApp("Work.app");
		await vi.advanceTimersByTimeAsync(10_000);
		expect(systemDialog()).toBe("syncChoice");
		answer = { action: "useLocal" };
		await reconcileClassicyState();
		expect(systemDialog()).toBeNull();
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots).toHaveLength(1);
		// A late answer from the closed alert does nothing.
		resolveClassicyStateChoice("adopt");
		expect(themeName()).not.toBe("Remote Theme");
	});
});

describe("review round 2 (N1-N6)", () => {
	it("a host clock run fast in small steps is a change (N1)", async () => {
		const { adapter, snapshots } = collector();
		registerClassicyStateAdapter(adapter);
		openApp("A.app");
		await vi.advanceTimersByTimeAsync(500);
		let virtual = virtualNow();
		for (let step = 0; step < 10; step++) {
			await vi.advanceTimersByTimeAsync(1000);
			virtual += 2000;
			dispatch({
				type: "ClassicyManagerDateTimeSet",
				dateTime: new Date(virtual),
			});
		}
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots.length).toBeGreaterThan(1);
	});

	it("a snapshot due as the page hides goes at once, past a delivery under way (N2)", async () => {
		const calls: ClassicyStateSnapshot[] = [];
		registerClassicyStateAdapter({
			id: "slow",
			onSnapshot: (snapshot) => {
				calls.push(snapshot);
				return new Promise<void>(() => {});
			},
		});
		openApp("A.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(calls).toHaveLength(1);
		// Due on its debounce...
		openApp("B.app");
		window.dispatchEvent(new Event("pagehide"));
		expect(calls).toHaveLength(2);
		expect(
			calls[1].state.System.Manager.Applications.apps["B.app"],
		).toBeDefined();
		// ...or already waiting behind the one under way.
		openApp("C.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(calls).toHaveLength(2);
		window.dispatchEvent(new Event("pagehide"));
		expect(calls).toHaveLength(3);
		expect(
			calls[2].state.System.Manager.Applications.apps["C.app"],
		).toBeDefined();
	});

	it("seq does not grow on another tab's stored state (N3)", async () => {
		const { adapter, snapshots } = collector();
		registerClassicyStateAdapter(adapter);
		openApp("A.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots.map((s) => s.seq)).toEqual([1]);
		// Another tab saved its own state, numbered 5.
		localStorage.setItem(`${KEY}:seq`, "5");
		localStorage.setItem(`${KEY}:seqContent`, "another tab's");
		// This tab's clock ticks: its saved state is unchanged.
		tick(new Date(virtualNow() + 60_000));
		await vi.advanceTimersByTimeAsync(500);
		openApp("B.app");
		await vi.advanceTimersByTimeAsync(500);
		expect(snapshots.at(-1)?.seq).toBe(6);
	});

	it("a host's request while Classicy retries runs after it, in full (N4)", async () => {
		const answer = deferred<ClassicyStateReconcileResult>();
		const reasons: string[] = [];
		registerClassicyStateAdapter({
			id: "remote",
			reconcile: (_local, context) => {
				reasons.push(context.reason);
				if (reasons.length === 1) return Promise.reject(new Error("500"));
				if (reasons.length === 2) return answer.promise;
				return Promise.resolve({ action: "useLocal" });
			},
		});
		await reconcileClassicyState();
		await vi.advanceTimersByTimeAsync(10_000);
		expect(reasons).toEqual(["boot", "retry"]);
		const request = reconcileClassicyState();
		answer.resolve({ action: "useLocal" });
		await expect(request).resolves.toBe(false);
		expect(reasons).toEqual(["boot", "retry", "request"]);
	});

	it("refuses a remote state with malformed icon or theme records, and heals its windows as a load does (N6)", async () => {
		const base = remoteState();
		const refused: unknown[] = [
			produce(base, (draft) => {
				(draft.System.Manager.Desktop as unknown as { icons: unknown }).icons =
					[null];
			}),
			produce(base, (draft) => {
				(
					draft.System.Manager.Appearance as unknown as {
						customThemes: unknown;
					}
				).customThemes = [1];
			}),
			produce(base, (draft) => {
				(
					draft.System.Manager.Appearance as unknown as {
						customThemes: unknown;
					}
				).customThemes = ["x"];
			}),
		];
		for (const state of refused) {
			resetClassicyStateSyncForTests();
			registerClassicyStateAdapter({
				id: "bad",
				reconcile: async () => ({ action: "replace", state }) as never,
			});
			await expect(reconcileClassicyState()).resolves.toBe(false);
		}
		for (const windows of ["x", { w: null }]) {
			resetClassicyStateSyncForTests();
			const state = produce(base, (draft) => {
				(
					draft.System.Manager.Applications.apps["Remote.app"] as unknown as {
						windows: unknown;
					}
				).windows = windows;
			});
			registerClassicyStateAdapter({
				id: "healed",
				reconcile: async () => ({ action: "replace", state }) as never,
			});
			await expect(reconcileClassicyState()).resolves.toBe(true);
			expect(
				useAppManager.getState().System.Manager.Applications.apps["Remote.app"]
					.windows,
			).toEqual({});
		}
	});
});
