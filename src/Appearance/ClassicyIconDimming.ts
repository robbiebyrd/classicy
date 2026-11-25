import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { getClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import {
	getActiveClassicyAppearancePackageId,
	getActiveClassicyAssetVariant,
	subscribeClassicyAssets,
} from "@/Appearance/ClassicyAssetRegistry";
import {
	dimmedSources,
	reportedSources,
	retryKeys,
	settled,
	settledListeners,
} from "@/Appearance/ClassicyIconDimming.internal";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	type ClassicyThemeColorTarget,
	getThemeColor,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeColorTargets";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * How an Appearance Package dims an icon, per pixel (`ClassicyAppearancePackage.iconDimming`).
 * Each opaque pixel's color goes through three steps, each optional but the
 * first:
 *
 * 1. `blend`: each channel moves `amount` (0–1) of the way to `color`'s,
 *    rounded down. `{ color: "#FFFFFF", amount: 0.5 }` is `(c + 255) >> 1`.
 * 2. `bits`: each channel keeps its top `bits` bits (1–8), expanded back to
 *    8 by repeating them, the way QuickDraw widens a short color component
 *    (4 bits: `0x7` becomes `0x77`).
 * 3. `palette`: the color becomes the palette entry nearest it over all three
 *    channels at once (squared distance; a tie goes to the earlier entry).
 *
 * The alpha channel is never changed, so the icon keeps its mask. Colors are
 * `#RRGGBB`.
 */
export type ClassicyIconDimmingRule = {
	blend: { color: string; amount: number };
	bits?: number;
	palette?: readonly string[];
};

/**
 * An embossed image, the way Windows draws a disabled control's image
 * (DrawState's DSS_DISABLED; a toolbar button's, comctl32's
 * `TOOLBAR_DrawMasked`): every pixel of the image that is opaque (alpha 128
 * or more) and not pure white becomes the `shadow` color, over a copy of the
 * same pixels one pixel down and right in the `highlight` color; every other
 * pixel is clear. The two colors are theme colors (`ClassicyThemeColorTarget`,
 * Windows 98's ButtonHilight and ButtonShadow), read from the active theme
 * when the image is drawn, so the emboss follows the color scheme.
 */
export type ClassicyIconEmbossRule = {
	emboss: {
		highlight: ClassicyThemeColorTarget;
		shadow: ClassicyThemeColorTarget;
	};
};

/** An emboss rule with its theme colors read (`#RRGGBB`), as drawn. */
export type ClassicyIconEmbossColors = {
	emboss: { highlight: string; shadow: string };
};

/** The surfaces a package can declare a dimming rule for. */
export type ClassicyIconDimmingPurpose =
	| "hiddenApp"
	| "disabledItem"
	| "disabledControl";

/**
 * A package's dimming rules (`ClassicyAppearancePackage.iconDimming`):
 * `hiddenApp` is a hidden application's icon in the Application menu (HIG7
 * p.127); `disabledItem` is the icon of a list or tree row that cannot be
 * chosen (`ClassicyTree`'s `disabled` nodes: the files a Save box dims).
 * `disabledControl` is the image of a control that is unavailable (a
 * disabled bevel or toolbar button's icon), and may also be an emboss rule
 * (`ClassicyIconEmbossRule`, Windows 98's). `variants` overrides them under a
 * theme's asset variant (`ClassicyTheme.assetVariant`); `null` there declares
 * no rule, so the package's stylesheet dims the icon its own way (a 1-bit
 * checker, say).
 */
export type ClassicyIconDimming = {
	hiddenApp?: ClassicyIconDimmingRule;
	disabledItem?: ClassicyIconDimmingRule;
	disabledControl?: ClassicyIconDimmingRule | ClassicyIconEmbossRule;
	variants?: Readonly<
		Record<
			string,
			{
				hiddenApp?: ClassicyIconDimmingRule | null;
				disabledItem?: ClassicyIconDimmingRule | null;
				disabledControl?:
					| ClassicyIconDimmingRule
					| ClassicyIconEmbossRule
					| null;
			}
		>
	>;
};

/** A rule as the canvas draws it: a per-pixel rule, or an emboss with its
 * colors read. */
type DrawnRule = ClassicyIconDimmingRule | ClassicyIconEmbossColors;

const isEmbossColors = (rule: DrawnRule): rule is ClassicyIconEmbossColors =>
	"emboss" in rule;

/** The part class an icon drawn with its dimmed image carries, so a
 * package's own dimming (an opacity, the fallback) stands down. */
export const CLASSICY_ICON_DIMMED_IMAGE_CLASS = "classicyIconDimmedImage";

type ParsedRule = {
	target: [number, number, number];
	amount: number;
	bits: number;
	palette: number[] | undefined;
	key: string;
};

const parsedRules = new WeakMap<ClassicyIconDimmingRule, ParsedRule>();

/** A rule's cache key: the same for equal rules, whatever their identity. */
const ruleKey = (rule: DrawnRule): string =>
	isEmbossColors(rule) ? JSON.stringify(rule) : parse(rule).key;

const hex = (value: string): number => Number.parseInt(value.slice(1), 16);

const parse = (rule: ClassicyIconDimmingRule): ParsedRule => {
	const cached = parsedRules.get(rule);
	if (cached) return cached;
	const color = hex(rule.blend.color);
	const parsed: ParsedRule = {
		target: [(color >> 16) & 255, (color >> 8) & 255, color & 255],
		amount: rule.blend.amount,
		bits: rule.bits ?? 8,
		palette: rule.palette?.map(hex),
		key: JSON.stringify(rule),
	};
	parsedRules.set(rule, parsed);
	return parsed;
};

/** `value`'s top `bits` bits, repeated to fill 8. */
const expand = (value: number, bits: number): number => {
	if (bits >= 8) return value;
	const top = value >> (8 - bits);
	let wide = 0;
	let filled = 0;
	while (filled < 8) {
		wide = (wide << bits) | top;
		filled += bits;
	}
	return wide >> (filled - 8);
};

const nearest = (palette: number[], r: number, g: number, b: number) => {
	let best = palette[0];
	let bestDistance = Number.POSITIVE_INFINITY;
	for (const entry of palette) {
		const dr = ((entry >> 16) & 255) - r;
		const dg = ((entry >> 8) & 255) - g;
		const db = (entry & 255) - b;
		const distance = dr * dr + dg * dg + db * db;
		if (distance < bestDistance) {
			best = entry;
			bestDistance = distance;
		}
	}
	return best;
};

/**
 * Applies `rule` to RGBA pixels in place (`ImageData.data`). A fully clear
 * pixel is left as it is; every other pixel keeps its alpha.
 */
export const dimClassicyIconPixels = (
	data: Uint8ClampedArray,
	rule: ClassicyIconDimmingRule,
): void => {
	const { target, amount, bits, palette } = parse(rule);
	const memo = new Map<number, number>();
	for (let i = 0; i < data.length; i += 4) {
		if (data[i + 3] === 0) continue;
		const source = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
		let out = memo.get(source);
		if (out === undefined) {
			const [r, g, b] = [data[i], data[i + 1], data[i + 2]].map((c, n) =>
				expand(Math.floor(c + (target[n] - c) * amount), bits),
			);
			out = palette?.length
				? nearest(palette, r, g, b)
				: (r << 16) | (g << 8) | b;
			memo.set(source, out);
		}
		data[i] = (out >> 16) & 255;
		data[i + 1] = (out >> 8) & 255;
		data[i + 2] = out & 255;
	}
};

/**
 * Embosses RGBA pixels (`ImageData.data`, `width` × `height`) in place, as
 * DrawState's DSS_DISABLED does (`ClassicyIconEmbossRule`): each pixel that
 * is opaque (alpha 128 or more) and not pure white is ink; the result is the
 * ink in `shadow` over the same ink one pixel down and right in `highlight`,
 * fully opaque, and clear everywhere else. Colors are `#RRGGBB`.
 */
export const embossClassicyIconPixels = (
	data: Uint8ClampedArray,
	width: number,
	height: number,
	highlight: string,
	shadow: string,
): void => {
	const ink = new Uint8Array(width * height);
	for (let i = 0; i < ink.length; i++) {
		const at = i * 4;
		const white =
			data[at] === 255 && data[at + 1] === 255 && data[at + 2] === 255;
		ink[i] = data[at + 3] >= 128 && !white ? 1 : 0;
	}
	const light = hex(highlight);
	const dark = hex(shadow);
	const paint = (i: number, color: number) => {
		const at = i * 4;
		data[at] = (color >> 16) & 255;
		data[at + 1] = (color >> 8) & 255;
		data[at + 2] = color & 255;
		data[at + 3] = 255;
	};
	data.fill(0);
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++)
			if (ink[y * width + x] && x + 1 < width && y + 1 < height)
				paint((y + 1) * width + x + 1, light);
	for (let i = 0; i < ink.length; i++) if (ink[i]) paint(i, dark);
};

