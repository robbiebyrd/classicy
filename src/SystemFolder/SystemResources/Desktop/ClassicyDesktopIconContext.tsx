import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { resolveClassicyAppIdentity } from "@/Appearance/ClassicyAppIdentity";
import { getClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { CLASSICY_THEME_DERIVATIONS } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations";
import { px3 } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeDerivations.internal";
import {
	classicyThemeMeasurementDefaults,
	withDefaultThemeMetrics,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import {
	hasApp,
	hasDesktopAppRef,
	hasIconAddFields,
	hasIconId,
	hasIconIds,
	hasIconLocation,
	hasSortBy,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionPredicates";
import {
	markAppFocused,
	openApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppHelpers";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import type {
	ClassicyBalloonPosition,
	ClassicyIconBalloonHelp,
} from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import {
	type ClassicyDesktopIconSelectMode,
	classicyDesktopIconSelection,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopKeyNav";
import type { ClassicyStoreSystemDesktopManagerIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import { APP_SHORTCUT_ICON_KIND } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemApplications";
import { classicyIconsRoveFocus } from "@/SystemFolder/SystemResources/Keyboard/ClassicyListKeys.internal";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import {
	classicyTaskbarHasBand,
	getClassicyTaskbarInsets,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";
import { classicyWindowsSelectionModifiers } from "@/SystemFolder/SystemResources/Utils/ClassicyMousePolicy";

/**
 * The desktop-icon grid metrics, in px: the icon `size`, the `padding` around
 * it and the grid `cell` (icon plus label room) — the values `getThemeVars`
 * emits as `--desktop-icon-size`, `--desktop-icon-padding` and
 * `--desktop-icon-cell`. The grid steps by `cell + padding` on both axes,
 * unless the package declares its rows' geometry (`rowPitch`, `top`).
 */
export type ClassicyDesktopIconMetrics = {
	size: number;
	padding: number;
	cell: number;
	/**
	 * The distance between rows, from the optional package knob
	 * `desktopIconGrid.rowGap` (the icon `size` plus it). Unset, rows step
	 * by `cell + padding`, as columns always do.
	 */
	rowPitch?: number;
	/**
	 * The distance between columns, from the optional package knob
	 * `desktopIconGrid.columnGap` (the icon `size` plus it: Windows 98's
	 * 75 px IconSpacing). Unset, columns step by `cell + padding`.
	 */
	columnPitch?: number;
	/**
	 * The first row's top for a top origin, and the highest a bottom
	 * origin's row goes: the optional package knob `desktopIconGrid.top`.
	 * Unset, `4 × padding`.
	 */
	top?: number;
};

// An optional package knob of the `desktopIconGrid` family, not a structural
// one: the core floor has none, so Platinum's grid keeps following its
// formula. Read from the theme completed by its package's defaults, as
// getThemeVars reads it: persistence stores a theme without the knob values
// equal to those defaults (H-R17) and the load path refills only the core
// five families, so a saved Custom theme of the package has no family of its
// own. A value that is not a finite number of zero or more is ignored.
const desktopIconGridKnob = (
	theme: ClassicyTheme,
	key: "rowGap" | "columnGap" | "top",
): number | undefined => {
	const value = withDefaultThemeMetrics(
		theme,
		classicyThemeMeasurementDefaults(theme.package),
	).measurements?.desktopIconGrid?.[key];
	return typeof value === "number" && Number.isFinite(value) && value >= 0
		? value
		: undefined;
};

/** The rows' pitch: the package's, else one grid step (`cell + padding`). */
const rowStep = ({ padding, cell, rowPitch }: ClassicyDesktopIconMetrics) =>
	rowPitch ?? cell + padding;

/** The columns' pitch: the package's, else one grid step (`cell + padding`). */
const columnStep = ({
	padding,
	cell,
	columnPitch,
}: ClassicyDesktopIconMetrics) => columnPitch ?? cell + padding;

/** The first row's top: the package's, else `4 × padding`. */
const firstRowTop = ({ padding, top }: ClassicyDesktopIconMetrics) =>
	top ?? padding * 4;

/**
 * The height the grid lays rows in: the viewport's, less the taskbar's band
 * along its bottom or top (`getClassicyTaskbarInsets`, none with no taskbar,
 * so every package without one lays out exactly as before). Read from the
 * module, as `window.innerHeight` is, so the reducer path never touches the
 * store. `gridWidth` is the width, less a band at either side, and
 * `gridOffset` the work area's top-left corner, which a docked taskbar
 * (plan 0020-w98 E4) moves past a left or top band: the icons follow it.
 */
const gridHeight = () => {
	const band = getClassicyTaskbarInsets();
	return window.innerHeight - band.top - band.bottom;
};
const gridWidth = () => {
	const band = getClassicyTaskbarInsets();
	return window.innerWidth - band.left - band.right;
};
const gridOffset = (): [number, number] => {
	const band = getClassicyTaskbarInsets();
	return [band.left, band.top];
};

// One named derivation's value in px, rounded exactly as getThemeVars emits
// it (px3), so the reducer's number equals the stylesheet's.
const derivedPx = (theme: ClassicyTheme, cssVar: string): number => {
	const derivation = CLASSICY_THEME_DERIVATIONS.find(
		(d) => d.cssVar === cssVar,
	);
	if (!derivation) {
		const message = `No theme derivation named ${cssVar}`;
		classicyLog("error", "Theme", message);
		throw new Error(message);
	}
	return Number.parseFloat(px3(derivation.compute(theme)));
};

/**
 * The desktop-icon metrics of `theme`, computed from the theme and the named
 * derivations alone. Pure: it never reads the DOM, so it is what reducer
 * paths (desktop Clean Up, inside the store's `set`) use. Render and handler
 * code that should honor the desktop's live variables uses
 * `readClassicyDesktopIconMetrics` (ClassicyFileBrowserUtils) instead.
 *
 * So desktop Clean Up lays icons out from the theme alone: a host's inline
 * override of `--desktop-icon-*` on the desktop's `style` is not seen by it,
 * while Finder's icon and list views do honor that override. To resize the
 * desktop grid, change the theme's `desktop.iconSize` instead.
 */
export const classicyDesktopIconMetrics = (
	theme: ClassicyTheme,
): ClassicyDesktopIconMetrics => {
	const metrics: ClassicyDesktopIconMetrics = {
		size: theme.desktop.iconSize,
		padding: derivedPx(theme, "--desktop-icon-padding"),
		cell: derivedPx(theme, "--desktop-icon-cell"),
	};
	// Each only when the package sets it, so Platinum's metrics are as before.
	const rowGap = desktopIconGridKnob(theme, "rowGap");
	if (rowGap !== undefined) metrics.rowPitch = metrics.size + rowGap;
	const columnGap = desktopIconGridKnob(theme, "columnGap");
	if (columnGap !== undefined) metrics.columnPitch = metrics.size + columnGap;
	const top = desktopIconGridKnob(theme, "top");
	if (top !== undefined) metrics.top = top;
	return metrics;
};

/**
 * The clean-up grid's column and row counts. Columns step by one grid step
 * (`cell + padding`, the step `classicyDesktopIconGridPosition` places by,
 * unless the package declares `desktopIconGrid.columnGap`), so every counted
 * column fits the viewport; rows by the row pitch (the
 * same step unless the package declares `desktopIconGrid.rowGap`). A bottom
 * origin also reserves the menu bar's band at the top (the top origins'
 * first-row top, `4 * padding` unless the package declares
 * `desktopIconGrid.top`, plus the bottom origins' own `4 * padding`), so
 * its last row never lands under the menu bar. Some row must exist, so a
 * viewport shorter than that plus one row still gets one; there
 * `classicyDesktopIconGridPosition` clamps a bottom origin's y to at least
 * the first-row top, keeping that row on screen.
 *
 * Rows are counted in the height above the taskbar's band (`gridHeight`).
 * While a band is published, a top origin counts only the rows whose cell
 * ends above it, as Windows' icon view starts a new column unless the next
 * icon fits whole (comctl32 `LISTVIEW_NextIconPosLeft`): `floor(h / pitch)`
 * can let the last row run past `h` (by up to `3 × padding` with the default
 * row geometry: Windows 98's tenth row at 768 px would end 4 px into a 28 px
 * taskbar), where the taskbar, drawn above the icons, would cover it. With
 * no band the count is today's.
 */
const createGrid = (
	metrics: ClassicyDesktopIconMetrics,
	origin: ClassicyAppearanceLayout["desktop"]["iconGridOrigin"],
) => {
	const { padding, cell } = metrics;
	const pitch = rowStep(metrics);
	const height = gridHeight();
	const topRows = classicyTaskbarHasBand(getClassicyTaskbarInsets())
		? Math.max(
				1,
				Math.floor((height - firstRowTop(metrics) - cell) / pitch) + 1,
			)
		: Math.floor(height / pitch);
	return [
		Math.floor(gridWidth() / columnStep(metrics)),
		origin.startsWith("bottom")
			? Math.max(
					1,
					Math.floor((height - firstRowTop(metrics) - padding * 4) / pitch),
				)
			: topRows,
	];
};

/**
 * The desktop location of grid cell (`col`, `row`), counted from the package
 * layout's icon grid origin. `col` starts at 1 and `row` at 0, as the
 * clean-up walks them; columns step by `cell + padding` (unless the package
 * declares `desktopIconGrid.columnGap`), rows by the row
 * pitch (the same, unless the package declares `desktopIconGrid.rowGap`),
 * the first row of a top origin at the first-row top (`4 × padding`, unless
 * it declares `desktopIconGrid.top`). `top-right` (Platinum) is the original
 * formula: columns step in from the right edge, rows down from the top. A
 * bottom origin's rows are measured up from the taskbar's top (the bottom of
 * `gridHeight`, the viewport's while no taskbar is mounted).
 */
export const classicyDesktopIconGridPosition = (
	metrics: ClassicyDesktopIconMetrics,
	col: number,
	row: number,
	origin: ClassicyAppearanceLayout["desktop"]["iconGridOrigin"] = CLASSICY_DEFAULT_APPEARANCE_LAYOUT
		.desktop.iconGridOrigin,
): [number, number] => {
	const { padding } = metrics;
	const step = columnStep(metrics);
	const pitch = rowStep(metrics);
	const top = firstRowTop(metrics);
	const [offsetX, offsetY] = gridOffset();
	return [
		offsetX +
			(origin.endsWith("right")
				? Math.floor(gridWidth() - step * col)
				: Math.floor(step * (col - 1) + padding)),
		offsetY +
			(origin.startsWith("top")
				? Math.floor(pitch * row) + top
				: // Never above the top origins' first row, so a row forced into a
					// viewport too short for it stays on screen.
					Math.max(
						top,
						Math.floor(gridHeight() - pitch * (row + 1)) - padding * 4,
					)),
	];
};

/**
 * `[iconSize, iconPadding]` for `theme`, from `classicyDesktopIconMetrics`:
 * pure, never the DOM (it is reached from the reducer).
 */
export const getIconSize = (theme: ClassicyTheme): [number, number] => {
	const { size, padding } = classicyDesktopIconMetrics(theme);
	return [size, padding];
};

const kindPriority: Record<string, number> = {
	drive: 0,
	directory: 1,
	app_shortcut: 2,
	shortcut: 3,
	trash: 4,
	file: 5,
	icon: 6,
};

const getKindPriority = (kind: string): number =>
	kindPriority[kind?.toLowerCase()] ?? 99;

/**
 * Sorts the desktop's icons in place, by name or by kind then name. The name
 * is the app's display name: an app shortcut takes `packageId`'s override
 * (store-free, read from the draft's `packageId`); every other kind, drives
 * sharing `Finder.app` included, its own `appName`. A user label is not
 * considered.
 */
const sortDesktopIcons = (
	icons: ClassicyStoreSystemDesktopManagerIcon[],
	sortType: "name" | "kind" | "label",
	packageId?: string,
) => {
	const displayName = (i: ClassicyStoreSystemDesktopManagerIcon) =>
		i.kind === APP_SHORTCUT_ICON_KIND
			? resolveClassicyAppIdentity(
					i.appId,
					{ name: i.appName, icon: i.icon },
					packageId,
				).name
			: i.appName;
	const byName = (
		a: ClassicyStoreSystemDesktopManagerIcon,
		b: ClassicyStoreSystemDesktopManagerIcon,
	) => displayName(a).toLowerCase().localeCompare(displayName(b).toLowerCase());
	switch (sortType) {
		case "name":
			return icons.sort(byName);
		default:
			return icons.sort((a, b) => {
				const kindDiff = getKindPriority(a.kind) - getKindPriority(b.kind);
				if (kindDiff !== 0) return kindDiff;
				return byName(a, b);
			});
	}
};

const cleanupDesktopIcons = (
	theme: ClassicyTheme,
	icons: ClassicyStoreSystemDesktopManagerIcon[],
	origin: ClassicyAppearanceLayout["desktop"]["iconGridOrigin"] = CLASSICY_DEFAULT_APPEARANCE_LAYOUT
		.desktop.iconGridOrigin,
) => {
	const newDesktopIcons: ClassicyStoreSystemDesktopManagerIcon[] = [];
	let startX: number = 1;
	let startY: number = 0;
	// Runs inside the store's `set`: the metrics come from the theme in
	// state, never from the DOM.
	const metrics = classicyDesktopIconMetrics(theme);

	const grid = createGrid(metrics, origin);

	icons.forEach((icon) => {
		// Hidden icons are never drawn on the desktop (they exist only to
		// populate the derived Applications folder), so they must not consume a
		// grid slot — otherwise the visible icons leave a gap where the hidden
		// one "would" sit.
		if (icon.hidden) {
			newDesktopIcons.push(icon);
			return;
		}

		if (startY >= grid[1]) {
			startY = 0;
			startX += 1;
		}

		if (startX >= grid[0]) {
			startX = 1;
		}

		icon.location = classicyDesktopIconGridPosition(
			metrics,
			startX,
			startY,
			origin,
		);
		newDesktopIcons.push(icon);
		startY += 1;
	});

	return newDesktopIcons;
};

/**
 * The first cell of the desktop's grid, walked as Clean Up walks it (down
 * each column from the package's icon grid origin), that no drawn icon of
 * `icons` covers (within half a cell's step on both axes): where Explorer's
 * New on the desktop puts an item made from the menu bar (WIG Ch.5 "New
 * Command", p.69). Pure: the metrics come from `theme`, as Clean Up's do.
 * Undefined only when every cell of the screen is covered.
 */
export const classicyDesktopFreeIconLocation = (
	theme: ClassicyTheme,
	icons: readonly Pick<
		ClassicyStoreSystemDesktopManagerIcon,
		"location" | "hidden"
	>[],
	origin: ClassicyAppearanceLayout["desktop"]["iconGridOrigin"] = CLASSICY_DEFAULT_APPEARANCE_LAYOUT
		.desktop.iconGridOrigin,
): [number, number] | undefined => {
	const metrics = classicyDesktopIconMetrics(theme);
	const [columns, rows] = createGrid(metrics, origin);
	const halfX = columnStep(metrics) / 2;
	const halfY = rowStep(metrics) / 2;
	const taken = icons.flatMap((icon) =>
		!icon.hidden && icon.location ? [icon.location] : [],
	);
	for (let col = 1; col < Math.max(2, columns); col++) {
		for (let row = 0; row < Math.max(1, rows); row++) {
			const cell = classicyDesktopIconGridPosition(metrics, col, row, origin);
			if (
				!taken.some(
					([x, y]) =>
						Math.abs(x - cell[0]) < halfX && Math.abs(y - cell[1]) < halfY,
				)
			)
				return cell;
		}
	}
	return undefined;
};

/**
 * Explorer's Line Up Icons on the desktop (Windows 98 SE's Line &Up Icons;
 * the Finder's Clean Up lays every icon out afresh instead): each drawn icon,
 * in the desktop's order, moves to the free cell of the screen's grid
 * nearest where it is. Pure; hidden icons and icons with no location keep
 * theirs. Returns each icon's new location, by `appId`.
 */
export const classicyDesktopLineUpLocations = (
	theme: ClassicyTheme,
	icons: readonly Pick<
		ClassicyStoreSystemDesktopManagerIcon,
		"appId" | "location" | "hidden"
	>[],
	origin: ClassicyAppearanceLayout["desktop"]["iconGridOrigin"] = CLASSICY_DEFAULT_APPEARANCE_LAYOUT
		.desktop.iconGridOrigin,
): Map<string, [number, number]> => {
	const metrics = classicyDesktopIconMetrics(theme);
	const [columns, rows] = createGrid(metrics, origin);
	const cells: [number, number][] = [];
	for (let col = 1; col < Math.max(2, columns); col++) {
		for (let row = 0; row < Math.max(1, rows); row++) {
			cells.push(classicyDesktopIconGridPosition(metrics, col, row, origin));
		}
	}
	const free = cells.slice();
	const lined = new Map<string, [number, number]>();
	for (const icon of icons) {
		if (icon.hidden || !icon.location || free.length === 0) continue;
		const [x, y] = icon.location;
		let best = 0;
		let bestDistance = Number.POSITIVE_INFINITY;
		free.forEach(([cx, cy], index) => {
			const distance = (cx - x) ** 2 + (cy - y) ** 2;
			if (distance < bestDistance) {
				bestDistance = distance;
				best = index;
			}
		});
		const [cell] = free.splice(best, 1);
		lined.set(icon.appId, cell);
	}
	return lined;
};

// Actions arrive untyped, and whatever lands here is persisted to localStorage,
// so balloon payloads are validated field by field rather than cast.
const readBalloonHelp = (
	value: unknown,
): ClassicyIconBalloonHelp | undefined => {
	if (typeof value !== "object" || value === null) return undefined;
	const candidate = value as Record<string, unknown>;
	if (typeof candidate.content !== "string") return undefined;
	return {
		content: candidate.content,
		title: typeof candidate.title === "string" ? candidate.title : undefined,
		position:
			typeof candidate.position === "string"
				? (candidate.position as ClassicyBalloonPosition)
				: undefined,
		delay: typeof candidate.delay === "number" ? candidate.delay : undefined,
	};
};

// The active package's grid origin, read store-free from the draft's
// packageId (never activeTheme.package): this module is in the reducer graph.
const iconGridOrigin = (ds: ClassicyStore) =>
	getClassicyAppearanceLayout(ds.System.Manager.Appearance.packageId).desktop
		.iconGridOrigin;

const SELECT_MODES: readonly ClassicyDesktopIconSelectMode[] = [
	"toggle",
	"range",
	"addRange",
];

/**
 * Records `iconId` as the desktop's anchor (`Desktop.selectionAnchor`, under
 * `layout.selection.modifiers` `"windows"`) and focus icon
 * (`Desktop.focusIcon`, under `layout.selection.iconNavigation` `"roving"`)
 * after a selection that makes it both, a plain click's or an arrow's (WIG
 * Ch.5 "Selection Adjustment", p.38: the anchor is the first click's
 * object). Session state, stripped by `sanitizeStateForPersistence`, and
 * written only under the active package's keys, so a package without them
 * keeps today's state.
 */
const recordAnchorAndFocusIcon = (ds: ClassicyStore, iconId: string) => {
	const layout = getClassicyAppearanceLayout(
		ds.System.Manager.Appearance.packageId,
	);
	if (classicyWindowsSelectionModifiers(layout))
		ds.System.Manager.Desktop.selectionAnchor = iconId;
	if (classicyIconsRoveFocus(layout))
		ds.System.Manager.Desktop.focusIcon = iconId;
};

export const classicyDesktopIconEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
) => {
	switch (action.type) {
		case "ClassicyDesktopIconCleanup": {
			ds.System.Manager.Desktop.icons = cleanupDesktopIcons(
				ds.System.Manager.Appearance.activeTheme,
				ds.System.Manager.Desktop.icons,
				iconGridOrigin(ds),
			);
			break;
		}
		case "ClassicyDesktopIconLineUp": {
			// Explorer's Line Up Icons (`useClassicyDesktopCommands`, under
			// `layout.finder.commands` "windows"): each icon to its nearest
			// free cell, the others' places kept.
			const lined = classicyDesktopLineUpLocations(
				ds.System.Manager.Appearance.activeTheme,
				ds.System.Manager.Desktop.icons,
				iconGridOrigin(ds),
			);
			for (const icon of ds.System.Manager.Desktop.icons) {
				const location = lined.get(icon.appId);
				if (location) icon.location = location;
			}
			break;
		}
		case "ClassicyDesktopIconSort": {
			const sortBy = hasSortBy(action) ? action.sortBy : "name";
			ds.System.Manager.Desktop.icons = cleanupDesktopIcons(
				ds.System.Manager.Appearance.activeTheme,
				sortDesktopIcons(
					ds.System.Manager.Desktop.icons,
					sortBy as "name" | "kind" | "label",
					ds.System.Manager.Appearance.packageId,
				),
				iconGridOrigin(ds),
			);
			break;
		}
		case "ClassicyDesktopIconFocus": {
			if (!hasIconId(action)) break;
			markAppFocused(ds, "Finder.app");
			ds.System.Manager.Desktop.selectedIcons = [action.iconId];
			recordAnchorAndFocusIcon(ds, action.iconId);
			break;
		}
		case "ClassicyDesktopIconSelect": {
			// A modified click or key on the desktop (5.10; WIG Ch.5
			// "Selection Adjustment", pp.38-39): Control or ⌘ toggles the
			// icon, Shift selects the anchor's rectangle to it, both set
			// that rectangle to the anchor's state
			// (`classicyDesktopIconSelection`). The icon becomes the focus
			// icon.
			if (!hasIconId(action)) break;
			const mode = action.mode as ClassicyDesktopIconSelectMode;
			if (!SELECT_MODES.includes(mode)) break;
			markAppFocused(ds, "Finder.app");
			const desktop = ds.System.Manager.Desktop;
			const next = classicyDesktopIconSelection(
				desktop.icons.filter((icon) => !icon.hidden),
				desktop.selectedIcons ?? [],
				desktop.selectionAnchor,
				action.iconId,
				mode,
				classicyDesktopIconMetrics(ds.System.Manager.Appearance.activeTheme)
					.cell,
			);
			desktop.selectedIcons = next.selected;
			desktop.selectionAnchor = next.anchor;
			desktop.focusIcon = action.iconId;
			break;
		}
		case "ClassicyDesktopIconMoveFocus": {
			// Control (⌘, Option) with a navigation key moves the focus icon
			// alone (5.18's desktop part; WIG Ch.5 "Disjoint Selection",
			// pp.43-44): the selection stays.
			if (!hasIconId(action)) break;
			ds.System.Manager.Desktop.focusIcon = action.iconId;
			break;
		}
		case "ClassicyDesktopIconSelectBox": {
			ds.System.Manager.Desktop.selectedIcons = hasIconIds(action)
				? (action.iconIds as string[])
				: [];
			break;
		}
		case "ClassicyDesktopIconClearFocus": {
			ds.System.Manager.Desktop.selectedIcons = [];
			break;
		}
		case "ClassicyDesktopIconOpen": {
			if (!hasIconId(action) || !hasDesktopAppRef(action)) break;
			ds.System.Manager.Desktop.selectedIcons = [action.iconId];
			openApp(ds, action.app.id, action.app.name, action.app.icon);
			break;
		}
		case "ClassicyDesktopIconAdd": {
			// TODO: We need to separate onClickFunc from here; it's being stored in the localstorage cache which
			// means it gets blown out after every session clear. An Event name and payload here would be better.
			if (!hasIconAddFields(action)) break;
			const icon = ds.System.Manager.Desktop.icons.filter(
				(i) => i.appId === action.app.id,
			);

			if (icon.length === 0) {
				const placed = Array.isArray(action.location);
				ds.System.Manager.Desktop.icons.push({
					icon: action.app.icon,
					appId: action.app.id,
					appName: action.app.name,
					location: Array.isArray(action.location)
						? (action.location as [number, number])
						: undefined,
					label: typeof action.label === "string" ? action.label : undefined,
					kind: typeof action.kind === "string" ? action.kind : "icon",
					onClickFunc:
						typeof action.onClickFunc === "function"
							? (action.onClickFunc as ClassicyStoreSystemDesktopManagerIcon["onClickFunc"])
							: undefined,
					event: typeof action.event === "string" ? action.event : undefined,
					eventData:
						typeof action.eventData === "object" && action.eventData !== null
							? (action.eventData as Record<string, unknown>)
							: undefined,
					noLaunch: action.noLaunch === true ? true : undefined,
					filePath:
						typeof action.filePath === "string" ? action.filePath : undefined,
					contextMenu: Array.isArray(action.contextMenu)
						? (action.contextMenu as ClassicyMenuItem[])
						: undefined,
					hidden: action.hidden === true ? true : undefined,
					inApplications: action.inApplications === false ? false : undefined,
					balloonHelp: readBalloonHelp(action.balloonHelp),
				});

				// An icon added at a location — an item dropped on the desktop —
				// goes exactly there and leaves the others where the user put
				// them. Otherwise the whole desktop is laid out afresh.
				if (!placed) {
					ds.System.Manager.Desktop.icons = cleanupDesktopIcons(
						ds.System.Manager.Appearance.activeTheme,
						sortDesktopIcons(
							ds.System.Manager.Desktop.icons,
							"kind",
							ds.System.Manager.Appearance.packageId,
						),
						iconGridOrigin(ds),
					);
				}
			} else {
				// Icons persist to localStorage, so an app whose registration
				// changed between sessions would otherwise keep its stale record
				// forever. Serializable, code-derived fields are refreshed on every
				// re-add; location and label are user state and are left alone.
				// appId alone is identity everywhere else that looks an icon up
				// (Move matches on appId alone; Remove treats appName as
				// optional), so requiring appName here too was the outlier: a
				// re-add whose appName changed took this "already exists" branch
				// (the presence check above also filters on appId alone) and then
				// found no `existing`, silently updating nothing.
				const existing = ds.System.Manager.Desktop.icons.find(
					(i) => i.appId === action.app.id,
				);
				if (existing) {
					// appName is code-derived (it's whatever the app/shortcut
					// registration says its name is), not user state like
					// location/label, so — by the same rule the fields below
					// follow — it refreshes on every re-add too. Left stale, this
					// would be a regression the appId-only lookup fix above
					// introduces: before that fix, a re-add with a changed
					// appName never reached this block at all, so nothing was
					// stale because nothing updated; now other fields refresh
					// but the name — the icon's alt text and, absent a `label`,
					// its caption — would silently keep lagging behind.
					existing.appName = action.app.name;
					// Code-derived too: the Trash swaps between empty and full.
					existing.icon = action.app.icon;
					if (Array.isArray(action.contextMenu)) {
						existing.contextMenu = action.contextMenu as ClassicyMenuItem[];
					} else if (
						action.contextMenu === null &&
						existing.contextMenu !== undefined
					) {
						// An explicit null takes a stored menu away (Finder's desktop
						// items once the package stops offering one); an omitted one
						// keeps it.
						delete existing.contextMenu;
					}
					// Icons persist to localStorage, so a shortcut whose target
					// changed between releases would keep the stale URL forever.
					// These are code-derived, not user state, so they are reset
					// unconditionally on every re-add — including back to
					// undefined when the action no longer supplies them (e.g. a
					// shortcut converted into a real app under the same appId).
					existing.event =
						typeof action.event === "string" ? action.event : undefined;
					existing.eventData =
						typeof action.eventData === "object" && action.eventData !== null
							? (action.eventData as Record<string, unknown>)
							: undefined;
					existing.noLaunch = action.noLaunch === true ? true : undefined;
					existing.filePath =
						typeof action.filePath === "string" ? action.filePath : undefined;
					const nextHidden = action.hidden === true ? true : undefined;
					const hiddenChanged = existing.hidden !== nextHidden;
					existing.hidden = nextHidden;
					existing.inApplications =
						action.inApplications === false ? false : undefined;
					existing.balloonHelp = readBalloonHelp(action.balloonHelp);

					// Hidden icons do not consume a grid slot, so a change in either
					// direction has to re-flow the remaining icons.
					if (hiddenChanged) {
						ds.System.Manager.Desktop.icons = cleanupDesktopIcons(
							ds.System.Manager.Appearance.activeTheme,
							ds.System.Manager.Desktop.icons,
							iconGridOrigin(ds),
						);
					}
				}
			}
			break;
		}

		case "ClassicyDesktopIconRemove": {
			if (!hasApp(action)) break;
			const appName =
				typeof (action.app as Record<string, unknown>).name === "string"
					? ((action.app as Record<string, unknown>).name as string)
					: undefined;
			const iconIdx = ds.System.Manager.Desktop.icons.findIndex(
				(icon) =>
					icon.appId === action.app.id &&
					(!appName || icon.appName === appName),
			);
			if (iconIdx > -1) {
				ds.System.Manager.Desktop.icons.splice(iconIdx, 1);
			}
			break;
		}
		case "ClassicyDesktopIconMove": {
			if (!hasIconLocation(action)) break;
			const iconIdx = ds.System.Manager.Desktop.icons.findIndex(
				(icon) => icon.appId === action.app.id,
			);
			if (iconIdx === -1) break;

			const selected = ds.System.Manager.Desktop.selectedIcons ?? [];
			const oldLocation = ds.System.Manager.Desktop.icons[iconIdx].location ?? [
				0, 0,
			];
			const newLocation: [number, number] = action.location;

			if (selected.length > 1 && selected.includes(action.app.id)) {
				const dx = newLocation[0] - oldLocation[0];
				const dy = newLocation[1] - oldLocation[1];
				for (const selId of selected) {
					const selIdx = ds.System.Manager.Desktop.icons.findIndex(
						(icon) => icon.appId === selId,
					);
					if (selIdx > -1) {
						const selLoc = ds.System.Manager.Desktop.icons[selIdx].location ?? [
							0, 0,
						];
						ds.System.Manager.Desktop.icons[selIdx].location = [
							selLoc[0] + dx,
							selLoc[1] + dy,
						];
					}
				}
			} else {
				ds.System.Manager.Desktop.icons[iconIdx].location = newLocation;
			}
			break;
		}
	}
	return ds;
};
