import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import "@/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp.scss";
import {
	type ClassicyIconBalloonHelp,
	useClassicyBalloonHelp,
} from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import { defaultBalloonForKind } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconBalloons";
import { isAliasKind } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconKinds";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

import "./ClassicyDesktopIcon.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	memo,
	useMemo,
	useRef,
	useState,
} from "react";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";

interface ClassicyDesktopIconProps {
	/**
	 * Id of the app (or other target) the icon stands for. Keys the icon's
	 * store record (position, selection) and forms the DOM id
	 * `${appId}.shortcut`.
	 */
	appId: string;
	/** App name, used as the label when `label` is unset and as the image alt text. */
	appName: string;
	/** Icon image (URL or data URI). */
	icon: string;
	/** Text under the icon. Defaults to `appName`. */
	label?: string;
	/**
	 * Icon kind: `drive`, `directory`, `app_shortcut`, `shortcut`, `trash`,
	 * `file` or `icon` (also the desktop's sort order). `app_shortcut` and
	 * `shortcut` draw the alias arrow and an italic label; `trash` and `drive`
	 * get stock balloon help. Defaults to `"app_shortcut"`.
	 */
	kind: string;
	/** Called when the icon is opened (double-click, or Enter/Space when focused). */
	onClickFunc?: () => void;
	/**
	 * Action type dispatched when the icon is opened, with `eventData` spread
	 * in. Dispatched only when `eventData` is also set.
	 */
	event?: string;
	/** Fields spread into the `event` action. */
	eventData?: Record<string, unknown>;
	/**
	 * Skip the default open (`ClassicyDesktopIconOpen`, which opens the app)
	 * so only `onClickFunc` and `event` run — e.g. a web shortcut that
	 * dispatches `ClassicyDesktopOpenUrl`. Defaults to `false`.
	 */
	noLaunch?: boolean;
	/**
	 * Right-click menu for this icon. Right-clicking selects the icon first;
	 * with no menu it shows nothing.
	 */
	contextMenu?: ClassicyMenuItem[];
	/**
	 * Balloon help, `{ title?, content, position?, delay? }`. When omitted,
	 * `trash` and `drive` icons use stock copy titled with the label; other
	 * kinds show no balloon. (`ClassicyApp` fills this from its
	 * `desktopIconBalloonHelp` or registered manifest description.)
	 */
	balloonHelp?: ClassicyIconBalloonHelp;
}

/**
 * A Mac OS 8 desktop icon: image plus label, positioned on the desktop. Click
 * selects it, drag moves it (dragging a selected icon moves the whole
 * selection), and double-click — or Enter/Space when focused — opens it. The
 * icon of an open app, or of a folder with an open Finder window, draws in the
 * shaded "open" state.
 *
 * Icons whose `kind` is `app_shortcut` or `shortcut` — every icon `ClassicyApp`
 * registers — render the alias arrow over the bottom-left corner and an
 * italic label (`isAliasKind`); system kinds get neither. Swap the arrow art by
 * registering your own `system.alias` icon with `registerClassicyIcons`.
 *
 * You rarely render this directly: `ClassicyDesktop` draws one for each record
 * in `System.Manager.Desktop.icons`, which `ClassicyApp` and the
 * `ClassicyDesktopIconAdd` action populate. Reads selection, position and
 * open state from the store, so it must render inside a desktop.
 *
 * ```ts
 * dispatch({
 *   type: "ClassicyDesktopIconAdd",
 *   app: { id: "example_site", name: "Example", icon },
 *   kind: "shortcut",
 *   noLaunch: true,
 *   event: "ClassicyDesktopOpenUrl",
 *   eventData: { url: "https://example.com/", disposition: "classicy" },
 * });
 * ```
 */
