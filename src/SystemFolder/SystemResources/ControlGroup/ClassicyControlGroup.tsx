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
	 * `form` lays the content out as a two-column label/control grid (HIGOS8
	 * Ch.3 "Static Text Field Layout", p.84): each child's own children (e.g. a
	 * `ClassicyInput`'s label and field, with `labelPosition="left"`) become
	 * one row, so every field starts at the same x. Labels sit 5px from their
	 * fields and rows 6px apart. A child that is not a label/control pair — a
	 * checkbox, a push button, a sentence — goes in a
	 * `ClassicyControlGroupFormRow`, which spans both columns. Defaults to
	 * `default` (normal block flow).
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

type ClassicyControlGroupFormRowProps = {
	/**
	 * Where the row's content sits. `start` (default) keeps it on the label
	 * column's edge, so a checkbox's box lines up with the labels above and
	 * below it (HIGOS8 Figure 3-27); `end` pushes it to the group's right
	 * edge — the HIG's lower-right home for a push button (p.72).
	 */
	justify?: "start" | "end";
	/** The row's content. */
	children: ReactNode;
};

/**
 * A full-width row inside a `ClassicyControlGroup layout="form"`. The form
 * grid turns each direct child's own children into label and control cells,
 * which is wrong for anything that is not such a pair: a `ClassicyCheckbox`
 * (its label follows its box), a `ClassicyButton`, or plain text. Wrap those
 * in this row and they span both columns instead. The grid's gaps do the
 * spacing, so a `ClassicyButton` in a row drops its outer margin and sits
 * flush with the controls' edges; side by side, buttons keep the HIG 12px.
 *
 * ```tsx
 * <ClassicyControlGroup label="Screen Saver" layout="form">
 *     <ClassicyControlGroupFormRow>
 *         <ClassicyCheckbox id="on" label="Start screen saver when idle" />
 *     </ClassicyControlGroupFormRow>
 *     <ClassicyPopUpMenu id="saver" label="Screen saver" labelPosition="left" … />
 *     <ClassicyControlGroupFormRow justify="end">
 *         <ClassicyButton>Test</ClassicyButton>
 *     </ClassicyControlGroupFormRow>
 * </ClassicyControlGroup>
 * ```
 */
export const ClassicyControlGroupFormRow: FunctionalComponent<
	ClassicyControlGroupFormRowProps
> = ({ justify = "start", children }) => (
	<div
		className={classNames(
			"classicyControlGroupFormRow",
			justify === "end" && "classicyControlGroupFormRowEnd",
		)}
	>
		{children}
	</div>
);

type ClassicyControlGroupStackProps = {
	/** Extra class on the stack (e.g. for the panel's own padding). */
	className?: string;
	/** The group boxes, top to bottom. */
	children: ReactNode;
};

/**
 * Stacks group boxes vertically at the HIG distance: 12px from one frame to
 * the next (HIGOS8 Figure 3-29, `--hig-groupbox-gap-v`), measured between
 * the border lines, so a title overhanging the lower box's top edge sits
 * inside that gap rather than adding to it. Use it as the content of a
 * control panel or dialog that is a column of group boxes.
 *
 * ```tsx
 * <ClassicyControlGroupStack className="myPanelContent">
 *     <ClassicyControlGroup label="General">…</ClassicyControlGroup>
 *     <ClassicyControlGroup label="Options">…</ClassicyControlGroup>
 * </ClassicyControlGroupStack>
 * ```
 */
export const ClassicyControlGroupStack: FunctionalComponent<
	ClassicyControlGroupStackProps
> = ({ className, children }) => (
	<div className={classNames("classicyControlGroupStack", className)}>
		{children}
	</div>
);
