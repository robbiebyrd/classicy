import { type ChangeEvent, useMemo } from "react";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { ClassicyWallpapers } from "./ClassicyWallpapers";

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

interface DesktopTabProps {
	/** Current background image URL (resolved), or a stand-in for none. */
	bg: string;
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
								options={ClassicyWallpapers}
								onChangeFunc={changeBackground}
								// Option values are the full resolved wallpaper URLs, so
								// the stored URL matches one directly. A user-supplied
								// picture matches none and shows the placeholder.
								selected={bg}
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
			bgPosition,
			bgRepeat,
			sizeOption,
			changeBackground,
			setBackgroundURL,
			alignBackground,
			repeatBackground,
			backgroundSize,
		],
	);
};
