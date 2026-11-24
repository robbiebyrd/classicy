// The example's desktop state adapter: mirrors the desktop state to the
// mock backend the dev (or preview) server runs (../../mockStateServer.ts),
// so two browser profiles opened with the same `?stateSync=<account>` share
// one desktop, as a signed-in user's devices would through a real backend.
// The same shape as a production adapter: debounced pushes deduplicated by
// hash, and a boot reconcile in which the account's saved copy wins.
import type {
	ClassicyStateAdapter,
	ClassicyStateReconcileContext,
	ClassicyStateReconcileResult,
	ClassicyStateSnapshot,
} from "@classicy/classicy";

/** What the mock backend holds for an account. */
type SavedSnapshot = Pick<
	ClassicyStateSnapshot,
	"state" | "hash" | "seq" | "timestamp"
>;

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
				timestamp: snapshot.timestamp,
			};
			const response = await fetch(url, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(saved),
			});
			// A throw is logged by Classicy, which sends the next change again.
			if (!response.ok) throw new Error(`PUT ${url}: ${response.status}`);
			savedHash = snapshot.hash;
		},

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
