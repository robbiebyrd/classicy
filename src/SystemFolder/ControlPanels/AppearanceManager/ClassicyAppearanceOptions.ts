import { z } from "zod";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicyThemeSchema } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema";

/**
 * Appearance options: single theme values addressed by a dotted path
 * (`"sound.pack"`, `"desktop.iconSize"`), written by
 * `ClassicyDesktopChangeAppearanceOption { path, value }`.
 *
 * The path and value are untrusted. A path is accepted only when every
 * segment is a plain identifier and none can reach an object's prototype; the
 * write then walks own properties only, never creates a key, and validates the
 * value against the written leaf's own sub-schema of `ClassicyThemeSchema`.
 * Only that leaf is checked, so a field that was already invalid (a relative
 * wallpaper set by `ClassicyDesktopChangeBackground`, say) never blocks an
 * unrelated write.
 *
 * Metrics are not options: `measurements.*` goes through
 * `ClassicyDesktopChangeMetric`, and a theme's identity (`id`, `name`,
 * `package`) is never an option.
 */

/** One path segment: a letter, then letters and digits. */
export const CLASSICY_APPEARANCE_OPTION_SEGMENT = /^[A-Za-z][A-Za-z0-9]*$/;

const FORBIDDEN_SEGMENTS: readonly string[] = [
	"__proto__",
	"constructor",
	"prototype",
];

const RESERVED_ROOTS: readonly string[] = [
	"id",
	"name",
	"package",
	"measurements",
];

/**
 * Splits an option path into its segments: 2–4 identifiers
 * (`CLASSICY_APPEARANCE_OPTION_SEGMENT`), none of `__proto__`, `constructor`
 * or `prototype`, and not rooted at `id`, `name`, `package` or `measurements`.
 * Anything else is `undefined`.
 */
export const parseClassicyAppearanceOptionPath = (
	path: string,
): string[] | undefined => {
	const segments = path.split(".");
	if (segments.length < 2 || segments.length > 4) return undefined;
	for (const segment of segments) {
		if (!CLASSICY_APPEARANCE_OPTION_SEGMENT.test(segment)) return undefined;
		if (FORBIDDEN_SEGMENTS.includes(segment)) return undefined;
	}
	if (RESERVED_ROOTS.includes(segments[0])) return undefined;
	return segments;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
	if (typeof value !== "object" || value === null || Array.isArray(value))
		return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
};

/** The value at `path`, read through own properties of plain objects only;
 * `undefined` when any step is missing. */
export const getClassicyAppearanceOption = (
	theme: ClassicyTheme,
	path: readonly string[],
): unknown => {
	let node: unknown = theme;
	for (const segment of path) {
		if (!isPlainObject(node) || !Object.hasOwn(node, segment)) return undefined;
		node = node[segment];
	}
	return node;
};

/** Peels the wrappers an object in the theme schema may carry. */
const unwrapObject = (schema: z.ZodType): z.ZodType => {
	let inner = schema;
	while (inner instanceof z.ZodDefault || inner instanceof z.ZodOptional) {
		inner = inner.unwrap() as z.ZodType;
	}
	return inner;
};

/** The `ClassicyThemeSchema` sub-schema for `path`, by walking `.shape`. */
const optionSchema = (path: readonly string[]): z.ZodType | undefined => {
	let schema: z.ZodType = ClassicyThemeSchema;
	for (const segment of path) {
		const object = unwrapObject(schema);
		if (!(object instanceof z.ZodObject)) return undefined;
		const shape = object.shape as Record<string, z.ZodType>;
		if (!Object.hasOwn(shape, segment)) return undefined;
		schema = shape[segment];
	}
	return schema;
};

export type ClassicyAppearanceOptionResult =
	| { ok: true }
	| { ok: false; reason: "path" | "missing" | "schema" };

/**
 * Writes `value` at `path` in `theme` (mutated in place). Refused, with the
 * theme left unchanged, when the path does not parse (`path`), when it does
 * not name an existing leaf the schema declares (`missing` — no key is ever
 * created), or when the value fails that leaf's sub-schema (`schema`). The
 * parsed value is what is stored, so a schema that normalizes (a trimmed
 * font stack) stores the normal form.
 */
export const applyClassicyAppearanceOption = (
	theme: ClassicyTheme,
	path: string,
	value: unknown,
): ClassicyAppearanceOptionResult => {
	const segments = parseClassicyAppearanceOptionPath(path);
	if (!segments) return { ok: false, reason: "path" };

	const leaf = segments[segments.length - 1];
	const parent = getClassicyAppearanceOption(theme, segments.slice(0, -1));
	if (!isPlainObject(parent) || !Object.hasOwn(parent, leaf)) {
		return { ok: false, reason: "missing" };
	}
	const schema = optionSchema(segments);
	if (!schema) return { ok: false, reason: "missing" };

	const parsed = schema.safeParse(value);
	if (!parsed.success) return { ok: false, reason: "schema" };
	parent[leaf] = parsed.data;
	return { ok: true };
};
