import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	useEffect,
	useState,
} from "react";
import { intToRgb } from "@/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerUtils";
import "./QuickTimeMovieEmbed.scss";
import "./QuickTimeCaptionsOverlay.scss";

/**
 * Caption appearance override. Matches the shape of rt911 TV's CaptionStyle so
 * a consumer's caption settings can be passed straight through.
 */
export type QuickTimeCaptionStyle = {
	/** CSS custom property name resolving to a font family, e.g. "--ui-font". */
	font: string;
	/** 24-bit int text color (see intToRgb). */
	color: number;
	/** Text opacity, 0–1. */
	colorOpacity: number;
	/** 24-bit int background color. */
	bgColor: number;
	/** Background opacity, 0–1. */
	bgOpacity: number;
	/** Font size in percent (100 = theme default). */
	size: number;
};

// ::cue-style custom properties don't cascade into computed inline styles, so
// resolve the font var against the desktop root at effect time.
/**
 * Strips caption markup (VTT tags like `<i>`, `<c.class>`) so the cue renders
 * as plain text. Cosmetic only — the result is rendered as a React text child,
 * so it is escaped regardless; this never needs to be a security sanitizer.
 * Matches `text.replace(/<[^>]*>/g, "")` exactly (an unclosed `<` stays
 * literal) but runs in linear time, so a hostile subtitle cue packed with `<`
 * can't stall the render the way the backtracking regex could.
 */
export function stripCaptionTags(text: string): string {
	let out = "";
	let i = 0;
	while (i < text.length) {
		const open = text.indexOf("<", i);
		if (open === -1) return out + text.slice(i);
		const close = text.indexOf(">", open + 1);
		if (close === -1) return out + text.slice(i);
		out += text.slice(i, open);
		i = close + 1;
	}
	return out;
}

function resolveCssVar(name: string): string {
	const el =
		document.getElementById("classicyDesktop") ?? document.documentElement;
	return getComputedStyle(el).getPropertyValue(name).trim();
}

/**
 * Bottom-centred caption text over the picture. Cue markup (`<i>`,
 * `<c.class>`, …) is stripped to plain text, and nothing renders when there
 * is no active cue. `captionStyle` overrides the theme's caption look.
 */
export const QuickTimeCaptionsOverlay: FunctionalComponent<{
	/** The active cue's text, or `null` for none. */
	text: string | null;
	/** Optional font/colour/size override; theme styling when omitted. */
	captionStyle?: QuickTimeCaptionStyle;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
}> = ({ text, captionStyle, className, style }) => {
	const [overrideStyle, setOverrideStyle] = useState<CSSProperties>({});

	useEffect(() => {
		if (!captionStyle) {
			setOverrideStyle({});
			return;
		}
		const font = resolveCssVar(captionStyle.font);
		const { r: cr, g: cg, b: cb } = intToRgb(captionStyle.color);
		const { r: br, g: bg, b: bb } = intToRgb(captionStyle.bgColor);
		// The colors are data, published as custom properties;
		// QuickTimeCaptionsOverlay.scss composes them into `color` and
		// `background-color`.
		setOverrideStyle({
			fontFamily: `${font || "sans-serif"}, sans-serif`,
			fontSize: `${captionStyle.size}%`,
			"--classicy-caption-fg": `${cr}, ${cg}, ${cb}`,
			"--classicy-caption-fg-alpha": `${captionStyle.colorOpacity}`,
			"--classicy-caption-bg": `${br}, ${bg}, ${bb}`,
			"--classicy-caption-bg-alpha": `${captionStyle.bgOpacity}`,
		} as CSSProperties);
	}, [captionStyle]);

	if (!text) return null;
	const plain = stripCaptionTags(text);
	if (!plain) return null;

	return (
		<div
			className={classNames(
				"quickTimePlayerCaptionsHolder",
				"quickTimePlayerCaptionsHolderBottom",
				"quickTimePlayerCaptionsHolderCenter",
				className,
			)}
			style={style}
		>
			<div
				className={classNames(
					"quickTimePlayerCaptions",
					captionStyle && "quickTimePlayerCaptionsCustomStyle",
				)}
				style={overrideStyle}
			>
				{plain}
			</div>
		</div>
	);
};
