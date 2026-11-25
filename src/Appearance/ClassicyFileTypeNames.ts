import { useSyncExternalStore } from "react";
import type { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { subscribeClassicyActiveAppearancePackage } from "./ClassicyActiveAppearancePackage.internal";
import { getRegisteredClassicyAppearancePackageOrDefault } from "./ClassicyAppearancePackageRegistry";
import { getClassicyAssetPackageSource } from "./ClassicyAssetPackageSource.internal";

// Store-free, so reducers may import it, by the rule of
// useClassicyAppearanceLayout.ts and ClassicyAppIdentity.ts: the active
// package id comes through the `.internal` source the store connects.

/** A package's `fileTypeNames`: names for file types, keyed by type. */
export type ClassicyFileTypeNames = Readonly<
	Partial<Record<ClassicyFileSystemEntryFileType, string>>
>;

/** The names of a package that declares no `fileTypeNames` (Platinum's). */
export const CLASSICY_NO_FILE_TYPE_NAMES: ClassicyFileTypeNames = Object.freeze(
	{},
);

/**
 * The active (or given) package's `fileTypeNames`, else the frozen empty
 * map. An unregistered id falls back to the default package, then to the
 * first registered one (`getRegisteredClassicyAppearancePackageOrDefault`).
 * Store-free.
 */
export const getClassicyFileTypeNames = (
	packageId?: string,
): ClassicyFileTypeNames =>
	getRegisteredClassicyAppearancePackageOrDefault(
		packageId ?? getClassicyAssetPackageSource()?.getId(),
	)?.fileTypeNames ?? CLASSICY_NO_FILE_TYPE_NAMES;

const getActiveFileTypeNames = (): ClassicyFileTypeNames =>
	getClassicyFileTypeNames();

/**
 * The active package's `fileTypeNames`, live: re-renders on a package
 * switch or re-registration. The snapshot is the package's own frozen
 * object, so it is reference-stable.
 */
export const useClassicyFileTypeNames = (): ClassicyFileTypeNames =>
	useSyncExternalStore(
		subscribeClassicyActiveAppearancePackage,
		getActiveFileTypeNames,
		getActiveFileTypeNames,
	);
