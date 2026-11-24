import { useEffect, useSyncExternalStore } from "react";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import {
	classicySha256Hex,
	invokeClassicyAdapterHook,
} from "@/SystemFolder/SystemResources/Utils/ClassicySyncAdapterHook.internal";
import type { ClassicyStore, DeepPartial } from "./ClassicyAppManager";
import {
	adoptPersistedClassicyState,
	CLASSICY_DESKTOP_STATE_STORAGE_KEY,
	classicyFirstSessionState,
	persistAppManagerStateNow,
	sanitizeStateForPersistence,
	stopAppManagerPersistence,
	useAppManager,
} from "./ClassicyAppManagerUtils";

/**
 * Desktop state storage adapters (story 0229-ymq): a host mirrors the
 * desktop state (`localStorage["classicyDesktopState"]`) to a backend of its
 * choosing, and restores it at boot, as `registerClassicyFileSystemAdapter`
 * does for the file system (ClassicyFileSystemAdapter.ts). localStorage stays
 * the primary store; with no adapter registered nothing here runs.
 *
 * The public surface is re-exported by ClassicyStateAdapter.ts; the desktop's
 * gate (`useClassicyStateSyncGate`) and Reset PRAM's
 * (`resetClassicyPersistedState`) stay here.
 */

const SUBSYSTEM = "ClassicyStateAdapter";
// Read when used, never while this module loads: a test may mock the
// store's module without them (nothing here runs at import).
const seqKey = () => `${CLASSICY_DESKTOP_STATE_STORAGE_KEY}:seq`;
const hashKey = () => `${CLASSICY_DESKTOP_STATE_STORAGE_KEY}:hash`;
const resetKey = () => `${CLASSICY_DESKTOP_STATE_STORAGE_KEY}:reset`;

/** The default `snapshotDebounceMs`: the localStorage write's own delay. */
export const CLASSICY_STATE_DEFAULT_SNAPSHOT_DEBOUNCE_MS = 500;

/**
 * The default `reconcileTimeoutMs`: how long the desktop waits for an
 * adapter's `reconcile` before it keeps the local state. Also the longest
 * Reset PRAM waits for the adapters to take the reset state.
 */
export const CLASSICY_STATE_DEFAULT_RECONCILE_TIMEOUT_MS = 5000;

export interface ClassicyStateSnapshot {
	/**
	 * The desktop state as it is saved: `sanitizeStateForPersistence`'s
	 * output, the same JSON `localStorage["classicyDesktopState"]` holds, as a
	 * fresh copy. It never holds a built-in theme (a built-in active theme is
	 * its reference, `{ id, package }`) or session state.
	 */
	state: ClassicyStore;
	/** sha256 hex of the serialized `state` (divergence check). */
	hash: string;
	/**
	 * The version of the saved state in this browser: one more each time a
	 * snapshot's `hash` differs from the last one's, persisted in
	 * `localStorage["classicyDesktopState:seq"]`, so it only grows across
	 * reloads. Ordered within one browser, not across devices.
	 */
	seq: number;
	/** `"classicyDesktopState"`. */
	storageKey: string;
	/** ISO 8601. */
	timestamp: string;
}

export type ClassicyStateReconcileResult =
	| { action: "useLocal" }
	| {
			action: "replace";
			/**
			 * Saved desktop state, typically an earlier snapshot's `state`:
			 * loaded exactly as a saved state from localStorage (merged over
			 * the defaults, migrated, so an older build's state is upgraded).
			 * A value without the saved shape is refused, keeping local.
			 * (`ClassicyStore` is listed first: checked against the deep
			 * partial alone, a whole store is too deep for the compiler.)
			 */
			state: ClassicyStore | DeepPartial<ClassicyStore>;
	  };

export interface ClassicyStateReconcileContext {
	/**
	 * Aborted when the adapter's `reconcileTimeoutMs` runs out: its answer is
	 * ignored from then on, so it may cancel its requests.
	 */
	signal: AbortSignal;
}

export interface ClassicyStateAdapter {
	id: string;
	/**
	 * Snapshot mode: called with the saved state a debounce after it changes;
	 * never twice in a row with the same `hash`, unless the delivery failed.
	 */
	onSnapshot?(snapshot: ClassicyStateSnapshot): void | Promise<void>;
	/**
	 * Two-way boot sync: return `useLocal` to keep the local state, or
	 * `replace` with saved state to adopt. Bounded by `reconcileTimeoutMs`;
	 * an error, a timeout or an invalid state keeps local.
	 */
	reconcile?(
		local: ClassicyStateSnapshot,
		context: ClassicyStateReconcileContext,
	): Promise<ClassicyStateReconcileResult>;
}

