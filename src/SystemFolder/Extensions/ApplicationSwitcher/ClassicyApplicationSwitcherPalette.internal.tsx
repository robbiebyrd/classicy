import classNames from "classnames";
import { type FC as FunctionalComponent, useMemo } from "react";
import { useClassicyAppIdentityOverrides } from "@/Appearance/ClassicyAppIdentity";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useFrontAppId } from "@/SystemFolder/ControlPanels/AppManager/ClassicyFrontApp";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
import { appSwitcherAppsFrom } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import {
	APPLICATION_SWITCHER_APP_ID,
	APPLICATION_SWITCHER_CLOSE,
	APPLICATION_SWITCHER_PALETTE_ID,
	APPLICATION_SWITCHER_PALETTE_TITLE,
	APPLICATION_SWITCHER_SET_PALETTE,
	APPLICATION_SWITCHER_SWITCH,
	type classicyApplicationSwitcherSettings,
} from "./ClassicyApplicationSwitcherContext";

type Settings = ReturnType<typeof classicyApplicationSwitcherSettings>;

/**
 * The Application Switcher palette (Mac OS 8.5): a floating utility window
 * titled "Applications" with a button for each application the Application
 * menu lists, in its order, the front application's held down and a hidden
 * application's icon dimmed as the menu dims it (the package's
 * `iconDimming`). It draws no ◆ for an application a notification marks:
 * 8.5's palette shows none while its menu does
 * (`platinum-85-switcher-notification.png`). A click switches to the
 * application through the same path as the menu (a hidden one is shown);
 * an Option-click also hides the application that was in front.
 *
 * The zoom box sets the palette's options, as in 8.5: a click shows or hides
 * the names, an Option-click switches small and large icons, an
 * Option-Shift-click switches vertical and horizontal (the drag bar then
 * runs down the left side). An extension's menuless window, it floats in
 * the desktop's floating layer above every application's windows and never
 * takes the menu bar from the front application. Its record keeps its
 * position, and `paletteOpen` its open state, across reloads.
 */
export const ClassicyApplicationSwitcherPalette: FunctionalComponent<{
	settings: Settings;
}> = ({ settings }) => {
	const { showNames, iconSize, orientation, paletteAt } = settings;
	const dispatch = useAppManagerDispatch();
	const apps = useAppManager((s) => s.System.Manager.Applications.apps);
	const frontAppId = useFrontAppId();
	const overrides = useClassicyAppIdentityOverrides();
	const entries = useMemo(
		() => appSwitcherAppsFrom(apps, overrides, { frontAppId }),
		[apps, overrides, frontAppId],
	);
	const horizontal = orientation === "horizontal";
	const large = iconSize === "large";
	// The drag bar is too short for a title or a collapse box when it runs
	// across a column of small icons, or down the side (8.5:
	// `platinum-85-switcher-no-names.png`, `…-horizontal.png`).
	const narrow = !horizontal && !showNames && !large;

	return (
		<ClassicyWindow
			id={APPLICATION_SWITCHER_PALETTE_ID}
			appId={APPLICATION_SWITCHER_APP_ID}
			title={APPLICATION_SWITCHER_PALETTE_TITLE}
			hideIcon
			windowType="utility"
			utilityTitle={!horizontal && showNames}
			resizable={false}
			scrollable={false}
			collapsable={!narrow}
			initialSize={[0, 0]}
			minimumSize={[0, 0]}
			initialPosition={paletteAt ?? ["right", "top"]}
			onZoomBox={({ option, shift }) => {
				if (option && shift) {
					dispatch({
						type: APPLICATION_SWITCHER_SET_PALETTE,
						orientation: horizontal ? "vertical" : "horizontal",
					});
					return !horizontal;
				}
				if (option) {
					dispatch({
						type: APPLICATION_SWITCHER_SET_PALETTE,
						iconSize: large ? "small" : "large",
					});
					return !large;
				}
				dispatch({
					type: APPLICATION_SWITCHER_SET_PALETTE,
					showNames: !showNames,
				});
				return !showNames;
			}}
			onCloseFunc={() => dispatch({ type: APPLICATION_SWITCHER_CLOSE })}
			className={classNames(
				"classicyApplicationSwitcherPalette",
				horizontal && "classicyApplicationSwitcherHorizontal",
				large && "classicyApplicationSwitcherLargeIcons",
				!showNames && "classicyApplicationSwitcherNoNames",
			)}
		>
			{/* The window carries the name ("Applications", its aria-label). */}
			<div className="classicyApplicationSwitcherButtons">
				{entries.map((app) => (
					<ClassicyBevelButton
						key={app.id}
						mode="push"
						bevelWidth="small"
						on={app.focused === true}
						aria-label={app.name}
						className={classNames(
							"classicyApplicationSwitcherButton",
							app.hidden && "classicyApplicationSwitcherHidden",
						)}
						onClickFunc={(e) =>
							dispatch({
								type: APPLICATION_SWITCHER_SWITCH,
								app: { id: app.id },
								hideFront: e.altKey,
							})
						}
					>
						<ClassicyIconImage
							className="classicyApplicationSwitcherIcon"
							src={app.icon}
							drawnAt={large ? Number.POSITIVE_INFINITY : true}
							dimmed={app.hidden ? "hiddenApp" : false}
							alt=""
							draggable={false}
						/>
						{showNames && (
							<span className="classicyApplicationSwitcherName">
								{app.name}
							</span>
						)}
					</ClassicyBevelButton>
				))}
			</div>
		</ClassicyWindow>
	);
};
