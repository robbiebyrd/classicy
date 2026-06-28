import type { CSSProperties, ChangeEvent, FC } from "react";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";
import { ClassicyColorWheel } from "./ClassicyColorWheel";
import { intToRgb, rgbToInt, rgbToHls, hlsToRgb } from "./ClassicyColorPickerUtils";

const WHEEL_SIZE = 200;
const DEGREE_MARKS = [0, 60, 120, 180, 240, 300];

interface ClassicyColorPickerHLSProps {
  color: number;
  onChangeFunc: (color: number) => void;
}

export const ClassicyColorPickerHLS: FC<ClassicyColorPickerHLSProps> = ({ color, onChangeFunc }) => {
  const { r, g, b } = intToRgb(color);
  const { h, l, s } = rgbToHls(r, g, b);

  const emit = (newH: number, newL: number, newS: number) => {
    const { r: nr, g: ng, b: nb } = hlsToRgb(
      Math.max(0, Math.min(360, newH)),
      Math.max(0, Math.min(100, newL)),
      Math.max(0, Math.min(100, newS)),
    );
    onChangeFunc(rgbToInt(nr, ng, nb));
  };

  const onWheelChange = (newH: number, newS: number) => emit(newH, l, newS);

  const onFieldChange = (field: "h" | "l" | "s") =>
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = Number(e.target.value);
      if (Number.isNaN(val)) return;
      emit(field === "h" ? val : h, field === "l" ? val : l, field === "s" ? val : s);
    };

  const onSliderChange = (e: ChangeEvent<HTMLInputElement>) => emit(h, Number(e.target.value), s);

  const radius = WHEEL_SIZE / 2;
  const labelRadius = radius + 20;

  const { r: lDarkR, g: lDarkG, b: lDarkB } = hlsToRgb(h, 0, 100);
  const { r: lLightR, g: lLightG, b: lLightB } = hlsToRgb(h, 100, 100);
  const lightnessSliderStyle = {
    "--classicy-slider-track-from": `rgb(${lDarkR},${lDarkG},${lDarkB})`,
    "--classicy-slider-track-to": `rgb(${lLightR},${lLightG},${lLightB})`,
  } as CSSProperties;

  return (
    <div className="classicyColorPickerWheelTab">
      <div className="classicyColorPickerWheelLayout">
        <div className="classicyColorPickerWheelOuter">
          {DEGREE_MARKS.map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const lx = radius + 20 + labelRadius * Math.cos(rad);
            const ly = radius + 20 + labelRadius * Math.sin(rad);
            return (
              <span key={deg} className="classicyColorPickerWheelDegreeLabel"
                style={{ left: lx, top: ly }}>
                {deg}°
              </span>
            );
          })}
          <div className="classicyColorPickerWheelCanvasWrapper">
            <ClassicyColorWheel
              size={WHEEL_SIZE}
              hue={h} saturation={s} brightness={l}
              mode="hls"
              onChangeFunc={onWheelChange}
            />
          </div>
        </div>

        <div className="classicyColorPickerWheelFields">
          {([ ["Hue Angle", "h", h, "°"], ["Saturation", "s", s, "%"], ["Lightness", "l", l, "%"] ] as const).map(
            ([label, field, val, unit]) => (
              <div key={field} className="classicyColorPickerWheelField">
                <label htmlFor={`cp-hls-${field}`}>{label}:</label>
                <input
                  id={`cp-hls-${field}`}
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

      <div className="classicyColorPickerValueSlider" style={lightnessSliderStyle}>
        <ClassicySlider
          id="cp-hls-l-slider"
          labelTitle="Lightness:"
          labelPosition="left"
          value={l}
          min={0}
          max={100}
          valueLabel={`${l} %`}
          onChangeFunc={onSliderChange}
        />
      </div>
    </div>
  );
};
