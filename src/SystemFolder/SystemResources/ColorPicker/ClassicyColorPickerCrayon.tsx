import { type FC, useState } from "react";
import classNames from "classnames";
import { intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";
import type { ClassicyCrayon } from "./ClassicyColorPickerCrayons";

interface ClassicyColorPickerCrayonProps {
  color: number;
  crayons: ClassicyCrayon[];
  onChangeFunc: (color: number) => void;
}

// SVG crayon shape: pointed tip + rectangular body with a label band.
const CrayonSVG: FC<{ fill: string }> = ({ fill }) => (
  <svg width="18" height="50" viewBox="0 0 18 50" xmlns="http://www.w3.org/2000/svg">
    <polygon points="9,0 1,16 17,16" fill={fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.75" />
    <rect x="1" y="16" width="16" height="26" fill={fill} stroke="rgba(0,0,0,0.25)" strokeWidth="0.75" />
    <rect x="1" y="34" width="16" height="8" fill="rgba(255,255,255,0.35)" />
    <rect x="1" y="42" width="16" height="6" rx="1" fill={fill} stroke="rgba(0,0,0,0.15)" strokeWidth="0.5" />
  </svg>
);

export const ClassicyColorPickerCrayon: FC<ClassicyColorPickerCrayonProps> = ({
  color,
  crayons,
  onChangeFunc,
}) => {
  const [hovered, setHovered] = useState<number | null>(null);

  const previewColor = hovered !== null ? hovered : color;

  return (
    <div className="classicyColorPickerCrayonTab">
      <div className="classicyColorPickerCrayonGrid" role="listbox" aria-label="Crayon colors">
        {crayons.map((crayon) => (
          <button
            key={crayon.color}
            type="button"
            role="option"
            aria-selected={crayon.color === color}
            aria-label={crayon.name}
            title={crayon.name}
            className={classNames(
              "classicyColorPickerCrayon",
              crayon.color === color && "classicyColorPickerCrayonSelected",
            )}
            onClick={() => onChangeFunc(crayon.color)}
            onMouseEnter={() => setHovered(crayon.color)}
            onMouseLeave={() => setHovered(null)}
          >
            <CrayonSVG fill={intToHex(crayon.color)} />
          </button>
        ))}
      </div>
      <div
        className="classicyColorPickerCrayonPreviewStrip"
        style={{ backgroundColor: intToHex(previewColor) }}
        aria-label={`Preview: ${intToHex(previewColor)}`}
      />
    </div>
  );
};
