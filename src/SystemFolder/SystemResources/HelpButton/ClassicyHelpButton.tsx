import "./ClassicyHelpButton.scss";
import classNames from "classnames";
import type { FC as FunctionalComponent, MouseEventHandler } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";

type ClassicyHelpButtonProps = {
	id?: string;
	/**
	 * Accessible name. The button shows only the help glyph, so this is what a
	 * screen reader announces. Default `"Help"`.
	 */
	label?: string;
	disabled?: boolean;
	onClickFunc?: MouseEventHandler<HTMLButtonElement>;
	className?: string;
};

/**
 * The Mac OS 8 Help button (HIGOS8 Ch.3 "Help Button Layout", p.86): a
 * 20 × 21 px bevel button carrying the standard help icon.
 *
 * Placement is the dialog's job, not the button's. The preferred spot is the
 * lower left corner, aligned with the bottom of the push buttons — in a
 * right-aligned button row, give it `margin-right: auto` (ClassicyAlert does
 * this for its `help` role). With no push buttons, or no room there, put it in
 * the upper right corner instead.
 */
export const ClassicyHelpButton: FunctionalComponent<
	ClassicyHelpButtonProps
> = ({ id, label = "Help", disabled = false, onClickFunc, className }) => (
	<ClassicyBevelButton
		id={id}
		aria-label={label}
		bevelWidth="small"
		icon={ClassicyIcons.ui.helpButton}
		disabled={disabled}
		onClickFunc={onClickFunc}
		className={classNames("classicyHelpButton", className)}
	/>
);
