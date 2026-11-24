import he from "he";
import type { FC as FunctionalComponent, ReactNode } from "react";
import { useMemo } from "react";
import {
	classicyAppIdentityFrom,
	useClassicyAppIdentityOverrides,
} from "@/Appearance/ClassicyAppIdentity";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useFrontAppId } from "@/SystemFolder/ControlPanels/AppManager/ClassicyFrontApp";
import { registerAppleGuideTopic } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import {
	BALLOON_HELP_SHORTCUT,
	KEYBOARD_SHORTCUTS_TOPIC_ID,
	useClassicyStandardHelpMenu,
} from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyStandardHelpMenu";
import { ClassicyKbd } from "@/SystemFolder/SystemResources/Kbd/ClassicyKbd";
import {
	isClassicyMacPlatform,
	parseKeyboardShortcut,
} from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/** One menu item that carries a keyboard equivalent, with where it lives. */
export type ClassicyShortcutEntry = {
	/** The item's chord, in the menu-item form ("⌃⌘S"). */
	shortcut: string;
	/** The item's title, as plain text. */
	title: string;
	/** The top-level menu it is under; empty for a top-level item. */
	menu: string;
	/** The browser handles the chord itself (the editing commands). */
	native?: boolean;
};

/**
 * Every item with a keyboard equivalent in `items`, depth first, each with
 * its top-level menu's title (entities decoded, as `ClassicyMenu` draws them).
 * Items without a title (spacers) are skipped.
 */
export function collectShortcutEntries(
	items: ClassicyMenuItem[] | undefined,
	menuTitle = "",
): ClassicyShortcutEntry[] {
	const out: ClassicyShortcutEntry[] = [];
	const walk = (list: ClassicyMenuItem[], menu: string) => {
		for (const item of list) {
			const title = item.title ? he.decode(item.title) : "";
			if (item.keyboardShortcut && title) {
				out.push({
					shortcut: item.keyboardShortcut,
					title,
					menu,
					...(item.nativeShortcut ? { native: true } : {}),
				});
			}
			if (item.menuChildren?.length) walk(item.menuChildren, menu || title);
		}
	};
	walk(items ?? [], menuTitle);
	return out;
}

/**
 * A chord the browser itself handles, spelled for the host: the Command key
 * on a Mac, Control (and Alt for Option) elsewhere.
 */
function nativeKeys(shortcut: string, mac: boolean): ReactNode {
	if (mac) return <ClassicyKbd shortcut={shortcut} />;
	const p = parseKeyboardShortcut(shortcut);
	const parts = [
		...(p.control || p.command ? ["Ctrl"] : []),
		...(p.option ? ["Alt"] : []),
		...(p.shift ? ["Shift"] : []),
		p.key,
	];
	return <ClassicyKbd>{parts.join("+")}</ClassicyKbd>;
}

const ShortcutList: FunctionalComponent<{
	entries: ClassicyShortcutEntry[];
	empty: string;
}> = ({ entries, empty }) => {
	const mac = isClassicyMacPlatform();
	return entries.length === 0 ? (
		<p>{empty}</p>
	) : (
		<ul>
			{entries.map((e) => (
				<li key={`${e.menu}|${e.title}|${e.shortcut}`}>
					{e.native ? (
						nativeKeys(e.shortcut, mac)
					) : (
						<ClassicyKbd shortcut={e.shortcut} />
					)}{" "}
					{e.title}
					{e.menu ? <> ({e.menu} menu)</> : null}
					{e.native ? <>, the browser&rsquo;s own</> : null}
				</li>
			))}
		</ul>
	);
};

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
		<p>
			The editing commands (Undo, Cut, Copy, Paste and Select All) are the one
			exception: they keep the browser&rsquo;s own keys, Command on a Mac and
			Control elsewhere.
		</p>
		<p>The next pages list the equivalents in effect right now.</p>
	</>
);

/** Page 2: the front application's equivalents, read from the live menus. */
const FrontAppPage: FunctionalComponent = () => {
	const frontId = useFrontAppId();
	const app = useAppManager((s) =>
		frontId ? s.System.Manager.Applications.apps[frontId] : undefined,
	);
	const appMenu = useAppManager((s) => s.System.Manager.Desktop.appMenu);
	const overrides = useClassicyAppIdentityOverrides();
	const name = app
		? classicyAppIdentityFrom(overrides, app.id, app).name
		: "Finder";
	const entries = useMemo(() => collectShortcutEntries(appMenu), [appMenu]);
	return (
		<>
			<p>
				In <strong>{name}</strong>, the front application:
			</p>
			<ShortcutList
				entries={entries}
				empty={`${name} has no keyboard equivalents.`}
			/>
		</>
	);
};

/** Page 3: the system's equivalents, active whichever application is in front. */
const SystemPage: FunctionalComponent = () => {
	const systemMenu = useAppManager((s) => s.System.Manager.Desktop.systemMenu);
	const global = useAppManager((s) => s.System.Manager.Keyboard.global);
	const apps = useAppManager((s) => s.System.Manager.Applications.apps);
	const overrides = useClassicyAppIdentityOverrides();
	// The standard Help menu's own items, from the one builder both menu bars
	// use; the front app's help items are not "every application".
	const { helpItem } = useClassicyStandardHelpMenu({
		appMenu: undefined,
		appId: undefined,
	});
	const entries = useMemo(
		() => [
			...collectShortcutEntries(systemMenu),
			...collectShortcutEntries(helpItem.menuChildren, "Help"),
			...Object.entries(global).map(([chord, g]) => ({
				shortcut: g.shortcut ?? chord,
				title:
					g.title ??
					(apps[g.appId]
						? classicyAppIdentityFrom(overrides, g.appId, apps[g.appId]).name
						: g.appId),
				menu: "",
			})),
		],
		[systemMenu, helpItem, global, apps, overrides],
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
