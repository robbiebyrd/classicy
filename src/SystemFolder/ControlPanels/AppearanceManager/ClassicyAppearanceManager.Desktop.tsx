import { type ChangeEvent, useMemo } from "react";
import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import { useClassicyAssetTree } from "@/Appearance/ClassicyAssetRegistry";
import { portableClassicyWallpaper } from "@/Appearance/ClassicyWallpaperIndex";
import { isSafeClassicyThemeBackgroundImage } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

/**
 * The Size pop-up's three choices. "auto" is the CSS keyword for an image
 * at its natural size ("Normal"); the old "normal" value was not valid CSS.
 */
export type ClassicyBackgroundSizeOption = "auto" | "cover" | "contain";

/**
 * Map a stored `desktop.backgroundSize` onto a Size pop-up choice. Only the
 * `cover`/`contain` keywords have their own entries; everything else —
 * "auto", the "100%" many bundled themes ship with, numeric percentages,
 * or any other CSS length — reads as "Normal".
 */
export const classicyBackgroundSizeOption = (
	size: number | string | undefined,
): ClassicyBackgroundSizeOption =>
	size === "cover" || size === "contain" ? size : "auto";

/**
 * True for what the Picture field may set as the desktop picture: an absolute
 * http(s) URL the theme schema accepts. A relative path is refused: it means
 * nothing on another host, and a theme renders only registered wallpapers
 * and URLs.
 */
export const isClassicyBackgroundPictureUrl = (url: string): boolean =>
	/^https?:\/\//i.test(url) && isSafeClassicyThemeBackgroundImage(url);

interface DesktopTabProps {
	/** Current background image URL (resolved), or a stand-in for none. */
	bg: string;
	/**
	 * The edited theme's Appearance Package (default: Platinum). Options
	 * name its own wallpapers by filename and another package's as
	 * `<package>|<file>`, so two packages' same filename stay two choices.
	 */
	themePackage?: string;
	/** Current `desktop.backgroundPosition`. */
	bgPosition?: string | number;
	/** Current `desktop.backgroundRepeat`. */
	bgRepeat?: string;
	/** Current `desktop.backgroundSize` (any stored form). */
	bgSize?: number | string;
	changeBackground: (e: ChangeEvent<HTMLSelectElement>) => void;
	setBackgroundURL: (e: ChangeEvent<HTMLInputElement>) => void;
	alignBackground: (e: ChangeEvent<HTMLSelectElement>) => void;
	repeatBackground: (e: ChangeEvent<HTMLSelectElement>) => void;
	backgroundSize: (e: ChangeEvent<HTMLSelectElement>) => void;
}

export const useDesktopTab = ({
	bg,
	themePackage = CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
	bgPosition = "center",
	bgRepeat = "repeat",
	bgSize = "auto",
	changeBackground,
	setBackgroundURL,
	alignBackground,
	repeatBackground,
	backgroundSize,
}: DesktopTabProps): TabIndividual => {
	const sizeOption = classicyBackgroundSizeOption(bgSize);
	const wallpapers = useClassicyAssetTree("wallpapers");
	// Option values are what ClassicyDesktopChangeBackground stores: a
	// registered wallpaper's filename, or `<package>|<file>` for one of
	// neither the theme's package nor Platinum, or Platinum's that the
	// theme's package shadows (its source,
	// for one registered without a file), so the resolved `bg` is matched the
	// same way.
	const wallpaperOptions = useMemo(
		() =>
			Object.entries(wallpapers)
				.filter(([, value]) => typeof value === "string")
				.map(([label, value]) => ({
					label,
					value: portableClassicyWallpaper(value as string, themePackage),
				})),
		[wallpapers, themePackage],
	);
	const selected = portableClassicyWallpaper(bg, themePackage);
	return useMemo(
		() => ({
			title: "Desktop",
			children: (
				<>
					<div className={"classicyAppearanceManagerDesktopRow"}>
						<img
							draggable={false}
							src={bg}
							className={"classicyAppearanceManagerDesktopPreview"}
							alt={"Background"}
						/>
						<div className={"classicyAppearanceManagerDesktopControls"}>
							<ClassicyControlLabel label={"Patterns"} direction={"left"} />
							<ClassicyPopUpMenu
								id={"bg"}
								options={wallpaperOptions}
								onChangeFunc={changeBackground}
								// A user-supplied picture matches no option and shows
								// the placeholder.
								selected={selected}
								placeholder={"Custom"}
							/>
							<br />
							<ClassicyControlLabel label={"Picture"} direction={"left"} />
							<ClassicyInput
								id={"custom_background_image_url"}
								onChangeFunc={setBackgroundURL}
							/>
							<br />
							<div className={"classicyAppearanceManagerDesktopOptionsColumn"}>
								<div className={"classicyAppearanceManagerDesktopOptionsRow"}>
									<ClassicyControlLabel label={"Align"} direction={"left"} />
									<ClassicyPopUpMenu
										onChangeFunc={alignBackground}
										id={"position_custom_background_image"}
										options={[
											{ value: "center", label: "Center" },
											{ value: "top left", label: "Top Left" },
											{ value: "top right", label: "Top Right" },
											{ value: "top center", label: "Top Center" },
											{ value: "bottom left", label: "Bottom Left" },
											{ value: "bottom right", label: "Bottom Right" },
											{ value: "bottom center", label: "Bottom Center" },
											// { value: 'tile', label: 'Tile on Screen' },
										]}
										selected={String(bgPosition)}
										placeholder={"Custom"}
									/>
								</div>
								<div className={"classicyAppearanceManagerDesktopOptionsRow"}>
									<ClassicyControlLabel label={"Repeat"} direction={"left"} />
									<ClassicyPopUpMenu
										onChangeFunc={repeatBackground}
										id={"repeat_background_image"}
										options={[
											{ value: "repeat", label: "Repeat" },
											{ value: "repeat-x", label: "Repeat Horizontally" },
											{ value: "repeat-y", label: "Repeat Vertically" },
											{ value: "no-repeat", label: "No Repeat" },
										]}
										selected={bgRepeat}
										placeholder={"Custom"}
									/>
								</div>
								<div className={"classicyAppearanceManagerDesktopOptionsRow"}>
									<ClassicyControlLabel label={"Size"} direction={"left"} />
									<ClassicyPopUpMenu
										onChangeFunc={backgroundSize}
										id={"size_background_image"}
										options={[
											{ value: "auto", label: "Normal" },
											{ value: "cover", label: "Stretch" },
											{ value: "contain", label: "Fill" },
										]}
										selected={sizeOption}
									/>
								</div>
							</div>
						</div>
					</div>
				</>
			),
		}),
		[
			bg,
			selected,
			bgPosition,
			bgRepeat,
			sizeOption,
			changeBackground,
			setBackgroundURL,
			alignBackground,
			repeatBackground,
			backgroundSize,
			wallpaperOptions,
		],
	);
};
