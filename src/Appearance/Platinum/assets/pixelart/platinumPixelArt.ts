import type { ClassicySystemArtKey } from "@/Appearance/ClassicyAssetRegistry";
import type { ClassicyAssetSource } from "@/Appearance/ClassicyAssetSource";
import {
	type ClassicyPixelArtRows,
	encodeClassicyPixelArtRows,
} from "@/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt";
import controlStripCollapse from "./control-strip-collapse.txt?raw";
import controlStripModuleArrow from "./control-strip-module-arrow.txt?raw";
import controlStripScrollLeft from "./control-strip-scroll-left.txt?raw";
import controlStripScrollLeftDisabled from "./control-strip-scroll-left-disabled.txt?raw";
import controlStripScrollRight from "./control-strip-scroll-right.txt?raw";
import controlStripScrollRightDisabled from "./control-strip-scroll-right-disabled.txt?raw";
import controlStripTab from "./control-strip-tab.txt?raw";
import popUpSliderThumb from "./popup-slider-thumb.txt?raw";
import popUpSliderTrack from "./popup-slider-track.txt?raw";

/** A `.txt` file's rows: one row per line, top row first. */
const rows = (text: string): ClassicyPixelArtRows =>
	text.replace(/\r/g, "").split("\n");

const pixelArt = (text: string): ClassicyAssetSource =>
	encodeClassicyPixelArtRows(rows(text));

/**
 * Platinum's pixel art, by system-art key: the Control Strip's tab, collapse
 * box, scroll arrows and module pop-up arrow (HIGOS8 Figure 6-15) and the
 * pop-up slider's track and thumb (Figure 2-16). Each `.txt` beside this file
 * holds one glyph as `ClassicyPixelArt` palette tokens, one row per line, with
 * no trailing newline; each value here is that glyph encoded as a
 * `data:text/x-classicy-pixel-art,…` source (`encodeClassicyPixelArtRows`).
 * `ClassicyPixelArt` draws them with `art="<key>"`.
 *
 * Data only: `platinumAssets.ts` registers it, so importing this module has no
 * effect. The `.txt` files are imported `?raw` (text, bundled into the JS),
 * never emitted as files.
 */
export const PLATINUM_PIXEL_ART: Readonly<
	Partial<Record<ClassicySystemArtKey, ClassicyAssetSource>>
> = {
	controlStripTab: pixelArt(controlStripTab),
	controlStripCollapse: pixelArt(controlStripCollapse),
	controlStripScrollLeft: pixelArt(controlStripScrollLeft),
	controlStripScrollRight: pixelArt(controlStripScrollRight),
	controlStripScrollLeftDisabled: pixelArt(controlStripScrollLeftDisabled),
	controlStripScrollRightDisabled: pixelArt(controlStripScrollRightDisabled),
	controlStripModuleArrow: pixelArt(controlStripModuleArrow),
	popUpSliderTrack: pixelArt(popUpSliderTrack),
	popUpSliderThumb: pixelArt(popUpSliderThumb),
};