export const ClassicyDesktopIcon: FunctionalComponent<ClassicyDesktopIconProps> =
	memo(
		({
			appId,
			appName,
			icon,
			label,
			kind = "app_shortcut",
			onClickFunc,
			event,
			eventData,
			noLaunch = false,
			contextMenu,
			balloonHelp,
		}) => {
			const [clickPosition, setClickPosition] = useState<[number, number]>([
				0, 0,
			]);
			const [dragging, setDragging] = useState<boolean>(false);
			const didDragRef = useRef(false);

			const isSelected = useAppManager(
				(s) => s.System.Manager.Desktop.selectedIcons?.includes(appId) ?? false,
			);
			const iconLocation = useAppManager((s) => {
				const icon = s.System.Manager.Desktop.icons.find(
					(i) => i.appId === appId,
				);
				return icon?.location ?? null;
			});
			const isOpen = useAppManager(
				(s) => !!s.System.Manager.Applications.apps[appId]?.open,
			);
			// Only Finder folder icons care about a window: true while the Finder
			// window for this icon's folder path is registered and not closed.
			const finderPathWindowOpen = useAppManager((s) => {
				if (!appId.startsWith("Finder.app")) return false;
				const path = eventData?.path;
				const w = getAppWindow(
					s.System.Manager.Applications.apps["Finder.app"],
					typeof path === "string" ? path : undefined,
				);
				return w !== undefined && !w.closed;
			});
			const desktopEventDispatch = useAppManagerDispatch();
			const { showContextMenu } = useClassicyContextualMenu();

			const iconRef = useRef<HTMLDivElement>(null);

			// Stock copy is resolved here, not stored on the icon record, so revised
			// text ships with the library rather than staying frozen in localStorage.
			const effectiveBalloonHelp =
				balloonHelp ?? defaultBalloonForKind(kind, label ?? appName);
			const { handlers: balloonHandlers, balloon } = useClassicyBalloonHelp(
				iconRef,
				effectiveBalloonHelp,
			);

			const id = `${appId}.shortcut`;
			const { track } = useClassicyAnalytics();
			const analyticsArgs = { appId, appName, icon, label, kind };

			const clickFocus = (e: MouseEvent<HTMLDivElement>) => {
				e.stopPropagation();
				if (didDragRef.current) {
					didDragRef.current = false;
					return;
				}
				// Only when selection actually changes, so "focus" means the icon
				// BECAME selected rather than "an icon was clicked". The dispatch
				// below stays unconditional -- clicking an already-selected icon
				// still collapses a multi-icon selection down to this one.
				if (!isSelected) {
					track("focus", { type: "ClassicyDesktopIcon", ...analyticsArgs });
				}
				desktopEventDispatch({
					type: "ClassicyDesktopIconFocus",
					iconId: appId,
				});
			};

			const changeIcon = (e: MouseEvent<HTMLDivElement>) => {
				if (dragging) {
					didDragRef.current = true;
					desktopEventDispatch({
						type: "ClassicyDesktopIconMove",
						app: {
							id: appId,
						},
						location: [
							e.clientX - clickPosition[0],
							e.clientY - clickPosition[1],
						],
					});
				}
			};

			const launchIcon = () => {
				if (onClickFunc) {
					onClickFunc();
				}
				if (event && eventData) {
					desktopEventDispatch({
						type: event,
						...eventData,
					});
				}
				track("open", { type: "ClassicyDesktopIcon", ...analyticsArgs });
				if (!noLaunch) {
					desktopEventDispatch({
						type: "ClassicyDesktopIconOpen",
						iconId: id,
						app: {
							id: appId,
							name: appName,
							icon: icon,
						},
					});
				}
			};

			const thisLocation = useMemo(() => {
				if (!iconLocation) return [0, 0];
				return [iconLocation[1], iconLocation[0]];
			}, [iconLocation]);

			const isLaunched = () => {
				// Check if a Finder window is open
				if (appId.startsWith("Finder.app")) {
					return finderPathWindowOpen;
				}
				return isOpen;
			};

			const stopChangeIcon = () => {
				// Bound to onMouseUp, so this runs on every release on the icon.
				// Report only a drag that actually happened. didDragRef -- not
				// the `dragging` state -- is the signal: setDragging(true) runs
				// in startDrag on mousedown, so `dragging` is already true for a
				// plain click, while didDragRef is set in changeIcon only once
				// the pointer moved while held down.
				if (didDragRef.current) {
					track("halt", { type: "ClassicyDesktopIcon", ...analyticsArgs });
				}
				setDragging(false);
				setClickPosition([0, 0]);
			};

			const startDrag = (e: MouseEvent<HTMLDivElement>) => {
				if (iconRef.current == null) {
					return;
				}

				track("move", { type: "ClassicyDesktopIcon", ...analyticsArgs });
				didDragRef.current = false;

				// If icon is not already selected, select just this one for the drag
				if (!isSelected) {
					desktopEventDispatch({
						type: "ClassicyDesktopIconFocus",
						iconId: appId,
					});
				}

				const rect = iconRef.current.getBoundingClientRect();
				setClickPosition([e.clientX - rect.left, e.clientY - rect.top]);

				setDragging(true);
			};

			const getClass = () => {
				const launched = isLaunched();
				if (isSelected && launched) {
					return "classicyDesktopIconActiveAndOpen";
				} else if (isSelected) {
					return "classicyDesktopIconActive";
				} else if (launched) {
					return "classicyDesktopIconOpen";
				} else {
					return "";
				}
			};

			const isAlias = isAliasKind(kind);

			return (
				// biome-ignore lint/a11y/useSemanticElements: desktop icon is a draggable div with ref and complex mouse handling incompatible with <button>
				<div
					role="button"
					tabIndex={0}
					ref={iconRef}
					id={`${id}`}
					onMouseDown={startDrag}
					onMouseMove={changeIcon}
					onMouseUp={stopChangeIcon}
					onDoubleClick={launchIcon}
					draggable={false}
					onClick={clickFocus}
					onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							launchIcon();
						}
					}}
					onContextMenu={(e: MouseEvent<HTMLDivElement>) => {
						if (e.defaultPrevented) return;
						e.preventDefault();
						clickFocus(e); // selects the icon and stops propagation
						if (contextMenu && contextMenu.length > 0) {
							showContextMenu(contextMenu, [e.clientX, e.clientY]);
						}
					}}
					className={classNames(
						"classicyDesktopIcon",
						dragging ? "classicyDesktopIconDragging" : "",
						getClass(),
						isAlias ? "classicyDesktopIconAlias" : "",
					)}
					style={{ top: thisLocation[0], left: thisLocation[1] }}
					{...balloonHandlers}
				>
					<div className={"classicyDesktopIconImage"}>
						<div
							className={"classicyDesktopIconMaskOuter"}
							style={
								{ "--classicy-icon-mask": `url(${icon})` } as CSSProperties
							}
						>
							<div className={"classicyDesktopIconMask"}>
								<img src={icon} alt={appName} />
							</div>
						</div>
						{isAlias && (
							<div
								className={
									"classicyDesktopIconMaskOuter classicyDesktopIconAliasBadge"
								}
								style={
									{
										"--classicy-icon-mask": `url(${ClassicyIcons.system.alias})`,
									} as CSSProperties
								}
							>
								<div className={"classicyDesktopIconMask"}>
									<img
										src={ClassicyIcons.system.alias}
										alt=""
										aria-hidden="true"
									/>
								</div>
							</div>
						)}
					</div>
					<p>{label ? label : appName}</p>
					{balloon}
				</div>
			);
		},
	);

ClassicyDesktopIcon.displayName = "ClassicyDesktopIcon";
