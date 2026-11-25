import {
	resolveClassicyDesktopIconIdentity,
	useClassicyDesktopIconIdentity,
} from "@/Appearance/ClassicyAppIdentity";

/**
 * The Trash's own name: its folder's (`CLASSICY_TRASH_PATH`), its desktop
 * icon's record and every surface's while no package names it otherwise.
 */
export const CLASSICY_TRASH_NAME = "Trash";

const TRASH_FALLBACK = Object.freeze({ name: CLASSICY_TRASH_NAME, icon: "" });

/**
 * The Trash's name as `packageId`'s package (the active one when no id is
 * given) shows it: its `desktopIcons.trash.name` (Windows 98's "Recycle
 * Bin"; WIG Ch.1 "Consistency", p.2, Ch.10 "Recycle Bin Integration",
 * p.212), else "Trash". Display only: the folder's path, its stored name and
 * every saved byte keep "Trash". Store-free, so menu builders and message
 * writers outside React may call it; components use `useClassicyTrashName`.
 */
export const classicyTrashDisplayName = (packageId?: string): string =>
	resolveClassicyDesktopIconIdentity("trash", TRASH_FALLBACK, packageId).name;

/** The Trash's name as the active package shows it, live. */
export const useClassicyTrashName = (): string =>
	useClassicyDesktopIconIdentity("trash", TRASH_FALLBACK).name;
