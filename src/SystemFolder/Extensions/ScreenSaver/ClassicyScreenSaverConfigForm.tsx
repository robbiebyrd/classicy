import type { FC as FunctionalComponent } from "react";
import { z } from "zod";
import type {
	ClassicyScreenSaverConfigProps,
	ClassicyScreenSaverDefinition,
} from "@/SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaverRegistry";
import { ClassicySchemaForm } from "@/SystemFolder/SystemResources/SchemaForm/ClassicySchemaForm";

/** `current` with `value` written at `path` (copied, never mutated); `value` itself for `[]`. */
const withValueAt = (
	current: unknown,
	path: readonly string[],
	value: unknown,
): unknown => {
	if (path.length === 0) return value;
	const record =
		current !== null && typeof current === "object"
			? (current as Record<string, unknown>)
			: {};
	const [key, ...rest] = path;
	return { ...record, [key]: withValueAt(record[key], rest, value) };
};

/**
 * Options form derived from a saver's `configSchema`, drawn by
 * `ClassicySchemaForm`: number → spinner, boolean → checkbox, enum → pop-up
 * menu, string → input. Field `.describe()` text becomes the label (an
 * undescribed key is humanized). Savers wanting richer options supply a
 * `configComponent` instead; this is the zero-effort tier. Control ids are
 * `ScreenSaver_<saverId>_<key>`, and a change reaches `onChange` as the patch
 * `{ [key]: value }`; a field of a nested object patches its top-level key
 * with a copy of that object carrying the new value.
 *
 * The fields are rows of the Screen Saver control panel's
 * `ClassicyControlGroup layout="form"` grid: labeled controls carry their
 * label on the left so label and control fill the row's two columns; a
 * checkbox — whose label follows its box — and a text field — whose value
 * needs the width a sentence-long label would take — each get a full-width
 * `ClassicyControlGroupFormRow` (the text field's label sits above it, HIGOS8
 * Figure 3-34). A custom `configComponent` is laid out the same way, so it
 * should render the same kinds of rows.
 */
export const ClassicyScreenSaverConfigForm: FunctionalComponent<
	{ saver: ClassicyScreenSaverDefinition } & ClassicyScreenSaverConfigProps
> = ({ saver, config, onChange }) =>
	saver.configSchema instanceof z.ZodObject ? (
		<ClassicySchemaForm
			schema={saver.configSchema}
			values={config}
			idPrefix={`ScreenSaver_${saver.id}`}
			onChange={(path, value) =>
				onChange({
					[path[0]]: withValueAt(config[path[0]], path.slice(1), value),
				})
			}
		/>
	) : null;
