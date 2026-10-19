import "./ClassicyControlLabel.scss";
import classNames from "classnames";
import type {
	FC as FunctionalComponent,
	KeyboardEvent,
	MouseEvent,
	ReactNode,
} from "react";

type ClassicyControlLabelDirections = "left" | "right";
export type ClassicyControlLabelSize = "small" | "medium" | "large";

export type ClassicyLabelPosition = "above" | "left" | "right" | "below";

/**
 * Class that arranges a label around its control (flex direction plus gap):
 * apply it to the element wrapping both. The label must come first in the DOM.
 */
export function labelPositionClass(position: ClassicyLabelPosition): string {
	const map: Record<ClassicyLabelPosition, string> = {
		above: "classicyLabelAbove",
		below: "classicyLabelBelow",
		left: "classicyLabelLeft",
		right: "classicyLabelRight",
	};
	return map[position];
}

export type ClassicyLabelAlign = "left" | "center" | "right";

/** Class that aligns a `ClassicyControlLabel` row inside its wrapper. */
export function labelAlignClass(align: ClassicyLabelAlign): string {
	const map: Record<ClassicyLabelAlign, string> = {
		left: "classicyLabelAlignLeft",
		center: "classicyLabelAlignCenter",
		right: "classicyLabelAlignRight",
	};
	return map[align];
}

interface ClassicyControlLabelProps {
	/** `id` of the control this labels (the `<label>`'s `htmlFor`). Clicking the text then activates that control. */
	labelFor?: string;
	/** The label text. When empty (the default) the component renders nothing at all. */
	label?: string;
	/** Text size: `small`, `medium` or `large` (double size). Defaults to `medium`. */
	labelSize?: ClassicyControlLabelSize;
	/** Draws the text in the disabled grey (HIGOS8 p.42). Defaults to `false`. */
	disabled?: boolean;
	/** Optional icon drawn beside the text (its alt text is the label). */
	icon?: string;
	/** Icon size: `sm` (16px), `lg` (64px), anything else 32px. */
	iconSize?: string;
	/**
	 * Row order. `left` (default) draws the icon and `children` before the
	 * text; `right` reverses the row, so the icon trails the text.
	 */
	direction?: ClassicyControlLabelDirections;
	/** Extra content (usually the control) rendered in the label's row. */
	children?: ReactNode;
	/** Click handler for the whole row; also run by Enter/Space while it is focused. Suppresses the default label action when set. */
	onClickFunc?: (e: MouseEvent) => void;
	/** Mouse-down on the text itself (used by radio and checkbox labels for their click sounds). */
	onMouseDown?: (e: MouseEvent) => void;
	/** Mouse-up on the text itself. */
	onMouseUp?: (e: MouseEvent) => void;
}

/**
 * Static text naming a control (HIGOS8 Ch.2 "Static Text Fields", p.42) — use
 * it instead of a raw `<label>`. It renders a real `<label>` (pointed at a
 * control with `labelFor`) in the theme's UI font, greyed when `disabled`,
 * optionally with an icon. Classicy's own controls (`ClassicyCheckbox`,
 * `ClassicyRadioInput`, `ClassicyInput`, …) already render one from their
 * `label`/`labelTitle` props; reach for it directly when labelling your own
 * control.
 *
 * Gotchas: an empty `label` renders nothing (not even `children`); the
 * wrapper row is focusable with `role="button"` and runs `onClickFunc` on
 * click, Enter or Space; and the row is hidden below 480px viewport width.
 * Arrange a label around its control with `labelPositionClass(position)`
 * (`above`/`below`/`left`/`right`), as the built-in controls do.
 *
 * ```tsx
 * <ClassicyControlLabel label="Printer Name" labelFor="printer-name" />
 * ```
 */
export const ClassicyControlLabel: FunctionalComponent<
	ClassicyControlLabelProps
> = ({
	labelFor = "",
	label = "",
	labelSize = "medium",
	disabled = false,
	direction = "left",
	icon,
	iconSize,
	children,
	onClickFunc,
	onMouseDown,
	onMouseUp,
}) => {
	if (label === "") {
		return null;
	}

	const sizeClassMap: Record<ClassicyControlLabelSize, string> = {
		small: "classicyControlLabelSizeSmall",
		medium: "classicyControlLabelSizeMedium",
		large: "classicyControlLabelSizeLarge",
	};

	const imageSize = (s: string | undefined) => {
		if (s === "sm") {
			return "16px";
		}
		if (s === "lg") {
			return "64px";
		}
		return "32px";
	};

	const isLeftOrBottom = ["left", "bottom"].includes(direction);

	return (
		// biome-ignore lint/a11y/useSemanticElements: contains <label> and block children that are incompatible with <button>
		<div
			role="button"
			tabIndex={0}
			className={classNames(
				"classicyControlLabelHolder",
				isLeftOrBottom
					? "classicyControlLabelHolderLeft"
					: "classicyControlLabelHolderRight",
			)}
			onClick={(e) => {
				if (onClickFunc) {
					e.preventDefault();
					onClickFunc(e);
				}
			}}
			onKeyDown={(e: KeyboardEvent) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					if (onClickFunc) {
						onClickFunc(e as unknown as MouseEvent);
					}
				}
			}}
		>
			{icon && <img src={icon} width={imageSize(iconSize)} alt={label} />}

			{isLeftOrBottom && children}

			<label
				htmlFor={labelFor}
				className={classNames(
					"classicyControlLabel",
					sizeClassMap[labelSize],
					disabled && "classicyControlLabelDisabled",
					direction === "right"
						? "classicyControlLabelMarginRight"
						: "classicyControlLabelMarginLeft",
				)}
				onMouseDown={onMouseDown}
				onMouseUp={onMouseUp}
			>
				{label}
			</label>

			{!isLeftOrBottom && children}
		</div>
	);
};
