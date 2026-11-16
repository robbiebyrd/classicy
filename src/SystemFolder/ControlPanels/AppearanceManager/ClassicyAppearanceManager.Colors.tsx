import "./ClassicyAppearanceManager.Colors.scss";
import { useMemo } from "react";
import type { ClassicyAppearanceColorFamilies } from "@/Appearance/ClassicyAppearancePackage";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { appearanceThemeEditNotice } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics";
import {
	type ClassicyThemeColorFamilyChange,
	classicyThemeColorFamilyDefaults,
	getThemeColorFamily,
	withDefaultThemeColorFamilies,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeColorFamilies";
import {
	CLASSICY_THEME_COLOR_GROUPS,
	CLASSICY_THEME_COLOR_TARGETS,
	type ClassicyThemeColorChange,
	type ClassicyThemeColorTarget,
	getThemeColor,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeColorTargets";
import { ClassicyColorPicker } from "@/SystemFolder/SystemResources/ColorPicker/ClassicyColorPicker";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyScrollArea } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollArea";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

interface ColorsTabProps {
	/** The active theme, whose colors the swatches show. */
	theme: ClassicyTheme;
	/** True when the active theme is a custom theme (edits apply in place);
	 * false when it is a built-in (the first edit forks it into "Custom"). */
	editingCustomTheme: boolean;
	changeColor: (
		change: ClassicyThemeColorChange | ClassicyThemeColorFamilyChange,
	) => void;
	/** App the color-picker dialog windows register under. */
	appId: string;
	/**
	 * The active Appearance Package's own colors (`colorFamilies`): one group
	 * per family after the core groups, edited with the family form.
	 */
	colorFamilies?: ClassicyAppearanceColorFamilies;
}

/** DOM id of the swatch for a color target, e.g. `appearance_color_system_3`. */
export const appearanceColorPickerId = (
	target: ClassicyThemeColorTarget,
): string =>
	target.index === undefined
		? `appearance_color_${target.colorKey}`
		: `appearance_color_${target.colorKey}_${target.index + 1}`;

/** DOM id of the swatch for a package color, e.g.
 * `appearance_color_family_grayRamp_step2`. */
export const appearanceColorFamilyPickerId = (
	family: string,
	key: string,
): string => `appearance_color_family_${family}_${key}`;

export const useColorsTab = ({
	theme,
	editingCustomTheme,
	changeColor,
	appId,
	colorFamilies,
}: ColorsTabProps): TabIndividual =>
	useMemo(() => {
		// A stored theme keeps only the package colors it changed: the rest
		// come from its package's defaults, as getThemeVars draws them.
		const complete = withDefaultThemeColorFamilies(
			theme,
			classicyThemeColorFamilyDefaults(theme.package),
		);
		return {
			title: "Colors",
			children: (
				<div className={"classicyAppearanceManagerColors"}>
					<ClassicyControlLabel
						label={appearanceThemeEditNotice(
							theme.name,
							editingCustomTheme,
							"a color",
						)}
					/>
					<ClassicyScrollArea
						className={"classicyAppearanceManagerColorsScroll"}
						viewportClassName={"classicyAppearanceManagerColorsScrollViewport"}
					>
						{CLASSICY_THEME_COLOR_GROUPS.map((group) => (
							<div
								key={group.id}
								className={"classicyAppearanceManagerColorsGroup"}
							>
								<ClassicyControlGroup label={group.label}>
									<div className={"classicyAppearanceManagerColorsGrid"}>
										{CLASSICY_THEME_COLOR_TARGETS.filter(
											(info) => info.group === group.id,
										).map((info) => {
											const id = appearanceColorPickerId(info.target);
											return (
												<ClassicyColorPicker
													key={id}
													id={id}
													appId={appId}
													value={getThemeColor(theme, info.target)}
													labelTitle={info.label}
													labelPosition={"above"}
													labelSize={"small"}
													onChangeFunc={(color) =>
														changeColor({ ...info.target, color })
													}
												/>
											);
										})}
									</div>
								</ClassicyControlGroup>
							</div>
						))}
						{Object.entries(colorFamilies ?? {}).map(([family, declared]) => (
							<div
								key={`family-${family}`}
								className={"classicyAppearanceManagerColorsGroup"}
							>
								<ClassicyControlGroup label={declared.label}>
									<div className={"classicyAppearanceManagerColorsGrid"}>
										{Object.entries(declared.colors).map(([key, color]) => {
											const id = appearanceColorFamilyPickerId(family, key);
											return (
												<ClassicyColorPicker
													key={id}
													id={id}
													appId={appId}
													value={getThemeColorFamily(complete, { family, key })}
													labelTitle={color.label}
													labelPosition={"above"}
													labelSize={"small"}
													onChangeFunc={(value) =>
														changeColor({ family, key, color: value })
													}
												/>
											);
										})}
									</div>
								</ClassicyControlGroup>
							</div>
						))}
					</ClassicyScrollArea>
				</div>
			),
		};
	}, [theme, editingCustomTheme, changeColor, appId, colorFamilies]);
