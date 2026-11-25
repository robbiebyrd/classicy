import { useCallback, useEffect, useSyncExternalStore } from "react";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
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
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * How an Appearance Package dims an icon, per pixel (`ClassicyAppearancePackage.iconDimming`).
 * Each opaque pixel's color goes through three steps, each optional but the
 * first:
 *
 * 1. `blend`: each channel moves `amount` (0–1) of the way to `color`'s,
 *    rounded down. `{ color: "#FFFFFF", amount: 0.5 }` is `(c + 255) >> 1`.
 *    With `depth: 16` the blend is made on 16-bit components, as QuickDraw's
 *    `RGBColor` holds them: each channel widened to `c * 257`, moved, rounded
 *    down, and its high byte kept. Halfway to white that is the high byte of
 *    `(c * 257 + 65535) / 2` (0x00 to 0x7F, 0x44 to 0xA2, 0xCC to 0xE6), where
 *    the 8-bit blend gives 0xA1 and 0xE5. `depth` defaults to 8.
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
	blend: { color: string; amount: number; depth?: 8 | 16 };
	bits?: number;
	palette?: readonly string[];
};

/** The surfaces a package can declare a dimming rule for. */
export type ClassicyIconDimmingPurpose = "hiddenApp" | "disabledItem";

/**
 * A package's dimming rules (`ClassicyAppearancePackage.iconDimming`):
 * `hiddenApp` is a hidden application's icon in the Application menu (HIG7
 * p.127); `disabledItem` is the icon of a list or tree row that cannot be
 * chosen (`ClassicyTree`'s `disabled` nodes: the files a Save box dims).
 * `variants` overrides them under a theme's asset variant
 * (`ClassicyTheme.assetVariant`); `null` there declares no rule, so the
 * package's stylesheet dims the icon its own way (a 1-bit checker, say).
 */
export type ClassicyIconDimming = {
	hiddenApp?: ClassicyIconDimmingRule;
	disabledItem?: ClassicyIconDimmingRule;
	variants?: Readonly<
		Record<
			string,
			{
				hiddenApp?: ClassicyIconDimmingRule | null;
				disabledItem?: ClassicyIconDimmingRule | null;
			}
		>
	>;
};

/** The part class an icon drawn with its dimmed image carries, so a
 * package's own dimming (an opacity, the fallback) stands down. */
export const CLASSICY_ICON_DIMMED_IMAGE_CLASS = "classicyIconDimmedImage";

type ParsedRule = {
	target: [number, number, number];
	amount: number;
	depth: 8 | 16;
	bits: number;
	palette: number[] | undefined;
	key: string;
};

const parsedRules = new WeakMap<ClassicyIconDimmingRule, ParsedRule>();

const hex = (value: string): number => Number.parseInt(value.slice(1), 16);

const parse = (rule: ClassicyIconDimmingRule): ParsedRule => {
	const cached = parsedRules.get(rule);
	if (cached) return cached;
	const color = hex(rule.blend.color);
	const parsed: ParsedRule = {
		target: [(color >> 16) & 255, (color >> 8) & 255, color & 255],
		amount: rule.blend.amount,
		depth: rule.blend.depth ?? 8,
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
	const { target, amount, depth, bits, palette } = parse(rule);
	// One channel blended at the rule's depth, back to 8 bits.
	const blend =
		depth === 16
			? (c: number, t: number) =>
					Math.floor(c * 257 + (t * 257 - c * 257) * amount) >> 8
			: (c: number, t: number) => Math.floor(c + (t - c) * amount);
	const memo = new Map<number, number>();
	for (let i = 0; i < data.length; i += 4) {
		if (data[i + 3] === 0) continue;
		const source = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
		let out = memo.get(source);
		if (out === undefined) {
			const [r, g, b] = [data[i], data[i + 1], data[i + 2]].map((c, n) =>
				expand(blend(c, target[n]), bits),
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
	rule: ClassicyIconDimmingRule,
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
	const width = size ?? image.naturalWidth ?? 0;
	const height = size ?? image.naturalHeight ?? 0;
	if (width <= 0 || height <= 0) return undefined;
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return undefined;
	ctx.drawImage(image, 0, 0, width, height);
	try {
		const pixels = ctx.getImageData(0, 0, width, height);
		dimClassicyIconPixels(pixels.data, rule);
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
 * The icon at `src` dimmed by `rule`, as a `data:` URL, drawn `size` px
 * square (else at its natural size); `undefined` when the icon cannot be
 * read (it failed to load, has no size, or taints the canvas). Cached per
 * source, rule and size for the page, except a failed load, which is drawn
 * again on the next request (the failure may be transient). A source that
 * cannot be read logs one `warn` for the page.
 */
export const classicyDimmedIconSource = (
	src: string,
	rule: ClassicyIconDimmingRule,
	size?: number,
): Promise<string | undefined> => {
	const key = `${parse(rule).key}|${size ?? ""}|${src}`;
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
 * variant; `undefined` when it declares none. Store-free.
 */
export const resolveClassicyIconDimmingRule = (
	purpose: ClassicyIconDimmingPurpose,
	packageId: string = getActiveClassicyAppearancePackageId(),
	variant: string | undefined = getActiveClassicyAssetVariant(),
): ClassicyIconDimmingRule | undefined => {
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
};

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
	const rule = useSyncExternalStore(
		dimmed ? subscribeClassicyAssets : subscribeNothing,
		getRule,
		getRule,
	);
	const key = rule && src ? `${parse(rule).key}|${size ?? ""}|${src}` : "";
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