const loadImage = (src: string): Promise<HTMLImageElement | undefined> =>
	new Promise((resolve) => {
		const image = new Image();
		// A cross-origin icon served with CORS stays readable; one served
		// without it fails to load here, and draws undimmed by the rule.
		image.crossOrigin = "anonymous";
		image.onload = () => resolve(image);
		image.onerror = () => resolve(undefined);
		image.src = src;
	});

const reportUnreadable = (src: string, why: string): void => {
	if (reportedSources.has(src)) return;
	reportedSources.add(src);
	classicyLog(
		"warn",
		"Appearance",
		`Icon ${src} ${why}; it is dimmed by the stylesheet instead`,
	);
};

const draw = async (
	src: string,
	rule: DrawnRule,
	size: number | undefined,
	key: string,
): Promise<string | undefined> => {
	const image = await loadImage(src);
	if (!image) {
		// The real path for a cross-origin icon served without CORS (the load
		// itself fails under `crossOrigin = "anonymous"`), but also a network
		// error: not cached for good, so a later request tries again.
		retryKeys.add(key);
		reportUnreadable(
			src,
			"failed to load for dimming (a cross-origin icon without CORS headers, or a network error)",
		);
		return undefined;
	}
	// A size that is not a finite number (a surface that draws the icon at
	// whatever size it is) takes the image's own.
	const drawn = size !== undefined && Number.isFinite(size) ? size : undefined;
	const width = drawn ?? image.naturalWidth ?? 0;
	const height = drawn ?? image.naturalHeight ?? 0;
	if (width <= 0 || height <= 0) return undefined;
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return undefined;
	ctx.drawImage(image, 0, 0, width, height);
	try {
		const pixels = ctx.getImageData(0, 0, width, height);
		if (isEmbossColors(rule))
			embossClassicyIconPixels(
				pixels.data,
				width,
				height,
				rule.emboss.highlight,
				rule.emboss.shadow,
			);
		else dimClassicyIconPixels(pixels.data, rule);
		ctx.putImageData(pixels, 0, 0);
		return canvas.toDataURL("image/png");
	} catch {
		// A cross-origin icon taints the canvas: its pixels cannot be read
		// (the one case a browser forbids), so the package's stylesheet dims
		// it its own way.
		reportUnreadable(
			src,
			"cannot be read from a canvas (cross-origin without CORS)",
		);
		return undefined;
	}
};

