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
	 * Border weight (HIGOS8 p.47). `primary` renders the 2px etched frame (1px
	 * light + 1px dark, driven by `--hig-frame-width`); `secondary` renders a
	 * 1px line, for lighter or nested grouping. Defaults to `primary`.
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
	/**
	 * Lets the group grow to fill its flex container (`flex-grow: 1`), so
	 * several groups placed in one flex row share the width as columns.
	 * Defaults to `false`.
	 */
	columns?: boolean;
	/**
	 * `form` lays the content out as a two-column label/control grid: each
	 * child's own children (e.g. a `ClassicyInput`'s label and field) become
	 * one row. Defaults to `default` (normal block flow).
	 */
	layout?: "default" | "form";
	/**
	 * Background painted behind the title so it masks the frame line. Match it
	 * to the surface the group sits on. Defaults to `var(--color-system-03)`
	 * (the window face).
	 */
	backgroundColor?: string;
	/** The grouped controls. */
	children: ReactNode;
};

/**
 * The Platinum group box (HIGOS8 Ch.2 "Group Boxes", p.47): a frame that
 * visually gathers related controls, with an optional title on its top edge.
 * Use it instead of a raw `<fieldset>`/`<legend>` — it renders a real
 * `<fieldset>`, plus a `<legend>` when titled.
 *
 * The title can be plain text (`label`), any node (`title`), a checkbox
 * (`checkboxTitle`) or a pop-up menu (`popUpMenuTitle`) — the HIG's four title
 * styles; when several are set, checkbox beats pop-up beats `title` beats
 * `label`. A checkbox or pop-up title only renders the control: enabling the
 * group's controls, or swapping them for the chosen item, is up to you.
 * `variant` picks the 2px etched primary frame or the 1px secondary line.
 *
 * ```tsx
 * <ClassicyControlGroup label="Connection">
 *     <ClassicyInput id="host" labelTitle="Host" />
 *     <ClassicyCheckbox id="remember" label="Remember me" />
 * </ClassicyControlGroup>
 * ```
 */
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
