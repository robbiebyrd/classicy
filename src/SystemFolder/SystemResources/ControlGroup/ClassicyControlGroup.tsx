import "./ClassicyControlGroup.scss";
import classNames from "classnames";
import { relative } from "path";
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
      style={{flexGrow: columns ? 1: 0, ...(columns ? {columns: 1} : {}), position: "relative"}}
    >
      {label !== "" && (
        <legend style={{fontFamily: "var(--ui-font)", fontSize: "calc(var(--ui-font-size)*0.75)", margin: 0, padding: 0}}
        >{label}</legend>
      )}
      <div className={columns ? "classicyControlGroupContentColumns" : ""}>
        {children}
      </div>
    </fieldset>
  );
};
