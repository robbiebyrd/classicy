import { useSyncExternalStore } from "react";
import { z } from "zod";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { type SoundData, SoundDataSchema } from "./ClassicySoundSchema";

/**
 * A sound pack: one Howler audio sprite sheet (`src` + `sprite`) under a
 * kebab-case id. A theme selects a pack with `sound.pack`. A pack should
 * define every id in `CLASSICY_SOUND_SPRITE_IDS`; a sprite it lacks plays
 * from the Platinum pack instead.
 */
export type ClassicySoundPack = SoundData & {
	id: string;
	name: string;
	packageId?: string;
};

export const ClassicySoundPackSchema: z.ZodType<ClassicySoundPack> =
	SoundDataSchema.extend({
		id: z
			.string()
			.regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "must be a kebab-case id"),
		name: z.string().trim().min(1).max(64),
		packageId: z.string().max(64).optional(),
		src: z.array(z.string().min(1)).min(1),
	});

export const CLASSICY_DEFAULT_SOUND_PACK_ID = "platinum";

/**
 * The sprite ids Classicy dispatches (`sound: "…"`). Equal to the key set of
 * the Platinum sprite sheet; a custom pack should provide all of them.
 */
export const CLASSICY_SOUND_SPRITE_IDS = [
	"ClassicyAlertBonk",
	"ClassicyAlertGrowl",
	"ClassicyAlertIndigo",
	"ClassicyAlertQuack",
	"ClassicyAlertSosumi",
	"ClassicyAlertTabitha",
	"ClassicyAlertWildEep",
	"ClassicyBeep",
	"ClassicyBoot",
	"ClassicyButtonClickDown",
	"ClassicyButtonClickUp",
	"ClassicyClick",
	"ClassicyEmailMailError",
	"ClassicyEmailMailSent",
	"ClassicyEmailNewMail",
	"ClassicyEmailNoMail",
	"ClassicyInputRadioClickDown",
	"ClassicyInputRadioClickUp",
	"ClassicyMenuClose",
	"ClassicyMenuItemClick",
	"ClassicyMenuItemHover",
	"ClassicyMenuOpen",
	"ClassicyTabClick",
	"ClassicyTabClickDown",
	"ClassicyTabClickUp",
	"ClassicyThump",
	"ClassicyWindowClose",
	"ClassicyWindowCollapse",
	"ClassicyWindowControlClickDown",
	"ClassicyWindowControlClickUp",
	"ClassicyWindowExpand",
	"ClassicyWindowFocus",
	"ClassicyWindowMoveIdle",
	"ClassicyWindowMoveMoving",
	"ClassicyWindowMoveStop",
	"ClassicyWindowOpen",
	"ClassicyWindowResizeIdle",
	"ClassicyWindowResizeResizing",
	"ClassicyWindowResizeStop",
	"ClassicyWindowZoomMaximize",
	"ClassicyWindowZoomMinimize",
] as const satisfies readonly string[];

export type ClassicySoundSpriteId = (typeof CLASSICY_SOUND_SPRITE_IDS)[number];

const registry = new Map<string, ClassicySoundPack>();
const listeners = new Set<() => void>();
let snapshot: readonly ClassicySoundPack[] = Object.freeze([]);

const publish = () => {
	snapshot = Object.freeze(Array.from(registry.values()));
	for (const listener of listeners) listener();
};

/**
 * Add a sound pack. Call it at module scope; consumers update live. An
 * invalid pack is rejected with a warning. Re-registering an id replaces the
 * pack and keeps its position.
 */
export function registerClassicySoundPack(pack: ClassicySoundPack): void {
	const parsed = ClassicySoundPackSchema.safeParse(pack);
	if (!parsed.success) {
		classicyLog("warn", "ClassicySoundPacks", "Rejected sound pack", {
			id: pack?.id,
			issues: parsed.error.issues,
		});
		return;
	}
	registry.set(parsed.data.id, parsed.data);
	publish();
}

export const getClassicySoundPack = (
	id: string,
): ClassicySoundPack | undefined => registry.get(id);

/** Registered packs, in registration order. */
export const listClassicySoundPacks = (): readonly ClassicySoundPack[] =>
	snapshot;

export function subscribeClassicySoundPacks(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export const useClassicySoundPacks = (): readonly ClassicySoundPack[] =>
	useSyncExternalStore(
		subscribeClassicySoundPacks,
		listClassicySoundPacks,
		listClassicySoundPacks,
	);

/** Contract sprite ids that `pack` does not define. */
export const classicySoundPackMissingSprites = (
	pack: ClassicySoundPack,
): string[] => CLASSICY_SOUND_SPRITE_IDS.filter((id) => !(id in pack.sprite));

/** Test helper: forget every registered pack. */
export const resetClassicySoundPacks = (): void => {
	registry.clear();
	publish();
};
