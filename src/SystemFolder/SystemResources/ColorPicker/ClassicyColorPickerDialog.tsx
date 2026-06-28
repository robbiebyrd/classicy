import "./ClassicyColorPicker.scss";
import { type FC, useEffect, useState } from "react";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";
import { ClassicyColorPickerCrayon } from "./ClassicyColorPickerCrayon";
import { ClassicyColorPickerRGB } from "./ClassicyColorPickerRGB";
import { ClassicyColorPickerHSV } from "./ClassicyColorPickerHSV";
import { ClassicyColorPickerHLS } from "./ClassicyColorPickerHLS";
import { ClassicyColorPickerCMYK } from "./ClassicyColorPickerCMYK";
import { MAC_OS_8_CRAYONS, type ClassicyCrayon } from "./ClassicyColorPickerCrayons";

type PickerMode = "Crayons" | "RGB" | "HSV" | "HLS" | "CMYK";
const PICKER_MODES: PickerMode[] = ["Crayons", "RGB", "HSV", "HLS", "CMYK"];

interface ClassicyColorPickerDialogProps {
  id: string;
  open: boolean;
  initialColor?: number;
  crayons?: ClassicyCrayon[];
  onSelectFunc?: (color: number) => void;
  onCancelFunc?: () => void;
}

export const ClassicyColorPickerDialog: FC<ClassicyColorPickerDialogProps> = ({
  id,
  open,
  initialColor = 0x000000,
  crayons = MAC_OS_8_CRAYONS,
  onSelectFunc,
  onCancelFunc,
}) => {
  const [pendingColor, setPendingColor] = useState(initialColor);
  const [mode, setMode] = useState<PickerMode>("Crayons");

  // Reset to initialColor whenever the dialog is freshly opened.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) setPendingColor(initialColor); }, [open]);

  if (!open) return null;

  const handleOK = () => {
    onSelectFunc?.(pendingColor);
  };

  const activePanel = (() => {
    switch (mode) {
      case "Crayons": return <ClassicyColorPickerCrayon color={pendingColor} crayons={crayons} onChangeFunc={setPendingColor} />;
      case "RGB":     return <ClassicyColorPickerRGB color={pendingColor} onChangeFunc={setPendingColor} />;
      case "HSV":     return <ClassicyColorPickerHSV color={pendingColor} onChangeFunc={setPendingColor} />;
      case "HLS":     return <ClassicyColorPickerHLS color={pendingColor} onChangeFunc={setPendingColor} />;
      case "CMYK":    return <ClassicyColorPickerCMYK color={pendingColor} onChangeFunc={setPendingColor} />;
    }
  })();

  return (
    <ClassicyWindow
      id={id}
      appId={id}
      title="Color Picker"
      modal={true}
      closable={true}
      zoomable={false}
      collapsable={false}
      resizable={false}
      scrollable={false}
      initialSize={[520, 430]}
      initialPosition={[200, 100]}
      onCloseFunc={() => onCancelFunc?.()}
    >
      <div className="classicyColorPickerDialogBody">
        <ul className="classicyColorPickerModeList" role="listbox" aria-label="Color picker mode">
          {PICKER_MODES.map((m) => (
            <li
              key={m}
              role="option"
              aria-selected={m === mode}
              className={m === mode ? "classicyColorPickerModeListItemSelected" : undefined}
              onClick={() => setMode(m)}
            >
              {m}
            </li>
          ))}
        </ul>
        <div className="classicyColorPickerActivePanel">
          {activePanel}
        </div>
      </div>
      <div
        className="classicyColorPickerPreview"
        style={{ backgroundColor: intToHex(pendingColor) }}
        aria-label={`Selected color: ${intToHex(pendingColor)}`}
      />
      <div className="classicyColorPickerDialogFooter">
        <ClassicyButton onClickFunc={onCancelFunc}>Cancel</ClassicyButton>
        <ClassicyButton isDefault={true} onClickFunc={handleOK}>OK</ClassicyButton>
      </div>
    </ClassicyWindow>
  );
};
