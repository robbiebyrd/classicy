import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	getClassicyAppearancePackage,
	getRegisteredClassicyAppearancePackageOrDefault,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type ClassicyScreenSaverDefinition,
	classicyScreenSaverOfferedUnder,
	listClassicyScreenSavers,
	listClassicyScreenSaversInRegistrationOrder,
} from "./ClassicyScreenSaverRegistry";

/**
 * Which screen savers a package offers and which one is in effect. Everything
 * here takes a package id and reads no store, except
 * `activeClassicyScreenSaverPackageId`, which reads it only when not handed a
 * state (reducers pass their `ds`).
 */

/** Whether `saver` is offered under `packageId`; a saver naming no packages is offered under all. */
export const isClassicyScreenSaverOffered = (
	saver: ClassicyScreenSaverDefinition,
	packageId: string,
): boolean => classicyScreenSaverOfferedUnder(saver, packageId);

/** The savers offered under `packageId`, sorted by name like `listClassicyScreenSavers`. */
export const listClassicyScreenSaversFor = (
	packageId: string,
): ClassicyScreenSaverDefinition[] =>
	listClassicyScreenSavers().filter((saver) =>
		isClassicyScreenSaverOffered(saver, packageId),
	);

/**
 * The saver in effect under `packageId`: the stored choice when offered, else
 * the package's `defaultScreenSaver` when offered, else the first offered
 * saver in registration order (the saver registry is a Map, so re-registering
 * an id keeps its original position), else `undefined`. The stored choice is
 * never rewritten.
 */
export const resolveClassicyScreenSaverFor = (
	packageId: string,
	selectedSaver?: string,
): ClassicyScreenSaverDefinition | undefined => {
	const inOrder = listClassicyScreenSaversInRegistrationOrder().filter(
		(saver) => isClassicyScreenSaverOffered(saver, packageId),
	);
	const byId = (id: string | undefined) =>
		id === undefined ? undefined : inOrder.find((saver) => saver.id === id);
	return (
		byId(selectedSaver) ??
		byId(getClassicyAppearancePackage(packageId)?.defaultScreenSaver) ??
		inOrder[0]
	);
};

/** The id of the package whose savers are offered: the stored one, resolved like the drawn package. */
export const activeClassicyScreenSaverPackageId = (
	state: ClassicyStore = useAppManager.getState(),
): string =>
	getRegisteredClassicyAppearancePackageOrDefault(
		state.System?.Manager?.Appearance?.packageId,
	)?.id ?? CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID;
