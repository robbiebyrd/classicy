import type { ChangeEvent, FC } from "react";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";
import { intToRgb, rgbToInt, rgbToCmyk, cmykToRgb } from "./ClassicyColorPickerUtils";

interface ClassicyColorPickerCMYKProps {
  color: number;
  onChangeFunc: (color: number) => void;
}

export const ClassicyColorPickerCMYK: FC<ClassicyColorPickerCMYKProps> = ({ color, onChangeFunc }) => {
  const { r, g, b } = intToRgb(color);
  const { c, m, y, k } = rgbToCmyk(r, g, b);

  const emit = (channel: "c" | "m" | "y" | "k", pct: number) => {
    const val = Math.max(0, Math.min(100, pct));
    const { r: cr, g: cg, b: cb } = intToRgb(color);
    const cur = rgbToCmyk(cr, cg, cb);
    const next = { ...cur, [channel]: val };
    const { r: nr, g: ng, b: nb } = cmykToRgb(next.c, next.m, next.y, next.k);
    onChangeFunc(rgbToInt(nr, ng, nb));
  };

  const onChange = (channel: "c" | "m" | "y" | "k") =>
    (e: ChangeEvent<HTMLInputElement>) => emit(channel, Number(e.target.value));

  return (
    <div className="classicyColorPickerSlidersTab">
      <div className="classicyColorPickerSlider--cyan">
        <ClassicySlider id="cp-cmyk-c" labelTitle="Cyan:" labelPosition="left"
          value={c} min={0} max={100} valueLabel={`${c} %`} onChangeFunc={onChange("c")} />
      </div>
      <div className="classicyColorPickerSlider--magenta">
        <ClassicySlider id="cp-cmyk-m" labelTitle="Magenta:" labelPosition="left"
          value={m} min={0} max={100} valueLabel={`${m} %`} onChangeFunc={onChange("m")} />
      </div>
      <div className="classicyColorPickerSlider--yellow">
        <ClassicySlider id="cp-cmyk-y" labelTitle="Yellow:" labelPosition="left"
          value={y} min={0} max={100} valueLabel={`${y} %`} onChangeFunc={onChange("y")} />
      </div>
      <div className="classicyColorPickerSlider--black">
        <ClassicySlider id="cp-cmyk-k" labelTitle="Black:" labelPosition="left"
          value={k} min={0} max={100} valueLabel={`${k} %`} onChangeFunc={onChange("k")} />
      </div>
    </div>
  );
};
