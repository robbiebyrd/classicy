import type { FC as FunctionalComponent } from "react";
import { z } from "zod";
import type {
	ClassicyScreenSaverConfigProps,
	ClassicyScreenSaverDefinition,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicySpinner } from "@/SystemFolder/SystemResources/Spinner/ClassicySpinner";

type UnwrappedField = { schema: z.ZodType; description?: string };

/** Peel Optional/Default/Nullable/Readonly, keeping the outermost .describe(). */
const unwrapField = (field: z.ZodType): UnwrappedField => {
	let schema = field;
	let description = schema.description;
	while (
		schema instanceof z.ZodOptional ||
		schema instanceof z.ZodDefault ||
		schema instanceof z.ZodNullable ||
		schema instanceof z.ZodReadonly
	) {
		schema = schema.unwrap() as z.ZodType;
		description = description ?? schema.description;
	}
	return { schema, description };
};

/**
 * Options form derived from a saver's `configSchema`: number → spinner,
 * boolean → checkbox, enum → pop-up menu, string → input. Field `.describe()`
 * text becomes the label. Savers wanting richer options supply a
 * `configComponent` instead; this is the zero-effort tier.
 */
export const ClassicyScreenSaverConfigForm: FunctionalComponent<
	{ saver: ClassicyScreenSaverDefinition } & ClassicyScreenSaverConfigProps
> = ({ saver, config, onChange }) => {
	const schema = saver.configSchema;
	if (!(schema instanceof z.ZodObject)) return null;
	const fields = Object.entries(schema.shape as Record<string, z.ZodType>);
	return (
		<>
			{fields.map(([key, rawField]) => {
				const { schema: field, description } = unwrapField(rawField);
				const label = description ?? key;
				const id = `ScreenSaver_${saver.id}_${key}`;
				if (field instanceof z.ZodBoolean) {
					return (
						<ClassicyCheckbox
							key={key}
							id={id}
							label={label}
							checked={config[key] === true}
							onClickFunc={(checked) => onChange({ [key]: checked })}
						/>
					);
				}
				if (field instanceof z.ZodNumber) {
					return (
						<ClassicySpinner
							key={key}
							id={id}
							labelTitle={label}
							labelPosition="left"
							minValue={field.minValue ?? 0}
							maxValue={field.maxValue ?? undefined}
							prefillValue={Number(config[key] ?? 0)}
							onChangeFunc={(e) => {
								const value = Number.parseFloat(e.target.value);
								if (Number.isFinite(value)) onChange({ [key]: value });
							}}
						/>
					);
				}
				if (field instanceof z.ZodEnum) {
					const options = (field.options as string[]).map((value) => ({
						value,
						label: value,
					}));
					return (
						<ClassicyPopUpMenu
							key={key}
							id={id}
							label={label}
							labelPosition="left"
							options={options}
							selected={String(config[key] ?? "")}
							onChangeFunc={(e) => onChange({ [key]: e.target.value })}
						/>
					);
				}
				if (field instanceof z.ZodString) {
					return (
						<ClassicyInput
							key={key}
							id={id}
							labelTitle={label}
							prefillValue={String(config[key] ?? "")}
							onChangeFunc={(e) => onChange({ [key]: e.target.value })}
						/>
					);
				}
				// Unsupported field types simply don't render a control; the
				// saver keeps its default for them.
				return null;
			})}
		</>
	);
};
