import "./ClassicyInputDialog.scss";
import {
	type CSSProperties,
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

/** Props for `ClassicyInputDialog`. */
export type ClassicyInputDialogProps = {
	/**
	 * Window id; must be unique per open dialog. The text field's id is
	 * `${id}-field`. Defaults to `"inputDialog"`.
	 */
	id?: string;
	/**
	 * Id of the owning app (the enclosing `ClassicyApp`). Defaults to
	 * `"ClassicyInputDialog"`.
	 */
	appId?: string;
	/** Title-bar text; also the dialog's accessible name. Defaults to `""`. */
	title?: string;
	/** Prompt shown above the field as its `<label>` (e.g. "Name of new folder:"). */
	prompt?: ReactNode;
	/** Initial field value; its text is selected on open. Defaults to `""`. */
	initialValue?: string;
	/** Placeholder shown when the field is empty. */
	placeholder?: string;
	/** Native input type (e.g. `"text"`, `"password"`). Defaults to `"text"`. */
	inputType?: string;
	/** Default-button label. Defaults to `"OK"`. */
	confirmLabel?: string;
	/** Cancel-button label. Defaults to `"Cancel"`. */
	cancelLabel?: string;
	/**
	 * Returns true when the current value may be confirmed. Defaults to
	 * "non-empty after trimming". Drives the default button's disabled state and
	 * blocks Return. Runs on every render, so keep it cheap and pure.
	 */
	validate?: (value: string) => boolean;
	/** Optional leading icon URL (dialogs may have one; omit for a plain prompt). */
	icon?: string;
	/**
	 * Called with the (untrimmed) field value when the default button or Return
	 * fires on a valid value. The dialog does not unmount itself.
	 */
	onConfirm: (value: string) => void;
	/**
	 * Called when Cancel, Escape or Command-period fires. The dialog does not
	 * unmount itself.
	 */
	onCancel?: () => void;
	/** Extra class names, merged onto the dialog window after the component's own. */
	className?: string;
	/** Inline style, merged onto the dialog window after the component's own. */
	style?: CSSProperties;
};

const defaultValidate = (value: string): boolean => value.trim().length > 0;

/**
 * Mac OS 8 movable-modal **input dialog** (HIGOS8 Ch.3 "Movable Modal Dialog
 * Boxes", p.59): a title bar with no close box, an optional icon, a prompt,
 * one text field and a Cancel / default-button pair — the shape of the classic
 * "New Folder" and "Rename" prompts. Unlike `ClassicyAlert`, which may hold
 * only an icon, text and buttons (p.60), a dialog may host editable controls;
 * use this instead of `window.prompt()`.
 *
 * Behaviour (HIGOS8 Ch.3 "Keyboard Navigation and Focus", p.66):
 *   - the field is focused with its contents selected on open, so the user
 *     can type a replacement immediately, and Tab is trapped in the dialog;
 *   - Return / Enter triggers the default button (single-line field, so Return
 *     is free to mean "confirm");
 *   - Escape / Command-period triggers Cancel;
 *   - the default button is dimmed, and Return ignored, while the value fails
 *     `validate`.
 *
 * The dialog owns the field's text; callers receive the final value through
 * `onConfirm` and need not track keystrokes. It renders a `ClassicyWindow`, so
 * it must sit inside a `ClassicyApp`; show it by mounting it and dismiss it by
 * unmounting it from `onConfirm` / `onCancel`.
 *
 * ```tsx
 * {naming && (
 *   <ClassicyInputDialog
 *     id="new-folder" appId={appId} title="New Folder"
 *     prompt="Name of new folder:" initialValue="untitled folder"
 *     confirmLabel="Create"
 *     onConfirm={(name) => { createFolder(name); setNaming(false); }}
 *     onCancel={() => setNaming(false)}
 *   />
 * )}
 * ```
 */

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
	className,
	style,
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
			className={className}
			style={style}
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
