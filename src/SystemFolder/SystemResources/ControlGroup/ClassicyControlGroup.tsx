import "./ClassicyControlGroup.scss";
import classNames from "classnames";
import type { FC as FunctionalComponent, ReactNode } from "react";

type ClassicyControlGroupProps = {
	label: string;
	columns?: boolean;
	layout?: "default" | "form";
	children: ReactNode;
};

export const ClassicyControlGroup: FunctionalComponent<
	ClassicyControlGroupProps
> = ({
	label = "",
	columns = false,
	layout = "default",
	children,
}) => {
	const contentClass = classNames(
		columns && "classicyControlGroupContentColumns",
		layout === "form" && "classicyControlGroupFormContent",
	);
	return (
		<fieldset
			className={classNames(
				"classicyControlGroupFieldset",
				columns && "classicyControlGroupFieldsetColumns",
			)}
		>
			{label !== "" && (
				<legend className={"classicyControlGroupLegend"}>{label}</legend>
			)}
			<div className={contentClass || undefined}>
				{children}
			</div>
		</fieldset>
	);
};
