import { useMemo, useSyncExternalStore } from "react";
import { subscribeClassicyActiveAppearancePackage } from "./ClassicyActiveAppearancePackage.internal";
import type {
	ClassicyAppIdentityOverride,
	ClassicyDesktopIconOverride,
	ClassicyDesktopIconOverrides,
} from "./ClassicyAppearancePackage";
import { getRegisteredClassicyAppearancePackageOrDefault } from "./ClassicyAppearancePackageRegistry";
import { getClassicyAssetPackageSource } from "./ClassicyAssetPackageSource.internal";

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
 * unregistered id falls back to the default package, then to the first
 * registered one, by the rule of
 * `getRegisteredClassicyAppearancePackageOrDefault`. Store-free.
 */
export const getClassicyAppIdentityOverrides = (
	packageId?: string,
): ClassicyAppIdentityOverrides =>
	getRegisteredClassicyAppearancePackageOrDefault(
		packageId ?? getClassicyAssetPackageSource()?.getId(),
	)?.apps ?? CLASSICY_NO_APP_IDENTITY_OVERRIDES;

/** Each field of `override` over `fallback`'s; `fallback` itself when none changes. */
const mergeClassicyIdentity = (
	override: ClassicyDesktopIconOverride | undefined,
	fallback: ClassicyAppIdentity,
): ClassicyAppIdentity => {
	if (override === undefined) return fallback;
	const name = override.name ?? fallback.name;
	const icon = override.icon ?? fallback.icon;
	const description = override.description ?? fallback.description;
	if (
		name === fallback.name &&
		icon === fallback.icon &&
		description === fallback.description
	) {
		return fallback;
	}
	const identity: ClassicyAppIdentity = { name, icon };
	if (description !== undefined) identity.description = description;
	return identity;
};

/**
 * Pure merge: each override field wins over the fallback's; no override for
 * `appId`, or one that changes no field (`{}`), returns `fallback` itself.
 * Looked up with `Object.hasOwn`, so an id such as `"constructor"` never
 * reaches the prototype.
 */
export const classicyAppIdentityFrom = (
	overrides: ClassicyAppIdentityOverrides,
	appId: string,
	fallback: ClassicyAppIdentity,
): ClassicyAppIdentity =>
	mergeClassicyIdentity(
		Object.hasOwn(overrides, appId) ? overrides[appId] : undefined,
		fallback,
	);

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
			subscribeClassicyActiveAppearancePackage,
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

// ─── The desktop's own icons (`desktopIcons`) ───────────────────────────────

/** The desktop's own icons a package may show otherwise: the Trash and the startup disk. */
export type ClassicyDesktopSystemIcon = keyof ClassicyDesktopIconOverrides;

/** The `desktopIcons` of a package that declares none (Platinum's). */
export const CLASSICY_NO_DESKTOP_ICON_OVERRIDES: Readonly<ClassicyDesktopIconOverrides> =
	Object.freeze({});

/**
 * The active (or given) package's `desktopIcons`, else the frozen empty
 * object. An unregistered id resolves as `getClassicyAppIdentityOverrides`'s
 * does. Store-free.
 */
export const getClassicyDesktopIconOverrides = (
	packageId?: string,
): Readonly<ClassicyDesktopIconOverrides> =>
	getRegisteredClassicyAppearancePackageOrDefault(
		packageId ?? getClassicyAssetPackageSource()?.getId(),
	)?.desktopIcons ?? CLASSICY_NO_DESKTOP_ICON_OVERRIDES;

/**
 * Pure merge: the override for `icon` over `fallback`, field by field; none,
 * or one that changes no field, returns `fallback` itself.
 */
export const classicyDesktopIconIdentityFrom = (
	overrides: Readonly<ClassicyDesktopIconOverrides>,
	icon: ClassicyDesktopSystemIcon,
	fallback: ClassicyAppIdentity,
): ClassicyAppIdentity =>
	mergeClassicyIdentity(
		Object.hasOwn(overrides, icon) ? overrides[icon] : undefined,
		fallback,
	);

/**
 * How `packageId`'s package (the active one when no id is given) shows the
 * desktop's `icon`: its `desktopIcons` override merged over `fallback`, or
 * `fallback` itself. Store-free; components use
 * `useClassicyDesktopIconIdentity`.
 */
export const resolveClassicyDesktopIconIdentity = (
	icon: ClassicyDesktopSystemIcon,
	fallback: ClassicyAppIdentity,
	packageId?: string,
): ClassicyAppIdentity =>
	classicyDesktopIconIdentityFrom(
		getClassicyDesktopIconOverrides(packageId),
		icon,
		fallback,
	);

const getActiveDesktopIconOverrides =
	(): Readonly<ClassicyDesktopIconOverrides> =>
		getClassicyDesktopIconOverrides();

/**
 * The active package's `desktopIcons`. Live, like
 * `useClassicyAppIdentityOverrides`; the snapshot is the package's own object.
 */
export const useClassicyDesktopIconOverrides =
	(): Readonly<ClassicyDesktopIconOverrides> =>
		useSyncExternalStore(
			subscribeClassicyActiveAppearancePackage,
			getActiveDesktopIconOverrides,
			getActiveDesktopIconOverrides,
		);

/**
 * How the active package shows the desktop's `icon` (see
 * `resolveClassicyDesktopIconIdentity`), live. `icon === undefined` returns
 * `fallback` (any other desktop icon). Memoized as `useClassicyAppIdentity`
 * is, on the overrides and the fallback's fields.
 */
export const useClassicyDesktopIconIdentity = (
	icon: ClassicyDesktopSystemIcon | undefined,
	fallback: ClassicyAppIdentity,
): ClassicyAppIdentity => {
	const overrides = useClassicyDesktopIconOverrides();
	const { name, icon: image, description } = fallback;
	// biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the fallback's fields, not its identity, so an inline literal does not recompute; the fallback captured with those fields is returned
	return useMemo(
		() =>
			icon === undefined
				? fallback
				: classicyDesktopIconIdentityFrom(overrides, icon, fallback),
		[overrides, icon, name, image, description],
	);
};
