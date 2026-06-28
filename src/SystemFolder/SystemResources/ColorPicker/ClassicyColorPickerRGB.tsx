import type { ChangeEvent, FC } from "react";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";
import { intToRgb, rgbToInt } from "./ClassicyColorPickerUtils";

interface ClassicyColorPickerRGBProps {
  color: number;
  onChangeFunc: (color: number) => void;
}

export const ClassicyColorPickerRGB: FC<ClassicyColorPickerRGBProps> = ({ color, onChangeFunc }) => {
  const { r, g, b } = intToRgb(color);
  const rPct = Math.round((r / 255) * 100);
  const gPct = Math.round((g / 255) * 100);
  const bPct = Math.round((b / 255) * 100);

  const emit = (channel: "r" | "g" | "b", pct: number) => {
    const val = Math.round((Math.max(0, Math.min(100, pct)) / 100) * 255);
    const { r: cr, g: cg, b: cb } = intToRgb(color);
    onChangeFunc(rgbToInt(
      channel === "r" ? val : cr,
      channel === "g" ? val : cg,
      channel === "b" ? val : cb,
    ));
  };

  const onChange = (channel: "r" | "g" | "b") =>
    (e: ChangeEvent<HTMLInputElement>) => emit(channel, Number(e.target.value));

  return (
    <div className="classicyColorPickerSlidersTab">
      <div className="classicyColorPickerSlider--red">
        <ClassicySlider id="cp-rgb-r" labelTitle="Red:" labelPosition="left"
          value={rPct} min={0} max={100} valueLabel={`${rPct} %`} onChangeFunc={onChange("r")} />
      </div>
      <div className="classicyColorPickerSlider--green">
        <ClassicySlider id="cp-rgb-g" labelTitle="Green:" labelPosition="left"
          value={gPct} min={0} max={100} valueLabel={`${gPct} %`} onChangeFunc={onChange("g")} />
      </div>
      <div className="classicyColorPickerSlider--blue">
        <ClassicySlider id="cp-rgb-b" labelTitle="Blue:" labelPosition="left"
          value={bPct} min={0} max={100} valueLabel={`${bPct} %`} onChangeFunc={onChange("b")} />
      </div>
    </div>
  );
};
