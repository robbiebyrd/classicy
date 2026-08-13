/**
 * App manifest registry — the unified registration surface for Classicy apps.
 *
 * `registerApp` is the single entry point an app's context module calls at
 * load time. It subsumes the older split registrations:
 *
 *   - handler routing        → delegates to `registerAppEventHandler`
 *   - scriptable exposure    → delegates to `registerClassicyUntrustedActionAllowlist`
 *   - shape + commentary     → stored here, keyed by appId, as zod schemas
 *
 * The manifest is runtime data: balloon help, HyperCard discovery, and
 * dev-mode kernel state validation all read it. See
 * docs/superpowers/specs/2026-08-13-app-manifest-registry-design.md.
 */
import type { z } from "zod";
import { registerClassicyUntrustedActionAllowlist } from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust";
import {
	type AppEventHandler,
	registerAppEventHandler,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";

/** One action an app handles: written commentary plus optional param schema. */
export interface ClassicyAppActionManifestEntry {
	/** Human-readable sentence shown in balloon help and discovery UIs. */
	description: string;
	/** Zod schema for the action's payload (everything except `type`). */
	params?: z.ZodType;
	/**
	 * Expose this action to untrusted dispatch (HyperCard stack scripts).
	 * Delegates to the untrusted-action allowlist; can never grant past the
	 * kernel's guarded-route floor (see ClassicyActionTrust.ts).
	 */
	scriptable?: boolean;
}

/** What an app passes to `registerApp`. */
export interface ClassicyAppManifestDefinition {
	id: string;
	/** Human-readable sentence describing the app. */
	description: string;
	/** Action-type prefix routed to `handler`. Required iff `handler` is set. */
	prefix?: string;
	handler?: AppEventHandler;
	actions?: Record<string, ClassicyAppActionManifestEntry>;
	/**
	 * Shape of this app's `apps[id].data`, with `.describe()` commentary per
	 * field. MUST be a `z.looseObject` — the kernel writes undeclared keys
	 * (e.g. `openFiles` queues) into app data, and validation must tolerate
	 * them. Top-level fields should be `.optional()`: data is legitimately
	 * empty before the app's first action.
	 */
	state?: z.ZodType;
}

/** The stored, merged manifest for one app id. */
export interface ClassicyAppManifest {
	id: string;
	description: string;
	prefixes: string[];
	actions: Record<string, ClassicyAppActionManifestEntry>;
	state?: z.ZodType;
}

const manifests = new Map<string, ClassicyAppManifest>();

/**
 * Register an app: routing, manifest, and scriptable exposure in one call.
 * Call at module load from the app's context file, replacing direct use of
 * `registerAppEventHandler`.
 *
 * Re-registering the same id MERGES additively rather than no-oping, because
 * one app id may span modules (HyperCard.app registers ClassicyAppHyperCard*
 * and ClassicyAppHCEdit* from two context files): a new prefix+handler is
 * appended (same prefix again is a no-op), action types merge first-wins,
 * and the first `state` schema wins.
 */
export function registerApp(def: ClassicyAppManifestDefinition): void {
	let manifest = manifests.get(def.id);
	if (!manifest) {
		manifest = {
			id: def.id,
			description: def.description,
			prefixes: [],
			actions: {},
			state: def.state,
		};
		manifests.set(def.id, manifest);
	} else if (def.state) {
		if (!manifest.state) {
			manifest.state = def.state;
		} else if (
			def.state !== manifest.state &&
			process.env.NODE_ENV !== "production"
		) {
			console.warn(
				"[registerApp] Ignoring second state schema for app — the first registration's schema wins",
				{ appId: def.id },
			);
		}
	}
	if (def.prefix && def.handler && !manifest.prefixes.includes(def.prefix)) {
		manifest.prefixes.push(def.prefix);
		registerAppEventHandler(def.prefix, def.handler);
	}
	for (const [type, entry] of Object.entries(def.actions ?? {})) {
		if (manifest.actions[type]) continue;
		manifest.actions[type] = entry;
		if (entry.scriptable) {
			registerClassicyUntrustedActionAllowlist(type);
		}
	}
}

/** The merged manifest for `appId`, or undefined if none registered. */
export function getAppManifest(appId: string): ClassicyAppManifest | undefined {
	return manifests.get(appId);
}

/** Snapshot of all registered manifests. */
export function listAppManifests(): ClassicyAppManifest[] {
	return [...manifests.values()];
}
