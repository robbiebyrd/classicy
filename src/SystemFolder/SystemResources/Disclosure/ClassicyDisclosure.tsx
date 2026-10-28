import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyTriangle } from "@/SystemFolder/SystemResources/Triangle/ClassicyTriangle";
import "./ClassicyDisclosure.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type ReactNode,
	useState,
} from "react";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

type ClassicyDisclosureTriangleDirections = "up" | "right" | "down" | "left";

type ClassicyDisclosureProps = {
	/**
	 * Which way the triangle points while closed (see `ClassicyTriangle`).
	 * Defaults to `right`, the HIG's closed state.
	 */
	direction?: ClassicyDisclosureTriangleDirections;
	/** Header text beside the triangle — HIGOS8 p.115 asks for a labelled triangle. Defaults to `""` (no text). */
	label?: string;
	/** Header text size. Defaults to `medium`. */
	labelSize?: ClassicyControlLabelSize;
	/**
	 * `left` puts the header text before the triangle; any other value puts
	 * it after. Defaults to `right`.
	 */
	labelPosition?: ClassicyLabelPosition;
	/** The content revealed while open; not displayed while closed. */
	children?: ReactNode;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
};

/**
 * A collapsible section headed by a labelled disclosure triangle (HIGOS8 Ch.2
 * "Disclosure Triangles", p.37) — the Classicy replacement for
 * `<details>`/`<summary>`, and the HIG's "expand/contract" pattern for showing
 * optional detail in a dialog. It always starts closed and manages its own
 * open state.
 *
 * The whole header row is a focusable `role="button"` with `aria-expanded`:
 * click it, or press Enter/Space, to toggle; ⌘→ (Ctrl→ off a Mac) opens and
 * ⌘← closes (the HIG's list-view equivalents). Each toggle is reported to
 * analytics.
 * While closed the content is not displayed (it stays mounted, so its state
 * survives). For just the triangle, use `ClassicyTriangle`.
 *
 * ```tsx
 * <ClassicyDisclosure label="Advanced Options">
 *     <ClassicyCheckbox id="verbose" label="Verbose logging" />
 * </ClassicyDisclosure>
 * ```
 */
export const ClassicyDisclosure: FunctionalComponent<
	ClassicyDisclosureProps
> = ({
	direction = "right",
	label = "",
	labelSize = "medium",
	labelPosition = "right",
	children,
	className,
	style,
}) => {
	const [open, setOpen] = useState(false);
	const { track } = useClassicyAnalytics();
	const analyticsArgs = { type: "ClassicyLabel", label };

	function setOpenState(next: boolean) {
		track("click", { expanded: next, ...analyticsArgs });
		setOpen(next);
	}

	function handleKeyPress(e: KeyboardEvent<HTMLDivElement>) {
		switch (e.key) {
			case "Enter":
			// falls through
			case " ": {
				e.preventDefault();
				setOpenState(!open);
				break;
			}
			// HIG list-view disclosure equivalents: Command-Right opens, Command-Left closes.
			case "ArrowRight": {
				if ((e.metaKey || e.ctrlKey) && !open) {
					e.preventDefault();
					setOpenState(true);
				}
				break;
			}
			case "ArrowLeft": {
				if ((e.metaKey || e.ctrlKey) && open) {
					e.preventDefault();
					setOpenState(false);
				}
				break;
			}
		}
	}

	return (
		<div className={classNames("classicyDisclosure", className)} style={style}>
			{/* biome-ignore lint/a11y/useSemanticElements: disclosure header is a block container with svg child incompatible with <button> */}
			<div
				role="button"
				className={"classicyDisclosureHeader"}
				onClick={() => setOpenState(!open)}
				tabIndex={0}
				aria-expanded={open}
				onKeyDown={(e) => handleKeyPress(e)}
			>
				{labelPosition === "left" && (
					<ClassicyControlLabel label={label} labelSize={labelSize} />
				)}
				<ClassicyTriangle
					direction={direction}
					open={open}
					interactive={false}
				/>
				{labelPosition !== "left" && (
					<ClassicyControlLabel label={label} labelSize={labelSize} />
				)}
			</div>
			<div
				className={classNames(
					"classicyDisclosureInner",
					open ? "" : "classicyDisclosureInnerClose",
					classicyStateClasses({ open }),
				)}
			>
				{children}
			</div>
		</div>
	);
};
