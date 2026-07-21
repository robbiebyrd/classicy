import "./ClassicyWindowFrame.scss";
import classNames from "classnames";
import type { CSSProperties, FC as FunctionalComponent, ReactNode } from "react";

interface ClassicyWindowFrameProps {
	title?: string;
	children: ReactNode;
	className?: string;
	/** Caps the frame's max-width (number → px); content narrower than this stays narrower. */
	width?: string | number;
}

/**
 * Presentational Mac OS 8 window frame: title bar (pinstripes + centered
 * title chip) over a body region. Intentionally decoupled from the window
 * manager — no appId, no store reads, no dispatches — so it renders anywhere,
 * including the pre-boot overlay before any app exists.
 */
export const ClassicyWindowFrame: FunctionalComponent<
	ClassicyWindowFrameProps
> = ({ title = "", children, className, width }) => {
	const style =
		width !== undefined
			? ({
					"--classicy-window-frame-width":
						typeof width === "number" ? `${width}px` : width,
				} as CSSProperties)
			: undefined;

	return (
		<div className={classNames("classicyWindowFrame", className)} style={style}>
			<div className="classicyWindowFrameTitleBar">
				{title !== "" && (
					<span className="classicyWindowFrameTitleText">{title}</span>
				)}
			</div>
			<div className="classicyWindowFrameBody">{children}</div>
		</div>
	);
};
