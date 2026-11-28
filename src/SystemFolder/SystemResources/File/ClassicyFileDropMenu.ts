/**
 * Windows 98 SE's transfer menu, shown when a button-2 drag of files is
 * let go over a target (WIG Ch.5 "Nondefault Drag and Drop", pp.62-63,
 * Figure 5.13; "Canceling a Drag and Drop Transfer", p.64; Ch.11 "Direct
 * Manipulation", pp.224-225; App. A Table A.1), under the package's
 * `layout.transfer.secondaryButton` "menu". Its items are shell32.dll's
 * menu 200 (read from the Windows 98 SE CD): "&Move Here", "&Copy Here",
 * "Create &Shortcut(s) Here", a separator and "Cancel"; over the Trash, menu
 * 201, the Recycle Bin's: "&Move Here", a separator and "Cancel". An item
 * whose effect the drop cannot make is left out, as the shell deletes it,
 * and the command a plain drop there would run (a move, or a copy with
 * Control held) is the default item, drawn bold. Choosing it does the
 * transfer; Cancel, Escape or a click elsewhere does nothing (WIG p.64:
 * "include a Cancel command in the pop-up menu of a nondefault drag and
 * drop action").
 */

import { useCallback, useMemo } from "react";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import { classicyCanCopy } from "@/SystemFolder/SystemResources/File/ClassicyFileCommands.internal";
import type {
	ClassicyFileDragOptions,
	ClassicyFileDropDestination,
	ClassicyFileDropEffect,
	ClassicyFileDropTarget,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import { classicyFileDropDestinationEffects } from "@/SystemFolder/SystemResources/File/ClassicyFileDragTransfer.internal";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { isInClassicyTrash } from "@/SystemFolder/SystemResources/File/ClassicyTrash";
import { useClassicyBundledAccessKeys } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/**
 * The transfer menu's items, by effect, as shell32.dll spells them (the
 * access key is the letter after its "&"), and its Cancel, which has none.
 */
export const CLASSICY_FILE_DROP_MENU_ITEMS: Readonly<
	Record<ClassicyFileDropEffect, { title: string; accessKey: string }>
> = Object.freeze({
	move: { title: "Move Here", accessKey: "M" },
	copy: { title: "Copy Here", accessKey: "C" },
	link: { title: "Create Shortcut(s) Here", accessKey: "S" },
});

/** The transfer menu's last item (no access key in shell32.dll). */
export const CLASSICY_FILE_DROP_MENU_CANCEL = "Cancel";

/** Whether a shortcut may be made to the entry at `path`. */
const linkable = (fs: ClassicyFileSystem, path: string): boolean =>
	!!fs.resolve(path) && !isInClassicyTrash(fs, path);

/**
 * The effects a drop of the items at `paths` into `destination` can make,
 * in the menu's order: a move alone into the Trash (menu 201); elsewhere a
 * move, a copy when one of the items may be copied (`classicyCanCopy`: not
 * a drive, a system or derived entry, nor anything in the Trash, as
 * Windows 98's Recycle Bin items take no Copy), and shortcuts when one of them is in the tree and
 * not in the Trash. Without `fs` (a source that does not know its tree),
 * the destination's effects alone.
 */
export const classicyFileDropEffects = (
	fs: ClassicyFileSystem | undefined,
	paths: readonly string[],
	destination: ClassicyFileDropDestination,
): readonly ClassicyFileDropEffect[] => {
	const taken = classicyFileDropDestinationEffects(destination);
	if (!fs) return taken;
	return taken.filter(
		(effect) =>
			effect === "move" ||
			(effect === "copy" && paths.some((path) => classicyCanCopy(fs, path))) ||
			(effect === "link" && paths.some((path) => linkable(fs, path))),
	);
};

/**
 * The transfer menu: an item for each of `effects` (in the menu's order),
 * `defaultEffect`'s drawn as the default (`isDefault`) when it is one of
 * them, a separator, and Cancel. `ak` is the bundled-keys helper
 * (`useClassicyBundledAccessKeys`), which gives the letters only under
 * `layout.menu.accessKeys`. Choosing an item calls `onChoose` with its
 * effect; Cancel calls nothing.
 */
export const classicyFileDropMenuItems = (
	effects: readonly ClassicyFileDropEffect[],
	defaultEffect: ClassicyFileDropEffect,
	ak: (key: string) => string | undefined,
	onChoose: (effect: ClassicyFileDropEffect) => void,
): ClassicyMenuItem[] => {
	const offered = (["move", "copy", "link"] as const).filter((effect) =>
		effects.includes(effect),
	);
	const shownDefault = offered.includes(defaultEffect)
		? defaultEffect
		: offered[0];
	return [
		...offered.map((effect): ClassicyMenuItem => {
			const { title, accessKey } = CLASSICY_FILE_DROP_MENU_ITEMS[effect];
			const key = ak(accessKey);
			return {
				id: `classicy_file_drop_${effect}`,
				title,
				...(key !== undefined ? { accessKey: key } : {}),
				...(effect === shownDefault ? { isDefault: true } : {}),
				onClickFunc: () => onChoose(effect),
			};
		}),
		{ id: "spacer" },
		{
			id: "classicy_file_drop_cancel",
			title: CLASSICY_FILE_DROP_MENU_CANCEL,
			onClickFunc: () => {},
		},
	];
};

/**
 * What a drag source gives `useClassicyFileDropMenu`'s `dragOptions`: the
 * effects a target takes for its items, its own `onStart` (wrapped for a
 * button-2 drag), and `transferAt`, which takes the release (target,
 * pointer, outline corner) and returns the function that does the
 * transfer with an effect, called at once for a plain drop and when an
 * item of the menu is chosen.
 */
export type ClassicyFileDropMenuSource = {
	effects: (
		target: ClassicyFileDropTarget,
	) => readonly ClassicyFileDropEffect[];
	onStart?: () => void;
	transferAt: (
		target: ClassicyFileDropTarget,
		point: [number, number],
		outlineTopLeft: [number, number],
	) => (effect: ClassicyFileDropEffect) => void;
};

/** What `useClassicyFileDropMenu` returns. */
export type ClassicyFileDropMenuApi = {
	/** Whether a button-2 press drags files (`transfer.secondaryButton` "menu"). */
	secondaryDrags: boolean;
	/** Whether a press of `e`'s button starts a file drag: 1, or 2 under the key. */
	startsDrag: (e: { button: number }) => boolean;
	/**
	 * The `startClassicyFileDrag` options a press of `e`'s button takes:
	 * the target's `effects`, and for a button-2 press `button: 2`, an
	 * `onStart` that first closes the item's own menu the press asked for
	 * (a macOS or Linux host raises `contextmenu` at the press; under
	 * `contextMenu.openOn` "release" it is still held), and an `onMenu`
	 * that shows the transfer menu at the pointer.
	 */
	dragOptions: (
		e: { button: number },
		source: ClassicyFileDropMenuSource,
	) => Pick<
		ClassicyFileDragOptions,
		"effects" | "button" | "onStart" | "onMenu"
	>;
};

/**
 * The transfer menu for a drag source (`ClassicyIcon`, `ClassicyDesktopIcon`
 * and the list view's rows): whether button 2 drags, and the options that
 * end such a drag in Windows 98 SE's menu, shown through the desktop's
 * contextual menu (`useClassicyContextualMenu`) with the bundled access
 * keys. Without `layout.transfer.secondaryButton` "menu", button 1 alone
 * drags and nothing else changes.
 */
export const useClassicyFileDropMenu = (): ClassicyFileDropMenuApi => {
	const secondaryDrags =
		useClassicyAppearanceLayout().transfer?.secondaryButton === "menu";
	const { showContextMenu, hideContextMenu } = useClassicyContextualMenu();
	const ak = useClassicyBundledAccessKeys();
	const startsDrag = useCallback(
		(e: { button: number }) =>
			e.button === 0 || (e.button === 2 && secondaryDrags),
		[secondaryDrags],
	);
	const dragOptions = useCallback<ClassicyFileDropMenuApi["dragOptions"]>(
		(e, { effects, onStart, transferAt }) => {
			if (e.button !== 2 || !secondaryDrags)
				return { effects, ...(onStart ? { onStart } : {}) };
			return {
				effects,
				button: 2,
				onStart: () => {
					hideContextMenu();
					onStart?.();
				},
				onMenu: (target, point, outlineTopLeft, effect) => {
					const transfer = transferAt(target, point, outlineTopLeft);
					// No leading Help item: Windows' drop menu holds the
					// transfer commands and Cancel alone.
					showContextMenu(
						classicyFileDropMenuItems(effects(target), effect, ak, transfer),
						point,
						{ helpItem: false },
					);
				},
			};
		},
		[secondaryDrags, showContextMenu, hideContextMenu, ak],
	);
	return useMemo(
		() => ({ secondaryDrags, startsDrag, dragOptions }),
		[secondaryDrags, startsDrag, dragOptions],
	);
};
