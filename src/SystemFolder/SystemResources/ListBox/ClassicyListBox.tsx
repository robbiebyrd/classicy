import "./ClassicyListBox.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FocusEvent,
	type FC as FunctionalComponent,
	type KeyboardEvent as ReactKeyboardEvent,
	useMemo,
	useRef,
	useState,
} from "react";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { withClassicyAppearanceInput } from "@/Appearance/useClassicyAppearanceInput.internal";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { useListNavigation } from "@/SystemFolder/SystemResources/Keyboard/useListNavigation";

/** One row of a `ClassicyListBox`. */
export type ClassicyListBoxOption = {
	/** Stable value reported in selections; also the row's React key. */
	value: string;
	/** Row text; also what type-selection matches against. */
	label: string;
	/** Optional small icon (URL or data URI) drawn before the label. */
	icon?: string;
	/** Dimmed and unselectable; skipped by Shift-range selection. */
	disabled?: boolean;
};

/** `single` keeps at most one value selected; `multi` follows the Mac conventions. */
export type ClassicyListBoxSelectionMode = "single" | "multi";

type ClassicyListBoxProps = {
	/** Id of the `role="listbox"` element; links the label to it. */
	id: string;
	/** The rows, in display order. */
	options: ClassicyListBoxOption[];
	/** Single or multiple selection. Defaults to `"single"`. */
	selectionMode?: ClassicyListBoxSelectionMode;
	/** Controlled selection. Omit for uncontrolled use with `onChangeFunc`. */
	selected?: string[];
	/** Called with the full new selection (array of values) after every change. */
	onChangeFunc?: (values: string[]) => void;
	/** Double-click or Enter on an option — the "open it" gesture. */
	onActivateFunc?: (value: string) => void;
	/**
	 * Fixed row height × this = the box's max height (scrolls past it).
	 * Defaults to 8 rows.
	 */
	visibleRows?: number;
	/** Visible label text; also the list's accessible name. */
	label?: string;
	/** Where the label sits relative to the list. Defaults to `"above"`. */
	labelPosition?: ClassicyLabelPosition;
	/** Label text size. */
	labelSize?: ClassicyControlLabelSize;
	/** Dims the list and ignores clicks and keys. Defaults to `false`. */
	disabled?: boolean;
	/** Extra class names, merged onto the outermost element (the label wrapper when there is a label) after the component's own. */
	className?: string;
	/** Inline style, merged onto the outermost element (the label wrapper when there is a label) after the component's own. */
	style?: CSSProperties;
};

type SelectionModifiers = {
	shiftKey: boolean;
	metaKey: boolean;
	ctrlKey: boolean;
};

/**
 * The `<select multiple>` / `<select size>` equivalent: a Platinum List
 * Manager scrolling list (HIGOS8 Ch.2 "List Boxes and Frames", p.39 — 2 px
 * recessed frame, white fill, highlight selection). Single or multi
 * selection; multi follows the Mac conventions — plain click replaces,
 * ⌘/Ctrl-click toggles, Shift-click (or Shift-arrows) extends a range from
 * the last plain selection. Keyboard navigation is the shared
 * `useListNavigation` roving tabindex (arrows, Home/End, type-selection), and
 * selection follows the keyboard as Platinum lists do.
 *
 * Enter or a double-click calls `onActivateFunc` (Space selects). Pass
 * `selected` to control the selection, or leave it out and read changes from
 * `onChangeFunc`. For a single choice from a short list in a dialog row, a
 * `ClassicyPopUpMenu` is usually the better fit.
 */
