/**
 * The taskbar menu's window arrangements (plan 0020-w98 E1): Cascade Windows,
 * Tile Windows Horizontally and Tile Windows Vertically, as pure functions of
 * the windows' rects and the work area, so their geometry is read without a
 * layout. They follow Windows' own `CascadeWindows` and `TileWindows`
 * (ReactOS `win32ss/user/user32/windows/mdi.c`, which explorer's tray calls
 * with no parent: the desktop's top-level windows in the work area), in
 * whole pixels. Internal: not exported from the package.
 */

/** A window's outer rect: its frame's left and top, width and height. */
export type ClassicyArrangeRect = {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
};

/** The work area the windows are arranged in: the desktop less its bands. */
export type ClassicyArrangeArea = {
	readonly left: number;
	readonly top: number;
	readonly right: number;
	readonly bottom: number;
};

/** A window to arrange. */
export type ClassicyArrangeWindow = {
	/**
	 * Its outer rect, frame included, as it would be restored: a maximized
	 * window is restored before it is arranged, as `CascadeWindows` and
	 * `TileWindows` call `ShowWindow(SW_RESTORE)` on a zoomed window first.
	 */
	readonly rect: ClassicyArrangeRect;
	/** It has a sizing frame (`WS_THICKFRAME`): `resizable`. */
	readonly sizable: boolean;
	/**
	 * Its least outer size, frame included (`WM_GETMINMAXINFO`'s
	 * `ptMinTrackSize`, which `QuerySizeFix` applies).
	 */
	readonly minimum: readonly [number, number];
};

/**
 * Which way Tile Windows lays the windows: `"horizontally"` stacks them one
 * above another, each the work area's width (Windows' Tile Windows
 * Horizontally, `MDITILE_HORIZONTAL`); `"vertically"` sets them side by side,
 * each its height (Tile Windows Vertically).
 */
export type ClassicyTileOrientation = "horizontally" | "vertically";

/**
 * The rects Cascade Windows gives `windows` (front first, in stacking order),
 * index for index. `CascadeWindows` walks the windows from the back: the
 * backmost goes to the work area's top-left, each next one `step` (SM_CXSIZEFRAME
 * plus SM_CXSIZE, SM_CYSIZEFRAME plus SM_CYSIZE) further down and right, and
 * one that would cross the area's right or bottom edge starts again from its
 * left or top, so the front window lands last and stays in front. While more
 * than one window is arranged, a sizable window's size is held between 4/7
 * and 5/7 of the area's (whole-pixel quotients, as C's integer division
 * gives them) and kept at its minimum; a window that does not size keeps its
 * size.
 */
export function classicyCascadeRects(
	windows: readonly ClassicyArrangeWindow[],
	area: ClassicyArrangeArea,
	step: readonly [number, number],
): ClassicyArrangeRect[] {
	const width = area.right - area.left;
	const height = area.bottom - area.top;
	const rects = new Array<ClassicyArrangeRect>(windows.length);
	let x = area.left;
	let y = area.top;
	for (let i = windows.length - 1; i >= 0; i--) {
		const window = windows[i];
		let cx = Math.round(window.rect.width);
		let cy = Math.round(window.rect.height);
		if (windows.length !== 1 && window.sizable) {
			const cxNew = Math.max(
				Math.min(cx, Math.floor((width * 5) / 7)),
				Math.floor((width * 4) / 7),
			);
			const cyNew = Math.max(
				Math.min(cy, Math.floor((height * 5) / 7)),
				Math.floor((height * 4) / 7),
			);
			if (cx !== cxNew || cy !== cyNew) {
				cx = Math.max(cxNew, Math.round(window.minimum[0]));
				cy = Math.max(cyNew, Math.round(window.minimum[1]));
			}
		}
		if (x + cx > area.right) x = area.left;
		if (y + cy > area.bottom) y = area.top;
		rects[i] = { left: x, top: y, width: cx, height: cy };
		x += step[0];
		y += step[1];
	}
	return rects;
}

/** The grid Tile Windows lays `count` windows in. */
export type ClassicyTileGrid = {
	readonly rows: number;
	readonly columns: number;
	/** One cell's width and height, whole pixels. */
	readonly cell: readonly [number, number];
};

/**
 * The grid `TileWindows` lays `count` windows in. Tiled horizontally, they
 * start in one column, one row each, and while each row would be shorter
 * than three times `minimum`'s height (SM_CYMIN) and a column wider than
 * twice its width (SM_CXMIN), another column is added; tiled vertically, the
 * same with rows and columns exchanged. Pure.
 */
