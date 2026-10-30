import { z } from "zod";
import type { ClassicyAssetKind } from "@/Appearance/ClassicyAssetRegistry";
import { isClassicyAssetSource } from "@/Appearance/ClassicyAssetSource";
import { ClassicyThemeSchema } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema";
import { ClassicySoundPackSchema } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import type {
	ClassicyAppearanceKnobs,
	ClassicyAppearanceLayout,
	ClassicyAppearancePackage,
	ClassicyAppIdentityOverride,
} from "./ClassicyAppearancePackage";

/** The three arrangement groups; every group is required. */
export const ClassicyAppearanceLayoutSchema = z.object({
	window: z.object({
		growBoxCorner: z.enum([
			"bottom-right",
			"bottom-left",
			"top-right",
			"top-left",
		]),
	}),
	menuBar: z.object({ placement: z.enum(["screen", "window"]) }),
	desktop: z.object({
		iconGridOrigin: z.enum([
			"top-right",
			"top-left",
			"bottom-right",
			"bottom-left",
		]),
	}),
}) satisfies z.ZodType<ClassicyAppearanceLayout>;

// Every ClassicyAssetKind, once. The `satisfies` and the check below fail the
// type check when the registry gains or loses a kind.
const ASSET_KINDS = [
	"icons",
	"cursors",
	"wallpapers",
	"fonts",
	"systemArt",
] as const satisfies readonly ClassicyAssetKind[];
type AssertTrue<T extends true> = T;
type _EveryAssetKindListed = AssertTrue<
	ClassicyAssetKind extends (typeof ASSET_KINDS)[number] ? true : false
>;

type AssetTreeInput = { [key: string]: string | AssetTreeInput };
const assetTree: z.ZodType<AssetTreeInput> = z.lazy(() =>
	z.record(
		z.string(),
		z.union([
			z.string().refine(isClassicyAssetSource, {
				error: "must be an asset source (a URL or a data: URI)",
			}),
			assetTree,
		]),
	),
);

// A knob's default must be a value its own bounds allow (and so min <= max):
// classicyKnobsToSchema turns these into `.min().max().default()`.
const knob = z
	.object({
		label: z.string().trim().min(1).max(64),
		min: z.number(),
		max: z.number(),
		default: z.number(),
	})
	.refine((k) => k.min <= k.default && k.default <= k.max, {
		error: "must satisfy min <= default <= max",
	});

// Keys that would reach Object.prototype through a plain-object lookup. The
// registry stores the package object as given, not the parsed one, so these
// are refused rather than stripped.
const FORBIDDEN_KEYS: ReadonlySet<string> = new Set([
	"__proto__",
	"constructor",
	"prototype",
]);
const FORBIDDEN_KEY_ERROR = "must not be __proto__, constructor or prototype";

const appIdKey = z
	.string()
	.min(1)
	.max(128)
	.refine((id) => !FORBIDDEN_KEYS.has(id), { error: FORBIDDEN_KEY_ERROR })
	.describe('An app id, as passed to `ClassicyApp` (`"MoviePlayer.app"`).');

// The derived Applications and Extensions folders key their entries by the
// display name, so it must be usable as a file-system name: no leading `_`
// (metadata keys), no `:` (the path separator), no control character (C0,
// DEL, C1) or line/paragraph separator (U+2028, U+2029), and no bidi control
// (U+202A–U+202E, U+2066–U+2069; the marks U+200E, U+200F, U+061C) or
// invisible character (U+200B, U+2060, U+FEFF, the soft hyphen U+00AD), which
// could make a label read as another app's. The joiners U+200C and U+200D
// stay allowed: emoji sequences and several scripts need them. Refinements,
// never `.trim()`: the registry keeps the original object, so nothing may be
// transformed. The length checks keep zod's own messages, which name the
// bound.
const DISPLAY_NAME_ERROR =
	"must be a display name usable as a file name (no leading _, no :)";
const hasUnsafeCharacter = (text: string): boolean => {
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (
			code <= 0x1f ||
			(code >= 0x7f && code <= 0x9f) ||
			code === 0x2028 ||
			code === 0x2029 ||
			(code >= 0x202a && code <= 0x202e) ||
			(code >= 0x2066 && code <= 0x2069) ||
			code === 0x200b ||
			code === 0x200e ||
			code === 0x200f ||
			code === 0x061c ||
			code === 0x2060 ||
			code === 0x00ad ||
			code === 0xfeff
		) {
			return true;
		}
	}
	return false;
};
const displayName = z
	.string()
	.min(1)
	.max(64)
	.refine(
		(name) =>
			name === name.trim() &&
			!name.startsWith("_") &&
			!name.includes(":") &&
			!hasUnsafeCharacter(name) &&
			!FORBIDDEN_KEYS.has(name),
		{ error: DISPLAY_NAME_ERROR },
	);

