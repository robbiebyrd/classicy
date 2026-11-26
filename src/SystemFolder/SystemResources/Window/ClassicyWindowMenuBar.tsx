import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	useMemo,
	useRef,
} from "react";
import {
	classicyAppIdentityFrom,
	useClassicyAppIdentityOverrides,
} from "@/Appearance/ClassicyAppIdentity";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { CLASSICY_PART_ATTRIBUTE } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideContext";
import { startClassicyWhatsThis } from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyWhatsThis.internal";
import { withClassicyAppIdentityAboutItem } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";
import {
	classicyHelpMenuChildren,
	classicySystemHelpItems,
	findClassicyAppAboutItem,
	splitClassicyAppHelpMenus,
	stripClassicyAboutItem,
	trimClassicyMenuSpacers,
} from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyHelpMenu.internal";
import { useClassicyBundledAccessKeys } from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import {
	ClassicyMenu,
	type ClassicyMenuItem,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyMenuProvider } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";
import { useClassicyMenuCloseOnOutsideMouseDown } from "@/SystemFolder/SystemResources/Menu/useClassicyMenuCloseOnOutsideMouseDown";
import "./ClassicyWindowMenuBar.scss";

/**
 * The system part of a window bar's Help menu under a taskbar: the screen
 * bar's items (`system`, `classicySystemHelpItems`) without the Show/Hide
 * Balloons toggle (`help-toggle-balloons`, ⌥H): Windows 98's ToolTips always
 * show (WIG Ch.12 "ToolTips", p.276), so a window's Help has no toggle, and
 * Start ▸ Settings keeps it (plan 0020-w98 shell addendum B19). Under
 * `helpTopics` About Balloon Help… is replaced by WinHelp's "Help Topics"
 * (no ellipsis, access key H, Windows 98 SE's "&Help Topics"; WIG Ch.12
 * "The Help Topics Browser", p.284; Ch.7 "The Help Menu", p.99),
 * dispatching `APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT`, and under `whatsThis`
 * "What's This?" (⇧F1 shown, access key W, user.exe's "&What's This?"; WIG
 * Ch.12 p.275) follows it, starting the mode over the window
 * (`startWhatsThis`). Shift+F1 itself is the What's This? key hook's, so the
 * item's chord is only drawn (`nativeShortcut`). Without either flag the
 * rest of `system` is returned as given.
 */
export const classicyWindowSystemHelpItems = (
	system: ClassicyMenuItem[],
	{
		helpTopics,
		whatsThis,
		ak,
		startWhatsThis,
	}: {
		helpTopics: boolean;
		whatsThis: boolean;
		ak: (key: string) => string | undefined;
		startWhatsThis: () => void;
	},
): ClassicyMenuItem[] => {
	const shown = system.filter((item) => item.id !== "help-toggle-balloons");
	if (!helpTopics && !whatsThis) return shown;
	const key = (letter: string) => {
		const accessKey = ak(letter);
		return accessKey !== undefined ? { accessKey } : {};
	};
	const whatsThisItem: ClassicyMenuItem = {
		id: "help-whats-this",
		title: "What's This?",
		keyboardShortcut: "⇧F1",
		nativeShortcut: true,
		onClickFunc: startWhatsThis,
		...key("w"),
	};
	return shown.flatMap((item) => {
		if (item.id !== "help-about-balloon") return [item];
		const first: ClassicyMenuItem = helpTopics
			? {
					id: "help-topics",
					title: "Help Topics",
					event: APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT,
					// A menu item dispatches its event only with data.
					eventData: {},
					...key("h"),
				}
			: item;
		return whatsThis ? [first, whatsThisItem] : [first];
	});
};

export type ClassicyWindowMenuBarProps = {
	/** The owning app's id; with `windowId`, it keys the rendered menu. */
	appId: string;
	/** The window's id within its app. */
	windowId: string;
	/** The window's menus (its `appMenu`). */
	menuItems: ClassicyMenuItem[];
	/** Extra class names, merged onto the root after the component's own. */
	className?: string;
	/** Inline style, merged onto the root after the component's own. */
	style?: CSSProperties;
};

