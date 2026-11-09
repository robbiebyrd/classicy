import type { z } from "zod";

/** A schema field with its wrappers peeled off, and the label text it carries. */
export type ClassicyUnwrappedField = {
	schema: z.ZodType;
	description?: string;
};

/**
 * The definition type of a zod schema (`"object"`, `"number"`, `"optional"`, ...),
 * read from its definition rather than with `instanceof`: a schema built by
 * another copy of zod (a package that bundles its own) is not an instance of
 * this copy's classes, but carries the same definition.
 */
export const classicyZodType = (schema: unknown): string | undefined => {
	const candidate = schema as {
		_zod?: { def?: { type?: unknown } };
		def?: { type?: unknown };
	} | null;
	const type = candidate?._zod?.def?.type ?? candidate?.def?.type;
	return typeof type === "string" ? type : undefined;
};

/** The field map of an object schema, read from its definition. */
export const classicyZodShape = (schema: unknown): Record<string, z.ZodType> =>
	(schema as { _zod?: { def?: { shape?: Record<string, z.ZodType> } } })._zod
		?.def?.shape ?? {};

const WRAPPER_TYPES = new Set(["optional", "default", "nullable", "readonly"]);

/** Peel Optional/Default/Nullable/Readonly, keeping the outermost .describe(). */
export const unwrapClassicySchemaField = (
	field: z.ZodType,
): ClassicyUnwrappedField => {
	let schema = field;
	let description = schema.description;
	for (;;) {
		const type = classicyZodType(schema);
		if (type === undefined || !WRAPPER_TYPES.has(type)) break;
		schema = (schema as unknown as { _zod: { def: { innerType: z.ZodType } } })
			._zod.def.innerType;
		description = description ?? schema.description;
	}
	return { schema, description };
};

// A path segment with `%` and `.` percent-encoded, so `.` can only ever be
// the separator between segments.
const encodeSegment = (segment: string): string =>
	segment.replaceAll("%", "%25").replaceAll(".", "%2E");

/**
 * The DOM id of a field: the prefix, `_`, then the path's segments joined by
 * `.`, each with `%` and `.` percent-encoded. A top-level key keeps the plain
 * `<idPrefix>_<key>` (`ScreenSaver_<saverId>_<key>`), and a key containing
 * `_` or `.` can never take a nested field's id (`a_b` → `T_a_b`, `a.b` →
 * `T_a.b`, a key `"a.b"` → `T_a%2Eb`).
 */
export const classicySchemaFieldId = (
	idPrefix: string,
	path: readonly string[],
): string => `${idPrefix}_${path.map(encodeSegment).join(".")}`;

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
