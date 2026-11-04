/**
 * Open-with routing: hand a file to the app that opens it, from inside the
 * reducer (Finder resolves a file's default app in its own reducer case, where
 * a nested dispatch is not possible). The open is reduced the way the kernel
 * reduces a dispatched action, so an app's own OpenFile case runs when its
 * manifest declares one, and the trust floor and the untrusted allowlist apply
 * exactly as for a dispatch. Otherwise the kernel's generic OpenFile handler
 * queues the path, as before.
 */
import {
	type ClassicyActionTrust,
	isActionTrustPermitted,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust";
import {
	type ClassicyStore,
	classicyAppEventHandler,
	classicyDesktopStateEventReducer,
	findAppEventHandlerPrefix,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { getAppManifest } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * The generic OpenFile type for an app, built from its internal record name
 * and kept verbatim (Part K ruling K-D9): `ClassicyApp${name}OpenFile`.
 */
export function classicyGenericOpenFileType(name: string): string {
	return `ClassicyApp${name}OpenFile`;
}

/**
 * The OpenFile type `appId`'s own reducer handles, or undefined when the open
 * should take the generic path.
 *
 * A type qualifies when the app's manifest (`registerApp`) declares it as
 * `<prefix>OpenFile` for one of the app's own prefixes, and the kernel routes
 * it to one of those prefixes — so a shorter prefix another app registered
 * first can never take the open. The first such type, in prefix registration
 * order, wins. The manifest, not the name, decides: "Movie Player" builds
 * `ClassicyAppMovie PlayerOpenFile`, which no prefix matches. An app that registers
 * a reducer without declaring an OpenFile, or only through the deprecated
 * `registerAppEventHandler`, keeps the generic path: nothing says its reducer
 * handles the type, and a type it ignores would drop the open.
 */
export function resolveClassicyAppOpenFileType(
	appId: string,
): string | undefined {
	const manifest = getAppManifest(appId);
	if (!manifest) return undefined;
	return manifest.prefixes
		.map((prefix) => `${prefix}OpenFile`)
		.find((type) => {
			if (!Object.hasOwn(manifest.actions, type)) return false;
			const route = findAppEventHandlerPrefix(type);
			return route !== undefined && manifest.prefixes.includes(route);
		});
}

/**
 * Open `path` in `app`, reducing the open on `ds` in place of a dispatch.
 * `trust` is the trust the calling action was reduced under: an untrusted open
 * reaches the app only when its OpenFile type is permitted, as a dispatched
 * one would.
 */
export function routeClassicyAppOpenFile(
	ds: ClassicyStore,
	app: { id: string; name: string },
	path: string,
	trust: ClassicyActionTrust = "trusted",
): ClassicyStore {
	const own = resolveClassicyAppOpenFileType(app.id);
	if (own) {
		return classicyDesktopStateEventReducer(
			ds,
			{ type: own, app: { id: app.id }, path },
			trust,
		);
	}
	const type = classicyGenericOpenFileType(app.name);
	if (!isActionTrustPermitted(trust, type)) {
		classicyLog(
			"warn",
			"ClassicyDesktopStateEventReducer",
			"Rejected untrusted action",
			{ type },
		);
		return ds;
	}
	return classicyAppEventHandler(ds, { type, app: { id: app.id }, path });
}
