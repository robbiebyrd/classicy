import "./ClassicySeparator.scss";
import classNames from "classnames";
import type { FC as FunctionalComponent } from "react";

export type ClassicySeparatorOrientation = "horizontal" | "vertical";

export type ClassicySeparatorProps = {
	/**
	 * `horizontal` (default) draws a full-width dividing line; `vertical`
	 * draws a full-height one for side-by-side content regions.
	 */
	orientation?: ClassicySeparatorOrientation;
	/** Extra class names to merge onto the separator element. */
	className?: string;
};

/**
 * A standalone 2px engraved separator line for dialog content regions.
 *
 * The engraving is the Platinum menu-`<hr>` treatment: a 1px dark line on the
 * leading edge with a 1px light highlight on the trailing edge, giving the
 * incised look. Rendered as a semantic `<hr>` (role="separator") with an
 * explicit `aria-orientation`.
 */
export const ClassicySeparator: FunctionalComponent<ClassicySeparatorProps> = ({
	orientation = "horizontal",
	className,
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
			aria-orientation={orientation}
		/>
	);
};
