import type { CSSProperties, FC, ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
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

	return {
		...(vertical === "top"
			? { bottom: `${window.innerHeight - rect.top}px` }
			: { top: `${rect.bottom}px` }),
		...(horizontal === "left" && { left: `${rect.right - controlSize}px` }),
		...(horizontal === "center" && {
			left: `${rect.left + rect.width / 2}px`,
			transform: "translateX(-50%)",
		}),
		...(horizontal === "right" && {
			right: `${window.innerWidth - rect.left - controlSize}px`,
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
	};

	useEffect(
		() => () => {
			if (timerRef.current !== null) clearTimeout(timerRef.current);
		},
		[],
	);

	const balloon =
		!config || disableBalloonHelp || !visible || !rect
			? null
			: createPortal(
					<div
						className="classicyBalloonHelpContainer"
						style={containerPortalStyle(position, rect, controlSize)}
					>
						<div className="classicyBalloonHelp">
							{config.title && (
								<p className="classicyBalloonHelpTitle">{config.title}</p>
							)}
							<p className="classicyBalloonHelpContent">{config.content}</p>
						</div>
						<BalloonTail className={tailPositionClasses(position)} />
					</div>,
					document.getElementById("classicyDesktop") ?? document.body,
				);

	return { handlers: { onMouseEnter: show, onMouseLeave: hide }, balloon };
};
