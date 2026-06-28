import { type FC, useState } from "react";
import classNames from "classnames";
import { intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";
import type { ClassicyCrayon } from "./ClassicyColorPickerCrayons";

interface ClassicyColorPickerCrayonProps {
  color: number;
  crayons: ClassicyCrayon[];
  onChangeFunc: (color: number) => void;
}

const COLS = 8;

// Crayon SVG: pointed tip with faceted shading + body with label band.
// The body is mostly hidden behind the row in front; only the tip stays visible.
const CrayonSVG: FC<{ fill: string }> = ({ fill }) => (
  <svg width="36" height="96" viewBox="0 0 36 96" xmlns="http://www.w3.org/2000/svg">
    {/* Tip base fill */}
    <polygon points="18,1 5,28 31,28" fill={fill} stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
    {/* Left highlight facet */}
    <polygon points="18,1 5,28 18,28" fill="rgba(255,255,255,0.25)" />
    {/* Right shadow facet */}
    <polygon points="18,1 31,28 18,28" fill="rgba(0,0,0,0.2)" />
    {/* Body */}
    <rect x="5" y="28" width="26" height="60" fill={fill} />
    {/* Left shadow strip */}
    <rect x="5" y="28" width="4" height="60" fill="rgba(0,0,0,0.22)" />
    {/* Right highlight strip */}
    <rect x="27" y="28" width="4" height="60" fill="rgba(255,255,255,0.22)" />
    {/* Center gloss */}
    <rect x="16" y="28" width="5" height="58" fill="rgba(255,255,255,0.07)" />
    {/* Label band */}
    <rect x="5" y="64" width="26" height="14" fill="rgba(255,255,255,0.48)" />
    {/* Label lines */}
    <rect x="8" y="67" width="20" height="1.5" fill="rgba(0,0,0,0.2)" />
    <rect x="8" y="72" width="14" height="1.5" fill="rgba(0,0,0,0.14)" />
    {/* Bottom flat end */}
    <rect x="5" y="86" width="26" height="8" fill={fill} stroke="rgba(0,0,0,0.28)" strokeWidth="0.75" />
  </svg>
);

export const ClassicyColorPickerCrayon: FC<ClassicyColorPickerCrayonProps> = ({
  color,
  crayons,
  onChangeFunc,
}) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const previewColor = hovered !== null ? hovered : color;

  const rows: ClassicyCrayon[][] = [];
  for (let i = 0; i < crayons.length; i += COLS) {
    rows.push(crayons.slice(i, i + COLS));
  }

  return (
    <div className="classicyColorPickerCrayonTab">
      <div className="classicyColorPickerCrayonBox" role="listbox" aria-label="Crayon colors">
        <div className="classicyColorPickerCrayonRows">
          {rows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className="classicyColorPickerCrayonRow"
              style={{ zIndex: rowIdx }}
            >
              {row.map((crayon) => (
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
          ))}
        </div>
        <div className="classicyColorPickerCrayonBoxLip" />
      </div>
      <div
        className="classicyColorPickerCrayonPreviewStrip"
        style={{ backgroundColor: intToHex(previewColor) }}
        aria-label={`Preview: ${intToHex(previewColor)}`}
      />
    </div>
  );
};
