// The example's desktop state adapter: mirrors the desktop state to the
// mock backend the dev (or preview) server runs (../../mockStateServer.ts),
// so two browser profiles opened with the same `?stateSync=<account>` share
// one desktop, as a signed-in user's devices would through a real backend.
// The same shape as a production adapter: debounced pushes deduplicated by
// hash, and a reconcile in which the account's saved copy wins. Classicy
// holds its snapshots until a reconcile with it succeeds, so a slow or
// failed boot never pushes this device's defaults over the account's copy;
// a failed PUT throws, so the next change sends again.
import type {
	ClassicyStateAdapter,
	ClassicyStateReconcileContext,
	ClassicyStateReconcileResult,
	ClassicyStateSnapshot,
} from "@classicy/classicy";

/** What the mock backend holds for an account. */
type SavedSnapshot = Pick<
	ClassicyStateSnapshot,
	"state" | "hash" | "seq" | "version" | "timestamp"
>;

/**
 * Browsers cap the bodies of in-flight `keepalive` requests at 64 KiB in
 * all, and refuse a larger one outright: a snapshot under this size is sent
 * with `keepalive`, so the one sent as the tab closes (`pagehide`) arrives.
 */
const KEEPALIVE_MAX_BYTES = 60 * 1024;

export function mockStateAdapter(account: string): ClassicyStateAdapter {
	const url = `/__mock-state/${encodeURIComponent(account)}`;
	// The hash the backend holds, as far as this page knows: a snapshot with
	// it is not sent again.
	let savedHash: string | null = null;

	return {
		id: "example-mock-state",

		async onSnapshot(snapshot: ClassicyStateSnapshot): Promise<void> {
			if (snapshot.hash === savedHash) return;
			const saved: SavedSnapshot = {
				state: snapshot.state,
				hash: snapshot.hash,
				seq: snapshot.seq,
				version: snapshot.version,
				timestamp: snapshot.timestamp,
			};
			const body = JSON.stringify(saved);
			const response = await fetch(url, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body,
				keepalive: new Blob([body]).size <= KEEPALIVE_MAX_BYTES,
			});
			// A throw is logged by Classicy, which sends the next change again.
			if (!response.ok) throw new Error(`PUT ${url}: ${response.status}`);
			savedHash = snapshot.hash;
		},

		// `reason` says why it is asked ("boot", Classicy's "retry", or the
		// host's "request"), and `userActed` whether the user has worked on
		// this desktop since it was drawn. This adapter merges nothing, so on a
		// retry after the user acted Classicy asks them before using the
		// account's copy; an adapter that merges `local` into its answer
		// returns `merged: true` to skip that alert.
		async reconcile(
			local: ClassicyStateSnapshot,
			{ signal }: ClassicyStateReconcileContext,
		): Promise<ClassicyStateReconcileResult> {
			const response = await fetch(url, { signal, cache: "no-store" });
			// A new account: this desktop seeds it with its next snapshot.
			if (response.status === 204) return { action: "useLocal" };
			if (!response.ok) throw new Error(`GET ${url}: ${response.status}`);
			const saved = (await response.json()) as SavedSnapshot;
			savedHash = saved.hash;
			if (saved.hash === local.hash) return { action: "useLocal" };
			return { action: "replace", state: saved.state };
		},
	};
}
