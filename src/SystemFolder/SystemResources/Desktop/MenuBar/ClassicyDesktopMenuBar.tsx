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
} from "react";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import {
	classicyAppIdentityFrom,
	useClassicyAppIdentityOverrides,
} from "@/Appearance/ClassicyAppIdentity";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { CLASSICY_PART_ATTRIBUTE } from "@/Appearance/vocabulary/ClassicyVocabulary";
import {
	appSwitcherAppsFrom,
	withClassicyAppIdentityMenuItems,
} from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";
import {
	classicyHelpMenuChildren,
	classicySystemHelpItems,
	findClassicyAppAboutItem,
	splitClassicyAppHelpMenus,
	stripClassicyAboutItem,
} from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyHelpMenu.internal";
import { useClassicyShortcutDispatcher } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher";
import { collectMenuChords } from "@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut";

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

/** True for the systemMenu's own leading "About This Computer" entry. */
const isAboutThisComputerItem = (item: ClassicyMenuItem): boolean =>
	item.id === "about" || item.title === "About This Computer";

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
 * out of the app's own menus), the focused window's `appMenu` less its Help
 * menus, the one standard Help menu (always the rightmost: About Balloon
 * Help…, Show/Hide Balloons ⌥H, then, each after a divider, the focused app's
 * `useClassicyHelpMenu` items and the items of the app's own top-level Help
 * menus, merged in rather than drawn as a second "Help" title, an app item
 * repeating the balloon toggle dropped), then, at the far right, menu bar
 * extensions (`ClassicyMenuBarExtension`), the clock and the App Switcher.
 * Menus are sticky (HIGOS8 p.92): a click leaves one open, and it closes
 * after 15 seconds idle or on a click outside the bar.
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
	const appleMenuIcon = useClassicyAsset("systemArt", "appleMenu") ?? "";
	// System 7 titles its Help menu with an icon, the balloon with a "?" (HIG
	// p.52): a package that registers the art gets it in place of the word.
	const helpMenuTitleArt = useClassicyAsset("systemArt", "helpMenuTitle");
	const apps = useAppManager((s) => s.System.Manager.Applications.apps);
	const systemMenu = useAppManager((s) => s.System.Manager.Desktop.systemMenu);
	const appMenu = useAppManager((s) => s.System.Manager.Desktop.appMenu);
	const disableBalloonHelp = useAppManager(
		(s) => s.System.Manager.Desktop.disableBalloonHelp,
	);
	// Optional per-app Help entries, keyed by appId. Read defensively so the bar
	// works whether or not a consumer has populated the slot.
	const helpMenus = useAppManager((s) => s.System.Manager.Desktop?.helpMenu);
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

	const appSwitcherData = useMemo(
		() => appSwitcherAppsFrom(apps, overrides),
		[apps, overrides],
	);

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
		// The front application: none while an extension holds focus, when
		// Hide and Hide Others have no app to act on.
		const frontId = focusedApp?.id;
		const othersShown =
			frontId !== undefined &&
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
			image: focusedApp?.icon || "",
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
					// The front application is checked, beside its icon; a hidden
					// one's icon is dimmed: by the package's rule on a canvas
					// (`imageDimmed`), else by its stylesheet
					// (`classicyDesktopMenuAppHidden`).
					checked: app.id === focusedApp?.id,
					...(app.hidden
						? { className: "classicyDesktopMenuAppHidden", imageDimmed: true }
						: {}),
					onClickFunc: () => {
						setActiveApp(app.id);
					},
				})),
			],
		};
		// biome-ignore lint/correctness/useExhaustiveDependencies: setActiveApp is defined inline and recreated each render; including it would cause infinite loops
	}, [appSwitcherData, finderName, setActiveApp]);

	// The app whose menus the bar is showing. Extensions (e.g. Apple Guide) can
	// take window focus but must never be treated as "the focused app" here —
	// mirrors appSwitcherAppsFrom, which excludes them for the same reason.
	// Consumed by both the Apple menu (About <app>) and the Help menu (per-app
	// items). Distinct from the `focusedAppId` memo further down, which feeds
	// shortcut-scope registration and intentionally does not exclude extensions.
	const focusedMenuApp = useMemo(() => {
		const appList = Object.values(apps);
		return (
			appList.find((a) => a.focused === true && !a.extension) ??
			apps["Finder.app"] ??
			appList[0]
		);
	}, [apps]);

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

		const aboutItem = findClassicyAppAboutItem(appMenu, focusedAppId);

		let menuChildren: ClassicyMenuItem[];
		if (aboutItem) {
			// Drop the system menu's leading "About This Computer" (and a spacer
			// immediately after it) so our injected spacer isn't doubled.
			let rest = withClassicyAppIdentityMenuItems(systemMenu, overrides) ?? [];
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
			// No app About available — leave the system menu as it is, apart
			// from showing its app entries by their display names.
			menuChildren =
				withClassicyAppIdentityMenuItems(systemMenu, overrides) ?? [];
		}

		return {
			appleMenuItem: {
				id: "apple-menu",
				image: appleMenuIcon,
				// The art is the title: its accessible name.
				imageAlt: "Apple",
				menuChildren,
				className: "classicyDesktopMenuApple",
				part: "apple",
			} satisfies ClassicyMenuItem,
			// The hoisted About must not also render in the app's own menus.
			strippedAppMenu:
				aboutItem && appMenu
					? stripClassicyAboutItem(appMenu, aboutItem)
					: appMenu,
		};
	}, [
		focusedMenuApp,
		appMenu,
		systemMenu,
		appleMenuIcon,
		overrides,
		finderName,
	]);

	// The app's own top-level Help menus are merged into the standard Help
	// menu below, never drawn as a second "Help" title (HIGOS8 Ch.4 "Help
	// menus", pp.91–92, Figure 4-2; HIG7 "The Help Menu", p.125). About was
	// hoisted into the Apple menu first, so a Help menu that held only About
	// is already gone.
	const { appMenus, appHelpMenus } = useMemo(() => {
		const { menus, helpMenus: ownHelpMenus } = splitClassicyAppHelpMenus(
			strippedAppMenu ?? [],
		);
		return { appMenus: menus, appHelpMenus: ownHelpMenus };
	}, [strippedAppMenu]);

	// The system's own Help items (About Balloon Help…, Show/Hide Balloons ⌥H)
	// and the focused app's registered ones (`useClassicyHelpMenu`): the Help
	// menu the bar drew before the merge, and the one whose chords the system
	// scope claims (below).
	const systemHelpItems = useMemo(
		() => classicySystemHelpItems(disableBalloonHelp),
		[disableBalloonHelp],
	);
	const registeredHelpItems = focusedMenuApp?.id
		? helpMenus?.[focusedMenuApp.id]
		: undefined;

	// Standard Help menu (HIG Ch. 4 "Menu Bar"): rightmost of the standard
	// menus. The system's items, then the focused app's registered items, then
	// the items of its own Help menus, an app item repeating the balloon
	// toggle dropped (`classicyHelpMenuChildren`).
	const helpMenuItem: ClassicyMenuItem = useMemo(
		() => ({
			id: "help-menu",
			// The art replaces the word, which stays its accessible name.
			...(helpMenuTitleArt
				? { image: helpMenuTitleArt, imageAlt: "Help" }
				: { title: "Help" }),
			className: "classicyDesktopMenuHelp",
			part: "help",
			menuChildren: classicyHelpMenuChildren(
				systemHelpItems,
				registeredHelpItems,
				appHelpMenus,
			),
		}),
		[systemHelpItems, registeredHelpItems, appHelpMenus, helpMenuTitleArt],
	);

	const defaultMenuItems: ClassicyMenuItem[] = useMemo(() => {
		const items = [appleMenuItem] as ClassicyMenuItem[];
		items.push(...appMenus.map((item) => ({ ...item, part: "app" })));
		// Help is the rightmost standard menu; the App Switcher sits at the far
		// right of the bar (8.5+ construct) and is kept last in the data. Where
		// each one lands is set by its `part` (order via data-classicy-part; see
		// ClassicyDesktopMenuBar.scss), not by its place in this list.
		items.push(helpMenuItem);
		items.push(appSwitcherMenuMenuItem);
		return items;
	}, [appleMenuItem, appMenus, helpMenuItem, appSwitcherMenuMenuItem]);

	useClassicyShortcutDispatcher(defaultMenuItems);

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
	// Sourced from the RESOLVED Apple menu (not the raw systemMenu) so a claimed
	// chord is always resolvable — the dispatcher searches defaultMenuItems,
	// whose Apple submenu strips "About This Computer" (⌃S) whenever the
	// focused app publishes an About entry. Help contributes its own items and
	// the registered ones, not the app Help items merged in: those stay the
	// app's (appChordsKey reads the raw appMenu), so each scope claims what it
	// claimed before the merge.
	const systemChordsKey = useMemo(
		() =>
			collectMenuChords([
				...(appleMenuItem.menuChildren ?? []),
				...classicyHelpMenuChildren(systemHelpItems, registeredHelpItems, []),
			]).join("|"),
		[appleMenuItem, systemHelpItems, registeredHelpItems],
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
		</nav>
	);
};