export function classicyTileGrid(
	count: number,
	area: ClassicyArrangeArea,
	minimum: readonly [number, number],
	orientation: ClassicyTileOrientation,
): ClassicyTileGrid {
	const n = Math.max(1, Math.floor(count));
	const width = area.right - area.left;
	const height = area.bottom - area.top;
	const cxMin2 = minimum[0] * 2;
	const cyMin3 = minimum[1] * 3;
	let rows = orientation === "horizontally" ? n : 1;
	let columns = orientation === "horizontally" ? 1 : n;
	for (;;) {
		const cxCell = Math.floor(width / columns);
		const cyCell = Math.floor(height / rows);
		if (orientation === "horizontally") {
			if (cxCell <= cxMin2 || cyCell >= cyMin3 || columns >= n)
				return { rows, columns, cell: [cxCell, cyCell] };
			columns++;
			rows = Math.ceil(n / columns);
		} else {
			if (cyCell <= cyMin3 || cxCell >= cxMin2 || rows >= n)
				return { rows, columns, cell: [cxCell, cyCell] };
			rows++;
			columns = Math.ceil(n / rows);
		}
	}
}

/**
 * The rects Tile Windows gives `windows` (front first, in stacking order),
 * index for index, in `classicyTileGrid`'s grid. `TileWindows` walks them
 * from the back, filling each column top to bottom when tiled horizontally
 * (each row left to right when tiled vertically), so the front window takes
 * the last cell. A sizable window takes its cell's size, never below its
 * minimum; one that does not size keeps its size at its cell's top-left.
 */
export function classicyTileRects(
	windows: readonly ClassicyArrangeWindow[],
	area: ClassicyArrangeArea,
	minimum: readonly [number, number],
	orientation: ClassicyTileOrientation,
): ClassicyArrangeRect[] {
	const grid = classicyTileGrid(windows.length, area, minimum, orientation);
	const [cxCell, cyCell] = grid.cell;
	const rects = new Array<ClassicyArrangeRect>(windows.length);
	let x = area.left;
	let y = area.top;
	let row = 0;
	let column = 0;
	for (let i = windows.length - 1; i >= 0; i--) {
		const window = windows[i];
		const cx = window.sizable
			? Math.max(cxCell, Math.round(window.minimum[0]))
			: Math.round(window.rect.width);
		const cy = window.sizable
			? Math.max(cyCell, Math.round(window.minimum[1]))
			: Math.round(window.rect.height);
		rects[i] = { left: x, top: y, width: cx, height: cy };
		if (orientation === "horizontally") {
			y += cyCell;
			if (++row >= grid.rows) {
				row = 0;
				column++;
				x += cxCell;
				y = area.top;
			}
		} else {
			x += cxCell;
			if (++column >= grid.columns) {
				column = 0;
				row++;
				x = area.left;
				y += cyCell;
			}
		}
	}
	return rects;
}

/**
 * The caption font's average character width that Windows 98's SM_CXMIN
 * counts four of, in px: MS Sans Serif bold at 8 points, the caption font of
 * every Windows 98 scheme but the large ones.
 */
export const CLASSICY_CAPTION_AVERAGE_CHARACTER_WIDTH = 7;

/** The theme lengths the arrangements are measured in, in px. */
export type ClassicyArrangeThemeMetrics = {
	/** `--window-title-bar-height`: SM_CXSIZE and SM_CYSIZE. */
	readonly titleBarHeight: number;
	/** `--window-frame-inset`: SM_CXFRAME, SM_CXSIZEFRAME. */
	readonly frame: number;
	/** `--window-border-size`: the caption's border, SM_CYCAPTION less SM_CYSIZE. */
	readonly border: number;
};

/**
 * Cascade Windows' step and Tile Windows' least window, from the theme, as
 * Wine computes the system metrics: the step is SM_CXSIZEFRAME plus
 * SM_CXSIZE across (and the same down), the frame-edge corner arms' length;
 * SM_CXMIN is three caption buttons, the caption's height, four average
 * caption characters, the two frames and 4; SM_CYMIN is the caption
 * (SM_CYCAPTION) and the two frames. Each is rounded to a whole pixel, as
 * the system metrics are integers (a theme's derived lengths may not be).
 * Pure.
 */
export function classicyArrangeMetrics({
	titleBarHeight,
	frame,
	border,
}: ClassicyArrangeThemeMetrics): {
	step: [number, number];
	minimum: [number, number];
} {
	const stepLength = Math.round(frame + titleBarHeight);
	return {
		step: [stepLength, stepLength],
		minimum: [
			Math.round(
				4 * titleBarHeight +
					4 * CLASSICY_CAPTION_AVERAGE_CHARACTER_WIDTH +
					2 * frame +
					4,
			),
			Math.round(titleBarHeight + border + 2 * frame),
		],
	};
}
