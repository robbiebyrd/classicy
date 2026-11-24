/**
 * Desktop state storage adapters: mirror the desktop state
 * (`localStorage["classicyDesktopState"]`: the themes, windows, icons, the
 * Control Strip, Finder's views and the other settings) to a backend, and
 * restore it at boot, so a signed-in user's desktop follows them across
 * devices. The counterpart of `registerClassicyFileSystemAdapter`
 * (ClassicyFileSystemAdapter.ts), with the same shape: debounced snapshots
 * carrying a sha256 hash and a persisted monotonic `seq`, and a boot
 * `reconcile` that may replace the local copy, local winning on any error
 * (and an adapter that reconciles taking no snapshot until a reconcile with
 * it succeeds).
 *
 * ```ts
 * registerClassicyStateAdapter(
 *   {
 *     id: "my-backend",
 *     onSnapshot: async (snapshot) => { await save(snapshot.state) },
 *     reconcile: async (local, { signal }) => {
 *       const remote = await load({ signal })
 *       return remote ? { action: "replace", state: remote } : { action: "useLocal" }
 *     },
 *   },
 *   { snapshotDebounceMs: 3000, reconcileTimeoutMs: 5000 },
 * )
 * ```
 *
 * Implementation: ClassicyStateSync.internal.ts. Reference:
 * docs/AGENT-REFERENCE.md §7, "Mirroring the desktop state".
 */
export type {
	ClassicyStateAdapter,
	ClassicyStateAdapterOptions,
	ClassicyStateReconcileContext,
	ClassicyStateReconcileResult,
	ClassicyStateSnapshot,
} from "./ClassicyStateSync.internal";
export {
	CLASSICY_STATE_DEFAULT_RECONCILE_TIMEOUT_MS,
	CLASSICY_STATE_DEFAULT_SNAPSHOT_DEBOUNCE_MS,
	CLASSICY_STATE_RECONCILE_RETRY_MAX_MS,
	CLASSICY_STATE_RECONCILE_RETRY_MS,
	flushClassicyState,
	getClassicyStateAdapters,
	reconcileClassicyState,
	registerClassicyStateAdapter,
	unregisterClassicyStateAdapter,
} from "./ClassicyStateSync.internal";
