import { z } from "zod";
import type { ClassicyAssetKind } from "@/Appearance/ClassicyAssetRegistry";
import { isClassicyAssetSource } from "@/Appearance/ClassicyAssetSource";
import { CLASSICY_MEASUREMENT_NAME } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import { ClassicyPackageThemeSchema } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema";
import { ClassicySoundPackSchema } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import type {
	ClassicyAppearanceKnobs,
	ClassicyAppearanceLayout,
	ClassicyAppearancePackage,
	ClassicyAppIdentityOverride,
} from "./ClassicyAppearancePackage";

// A component's pattern origin (`patternOrigin`), every component's key
// optional; another key is refused (CLASSICY_PATTERN_ORIGIN_COMPONENTS).
const patternOrigin = z.enum(["element", "window", "desktop"]).optional();

/**
 * The three arrangement groups, every one required, and the optional
 * behavior groups (`scrollBar`, `patternOrigin`, `slider`, `fileDialog`,
 * `fileBrowser`), each key of which is optional too.
 */
export const ClassicyAppearanceLayoutSchema = z.object({
	window: z.object({
		growBoxCorner: z.enum([
			"bottom-right",
			"bottom-left",
			"top-right",
			"top-left",
		]),
		centering: z.enum(["exact", "wholePixel"]).optional(),
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
	scrollBar: z
		.object({
			thumbDrag: z.enum(["live", "onRelease"]).optional(),
			fitsBars: z.enum(["hidden", "shown"]).optional(),
			patternOrigin: z.enum(["element", "window"]).optional(),
		})
		.optional(),
	patternOrigin: z
		.strictObject({
			ControlGroup: patternOrigin,
			PopUpMenu: patternOrigin,
			Separator: patternOrigin,
			Slider: patternOrigin,
			elements: z
				.array(
					z.strictObject({
						// Not parsed here: a selector newer than the browser
						// would refuse the whole package; the core skips it.
						selector: z.string().trim().min(1).max(1024),
						origin: z.enum(["window", "desktop"]),
					}),
				)
				.readonly()
				.optional(),
		})
		.optional(),
	slider: z
		.object({ thumbDrag: z.enum(["live", "onRelease"]).optional() })
		.optional(),
	fileDialog: z
		.object({
			frame: z.enum(["movable", "fixed"]).optional(),
			navigation: z.enum(["tree", "flat"]).optional(),
			saveName: z.enum(["plain", "selected"]).optional(),
		})
		.optional(),
	fileBrowser: z
		.object({
			listColumnTitles: z.enum(["inList", "aboveList"]).optional(),
		})
		.optional(),
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

// A package color family's metadata (`colorFamilies`): names that become a
// `--package-color-<family>-<key>` variable, and a label for each.
const colorFamilyName = z
	.string()
	.regex(
		CLASSICY_MEASUREMENT_NAME,
		"must be a camelCase name starting with a lowercase letter",
	)
	.refine((name) => !["constructor", "prototype"].includes(name), {
		error: "must not be constructor or prototype",
	});
const colorFamilyLabel = z.string().trim().min(1).max(64);
const colorFamilies = z.record(
	colorFamilyName,
	z.object({
		label: colorFamilyLabel,
		colors: z.record(colorFamilyName, z.object({ label: colorFamilyLabel })),
	}),
);

// Keys that would reach Object.prototype through a plain-object lookup. The
// registry stores the package object as given (its `apps` as a frozen copy of
// the parsed value), so these are refused rather than stripped.
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
// invisible character, which could make a label read as another app's: U+200B,
// U+2060, U+FEFF, the soft hyphen U+00AD, the invisible operators
// U+2061–U+2064, the Hangul fillers (U+115F, U+1160, U+3164, U+FFA0), the tag
// characters U+E0000–U+E007F, and the variation selectors U+FE00–U+FE0F and
// U+E0100–U+E01EF, except VS16 (U+FE0F) right after an emoji, which is part
// of the emoji (K-R13). Checked by code point, so characters outside the BMP
// are seen. The joiners U+200C and U+200D stay allowed: emoji sequences and
// several scripts need them. Refinements, never `.trim()`: the registry keeps
// the package as given and `apps` as the parsed value, which must equal what
// the package declared, so nothing may be transformed. The length checks keep
// zod's own messages, which name the bound.
const DISPLAY_NAME_ERROR =
	"must be a display name usable as a file name (no leading _, no :)";
const isUnsafeCodePoint = (code: number): boolean =>
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
	(code >= 0x2061 && code <= 0x2064) ||
	code === 0x00ad ||
	code === 0xfeff ||
	code === 0x115f ||
	code === 0x1160 ||
	code === 0x3164 ||
	code === 0xffa0 ||
	(code >= 0xe0000 && code <= 0xe007f);
const VS16 = 0xfe0f;
const isVariationSelector = (code: number): boolean =>
	(code >= 0xfe00 && code <= 0xfe0f) || (code >= 0xe0100 && code <= 0xe01ef);
const EMOJI = /^\p{Emoji}$/u;
const hasUnsafeCharacter = (text: string): boolean => {
	let previous = "";
	for (const char of text) {
		const code = char.codePointAt(0) as number;
		if (isUnsafeCodePoint(code)) return true;
		if (isVariationSelector(code) && !(code === VS16 && EMOJI.test(previous))) {
			return true;
		}
		previous = char;
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
// copied into the parsed output), and an override the parse dropped must not
// pass silently, so the raw input's keys are checked before the record
// parses it.
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
const dimmingColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "must be #RRGGBB");

const iconDimmingRule = z
	.object({
		blend: z.object({
			color: dimmingColor,
			amount: z.number().min(0).max(1),
		}),
		bits: z.number().int().min(1).max(8).optional(),
		palette: z.array(dimmingColor).min(1).max(256).optional(),
	})
	.strict();

const iconDimming = z
	.object({
		hiddenApp: iconDimmingRule.optional(),
		disabledItem: iconDimmingRule.optional(),
		variants: z
			.record(
				z.string(),
				z
					.object({
						hiddenApp: iconDimmingRule.nullable().optional(),
						disabledItem: iconDimmingRule.nullable().optional(),
					})
					.strict(),
			)
			.optional(),
	})
	.strict();

export const ClassicyAppearancePackageSchema = z
	.object({
		id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be a kebab-case id"),
		name: z.string().trim().min(1).max(64),
		icon: z
			.string()
			.refine(isClassicyAssetSource, {
				error: "must be an asset source (a URL or a data: URI)",
			})
			.optional()
			.describe(
				"The package's icon, shown beside its name (the Appearance Manager's Themes tab); a generic package glyph is shown without one.",
			),
		defaults: ClassicyPackageThemeSchema,
		presets: z.array(ClassicyPackageThemeSchema).max(256).optional(),
		knobs: z.record(z.string(), z.record(z.string(), knob)).optional(),
		colorFamilies: colorFamilies
			.optional()
			.describe(
				"Labels for the package's own colors (defaults.color.families), which the Appearance Manager's Colors tab edits.",
			),
		layout: ClassicyAppearanceLayoutSchema,
		assets: z.partialRecord(z.enum(ASSET_KINDS), assetTree).optional(),
		sounds: z.array(ClassicySoundPackSchema).optional(),
		helpMenu: z
			.object({ aboutTitle: z.string().min(1).optional() })
			.strict()
			.optional()
			.describe(
				'The standard Help menu\'s wording: aboutTitle is its first item (Mac OS 8: "About Help", HIGOS8 Figure 4-2; System 7: "About Balloon Help…", HIGOS7 Figure 4-88).',
			),
		defaultScreenSaver: z
			.string()
			.min(1)
			.optional()
			.describe(
				"The id of the screen saver the package prefers when the user's stored choice is not offered under it.",
			),
		apps: appsWithoutForbiddenKeys
			.pipe(appsRecord)
			.optional()
			.describe(
				"Per-app display overrides keyed by app id (\"MoviePlayer.app\"): a name, icon or balloon description shown in place of the app's own. Display only; the app's id, action types and saved state keep its own identity.",
			),
		iconDimming: iconDimming
			.optional()
			.describe(
				"How the package dims an icon per pixel (a hidden application's icon): blend each channel toward a color, keep the top bits of each, then take the nearest palette entry. Per asset variant, null declares none.",
			),
	})
	// The defaults are the theme a switch to this package activates; one that
	// names another package would make ChangeAppearancePackage re-clone it on
	// every switch and leave the active theme claiming the wrong package.
	// (Presets are not checked here: preset lists belong to part J.)
	// Every declared color needs a value in the defaults: the Colors tab
	// shows it, and themes are completed from it.
	.check((ctx) => {
		const families = ctx.value.defaults.color.families ?? {};
		for (const [family, { colors }] of Object.entries(
			ctx.value.colorFamilies ?? {},
		)) {
			for (const key of Object.keys(colors)) {
				const values = Object.hasOwn(families, family)
					? families[family]
					: undefined;
				if (!values || !Object.hasOwn(values, key)) {
					ctx.issues.push({
						code: "custom",
						input: key,
						path: ["colorFamilies", family, "colors", key],
						message: `has no value in defaults.color.families.${family}`,
					});
				}
			}
		}
	})
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