/** One app's display override in a package's `apps`. Unknown keys are refused. */
export const ClassicyAppIdentityOverrideSchema = z
	.strictObject({
		name: displayName
			.optional()
			.describe("Shown wherever the app's name is shown, in place of its own."),
		icon: z
			.string()
			.refine(isClassicyAssetSource, {
				error: "must be an asset source (a URL or a data: URI)",
			})
			.optional()
			.describe("Shown wherever the app's icon is shown, in place of its own."),
		description: z
			.string()
			.min(1)
			.max(512)
			.refine((text) => text === text.trim(), {
				error: "must not start or end with whitespace",
			})
			.optional()
			.describe(
				"Balloon-help copy for the app's desktop icon when the app supplies none.",
			),
	})
	.describe(
		"A package's display override for one app. Display only: the app's id, action types, routing and saved state never change.",
	) satisfies z.ZodType<ClassicyAppIdentityOverride>;

const appsRecord = z.record(appIdKey, ClassicyAppIdentityOverrideSchema);

// zod's record skips an own `__proto__` key without an issue (it is never
// copied into the parsed output), and the registry keeps the object as
// given, so the raw input's keys are checked before the record parses it.
const appsWithoutForbiddenKeys = z.custom<z.input<typeof appsRecord>>(
	(value) =>
		typeof value !== "object" ||
		value === null ||
		!Reflect.ownKeys(value).some(
			(key) => typeof key === "string" && FORBIDDEN_KEYS.has(key),
		),
	{ error: `app ids ${FORBIDDEN_KEY_ERROR}` },
);

/**
 * Everything in a `ClassicyAppearancePackage` but `css`, `options` and
 * `hooks` (code and compiled CSS, which no schema can vouch for). Unknown
 * keys, those three included, are stripped from the parsed output.
 */
export const ClassicyAppearancePackageSchema = z
	.object({
		id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be a kebab-case id"),
		name: z.string().trim().min(1).max(64),
		defaults: ClassicyThemeSchema,
		presets: z.array(ClassicyThemeSchema).max(256).optional(),
		knobs: z.record(z.string(), z.record(z.string(), knob)).optional(),
		layout: ClassicyAppearanceLayoutSchema,
		assets: z.partialRecord(z.enum(ASSET_KINDS), assetTree).optional(),
		sounds: z.array(ClassicySoundPackSchema).optional(),
		apps: appsWithoutForbiddenKeys
			.pipe(appsRecord)
			.optional()
			.describe(
				"Per-app display overrides keyed by app id (\"MoviePlayer.app\"): a name, icon or balloon description shown in place of the app's own. Display only; the app's id, action types and saved state keep its own identity.",
			),
	})
	// The defaults are the theme a switch to this package activates; one that
	// names another package would make ChangeAppearancePackage re-clone it on
	// every switch and leave the active theme claiming the wrong package.
	// (Presets are not checked here: preset lists belong to part J.)
	.check((ctx) => {
		const { id, defaults } = ctx.value;
		if (defaults.package !== id) {
			ctx.issues.push({
				code: "custom",
				input: defaults.package,
				path: ["defaults", "package"],
				message: `must be the package id "${id}", not "${defaults.package}"`,
			});
		}
	});

// Compile-time guard: whatever the schema accepts is a valid package once
// `css` (and optionally `options`/`hooks`) is added. Not exported, so it
// stays out of the public barrel.
type _ClassicyAppearancePackageSchemaMatchesType = AssertTrue<
	z.output<typeof ClassicyAppearancePackageSchema> & {
		css: string;
	} extends ClassicyAppearancePackage
		? true
		: false
>;

/**
 * The `options` schema for a package's knobs: per family an object of
 * bounded numbers, each defaulting to its knob's `default`, and each family
 * defaulting as a whole. Families the knobs do not name pass through.
 */
export const classicyKnobsToSchema = (
	knobs: ClassicyAppearanceKnobs,
	// biome-ignore lint/suspicious/noExplicitAny: the contract's return type; the shape is the caller's knobs.
): z.ZodObject<any> =>
	z.looseObject(
		Object.fromEntries(
			Object.entries(knobs).map(([family, keys]) => [
				family,
				z
					.object(
						Object.fromEntries(
							Object.entries(keys).map(([key, k]) => [
								key,
								z.number().min(k.min).max(k.max).default(k.default),
							]),
						),
					)
					.prefault({}),
			]),
		),
	);
