import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import "./ClassicyInput.scss";
import classNames from "classnames";
import React, { ChangeEventHandler } from "react";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

interface ClassicyInputProps {
  id: string;
  inputType?: "text";
  onChangeFunc?: ChangeEventHandler<HTMLInputElement>;
  labelTitle?: string;
  placeholder?: string;
  prefillValue?: string;
  disabled?: boolean;
  isDefault?: boolean;
  ref?: any;
}

export const ClassicyInput: React.FC<ClassicyInputProps> = React.forwardRef<
  HTMLInputElement,
  ClassicyInputProps
>(function ClassicyInput(
  {
    id,
    inputType = "text",
    labelTitle,
    placeholder,
    prefillValue,
    disabled = false,
    isDefault,
    onChangeFunc,
  },
  ref,
) {
  const { track } = useClassicyAnalytics();
  const analyticsArgs = {
    id,
    inputType,
    labelTitle,
    placeholder,
    prefillValue,
    disabled,
    isDefault,
  };

  const handleOnChangeFunc: ChangeEventHandler<HTMLInputElement> = (e) => {
    track("selected", { ...analyticsArgs, selected: e.target.value });
    if (onChangeFunc) onChangeFunc(e);
  };

  return (
    <div className={"classicyInputHolder"}>
      {labelTitle && (
        <ClassicyControlLabel
          label={labelTitle}
          labelFor={id}
          direction={"left"}
          disabled={disabled}
        ></ClassicyControlLabel>
      )}
      <input
        id={id}
        tabIndex={0}
        onChange={handleOnChangeFunc}
        name={id}
        type={inputType}
        ref={ref}
        disabled={disabled}
        value={prefillValue}
        placeholder={placeholder}
        className={classNames(
          "classicyInput",
          isDefault ? "classicyInputDefault" : "",
        )}
      ></input>
    </div>
  );
});
