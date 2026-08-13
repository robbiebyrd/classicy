/**
 * Pre-dispatch gate for HyperCard stack-script effects. Two independent
 * checks, in order:
 *
 *   1. Param validation — if the action's owning app declared a `params`
 *      schema in its manifest, the script-authored args must pass it. This
 *      turns "the feature did nothing" into a dev warning naming the bad
 *      param. Runs FIRST so a malformed-but-allowed call is distinguishable
 *      from a forbidden one.
 *   2. The trust gate (`isUntrustedActionAllowed`) — unchanged; the kernel
 *      floor still re-checks underneath (defense-in-depth).
 *
 * Actions with no manifest entry keep pre-manifest behavior: allowlist
 * check only, so hand-registered allowlist types are not broken.
 */
import { isUntrustedActionAllowed } from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust";
import { getScriptableAction } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

export type ScriptEffectDecision =
	| {
			kind: "dispatch";
			/**
			 * The args the caller must dispatch: zod's parsed output when the
			 * action declared a `params` schema (unknown keys stripped by plain
			 * `z.object` schemas), the original args otherwise. Dispatching
			 * these — never the raw script args — is what makes "validated"
			 * and "dispatched" the same payload.
			 */
			args: Record<string, unknown>;
	  }
	| {
			kind: "drop";
			reason: "not-allowlisted" | "invalid-params";
			issues?: unknown[];
	  };

export function evaluateScriptEffect(
	actionType: string,
	args: Record<string, unknown>,
): ScriptEffectDecision {
	const entry = getScriptableAction(actionType);
	let sanitized = args;
	if (entry?.params) {
		const parsed = entry.params.safeParse(args);
		if (!parsed.success) {
			if (process.env.NODE_ENV !== "production") {
				console.warn(
					"[HyperCard] Dropped script effect: args failed the app's manifest schema",
					{ actionType, issues: parsed.error.issues },
				);
			}
			return {
				kind: "drop",
				reason: "invalid-params",
				issues: parsed.error.issues,
			};
		}
		sanitized = parsed.data as Record<string, unknown>;
	}
	if (!isUntrustedActionAllowed(actionType)) {
		return { kind: "drop", reason: "not-allowlisted" };
	}
	return { kind: "dispatch", args: sanitized };
}