export interface ClassicyStateAdapterOptions {
	/** Delay after the last change before `onSnapshot` (default 500 ms). */
	snapshotDebounceMs?: number;
	/** The longest `reconcile` may take (default 5000 ms; finite, above 0). */
	reconcileTimeoutMs?: number;
}

type RegisteredStateAdapter = {
	adapter: ClassicyStateAdapter;
	snapshotDebounceMs: number;
	reconcileTimeoutMs: number;
	/** The hash last handed to `onSnapshot`, forgotten if that delivery failed. */
	sentHash?: string;
};

const registry = new Map<string, RegisteredStateAdapter>();

/** `value` when it is a finite number of at least `min` (above it when
 * `exclusive`), else `fallback`, with a warning when one was given. */
const validMs = (
	value: number | undefined,
	fallback: number,
	option: string,
	id: string,
	exclusive: boolean,
): number => {
	if (value === undefined) return fallback;
	if (
		typeof value === "number" &&
		Number.isFinite(value) &&
		(exclusive ? value > 0 : value >= 0)
	) {
		return value;
	}
	classicyLog(
		"warn",
		SUBSYSTEM,
		`adapter "${id}": ${option} must be a finite number ${exclusive ? "above" : "of at least"} 0; using ${fallback} ms`,
		{ value },
	);
	return fallback;
};

const hasSnapshotAdapter = (): boolean =>
	[...registry.values()].some((entry) => !!entry.adapter.onSnapshot);

const hasReconcilingAdapter = (): boolean =>
	[...registry.values()].some((entry) => !!entry.adapter.reconcile);

/** The shared snapshot timer's delay: the shortest registered debounce. */
const snapshotDebounceMs = (): number => {
	const delays = [...registry.values()]
		.filter((entry) => entry.adapter.onSnapshot)
		.map((entry) => entry.snapshotDebounceMs);
	return delays.length
		? Math.min(...delays)
		: CLASSICY_STATE_DEFAULT_SNAPSHOT_DEBOUNCE_MS;
};

// ---------------------------------------------------------------------------
// seq: the saved state's version in this browser
// ---------------------------------------------------------------------------

let seq = 0;
let lastHash: string | undefined;

/** The stored `{ seq, hash }`, or undefined without a window or storage. */
const readStoredSeq = (): { seq: number; hash: string | null } | undefined => {
	if (typeof window === "undefined") return undefined;
	try {
		const stored = Number(localStorage.getItem(seqKey()));
		return {
			seq: Number.isFinite(stored) && stored > 0 ? stored : 0,
			hash: localStorage.getItem(hashKey()),
		};
	} catch {
		return undefined;
	}
};

/** The seq of a snapshot with `hash`: the current one when the saved state
 * is unchanged, else one more, persisted with its hash. */
const seqFor = (hash: string): number => {
	const stored = readStoredSeq();
	const current = Math.max(seq, stored?.seq ?? 0);
	const previous = stored ? stored.hash : lastHash;
	lastHash = hash;
	if (current > 0 && hash === previous) {
		seq = current;
		return seq;
	}
	seq = current + 1;
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(seqKey(), String(seq));
			localStorage.setItem(hashKey(), hash);
		} catch {
			// No storage: seq stays in memory.
		}
	}
	return seq;
};

/** The snapshot of `state` (the live state by default): sanitized, hashed
 * and sequenced. */
const buildSnapshot = (
	state: ClassicyStore = useAppManager.getState(),
): ClassicyStateSnapshot => {
	const serialized = JSON.stringify(sanitizeStateForPersistence(state));
	const hash = classicySha256Hex(serialized);
	return {
		state: JSON.parse(serialized) as ClassicyStore,
		hash,
		seq: seqFor(hash),
		storageKey: CLASSICY_DESKTOP_STATE_STORAGE_KEY,
		timestamp: new Date().toISOString(),
	};
};

// ---------------------------------------------------------------------------
// Boot reconcile and the desktop's gate
// ---------------------------------------------------------------------------

/**
 * The page's first reconcile: `idle` until the desktop first mounts on the
 * client (or the host calls `reconcileClassicyState`), `pending` while it
 * runs, then `settled`. The desktop waits only for this one.
 */
