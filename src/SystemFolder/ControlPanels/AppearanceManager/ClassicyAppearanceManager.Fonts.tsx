import { type ChangeEvent, useMemo } from "react";
import type { ClassicyThemeTypography } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicySpinner } from "@/SystemFolder/SystemResources/Spinner/ClassicySpinner";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

const ClassicyFonts = [
	{ label: "Charcoal", value: "Charcoal" },
	{ label: "ChicagoFLF", value: "ChicagoFLF" },
	{ label: "Geneva", value: "Geneva" },
	{ label: "AppleGaramond", value: "AppleGaramond" },
	{ label: "Monaco", value: "Monaco" },
	{ label: "Digital", value: "VCR OSD Mono" },
];

const FONT_MIN_SIZE = 8;
const FONT_MAX_SIZE = 72;

interface FontsTabProps {
	typography: ClassicyThemeTypography;
	changeFont: (e: ChangeEvent<HTMLSelectElement>) => void;
	changeFontSize: (fontType: string, size: number) => void;
}

export const useFontsTab = ({
	typography,
	changeFont,
	changeFontSize,
}: FontsTabProps): TabIndividual =>
	useMemo(
		() => ({
			title: "Fonts",
			children: (
				<div className={"classicyAppearanceManagerFontsColumn"}>
					<div className={"classicyAppearanceManagerFontsRow"}>
						<div className={"classicyAppearanceManagerFontsLabel"}>
							<ClassicyControlLabel
								label={"System Font"}
								direction={"left"}
							/>
						</div>
						<ClassicyPopUpMenu
							id={"ui"}
							options={ClassicyFonts}
							selected={typography.ui}
							onChangeFunc={changeFont}
						/>
						<ClassicySpinner
							id={"uiSize"}
							prefillValue={typography.uiSize}
							minValue={FONT_MIN_SIZE}
							maxValue={FONT_MAX_SIZE}
							onChangeFunc={(e) =>
								changeFontSize("uiSize", Number(e.target.value))
							}
						/>
					</div>
					<div className={"classicyAppearanceManagerFontsRow"}>
						<div className={"classicyAppearanceManagerFontsLabel"}>
							<ClassicyControlLabel
								label={"Small System Font"}
								direction={"left"}
							/>
						</div>
						<ClassicyPopUpMenu
							id={"body"}
							options={ClassicyFonts}
							selected={typography.body}
							onChangeFunc={changeFont}
						/>
						<ClassicySpinner
							id={"bodySize"}
							prefillValue={typography.bodySize}
							minValue={FONT_MIN_SIZE}
							maxValue={FONT_MAX_SIZE}
							onChangeFunc={(e) =>
								changeFontSize("bodySize", Number(e.target.value))
							}
						/>
					</div>
					<div className={"classicyAppearanceManagerFontsRow"}>
						<div className={"classicyAppearanceManagerFontsLabel"}>
							<ClassicyControlLabel label={"Header Font"} direction={"left"} />
						</div>
						<ClassicyPopUpMenu
							id={"header"}
							options={ClassicyFonts}
							selected={typography.header}
							onChangeFunc={changeFont}
						/>
						<ClassicySpinner
							id={"headerSize"}
							prefillValue={typography.headerSize}
							minValue={FONT_MIN_SIZE}
							maxValue={FONT_MAX_SIZE}
							onChangeFunc={(e) =>
								changeFontSize("headerSize", Number(e.target.value))
							}
						/>
					</div>
					<div className={"classicyAppearanceManagerFontsRow"}>
						<div className={"classicyAppearanceManagerFontsLabel"}>
							<ClassicyControlLabel
								label={"Monospaced Font"}
								direction={"left"}
							/>
						</div>
						<ClassicyPopUpMenu
							id={"mono"}
							options={ClassicyFonts}
							selected={typography.mono}
							onChangeFunc={changeFont}
						/>
						<ClassicySpinner
							id={"monoSize"}
							prefillValue={typography.monoSize}
							minValue={FONT_MIN_SIZE}
							maxValue={FONT_MAX_SIZE}
							onChangeFunc={(e) =>
								changeFontSize("monoSize", Number(e.target.value))
							}
						/>
					</div>
					<div className={"classicyAppearanceManagerFontsRow"}>
						<div className={"classicyAppearanceManagerFontsLabel"}>
							<ClassicyControlLabel label={"Digital Font"} direction={"left"} />
						</div>
						<ClassicyPopUpMenu
							id={"digital"}
							options={ClassicyFonts}
							selected={typography.digital}
							onChangeFunc={changeFont}
						/>
						<ClassicySpinner
							id={"digitalSize"}
							prefillValue={typography.digitalSize}
							minValue={FONT_MIN_SIZE}
							maxValue={FONT_MAX_SIZE}
							onChangeFunc={(e) =>
								changeFontSize("digitalSize", Number(e.target.value))
							}
						/>
					</div>
				</div>
			),
		}),
		[typography, changeFont, changeFontSize],
	);
