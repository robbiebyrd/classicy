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
 * Images in their own colors: the title-bar stripes (gray and red) and the
 * windoid texture, which each band draws as its background image (owner
 * ruling E20: masks blend the anti-aliased row boundaries of a band drawn at
 * a fractional scale or position differently from the one image), the grip,
 * the dither and the slider strikes (their grays are the art), and the
 * QuickTime controller's seek and volume thumbs.
 *
 * Single-color shapes (`fill`/`stroke` is `currentColor`, no intrinsic size,
 * the original `viewBox`): the zoom and collapse glyphs, the menu and pop-up
 * arrows, the thumb outlines, the tab outline and the halftone. Platinum draws
 * all of them as images, where `currentColor` resolves to black, except the
 * halftone, which `platinum-halftone` uses as a mask; a package could use any
 * of them as masks over its own colors.
 */
export const PLATINUM_SYSTEM_ART: Readonly<
	Partial<Record<ClassicySystemArtKey, ClassicyAssetSource>>
> = {
	windowStripes: art("title-bar-center.svg"),
	windowStripesRed: art("title-bar-center-red.svg"),
	windowUtilityTexture: art("title-bar-utility.svg"),
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
	quickTimeThumbSlider: art("quicktime-thumb-slider.svg"),
	quickTimeVolumeSlider: art("quicktime-volume-slider.svg"),
};
