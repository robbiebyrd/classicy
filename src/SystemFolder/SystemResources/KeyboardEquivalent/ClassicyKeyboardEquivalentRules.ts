import he from "he";
import {
	canonicalChord,
	isFunctionKey,
	keyboardShortcutParts,
	parseKeyboardShortcut,
} from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/** A keyboard equivalent another item already owns. */
export type ClassicyKeyboardEquivalentInUse = {
	/** Any form `parseKeyboardShortcut` accepts ("⌘K", "Cmd+K"). */
	shortcut: string;
	/** What owns it, named in the alert ("New Folder"). */
	name: string;
};

/** Why a combination was refused: the two tiers of the HIG alert. */
export type ClassicyKeyboardEquivalentProblem = {
	label: string;
	message: string;
};

export type ClassicyKeyboardEquivalentRuleOptions = {
	/** Shortcuts already taken; a match is refused naming its owner. */
	inUse?: ClassicyKeyboardEquivalentInUse[];
	/**
	 * The HIG rule that a keyboard equivalent includes the command key or is a
	 * function key. Default `true`; turn it off for web shortcuts built on
	 * Option, which the browser reserves far less than Command.
	 */
	requireCommandKey?: boolean;
	/** The item's current equivalent — re-entering it is never a conflict. */
	current?: string;
	/** Extra rule: return the alert heading to refuse, or null to accept. */
	validate?: (shortcut: string) => string | null;
};

const TRY_AGAIN = "Please select another combination.";

/** "⌃⌘S" -> "⌃ + ⌘ + S" — the spelled-out form of HIGOS8 Figures 6-8 to 6-10. */
export const spellKeyboardEquivalent = (shortcut: string | undefined): string =>
	keyboardShortcutParts(shortcut).join(" + ");

/**
 * Check a newly typed combination against HIGOS8 p.121: refuse it if it has
 * neither a command key nor a function key, or if another item already uses
 * it (and say which). Returns null when it is acceptable.
 */
export const checkKeyboardEquivalent = (
	shortcut: string,
	{
		inUse = [],
		requireCommandKey = true,
		current,
		validate,
	}: ClassicyKeyboardEquivalentRuleOptions = {},
): ClassicyKeyboardEquivalentProblem | null => {
	const parsed = parseKeyboardShortcut(shortcut);
	if (requireCommandKey && !parsed.command && !isFunctionKey(parsed.key)) {
		return {
			label: "The keyboard equivalent must include the command key.",
			message: TRY_AGAIN,
		};
	}
	const chord = canonicalChord(shortcut);
	if (chord && chord !== canonicalChord(current)) {
		const owner = inUse.find(
			(entry) => canonicalChord(entry.shortcut) === chord,
		);
		if (owner) {
			return {
				label: `The keyboard equivalent ${spellKeyboardEquivalent(shortcut)} is already used by “${owner.name}”.`,
				message: TRY_AGAIN,
			};
		}
	}
	const custom = validate?.(shortcut);
	return custom ? { label: custom, message: TRY_AGAIN } : null;
};

/**
 * Every keyboard equivalent a menu tree declares, named by its item's title —
 * pass an app's menus as `inUse` so a new equivalent cannot collide with a
 * menu command. Items without a title or shortcut are skipped.
 */
export const keyboardEquivalentsInUse = (
	items: ClassicyMenuItem[],
): ClassicyKeyboardEquivalentInUse[] => {
	const found: ClassicyKeyboardEquivalentInUse[] = [];
	const walk = (list: ClassicyMenuItem[]) => {
		for (const item of list) {
			if (item.keyboardShortcut && item.title) {
				// Menu titles may carry HTML entities; the alert shows plain text.
				found.push({
					shortcut: item.keyboardShortcut,
					name: he.decode(item.title),
				});
			}
			if (item.menuChildren?.length) walk(item.menuChildren);
		}
	};
	walk(items);
	return found;
};
