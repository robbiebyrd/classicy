/**
 * Trust level of a dispatched action.
 *
 * `trusted` (the default) is the existing, unrestricted behavior: the action
 * may reach any handler the reducer would otherwise route it to, including
 * plugin handlers registered via `registerAppEventHandler`.
 *
 * `untrusted` marks an action as originating from content the host cannot
 * fully vouch for (e.g. a HyperCard stack script interpreted at runtime). Such
 * an action is rejected — before any handler runs — unless it clears BOTH the
 * guarded-route floor (`isActionTrustGuarded`) and the deny-by-default
 * allowlist. See `isUntrustedActionAllowed` for the combined rule.
 *
 * Callers opt an action into `untrusted` explicitly at the dispatch site; the
 * default is `trusted`, so every pre-existing call site keeps working
 * unchanged.
 */
export type ClassicyActionTrust = "trusted" | "untrusted";

/**
 * Action type prefixes that only a `trusted` action may reach. Matches by
 * `String.prototype.startsWith`, so this also covers more specific
 * sub-prefixes (e.g. `ClassicyDesktopIcon*` is guarded as part of
 * `ClassicyDesktop*`).
 */
const GUARDED_ACTION_PREFIXES: readonly string[] = [
	"ClassicyDesktop",
	"ClassicyWindow",
];

/**
 * Exact action types that only a `trusted` action may reach, regardless of
 * which prefix (and therefore which handler — including plugin handlers
 * registered via `registerAppEventHandler`) would otherwise route them.
 */
const GUARDED_ACTION_TYPES: ReadonlySet<string> = new Set([
	"ClassicyAppFinderEmptyTrash",
	"ClassicyAppHCEditSetScript",
]);

/**
 * True if `actionType` is a guarded route: one that must never be reached by
 * an `untrusted` action, no matter which handler (built-in or plugin) it
 * would otherwise resolve to.
 */
export function isActionTrustGuarded(actionType: string): boolean {
	if (GUARDED_ACTION_TYPES.has(actionType)) return true;
	return GUARDED_ACTION_PREFIXES.some((prefix) =>
		actionType.startsWith(prefix),
	);
}

/**
 * True if an action of the given `trust` level is permitted to reach a
 * handler for `actionType`. `trusted` is always permitted; `untrusted` must
 * clear BOTH the guarded-route floor and the deny-by-default allowlist.
 *
 * This delegates to `isUntrustedActionAllowed` rather than restating the rule,
 * so there is exactly one definition of "may an untrusted action run" — the
 * kernel enforces the same predicate a call site would consult. Enforcing it
 * here (not only at the call site) is what makes the guarantee independent of
 * caller discipline: a dispatch site that forgets to check still cannot reach
 * a non-allowlisted route.
 */
export function isActionTrustPermitted(
	trust: ClassicyActionTrust,
	actionType: string,
): boolean {
	return trust === "trusted" || isUntrustedActionAllowed(actionType);
}

// ---------------------------------------------------------------------------
// Host-registered allowlist for untrusted action types
// ---------------------------------------------------------------------------
//
// DESIGN: an untrusted action must clear TWO independent checks, and both are
// enforced in the kernel — `isActionTrustPermitted` delegates to
// `isUntrustedActionAllowed` below, so the reducer applies exactly the rule a
// call site would consult.
//
//   1. The guarded-route floor (`isActionTrustGuarded`) — ClassicyDesktop*,
//      ClassicyWindow*, and two exact types are unreachable to untrusted
//      actions unconditionally. Nothing can opt back in.
//   2. This deny-by-default allowlist — clearing the floor is necessary but
//      NOT sufficient; the type must also be allowlisted.
//
// Enforcing the allowlist in the kernel rather than only at call sites is the
// whole point: the guarantee must not depend on every dispatch site
// remembering to check. A future call site that forgets still cannot route
// untrusted content to a non-allowlisted handler.
//
// Why an allowlist at all, on top of the floor: for a HyperCard stack script's
// `openApp` effect the event NAME is itself script-authored data
// (`e.event ?? "ClassicyAppOpen"` in HyperCard.tsx), so a denylist of known
// dangerous prefixes can never be complete. Enumerating what IS permitted is
// the only bound that holds against an attacker-chosen type.
//
// `ClassicyAppOpen` ships as the sole default entry because opening an app is
// HyperCard's core function — a stack must work with zero host configuration.
// Every other type a script's effects want to reach must be opted in via
// `registerClassicyUntrustedActionAllowlist`, and registering can never grant
// past the floor (allowlisting e.g. ClassicyDesktopSetTheme has no effect).
//
// Call sites should STILL check explicitly before dispatching — that lets them
// drop an effect quietly instead of dispatching a doomed action and tripping
// the reducer's warning:
//
//   if (!isUntrustedActionAllowed(actionType)) return; // drop the effect
//   dispatch(action, "untrusted"); // kernel re-checks the same rule anyway

