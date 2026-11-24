import { useEffect, useSyncExternalStore } from "react";
import { isClassicyClockTick } from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyClockTick.internal";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import {
	classicySha256Hex,
	invokeClassicyAdapterHook,
} from "@/SystemFolder/SystemResources/Utils/ClassicySyncAdapterHook.internal";
import packageJson from "../../../../package.json";
import type { ClassicyStore, DeepPartial } from "./ClassicyAppManager";
import {
	adoptPersistedClassicyState,
	CLASSICY_DESKTOP_STATE_STORAGE_KEY,
	classicyFirstSessionState,
	persistAppManagerStateNow,
	persistPendingAppManagerState,
	sanitizeStateForPersistence,
	stopAppManagerPersistence,
	useAppManager,
} from "./ClassicyAppManagerUtils";
import { rememberedClassicyDefaultStateSeed } from "./ClassicyDefaultStateSeed.internal";

/**
 * Desktop state storage adapters (story 0229-ymq): a host mirrors the
 * desktop state (`localStorage["classicyDesktopState"]`) to a backend of its
 * choosing, and restores it at boot, as `registerClassicyFileSystemAdapter`
 * does for the file system (ClassicyFileSystemAdapter.ts). localStorage stays
 * the primary store; with no adapter registered nothing here runs.
 *
 * The public surface is re-exported by ClassicyStateAdapter.ts; the desktop's
 * gate (`useClassicyStateSyncGate`), the Reset PRAM alert's
 * (`useClassicyStateMirrored`) and Reset PRAM itself
 * (`resetClassicyPersistedState`) stay here.
 */

const SUBSYSTEM = "ClassicyStateAdapter";
// Read when used, never while this module loads: a test may mock the
// store's module without them (nothing here runs at import).
const seqKey = () => `${CLASSICY_DESKTOP_STATE_STORAGE_KEY}:seq`;
const seqContentKey = () => `${CLASSICY_DESKTOP_STATE_STORAGE_KEY}:seqContent`;
const resetKey = () => `${CLASSICY_DESKTOP_STATE_STORAGE_KEY}:reset`;

/** The longest delay a browser timer takes; a longer one fires at once. */
const MAX_TIMER_MS = 2 ** 31 - 1;

/**
 * The most a clock write may move the virtual clock against the real one and
 * still be the clock running (a host driving it), not an edit.
 */
const CLOCK_RUN_TOLERANCE_MS = 1000;

/** The default `snapshotDebounceMs`: the localStorage write's own delay. */
export const CLASSICY_STATE_DEFAULT_SNAPSHOT_DEBOUNCE_MS = 500;

/**
 * The default `reconcileTimeoutMs`: how long the desktop waits for an
 * adapter's `reconcile` before it keeps the local state. Also the longest
 * Reset PRAM waits for the adapters to take the reset state.
 */
export const CLASSICY_STATE_DEFAULT_RECONCILE_TIMEOUT_MS = 5000;

/**
 * How long after a failed `reconcile` it is asked again; each failure in a
 * row doubles it, up to `CLASSICY_STATE_RECONCILE_RETRY_MAX_MS`.
 */
export const CLASSICY_STATE_RECONCILE_RETRY_MS = 10_000;

/** The longest wait between two retries of a failed `reconcile`. */
export const CLASSICY_STATE_RECONCILE_RETRY_MAX_MS = 300_000;

