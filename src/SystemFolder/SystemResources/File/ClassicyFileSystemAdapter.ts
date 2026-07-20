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
 */
export function invokeClassicyFileSystemAdapterHook(
	adapter: ClassicyFileSystemAdapter,
	hook: "onChange" | "onSnapshot",
	payload: ClassicyFileSystemJournalEntry | ClassicyFileSystemSnapshot,
): void {
	const fn = adapter[hook] as
		| ((payload: unknown) => void | Promise<void>)
		| undefined;
	if (!fn) return;
	const logFailure = (error: unknown) =>
		console.error(
			`[ClassicyFileSystem] adapter "${adapter.id}" failed in ${hook}`,
			error,
		);
	try {
		void Promise.resolve(fn.call(adapter, payload)).catch(logFailure);
	} catch (error) {
		logFailure(error);
	}
}

// ---------------------------------------------------------------------------
// pagehide flush — a debounced persist could otherwise be lost when the tab
// closes inside the debounce window. Instances register their pending flush;
// a single lazily-attached pagehide listener drains the set synchronously.
// ---------------------------------------------------------------------------

const pendingFlushes = new Set<() => void>();
let pagehideListenerAttached = false;

export function registerClassicyFileSystemPendingFlush(
	flush: () => void,
): void {
	pendingFlushes.add(flush);
	if (!pagehideListenerAttached && typeof window !== "undefined") {
		pagehideListenerAttached = true;
		window.addEventListener("pagehide", () => {
			for (const pending of [...pendingFlushes]) {
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
