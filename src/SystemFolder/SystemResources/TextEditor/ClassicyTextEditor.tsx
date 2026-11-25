import "./ClassicyTextEditor.scss";
import classNames from "classnames";
import {
	type ChangeEvent,
	type ChangeEventHandler,
	type CSSProperties,
	type FC as FunctionalComponent,
	type SyntheticEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyScrollArea } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollArea";

/**
 * Whether the browser grows a field with its text by itself (CSS
 * `field-sizing: content`: Chrome 123; not Firefox, Safari or Chrome 120-122,
 * inside the floor).
 */
const classicyFieldSizingSupported = (): boolean =>
	typeof CSS !== "undefined" &&
	typeof CSS.supports === "function" &&
	CSS.supports("field-sizing", "content");

export interface EditorProps {
	/** Id of the `<textarea>`; also links the label to it. */
	id?: string;
	/**
	 * Initial text. Equivalent to `prefillValue`, which wins when both are set.
	 * A later change to either prop replaces the current text.
	 */
	content?: string;
	/**
	 * Initial text (takes precedence over `content`). A later change replaces
	 * the current text, so text loaded asynchronously still appears.
	 */
	prefillValue?: string;
	/** Disables the field (and dims its label). Defaults to `false`. */
	disabled?: boolean;
	/** Dims the label independently of the field. Defaults to `disabled`. */
	labelDisabled?: boolean;
	/**
	 * Grow with the text (at least three control heights) instead of filling
	 * the parent's height: by CSS `field-sizing: content` where the browser
	 * has it, else by the editor, which sizes the field to its text. Defaults
	 * to `false`.
	 */
	autoHeight?: boolean;
	/**
	 * Draw the HIG 2px recessed edit-text frame. Off by default, for editors
	 * that fill a window. Defaults to `false`.
	 */
	border?: boolean;
	/**
	 * Keep both scroll bars drawn while the text fits, each in the `fits`
	 * state (no thumb), as a document window keeps its bars (System 7's
	 * SimpleText, HIG7 p.160). Pass the package's declaration,
	 * `useClassicyFitsScrollBars()`, for a document editor that fills its
	 * window. Defaults to `false`: a field (a form's, a HyperCard field) draws
	 * a bar only while its text overflows.
	 */
	fitsScrollBars?: boolean;
	/** Text size, relative to the theme UI font. Defaults to `"medium"`. */
	fontSize?: ClassicyControlLabelSize;
	/** Label text; no label is drawn when omitted. */
	labelTitle?: string;
	/** Label size. Defaults to `"medium"`. */
	labelSize?: ClassicyControlLabelSize;
	/** Where the label sits relative to the field. Defaults to `"above"`. */
	labelPosition?: ClassicyLabelPosition;
	/** Fired with the native change event on every edit. */
	onChangeFunc?: ChangeEventHandler<HTMLTextAreaElement>;
	/**
	 * Where the caret starts, as a character offset into the text, clamped to
	 * its length: a document window's view state put back
	 * (`useClassicyWindowViewState`, under a package's
	 * `layout.window.restoreViewState`). Read when the editor mounts, and
	 * set without focusing the field or scrolling it. None by default: the
	 * caret starts at the beginning, as a `<textarea>`'s does.
	 */
	initialCaret?: number;
	/**
	 * Called with the caret's offset (the selection's start) once it has
	 * stopped moving (no selection change for 200 ms), when it differs from
	 * the last offset reported (or `initialCaret`), and once more if the
	 * editor unmounts while a report is due.
	 */
	onCaretSettled?: (caret: number) => void;
	/**
	 * Where the text starts scrolled, `[scrollLeft, scrollTop]`
	 * (`ClassicyScrollArea`'s `initialScroll`, the `<textarea>` being the
	 * area's viewport). None by default.
	 */
	initialScroll?: [number, number];
	/**
	 * Called with the text's offsets once its scrolling ends
	 * (`ClassicyScrollArea`'s `onScrollSettled`).
	 */
	onScrollSettled?: (scroll: [number, number]) => void;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
}

/** How long the caret waits, unmoved, before it is reported (`onCaretSettled`). */
const CARET_SETTLE_MS = 200;

const fontSizeClass: Record<ClassicyControlLabelSize, string> = {
	small: "classicyTextEditorSizeSmall",
	medium: "classicyTextEditorSizeMedium",
	large: "classicyTextEditorSizeLarge",
};

/**
 * A multi-line plain-text edit field (HIGOS8 Ch.2 "Edit Text Fields", p.41) —
 * the Classicy replacement for a raw `<textarea>`, which it renders. It fills
 * its parent by default, which suits a full-window editor such as
 * SimpleText's; inside a form, turn on `border` (the HIG 2px recessed frame)
 * and usually `autoHeight`. A focused field shows an inset focus ring.
 *
 * The text is held internally, seeded from `prefillValue` (or `content`) and
 * reset whenever either prop changes; `onChangeFunc` reports each edit. For
 * Markdown or styled text use `ClassicyRichTextEditor`. A window whose only
 * content is a full-size editor should pass `scrollable={false}`, since the
 * textarea scrolls itself.
 *
 * ```tsx
 * <ClassicyTextEditor
 *     id="notes"
 *     labelTitle="Notes"
 *     border
 *     autoHeight
 *     onChangeFunc={(e) => setNotes(e.target.value)}
 * />
 * ```
 */
