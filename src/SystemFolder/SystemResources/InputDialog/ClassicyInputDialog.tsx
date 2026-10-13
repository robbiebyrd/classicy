import "./ClassicyInputDialog.scss";
import {
	type FC as FunctionalComponent,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import {
	useFocusTrap,
	useKeyboardEquivalents,
} from "@/SystemFolder/SystemResources/Keyboard/useKeyboardEquivalents";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

/**
 * Mac OS 8 HIG movable-modal **input dialog** (Human Interface Guidelines,
 * Ch. 3 §"Dialog Boxes"). Unlike an alert — which may contain only an icon,
 * text, and buttons — a dialog may host editable controls. This one presents a
 * single text field with a prompt and a default/cancel button pair, the shape
 * of the classic "New Folder", "Rename", and "Save As…" name prompts.
 *
 * Behaviour (HIG Ch. 3 "Keyboard Navigation and Focus"):
 *   - the text field is focused and its contents selected on open, so the user
 *     can type a replacement immediately;
 *   - Return / Enter triggers the default button (single-line field, so Return
 *     is free to mean "confirm");
 *   - Escape / Command-period triggers Cancel;
 *   - the default button is disabled while the value fails `validate`.
 *
 * The dialog owns the field's text; callers receive the final value through
 * `onConfirm` and do not need to track keystrokes themselves.
 */
export type ClassicyInputDialogProps = {
	/** Window id (unique per open dialog). */
	id?: string;
	/** Owning app id. */
	appId?: string;
	/** Title-bar text. */
	title?: string;
	/** Prompt shown above the field (e.g. "Name of new folder:"). */
	prompt?: ReactNode;
	/** Initial field value; its text is selected on open. */
	initialValue?: string;
	/** Placeholder shown when the field is empty. */
	placeholder?: string;
	/** Native input type (e.g. "text", "password"). Defaults to "text". */
	inputType?: string;
	/** Default-button label. Defaults to "OK". */
	confirmLabel?: string;
	/** Cancel-button label. Defaults to "Cancel". */
	cancelLabel?: string;
	/**
	 * Returns true when the current value may be confirmed. Defaults to
	 * "non-empty after trimming". Drives the default button's disabled state and
	 * blocks Return.
	 */
	validate?: (value: string) => boolean;
	/** Optional leading icon (dialogs may include one; omit for a plain prompt). */
	icon?: string;
	/** Called with the field value when the default button fires. */
	onConfirm: (value: string) => void;
	/** Called when Cancel / Escape fires. */
	onCancel?: () => void;
};

const defaultValidate = (value: string): boolean => value.trim().length > 0;

export const ClassicyInputDialog: FunctionalComponent<
	ClassicyInputDialogProps
> = ({
	id = "inputDialog",
	appId = "ClassicyInputDialog",
	title = "",
	prompt,
	initialValue = "",
	placeholder,
	inputType = "text",
	confirmLabel = "OK",
	cancelLabel = "Cancel",
	validate = defaultValidate,
	icon,
	onConfirm,
	onCancel,
}) => {
	const contentRef = useRef<HTMLDivElement | null>(null);
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [value, setValue] = useState(initialValue);

	const isValid = validate(value);

	const confirm = useCallback(() => {
		if (!validate(value)) return;
		onConfirm(value);
	}, [validate, value, onConfirm]);

	const cancel = useCallback(() => {
		onCancel?.();
	}, [onCancel]);

	// Return → confirm, Escape / Command-period → Cancel. A single-line <input>
	// is not treated as "text entry" by the engine, so Return reaches the default
	// action instead of being swallowed by the field.
	useKeyboardEquivalents({
		onDefault: confirm,
		onCancel: cancel,
		targetRef: contentRef,
	});

	// Focus the field and select its contents on open, so the prefilled name is
	// ready to be typed over (HIG Ch. 3 "Keyboard Navigation and Focus").
	useFocusTrap({
		ref: contentRef,
		autoFocus: true,
		initialFocusRef: inputRef,
	});
	useEffect(() => {
		inputRef.current?.select();
	}, []);

	return (
		<ClassicyWindow
			id={id}
			appId={appId}
			title={title}
			hideIcon={true}
			closable={false}
			resizable={false}
			zoomable={false}
			collapsable={false}
			scrollable={false}
			modal={true}
			initialSize={[0, 0]}
			initialPosition={["center", "center"]}
			analyticsExclude
		>
			<div
				ref={contentRef}
				className="classicyInputDialog"
				role="dialog"
				aria-modal="true"
				aria-label={title || undefined}
			>
				<div className="classicyInputDialogTop">
					{icon && (
						<div className="classicyInputDialogIcon">
							<img src={icon} alt="" />
						</div>
					)}
					<div className="classicyInputDialogBody">
						{prompt != null && prompt !== "" && (
							<label
								className="classicyInputDialogPrompt"
								htmlFor={`${id}-field`}
							>
								{prompt}
							</label>
						)}
						<ClassicyInput
							id={`${id}-field`}
							ref={inputRef}
							type={inputType}
							placeholder={placeholder}
							prefillValue={initialValue}
							onChangeFunc={(e) => setValue(e.target.value)}
						/>
					</div>
				</div>
				<div className="classicyInputDialogButtons">
					<ClassicyButton onClickFunc={cancel}>{cancelLabel}</ClassicyButton>
					<ClassicyButton
						isDefault={true}
						disabled={!isValid}
						onClickFunc={confirm}
					>
						{confirmLabel}
					</ClassicyButton>
				</div>
			</div>
		</ClassicyWindow>
	);
};
