import type { ClassicyScreenSaverProps } from "@classicy/classicy";
import type { FC as FunctionalComponent } from "react";
import { z } from "zod";
import { Windows98SaverCanvas } from "../Windows98SaverCanvas";
import {
	WINDOWS98_PALETTE_COLOR_NAMES,
	WINDOWS98_VGA_COLOR_NAMES,
	windows98CssColor,
	windows98PaletteColor,
	windows98VgaColor,
} from "../windows98SaverColors";
import { createWindows98Random } from "../windows98SaverTimer";
import { scrollingMarquee } from "./scrollingMarquee";

/** The Position group's two choices. */
export const SCROLLING_MARQUEE_POSITIONS = ["Centered", "Random"] as const;
/** The Font dialog's Font style list. */
export const SCROLLING_MARQUEE_FONT_STYLES = [
	"Regular",
	"Italic",
	"Bold",
	"Bold Italic",
] as const;

/**
 * Scrolling Marquee's options, as its dialog had them ("Options for
 * Scrolling Marquee"): Position, Centered or Random; Background color, the
 * default palette's twenty; Speed, a Slow to Fast slider (1-60); Text; and
 * what its Format Text button set in the Font dialog: the font, its style,
 * its size in points, the Strikeout and Underline effects and the color, one
 * of the dialog's sixteen. The font is the face's name, drawn by the browser
 * if it has it (Arial otherwise, then any sans-serif face). The defaults are
 * the .scr's own (`control.ini` Text "Where do you want to go today?", Font
 * Arial, Size 72, Attributes 00011 (random position, bold), TextColor red,
 * BackgroundColor black, Speed 60).
 */
export const ScrollingMarqueeConfigSchema = z.looseObject({
	position: z
		.enum(SCROLLING_MARQUEE_POSITIONS)
		.default("Random")
		.describe("Position"),
	backgroundColor: z
		.enum(WINDOWS98_PALETTE_COLOR_NAMES)
		.default("Black")
		.describe("Background color"),
	speed: z
		.number()
		.int()
		.min(1)
		.max(60)
		.default(60)
		.describe("Speed (1 slow, 60 fast)"),
	text: z
		.string()
		.max(254)
		.default("Where do you want to go today?")
		.describe("Text"),
	font: z.string().max(31).default("Arial").describe("Font"),
	fontStyle: z
		.enum(SCROLLING_MARQUEE_FONT_STYLES)
		.default("Bold")
		.describe("Font style"),
	size: z.number().int().min(8).max(72).default(72).describe("Size"),
	strikeout: z.boolean().default(false).describe("Strikeout"),
	underline: z.boolean().default(false).describe("Underline"),
	color: z.enum(WINDOWS98_VGA_COLOR_NAMES).default("Red").describe("Color"),
});

/** A face name as a CSS family, quoted, its quotes and backslashes dropped. */
const family = (face: string): string => {
	const name = face.replace(/["\\]/g, "").trim();
	return name ? `"${name}", Arial, sans-serif` : "Arial, sans-serif";
};

/**
 * Windows 98's Scrolling Marquee (ssmarque.scr): a line of text crossing the
 * screen, by default "Where do you want to go today?" in red 72-point Arial
 * on black, at a new height each pass.
 */
export const ClassicyScreenSaverScrollingMarquee: FunctionalComponent<
	ClassicyScreenSaverProps
> = ({ config, className, style }) => {
	const parsed = ScrollingMarqueeConfigSchema.safeParse(config);
	const options = parsed.success
		? parsed.data
		: ScrollingMarqueeConfigSchema.parse({});
	const marquee = {
		text: options.text,
		font: `${options.fontStyle.includes("Italic") ? "italic " : ""}${
			options.fontStyle.startsWith("Bold") ? "bold " : ""
		}${options.size}pt ${family(options.font)}`,
		textColor: windows98CssColor(windows98VgaColor(options.color)),
		backgroundColor: windows98CssColor(
			windows98PaletteColor(options.backgroundColor),
		),
		underline: options.underline,
		strikeout: options.strikeout,
		random: options.position === "Random",
		speed: options.speed,
	};
	return (
		<Windows98SaverCanvas
			rootClass="classicySaverScrollingMarquee"
			className={className}
			style={style}
			optionsKey={JSON.stringify(marquee)}
			setup={{
				// SetTimer(…, 9): every 55 ms tick.
				intervalMs: 9,
				stillTicks: 0,
				start: (canvas, width, height) => {
					const context = canvas.getContext("2d");
					if (!context) return null;
					return scrollingMarquee(
						context,
						width,
						height,
						createWindows98Random(),
						marquee,
					);
				},
			}}
		/>
	);
};