let bootPhase: "idle" | "pending" | "settled" = "idle";
let inflight: Promise<boolean> | null = null;
/** One more on every adopted state: the desktop remounts under it. */
let epoch = 0;
/** A snapshot came due while a reconcile held snapshots back. */
let snapshotHeld = false;
/** Reset PRAM is under way: nothing more is sent, the page reloads. */
let resetting = false;

export type ClassicyStateSyncGate = { ready: boolean; epoch: number };

const gateListeners = new Set<() => void>();
let gate: ClassicyStateSyncGate = { ready: true, epoch: 0 };
const SERVER_GATE: ClassicyStateSyncGate = { ready: true, epoch: 0 };

const gateReady = (): boolean =>
	bootPhase === "settled" || (bootPhase === "idle" && !hasReconcilingAdapter());

const getGate = (): ClassicyStateSyncGate => {
	const ready = gateReady();
	if (ready !== gate.ready || epoch !== gate.epoch) gate = { ready, epoch };
	return gate;
};

const emitGate = (): void => {
	for (const listener of [...gateListeners]) listener();
};

const subscribeGate = (listener: () => void): (() => void) => {
	gateListeners.add(listener);
	return () => gateListeners.delete(listener);
};

/** Snapshots wait while a reconcile runs, and before the first one while an
 * adapter will reconcile: a snapshot of the local state sent first would
 * overwrite the copy the reconcile is about to read. */
const holdingSnapshots = (): boolean =>
	inflight !== null || (bootPhase !== "settled" && hasReconcilingAdapter());

/** The Reset PRAM mark, removed: true when the last session reset. */
const takeResetMark = (): boolean => {
	if (typeof window === "undefined") return false;
	try {
		const marked = localStorage.getItem(resetKey()) !== null;
		if (marked) localStorage.removeItem(resetKey());
		return marked;
	} catch {
		return false;
	}
};

const settle = (): void => {
	inflight = null;
	bootPhase = "settled";
	if (snapshotHeld) {
		snapshotHeld = false;
		scheduleSnapshot();
	}
	emitGate();
};

const TIMED_OUT = Symbol("timed out");

/** One adapter's answer, bounded by its timeout: the state to adopt, or
 * undefined to keep local (useLocal, an error or a timeout, logged). */
async function askAdapter(
	entry: RegisteredStateAdapter,
	local: ClassicyStateSnapshot,
): Promise<{ state: unknown } | undefined> {
	const { adapter, reconcileTimeoutMs } = entry;
	const controller = new AbortController();
	let timer: ReturnType<typeof setTimeout> | undefined;
	try {
		const answer = await Promise.race([
			new Promise<ClassicyStateReconcileResult | undefined>((resolve) => {
				resolve(adapter.reconcile?.(local, { signal: controller.signal }));
			}),
			new Promise<typeof TIMED_OUT>((resolve) => {
				timer = setTimeout(() => resolve(TIMED_OUT), reconcileTimeoutMs);
			}),
		]);
		if (answer === TIMED_OUT) {
			controller.abort();
			classicyLog(
				"warn",
				SUBSYSTEM,
				`adapter "${adapter.id}" did not answer reconcile within ${reconcileTimeoutMs} ms; keeping the local state`,
			);
			return undefined;
		}
		return answer?.action === "replace" ? { state: answer.state } : undefined;
	} catch (error) {
		classicyLog(
			"warn",
			SUBSYSTEM,
			`adapter "${adapter.id}" failed in reconcile; keeping the local state`,
			error,
		);
		return undefined;
	} finally {
		clearTimeout(timer);
	}
}

/** Offer the local snapshot to each reconciling adapter in registration
 * order; the first valid `replace` is adopted. True iff one was. */
async function reconcileWithAdapters(
	entries: RegisteredStateAdapter[],
): Promise<boolean> {
	const local = buildSnapshot();
	for (const entry of entries) {
		if (registry.get(entry.adapter.id) !== entry) continue;
		const answer = await askAdapter(entry, local);
		if (!answer || resetting) continue;
		if (adoptPersistedClassicyState(answer.state)) {
			epoch += 1;
			return true;
		}
		classicyLog(
			"warn",
			SUBSYSTEM,
			`adapter "${entry.adapter.id}" reconcile returned an invalid state; keeping the local state`,
		);
	}
	return false;
}

