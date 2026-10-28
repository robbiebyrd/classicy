import "./ClassicyWindowFrame.scss";
import classNames from "classnames";
import type {
	CSSProperties,
	FC as FunctionalComponent,
	ReactNode,
} from "react";

interface ClassicyWindowFrameProps {
	/** Text in the centred title chip. Omitted or empty, the title bar shows only pinstripes. */
	title?: string;
	/** Body content, rendered below the title bar. */
	children: ReactNode;
	/** Extra class names for the outer frame element. */
	className?: string;
	/** Inline style for the outer frame element; merged after the `width` custom property. */
	style?: CSSProperties;
	/** Caps the frame's max-width (number → px); content narrower than this stays narrower. */
	width?: string | number;
}

/**
 * Presentational Mac OS 8 window frame: title bar (pinstripes + centered
 * title chip) over a body region. Intentionally decoupled from the window
 * manager — no appId, no store reads, no dispatches — so it renders anywhere,
 * including the pre-boot overlay before any app exists.
 *
 * Use it for window-looking chrome outside a running desktop, such as a
 * `ClassicyDesktop` `preBootScreen`. It has no close, zoom or collapse box and
 * cannot be moved, resized or focused; inside an app, use `ClassicyWindow`.
 *
 * ```tsx
 * <ClassicyDesktop
 *   preBootScreen={(powerOn) => (
 *     <ClassicyWindowFrame title="Welcome" width={480}>
 *       <ClassicyButton onClickFunc={powerOn}>Power On</ClassicyButton>
 *     </ClassicyWindowFrame>
 *   )}
 * />
 * ```
 */
export const ClassicyWindowFrame: FunctionalComponent<
	ClassicyWindowFrameProps
> = ({ title = "", children, className, style, width }) => {
	const frameStyle =
		width !== undefined
			? ({
					"--classicy-window-frame-width":
						typeof width === "number" ? `${width}px` : width,
				} as CSSProperties)
			: undefined;

	return (
		<div
			className={classNames("classicyWindowFrame", className)}
			style={{ ...frameStyle, ...style }}
		>
			<div className="classicyWindowFrameTitleBar">
				{title !== "" && (
					<span className="classicyWindowFrameTitleText">{title}</span>
				)}
			</div>
			<div className="classicyWindowFrameBody">{children}</div>
		</div>
	);
};
