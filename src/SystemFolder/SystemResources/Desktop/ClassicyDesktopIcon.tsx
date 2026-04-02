import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

import "./ClassicyDesktopIcon.scss";
import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	memo,
	useMemo,
	useRef,
	useState,
} from "react";

interface ClassicyDesktopIconProps {
	appId: string;
	appName: string;
	icon: string;
	label?: string;
	kind: string;
	onClickFunc?: () => void;
	event?: string;
	eventData?: Record<string, unknown>;
}

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
		}) => {
			const [clickPosition, setClickPosition] = useState<[number, number]>([
				0, 0,
			]);
			const [dragging, setDragging] = useState<boolean>(false);

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
				(s) => !!s.System.Manager.App.apps[appId]?.open,
			);
			const finderWindows = useAppManager(
				(s) => s.System.Manager.App.apps["Finder.app"]?.windows,
			);
			const desktopEventDispatch = useAppManagerDispatch();

			const iconRef = useRef<HTMLDivElement>(null);

			const id = `${appId}.shortcut`;
			const { track } = useClassicyAnalytics();
			const analyticsArgs = { appId, appName, icon, label, kind };

			const clickFocus = (e: MouseEvent<HTMLDivElement>) => {
				e.stopPropagation();
				track("focus", { type: "ClassicyDesktopIcon", ...analyticsArgs });
				desktopEventDispatch({
					type: "ClassicyDesktopIconFocus",
					iconId: appId,
				});
			};

			const changeIcon = (e: MouseEvent<HTMLDivElement>) => {
				if (dragging) {
					clickFocus(e);

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
				desktopEventDispatch({
					type: "ClassicyDesktopIconOpen",
					iconId: id,
					app: {
						id: appId,
						name: appName,
						icon: icon,
					},
				});
			};

			const thisLocation = useMemo(() => {
				if (!iconLocation) return [0, 0];
				return [iconLocation[1], iconLocation[0]];
			}, [iconLocation]);

			const isLaunched = () => {
				// Check if a Finder window is open
				if (appId.startsWith("Finder.app")) {
					if (!finderWindows) {
						return false;
					}
					const pathCount = finderWindows.findIndex(
						(w) => w.id === eventData?.path && !w.closed,
					);
					return pathCount >= 0;
				}
				return isOpen;
			};

			const stopChangeIcon = () => {
				track("halt", { type: "ClassicyDesktopIcon", ...analyticsArgs });
				setDragging(false);
				setClickPosition([0, 0]);
			};

			const startDrag = (e: MouseEvent<HTMLDivElement>) => {
				if (iconRef.current == null) {
					return;
				}

				track("move", { type: "ClassicyDesktopIcon", ...analyticsArgs });

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
						e.preventDefault();
						clickFocus(e);
						// TODO: Add Context Menu on Desktop Icons
					}}
					className={classNames(
						"classicyDesktopIcon",
						dragging ? "classicyDesktopIconDragging" : "",
						getClass(),
					)}
					style={{ top: thisLocation[0], left: thisLocation[1] }}
				>
					<div
						className={"classicyDesktopIconMaskOuter"}
						style={{ maskImage: `url(${icon})` }}
					>
						<div
							className={"classicyDesktopIconMask"}
							style={{ mask: `url(${icon})` }}
						>
							<img src={icon} alt={appName} />
						</div>
					</div>
					<p>{label ? label : appName}</p>
				</div>
			);
		},
	);

ClassicyDesktopIcon.displayName = "ClassicyDesktopIcon";
