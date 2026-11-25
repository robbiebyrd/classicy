import "./ClassicyListBox.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FocusEvent,
	type FC as FunctionalComponent,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";
import { withClassicyAppearanceInput } from "@/Appearance/useClassicyAppearanceInput.internal";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import {
	classicyListPageOf,
	classicyMovesCursorOnly,
	classicyPageKeysMove,
	classicyWindowsSelectionKeys,
	isClassicyAddModeKey,
	isClassicyListNavigationKey,
} from "@/SystemFolder/SystemResources/Keyboard/ClassicyListKeys.internal";
import { useListNavigation } from "@/SystemFolder/SystemResources/Keyboard/useListNavigation";
import { ClassicyScrollArea } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollArea";
import { useClassicyFitsBarPolicy } from "@/SystemFolder/SystemResources/ScrollArea/useClassicyFitsScrollBars";
import {
	classicyListDragSelection,
	classicyRangeSetTo,
	classicySameSelection,
	startClassicyListRangeDrag,
} from "@/SystemFolder/SystemResources/Utils/ClassicyListPressSelection.internal";
import {
	classicyDragSelectsRange,
	classicySelectsOnPress,
	classicyWindowsSelectionModifiers,
} from "@/SystemFolder/SystemResources/Utils/ClassicyMousePolicy";

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
	/**
	 * With `selectionMode="multi"`, a check box before each row (`<span
	 * data-classicy-part="list-check" aria-hidden>`, ahead of the icon; the
	 * row's `aria-selected` carries its state), making the list a multiple
	 * selection list box in the Windows Interface Guidelines' sense (Ch.7
	 * "Extended and Multiple Selection List Boxes", pp.122-123, Figure 7.15):
	 * a click, or Space on the keyboard row, toggles that row alone, with no
	 * modifier and no range; the arrow keys, Home, End and typing move the
	 * keyboard row without choosing, keeping navigation apart from the
	 * choices. The list carries `classicyListBoxCheckboxes`. The base sheet
	 * hides the part, so a package shows it (Windows 98 draws the flat check
	 * box, checked while the row is selected). Ignored with `"single"`.
	 * Defaults to `false`.
	 */
	checkboxes?: boolean;
	/** Controlled selection. Omit for uncontrolled use with `onChangeFunc`. */
	selected?: string[];
	/** Called with the full new selection (array of values) after every change. */
	onChangeFunc?: (values: string[]) => void;
	/** Double-click or Enter on an option — the "open it" gesture. */
	onActivateFunc?: (value: string) => void;
	/**
	 * A double-click's "open it" for the whole selection, under a package
	 * whose layout says `selection.modifiers: "windows"` (WIG App. A Tables
	 * A.2, pp.352-353, and A.3, p.356: a modified double-click adjusts the
	 * selection, then runs the default command on the set): called, in
	 * place of `onActivateFunc`, with the selected values in the list's
	 * order as the double-click's own clicks left them (not called when
	 * they left none). Absent, or under any other layout, a double-click
	 * calls `onActivateFunc` with its row. Enter still calls
	 * `onActivateFunc`.
	 */
	onActivateSelection?: (values: string[]) => void;
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
	/**
	 * A key in Windows' Add mode: Shift with it sets the anchor's range to
	 * the anchor's state, the other selections staying (WIG Ch.5 p.44).
	 */
	addMode?: boolean;
};