export interface ClassicyStateSnapshot {
	/**
	 * The desktop state as it is saved: `sanitizeStateForPersistence`'s
	 * output, the same JSON `localStorage["classicyDesktopState"]` holds, as a
	 * fresh copy. It never holds a built-in theme (a built-in active theme is
	 * its reference, `{ id, package }`) or session state.
	 */
	state: ClassicyStore;
	/** sha256 hex of the serialized `state`, byte for byte. */
	hash: string;
	/**
	 * The version of the saved state in this browser: one more each time the
	 * saved state changes, the clock's minute tick excepted (it changes only
	 * `DateAndTime.dateTime`), stored in
	 * `localStorage["classicyDesktopState:seq"]`, so it grows across reloads.
	 * Gaps are normal (a local snapshot handed to `reconcile`, another tab's
	 * snapshot, a change coalesced by the debounce); two tabs may give
	 * different states the same number; clearing the site's data starts it
	 * again at 1. It orders one browser's states, never two devices'.
	 */
	seq: number;
	/** `"classicyDesktopState"`. */
	storageKey: string;
	/** The version of `@classicy/classicy` that built it. */
	version: string;
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
	 * Snapshot mode: called with the saved state a debounce after it changes,
	 * one call at a time. It must throw or reject when it did not store the
	 * snapshot (offline, signed out): resolving tells Classicy the backend
	 * holds it. An adapter that also reconciles gets none until a reconcile
	 * with it succeeds.
	 */
	onSnapshot?(snapshot: ClassicyStateSnapshot): void | Promise<void>;
	/**
	 * Two-way sync, at boot and on `reconcileClassicyState()`: return
	 * `useLocal` to keep the local state, or `replace` with saved state to
	 * adopt. Bounded by `reconcileTimeoutMs`; an error, a timeout or an
	 * invalid state keeps local, holds this adapter's snapshots and asks it
	 * again later.
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

/**
 * What decides whether the saved state changed (review I1): the hash of the
 * saved state without `DateAndTime.dateTime`, and the count of clock edits
 * this page has seen. The minute tick changes neither.
 */
type ChangeKey = { content: string; clockEdits: number };

/** A snapshot and the key it was built under. */
type Built = { snapshot: ClassicyStateSnapshot; key: ChangeKey };

type RegisteredStateAdapter = {
	adapter: ClassicyStateAdapter;
	snapshotDebounceMs: number;
	reconcileTimeoutMs: number;
	/**
	 * May it take snapshots? An adapter that reconciles may not until a
	 * reconcile with it succeeded in this page (review C1): until then the
	 * local state may be a fresh device's defaults or an old device's stale
	 * desktop, and would overwrite the account's copy.
	 */
	synced: boolean;
	/** A snapshot came due while it was not synced. */
	held: boolean;
	/** The key last handed to `onSnapshot`, forgotten if that delivery failed. */
	sent?: ChangeKey;
	/** A delivery to it is under way (one at a time: review M5). */
	delivering: boolean;
	/** The latest snapshot due while one was under way, and who awaits it. */
	queued?: Built;
	waiters: Array<(delivered: boolean) => void>;
	retryTimer?: ReturnType<typeof setTimeout>;
	retryMs: number;
};

const registry = new Map<string, RegisteredStateAdapter>();

const isCurrent = (entry: RegisteredStateAdapter): boolean =>
	registry.get(entry.adapter.id) === entry;

/** `value` when it is a finite number of at least 0 (above it when
 * `exclusive`) a timer can wait, else `fallback`, with a warning. */
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
		(exclusive ? value > 0 : value >= 0) &&
		value <= MAX_TIMER_MS
	) {
		return value;
	}
	classicyLog(
		"warn",
		SUBSYSTEM,
		`adapter "${id}": ${option} must be a number ${exclusive ? "above" : "of at least"} 0 and at most ${MAX_TIMER_MS} ms; using ${fallback} ms`,
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
// The clock: a tick is not a change (review I1)
// ---------------------------------------------------------------------------

/**
 * The saved clock as last seen: its value, the virtual time's offset from
 * the real time when it was written, and the edits counted this page.
 */
let clockValue: unknown;
let clockOffset: number | undefined;
let clockEdits = 0;
let clockSeen = false;

const clockOf = (state: ClassicyStore): unknown =>
	state.System?.Manager?.DateAndTime?.dateTime;

/**
 * Classify a change of the saved clock: the menu bar clock's minute tick
 * (`isClassicyClockTick`), or a write that moves the virtual clock with the
 * real one (a host running the clock), is no edit; any other change counts.
 * The value the page loads with is the baseline.
 */
const observeClock = (state: ClassicyStore): void => {
	const value = clockOf(state);
	if (clockSeen && value === clockValue) return;
	const ms = typeof value === "string" ? Date.parse(value) : Number.NaN;
	const offset = Number.isFinite(ms) ? ms - Date.now() : undefined;
	if (clockSeen) {
		const ran =
			offset !== undefined &&
			(isClassicyClockTick(ms) ||
				(clockOffset !== undefined &&
					Math.abs(offset - clockOffset) <= CLOCK_RUN_TOLERANCE_MS));
		if (!ran) clockEdits += 1;
	}
	clockSeen = true;
	clockValue = value;
	clockOffset = offset;
};

const sameKey = (a: ChangeKey | undefined, b: ChangeKey): boolean =>
	!!a && a.content === b.content && a.clockEdits === b.clockEdits;

// ---------------------------------------------------------------------------
// seq: the saved state's version in this browser
// ---------------------------------------------------------------------------

let seq = 0;
let seqContent: string | undefined;
let seqClockEdits = 0;

/** The stored `{ seq, content }`, or undefined without a window or storage. */
const readStoredSeq = ():
	| { seq: number; content: string | null }
	| undefined => {
	if (typeof window === "undefined") return undefined;
	try {
		const stored = Number(localStorage.getItem(seqKey()));
		return {
			seq: Number.isFinite(stored) && stored > 0 ? stored : 0,
			content: localStorage.getItem(seqContentKey()),
		};
	} catch {
		return undefined;
	}
};

/** The seq of a snapshot under `key`: the current one when the saved state
 * is unchanged, else one more, stored with its content hash. */
const seqFor = (key: ChangeKey): number => {
	const stored = readStoredSeq();
	const current = Math.max(seq, stored?.seq ?? 0);
	const previous = stored ? stored.content : seqContent;
	if (
		current > 0 &&
		key.content === previous &&
		key.clockEdits === seqClockEdits
	) {
		seq = current;
		return seq;
	}
	seq = current + 1;
	seqContent = key.content;
	seqClockEdits = key.clockEdits;
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(seqKey(), String(seq));
			localStorage.setItem(seqContentKey(), key.content);
		} catch {
			// No storage: seq stays in memory.
		}
	}
	return seq;
};