/**
 * The icon at `src` dimmed by `rule` (a per-pixel rule, or an emboss with its
 * colors read), as a `data:` URL, drawn `size` px square (else at its natural
 * size); `undefined` when the icon cannot be
 * read (it failed to load, has no size, or taints the canvas). Cached per
 * source, rule and size for the page, except a failed load, which is drawn
 * again on the next request (the failure may be transient). A source that
 * cannot be read logs one `warn` for the page.
 */
export const classicyDimmedIconSource = (
	src: string,
	rule: ClassicyIconDimmingRule | ClassicyIconEmbossColors,
	size?: number,
): Promise<string | undefined> => {
	const key = `${ruleKey(rule)}|${size ?? ""}|${src}`;
	let pending = dimmedSources.get(key);
	if (!pending) {
		pending =
			typeof document === "undefined" || typeof Image === "undefined"
				? Promise.resolve(undefined)
				: draw(src, rule, size, key).catch(() => undefined);
		pending.then((result) => {
			if (retryKeys.delete(key)) dimmedSources.delete(key);
			settled.set(key, result);
			for (const listener of [...settledListeners]) listener();
		});
		dimmedSources.set(key, pending);
	}
	return pending;
};

/**
 * The active package's rule for `purpose`, under the active theme's asset
 * variant; `undefined` when it declares none. Store-free. Only
 * `disabledControl` may be an emboss rule.
 */
