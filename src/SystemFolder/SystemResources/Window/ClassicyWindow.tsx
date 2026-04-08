import type { ClassicyStoreSystemAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import "./ClassicyWindow.scss";
import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
const fileIcon = ClassicyIcons.system.files.file;

import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

export type ClassicyWindowPositionX = number | "left" | "center" | "right";
export type ClassicyWindowPositionY = number | "top" | "center" | "bottom";

function resolvePosition(
	pos: [ClassicyWindowPositionX, ClassicyWindowPositionY],
	windowSize: [number, number],
): [number, number] {
	const menuBarHeight = 30;
	const vw = typeof window !== "undefined" ? window.innerWidth : 800;
	const vh = typeof window !== "undefined" ? window.innerHeight : 600;

	let x: number;
	if (typeof pos[0] === "number") {
		x = pos[0];
	} else if (pos[0] === "left") {
		x = 0;
	} else if (pos[0] === "right") {
		x = Math.max(0, vw - windowSize[0]);
	} else {
		x = Math.max(0, (vw - windowSize[0]) / 2);
	}

	let y: number;
	if (typeof pos[1] === "number") {
		y = pos[1];
	} else if (pos[1] === "top") {
		y = menuBarHeight;
	} else if (pos[1] === "bottom") {
		y = Math.max(menuBarHeight, vh - windowSize[1]);
	} else {
		y = Math.max(menuBarHeight, (vh - windowSize[1]) / 2);
	}

	return [x, y];
}

interface ClassicyWindowProps {
	title?: string;
	id: string;
	appId: string;
	icon?: string;
	hidden?: boolean;
	closable?: boolean;
	zoomable?: boolean;
	collapsable?: boolean;
	resizable?: boolean;
	scrollable?: boolean;
	modal?: boolean;
	growable?: boolean;
	defaultWindow?: boolean;
	initialSize?: [number, number];
	initialPosition?: [ClassicyWindowPositionX, ClassicyWindowPositionY];
	minimumSize?: [number, number];
	header?: ReactNode;
	appMenu?: ClassicyMenuItem[];
	contextMenu?: ClassicyMenuItem[];
	onCloseFunc?: (id: string) => void;
	children?: ReactNode;
	type?: string;
}

export const ClassicyWindow: FunctionalComponent<ClassicyWindowProps> = ({
	id,
	title = "",
	appId,
	icon,
	hidden = false,
	closable = true,
	zoomable = true,
	collapsable = true,
	resizable = true,
	scrollable = true,
	modal = false,
	type = "default",
	growable,
	defaultWindow = false,
	initialSize = [350, 0],
	initialPosition = [110, 110],
	minimumSize = [300, 0],
	header,
	appMenu,
	contextMenu,
	onCloseFunc,
	children,
}) => {
	if (!icon || icon === "") {
		icon = fileIcon;
	}

	const currentApp = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId],
	);
	const currentWindow = currentApp?.windows.find((w) => w.id === id);
	const desktopEventDispatch = useAppManagerDispatch();
	const player = useSoundDispatch();

	const [size, setSize] = useState<[number, number]>(
		currentWindow?.size ?? initialSize,
	);
	const [clickPosition, setClickPosition] = useState<[number, number]>([0, 0]);

	const clickOffset = [10, 10];

	const { track } = useClassicyAnalytics();
	const analyticsArgs = useMemo(() => {
		return {
			appId,
			id,
			icon,
			hidden,
			closable,
			zoomable,
			collapsable,
			resizable,
			scrollable,
			modal,
			windowType: type,
			growable,
			defaultWindow,
			initialSize,
			initialPosition,
			minimumSize,
		};
	}, [
		appId,
		closable,
		collapsable,
		defaultWindow,
		growable,
		hidden,
		icon,
		id,
		initialPosition,
		initialSize,
		minimumSize,
		modal,
		resizable,
		scrollable,
		type,
		zoomable,
	]);

	const windowRef = useRef<HTMLDivElement | null>(null);

	const resolvedPosition = useMemo(
		() => resolvePosition(initialPosition, initialSize),
		[initialPosition, initialSize],
	);

	const ws = useMemo(() => {
		const initialWindowState: ClassicyStoreSystemAppWindow = {
			collapsed: false,
			focused: false,
			contextMenu: contextMenu,
			dragging: false,
			moving: false,
			resizing: false,
			zoomed: false,
			size: initialSize,
			position: resolvedPosition,
			closed: hidden,
			menuBar: appMenu || [],
			showContextMenu: false,
			default: defaultWindow,
			id: id,
			appId: appId,
			minimumSize: [0, 0],
		};

		if (currentWindow) {
			return currentWindow;
		}

		return {
			...initialWindowState,
			appId,
			minimumSize,
			position: resolvedPosition,
		} as ClassicyStoreSystemAppWindow;
	}, [
		appId,
		appMenu,
		contextMenu,
		currentWindow,
		defaultWindow,
		hidden,
		id,
		resolvedPosition,
		initialSize,
		minimumSize,
	]);

	const windowRegistered = useRef(false);
	useEffect(() => {
		if (!windowRegistered.current) {
			windowRegistered.current = true;
			desktopEventDispatch({
				type: "ClassicyWindowOpen",
				window: ws,
				app: {
					id: appId,
				},
			});
			// Refresh the desktop menu bar with fresh closures from the component
			// props, since onClickFunc cannot survive JSON serialization to localStorage.
			if (appMenu) {
				desktopEventDispatch({
					type: "ClassicyWindowFocus",
					app: {
						id: appId,
						appMenu: appMenu,
					},
					window: ws,
				});
			}
		}
	}, [appId, ws, appMenu, desktopEventDispatch]);

	useEffect(() => {
		if (ws.focused && appMenu) {
			desktopEventDispatch({
				type: "ClassicyWindowMenu",
				menuBar: appMenu,
			});
		}
	}, [ws.focused, appMenu, desktopEventDispatch]);

	const startResizeWindow = (e: MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		track("resize", { type: "ClassicyWindow", ...analyticsArgs });
		desktopEventDispatch({
			type: "ClassicyWindowPosition",
			app: {
				id: appId,
			},
			window: ws,
			position: [
				windowRef?.current?.getBoundingClientRect().left,
				windowRef?.current?.getBoundingClientRect().top,
			],
		});
		setResize(true);
		setZoom(false);
		setSize([
			windowRef?.current?.clientWidth || initialSize[0],
			windowRef?.current?.clientHeight || initialSize[1],
		]);
	};

	const startMoveWindow = (e: MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		if (modal && type === "error") {
			// Don't allow modal error dialogs to move
			return;
		}
		track("move", { type: "ClassicyWindow", ...analyticsArgs });
		setClickPosition([
			e.clientX - (windowRef?.current?.getBoundingClientRect().left || 0),
			e.clientY - (windowRef?.current?.getBoundingClientRect().top || 0),
		]);
		desktopEventDispatch({
			type: "ClassicyWindowMove",
			app: {
				id: appId,
			},
			window: ws,
			moving: true,
			position: [
				windowRef?.current?.getBoundingClientRect().left,
				windowRef?.current?.getBoundingClientRect().top,
			],
		});
		player({ type: "ClassicySoundPlay", sound: "ClassicyWindowMoveIdle" });
		setDragging(true);
	};

	const changeWindow = (e: MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		if (ws.resizing || ws.dragging) {
			setActive(e);
		}

		if (ws.resizing) {
			setSize([
				Math.abs(ws.position[0] - e.clientX) + 5,
				Math.abs(ws.position[1] - e.clientY) + 5,
			]);
		}

		if (ws.dragging) {
			player({ type: "ClassicySoundPlay", sound: "ClassicyWindowMoveMoving" });
			setMoving(true, [
				e.clientX - clickPosition[0],
				e.clientY - clickPosition[1],
			]);
		}
	};

	const stopChangeWindow = (e: MouseEvent<HTMLDivElement>) => {
		track("halt", { type: "ClassicyWindow", ...analyticsArgs });
		e.preventDefault();
		setActive();
		if (ws.resizing || ws.dragging || ws.moving) {
			player({
				type: "ClassicySoundPlayInterrupt",
				sound: "ClassicyWindowMoveStop",
			});
		}
		setResize(false);
		setDragging(false);
		const rect = windowRef.current?.getBoundingClientRect();
		setMoving(false, [
			rect?.left ?? ws.position[0],
			rect?.top ?? ws.position[1],
		]);
	};

	const setDragging = (toDrag: boolean) => {
		desktopEventDispatch({
			type: "ClassicyWindowDrag",
			dragging: toDrag,
			app: {
				id: appId,
			},
			window: ws,
		});
	};

	const setMoving = (
		toMove: boolean,
		toPosition: [number, number] = [0, 0],
	) => {
		desktopEventDispatch({
			type: "ClassicyWindowMove",
			moving: toMove,
			position: toPosition,
			app: {
				id: appId,
			},
			window: ws,
		});
	};

	const isActive = useCallback(() => {
		return ws.focused;
	}, [ws.focused]);

	const setActive = useCallback(
		(e?: MouseEvent<HTMLDivElement>) => {
			track("focus", { type: "ClassicyWindow", ...analyticsArgs });
			if (!ws.focused) {
				player({ type: "ClassicySoundPlay", sound: "ClassicyWindowFocus" });
				desktopEventDispatch({
					type: "ClassicyWindowFocus",
					app: {
						id: appId,
						appMenu: appMenu,
					},
					window: ws,
				});
			}
		},
		[ws, appId, appMenu, desktopEventDispatch, player, track, analyticsArgs],
	);

	useEffect(() => {
		// This ensures that once a window has opened it becomes the focus.
		// setActive();
		if (modal && type === "error") {
			player({ type: "ClassicySoundPlayError" });
		}
	}, [modal, player, type]);

	const toggleCollapse = () => {
		if (collapsable) {
			setCollapse(!ws.collapsed);
		}
	};

	const setCollapse = (toCollapse: boolean) => {
		if (toCollapse) {
			track("collapse", { type: "ClassicyWindow", ...analyticsArgs });
			setZoom(false);
			player({ type: "ClassicySoundPlay", sound: "ClassicyWindowCollapse" });
			desktopEventDispatch({
				type: "ClassicyWindowCollapse",
				window: ws,
				app: {
					id: appId,
				},
			});
		} else {
			track("expand", { type: "ClassicyWindow", ...analyticsArgs });
			player({ type: "ClassicySoundPlay", sound: "ClassicyWindowExpand" });
			desktopEventDispatch({
				type: "ClassicyWindowExpand",
				window: ws,
				app: {
					id: appId,
				},
			});
		}
	};

	const toggleZoom = () => {
		setActive();
		if (zoomable) {
			setZoom(!ws.zoomed, false);
		}
	};

	const setZoom = (toZoom: boolean, playSound: boolean = true) => {
		if (ws.collapsed) {
			setCollapse(false);
		}
		if (playSound) {
			player({
				type: "ClassicySoundPlay",
				sound: toZoom
					? "ClassicyWindowZoomMaximize"
					: "ClassicyWindowZoomMinimize",
			});
		}
		track(toZoom ? "zoom" : "minimize", {
			type: "ClassicyWindow",
			...analyticsArgs,
		});
		desktopEventDispatch({
			type: "ClassicyWindowZoom",
			zoomed: toZoom,
			window: ws,
			app: {
				id: appId,
			},
		});
	};

	const setContextMenu = (toShow: boolean, atPosition: [number, number]) => {
		desktopEventDispatch({
			type: "ClassicyWindowContextMenu",
			contextMenu: toShow,
			position: atPosition,
			window: ws,
			app: {
				id: appId,
			},
		});
	};

	const closeContextMenuHandler = useCallback(() => {
		desktopEventDispatch({
			type: "ClassicyWindowContextMenu",
			contextMenu: false,
			position: [0, 0],
			window: ws,
			app: { id: appId },
		});
	}, [desktopEventDispatch, ws, appId]);

	const onMouseOutHandler = (e: MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		setContextMenu(false, [0, 0]);
	};

	const showContextMenu = (e: MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		setActive();
		track("contextMenu", {
			type: "ClassicyWindow",
			show: true,
			...analyticsArgs,
		});
		setContextMenu(true, [
			e.clientX - clickOffset[0],
			e.clientY - clickOffset[1],
		]);
	};

	const setResize = (toResize: boolean) => {
		if (resizable) {
			desktopEventDispatch({
				type: "ClassicyWindowResize",
				resizing: toResize,
				window: ws,
				size: [
					windowRef.current?.getBoundingClientRect().width,
					windowRef.current?.getBoundingClientRect().height,
				],
				app: {
					id: appId,
				},
			});
		}
	};

	const close = () => {
		setActive();
		track("close", { type: "ClassicyWindow", show: true, ...analyticsArgs });
		player({ type: "ClassicySoundPlay", sound: "ClassicyWindowClose" });
		desktopEventDispatch({
			type: "ClassicyWindowClose",
			app: {
				id: appId,
			},
			window: ws,
		});
		if (typeof onCloseFunc === "function") {
			onCloseFunc(id);
		}
	};

	return (
		<>
			{!ws.closed && (
				// biome-ignore lint/a11y/useKeyWithClickEvents: application container captures clicks for focus
				// biome-ignore lint/a11y/useKeyWithMouseEvents: mouse tracking for window drag
				<div
					id={[appId, id].join("_")}
					ref={windowRef}
					role="application"
					style={{
						width: size[0] === 0 ? "auto" : size[0],
						height: ws.collapsed ? "auto" : size[1] === 0 ? "auto" : size[1],
						left: ws.position[0],
						top: ws.position[1],
						minWidth: minimumSize[0],
						minHeight: ws.collapsed ? 0 : minimumSize[1],
					}}
					className={classNames(
						"classicyWindow",
						ws.collapsed ? "classicyWindowCollapsed" : "",
						ws.zoomed ? "classicyWindowZoomed" : "",
						isActive() ? "classicyWindowActive" : "classicyWindowInactive",
						currentApp?.focused && !isActive() ? "classicyWindowActiveApp" : "",
						!ws.closed ? "" : "classicyWindowInvisible",
						ws.moving ? "classicyWindowDragging" : "",
						ws.resizing ? "classicyWindowResizing" : "",
						modal ? "classicyWindowModal" : "",
						modal && type === "error" ? "classicyWindowRed" : "",
						scrollable ? "" : "classicyWindowNoScroll",
					)}
					onMouseMove={changeWindow}
					onMouseUp={stopChangeWindow}
					onClick={setActive}
					onContextMenu={showContextMenu}
					onMouseOut={onMouseOutHandler}
				>
					{contextMenu && ws.contextMenu ? (
						<ClassicyContextualMenu
							name={[appId, id, "contextMenu"].join("_")}
							menuItems={contextMenu}
							position={clickPosition}
							onClose={closeContextMenuHandler}
						></ClassicyContextualMenu>
					) : null}

					<div
						className={classNames(
							"classicyWindowTitleBar",
							modal === true ? "classicyWindowTitleBarModal" : "",
						)}
					>
						{closable && (
							<div className={"classicyWindowControlBox"}>
								{/* biome-ignore lint/a11y/useSemanticElements: custom window control styled as pixel-precise box */}
								<div
									className={"classicyWindowCloseBox"}
									role="button"
									tabIndex={0}
									onClick={close}
									onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
										if (e.key === "Enter" || e.key === " ") close();
									}}
								></div>
							</div>
						)}
						{/* biome-ignore lint/a11y/noStaticElementInteractions: title bar is a mouse-only drag handle */}
						<div
							className={"classicyWindowTitle"}
							role="presentation"
							onMouseDown={startMoveWindow}
							onMouseUp={stopChangeWindow}
						>
							{title !== "" ? (
								<>
									<div className={"classicyWindowTitleLeft"}></div>
									<div className={"classicyWindowIcon"}>
										<img src={icon} alt={title} />
									</div>
									<div className={"classicyWindowTitleText"}>
										<p>{title}</p>
									</div>
									<div className={"classicyWindowTitleRight"}></div>
								</>
							) : (
								<div className={"classicyWindowTitleCenter"}></div>
							)}
						</div>
						{zoomable && (
							<div className={"classicyWindowControlBox"}>
								{/* biome-ignore lint/a11y/useSemanticElements: custom window control styled as pixel-precise box */}
								<div
									className={"classicyWindowZoomBox"}
									role="button"
									tabIndex={0}
									onClick={toggleZoom}
									onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
										if (e.key === "Enter" || e.key === " ") toggleZoom();
									}}
								></div>
							</div>
						)}
						{collapsable && (
							<div className={"classicyWindowControlBox"}>
								{/* biome-ignore lint/a11y/useSemanticElements: custom window control styled as pixel-precise box */}
								<div
									className={"classicyWindowCollapseBox"}
									role="button"
									tabIndex={0}
									onClick={toggleCollapse}
									onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
										if (e.key === "Enter" || e.key === " ") toggleCollapse();
									}}
								></div>
							</div>
						)}
					</div>
					{header && !ws.collapsed && (
						<div
							className={classNames(
								"classicyWindowHeader",
								isActive() ? "" : "classicyWindowHeaderDimmed",
							)}
						>
							{header}
						</div>
					)}
					<div
						className={classNames(
							!isActive() ? "classicyWindowContentsDimmed" : "",
							scrollable === true ? "" : "classicyWindowNoScroll",
							modal === true
								? "classicyWindowContentsModal"
								: "classicyWindowContents",
							header ? "classicyWindowContentsWithHeader" : "",
							ws.collapsed ? "hidden" : "block",
						)}
					>
						<div
							className={classNames(
								"classicyWindowContentsInner",
								modal === true ? "classicyWindowContentsModalInner" : "",
								growable ? "classicyWindowContentsInnerGrow" : "",
							)}
						>
							{" "}
							{children}
						</div>
					</div>
					{resizable && !ws.collapsed && (
						// biome-ignore lint/a11y/noStaticElementInteractions: resize handle is mouse-only drag target
						<div
							className={classNames(
								"classicyWindowResizer",
								isActive() ? "" : "classicyWindowResizerDimmed",
							)}
							role="presentation"
							onMouseDown={startResizeWindow}
							onMouseUp={stopChangeWindow}
						></div>
					)}
				</div>
			)}
		</>
	);
};
