import type { ClassicyAssetSource } from "@/Appearance/ClassicyAssetSource";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import {
	CLASSICY_PIXEL_ART_MIME,
	parseClassicyPixelArtSource,
} from "./ClassicyPixelArtSource.internal";

/**
 * The pixel-art codec: how `ClassicyPixelArt` rows travel as a system-art
 * asset source. Dependency-free on purpose (types and `classicyLog` only), so
 * an Appearance Package's data module and the asset registry can use it
 * without pulling a component or its stylesheet into their import graph.
 * `ClassicyPixelArt` re-exports every name here. The rule for what counts as
 * pixel art (`parseClassicyPixelArtSource`) is internal, in
 * `ClassicyPixelArtSource.internal.ts`.
 */

/**
 * Pixel art as rows of palette tokens, one character per pixel; "." is
 * transparent. Used for HIG artwork that has to be pixel-exact but still
 * follow the theme — the Control Strip's tab and arrows, the pop-up slider —
 * where CSS borders and gradients cannot hit every pixel.
 */
export type ClassicyPixelArtRows = readonly string[];

// The MIME type and the parser live in the `.internal` module (one
// definition, shared with the asset registry; the parser is not public API).
export { CLASSICY_PIXEL_ART_MIME } from "./ClassicyPixelArtSource.internal";

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
 * (`parseClassicyPixelArtSource` in the `.internal` module: any case, any
 * parameters, percent-encoded or
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