/** The snapshot of `state` (the live state by default): sanitized, hashed,
 * keyed and sequenced. */
const build = (state: ClassicyStore = useAppManager.getState()): Built => {
	const live = state === useAppManager.getState();
	if (live) observeClock(state);
	const sanitized = sanitizeStateForPersistence(state);
	const serialized = JSON.stringify(sanitized);
	const clock = sanitized.System?.Manager?.DateAndTime;
	const content = JSON.stringify(
		sanitized,
		function (this: unknown, key: string, value: unknown) {
			return key === "dateTime" && this === clock ? undefined : value;
		},
	);
	const key: ChangeKey = {
		content: classicySha256Hex(content),
		clockEdits: live ? clockEdits : 0,
	};
	return {
		key,
		snapshot: {
			state: JSON.parse(serialized) as ClassicyStore,
			hash: classicySha256Hex(serialized),
			seq: seqFor(key),
			storageKey: CLASSICY_DESKTOP_STATE_STORAGE_KEY,
			version: packageJson.version,
			timestamp: new Date().toISOString(),
		},
	};
};

// ---------------------------------------------------------------------------
// The desktop's gate and the Reset PRAM alert's flag
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
/** An adopted state is being applied: the gate is closed meanwhile. */
let adopting = false;
/** A snapshot came due while a reconcile held every snapshot back. */
let snapshotHeld = false;
/** Reset PRAM is under way: nothing more is sent, the page reloads. */
let resetting = false;

export type ClassicyStateSyncGate = { ready: boolean; epoch: number };

const gateListeners = new Set<() => void>();
let gate: ClassicyStateSyncGate = { ready: true, epoch: 0 };
const SERVER_GATE: ClassicyStateSyncGate = { ready: true, epoch: 0 };

const gateReady = (): boolean =>
	!adopting &&
	(bootPhase === "settled" ||
		(bootPhase === "idle" && !hasReconcilingAdapter()));

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

// ---------------------------------------------------------------------------
// Reconcile
// ---------------------------------------------------------------------------

/** `entry` may take snapshots now; one that came due while it could not is
 * sent. */
const markSynced = (entry: RegisteredStateAdapter): void => {
	entry.synced = true;
	entry.retryMs = CLASSICY_STATE_RECONCILE_RETRY_MS;
	if (entry.retryTimer !== undefined) clearTimeout(entry.retryTimer);
	entry.retryTimer = undefined;
	if (entry.held) {
		entry.held = false;
		scheduleSnapshot();
	}
};

/** `entry`'s reconcile failed: it takes no snapshot until one succeeds, and
 * is asked again after `retryMs` (after any reconcile then running), which
 * doubles, from `CLASSICY_STATE_RECONCILE_RETRY_MS` up to the maximum. */
const markFailed = (entry: RegisteredStateAdapter): void => {
	entry.synced = false;
	if (entry.retryTimer !== undefined) clearTimeout(entry.retryTimer);
	const delay = entry.retryMs;
	entry.retryMs = Math.min(
		Math.max(delay * 2, CLASSICY_STATE_RECONCILE_RETRY_MS),
		CLASSICY_STATE_RECONCILE_RETRY_MAX_MS,
	);
	const retry = (): void => {
		entry.retryTimer = undefined;
		if (!isCurrent(entry) || entry.synced || resetting) return;
		if (inflight) {
			void inflight.then(retry);
			return;
		}
		void runReconcile([entry]);
	};
	entry.retryTimer = setTimeout(retry, delay);
};

