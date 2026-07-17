import type { ClassicyStoreSystemAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { useClassicyContextualMenu } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import {
	useFocusTrap,
	useKeyboardEquivalents,
} from "@/SystemFolder/SystemResources/Keyboard/useKeyboardEquivalents";
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
import { createPortal } from "react-dom";

import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

const fileIcon = ClassicyIcons.system.files.file;

// Pixels the pointer must travel with the button held before a title bar
// mousedown becomes a window drag; anything less is treated as a click.
const dragThreshold = 4;

import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import { useClassicyCursor } from "@/SystemFolder/SystemResources/Cursor/useClassicyCursor";

export type ClassicyWindowPositionX = number | "left" | "center" | "right";
export type ClassicyWindowPositionY = number | "top" | "center" | "bottom";
export type ClassicyWindowSizeDimension = number | `${number}%`;

function resolveSize(
	size: [ClassicyWindowSizeDimension, ClassicyWindowSizeDimension],
): [number, number] {
	const menuBarHeight = 30;
	const desktop =
		typeof document !== "undefined"
			? document.getElementById("classicyDesktop")
			: null;
	const dw =
		desktop?.clientWidth ??
		(typeof window !== "undefined" ? window.innerWidth : 800);
	const dh =
		(desktop?.clientHeight ??
			(typeof window !== "undefined" ? window.innerHeight : 600)) -
		menuBarHeight;

	const resolve = (dim: ClassicyWindowSizeDimension, max: number): number => {
		if (typeof dim === "number") return dim;
		const pct = parseFloat(dim);
		if (!Number.isNaN(pct)) return Math.round((pct / 100) * max);
		return 0;
	};

	return [resolve(size[0], dw), resolve(size[1], dh)];
}

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
	hideIcon?: boolean;
	hidden?: boolean;
	closable?: boolean;
	zoomable?: boolean;
	collapsable?: boolean;
	resizable?: boolean;
	scrollable?: boolean;
	modal?: boolean;
	growable?: boolean;
	defaultWindow?: boolean;
	initialSize?: [ClassicyWindowSizeDimension, ClassicyWindowSizeDimension];
	initialPosition?: [ClassicyWindowPositionX, ClassicyWindowPositionY];
	minimumSize?: [ClassicyWindowSizeDimension, ClassicyWindowSizeDimension];
	header?: ReactNode;
	appMenu?: ClassicyMenuItem[];
	contextMenu?: ClassicyMenuItem[];
	dimContents?: boolean;
	onCloseFunc?: (id: string) => void;
	children?: ReactNode;
	type?: string;
	/**
	 * Platinum window class (#205). `"document"` (default) uses the standard
	 * 19px HIG title bar; `"utility"` renders a tool-palette style crosshatch
	 * top drag region.
	 */
	windowType?: "document" | "utility";
	/**
	 * Zoom-box behavior (#208). `"full"` zooms both axes to the standard state,
	 * `"horizontal"` only the width, `"vertical"` only the height. The user's
	 * pre-zoom rect is remembered and restored on un-zoom.
	 */
	zoomMode?: "full" | "horizontal" | "vertical";
	/**
	 * Window header styling (#183). `"list"` removes the header's bottom
	 * separator line (list-view column header); `"standard"` keeps the bevel.
	 */
	headerVariant?: "standard" | "list";
	/**
	 * Draw a 2px active/inactive content-region frame around the window body
	 * (#203), used to distinguish a modeless dialog from a plain window.
	 */
	contentFrame?: boolean;
}

