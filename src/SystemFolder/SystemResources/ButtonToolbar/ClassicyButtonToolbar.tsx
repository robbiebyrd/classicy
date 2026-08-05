import "./ClassicyButtonToolbar.scss";
import classNames from "classnames";
import {
	Children,
	Fragment,
	type FC as FunctionalComponent,
	type ReactNode,
} from "react";
import { ClassicyButtonToolbarContext } from "@/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbarContext";
import { ClassicySeparator } from "@/SystemFolder/SystemResources/Separator/ClassicySeparator";

export type ClassicyButtonToolbarProps = {
	/** Extra class names merged onto the toolbar element. */
	className?: string;
	children: ReactNode;
};

export type ClassicyButtonToolbarGroupProps = {
	/** Extra class names merged onto the group element. */
	className?: string;
	children: ReactNode;
};

/**
 * A run of controls packed flush against each other, with no gaps.
 *
 * Groups are the unit the toolbar counts when placing dividers; a group has no
 * behavior of its own.
 */
export const ClassicyButtonToolbarGroup: FunctionalComponent<
	ClassicyButtonToolbarGroupProps
> = ({ className, children }) => (
	<div className={classNames("classicyButtonToolbarGroup", className)}>
		{children}
	</div>
);

/**
 * A Mac OS 8 control bar: buttons flush together, arranged into groups
 * separated by a vertical engraved divider.
 *
 * Dividers are drawn automatically **between** children — never leading,
 * never trailing, and not at all for a single group — so consumers never place
 * a `ClassicySeparator` by hand.
 *
 * Children are normally `ClassicyButtonToolbarGroup`s, but any element works.
 * A control placed directly in the toolbar is treated as its own group, so it
 * gets dividers on both sides.
 *
 * Inside a toolbar, an icon-only `ClassicyBevelButton` defaults to a square
 * box; a button with text keeps its rectangular shape. Passing `square`
 * explicitly always wins.
 *
 * @example
 * <ClassicyButtonToolbar>
 *     <ClassicyButtonToolbarGroup>
 *         <ClassicyBevelButton icon={back} iconAlt="Back" />
 *         <ClassicyBevelButton icon={fwd} iconAlt="Forward" />
 *     </ClassicyButtonToolbarGroup>
 *     <ClassicyButtonToolbarGroup>
 *         <ClassicyBevelButton icon={zoom} iconAlt="Zoom" />
 *     </ClassicyButtonToolbarGroup>
 * </ClassicyButtonToolbar>
 */
export const ClassicyButtonToolbar: FunctionalComponent<
	ClassicyButtonToolbarProps
> = ({ className, children }) => {
	// toArray drops null/undefined/booleans and assigns stable keys, so a
	// conditionally-rendered group never leaves a stray divider behind.
	const items = Children.toArray(children);
	return (
		<ClassicyButtonToolbarContext.Provider value={true}>
			<div className={classNames("classicyButtonToolbar", className)}>
				{items.map((child, index) => (
					// Interleaving BETWEEN rendered children is what makes the
					// leading/trailing/single-group cases correct without
					// special-casing any of them.
					// biome-ignore lint/suspicious/noArrayIndexKey: Children.toArray already keyed each child; this Fragment's index only marks the interleaved separator's position, which is structurally static per render and never reordered.
					<Fragment key={`${index}`}>
						{index > 0 && <ClassicySeparator orientation="vertical" />}
						{child}
					</Fragment>
				))}
			</div>
		</ClassicyButtonToolbarContext.Provider>
	);
};
