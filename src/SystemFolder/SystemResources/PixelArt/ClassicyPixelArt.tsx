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
	rows: ClassicyPixelArtRows;
	className?: string;
};

/**
 * Renders pixel art as an inline SVG at its native size, one `rect` per run of
 * same-token pixels, with crisp edges. Inline (not an `<img>`) so the token
 * classes resolve against the current theme. Decorative.
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
