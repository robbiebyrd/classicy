import type { ClassicyAssetSource } from "@/Appearance/ClassicyAssetSource";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * The pixel-art codec: how `ClassicyPixelArt` rows travel as a system-art
 * asset source. Dependency-free on purpose (types and `classicyLog` only), so
 * an Appearance Package's data module and the asset registry can use it
 * without pulling a component or its stylesheet into their import graph.
 * `ClassicyPixelArt` re-exports every name here.
 */

/**
 * Pixel art as rows of palette tokens, one character per pixel; "." is
 * transparent. Used for HIG artwork that has to be pixel-exact but still
 * follow the theme — the Control Strip's tab and arrows, the pop-up slider —
 * where CSS borders and gradients cannot hit every pixel.
 */
export type ClassicyPixelArtRows = readonly string[];

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
 * `decodeClassicyPixelArtRows` decodes exactly these sources, and
 * `useClassicyAssetVars` leaves exactly these out of the CSS variables.
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

/**
 * Pixel art as an asset source, for `registerClassicySystemArt`:
 * `data:text/x-classicy-pixel-art,<rows joined by newlines, URI-encoded>`.
 * The encoding never emits a quote or backslash, so the source passes the
 * registry's validation.
 */
export const encodeClassicyPixelArtRows = (
	rows: ClassicyPixelArtRows,
): ClassicyAssetSource =>
	`data:${CLASSICY_PIXEL_ART_MIME},${encodeURIComponent(rows.join("\n"))}`;

/**
 * The rows of a pixel-art source: any `data:` URI with the pixel-art MIME
 * (`parseClassicyPixelArtSource`: any case, any parameters, percent-encoded or
 * `;base64`). Carriage returns are stripped and a trailing empty row is
 * dropped. `[]` for `undefined`, any other source, or a malformed payload
 * (logged).
 */
export const decodeClassicyPixelArtRows = (
	src: ClassicyAssetSource | undefined,
): ClassicyPixelArtRows => {
	const source = parseClassicyPixelArtSource(src);
	if (!source) return [];
	let text: string;
	try {
		text = source.base64
			? atob(source.payload)
			: decodeURIComponent(source.payload);
	} catch {
		classicyLog(
			"warn",
			"ClassicyPixelArt",
			"Ignored pixel art with a malformed payload",
		);
		return [];
	}
	const rows = text.replace(/\r/g, "").split("\n");
	if (rows.at(-1) === "") rows.pop();
	return rows;
};
