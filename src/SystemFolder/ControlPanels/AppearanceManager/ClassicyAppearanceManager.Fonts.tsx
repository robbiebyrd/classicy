import { type ChangeEvent, useMemo } from "react";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

const ClassicyFonts = [
	{ label: "Charcoal", value: "Charcoal" },
	{ label: "ChicagoFLF", value: "ChicagoFLF" },
	{ label: "Geneva", value: "Geneva" },
	{ label: "AppleGaramond", value: "AppleGaramond" },
];

interface FontsTabProps {
	typography: { ui: string; body: string; header: string };
	changeFont: (e: ChangeEvent<HTMLSelectElement>) => void;
}

export const useFontsTab = ({
	typography,
	changeFont,
}: FontsTabProps): TabIndividual =>
	useMemo(
		() => ({
			title: "Fonts",
			children: (
				<div className={"classicyAppearanceManagerFontsColumn"}>
					<div className={"classicyAppearanceManagerFontsRow"}>
						<div className={"classicyAppearanceManagerFontsLabel"}>
							<ClassicyControlLabel
								label={"Large System Font"}
								direction={"left"}
							/>
						</div>
						<ClassicyPopUpMenu
							id={"ui"}
							options={ClassicyFonts}
							selected={typography.ui}
							onChangeFunc={changeFont}
						></ClassicyPopUpMenu>
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
						></ClassicyPopUpMenu>
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
						></ClassicyPopUpMenu>
					</div>
				</div>
			),
		}),
		[typography, changeFont],
	);