const TIMED_OUT = Symbol("timed out");

type Answer =
	| { kind: "useLocal" }
	| { kind: "replace"; state: unknown }
	| { kind: "failed" };

/** One adapter's answer, bounded by its timeout (failures logged). */
async function askAdapter(
	entry: RegisteredStateAdapter,
	local: ClassicyStateSnapshot,
): Promise<Answer> {
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
			return { kind: "failed" };
		}
		return answer?.action === "replace"
			? { kind: "replace", state: answer.state }
			: { kind: "useLocal" };
	} catch (error) {
		classicyLog(
			"warn",
			SUBSYSTEM,
			`adapter "${adapter.id}" failed in reconcile; keeping the local state`,
			error,
		);
		return { kind: "failed" };
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Apply an adopted state as one step with the remount (review I2): the gate
 * closes, the store is replaced and the epoch moves before it opens again, all
 * synchronously, so the mounted desktop never renders, or runs an effect,
 * against the adopted state: it is replaced by a new tree under the new key.
 */
const adoptState = (state: unknown): boolean => {
	adopting = true;
	emitGate();
	let adopted = false;
	try {
		adopted = adoptPersistedClassicyState(state);
		if (adopted) epoch += 1;
	} finally {
		adopting = false;
		emitGate();
	}
	return adopted;
};

/** Offer the local snapshot to each of `entries` in registration order; the
 * first valid `replace` is adopted. True iff one was. */
async function reconcileWithAdapters(
	entries: RegisteredStateAdapter[],
): Promise<boolean> {
	const local = build().snapshot;
	for (const [index, entry] of entries.entries()) {
		if (!isCurrent(entry)) continue;
		const answer = await askAdapter(entry, local);
		if (resetting) return false;
		if (!isCurrent(entry)) continue;
		if (answer.kind === "useLocal") {
			markSynced(entry);
			continue;
		}
		if (answer.kind === "replace" && adoptState(answer.state)) {
			// The first replace wins, as for the file system: the adapters not
			// asked take the adopted state as their next snapshot, and this one
			// is not sent back what it just handed over (review M6).
			for (const rest of entries.slice(index)) {
				if (isCurrent(rest)) markSynced(rest);
			}
			entry.sent = build().key;
			return true;
		}
		if (answer.kind === "replace") {
			classicyLog(
				"warn",
				SUBSYSTEM,
				`adapter "${entry.adapter.id}" reconcile returned an invalid state; keeping the local state`,
			);
		}
		markFailed(entry);
	}
	return false;
}

/** Run a reconcile with `entries`, as the one in flight. */
function runReconcile(entries: RegisteredStateAdapter[]): Promise<boolean> {
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
			for (const entry of entries) if (isCurrent(entry)) markFailed(entry);
			settle();
			return false;
		},
	);
	inflight = run;
	emitGate();
	return run;
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
 * signing in). Snapshots wait while it runs, and an adapter whose reconcile
 * fails takes none until one with it succeeds. The boot after Reset PRAM
 * keeps its reset state: that first one is skipped.
 */
