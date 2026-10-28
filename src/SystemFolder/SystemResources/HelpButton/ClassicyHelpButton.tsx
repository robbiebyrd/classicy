import "./ClassicyHelpButton.scss";
import classNames from "classnames";
import type { FC as FunctionalComponent, MouseEventHandler } from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";

type ClassicyHelpButtonProps = {
	/** DOM id for the underlying `<button>`. */
	id?: string;
	/**
	 * Accessible name. The button shows only the help glyph, so this is what a
	 * screen reader announces. Default `"Help"`.
	 */
	label?: string;
	/** Dims the button and ignores presses. Defaults to `false`. */
	disabled?: boolean;
	/** Click handler — typically opens the relevant help (Apple Guide, a help window). */
	onClickFunc?: MouseEventHandler<HTMLButtonElement>;
	/** Extra class names merged onto the button (e.g. for placement). */
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
 *
 * It is a small-bevel `ClassicyBevelButton` in `push` mode, so it shares that
 * button's click sounds, analytics and keyboard behaviour; the glyph is
 * `ClassicyIcons.ui.helpButton`. In an alert, give a button `role: "help"` and `ClassicyAlert` renders this
 * component, far left.
 */
export const ClassicyHelpButton: FunctionalComponent<
	ClassicyHelpButtonProps
> = ({ id, label = "Help", disabled = false, onClickFunc, className }) => {
	const helpIcon = useClassicyAsset("icons", "ui.helpButton") ?? "";
	return (
		<ClassicyBevelButton
			id={id}
			aria-label={label}
			bevelWidth="small"
			icon={helpIcon}
			disabled={disabled}
			onClickFunc={onClickFunc}
			className={classNames("classicyHelpButton", className)}
		/>
	);
};