/**
 * Two-way sync: offer the local snapshot to every adapter implementing
 * `reconcile`, in registration order, each bounded by its
 * `reconcileTimeoutMs`; the first valid `replace` is adopted (saved, and
 * applied as a restart: the desktop remounts). Resolves true iff the state
 * was replaced; never rejects. A call while one runs gets that one's promise.
 *
 * The desktop runs the first one when it first mounts, drawing nothing until
 * it settles; call it again when the remote copy may have changed (a user
 * signing in). Snapshots wait while it runs. The boot after Reset PRAM keeps
 * its reset state: that first one is skipped.
 */
export function reconcileClassicyState(): Promise<boolean> {
	if (typeof window === "undefined") return Promise.resolve(false);
	if (inflight) return inflight;
	if (bootPhase === "idle" && takeResetMark()) {
		classicyLog(
			"info",
			SUBSYSTEM,
			"Reset PRAM: this boot keeps the reset state and does not reconcile",
		);
		settle();
		return Promise.resolve(false);
	}
	const entries = [...registry.values()].filter(
		(entry) => entry.adapter.reconcile,
	);
	if (entries.length === 0) {
		settle();
		return Promise.resolve(false);
	}
	if (bootPhase === "idle") bootPhase = "pending";
	const run = reconcileWithAdapters(entries).then(
		(replaced) => {
			settle();
			return replaced;
		},
		(error) => {
			classicyLog(
				"warn",
				SUBSYSTEM,
				"reconcile failed; keeping the local state",
				error,
			);
			settle();
			return false;
		},
	);
	inflight = run;
	emitGate();
	return run;
}

/** The desktop's first client mount: run the boot reconcile, once a page. */
export function startClassicyBootStateReconcile(): void {
	if (bootPhase !== "idle" || typeof window === "undefined") return;
	void reconcileClassicyState();
}

/**
 * The desktop's gate: `ready` is false while the page's first reconcile
 * runs (or is about to, an adapter implementing `reconcile` being
 * registered), so the desktop draws its empty shell meanwhile, for at most
 * the adapters' `reconcileTimeoutMs`; `epoch` grows with every adopted
 * state, and keys the desktop's subtree, so it remounts as on a restart.
 * Starts the boot reconcile on mount.
 */
