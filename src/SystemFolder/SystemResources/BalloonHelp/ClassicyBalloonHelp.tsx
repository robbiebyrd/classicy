import "./ClassicyBalloonHelp.scss";
import type { FC, PropsWithChildren } from "react";
import { type CSSProperties, useRef } from "react";
import {
	type ClassicyBalloonPosition,
	useClassicyBalloonHelp,
} from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";

export type { ClassicyBalloonPosition };

interface ClassicyBalloonHelpProps extends PropsWithChildren {
	/** Optional bold heading above the content. */
	title?: string;
	/** The help text. Plain text only. */
	content: string;
	/** Hover delay in ms before the balloon appears. Defaults to `600`. */
	delay?: number;
	/**
	 * Preferred side and alignment of the balloon relative to the wrapped
	 * element; flipped per axis when there is no room on screen. Defaults to
	 * `"top-left"`.
	 */
	position?: ClassicyBalloonPosition;
	/** Extra class(es) for the wrapper element. */
	className?: string;
	/** Inline style, merged onto the anchor wrapper after the component's own. */
	style?: CSSProperties;
}

/**
 * Mac OS 8 Balloon Help: a speech-bubble tooltip that appears after the
 * pointer rests on the wrapped element for `delay` ms and disappears when it
 * leaves. Use it instead of the HTML `title` attribute. The balloon is
 * portalled into `#classicyDesktop` (falling back to `document.body`), so a
 * parent's `overflow` never clips it, and it flips to the opposite side or
 * alignment when the preferred `position` would run off screen.
 *
 * All balloons are suppressed while the desktop's
 * `System.Manager.Desktop.disableBalloonHelp` is set — the Help menu's
 * Show/Hide Balloons, or dispatch `ClassicyDesktopSetBalloonHelp` with
 * `disableBalloonHelp`.
 *
 * The wrapper is `position: relative; display: inline-block`. When that
 * would break your layout (an absolutely positioned element, say), use the
 * `useClassicyBalloonHelp(ref, config)` hook instead: it returns
 * `{ handlers, balloon }` to spread onto an element you already own, adding
 * no DOM (`ClassicyDesktopIcon` does this).
 *
 * ```tsx
 * <ClassicyBalloonHelp title="Open File" content="Click to open" position="top-left">
 *     <ClassicyButton>Open</ClassicyButton>
 * </ClassicyBalloonHelp>
 *
 * const ref = useRef<HTMLDivElement>(null);
 * const { handlers, balloon } = useClassicyBalloonHelp(ref, { content: "Hi" });
 * return <div ref={ref} {...handlers}>target{balloon}</div>;
 * ```
 */
export const ClassicyBalloonHelp: FC<ClassicyBalloonHelpProps> = ({
	children,
	title,
	content,
	delay,
	position,
	className,
	style,
}) => {
	const anchorRef = useRef<HTMLDivElement>(null);
	const { handlers, balloon } = useClassicyBalloonHelp(anchorRef, {
		title,
		content,
		delay,
		position,
	});

	return (
		<div
			ref={anchorRef}
			className={["classicyBalloonHelpAnchor", className]
				.filter(Boolean)
				.join(" ")}
			style={style}
			{...handlers}
		>
			{children}
			{balloon}
		</div>
	);
};
