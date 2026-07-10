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

export const cleanupIcon = (
	theme: ClassicyTheme,
	iconIndex: number,
	_iconTotal: number,
	containerMeasure: [number, number],
): [number, number] => {
	const [iconSize, iconPadding] = getIconSize(theme);
	const grid = createGrid(iconSize, iconPadding, containerMeasure);
	const [startX, startY] = getGridPosition(iconIndex, grid);

	return [
		iconPadding + Math.floor(iconSize * 2 * startX),
		iconPadding + Math.floor(iconSize * 2 * startY),
	];
};
