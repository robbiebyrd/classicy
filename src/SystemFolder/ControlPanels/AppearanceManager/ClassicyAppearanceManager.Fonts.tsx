import { useMemo } from "react";
import { useClassicyAssetTree } from "@/Appearance/ClassicyAssetRegistry";
import type { ClassicyThemeTypography } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicySpinner } from "@/SystemFolder/SystemResources/Spinner/ClassicySpinner";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { primaryFontFamily } from "./ClassicyFontStack";

/** Display labels for families whose CSS name is not what the tab shows. */
const CLASSICY_FONT_LABELS: Record<string, string> = {
	"VCR OSD Mono": "Digital",
};

const FONT_MIN_SIZE = 8;
const FONT_MAX_SIZE = 72;

interface FontsTabProps {
	typography: ClassicyThemeTypography;
	/**
	 * Called with the typography key (`ui`, `body`, `header`, `mono`,
	 * `digital`) and the bare family name the user picked.
	 */
	changeFont: (fontType: string, font: string) => void;
	changeFontSize: (fontType: string, size: number) => void;
}

export const useFontsTab = ({
	typography,
	changeFont,
	changeFontSize,
}: FontsTabProps): TabIndividual => {
	const fonts = useClassicyAssetTree("fonts");
	const fontOptions = useMemo(
		() =>
			Object.keys(fonts).map((family) => ({
				label: CLASSICY_FONT_LABELS[family] ?? family,
				value: family,
			})),
		[fonts],
	);
	return useMemo(
		() => ({
			title: "Fonts",
			children: (
				<div className={"classicyAppearanceManagerFontsColumn"}>
					<div className={"classicyAppearanceManagerFontsRow"}>
						<div className={"classicyAppearanceManagerFontsLabel"}>
							<ClassicyControlLabel label={"System Font"} direction={"left"} />
						</div>
						<ClassicyPopUpMenu
							id={"ui"}
							options={fontOptions}
							selected={primaryFontFamily(typography.ui)}
							placeholder={"Custom"}
							onChangeFunc={(e) => changeFont("ui", e.target.value)}
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
							options={fontOptions}
							selected={primaryFontFamily(typography.body)}
							placeholder={"Custom"}
							onChangeFunc={(e) => changeFont("body", e.target.value)}
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
							options={fontOptions}
							selected={primaryFontFamily(typography.header)}
							placeholder={"Custom"}
							onChangeFunc={(e) => changeFont("header", e.target.value)}
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
							options={fontOptions}
							selected={primaryFontFamily(typography.mono)}
							placeholder={"Custom"}
							onChangeFunc={(e) => changeFont("mono", e.target.value)}
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
							options={fontOptions}
							selected={primaryFontFamily(typography.digital)}
							placeholder={"Custom"}
							onChangeFunc={(e) => changeFont("digital", e.target.value)}
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
		[typography, changeFont, changeFontSize, fontOptions],
	);
};
