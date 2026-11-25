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
import { withClassicyAppIdentityAboutItem } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";
import {
	classicyHelpMenuChildren,
	classicySystemHelpItems,
	findClassicyAppAboutItem,
	splitClassicyAppHelpMenus,
	stripClassicyAboutItem,
} from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyHelpMenu.internal";
import {
	ClassicyMenu,
	type ClassicyMenuItem,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyMenuProvider } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";
import { useClassicyMenuCloseOnOutsideMouseDown } from "@/SystemFolder/SystemResources/Menu/useClassicyMenuCloseOnOutsideMouseDown";
import "./ClassicyWindowMenuBar.scss";

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
 * A window's own menu bar, for Appearance Packages whose layout sets
 * `menuBar.placement` to `"window"`: `ClassicyWindow` renders it directly
 * under its title bar with the window's `appMenu` (not for utility windows,
 * modals or a collapsed window), and the screen menu bar renders nothing (it
 * still dispatches keyboard equivalents). It reuses the screen bar's menu
 * classes (`classicyDesktopMenu`) inside its own `ClassicyMenuProvider`: its
 * menus open and stick as the screen bar's do, and close on a selection, a
 * re-click of the open title, a mouse-down anywhere outside the bar or the
 * provider's 15 s idle timeout. The
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
 * divider, "About <display name>" when the app has an About item. The
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
	// Under a taskbar no screen bar is drawn, so the window's bar carries Help.
	const helpInBar = useClassicyAppearanceLayout().taskbar !== undefined;
	const disableBalloonHelp = useAppManager(
		(state) => state.System.Manager.Desktop.disableBalloonHelp,
	);
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
			classicySystemHelpItems(disableBalloonHelp),
			registeredHelpItems,
			helpMenus,
		);
		if (aboutItem) {
			// "About <application name>", no ellipsis (WIG p.99), by the name
			// the active package shows; the item keeps its handler.
			const { name } = classicyAppIdentityFrom(overrides, appId, {
				name: appName ?? appId,
				icon: "",
			});
			helpChildren.push(
				{ id: "spacer" },
				{ ...aboutItem, title: `About ${name}` },
			);
		}
		return [
			...menus,
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
		disableBalloonHelp,
		registeredHelpItems,
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
