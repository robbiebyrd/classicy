import "./ClassicyAppearanceManager.Colors.scss";
import { useMemo } from "react";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	CLASSICY_THEME_METRIC_GROUPS,
	CLASSICY_THEME_METRIC_TARGETS,
	type ClassicyThemeMetricChange,
	type ClassicyThemeMetricKey,
	getThemeMetric,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicySpinner } from "@/SystemFolder/SystemResources/Spinner/ClassicySpinner";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

interface MetricsTabProps {
	/** The active theme, whose metrics the spinners show. */
	theme: ClassicyTheme;
	/** True when the active theme is a custom theme (edits apply in place);
	 * false when it is a built-in (the first edit forks it into "Custom"). */
	editingCustomTheme: boolean;
	/** Receives the core `{ metricKey, value }` form of
	 * `ClassicyDesktopChangeMetric`, never a dotted path. */
	changeMetric: (change: ClassicyThemeMetricChange) => void;
}

/**
 * The notice above an editing tab: what the next edit does to the active
 * theme. A built-in theme is forked into "Custom" by the first edit
 * (`change` names the kind of edit, e.g. "a metric"); a custom theme is
 * edited in place. Shared by the Metrics and Options tabs.
 */
export const appearanceThemeEditNotice = (
	themeName: string,
	editingCustomTheme: boolean,
	change: string,
): string =>
	editingCustomTheme
		? `Editing the “${themeName}” theme.`
		: `Changing ${change} creates a Custom theme from “${themeName}”.`;

/** DOM id of the spinner for a metric target, e.g. `appearance_metric_buttonGap`. */
export const appearanceMetricSpinnerId = (target: {
	metricKey: ClassicyThemeMetricKey;
}): string => `appearance_metric_${target.metricKey}`;

/**
 * The Appearance Manager's Metrics tab: one spinner per
 * `CLASSICY_THEME_METRIC_TARGETS` entry, in a group box per
 * `CLASSICY_THEME_METRIC_GROUPS` entry, laid out like the Colors tab (whose
 * scroll region it reuses). Package knob families are the Options tab's.
 */
export const useMetricsTab = ({
	theme,
	editingCustomTheme,
	changeMetric,
}: MetricsTabProps): TabIndividual =>
	useMemo(
		() => ({
			title: "Metrics",
			children: (
				<div className={"classicyAppearanceManagerColors"}>
					<ClassicyControlLabel
						label={appearanceThemeEditNotice(
							theme.name,
							editingCustomTheme,
							"a metric",
						)}
					/>
					<div className={"classicyAppearanceManagerColorsScroll"}>
						{CLASSICY_THEME_METRIC_GROUPS.map((group) => (
							<div
								key={group.id}
								className={"classicyAppearanceManagerColorsGroup"}
							>
								<ClassicyControlGroup label={group.label} layout="form">
									{CLASSICY_THEME_METRIC_TARGETS.filter(
										(info) => info.group === group.id,
									).map((info) => {
										const id = appearanceMetricSpinnerId(info.target);
										return (
											<ClassicySpinner
												key={id}
												id={id}
												labelTitle={info.label}
												labelPosition={"left"}
												minValue={info.min}
												maxValue={info.max}
												prefillValue={getThemeMetric(theme, info.target)}
												onChangeFunc={(e) => {
													// An empty or non-numeric entry parses to NaN and is
													// ignored (`Number("")` would be 0). The spinner still
													// shows such an entry as its minimum while the store
													// keeps the old value, until the next edit or a theme
													// change re-syncs the field. Any other entry is rounded
													// to whole pixels (J-R17), then clamped as the spinner
													// clamps its display, so the store gets the number the
													// field shows (a fractional entry shows unrounded).
													const value = Number.parseFloat(e.target.value);
													if (!Number.isFinite(value)) return;
													changeMetric({
														...info.target,
														value: Math.min(
															info.max,
															Math.max(info.min, Math.round(value)),
														),
													});
												}}
											/>
										);
									})}
								</ClassicyControlGroup>
							</div>
						))}
					</div>
				</div>
			),
		}),
		[theme, editingCustomTheme, changeMetric],
	);