const NO_MODIFIERS: SelectionModifiers = {
	shiftKey: false,
	metaKey: false,
	ctrlKey: false,
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
 * `onChangeFunc`. `checkboxes` turns a multi list into a check list (a click
 * toggles, the keys move without choosing). Drawn in a window that is not
 * the active one, the root (a `ClassicyScrollArea`'s) carries `inactive`. For a single choice from a short list in a dialog row, a
 * `ClassicyPopUpMenu` is usually the better fit.
 *
 * Under the active package's layout (Windows 98 declares all three):
 * `selection.selectOn: "press"` selects a row at the button-1 press, an
 * unmodified press on a selected row of a multi list waiting for the click
 * to reset the selection to it; `selection.dragRange` then selects the rows
 * a press drags across (WIG Ch.5 "Selection with the Mouse", pp.37-38;
 * "Selection Adjustment", pp.38-39); `selection.modifiers: "windows"` makes
 * Control (or ⌘) with Shift set the anchor's range to the anchor's state,
 * keeping the rest of the selection, and hands a double-click's selection
 * to `onActivateSelection`. Button 2 never selects a row.
 * `selection.pageKeys: "move"` makes Page Up and Page Down select the last
 * or first row shown, or a page further (WIG Ch.5 Table 5.1, pp.35-36);
 * `selection.keyboard: "windows"` makes a multi list's Control (⌘, Option)
 * with a navigation key move the keyboard row alone, and Shift+F8 toggle
 * Add mode (`data-classicy-selection-mode="add"` on the root), where the
 * keys move the row alone and Space toggles it (pp.43-44).
 */
export const ClassicyListBox: FunctionalComponent<ClassicyListBoxProps> = ({
	id,
	options,
	selectionMode = "single",
	checkboxes = false,
	selected,
	onChangeFunc,
	onActivateFunc,
	onActivateSelection,
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
	// The selection as it last stood (a commit's, else the render's), for a
	// drag and a double-click that read it between renders.
	const selectionRef = useRef(effectiveSelected);
	selectionRef.current = effectiveSelected;
	// A multiple selection list with a check box per row: each row toggles on
	// its own, and the keyboard moves without choosing.
	const checkList = checkboxes && selectionMode === "multi";

	// The range anchor for Shift selection: the index of the last plain
	// (non-Shift) selection gesture.
	const anchorIndex = useRef(-1);

	const rootRef = useRef<HTMLDivElement>(null);
	// When button 1 selects, whether a drag selects across rows, Windows'
	// modified clicks, the page keys and Windows' selection keys: the active
	// package's layout.
	const layout = useClassicyAppearanceLayout();
	const selectsOnPress = classicySelectsOnPress(layout);
	const dragsRange = classicyDragSelectsRange(layout);
	const windowsModifiers = classicyWindowsSelectionModifiers(layout);
	const pageKeysMove = classicyPageKeysMove(layout);
	// Windows' selection keys apply to a multiple selection list; a check
	// list's keys already move without choosing.
	const windowsKeys =
		classicyWindowsSelectionKeys(layout) &&
		selectionMode === "multi" &&
		!checkList;
	// Windows' Add mode (Shift+F8; WIG Ch.5 "Disjoint Selection", p.44):
	// the navigation keys move the keyboard row alone and Space toggles it,
	// until Shift+F8 again. Only under `windowsKeys`; the ref is what a key
	// reads, the state what the root publishes.
	const [addModeOn, setAddModeOn] = useState(false);
	const addMode = windowsKeys && addModeOn;
	const addModeRef = useRef(addMode);
	addModeRef.current = addMode;

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
	} = useListNavigation(
		navRows,
		pageKeysMove
			? {
					pageRows: () =>
						classicyListPageOf(
							rootRef.current?.querySelector('[role="option"]'),
						)?.pageRows ?? 1,
				}
			: undefined,
	);

	const appearance = useClassicyAppearance("ListBox", { disabled }, rootRef);
	// The row a button-1 press last landed on under `selectOn: "press"`, and
	// whether it left the selection for the click to reset (a plain press
	// on a selected row of a multi list). The click ending it reads this.
	const pressRef = useRef<{ value: string; deferred: boolean } | null>(null);
	// Each row's value by its element, for the drag's hit test.
	const valueByRow = useRef(new WeakMap<Element, string>());
	// The drag across rows in progress, stopped if the list unmounts.
	const stopRangeDragRef = useRef<(() => void) | null>(null);
	useEffect(() => () => stopRangeDragRef.current?.(), []);
	// A package that keeps the bars in the fits state keeps the list's
	// vertical bar while its rows fit (System 7's Standard File list).
	const verticalPolicy = useClassicyFitsBarPolicy();
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
		selectionRef.current = values;
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
			// Windows' Control-Shift (`selection.modifiers` "windows"; WIG
			// Ch.5 "Selection Adjustment", p.39): the other selections stay,
			// and the anchor's range takes the anchor's state; the anchor
			// stays where it is.
			// Shift in Windows' Add mode does the same (p.44).
			if (
				!checkList &&
				mods.shiftKey &&
				((windowsModifiers && (mods.metaKey || mods.ctrlKey)) ||
					mods.addMode) &&
				anchorIndex.current >= 0
			) {
				const anchorValue = options[anchorIndex.current]?.value;
				const state =
					anchorValue !== undefined && effectiveSelected.includes(anchorValue);
				const from = Math.min(anchorIndex.current, index);
				const to = Math.max(anchorIndex.current, index);
				commit(
					classicyRangeSetTo(
						effectiveSelected,
						options
							.slice(from, to + 1)
							.filter((o) => !o.disabled)
							.map((o) => o.value),
						state,
					),
				);
				emitSelect(state);
				return;
			}
			if (!checkList && mods.shiftKey && anchorIndex.current >= 0) {
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
			if (checkList || mods.metaKey || mods.ctrlKey) {
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

	// A drag from a press across the rows (`selection.dragRange`): the row
	// under the pointer, the first or last shown outside the list, is the
	// range's other end, the modifiers held at the press governing until
	// the release (WIG Ch.5 "Selection Adjustment", p.39). `before` is the
	// selection the press found; the press has already selected.
	const startRangeDrag = (
		e: ReactMouseEvent,
		index: number,
		before: string[],
		deferred: boolean,
	) => {
		const root = rootRef.current;
		const pressed = options[index];
		if (!root || !pressed) return;
		stopRangeDragRef.current?.();
		const multi = selectionMode === "multi";
		const shift = multi && e.shiftKey;
		const toggle = multi && (e.metaKey || e.ctrlKey);
		// A Control (or ⌘) drag, and a Control-Shift one under Windows'
		// modifiers, keep the selection the press found and set the range
		// to the anchor's state; a plain or Shift drag selects the range.
		const keep = toggle && (!shift || windowsModifiers);
		const anchor = deferred
			? index
			: anchorIndex.current >= 0
				? anchorIndex.current
				: index;
		const anchorValue = options[anchor]?.value ?? pressed.value;
		const anchorState = selectionRef.current.includes(anchorValue);
		const order = options.filter((o) => !o.disabled).map((o) => o.value);
		stopRangeDragRef.current = startClassicyListRangeDrag({
			root,
			rowSelector: '[role="option"]',
			rowIdOf: (el) => valueByRow.current.get(el) ?? null,
			startId: pressed.value,
			onRow: (value) => {
				const next = multi
					? classicyListDragSelection({
							order,
							anchor: anchorValue,
							row: value,
							base: keep ? before : undefined,
							anchorState,
						})
					: order.includes(value)
						? [value]
						: null;
				if (!next) return;
				if (multi) anchorIndex.current = anchor;
				// The keyboard row follows the pointer, as user32's caret does.
				selectRow(value);
				if (classicySameSelection(next, selectionRef.current)) return;
				commit(next);
				appearance.emit(
					"select",
					withClassicyAppearanceInput({
						value,
						selected: next.includes(value),
					}),
				);
			},
		});
	};

	// A button-1 press on a row under `selection.selectOn: "press"` (WIG
	// Ch.5 "Selection with the Mouse", pp.37-38): it selects at once, sets
	// the anchor and, with `dragRange`, starts a drag across the rows. A
	// plain press on a row a multi list already holds leaves the selection
	// to the click, which resets it to that row; the second press of a
	// double-click changes nothing (Win32's WM_LBUTTONDBLCLK). Button 2
	// never selects, as user32's list box ignores it.
	const pressRow = (e: ReactMouseEvent<HTMLDivElement>, index: number) => {
		const option = options[index];
		if (!selectsOnPress || e.button !== 0 || disabled || !option) return;
		if (option.disabled) return;
		if (e.detail > 1) {
			pressRef.current = { value: option.value, deferred: false };
			return;
		}
		const before = selectionRef.current;
		const modified = e.shiftKey || e.metaKey || e.ctrlKey;
		const deferred =
			selectionMode === "multi" &&
			!checkList &&
			!modified &&
			before.includes(option.value);
		pressRef.current = { value: option.value, deferred };
		selectRow(option.value);
		if (!deferred) applySelection(index, e);
		if (dragsRange && !checkList) startRangeDrag(e, index, before, deferred);
	};

	const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
		if (disabled) return;
		// Windows' Add mode key (WIG Ch.5 "Disjoint Selection", p.44;
		// fn+Shift+F8 on a Mac laptop): in, and out keeping the selection.
		if (windowsKeys && isClassicyAddModeKey(e)) {
			e.preventDefault();
			setAddModeOn(!addModeRef.current);
			addModeRef.current = !addModeRef.current;
			return;
		}
		const navId = handleNavKey(e);
		if (navId !== null) {
			// A check list's keys move the keyboard row alone (Space toggles).
			if (checkList) return;
			// Under Windows' selection keys, Control (⌘, Option) with a
			// navigation key, and any navigation in Add mode, moves the
			// keyboard row alone (pp.43-44); Shift still extends.
			if (
				windowsKeys &&
				!e.shiftKey &&
				(addModeRef.current ||
					(isClassicyListNavigationKey(e.key) && classicyMovesCursorOnly(e)))
			) {
				return;
			}
			// Platinum lists move the selection with the keyboard; Shift-arrows
			// extend the range in multi mode.
			applySelection(
				options.findIndex((o) => o.value === navId),
				{
					shiftKey: e.shiftKey && selectionMode === "multi",
					metaKey: false,
					ctrlKey: false,
					addMode: addModeRef.current,
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
			// In Add mode Space toggles the row and makes it the anchor, as
			// Control+Space does (p.44); Shift+Space sets the anchor's range
			// to its state, keeping the rest.
			applySelection(
				index,
				addModeRef.current
					? {
							shiftKey: e.shiftKey && anchorIndex.current >= 0,
							metaKey: false,
							ctrlKey: true,
							addMode: true,
						}
					: e,
			);
		}
	};

	// The list scrolls in a ClassicyScrollArea (Classicy's own scroll bars);
	// the root keeps the listbox role and the keyboard, the rows scroll in
	// its viewport.
	const listbox = (
		<ClassicyScrollArea
			{...appearance.attrs}
			ref={rootRef}
			vertical={verticalPolicy}
			viewportClassName="classicyListBoxViewport"
			id={id}
			role="listbox"
			aria-multiselectable={selectionMode === "multi" || undefined}
			aria-label={label}
			aria-disabled={disabled || undefined}
			data-classicy-selection-mode={addMode ? "add" : undefined}
			className={classNames(
				"classicyListBox",
				checkList ? "classicyListBoxCheckboxes" : "",
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
						ref={(el) => {
							registerRef(o.value, el);
							if (el) valueByRow.current.set(el, o.value);
						}}
						className={classNames(
							"classicyListBoxOption",
							classicyStateClasses({
								selected: isSelected,
								disabled: o.disabled,
							}),
						)}
						onMouseDown={(e) => pressRow(e, index)}
						onClick={(e) => {
							if (disabled || o.disabled) return;
							// The click ending a press that selected (`selectOn`
							// "press") adds nothing, unless the press left it to
							// reset the selection to this row.
							const press = pressRef.current;
							pressRef.current = null;
							if (press?.value === o.value) {
								if (press.deferred) applySelection(index, NO_MODIFIERS);
								return;
							}
							// Windows' second click of a double-click adjusts
							// nothing (the double-click acts on the set).
							if (windowsModifiers && e.detail > 1) return;
							// Focus the row too (browsers do this natively for
							// tabindexed elements) so keyboard nav continues from it.
							selectRow(o.value);
							applySelection(index, e);
						}}
						onDoubleClick={() => {
							if (disabled || o.disabled) return;
							if (windowsModifiers && onActivateSelection) {
								const values = options
									.filter((v) => selectionRef.current.includes(v.value))
									.map((v) => v.value);
								if (values.length > 0) onActivateSelection(values);
								return;
							}
							onActivateFunc?.(o.value);
						}}
						onFocus={() => setActiveId(o.value)}
					>
						{checkList && (
							<span data-classicy-part="list-check" aria-hidden="true" />
						)}
						{o.icon && (
							<ClassicyIconImage
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
		</ClassicyScrollArea>
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