export const ClassicyWindow: FunctionalComponent<ClassicyWindowProps> = ({
	id,
	title = "",
	appId,
	icon: iconProp,
	hideIcon = false,
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
	dimContents = true,
	header,
	appMenu,
	contextMenu,
	onCloseFunc,
	children,
	windowType = "document",
	zoomMode = "full",
	headerVariant = "standard",
	contentFrame = false,
}) => {
	const icon = iconProp || fileIcon;

	const currentApp = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId],
	);
	// #206: double-click-title-to-collapse is a desktop preference (Appearance
	// checkbox in the HIG), defaulting on. Optional chaining keeps this safe when
	// the Desktop slice is absent (e.g. isolated unit tests).
	const doubleClickTitleToCollapse =
		useAppManager(
			(state) =>
				(
					state.System.Manager.Desktop as
						| { doubleClickTitleToCollapse?: boolean }
						| undefined
				)?.doubleClickTitleToCollapse,
		) ?? true;
	const currentWindow = currentApp?.windows.find((w) => w.id === id);
	const desktopEventDispatch = useAppManagerDispatch();
	const player = useSoundDispatch();
	const { showContextMenu } = useClassicyContextualMenu();

	const resolvedSize = useMemo(() => resolveSize(initialSize), [initialSize]);
	const resolvedMinimumSize = useMemo(
		() => resolveSize(minimumSize),
		[minimumSize],
	);

	// Non-resizable windows can't be user-resized, so persisted size from the
	// store is useless and can cause collapse if localStorage is stale.
	const [size, setSize] = useState<[number, number]>(
		resizable ? (currentWindow?.size ?? resolvedSize) : resolvedSize,
	);
	const [clickPosition, setClickPosition] = useState<[number, number]>([0, 0]);

	const { track } = useClassicyAnalytics();
	const setCursor = useClassicyCursor();
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
	const pendingSizeRef = useRef<[number, number] | null>(null);
	const isDraggingRef = useRef(false);
	const isResizingRef = useRef(false);
	const pendingDragRef = useRef(false);
	const dragStartPointRef = useRef<[number, number]>([0, 0]);
	const clickPositionRef = useRef<[number, number]>([0, 0]);
	const wsPositionRef = useRef<[number, number]>([0, 0]);
	// #208: the user's window rect captured just before a zoom, restored on un-zoom.
	const userStateRef = useRef<{
		position: [number, number];
		size: [number, number];
	} | null>(null);
	const docMoveHandlerRef = useRef<(e: globalThis.MouseEvent) => void>(
		() => {},
	);
	const docUpHandlerRef = useRef<(e: globalThis.MouseEvent) => void>(() => {});

	useEffect(() => {
		const moveHandler = (e: globalThis.MouseEvent) =>
			docMoveHandlerRef.current(e);
		const upHandler = (e: globalThis.MouseEvent) => docUpHandlerRef.current(e);
		document.addEventListener("mousemove", moveHandler);
		document.addEventListener("mouseup", upHandler);
		return () => {
			document.removeEventListener("mousemove", moveHandler);
			document.removeEventListener("mouseup", upHandler);
		};
	}, []);

	const resolvedPosition = useMemo(
		() => resolvePosition(initialPosition, resolvedSize),
		[initialPosition, resolvedSize],
	);

	const ws = useMemo(() => {
		const initialWindowState: ClassicyStoreSystemAppWindow = {
			collapsed: false,
			focused: false,
			dragging: false,
			moving: false,
			resizing: false,
			zoomed: false,
			size: resolvedSize,
			position: resolvedPosition,
			closed: hidden,
			menuBar: appMenu || [],
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
			minimumSize: resolvedMinimumSize,
			position: resolvedPosition,
		} as ClassicyStoreSystemAppWindow;
	}, [
		appId,
		appMenu,
		currentWindow,
		defaultWindow,
		hidden,
		id,
		resolvedPosition,
		resolvedSize,
		resolvedMinimumSize,
	]);

	useEffect(() => {
		wsPositionRef.current = ws.position as [number, number];
	}, [ws.position]);

	const windowRegistered = useRef(false);
	useEffect(() => {
		if (!windowRegistered.current) {
			windowRegistered.current = true;
			// A genuinely new window is focused by the ClassicyWindowOpen handler;
			// a persisted window re-registering must not steal focus. Menu-closure
			// refresh for the focused window happens in the ws.focused effect below.
			desktopEventDispatch({
				type: "ClassicyWindowOpen",
				window: ws,
				app: {
					id: appId,
				},
			});
		}
	}, [appId, ws, desktopEventDispatch]);

	useEffect(() => {
		if (ws.focused && appMenu) {
			desktopEventDispatch({
				type: "ClassicyWindowMenu",
				menuBar: appMenu,
			});
		}
	}, [ws.focused, appMenu, desktopEventDispatch]);

	// Updated every render so the stable document listeners always see fresh state.
	docMoveHandlerRef.current = (e: globalThis.MouseEvent) => {
		promoteDragIfNeeded(e.clientX, e.clientY);
		if (!isDraggingRef.current && !isResizingRef.current) return;
		// Skip when mouse is still inside the window — the React onMouseMove handler covers that.
		if (windowRef.current?.contains(e.target as Node)) return;

		if (isResizingRef.current) {
			const newWidth = Math.abs(wsPositionRef.current[0] - e.clientX) + 5;
			const newHeight = Math.abs(wsPositionRef.current[1] - e.clientY) + 5;
			pendingSizeRef.current = [newWidth, newHeight];
			if (windowRef.current) {
				windowRef.current.style.width = `${newWidth}px`;
				windowRef.current.style.height = `${newHeight}px`;
			}
		}

		if (isDraggingRef.current) {
			setMoving(true, [
				e.clientX - clickPositionRef.current[0],
				e.clientY - clickPositionRef.current[1],
			]);
		}
	};

	docUpHandlerRef.current = (_e: globalThis.MouseEvent) => {
		pendingDragRef.current = false;
		if (!isDraggingRef.current && !isResizingRef.current) return;
		isDraggingRef.current = false;
		isResizingRef.current = false;

		player({
			type: "ClassicySoundPlayInterrupt",
			sound: "ClassicyWindowMoveStop",
		});
		setActive();
		setResize(false);
		if (pendingSizeRef.current) {
			setSize(pendingSizeRef.current);
			pendingSizeRef.current = null;
		}
		setDragging(false);
		const rect = windowRef.current?.getBoundingClientRect();
		setMoving(false, [
			rect?.left ?? wsPositionRef.current[0],
			rect?.top ?? wsPositionRef.current[1],
		]);
	};

	const startResizeWindow = (e: MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		track("resize", { type: "ClassicyWindow", ...analyticsArgs });
		const left = windowRef?.current?.getBoundingClientRect().left ?? 0;
		const top = windowRef?.current?.getBoundingClientRect().top ?? 0;
		wsPositionRef.current = [left, top];
		isResizingRef.current = true;
		desktopEventDispatch({
			type: "ClassicyWindowPosition",
			app: {
				id: appId,
			},
			window: ws,
			position: [left, top],
		});
		setResize(true);
		setZoom(false);
		setSize([
			windowRef?.current?.clientWidth || resolvedSize[0],
			windowRef?.current?.clientHeight || resolvedSize[1],
		]);
	};

	const startMoveWindow = (e: MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		if (modal && type === "error") {
			// Don't allow modal error dialogs to move
			return;
		}
		// Only arm a potential drag; it becomes a real drag once the pointer
		// travels past dragThreshold (see promoteDragIfNeeded). A bare click
		// must not enter drag state so double-click can collapse the window.
		const offsetX =
			e.clientX - (windowRef?.current?.getBoundingClientRect().left || 0);
		const offsetY =
			e.clientY - (windowRef?.current?.getBoundingClientRect().top || 0);
		setClickPosition([offsetX, offsetY]);
		clickPositionRef.current = [offsetX, offsetY];
		dragStartPointRef.current = [e.clientX, e.clientY];
		pendingDragRef.current = true;
	};

	const promoteDragIfNeeded = (clientX: number, clientY: number) => {
		if (!pendingDragRef.current) return;
		const distance = Math.hypot(
			clientX - dragStartPointRef.current[0],
			clientY - dragStartPointRef.current[1],
		);
		if (distance < dragThreshold) return;
		pendingDragRef.current = false;
		isDraggingRef.current = true;
		track("move", { type: "ClassicyWindow", ...analyticsArgs });
		// Move to the pointer-derived position immediately: the mousemove
		// handlers still see stale (pre-drag) store state during this event,
		// so a drag delivered in a single fast mousemove would otherwise be lost.
		desktopEventDispatch({
			type: "ClassicyWindowMove",
			app: {
				id: appId,
			},
			window: ws,
			moving: true,
			position: [
				clientX - clickPositionRef.current[0],
				clientY - clickPositionRef.current[1],
			],
		});
		player({ type: "ClassicySoundPlay", sound: "ClassicyWindowMoveIdle" });
		setDragging(true);
	};

	const changeWindow = (e: MouseEvent<HTMLDivElement>) => {
		promoteDragIfNeeded(e.clientX, e.clientY);
		// Only prevent default when actually moving/resizing — unconditional
		// preventDefault() on mousemove breaks native range-input thumb dragging.
		if (ws.resizing || ws.dragging || ws.moving) {
			e.preventDefault();
			setActive(e);
		}

		if (ws.resizing) {
			const newWidth = Math.abs(ws.position[0] - e.clientX) + 5;
			const newHeight = Math.abs(ws.position[1] - e.clientY) + 5;
			pendingSizeRef.current = [newWidth, newHeight];
			if (windowRef.current) {
				windowRef.current.style.width = `${newWidth}px`;
				windowRef.current.style.height = `${newHeight}px`;
			}
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
		// Only prevent default when actually stopping a drag or resize.
		// Unconditional preventDefault() breaks Safari's native range input
		// release, causing the page to freeze after slider interactions.
		if (ws.resizing || ws.dragging || ws.moving) {
			e.preventDefault();
			player({
				type: "ClassicySoundPlayInterrupt",
				sound: "ClassicyWindowMoveStop",
			});
		}
		// Clear refs so the document-level mouseup handler knows this event
		// was already handled by the element and skips double-processing.
		pendingDragRef.current = false;
		isDraggingRef.current = false;
		isResizingRef.current = false;
		setActive();
		setResize(false);
		if (pendingSizeRef.current) {
			setSize(pendingSizeRef.current);
			pendingSizeRef.current = null;
		}
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
		(_e?: MouseEvent<HTMLDivElement>) => {
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

	// #206: Option-click collapses (or expands) every open window at once. The
	// current window's collapsed state decides the direction for all of them.
	const collapseOrExpandAll = (toCollapse: boolean) => {
		if (typeof useAppManager.getState !== "function") {
			// Test/mocked store without a real Zustand instance — fall back to self.
			setCollapse(toCollapse);
			return;
		}
		const apps = useAppManager.getState().System.Manager.Applications.apps;
		player({
			type: "ClassicySoundPlay",
			sound: toCollapse ? "ClassicyWindowCollapse" : "ClassicyWindowExpand",
		});
		Object.entries(apps).forEach(([appKey, app]) => {
			app.windows?.forEach((w) => {
				if (w.closed) return;
				if (w.collapsed === toCollapse) return;
				desktopEventDispatch({
					type: toCollapse ? "ClassicyWindowCollapse" : "ClassicyWindowExpand",
					window: w,
					app: { id: appKey },
				});
			});
		});
	};

	// #206: the collapse box. Option-click collapses/expands ALL windows.
	const onCollapseBoxClick = (e: MouseEvent<HTMLDivElement>) => {
		if (e.altKey) {
			collapseOrExpandAll(!ws.collapsed);
			return;
		}
		toggleCollapse();
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
			applyZoom(!ws.zoomed);
		}
	};

	// #208: compute the "standard state" rect the window zooms to. `full` fills
	// the available desktop; `horizontal`/`vertical` grow a single axis and keep
	// the other at its current value.
	const computeStandardRect = (): {
		position: [number, number];
		size: [number, number];
	} => {
		const menuBarHeight = 30;
		const margin = 8;
		const desktop =
			typeof document !== "undefined"
				? document.getElementById("classicyDesktop")
				: null;
		const dw =
			desktop?.clientWidth ??
			(typeof window !== "undefined" ? window.innerWidth : 800);
		const dh =
			desktop?.clientHeight ??
			(typeof window !== "undefined" ? window.innerHeight : 600);
		const stdW = Math.max(resolvedMinimumSize[0], dw - margin * 2);
		const stdH = Math.max(
			resolvedMinimumSize[1],
			dh - menuBarHeight - margin * 2,
		);

		const rect = windowRef.current?.getBoundingClientRect();
		const curW = Math.round(rect?.width ?? size[0] ?? resolvedSize[0]);
		const curH = Math.round(rect?.height ?? size[1] ?? resolvedSize[1]);
		const curLeft = Math.round(rect?.left ?? ws.position[0]);
		const curTop = Math.round(rect?.top ?? ws.position[1]);

		if (zoomMode === "horizontal") {
			return { position: [margin, curTop], size: [stdW, curH] };
		}
		if (zoomMode === "vertical") {
			return {
				position: [curLeft, menuBarHeight + margin],
				size: [curW, stdH],
			};
		}
		return {
			position: [margin, menuBarHeight + margin],
			size: [stdW, stdH],
		};
	};

	// Flip the zoom flag (+ sound/track) without touching geometry. Used both by
	// the zoom toggle and by resize/collapse, which clear the flag without
	// restoring the remembered user state.
	const setZoomFlag = (toZoom: boolean, playSound: boolean = true) => {
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

	// #208: standard-state vs user-state. Remember the user's rect before zoom
	// and restore it on un-zoom.
	const applyZoom = (toZoom: boolean) => {
		if (toZoom) {
			userStateRef.current = {
				position: [ws.position[0], ws.position[1]],
				size: [size[0], size[1]],
			};
			const standard = computeStandardRect();
			setZoomFlag(true);
			setSize(standard.size);
			setMoving(false, standard.position);
		} else {
			setZoomFlag(false);
			const previous = userStateRef.current;
			if (previous) {
				setSize(previous.size);
				setMoving(false, previous.position);
				userStateRef.current = null;
			}
		}
	};

	// Backward-compatible alias: earlier callers used `setZoom(false)` purely to
	// clear the zoomed flag (resize/collapse), never to restore a rect.
	const setZoom = setZoomFlag;

	const onContextMenuHandler = (e: MouseEvent<HTMLDivElement>) => {
		if (e.defaultPrevented) return;
		// Claim the right-click: neither the desktop menu nor the native
		// browser menu may appear over a window.
		e.preventDefault();
		e.stopPropagation();
		setActive();
		const items = contextMenu ?? currentApp?.contextMenu;
		track("contextMenu", {
			type: "ClassicyWindow",
			show: !!items,
			...analyticsArgs,
		});
		if (items && items.length > 0) {
			showContextMenu(items, [e.clientX, e.clientY]);
		}
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

	// #194/#197: a modal window dismisses on Escape / Command-period (Cancel).
	// Closable modals close; a fixed modal with no close box just beeps.
	const onModalCancel = () => {
		if (closable) {
			close();
		} else {
			player({ type: "ClassicySoundPlayError" });
		}
	};

	// #197: clicking outside a modal (on the scrim) beeps and does nothing else.
	const onModalScrimClick = (e: MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		player({ type: "ClassicySoundPlayError" });
	};

	// #194/#197: modal windows trap Tab focus within themselves and bind the
	// dialog-wide Cancel equivalent. Scoped to this window so stacked modals
	// don't cross-fire.
	useFocusTrap({ ref: windowRef, enabled: modal, autoFocus: modal });
	useKeyboardEquivalents({
		enabled: modal,
		targetRef: windowRef,
		onCancel: modal ? onModalCancel : undefined,
	});

	const windowStyle = useMemo(
		() => ({
			width: size[0] === 0 ? "auto" : size[0],
			height: ws.collapsed ? "auto" : size[1] === 0 ? "auto" : size[1],
			left: ws.position[0],
			top: ws.position[1],
			minWidth: resolvedMinimumSize[0],
			minHeight: ws.collapsed ? 0 : resolvedMinimumSize[1],
		}),
		[
			size[0],
			size[1],
			ws.collapsed,
			ws.position[0],
			ws.position[1],
			resolvedMinimumSize[0],
			resolvedMinimumSize[1],
		],
	);

	const desktopRoot =
		typeof document !== "undefined"
			? (document.getElementById("classicyDesktop") ?? document.body)
			: null;

	const windowContent = !ws.closed && (
		// biome-ignore lint/a11y/useKeyWithClickEvents: application container captures clicks for focus
		<div
			id={[appId, id].join("_")}
			ref={windowRef}
			role="application"
			style={windowStyle}
			className={classNames(
				"classicyWindow",
				windowType === "utility"
					? "classicyWindowUtility"
					: "classicyWindowDocument",
				ws.collapsed ? "classicyWindowCollapsed" : "",
				ws.zoomed ? "classicyWindowZoomed" : "",
				modal || isActive() ? "classicyWindowActive" : "classicyWindowInactive",
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
			onContextMenu={onContextMenuHandler}
		>
			{/* #205: drag the window from the narrow frame on all four sides,
					    not just the title bar. Each edge reuses the title-bar move logic. */}
			{!ws.collapsed &&
				(["top", "right", "bottom", "left"] as const).map((edge) => (
					// biome-ignore lint/a11y/noStaticElementInteractions: frame edge is a mouse-only drag handle
					<div
						key={edge}
						className={classNames(
							"classicyWindowFrameEdge",
							`classicyWindowFrameEdge-${edge}`,
						)}
						role="presentation"
						onMouseDown={startMoveWindow}
						onMouseUp={stopChangeWindow}
					></div>
				))}
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
					onDoubleClick={
						doubleClickTitleToCollapse ? toggleCollapse : undefined
					}
				>
					{title !== "" ? (
						<>
							<div className={"classicyWindowTitleLeft"}></div>
							{!hideIcon && (
								<div className={"classicyWindowIcon"}>
									<img src={icon} alt={title} />
								</div>
							)}
							<div className={"classicyWindowTitleText"}>
								<p>{title}</p>
							</div>
							<div className={"classicyWindowTitleRight"}></div>
						</>
					) : (
						<div className={"classicyWindowTitleCenter"}></div>
					)}
				</div>
				{zoomable && !modal && (
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
							onClick={onCollapseBoxClick}
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
						headerVariant === "list" ? "classicyWindowHeaderList" : "",
						isActive() ? "" : "classicyWindowHeaderDimmed",
					)}
				>
					{header}
				</div>
			)}
			<div
				className={classNames(
					!modal && !isActive()
						? dimContents
							? "classicyWindowContentsDimmed"
							: "classicyWindowContentsNotDimmed"
						: "",
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
						contentFrame && isActive() ? "classicyWindowContentsFramed" : "",
						contentFrame && !isActive()
							? "classicyWindowContentsFramed classicyWindowContentsFramedDimmed"
							: "",
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
					onMouseEnter={() => setCursor("resizeLr")}
					onMouseLeave={() => setCursor()}
				></div>
			)}
		</div>
	);

	if (modal && desktopRoot) {
		// #197: modal windows render an input-blocking scrim; clicking it beeps.
		const modalScrim = (
			// biome-ignore lint/a11y/noStaticElementInteractions: scrim is a mouse-only backdrop
			<div
				className={classNames(
					"classicyWindowModalScrim",
					modal && type === "error" ? "classicyWindowModalScrimError" : "",
				)}
				role="presentation"
				onMouseDown={onModalScrimClick}
			></div>
		);
		return createPortal(
			<>
				{modalScrim}
				{windowContent}
			</>,
			desktopRoot,
		);
	}

	return <>{windowContent}</>;
};