export function reconcileClassicyState(): Promise<boolean> {
	if (typeof window === "undefined") return Promise.resolve(false);
	if (inflight) return inflight;
	const entries = [...registry.values()].filter(
		(entry) => entry.adapter.reconcile,
	);
	if (bootPhase === "idle" && takeResetMark()) {
		classicyLog(
			"info",
			SUBSYSTEM,
			"Reset PRAM: this boot keeps the reset state and does not reconcile",
		);
		// The reset state is the one to keep: it is sent.
		for (const entry of entries) markSynced(entry);
		settle();
		return Promise.resolve(false);
	}
	if (entries.length === 0) {
		settle();
		return Promise.resolve(false);
	}
	return runReconcile(entries);
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
 * the adapters' `reconcileTimeoutMs`, and for the instant an adopted state
 * is applied; `epoch` grows with every adopted state, and keys the desktop's
 * subtree, so it remounts as on a restart. Starts the boot reconcile on
 * mount.
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

/**
 * True while an adapter takes snapshots: Reset PRAM then resets the synced
 * copy too, and its alert says so.
 */
export function useClassicyStateMirrored(): boolean {
	return useSyncExternalStore(subscribeGate, hasSnapshotAdapter, () => false);
}

// ---------------------------------------------------------------------------
// Snapshots
// ---------------------------------------------------------------------------

let snapshotTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribeStore: (() => void) | null = null;
let pagehideAttached = false;

/**
 * Hand `built` to `entry`, one delivery at a time: while one is under way the
 * latest due snapshot waits, and is sent when it ends (an older one is never
 * sent after a newer one). Skipped when the adapter has this key already;
 * held when it is not synced. True when the adapter took it.
 */
function deliverTo(
	entry: RegisteredStateAdapter,
	built: Built,
): Promise<boolean> {
	const onSnapshot = entry.adapter.onSnapshot;
	if (!onSnapshot) return Promise.resolve(true);
	if (!entry.synced) {
		entry.held = true;
		return Promise.resolve(false);
	}
	if (entry.delivering) {
		entry.queued = built;
		return new Promise((resolve) => entry.waiters.push(resolve));
	}
	if (sameKey(entry.sent, built.key)) return Promise.resolve(true);
	entry.delivering = true;
	entry.sent = built.key;
	return invokeClassicyAdapterHook(
		SUBSYSTEM,
		entry.adapter,
		"onSnapshot",
		onSnapshot,
		built.snapshot,
	).then((delivered) => {
		// Failed: forget it, so the next change sends again.
		if (!delivered && entry.sent === built.key) entry.sent = undefined;
		entry.delivering = false;
		const next = entry.queued;
		const waiters = entry.waiters.splice(0);
		entry.queued = undefined;
		if (next) {
			const after = isCurrent(entry)
				? deliverTo(entry, next)
				: Promise.resolve(false);
			void after.then((result) => {
				for (const resolve of waiters) resolve(result);
			});
		}
		return delivered;
	});
}

/** Hand `built` to every adapter implementing `onSnapshot`. True when every
 * one took it (or had it). */
function deliverSnapshot(built: Built): Promise<boolean> {
	const deliveries = [...registry.values()]
		.filter((entry) => entry.adapter.onSnapshot)
		.map((entry) => deliverTo(entry, built));
	return Promise.all(deliveries).then((results) => results.every(Boolean));
}

function deliverDueSnapshot(): void {
	snapshotTimer = null;
	if (resetting || !hasSnapshotAdapter()) return;
	if (holdingSnapshots()) {
		snapshotHeld = true;
		return;
	}
	void deliverSnapshot(build());
}

function scheduleSnapshot(): void {
	if (resetting || !hasSnapshotAdapter()) return;
	if (snapshotTimer !== null) clearTimeout(snapshotTimer);
	snapshotTimer = setTimeout(deliverDueSnapshot, snapshotDebounceMs());
	// A snapshot still waiting when the tab closes is sent then, best-effort
	// (an async delivery may not finish), as the file system's is, and the
	// state it holds is saved in this browser too (review M8).
	if (!pagehideAttached) {
		pagehideAttached = true;
		window.addEventListener("pagehide", () => {
			if (snapshotTimer === null || resetting) return;
			clearTimeout(snapshotTimer);
			persistPendingAppManagerState();
			deliverDueSnapshot();
		});
	}
}

const onStoreChange = (state: ClassicyStore): void => {
	// No window, no snapshot: a server's store is no user's desktop (and a
	// timer there would outlive the request), as the localStorage write.
	if (typeof window === "undefined") return;
	observeClock(state);
	scheduleSnapshot();
};

/**
 * Register a desktop state adapter at app entry, before rendering (as
 * `registerClassicyFileSystemAdapter`). Capability-based: `onSnapshot`,
 * `reconcile`, either or both. Re-registering an id replaces it. An adapter
 * that reconciles takes no snapshot until a reconcile with it succeeds; one
 * registered after the page's first reconcile is asked on its own shortly.
 */
export function registerClassicyStateAdapter(
	adapter: ClassicyStateAdapter,
	options?: ClassicyStateAdapterOptions,
): void {
	const previous = registry.get(adapter.id);
	if (previous?.retryTimer !== undefined) clearTimeout(previous.retryTimer);
	const entry: RegisteredStateAdapter = {
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
		synced: !adapter.reconcile,
		held: false,
		delivering: false,
		waiters: [],
		retryMs: CLASSICY_STATE_RECONCILE_RETRY_MS,
	};
	registry.set(adapter.id, entry);
	if (unsubscribeStore === null) {
		if (typeof window !== "undefined") observeClock(useAppManager.getState());
		unsubscribeStore = useAppManager.subscribe(onStoreChange);
	}
	// Once the page's first reconcile has started, a new one that
	// reconciles is asked on its own (after it), as a failed one is retried.
	if (
		adapter.reconcile &&
		bootPhase !== "idle" &&
		typeof window !== "undefined"
	) {
		entry.retryMs = 0;
		markFailed(entry);
	}
	emitGate();
}

export function unregisterClassicyStateAdapter(id: string): void {
	const entry = registry.get(id);
	if (!entry) return;
	registry.delete(id);
	if (entry.retryTimer !== undefined) clearTimeout(entry.retryTimer);
	for (const resolve of entry.waiters.splice(0)) resolve(false);
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
 * running). Resolves once every `onSnapshot` has settled: true when every
 * adapter took it (or had it); false when one failed, or holds no
 * successful reconcile yet and so took nothing. For a host about to sign the
 * user out or leave; it waits as long as the adapters do.
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
	return deliverSnapshot(build());
}

