import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import "./ClassicyDesktopMenuBar.scss";
import { ClassicyDesktopMenuWidgetTime } from "@/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime";
import {
	ClassicyMenu,
	type ClassicyMenuItem,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyMenuContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuContext";
import { ClassicyMenuProvider } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";
import { useClassicyMenuCloseOnOutsideMouseDown } from "@/SystemFolder/SystemResources/Menu/useClassicyMenuCloseOnOutsideMouseDown";
import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import {
	classicyAppIdentityFrom,
	useClassicyAppIdentityOverrides,
} from "@/Appearance/ClassicyAppIdentity";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { CLASSICY_PART_ATTRIBUTE } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { useFrontAppId } from "@/SystemFolder/ControlPanels/AppManager/ClassicyFrontApp";
import { ClassicyAppSwitcherTearOff } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherTearOff.internal";
import {
	appSwitcherAppsFrom,
	appSwitcherEntryDescription,
	appSwitcherEntryMark,
	withClassicyAppIdentityMenuItems,
} from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";
import { useClassicyShortcutDispatcher } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher";
import {
	trimMenuSpacers,
	useClassicyStandardHelpMenu,
} from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyStandardHelpMenu";
import { collectMenuChords } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";
import { useClassicyNotificationBlink } from "@/SystemFolder/SystemResources/Notification/ClassicyNotificationBlink.internal";
import {
	type ClassicyNotificationMenuBarIcons,
	classicyNotificationMenuBarDescriptions,
	classicyNotificationMenuBarIcons,
	useClassicyNotifications,
	useClassicyNotifiedAppIds,
} from "@/SystemFolder/SystemResources/Notification/ClassicyNotificationManager";
import {
	useClassicyRecentItemsMenuItems,
	withClassicyRecentItemsMenuItems,
} from "@/SystemFolder/SystemResources/RecentItems/ClassicyRecentItemsMenu";

const NO_NOTIFICATION_ICONS: ClassicyNotificationMenuBarIcons = {
	apple: [],
	application: [],
};

export type ClassicyDesktopMenuBarProps = {
	/** Extra class names, merged onto the `<nav>` after the component's own. */
	className?: string;
	/** Inline style, merged onto the `<nav>` after the component's own. */
	style?: CSSProperties;
	/**
	 * Where the menus are drawn: `"screen"` renders this bar; `"window"`
	 * renders nothing, because each window draws its own menus in a
	 * `ClassicyWindowMenuBar`. Defaults to the active Appearance Package's
	 * `layout.menuBar.placement`.
	 */
	placement?: ClassicyAppearanceLayout["menuBar"]["placement"];
};

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
		const menuChildren = trimMenuSpacers(
			stripAboutItem(item.menuChildren, aboutItem),
		);
		if (menuChildren.length === 0) return [];
		return [{ ...item, menuChildren }];
	});

/**
 * The Mac OS 8 menu bar (HIGOS8 Ch.4, p.91) across the top of the desktop —
 * Classicy's top-level `<nav>`. `ClassicyDesktop` mounts it, and it reads its
 * menus from the store. Its optional props are `className`, `style` and
 * `placement` (`"screen" | "window"`, defaulting to the active Appearance
 * Package's `layout.menuBar.placement`). With `"window"` it renders nothing
 * but stays mounted, so it still runs the keyboard-equivalent dispatcher.
 *
 * From left to right it shows the Apple menu (the system menu, led by "About
 * <focused app>" when that app publishes an About item — the item is moved
 * out of the app's own menus — then its items in alphabetical order, Recent
 * Applications and Recent Documents among them), the focused window's
 * `appMenu`, the standard
 * Help menu (always the rightmost: About Balloon Help…, Show/Hide Balloons
 * ⌥H, Keyboard Shortcuts…, then the focused app's `useClassicyHelpMenu` items and the items of a top-level "Help" menu the app publishes itself, as Finder does: the bar draws one Help menu), then, at the far
 * right, menu bar extensions (`ClassicyMenuBarExtension`), the clock and the
 * App Switcher. Menus are sticky (HIGOS8 p.92): a click leaves one open, and
 * it closes after 15 seconds idle or on a click outside the bar.
 *
 * It also runs the app-wide keyboard-equivalent dispatcher: a chord fires the
 * matching item of the focused app's menus, then the system menus, then an
 * extension's global shortcut — whether or not a menu is open.
 *
 * When `placement` is `"window"` (a package's `layout.menuBar.placement`),
 * the bar stays mounted and keeps dispatching and registering chords but
 * renders nothing; each window shows its own menus in a
 * `ClassicyWindowMenuBar`. The Apple, Help and App Switcher menus, the clock
 * and menu bar extensions (which portal into this bar) are then not shown.
 */
