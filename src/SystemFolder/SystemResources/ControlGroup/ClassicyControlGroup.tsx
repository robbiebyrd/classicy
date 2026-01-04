import "./ClassicyControlGroup.scss";
import classNames from "classnames";
import React from "react";

type ClassicyControlGroupProps = {
  label: string;
  columns?: boolean;
  children: React.ReactNode;
};

export const ClassicyControlGroup: React.FC<ClassicyControlGroupProps> = ({
  label = "",
  columns = false,
  children,
}) => {
  return (
    <fieldset
      className={classNames(
        "classicyControlGroup",
        columns
          ? "classicyControlGroupColumns"
          : "classicyControlGroupNoColumns",
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
