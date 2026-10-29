import { z } from "zod";

/** A schema field with its wrappers peeled off, and the label text it carries. */
export type ClassicyUnwrappedField = {
	schema: z.ZodType;
	description?: string;
};

/** Peel Optional/Default/Nullable/Readonly, keeping the outermost .describe(). */
export const unwrapClassicySchemaField = (
	field: z.ZodType,
): ClassicyUnwrappedField => {
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

/** The DOM id of a field: the prefix and every path segment, joined by `_`. */
export const classicySchemaFieldId = (
	idPrefix: string,
	path: readonly string[],
): string => [idPrefix, ...path].join("_");

/**
 * The label of a field: its `.describe()` text, else its key split on
 * camel-case humps with only the first letter upper-cased
 * (`cellHeight` → "Cell height"). Acronyms keep their capitals
 * (`maxURLLength` → "Max URL length").
 */
export const classicySchemaFieldLabel = (
	key: string,
	description?: string,
): string => {
	if (description !== undefined) return description;
	const words = key
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
		.split(" ")
		.map((word) => (/^[A-Z0-9]{2,}$/.test(word) ? word : word.toLowerCase()));
	const text = words.join(" ");
	return text.charAt(0).toUpperCase() + text.slice(1);
};