/**
 * True for an app's Quit item: its id ends with `_quit` (`quitMenuItemHelper`
 * makes `<appId>_quit`) or it is titled "Quit".
 */
const isClassicyQuitItem = (item: ClassicyMenuItem): boolean =>
	item.id?.endsWith("_quit") === true || item.title === "Quit";

/**
 * True for a window's Close Window item: titled "Close Window"
 * (`closeWindowMenuItemHelper`) or with an id ending `_closew` (Finder's
 * folder windows).
 */
const isClassicyCloseWindowItem = (item: ClassicyMenuItem): boolean =>
	item.title === "Close Window" || item.id?.endsWith("_closew") === true;

/**
 * True for an app's Special menu: a menu (it has `menuChildren`) whose id
 * ends with `_special` or titled "Special".
 */
export const isClassicySpecialMenu = (item: ClassicyMenuItem): boolean =>
	item.menuChildren !== undefined &&
	(item.id?.endsWith("_special") === true || item.title === "Special");

/** True for an app's File menu: a menu whose id ends `_file` or titled "File". */
const isClassicyFileMenu = (item: ClassicyMenuItem): boolean =>
	item.menuChildren !== undefined &&
	(item.id?.endsWith("_file") === true || item.title === "File");

/** `item` retitled `title`, its access key `accessKey` when one is given. */
const retitled = (
	item: ClassicyMenuItem,
	title: string,
	accessKey: string | undefined,
	keepOwnKey: boolean,
): ClassicyMenuItem => {
	const { accessKey: ownKey, ...rest } = item;
	const key = accessKey ?? (keepOwnKey ? ownKey : undefined);
	return { ...rest, title, ...(key !== undefined ? { accessKey: key } : {}) };
};

/**
 * Under a taskbar, the app's Quit item (`quitMenuItemHelper`, id
 * `<appId>_quit`; any item whose id ends `_quit` or titled "Quit") reads
 * "Exit", Windows' last File command (WIG Ch.7 "The File Menu", p.98; its
 * access key X, Appendix B Table B.5), keeping its handler, wherever it sits.
 * `withClassicyWindowsFileMenu` also moves it to the File menu's end.
 */
export const withClassicyExitItem = (
	menus: ClassicyMenuItem[],
	appId: string,
	accessKey?: string,
): ClassicyMenuItem[] =>
	menus.map((item) => {
		if (isClassicyQuitItem(item) && !item.menuChildren)
			return retitled(item, "Exit", accessKey, false);
		return item.menuChildren
			? {
					...item,
					menuChildren: withClassicyExitItem(
						item.menuChildren,
						appId,
						accessKey,
					),
				}
			: item;
	});

/**
 * A window bar's menus under a taskbar, shaped as Windows 98's (WIG Ch.1
 * "Consistency", p.2; Ch.2 p.13; Ch.7 "The File Menu", p.98; plan 0020-w98
 * shell addendum B1):
 * - The Special menu (`isClassicySpecialMenu`) is not drawn: its items have
 *   their homes in the shell (Empty Trash… and Reset PRAM… in the Start menu,
 *   `classicyStartMenuItems`; the Trash's own Empty on its icon's menu).
 * - The File menu ends with a divider and Exit: its Quit item, retitled
 *   "Exit" (access key `exitKey`), is moved there. A File menu with no Quit
 *   (a Finder folder window's) ends with a divider and Close instead: its
 *   Close Window item, retitled "Close" (access key `closeKey`, else its
 *   own), moved there.
 * - A Quit item anywhere else reads "Exit" in place (`withClassicyExitItem`).
 */
