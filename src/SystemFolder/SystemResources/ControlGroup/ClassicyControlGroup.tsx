import "./ClassicyControlGroup.scss";
import classNames from "classnames";
import type { FC as FunctionalComponent, ReactNode } from "react";
import type { ClassicyLabelPosition } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

type ClassicyControlGroupProps = {
	label: string;
	// labelPosition controls the legend alignment; only "above" is fully supported
	// due to HTML fieldset/legend constraints.
	labelPosition?: ClassicyLabelPosition;
	columns?: boolean;
	children: ReactNode;
};

export const ClassicyControlGroup: FunctionalComponent<
	ClassicyControlGroupProps
> = ({
	label = "",
	labelPosition: _labelPosition = "above",
	columns = false,
	children,
}) => {
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
			<div className={columns ? "classicyControlGroupContentColumns" : ""}>
				{children}
			</div>
		</fieldset>
	);
};
