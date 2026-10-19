import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import "./ClassicyInput.scss";
import classNames from "classnames";
import {
	type ChangeEventHandler,
	type CSSProperties,
	type ForwardedRef,
	type FC as FunctionalComponent,
	forwardRef,
	type KeyboardEventHandler,
	useEffect,
	useState,
} from "react";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

interface ClassicyInputProps {
	/** Id (and `name`) of the native `<input>`; also links the label to it. */
	id: string;
	/** Called on every keystroke with the native change event. */
	onChangeFunc?: ChangeEventHandler<HTMLInputElement>;
	/** Called when Enter is pressed in the field (no form submission needed). */
	onEnterFunc?: () => void;
	/** Visible label text. Omit for no label. */
	labelTitle?: string;
	/** Label text size. Defaults to `"medium"`. */
	labelSize?: ClassicyControlLabelSize;
	/** Where the label sits relative to the field. Defaults to `"above"`. */
	labelPosition?: ClassicyLabelPosition;
	/** Native placeholder text shown while the field is empty. */
	placeholder?: string;
	/**
	 * Initial text. The field keeps its own text while the user types, and is
	 * reset to this value whenever it changes.
	 */
	prefillValue?: string;
	/** Native input type (e.g. "password", "email"). Defaults to `"text"`. */
	type?: string;
	/** Disables the field (and dims its label). Defaults to `false`. */
	disabled?: boolean;
	/** Dims the label independently of the field. Defaults to `disabled`. */
	labelDisabled?: boolean;
	/** Adds the `classicyInputDefault` class (no built-in styling). */
	isDefault?: boolean;
	/** Field fill colour (any CSS colour). Defaults to the theme's white. */
	backgroundColor?: string;
	/** Forwarded to the native `<input>`. */
	ref?: ForwardedRef<HTMLInputElement>;
}

/**
 * The Platinum edit text field (HIGOS8 Ch.2 "Edit Text Fields", p.41): a
 * single-line `<input>` in the 2 px recessed frame, with an optional
 * `ClassicyControlLabel`. Use it wherever you would reach for a raw text,
 * password, email or URL `<input>` — `type` passes straight through.
 *
 * The field owns its text while the user types (so it never freezes waiting
 * for the consumer to echo the value back) and resets to `prefillValue`
 * whenever that prop changes. `onEnterFunc` fires on Enter, and every change
 * is reported to analytics as a `selected` event. The ref is forwarded to the
 * native `<input>`.
 *
 * ```tsx
 * <ClassicyInput id="name" labelTitle="Name:" labelPosition="left"
 *     prefillValue="Macintosh HD" onEnterFunc={rename} />
 * ```
 */
export const ClassicyInput: FunctionalComponent<ClassicyInputProps> =
	forwardRef<HTMLInputElement, ClassicyInputProps>(function ClassicyInput(
		{
			id,
			labelTitle,
			labelSize = "medium",
			labelPosition = "above",
			placeholder,
			prefillValue,
			type = "text",
			disabled = false,
			labelDisabled,
			isDefault,
			backgroundColor,
			onChangeFunc,
			onEnterFunc,
		},
		ref,
	) {
		const { track } = useClassicyAnalytics();
		const analyticsArgs = {
			id,
			labelTitle,
			placeholder,
			prefillValue,
			disabled,
			isDefault,
		};

		// Controlled with internal state so the input owns its text while typing
		// but still reflects later prefillValue changes (matching ClassicyTextEditor).
		// Binding the DOM value directly to prefillValue would freeze the field after
		// one keystroke unless the consumer echoes every change back into the prop.
		const [value, setValue] = useState(prefillValue ?? "");
		useEffect(() => {
			setValue(prefillValue ?? "");
		}, [prefillValue]);

		const handleOnChangeFunc: ChangeEventHandler<HTMLInputElement> = (e) => {
			setValue(e.target.value);
			track("selected", { ...analyticsArgs, selected: e.target.value });
			if (onChangeFunc) onChangeFunc(e);
		};

		const handleOnKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
			if (e.key === "Enter" && onEnterFunc) {
				onEnterFunc();
			}
		};

		return (
			<div
				className={classNames(
					"classicyInputHolder",
					labelPositionClass(labelPosition),
				)}
			>
				{labelTitle && (
					<ClassicyControlLabel
						label={labelTitle}
						labelFor={id}
						labelSize={labelSize}
						disabled={labelDisabled ?? disabled}
					></ClassicyControlLabel>
				)}
				<input
					id={id}
					tabIndex={0}
					onChange={handleOnChangeFunc}
					onKeyDown={handleOnKeyDown}
					name={id}
					type={type}
					ref={ref}
					disabled={disabled}
					value={value}
					placeholder={placeholder}
					className={classNames(
						"classicyInput",
						isDefault ? "classicyInputDefault" : "",
					)}
					style={
						backgroundColor
							? ({
									"--classicy-input-background": backgroundColor,
								} as CSSProperties)
							: undefined
					}
				></input>
			</div>
		);
	});
