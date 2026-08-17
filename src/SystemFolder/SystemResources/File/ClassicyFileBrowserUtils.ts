import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { getIconSize } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";

const fileIcon = ClassicyIcons.system.files.file;
const directoryIcon = ClassicyIcons.system.folders.directory;

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
			return directoryIcon;
		}
		default: {
			return fileIcon;
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
 * The single definition of the icon-view lattice: `origin` is the top-left of
 * cell (0, 0) and `pitch` is the distance between adjacent cells. Both
 * `cleanupIcon` (which lays icons out) and the icons view's "Always snap to
 * grid" (which rounds a dropped icon) must use *this* lattice — computing
 * either one independently is how they drifted apart before, leaving snapped
 * icons on half-rows that overlapped the row above.
 *
 * `pitch` is deliberately `iconSize * 2` rather than `iconSize * 2 +
 * iconPadding`: an icon's label is wider than the icon, so a Mac OS 8 icon
 * cell is two icon-widths across, and the padding is the *margin* before the
 * first cell, not part of the repeat.
 */
export const iconGridLattice = (
	theme: ClassicyTheme,
	iconSizeOverride?: number,
): { origin: [number, number]; pitch: [number, number] } => {
	const [themeIconSize, iconPadding] = getIconSize(theme);
	const iconSize = iconSizeOverride ?? themeIconSize;
	const step = iconSize * 2;
	return { origin: [iconPadding, iconPadding], pitch: [step, step] };
};

export const cleanupIcon = (
	theme: ClassicyTheme,
	iconIndex: number,
	_iconTotal: number,
	containerMeasure: [number, number],
	iconSizeOverride?: number,
): [number, number] => {
	const [themeIconSize, iconPadding] = getIconSize(theme);
	const iconSize = iconSizeOverride ?? themeIconSize;
	const grid = createGrid(iconSize, iconPadding, containerMeasure);
	const [startX, startY] = getGridPosition(iconIndex, grid);
	const { origin, pitch } = iconGridLattice(theme, iconSizeOverride);

	return [
		origin[0] + Math.floor(pitch[0] * startX),
		origin[1] + Math.floor(pitch[1] * startY),
	];
};