export const withClassicyWindowsFileMenu = (
	menus: ClassicyMenuItem[],
	appId: string,
	{ exitKey, closeKey }: { exitKey?: string; closeKey?: string } = {},
): ClassicyMenuItem[] =>
	withClassicyExitItem(
		menus.flatMap((menu) => {
			if (isClassicySpecialMenu(menu)) return [];
			if (!isClassicyFileMenu(menu)) return [menu];
			const children = menu.menuChildren ?? [];
			const quit = children.find(
				(item) => !item.menuChildren && isClassicyQuitItem(item),
			);
			const close = quit
				? undefined
				: children.find(
						(item) => !item.menuChildren && isClassicyCloseWindowItem(item),
					);
			const last = quit
				? retitled(quit, "Exit", exitKey, false)
				: close
					? retitled(close, "Close", closeKey, true)
					: undefined;
			if (!last) return [menu];
			const rest = trimClassicyMenuSpacers(
				children.filter((item) => item !== (quit ?? close)),
			);
			return [
				{
					...menu,
					menuChildren:
						rest.length > 0 ? [...rest, { id: "spacer" }, last] : [last],
				},
			];
		}),
		appId,
		exitKey,
	);

/**
 * A window's own menu bar, for Appearance Packages whose layout sets
 * `menuBar.placement` to `"window"`: `ClassicyWindow` renders it directly
 * under its title bar with the window's `appMenu` (not for utility windows,
 * modals or a collapsed window), and the screen menu bar renders nothing (it
 * still dispatches keyboard equivalents). It reuses the screen bar's menu
 * classes (`classicyDesktopMenu`) inside its own `ClassicyMenuProvider`: its
 * menus open and stick as the screen bar's do, and close on a selection, a
 * re-click of the open title, a mouse-down anywhere outside the bar or the
 * package's idle time-out (`layout.menuBar.idleTimeoutMs`, 15 s when it
 * declares none; Windows 98 never). The
 * bar's flex and `order` rules come from the screen bar's stylesheet, which
 * loads with `ClassicyDesktopMenuBar` (the desktop always mounts it).
 *
 * Without a taskbar, only the app's menus have a home here: the Apple, Help
 * and App Switcher menus, the clock and menu bar extensions
 * (`ClassicyMenuBarExtension`, which portals into the screen bar's extensions
 * list) are not shown in window placement. Under a taskbar
 * (`layout.taskbar`, the Windows 95/98 shell, plan 0020-w98 §4), where no
 * screen bar is drawn, the bar ends with the Help menu (WIG Ch.7 "The Menu
 * Bar and Drop-down Menus", p.97; "The Help Menu", p.99): the app's menus,
 * its About item and its own Help menus taken out, then a last "Help" menu
 * (part `help`) holding the system's Help items, the app's registered items
 * (`useClassicyHelpMenu`), the items of its own Help menus, and, after a
 * divider, "About <display name>" (access key A) when the app has an About
 * item; the File menu ends with a divider and Exit, the app's Quit item
 * retitled (or, with no Quit, Close, its Close Window retitled), and the
 * Special menu is not drawn (`withClassicyWindowsFileMenu`). The
 * headless screen bar reserves no band: the desktop root's
 * `--menu-bar-height` is `0px` in this placement (`classicyLayoutThemeVars`),
 * so window geometry (`windowViewportFloor` in `ClassicyWindow.tsx`) lets a
 * window be placed, zoomed, dragged or resized up to the screen's top edge.
 */
export const ClassicyWindowMenuBar: FunctionalComponent<
	ClassicyWindowMenuBarProps
> = ({ appId, windowId, menuItems, className, style }) => (
	<ClassicyMenuProvider>
		<ClassicyWindowMenuBarContent
			appId={appId}
			windowId={windowId}
			menuItems={menuItems}
			className={className}
			style={style}
		/>
	</ClassicyMenuProvider>
);

// Inside the provider, so the outside-click hook closes this bar's menus.
const ClassicyWindowMenuBarContent: FunctionalComponent<
	ClassicyWindowMenuBarProps
