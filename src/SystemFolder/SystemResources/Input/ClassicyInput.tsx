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
	type FocusEventHandler,
	type ForwardedRef,
	type FC as FunctionalComponent,
	forwardRef,
	type KeyboardEventHandler,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { withClassicyAppearanceInput } from "@/Appearance/useClassicyAppearanceInput.internal";
import { useClassicyMergedRef } from "@/Appearance/useClassicyMergedRef.internal";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

// The characters a password field draws in place of its text: Blink and
// WebKit draw a bullet (U+2022), Gecko a black circle (U+25CF).
const classicyPasswordMask = (el: HTMLInputElement) =>
	"MozAppearance" in el.style ? "\u25cf" : "\u2022";

/**
 * The width `text` takes in `el`'s font, as the field draws its first
 * characters: measured on a hidden probe in the field's own text style (a
 * password field's text masked as the browser masks it).
 */
const classicyInputTextWidth = (el: HTMLInputElement, text: string): number => {
	if (!text) return 0;
	const doc = el.ownerDocument;
	const view = doc.defaultView;
	if (!view || !doc.body) return 0;
	const cs = view.getComputedStyle(el);
	const probe = doc.createElement("span");
	const style = probe.style;
	for (const name of [
		"font-family",
		"font-size",
		"font-weight",
		"font-style",
		"font-stretch",
		"font-variant",
		"font-kerning",
		"font-feature-settings",
		"font-variation-settings",
		"letter-spacing",
		"word-spacing",
		"text-transform",
		"text-rendering",
	])
		style.setProperty(name, cs.getPropertyValue(name));
	style.position = "fixed";
	style.left = "0";
	style.top = "0";
	style.visibility = "hidden";
	style.pointerEvents = "none";
	style.whiteSpace = "pre";
	probe.textContent =
		el.type === "password"
			? classicyPasswordMask(el).repeat([...text].length)
			: text;
	doc.body.appendChild(probe);
	const width = probe.getBoundingClientRect().width;
	probe.remove();
	return width;
};

interface ClassicyInputProps {
	/** Id (and `name`) of the native `<input>`; also links the label to it. */
	id: string;
	/** Called on every keystroke with the native change event. */
	onChangeFunc?: ChangeEventHandler<HTMLInputElement>;
	/** Called when Enter is pressed in the field (no form submission needed). */
	onEnterFunc?: () => void;
	/** Called when the field takes focus, with the native focus event. */
	onFocusFunc?: FocusEventHandler<HTMLInputElement>;
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
	/**
	 * @deprecated Has no effect: Mac OS 8 text fields have no default state. Still adds the `classicyInputDefault` class
	 * for any host styling that targets it; removed in the next major version.
	 */
	isDefault?: boolean;
	/** Field fill color (any CSS color). Defaults to the theme's white. */
	backgroundColor?: string;
	/** Forwarded to the native `<input>`. */
	ref?: ForwardedRef<HTMLInputElement>;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
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
			onFocusFunc,
			className,
			style,
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

		// The root element for the appearance hook, merged with the forwarded
		// ref so callers keep receiving the <input>.
		const [inputRef, setInputRef] = useClassicyMergedRef<HTMLInputElement>(ref);
		// The field's one state class: `selected` while it has focus and a
		// selection that runs to its text's end (the whole text, or its tail).
		// TextEdit highlighted such a selection to the field's right edge,
		// from where it starts, which the field publishes as
		// `--classicy-input-selection-start` (px from its content box's left
		// edge, its own scrolling included) while the state is set.
		// `isDefault` keeps its deprecated modifier class below.
		const [selection, setSelection] = useState<{ start: number } | null>(null);
		const readSelectionRef = useRef<() => void>(() => {});
		// Read again on every event that can change the selection or the
		// focus: `select` (a script's `select()`, a drag), `selectionchange`
		// at the field and at its document (Chrome before 127 and Safari 16
		// fire it at the document only), the keys moving the caret, typing,
		// the field's own scrolling and focus itself. A pointer release is
		// read when it lands, on the click that follows it (the click is what
		// collapses a selection into a caret) and a frame later (a release no
		// click follows); a new value is read once it is committed.
		useEffect(() => {
			const el = inputRef.current;
			if (!el) return;
			const doc = el.ownerDocument;
			const view = doc.defaultView;
			let frame = 0;
			const read = () => {
				const start = el.selectionStart;
				const end = el.selectionEnd;
				const runsToEnd =
					doc.activeElement === el &&
					el.value.length > 0 &&
					start !== null &&
					end !== null &&
					start < end &&
					end === el.value.length;
				if (!runsToEnd) {
					setSelection((prev) => (prev === null ? prev : null));
					return;
				}
				const x = Math.round(
					classicyInputTextWidth(el, el.value.slice(0, start)) - el.scrollLeft,
				);
				setSelection((prev) => (prev?.start === x ? prev : { start: x }));
			};
			readSelectionRef.current = read;
			const readNextFrame = () => {
				if (!view) return;
				if (frame) view.cancelAnimationFrame(frame);
				frame = view.requestAnimationFrame(() => {
					frame = 0;
					read();
				});
			};
			const readOnRelease = () => {
				read();
				readNextFrame();
			};
			const events = [
				"select",
				"selectionchange",
				"keydown",
				"keyup",
				"click",
				"input",
				"scroll",
				"focus",
				"blur",
			];
			for (const type of events) el.addEventListener(type, read);
			el.addEventListener("mouseup", readOnRelease);
			doc.addEventListener("selectionchange", read);
			return () => {
				for (const type of events) el.removeEventListener(type, read);
				el.removeEventListener("mouseup", readOnRelease);
				doc.removeEventListener("selectionchange", read);
				if (frame) view?.cancelAnimationFrame(frame);
				readSelectionRef.current = () => {};
			};
		}, [inputRef]);
		// Setting the value moves the selection and fires nothing.
		useLayoutEffect(() => {
			void value;
			readSelectionRef.current();
		}, [value]);
		const appearance = useClassicyAppearance(
			"Input",
			{ selected: selection !== null },
			inputRef,
		);

		const handleOnChangeFunc: ChangeEventHandler<HTMLInputElement> = (e) => {
			setValue(e.target.value);
			appearance.emit("change", { value: e.target.value });
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
					className,
				)}
				style={style}
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
					{...appearance.attrs}
					id={id}
					tabIndex={0}
					onChange={handleOnChangeFunc}
					onKeyDown={handleOnKeyDown}
					onFocus={(e) => {
						appearance.emit("focus", withClassicyAppearanceInput());
						onFocusFunc?.(e);
					}}
					onBlur={() => appearance.emit("blur", withClassicyAppearanceInput())}
					name={id}
					type={type}
					ref={setInputRef}
					disabled={disabled}
					value={value}
					placeholder={placeholder}
					className={classNames(
						"classicyInput",
						appearance.className,
						isDefault ? "classicyInputDefault" : "",
					)}
					style={
						backgroundColor || appearance.style || selection
							? ({
									...(backgroundColor && {
										"--classicy-input-background": backgroundColor,
									}),
									...(selection && {
										"--classicy-input-selection-start": `${selection.start}px`,
									}),
									...appearance.style,
								} as CSSProperties)
							: undefined
					}
				></input>
			</div>
		);
	});
