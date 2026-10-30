import "./ClassicyColorPicker.scss";
import classNames from "classnames";
import { type CSSProperties, type FC, useState } from "react";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import type { ClassicyCrayon } from "./ClassicyColorPickerCrayons";
import { ClassicyColorPickerDialog } from "./ClassicyColorPickerDialog";

interface ClassicyColorPickerProps {
	/** Id of the swatch button; the dialog's window id is `${id}-dialog`. */
	id: string;
	/**
	 * App the dialog's window registers under. Defaults to the enclosing
	 * `ClassicyApp` (via `ClassicyAppIdContext`).
	 */
	appId?: string;
	/** Controlled colour as a 24-bit `0xRRGGBB` integer. Omit for uncontrolled use. */
	value?: number;
	/** Initial colour when uncontrolled, as `0xRRGGBB`. Defaults to `0x000000` (black). */
	defaultValue?: number;
	/** Palette for the dialog's Crayons panel. Defaults to the Mac OS 8 crayon box. */
	crayons?: ClassicyCrayon[];
	/** Visible label text. Omit for no label. */
	labelTitle?: string;
	/** Where the label sits relative to the swatch. Defaults to `"left"`. */
	labelPosition?: ClassicyLabelPosition;
	/** Label text size. Defaults to `"medium"`. */
	labelSize?: ClassicyControlLabelSize;
	/** Disables the swatch (and dims the label). Defaults to `false`. */
	disabled?: boolean;
	/** Called with the chosen colour (`0xRRGGBB`) when the dialog's OK is clicked. */
	onChangeFunc?: (color: number) => void;
	/** Extra class names, merged onto the swatch wrapper (the dialog is a separate window) after the component's own. */
	className?: string;
	/** Inline style, merged onto the swatch wrapper (the dialog is a separate window) after the component's own. */
	style?: CSSProperties;
}

/**
 * The `<input type="color">` equivalent: a swatch button showing the current
 * colour that opens `ClassicyColorPickerDialog`, the Mac OS 8 Color Picker
 * (Crayons, RGB, HSV, HLS and CMYK panels). The colour only changes when the
 * user clicks OK; Cancel or the close box leaves it as it was.
 *
 * Colours are 24-bit integers (`0xRRGGBB`). Pass `value` + `onChangeFunc` to
 * control it, or `defaultValue` alone to let the swatch keep its own. The
 * dialog is a modal `ClassicyWindow`, so render the picker inside a
 * `ClassicyApp` (or pass `appId`).
 *
 * ```tsx
 * <ClassicyColorPicker id="hilite" labelTitle="Highlight color:"
 *     value={color} onChangeFunc={setColor} />
 * ```
 */
export const ClassicyColorPicker: FC<ClassicyColorPickerProps> = ({
	id,
	appId,
	value: controlledValue,
	defaultValue = 0x000000,
	crayons,
	labelTitle,
	labelPosition = "left",
	labelSize = "medium",
	disabled = false,
	onChangeFunc,
	className,
	style,
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
					className,
				)}
				style={style}
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
						classicyStateClasses({ disabled }),
					)}
					style={
						{ "--classicy-preview-color": intToHex(value) } as CSSProperties
					}
					onClick={() => setOpen(true)}
					disabled={disabled}
					aria-label={`Color: ${intToHex(value)}. Click to open color picker.`}
				/>
			</div>
			<ClassicyColorPickerDialog
				id={`${id}-dialog`}
				appId={appId}
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
