import {
	type ClassicyAppIdentityOverrides,
	classicyAppIdentityFrom,
} from "@/Appearance/ClassicyAppIdentity";
import type { ClassicyStoreSystemApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { listAppWindows } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import {
	type ClassicyKeyboardEquivalentInUse,
	keyboardEquivalentsInUse,
} from "@/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentRules";
import {
	canonicalChord,
	formatKeyboardShortcut,
	parseKeyboardShortcut,
} from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/** What `classicyAppMenuEquivalentsInUse` reads from the store. */
export type ClassicyAppMenuChordSources = {
	/** Every application record (`Applications.apps`). */
	apps: Record<string, ClassicyStoreSystemApp>;
	/** The front application (`frontAppIdOf`), owner of `frontMenu`. */
	frontAppId?: string;
	/** The menus the bar shows for it (`Desktop.appMenu`). */
	frontMenu?: ClassicyMenuItem[];
	/**
	 * The chords each application has claimed while in front
	 * (`Keyboard.app`): a windowless menu (`ClassicyApp`'s `windowlessMenu`)
	 * lives nowhere else once its application is in the background.
	 */
	appChords?: Record<string, string[]>;
	/** The active package's display names (`apps` overrides). */
	overrides?: ClassicyAppIdentityOverrides;
};

/**
 * Every keyboard equivalent an open application's menus declare, named
 * "<item> in <application>": the front application's published menus
 * (`Desktop.appMenu`, the desktop's own when Finder is in front), each open
 * application's window menus (`menuBar` on every window record, closed ones
 * included, since they come back with their window) and its record's
 * `appMenu`, and, for a chord found in none of those, the chords it claimed
 * while in front (`Keyboard.app`), named "a menu command of <application>".
 * The Application Switcher's chord is read ahead of every menu (it is on the
 * document in the capture phase), so a chord any of these hold would take
 * that command from its application.
 */
export const classicyAppMenuEquivalentsInUse = ({
	apps,
	frontAppId,
	frontMenu,
	appChords = {},
	overrides = {},
}: ClassicyAppMenuChordSources): ClassicyKeyboardEquivalentInUse[] => {
	const nameOf = (id: string): string => {
		const app = Object.hasOwn(apps, id) ? apps[id] : undefined;
		return app ? classicyAppIdentityFrom(overrides, id, app).name : id;
	};
	const named = (items: ClassicyMenuItem[], appName: string) =>
		keyboardEquivalentsInUse(items).map((entry) => ({
			shortcut: entry.shortcut,
			name: `${entry.name} in ${appName}`,
		}));

	const found: ClassicyKeyboardEquivalentInUse[] = [];
	if (frontMenu?.length)
		found.push(
			...named(frontMenu, frontAppId ? nameOf(frontAppId) : "the desktop"),
		);
	for (const app of Object.values(apps)) {
		if (!app.open) continue;
		const appName = nameOf(app.id);
		if (Array.isArray(app.appMenu)) found.push(...named(app.appMenu, appName));
		for (const w of listAppWindows(app))
			if (Array.isArray(w.menuBar)) found.push(...named(w.menuBar, appName));
	}
	const known = new Set(found.map((entry) => canonicalChord(entry.shortcut)));
	for (const [appId, chords] of Object.entries(appChords)) {
		const app = Object.hasOwn(apps, appId) ? apps[appId] : undefined;
		if (!app?.open || !Array.isArray(chords)) continue;
		for (const chord of chords) {
			if (typeof chord !== "string" || known.has(canonicalChord(chord)))
				continue;
			known.add(canonicalChord(chord));
			found.push({
				shortcut: chord,
				name: `a menu command of ${nameOf(appId)}`,
			});
		}
	}
	return found;
};

const CONTROL_OR_COMMAND = [
	{ control: true, command: false },
	{ control: false, command: true },
	{ control: true, command: true },
] as const;

/**
 * The chords a recorded switching chord may not be, for each keyboard
 * equivalent in `inUse`, each named for its owner: the switcher takes its
 * chord and the same chord with Shift (the previous application), ahead of
 * every menu, so
 *
 * - an equivalent with Shift is in the way of the chord without it (named
 *   "…, with Shift");
 * - Command matches Command or Control and Control matches Control
 *   (`shortcutMatchesEvent`; off a Mac, Control records as ⌘), so an
 *   equivalent with either is in the way of a chord with Control, Command
 *   or both, and the same Option and key.
 *
 * Pass the result as `inUse` to the keyboard equivalent field, whose exact
 * comparison (`checkKeyboardEquivalent`) then refuses each of them.
 */
export const classicyAppSwitcherChordConflicts = (
	inUse: readonly ClassicyKeyboardEquivalentInUse[],
): ClassicyKeyboardEquivalentInUse[] =>
	inUse.flatMap((entry) => {
		const p = parseKeyboardShortcut(entry.shortcut);
		if (!p.key) return [];
		const name = p.shift ? `${entry.name}, with Shift` : entry.name;
		const modifiers: ReadonlyArray<{ control: boolean; command: boolean }> =
			p.control || p.command ? CONTROL_OR_COMMAND : [p];
		return modifiers.map((m) => ({
			shortcut: formatKeyboardShortcut(
				`${m.control ? "⌃" : ""}${p.option ? "⌥" : ""}${m.command ? "⌘" : ""}${p.key}`,
			),
			name,
		}));
	});
