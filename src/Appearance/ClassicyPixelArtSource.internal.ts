import type { ClassicyAssetSource } from "@/Appearance/ClassicyAssetSource";

/**
 * The pixel-art codec's internals (never public API; the barrel skips
 * `.internal` modules): the MIME type, re-exported by
 * `ClassicyPixelArtSource`, and the one rule for what counts as pixel art,
 * shared by the decoder and the asset registry. Dependency-free, like the
 * codec.
 */

/**
 * The MIME type of pixel art registered as system art
 * (`encodeClassicyPixelArtRows`): a `data:` source whose payload is the rows,
 * joined with newlines.
 */
export const CLASSICY_PIXEL_ART_MIME = "text/x-classicy-pixel-art";

/** `data:<pixel-art MIME>[;parameter…],<payload>`, the MIME in any case. */
const PIXEL_ART_SOURCE = new RegExp(
	`^data:${CLASSICY_PIXEL_ART_MIME}((?:;[^,]*)?),`,
	"i",
);

/**
 * The one rule for what counts as pixel art: any `data:` URI whose media type
 * is `CLASSICY_PIXEL_ART_MIME` (any case, any parameters such as
 * `;charset=utf-8`, optionally `;base64`). Returns the still-encoded payload
 * and whether it is base64, or `undefined` for any other source.
 * `decodeClassicyPixelArtRows` decodes exactly these sources,
 * `useClassicyAssetVars` leaves exactly these out of the CSS variables, and
 * `registerClassicySystemArt` checks each source's form with it.
 */
export const parseClassicyPixelArtSource = (
	src: ClassicyAssetSource | undefined,
): { base64: boolean; payload: string } | undefined => {
	if (src === undefined) return undefined;
	const match = PIXEL_ART_SOURCE.exec(src);
	if (!match) return undefined;
	return {
		base64: match[1].toLowerCase().split(";").includes("base64"),
		payload: src.slice(match[0].length),
	};
};
