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
			className={["classicyBalloonHelpAnchor", className]
				.filter(Boolean)
				.join(" ")}
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
						<BalloonTail className={tailPositionClasses(position)} />
					</div>,
					document.getElementById("classicyDesktop") ?? document.body,
				)}
		</div>
	);
};
