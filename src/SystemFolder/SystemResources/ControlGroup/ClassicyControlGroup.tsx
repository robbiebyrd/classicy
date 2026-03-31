import "./ClassicyControlGroup.scss";
import classNames from "classnames";
import { FC as FunctionalComponent, ReactNode } from "react";

type ClassicyControlGroupProps = {
  label: string;
  columns?: boolean;
  children: ReactNode;
};

export const ClassicyControlGroup: FunctionalComponent<ClassicyControlGroupProps> = ({
  label = "",
  columns = false,
  children,
}) => {
  return (
    <fieldset
      className={classNames("classicyControlGroupFieldset", columns && "classicyControlGroupFieldsetColumns")}
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
