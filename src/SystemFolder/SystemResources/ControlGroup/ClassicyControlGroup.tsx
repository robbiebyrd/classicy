import "./ClassicyControlGroup.scss";
import classNames from "classnames";
import type {
	ComponentProps,
	FC as FunctionalComponent,
	ReactNode,
} from "react";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";

export type ClassicyControlGroupVariant = "primary" | "secondary";

type ClassicyControlGroupProps = {
	/** Plain-text title placed on the border. */
	label?: string;
	/** Richer title node placed on the border. Overrides `label` when set. */
	title?: ReactNode;
	/**
	 * Border weight. `primary` renders the 2px etched frame (1px light + 1px
	 * dark, driven by `--hig-frame-width`); `secondary` renders a 1px line.
	 */
	variant?: ClassicyControlGroupVariant;
	/**
	 * Convenience: place a checkbox in the legend. Pass the same props you
	 * would give `ClassicyCheckbox`. Overrides `label`/`title`.
	 */
	checkboxTitle?: ComponentProps<typeof ClassicyCheckbox>;
	/**
	 * Convenience: place a pop-up menu in the legend. Pass the same props you
	 * would give `ClassicyPopUpMenu`. Overrides `label`/`title` (and a
	 * `checkboxTitle`, which takes precedence over this).
	 */
	popUpMenuTitle?: ComponentProps<typeof ClassicyPopUpMenu>;
	columns?: boolean;
	layout?: "default" | "form";
	backgroundColor?: string;
	children: ReactNode;
};

export const ClassicyControlGroup: FunctionalComponent<
	ClassicyControlGroupProps
> = ({
	label = "",
	title,
	variant = "primary",
	checkboxTitle,
	popUpMenuTitle,
	columns = false,
	layout = "default",
	backgroundColor = "var(--color-system-03)",
	children,
}) => {
	// Legend precedence: checkbox convenience > pop-up convenience > explicit
	// ReactNode title > plain-text label. An empty label means "untitled".
	let legendContent: ReactNode = null;
	if (checkboxTitle) {
		legendContent = <ClassicyCheckbox {...checkboxTitle} />;
	} else if (popUpMenuTitle) {
		legendContent = <ClassicyPopUpMenu {...popUpMenuTitle} />;
	} else if (title != null) {
		legendContent = title;
	} else if (label !== "") {
		legendContent = label;
	}
	const hasLegend = legendContent != null;

	const contentClass = classNames(
		columns && "classicyControlGroupContentColumns",
		layout === "form" && "classicyControlGroupFormContent",
	);
	return (
		<fieldset
			className={classNames(
				"classicyControlGroupFieldset",
				variant === "secondary"
					? "classicyControlGroupFieldsetSecondary"
					: "classicyControlGroupFieldsetPrimary",
				hasLegend && "classicyControlGroupFieldsetLabeled",
				columns && "classicyControlGroupFieldsetColumns",
			)}
		>
			{hasLegend && (
				<legend
					className={"classicyControlGroupLegend"}
					style={{ backgroundColor }}
				>
					{legendContent}
				</legend>
			)}
			<div className={contentClass || undefined}>{children}</div>
		</fieldset>
	);
};
