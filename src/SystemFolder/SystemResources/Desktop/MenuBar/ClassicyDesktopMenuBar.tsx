import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import "./ClassicyDesktopMenuBar.scss";
import { ClassicyDesktopMenuWidgetSound } from "@/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Sound/ClassicyDesktopMenuWidgetSound";
import { ClassicyDesktopMenuWidgetTime } from "@/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime";
import {
	ClassicyMenu,
	type ClassicyMenuItem,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyMenuContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuContext";
import { ClassicyMenuProvider } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";
import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import {
	type FC as FunctionalComponent,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from "react";

import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { appSwitcherAppsFrom } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";
import { collectMenuChords } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";

const appleMenuIcon = ClassicyIcons.system.apple;

/**
 * Depth-first search of a menu tree for an app's "About" item. Apps publish
 * their About entry (id `${appId}_about`, title "About") nested somewhere in
 * their menu (typically under a Help or apple submenu — see
 * `useClassicyAboutMenu`). Preference order per the HIG #209 rule: an exact
 * `${appId}_about` id, then any id ending in `_about`, then a title of "About".
 */
const findAppAboutItem = (
	items: ClassicyMenuItem[] | undefined,
	appId: string,
): ClassicyMenuItem | undefined => {
	if (!items) return undefined;
	const matches = (item: ClassicyMenuItem): boolean =>
		item.id === `${appId}_about` ||
		item.id?.endsWith("_about") === true ||
		item.title === "About";
	const search = (
		list: ClassicyMenuItem[],
		predicate: (item: ClassicyMenuItem) => boolean,
	): ClassicyMenuItem | undefined => {
		for (const item of list) {
			if (predicate(item)) return item;
			if (item.menuChildren && item.menuChildren.length > 0) {
				const found = search(item.menuChildren, predicate);
				if (found) return found;
			}
		}
		return undefined;
	};
	// Prefer the focused app's exact About id before the looser fallbacks so an
	// unrelated `_about` entry can't shadow the real one.
	return (
		search(items, (item) => item.id === `${appId}_about`) ??
		search(items, matches)
	);
};

/** True for the systemMenu's own leading "About This Computer" entry. */
const isAboutThisComputerItem = (item: ClassicyMenuItem): boolean =>
	item.id === "about" || item.title === "About This Computer";

/** Drop leading/trailing dividers and collapse runs left behind by a removal. */
const trimSpacers = (items: ClassicyMenuItem[]): ClassicyMenuItem[] => {
	const trimmed: ClassicyMenuItem[] = [];
	for (const item of items) {
		if (
			item.id === "spacer" &&
			(trimmed.length === 0 || trimmed[trimmed.length - 1].id === "spacer")
		) {
			continue;
		}
		trimmed.push(item);
	}
	while (trimmed.length > 0 && trimmed[trimmed.length - 1].id === "spacer") {
		trimmed.pop();
	}
	return trimmed;
};

/**
 * Remove the hoisted About entry (matched by reference — it came out of this
 * same tree via `findAppAboutItem`) from the app's published menus so About
 * renders only in the Apple menu. Menus emptied by the removal are dropped
 * entirely, and dividers left dangling by it are tidied away.
 */
const stripAboutItem = (
	items: ClassicyMenuItem[],
	aboutItem: ClassicyMenuItem,
): ClassicyMenuItem[] =>
	items.flatMap((item) => {
		if (item === aboutItem) return [];
		if (!item.menuChildren || item.menuChildren.length === 0) return [item];
		const menuChildren = trimSpacers(
			stripAboutItem(item.menuChildren, aboutItem),
		);
		if (menuChildren.length === 0) return [];
		return [{ ...item, menuChildren }];
	});

export const ClassicyDesktopMenuBar: FunctionalComponent = () => {
	return (
		<ClassicyMenuProvider>
			<ClassicyDesktopMenuBarContent />
		</ClassicyMenuProvider>
	);
};

const ClassicyDesktopMenuBarContent: FunctionalComponent = () => {
	const apps = useAppManager((s) => s.System.Manager.Applications.apps);
	const systemMenu = useAppManager((s) => s.System.Manager.Desktop.systemMenu);
	const appMenu = useAppManager((s) => s.System.Manager.Desktop.appMenu);
	const disableBalloonHelp = useAppManager(
		(s) => s.System.Manager.Desktop.disableBalloonHelp,
	);
	// Optional per-app Help entries. Read defensively so the bar works whether or
	// not a consumer has populated a `helpMenu` slot on the desktop store.
	const appHelpMenu = useAppManager((s) => s.System.Manager.Desktop?.helpMenu);
	const desktopEventDispatch = useAppManagerDispatch();
	const { closeAll } = useContext(ClassicyMenuContext);
	const navRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (navRef.current && !navRef.current.contains(e.target as Node)) {
				closeAll();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [closeAll]);

	const appSwitcherData = useMemo(() => appSwitcherAppsFrom(apps), [apps]);

	const setActiveApp = (appId: string) => {
		desktopEventDispatch({
			type: "ClassicyAppFocus",
			app: { id: appId },
		});
	};

	const appSwitcherMenuMenuItem: ClassicyMenuItem = useMemo(() => {
		const focusedApp = appSwitcherData.find((a) => a.focused);
		return {
			id: "app-switcher",
			image: focusedApp?.icon || "",
			title: focusedApp?.name || "Finder",
			className: "classicyDesktopMenuAppSwitcher",
			menuChildren: appSwitcherData
				.filter((a) => a.open)
				.map((app) => ({
					id: app.id,
					icon: app.icon,
					title: app.name,
					onClickFunc: () => {
						setActiveApp(app.id);
					},
				})),
		};
		// biome-ignore lint/correctness/useExhaustiveDependencies: setActiveApp is defined inline and recreated each render; including it would cause infinite loops
	}, [appSwitcherData, setActiveApp]);

	// Standard Help menu (HIG Ch. 4 "Menu Bar"): rightmost of the standard
	// menus. About Balloon Help, a Show/Hide Balloons toggle wired to the
	// existing balloon-help store flag, and a slot for app-supplied help items.
	const helpMenuItem: ClassicyMenuItem = useMemo(() => {
		const helpChildren: ClassicyMenuItem[] = [
			{
				id: "help-about-balloon",
				title: "About Balloon Help…",
				onClickFunc: () => {},
			},
			{
				id: "help-toggle-balloons",
				title: disableBalloonHelp ? "Show Balloons" : "Hide Balloons",
				// Real working equivalent — Option-H rather than a ⌘ combo, since
				// the browser reserves most ⌘/Ctrl+letter chords. Fires whether or
				// not the Help menu is dropped down.
				keyboardShortcut: "⌥H",
				event: "ClassicyDesktopSetBalloonHelp",
				eventData: { disableBalloonHelp: !disableBalloonHelp },
			},
		];
		if (appHelpMenu && appHelpMenu.length > 0) {
			helpChildren.push({ id: "spacer" }, ...appHelpMenu);
		}
		return {
			id: "help-menu",
			title: "Help",
			className: "classicyDesktopMenuHelp",
			menuChildren: helpChildren,
		};
	}, [disableBalloonHelp, appHelpMenu]);

	// HIG #209: the first Apple-menu item is "About <the focused app>". Resolve
	// the focused app (fallback Finder), *move* its About entry out of the app's
	// published menu into the Apple menu — then splice in the rest of the system
	// menu with its own "About This Computer" entry removed to avoid two Abouts.
	const { appleMenuItem, strippedAppMenu } = useMemo(() => {
		const appList = Object.values(apps);
		const focusedApp =
			appList.find((a) => a.focused === true) ??
			apps["Finder.app"] ??
			appList[0];
		const focusedAppId = focusedApp?.id ?? "Finder.app";
		const appName = focusedApp?.name ?? "Finder";

		const aboutItem = findAppAboutItem(appMenu, focusedAppId);

		let menuChildren: ClassicyMenuItem[];
		if (aboutItem) {
			// Drop the system menu's leading "About This Computer" (and a spacer
			// immediately after it) so our injected spacer isn't doubled.
			let rest = systemMenu ?? [];
			if (rest[0] && isAboutThisComputerItem(rest[0])) {
				rest = rest.slice(1);
				if (rest[0]?.id === "spacer") rest = rest.slice(1);
			}
			menuChildren = [
				{
					id: `${focusedAppId}_about_apple`,
					title: `About ${appName}`,
					onClickFunc: aboutItem.onClickFunc,
				},
				{ id: "spacer" },
				...rest,
			];
		} else {
			// No app About available — leave the system menu untouched.
			menuChildren = systemMenu;
		}

		return {
			appleMenuItem: {
				id: "apple-menu",
				image: appleMenuIcon,
				menuChildren,
				className: "clasicyDesktopMenuAppleMenu",
			} satisfies ClassicyMenuItem,
			// The hoisted About must not also render in the app's own menus.
			strippedAppMenu:
				aboutItem && appMenu ? stripAboutItem(appMenu, aboutItem) : appMenu,
		};
	}, [apps, appMenu, systemMenu]);

	const defaultMenuItems: ClassicyMenuItem[] = useMemo(() => {
		const items = [appleMenuItem] as ClassicyMenuItem[];
		if (strippedAppMenu) {
			items.push(...strippedAppMenu);
		}
		// Help is the rightmost standard menu; the App Switcher floats to the far
		// right of the bar (8.5+ construct) and is kept last in the data.
		items.push(helpMenuItem);
		items.push(appSwitcherMenuMenuItem);
		return items;
	}, [appleMenuItem, strippedAppMenu, helpMenuItem, appSwitcherMenuMenuItem]);

	const focusedAppId = useMemo(() => {
		const focused = Object.values(apps).find((a) => a.focused === true);
		return focused?.id ?? "Finder.app";
	}, [apps]);

	// App scope: the focused app's menu chords, keyed by appId. Re-runs when the
	// focused app or its published menu changes.
	const appChordsKey = useMemo(
		() => collectMenuChords(appMenu ?? []).join("|"),
		[appMenu],
	);
	useEffect(() => {
		desktopEventDispatch({
			type: "ClassicyShortcutRegister",
			scope: "app",
			appId: focusedAppId,
			chords: appChordsKey ? appChordsKey.split("|") : [],
		});
	}, [focusedAppId, appChordsKey, desktopEventDispatch]);

	// System scope: the desktop's own always-active chords (system menu + Help).
	const systemChordsKey = useMemo(
		() => collectMenuChords([...(systemMenu ?? []), helpMenuItem]).join("|"),
		[systemMenu, helpMenuItem],
	);
	useEffect(() => {
		desktopEventDispatch({
			type: "ClassicyShortcutRegister",
			scope: "system",
			chords: systemChordsKey ? systemChordsKey.split("|") : [],
		});
	}, [systemChordsKey, desktopEventDispatch]);

	// HIG #187: app-wide command-key dispatch is handled by ClassicyMenu's own
	// root keydown listener (below, `menuItems={defaultMenuItems}`), which fires a
	// matching item's action whether or not a menu is dropped down. No separate
	// listener is needed here.

	return (
		<nav ref={navRef} className={"classicyDesktopMenuBar"}>
			<ClassicyMenu
				name={"desktopMenuBar"}
				menuItems={defaultMenuItems}
				navClass={"classicyDesktopMenu"}
				subNavClass={"classicySubMenu"}
			>
				<ClassicyDesktopMenuWidgetSound />
				<ClassicyDesktopMenuWidgetTime />
			</ClassicyMenu>
		</nav>
	);
};
