import classNames from "classnames";
import type {
	CSSProperties,
	FC as FunctionalComponent,
	KeyboardEvent,
	MouseEvent,
} from "react";
import { CLASSICY_PART_ATTRIBUTE } from "@/Appearance/vocabulary/ClassicyVocabulary";

export type ClassicyWindowTitleBarProps = {
	/** The title text. Empty, the bar draws one title-less center band. */
	title: string;
	/** The proxy icon drawn before the title (document variant only). */
	icon?: string;
	/** Leaves the proxy icon out. */
	hideIcon?: boolean;
	/**
	 * `"document"` (the default) draws the side bands around the title;
	 * `"utility"` (a windoid) draws one center band and no title text.
	 */
	variant?: "document" | "utility";
	/** A modal dialog's bar: adds `classicyWindowTitleBarModal`, never a zoom box. */
	modal?: boolean;
	/** Draws the close box and is called by its click, Enter or Space. */
	onClose?: () => void;
	/** Draws the zoom box (not on a modal bar) and is called by its click, Enter or Space. */
	onZoom?: () => void;
	/** Draws the collapse box and is called by its click. */
	onCollapse?: (e: MouseEvent<HTMLDivElement>) => void;
	/** Called by Enter or Space on the collapse box; without it they click the box. */
	onCollapseKey?: () => void;
	/** Mouse-down on the title area (the drag handle). */
	onTitleMouseDown?: (e: MouseEvent<HTMLDivElement>) => void;
	/** Double-click on the title area. */
	onTitleDoubleClick?: () => void;
	/** Extra class names, after the bar's own. */
	className?: string;
	/** Inline style for the bar's root element. */
	style?: CSSProperties;
};

/** Enter or Space on a control box, the keys that press a button. */
const isPressKey = (e: KeyboardEvent<HTMLDivElement>) =>
	e.key === "Enter" || e.key === " ";

/**
 * The Mac OS 8 title bar, shared by `ClassicyWindow` and
 * `ClassicyWindowFrame`: the control boxes (close, zoom, collapse; each
 * wrapper carries `data-classicy-control`), and the title area between them,
 * which holds the stripe bands, the proxy icon and the title text. A box is
 * drawn only when its handler is given, so an Appearance Package skins one
 * title bar for both chromes.
 *
 * Presentational: it reads no store and dispatches nothing; the window owns
 * the behavior and passes it in.
 *
 * ```tsx
 * <ClassicyWindowTitleBar title="Untitled" onClose={close} onZoom={zoom} />
 * ```
 */
export const ClassicyWindowTitleBar: FunctionalComponent<
	ClassicyWindowTitleBarProps
> = ({
	title,
	icon,
	hideIcon,
	variant = "document",
	modal = false,
	onClose,
	onZoom,
	onCollapse,
	onCollapseKey,
	onTitleMouseDown,
	onTitleDoubleClick,
	className,
	style,
}) => (
	<div
		className={classNames(
			"classicyWindowTitleBar",
			modal === true ? "classicyWindowTitleBarModal" : "",
			className,
		)}
		style={style}
	>
		{onClose && (
			<div
				className={"classicyWindowControlBox"}
				{...{ [CLASSICY_PART_ATTRIBUTE.control]: "close" }}
			>
				{/* biome-ignore lint/a11y/useSemanticElements: custom window control styled as pixel-precise box */}
				<div
					className={"classicyWindowCloseBox"}
					role="button"
					tabIndex={0}
					onClick={onClose}
					onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
						if (isPressKey(e)) onClose();
					}}
				></div>
			</div>
		)}
		{/* biome-ignore lint/a11y/noStaticElementInteractions: title bar is a mouse-only drag handle */}
		<div
			className={"classicyWindowTitle"}
			role="presentation"
			onMouseDown={onTitleMouseDown}
			// The window binds its drag's mouseup once, on its root element;
			// mouseup here bubbles to it.
			onDoubleClick={onTitleDoubleClick}
		>
			{title !== "" && variant !== "utility" ? (
				<>
					<div className={"classicyWindowTitleLeft"}></div>
					{!hideIcon && (
						<div className={"classicyWindowIcon"}>
							<img src={icon} alt={title} />
						</div>
					)}
					<div className={"classicyWindowTitleText"}>
						<p>{title}</p>
					</div>
					<div className={"classicyWindowTitleRight"}></div>
				</>
			) : (
				<div className={"classicyWindowTitleCenter"}></div>
			)}
		</div>
		{onZoom && !modal && (
			<div
				className={"classicyWindowControlBox"}
				{...{ [CLASSICY_PART_ATTRIBUTE.control]: "zoom" }}
			>
				{/* biome-ignore lint/a11y/useSemanticElements: custom window control styled as pixel-precise box */}
				<div
					className={"classicyWindowZoomBox"}
					role="button"
					tabIndex={0}
					onClick={onZoom}
					onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
						if (isPressKey(e)) onZoom();
					}}
				></div>
			</div>
		)}
		{onCollapse && (
			<div
				className={"classicyWindowControlBox"}
				{...{ [CLASSICY_PART_ATTRIBUTE.control]: "collapse" }}
			>
				{/* biome-ignore lint/a11y/useSemanticElements: custom window control styled as pixel-precise box */}
				<div
					className={"classicyWindowCollapseBox"}
					role="button"
					tabIndex={0}
					onClick={onCollapse}
					onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
						if (!isPressKey(e)) return;
						if (onCollapseKey) onCollapseKey();
						else e.currentTarget.click();
					}}
				></div>
			</div>
		)}
	</div>
);
