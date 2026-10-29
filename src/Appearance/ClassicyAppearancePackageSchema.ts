import { z } from "zod";
import type { ClassicyAssetKind } from "@/Appearance/ClassicyAssetRegistry";
import { isClassicyAssetSource } from "@/Appearance/ClassicyAssetSource";
import { ClassicyThemeSchema } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema";
import { ClassicySoundPackSchema } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import type {
	ClassicyAppearanceKnobs,
	ClassicyAppearanceLayout,
	ClassicyAppearancePackage,
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

const knob = z.object({
	label: z.string().trim().min(1).max(64),
	min: z.number(),
	max: z.number(),
	default: z.number(),
});

/**
 * Everything in a `ClassicyAppearancePackage` but `css`, `options` and
 * `hooks` (code and compiled CSS, which no schema can vouch for). Unknown
 * keys, those three included, are stripped from the parsed output.
 */
export const ClassicyAppearancePackageSchema = z.object({
	id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be a kebab-case id"),
	name: z.string().trim().min(1).max(64),
	defaults: ClassicyThemeSchema,
	presets: z.array(ClassicyThemeSchema).max(256).optional(),
	knobs: z.record(z.string(), z.record(z.string(), knob)).optional(),
	layout: ClassicyAppearanceLayoutSchema,
	assets: z.partialRecord(z.enum(ASSET_KINDS), assetTree).optional(),
	sounds: z.array(ClassicySoundPackSchema).optional(),
});

// Compile-time guard: whatever the schema accepts is a valid package once
// `css` (and optionally `options`/`hooks`) is added.
export type ClassicyAppearancePackageSchemaMatchesType = AssertTrue<
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