> = ({ appId, windowId, menuItems, className, style }) => {
	const rootRef = useRef<HTMLDivElement>(null);
	useClassicyMenuCloseOnOutsideMouseDown(rootRef);
	// The app's About item is stored under the app's own name (K-R8), read
	// from its record; when that title is "About <own name>" it is titled
	// with the active package's display name here, where it is drawn. Any
	// other wording the app chose is drawn as stored (K-R9).
	const appName = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId]?.name,
	);
	const overrides = useClassicyAppIdentityOverrides();
	const layout = useClassicyAppearanceLayout();
	// Under a taskbar no screen bar is drawn, so the window's bar carries Help.
	const helpInBar = layout.taskbar !== undefined;
	// WinHelp's Help Topics in place of About Balloon Help…
	// (`help.topicWindow` "winhelp"), and What's This? after it
	// (`balloonHelp.contextHelp` "whatsThis"); absent the keys, the system
	// items as the screen bar draws them.
	const helpTopics = layout.help?.topicWindow === "winhelp";
	const whatsThis = layout.balloonHelp?.contextHelp === "whatsThis";
	const ak = useClassicyBundledAccessKeys();
	// The app's registered Help items (`useClassicyHelpMenu`), read
	// defensively as the screen bar reads them.
	const registeredHelpItems = useAppManager(
		(state) => state.System.Manager.Desktop?.helpMenu?.[appId],
	);
	const items = useMemo(() => {
		if (!helpInBar) {
			return (
				withClassicyAppIdentityAboutItem(
					menuItems,
					appId,
					appName,
					overrides,
				) ?? []
			);
		}
		// About leaves the app's menus for the end of Help, and the app's own
		// Help menus are merged into the one Help menu, as the screen bar does.
		const aboutItem = findClassicyAppAboutItem(menuItems, appId);
		const { menus, helpMenus } = splitClassicyAppHelpMenus(
			aboutItem ? stripClassicyAboutItem(menuItems, aboutItem) : menuItems,
		);
		const helpChildren = classicyHelpMenuChildren(
			classicyWindowSystemHelpItems(
				// The toggle's title is never drawn here: the bar drops it.
				classicySystemHelpItems(false),
				{
					helpTopics,
					whatsThis,
					ak,
					startWhatsThis: () =>
						startClassicyWhatsThis(
							rootRef.current?.closest<HTMLElement>(".classicyWindow") ??
								undefined,
						),
				},
			),
			registeredHelpItems,
			helpMenus,
		);
		if (aboutItem) {
			// "About <application name>", no ellipsis (WIG p.99), by the name
			// the active package shows, access key A (Notepad's "&About
			// Notepad"; WIG App. B Table B.5); the item keeps its handler.
			const { name } = classicyAppIdentityFrom(overrides, appId, {
				name: appName ?? appId,
				icon: "",
			});
			helpChildren.push(
				{ id: "spacer" },
				{
					...aboutItem,
					title: `About ${name}`,
					...(ak("a") !== undefined ? { accessKey: ak("a") } : {}),
				},
			);
		}
		return [
			...withClassicyWindowsFileMenu(menus, appId, {
				exitKey: ak("x"),
				closeKey: ak("c"),
			}),
			{
				id: `${appId}_${windowId}_help-menu`,
				title: "Help",
				part: "help",
				menuChildren: helpChildren,
			},
		];
	}, [
		helpInBar,
		menuItems,
		appId,
		windowId,
		appName,
		overrides,
		registeredHelpItems,
		helpTopics,
		whatsThis,
		ak,
	]);
	return (
		<div
			ref={rootRef}
			className={classNames("classicyWindowMenuBar", className)}
			style={style}
			{...{ [CLASSICY_PART_ATTRIBUTE.part]: "window-menu-bar" }}
		>
			<ClassicyMenu
				name={`${appId}_${windowId}_menuBar`}
				menuItems={items}
				navClass="classicyDesktopMenu classicyWindowMenu"
				subNavClass="classicySubMenu"
			/>
		</div>
	);
};
