import "./ClassicySeparator.scss";
import classNames from "classnames";
import type { CSSProperties, FC as FunctionalComponent } from "react";

export type ClassicySeparatorOrientation = "horizontal" | "vertical";

export type ClassicySeparatorProps = {
	/**
	 * `horizontal` (default) draws a full-width dividing line; `vertical`
	 * draws a full-height one for side-by-side content regions.
	 */
	orientation?: ClassicySeparatorOrientation;
	/** Extra class names to merge onto the separator element. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
};

/**
 * A standalone 2px engraved separator line for dialog content regions
 * (HIGOS8 Ch.2 "Separator Lines", p.50) — use it instead of a raw `<hr>`.
 *
 * The engraving is the Platinum menu-`<hr>` treatment: a 1px dark line on the
 * leading edge with a 1px light highlight on the trailing edge, giving the
 * incised look. Rendered as a semantic `<hr>` (role="separator") with an
 * explicit `aria-orientation`.
 *
 * `horizontal` fills the width of its container; `vertical` stretches to the
 * height of the flex row it sits in (never shorter than one control), so use
 * it as a flex item.
 * `ClassicyButtonToolbar` draws vertical ones between its groups for you.
 */
export const ClassicySeparator: FunctionalComponent<ClassicySeparatorProps> = ({
	orientation = "horizontal",
	className,
	style,
}) => {
	return (
		<hr
			className={classNames(
				"classicySeparator",
				orientation === "vertical"
					? "classicySeparatorVertical"
					: "classicySeparatorHorizontal",
				className,
			)}
			style={style}
			aria-orientation={orientation}
		/>
	);
};
