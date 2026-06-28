import "./ClassicyColorPicker.scss";
import { type FC, useEffect, useState } from "react";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";
import { ClassicyColorPickerCrayon } from "./ClassicyColorPickerCrayon";
import { ClassicyColorPickerRGB } from "./ClassicyColorPickerRGB";
import { ClassicyColorPickerHSV } from "./ClassicyColorPickerHSV";
import { ClassicyColorPickerHLS } from "./ClassicyColorPickerHLS";
import { ClassicyColorPickerCMYK } from "./ClassicyColorPickerCMYK";
import { MAC_OS_8_CRAYONS, type ClassicyCrayon } from "./ClassicyColorPickerCrayons";

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

  // Reset to initialColor whenever the dialog is freshly opened.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) setPendingColor(initialColor); }, [open]);

  if (!open) return null;

  const handleOK = () => {
    onSelectFunc?.(pendingColor);
    onCancelFunc?.();
  };

  const tabs = [
    {
      title: "Crayons",
      children: (
        <ClassicyColorPickerCrayon color={pendingColor} crayons={crayons} onChangeFunc={setPendingColor} />
      ),
    },
    {
      title: "RGB",
      children: <ClassicyColorPickerRGB color={pendingColor} onChangeFunc={setPendingColor} />,
    },
    {
      title: "HSV",
      children: <ClassicyColorPickerHSV color={pendingColor} onChangeFunc={setPendingColor} />,
    },
    {
      title: "HLS",
      children: <ClassicyColorPickerHLS color={pendingColor} onChangeFunc={setPendingColor} />,
    },
    {
      title: "CMYK",
      children: <ClassicyColorPickerCMYK color={pendingColor} onChangeFunc={setPendingColor} />,
    },
  ];

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
      initialSize={[480, 380]}
      initialPosition={[200, 100]}
      onCloseFunc={() => onCancelFunc?.()}
    >
      <ClassicyTabs tabs={tabs} />
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
