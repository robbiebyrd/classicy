import type { CSSProperties, FC, ReactNode, RefObject } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

export type ClassicyBalloonPosition =
	| "top-left"
	| "top-center"
	| "top-right"
	| "bottom-left"
	| "bottom-center"
	| "bottom-right";

/** Serializable balloon help description. Stored on desktop icon records, so
 *  every field must survive a JSON round-trip through localStorage. */
export interface ClassicyIconBalloonHelp {
	title?: string;
	content: string;
	position?: ClassicyBalloonPosition;
	delay?: number;
}

// Read --window-control-size from the desktop element at the time of display.
const readControlSize = (): number => {
	const el =
		document.getElementById("classicyDesktop") ?? document.documentElement;
	return (
		parseFloat(
			getComputedStyle(el).getPropertyValue("--window-control-size"),
		) || 0
	);
};

/** The subset of DOMRect this module measures against. */
interface AnchorRect {
	top: number;
	left: number;
	right: number;
	bottom: number;
	width: number;
}

interface Size {
	width: number;
	height: number;
}

/** Where an edge of the balloon's box lands, in viewport coordinates. */
interface Span {
	start: number;
	end: number;
}

type BalloonSide = "top" | "bottom";
type BalloonAlign = "left" | "center" | "right";

// These mirror containerPortalStyle below — each returns the span the balloon
// would occupy on that axis for a given side, which is what decides whether the
// side is usable.
const verticalSpan = (
	side: BalloonSide,
	anchor: AnchorRect,
	height: number,
): Span =>
	side === "top"
		? { start: anchor.top - height, end: anchor.top }
		: { start: anchor.bottom, end: anchor.bottom + height };

const horizontalSpan = (
	align: BalloonAlign,
	anchor: AnchorRect,
	width: number,
	controlSize: number,
): Span => {
	if (align === "left") {
		const start = anchor.right - controlSize;
		return { start, end: start + width };
	}
	if (align === "right") {
		const end = anchor.left + controlSize;
		return { start: end - width, end };
	}
	const centre = anchor.left + anchor.width / 2;
	return { start: centre - width / 2, end: centre + width / 2 };
};

const fits = (span: Span, limit: number): boolean =>
	span.start >= 0 && span.end <= limit;

const overflow = (span: Span, limit: number): number =>
	Math.max(0, -span.start) + Math.max(0, span.end - limit);

/** First candidate that fits; failing that, the one that overhangs least. */
const pick = <T,>(
	candidates: T[],
	spanOf: (candidate: T) => Span,
	limit: number,
): T =>
	candidates.find((candidate) => fits(spanOf(candidate), limit)) ??
	candidates.reduce((best, candidate) =>
		overflow(spanOf(candidate), limit) < overflow(spanOf(best), limit)
			? candidate
			: best,
	);

/**
 * Turn the caller's preferred position into one that is actually on screen.
 *
 * `position` is a preference, not an instruction: an anchor near an edge of the
 * viewport has no room on the side the caller asked for. The stock default is
 * `top-left`, and the desktop's disk icon sits at the top right — so the balloon
 * opened up and to the right, entirely outside the viewport, with nothing to
 * hint that it had opened at all. Desktop icons are draggable anywhere, so no
 * per-icon default could have covered this.
 *
 * Each axis is resolved independently, preferring the caller's side, then its
 * opposite, then centre. Exported for tests: jsdom reports every rect as zero,
 * so the decision has to be checked as a function of measurements rather than
 * through a rendered balloon.
 */
export const resolveBalloonPosition = (
	preferred: ClassicyBalloonPosition,
	anchor: AnchorRect,
	balloon: Size,
	controlSize: number,
	viewport: Size,
): ClassicyBalloonPosition => {
	const [side, align] = preferred.split("-") as [BalloonSide, BalloonAlign];

	const sides: BalloonSide[] = [side, side === "top" ? "bottom" : "top"];
	const aligns: BalloonAlign[] = [
		align,
		align === "left" ? "right" : "left",
		"center",
	];

	const vertical = pick(
		sides,
		(candidate) => verticalSpan(candidate, anchor, balloon.height),
		viewport.height,
	);
	const horizontal = pick(
		// `center` is already first when it is the preference; don't repeat it.
		align === "center"
			? (["center", "left", "right"] as BalloonAlign[])
			: aligns,
		(candidate) =>
			horizontalSpan(candidate, anchor, balloon.width, controlSize),
		viewport.width,
	);

	return `${vertical}-${horizontal}` as ClassicyBalloonPosition;
};

// Viewport size, guarded so the hook stays safe to import and run in an
// SSR/pre-rendered context (where `window` is undefined). Off-browser it reports
// a zero viewport, which the placement resolver reads as "no room" — a harmless
// fallback, since the measuring layout effect and the portal only ever run in
// the browser after mount.
const getViewport = (): { width: number; height: number } =>
	typeof window === "undefined"
		? { width: 0, height: 0 }
		: { width: window.innerWidth, height: window.innerHeight };

