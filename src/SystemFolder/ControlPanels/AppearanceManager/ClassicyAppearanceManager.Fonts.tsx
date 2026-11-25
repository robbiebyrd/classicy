import { useCallback, useMemo } from "react";
import type { ClassicyAppearanceFontFamilies } from "@/Appearance/ClassicyAppearancePackage";
import { useClassicyAssetTree } from "@/Appearance/ClassicyAssetRegistry";
import type { ClassicyThemeTypography } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicySpinner } from "@/SystemFolder/SystemResources/Spinner/ClassicySpinner";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { primaryFontFamily } from "./ClassicyFontStack";
import { listClassicyThemeFontFamilies } from "./ClassicyThemeFontFamilies";
import {
	CLASSICY_THEME_FONT_SIZE_MAX,
	CLASSICY_THEME_FONT_SIZE_MIN,
	type ClassicyThemeFontSizeKey,
	clampClassicyThemeFontSize,
} from "./ClassicyThemeFontSizes";

/** Display labels for families whose CSS name is not what the tab shows. */
const CLASSICY_FONT_LABELS: Record<string, string> = {
	"VCR OSD Mono": "Digital",
};

interface FontsTabProps {
	typography: ClassicyThemeTypography;
	/**
	 * Called with the typography key (`ui`, `body`, `header`, `mono`,
	 * `digital`) and the bare family name the user picked.
	 */
	changeFont: (fontType: string, font: string) => void;
	changeFontSize: (fontType: string, size: number) => void;
	/**
	 * The active package's labels for its own fonts (`fontFamilies`): a row
	 * for each `typography.families` entry of the theme, in this order.
	 */
	fontFamilies?: Readonly<ClassicyAppearanceFontFamilies>;
	/** Called with a package font's name and the bare family name picked. */
	changeFamilyFont?: (name: string, font: string) => void;
	/** Called with a package font's name and the size typed. */
	changeFamilyFontSize?: (name: string, size: number) => void;
}

export const useFontsTab = ({
	typography,
	changeFont,
	changeFontSize,
	fontFamilies,
	changeFamilyFont,
	changeFamilyFontSize,
}: FontsTabProps): TabIndividual => {
	const fonts = useClassicyAssetTree("fonts");
	// The spinner shows a typed size clamped to its bounds but reports the raw
	// text, so the size is clamped here the same way: what is dispatched is
	// what the field shows (text that is not a number reports nothing).
	const reportSize = useCallback(
		(fontType: ClassicyThemeFontSizeKey, typed: string) => {
			const size = clampClassicyThemeFontSize(Number(typed));
			if (size !== undefined) changeFontSize(fontType, size);
		},
		[changeFontSize],
	);
	const reportFamilySize = useCallback(
		(name: string, typed: string) => {
			const size = clampClassicyThemeFontSize(Number(typed));
			if (size !== undefined) changeFamilyFontSize?.(name, size);
		},
		[changeFamilyFontSize],
	);
	const packageFonts = useMemo(
		() => listClassicyThemeFontFamilies(typography, fontFamilies),
		[typography, fontFamilies],
	);
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
							minValue={CLASSICY_THEME_FONT_SIZE_MIN}
							maxValue={CLASSICY_THEME_FONT_SIZE_MAX}
							onChangeFunc={(e) => reportSize("uiSize", e.target.value)}
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
							minValue={CLASSICY_THEME_FONT_SIZE_MIN}
							maxValue={CLASSICY_THEME_FONT_SIZE_MAX}
							onChangeFunc={(e) => reportSize("bodySize", e.target.value)}
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
							minValue={CLASSICY_THEME_FONT_SIZE_MIN}
							maxValue={CLASSICY_THEME_FONT_SIZE_MAX}
							onChangeFunc={(e) => reportSize("headerSize", e.target.value)}
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
							minValue={CLASSICY_THEME_FONT_SIZE_MIN}
							maxValue={CLASSICY_THEME_FONT_SIZE_MAX}
							onChangeFunc={(e) => reportSize("monoSize", e.target.value)}
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
							minValue={CLASSICY_THEME_FONT_SIZE_MIN}
							maxValue={CLASSICY_THEME_FONT_SIZE_MAX}
							onChangeFunc={(e) => reportSize("digitalSize", e.target.value)}
						/>
					</div>
					{/* The small UI text's family, for a theme that names one
					    (`typography.uiSmall`, System 7's Geneva): its size is the
					    theme's `uiText.smallFontSize` knob, not edited here. */}
					{typography.uiSmall !== undefined && (
						<div className={"classicyAppearanceManagerFontsRow"}>
							<div className={"classicyAppearanceManagerFontsLabel"}>
								<ClassicyControlLabel
									label={"Small UI Font"}
									direction={"left"}
								/>
							</div>
							<ClassicyPopUpMenu
								id={"uiSmall"}
								options={fontOptions}
								selected={primaryFontFamily(typography.uiSmall)}
								placeholder={"Custom"}
								onChangeFunc={(e) => changeFont("uiSmall", e.target.value)}
							/>
						</div>
					)}
					{/* The active package's own fonts (`typography.families`):
					    Windows 98's caption, menu, message box and icon fonts.
					    An entry without a size (the icon font's is the Desktop
					    tab's label size) shows the family alone. */}
					{packageFonts.map(({ name, label, family }) => (
						<div key={name} className={"classicyAppearanceManagerFontsRow"}>
							<div className={"classicyAppearanceManagerFontsLabel"}>
								<ClassicyControlLabel label={label} direction={"left"} />
							</div>
							<ClassicyPopUpMenu
								id={`family-${name}`}
								options={fontOptions}
								selected={primaryFontFamily(family.font)}
								placeholder={"Custom"}
								onChangeFunc={(e) => changeFamilyFont?.(name, e.target.value)}
							/>
							{family.size !== undefined && (
								<ClassicySpinner
									id={`family-${name}-size`}
									prefillValue={family.size}
									minValue={CLASSICY_THEME_FONT_SIZE_MIN}
									maxValue={CLASSICY_THEME_FONT_SIZE_MAX}
									onChangeFunc={(e) => reportFamilySize(name, e.target.value)}
								/>
							)}
						</div>
					))}
				</div>
			),
		}),
		[
			typography,
			changeFont,
			reportSize,
			fontOptions,
			packageFonts,
			changeFamilyFont,
			reportFamilySize,
		],
	);
};
