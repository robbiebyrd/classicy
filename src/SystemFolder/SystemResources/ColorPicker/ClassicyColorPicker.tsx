import "./ClassicyColorPicker.scss";
import { type FC, useState } from "react";
import classNames from "classnames";
import {
  ClassicyControlLabel,
  type ClassicyControlLabelSize,
  type ClassicyLabelPosition,
  labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";
import { ClassicyColorPickerDialog } from "./ClassicyColorPickerDialog";
import type { ClassicyCrayon } from "./ClassicyColorPickerCrayons";

interface ClassicyColorPickerProps {
  id: string;
  value?: number;
  defaultValue?: number;
  crayons?: ClassicyCrayon[];
  labelTitle?: string;
  labelPosition?: ClassicyLabelPosition;
  labelSize?: ClassicyControlLabelSize;
  disabled?: boolean;
  onChangeFunc?: (color: number) => void;
}

export const ClassicyColorPicker: FC<ClassicyColorPickerProps> = ({
  id,
  value: controlledValue,
  defaultValue = 0x000000,
  crayons,
  labelTitle,
  labelPosition = "left",
  labelSize = "medium",
  disabled = false,
  onChangeFunc,
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const value = controlledValue ?? internalValue;

  return (
    <>
      <div
        className={classNames(
          "classicyColorPickerSwatchWrapper",
          labelTitle && labelPositionClass(labelPosition),
        )}
      >
        {labelTitle && (
          <ClassicyControlLabel
            label={labelTitle}
            labelFor={id}
            labelSize={labelSize}
            disabled={disabled}
          />
        )}
        <button
          type="button"
          id={id}
          data-testid="color-picker-swatch"
          className={classNames(
            "classicyColorPickerSwatch",
            disabled && "classicyColorPickerSwatchDisabled",
          )}
          style={{ backgroundColor: intToHex(value) }}
          onClick={() => setOpen(true)}
          disabled={disabled}
          aria-label={`Color: ${intToHex(value)}. Click to open color picker.`}
        />
      </div>
      <ClassicyColorPickerDialog
        id={`${id}-dialog`}
        open={open}
        initialColor={value}
        crayons={crayons}
        onSelectFunc={(c) => {
          setInternalValue(c);
          onChangeFunc?.(c);
          setOpen(false);
        }}
        onCancelFunc={() => setOpen(false)}
      />
    </>
  );
};
