import type { ClassicySystemArtKey } from "@/Appearance/ClassicyAssetRegistry";
import type { ClassicyAssetSource } from "@/Appearance/ClassicyAssetSource";

// Plain (query-less) imports, so the build emits each file to dist/assets/
// instead of inlining it (`noInlineAppearanceAssetsPlugin`, vite.config.ts).
const files = import.meta.glob("./*.{svg,png}", {
	eager: true,
	import: "default",
}) as Record<string, string>;

/**
 * The emitted URL of a file in this folder, by file name (`"sad-mac.png"`), or
 * `""` when there is no such file (which `registerClassicySystemArt` reports as
 * an invalid source). Every lookup of Platinum's art folder goes through this.
 */
export const platinumArt = (name: string): ClassicyAssetSource =>
	files[`./${name}`] ?? "";

const art = platinumArt;

/**
 * Platinum's window, menu, slider and tab art, by system-art key. Data only:
 * `platinumAssets.ts` registers it, so importing this module has no effect.
 *
 * Masks (`fill`/`stroke` is `currentColor`, no intrinsic size, the original
 * `viewBox`): the stripes hold only the dark rows (the element's background
 * paints the light ones), the utility texture is split into its shade and
 * highlight layers, and the glyphs, arrows, thumb outlines, tab outline and
 * halftone are single-color shapes. Images (their grays are the art): the
 * grip, the dither and the slider strikes. In an image context `currentColor`
 * resolves to black, so the thumb outlines and the halftone also draw as
 * images.
 */
export const PLATINUM_SYSTEM_ART: Readonly<
	Partial<Record<ClassicySystemArtKey, ClassicyAssetSource>>
> = {
	windowStripes: art("title-bar-center.svg"),
	windowStripesRed: art("title-bar-center-red.svg"),
	windowUtilityShade: art("window-utility-shade.svg"),
	windowUtilityHighlight: art("window-utility-highlight.svg"),
	windowGrip: art("resizer.svg"),
	windowDither: art("corner-dither.svg"),
	zoomGlyph: art("zoom.svg"),
	collapseGlyph: art("collapse.svg"),
	submenuArrow: art("triangle.svg"),
	popupArrows: art("down-arrow.svg"),
	sliderThumb: art("slider-thumb.svg"),
	sliderThumbRect: art("slider-thumb-rect.svg"),
	sliderStrikes: art("slider-strikes.svg"),
	tabOutline: art("tab-outline.svg"),
	halftone: art("halftone.svg"),
};
