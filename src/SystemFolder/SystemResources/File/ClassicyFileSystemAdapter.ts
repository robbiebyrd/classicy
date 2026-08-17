import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
/**
 * ClassicyFileSystem sync adapter API — lets a host application mirror the
 * browser-local filesystem to a backend of its choosing. Capability-based:
 * implement any combination of onChange (journal mode), onSnapshot (snapshot
 * mode), and reconcile (two-way boot sync). Register at app entry, before
 * rendering, mirroring registerClassicyIcons / registerHyperCardSaveProvider.
 * With no adapters registered the filesystem behaves as before; localStorage
 * remains the primary store either way.
 *
 * Design: docs/superpowers/specs/2026-07-20-filesystem-adapter-design.md
 */

import type {
	ClassicyFileSystemEntry,
	ClassicyFileSystemEntryMetadata,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

export interface ClassicyFileSystemJournalEntry {
	/** Monotonic sequence number, persisted across sessions (gap = missed delivery). */
	seq: number;
	op: "write" | "mkdir" | "rmdir" | "meta" | "load";
	/** Colon-separated path; '' for 'load' (wholesale replacement). */
	path: string;
	/** File contents, for op 'write'. */
	data?: string;
	/** Metadata patch, for op 'meta'. */
	metadata?: Partial<ClassicyFileSystemEntryMetadata>;
	/** ISO 8601. */
	timestamp: string;
}

export interface ClassicyFileSystemSnapshot {
	/** Full tree — the same shape localStorage holds. */
	tree: ClassicyFileSystemEntry;
	/** sha256 hex of the serialized tree (divergence check). */
	hash: string;
	/** Last journal seq included in this snapshot. */
	seq: number;
	storageKey: string;
	/** ISO 8601. */
	timestamp: string;
}

export type ClassicyFileSystemReconcileResult =
	| { action: "useLocal" }
	| { action: "replace"; tree: ClassicyFileSystemEntry };

export interface ClassicyFileSystemAdapter {
	id: string;
	/** Journal mode: called synchronously for every mutation. */
	onChange?(entry: ClassicyFileSystemJournalEntry): void | Promise<void>;
	/** Snapshot mode: called after the debounced persist settles. */
	onSnapshot?(snapshot: ClassicyFileSystemSnapshot): void | Promise<void>;
	/** Two-way boot sync: return useLocal to keep local, or replace with a tree. */
	reconcile?(
		local: ClassicyFileSystemSnapshot,
	): Promise<ClassicyFileSystemReconcileResult>;
}

const DEFAULT_SNAPSHOT_DEBOUNCE_MS = 500;

type RegisteredAdapter = {
	adapter: ClassicyFileSystemAdapter;
	snapshotDebounceMs: number;
};

const registry = new Map<string, RegisteredAdapter>();

export function registerClassicyFileSystemAdapter(
	adapter: ClassicyFileSystemAdapter,
	options?: { snapshotDebounceMs?: number },
): void {
	registry.set(adapter.id, {
		adapter,
		snapshotDebounceMs:
			options?.snapshotDebounceMs ?? DEFAULT_SNAPSHOT_DEBOUNCE_MS,
	});
}

export function unregisterClassicyFileSystemAdapter(id: string): void {
	registry.delete(id);
}

export function getClassicyFileSystemAdapters(): ClassicyFileSystemAdapter[] {
	return [...registry.values()].map((entry) => entry.adapter);
}

/** Effective delay for the shared persist/snapshot debounce timer. */
export function getClassicyFileSystemSnapshotDebounceMs(): number {
	const delays = [...registry.values()].map(
		(entry) => entry.snapshotDebounceMs,
	);
	return delays.length ? Math.min(...delays) : DEFAULT_SNAPSHOT_DEBOUNCE_MS;
}

/**
 * Run an adapter hook, isolating synchronous throws and async rejections so a
 * faulty adapter can never block local filesystem operation or other adapters.
 *
 * Resolves true when the hook completed (or the adapter doesn't implement it),
 * false when it threw or rejected. Callers that must not outlive the hook —
 * see ClassicyFileSystem.flushNowAsync — await this; the debounced and
 * pagehide paths deliberately drop it on the floor and stay non-blocking.
 */
export function invokeClassicyFileSystemAdapterHook(
	adapter: ClassicyFileSystemAdapter,
	hook: "onChange" | "onSnapshot",
	payload: ClassicyFileSystemJournalEntry | ClassicyFileSystemSnapshot,
): Promise<boolean> {
	const fn = adapter[hook] as
		| ((payload: unknown) => void | Promise<void>)
		| undefined;
	if (!fn) return Promise.resolve(true);
	const logFailure = (error: unknown) => {
		classicyLog(
			"error",
			"ClassicyFileSystem",
			`adapter "${adapter.id}" failed in ${hook}`,
			error,
		);
		return false;
	};
	try {
		return Promise.resolve(fn.call(adapter, payload)).then(
			() => true,
			logFailure,
		);
	} catch (error) {
		return Promise.resolve(logFailure(error));
	}
}

// ---------------------------------------------------------------------------
// pagehide flush — a debounced persist could otherwise be lost when the tab
// closes inside the debounce window. Instances register their pending flush;
// a single lazily-attached pagehide listener drains the set synchronously.
// ---------------------------------------------------------------------------

const pendingFlushes = new Map<() => void, string>();
let pagehideListenerAttached = false;

export function registerClassicyFileSystemPendingFlush(
	flush: () => void,
	storageKey: string,
): void {
	pendingFlushes.set(flush, storageKey);
	if (!pagehideListenerAttached && typeof window !== "undefined") {
		pagehideListenerAttached = true;
		window.addEventListener("pagehide", () => {
			for (const pending of [...pendingFlushes.keys()]) {
				pending();
			}
		});
	}
}

export function unregisterClassicyFileSystemPendingFlush(
	flush: () => void,
): void {
	pendingFlushes.delete(flush);
}

/**
 * Run any pending flushes for one storage key. Called by the
 * ClassicyFileSystem constructor so a rebuilt instance never seeds from
 * localStorage while a predecessor still holds unpersisted mutations.
 */
export function flushClassicyFileSystemPendingForStorageKey(
	storageKey: string,
): void {
	for (const [pending, key] of [...pendingFlushes.entries()]) {
		if (key === storageKey) {
			pending();
		}
	}
}
