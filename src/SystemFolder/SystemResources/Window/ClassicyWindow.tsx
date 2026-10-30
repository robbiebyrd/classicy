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
import { withoutZIndex } from "@/SystemFolder/SystemResources/Utils/withoutZIndex";
import "./ClassicyWindow.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";

import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { withClassicyAppearanceInput } from "@/Appearance/useClassicyAppearanceInput.internal";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import {
	CLASSICY_PART_ATTRIBUTE,
	classicyStateClasses,
} from "@/Appearance/vocabulary/ClassicyVocabulary";
import {
	getAppWindow,
	listAppWindows,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";

// Pixels the pointer must travel with the button held before a title bar
// mousedown becomes a window drag; anything less is treated as a click.
const dragThreshold = 4;

import {
	classicyWindowPagePath,
	classicyWindowPageTitle,
} from "@/SystemFolder/SystemResources/Analytics/ClassicyAnalyticsPath";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import { useClassicyCursor } from "@/SystemFolder/SystemResources/Cursor/useClassicyCursor";
import { ClassicyWindowMenuBar } from "@/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar";
import {
	type ClassicyWindowRect,
	computeClassicyWindowResize,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowResize";

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

/**
 * The size a window applies as its inline `width`/`height`, measured off the
 * DOM. `.classicyWindow` is content-box, so its frame padding and border sit
 * outside that box while a bounding rect includes them. Storing the rect made
 * the window draw that much larger on every remount (#291), so any size the
 * window persists is measured here.
 */
export function classicyWindowContentSize(el: HTMLElement): [number, number] {
	const rect = el.getBoundingClientRect();
	const [chromeWidth, chromeHeight] = classicyWindowChromeSize(el);
	return [
		Math.max(0, rect.width - chromeWidth),
		Math.max(0, rect.height - chromeHeight),
	];
}

/**
 * The window's chrome — frame padding plus border, both sides — that sits
 * outside its content-box size. Room on the desktop is outer space, so a
 * target derived from it must drop this before it is applied as a size.
 */
export function classicyWindowChromeSize(el: HTMLElement): [number, number] {
	const style = getComputedStyle(el);
	const px = (value: string) => Number.parseFloat(value) || 0;
	return [
		px(style.paddingLeft) +
			px(style.paddingRight) +
			px(style.borderLeftWidth) +
			px(style.borderRightWidth),
		px(style.paddingTop) +
			px(style.paddingBottom) +
			px(style.borderTopWidth) +
			px(style.borderBottomWidth),
	];
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
	/**
	 * Title-bar text. Also the window's accessible name and the analytics
	 * pageview title. Utility windows draw no title. Defaults to `""`.
	 */
	title?: string;
	/**
	 * Window id, unique within its app. Keys the window's record in
	 * `apps[appId].windows` (persisted position, size, collapsed/zoomed state)
	 * and, with `appId`, forms the DOM id `${appId}_${id}`.
	 */
	id: string;
	/** Id of the owning `ClassicyApp`. The window must render inside that app. */
	appId: string;
	/**
	 * Icon drawn beside the title of a titled document window. Defaults to the
	 * generic file icon.
	 */
	icon?: string;
	/** Hide the title-bar icon. Defaults to `false`. */
	hideIcon?: boolean;
	/**
	 * Register the window closed. Only the first registration reads it: once
	 * the window has a store record, that record's `closed` flag wins. A closed
	 * window renders nothing. Defaults to `false`.
	 */
	hidden?: boolean;
	/**
	 * Draw the close box at the left of the title bar (HIGOS8 p.101). On a
	 * `modal` window it also decides Escape / Command-period: a closable modal
	 * closes, a non-closable one beeps. Defaults to `true`.
	 */
	closable?: boolean;
	/**
	 * Draw the zoom box (HIGOS8 p.104), left of the collapse box. Never drawn
	 * on `modal` windows. See `zoomMode` and `idealSize`. Defaults to `true`.
	 */
	zoomable?: boolean;
	/**
	 * Draw the collapse (window-shade) box at the far right of the title bar
	 * (HIGOS8 p.103). Option-click collapses or expands every open window;
	 * windows with `collapsable={false}` and modals are skipped when another
	 * window's box is Option-clicked. Double-clicking the title bar collapses
	 * too, when the desktop's `doubleClickTitleToCollapse` preference is on.
	 * Defaults to `true`.
	 */
	collapsable?: boolean;
	/**
	 * Draw the grow box at the bottom-right corner. A non-resizable window
	 * ignores any persisted size and always opens at `initialSize`. Defaults to
	 * `true`.
	 */
	resizable?: boolean;
	/**
	 * Scroll the contents with Platinum scroll bars. The bars appear only
	 * while the content overflows the window (or a `placard` needs the
	 * bottom gutter), and then both are drawn, as in Mac OS 8 — the other
	 * axis shows an empty track so the grow box keeps its corner. Content
	 * that fills the window and scrolls itself (a full-window text area,
	 * `ClassicySplitView` panes) must pass `false`, or that inner scrolling
	 * counts as overflow and draws a second set of bars. Defaults to `true`.
	 */
	scrollable?: boolean;
	/**
	 * Make this a modal dialog (HIGOS8 p.57). The window portals into the
	 * desktop above an input-blocking scrim (clicking outside beeps), traps Tab
	 * focus, cancels on Escape / Command-period, and draws no zoom box. It stays
	 * movable unless `type="error"`. Its store record is dropped on unmount, so
	 * a modal keeps no geometry between openings. Defaults to `false`.
	 */
	modal?: boolean;
	/**
	 * Stretch the inner content area to the full height of the window, for
	 * content that should fill it rather than size to itself. Defaults to off.
	 */
	growable?: boolean;
	/**
	 * Mark this as the app's default window: when the app is focused with no
	 * last-accessed or previously focused window to restore, this one is
	 * focused. Defaults to `false`.
	 */
	defaultWindow?: boolean;
	/**
	 * Opening content-box size `[width, height]`; the frame padding and border
	 * sit outside it. Each dimension is pixels or a `"${number}%"` of the
	 * desktop (height measured below the menu bar); `0` sizes that axis to its
	 * content. A resizable window opens at its persisted size instead once it
	 * has one. Defaults to `[350, 0]`.
	 */
	initialSize?: [ClassicyWindowSizeDimension, ClassicyWindowSizeDimension];
	/**
	 * Opening position `[x, y]`, in pixels or as `"left" | "center" | "right"`
	 * and `"top" | "center" | "bottom"`. A window at a symbolic position
	 * re-centres as its content resizes after mount, until the user moves or
	 * resizes it; a numeric one never moves on its own. Either is clamped to the
	 * viewport, and a persisted position wins once the window has one. Defaults
	 * to `[110, 110]`.
	 */
	initialPosition?: [ClassicyWindowPositionX, ClassicyWindowPositionY];
	/**
	 * Minimum content-box size, in the same units as `initialSize`; `0` sets no
	 * minimum on that axis. Also the lower bound for a zoom. Defaults to
	 * `[300, 0]`.
	 */
	minimumSize?: [ClassicyWindowSizeDimension, ClassicyWindowSizeDimension];
	/**
	 * Content for the window header, a beveled strip between the title bar and
	 * the contents (HIGOS8 p.50), e.g. a toolbar or list column headings. Hidden
	 * while collapsed. See `headerVariant`.
	 */
	header?: ReactNode;
	/**
	 * The menus this window publishes to the menu bar while it is focused, and
	 * whose keyboard equivalents fire app-wide. Memoize it: an inline literal
	 * defeats the store-write guard. Omitting it does not clear the bar — the
	 * window's last stored menu stays.
	 */
	appMenu?: ClassicyMenuItem[];
	/**
	 * Right-click menu for this window. Resolution is innermost-first: a
	 * `ClassicyContextualMenuTarget` inside the window wins, then this prop,
	 * then the app's `contextMenu`. With neither, right-click shows nothing (the
	 * browser's menu stays suppressed). Right-clicking focuses the window first.
	 */
	contextMenu?: ClassicyMenuItem[];
	/**
	 * Override the generated analytics pageview path, otherwise
	 * `/<app>/<window>` from `classicyWindowPagePath(appId, id)`. Pass one
	 * whenever the window id is built from user or consumer data (a file name,
	 * a URL), building it with `classicyWindowPagePath(appId, "<safe-token>")`.
	 */
	analyticsPath?: string;
	/**
	 * Suppress this window's analytics pageviews entirely. Interaction events
	 * (move, zoom, close, …) are still tracked. Defaults to `false`.
	 */
	analyticsExclude?: boolean;
	/**
	 * Fade the contents while the window is inactive (not applied to modals).
	 * `false` uses a contrast-only inactive treatment instead. Defaults to
	 * `true`.
	 */
	dimContents?: boolean;
	/**
	 * Called with the window id after the window closes (after the
	 * `ClassicyWindowClose` dispatch). Not called when `onBeforeClose` vetoes.
	 */
	onCloseFunc?: (id: string) => void;
	/**
	 * Close veto hook (#236). Called before a close actually happens — from the
	 * close box, Escape/Cmd-. on a modal, or any other path that funnels through
	 * this component's internal `close()`. Return (or resolve) `false` to cancel
	 * the close; anything else lets it proceed. Runs BEFORE `onCloseFunc`, the
	 * close sound/analytics, and the `ClassicyWindowClose` dispatch — none of
	 * those fire when the veto cancels. A promise-returning callback is awaited,
	 * so an app can show its own confirmation UI (e.g. a save-changes alert)
	 * before deciding.
	 */
	onBeforeClose?: (id: string) => boolean | Promise<boolean>;
	/** The window's contents. */
	children?: ReactNode;
	/**
	 * Dialog flavour. `"error"` on a `modal` window makes a fixed alert: it
	 * cannot be dragged, beeps when it opens, and stacks in the red error band
	 * above other modals. Has no visual effect on non-modal windows. Defaults
	 * to `"default"`.
	 */
	type?: string;
	/**
	 * Platinum window class (#205). `"document"` (default) uses the standard
	 * 19px HIG title bar; `"utility"` renders a tool-palette style crosshatch
	 * top drag region with no title. A utility window always draws its active
	 * chrome, even while a document window has focus. Defaults to
	 * `"document"`.
	 */
	windowType?: "document" | "utility";
	/**
	 * Utility-only. When true, a `windowType="utility"` palette floats above
	 * every app's windows — even when its own app is backgrounded — instead of
	 * dropping behind the focused app (the default #234 behavior). Still sits
	 * below error modals. No-op on document windows. Defaults to `false`.
	 */
	alwaysOnTop?: boolean;
	/**
	 * Zoom-box behavior (#208, HIGOS8 p.104). `"full"` zooms both axes to the
	 * standard state (see `idealSize`); `"horizontal"` widens to the desktop
	 * keeping the current height; `"vertical"` heightens to the desktop keeping
	 * the current width. Zoom targets are content-box sizes, clamped between
	 * `minimumSize` and the room on the desktop. The user's pre-zoom rect is
	 * remembered and restored on un-zoom. Defaults to `"full"`.
	 */
	zoomMode?: "full" | "horizontal" | "vertical";
	/**
	 * The window's "standard state" size for a full zoom (HIGOS8 Ch.5 "Zoom
	 * Boxes", p.104): the size best suited to the content. A content-box size,
	 * like `initialSize`, in the same pixel or percentage units. When set, a
	 * full zoom targets this size (clamped to the available desktop) rather than
	 * filling the screen — the HIG is explicit that an app "should never simply
	 * assume that the standard state should be as large as the screen." When
	 * omitted, the zoom fits the current content, falling back to the available
	 * desktop.
	 */
	idealSize?: [ClassicyWindowSizeDimension, ClassicyWindowSizeDimension];
	/**
	 * Window header styling (#183, HIGOS8 p.50). `"list"` removes the header's
	 * bottom separator line (list-view column header); `"standard"` keeps the
	 * bevel. Defaults to `"standard"`.
	 */
	headerVariant?: "standard" | "list";
	/**
	 * Draw a 2px active/inactive content-region frame around the window body
	 * (#203, HIGOS8 p.51), used to distinguish a modeless dialog from a plain
	 * window. Defaults to `false`.
	 */
	contentFrame?: boolean;
	/**
	 * Optional Platinum placard (#196, HIGOS8 p.46). When provided, this node
	 * is mounted in a status region at the window's bottom-left edge — to the
	 * LEFT of the horizontal scroll bar, where the HIG places a placard (often a
	 * magnification/status pop-up such as `ClassicyPlacard`). It is hidden while
	 * the window is collapsed.
	 */
	placard?: ReactNode;
	/**
	 * Background color for the window contents area. Accepts any CSS color
	 * value — hex, rgb()/rgba(), or a `var(--…)` reference. When omitted,
	 * theme defaults apply (`--color-window-document` for standard windows,
	 * `--color-window-frame` for modal windows).
	 */
	backgroundColor?: string;
	/**
	 * The element that should take keyboard focus when this window becomes the
	 * focused window (#270) — e.g. a list box, so arrow keys work without a
	 * click first. Focused (without scrolling) on each transition of the
	 * store's `focused` flag to true while the window is open and expanded,
	 * unless focus is already somewhere inside the window (an input the user
	 * just clicked keeps it). Also re-applied when the title bar of the
	 * already-focused window is clicked. For a modal it is the focus trap's
	 * initial target instead. Opt-in: omitted, nothing is focused.
	 */
	initialFocusRef?: RefObject<HTMLElement | null>;
	/** Extra class names, merged onto the root `.classicyWindow` after the component's own. */
	className?: string;
	/**
	 * Inline style for the root `.classicyWindow`. The window's own geometry
	 * (`width`, `height`, `left`, `top`, `minWidth`, `minHeight`) always wins —
	 * the stored position and size can be changed only through the window props
	 * and the store, never by this style — so use it for everything else
	 * (margins, opacity, custom properties).
	 *
	 * Stacking and the drag, resize and inactive paint belong to the window
	 * states (ClassicyWindow.scss), so consumer values for them may be
	 * overridden or ignored: `zIndex` is always dropped (the focus, floating,
	 * modal and alert bands set it), and `border`, `borderColor`, `background`,
	 * `boxShadow`, `cursor`, `filter`, `userSelect` and `overflow` are state
	 * paint not to rely on.
	 */
	style?: CSSProperties;
}

/**
 * A consumer style without the keys the window states own (`zIndex`). The
 * window's geometry is not stripped here: it wins because `windowStyle` is
 * spread after this result.
 */
const withoutStateOwnedStyle = withoutZIndex;

// Mounted document windows by app + window id, so an unmount can tell whether
// the same window has mounted again before its deferred close runs.
const mountedWindowKeys = new Map<string, number>();

/**
 * A Mac OS 8 Platinum window (HIGOS8 Ch.5, p.99): title bar with close box on
 * the left and zoom and collapse boxes on the right (p.101), a draggable frame,
 * Platinum scroll bars and a grow box. It is the component for any app window
 * or non-modal `<dialog>`; with `modal` it becomes an app-specific modal dialog
 * (for plain alerts prefer `ClassicyAlert`, for About boxes
 * `ClassicyAboutWindow`).
 *
 * A window must render inside its `ClassicyApp` and registers itself in the
 * window manager (`apps[appId].windows[id]`) on mount, which persists its
 * position, size and collapsed/zoomed state. That stored size is the
 * content-box size its inline `width`/`height` apply — the frame padding and
 * border sit outside it — and zoom targets are content-box sizes too. Moving,
 * focusing, collapsing, zooming and closing dispatch `ClassicyWindow*` events
 * and emit the matching Window appearance events, whose sounds come from the
 * active Appearance Package's hooks (Platinum's window sounds); opening and
 * focusing emit analytics pageviews (see `analyticsPath`).
 *
 * ```tsx
 * <ClassicyApp id="TV.app" name="TV" icon={icon} defaultWindow="main">
 *   <ClassicyWindow id="main" appId="TV.app" title="TV" appMenu={appMenu}
 *     initialSize={[400, 300]} initialPosition={["center", "center"]}>
 *     …
 *   </ClassicyWindow>
 * </ClassicyApp>
 * ```
 */
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
	onBeforeClose,
	children,
	windowType = "document",
	alwaysOnTop = false,
	zoomMode = "full",
	idealSize,
	headerVariant = "standard",
	contentFrame = false,
	placard,
	backgroundColor,
	initialFocusRef,
	className,
	style,
}) => {
	const fileIcon = useClassicyAsset("icons", "system.files.file") ?? "";
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
	const currentWindow = getAppWindow(currentApp, id);
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
	const contentsRef = useRef<HTMLDivElement | null>(null);
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
	// A resize gesture's anchor: the rect and chrome measured on grow-box press.
	const resizeRectRef = useRef<ClassicyWindowRect>({
		left: 0,
		top: 0,
		right: 0,
		bottom: 0,
	});
	const chromeRef = useRef<[number, number]>([0, 0]);
	const layout = useClassicyAppearanceLayout();
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

	// Scroll bars only while there is something to scroll. The contents box
	// is `overflow: scroll` (both bars, Mac OS 8 style) only while its content
	// overflows on either axis; otherwise it drops to `auto`, which draws
	// nothing. Measured here rather than left to `overflow: auto` alone
	// because `auto` is per-axis: a lone vertical bar would run the full
	// height and its end arrows would sit under the grow box. Re-measured
	// when the box resizes (ResizeObserver: window resize, bars appearing),
	// when its subtree changes (MutationObserver), and when something inside
	// finishes loading (an <img> growing after mount). Layout effect so the
	// first paint already has the right bars. The 1px tolerance absorbs
	// sub-pixel rounding between scrollHeight and clientHeight.
	const [contentOverflows, setContentOverflows] = useState(false);
	// biome-ignore lint/correctness/useExhaustiveDependencies: ws.closed and ws.collapsed aren't read — they re-attach the observers once the contents box exists again
	useLayoutEffect(() => {
		if (!scrollable) return;
		const el = contentsRef.current;
		if (!el) return;
		const measure = () => {
			const next =
				el.scrollHeight > el.clientHeight + 1 ||
				el.scrollWidth > el.clientWidth + 1;
			setContentOverflows((prev) => (prev === next ? prev : next));
		};
		measure();
		// jsdom has neither observer; the mount measurement above still runs.
		const resizeObserver =
			typeof ResizeObserver === "undefined"
				? undefined
				: new ResizeObserver(measure);
		resizeObserver?.observe(el);
		const mutationObserver =
			typeof MutationObserver === "undefined"
				? undefined
				: new MutationObserver(measure);
		mutationObserver?.observe(el, {
			childList: true,
			subtree: true,
			characterData: true,
			attributes: true,
		});
		el.addEventListener("load", measure, true);
		return () => {
			resizeObserver?.disconnect();
			mutationObserver?.disconnect();
			el.removeEventListener("load", measure, true);
		};
	}, [scrollable, ws.closed, ws.collapsed]);
	// A placard lives in the horizontal scroll bar's gutter (HIGOS8 p.46), so
	// a window with one keeps its bars.
	const showScrollBars = scrollable && (contentOverflows || Boolean(placard));

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

	// #270: hand keyboard focus to the window's content when the window
	// becomes the focused one, so its keyboard navigation works without a
	// click first. Never steals focus from something already inside the window
	// — clicking an input in a background window focuses the input on
	// mousedown, before the click focuses the window.
	const focusInitialTarget = useCallback(() => {
		const target = initialFocusRef?.current;
		if (!target) return;
		if (windowRef.current?.contains(document.activeElement)) return;
		target.focus({ preventScroll: true });
	}, [initialFocusRef]);

	// Tracks the previous commit's "owns the keyboard" state so only the
	// false→true TRANSITION of the store's focused flag moves DOM focus — not
	// every render, and not mount: of several windows restored together only
	// the one the store has focused ever transitions. Separate from the
	// analytics wasFocusedRef, whose semantics (open counts, collapse doesn't
	// matter) differ. Modals are left to the focus trap below.
	const wasKeyboardFocusedRef = useRef(false);
	useEffect(() => {
		const ownsKeyboard = !modal && !ws.closed && !ws.collapsed && !!ws.focused;
		const becameFocused = ownsKeyboard && !wasKeyboardFocusedRef.current;
		wasKeyboardFocusedRef.current = ownsKeyboard;
		if (becameFocused) focusInitialTarget();
	}, [modal, ws.closed, ws.collapsed, ws.focused, focusInitialTarget]);

	const windowRegistered = useRef(false);
	const lastMenuBarSignatureRef = useRef<string | undefined>(undefined);
	useEffect(() => {
		if (!windowRegistered.current) {
			windowRegistered.current = true;
			// A genuinely new window is focused by the ClassicyWindowOpen handler;
			// a persisted window re-registering must not steal focus. Menu-closure
			// refresh for the focused window happens in the ws.focused effect below.
			// #278: collapsable/modal come from props, not `ws` — a persisted
			// record restored into `ws` may predate them or be stale.
			desktopEventDispatch({
				type: "ClassicyWindowOpen",
				window: { ...ws, collapsable, modal },
				app: {
					id: appId,
				},
			});
		}
	}, [appId, ws, collapsable, modal, desktopEventDispatch]);

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

	// A document window that unmounts while its record is still open — an app
	// hiding it by no longer rendering it (a settings window's Cancel button)
	// rather than through the close box — is closed in the store, so focus
	// passes to the app's most recently focused window and a later remount
	// counts as a reopen. Deferred a tick and skipped if a window with this id
	// is mounted again by then — StrictMode's phantom teardown remounts
	// synchronously, and a remount (same instance or a new one) must not have
	// its record closed out from under it.
	useEffect(() => {
		if (modal) return;
		const key = `${appId}\u0000${id}`;
		mountedWindowKeys.set(key, (mountedWindowKeys.get(key) ?? 0) + 1);
		return () => {
			const remaining = (mountedWindowKeys.get(key) ?? 1) - 1;
			if (remaining > 0) mountedWindowKeys.set(key, remaining);
			else mountedWindowKeys.delete(key);
			setTimeout(() => {
				if (mountedWindowKeys.has(key)) return;
				if (typeof useAppManager.getState !== "function") return;
				const record = getAppWindow(
					useAppManager.getState().System.Manager.Applications.apps[appId],
					id,
				);
				if (!record || record.closed) return;
				desktopEventDispatch({
					type: "ClassicyWindowClose",
					app: { id: appId },
					window: { id },
				});
			}, 0);
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
			applyResize(e.clientX, e.clientY);
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
		const wasResizing = isResizingRef.current;
		userRepositionedRef.current = true;
		isDraggingRef.current = false;
		isResizingRef.current = false;

		emit("dragEnd", { kind: wasResizing ? "resize" : "move" });
		setActive();
		if (wasResizing || ws.resizing) {
			endResize();
		}
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

	// Both resize move handlers: the size from the corner opposite the grow
	// box (the rect measured on press, not the store position) and, for any
	// grow box but bottom-right, the left/top that keep that corner in place.
	const applyResize = (clientX: number, clientY: number) => {
		const corner = layout.window.growBoxCorner;
		const { size, position } = computeClassicyWindowResize(
			corner,
			resizeRectRef.current,
			[clientX, clientY],
			chromeRef.current,
		);
		pendingSizeRef.current = size;
		const el = windowRef.current;
		if (!el) return;
		el.style.width = `${size[0]}px`;
		el.style.height = `${size[1]}px`;
		if (corner !== "bottom-right") {
			el.style.left = `${position[0]}px`;
			el.style.top = `${position[1]}px`;
		}
	};

	const startResizeWindow = (e: MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		track("resize", { type: "ClassicyWindow", ...analyticsArgs });
		const rect = windowRef?.current?.getBoundingClientRect();
		const left = rect?.left ?? 0;
		const top = rect?.top ?? 0;
		wsPositionRef.current = [left, top];
		resizeRectRef.current = {
			left,
			top,
			right: rect?.right ?? 0,
			bottom: rect?.bottom ?? 0,
		};
		chromeRef.current = windowRef.current
			? classicyWindowChromeSize(windowRef.current)
			: [0, 0];
		isResizingRef.current = true;
		desktopEventDispatch({
			type: "ClassicyWindowPosition",
			app: {
				id: appId,
			},
			window: ws,
			position: [left, top],
		});
		// Seed the gesture with the size the window is drawn at, in the same
		// (content) box its inline width/height use — clientWidth would add the
		// frame padding and make the window jump on mousedown (#291).
		const applied = appliedWindowSize();
		const startSize: [number, number] = [
			applied?.[0] || resolvedSize[0],
			applied?.[1] || resolvedSize[1],
		];
		setResize(true, startSize);
		setZoom(false, true, "resize");
		setSize(startSize);
		emit("dragStart", { kind: "resize" });
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

	// #270: a title-bar click on the ALREADY-focused window is no focus
	// transition, so re-apply the initial focus here (e.g. after a menu click
	// left the document body focused). An unfocused window gets it from the
	// focused-transition effect once the click focuses it.
	const onTitleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
		startMoveWindow(e);
		if (ws.focused && !modal) focusInitialTarget();
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
		emit("dragStart", { kind: "move" });
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
			applyResize(e.clientX, e.clientY);
			emit("change", { kind: "resize" });
		}

		if (ws.dragging) {
			emit("change", { kind: "move" });
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
			emit("dragEnd", {
				kind: isResizingRef.current || ws.resizing ? "resize" : "move",
			});
		}
		const wasResizing = isResizingRef.current;
		// Clear refs so the document-level mouseup handler knows this event
		// was already handled by the element and skips double-processing.
		pendingDragRef.current = false;
		isDraggingRef.current = false;
		isResizingRef.current = false;
		setActive();
		// Most releases are plain clicks: they must not write a size at all, or
		// the store drifts from the size the window is actually drawn at (#291).
		if (wasResizing || ws.resizing) {
			endResize();
		}
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

	const front = modal || isActive();
	const appearance = useClassicyAppearance(
		"Window",
		{
			collapsed: ws.collapsed,
			active: front,
			inactive: !front,
			dragging: ws.moving,
		},
		windowRef,
	);
	const { emit } = appearance;

	const setActive = useCallback(
		(_e?: MouseEvent<HTMLDivElement>) => {
			if (!ws.focused) {
				// Inside the guard so "focus" means the window BECAME focused.
				// The root binds both onMouseUp (which calls setActive) and
				// onClick (which calls it again), so tracking above this line
				// billed one ordinary click as two focus events -- and kept
				// firing for clicks in a window that was already focused.
				track("focus", { type: "ClassicyWindow", ...analyticsArgs });
				emit("focus", withClassicyAppearanceInput());
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
		[ws, appId, appMenu, desktopEventDispatch, track, analyticsArgs, emit],
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
		// Once, from the clicked window, for every window it collapses.
		emit(
			toCollapse ? "collapse" : "expand",
			withClassicyAppearanceInput({ all: true }),
		);
		Object.entries(apps).forEach(([appKey, app]) => {
			listAppWindows(app).forEach((w) => {
				if (w.closed) return;
				if (w.collapsed === toCollapse) return;
				// #278: other windows that opted out of collapsing (no collapse
				// box to undo it) and modal dialogs are left as they are. The
				// clicked window itself is exempt — its own collapse box is what
				// was clicked, so its behaviour is unchanged.
				const isClicked = appKey === appId && w.id === id;
				if (!isClicked && (w.collapsable === false || w.modal)) return;
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
			setZoom(false, true, "collapse");
			emit("collapse", withClassicyAppearanceInput());
			desktopEventDispatch({
				type: "ClassicyWindowCollapse",
				window: ws,
				app: {
					id: appId,
				},
			});
		} else {
			track("expand", { type: "ClassicyWindow", ...analyticsArgs });
			emit("expand", withClassicyAppearanceInput());
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
		// Every size returned here is applied as the window's content-box
		// width/height, so the desktop's outer room loses the window's chrome
		// first, and the current size is the content size, not the rect (#291).
		const el = windowRef.current;
		const [chromeW, chromeH] = el ? classicyWindowChromeSize(el) : [0, 0];
		const stdW = Math.max(resolvedMinimumSize[0], dw - margin * 2 - chromeW);
		const stdH = Math.max(
			resolvedMinimumSize[1],
			dh - menuBarHeight - margin * 2 - chromeH,
		);

		// The axis a one-way zoom keeps is the size the window already applies,
		// so it is carried over exactly rather than re-measured.
		const [curW, curH] = appliedWindowSize() ?? resolvedSize;
		const rect = el?.getBoundingClientRect();
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

		// Full zoom targets the "standard state" — the size best suited to the
		// content — NOT the whole screen (HIGOS8 Ch.5, p.104). Prefer an explicit
		// idealSize (a content-box size, like initialSize); otherwise fit the
		// current content (its inner scroll extent plus what surrounds it); fall
		// back to filling the desktop only when no usable measurement is
		// available. Everything is clamped to [min, desktop].
		const clamp = (v: number, lo: number, hi: number) =>
			Math.min(Math.max(v, lo), Math.max(lo, hi));
		let targetW = stdW;
		let targetH = stdH;
		if (idealSize) {
			const [iw, ih] = resolveSize(idealSize);
			targetW = clamp(iw, resolvedMinimumSize[0], stdW);
			targetH = clamp(ih, resolvedMinimumSize[1], stdH);
		} else {
			const inner = el?.querySelector<HTMLElement>(
				".classicyWindowContentsInner",
			);
			if (el && inner) {
				// Everything in the window's content box around the inner
				// scroller (title bar, headers, scroll bars), measured against the
				// same layout pass as inner.clientWidth/Height.
				// Rounded: the extents are whole pixels, and the measurement
				// carries the layout's sub-pixel error (649.994 for 650).
				const [drawnW, drawnH] = classicyWindowContentSize(el);
				const fitW = Math.round(
					inner.scrollWidth + (drawnW - inner.clientWidth),
				);
				const fitH = Math.round(
					inner.scrollHeight + (drawnH - inner.clientHeight),
				);
				if (Number.isFinite(fitW) && fitW > 0) {
					targetW = clamp(fitW, resolvedMinimumSize[0], stdW);
				}
				if (Number.isFinite(fitH) && fitH > 0) {
					targetH = clamp(fitH, resolvedMinimumSize[1], stdH);
				}
			}
		}
		return {
			position: [margin, menuBarHeight + margin],
			size: [targetW, targetH],
		};
	};

	// Flip the zoom flag (+ zoom event/track) without touching geometry. Used
	// both by the zoom toggle and by resize/collapse, which clear the flag
	// without restoring the remembered user state. `cause` tells a package
	// which: the zoom event fires wherever the zoom sound plays (Platinum's
	// hooks play it), collapse and resize-start included, and only
	// `cause: "zoom"` is the zoom box.
	const setZoomFlag = (
		toZoom: boolean,
		playSound: boolean = true,
		cause: "zoom" | "collapse" | "resize" = "zoom",
	) => {
		if (ws.collapsed) {
			setCollapse(false);
		}
		if (playSound) {
			emit("zoom", withClassicyAppearanceInput({ zoomed: toZoom, cause }));
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
			// Persist the size the window is now drawn at — clicks no longer
			// write one as a side effect (#291).
			setResize(false, standard.size);
			setMoving(false, standard.position);
		} else {
			setZoomFlag(false);
			const previous = userStateRef.current;
			if (previous) {
				setSize(previous.size);
				setResize(false, previous.size);
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

	// The size the window's inline width/height apply. A known size is used
	// as-is; only an "auto" (0) dimension is measured off the DOM, because a
	// measurement picks up the browser's sub-pixel layout rounding (#291).
	const appliedWindowSize = (): [number, number] | undefined => {
		if (size[0] && size[1]) return size;
		if (!windowRef.current) return undefined;
		const measured = classicyWindowContentSize(windowRef.current);
		return [size[0] || measured[0], size[1] || measured[1]];
	};

	// `nextSize` is in the window's content box (what its inline width/height
	// apply); omitted, the window's applied size is used (#291).
	const setResize = (toResize: boolean, nextSize?: [number, number]) => {
		// Guard where the size is read, not in the SCSS: while collapsed, the
		// window's DOM height is forced to the ~24px title-bar height by
		// .classicyWindow.collapsed (ClassicyWindow.scss), so a measurement here
		// would persist that collapsed height as the window's real size.
		// Skipping the dispatch entirely while collapsed leaves the last
		// expanded size in the store untouched, so it survives a
		// collapse/expand cycle intact.
		if (!resizable || ws.collapsed) return;
		const resolved = nextSize ?? appliedWindowSize();
		if (!resolved) return;
		desktopEventDispatch({
			type: "ClassicyWindowResize",
			resizing: toResize,
			window: ws,
			size: resolved,
			app: {
				id: appId,
			},
		});
	};

	// Ends a resize gesture with the size the window is about to be drawn at:
	// the last pointer-derived size (already written to the inline style), or,
	// for a gesture that never moved, its current applied size.
	const endResize = () => {
		setResize(false, pendingSizeRef.current ?? undefined);
	};

	// #236: onBeforeClose is a veto, not a notification — it runs first, and a
	// `false` (sync or resolved) result stops everything below it: no sound, no
	// analytics, no ClassicyWindowClose dispatch, no onCloseFunc. setActive()
	// still runs unconditionally first, matching the pre-existing behavior of
	// focusing a window before closing it (including when the close is later
	// vetoed — the window ends up focused, which is the right state for the
	// user to act on whatever the veto is asking about).
	const finishClose = () => {
		track("close", { type: "ClassicyWindow", show: true, ...analyticsArgs });
		// The close box (a click, Return or Space) or a modal's Escape.
		emit("close", withClassicyAppearanceInput());
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

	const close = () => {
		setActive();
		if (typeof onBeforeClose !== "function") {
			finishClose();
			return;
		}
		const result = onBeforeClose(id);
		if (
			typeof result === "object" &&
			result !== null &&
			typeof (result as Promise<boolean>).then === "function"
		) {
			void (result as Promise<boolean>).then((proceed) => {
				if (proceed) finishClose();
			});
			return;
		}
		if (result) finishClose();
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
	useFocusTrap({
		ref: windowRef,
		enabled: modal,
		autoFocus: modal,
		initialFocusRef,
	});
	useKeyboardEquivalents({
		enabled: modal,
		targetRef: windowRef,
		onCancel: modal ? onModalCancel : undefined,
	});

	const windowStyle = useMemo(
		() => ({
			width: size[0] === 0 ? "auto" : size[0],
			// Collapsed: no inline height, so `.collapsed` (ClassicyWindow.scss)
			// sizes the window to its title bar by the cascade alone.
			height: ws.collapsed ? undefined : size[1] === 0 ? "auto" : size[1],
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
			{...appearance.attrs}
			id={[appId, id].join("_")}
			ref={windowRef}
			role="application"
			aria-label={title || undefined}
			// Package, then consumer, then the window's own geometry; neither
			// may set the stacking.
			style={{
				...withoutStateOwnedStyle(appearance.style),
				...withoutStateOwnedStyle(style),
				...windowStyle,
			}}
			className={classNames(
				"classicyWindow",
				windowType === "utility"
					? "classicyWindowUtility"
					: "classicyWindowDocument",
				appearance.className,
				currentApp?.focused && !isActive() ? "classicyWindowActiveApp" : "",
				windowType === "utility"
					? alwaysOnTop || currentApp?.focused
						? "classicyWindowFloating"
						: "classicyWindowBackgrounded"
					: "",
				!ws.closed ? "" : "classicyWindowInvisible",
				ws.resizing ? "classicyWindowResizing" : "",
				modal ? "classicyWindowModal" : "",
				// Non-error modals (File Open/Save and other dialogs) stack in the
				// modal-front band, above utility/tool palettes but below error
				// alerts (classicyWindowRed). Error modals keep the red alert band.
				modal && type !== "error" ? "classicyWindowModalFront" : "",
				modal && type === "error" ? "classicyWindowRed" : "",
				scrollable ? "" : "classicyWindowNoScroll",
				scrollable && !showScrollBars ? "classicyWindowScrollBarsHidden" : "",
				className,
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
					<div
						className={"classicyWindowControlBox"}
						{...{ [CLASSICY_PART_ATTRIBUTE.control]: "close" }}
					>
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
					onMouseDown={onTitleMouseDown}
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
					<div
						className={"classicyWindowControlBox"}
						{...{ [CLASSICY_PART_ATTRIBUTE.control]: "zoom" }}
					>
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
					<div
						className={"classicyWindowControlBox"}
						{...{ [CLASSICY_PART_ATTRIBUTE.control]: "collapse" }}
					>
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
			{/* menuBar.placement "window": the window draws its own menus
			    under the title bar (the screen bar is headless). */}
			{layout.menuBar.placement === "window" &&
				appMenu &&
				appMenu.length > 0 &&
				windowType !== "utility" &&
				!ws.collapsed && (
					<ClassicyWindowMenuBar
						appId={appId}
						windowId={id}
						menuItems={appMenu}
					/>
				)}
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
				ref={contentsRef}
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
					classicyStateClasses({ collapsed: ws.collapsed }),
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

	// Only a mounted-and-open modal draws its scrim. A closed modal that stays
	// mounted (e.g. an error dialog hidden via ClassicyWindowClose rather than
	// unmounted) must drop the scrim too — otherwise the input-blocking backdrop
	// outlives the window and locks the whole page.
	if (modal && desktopRoot && !ws.closed) {
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
