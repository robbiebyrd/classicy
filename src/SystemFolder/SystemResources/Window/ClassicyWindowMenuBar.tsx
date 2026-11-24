import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	useId,
	useMemo,
	useRef,
} from "react";
import { useClassicyAppIdentityOverrides } from "@/Appearance/ClassicyAppIdentity";
import { CLASSICY_PART_ATTRIBUTE } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { withClassicyAppIdentityAboutItem } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";
import { useClassicyStandardHelpMenu } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyStandardHelpMenu";
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
 * The bar ends with the standard Help menu (`useClassicyStandardHelpMenu`),
 * the same one the screen bar draws. The Apple and App Switcher menus, the clock and menu bar extensions (`ClassicyMenuBarExtension`, which
 * portals into the screen bar's extensions list) are not shown in window
 * placement. The headless screen bar reserves no band: the desktop root's
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
	// The standard Help menu closes the bar here as it does the screen bar's:
	// About, Show/Hide Balloons, Keyboard Shortcuts and the app's own help
	// items, with a "Help" the app publishes folded into it. The app's About
	// stays in its own menus (no Apple menu to hoist it into).
	// The About item is retitled first, so one inside the app's own "Help"
	// menu (Finder's) keeps the display name when the menu is folded in.
	const titled = useMemo(
		() =>
			withClassicyAppIdentityAboutItem(menuItems, appId, appName, overrides) ??
			[],
		[menuItems, appId, appName, overrides],
	);
	// Ids are DOM ids: scope the standard Help items to this bar, since
	// several windows each draw one.
	const barId = useId();
	const { helpItem, appMenu } = useClassicyStandardHelpMenu({
		appMenu: titled,
		appId,
		idPrefix: `${barId}_`,
	});
	const items = useMemo(
		() => [...(appMenu ?? []), helpItem],
		[appMenu, helpItem],
	);
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