export const ClassicyListBox: FunctionalComponent<ClassicyListBoxProps> = ({
	id,
	options,
	selectionMode = "single",
	selected,
	onChangeFunc,
	onActivateFunc,
	visibleRows,
	label,
	labelPosition = "above",
	labelSize,
	disabled = false,
	className,
	style,
}) => {
	const [internal, setInternal] = useState<string[]>([]);
	const effectiveSelected = selected ?? internal;

	// The range anchor for Shift selection: the index of the last plain
	// (non-Shift) selection gesture.
	const anchorIndex = useRef(-1);

	const navRows = useMemo(
		() => options.map((o) => ({ id: o.value, label: o.label })),
		[options],
	);
	const {
		activeId,
		setActiveId,
		tabStopId,
		registerRef,
		selectRow,
		handleNavKey,
	} = useListNavigation(navRows);

	const rootRef = useRef<HTMLDivElement>(null);
	const appearance = useClassicyAppearance("ListBox", { disabled }, rootRef);
	// Focus moving between rows stays inside the list: only focus entering
	// from, or leaving to, outside the list is a focus or blur of the list.
	const isInsideList = (target: EventTarget | null) =>
		target instanceof Node && !!rootRef.current?.contains(target);
	const handleFocus = (e: FocusEvent<HTMLDivElement>) => {
		if (!isInsideList(e.relatedTarget))
			appearance.emit("focus", withClassicyAppearanceInput());
	};
	const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
		if (!isInsideList(e.relatedTarget))
			appearance.emit("blur", withClassicyAppearanceInput());
	};

	const commit = (values: string[]) => {
		setInternal(values);
		onChangeFunc?.(values);
	};

	const applySelection = (index: number, mods: SelectionModifiers) => {
		const option = options[index];
		if (!option || option.disabled || disabled) return;
		// Click and keyboard both select through here; `selected` is false
		// only for a Ctrl/⌘-click that deselects in multi mode.
		const emitSelect = (selected: boolean) =>
			appearance.emit(
				"select",
				withClassicyAppearanceInput({ value: option.value, selected }),
			);
		if (selectionMode === "multi") {
			if (mods.shiftKey && anchorIndex.current >= 0) {
				const from = Math.min(anchorIndex.current, index);
				const to = Math.max(anchorIndex.current, index);
				commit(
					options
						.slice(from, to + 1)
						.filter((o) => !o.disabled)
						.map((o) => o.value),
				);
				emitSelect(true);
				return; // the anchor survives so the range can keep pivoting
			}
			if (mods.metaKey || mods.ctrlKey) {
				anchorIndex.current = index;
				const wasSelected = effectiveSelected.includes(option.value);
				commit(
					wasSelected
						? effectiveSelected.filter((v) => v !== option.value)
						: [...effectiveSelected, option.value],
				);
				emitSelect(!wasSelected);
				return;
			}
		}
		anchorIndex.current = index;
		commit([option.value]);
		emitSelect(true);
	};

	const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
		if (disabled) return;
		const navId = handleNavKey(e);
		if (navId !== null) {
			// Platinum lists move the selection with the keyboard; Shift-arrows
			// extend the range in multi mode.
			applySelection(
				options.findIndex((o) => o.value === navId),
				{
					shiftKey: e.shiftKey && selectionMode === "multi",
					metaKey: false,
					ctrlKey: false,
				},
			);
			return;
		}
		if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
			const index = options.findIndex((o) => o.value === activeId);
			if (index < 0) return;
			e.preventDefault();
			const option = options[index];
			if (e.key === "Enter" && onActivateFunc) {
				if (!option.disabled) onActivateFunc(option.value);
				return;
			}
			applySelection(index, e);
		}
	};

	const listbox = (
		<div
			{...appearance.attrs}
			ref={rootRef}
			id={id}
			role="listbox"
			aria-multiselectable={selectionMode === "multi" || undefined}
			aria-label={label}
			aria-disabled={disabled || undefined}
			className={classNames(
				"classicyListBox",
				appearance.className,
				label ? "" : className,
			)}
			style={{
				...(visibleRows
					? ({
							"--classicy-listbox-visible-rows": visibleRows,
						} as CSSProperties)
					: {}),
				...appearance.style,
				...(label ? {} : style),
			}}
			onKeyDown={handleKeyDown}
			onFocus={handleFocus}
			onBlur={handleBlur}
		>
			{options.map((o, index) => {
				const isSelected = effectiveSelected.includes(o.value);
				return (
					// biome-ignore lint/a11y/useKeyWithClickEvents: keyboard handling (arrows/Enter/Space) lives on the listbox container that owns this row
					<div
						key={o.value}
						role="option"
						aria-selected={isSelected}
						aria-disabled={o.disabled || undefined}
						tabIndex={tabStopId === o.value && !disabled ? 0 : -1}
						ref={(el) => registerRef(o.value, el)}
						className={classNames(
							"classicyListBoxOption",
							classicyStateClasses({
								selected: isSelected,
								disabled: o.disabled,
							}),
						)}
						onClick={(e) => {
							if (disabled || o.disabled) return;
							// Focus the row too (browsers do this natively for
							// tabindexed elements) so keyboard nav continues from it.
							selectRow(o.value);
							applySelection(index, e);
						}}
						onDoubleClick={() => {
							if (!disabled && !o.disabled) onActivateFunc?.(o.value);
						}}
						onFocus={() => setActiveId(o.value)}
					>
						{o.icon && (
							<img
								className="classicyListBoxOptionIcon"
								src={o.icon}
								alt=""
								aria-hidden={true}
							/>
						)}
						<span className="classicyListBoxOptionLabel">{o.label}</span>
					</div>
				);
			})}
		</div>
	);

	if (!label) return listbox;

	return (
		<div
			className={classNames(labelPositionClass(labelPosition), className)}
			style={style}
		>
			<ClassicyControlLabel
				label={label}
				labelFor={id}
				labelSize={labelSize}
				disabled={disabled}
			/>
			{listbox}
		</div>
	);
};
