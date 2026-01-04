import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import "./ClassicyRadioInput.scss";
import classNames from "classnames";
import React, { useState } from "react";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

type ClassicyRadioInputProps = {
  name: string;
  label?: string;
  align?: "rows" | "columns";
  disabled?: boolean;
  onClickFunc?: (id: string) => void;
  inputs: ClassicyRadioInputValueProps[];
};

type ClassicyRadioInputValueProps = {
  id: string;
  checked?: boolean;
  mixed?: boolean;
  isDefault?: boolean;
  disabled?: boolean;
  label?: string;
};

export const ClassicyRadioInput: React.FC<ClassicyRadioInputProps> = ({
  name,
  label,
  align = "columns",
  disabled = false,
  onClickFunc,
  inputs,
}) => {
  const [check, setCheck] = useState<string>(
    inputs.findLast((input) => input.checked === true)?.id || "",
  );
  const player = useSoundDispatch();

  const { track } = useClassicyAnalytics();
  const analyticsArgs = { name, label, disabled, inputs };

  const handleOnChange = (id: string) => {
    setCheck(id);
    track("selected", {
      type: "ClassicyRadioInput",
      itemId: id,
      ...analyticsArgs,
    });
    if (onClickFunc) {
      onClickFunc(id);
    }
  };

  return (
    <>
      {label && (
        <ClassicyControlLabel
          labelFor={name}
          disabled={disabled}
          label={label}
          direction={"left"}
        />
      )}
      <div
        className={classNames(
          "classicyRadioInputGroup",
          align === "columns" ? "classicyRadioInputGroupColumns" : "",
        )}
      >
        {inputs &&
          inputs.map((item) => (
            <div key={name + item.id} className={"classicyRadioInputMargin"}>
              <div
                className={classNames(
                  "classicyRadioInputWrapper",
                  check === item.id ? "classicyRadioInputWrapperChecked" : "",
                  item.disabled ? "classicyRadioInputWrapperDisabled" : "",
                )}
              >
                <input
                  id={item.id}
                  name={name}
                  disabled={item.disabled}
                  className={classNames(
                    "classicyRadioInput",
                    item.isDefault ? "classicyRadioInputDefault" : "",
                    item.mixed ? "classicyRadioInputMixed" : "",
                  )}
                  type={"radio"}
                  value={item.id}
                  defaultChecked={item.checked}
                  tabIndex={0}
                  onChange={() => !item.disabled && handleOnChange(item.id)}
                  onMouseDown={() => {
                    track("click", {
                      type: "ClassicyRadioInput",
                      itemId: item.id,
                      ...analyticsArgs,
                    });
                    player({
                      type: "ClassicySoundPlay",
                      sound: "ClassicyInputRadioClickDown",
                    });
                  }}
                  onMouseUp={() => {
                    player({
                      type: "ClassicySoundPlay",
                      sound: "ClassicyInputRadioClickUp",
                    });
                  }}
                />
              </div>
              <ClassicyControlLabel
                labelFor={item.id}
                disabled={item.disabled}
                label={item.label}
                onClickFunc={() => {
                  if (!item.disabled) handleOnChange(item.id);
                }}
              />
            </div>
          ))}
      </div>
    </>
  );
};
