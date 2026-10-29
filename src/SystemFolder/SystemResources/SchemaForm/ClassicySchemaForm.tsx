import type { FC as FunctionalComponent } from "react";
import { z } from "zod";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import {
	ClassicyControlGroup,
	ClassicyControlGroupFormRow,
} from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import {
	classicySchemaFieldId,
	classicySchemaFieldLabel,
	unwrapClassicySchemaField,
} from "@/SystemFolder/SystemResources/SchemaForm/ClassicySchemaFormFields";
import { ClassicySpinner } from "@/SystemFolder/SystemResources/Spinner/ClassicySpinner";

/** The values a schema form shows, keyed like the schema's shape. */
export type ClassicySchemaFormValues = Record<string, unknown>;

export type ClassicySchemaFormProps = {
	/** The zod object whose fields become controls. */
	schema: z.ZodObject<z.ZodRawShape>;
	/** The current values, keyed like `schema`; nested objects nest. */
	values: ClassicySchemaFormValues;
	/** Called with the changed field's full path (`[...path, key]`) and its new value. */
	onChange: (path: readonly string[], value: unknown) => void;
	/** Prefix of every control's id: `<idPrefix>_<path…>_<key>`. */
	idPrefix: string;
	/** Path of this form inside an outer one; set by the recursion. Defaults to `[]`. */
	path?: readonly string[];
};

const EMPTY_PATH: readonly string[] = [];

/**
 * A form derived from a zod object: number → spinner, boolean → checkbox,
 * enum → pop-up menu, string → input, and a nested object → a titled
 * `ClassicyControlGroup` holding its own fields. A field's `.describe()` text
 * is its label; an undescribed key is humanized (`cellHeight` → "Cell
 * height"). Unsupported field types render nothing. A number field reports
 * the value it shows: an empty entry is not reported, an `.int()` field is
 * rounded, and every entry is clamped to the field's `.min()`/`.max()`.
 *
 * It renders rows for a `ClassicyControlGroup layout="form"` grid, and no root
 * of its own: labeled controls carry their label on the left so label and
 * control fill the row's two columns; a checkbox — whose label follows its
 * box — and a text field — whose value needs the width a sentence-long label
 * would take — each get a full-width `ClassicyControlGroupFormRow` (the text
 * field's label sits above it, HIGOS8 Figure 3-34). A nested object's group
 * also spans a full-width row, and lays its own fields out as a form.
 *
 * ```tsx
 * <ClassicyControlGroup label="Options" layout="form">
 *     <ClassicySchemaForm schema={schema} values={values} idPrefix="MyApp"
 *         onChange={(path, value) => save(path, value)} />
 * </ClassicyControlGroup>
 * ```
 */
export const ClassicySchemaForm: FunctionalComponent<
	ClassicySchemaFormProps
> = ({ schema, values, onChange, idPrefix, path = EMPTY_PATH }) => {
	const fields = Object.entries(schema.shape as Record<string, z.ZodType>);
	return (
		<>
			{fields.map(([key, rawField]) => {
				const { schema: field, description } =
					unwrapClassicySchemaField(rawField);
				const label = classicySchemaFieldLabel(key, description);
				const fieldPath = [...path, key];
				const id = classicySchemaFieldId(idPrefix, fieldPath);
				const value = values[key];
				if (field instanceof z.ZodObject) {
					const nested =
						value !== null && typeof value === "object"
							? (value as ClassicySchemaFormValues)
							: {};
					return (
						<ClassicyControlGroupFormRow key={key}>
							<ClassicyControlGroup label={label} layout="form" columns>
								<ClassicySchemaForm
									schema={field as z.ZodObject<z.ZodRawShape>}
									values={nested}
									onChange={onChange}
									idPrefix={idPrefix}
									path={fieldPath}
								/>
							</ClassicyControlGroup>
						</ClassicyControlGroupFormRow>
					);
				}
				if (field instanceof z.ZodBoolean) {
					return (
						<ClassicyControlGroupFormRow key={key}>
							<ClassicyCheckbox
								id={id}
								label={label}
								checked={value === true}
								onClickFunc={(checked) => onChange(fieldPath, checked)}
							/>
						</ClassicyControlGroupFormRow>
					);
				}
				if (field instanceof z.ZodNumber) {
					const min = field.minValue ?? 0;
					const max = field.maxValue ?? undefined;
					return (
						<ClassicySpinner
							key={key}
							id={id}
							labelTitle={label}
							labelPosition="left"
							minValue={min}
							maxValue={max}
							prefillValue={Number(value ?? 0)}
							onChangeFunc={(e) => {
								// Report what the field shows (J-R17): an empty or
								// non-numeric entry parses to NaN and is not reported;
								// an `.int()` field is rounded to a whole number; then
								// the entry is clamped to the bounds the spinner
								// clamps its display to.
								const parsed = Number.parseFloat(e.target.value);
								if (!Number.isFinite(parsed)) return;
								const whole = field.isInt ? Math.round(parsed) : parsed;
								onChange(
									fieldPath,
									Math.min(
										max ?? Number.POSITIVE_INFINITY,
										Math.max(min, whole),
									),
								);
							}}
						/>
					);
				}
				if (field instanceof z.ZodEnum) {
					const options = (field.options as string[]).map((option) => ({
						value: option,
						label: option,
					}));
					return (
						<ClassicyPopUpMenu
							key={key}
							id={id}
							label={label}
							labelPosition="left"
							options={options}
							selected={String(value ?? "")}
							onChangeFunc={(e) => onChange(fieldPath, e.target.value)}
						/>
					);
				}
				if (field instanceof z.ZodString) {
					return (
						<ClassicyControlGroupFormRow key={key}>
							<ClassicyInput
								id={id}
								labelTitle={label}
								prefillValue={String(value ?? "")}
								onChangeFunc={(e) => onChange(fieldPath, e.target.value)}
							/>
						</ClassicyControlGroupFormRow>
					);
				}
				// Unsupported field types simply don't render a control; the
				// owner keeps its default for them.
				return null;
			})}
		</>
	);
};
