// Platinum's wallpapers, the files in the package's assets/wallpapers (moved
// out of the core's assets/img/wallpapers, plan 0015-kxa §3.3; its photos/
// folder is read by nothing and matched by no glob). Importing
// platinumAssets.ts registers them (`registerClassicyWallpapers`, with each
// filename as its `file`); the core resolves a theme's wallpaper filename
// through the asset registry (`resolveClassicyWallpaper`), never through this
// module.

const wallpaperModules = import.meta.glob(
	"../../assets/wallpapers/*.{png,jpg}",
	{ eager: true, import: "default" },
) as Record<string, string>;

/** This build's URL for a Platinum wallpaper file, or "" when there is none. */
export const platinumWallpaperUrl = (file: string): string =>
	wallpaperModules[`../../assets/wallpapers/${file}`] ?? "";

/**
 * Platinum's 47 wallpapers: the Desktop tab's label and the filename themes
 * name them by (`platinum.json`'s presets, saved themes, theme files).
 */
export const PLATINUM_WALLPAPERS: ReadonlyArray<{
	label: string;
	file: string;
}> = [
	{ label: "Azul Dark", file: "azul_dark.png" },
	{ label: "Azul Extra Light", file: "azul_extra_light.png" },
	{ label: "Azul Light", file: "azul_light.png" },
	{ label: "Bondi", file: "bondi.png" },
	{ label: "Bondi Dark", file: "bondi_dark.png" },
	{ label: "Bondi Extra Dark", file: "bondi_extra_dark.png" },
	{ label: "Bondi Light", file: "bondi_light.png" },
	{ label: "Bondi Medium", file: "bondi_medium.png" },
	{ label: "Bossanova Bondi", file: "bossanova_bondi.png" },
	{ label: "Bossanova Poppy", file: "bossanova_poppy.png" },
	{ label: "Bossanova Poppy 2", file: "bossanova_poppy_2.png" },
	{ label: "Bubbles Bondi", file: "bubbles_bondi.png" },
	{ label: "Bubbles Poppy", file: "bubbles_poppy.png" },
	{ label: "Candy Bar", file: "candy_bar.png" },
	{ label: "Candy Bar Azul", file: "candy_bar_azul.png" },
	{ label: "Candy Bar Pistachio", file: "candy_bar_pistachio.png" },
	{ label: "Candy Bar Sunny", file: "candy_bar_sunny.png" },
	{ label: "Default", file: "default.png" },
	{ label: "Default Photo", file: "default.jpg" },
	{ label: "Diagonals Bondi", file: "diagonals_bondi.png" },
	{ label: "Diagonals Bondi Dark", file: "diagonals_bondi_dark.png" },
	{ label: "Diagonals Poppy", file: "diagonals_poppy.png" },
	{ label: "Flat Peanuts", file: "flat_peanuts.png" },
	{ label: "Flat Peanuts Poppy", file: "flat_peanuts_poppy.png" },
	{ label: "French Blue Dark", file: "french_blue_dark.png" },
	{ label: "French Blue Light", file: "french_blue_light.png" },
	{ label: "MacOS", file: "macos.png" },
	{ label: "Peanuts Azul", file: "peanuts_azul.png" },
	{ label: "Peanuts Pistachio", file: "peanuts_pistachio.png" },
	{ label: "Pistachio Dark", file: "pistachio_dark.png" },
	{ label: "Pistachio Light", file: "pistachio_light.png" },
	{ label: "Pistachio Medium", file: "pistachio_medium.png" },
	{ label: "Poppy", file: "poppy.png" },
	{ label: "Poppy Dark", file: "poppy_dark.png" },
	{ label: "Poppy Light", file: "poppy_light.png" },
	{ label: "Poppy Medium", file: "poppy_medium.png" },
	{ label: "Rio Azul", file: "rio_azul.png" },
	{ label: "Rio Pistachio", file: "rio_pistachio.png" },
	{ label: "Ripple Azul", file: "ripple_azul.png" },
	{ label: "Ripple Bondi", file: "ripple_bondi.png" },
	{ label: "Ripple Poppy", file: "ripple_poppy.png" },
	{ label: "Sunny", file: "sunny.png" },
	{ label: "Sunny Dark", file: "sunny_dark.png" },
	{ label: "Sunny Light", file: "sunny_light.png" },
	{ label: "Waves Azul", file: "waves_azul.png" },
	{ label: "Waves Bondi", file: "waves_bondi.png" },
	{ label: "Waves Sunny", file: "waves_sunny.png" },
];
