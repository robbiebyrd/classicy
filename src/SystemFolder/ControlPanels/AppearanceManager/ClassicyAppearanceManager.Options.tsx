import "./ClassicyAppearanceManager.Colors.scss";
import { useMemo } from "react";
import { z } from "zod";
import type {
	ClassicyAppearanceKnobs,
	ClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	type ClassicyThemeMetricFamilyTarget,
	getThemeMetricFamily,
	getThemeMetricFamilyBounds,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
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

type KnobFamily = ClassicyAppearanceKnobs[string];

// One family's form: a whole-pixel number per knob, labeled by the knob and
// bounded as the reducer bounds it (the knob's range within 0–512), so the
// form clamps an entry to exactly what the reducer accepts.
const knobFamilySchema = (keys: KnobFamily): z.ZodObject<z.ZodRawShape> =>
	z.object(
		Object.fromEntries(
			Object.entries(keys).map(([key, knob]) => {
				const { min, max } = getThemeMetricFamilyBounds(knob);
				return [key, z.number().int().min(min).max(max).describe(knob.label)];
			}),
		),
	);

// The theme's value for each knob, or the knob's default when the theme
// predates it (the reducer creates the key on the first edit).
const knobFamilyValues = (
	theme: ClassicyTheme,
	family: string,
	keys: KnobFamily,
): Record<string, number> =>
	Object.fromEntries(
		Object.entries(keys).map(([key, knob]) => {
			const value = getThemeMetricFamily(theme, { family, key });
			return [key, Number.isFinite(value) ? value : knob.default];
		}),
	);

/**
 * The Appearance Manager's Options tab: the active package's knobs
 * (`pkg.knobs`, the metadata behind `pkg.options`), one group box per family
 * titled with the humanized family name, one spinner per knob labeled with
 * the knob's label. Edits go to `changeMetric` as `{ family, key }` and a
 * whole-pixel value clamped to the knob's bounds. A package without knobs
 * says so instead.
 */
export const useOptionsTab = ({
	pkg,
	theme,
	changeMetric,
}: OptionsTabProps): TabIndividual => {
	const families = useMemo(
		() =>
			Object.entries(pkg.knobs ?? {})
				.filter(([, keys]) => Object.keys(keys).length > 0)
				.map(([family, keys]) => ({
					family,
					keys,
					schema: knobFamilySchema(keys),
				})),
		[pkg.knobs],
	);

	return useMemo(
		() => ({
			title: "Options",
			children:
				families.length === 0 ? (
					<ClassicyControlLabel
						label={`The ${pkg.name} package has no options.`}
					/>
				) : (
					<div className={"classicyAppearanceManagerColorsScroll"}>
						{families.map(({ family, keys, schema }) => (
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
										values={knobFamilyValues(theme, family, keys)}
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
				),
		}),
		[families, pkg.name, theme, changeMetric],
	);
};