export function resolveClassicyIconDimmingRule(
	purpose: "hiddenApp" | "disabledItem",
	packageId?: string,
	variant?: string,
): ClassicyIconDimmingRule | undefined;
export function resolveClassicyIconDimmingRule(
	purpose: ClassicyIconDimmingPurpose,
	packageId?: string,
	variant?: string,
): ClassicyIconDimmingRule | ClassicyIconEmbossRule | undefined;
export function resolveClassicyIconDimmingRule(
	purpose: ClassicyIconDimmingPurpose,
	packageId: string = getActiveClassicyAppearancePackageId(),
	variant: string | undefined = getActiveClassicyAssetVariant(),
): ClassicyIconDimmingRule | ClassicyIconEmbossRule | undefined {
	const dimming = getClassicyAppearancePackage(packageId)?.iconDimming;
	if (!dimming) return undefined;
	const byVariant =
		variant !== undefined &&
		dimming.variants &&
		Object.hasOwn(dimming.variants, variant)
			? dimming.variants[variant]
			: undefined;
	if (byVariant && Object.hasOwn(byVariant, purpose))
		return byVariant[purpose] ?? undefined;
	return dimming[purpose];
}

/**
 * An emboss rule's colors read from `theme` (the active theme: Windows 98's
 * ButtonHilight and ButtonShadow of the scheme drawn), as `#RRGGBB`;
 * `undefined` without a theme.
 */
export const classicyIconEmbossColors = (
	rule: ClassicyIconEmbossRule,
	theme: ClassicyTheme | undefined,
): ClassicyIconEmbossColors | undefined => {
	if (!theme?.color) return undefined;
	const color = (target: ClassicyThemeColorTarget) =>
		`#${getThemeColor(theme, target).toString(16).padStart(6, "0")}`;
	return {
		emboss: {
			highlight: color(rule.emboss.highlight),
			shadow: color(rule.emboss.shadow),
		},
	};
};

const isEmbossRule = (
	rule: ClassicyIconDimmingRule | ClassicyIconEmbossRule | undefined,
): rule is ClassicyIconEmbossRule => !!rule && "emboss" in rule;

// What an icon that is not dimmed subscribes with: nothing, so the many icons
// that never dim hold no listener on the asset registry or the settled set.
const subscribeNothing = (): (() => void) => () => {};

const subscribeSettled = (listener: () => void): (() => void) => {
	settledListeners.add(listener);
	return () => {
		settledListeners.delete(listener);
	};
};

/**
 * The image an icon draws when `dimmed`: its image dimmed by the active
 * package's `purpose` rule, once drawn, else `src`. `drawsDimmedImage` says
 * which, for the `DimmedImage` part class.
 */
export const useClassicyDimmedIconImage = (
	src: string,
	dimmed: boolean,
	purpose: ClassicyIconDimmingPurpose = "hiddenApp",
	size?: number,
): { image: string; drawsDimmedImage: boolean } => {
	const getRule = useCallback(
		() => (dimmed ? resolveClassicyIconDimmingRule(purpose) : undefined),
		[dimmed, purpose],
	);
	const declared = useSyncExternalStore(
		dimmed ? subscribeClassicyAssets : subscribeNothing,
		getRule,
		getRule,
	);
	// An emboss rule's colors come from the active theme, read through the
	// asset registry's link to the store (store-free here, as the rest of the
	// module is) as a string, a stable snapshot, while one is declared; the
	// registry's listeners hear every store change, so a scheme change
	// redraws.
	const emboss = isEmbossRule(declared) ? declared : undefined;
	const getEmbossColors = useCallback(() => {
		if (!emboss) return "";
		const colors = classicyIconEmbossColors(
			emboss,
			getClassicyAssetPackageSource()?.getActiveTheme?.() as
				| ClassicyTheme
				| undefined,
		);
		return colors ? JSON.stringify(colors) : "";
	}, [emboss]);
	const embossColors = useSyncExternalStore(
		emboss ? subscribeClassicyAssets : subscribeNothing,
		getEmbossColors,
		getEmbossColors,
	);
	const rule = useMemo<DrawnRule | undefined>(
		() =>
			emboss
				? embossColors
					? (JSON.parse(embossColors) as ClassicyIconEmbossColors)
					: undefined
				: (declared as ClassicyIconDimmingRule | undefined),
		[declared, emboss, embossColors],
	);
	const key = rule && src ? `${ruleKey(rule)}|${size ?? ""}|${src}` : "";
	useEffect(() => {
		// Settling notifies `subscribeSettled`, which re-reads below.
		if (rule && src) void classicyDimmedIconSource(src, rule, size);
	}, [rule, src, size]);
	const dimmedImage = useSyncExternalStore(
		dimmed ? subscribeSettled : subscribeNothing,
		() => (key ? settled.get(key) : undefined),
		() => undefined,
	);
	return dimmedImage
		? { image: dimmedImage, drawsDimmedImage: true }
		: { image: src, drawsDimmedImage: false };
};
