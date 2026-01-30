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
        "relative",
        columns ? "grow columns-2" : "columns-1",
      )}
    >
      {label !== "" && (
        <legend className={"font-[family:var(--ui-font)] text-[calc(var(--ui-font-size)*0.75)] m-0 p-0"}>{label}</legend>
      )}
      <div className={columns ? "classicyControlGroupContentColumns" : ""}>
        {children}
      </div>
    </fieldset>
  );
};
