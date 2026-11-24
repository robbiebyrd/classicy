import type { FC as FunctionalComponent, ReactNode } from "react";
import { useMemo } from "react";
import {
	classicyAppIdentityFrom,
	useClassicyAppIdentityOverrides,
} from "@/Appearance/ClassicyAppIdentity";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { registerAppleGuideTopic } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import { ClassicyKbd } from "@/SystemFolder/SystemResources/Kbd/ClassicyKbd";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

export const KEYBOARD_SHORTCUTS_TOPIC_ID = "keyboard-shortcuts";

/**
 * The Help menu's Show/Hide Balloons equivalent: Option-H, because the browser
 * keeps most Command and Control letters. The menu bar reads it from here, so
 * the menu and this topic never disagree.
 */
export const BALLOON_HELP_SHORTCUT = "⌥H";

/** One menu item that carries a keyboard equivalent, with where it lives. */
export type ClassicyShortcutEntry = {
	/** The item's chord, in the menu-item form ("⌃⌘S"). */
	shortcut: string;
	/** The item's title. */
	title: string;
	/** The top-level menu it is under; empty for a top-level item. */
	menu: string;
};

/**
 * Every item with a keyboard equivalent in `items`, depth first, each with
 * its top-level menu's title. Items without a title (spacers) are skipped.
 */
export function collectShortcutEntries(
	items: ClassicyMenuItem[] | undefined,
): ClassicyShortcutEntry[] {
	const out: ClassicyShortcutEntry[] = [];
	const walk = (list: ClassicyMenuItem[], menu: string) => {
		for (const item of list) {
			if (item.keyboardShortcut && item.title) {
				out.push({ shortcut: item.keyboardShortcut, title: item.title, menu });
			}
			if (item.menuChildren?.length) {
				walk(item.menuChildren, menu || item.title || "");
			}
		}
	};
	walk(items ?? [], "");
	return out;
}

const ShortcutList: FunctionalComponent<{
	entries: ClassicyShortcutEntry[];
	empty: string;
}> = ({ entries, empty }) =>
	entries.length === 0 ? (
		<p>{empty}</p>
	) : (
		<ul>
			{entries.map((e) => (
				<li key={`${e.menu}|${e.title}|${e.shortcut}`}>
					<ClassicyKbd shortcut={e.shortcut} /> {e.title}
					{e.menu ? <> ({e.menu} menu)</> : null}
				</li>
			))}
		</ul>
	);

/** Page 1: why Control and Option stand in for Command. */
const WhyPage: FunctionalComponent = () => (
	<>
		<p>
			Most keyboard equivalents on the Macintosh use the Command key,{" "}
			<ClassicyKbd shortcut="⌘" />. Classicy runs inside a web browser, and the
			browser keeps those combinations for itself.
		</p>
		<p>
			So Classicy uses the Control key, <ClassicyKbd shortcut="⌃" />, or the
			Option key, <ClassicyKbd shortcut="⌥" />, where the Macintosh would use
			Command. For example, Move To Trash is <ClassicyKbd shortcut="⌃⌫" />, and
			Show or Hide Balloons is <ClassicyKbd shortcut={BALLOON_HELP_SHORTCUT} />.
		</p>
		<p>The next pages list the equivalents in effect right now.</p>
	</>
);

type FrontApp = {
	id: string;
	name: string;
	icon: string;
	entries: ClassicyShortcutEntry[];
	entriesSource?: ClassicyMenuItem[];
};

// The front application and its equivalents, as of the last store change that
// had a front application. While the Apple Guide window itself is focused (an
// extension, which never counts as the front app) its window publishes an
// empty menu bar, so `Desktop.appMenu` is no longer the front app's: this
// holds what it was when the topic opened, and follows the front app after.
let lastFront: FrontApp = {
	id: "Finder.app",
	name: "Finder",
	icon: "",
	entries: [],
};

type FrontSource = {
	apps: ClassicyStore["System"]["Manager"]["Applications"]["apps"];
	focusedAppId: string | undefined;
	appMenu: ClassicyMenuItem[] | undefined;
};

function trackFront({ apps, focusedAppId, appMenu }: FrontSource): FrontApp {
	const front = focusedAppId ? apps[focusedAppId] : undefined;
	if (!front || front.extension) return lastFront;
	if (
		lastFront.id === front.id &&
		lastFront.name === front.name &&
		lastFront.entriesSource === appMenu
	) {
		return lastFront;
	}
	lastFront = {
		id: front.id,
		name: front.name,
		icon: front.icon,
		entries: collectShortcutEntries(appMenu),
		entriesSource: appMenu,
	};
	return lastFront;
}

const trackFromStore = (s: ReturnType<typeof useAppManager.getState>) =>
	trackFront({
		apps: s.System.Manager.Applications.apps,
		focusedAppId: s.System.Manager.Applications.focusedAppId,
		appMenu: s.System.Manager.Desktop.appMenu,
	});

// A test that replaces the store with a hook-only double has no `subscribe`
// or `getState`; the topic then simply reads what it is rendered with.
if (
	typeof useAppManager.subscribe === "function" &&
	typeof useAppManager.getState === "function"
) {
	useAppManager.subscribe(trackFromStore);
	trackFromStore(useAppManager.getState());
}

/** The front application, re-read on every change of the apps or the bar's menus. */
function useFrontApp(): FrontApp {
	useAppManager((s) => s.System.Manager.Applications.apps);
	useAppManager((s) => s.System.Manager.Applications.focusedAppId);
	useAppManager((s) => s.System.Manager.Desktop.appMenu);
	return lastFront;
}

/** Page 2: the frontmost app's equivalents, read from the store's live menus. */
const FrontAppPage: FunctionalComponent = () => {
	const front = useFrontApp();
	const overrides = useClassicyAppIdentityOverrides();
	const name = classicyAppIdentityFrom(overrides, front.id, front).name;
	return (
		<>
			<p>
				In <strong>{name}</strong>, the front application:
			</p>
			<ShortcutList
				entries={front.entries}
				empty={`${name} has no keyboard equivalents.`}
			/>
		</>
	);
};

/** Page 3: the system's equivalents, active whichever application is in front. */
const SystemPage: FunctionalComponent = () => {
	const systemMenu = useAppManager((s) => s.System.Manager.Desktop.systemMenu);
	const entries = useMemo(
		() => [
			...collectShortcutEntries(systemMenu),
			{
				shortcut: BALLOON_HELP_SHORTCUT,
				title: "Show or Hide Balloons",
				menu: "Help",
			},
		],
		[systemMenu],
	);
	return (
		<>
			<p>In every application:</p>
			<ShortcutList entries={entries} empty="None." />
		</>
	);
};

const pages: ReactNode[] = [
	<WhyPage key="why" />,
	<FrontAppPage key="front" />,
	<SystemPage key="system" />,
];

registerAppleGuideTopic({
	id: KEYBOARD_SHORTCUTS_TOPIC_ID,
	title: "Keyboard Shortcuts",
	pages,
});