export const ClassicyDesktopMenuBar: FunctionalComponent<
	ClassicyDesktopMenuBarProps
> = ({ className, style, placement }) => {
	return (
		<ClassicyMenuProvider>
			<ClassicyDesktopMenuBarContent
				className={className}
				style={style}
				placement={placement}
			/>
		</ClassicyMenuProvider>
	);
};

const ClassicyDesktopMenuBarContent: FunctionalComponent<
	ClassicyDesktopMenuBarProps
> = ({ className, style, placement }) => {
	const layout = useClassicyAppearanceLayout();
	const resolvedPlacement = placement ?? layout.menuBar.placement;
	const appleMenuArt = useClassicyAsset("systemArt", "appleMenu") ?? "";
	// The Help menu's title art (System 7's balloon) is read by
	// `useClassicyStandardHelpMenu`, which builds the Help menu below.
	const apps = useAppManager((s) => s.System.Manager.Applications.apps);
	const frontAppId = useFrontAppId();
	const systemMenu = useAppManager((s) => s.System.Manager.Desktop.systemMenu);
	const appMenu = useAppManager((s) => s.System.Manager.Desktop.appMenu);
	const recentMenuItems = useClassicyRecentItemsMenuItems();
	const desktopEventDispatch = useAppManagerDispatch();
	const navRef = useRef<HTMLElement>(null);
	useClassicyMenuCloseOnOutsideMouseDown(navRef);
	// Window placement unmounts the bar but keeps its provider, so a menu
	// open at the switch (a keyboard equivalent or host code changed the
	// package, with no mouse-down to close it) would leave the provider
	// active: back on the screen, hovering a title would open its menu.
	const { closeAll } = useContext(ClassicyMenuContext);
	useEffect(() => {
		if (resolvedPlacement === "window") closeAll();
	}, [resolvedPlacement, closeAll]);

	// The active package's display overrides (its `apps`): the switcher, the
	// About item and the Apple-menu app entries show each app by its display
	// identity, while ids, events and the store keep the internal one.
	const overrides = useClassicyAppIdentityOverrides();
	const finderName = classicyAppIdentityFrom(overrides, "Finder.app", {
		name: "Finder",
		icon: "",
	}).name;

	// Notification Manager requests (Inside Macintosh: Processes, p. 5-4):
	// a ◆ beside each app a request marks, and each request's icon blinking
	// over the Application menu's title (a marked app it lists) or the Apple
	// menu's (any other), described for assistive technology. While a menu
	// is open the blink stops where it is, and an open title shows its own
	// icon, as Mac OS 8.1 draws them (observed for the Application title; the
	// Apple title's is inferred, as stock 8.1 blinks nothing there); nothing
	// blinks where this bar is not drawn (window placement).
	const notifiedAppIds = useClassicyNotifiedAppIds();
	const notifications = useClassicyNotifications();
	const [openTitle, setOpenTitle] = useState<string | null>(null);
	const appSwitcherData = useMemo(
		() => appSwitcherAppsFrom(apps, overrides, { frontAppId, notifiedAppIds }),
		[apps, overrides, frontAppId, notifiedAppIds],
	);
	const { notificationIcons, notificationDescriptions } = useMemo(() => {
		const listed = new Set(appSwitcherData.map((a) => a.id));
		const identity = (appId: string) =>
			classicyAppIdentityFrom(
				overrides,
				appId,
				apps[appId] ?? { name: appId, icon: "" },
			);
		return {
			notificationIcons: classicyNotificationMenuBarIcons(
				notifications,
				listed,
				(appId) => identity(appId).icon,
			),
			notificationDescriptions: classicyNotificationMenuBarDescriptions(
				notifications,
				listed,
				(appId) => identity(appId).name,
			),
		};
	}, [notifications, appSwitcherData, overrides, apps]);
	const blinkingIcons = useClassicyNotificationBlink(
		resolvedPlacement === "window" ? NO_NOTIFICATION_ICONS : notificationIcons,
		openTitle !== null,
	);
	const appleMenuDescription = notificationDescriptions.apple;
	const appleMenuIcon =
		openTitle === "apple-menu"
			? appleMenuArt
			: (blinkingIcons.apple ?? appleMenuArt);
	const switcherTitleIcon =
		openTitle === "app-switcher" ? undefined : blinkingIcons.application;

	const setActiveApp = (appId: string) => {
		desktopEventDispatch({
			type: "ClassicyAppFocus",
			app: { id: appId },
		});
	};

	const appSwitcherMenuMenuItem: ClassicyMenuItem = useMemo(() => {
		const focusedApp = appSwitcherData.find((a) => a.focused);
		const openApps = appSwitcherData.filter((a) => a.open);
		// The Application menu's commands (HIG7 p.127): each dimmed when it
		// would do nothing, as 7.5.5 draws them (`*-755-appmenu-open.png`).
		// The front application (`frontAppIdOf`: a floating extension window
		// never replaces it); none only when no app is focused, when Hide and
		// Hide Others have no app to act on.
		const frontId = focusedApp?.id;
		// Hide and Hide Others have nothing to hide for an extension in front
		// (HIG7 p.127: a command dims when it would do nothing; an extension is
		// not a hideable application, as `hideApp` has it).
		const othersShown =
			frontId !== undefined &&
			focusedApp?.extension !== true &&
			openApps.some((a) => a.id !== frontId && !a.hidden);
		const anyHidden = openApps.some((a) => a.hidden);
		const commands: ClassicyMenuItem[] = [
			{
				id: "app-switcher_hide",
				title: `Hide ${focusedApp?.name || finderName}`,
				disabled: !othersShown,
				event: "ClassicyAppHide",
				eventData: { app: { id: frontId ?? "" } },
			},
			{
				id: "app-switcher_hide-others",
				title: "Hide Others",
				disabled: !othersShown,
				event: "ClassicyAppHideOthers",
				eventData: { app: { id: frontId ?? "" } },
			},
			{
				id: "app-switcher_show-all",
				title: "Show All",
				disabled: !anyHidden,
				event: "ClassicyAppShowAll",
				eventData: {},
			},
			{ id: "spacer" },
		];
		return {
			id: "app-switcher",
			image: switcherTitleIcon ?? (focusedApp?.icon || ""),
			...(notificationDescriptions.application
				? { description: notificationDescriptions.application }
				: {}),
			title: focusedApp?.name || finderName,
			className: "classicyDesktopMenuAppSwitcher",
			part: "switcher",
			// The switcher's title follows the focused app, and it sits at the
			// right end of the bar — so a name-length change would otherwise resize
			// it and shove the clock and extensions sideways. Reserve the widest open
			// app's width up front and the bar stays put.
			titleWidthSamples: openApps.map((app) => app.name),
			menuChildren: [
				...commands,
				...openApps.map((app) => ({
					id: app.id,
					icon: app.icon,
					title: app.name,
					// The front application is checked, beside its icon, and one a
					// notification marks has a ◆; a hidden one's icon is dimmed:
					// by the package's rule on a canvas (`imageDimmed`), else by
					// its stylesheet (`classicyDesktopMenuAppHidden`).
					...appSwitcherEntryMark(app, app.id === focusedApp?.id),
					...(app.hidden
						? {
								className: "classicyDesktopMenuAppHidden",
								imageDimmed: true,
								// Screen readers hear what the dimmed icon shows.
								description: appSwitcherEntryDescription(app, {
									marked: app.id !== focusedApp?.id,
								}),
							}
						: {}),
					onClickFunc: () => {
						setActiveApp(app.id);
					},
				})),
			],
		};
	}, [
		appSwitcherData,
		finderName,
		// biome-ignore lint/correctness/useExhaustiveDependencies: setActiveApp is defined inline and recreated each render; including it would cause infinite loops
		setActiveApp,
		switcherTitleIcon,
		notificationDescriptions.application,
	]);

	// The app whose menus the bar is showing: the front application
	// (`frontAppIdOf`), which an extension's window (Apple Guide) never
	// replaces. Consumed by the Apple menu (About <app>) and the Help menu.
	const focusedMenuApp = useMemo(() => {
		const appList = Object.values(apps);
		return (
			(frontAppId ? apps[frontAppId] : undefined) ??
			apps["Finder.app"] ??
			appList[0]
		);
	}, [apps, frontAppId]);

	// HIG #209: the first Apple-menu item is "About <the focused app>". Resolve
	// the focused app (fallback Finder), *move* its About entry out of the app's
	// published menu into the Apple menu — then splice in the rest of the system
	// menu with its own "About This Computer" entry removed to avoid two Abouts.
	const { appleMenuItem, strippedAppMenu } = useMemo(() => {
		const focusedAppId = focusedMenuApp?.id ?? "Finder.app";
		const appName = focusedMenuApp
			? classicyAppIdentityFrom(overrides, focusedMenuApp.id, focusedMenuApp)
					.name
			: finderName;

		const aboutItem = findAppAboutItem(appMenu, focusedAppId);

		let menuChildren: ClassicyMenuItem[];
		// The system menu's items in alphabetical order (HIG7 p.98), Recent
		// Applications and Recent Documents (Apple Menu Options) among them.
		const systemItems = withClassicyRecentItemsMenuItems(
			withClassicyAppIdentityMenuItems(systemMenu, overrides) ?? [],
			recentMenuItems,
		);
		if (aboutItem) {
			// Drop the system menu's leading "About This Computer" (and a spacer
			// immediately after it) so our injected spacer isn't doubled.
			let rest = systemItems;
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
			// No app About available: the system menu as sorted above, its app
			// entries shown by their display names.
			menuChildren = systemItems;
		}

		return {
			appleMenuItem: {
				id: "apple-menu",
				image: appleMenuIcon,
				// The art is the title: its accessible name.
				imageAlt: "Apple",
				description: appleMenuDescription,
				menuChildren,
				className: "classicyDesktopMenuApple",
				part: "apple",
			} satisfies ClassicyMenuItem,
			// The hoisted About must not also render in the app's own menus.
			strippedAppMenu:
				aboutItem && appMenu ? stripAboutItem(appMenu, aboutItem) : appMenu,
		};
	}, [
		focusedMenuApp,
		appMenu,
		systemMenu,
		appleMenuIcon,
		appleMenuDescription,
		overrides,
		finderName,
		recentMenuItems,
	]);

	// The standard Help menu, built from the app's menus with the About item
	// already hoisted into the Apple menu; it absorbs a top-level "Help" the
	// app publishes (Finder's), so the bar draws one.
	const { helpItem: helpMenuItem, appMenu: appMenuWithoutHelp } =
		useClassicyStandardHelpMenu({
			appMenu: strippedAppMenu,
			appId: focusedMenuApp?.id,
		});

	const defaultMenuItems: ClassicyMenuItem[] = useMemo(() => {
		const items = [appleMenuItem] as ClassicyMenuItem[];
		if (appMenuWithoutHelp) {
			items.push(
				...appMenuWithoutHelp.map((item) => ({ ...item, part: "app" })),
			);
		}
		// Help is the rightmost standard menu; the App Switcher sits at the far
		// right of the bar (8.5+ construct) and is kept last in the data. Where
		// each one lands is set by its `part` (order via data-classicy-part; see
		// ClassicyDesktopMenuBar.scss), not by its place in this list.
		items.push(helpMenuItem);
		items.push(appSwitcherMenuMenuItem);
		return items;
	}, [
		appleMenuItem,
		appMenuWithoutHelp,
		helpMenuItem,
		appSwitcherMenuMenuItem,
	]);

	useClassicyShortcutDispatcher(defaultMenuItems);

	// The front app owns the app keyboard scope (an extension never does).
	const focusedAppId = frontAppId ?? "Finder.app";

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
	// Sourced from the RESOLVED Apple menu (not the raw systemMenu) so a claimed
	// chord is always resolvable — the dispatcher searches defaultMenuItems,
	// whose Apple submenu strips "About This Computer" (⌃S) whenever the
	// focused app publishes an About entry.
	const systemChordsKey = useMemo(
		() =>
			collectMenuChords([
				...(appleMenuItem.menuChildren ?? []),
				helpMenuItem,
			]).join("|"),
		[appleMenuItem, helpMenuItem],
	);
	useEffect(() => {
		desktopEventDispatch({
			type: "ClassicyShortcutRegister",
			scope: "system",
			chords: systemChordsKey ? systemChordsKey.split("|") : [],
		});
	}, [systemChordsKey, desktopEventDispatch]);

	// HIG #187: app-wide command-key dispatch is handled by the central
	// `useClassicyShortcutDispatcher` (above), which fires a matching item's
	// action whether or not a menu is dropped down. No separate listener is
	// needed here.

	// Headless in window placement: every hook above has run, so chords still
	// register and dispatch; only the bar itself is not drawn.
	if (resolvedPlacement === "window") return null;

	return (
		<nav
			ref={navRef}
			className={classNames("classicyDesktopMenuBar", className)}
			style={style}
		>
			<ClassicyMenu
				name={"desktopMenuBar"}
				menuItems={defaultMenuItems}
				navClass={"classicyDesktopMenu"}
				subNavClass={"classicySubMenu"}
				onOpenItemChange={setOpenTitle}
			>
				{/* Sound lives on the Control Strip (ClassicyDesktop mounts it). */}
				<ClassicyDesktopMenuWidgetTime />
				{/* Portal target for app Menu Bar Extensions. Order via
				    data-classicy-part; see ClassicyDesktopMenuBar.scss: it lands
				    left of the clock and pushes the right cluster to the end. */}
				<ul
					id={"classicyDesktopMenuExtensions"}
					className={"classicyDesktopMenuExtensions"}
					{...{ [CLASSICY_PART_ATTRIBUTE.part]: "extensions" }}
				/>
			</ClassicyMenu>
			{/* Dragging past the Application menu's bottom tears it off into
			    the Application Switcher's palette (Mac OS 8.5). */}
			<ClassicyAppSwitcherTearOff navRef={navRef} />
		</nav>
	);
};
