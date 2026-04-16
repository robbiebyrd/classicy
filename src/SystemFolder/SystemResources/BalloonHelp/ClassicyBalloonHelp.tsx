import "./ClassicyBalloonHelp.scss";
import type { CSSProperties, FC, PropsWithChildren } from "react";
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

interface ClassicyBalloonHelpProps extends PropsWithChildren {
	title?: string;
	content: string;
	delay?: number;
	position?: ClassicyBalloonPosition;
	className?: string;
}

// Z-index sits above everything including modal windows (99999).
const BALLOON_Z_INDEX = 100000;

// Read --window-control-size from the desktop element at the time of display.
const readControlSize = (): number => {
	const el =
		document.getElementById("classicyDesktop") ?? document.documentElement;
	return (
		parseFloat(getComputedStyle(el).getPropertyValue("--window-control-size")) ||
		0
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
		position: "fixed",
		zIndex: BALLOON_Z_INDEX,
		pointerEvents: "none",
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

// Tail sits outside the bubble and overlaps it by 2px so the white fill
// masks the border line at the junction. scaleX/-1 mirrors the tip to the
// right; scaleY/-1 flips the tail upward for bottom placements.
const tailStyle = (position: ClassicyBalloonPosition): CSSProperties => {
	const [vertical, horizontal] = position.split("-") as [
		"top" | "bottom",
		"left" | "center" | "right",
	];
	const sx = horizontal === "right" ? -1 : 1;
	const sy = vertical === "bottom" ? -1 : 1;
	return {
		...(vertical === "top" ? { bottom: "-12px" } : { top: "-12px" }),
		...(horizontal === "left" && { left: "8px" }),
		...(horizontal === "center" && { left: "calc(50% - 10px)" }),
		...(horizontal === "right" && { right: "8px" }),
		...((sx !== 1 || sy !== 1) && { transform: `scaleX(${sx}) scaleY(${sy})` }),
	};
};

// The tail is a sibling of the bubble so it paints on top of the bubble's
// border. The white rect at the base covers the 2px overlap for a seamless
// junction.
const BalloonTail: FC<{ style: CSSProperties }> = ({ style }) => (
	<svg
		className="classicyBalloonHelpTail"
		style={style}
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

export const ClassicyBalloonHelp: FC<ClassicyBalloonHelpProps> = ({
	children,
	title,
	content,
	delay = 600,
	position = "top-left",
	className,
}) => {
	const disableBalloonHelp = useAppManager(
		(s) => s.System.Manager.Desktop.disableBalloonHelp,
	);
	const [visible, setVisible] = useState(false);
	const [rect, setRect] = useState<DOMRect | null>(null);
	const [controlSize, setControlSize] = useState(0);
	const anchorRef = useRef<HTMLDivElement>(null);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

	return (
		<div
			ref={anchorRef}
			role="tooltip"
			className={["classicyBalloonHelpAnchor", className].filter(Boolean).join(" ")}
			onMouseEnter={show}
			onMouseLeave={hide}
		>
			{children}
			{!disableBalloonHelp &&
				visible &&
				rect &&
				createPortal(
					<div
						className="classicyBalloonHelpContainer"
						style={containerPortalStyle(position, rect, controlSize)}
					>
						<div className="classicyBalloonHelp">
							{title && <p className="classicyBalloonHelpTitle">{title}</p>}
							<p className="classicyBalloonHelpContent">{content}</p>
						</div>
						<BalloonTail style={tailStyle(position)} />
					</div>,
					document.getElementById("classicyDesktop") ?? document.body,
				)}
		</div>
	);
};
