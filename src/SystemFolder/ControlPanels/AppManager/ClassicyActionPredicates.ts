/**
 * Type predicates for ActionMessage fields.
 *
 * Each predicate narrows a generic ActionMessage to a more specific shape,
 * allowing reducer branches to access action fields safely after
 * ActionMessage was tightened from Record<string,any> to Record<string,unknown>.
 *
 * Design rules:
 * - Predicates check only the fields they claim to narrow — nothing more.
 * - No discriminated-union approach: reducers receive all action types via one
 *   handler and branch by type string, so each branch narrows only the fields
 *   it actually needs.
 */

import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	type ClassicyThemeColorChange,
	isThemeColorTarget,
	isValidThemeColor,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeColorTargets";
import {
	type ClassicyThemeMetricChange,
	isThemeMetricTarget,
	isValidThemeMetric,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets";
import { ClassicyThemeSchema } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

type Msg = Record<string, unknown> & { type: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isObject(v: unknown): v is Record<string, unknown> {
	return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNumberTuple2(v: unknown): v is [number, number] {
	return (
		Array.isArray(v) &&
		v.length === 2 &&
		typeof v[0] === "number" &&
		typeof v[1] === "number"
	);
}

// ─── App identity ─────────────────────────────────────────────────────────────

/** Action has `app.id: string` */
export function hasApp(m: Msg): m is Msg & { app: { id: string } } {
	return isObject(m.app) && typeof m.app.id === "string";
}

/** Action has `app.id: string` and `fileTypes: unknown[]` */
export function hasAppAndFileTypes(
	m: Msg,
): m is Msg & { app: { id: string }; fileTypes: unknown[] } {
	return hasApp(m) && Array.isArray(m.fileTypes);
}

/** Action has `app.id: string` and `path: string` */
export function hasAppAndPath(
	m: Msg,
): m is Msg & { app: { id: string }; path: string } {
	return hasApp(m) && typeof m.path === "string";
}

/** Action has `app.id: string` and `fileType: string` */
export function hasAppAndFileType(
	m: Msg,
): m is Msg & { app: { id: string }; fileType: string } {
	return hasApp(m) && typeof m.fileType === "string";
}

// ─── Window identity ──────────────────────────────────────────────────────────

/** Action has `window.id: string` */
export function hasWindow(m: Msg): m is Msg & { window: { id: string } } {
	return (
		isObject(m.window) &&
		typeof (m.window as Record<string, unknown>).id === "string"
	);
}

/** Action has `app.id: string` and `window.id: string` */
export function hasAppAndWindow(
	m: Msg,
): m is Msg & { app: { id: string }; window: { id: string } } {
	return hasApp(m) && hasWindow(m);
}

/** Action has app+window ids plus `dragging: boolean` */
export function hasWindowDragging(m: Msg): m is Msg & {
	app: { id: string };
	window: { id: string };
	dragging: boolean;
} {
	return hasAppAndWindow(m) && typeof m.dragging === "boolean";
}

/** Action has app+window ids plus `zoomed: boolean` */
export function hasWindowZoomed(
	m: Msg,
): m is Msg & { app: { id: string }; window: { id: string }; zoomed: boolean } {
	return hasAppAndWindow(m) && typeof m.zoomed === "boolean";
}

/** Action has app+window ids plus `resizing: boolean` and `size: [number, number]` */
export function hasWindowResizing(m: Msg): m is Msg & {
	app: { id: string };
	window: { id: string };
	resizing: boolean;
	size: [number, number];
} {
	return (
		hasAppAndWindow(m) &&
		typeof m.resizing === "boolean" &&
		isNumberTuple2(m.size)
	);
}

/** Action has app+window ids plus `position: [number, number]` and `moving: boolean` */
export function hasWindowMove(m: Msg): m is Msg & {
	app: { id: string };
	window: { id: string };
	position: [number, number];
	moving: boolean;
} {
	return (
		hasAppAndWindow(m) &&
		isNumberTuple2(m.position) &&
		typeof m.moving === "boolean"
	);
}

/** Action has app+window ids plus `position: [number, number]` */
export function hasWindowPosition(m: Msg): m is Msg & {
	app: { id: string };
	window: { id: string };
	position: [number, number];
} {
	return hasAppAndWindow(m) && isNumberTuple2(m.position);
}

// ─── Menu bar ─────────────────────────────────────────────────────────────────

/** Action has `menuBar: ClassicyMenuItem[]` */
export function hasMenuBar(m: Msg): m is Msg & { menuBar: ClassicyMenuItem[] } {
	return Array.isArray(m.menuBar);
}

/** Action has `app.id: string` and `helpItems: ClassicyMenuItem[]` */
export function hasAppAndHelpItems(
	m: Msg,
): m is Msg & { app: { id: string }; helpItems: ClassicyMenuItem[] } {
	return hasApp(m) && Array.isArray(m.helpItems);
}

// ─── Desktop app reference ────────────────────────────────────────────────────

/** Action has `app.id`, `app.name`, and `app.icon` all as strings */
export function hasDesktopAppRef(
	m: Msg,
): m is Msg & { app: { id: string; name: string; icon: string } } {
	return (
		isObject(m.app) &&
		typeof (m.app as Record<string, unknown>).id === "string" &&
		typeof (m.app as Record<string, unknown>).name === "string" &&
		typeof (m.app as Record<string, unknown>).icon === "string"
	);
}

// ─── Mouse event ──────────────────────────────────────────────────────────────

/** Action has `e.clientX: number`, `e.clientY: number`, and `e.target` object */
export function hasMouseEvent(m: Msg): m is Msg & {
	e: { clientX: number; clientY: number; target: Record<string, unknown> };
} {
	if (!isObject(m.e)) return false;
	const e = m.e as Record<string, unknown>;
	return typeof e.clientX === "number" && typeof e.clientY === "number";
}

// ─── Desktop state fields ─────────────────────────────────────────────────────

/** Action has `activeTheme: string` (theme id) */
export function hasActiveTheme(m: Msg): m is Msg & { activeTheme: string } {
	return typeof m.activeTheme === "string";
}

/** Action has `backgroundImage: string` */
export function hasBackgroundImage(
	m: Msg,
): m is Msg & { backgroundImage: string } {
	return typeof m.backgroundImage === "string";
}

/** Action has `backgroundPosition: string` */
export function hasBackgroundPosition(
	m: Msg,
): m is Msg & { backgroundPosition: string } {
	return typeof m.backgroundPosition === "string";
}

/** Action has `backgroundRepeat: string` */
export function hasBackgroundRepeat(
	m: Msg,
): m is Msg & { backgroundRepeat: string } {
	return typeof m.backgroundRepeat === "string";
}

/** Action has `backgroundSize: string` */
export function hasBackgroundSize(
	m: Msg,
): m is Msg & { backgroundSize: string } {
	return typeof m.backgroundSize === "string";
}

/** Action has `fontType: string` and `font: string` */
export function hasFont(m: Msg): m is Msg & { fontType: string; font: string } {
	return typeof m.fontType === "string" && typeof m.font === "string";
}

/** Action has `fontType: string` and `fontSize: number` */
export function hasFontSize(
	m: Msg,
): m is Msg & { fontType: string; fontSize: number } {
	return typeof m.fontType === "string" && typeof m.fontSize === "number";
}

/**
 * Action is a valid theme colour edit: `colorKey` names one of the 28 theme
 * colours (`index` 0–6 required for `system`/`theme`, absent otherwise) and
 * `color` is a 24-bit RGB integer (0x000000–0xFFFFFF).
 */
export function hasThemeColorChange(
	m: Msg,
): m is Msg & ClassicyThemeColorChange {
	return isThemeColorTarget(m) && isValidThemeColor(m.color);
}

/**
 * Action addresses one theme metric (`metricKey`, an allowlisted key from
 * `CLASSICY_THEME_METRIC_KEYS`) and `value` is a finite number within that
 * metric's `min`–`max` (see `CLASSICY_THEME_METRIC_TARGETS`).
 */
export function hasThemeMetricChange(
	m: Msg,
): m is Msg & ClassicyThemeMetricChange {
	return isThemeMetricTarget(m) && isValidThemeMetric(m, m.value);
}

/** Action has `alertSound: string` (a `ClassicyAlert*` sprite key) */
export function hasAlertSound(m: Msg): m is Msg & { alertSound: string } {
	return typeof m.alertSound === "string";
}

/** Action has `alertVolume: number` (finite; a 0–100 alert sound level) */
export function hasAlertVolume(m: Msg): m is Msg & { alertVolume: number } {
	return typeof m.alertVolume === "number" && Number.isFinite(m.alertVolume);
}

/** Action has `smartScrolling: boolean` (Mac OS 8 Smart Scrolling toggle) */
export function hasSmartScrolling(
	m: Msg,
): m is Msg & { smartScrolling: boolean } {
	return typeof m.smartScrolling === "boolean";
}

/** Action has `doubleClickTitleToCollapse: boolean` (Mac OS 8 Appearance
 * "Double-click title bar to collapse windows" toggle) */
export function hasDoubleClickTitleToCollapse(
	m: Msg,
): m is Msg & { doubleClickTitleToCollapse: boolean } {
	return typeof m.doubleClickTitleToCollapse === "boolean";
}

/** Action has `availableThemes: unknown[]` */
export function hasAvailableThemes(
	m: Msg,
): m is Msg & { availableThemes: unknown[] } {
	return Array.isArray(m.availableThemes);
}

/**
 * Action has `theme: ClassicyTheme`, validated against `ClassicyThemeSchema`
 * (an imported theme is untrusted data: colours in range, safe CSS strings, a
 * bundled-wallpaper or http(s) `backgroundImage`, a known sound theme).
 */
export function hasImportableTheme(
	m: Msg,
): m is Msg & { theme: ClassicyTheme } {
	return ClassicyThemeSchema.safeParse(m.theme).success;
}

/** Action has `disableBalloonHelp: boolean` */
export function hasDisableBalloonHelp(
	m: Msg,
): m is Msg & { disableBalloonHelp: boolean } {
	return typeof m.disableBalloonHelp === "boolean";
}

/** Action has `visible: boolean` */
export function hasVisible(m: Msg): m is Msg & { visible: boolean } {
	return typeof m.visible === "boolean";
}

/** Action has `collapsed: boolean` */
export function hasCollapsed(m: Msg): m is Msg & { collapsed: boolean } {
	return typeof m.collapsed === "boolean";
}

/** Action has `width`: a finite, non-negative number, or `null` to clear it */
export function hasStripWidth(m: Msg): m is Msg & { width: number | null } {
	return (
		m.width === null ||
		(typeof m.width === "number" && Number.isFinite(m.width) && m.width >= 0)
	);
}

/**
 * Action has `edge: "left" | "right"` and `bottom`: a finite, non-negative
 * distance in px from the desktop's bottom edge.
 */
export function hasStripPosition(
	m: Msg,
): m is Msg & { edge: "left" | "right"; bottom: number } {
	return (
		(m.edge === "left" || m.edge === "right") &&
		typeof m.bottom === "number" &&
		Number.isFinite(m.bottom) &&
		m.bottom >= 0
	);
}

/** Action has `moduleId: string` and `hidden: boolean` */
export function hasModuleHidden(
	m: Msg,
): m is Msg & { moduleId: string; hidden: boolean } {
	return typeof m.moduleId === "string" && typeof m.hidden === "boolean";
}

/** Action has `moduleOrder: string[]` */
export function hasModuleOrder(m: Msg): m is Msg & { moduleOrder: string[] } {
	return (
		Array.isArray(m.moduleOrder) &&
		m.moduleOrder.every((id) => typeof id === "string")
	);
}

/** Action has `drive: string` */
export function hasDrive(m: Msg): m is Msg & { drive: string } {
	return typeof m.drive === "string";
}

/** Action has `message: string` (for error dialogs) */
export function hasErrorDialogMessage(m: Msg): m is Msg & { message: string } {
	return typeof m.message === "string";
}

// ─── Desktop icon fields ──────────────────────────────────────────────────────

/** Action has `sortBy: string` */
export function hasSortBy(m: Msg): m is Msg & { sortBy: string } {
	return typeof m.sortBy === "string";
}

/** Action has `iconId: string` */
export function hasIconId(m: Msg): m is Msg & { iconId: string } {
	return typeof m.iconId === "string";
}

/** Action has `iconIds: unknown[]` */
export function hasIconIds(m: Msg): m is Msg & { iconIds: unknown[] } {
	return Array.isArray(m.iconIds);
}

/** Action has the full set of fields needed to add a desktop icon */
export function hasIconAddFields(
	m: Msg,
): m is Msg & { app: { id: string; name: string; icon: string } } {
	return hasDesktopAppRef(m);
}

/** Action has `app.id: string` and `location: [number, number]` */
export function hasIconLocation(
	m: Msg,
): m is Msg & { app: { id: string }; location: [number, number] } {
	return hasApp(m) && isNumberTuple2(m.location);
}

// ─── DateTime fields ──────────────────────────────────────────────────────────

/** Action has `dateTime: Date` */
export function hasDateTime(m: Msg): m is Msg & { dateTime: Date } {
	return m.dateTime instanceof Date;
}

/** Action has `tzOffset: string` */
export function hasTzOffset(m: Msg): m is Msg & { tzOffset: string } {
	return typeof m.tzOffset === "string";
}

/** Action has `militaryTime: boolean` */
export function hasMilitaryTime(m: Msg): m is Msg & { militaryTime: boolean } {
	return typeof m.militaryTime === "boolean";
}

// ─── Finder fields ────────────────────────────────────────────────────────────

/** Action has `path: string` */
export function hasPath(m: Msg): m is Msg & { path: string } {
	return typeof m.path === "string";
}

/** Action has `paths: unknown[]` */
export function hasPaths(m: Msg): m is Msg & { paths: unknown[] } {
	return Array.isArray(m.paths);
}

/** Action has `url: string` */
export function hasUrl(m: Msg): m is Msg & { url: string } {
	return typeof m.url === "string" && m.url.length > 0;
}

/** Action has `file` as a non-null object */
export function hasFinderFile(
	m: Msg,
): m is Msg & { file: Record<string, unknown> } {
	return isObject(m.file);
}
