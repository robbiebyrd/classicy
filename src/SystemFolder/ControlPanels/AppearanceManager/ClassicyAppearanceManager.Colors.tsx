import "./ClassicyAppearanceManager.Colors.scss";
import { useMemo } from "react";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { appearanceThemeEditNotice } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics";
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
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

interface ColorsTabProps {
	/** The active theme, whose colors the swatches show. */
	theme: ClassicyTheme;
	/** True when the active theme is a custom theme (edits apply in place);
	 * false when it is a built-in (the first edit forks it into "Custom"). */
	editingCustomTheme: boolean;
	changeColor: (change: ClassicyThemeColorChange) => void;
	/** App the color-picker dialog windows register under. */
	appId: string;
}

/** DOM id of the swatch for a color target, e.g. `appearance_color_system_3`. */
export const appearanceColorPickerId = (
	target: ClassicyThemeColorTarget,
): string =>
	target.index === undefined
		? `appearance_color_${target.colorKey}`
		: `appearance_color_${target.colorKey}_${target.index + 1}`;

export const useColorsTab = ({
	theme,
	editingCustomTheme,
	changeColor,
	appId,
}: ColorsTabProps): TabIndividual =>
	useMemo(
		() => ({
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
					<div className={"classicyAppearanceManagerColorsScroll"}>
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
					</div>
				</div>
			),
		}),
		[theme, editingCustomTheme, changeColor, appId],
	);
