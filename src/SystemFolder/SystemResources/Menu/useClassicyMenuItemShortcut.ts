import { useMemo } from "react";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type ClassicyShortcutOverrides,
	classicyEditableShortcuts,
	resolveClassicyMenuItemShortcut,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenuShortcutOverrides";

/** `(itemId, chord) => chord`: the shortcut a bundled menu item carries. */
export type ClassicyMenuItemShortcutResolver = (
	itemId: string,
	chord: string,
) => string;

// Without the key every item keeps its own chord: one stable identity, so a
// builder's memo never rebuilds for it.
const ownChord: ClassicyMenuItemShortcutResolver = (_itemId, chord) => chord;

/**
 * The resolver a menu builder calls for each item that sets a
 * `keyboardShortcut`: `resolve(itemId, chord)` is the user's override for
 * the stable shortcut id `itemId` (`System.Manager.Desktop.shortcutOverrides`)
 * while the package declares `layout.keyboard.editableShortcuts` (Windows
 * 98; WIG Ch.4 "Shortcut Keys", p.27), else `chord`. Applied where the menu
 * is built, the menu bar's claims (`collectMenuChords`), the shortcut
 * dispatcher (`findMenuItemByShortcut`) and the chord the menu draws all
 * follow it. Its identity changes only with the overrides or the key, so
 * it can sit in a builder's `useMemo` dependencies.
 */
export const useClassicyMenuItemShortcuts =
	(): ClassicyMenuItemShortcutResolver => {
		const enabled = classicyEditableShortcuts(useClassicyAppearanceLayout());
		// Optional chaining: a test may hand a store without the Desktop slice.
		const overrides = useAppManager(
			(s) => s.System?.Manager?.Desktop?.shortcutOverrides,
		) as ClassicyShortcutOverrides | undefined;
		return useMemo(
			() =>
				enabled && overrides
					? (itemId, chord) =>
							resolveClassicyMenuItemShortcut(overrides, itemId, chord)
					: ownChord,
			[enabled, overrides],
		);
	};

/**
 * One bundled menu item's shortcut: the override stored for `itemId` under
 * `layout.keyboard.editableShortcuts`, else `chord`
 * (`useClassicyMenuItemShortcuts`).
 */
export const useClassicyMenuItemShortcut = (
	itemId: string,
	chord: string,
): string => useClassicyMenuItemShortcuts()(itemId, chord);
