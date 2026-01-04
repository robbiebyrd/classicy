import { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { getIconSize } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";
import directoryIcon from "@img/icons/system/folders/directory.png";
import fileIcon from "@img/icons/system/files/file.png";

export const capitalizeFirst = (s: string) => {
  return s && String(s[0]).toUpperCase() + String(s).slice(1);
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
  iconTotal: number,
  containerMeasure: [number, number],
): [number, number] => {
  const [iconSize, iconPadding] = getIconSize(theme);
  const grid = createGrid(iconSize, iconTotal, containerMeasure);
  const [startX, startY] = getGridPosition(iconIndex, grid);

  return [
    iconPadding + Math.floor(iconSize * 2 * startX),
    iconPadding + Math.floor(iconSize * 2 * startY),
  ];
};