export function useClassicyStateSyncGate(): ClassicyStateSyncGate {
	const current = useSyncExternalStore(
		subscribeGate,
		getGate,
		() => SERVER_GATE,
	);
	useEffect(() => {
		startClassicyBootStateReconcile();
	}, []);
	return current;
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribeStore: (() => void) | null = null;
let pagehideAttached = false;

/** Hand `snapshot` to every adapter implementing `onSnapshot` whose last
 * one had another hash. True when every delivery succeeded. */
function deliverSnapshot(snapshot: ClassicyStateSnapshot): Promise<boolean> {
	const deliveries = [...registry.values()]
		.filter((entry) => entry.adapter.onSnapshot)
		.map((entry) => {
			if (entry.sentHash === snapshot.hash) return Promise.resolve(true);
			entry.sentHash = snapshot.hash;
			return invokeClassicyAdapterHook(
				SUBSYSTEM,
				entry.adapter,
				"onSnapshot",
				entry.adapter.onSnapshot,
				snapshot,
			).then((delivered) => {
				// Failed: forget it, so the next change sends again.
				if (!delivered && entry.sentHash === snapshot.hash) {
					entry.sentHash = undefined;
				}
				return delivered;
			});
		});
	return Promise.all(deliveries).then((results) => results.every(Boolean));
}

function deliverDueSnapshot(): void {
	snapshotTimer = null;
	if (resetting || !hasSnapshotAdapter()) return;
	if (holdingSnapshots()) {
		snapshotHeld = true;
		return;
	}
	void deliverSnapshot(buildSnapshot());
}

function scheduleSnapshot(): void {
	if (resetting || !hasSnapshotAdapter()) return;
	if (snapshotTimer !== null) clearTimeout(snapshotTimer);
	snapshotTimer = setTimeout(deliverDueSnapshot, snapshotDebounceMs());
	// A snapshot still waiting when the tab closes is sent then, best-effort
	// (an async delivery may not finish), as the file system's is.
	if (!pagehideAttached) {
		pagehideAttached = true;
		window.addEventListener("pagehide", () => {
			if (snapshotTimer === null) return;
			clearTimeout(snapshotTimer);
			deliverDueSnapshot();
		});
	}
}

const onStoreChange = (): void => {
	// No window, no snapshot: a server's store is no user's desktop (and a
	// timer there would outlive the request), as the localStorage write.
	if (typeof window === "undefined") return;
	scheduleSnapshot();
};

/**
 * Register a desktop state adapter at app entry, before rendering (as
 * `registerClassicyFileSystemAdapter`). Capability-based: `onSnapshot`,
 * `reconcile`, either or both. Re-registering an id replaces it.
 */
export function registerClassicyStateAdapter(
	adapter: ClassicyStateAdapter,
	options?: ClassicyStateAdapterOptions,
): void {
	registry.set(adapter.id, {
		adapter,
		snapshotDebounceMs: validMs(
			options?.snapshotDebounceMs,
			CLASSICY_STATE_DEFAULT_SNAPSHOT_DEBOUNCE_MS,
			"snapshotDebounceMs",
			adapter.id,
			false,
		),
		reconcileTimeoutMs: validMs(
			options?.reconcileTimeoutMs,
			CLASSICY_STATE_DEFAULT_RECONCILE_TIMEOUT_MS,
			"reconcileTimeoutMs",
			adapter.id,
			true,
		),
	});
	unsubscribeStore ??= useAppManager.subscribe(onStoreChange);
	emitGate();
}

export function unregisterClassicyStateAdapter(id: string): void {
	if (!registry.delete(id)) return;
	if (registry.size === 0) {
		unsubscribeStore?.();
		unsubscribeStore = null;
		if (snapshotTimer !== null) clearTimeout(snapshotTimer);
		snapshotTimer = null;
		snapshotHeld = false;
	}
	emitGate();
}

export function getClassicyStateAdapters(): ClassicyStateAdapter[] {
	return [...registry.values()].map((entry) => entry.adapter);
}

/**
 * Save now: write the desktop state to localStorage and hand its snapshot
 * to every adapter, canceling the pending debounce (after any reconcile
 * running). Resolves once every `onSnapshot` has settled: true when all
 * succeeded (or had this hash already). For a host about to sign the user
 * out or leave the page; it waits as long as the adapters do.
 */
export async function flushClassicyState(): Promise<boolean> {
	if (typeof window === "undefined" || resetting) return true;
	persistAppManagerStateNow();
	if (snapshotTimer !== null) {
		clearTimeout(snapshotTimer);
		snapshotTimer = null;
	}
	if (inflight) await inflight;
	if (!hasSnapshotAdapter()) return true;
	return deliverSnapshot(buildSnapshot());
}

/**
 * Special ▸ Reset PRAM: stop saving, forget the saved desktop state, mark the
 * next boot to keep its reset state rather than reconcile it away, and hand
 * the adapters a snapshot of a first session's state, so their copy resets
 * too (as Drive Setup's Initialize hands them the erased tree). Then calls
 * `restart` (the caller reloads): at once with no adapter implementing
 * `onSnapshot`, else once they took it, or after
 * `CLASSICY_STATE_DEFAULT_RECONCILE_TIMEOUT_MS`.
 */
export function resetClassicyPersistedState(restart: () => void): void {
	resetting = true;
	if (snapshotTimer !== null) clearTimeout(snapshotTimer);
	snapshotTimer = null;
	// A write still to come would bring the forgotten state back.
	stopAppManagerPersistence();
	if (typeof window !== "undefined") {
		try {
			localStorage.removeItem(CLASSICY_DESKTOP_STATE_STORAGE_KEY);
			if (registry.size > 0) localStorage.setItem(resetKey(), "1");
		} catch (error) {
			classicyLog(
				"warn",
				SUBSYSTEM,
				"Reset PRAM could not clear the saved desktop state",
				error,
			);
		}
	}
	if (typeof window === "undefined" || !hasSnapshotAdapter()) {
		restart();
		return;
	}
	let timer: ReturnType<typeof setTimeout> | undefined;
	let restarted = false;
	const once = () => {
		if (restarted) return;
		restarted = true;
		clearTimeout(timer);
		restart();
	};
	timer = setTimeout(once, CLASSICY_STATE_DEFAULT_RECONCILE_TIMEOUT_MS);
	void deliverSnapshot(buildSnapshot(classicyFirstSessionState())).then(once);
}

/** Tests: forget every adapter and start the page over. @internal */
export function resetClassicyStateSyncForTests(): void {
	registry.clear();
	unsubscribeStore?.();
	unsubscribeStore = null;
	if (snapshotTimer !== null) clearTimeout(snapshotTimer);
	snapshotTimer = null;
	bootPhase = "idle";
	inflight = null;
	epoch = 0;
	snapshotHeld = false;
	resetting = false;
	seq = 0;
	lastHash = undefined;
	emitGate();
}
