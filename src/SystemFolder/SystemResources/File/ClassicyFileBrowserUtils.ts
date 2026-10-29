import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { readClassicyThemeVar } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricReader";
import {
	type ClassicyDesktopIconMetrics,
	classicyDesktopIconMetrics,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";

export const capitalizeFirst = (s: string) => {
	return s && String(s[0]).toUpperCase() + String(s).slice(1);
};

/**
 * Human-readable label for a ClassicyFileSystemEntryFileType value in file
 * listings ("app_shortcut" → "Application", "text_file" → "Text file").
 */
export const fileTypeDisplayName = (fileType: string) => {
	if (fileType === "app_shortcut") return "Application";
	return capitalizeFirst(fileType.replaceAll("_", " "));
};

export const iconImageByType = (byType: string) => {
	switch (byType) {
		case "directory": {
			return resolveClassicyAsset("icons", "system.folders.directory") ?? "";
		}
		default: {
			return resolveClassicyAsset("icons", "system.files.file") ?? "";
		}
	}
};

export const createGrid = (
	iconSize: number,
	iconPadding: number,
	containerMeasure: [number, number],
): [number, number] => {
	return [
		Math.floor(containerMeasure[0] / (iconSize * 2 + iconPadding)),
		Math.floor(containerMeasure[1] / (iconSize * 2 + iconPadding)),
	];
};

export const getGridPosition = (
	i: number,
	grid: [number, number],
): [number, number] => {
	return [i % grid[0], Math.floor(i / grid[0])];
};

/**
 * The desktop-icon metrics as the desktop draws them: `--desktop-icon-size`,
 * `--desktop-icon-padding` and `--desktop-icon-cell` read from
 * `#classicyDesktop`, each falling back to `theme`'s own value
 * (`classicyDesktopIconMetrics`) before the desktop mounts or with no DOM.
 * The two agree whenever the desktop's inline variables are the theme's.
 *
 * Render and handler code only — never a reducer path. Each call forces a
 * style read: read once per layout pass or theme and pass the result on.
 */
export const readClassicyDesktopIconMetrics = (
	theme: ClassicyTheme,
	el?: Element | null,
): ClassicyDesktopIconMetrics => {
	const fromTheme = classicyDesktopIconMetrics(theme);
	return {
		size: readClassicyThemeVar("--desktop-icon-size", fromTheme.size, el),
		padding: readClassicyThemeVar(
			"--desktop-icon-padding",
			fromTheme.padding,
			el,
		),
		cell: readClassicyThemeVar("--desktop-icon-cell", fromTheme.cell, el),
	};
};

/**
 * The single definition of the icon-view lattice: `origin` is the top-left of
 * cell (0, 0) and `pitch` is the distance between adjacent cells. Both
 * `cleanupIcon` (which lays icons out) and the icons view's "Always snap to
 * grid" (which rounds a dropped icon) must use *this* lattice — computing
 * either one independently is how they drifted apart before, leaving snapped
 * icons on half-rows that overlapped the row above.
 *
 * `pitch` is the cell, `--desktop-icon-cell` (two icon widths), rather than
 * cell plus padding: an icon's label is wider than the icon, so a Mac OS 8
 * icon cell is two icon-widths across, and the padding is the *margin* before
 * the first cell, not part of the repeat. An `iconSizeOverride` (the icon
 * view's size option) makes the cell two override widths instead.
 *
 * `metrics` defaults to a live read (`readClassicyDesktopIconMetrics`); a
 * caller laying out many icons reads once and passes them in.
 */
export const iconGridLattice = (
	theme: ClassicyTheme,
	iconSizeOverride?: number,
	metrics: ClassicyDesktopIconMetrics = readClassicyDesktopIconMetrics(theme),
): { origin: [number, number]; pitch: [number, number] } => {
	const step =
		iconSizeOverride !== undefined ? iconSizeOverride * 2 : metrics.cell;
	return {
		origin: [metrics.padding, metrics.padding],
		pitch: [step, step],
	};
};

/**
 * Where icon `iconIndex` of an icon view sits, on the `iconGridLattice`.
 * `metrics` defaults to a live read, as for `iconGridLattice`; pass them in
 * when laying out more than one icon.
 */
export const cleanupIcon = (
	theme: ClassicyTheme,
	iconIndex: number,
	_iconTotal: number,
	containerMeasure: [number, number],
	iconSizeOverride?: number,
	metrics: ClassicyDesktopIconMetrics = readClassicyDesktopIconMetrics(theme),
): [number, number] => {
	const { origin, pitch } = iconGridLattice(theme, iconSizeOverride, metrics);
	// createGrid doubles an icon size into the cell, so half the pitch counts
	// columns on the very lattice the icons are placed on.
	const grid = createGrid(pitch[0] / 2, metrics.padding, containerMeasure);
	const [startX, startY] = getGridPosition(iconIndex, grid);

	return [
		origin[0] + Math.floor(pitch[0] * startX),
		origin[1] + Math.floor(pitch[1] * startY),
	];
};
