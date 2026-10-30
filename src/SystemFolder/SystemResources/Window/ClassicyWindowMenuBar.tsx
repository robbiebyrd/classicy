import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	useMemo,
	useRef,
} from "react";
import { useClassicyAppIdentityOverrides } from "@/Appearance/ClassicyAppIdentity";
import { CLASSICY_PART_ATTRIBUTE } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { withClassicyAppIdentityAboutItem } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";
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
 * Only the app's menus have a home here. The Apple, Help and App Switcher
 * menus, the clock and menu bar extensions (`ClassicyMenuBarExtension`, which
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
	// The app's About item is stored under the app's own name (K-R8); it is
	// titled with the active package's display name here, where it is drawn.
	const overrides = useClassicyAppIdentityOverrides();
	const items = useMemo(
		() => withClassicyAppIdentityAboutItem(menuItems, appId, overrides) ?? [],
		[menuItems, appId, overrides],
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
