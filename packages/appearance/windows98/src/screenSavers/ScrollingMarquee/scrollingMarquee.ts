// Scrolling Marquee (ssmarque.scr), its WM_TIMER handler: a line of text
// crosses the screen from right to left over the background color, at the
// screen's middle ("Centered") or at a random height each pass ("Random").
// Every tick adds the Speed (1-60) to a count; once the count reaches 3, the
// text's bitmap (the text over the background color, with 60 pixels of
// background after it, which erases where it was) is drawn at its spot, the
// spot moves left by count / 3 + 1 pixels and the count keeps its remainder.
// Past the left edge, the text starts again at the right.
import type { Windows98Random } from "../windows98SaverTimer";

export type ScrollingMarqueeOptions = {
	text: string;
	/** A CSS font shorthand (`bold 72pt "Arial", sans-serif`). */
	font: string;
	textColor: string;
	backgroundColor: string;
	underline: boolean;
	strikeout: boolean;
	random: boolean;
	/** 1 (Slow) to 60 (Fast). */
	speed: number;
};

/** The 2D context calls the marquee makes (a test may pass its own). */
export type ScrollingMarqueeContext = Pick<
	CanvasRenderingContext2D,
	| "fillRect"
	| "fillText"
	| "measureText"
	| "fillStyle"
	| "font"
	| "textBaseline"
	| "textAlign"
>;

/** The trailing background the text's bitmap carries. */
const TRAIL = 60;

/** The marquee, drawing on `context` (`width` by `height`). */
export const scrollingMarquee = (
	context: ScrollingMarqueeContext,
	width: number,
	height: number,
	random: Windows98Random,
	options: ScrollingMarqueeOptions,
) => {
	context.font = options.font;
	context.textBaseline = "alphabetic";
	context.textAlign = "left";
	const metrics = context.measureText(options.text);
	const ascent = Math.ceil(
		metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent ?? 0,
	);
	const descent = Math.ceil(
		metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent ?? 0,
	);
	const textWidth = Math.ceil(metrics.width);
	const textHeight = Math.max(1, ascent + descent);
	// GDI's underline and strikeout: a stroke a fourteenth of the em thick,
	// under the baseline and across the x-height.
	const stroke = Math.max(1, Math.round(textHeight / 16));
	const place = () =>
		options.random
			? height > textHeight
				? random() % (height - textHeight)
				: 0
			: Math.trunc((height - textHeight) / 2);
	let x = width;
	let y = place();
	let count = 0;
	context.fillStyle = options.backgroundColor;
	context.fillRect(0, 0, width, height);
	const draw = () => {
		context.fillStyle = options.backgroundColor;
		context.fillRect(x, y, textWidth + TRAIL, textHeight);
		context.fillStyle = options.textColor;
		context.fillText(options.text, x, y + ascent);
		if (options.underline)
			context.fillRect(x, y + ascent + stroke, textWidth, stroke);
		if (options.strikeout)
			context.fillRect(
				x,
				y + ascent - Math.round(ascent / 3),
				textWidth,
				stroke,
			);
	};
	return {
		get x() {
			return x;
		},
		get y() {
			return y;
		},
		textWidth,
		textHeight,
		tick(): void {
			count += options.speed;
			if (count < 3) return;
			draw();
			if (-textWidth <= x) x -= Math.trunc(count / 3) + 1;
			else {
				x = width;
				y = place();
			}
			count %= 3;
		},
		/** The still frame: the text at its spot in the middle of a pass. */
		still(): void {
			x = Math.trunc((width - textWidth) / 2);
			draw();
		},
		flush(): void {},
	};
};