const DEFAULT_UNTRUSTED_ACTION_ALLOWLIST: readonly string[] = [
	"ClassicyAppOpen",
];

const untrustedActionAllowlist = new Set<string>(
	DEFAULT_UNTRUSTED_ACTION_ALLOWLIST,
);

/**
 * @deprecated For app-owned actions, prefer declaring `scriptable: true` on
 * the action's manifest entry in `registerApp` (ClassicyAppManifest.ts),
 * which delegates here. Direct registration remains supported for action
 * types without a manifest (e.g. host-reviewed custom effects) and behaves
 * exactly as before — including the kernel floor it can never override.
 *
 * Register an action type as safe to dispatch `untrusted` — e.g. a custom
 * HyperCard stack-script effect a host application has reviewed. Call at
 * app entry, mirroring `registerClassicyFileSystemAdapter` /
 * `registerAppEventHandler`. Registering the same type twice is a no-op
 * (Set semantics — no duplication, no throw).
 *
 * This can never grant `actionType` past the kernel floor: if
 * `isActionTrustGuarded(actionType)` is true, `isUntrustedActionAllowed`
 * still rejects it regardless of allowlist membership.
 */
export function registerClassicyUntrustedActionAllowlist(
	actionType: string,
): void {
	untrustedActionAllowlist.add(actionType);
}

/**
 * True if `actionType` is currently allowlisted for `untrusted` dispatch —
 * the default entry, plus anything registered via
 * `registerClassicyUntrustedActionAllowlist`. This alone does not account
 * for the kernel floor; most callers want `isUntrustedActionAllowed`.
 */
export function isUntrustedActionAllowlisted(actionType: string): boolean {
	return untrustedActionAllowlist.has(actionType);
}

/**
 * Snapshot of the current allowlist contents (default entries plus anything
 * host-registered), for inspection and tests. Returns a fresh array each
 * call; mutating the result has no effect on the registry.
 */
export function getClassicyUntrustedActionAllowlist(): string[] {
	return [...untrustedActionAllowlist];
}

/**
 * The combined, deny-by-default gate a dispatch call site should consult
 * before dispatching an action as `untrusted` at all. `true` only when BOTH:
 *
 *  - `actionType` is allowlisted (default entry or host-registered), AND
 *  - `actionType` is not kernel-guarded (`isActionTrustGuarded`) — the floor
 *    this can never override.
 *
 * This is the single definition of the rule: the kernel's
 * `isActionTrustPermitted("untrusted", actionType)` delegates straight to it,
 * so consulting this at a call site and letting the reducer enforce it are
 * guaranteed to agree. Call sites should still check it explicitly at the
 * boundary that decides whether to dispatch untrusted content (e.g. a
 * HyperCard script effect) — that lets the caller drop the effect quietly
 * instead of dispatching a doomed action and tripping the reducer's warning.
 * The kernel check is the backstop for call sites that forget.
 */
export function isUntrustedActionAllowed(actionType: string): boolean {
	return (
		isUntrustedActionAllowlisted(actionType) &&
		!isActionTrustGuarded(actionType)
	);
}
