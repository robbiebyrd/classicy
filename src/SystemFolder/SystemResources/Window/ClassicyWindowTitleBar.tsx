import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type MouseEvent,
	useRef,
} from "react";
import {
	CLASSICY_PART_ATTRIBUTE,
	classicyStateClasses,
} from "@/Appearance/vocabulary/ClassicyVocabulary";
import { CLASSICY_WHATS_THIS_COMMAND_ATTRIBUTE } from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyWhatsThis.internal";
import { useClassicyBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";

export type ClassicyWindowTitleBarProps = {
	/** The title text. Empty, the bar draws one title-less center band. */
	title: string;
	/** The proxy icon drawn before the title (document variant only). */
	icon?: string;
	/** Leaves the proxy icon out. */
	hideIcon?: boolean;
	/**
	 * `"document"` (the default) draws the side bands around the title;
	 * `"utility"` (a windoid) draws one center band and no title text,
	 * unless `utilityTitle`.
	 */
	variant?: "document" | "utility";
	/** A modal dialog's bar: adds `classicyWindowTitleBarModal`, never a zoom box. */
	modal?: boolean;
	/** Draws the close box and is called, with no arguments, by its click, Enter or Space. */
	onClose?: () => void;
	/**
	 * Draws the close box unavailable, whether or not `onClose` is given: it
	 * carries the `disabled` state and `aria-disabled="true"`, leaves the tab
	 * order (`tabIndex` -1) and has no handler, so its click, Enter and Space
	 * do nothing. `ClassicyWindow` passes it under a layout whose
	 * `dialog.caption` is `"titled"` for a modal that has no way to close
	 * (not `closable`, no `onCaptionClose`): Windows grays a Close it cannot
	 * carry out (Wine's `draw_close_button` for a system menu whose
	 * `SC_CLOSE` is grayed or absent, as a Yes/No message box's is). Windows
	 * 98 draws it embossed; a package with no unavailable Close draws it as
	 * its close box.
	 */
	closeDisabled?: boolean;
	/**
	 * Draws the zoom box (not on a modal bar) and is called, with no
	 * arguments, by its click, Enter or Space.
	 */
	onZoom?: () => void;
	/**
	 * Draws the zoom box unavailable (not on a modal bar), `onZoom` given or
	 * not, as `closeDisabled` draws the close box: the `disabled` state,
	 * `aria-disabled="true"`, `tabIndex` -1 and no handler. `ClassicyWindow`
	 * passes it under a layout whose `window.zoom` is `"maximize"` for a
	 * primary window that has a collapse (Minimize) box and no zoom box:
	 * Windows 95/98 draws Minimize and Maximize as a pair, the one a window
	 * lacks grayed (Wine's `NC_DrawCaption`: "In win95 the two buttons are
	 * always there"). Without it the box renders as before.
	 */
	zoomDisabled?: boolean;
	/** Draws the collapse box and is called by its click. */
	onCollapse?: (e: MouseEvent<HTMLDivElement>) => void;
	/**
	 * Draws the collapse box unavailable, `onCollapse` given or not, as
	 * `zoomDisabled` draws the zoom box. `ClassicyWindow` passes it under a
	 * layout whose `window.zoom` is `"maximize"` for a primary window that
	 * has a zoom (Maximize) box and no collapse box: Windows' grayed
	 * Minimize beside a Maximize. Without it the box renders as before.
	 */
	collapseDisabled?: boolean;
	/** Called by Enter or Space on the collapse box; without it they click the box. */
	onCollapseKey?: () => void;
	/**
	 * Draws the help box, Windows' "?" caption button (a dialog's What's
	 * This? button, WIG Ch.8 "Appearance and Behavior", p.145; Ch.12
	 * "Context-Sensitive Help", p.273), and is called, with no arguments, by
	 * its click, Enter or Space. Its wrapper carries
	 * `data-classicy-control="help"` and its box the class
	 * `classicyWindowHelpBox`; it is named "Help" (`labels.help`) and comes
	 * last in the DOM, so a package places it with `order` (Windows 98: just
	 * left of Close). Its wrapper also carries `data-classicy-whats-this`, so
	 * a press on it passes through the What's This? mode. `ClassicyWindow`
	 * passes it for a dialog with described content under
	 * `balloonHelp.contextHelp` "whatsThis" (Windows 98), starting the mode
	 * over the window. Without it no box is drawn and the bar renders as
	 * before.
	 */
	onHelp?: () => void;
	/** Mouse-down on the title area (the drag handle). */
	onTitleMouseDown?: (e: MouseEvent<HTMLDivElement>) => void;
	/** Double-click on the title area. */
	onTitleDoubleClick?: () => void;
	/**
	 * Mouse-down on the proxy icon (`.classicyWindowIcon`), before the title
	 * area's `onTitleMouseDown` hears it. `ClassicyWindow` passes it under a
	 * layout whose `window.systemMenu` is `true`: a press on the icon opens
	 * the window pop-up menu (WIG Ch.6 "Title Bar Icons", p.78; Ch.7,
	 * p.102). Without it the icon is inert.
	 */
	onIconMouseDown?: (e: MouseEvent<HTMLDivElement>) => void;
	/**
	 * Double-click on the proxy icon, before the title area's
	 * `onTitleDoubleClick` hears it (call `e.stopPropagation()` to keep it
	 * from that). `ClassicyWindow` passes it under `window.systemMenu`: the
	 * double-click closes the window (WIG Ch.6, p.78). Without it the icon is
	 * inert.
	 */
	onIconDoubleClick?: (e: MouseEvent<HTMLDivElement>) => void;
	/**
	 * The control boxes' accessible names (`aria-label`), each defaulting to
	 * the Mac OS name: `"Close"`, `"Zoom"`, `"Collapse"`. `ClassicyWindow`
	 * names the collapse box `"Minimize"` under a layout whose
	 * `window.collapse` is `"minimize"` (Windows' title bar buttons, WIG Ch.6,
	 * p.80); without the prop the boxes keep their names.
	 */
	labels?: ClassicyWindowTitleBarLabels;
	/**
	 * Each control box names itself in a tooltip: its label (`labels`, else
	 * "Close", "Zoom", "Collapse", "Help") once the pointer has rested on it for
	 * 500 ms (Windows' automatic delay, the double-click time: Wine's
	 * `TTDT_AUTOMATIC`), whether or not balloon help is on
	 * (`useClassicyBalloonHelp`'s `force`), below the box; a press on the box
	 * hides it until the pointer comes back, as a Windows tooltip hides on a
	 * button press. `ClassicyWindow` passes it under a layout whose
	 * `window.captionTooltips` is `true` (Windows 98 as shipped). Without it
	 * the boxes render as they always have, with no tooltip and no hover
	 * handler.
	 */
	buttonTooltips?: boolean;
	/**
	 * A `"utility"` bar draws its title too: the title text (no icon, no side
	 * bands) before the center band, as a Windows tool window's small caption
	 * carries its title (Wine's `draw_nc_caption` for WS_EX_TOOLWINDOW).
	 * `ClassicyWindow` passes it under a layout whose `window.utilityTitle` is
	 * `true` (Windows 98). Without it, or with an empty `title`, a utility bar
	 * renders as before, one title-less band; a document bar ignores it.
	 */
	utilityTitle?: boolean;
	/** Extra class names, after the bar's own. */
	className?: string;
	/** Inline style for the bar's root element. */
	style?: CSSProperties;
};

/** The control boxes' accessible names (`ClassicyWindowTitleBar`'s `labels`). */
export type ClassicyWindowTitleBarLabels = {
	/** The close box's name; `"Close"` when absent. */
	close?: string;
	/** The zoom box's name; `"Zoom"` when absent. */
	zoom?: string;
	/** The collapse box's name; `"Collapse"` when absent. */
	collapse?: string;
	/** The help box's name; `"Help"` when absent (Windows' "?" button). */
	help?: string;
};

/** Enter or Space on a control box, the keys that press a button. */
const isPressKey = (e: KeyboardEvent<HTMLDivElement>) =>
	e.key === "Enter" || e.key === " ";

// How long the pointer rests on a box before its tooltip shows: Windows'
// automatic delay, the double-click time (Wine's `tooltips.c`,
// `TTDT_AUTOMATIC`), 500 ms by default, as the taskbar's buttons wait.
const CAPTION_TOOLTIP_DELAY_MS = 500;

/** One control box: its class, accessible name and behavior. */
type ClassicyWindowTitleBarBoxProps = {
	className: string;
	label: string;
	disabled?: boolean;
	onClick?: (e: MouseEvent<HTMLDivElement>) => void;
	onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
};

// The box as it has always rendered: a focusable button-role div; an
// unavailable one (`disabled`) out of the tab order, `aria-disabled`, with
// no handler.
const ClassicyWindowTitleBarBox: FunctionalComponent<
	ClassicyWindowTitleBarBoxProps
> = ({ className, label, disabled = false, onClick, onKeyDown }) => (
	// biome-ignore lint/a11y/useSemanticElements: custom window control styled as pixel-precise box
	<div
		className={classNames(className, classicyStateClasses({ disabled }))}
		role="button"
		aria-label={label}
		aria-disabled={disabled ? "true" : undefined}
		tabIndex={disabled ? -1 : 0}
		onClick={onClick}
		onKeyDown={onKeyDown}
	></div>
);

// The same box naming itself in a tooltip (`buttonTooltips`): a forced
// balloon (a tooltip, shown whatever Balloon Help says) after the pointer
// rests on it, below it, hidden by a press on it. A separate component, so a
// bar without the prop runs no balloon hook at all.
const ClassicyWindowTitleBarTooltipBox: FunctionalComponent<
	ClassicyWindowTitleBarBoxProps
> = ({ className, label, disabled = false, onClick, onKeyDown }) => {
	const ref = useRef<HTMLDivElement>(null);
	const { handlers, balloon } = useClassicyBalloonHelp(
		ref,
		{
			content: label,
			delay: CAPTION_TOOLTIP_DELAY_MS,
			position: "bottom-left",
		},
		{ force: true },
	);
	return (
		<>
			{/* biome-ignore lint/a11y/useSemanticElements: custom window control styled as pixel-precise box */}
			<div
				ref={ref}
				className={classNames(className, classicyStateClasses({ disabled }))}
				role="button"
				aria-label={label}
				aria-disabled={disabled ? "true" : undefined}
				aria-describedby={handlers["aria-describedby"]}
				tabIndex={disabled ? -1 : 0}
				onClick={onClick}
				onKeyDown={onKeyDown}
				onMouseEnter={handlers.onMouseEnter}
				onMouseLeave={handlers.onMouseLeave}
				// A press hides the tooltip (and stops its timer) until the
				// pointer leaves and comes back, as Windows' tooltip control
				// hides on a relayed button press.
				onMouseDown={handlers.onMouseLeave}
			></div>
			{balloon}
		</>
	);
};

// A box, with its tooltip when the bar asks for them.
const ClassicyWindowTitleBarControlBox: FunctionalComponent<
	ClassicyWindowTitleBarBoxProps & { tooltip: boolean }
> = ({ tooltip, ...box }) =>
	tooltip ? (
		<ClassicyWindowTitleBarTooltipBox {...box} />
	) : (
		<ClassicyWindowTitleBarBox {...box} />
	);

/**
 * The Mac OS 8 title bar, shared by `ClassicyWindow` and
 * `ClassicyWindowFrame`: the control boxes (close, zoom, collapse; each
 * wrapper carries `data-classicy-control`), and the title area between them,
 * which holds the stripe bands, the proxy icon and the title text. A box is
 * drawn only when its handler is given, so an Appearance Package skins one
 * title bar for both chromes.
 *
 * Presentational: it dispatches nothing and reads no store (only the
 * tooltips `buttonTooltips` asks for read balloon help's toggle, through
 * `useClassicyBalloonHelp`); the window owns the behavior and passes it in. The boxes are buttons named "Close", "Zoom"
 * and "Collapse", unless `labels` names them otherwise; `closeDisabled`,
 * `zoomDisabled` and `collapseDisabled` draw a box unavailable, and
 * `buttonTooltips` gives each box its name as a tooltip; `onHelp` adds
 * Windows' "?" box.
 *
 * Its styles exist only under a `.classicyWindow` or `.classicyWindowFrame`
 * root (`ClassicyWindowTitleBar.scss` is included by those two sheets), so
 * rendered on its own it is unstyled: mount it inside one of those chromes.
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
	closeDisabled = false,
	onZoom,
	zoomDisabled = false,
	onCollapse,
	collapseDisabled = false,
	onCollapseKey,
	onHelp,
	onTitleMouseDown,
	onTitleDoubleClick,
	onIconMouseDown,
	onIconDoubleClick,
	labels,
	buttonTooltips = false,
	utilityTitle = false,
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
		{(onClose || closeDisabled) && (
			<div
				className={"classicyWindowControlBox"}
				{...{ [CLASSICY_PART_ATTRIBUTE.control]: "close" }}
			>
				<ClassicyWindowTitleBarControlBox
					tooltip={buttonTooltips}
					className={"classicyWindowCloseBox"}
					label={labels?.close ?? "Close"}
					disabled={closeDisabled}
					onClick={!closeDisabled && onClose ? () => onClose() : undefined}
					onKeyDown={
						!closeDisabled && onClose
							? (e: KeyboardEvent<HTMLDivElement>) => {
									if (isPressKey(e)) onClose();
								}
							: undefined
					}
				/>
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
						// biome-ignore lint/a11y/noStaticElementInteractions: the proxy icon is a mouse-only target (the window pop-up menu's, when given handlers); ALT+SPACE is its keyboard path
						<div
							className={"classicyWindowIcon"}
							onMouseDown={onIconMouseDown}
							onDoubleClick={onIconDoubleClick}
						>
							<ClassicyIconImage src={icon} alt={title} />
						</div>
					)}
					<div className={"classicyWindowTitleText"}>
						<p>{title}</p>
					</div>
					<div className={"classicyWindowTitleRight"}></div>
				</>
			) : title !== "" && utilityTitle ? (
				<>
					<div className={"classicyWindowTitleText"}>
						<p>{title}</p>
					</div>
					<div className={"classicyWindowTitleCenter"}></div>
				</>
			) : (
				<div className={"classicyWindowTitleCenter"}></div>
			)}
		</div>
		{(onZoom || zoomDisabled) && !modal && (
			<div
				className={"classicyWindowControlBox"}
				{...{ [CLASSICY_PART_ATTRIBUTE.control]: "zoom" }}
			>
				<ClassicyWindowTitleBarControlBox
					tooltip={buttonTooltips}
					className={"classicyWindowZoomBox"}
					label={labels?.zoom ?? "Zoom"}
					disabled={zoomDisabled}
					onClick={!zoomDisabled && onZoom ? () => onZoom() : undefined}
					onKeyDown={
						!zoomDisabled && onZoom
							? (e: KeyboardEvent<HTMLDivElement>) => {
									if (isPressKey(e)) onZoom();
								}
							: undefined
					}
				/>
			</div>
		)}
		{(onCollapse || collapseDisabled) && (
			<div
				className={"classicyWindowControlBox"}
				{...{ [CLASSICY_PART_ATTRIBUTE.control]: "collapse" }}
			>
				<ClassicyWindowTitleBarControlBox
					tooltip={buttonTooltips}
					className={"classicyWindowCollapseBox"}
					label={labels?.collapse ?? "Collapse"}
					disabled={collapseDisabled}
					onClick={collapseDisabled ? undefined : onCollapse}
					onKeyDown={
						collapseDisabled
							? undefined
							: (e: KeyboardEvent<HTMLDivElement>) => {
									if (!isPressKey(e)) return;
									if (onCollapseKey) onCollapseKey();
									else e.currentTarget.click();
								}
					}
				/>
			</div>
		)}
		{onHelp && (
			<div
				className={"classicyWindowControlBox"}
				{...{ [CLASSICY_PART_ATTRIBUTE.control]: "help" }}
				// The What's This? command (`CLASSICY_WHATS_THIS_COMMAND_ATTRIBUTE`):
				// while the mode is on, a press here goes through, so the
				// box's second click ends the mode.
				{...{ [CLASSICY_WHATS_THIS_COMMAND_ATTRIBUTE]: "" }}
			>
				<ClassicyWindowTitleBarControlBox
					tooltip={buttonTooltips}
					className={"classicyWindowHelpBox"}
					label={labels?.help ?? "Help"}
					onClick={() => onHelp()}
					onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
						if (isPressKey(e)) onHelp();
					}}
				/>
			</div>
		)}
	</div>
);
