import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { z } from "zod";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import {
	ClassicySchemaForm,
	type ClassicySchemaFormValues,
} from "./ClassicySchemaForm";

/** `current` with `value` written at `path` (copied, never mutated). */
const withValueAt = (
	current: ClassicySchemaFormValues,
	path: readonly string[],
	value: unknown,
): ClassicySchemaFormValues => {
	const [key, ...rest] = path;
	if (rest.length === 0) return { ...current, [key]: value };
	const inner = current[key];
	return {
		...current,
		[key]: withValueAt(
			inner !== null && typeof inner === "object"
				? (inner as ClassicySchemaFormValues)
				: {},
			rest,
			value,
		),
	};
};

// One field of every kind, and a nested object, which becomes its own titled
// group on a full-width row.
const optionsSchema = z.object({
	speed: z.number().int().min(1).max(10).describe("Speed"),
	shape: z.enum(["ball", "square", "star"]).describe("Shape"),
	sounds: z.boolean().describe("Play sounds"),
	trail: z.object({
		length: z.number().int().min(0).max(32).describe("Length"),
		fade: z.boolean().describe("Fade out"),
	}),
	message: z.string().describe("Message"),
});

const initialValues: ClassicySchemaFormValues = {
	speed: 4,
	shape: "ball",
	sounds: true,
	trail: { length: 8, fade: false },
	message: "Hello, world",
};

const SchemaFormStory = () => {
	const [values, setValues] = useState(initialValues);
	return (
		<div style={{ width: 360 }}>
			<ClassicyControlGroup label="Options" layout="form">
				<ClassicySchemaForm
					schema={optionsSchema}
					values={values}
					idPrefix="SchemaFormStory"
					onChange={(path, value) =>
						setValues((current) => withValueAt(current, path, value))
					}
				/>
			</ClassicyControlGroup>
		</div>
	);
};

const meta = {
	title: "Controls/SchemaForm",
	component: ClassicySchemaForm,
} satisfies Meta<typeof ClassicySchemaForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * A form derived from a zod object: number → spinner, enum → pop-up menu,
 * boolean → checkbox, string → text field, and the nested `trail` object →
 * a titled group ("Trail", the humanized key) on a full-width row, laying
 * out its own fields as a form. Labels are the fields' `.describe()` text.
 * The Screen Saver options and the Appearance Manager's Options tab are
 * built on it. The form has no root of its own: it renders the rows of the
 * `ClassicyControlGroup layout="form"` around it.
 */
export const Nested: Story = {
	args: {
		schema: optionsSchema,
		values: initialValues,
		idPrefix: "SchemaFormStory",
		onChange: () => {},
	},
	render: () => <SchemaFormStory />,
};
