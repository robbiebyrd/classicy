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
    <div className={"flex items-center flex-row w-[calc(100%-var(--window-padding-size)*2)] p-[length:var(--window-padding-size)] gap-x-[calc(var(--window-control-size)*1)]"}>
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
          "grow w-auto p-[calc(var(--window-padding-size)/2)]",
          isDefault ? "classicyInputDefault" : "",
        )}
      ></input>
    </div>
  );
});
