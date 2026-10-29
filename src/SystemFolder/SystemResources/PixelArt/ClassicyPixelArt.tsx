import "./ClassicyPixelArt.scss";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	useMemo,
} from "react";
import {
	type ClassicySystemArtKey,
	useClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";
import type { ClassicyAssetSource } from "@/Appearance/ClassicyAssetSource";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * Pixel art as rows of palette tokens, one character per pixel; "." is
 * transparent. Used for HIG artwork that has to be pixel-exact but still
 * follow the theme — the Control Strip's tab and arrows, the pop-up slider —
 * where CSS borders and gradients cannot hit every pixel.
 */
export type ClassicyPixelArtRows = readonly string[];

// Token → colour lives in ClassicyPixelArt.scss (one class per token), so the
// palette follows the theme without inline styles.

/**
 * The MIME type of pixel art registered as system art: a `data:` source whose
 * payload is the rows, URI-encoded and joined with newlines.
 */
export const CLASSICY_PIXEL_ART_MIME = "text/x-classicy-pixel-art";

const PIXEL_ART_PREFIX = `data:${CLASSICY_PIXEL_ART_MIME},`;

/**
 * Pixel art as an asset source, for `registerClassicySystemArt`:
 * `data:text/x-classicy-pixel-art,<rows joined by newlines, URI-encoded>`.
 * The encoding never emits a quote or backslash, so the source passes the
 * registry's validation.
 */
export const encodeClassicyPixelArtRows = (
	rows: ClassicyPixelArtRows,
): ClassicyAssetSource =>
	`${PIXEL_ART_PREFIX}${encodeURIComponent(rows.join("\n"))}`;

/**
 * The rows of a pixel-art source made by `encodeClassicyPixelArtRows` (a
 * trailing empty row is dropped); `[]` for `undefined`, any other source, or
 * a malformed payload (logged).
 */
export const decodeClassicyPixelArtRows = (
	src: ClassicyAssetSource | undefined,
): ClassicyPixelArtRows => {
	if (!src?.startsWith(PIXEL_ART_PREFIX)) return [];
	let text: string;
	try {
		text = decodeURIComponent(src.slice(PIXEL_ART_PREFIX.length));
	} catch {
		classicyLog(
			"warn",
			"ClassicyPixelArt",
			"Ignored pixel art with a malformed URI-encoded payload",
		);
		return [];
	}
	const rows = text.split("\n");
	if (rows.at(-1) === "") rows.pop();
	return rows;
};

/**
 * The rows registered as system art `key` for the active Appearance Package
 * (Platinum's when the package has none), read at render time: re-renders when
 * a package registers new art or the active package changes. `[]` when the key
 * holds no pixel art.
 */
export const useClassicyPixelArtRows = (
	key: ClassicySystemArtKey,
): ClassicyPixelArtRows => {
	const src = useClassicyAsset("systemArt", key);
	return useMemo(() => decodeClassicyPixelArtRows(src), [src]);
};

type ClassicyPixelArtProps = (
	| {
			/**
			 * The image, top row first, one palette token per pixel: `K` black,
			 * `W` white, `1`–`7` the system grays, `b` `c` `d` theme accents
			 * 02–04, `m` and `n` mixed shades, `.` transparent. Width comes from
			 * the first row.
			 */
			rows: ClassicyPixelArtRows;
			art?: never;
	  }
	| {
			/**
			 * A system-art key holding pixel art (`controlStripTab`,
			 * `popUpSliderThumb`, …), resolved through the asset registry at
			 * render time, so the active Appearance Package's art is drawn.
			 */
			art: ClassicySystemArtKey;
			rows?: never;
	  }
) & {
	/** Class(es) for the `<svg>`, e.g. to position or scale it. */
	className?: string;
	/** Inline style, merged onto the `<svg>` after the component's own. */
	style?: CSSProperties;
};

/**
 * Renders pixel art as an inline SVG at its native size, one `rect` per run of
 * same-token pixels, with crisp edges. Inline (not an `<img>`) so the token
 * classes resolve against the current theme. Decorative.
 *
 * Use it for HIG artwork that must be pixel-exact yet recolour with the
 * Appearance theme — the Control Strip's tab, collapse box and arrows
 * (HIGOS8 Figure 6-15) and `ClassicyPopUpSlider` (Figure 2-16) are drawn with
 * it. Each token maps to a theme colour token in `ClassicyPixelArt.scss`, so
 * switching themes repaints the art with no re-render. The SVG is
 * `aria-hidden`; give the surrounding control its accessible name.
 *
 * Pass exactly one of `rows` (the art itself) or `art` (a system-art key the
 * Appearance Package registers with `encodeClassicyPixelArtRows`).
 *
 * ```tsx
 * const glyph: ClassicyPixelArtRows = ["KKKK", "K33K", "K33K", "KKKK"];
 * <ClassicyPixelArt rows={glyph} />
 * <ClassicyPixelArt art="controlStripTab" />
 * ```
 */
export const ClassicyPixelArt: FunctionalComponent<ClassicyPixelArtProps> = ({
	rows: givenRows,
	art,
	className,
	style,
}) => {
	// Hooks are unconditional: with `rows` given the lookup is ignored.
	const registeredRows = useClassicyPixelArtRows(art ?? "controlStripTab");
	const rows = givenRows ?? registeredRows;
	const width = rows[0]?.length ?? 0;
	const rects = [];
	for (let y = 0; y < rows.length; y++) {
		const row = rows[y];
		let x = 0;
		while (x < row.length) {
			const token = row[x];
			let end = x + 1;
			while (end < row.length && row[end] === token) end++;
			if (token !== ".") {
				rects.push(
					<rect
						key={`${x}-${y}`}
						x={x}
						y={y}
						width={end - x}
						height={1}
						className={`classicyPixel${token}`}
					/>,
				);
			}
			x = end;
		}
	}
	return (
		<svg
			className={className}
			style={style}
			width={width}
			height={rows.length}
			viewBox={`0 0 ${width} ${rows.length}`}
			shapeRendering="crispEdges"
			aria-hidden={true}
			focusable={false}
		>
			{rects}
		</svg>
	);
};