export const ClassicyTextEditor: FunctionalComponent<EditorProps> = ({
	id,
	content,
	prefillValue,
	disabled = false,
	labelDisabled,
	autoHeight = false,
	border = false,
	fitsScrollBars = false,
	fontSize = "medium",
	labelTitle,
	labelSize = "medium",
	labelPosition = "above",
	onChangeFunc,
	initialCaret,
	onCaretSettled,
	initialScroll,
	onScrollSettled,
	className,
	style,
}) => {
	// Controlled with internal state so the editor reflects later prefillValue/
	// content changes. A bare <textarea defaultValue> is uncontrolled and snapshots
	// its text once at mount, ignoring prop updates — which breaks any consumer that
	// fills the value asynchronously (e.g. text fetched after the editor renders).
	const [value, setValue] = useState(prefillValue ?? content ?? "");
	useEffect(() => {
		setValue(prefillValue ?? content ?? "");
	}, [prefillValue, content]);

	// `autoHeight` where the browser has no `field-sizing`: the field is
	// sized to its text here, as `field-sizing: content` sizes it (its
	// scroll height, read with the field 0 px tall), whenever the text
	// changes, the field's width changes (the text rewraps) or a font
	// loads. Removed again with `autoHeight`, so the stylesheet's height
	// comes back.
	const holderRef = useRef<HTMLDivElement>(null);
	// biome-ignore lint/correctness/useExhaustiveDependencies: value is the trigger (the field's text, read from the DOM)
	useLayoutEffect(() => {
		if (!autoHeight || classicyFieldSizingSupported()) return;
		const field = holderRef.current?.querySelector<HTMLTextAreaElement>(
			"textarea.classicyTextEditor",
		);
		if (!field) return;
		const sizeToText = () => {
			field.style.height = "0px";
			field.style.height = `${field.scrollHeight}px`;
		};
		sizeToText();
		let width = field.getBoundingClientRect().width;
		const resized =
			typeof ResizeObserver === "function"
				? new ResizeObserver(() => {
						const next = field.getBoundingClientRect().width;
						if (next === width) return;
						width = next;
						sizeToText();
					})
				: undefined;
		resized?.observe(field);
		const fonts = typeof document !== "undefined" ? document.fonts : undefined;
		fonts?.addEventListener?.("loadingdone", sizeToText);
		return () => {
			resized?.disconnect();
			fonts?.removeEventListener?.("loadingdone", sizeToText);
			field.style.removeProperty("height");
		};
	}, [autoHeight, value]);

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLTextAreaElement>) => {
			setValue(e.target.value);
			onChangeFunc?.(e);
		},
		[onChangeFunc],
	);

	// The caret put back (`initialCaret`), once, when the field mounts,
	// leaving the field's scroll where it was (the scroll area puts the
	// view state's own offsets back), and reported again once it settles.
	const initialCaretRef = useRef(initialCaret);
	const caretSettledRef = useRef<number>(0);
	const caretAtRef = useRef<number | null>(null);
	const caretTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const onCaretSettledRef = useRef(onCaretSettled);
	onCaretSettledRef.current = onCaretSettled;
	useLayoutEffect(() => {
		const field = holderRef.current?.querySelector<HTMLTextAreaElement>(
			"textarea.classicyTextEditor",
		);
		const caret = initialCaretRef.current;
		if (
			!field ||
			typeof caret !== "number" ||
			!Number.isFinite(caret) ||
			caret <= 0
		) {
			return;
		}
		const at = Math.min(Math.floor(caret), field.value.length);
		const { scrollLeft, scrollTop } = field;
		field.setSelectionRange(at, at);
		field.scrollLeft = scrollLeft;
		field.scrollTop = scrollTop;
		caretSettledRef.current = at;
	}, []);
	const settleCaret = useCallback(() => {
		caretTimerRef.current = null;
		const at = caretAtRef.current;
		if (at === null || at === caretSettledRef.current) return;
		caretSettledRef.current = at;
		onCaretSettledRef.current?.(at);
	}, []);
	const handleSelect = useCallback(
		(e: SyntheticEvent<HTMLTextAreaElement>) => {
			caretAtRef.current = e.currentTarget.selectionStart;
			if (!onCaretSettledRef.current) return;
			if (caretTimerRef.current !== null) clearTimeout(caretTimerRef.current);
			caretTimerRef.current = setTimeout(settleCaret, CARET_SETTLE_MS);
		},
		[settleCaret],
	);
	useEffect(
		() => () => {
			if (caretTimerRef.current === null) return;
			clearTimeout(caretTimerRef.current);
			settleCaret();
		},
		[settleCaret],
	);

	return (
		<div
			ref={holderRef}
			className={classNames(
				"classicyTextEditorHolder",
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
				/>
			)}
			{/* The text scrolls in the textarea itself, the viewport of a
			    ClassicyScrollArea that draws Classicy's own scroll bars. */}
			<ClassicyScrollArea
				className={classNames(
					"classicyTextEditorArea",
					autoHeight && "classicyTextEditorAreaAutoHeight",
					border && "classicyTextEditorBorder",
				)}
				vertical={fitsScrollBars ? "always" : "auto"}
				horizontal={fitsScrollBars ? "always" : "auto"}
				initialScroll={initialScroll}
				onScrollSettled={onScrollSettled}
				renderViewport={(viewport) => (
					<textarea
						ref={viewport.ref}
						onScroll={viewport.onScroll}
						onSelect={handleSelect}
						id={id}
						disabled={disabled}
						className={classNames(
							viewport.className,
							"classicyTextEditor",
							fontSizeClass[fontSize],
							autoHeight && "classicyTextEditorAutoHeight",
							border && "classicyTextEditorBevel",
						)}
						value={value}
						onChange={handleChange}
					/>
				)}
			/>
		</div>
	);
};