/**
 * Special ▸ Reset PRAM: stop saving, forget the saved desktop state, and,
 * when an adapter takes snapshots, mark the next boot to keep its reset state
 * rather than reconcile it away and hand the adapters a snapshot of a first
 * session's state, a provider's `defaultState` seed included, so their copy
 * resets too (as Drive Setup's Initialize hands them the erased tree). Then
 * calls `restart` (the caller reloads): at once with no adapter taking
 * snapshots, else once every adapter took it, or after
 * `CLASSICY_STATE_DEFAULT_RECONCILE_TIMEOUT_MS`. A second call while one runs
 * does nothing (review M1).
 */
export function resetClassicyPersistedState(restart: () => void): void {
	if (resetting) return;
	resetting = true;
	if (snapshotTimer !== null) clearTimeout(snapshotTimer);
	snapshotTimer = null;
	for (const entry of registry.values()) {
		if (entry.retryTimer !== undefined) clearTimeout(entry.retryTimer);
		entry.retryTimer = undefined;
	}
	// A write still to come would bring the forgotten state back.
	stopAppManagerPersistence();
	const mirrored = typeof window !== "undefined" && hasSnapshotAdapter();
	if (typeof window !== "undefined") {
		try {
			localStorage.removeItem(CLASSICY_DESKTOP_STATE_STORAGE_KEY);
			if (mirrored) localStorage.setItem(resetKey(), "1");
		} catch (error) {
			classicyLog(
				"warn",
				SUBSYSTEM,
				"Reset PRAM could not clear the saved desktop state",
				error,
			);
		}
	}
	if (!mirrored) {
		restart();
		return;
	}
	const seed = rememberedClassicyDefaultStateSeed() as
		| DeepPartial<ClassicyStore>
		| undefined;
	const reset = build(classicyFirstSessionState(seed));
	let timer: ReturnType<typeof setTimeout> | undefined;
	let restarted = false;
	const once = () => {
		if (restarted) return;
		restarted = true;
		clearTimeout(timer);
		restart();
	};
	timer = setTimeout(once, CLASSICY_STATE_DEFAULT_RECONCILE_TIMEOUT_MS);
	// Every adapter that takes snapshots takes this one: the reset is the
	// user's decision, whatever its reconcile said.
	const deliveries = [...registry.values()]
		.filter((entry) => entry.adapter.onSnapshot)
		.map((entry) => {
			entry.synced = true;
			return deliverTo(entry, reset);
		});
	void Promise.all(deliveries).then(once);
}

/** Tests: forget every adapter and start the page over. @internal */
export function resetClassicyStateSyncForTests(): void {
	for (const entry of registry.values()) {
		if (entry.retryTimer !== undefined) clearTimeout(entry.retryTimer);
	}
	registry.clear();
	unsubscribeStore?.();
	unsubscribeStore = null;
	if (snapshotTimer !== null) clearTimeout(snapshotTimer);
	snapshotTimer = null;
	bootPhase = "idle";
	inflight = null;
	epoch = 0;
	adopting = false;
	snapshotHeld = false;
	resetting = false;
	seq = 0;
	seqContent = undefined;
	seqClockEdits = 0;
	clockValue = undefined;
	clockOffset = undefined;
	clockEdits = 0;
	clockSeen = false;
	emitGate();
}
