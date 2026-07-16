import "./ClassicyControlGroup.scss";
import classNames from "classnames";
import type { FC as FunctionalComponent, ReactNode } from "react";

type ClassicyControlGroupProps = {
	label: string;
	columns?: boolean;
	layout?: "default" | "form";
	backgroundColor?: string;
	children: ReactNode;
};

export const ClassicyControlGroup: FunctionalComponent<
	ClassicyControlGroupProps
> = ({
	label = "",
	columns = false,
	layout = "default",
	backgroundColor = "var(--color-system-03)",
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
				label !== "" && "classicyControlGroupFieldsetLabeled",
				columns && "classicyControlGroupFieldsetColumns",
			)}
		>
			{label !== "" && (
				<legend
					className={"classicyControlGroupLegend"}
					style={{ backgroundColor }}
				>
					{label}
				</legend>
			)}
			<div className={contentClass || undefined}>{children}</div>
		</fieldset>
	);
};