// Container is position:fixed in a portal so it is never clipped by a parent.
// The balloon begins at the element's edge minus --window-control-size so the
// tail tip lands slightly inside the wrapped element.
const containerPortalStyle = (
	position: ClassicyBalloonPosition,
	rect: DOMRect,
	controlSize: number,
): CSSProperties => {
	const [vertical, horizontal] = position.split("-") as [
		"top" | "bottom",
		"left" | "center" | "right",
	];
	const viewport = getViewport();

	return {
		...(vertical === "top"
			? { bottom: `${viewport.height - rect.top}px` }
			: { top: `${rect.bottom}px` }),
		...(horizontal === "left" && { left: `${rect.right - controlSize}px` }),
		...(horizontal === "center" && {
			left: `${rect.left + rect.width / 2}px`,
			transform: "translateX(-50%)",
		}),
		...(horizontal === "right" && {
			right: `${viewport.width - rect.left - controlSize}px`,
		}),
	};
};

// Tail placement and flipping are handled by per-position classes in
// ClassicyBalloonHelp.scss; this maps the position prop onto those classes.
const tailPositionClasses = (position: ClassicyBalloonPosition): string => {
	const [vertical, horizontal] = position.split("-") as [
		"top" | "bottom",
		"left" | "center" | "right",
	];
	return [
		vertical === "top"
			? "classicyBalloonHelpTailTop"
			: "classicyBalloonHelpTailBottom",
		horizontal === "left" && "classicyBalloonHelpTailLeft",
		horizontal === "center" && "classicyBalloonHelpTailCenter",
		horizontal === "right" && "classicyBalloonHelpTailRight",
	]
		.filter(Boolean)
		.join(" ");
};

// The tail is a sibling of the bubble so it paints on top of the bubble's
// border. The white rect at the base covers the 2px overlap for a seamless
// junction.
const BalloonTail: FC<{ className: string }> = ({ className }) => (
	<svg
		className={`classicyBalloonHelpTail ${className}`}
		width="20"
		height="14"
		viewBox="0 0 20 14"
		xmlns="http://www.w3.org/2000/svg"
		aria-hidden="true"
	>
		<path
			d="M 0,0 L 20,0 L 20,2 Q 9,8 0,14 Q 1,5 4,2 L 4,0 Z"
			fill="white"
			stroke="none"
		/>
		<path
			d="M 4,2 Q 1,5 0,14"
			fill="none"
			stroke="black"
			strokeWidth="1"
			strokeLinecap="round"
		/>
		<path
			d="M 0,14 Q 9,8 20,2"
			fill="none"
			stroke="black"
			strokeWidth="1"
			strokeLinecap="round"
		/>
	</svg>
);

/**
 * Balloon help behavior — hover timer, anchor measurement, and the portal —
 * bound to an element the caller already owns. Callers that can accept an extra
 * wrapper element should use `ClassicyBalloonHelp` instead; this hook exists for
 * callers that cannot, such as absolutely positioned desktop icons.
 */
export const useClassicyBalloonHelp = (
	anchorRef: RefObject<HTMLElement | null>,
	config?: ClassicyIconBalloonHelp,
): {
	handlers: { onMouseEnter: () => void; onMouseLeave: () => void };
	balloon: ReactNode;
} => {
	const disableBalloonHelp = useAppManager(
		(s) => s.System.Manager.Desktop.disableBalloonHelp,
	);
	const [visible, setVisible] = useState(false);
	const [rect, setRect] = useState<DOMRect | null>(null);
	const [controlSize, setControlSize] = useState(0);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	// Null until the balloon has been measured; the preferred position stands in
	// for that first layout pass.
	const [placed, setPlaced] = useState<ClassicyBalloonPosition | null>(null);

	const delay = config?.delay ?? 600;
	const position = config?.position ?? "top-left";

	const show = () => {
		timerRef.current = setTimeout(() => {
			if (anchorRef.current) {
				setRect(anchorRef.current.getBoundingClientRect());
			}
			setControlSize(readControlSize());
			setVisible(true);
		}, delay);
	};

	const hide = () => {
		if (timerRef.current !== null) clearTimeout(timerRef.current);
		setVisible(false);
		setRect(null);
		setPlaced(null);
	};

	useEffect(
		() => () => {
			if (timerRef.current !== null) clearTimeout(timerRef.current);
		},
		[],
	);

	// The balloon's own size is only knowable once it is in the document, so the
	// side it opens toward is settled here rather than at show time. This runs
	// before paint, so a balloon that has to flip is never seen in the preferred
	// spot first. Resolving from `position` (not from `placed`) keeps it
	// idempotent — a flip cannot feed back into the next decision and oscillate.
	useLayoutEffect(() => {
		const container = containerRef.current;
		if (!visible || !rect || !container) return;
		const { width, height } = container.getBoundingClientRect();
		if (width === 0 && height === 0) return;
		const next = resolveBalloonPosition(
			position,
			rect,
			{ width, height },
			controlSize,
			getViewport(),
		);
		setPlaced((current) => (current === next ? current : next));
	}, [visible, rect, position, controlSize]);

	const balloon =
		!config || disableBalloonHelp || !visible || !rect
			? null
			: createPortal(
					<div
						ref={containerRef}
						className="classicyBalloonHelpContainer"
						style={containerPortalStyle(placed ?? position, rect, controlSize)}
					>
						<div className="classicyBalloonHelp">
							{config.title && (
								<p className="classicyBalloonHelpTitle">{config.title}</p>
							)}
							<p className="classicyBalloonHelpContent">{config.content}</p>
						</div>
						<BalloonTail className={tailPositionClasses(placed ?? position)} />
					</div>,
					document.getElementById("classicyDesktop") ?? document.body,
				);

	return { handlers: { onMouseEnter: show, onMouseLeave: hide }, balloon };
};
