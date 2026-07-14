import type { CSSProperties, ChangeEvent, FC } from "react";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";
import { ClassicyColorWheel } from "./ClassicyColorWheel";
import { intToRgb, rgbToInt, rgbToHsv, hsvToRgb } from "./ClassicyColorPickerUtils";

const WHEEL_SIZE = 200;
const DEGREE_MARKS = [0, 60, 120, 180, 240, 300];

interface ClassicyColorPickerHSVProps {
  color: number;
  onChangeFunc: (color: number) => void;
}

export const ClassicyColorPickerHSV: FC<ClassicyColorPickerHSVProps> = ({ color, onChangeFunc }) => {
  const { r, g, b } = intToRgb(color);
  const { h, s, v } = rgbToHsv(r, g, b);

  const emit = (newH: number, newS: number, newV: number) => {
    const { r: nr, g: ng, b: nb } = hsvToRgb(
      Math.max(0, Math.min(360, newH)),
      Math.max(0, Math.min(100, newS)),
      Math.max(0, Math.min(100, newV)),
    );
    onChangeFunc(rgbToInt(nr, ng, nb));
  };

  const onWheelChange = (newH: number, newS: number) => emit(newH, newS, v);

  const onFieldChange = (field: "h" | "s" | "v") =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (Number.isNaN(val)) return;
      emit(field === "h" ? val : h, field === "s" ? val : s, field === "v" ? val : v);
    };

  const onSliderChange = (e: ChangeEvent<HTMLInputElement>) => emit(h, s, Number(e.target.value));

  const { r: vDarkR, g: vDarkG, b: vDarkB } = hsvToRgb(h, 100, 0);
  const { r: vLightR, g: vLightG, b: vLightB } = hsvToRgb(h, 100, 100);
  const valueSliderStyle = {
    "--classicy-slider-track-from": `rgb(${vDarkR},${vDarkG},${vDarkB})`,
    "--classicy-slider-track-to": `rgb(${vLightR},${vLightG},${vLightB})`,
  } as CSSProperties;

  return (
    <div className="classicyColorPickerWheelTab">
      <div className="classicyColorPickerWheelLayout">
        <div className="classicyColorPickerWheelOuter">
          {/* Degree labels absolutely positioned around the wheel */}
          {DEGREE_MARKS.map((deg) => (
            <span
              key={deg}
              className="classicyColorPickerWheelDegreeLabel"
              data-degree={deg}
            >
              {deg}°
            </span>
          ))}
          <div className="classicyColorPickerWheelCanvasWrapper">
            <ClassicyColorWheel
              size={WHEEL_SIZE}
              hue={h} saturation={s} brightness={v}
              mode="hsv"
              onChangeFunc={onWheelChange}
            />
          </div>
        </div>

        <div className="classicyColorPickerWheelFields">
          {([ ["Hue Angle", "h", h, "°"], ["Saturation", "s", s, "%"], ["Value", "v", v, "%"] ] as const).map(
            ([label, field, val, unit]) => (
              <div key={field} className="classicyColorPickerWheelField">
                <label htmlFor={`cp-hsv-${field}`}>{label}:</label>
                <input
                  id={`cp-hsv-${field}`}
                  type="number"
                  min={0}
                  max={field === "h" ? 360 : 100}
                  value={val}
                  onChange={onFieldChange(field)}
                />
                <span className="classicyColorPickerWheelUnit">{unit}</span>
              </div>
            ),
          )}
        </div>
      </div>

      {/* Value slider */}
      <div className="classicyColorPickerValueSlider" style={valueSliderStyle}>
        <ClassicySlider
          id="cp-hsv-v-slider"
          labelTitle="Value:"
          labelPosition="left"
          value={v}
          min={0}
          max={100}
          valueLabel={`${v} %`}
          onChangeFunc={onSliderChange}
        />
      </div>
    </div>
  );
};
