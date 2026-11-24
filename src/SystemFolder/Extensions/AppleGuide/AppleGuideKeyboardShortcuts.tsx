import type { FC as FunctionalComponent, ReactNode } from "react";
import { useMemo } from "react";
import {
	classicyAppIdentityFrom,
	useClassicyAppIdentityOverrides,
} from "@/Appearance/ClassicyAppIdentity";
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

/** The app whose menus the bar shows: the focused non-extension app, else Finder. */
function useFrontApp() {
	const apps = useAppManager((s) => s.System.Manager.Applications.apps);
	const overrides = useClassicyAppIdentityOverrides();
	return useMemo(() => {
		const list = Object.values(apps);
		const front =
			list.find((a) => a.focused === true && !a.extension) ??
			apps["Finder.app"] ??
			list[0];
		return {
			id: front?.id,
			name: front
				? classicyAppIdentityFrom(overrides, front.id, front).name
				: "Finder",
		};
	}, [apps, overrides]);
}

/** Page 2: the frontmost app's equivalents, read from the store's live menus. */
const FrontAppPage: FunctionalComponent = () => {
	const front = useFrontApp();
	const appMenu = useAppManager((s) => s.System.Manager.Desktop.appMenu);
	const entries = useMemo(() => collectShortcutEntries(appMenu), [appMenu]);
	return (
		<>
			<p>
				In <strong>{front.name}</strong>, the front application:
			</p>
			<ShortcutList
				entries={entries}
				empty={`${front.name} has no keyboard equivalents.`}
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
