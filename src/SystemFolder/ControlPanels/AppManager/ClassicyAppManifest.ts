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
		scriptableIndex = null;
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

/** One script-callable action, flattened for discovery. */
export interface ClassicyScriptableAction {
	appId: string;
	type: string;
	description: string;
	params?: z.ZodType;
}

let scriptableIndex: Map<string, ClassicyScriptableAction> | null = null;

function buildScriptableIndex(): Map<string, ClassicyScriptableAction> {
	if (scriptableIndex) return scriptableIndex;
	scriptableIndex = new Map();
	for (const manifest of manifests.values()) {
		for (const [type, entry] of Object.entries(manifest.actions)) {
			if (!entry.scriptable || scriptableIndex.has(type)) continue;
			scriptableIndex.set(type, {
				appId: manifest.id,
				type,
				description: entry.description,
				params: entry.params,
			});
		}
	}
	return scriptableIndex;
}

/**
 * Every action any app has declared `scriptable`, flattened. HyperCard's
 * discovery surface: what a stack script may attempt to dispatch. (The trust
 * gate still decides what actually runs.)
 */
export function listScriptableActions(): ClassicyScriptableAction[] {
	return [...buildScriptableIndex().values()];
}

/** The scriptable entry for an exact action type, or undefined. */
export function getScriptableAction(
	type: string,
): ClassicyScriptableAction | undefined {
	return buildScriptableIndex().get(type);
}

/**
 * Strip wrapper schemas (optional/nullable/default/readonly) to reach the
 * described inner schema. Zod stores wrappers' inner type on `def.innerType`.
 */
function unwrapSchema(schema: z.ZodType): z.ZodType {
	let current = schema;
	for (;;) {
		const def = current.def as { innerType?: z.ZodType };
		if (!def.innerType) return current;
		current = def.innerType;
	}
}

/** Read a schema's `.describe()` text, looking through wrappers. */
function schemaDescription(schema: z.ZodType): string | undefined {
	return schema.description ?? unwrapSchema(schema).description;
}

/**
 * Balloon-ready `{ title, content }` for one of an app's declared actions.
 * Feed directly to `ClassicyBalloonHelp`; undefined means "show no balloon".
 */
export function describeAppAction(
	appId: string,
	type: string,
): { title: string; content: string } | undefined {
	const entry = manifests.get(appId)?.actions[type];
	if (!entry) return undefined;
	return { title: type, content: entry.description };
}

/**
 * Balloon-ready `{ title, content }` for a field of an app's state schema.
 * `fieldPath` uses dot notation (`"prefs.sortBy"`). Undefined when the app,
 * path, or a `.describe()` on the resolved field is missing.
 */
export function describeAppState(
	appId: string,
	fieldPath: string,
): { title: string; content: string } | undefined {
	const state = manifests.get(appId)?.state;
	if (!state) return undefined;
	const segments = fieldPath.split(".");
	let current: z.ZodType = state;
	for (const segment of segments) {
		const unwrapped = unwrapSchema(current);
		const shape = (unwrapped.def as { shape?: Record<string, z.ZodType> })
			.shape;
		const next = shape?.[segment];
		if (!next) return undefined;
		current = next;
	}
	const content = schemaDescription(current);
	if (!content) return undefined;
	return { title: segments[segments.length - 1], content };
}

/**
 * Validated, typed read of an app's `apps[id].data` — the replacement for
 * hand-rolled guards like `isFinderData`. Returns undefined when the app has
 * no state schema or the data fails it; callers fall back to a default
 * (`parseAppData<FinderData>(id, raw) ?? {}`).
 */
export function parseAppData<T>(appId: string, raw: unknown): T | undefined {
	const state = manifests.get(appId)?.state;
	if (!state) return undefined;
	const result = state.safeParse(raw ?? {});
	return result.success ? (result.data as T) : undefined;
}
