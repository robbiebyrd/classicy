import { useMemo, useSyncExternalStore } from "react";
import type { ClassicyAppIdentityOverride } from "./ClassicyAppearancePackage";
import {
	getRegisteredClassicyAppearancePackageOrDefault,
	subscribeClassicyAppearancePackages,
} from "./ClassicyAppearancePackageRegistry";
import { getClassicyAssetPackageSource } from "./ClassicyAssetPackageSource.internal";
import { subscribeClassicyAssets } from "./ClassicyAssetRegistry";

// Store-free, so reducers may import it: this module never reaches the app
// manager or the package module (which reads the store), the rule of
// useClassicyAppearanceLayout.ts. The active package id comes through the
// `.internal` source the store connects (resolved from
// `Appearance.packageId`, never `activeTheme.package`).

/**
 * How an app is shown: its name, its icon and, optionally, its balloon-help
 * copy. Display only; the app's id, action types and saved state never take
 * these values.
 */
export type ClassicyAppIdentity = {
	name: string;
	icon: string;
	description?: string;
};

/** A package's `apps`: display overrides keyed by app id. */
export type ClassicyAppIdentityOverrides = Readonly<
	Record<string, ClassicyAppIdentityOverride>
>;

/** The overrides of a package that declares no `apps` (Platinum's). */
export const CLASSICY_NO_APP_IDENTITY_OVERRIDES: ClassicyAppIdentityOverrides =
	Object.freeze({});

/**
 * The active (or given) package's `apps`, else the frozen empty map. An
 * unregistered id falls back to the default package, by the rule of
 * `getRegisteredClassicyAppearancePackageOrDefault`. Store-free.
 */
export const getClassicyAppIdentityOverrides = (
	packageId?: string,
): ClassicyAppIdentityOverrides =>
	getRegisteredClassicyAppearancePackageOrDefault(
		packageId ?? getClassicyAssetPackageSource()?.getId(),
	)?.apps ?? CLASSICY_NO_APP_IDENTITY_OVERRIDES;

/**
 * Pure merge: each override field wins over the fallback's; no override for
 * `appId` returns `fallback` itself. Looked up with `Object.hasOwn`, so an
 * id such as `"constructor"` never reaches the prototype.
 */
export const classicyAppIdentityFrom = (
	overrides: ClassicyAppIdentityOverrides,
	appId: string,
	fallback: ClassicyAppIdentity,
): ClassicyAppIdentity => {
	if (!Object.hasOwn(overrides, appId)) return fallback;
	const override = overrides[appId];
	const identity: ClassicyAppIdentity = {
		name: override.name ?? fallback.name,
		icon: override.icon ?? fallback.icon,
	};
	const description = override.description ?? fallback.description;
	if (description !== undefined) identity.description = description;
	return identity;
};

/**
 * How `packageId`'s package (the active one when no id is given) shows
 * `appId`: its `apps` override merged over `fallback`, or `fallback` itself.
 * Store-free, for reducers and effects; components use
 * `useClassicyAppIdentity`.
 */
export const resolveClassicyAppIdentity = (
	appId: string,
	fallback: ClassicyAppIdentity,
	packageId?: string,
): ClassicyAppIdentity =>
	classicyAppIdentityFrom(
		getClassicyAppIdentityOverrides(packageId),
		appId,
		fallback,
	);

// The twin of useClassicyAppearanceLayout.ts's subscribeActiveLayout: the
// asset registry follows the active package id (and the store's connection,
// whenever it happens); the package registry covers a package re-registered
// under the active id with new `apps`.
const subscribeActivePackage = (onChange: () => void): (() => void) => {
	const unsubscribeAssets = subscribeClassicyAssets(onChange);
	const unsubscribePackages = subscribeClassicyAppearancePackages(onChange);
	return () => {
		unsubscribeAssets();
		unsubscribePackages();
	};
};

const getActiveOverrides = (): ClassicyAppIdentityOverrides =>
	getClassicyAppIdentityOverrides();

/**
 * The active package's `apps`. Live: re-renders on a package switch or
 * re-registration; the snapshot is the package's own `apps` object, so it is
 * reference-stable.
 */
export const useClassicyAppIdentityOverrides =
	(): ClassicyAppIdentityOverrides =>
		useSyncExternalStore(
			subscribeActivePackage,
			getActiveOverrides,
			getActiveOverrides,
		);

/**
 * How the active package shows `appId` (see `resolveClassicyAppIdentity`),
 * live. `appId === undefined` returns `fallback` (callers gate on icon kind).
 * Memoized on the overrides and the fallback's fields, so an inline
 * `fallback` literal gives a stable result.
 */
export const useClassicyAppIdentity = (
	appId: string | undefined,
	fallback: ClassicyAppIdentity,
): ClassicyAppIdentity => {
	const overrides = useClassicyAppIdentityOverrides();
	const { name, icon, description } = fallback;
	// biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the fallback's fields, not its identity, so an inline literal does not recompute; the fallback captured with those fields is returned
	return useMemo(
		() =>
			appId === undefined
				? fallback
				: classicyAppIdentityFrom(overrides, appId, fallback),
		[overrides, appId, name, icon, description],
	);
};
