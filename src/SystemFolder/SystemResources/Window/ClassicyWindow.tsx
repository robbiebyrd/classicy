import { isClassicyWindowRestoreRect } from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates";
import type {
	ClassicyStoreSystemAppWindow,
	ClassicyStoreSystemAppWindowRect,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
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
import { withoutZIndex } from "@/SystemFolder/SystemResources/Utils/withoutZIndex.internal";
import "./ClassicyWindow.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	cloneElement,
	type FC as FunctionalComponent,
	type MouseEvent,
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	type RefObject,
	useCallback,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { useClassicyAppIdentity } from "@/Appearance/ClassicyAppIdentity";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { withClassicyAppearanceInput } from "@/Appearance/useClassicyAppearanceInput.internal";
import {
	classicyLayoutThemeVars,
	useClassicyAppearanceLayout,
} from "@/Appearance/useClassicyAppearanceLayout";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import {
	type ClassicyTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { readClassicyThemeVar } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";
import {
	classicyAppPalettesHidden,
	isClassicyPrimaryWindow,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
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
import {
	classicyHasHelpAnchorWithin,
	startClassicyWhatsThis,
} from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyWhatsThis.internal";
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { onClassicyEscapeCancel } from "@/SystemFolder/SystemResources/Keyboard/useClassicyEscapeCancel.internal";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { useClassicyPatternOriginElements } from "@/SystemFolder/SystemResources/PatternOrigin/ClassicyPatternOrigin.internal";
import { ClassicyScrollArea } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollArea";
import { useClassicyFitsScrollBars } from "@/SystemFolder/SystemResources/ScrollArea/useClassicyFitsScrollBars";
import {
	type ClassicyTaskbarBandArg,
	classicyTaskbarHasBand,
	classicyTaskbarInsetsOf,
	useClassicyTaskbarInsets,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";
import { isClassicyGestureButton } from "@/SystemFolder/SystemResources/Utils/ClassicyMousePolicy";
import { ClassicyWindowActiveContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowActiveContext";
import { ClassicyWindowAlertTypeContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowAlertType.internal";
import {
	classicyModalOpensInBackground,
	classicyUserIsActive,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowAttention.internal";
import {
	type ClassicyWindowArrowKey,
	type ClassicyWindowKeyboardMode,
	type ClassicyWindowKeyboardModeEnd,
	classicyKeyboardSizingEdges,
	classicyWindowKeyboardStep,
	classicyWindowSizingEdgesAt,
	startClassicyWindowKeyboardMode,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowKeyboardMove.internal";
import {
	type ClassicyWindowChromeEdges,
	classicyMaximizedWindowRect,
	classicyWindowChromeEdges,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowMaximize";
import { ClassicyWindowMenuBar } from "@/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar";
import {
	type ClassicyWindowCommand,
	type ClassicyWindowGeometry,
	type ClassicyWindowPlacement,
	type ClassicyWindowRegistration,
	registerClassicyWindow,
	unregisterClassicyWindow,
	updateClassicyWindow,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal";
import {
	type ClassicyWindowRect,
	type ClassicyWindowSizingEdges,
	computeClassicyWindowEdgeResize,
	computeClassicyWindowResize,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowResize";
import { ClassicyWindowSelfPaddingContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowSelfPadding.internal";
import {
	type ClassicyWindowSystemMenuCommand,
	type ClassicyWindowSystemMenuHandlers,
	classicyWindowSystemMenuItemId,
	classicyWindowSystemMenuItemIdPrefix,
	classicyWindowSystemMenuItems,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowSystemMenu";
import { ClassicyWindowTitleBar } from "@/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar";
import { useClassicyWindowViewState } from "@/SystemFolder/SystemResources/Window/ClassicyWindowViewState.internal";

export type ClassicyWindowPositionX = number | "left" | "center" | "right";
export type ClassicyWindowPositionY = number | "top" | "center" | "bottom";
export type ClassicyWindowSizeDimension = number | `${number}%`;

// The lowest left/top a window may take: the screen's left edge and the menu
// bar's underside, `menuBarHeight` (the desktop root's live `--menu-bar-height`:
// the theme's, or 0 under window placement).
// clampWindowPositionToViewport holds every window to it, a resize that moves
// the left or top edge stops there, and resolveSize, resolvePosition and the
// zoom's standard state keep the menu bar's band (its y) out of the room they
// give a window.
//
// The bottom has its counterpart, `bottomBand`: the height a mounted taskbar
// takes along the desktop's bottom (`useClassicyTaskbarBand`, 0 with no
// taskbar). The same functions keep it out of the room, so a window keeps to
// the work area (WIG Ch.6, p.84: "excluding the space used by the taskbar"),
// and every one defaults it to 0, so a desktop with no taskbar computes what
// it always computed. A taskbar docked to another edge (plan 0020-w98 E4)
// takes its band there instead: the same functions take the insets on every
// edge (`ClassicyTaskbarBandArg`, a number being the bottom's), the floor
// moving right of a left taskbar and below a top one, the room and the
// ceiling stopping at a right one's left edge.
const windowViewportFloor = (
	menuBarHeight: number,
	band: ClassicyTaskbarBandArg = 0,
): [number, number] => {
	const { left, top } = classicyTaskbarInsetsOf(band);
	return [left, menuBarHeight + top];
};

// The largest right/bottom a resize that moves the right or bottom edge may
// reach (`computeClassicyWindowResize`'s `ceiling`): no limit across, and the
// taskbar's top down, the bottom clampWindowPositionToViewport keeps a window
// above, so the resize and the release clamp agree.
const windowViewportCeiling = (
	band: ClassicyTaskbarBandArg,
): [number, number] => {
	const { right, bottom } = classicyTaskbarInsetsOf(band);
	return [
		right > 0
			? (typeof window !== "undefined" ? window.innerWidth : 800) - right
			: Number.POSITIVE_INFINITY,
		(typeof window !== "undefined" ? window.innerHeight : 600) - bottom,
	];
};

// The largest right/bottom a frame-edge sizing drag may reach
// (`computeClassicyWindowEdgeResize`'s `ceiling`): the work area's right and
// bottom, the viewport's right edge and the taskbar's top (its bottom edge
// with no taskbar). Windows confines a sizing drag's pointer to the work
// area (Wine's `sys_command_size_move` clips it to the monitor's `rcWork`),
// so an edge never passes it; and the release clamp keeps a window inside
// the same box, so it never moves a window the user has just sized.
const windowWorkAreaCeiling = (
	band: ClassicyTaskbarBandArg,
): [number, number] => {
	const { right, bottom } = classicyTaskbarInsetsOf(band);
	return [
		(typeof window !== "undefined" ? window.innerWidth : 800) - right,
		(typeof window !== "undefined" ? window.innerHeight : 600) - bottom,
	];
};

// The eight corner arms of a sizing border (`layout.window.frameEdges:
// "resize"`), each `[corner, arm]`: `h` lies along the top or bottom edge,
// `v` along a side. Each sizes both edges of its corner, as Windows' corner
// hit zones do (Wine's `NC_HandleNCHitTest`).
const FRAME_CORNER_ARMS: readonly [
	Extract<
		ClassicyWindowSizingEdges,
		"top-left" | "top-right" | "bottom-left" | "bottom-right"
	>,
	"h" | "v",
][] = [
	["top-left", "h"],
	["top-left", "v"],
	["top-right", "h"],
	["top-right", "v"],
	["bottom-left", "h"],
	["bottom-left", "v"],
	["bottom-right", "h"],
	["bottom-right", "v"],
];

// The largest content height CSS draws a window at: `.classicyWindow`'s
// `max-height: calc(100% - var(--window-max-height-reserve))`, a share of
// its containing block's padding box (an absolutely positioned box's
// percentage resolves against it whatever that block's own height), so a
// frame-edge sizing drag stops where the drawn window would stop and its
// fixed edge never moves. No limit outside a laid-out containing block
// (jsdom has no `offsetParent`). Read once per gesture.
const windowContentHeightCap = (el: HTMLElement): number => {
	const block = el.offsetParent;
	if (!(block instanceof HTMLElement)) return Number.POSITIVE_INFINITY;
	return Math.max(
		0,
		block.clientHeight -
			readClassicyThemeVar("--window-max-height-reserve", undefined, el),
	);
};

// A press on a sizing border's edge or corner arm takes the pointer's
// capture, so every move and the release go to it wherever the pointer
// goes (over another window, the desktop or an iframe) and the browser
// keeps showing its resize cursor, as Windows keeps the sizing cursor
// through the drag. Button 1 only; the gesture itself starts on the
// press's mousedown.
const captureSizingPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
	if (e.button !== 0) return;
	e.currentTarget.setPointerCapture?.(e.pointerId);
};

// An edge that neither moves nor sizes its window (a fixed border under
// `layout.window.frameEdges: "resize"`, WIG Ch.6 "Window Frames", p.76):
// its press keeps the focus and the text selection where they are, as an
// edge press always did, and does nothing else.
const holdFrameEdge = (e: MouseEvent<HTMLDivElement>) => {
	e.preventDefault();
};

// The geometry prop defaults, module-level so they keep one identity: an
// array literal in the props destructuring is a new array every render, which
// re-ran the resolveSize/resolvePosition memos on every render — a forced
// layout read of the desktop's size on every drag move. A caller passing its
// own arrays is unaffected.
const DEFAULT_INITIAL_SIZE: [
	ClassicyWindowSizeDimension,
	ClassicyWindowSizeDimension,
] = [350, 0];
const DEFAULT_INITIAL_POSITION: [
	ClassicyWindowPositionX,
	ClassicyWindowPositionY,
] = [110, 110];
const DEFAULT_MINIMUM_SIZE: [
	ClassicyWindowSizeDimension,
	ClassicyWindowSizeDimension,
] = [300, 0];

// The title bar's box names under the Windows shell's flags, Windows' button
// names (WIG Ch.6 "Title Bar Buttons", p.80): under `window.collapse:
// "minimize"` the collapse box is Minimize; under `window.zoom: "maximize"`
// the zoom box is Maximize, and Restore while the window is maximized ("the
// Maximize button is replaced by the Restore button", "Maximizing Windows",
// p.84). Module-level, keyed by flag, so each keeps one identity.
const SHELL_TITLE_BAR_LABELS = {
	minimize: { collapse: "Minimize" },
	maximize: { zoom: "Maximize" },
	restore: { zoom: "Restore" },
	minimizeMaximize: { collapse: "Minimize", zoom: "Maximize" },
	minimizeRestore: { collapse: "Minimize", zoom: "Restore" },
} as const;

// A keyboard Move or Size mode in progress (the registry's `move` and `size`
// commands, plan 0020-w98 §5 "Keyboard Move and Size"). The travel is
// applied to `base`, the rect the mode stands on: the start, then the rect
// each arrow and each edge choice leaves, so an arrow at a limit moves
// nothing and the next one back moves at once, as Windows clamps its
// tracking point to where it has an effect. `reference` is the pointer
// position the mouse's travel counts from, taken at its first move since
// the last re-base (the browser cannot put the pointer on the caption, as
// Windows does).
type ClassicyWindowKeyboardModeState = {
	mode: ClassicyWindowKeyboardMode;
	stop: () => void;
	// Where the window was when the mode started, for ESC: its stored
	// position and size, and (Size) the inline geometry the steps overwrite.
	startPosition: [number, number];
	startRecordSize: [number, number];
	startInline: { width: string; height: string; left: string; top: string };
	base: ClassicyWindowRect;
	travel: [number, number];
	reference: [number, number] | null;
	// Size: the edges being moved, `null` until an arrow or the mouse picks
	// one; the frame's chrome, the content-height cap CSS draws at, and the
	// sizing border's thickness and corner reach the mouse's pick reads.
	edges: ClassicyWindowSizingEdges | null;
	chrome: [number, number];
	maximum: [number, number];
	frame: number;
	reach: number;
	// Where the mode has put the window: its outer left/top and content size.
	position: [number, number];
	size: [number, number];
	changed: boolean;
};

// The rect a window at `position` with `contentSize` and `chrome` occupies
// (frame included), in the store's coordinates.
const windowRectAt = (
	position: [number, number],
	contentSize: [number, number],
	chrome: [number, number],
): ClassicyWindowRect => ({
	left: position[0],
	top: position[1],
	right: position[0] + contentSize[0] + chrome[0],
	bottom: position[1] + contentSize[1] + chrome[1],
});

// A chrome of nothing on every side: the maximized rect's when the window's
// element is not mounted yet.
const NO_CHROME: ClassicyWindowChromeEdges = {
	left: 0,
	top: 0,
	right: 0,
	bottom: 0,
};

// The --menu-bar-height the desktop root carries for `theme` under `layout`
// (the theme's, then the layout's override: 0 under window placement), or
// undefined (the reader's default-theme fallback) with no theme. It seeds the
// window's height before the desktop has applied the variables, i.e. on the
// boot render.
const themeMenuBarHeight = (
	theme: ClassicyTheme | undefined,
	layout: ClassicyAppearanceLayout,
): number | undefined => {
	if (!theme) return undefined;
	const vars: Record<string, string> = {
		...(getThemeVars(theme) as Record<string, string>),
		...classicyLayoutThemeVars(layout),
	};
	const value = Number.parseFloat(vars["--menu-bar-height"]);
	return Number.isFinite(value) ? value : undefined;
};

// `menuBarHeight` defaults to a live read of `--menu-bar-height`; a caller on a
// render path passes the value it already read, so no render forces a style
// read (ClassicyWindow reads it once per theme and menu-bar placement).
// `bottomBand` (default 0) is the taskbar's band along the desktop's bottom: a
// percentage height is a share of the room left between the two bands. Given
// as insets (a taskbar docked to another edge), a side band comes off the
// width a percentage width is a share of, and a top band off the height.
export function resolveSize(
	size: [ClassicyWindowSizeDimension, ClassicyWindowSizeDimension],
	menuBarHeight: number = readClassicyThemeVar("--menu-bar-height"),
	bottomBand: ClassicyTaskbarBandArg = 0,
): [number, number] {
	const band = classicyTaskbarInsetsOf(bottomBand);
	const desktop =
		typeof document !== "undefined"
			? document.getElementById("classicyDesktop")
			: null;
	const dw =
		(desktop?.clientWidth ??
			(typeof window !== "undefined" ? window.innerWidth : 800)) -
		band.left -
		band.right;
	const dh =
		(desktop?.clientHeight ??
			(typeof window !== "undefined" ? window.innerHeight : 600)) -
		menuBarHeight -
		band.top -
		band.bottom;

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

/**
 * Where a window at a symbolic `"center"` lands: the active package's
 * `layout.window.centering` (`"exact"` unless it says `"wholePixel"`).
 */
export type ClassicyWindowCentering = NonNullable<
	ClassicyAppearanceLayout["window"]["centering"]
>;

/**
 * A window's opening position, `pos` resolved against the viewport. A
 * `"center"` axis is centered exactly (on a half pixel when the free space
 * is odd), or, with `centering` `"wholePixel"`, rounded to a whole pixel.
 * `bottomBand` (default 0) is the taskbar's band along the bottom: a
 * `"center"` y centers within the height above it, and `"bottom"` sits on it.
 * Given as insets (a taskbar docked to another edge), every axis keeps to
 * the work area the bands leave: `"left"` and `"top"` start past a left or
 * top band, `"right"` ends at a right one.
 */
export function resolvePosition(
	pos: [ClassicyWindowPositionX, ClassicyWindowPositionY],
	windowSize: [number, number],
	menuBarHeight: number = readClassicyThemeVar("--menu-bar-height"),
	centering: ClassicyWindowCentering = "exact",
	bottomBand: ClassicyTaskbarBandArg = 0,
): [number, number] {
	const band = classicyTaskbarInsetsOf(bottomBand);
	const center = (free: number) =>
		centering === "wholePixel" ? Math.round(free / 2) : free / 2;
	const vw =
		(typeof window !== "undefined" ? window.innerWidth : 800) - band.right;
	const vh =
		(typeof window !== "undefined" ? window.innerHeight : 600) - band.bottom;
	const minX = band.left;
	const minY = menuBarHeight + band.top;

	let x: number;
	if (typeof pos[0] === "number") {
		x = pos[0];
	} else if (pos[0] === "left") {
		x = minX;
	} else if (pos[0] === "right") {
		x = Math.max(minX, vw - windowSize[0]);
	} else {
		x = Math.max(minX, minX + center(vw - minX - windowSize[0]));
	}

	let y: number;
	if (typeof pos[1] === "number") {
		y = pos[1];
	} else if (pos[1] === "top") {
		y = minY;
	} else if (pos[1] === "bottom") {
		y = Math.max(minY, vh - windowSize[1]);
	} else {
		y = Math.max(minY, band.top + center(vh - band.top - windowSize[1]));
	}

	return [x, y];
}

/**
 * #248: clamp a window rect so it stays fully inside the viewport when it
 * fits; for a window larger than the viewport itself, only the top-left
 * corner is guaranteed on-screen — the title bar and its close box may still
 * render off-screen in that case. Pure and exported so it's unit-testable
 * without a real ResizeObserver. `bottomBand` (default 0) is the taskbar's
 * band along the bottom, which the window then stays above: `y` is capped at
 * `innerHeight − bottomBand − height`, never above the menu bar's floor.
 * Given as insets (a taskbar docked to another edge), the window keeps to
 * the work area on every side: right of a left band, below a top one, left
 * of a right one.
 */
export function clampWindowPositionToViewport(
	position: [number, number],
	windowSize: [number, number],
	menuBarHeight: number = readClassicyThemeVar("--menu-bar-height"),
	bottomBand: ClassicyTaskbarBandArg = 0,
): [number, number] {
	const band = classicyTaskbarInsetsOf(bottomBand);
	const [minX, minY] = windowViewportFloor(menuBarHeight, band);
	const vw =
		(typeof window !== "undefined" ? window.innerWidth : 800) - band.right;
	const vh =
		(typeof window !== "undefined" ? window.innerHeight : 600) - band.bottom;

	const maxX = Math.max(minX, vw - windowSize[0]);
	const maxY = Math.max(minY, vh - windowSize[1]);

	const x = Math.min(Math.max(position[0], minX), maxX);
	const y = Math.min(Math.max(position[1], minY), maxY);

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
	 * closes, a non-closable one beeps. Under a package whose layout says
	 * `dialog.caption: "titled"` (Windows 98) a modal draws a Close box
	 * whatever this says: a non-closable one's runs `onCaptionClose`, and is
	 * drawn unavailable without it. Defaults to `true`.
	 */
	closable?: boolean;
	/**
	 * What a non-closable modal's caption Close box does under a package
	 * whose layout says `dialog.caption: "titled"` (Windows 95/98, where
	 * every dialog and message box has a Close box: WIG Ch.8 "Appearance and
	 * Behavior", p.145, Figure 8.1; "Message Box Types", p.166, Figure 8.17).
	 * Pass the path the dialog's own dismissing button runs, its Cancel, or
	 * a message box's only button (Windows' `DefDlgProc` turns a dialog's
	 * Close into its Cancel; a message box's into its Cancel, else, with OK
	 * alone, its OK). The window pop-up menu's Close, ALT+F4 and a
	 * double-click on the title bar's icon run it too. Without it that Close
	 * box is drawn unavailable and none of them closes the dialog, as
	 * Windows grays a Yes/No message box's Close. Read only on a `modal`
	 * window that is not `closable`, under that layout: everywhere else it
	 * changes nothing (Escape / Command-period included, which the dialog's
	 * own keys handle).
	 */
	onCaptionClose?: () => void;
	/**
	 * Draw the zoom box (HIGOS8 p.104), left of the collapse box. Never drawn
	 * on `modal` windows. See `zoomMode` and `idealSize`. Under a package
	 * whose layout says `window.zoom: "maximize"` (Windows 98) the box is
	 * Maximize, and Restore while maximized (WIG Ch.6 "Maximizing Windows",
	 * pp.84–85): the window fills the work area with its frame outside it,
	 * and returns to the rect it had, which its record keeps (`restoreRect`)
	 * across a reload; a utility window draws no box there. Defaults to
	 * `true`.
	 */
	zoomable?: boolean;
	/**
	 * Draw the collapse (window-shade) box at the far right of the title bar
	 * (HIGOS8 p.103). Option-click collapses or expands every open window;
	 * windows with `collapsable={false}` and modals are skipped when another
	 * window's box is Option-clicked. Double-clicking the title bar collapses
	 * too, when the desktop's `doubleClickTitleToCollapse` preference is on
	 * (under a package whose layout says `window.titleDoubleClick: "zoom"`,
	 * Windows 98, it maximizes or restores the window instead, and never
	 * collapses it). Under a package whose layout says `window.collapse: "minimize"` (the
	 * Windows shell) the box is Minimize (WIG Ch.6 "Minimizing Windows",
	 * p.85): the window leaves the screen, keeps its taskbar button and comes
	 * back when it is activated; a `modal` or utility window draws no box
	 * there. Defaults to `true`.
	 */
	collapsable?: boolean;
	/**
	 * Draw the grow box at the bottom-right corner. A non-resizable window
	 * ignores any persisted size and always opens at `initialSize`. Under a
	 * package whose layout says `window.frameEdges: "resize"` (Windows 98)
	 * a resizable window also sizes from any edge of its frame and from its
	 * corners (WIG Ch.6 "Sizing Borders", p.83), and a non-resizable one's
	 * frame neither moves nor sizes it. Defaults to `true`.
	 */
	resizable?: boolean;
	/**
	 * Scroll the contents with Classicy's own scroll bars (a
	 * `ClassicyScrollArea`, drawn by the Appearance Package). The bars appear only
	 * while the content overflows the window (or a `placard` needs the
	 * bottom gutter), and then both are drawn, as in Mac OS 8 — the other
	 * axis shows an empty track so the grow box keeps its corner. Content
	 * that fills the window and scrolls itself (a full-window text area,
	 * `ClassicySplitView` panes) must pass `false`, or that inner scrolling
	 * counts as overflow and draws a second set of bars. Defaults to `true`.
	 */
	scrollable?: boolean;
	/**
	 * Keep both scroll bars drawn while the content fits, each in the `fits`
	 * state (no thumb), as System 7 draws a document window's bars (HIG7
	 * p.160). Defaults to the active package's `layout.scrollBar.fitsBars`
	 * for a document window (resizable, not `windowType="utility"`), else
	 * `false`. Pass `false` for a window whose content is not a document
	 * the bars would scroll (a movie, a picture, a HyperCard card), `true`
	 * to keep them whatever the package says. No effect when `scrollable`
	 * is `false` or on a modal.
	 */
	fitsScrollBars?: boolean;
	/**
	 * Make this a modal dialog (HIGOS8 p.57). The window portals into the
	 * desktop above an input-blocking scrim (clicking outside beeps), traps Tab
	 * focus, cancels on Escape / Command-period, and draws no zoom box. It is a
	 * movable modal dialog box unless `movable={false}` or `type="error"`. Its
	 * store record is dropped on unmount, so a modal keeps no geometry between
	 * openings. Under a package whose layout says `dialog.caption: "titled"`
	 * (Windows 98) its caption is always titled, with its app's display name
	 * when `title` is empty, always has a Close box (`onCaptionClose`), and it
	 * always moves by its caption, `movable={false}` and `type="error"`
	 * included (WIG Ch.8, pp.145, 164, 166). Defaults to `false`.
	 */
	modal?: boolean;
	/**
	 * On a `modal` window, `false` makes a modal dialog box that the user
	 * cannot move (HIGOS8 p.60, "non-movable modal dialog box", as opposed to
	 * the movable modal dialog box of p.59): the move gesture is refused and
	 * the root carries `classicyWindowModalFixed` (Platinum and System 7 drop
	 * its title bar, HIGOS8 figure 3-3, so pass `closable={false}` and
	 * `collapsable={false}`). Unlike `type="error"` it is not an alert: it
	 * does not beep when it opens, draws the ordinary modal scrim and stacks
	 * in the modal-front band with the other dialogs. An error modal is fixed
	 * whatever this says. Has no effect on non-modal windows (a development
	 * build warns, once per window). Defaults to `true`.
	 */
	movable?: boolean;
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
	 * re-centers as its content resizes after mount, until the user moves or
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
	 * Dialog flavor. `"error"` on a `modal` window makes a fixed alert: it
	 * cannot be dragged, beeps when it opens, stacks in the red error band
	 * above other modals and carries `classicyWindowModalFixed` on its root
	 * (a package may drop a fixed modal's title bar). For a fixed modal that
	 * is not an alert, use `movable={false}` instead. Has no visual effect on
	 * non-modal windows. Defaults to `"default"`.
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
	 * remembered and restored on un-zoom. Ignored under a package whose
	 * layout says `window.zoom: "maximize"`: Windows has one maximized state.
	 * Defaults to `"full"`.
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
	 * desktop. Ignored under `window.zoom: "maximize"`, which fills the work
	 * area.
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
	/**
	 * A modeless window that offers context-sensitive Help as a dialog does:
	 * under a package whose layout says `balloonHelp.contextHelp`
	 * "whatsThis" (Windows 98) it draws the "?" caption box while its
	 * content holds a described control, as a modal does (a property sheet,
	 * WIG Ch.8 "Property Sheets", p.145: Explorer's Properties and Taskbar
	 * Properties carry the "?" box). Absent or `false`, only a modal that is
	 * not an alert does; under any other package nothing changes.
	 */
	contextHelp?: boolean;
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
	onCaptionClose,
	zoomable = true,
	collapsable = true,
	resizable = true,
	scrollable = true,
	fitsScrollBars,
	modal = false,
	movable = true,
	type = "default",
	growable,
	defaultWindow = false,
	initialSize = DEFAULT_INITIAL_SIZE,
	initialPosition = DEFAULT_INITIAL_POSITION,
	minimumSize = DEFAULT_MINIMUM_SIZE,
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
	contextHelp = false,
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
	// The alert box this window holds (`ClassicyAlert`), read by the opening
	// error sound below; a ref, so a type change never sounds it again.
	const alertType = useContext(ClassicyWindowAlertTypeContext);
	const alertTypeRef = useRef(alertType);
	alertTypeRef.current = alertType;
	const { showContextMenu, hideContextMenu } = useClassicyContextualMenu();

	const windowRef = useRef<HTMLDivElement | null>(null);
	// The elements a package lays a pattern in from a fixed origin
	// (`layout.patternOrigin.elements`): this window's.
	useClassicyPatternOriginElements(windowRef);
	const layout = useClassicyAppearanceLayout();
	// The window's scroll position, kept on its record and put back when it
	// opens again (`window.restoreViewState`, WIG Ch.2 "Persistence", p.12);
	// both members undefined without the key.
	const viewState = useClassicyWindowViewState(appId, id);
	const centering: ClassicyWindowCentering = layout.window.centering ?? "exact";
	// What the zoom box does under the active package (`layout.window.zoom`,
	// plan 0020-w98 §5 "Maximize and restore"). `"standard"` (the default,
	// every package but the Windows shell): Mac OS 8's standard state, as
	// always. `"maximize"`: the window fills the work area, its frame just
	// outside it (`classicyMaximizedWindowRect`), and returns to the rect it
	// had. Only a primary window maximizes: a dialog has no Maximize button
	// and neither has a palette, whose caption holds Close alone and whose
	// menu is Close, Move and Size (WIG Ch.8 "Appearance and Behavior",
	// p.145, Figure 8.1; "Palette Windows", p.164, Figure 8.16), so their zoom
	// is ignored there (`zoomIgnored`), as their collapse is under minimize.
	const maximizes = layout.window.zoom === "maximize";
	const zoomIgnored =
		maximizes && !isClassicyPrimaryWindow({ modal, windowType });
	const maximizable = maximizes && !zoomIgnored;
	// Whether the window draws a zoom box (a modal's bar never draws one).
	const zoomsByBox = zoomable && !zoomIgnored;
	// A double-click on the caption (`layout.window.titleDoubleClick`).
	// `"collapse"` (the default): the desktop's `doubleClickTitleToCollapse`
	// preference decides, as always. `"zoom"` (Windows 95/98 as shipped:
	// Wine's `NC_HandleNCLButtonDblClk` sends SC_MAXIMIZE or SC_RESTORE when
	// the window has a Maximize box): the zoom box's toggle, whatever the
	// preference says (it stays stored and applies again under another
	// package), and nothing on a window that cannot zoom or on a modal's
	// caption, never a collapse.
	const titleDoubleClickZooms = layout.window.titleDoubleClick === "zoom";
	// What the four frame edges do (`layout.window.frameEdges`, plan 0020-w98
	// §5 "Frame-edge sizing"). `"move"` (the default, every package but the
	// Windows shell): Mac OS 8's frame is a drag region, so a press moves the
	// window, as always. `"resize"` (Windows 95/98, WIG Ch.6 "Sizing
	// Borders", p.83): a resizable window's frame is its sizing border
	// (`sizingBorder`, below); a fixed one's edges do nothing.
	const frameEdgesSize = layout.window.frameEdges === "resize";
	// Whether the window has the window pop-up (system) menu
	// (`layout.window.systemMenu`, plan 0020-w98 §5). Off (the default, every
	// package but the Windows shell): a right-click on the title bar shows
	// the window's or its app's `contextMenu`, as anywhere in the window,
	// and the title bar's icon is inert. On (Windows 95/98, WIG Ch.6 "Title
	// Bars", "Title Bar Icons", "Title Bar Buttons", pp.76–80; Ch.7 "The
	// Window Pop-up Menu", p.102): a right-click anywhere in the title bar,
	// a press on its icon and the registry's `systemMenu` command (ALT+SPACE,
	// a taskbar button's right-click) open it, and a double-click on the
	// icon closes the window.
	const systemMenuEnabled = layout.window.systemMenu === true;

	// `--menu-bar-height`, read once per theme and menu-bar placement instead
	// of on every render: a drag re-renders on each mousemove, and a read
	// there forces a style recalc per move. Read in a layout effect, after the
	// commit that applies new variables to the desktop root (a read during
	// render would still see the old ones), from the window's own element,
	// which inherits them from the desktop it is in. Both reads fall back to
	// the ACTIVE theme's and layout's value, not the default theme's: on the
	// boot render no desktop carries the variables yet, and the window
	// registers (ClassicyWindowOpen) with the geometry of that first render.
	// The key is the theme and the placement: the desktop root spreads
	// getThemeVars(theme), then the layout's override (window placement
	// leaves the screen bar headless, so its band is 0; see
	// classicyLayoutThemeVars). This value is also the viewport floor
	// (`windowViewportFloor`) a flipped-corner resize stops at, so the resize
	// and the release clamp always agree.
	const activeTheme = useAppManager(
		(state) => state.System.Manager.Appearance?.activeTheme,
	);
	const [menuBarHeight, setMenuBarHeight] = useState(() =>
		readClassicyThemeVar(
			"--menu-bar-height",
			themeMenuBarHeight(activeTheme, layout),
		),
	);
	const menuBarPlacement = layout.menuBar.placement;
	// The taskbar's bands on every edge (none with no taskbar, so every
	// package without one computes what it always did; plan 0020-w98 E4 docks
	// it to any edge): the geometry below keeps them out of the room it gives
	// the window, and a re-render on their change re-clamps every record into
	// the work area.
	const taskbarBand = useClassicyTaskbarInsets();
	// biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the placement, not the whole layout: only the placement changes --menu-bar-height
	useLayoutEffect(() => {
		setMenuBarHeight(
			readClassicyThemeVar(
				"--menu-bar-height",
				themeMenuBarHeight(activeTheme, layout),
				windowRef.current,
			),
		);
	}, [activeTheme, menuBarPlacement]);

	// How a modal is captioned (`layout.dialog.caption`, plan 0020-w98 §6).
	// `"plain"` (the default, Mac OS 8, every package but Windows 98): the
	// title it is given, a Close box only when `closable`, and an alert or a
	// `movable={false}` modal fixed in place, as always. `"titled"` (Windows
	// 95/98: WIG Ch.8 "Appearance and Behavior", p.145, Figure 8.1;
	// "Message Boxes", p.164; "Message Box Types", p.166, Figure 8.17): a
	// modal's caption names its context, its app, when given no title; its
	// Close box is always drawn, closing a closable modal, running
	// `onCaptionClose` for any other, and unavailable with neither (Windows
	// grays the Close of a message box with no Cancel: ReactOS's
	// `MessageBoxProc` removes `SC_CLOSE`, and Wine's `draw_close_button`
	// grays the box for a missing or grayed `SC_CLOSE`); and every
	// secondary window moves by its caption, an alert included. Only a modal
	// changes: every other window is captioned as always.
	const titledCaption = modal && layout.dialog?.caption === "titled";
	// What the caption's Close box runs when the modal is not closable.
	const captionClose = titledCaption && !closable ? onCaptionClose : undefined;
	// Whether its Close (the box, the pop-up menu's Close, ALT+F4, the
	// icon's double-click) does anything.
	const closesByCaption = closable || captionClose !== undefined;
	// The title the caption shows: the `title` prop, or, under a titled
	// caption, its app's display name for an untitled modal (an alert): a
	// message box's title "identifies the context in which the message is
	// displayed—usually the name of the object" or application (p.164). The
	// root's accessible name follows it.
	const appIdentity = useClassicyAppIdentity(appId, {
		name: currentApp?.name || appId.replace(/\.app$/, ""),
		icon: "",
	});
	const shownTitle = titledCaption && title === "" ? appIdentity.name : title;

	// A modal of type "error" (an alert) or with `movable={false}` cannot be
	// moved (a fixed modal dialog box); every other modal can (a movable one),
	// and, under a titled caption, every modal (WIG p.145: a secondary window
	// moves by its title bar). Only "error" carries the alert semantics (the
	// beep, the error scrim and the red band), which key on `type` below,
	// never on this value.
	const fixedModal = modal && !titledCaption && (type === "error" || !movable);

	// `movable` applies to modals only (a document window always moves). Say
	// so once per window, in development, rather than drop it silently.
	const movableIgnoredWarned = useRef(false);
	useEffect(() => {
		if (process.env.NODE_ENV === "production") return;
		if (modal || movable || movableIgnoredWarned.current) return;
		movableIgnoredWarned.current = true;
		classicyLog(
			"warn",
			"Window",
			"movable={false} has no effect on a non-modal window; pass modal to make a fixed modal dialog box",
			{ appId, id },
		);
	}, [modal, movable, appId, id]);

	// How many mounted descendants lay themselves out from the window's edge
	// (useClassicyWindowSelfPadding: an alert, the input and keyboard-
	// equivalent dialogs, a dialog-layout form). A modal marks its inner area
	// while any do, so a package's dialog inset can skip them without
	// `:has()`. Claims are counted, not flagged, so one going never clears
	// another's.
	const [selfPaddingClaims, setSelfPaddingClaims] = useState(0);
	const claimSelfPadding = useCallback(() => {
		setSelfPaddingClaims((n) => n + 1);
		return () => setSelfPaddingClaims((n) => n - 1);
	}, []);

	const resolvedSize = useMemo(
		() => resolveSize(initialSize, menuBarHeight, taskbarBand),
		[initialSize, menuBarHeight, taskbarBand],
	);
	const resolvedMinimumSize = useMemo(
		() => resolveSize(minimumSize, menuBarHeight, taskbarBand),
		[minimumSize, menuBarHeight, taskbarBand],
	);

	// Non-resizable windows can't be user-resized, so persisted size from the
	// store is useless and can cause collapse if localStorage is stale.
	const [size, setSize] = useState<[number, number]>(
		resizable ? (currentWindow?.size ?? resolvedSize) : resolvedSize,
	);
	const [clickPosition, setClickPosition] = useState<[number, number]>([0, 0]);

	const { track, page } = useClassicyAnalytics();
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

	const contentsRef = useRef<HTMLDivElement | null>(null);
	// What's This? on dialogs (WIG Ch.8 "Appearance and Behavior", p.145;
	// Ch.12 "Context-Sensitive Help", p.273): under a layout that declares
	// `balloonHelp.contextHelp` "whatsThis", a modal that is not an alert
	// (a message box has no "?" button) draws the "?" caption box while its
	// content holds a described control, checked after every commit (the
	// anchors register in their own effects, which run first). Its press
	// starts the mode over this window. Absent the key nothing is checked.
	// A modeless window with `contextHelp` (a property sheet) offers it too.
	const offersHelpBox =
		layout.balloonHelp?.contextHelp === "whatsThis" &&
		((modal === true && alertType === undefined) || contextHelp);
	const [hasHelpContent, setHasHelpContent] = useState(false);
	useEffect(() => {
		if (!offersHelpBox) return;
		const contents = contentsRef.current;
		const has = contents !== null && classicyHasHelpAnchorWithin(contents);
		setHasHelpContent((prev) => (prev === has ? prev : has));
	});
	const helpBoxShown = offersHelpBox && hasHelpContent;
	const startWhatsThisHere = useCallback(
		() => startClassicyWhatsThis(windowRef.current ?? undefined),
		[],
	);
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
	// A frame-edge sizing gesture's own inputs (`startEdgeResize`), beside
	// the rect and chrome above: the edges it moves, the press's pointer, and
	// the content-size cap CSS draws at; null for a grow-box resize and
	// between gestures.
	const edgeResizeRef = useRef<{
		edges: ClassicyWindowSizingEdges;
		startPointer: [number, number];
		maximum: [number, number];
	} | null>(null);
	// `--window-resize-inset`, read once when a resize gesture starts
	// (startResizeWindow); null until the first gesture.
	const resizeInsetRef = useRef<number | null>(null);
	// #208: the user's window rect captured just before a zoom, restored on un-zoom.
	const userStateRef = useRef<{
		position: [number, number];
		size: [number, number];
	} | null>(null);
	const docMoveHandlerRef = useRef<(e: globalThis.MouseEvent) => void>(
		() => {},
	);
	// `lost`: ended by the pointer stream being lost, not by a release.
	const docUpHandlerRef = useRef<(lost: boolean) => void>(() => {});
	// While a press lasts (a title-bar or frame press that may become a move,
	// or a resize), the pointer stream is watched: lost (the window blurs, a
	// pointercancel, the page is hidden), the gesture ends where it is,
	// through docUpHandlerRef, as a release there would end it. The window
	// keeps the geometry it was dragged to rather than jumping back, and the
	// store's dragging/moving/resizing flags are cleared, so it never follows
	// the pointer back with no button held.
	const stopWatchingPointerStreamRef = useRef<(() => void) | null>(null);
	const stopWatchingPointerStream = () => {
		stopWatchingPointerStreamRef.current?.();
		stopWatchingPointerStreamRef.current = null;
	};
	const watchPointerStream = () => {
		stopWatchingPointerStream();
		stopWatchingPointerStreamRef.current = onClassicyPointerStreamLost(() =>
			docUpHandlerRef.current(true),
		);
		watchEscapeCancel();
	};
	// While a press lasts, Escape takes the move or resize back under a
	// layout that declares `input.escapeCancels` (WIG Ch.4 "Shortcut Keys",
	// p.27: ESC cancels "a direct manipulation operation"; Windows' own
	// move and size loop restores the rect on ESC): the window returns to
	// the position and size the press found (`gestureStartRef`) and the
	// gesture ends. Absent the key, nothing listens.
	const gestureStartRef = useRef<{
		position: [number, number];
		recordSize: [number, number];
		drawnSize: [number, number];
		inline: { width: string; height: string; left: string; top: string };
	} | null>(null);
	const stopEscapeCancelRef = useRef<(() => void) | null>(null);
	const stopEscapeCancel = () => {
		stopEscapeCancelRef.current?.();
		stopEscapeCancelRef.current = null;
	};
	const escapeCancelRef = useRef<() => void>(() => {});
	const watchEscapeCancel = () => {
		stopEscapeCancel();
		const el = windowRef.current;
		gestureStartRef.current = {
			position: [ws.position[0], ws.position[1]],
			recordSize: [ws.size[0], ws.size[1]],
			drawnSize: [size[0], size[1]],
			inline: {
				width: el?.style.width ?? "",
				height: el?.style.height ?? "",
				left: el?.style.left ?? "",
				top: el?.style.top ?? "",
			},
		};
		stopEscapeCancelRef.current = onClassicyEscapeCancel(
			() => escapeCancelRef.current(),
			layout,
		);
	};
	// A keyboard Move or Size mode in progress (`startKeyboardMode`), or null,
	// and what its input does, updated every render (as docMoveHandlerRef
	// is) so the mode's document listeners always see fresh state.
	const keyboardModeRef = useRef<ClassicyWindowKeyboardModeState | null>(null);
	const keyboardModeHandlersRef = useRef<{
		onArrow: (key: ClassicyWindowArrowKey) => void;
		onPointerMove: (pointer: [number, number]) => void;
		onEnd: (end: ClassicyWindowKeyboardModeEnd) => void;
	}>({ onArrow: () => {}, onPointerMove: () => {}, onEnd: () => {} });

	useEffect(() => {
		const moveHandler = (e: globalThis.MouseEvent) =>
			docMoveHandlerRef.current(e);
		const upHandler = () => docUpHandlerRef.current(false);
		document.addEventListener("mousemove", moveHandler);
		document.addEventListener("mouseup", upHandler);
		return () => {
			document.removeEventListener("mousemove", moveHandler);
			document.removeEventListener("mouseup", upHandler);
			stopWatchingPointerStreamRef.current?.();
			stopWatchingPointerStreamRef.current = null;
			stopEscapeCancelRef.current?.();
			stopEscapeCancelRef.current = null;
		};
	}, []);

	const resolvedPosition = useMemo(
		() =>
			// Clamp against `size` (the actual rendered/persisted dimensions),
			// not `resolvedSize` (derived from the initialSize prop alone) — a
			// resizable window's real size can already differ from its initial
			// default by the time this runs.
			clampWindowPositionToViewport(
				resolvePosition(
					initialPosition,
					resolvedSize,
					menuBarHeight,
					centering,
					taskbarBand,
				),
				size,
				menuBarHeight,
				taskbarBand,
			),
		[
			initialPosition,
			resolvedSize,
			size,
			menuBarHeight,
			centering,
			taskbarBand,
		],
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
			// Maximized (`window.zoom: "maximize"`): the frame lies just
			// outside the work area by design, at a negative left and above
			// the top band, so the stored rect stands unclamped.
			if (maximizable && currentWindow.zoomed === true) {
				return currentWindow;
			}
			// A window restored from persisted store state may have been saved
			// with an off-screen position (e.g. from a since-shrunk viewport, or
			// content that grew after that position was saved) — clamp it using
			// the window's own persisted size, not resolvedSize, since a
			// resized-and-persisted window's real size can exceed its default.
			// Above the taskbar's band too, on every render: a window that
			// registered before the taskbar measured its band (the same
			// commit) is drawn above it at once, and its stored position is
			// corrected on its next move.
			return {
				...currentWindow,
				position: clampWindowPositionToViewport(
					currentWindow.position,
					currentWindow.size,
					menuBarHeight,
					taskbarBand,
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
		maximizable,
		menuBarHeight,
		resolvedPosition,
		resolvedSize,
		resolvedMinimumSize,
		taskbarBand,
		windowType,
	]);

	useEffect(() => {
		wsPositionRef.current = ws.position as [number, number];
	}, [ws.position]);

	// What the store's `collapsed` means under the active package
	// (`layout.window.collapse`, plan 0020-w98 §5 "Minimize"). `"shade"` (the
	// default, every package but the Windows shell): WindowShade, so `shaded`
	// is `ws.collapsed` and nothing below changes. `"minimize"`: a primary
	// window leaves the screen (`minimized`) and keeps its whole tree
	// mounted; a modal or a palette has no taskbar button to come back from,
	// so its collapse is ignored (`collapseIgnored`): drawn expanded, its
	// stored flag kept for a package that shades it. Render decisions read
	// `shaded`; the guards that must not measure or move a window that is not
	// drawn at its size read `collapsedOrMinimized`.
	const minimizes = layout.window.collapse === "minimize";
	const collapseIgnored =
		minimizes && !isClassicyPrimaryWindow({ modal, windowType });
	const minimized = ws.collapsed === true && minimizes && !collapseIgnored;
	const shaded = ws.collapsed === true && !minimizes;
	const collapsedOrMinimized = shaded || minimized;
	// Maximized: zoomed under `window.zoom: "maximize"` (a palette's or a
	// dialog's ignored zoom excepted). It neither moves nor sizes, draws no
	// frame edges or grow box, is not re-centered, and its root carries
	// `classicyWindowMaximized`; the rect is re-applied when the work area
	// changes (below).
	const maximized = maximizable && ws.zoomed === true;
	// The sizing border (`layout.window.frameEdges: "resize"`): a resizable
	// window drawn at its size has one, its four edges and eight corner arms
	// sizing it, and its root carries `classicyWindowSizingBorder`. A
	// maximized window has none (Windows sizes no maximized window: Wine's
	// `sys_command_size_move` returns at once), and neither has a shaded or
	// minimized one, which is not drawn at its size.
	const sizingBorder =
		frameEdgesSize && resizable && !maximized && !collapsedOrMinimized;
	// A minimized app's palettes go with it (WIG Ch.8, p.145): under
	// minimize, a palette is hidden while its app has an open primary window
	// and every one is minimized, read from the app record already subscribed.
	const hiddenWithApp =
		minimizes && windowType === "utility" && !modal
			? classicyAppPalettesHidden(currentApp)
			: false;

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
		// Nor while the keyboard moves or sizes it.
		if (keyboardModeRef.current) return;
		// Off the screen (minimized, or a palette hidden with its app), the
		// window measures 0 × 0: re-centering on that would move it. It is
		// measured again when it comes back.
		if (minimized || hiddenWithApp) return;
		// A maximized window keeps the work area's rect, however its
		// content resizes.
		if (maximized) return;
		const el = windowRef.current;
		if (!el) return;
		const rect = el.getBoundingClientRect();
		const measuredSize: [number, number] = [rect.width, rect.height];
		const recentered = clampWindowPositionToViewport(
			resolvePosition(
				initialPosition,
				measuredSize,
				menuBarHeight,
				centering,
				taskbarBand,
			),
			measuredSize,
			menuBarHeight,
			taskbarBand,
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

	// Scroll bars only while there is something to scroll. The contents'
	// ClassicyScrollArea draws both bars (Mac OS 8 style) only while its
	// content overflows on either axis, and none otherwise; it always
	// scrolls. Decided here rather than left to the area's per-axis `auto`
	// because a lone vertical bar would run the full height and its end
	// arrows would sit under the grow box. The area measures its viewport
	// (resize, content and load changes, by a pixel's tolerance) and reports
	// overflow through `onOverflowChange`, so the window keeps no observer of
	// its own.
	const [contentOverflows, setContentOverflows] = useState(false);
	// Whether the contents' scroll area draws a head (a list's column titles
	// above its scrolling region, `classicyScrollAreaHead`), which then takes
	// over the header's bottom edge: the header is marked
	// `classicyWindowHeaderAboveHead` meanwhile.
	const [contentsHasHead, setContentsHasHead] = useState(false);
	const onContentOverflow = useCallback(
		(overflow: { vertical: boolean; horizontal: boolean }) =>
			setContentOverflows(overflow.vertical || overflow.horizontal),
		[],
	);
	// A placard lives in the horizontal scroll bar's gutter (HIGOS8 p.46), so
	// a window with one keeps its bars. A package whose layout keeps the bars
	// in the fits state (System 7: "If the document is no larger than the
	// window, the scroll bars are inactive", HIG p.160) keeps them for a
	// document window, one with a size box; a utility window or one the user
	// cannot resize stays bare until its content overflows. `fitsScrollBars`
	// overrides either way (a movie or a card is not a document).
	const packageKeepsFitsBars = useClassicyFitsScrollBars();
	const keepsFitsBars =
		fitsScrollBars ??
		(packageKeepsFitsBars && resizable && windowType !== "utility");
	const showScrollBars =
		scrollable && (contentOverflows || Boolean(placard) || keepsFitsBars);

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
		const ownsKeyboard =
			!modal && !ws.closed && !collapsedOrMinimized && !!ws.focused;
		const becameFocused = ownsKeyboard && !wasKeyboardFocusedRef.current;
		wasKeyboardFocusedRef.current = ownsKeyboard;
		if (becameFocused) focusInitialTarget();
	}, [modal, ws.closed, collapsedOrMinimized, ws.focused, focusInitialTarget]);

	// Under the Windows shell a modal that an inactive app opens while the
	// user is not working in the page opens in the background, its app's
	// taskbar button flashing (`classicyModalOpensInBackground`, plan 0020-w98
	// E3). Decided once, as the window first renders.
	const opensInBackgroundRef = useRef<boolean | null>(null);
	if (opensInBackgroundRef.current === null) {
		opensInBackgroundRef.current = classicyModalOpensInBackground({
			modal,
			hasTaskbar: layout.taskbar !== undefined,
			appFocused: currentApp?.focused === true,
			userActive: classicyUserIsActive(),
		});
	}
	const opensInBackground = opensInBackgroundRef.current;
	// Such a dialog takes the keyboard only once the user activates it: its
	// initial focus (the default button, else its first control) moves in
	// then, unless the click that activated it already put the focus inside.
	useEffect(() => {
		if (!opensInBackground || !modal || ws.closed || !ws.focused) return;
		const root = windowRef.current;
		if (!root || root.contains(document.activeElement)) return;
		const target =
			initialFocusRef?.current ??
			root.querySelector<HTMLElement>(
				'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])',
			) ??
			root;
		target.focus({ preventScroll: true });
	}, [opensInBackground, modal, ws.closed, ws.focused, initialFocusRef]);

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
			// G18: the window always supplies a position (`initialPosition`,
			// default [110, 110], resolved and clamped), so it never asks the
			// reducer for the cascade (`autoPosition`); [0, 0] opens at [0, 0].
			desktopEventDispatch({
				type: "ClassicyWindowOpen",
				window: {
					...ws,
					collapsable,
					modal,
					...(opensInBackground ? { background: true } : {}),
				},
				app: {
					id: appId,
				},
			});
		}
	}, [appId, ws, collapsable, modal, opensInBackground, desktopEventDispatch]);

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
		// Skip when mouse is still inside the window — the React onMouseMove
		// handler covers that, emits included, so each move reports once.
		if (windowRef.current?.contains(e.target as Node)) return;

		if (isResizingRef.current) {
			applyResize(e.clientX, e.clientY);
			emit("change", { kind: "resize" });
		}

		if (isDraggingRef.current) {
			emit("change", { kind: "move" });
			setMoving(true, [
				e.clientX - clickPositionRef.current[0],
				e.clientY - clickPositionRef.current[1],
			]);
		}
	};

	// Every release (the document hears those on the window too, after
	// stopChangeWindow), or the pointer stream lost.
	docUpHandlerRef.current = (lost) => {
		stopWatchingPointerStream();
		stopEscapeCancel();
		pendingDragRef.current = false;
		if (!isDraggingRef.current && !isResizingRef.current) return;
		const wasResizing = isResizingRef.current;
		userRepositionedRef.current = true;
		isDraggingRef.current = false;
		isResizingRef.current = false;
		edgeResizeRef.current = null;

		emit("dragEnd", { kind: wasResizing ? "resize" : "move", lost });
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

	// Escape during a press (`watchEscapeCancel`): a press not yet a drag
	// ends; a move puts the window back where the press found it; a resize
	// puts back the size, the inline geometry and the position. The release
	// that follows finds no gesture (the refs are cleared) and the window
	// where it started.
	escapeCancelRef.current = () => {
		stopWatchingPointerStream();
		stopEscapeCancelRef.current = null;
		const start = gestureStartRef.current;
		gestureStartRef.current = null;
		pendingDragRef.current = false;
		if (!start || (!isDraggingRef.current && !isResizingRef.current)) return;
		const wasResizing = isResizingRef.current;
		isDraggingRef.current = false;
		isResizingRef.current = false;
		edgeResizeRef.current = null;
		pendingSizeRef.current = null;
		if (wasResizing) {
			const el = windowRef.current;
			if (el) Object.assign(el.style, start.inline);
			setSize(start.drawnSize);
			desktopEventDispatch({
				type: "ClassicyWindowResize",
				resizing: false,
				window: ws,
				size: start.recordSize,
				app: { id: appId },
			});
		}
		setDragging(false);
		setMoving(false, start.position);
		emit("dragEnd", {
			kind: wasResizing ? "resize" : "move",
			lost: false,
			canceled: true,
			input: "keyboard",
		});
	};

	// Both resize move handlers: the size from the corner opposite the grow
	// box (the rect measured on press, not the store position) and, for any
	// grow box but bottom-right, the left/top that keep that corner in place.
	const applyResize = (clientX: number, clientY: number) => {
		const edgeResize = edgeResizeRef.current;
		if (edgeResize) {
			applyEdgeResize(edgeResize, clientX, clientY);
			return;
		}
		const corner = layout.window.growBoxCorner;
		const { size, position } = computeClassicyWindowResize(
			corner,
			resizeRectRef.current,
			[clientX, clientY],
			chromeRef.current,
			resizeInsetRef.current ??
				readClassicyThemeVar(
					"--window-resize-inset",
					undefined,
					windowRef.current,
				),
			// The minimum windowStyle draws, so the moved edge stops there.
			[
				resolvedMinimumSize[0],
				collapsedOrMinimized ? 0 : resolvedMinimumSize[1],
			],
			windowViewportFloor(menuBarHeight, taskbarBand),
			// The taskbar's top, which the release clamp keeps the window
			// above: given only while a band is published (undefined takes the
			// default, no limit), so a desktop with no taskbar resizes with
			// today's numbers.
			classicyTaskbarHasBand(taskbarBand)
				? windowViewportCeiling(taskbarBand)
				: undefined,
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

	// A frame-edge sizing drag's move (`layout.window.frameEdges: "resize"`):
	// the named edges follow the pointer's travel since the press, the others
	// stay (`computeClassicyWindowEdgeResize`), each moving edge stopped at
	// the viewport floor, the work area's right and bottom
	// (`windowWorkAreaCeiling`), the minimum size and the height CSS draws at
	// most, so the release clamp leaves the window where the user left it.
	const applyEdgeResize = (
		edgeResize: NonNullable<typeof edgeResizeRef.current>,
		clientX: number,
		clientY: number,
	) => {
		const { size, position } = computeClassicyWindowEdgeResize(
			edgeResize.edges,
			resizeRectRef.current,
			edgeResize.startPointer,
			[clientX, clientY],
			chromeRef.current,
			resolvedMinimumSize,
			windowViewportFloor(menuBarHeight, taskbarBand),
			windowWorkAreaCeiling(taskbarBand),
			edgeResize.maximum,
		);
		pendingSizeRef.current = size;
		const el = windowRef.current;
		if (!el) return;
		el.style.width = `${size[0]}px`;
		el.style.height = `${size[1]}px`;
		if (edgeResize.edges.includes("left")) el.style.left = `${position[0]}px`;
		if (edgeResize.edges.startsWith("top")) el.style.top = `${position[1]}px`;
	};

	const startResizeWindow = (e: MouseEvent<HTMLDivElement>) => {
		e.preventDefault();
		// Under `layout.mouse` "windows" only button 1 sizes (WIG Ch.4
		// "Mouse Actions", pp.24-25); absent the key, every button, as before.
		if (!isClassicyGestureButton(e, layout)) return;
		edgeResizeRef.current = null;
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
		// Read once per gesture: the mousemove handlers use the ref, so a
		// drag never forces a style read per move.
		resizeInsetRef.current = readClassicyThemeVar(
			"--window-resize-inset",
			undefined,
			windowRef.current,
		);
		isResizingRef.current = true;
		watchPointerStream();
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

	// A press on a sizing border's edge or corner arm (`layout.window.frameEdges:
	// "resize"`, plan 0020-w98 §5 "Frame-edge sizing"; WIG Ch.6 "Sizing
	// Borders", p.83): a resize gesture that moves `edges`, through the grow
	// box's machinery (the refs, the inline width and height, the release
	// through `endResize` and `setMoving`, and the pointer-stream watch). The
	// window is activated at once: "the action of sizing the window
	// implicitly makes it active" (p.83). Button 1 only.
	const startEdgeResize =
		(edges: ClassicyWindowSizingEdges) => (e: MouseEvent<HTMLDivElement>) => {
			e.preventDefault();
			if (e.button !== 0 || !isClassicyGestureButton(e, layout)) return;
			const el = windowRef.current;
			if (!el) return;
			setActive();
			track("resize", { type: "ClassicyWindow", ...analyticsArgs });
			const rect = el.getBoundingClientRect();
			wsPositionRef.current = [rect.left, rect.top];
			resizeRectRef.current = {
				left: rect.left,
				top: rect.top,
				right: rect.right,
				bottom: rect.bottom,
			};
			chromeRef.current = classicyWindowChromeSize(el);
			edgeResizeRef.current = {
				edges,
				startPointer: [e.clientX, e.clientY],
				maximum: [Number.POSITIVE_INFINITY, windowContentHeightCap(el)],
			};
			isResizingRef.current = true;
			watchPointerStream();
			desktopEventDispatch({
				type: "ClassicyWindowPosition",
				app: {
					id: appId,
				},
				window: ws,
				position: [rect.left, rect.top],
			});
			// The size the window is drawn at, in its content box (#291), as
			// the grow box seeds its gesture.
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
		if (fixedModal) {
			// A fixed modal dialog box (an alert, or `movable={false}`) never moves
			return;
		}
		// Nor does a maximized window: dragging its caption does nothing in
		// Windows 95/98, and its frame edges are not drawn.
		if (maximized) return;
		// Under `layout.mouse` "windows" only button 1 moves a window (WIG
		// Ch.4 "Mouse Actions", pp.24-25); absent the key, every button.
		if (!isClassicyGestureButton(e, layout)) return;
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
		watchPointerStream();
	};

	// #270: a title-bar click on the ALREADY-focused window is no focus
	// transition, so re-apply the initial focus here (e.g. after a menu click
	// left the document body focused). An unfocused window gets it from the
	// focused-transition effect once the click focuses it.
	const onTitleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
		// Under the system menu the title bar's icon is no drag handle: its
		// press opens the window pop-up menu (`onSystemMenuIconMouseDown`),
		// and arms no move, as Windows' HTSYSMENU press tracks the menu.
		if (
			systemMenuEnabled &&
			e.target instanceof Element &&
			e.target.closest(".classicyWindowIcon")
		)
			return;
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

		// Only a press in this mount resizes: a persisted `resizing` left over
		// from a reload has no measured rect to anchor on.
		if (ws.resizing && isResizingRef.current) {
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
				lost: false,
			});
		}
		const wasResizing = isResizingRef.current;
		// Clear refs so the document-level mouseup handler knows this event
		// was already handled by the element and skips double-processing.
		stopEscapeCancel();
		pendingDragRef.current = false;
		isDraggingRef.current = false;
		isResizingRef.current = false;
		edgeResizeRef.current = null;
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
			// WindowShade only: a minimized window is not drawn at all
			// (`classicyWindowMinimized`, below), and a modal's or palette's
			// ignored collapse is drawn expanded.
			collapsed: shaded,
			active: front,
			inactive: !front,
			dragging: ws.moving,
			// `expanded` while the window is zoomed (the store's `zoomed`): the
			// geometry stays inline (#208), but a package may key a rule on the
			// state. Windows replaces a maximized window's Maximize button with
			// Restore (WIG Ch.6 "Maximizing Windows" (pp.84–85), "Title Bar
			// Buttons" (p.80)); Platinum and System 7 read it not at all.
			expanded: ws.zoomed === true,
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
			// An alert box's carries its type, for the pack's type sound.
			const openingType = alertTypeRef.current;
			player(
				openingType
					? { type: "ClassicySoundPlayError", alertType: openingType }
					: { type: "ClassicySoundPlayError" },
			);
		}
	}, [modal, player, type]);

	const toggleCollapse = () => {
		// Under minimize a modal's or palette's collapse is ignored: its box
		// and its title's double-click do nothing (its stored flag is kept).
		if (collapsable && !collapseIgnored) {
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
				// was clicked, so its behavior is unchanged.
				const isClicked = appKey === appId && w.id === id;
				if (!isClicked && (w.collapsable === false || w.modal)) return;
				// Under minimize only a primary window minimizes and restores
				// (a palette's stored collapse is ignored there, and kept): the
				// windows with a Minimize box, as the reducer's guard has it.
				if (minimizes && !isClassicyPrimaryWindow(w)) return;
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
		// Under minimize the click must not reach the root's setActive (a
		// window that was not focused) or ClassicyApp's container, whose
		// ClassicyAppActivate would refocus the app's last-accessed window,
		// the one just minimized, and so restore it at once. Under every
		// other package it bubbles, as it always has.
		if (minimizes) e.stopPropagation();
		if (e.altKey) {
			collapseOrExpandAll(!ws.collapsed);
			return;
		}
		toggleCollapse();
	};

	const setCollapse = (toCollapse: boolean) => {
		if (toCollapse) {
			track("collapse", { type: "ClassicyWindow", ...analyticsArgs });
			// WindowShade clears the zoom; a minimize keeps it, so a maximized
			// window comes back maximized (Windows' SC_MINIMIZE keeps the
			// maximized placement, SC_RESTORE from the taskbar returns to it).
			if (!minimizes) setZoom(false, true, "collapse");
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
		if (zoomsByBox) {
			applyZoom(!ws.zoomed);
		}
	};

	// The rect a maximized window takes (`window.zoom: "maximize"`): the
	// desktop less the menu bar's band (0 under window placement) and the
	// taskbar's, its frame outside (`classicyMaximizedWindowRect`).
	const computeMaximizedRect = (): ClassicyStoreSystemAppWindowRect => {
		const desktop =
			typeof document !== "undefined"
				? document.getElementById("classicyDesktop")
				: null;
		const el = windowRef.current;
		return classicyMaximizedWindowRect({
			width:
				desktop?.clientWidth ??
				(typeof window !== "undefined" ? window.innerWidth : 800),
			height:
				desktop?.clientHeight ??
				(typeof window !== "undefined" ? window.innerHeight : 600),
			top: menuBarHeight,
			bottomBand: taskbarBand,
			chrome: el ? classicyWindowChromeEdges(el) : NO_CHROME,
		});
	};

	// The rect the window opened at: its initial size at its initial
	// position, resolved and clamped against that size (not the current one,
	// which while maximized is the work area's). A maximized window with no
	// remembered rect is restored to it (`applyZoom`).
	const computeInitialRect = (): ClassicyStoreSystemAppWindowRect => ({
		position: clampWindowPositionToViewport(
			resolvePosition(
				initialPosition,
				resolvedSize,
				menuBarHeight,
				centering,
				taskbarBand,
			),
			resolvedSize,
			menuBarHeight,
			taskbarBand,
		),
		size: [resolvedSize[0], resolvedSize[1]],
	});

	// #208: compute the "standard state" rect the window zooms to. `full` fills
	// the available desktop; `horizontal`/`vertical` grow a single axis and keep
	// the other at its current value.
	const computeStandardRect = (): {
		position: [number, number];
		size: [number, number];
	} => {
		const margin = readClassicyThemeVar(
			"--window-zoom-margin",
			undefined,
			windowRef.current,
		);
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
		// The room is the work area: below the menu bar, above the taskbar.
		const el = windowRef.current;
		const [chromeW, chromeH] = el ? classicyWindowChromeSize(el) : [0, 0];
		// A docked taskbar's band comes off the edge it lies on.
		const bandLeft = taskbarBand.left;
		const bandTop = menuBarHeight + taskbarBand.top;
		const stdW = Math.max(
			resolvedMinimumSize[0],
			dw - taskbarBand.left - taskbarBand.right - margin * 2 - chromeW,
		);
		const stdH = Math.max(
			resolvedMinimumSize[1],
			dh -
				menuBarHeight -
				taskbarBand.top -
				taskbarBand.bottom -
				margin * 2 -
				chromeH,
		);

		// The axis a one-way zoom keeps is the size the window already applies,
		// so it is carried over exactly rather than re-measured.
		const [curW, curH] = appliedWindowSize() ?? resolvedSize;
		const rect = el?.getBoundingClientRect();
		const curLeft = Math.round(rect?.left ?? ws.position[0]);
		const curTop = Math.round(rect?.top ?? ws.position[1]);

		if (zoomMode === "horizontal") {
			return { position: [bandLeft + margin, curTop], size: [stdW, curH] };
		}
		if (zoomMode === "vertical") {
			return {
				position: [curLeft, bandTop + margin],
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
			const [iw, ih] = resolveSize(idealSize, menuBarHeight, taskbarBand);
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
			position: [bandLeft + margin, bandTop + margin],
			size: [targetW, targetH],
		};
	};

	// Flip the zoom flag (+ zoom event/track) without touching geometry. Used
	// both by the zoom toggle and by resize/collapse, which clear the flag
	// without restoring the remembered user state. `cause` tells a package
	// which: the zoom event fires wherever the zoom sound plays (Platinum's
	// hooks play it), collapse and resize-start included, and only
	// `cause: "zoom"` is the zoom box.
	// `restore` (a maximize only, `window.zoom: "maximize"`) is the rect to
	// return to, stored as the record's `restoreRect`; every other zoom sends
	// none, so its dispatch is the one it always was.
	const setZoomFlag = (
		toZoom: boolean,
		playSound: boolean = true,
		cause: "zoom" | "collapse" | "resize" = "zoom",
		restore?: ClassicyStoreSystemAppWindowRect,
	) => {
		// A shaded or minimized window expands first; a modal's or palette's
		// ignored collapse (under minimize) is kept.
		if (collapsedOrMinimized) {
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
			...(restore ? { restore } : {}),
		});
	};

	// #208: standard-state vs user-state. Remember the user's rect before zoom
	// and restore it on un-zoom.
	const applyZoom = (toZoom: boolean) => {
		if (toZoom) {
			const before: ClassicyStoreSystemAppWindowRect = {
				position: [ws.position[0], ws.position[1]],
				size: [size[0], size[1]],
			};
			userStateRef.current = before;
			if (maximizable) {
				// Maximize (`window.zoom: "maximize"`, WIG Ch.6 "Maximizing
				// Windows", p.84): the work area's rect, whatever `zoomMode` and
				// `idealSize` say (Windows has one maximized state). The rect it
				// had goes with the zoom, as the record's `restoreRect`, so
				// Restore survives a reload; one that is not two pairs of finite
				// numbers is not sent.
				const maximizedRect = computeMaximizedRect();
				setZoomFlag(
					true,
					true,
					"zoom",
					isClassicyWindowRestoreRect(before) ? before : undefined,
				);
				setSize(maximizedRect.size);
				setResize(false, maximizedRect.size);
				setMoving(false, maximizedRect.position);
				return;
			}
			const standard = computeStandardRect();
			setZoomFlag(true);
			setSize(standard.size);
			// Persist the size the window is now drawn at — clicks no longer
			// write one as a side effect (#291).
			setResize(false, standard.size);
			setMoving(false, standard.position);
		} else {
			setZoomFlag(false);
			// The rect from before the zoom: this mount's, else the record's
			// `restoreRect` (a window maximized under `window.zoom:
			// "maximize"`, before a reload or a package switch; read under
			// every package, and only when it holds finite numbers), else,
			// under maximize only, the rect the window opened at (a window
			// zoomed under another package, or maximized with none stored).
			// Under every other layout a zoom with no rect remembered keeps its
			// geometry, as it always has.
			const storedRect = currentWindow?.restoreRect;
			const previous =
				userStateRef.current ??
				(isClassicyWindowRestoreRect(storedRect) ? storedRect : null) ??
				(maximizable ? computeInitialRect() : null);
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
		// Under the system menu a right-click anywhere in the title bar, its
		// icon and boxes included, shows the window pop-up menu at the
		// pointer (WIG Ch.6, pp.76 and 80; Ch.7, p.102; Wine's
		// `NC_HandleNCRButtonDown` for HTCAPTION and HTSYSMENU). Elsewhere in
		// the window the contextual menu resolves as always.
		if (systemMenuEnabled && isOwnTitleBarTarget(e.target)) {
			openSystemMenu({
				at: [e.clientX, e.clientY],
				placement: "click",
				focusFirstItem: false,
			});
			return;
		}
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
		// window's DOM height is forced to the collapsed title-bar height — 15 px,
		// or 6 px for a utility window — by `.classicyWindow.collapsed`
		// (ClassicyWindow.scss; G 2.2 names that height
		// `--window-collapsed-height`), so a measurement here
		// would persist that collapsed height as the window's real size.
		// Skipping the dispatch entirely while collapsed leaves the last
		// expanded size in the store untouched, so it survives a
		// collapse/expand cycle intact.
		// A minimized window is not drawn at all (display: none), so it has
		// no size to measure either.
		if (!resizable || collapsedOrMinimized) return;
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

	// A keyboard Move or Size mode the window can no longer carry out (it
	// closed, minimized, was hidden with its app or maximized, or, sizing,
	// was shaded, by a path other than the input the mode holds: a host's
	// dispatch) ends where it is. Before the maximized rect is re-applied
	// (the effect below), so that rect wins. The mode and its end are read
	// through refs; the dependencies are the triggers.
	useEffect(() => {
		const mode = keyboardModeRef.current;
		if (!mode) return;
		if (
			ws.closed ||
			minimized ||
			hiddenWithApp ||
			maximized ||
			(mode.mode === "size" && shaded)
		)
			keyboardModeHandlersRef.current.onEnd({ commit: true, lost: false });
	}, [ws.closed, minimized, hiddenWithApp, maximized, shaded]);

	// A maximized window keeps the work area's rect (plan 0020-w98 §5): on
	// mount (after a reload or a package switch: the record says zoomed, the
	// geometry may be another package's standard state or another viewport's),
	// when it is maximized, restored from the taskbar or reopened, when the
	// menu bar's or the taskbar's band changes, and when the desktop resizes,
	// as Windows moves a maximized window with the work area. Updated every
	// render, as docMoveHandlerRef is, so the observer's stable callback sees
	// fresh state; it writes only what differs, so a re-run is quiet.
	const reapplyMaximizedRectRef = useRef<() => void>(() => {});
	reapplyMaximizedRectRef.current = () => {
		if (!maximized || collapsedOrMinimized || ws.closed) return;
		if (isDraggingRef.current || isResizingRef.current) return;
		const rect = computeMaximizedRect();
		const drawnDiffers = size[0] !== rect.size[0] || size[1] !== rect.size[1];
		// The record's size too: a window maximized while minimized (from its
		// pop-up menu) could not store the size it is drawn at (setResize
		// stores nothing for a window that is not drawn), so it is stored
		// here, once the window is drawn again.
		const storedDiffers =
			ws.size?.[0] !== rect.size[0] || ws.size?.[1] !== rect.size[1];
		if (drawnDiffers) setSize(rect.size);
		if (drawnDiffers || storedDiffers) setResize(false, rect.size);
		if (
			ws.position[0] !== rect.position[0] ||
			ws.position[1] !== rect.position[1]
		) {
			setMoving(false, rect.position);
		}
	};
	// biome-ignore lint/correctness/useExhaustiveDependencies: the dependencies are the triggers (the ref reads fresh state): becoming maximized or drawn again, and a band changing
	useEffect(() => {
		reapplyMaximizedRectRef.current();
	}, [maximized, collapsedOrMinimized, ws.closed, menuBarHeight, taskbarBand]);
	// The desktop's size, while maximized: a ResizeObserver on
	// `#classicyDesktop`, or, with no desktop or no observer (outside a
	// desktop, jsdom), the viewport's resize.
	useEffect(() => {
		if (!maximized) return;
		const reapply = () => reapplyMaximizedRectRef.current();
		const desktop =
			typeof document !== "undefined"
				? document.getElementById("classicyDesktop")
				: null;
		if (desktop && typeof ResizeObserver !== "undefined") {
			const observer = new ResizeObserver(reapply);
			observer.observe(desktop);
			return () => observer.disconnect();
		}
		if (typeof window === "undefined") return;
		window.addEventListener("resize", reapply);
		return () => window.removeEventListener("resize", reapply);
	}, [maximized]);

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
		// A dialog opened in the background takes no focus as it opens (the
		// effect above gives it the focus once the user activates it).
		autoFocus: modal && !opensInBackground,
		initialFocusRef,
	});
	useKeyboardEquivalents({
		enabled: modal,
		targetRef: windowRef,
		onCancel: modal ? onModalCancel : undefined,
	});

	// The keyboard Move and Size modes (the registry's `move` and `size`
	// commands, which the Windows shell's window pop-up menu runs; plan
	// 0020-w98 §5 "Keyboard Move and Size", WIG Ch.6 "Moving Windows" and
	// "Sizing Borders", p.83; Windows' SC_MOVE/SC_SIZE loop, Wine's
	// `WINPOS_SysCommandSizeMove`). While one lasts its document listeners
	// (`startClassicyWindowKeyboardMode`) hold the keys and the mouse
	// buttons: each arrow moves the window, or the edges being sized,
	// `CLASSICY_WINDOW_KEYBOARD_STEP` (8 px), the mouse moves them by its
	// travel with no button held, ENTER, a button-1 release or a lost pointer
	// stream ends the mode where it is (through the release clamp), and ESC
	// puts the window back. Move shows the package's drag band through the
	// store's `moving` (the root's `dragging`), Size through `resizing`
	// (`classicyWindowResizing`), as a pointer drag does.

	// Moves the window to `position` (Move): the store's position, as a
	// title-bar drag writes it, drawn clamped to the viewport by `ws`.
	const moveByKeyboard = (
		mode: ClassicyWindowKeyboardModeState,
		position: [number, number],
	) => {
		if (position[0] === mode.position[0] && position[1] === mode.position[1])
			return;
		mode.position = position;
		mode.changed = true;
		emit("change", { kind: "move", input: "keyboard" });
		setMoving(true, position);
	};

	// Sizes the window by the mode's travel from its base (Size): the chosen
	// edges move, the others stay (`computeClassicyWindowEdgeResize`), each
	// stopping at the menu bar's underside or the screen's left, at the work
	// area's right and bottom, at `minimumSize` and at the height CSS draws
	// at most, as a frame-edge drag stops. Written to the inline style, as
	// that drag writes it, and stored when the mode ends.
	const sizeByKeyboard = (mode: ClassicyWindowKeyboardModeState) => {
		if (!mode.edges) return;
		const { size: next, position } = computeClassicyWindowEdgeResize(
			mode.edges,
			mode.base,
			[0, 0],
			mode.travel,
			mode.chrome,
			resolvedMinimumSize,
			windowViewportFloor(menuBarHeight, taskbarBand),
			windowWorkAreaCeiling(taskbarBand),
			mode.maximum,
		);
		if (
			next[0] === mode.size[0] &&
			next[1] === mode.size[1] &&
			position[0] === mode.position[0] &&
			position[1] === mode.position[1]
		)
			return;
		mode.size = next;
		mode.position = position;
		mode.changed = true;
		const el = windowRef.current;
		if (el) {
			el.style.width = `${next[0]}px`;
			el.style.height = `${next[1]}px`;
			el.style.left = `${position[0]}px`;
			el.style.top = `${position[1]}px`;
		}
		emit("change", { kind: "resize", input: "keyboard" });
	};

	// The travel starts again from where the window now is.
	const rebaseKeyboardMode = (mode: ClassicyWindowKeyboardModeState) => {
		mode.base = windowRectAt(mode.position, mode.size, mode.chrome);
		mode.travel = [0, 0];
		mode.reference = null;
	};

	// Ends the mode in progress: committed, the window stays where the mode
	// left it (Move through the release clamp; Size storing the size it
	// drew, and leaving a zoom's standard state as a grow-box resize does);
	// canceled (ESC), it goes back to where the mode started. Either way the
	// store's `moving` or `resizing` is cleared.
	const finishKeyboardMode = ({
		commit,
		lost,
	}: ClassicyWindowKeyboardModeEnd) => {
		const mode = keyboardModeRef.current;
		if (!mode) return;
		keyboardModeRef.current = null;
		mode.stop();
		const moved = commit && mode.changed;
		if (moved) userRepositionedRef.current = true;
		if (mode.mode === "move") {
			setMoving(
				false,
				commit
					? clampWindowPositionToViewport(
							mode.position,
							ws.size,
							menuBarHeight,
							taskbarBand,
						)
					: mode.startPosition,
			);
			emit("dragEnd", {
				kind: "move",
				lost,
				canceled: !commit,
				input: "keyboard",
			});
			return;
		}
		const el = windowRef.current;
		if (!moved && el) Object.assign(el.style, mode.startInline);
		if (moved) setSize(mode.size);
		desktopEventDispatch({
			type: "ClassicyWindowResize",
			resizing: false,
			window: ws,
			size: moved ? mode.size : mode.startRecordSize,
			app: { id: appId },
		});
		if (moved) {
			setMoving(
				false,
				clampWindowPositionToViewport(
					mode.position,
					mode.size,
					menuBarHeight,
					taskbarBand,
				),
			);
			if (ws.zoomed) setZoom(false, true, "resize");
		}
		emit("dragEnd", {
			kind: "resize",
			lost,
			canceled: !commit,
			input: "keyboard",
		});
	};

	keyboardModeHandlersRef.current = {
		onArrow: (key) => {
			const mode = keyboardModeRef.current;
			if (!mode) return;
			const step = classicyWindowKeyboardStep(key);
			if (mode.mode === "move") {
				moveByKeyboard(
					mode,
					clampWindowPositionToViewport(
						[mode.position[0] + step[0], mode.position[1] + step[1]],
						ws.size,
						menuBarHeight,
						taskbarBand,
					),
				);
				rebaseKeyboardMode(mode);
				return;
			}
			// The first arrow picks its edge, one across it adds the corner;
			// neither moves anything (`classicyKeyboardSizingEdges`).
			const edges = classicyKeyboardSizingEdges(mode.edges, key);
			if (edges !== mode.edges) {
				mode.edges = edges;
				rebaseKeyboardMode(mode);
				return;
			}
			mode.travel = [mode.travel[0] + step[0], mode.travel[1] + step[1]];
			sizeByKeyboard(mode);
			rebaseKeyboardMode(mode);
		},
		onPointerMove: (pointer) => {
			const mode = keyboardModeRef.current;
			if (!mode) return;
			if (mode.mode === "size" && !mode.edges) {
				// No edge yet: the mouse picks the one it crosses
				// (`classicyWindowSizingEdgesAt`), and travels from there.
				const el = windowRef.current;
				if (!el) return;
				const rect = el.getBoundingClientRect();
				const edges = classicyWindowSizingEdgesAt(
					{
						left: rect.left,
						top: rect.top,
						right: rect.right,
						bottom: rect.bottom,
					},
					pointer,
					mode.frame,
					mode.reach,
				);
				if (!edges) return;
				mode.edges = edges;
				mode.reference = pointer;
				return;
			}
			if (!mode.reference) {
				mode.reference = pointer;
				return;
			}
			mode.travel = [
				pointer[0] - mode.reference[0],
				pointer[1] - mode.reference[1],
			];
			if (mode.mode === "move")
				moveByKeyboard(mode, [
					mode.base.left + mode.travel[0],
					mode.base.top + mode.travel[1],
				]);
			else sizeByKeyboard(mode);
		},
		onEnd: finishKeyboardMode,
	};

	// Starts a keyboard mode on the window, activating it ("the implicit
	// action of moving the window activates it", WIG p.83). `false`, starting
	// nothing, with no element or when another mode is in effect on the page.
	const startKeyboardMode = (mode: ClassicyWindowKeyboardMode): boolean => {
		const el = windowRef.current;
		if (!el) return false;
		const applied = appliedWindowSize();
		const startSize: [number, number] = [
			applied?.[0] || resolvedSize[0],
			applied?.[1] || resolvedSize[1],
		];
		const chrome = classicyWindowChromeSize(el);
		const startPosition: [number, number] = [ws.position[0], ws.position[1]];
		const state: ClassicyWindowKeyboardModeState = {
			mode,
			stop: () => {},
			startPosition,
			startRecordSize: [ws.size[0], ws.size[1]],
			startInline: {
				width: el.style.width,
				height: el.style.height,
				left: el.style.left,
				top: el.style.top,
			},
			base: windowRectAt(startPosition, startSize, chrome),
			travel: [0, 0],
			reference: null,
			edges: null,
			chrome,
			maximum: [Number.POSITIVE_INFINITY, windowContentHeightCap(el)],
			frame:
				mode === "size"
					? readClassicyThemeVar("--window-frame-inset", undefined, el)
					: 0,
			reach:
				mode === "size"
					? readClassicyThemeVar("--window-title-bar-height", undefined, el)
					: 0,
			position: startPosition,
			size: startSize,
			changed: false,
		};
		const stop = startClassicyWindowKeyboardMode({
			onArrow: (key) => keyboardModeHandlersRef.current.onArrow(key),
			onPointerMove: (pointer) =>
				keyboardModeHandlersRef.current.onPointerMove(pointer),
			onEnd: (end) => keyboardModeHandlersRef.current.onEnd(end),
		});
		if (!stop) return false;
		state.stop = stop;
		keyboardModeRef.current = state;
		setActive();
		if (mode === "move") {
			track("move", { type: "ClassicyWindow", ...analyticsArgs });
			emit("dragStart", { kind: "move", input: "keyboard" });
			setMoving(true, startPosition);
		} else {
			track("resize", { type: "ClassicyWindow", ...analyticsArgs });
			emit("dragStart", { kind: "resize", input: "keyboard" });
			desktopEventDispatch({
				type: "ClassicyWindowResize",
				resizing: true,
				window: ws,
				size: state.startRecordSize,
				app: { id: appId },
			});
		}
		return true;
	};

	// A mode still in progress when the window unmounts ends where it is, so
	// its listeners go and the store's gesture flag is cleared.
	useEffect(
		() => () => {
			keyboardModeHandlersRef.current.onEnd({ commit: true, lost: false });
		},
		[],
	);

	// Whether it moves by its title bar: not a fixed modal (an alert, or
	// `movable={false}`).
	const movesByTitleBar = !fixedModal;
	// Whether it draws a collapse box: none on a modal or palette under
	// minimize, which has no taskbar button to come back from.
	const collapsesByBox = collapsable && !collapseIgnored;
	// Under `window.zoom: "maximize"` (the Windows shell) a primary window's
	// Minimize and Maximize come as a pair: one with either box draws both,
	// the one it lacks unavailable, as Windows 95/98 draws them (Wine's
	// `NC_DrawCaption`: "In win95 the two buttons are always there / But if
	// the menu item is not in the menu they're disabled"; the Calculator's
	// grayed Maximize). WIG Ch.6 "Title Bar Buttons" (p.80) would leave an
	// unsupported button out; the OS as shipped wins. Under every other
	// layout a box is drawn only when the window has it, as always.
	const pairsCaptionBoxes =
		maximizes &&
		isClassicyPrimaryWindow({ modal, windowType }) &&
		zoomsByBox !== collapsesByBox;
	const zoomBoxDisabled = pairsCaptionBoxes && !zoomsByBox;
	const collapseBoxDisabled = pairsCaptionBoxes && !collapsesByBox;

	// The window pop-up (system) menu (`layout.window.systemMenu: true`, plan
	// 0020-w98 §5; WIG Ch.7 "The Window Pop-up Menu", p.102): its items
	// (`classicyWindowSystemMenuItems`, each enabled as Windows enables it and
	// running the registry command of its name, so the box's sounds,
	// analytics, veto and geometry stay where they live) in the desktop's one
	// contextual menu, with no Help item (a Windows pop-up menu has none),
	// taking the keyboard while it is open (the arrows walk it, ESC closes
	// it), as Windows' menu loop does. Opened at the pointer (`"click"`: a
	// right-click on the title bar, a taskbar button's right-click), or
	// dropped from the caption (`"corner"`: a press on the icon, ALT+SPACE,
	// the latter with its first item selected). The window is activated
	// first unless it is off the screen (minimized, or a palette hidden with
	// its app), whose menu opens without restoring it, and only at a given
	// point: it draws nothing to drop the menu from. `false`, opening
	// nothing, under a layout without the system menu, or for a closed or
	// off-screen window given no point.
	const liveRecord = (): ClassicyStoreSystemAppWindow | undefined =>
		typeof useAppManager.getState === "function"
			? getAppWindow(
					useAppManager.getState().System.Manager.Applications.apps[appId],
					id,
				)
			: currentWindow;
	// Where the menu drops from: the caption's bottom-left corner, as Wine's
	// `NC_GetSysPopupPos` places the system menu (the system button's square
	// at the caption's left, the popup's top-left at its bottom-left), the
	// icon drawn or not; a window drawing no caption, its own top-left.
	const systemMenuCorner = (): [number, number] => {
		const el = windowRef.current;
		if (!el) return [ws.position[0], ws.position[1]];
		const bar = el.querySelector<HTMLElement>(
			":scope > .classicyWindowTitleBar",
		);
		const barRect = bar?.getBoundingClientRect();
		if (barRect && (barRect.width > 0 || barRect.height > 0))
			return [barRect.left, barRect.bottom];
		const rect = el.getBoundingClientRect();
		return [rect.left, rect.top];
	};
	const openSystemMenu = ({
		at,
		placement,
		focusFirstItem,
		anchor,
	}: {
		at?: [number, number];
		placement: "click" | "corner";
		focusFirstItem: boolean;
		anchor?: Element;
	}): boolean => {
		if (!systemMenuEnabled || ws.closed) return false;
		const offScreen = minimized || hiddenWithApp;
		if (offScreen && !at) return false;
		// The live record: a taskbar button's right-click activates the
		// window in the same event, before this render has caught up.
		if (!offScreen && liveRecord()?.focused !== true) setActive();
		track("contextMenu", {
			type: "ClassicyWindow",
			show: true,
			...analyticsArgs,
		});
		const run = (type: ClassicyWindowSystemMenuCommand) => () => {
			runCommandRef.current({ type });
		};
		const handlers: ClassicyWindowSystemMenuHandlers = {
			restore: run("restore"),
			move: run("move"),
			size: run("size"),
			minimize: run("minimize"),
			maximize: run("maximize"),
			close: run("close"),
		};
		const items = classicyWindowSystemMenuItems(
			{
				appId,
				windowId: id,
				kind: modal
					? "modal"
					: windowType === "utility"
						? "utility"
						: "document",
				minimized: collapsedOrMinimized,
				// A window minimized while maximized is not maximized: Windows
				// clears WS_MAXIMIZE as it minimizes (keeping
				// WPF_RESTORETOMAXIMIZED), so its menu offers Maximize beside
				// Restore (Wine's `MENU_InitSysMenuPopup`), and either brings
				// it back maximized.
				maximized: ws.zoomed === true && !zoomIgnored && !minimized,
				offScreen,
				movable: movesByTitleBar,
				resizable,
				minimizable: collapsesByBox,
				maximizable: zoomsByBox && !modal,
				// The Close box's path: closable, or a titled caption's
				// `onCaptionClose`.
				closable: closesByCaption,
			},
			handlers,
		);
		showContextMenu(items, at ?? systemMenuCorner(), {
			helpItem: false,
			placement,
			focusFirstItem,
			keyboard: true,
			anchor,
		});
		return true;
	};
	// Whether a right-click's target lies in this window's own title bar
	// (not one a `ClassicyWindowFrame` in its contents draws).
	const isOwnTitleBarTarget = (target: EventTarget | null): boolean => {
		if (!(target instanceof Element)) return false;
		const bar = target.closest(".classicyWindowTitleBar");
		return bar !== null && bar.parentElement === windowRef.current;
	};
	// A press on the title bar's icon (button 1; WIG Ch.6 "Title Bar Icons",
	// p.78, and Ch.7, p.102: "for compatibility", as Windows 95/98 shipped)
	// drops the menu from the caption and arms no move
	// (`onTitleMouseDown`). The icon is the menu's anchor, so the menu's
	// outside-press listener, in place before the press that opened it
	// reaches the document, leaves presses on the icon to this handler. The
	// press that ends a double-click's first click (`detail` 2) opens
	// nothing, the double-click closing the window
	// (`onSystemMenuIconDoubleClick`). A press while a contextual menu is
	// open opens nothing either: this window's menu it closes (a second
	// click on the icon, as in Windows), any other closes itself (its
	// outside-press listener), as Windows' menu loop eats the click that
	// ends a menu. Held, the press chooses the item it is released over, as
	// Windows tracks a menu with the button down.
	const onSystemMenuIconMouseDown = (e: MouseEvent<HTMLDivElement>) => {
		if (e.button !== 0) return;
		e.preventDefault();
		if (e.detail >= 2) return;
		if (document.querySelector(".classicyContextMenuWrapper")) {
			if (
				document.getElementById(
					classicyWindowSystemMenuItemId(appId, id, "close"),
				)
			)
				hideContextMenu();
			return;
		}
		if (
			!openSystemMenu({
				at: systemMenuCorner(),
				placement: "corner",
				focusFirstItem: false,
				anchor: e.currentTarget,
			})
		)
			return;
		const prefix = classicyWindowSystemMenuItemIdPrefix(appId, id);
		const chooseOnRelease = (up: globalThis.MouseEvent) => {
			document.removeEventListener("mouseup", chooseOnRelease, true);
			if (up.button !== 0 || !(up.target instanceof Element)) return;
			const item = up.target.closest<HTMLElement>(
				".classicyContextMenuWrapper li.classicyMenuItem",
			);
			if (item?.id.startsWith(prefix)) item.click();
		};
		document.addEventListener("mouseup", chooseOnRelease, true);
	};
	// A double-click on the icon closes the window (WIG Ch.6, p.78; Wine's
	// `NC_HandleNCLButtonDblClk` sends SC_CLOSE for HTSYSMENU), through the
	// caption Close box's path, the veto included, and nothing when it cannot
	// close; the menu its first press opened goes. It never reaches the
	// caption's own double-click (a maximize).
	const onSystemMenuIconDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
		e.stopPropagation();
		hideContextMenu();
		runCommandRef.current({ type: "close" });
	};

	// The window registry (plan 0020-w98 §5, "Shared plumbing"): what the
	// store record does not hold (the title, the icon, the capabilities) and
	// this window's own commands, for a surface that lists windows or acts on
	// one (the Windows shell's taskbar and window pop-up menu). Each command
	// runs the path its box or click runs, so the sounds, analytics, the
	// onBeforeClose veto and the zoom geometry stay here. Updated every render
	// so a command always sees fresh state, the indirection docMoveHandlerRef
	// uses; the entry's `run` calls through it, so the registration below
	// re-runs only when a published value changes. Registering changes no DOM
	// and no store.
	const runCommandRef = useRef<(command: ClassicyWindowCommand) => boolean>(
		() => false,
	);
	runCommandRef.current = (command) => {
		// A closed window draws nothing for a command to act on.
		if (ws.closed) return false;
		if (
			command.type === "move" ||
			command.type === "size" ||
			command.type === "place"
		) {
			// One mode at a time, and none during a pointer gesture.
			if (
				keyboardModeRef.current ||
				pendingDragRef.current ||
				isDraggingRef.current ||
				isResizingRef.current
			)
				return false;
		} else if (keyboardModeRef.current) {
			// Any other command ends a keyboard mode where it is first.
			finishKeyboardMode({ commit: true, lost: false });
		}
		switch (command.type) {
			case "activate":
				setActive();
				return true;
			case "minimize":
				// Under minimize a modal or palette has no Minimize box.
				if (!collapsable || collapseIgnored || ws.collapsed) return false;
				setCollapse(true);
				return true;
			case "restore":
				// A minimized window comes back as it was, maximized included;
				// a palette's or a dialog's zoom ignored under maximize is
				// nothing to restore.
				if (collapsedOrMinimized) setCollapse(false);
				else if (ws.zoomed && !zoomIgnored) applyZoom(false);
				else return false;
				setActive();
				return true;
			case "maximize":
				// The zoom box's path; a modal draws none, nor, under
				// maximize, a palette.
				if (!zoomsByBox || modal) return false;
				if (ws.zoomed) {
					// Minimized while maximized: it comes back maximized, as
					// Windows' SC_MAXIMIZE shows a minimized window maximized.
					// Already maximized on the screen: nothing to do.
					if (!minimized) return false;
					setCollapse(false);
					setActive();
					return true;
				}
				applyZoom(true);
				setActive();
				return true;
			case "close":
				// The caption Close box's action: a closable window closes; a
				// non-closable modal under a titled caption runs its
				// `onCaptionClose`; anything else cannot close (a Yes/No
				// message box), as Windows ignores ALT+F4 and the icon's
				// double-click when Close is unavailable.
				if (closable) {
					close();
					return true;
				}
				if (captionClose) {
					captionClose();
					return true;
				}
				return false;
			case "move":
				// The keyboard Move mode (Windows' SC_MOVE). Refused for a
				// window that does not move (a fixed modal: an alert, or
				// `movable={false}`), one that is maximized (Wine's
				// `WINPOS_SysCommandSizeMove` returns at once for a zoomed
				// window), and one that is not drawn (minimized, or a palette
				// hidden with its app). A shaded window moves, as by its title
				// bar.
				if (fixedModal || maximized || minimized || hiddenWithApp) return false;
				return startKeyboardMode("move");
			case "size":
				// The keyboard Size mode (Windows' SC_SIZE): a resizable
				// window drawn at its size, as for its sizing border.
				if (!resizable || maximized || collapsedOrMinimized || hiddenWithApp)
					return false;
				return startKeyboardMode("size");
			case "place":
				return placeWindow(command);
			case "systemMenu":
				// The window pop-up menu: at the point given (a taskbar
				// button's right-click), else dropped from the caption with
				// its first item selected, as ALT+SPACE opens it.
				return command.at
					? openSystemMenu({
							at: command.at,
							placement: "click",
							focusFirstItem: false,
						})
					: openSystemMenu({ placement: "corner", focusFirstItem: true });
			default:
				return false;
		}
	};
	// Whether the window is drawn on the desktop: open, its app shown, not
	// minimized or shaded, and not a palette hidden with its app.
	const drawnOnDesktop = () =>
		!ws.closed &&
		currentApp?.hidden !== true &&
		!collapsedOrMinimized &&
		!hiddenWithApp;
	// The rect a Restore returns a maximized window to, as `applyZoom(false)`
	// finds it: this mount's, else the record's `restoreRect`, else the rect
	// it opened at.
	const maximizedRestoreRect = (): ClassicyStoreSystemAppWindowRect => {
		const storedRect = currentWindow?.restoreRect;
		return (
			userStateRef.current ??
			(isClassicyWindowRestoreRect(storedRect) ? storedRect : null) ??
			computeInitialRect()
		);
	};
	// The registry's `geometry` (the taskbar's Cascade and Tile): read when
	// asked, through a ref as the commands are, so it sees fresh state.
	const geometryRef = useRef<() => ClassicyWindowGeometry | undefined>(
		() => undefined,
	);
	geometryRef.current = () => {
		if (!drawnOnDesktop()) return undefined;
		const drawn = appliedWindowSize() ?? size;
		const rect: ClassicyWindowPlacement = {
			position: [ws.position[0], ws.position[1]],
			size: [drawn[0], drawn[1]],
		};
		const restore = maximized ? maximizedRestoreRect() : rect;
		const el = windowRef.current;
		const edges = el ? classicyWindowChromeEdges(el) : NO_CHROME;
		return {
			rect,
			restoreRect: {
				position: [restore.position[0], restore.position[1]],
				size: [restore.size[0], restore.size[1]],
			},
			maximized,
			chrome: [edges.left + edges.right, edges.top + edges.bottom],
			minimumSize: [resolvedMinimumSize[0], resolvedMinimumSize[1]],
		};
	};
	// The registry's `place` command (the taskbar's Cascade, Tile and their
	// Undo; Windows' `CascadeWindows`, `TileWindows`, `SetWindowPlacement`):
	// the rect given, with no activation and no sound. A maximized window is
	// restored first, its zoom cleared and the rect it remembered dropped
	// (the zoom event carries `cause: "resize"`, the geometry changing by an
	// arrangement, not the zoom box). With `maximized` (a window that can
	// maximize) the rect becomes the one its Restore returns to, and the
	// window takes the work area, as its Maximize does.
	const placeWindow = (
		command: Extract<ClassicyWindowCommand, { type: "place" }>,
	): boolean => {
		if (fixedModal || !drawnOnDesktop()) return false;
		const position: [number, number] = [
			Math.round(command.position[0]),
			Math.round(command.position[1]),
		];
		// Sized as the window can be drawn: never below its minimum, nor
		// taller than its `max-height` lets CSS draw it (the frame-edge
		// drag's cap), so the stored size is the drawn one.
		const el = windowRef.current;
		const heightCap = el
			? windowContentHeightCap(el)
			: Number.POSITIVE_INFINITY;
		const nextSize: [number, number] | undefined =
			resizable && command.size
				? [
						Math.max(resolvedMinimumSize[0], Math.round(command.size[0])),
						Math.max(
							resolvedMinimumSize[1],
							Math.min(heightCap, Math.round(command.size[1])),
						),
					]
				: undefined;
		if (command.maximized === true && maximizable) {
			const before: ClassicyStoreSystemAppWindowRect = {
				position,
				size: nextSize ?? [size[0], size[1]],
			};
			userStateRef.current = before;
			const maximizedRect = computeMaximizedRect();
			setZoomFlag(
				true,
				false,
				"resize",
				isClassicyWindowRestoreRect(before) ? before : undefined,
			);
			setSize(maximizedRect.size);
			setResize(false, maximizedRect.size);
			setMoving(false, maximizedRect.position);
			return true;
		}
		if (maximized) {
			setZoomFlag(false, false, "resize");
			userStateRef.current = null;
		}
		if (nextSize) {
			setSize(nextSize);
			setResize(false, nextSize);
		}
		userRepositionedRef.current = true;
		setMoving(false, position);
		return true;
	};

	// The registration, keyed on the values it publishes: the first run
	// registers, a later one updates the entry in place (the window keeps its
	// place in the list), and the effect after it unregisters on unmount or
	// when the window's ids change. StrictMode's phantom cleanup unregisters
	// and its re-run registers again.
	const registrationRef = useRef<ClassicyWindowRegistration | null>(null);
	useEffect(() => {
		const entry = {
			appId,
			windowId: id,
			// The title its caption shows (a titled caption's untitled modal:
			// its app's display name).
			title: shownTitle,
			icon,
			modal,
			windowType,
			// Whether its Close closes it (a titled caption's non-closable
			// modal: through `onCaptionClose`).
			closable: closesByCaption,
			// Whether it draws a zoom box: under maximize, a palette or a
			// dialog has no Maximize button.
			zoomable: zoomsByBox,
			collapsable: collapsesByBox,
			resizable,
			movable: movesByTitleBar,
			geometry: () => geometryRef.current(),
			run: (command: ClassicyWindowCommand) => runCommandRef.current(command),
		};
		const current = registrationRef.current;
		if (current && updateClassicyWindow(current, entry)) return;
		registrationRef.current = registerClassicyWindow(entry);
	}, [
		appId,
		id,
		shownTitle,
		icon,
		modal,
		windowType,
		closesByCaption,
		zoomsByBox,
		collapsesByBox,
		resizable,
		movesByTitleBar,
	]);
	// biome-ignore lint/correctness/useExhaustiveDependencies: keyed on the window's ids, which the body does not read: a new id is a new registration, so the old one goes first
	useEffect(
		() => () => {
			const registration = registrationRef.current;
			registrationRef.current = null;
			if (registration) unregisterClassicyWindow(registration);
		},
		[appId, id],
	);

	// The boxes' names under the shell's flags (none under any other
	// layout, so the title bar keeps "Close", "Zoom" and "Collapse").
	const titleBarLabels = minimizes
		? maximizes
			? ws.zoomed
				? SHELL_TITLE_BAR_LABELS.minimizeRestore
				: SHELL_TITLE_BAR_LABELS.minimizeMaximize
			: SHELL_TITLE_BAR_LABELS.minimize
		: maximizes
			? ws.zoomed
				? SHELL_TITLE_BAR_LABELS.restore
				: SHELL_TITLE_BAR_LABELS.maximize
			: undefined;

	const windowStyle = useMemo(
		() => ({
			width: size[0] === 0 ? "auto" : size[0],
			// Shaded: no inline height, so `.collapsed` (ClassicyWindow.scss)
			// sizes the window to its title bar by the cascade alone. A
			// minimized window keeps its size, out of sight.
			height: shaded ? undefined : size[1] === 0 ? "auto" : size[1],
			left: ws.position[0],
			top: ws.position[1],
			minWidth: resolvedMinimumSize[0],
			minHeight: shaded ? 0 : resolvedMinimumSize[1],
		}),
		[
			size[0],
			size[1],
			shaded,
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

	// menuBar.placement "window": the window draws its own menus under the
	// title bar (the screen bar is headless). Utility windows and modals (Mac
	// OS 8 movable modals have no menu bar) get none, nor does a collapsed
	// window. The root's classicyWindowWithMenuBar keys the bar's height and
	// the contents' shrink without :has().
	const showsMenuBar =
		layout.menuBar.placement === "window" &&
		(appMenu?.length ?? 0) > 0 &&
		windowType !== "utility" &&
		!modal &&
		!shaded;

	// An array literal, so the class co-occurrence guard reads its classes.
	const contentsClasses = [
		!modal && !isActive()
			? dimContents
				? "classicyWindowContentsDimmed"
				: "classicyWindowContentsNotDimmed"
			: "",
		scrollable === true ? "" : "classicyWindowNoScroll",
		modal === true ? "classicyWindowContentsModal" : "classicyWindowContents",
		header ? "classicyWindowContentsWithHeader" : "",
		// The contents holding the modeless-dialog frame (`contentFrame`), so a
		// package can style the holder without `:has()` (Firefox before 121).
		contentFrame ? "classicyWindowContentsWithFrame" : "",
		classicyStateClasses({ collapsed: shaded }),
	];
	const contentsStyle = backgroundColor
		? ({
				"--classicy-window-contents-bg": backgroundColor,
			} as CSSProperties)
		: undefined;
	const contentsInner = (
		<div
			className={classNames(
				"classicyWindowContentsInner",
				modal === true ? "classicyWindowContentsModalInner" : "",
				modal === true && selfPaddingClaims > 0
					? "classicyWindowContentsSelfPadded"
					: "",
				growable ? "classicyWindowContentsInnerGrow" : "",
				contentFrame && isActive() ? "classicyWindowContentsFramed" : "",
				contentFrame && !isActive()
					? "classicyWindowContentsFramed classicyWindowContentsFramedDimmed"
					: "",
			)}
		>
			{" "}
			<ClassicyWindowSelfPaddingContext.Provider value={claimSelfPadding}>
				{children}
			</ClassicyWindowSelfPaddingContext.Provider>
		</div>
	);

	const windowContent = !ws.closed && (
		// biome-ignore lint/a11y/useKeyWithClickEvents: application container captures clicks for focus
		<div
			{...appearance.attrs}
			id={[appId, id].join("_")}
			ref={windowRef}
			role="application"
			aria-label={shownTitle || undefined}
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
				ws.resizing ? "classicyWindowResizing" : "",
				modal ? "classicyWindowModal" : "",
				// Non-error modals (File Open/Save and other dialogs) stack in the
				// modal-front band, above utility/tool palettes but below error
				// alerts (classicyWindowRed). Error modals keep the red alert band.
				modal && type !== "error" ? "classicyWindowModalFront" : "",
				modal && type === "error" ? "classicyWindowRed" : "",
				// A fixed modal (HIG7 p.190: no drag region, and so no title bar
				// in System 7) as opposed to a movable one: the window the move
				// gesture refuses, an alert or `movable={false}`. Platinum drops
				// the bar of the second only (its alert keeps the red bar).
				fixedModal ? "classicyWindowModalFixed" : "",
				scrollable ? "" : "classicyWindowNoScroll",
				// A window that cannot be sized (`resizable={false}`: no grow box).
				// Windows gives it the fixed frame, with no sizing border (WIG
				// Ch.6 "Window Frames" (p.76)), which a package can draw from this
				// class; Platinum and System 7 read it not at all.
				resizable ? "" : "classicyWindowNoResize",
				// Under `window.frameEdges: "resize"` only: a window whose frame
				// is a sizing border (resizable, drawn at its size, not
				// maximized), which keys the edges' and corner arms' resize
				// cursors and thickness. No other package emits it.
				sizingBorder ? "classicyWindowSizingBorder" : "",
				scrollable && !showScrollBars ? "classicyWindowScrollBarsHidden" : "",
				showsMenuBar ? "classicyWindowWithMenuBar" : "",
				// Under `window.collapse: "minimize"` only: a minimized window,
				// or a palette hidden with its app, leaves the screen
				// (`display: none`), its tree kept mounted. No other package
				// emits it.
				minimized || hiddenWithApp ? "classicyWindowMinimized" : "",
				// Under `window.zoom: "maximize"` only: a maximized window,
				// whose one base rule lifts the height reserve so it fills the
				// work area. No other package emits it (a zoomed window there
				// carries `expanded` alone).
				maximized ? "classicyWindowMaximized" : "",
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
					    not just the title bar. Each edge reuses the title-bar move logic.
					    Under `window.frameEdges: "resize"` (the Windows shell) an edge
					    sizes a window with a sizing border instead, and a fixed
					    border's edges do nothing. */}
			{/* A maximized window's frame is off the screen and neither moves
			    nor sizes it, so its edges are not drawn. */}
			{!shaded &&
				!maximized &&
				(["top", "right", "bottom", "left"] as const).map((edge) => (
					// biome-ignore lint/a11y/noStaticElementInteractions: frame edge is a mouse-only drag handle
					<div
						key={edge}
						className={classNames(
							"classicyWindowFrameEdge",
							`classicyWindowFrameEdge-${edge}`,
						)}
						role="presentation"
						onPointerDown={sizingBorder ? captureSizingPointer : undefined}
						onMouseDown={
							frameEdgesSize
								? sizingBorder
									? startEdgeResize(edge)
									: holdFrameEdge
								: startMoveWindow
						}
						// stopChangeWindow is bound once, on the root classicyWindow
						// element (below); mouseup here bubbles to it, so a second
						// binding on this descendant would double-invoke the handler.
					></div>
				))}
			{/* A sizing border's corners (`window.frameEdges: "resize"` only):
			    two arms each, along the top or bottom edge and along the side,
			    which size both of the corner's edges. */}
			{sizingBorder &&
				FRAME_CORNER_ARMS.map(([corner, arm]) => (
					// biome-ignore lint/a11y/noStaticElementInteractions: a corner arm is a mouse-only sizing handle
					<div
						key={`${corner}-${arm}`}
						className={classNames(
							"classicyWindowFrameCorner",
							`classicyWindowFrameCorner-${corner}-${arm}`,
						)}
						role="presentation"
						onPointerDown={captureSizingPointer}
						onMouseDown={startEdgeResize(corner)}
					></div>
				))}
			<ClassicyWindowTitleBar
				title={shownTitle}
				icon={icon}
				hideIcon={hideIcon}
				variant={windowType === "utility" ? "utility" : "document"}
				modal={modal === true}
				// Under a titled caption a modal always draws its Close box:
				// its `onCaptionClose` when it is not closable, else drawn
				// unavailable. Every other window draws one when closable.
				onClose={closable ? close : captionClose}
				closeDisabled={titledCaption && !closesByCaption}
				// Each box names itself in a tooltip
				// (`layout.window.captionTooltips`, Windows 98 as shipped).
				buttonTooltips={layout.window.captionTooltips === true}
				// A palette's bar shows its title (`layout.window.utilityTitle`,
				// a Windows tool window's small caption).
				utilityTitle={layout.window.utilityTitle === true}
				onZoom={zoomsByBox ? toggleZoom : undefined}
				// Under maximize, Windows' pair: the box a primary window
				// lacks, drawn unavailable beside the one it has.
				zoomDisabled={zoomBoxDisabled}
				// Under minimize a modal or palette has no Minimize box: neither
				// has a taskbar button to come back from.
				onCollapse={collapsesByBox ? onCollapseBoxClick : undefined}
				collapseDisabled={collapseBoxDisabled}
				onCollapseKey={toggleCollapse}
				// The "?" box, under What's This? (`balloonHelp.contextHelp`
				// "whatsThis"), on a dialog with described content.
				onHelp={helpBoxShown ? startWhatsThisHere : undefined}
				labels={titleBarLabels}
				onTitleMouseDown={onTitleMouseDown}
				// Under the system menu only: the icon opens the window pop-up
				// menu and its double-click closes the window; without the
				// flag the icon stays inert.
				onIconMouseDown={
					systemMenuEnabled ? onSystemMenuIconMouseDown : undefined
				}
				onIconDoubleClick={
					systemMenuEnabled ? onSystemMenuIconDoubleClick : undefined
				}
				// stopChangeWindow is bound once, on the root classicyWindow
				// element; the title's mouseup bubbles to it (see comment there).
				onTitleDoubleClick={
					titleDoubleClickZooms
						? zoomsByBox && !modal
							? toggleZoom
							: undefined
						: doubleClickTitleToCollapse
							? toggleCollapse
							: undefined
				}
			/>
			{showsMenuBar && appMenu && (
				<ClassicyWindowMenuBar
					appId={appId}
					windowId={id}
					menuItems={appMenu}
				/>
			)}
			{header && !shaded && (
				<div
					className={classNames(
						"classicyWindowHeader",
						headerVariant === "list" ? "classicyWindowHeaderList" : "",
						contentsHasHead ? "classicyWindowHeaderAboveHead" : "",
						isActive() ? "" : "classicyWindowHeaderDimmed",
					)}
				>
					{header}
				</div>
			)}
			{/* A modal's contents never scroll (a dialog is laid out to fit);
			    every other window scrolls in a ClassicyScrollArea, which draws
			    Classicy's own bars: both, or none (see showScrollBars). */}
			{modal === true ? (
				<div
					ref={contentsRef}
					className={classNames(contentsClasses)}
					style={contentsStyle}
				>
					{contentsInner}
				</div>
			) : (
				<ClassicyWindowActiveContext.Provider value={isActive()}>
					<ClassicyScrollArea
						className={classNames(contentsClasses)}
						style={contentsStyle}
						viewportRef={contentsRef}
						scrollable={scrollable}
						vertical={showScrollBars ? "always" : "never"}
						horizontal={showScrollBars ? "always" : "never"}
						onOverflowChange={onContentOverflow}
						onHeadChange={setContentsHasHead}
						initialScroll={viewState.initialScroll}
						onScrollSettled={viewState.onScrollSettled}
					>
						{contentsInner}
					</ClassicyScrollArea>
				</ClassicyWindowActiveContext.Provider>
			)}
			{/* #196: a Platinum placard status region pinned to the window's
					    bottom-left, to the left of the horizontal scroll bar. Hidden
					    while collapsed and kept clear of the bottom-right resizer. */}
			{placard && !shaded && (
				<div
					className={classNames(
						"classicyWindowPlacardBar",
						isActive() ? "" : "classicyWindowPlacardBarDimmed",
					)}
				>
					{placard}
				</div>
			)}
			{/* No grow box while maximized: Windows hides the size grip. */}
			{resizable && !shaded && !maximized && (
				// biome-ignore lint/a11y/noStaticElementInteractions: resize handle is mouse-only drag target
				<div
					className={classNames(
						"classicyWindowResizer",
						isActive() ? "" : "classicyWindowResizerDimmed",
					)}
					role="presentation"
					onMouseDown={startResizeWindow}
					// stopChangeWindow is bound once, on the root classicyWindow
					// element; mouseup here bubbles to it (see comment there). Its
					// resize cursor is CSS (ClassicyWindow.scss).
				></div>
			)}
		</div>
	);

	// Only a mounted-and-open modal draws its scrim. A closed modal that stays
	// mounted (e.g. an error dialog hidden via ClassicyWindowClose rather than
	// unmounted) must drop the scrim too — otherwise the input-blocking backdrop
	// outlives the window and locks the whole page.
	if (modal && desktopRoot && !ws.closed) {
		// A hidden app's modal (the Application menu's Hide commands) is
		// portaled outside the app's hidden container, so it and its scrim
		// hide themselves, kept mounted, as the app's other windows are.
		const appHidden = currentApp?.hidden === true;
		// #197: modal windows render an input-blocking scrim; clicking it beeps.
		const modalScrim = (
			// biome-ignore lint/a11y/noStaticElementInteractions: scrim is a mouse-only backdrop
			<div
				className={classNames(
					"classicyWindowModalScrim",
					modal && type === "error" ? "classicyWindowModalScrimError" : "",
				)}
				style={appHidden ? { display: "none" } : undefined}
				role="presentation"
				onMouseDown={onModalScrimClick}
			></div>
		);
		return createPortal(
			<>
				{modalScrim}
				{appHidden && windowContent
					? cloneElement(windowContent, {
							style: {
								...(windowContent.props as { style?: CSSProperties }).style,
								display: "none",
							},
						} as { style: CSSProperties })
					: windowContent}
			</>,
			desktopRoot,
		);
	}

	return <>{windowContent}</>;
};
