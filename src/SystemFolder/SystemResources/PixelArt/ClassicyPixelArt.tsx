import "./ClassicyPixelArt.scss";
import type { FC as FunctionalComponent } from "react";

/**
 * Pixel art as rows of palette tokens, one character per pixel; "." is
 * transparent. Used for HIG artwork that has to be pixel-exact but still
 * follow the theme — the Control Strip's tab and arrows, the pop-up slider —
 * where CSS borders and gradients cannot hit every pixel.
 */
export type ClassicyPixelArtRows = readonly string[];

// Token → colour lives in ClassicyPixelArt.scss (one class per token), so the
// palette follows the theme without inline styles.

type ClassicyPixelArtProps = {
	/**
	 * The image, top row first, one palette token per pixel: `K` black, `W`
	 * white, `1`–`7` the system greys, `b` `c` `d` theme accents 02–04, `m` and
	 * `n` mixed shades, `.` transparent. Width comes from the first row.
	 */
	rows: ClassicyPixelArtRows;
	/** Class(es) for the `<svg>`, e.g. to position or scale it. */
	className?: string;
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
 * ```tsx
 * const glyph: ClassicyPixelArtRows = ["KKKK", "K33K", "K33K", "KKKK"];
 * <ClassicyPixelArt rows={glyph} />
 * ```
 */
export const ClassicyPixelArt: FunctionalComponent<ClassicyPixelArtProps> = ({
	rows,
	className,
}) => {
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
