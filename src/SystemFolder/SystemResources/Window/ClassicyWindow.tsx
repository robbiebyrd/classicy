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
	type CSSProperties,
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

import {
	classicyWindowPagePath,
	classicyWindowPageTitle,
} from "@/SystemFolder/SystemResources/Analytics/ClassicyAnalyticsPath";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import { useClassicyCursor } from "@/SystemFolder/SystemResources/Cursor/useClassicyCursor";

export type ClassicyWindowPositionX = number | "left" | "center" | "right";
export type ClassicyWindowPositionY = number | "top" | "center" | "bottom";
export type ClassicyWindowSizeDimension = number | `${number}%`;

export function resolveSize(
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

export function resolvePosition(
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

/**
 * #248: clamp a window rect so it stays fully inside the viewport when it
 * fits; for a window larger than the viewport itself, only the top-left
 * corner is guaranteed on-screen — the title bar and its close box may still
 * render off-screen in that case. Pure and exported so it's unit-testable
 * without a real ResizeObserver.
 */
export function clampWindowPositionToViewport(
	position: [number, number],
	windowSize: [number, number],
): [number, number] {
	const menuBarHeight = 30;
	const vw = typeof window !== "undefined" ? window.innerWidth : 800;
	const vh = typeof window !== "undefined" ? window.innerHeight : 600;

	const maxX = Math.max(0, vw - windowSize[0]);
	const maxY = Math.max(menuBarHeight, vh - windowSize[1]);

	const x = Math.min(Math.max(position[0], 0), maxX);
	const y = Math.min(Math.max(position[1], menuBarHeight), maxY);

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
	/** Override the generated analytics pageview path for this window. */
	analyticsPath?: string;
	/** Suppress this window's analytics pageview entirely. */
	analyticsExclude?: boolean;
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
	 * Utility-only. When true, a `windowType="utility"` palette floats above
	 * every app's windows — even when its own app is backgrounded — instead of
	 * dropping behind the focused app (the default #234 behavior). Still sits
	 * below error modals. No-op on document windows.
	 */
	alwaysOnTop?: boolean;
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
	/**
	 * Optional Platinum placard (#196). When provided, this node is mounted in a
	 * status region at the window's bottom-left edge — to the LEFT of the
	 * horizontal scroll bar, where the HIG places a placard (often a
	 * magnification/status pop-up). It is hidden while the window is collapsed.
	 */
	placard?: ReactNode;
	/**
	 * Background color for the window contents area. Accepts any CSS color
	 * value — hex, rgb()/rgba(), or a `var(--…)` reference. When omitted,
	 * theme defaults apply (`--color-window-document` for standard windows,
	 * `--color-window-frame` for modal windows).
	 */
	backgroundColor?: string;
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
	analyticsPath,
	analyticsExclude,
	onCloseFunc,
	children,
	windowType = "document",
	alwaysOnTop = false,
	zoomMode = "full",
	headerVariant = "standard",
	contentFrame = false,
	placard,
	backgroundColor,
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
			(state) => state.System.Manager.Desktop?.doubleClickTitleToCollapse,
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

	const { track, page } = useClassicyAnalytics();
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
	// #248: once the user has manually dragged or resized the window, the
	// content-resize observer below must never silently move it again — an
	// async re-layout (e.g. an image finishing load) must not undo a manual
	// move.
	const userRepositionedRef = useRef(false);
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
		() =>
			// Clamp against `size` (the actual rendered/persisted dimensions),
			// not `resolvedSize` (derived from the initialSize prop alone) — a
			// resizable window's real size can already differ from its initial
			// default by the time this runs.
			clampWindowPositionToViewport(
				resolvePosition(initialPosition, resolvedSize),
				size,
			),
		[initialPosition, resolvedSize, size],
	);

	// #248: only a symbolic position (e.g. "center") should ever re-center as
	// content resizes after mount — a window opened at explicit numeric
	// coordinates must never silently move.
	const hasSymbolicPosition = useMemo(
		() => initialPosition.some((value) => typeof value === "string"),
		[initialPosition],
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
			windowType: windowType,
		};

		if (currentWindow) {
			// A window restored from persisted store state may have been saved
			// with an off-screen position (e.g. from a since-shrunk viewport, or
			// content that grew after that position was saved) — clamp it using
			// the window's own persisted size, not resolvedSize, since a
			// resized-and-persisted window's real size can exceed its default.
			return {
				...currentWindow,
				position: clampWindowPositionToViewport(
					currentWindow.position,
					currentWindow.size,
				),
			};
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
		windowType,
	]);

	useEffect(() => {
		wsPositionRef.current = ws.position as [number, number];
	}, [ws.position]);

	// #248: correct on first paint (resolvedPosition above), but an alert
	// sized [0, 0] (auto) centers against a phantom empty box — any async
	// content growth after mount (e.g. an <img> finishing load) needs to
	// re-run centering against the box's real, current size and re-clamp to
	// the viewport. Updated every render so the observer's stable callback
	// (see the mount-only effect below) always sees fresh state — the same
	// indirection docMoveHandlerRef/docUpHandlerRef use above.
	const handleContentResizeRef = useRef<() => void>(() => {});
	handleContentResizeRef.current = () => {
		if (!hasSymbolicPosition) return;
		// An in-progress or already-committed manual move/resize wins; an
		// async re-layout must never undo it.
		if (userRepositionedRef.current) return;
		if (isDraggingRef.current || isResizingRef.current) return;
		const el = windowRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const measuredSize: [number, number] = [rect.width, rect.height];
		const recentered = clampWindowPositionToViewport(
			resolvePosition(initialPosition, measuredSize),
			measuredSize,
		);
		if (
			Math.round(recentered[0]) === Math.round(wsPositionRef.current[0]) &&
			Math.round(recentered[1]) === Math.round(wsPositionRef.current[1])
		) {
			return;
		}
		setMoving(false, recentered);
	};

	// jsdom has no ResizeObserver (same guard as ClassicyTabs); the observer
	// simply never fires there, which is a no-op unless the helper above is
	// unit-tested directly against a mocked ResizeObserver. Re-attached
	// whenever the window opens/closes so a window that starts hidden picks
	// up observation once its content actually mounts.
	// biome-ignore lint/correctness/useExhaustiveDependencies: ws.closed isn't read in the effect body — it's an intentional re-attachment trigger so a window that starts hidden re-observes once it becomes visible
	useEffect(() => {
		if (typeof ResizeObserver === "undefined") return;
		const el = windowRef.current;
		if (!el) return;
		const observer = new ResizeObserver(() => handleContentResizeRef.current());
		observer.observe(el);
		return () => observer.disconnect();
	}, [ws.closed]);

	const pageviewPath = useMemo(
		() => analyticsPath ?? classicyWindowPagePath(appId, id),
		[analyticsPath, appId, id],
	);
	const wasOpenRef = useRef(false);
	const wasFocusedRef = useRef(false);

	// GA pageviews for a windowing UI: a window becoming open is a navigation
	// in its own right, and an open window gaining focus is a second, distinct
	// navigation — both emit, even when they land on the same path. Emission
	// waits until the window is actually registered in the store: a brand-new
	// window's first render has no store entry yet (currentWindow is
	// undefined, ws falls back to an unfocused synthetic state), so the effect
	// below returns before touching wasOpenRef/wasFocusedRef. That means the
	// first commit where currentWindow is defined is what counts as "just
	// opened" — a single emit, even though that commit already has the window
	// focused (the ClassicyWindowOpen reducer focuses a genuinely new window,
	// so registration and focus land in the same store update). A window that
	// opens unfocused (e.g. several windows restored on reload) emits on open,
	// then emits again whenever it's later focused. wasOpenRef/wasFocusedRef
	// track the previous commit's state so repeats (no open/focus transition)
	// stay silent.
	useEffect(() => {
		if (!currentWindow) return;

		const isOpen = !ws.closed;
		const isFocused = isOpen && !!ws.focused;
		const justOpened = isOpen && !wasOpenRef.current;
		const justFocused = isFocused && !wasFocusedRef.current;
		wasOpenRef.current = isOpen;
		wasFocusedRef.current = isFocused;

		if (analyticsExclude || !isOpen) return;
		if (!justOpened && !justFocused) return;

		page(
			pageviewPath,
			classicyWindowPageTitle(currentApp?.name, title, pageviewPath),
		);
	}, [
		currentWindow,
		ws.closed,
		ws.focused,
		analyticsExclude,
		pageviewPath,
		currentApp?.name,
		title,
		page,
	]);

	const windowRegistered = useRef(false);
	const lastMenuBarSignatureRef = useRef<string | undefined>(undefined);
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

	// A modal window is ephemeral: it carries no persisted geometry, and
	// leaving its record in the store makes the next open a "known id", which
	// the ClassicyWindowOpen handler deliberately does not focus. Dropping the
	// record on unmount is what lets each modal open take focus (#222) and each
	// dismissal hand focus back (#223). Document windows are excluded — their
	// records hold position/size that must survive an unmount and a reload.
	//
	// The ref reset is required for StrictMode correctness: React's dev-mode
	// double-invoke tears this effect down immediately after first mount,
	// reusing the same component instance (refs survive that phantom cycle).
	// Without resetting windowRegistered here, the registration effect above
	// sees it already `true` on the StrictMode re-run and skips re-dispatching
	// ClassicyWindowOpen, so the just-destroyed record never comes back even
	// though the window stays mounted and visible. Resetting the ref keeps the
	// two effects symmetric: destroying the record un-registers the instance,
	// so registration is allowed to fire again — whether that's a StrictMode
	// phantom remount or a genuine one. Do not remove this reset.
	useEffect(() => {
		if (!modal) return;
		return () => {
			windowRegistered.current = false;
			desktopEventDispatch({
				type: "ClassicyWindowDestroy",
				window: { id },
				app: { id: appId },
			});
		};
	}, [modal, id, appId, desktopEventDispatch]);

	useEffect(() => {
		if (!appMenu) return;
		// Guard the record write behind a structural signature: inline appMenu
		// literals produce a new identity every render, and writing the apps
		// slice re-renders whole-slice selectors — dispatching on identity alone
		// loops (SimpleText/PDFViewer regression, see 7687143). Functions are
		// stripped so closure churn doesn't count as a structural change.
		const signature = JSON.stringify(appMenu, (_key, value) =>
			typeof value === "function" ? undefined : value,
		);
		if (signature !== lastMenuBarSignatureRef.current) {
			lastMenuBarSignatureRef.current = signature;
			desktopEventDispatch({
				type: "ClassicyWindowSetMenuBar",
				app: { id: appId },
				windowId: id,
				menuBar: appMenu,
			});
		}
		if (ws.focused) {
			desktopEventDispatch({
				type: "ClassicyWindowMenu",
				menuBar: appMenu,
			});
		}
	}, [ws.focused, appMenu, appId, id, desktopEventDispatch]);

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
		userRepositionedRef.current = true;
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
		// Bound to onMouseUp on the window ROOT, so this runs on every release
		// anywhere in the window -- most of which are plain clicks, not gestures.
		// Report only a gesture that actually happened, or "halt" degenerates
		// into "clicked" (it was 24% of all analytics volume in production).
		// Gate on the refs rather than ws.*: ws is the store's async echo, while
		// isDraggingRef is set only past dragThreshold and isResizingRef only on
		// resize start -- the same signal docUpHandlerRef already trusts. Both
		// are cleared further down, so this must stay above that reset.
		if (isDraggingRef.current || isResizingRef.current) {
			track("halt", { type: "ClassicyWindow", ...analyticsArgs });
			userRepositionedRef.current = true;
		}
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

	// Visual active state — distinct from programmatic focus (ws.focused). Tool
	// palettes (windowType "utility") are floating windows: they always show
	// their active chrome and never render the washed-out inactive treatment,
	// even while the document window owns focus and the menu bar. Focus itself
	// (ws.focused, menu-bar ownership, ClassicyWindowFocus) is left untouched, so
	// a palette is never programmatically the focused window.
	const isActive = useCallback(() => {
		return windowType === "utility" || ws.focused;
	}, [ws.focused, windowType]);

	const setActive = useCallback(
		(_e?: MouseEvent<HTMLDivElement>) => {
			if (!ws.focused) {
				// Inside the guard so "focus" means the window BECAME focused.
				// The root binds both onMouseUp (which calls setActive) and
				// onClick (which calls it again), so tracking above this line
				// billed one ordinary click as two focus events -- and kept
				// firing for clicks in a window that was already focused.
				track("focus", { type: "ClassicyWindow", ...analyticsArgs });
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
		// Guard where the rect is read, not in the SCSS: while collapsed, the
		// window's DOM height is forced to the ~24px title-bar height by
		// .classicyWindowCollapsed (ClassicyWindow.scss), so ANY mouseup here
		// (this fires on every release, not just an actual resize — see
		// stopChangeWindow) would measure that collapsed height and persist it
		// as the window's real size. Skipping the dispatch entirely while
		// collapsed leaves the last expanded size in the store untouched, so it
		// survives a collapse/expand cycle intact.
		if (resizable && !ws.collapsed) {
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
			aria-label={title || undefined}
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
				windowType === "utility"
					? alwaysOnTop || currentApp?.focused
						? "classicyWindowFloating"
						: "classicyWindowBackgrounded"
					: "",
				!ws.closed ? "" : "classicyWindowInvisible",
				ws.moving ? "classicyWindowDragging" : "",
				ws.resizing ? "classicyWindowResizing" : "",
				modal ? "classicyWindowModal" : "",
				// Non-error modals (File Open/Save and other dialogs) stack in the
				// modal-front band, above utility/tool palettes but below error
				// alerts (classicyWindowRed). Error modals keep the red alert band.
				modal && type !== "error" ? "classicyWindowModalFront" : "",
				modal && type === "error" ? "classicyWindowRed" : "",
				scrollable ? "" : "classicyWindowNoScroll",
			)}
			onMouseMove={changeWindow}
			// Bound ONLY here, at the outermost element, rather than on the frame
			// edges/title bar/resizer too: those are all descendants, so a mouseup
			// on any of them bubbles up and would re-fire the handler a second
			// time (duplicate "halt" analytics, sound, and resize/move dispatches
			// per release). stopChangeWindow itself never reads e.target or
			// calls stopPropagation, so it doesn't matter which descendant was
			// actually released on — binding once here is behavior-preserving.
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
						// stopChangeWindow is bound once, on the root classicyWindow
						// element (below); mouseup here bubbles to it, so a second
						// binding on this descendant would double-invoke the handler.
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
					// stopChangeWindow is bound once, on the root classicyWindow
					// element; mouseup here bubbles to it (see comment there).
					onDoubleClick={
						doubleClickTitleToCollapse ? toggleCollapse : undefined
					}
				>
					{title !== "" && windowType !== "utility" ? (
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
				style={
					backgroundColor
						? ({
								"--classicy-window-contents-bg": backgroundColor,
							} as CSSProperties)
						: undefined
				}
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
			{/* #196: a Platinum placard status region pinned to the window's
					    bottom-left, to the left of the horizontal scroll bar. Hidden
					    while collapsed and kept clear of the bottom-right resizer. */}
			{placard && !ws.collapsed && (
				<div
					className={classNames(
						"classicyWindowPlacardBar",
						isActive() ? "" : "classicyWindowPlacardBarDimmed",
					)}
				>
					{placard}
				</div>
			)}
			{resizable && !ws.collapsed && (
				// biome-ignore lint/a11y/noStaticElementInteractions: resize handle is mouse-only drag target
				<div
					className={classNames(
						"classicyWindowResizer",
						isActive() ? "" : "classicyWindowResizerDimmed",
					)}
					role="presentation"
					onMouseDown={startResizeWindow}
					// stopChangeWindow is bound once, on the root classicyWindow
					// element; mouseup here bubbles to it (see comment there).
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
