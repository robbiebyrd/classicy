import { type ChangeEvent, useMemo } from "react";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { ClassicyWallpapers } from "./ClassicyWallpapers";

interface DesktopTabProps {
	bg: string;
	changeBackground: (e: ChangeEvent<HTMLSelectElement>) => void;
	setBackgroundURL: (e: ChangeEvent<HTMLInputElement>) => void;
	alignBackground: (e: ChangeEvent<HTMLSelectElement>) => void;
	repeatBackground: (e: ChangeEvent<HTMLSelectElement>) => void;
	backgroundSize: (e: ChangeEvent<HTMLSelectElement>) => void;
}

export const useDesktopTab = ({
	bg,
	changeBackground,
	setBackgroundURL,
	alignBackground,
	repeatBackground,
	backgroundSize,
}: DesktopTabProps): TabIndividual =>
	useMemo(
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
								selected={bg.split("/").pop()}
							></ClassicyPopUpMenu>
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
										small={false}
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
										selected={"center"}
									/>
								</div>
								<div className={"classicyAppearanceManagerDesktopOptionsRow"}>
									<ClassicyControlLabel label={"Repeat"} direction={"left"} />
									<ClassicyPopUpMenu
										onChangeFunc={repeatBackground}
										id={"repeat_background_image"}
										small={false}
										options={[
											{ value: "repeat", label: "Repeat" },
											{ value: "repeat-x", label: "Repeat Horizontally" },
											{ value: "repeat-y", label: "Repeat Vertically" },
											{ value: "no-repeat", label: "No Repeat" },
										]}
										selected={"repeat"}
									/>
								</div>
								<div className={"classicyAppearanceManagerDesktopOptionsRow"}>
									<ClassicyControlLabel label={"Size"} direction={"left"} />
									<ClassicyPopUpMenu
										onChangeFunc={backgroundSize}
										id={"repeat_background_image"}
										small={false}
										options={[
											{ value: "normal", label: "Normal" },
											{ value: "cover", label: "Stretch" },
											{ value: "contain", label: "Fill" },
										]}
										selected={"repeat"}
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
			changeBackground,
			setBackgroundURL,
			alignBackground,
			repeatBackground,
			backgroundSize,
		],
	);
