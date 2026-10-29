import "./ClassicyAppearanceManager.Colors.scss";
import { useEffect, useMemo } from "react";
import { z } from "zod";
import type {
	ClassicyAppearanceKnobs,
	ClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { appearanceThemeEditNotice } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics";
import {
	type ClassicyThemeMetricFamilyTarget,
	getThemeMetricFamily,
	getThemeMetricFamilyBounds,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { ClassicySchemaForm } from "@/SystemFolder/SystemResources/SchemaForm/ClassicySchemaForm";
import {
	classicySchemaFieldId,
	classicySchemaFieldLabel,
} from "@/SystemFolder/SystemResources/SchemaForm/ClassicySchemaFormFields";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

interface OptionsTabProps {
	/** The active Appearance Package, whose knobs the tab edits. */
	pkg: ClassicyAppearancePackage;
	/** The active theme, whose `measurements.<family>.<key>` the fields show. */
	theme: ClassicyTheme;
	/** True when the active theme is a custom theme (edits apply in place);
	 * false when it is a built-in (the first edit forks it into "Custom"). */
	editingCustomTheme: boolean;
	/** Receives a knob edit: the family form of `ClassicyDesktopChangeMetric`. */
	changeMetric: (
		target: ClassicyThemeMetricFamilyTarget,
		value: number,
	) => void;
}

// The knobs live under `theme.measurements`, so their ids say so.
const ID_PREFIX = "appearance_option_measurements";

/** DOM id of a knob's spinner, e.g. `appearance_option_measurements_controlStrip_cellHeight`. */
export const appearanceOptionInputId = (
	target: ClassicyThemeMetricFamilyTarget,
): string => classicySchemaFieldId(ID_PREFIX, [target.family, target.key]);

type Knob = ClassicyAppearanceKnobs[string][string];
type EditableKnob = { key: string; knob: Knob; min: number; max: number };

// One family's form: a whole-pixel number per knob, labeled by the knob and
// bounded as the reducer bounds it (`getThemeMetricFamilyBounds`), so the
// form clamps an entry to exactly what the reducer accepts.
const knobFamilySchema = (
	knobs: readonly EditableKnob[],
): z.ZodObject<z.ZodRawShape> =>
	z.object(
		Object.fromEntries(
			knobs.map(({ key, knob, min, max }) => [
				key,
				z.number().int().min(min).max(max).describe(knob.label),
			]),
		),
	);

// Knobs already warned about, so a knob that can never be edited is reported
// once, not on every render or remount of the tab.
const warnedKnobs = new Set<string>();

// The theme's value for each knob, or the knob's default when the theme
// predates it (the reducer creates the key on the first edit).
const knobFamilyValues = (
	theme: ClassicyTheme,
	family: string,
	knobs: readonly EditableKnob[],
): Record<string, number> =>
	Object.fromEntries(
		knobs.map(({ key, knob }) => {
			const value = getThemeMetricFamily(theme, { family, key });
			return [key, Number.isFinite(value) ? value : knob.default];
		}),
	);

/**
 * The Appearance Manager's Options tab: the active package's knobs
 * (`pkg.knobs`, the metadata behind `pkg.options`), one group box per family
 * titled with the humanized family name, one spinner per knob labeled with
 * the knob's label. Edits go to `changeMetric` as `{ family, key }` and a
 * whole-pixel value clamped to the knob's bounds. Above them sits the
 * Metrics tab's notice: the first edit on a built-in theme forks "Custom".
 * A knob whose declared range does not meet 0–512 cannot be edited, so it is
 * left out and reported once (J-R18). A package without editable knobs says
 * so instead.
 */
export const useOptionsTab = ({
	pkg,
	theme,
	editingCustomTheme,
	changeMetric,
}: OptionsTabProps): TabIndividual => {
	const { families, skipped } = useMemo(() => {
		const skipped: string[] = [];
		const families = Object.entries(pkg.knobs ?? {}).flatMap(
			([family, keys]) => {
				const knobs: EditableKnob[] = [];
				for (const [key, knob] of Object.entries(keys)) {
					const bounds = getThemeMetricFamilyBounds(knob);
					if (bounds) knobs.push({ key, knob, ...bounds });
					else skipped.push(`${family}.${key}`);
				}
				return knobs.length === 0
					? []
					: [{ family, knobs, schema: knobFamilySchema(knobs) }];
			},
		);
		return { families, skipped };
	}, [pkg.knobs]);

	useEffect(() => {
		for (const knob of skipped) {
			const id = `${pkg.id}:${knob}`;
			if (warnedKnobs.has(id)) continue;
			warnedKnobs.add(id);
			classicyLog(
				"warn",
				"ClassicyAppearance",
				`Package "${pkg.id}" knob "${knob}" is not editable: its range does not meet 0–512, so the Options tab leaves it out`,
			);
		}
	}, [pkg.id, skipped]);

	return useMemo(
		() => ({
			title: "Options",
			children:
				families.length === 0 ? (
					<ClassicyControlLabel
						label={`The ${pkg.name} package has no options.`}
					/>
				) : (
					<div className={"classicyAppearanceManagerColors"}>
						<ClassicyControlLabel
							label={appearanceThemeEditNotice(
								theme.name,
								editingCustomTheme,
								"an option",
							)}
						/>
						<div className={"classicyAppearanceManagerColorsScroll"}>
							{families.map(({ family, knobs, schema }) => (
								<div
									key={family}
									className={"classicyAppearanceManagerColorsGroup"}
								>
									<ClassicyControlGroup
										label={classicySchemaFieldLabel(family)}
										layout="form"
									>
										<ClassicySchemaForm
											schema={schema}
											values={knobFamilyValues(theme, family, knobs)}
											idPrefix={ID_PREFIX}
											path={[family]}
											onChange={(path, value) => {
												if (typeof value === "number")
													changeMetric({ family, key: path[1] }, value);
											}}
										/>
									</ClassicyControlGroup>
								</div>
							))}
						</div>
					</div>
				),
		}),
		[families, pkg.name, theme, editingCustomTheme, changeMetric],
	);
};
