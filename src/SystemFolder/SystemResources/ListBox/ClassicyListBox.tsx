import "./ClassicyListBox.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent as ReactKeyboardEvent,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { useListNavigation } from "@/SystemFolder/SystemResources/Keyboard/useListNavigation";

export type ClassicyListBoxOption = {
	value: string;
	label: string;
	icon?: string;
	disabled?: boolean;
};

export type ClassicyListBoxSelectionMode = "single" | "multi";

type ClassicyListBoxProps = {
	id: string;
	options: ClassicyListBoxOption[];
	selectionMode?: ClassicyListBoxSelectionMode;
	/** Controlled selection. Omit for uncontrolled use with `onChangeFunc`. */
	selected?: string[];
	onChangeFunc?: (values: string[]) => void;
	/** Double-click or Enter on an option — the "open it" gesture. */
	onActivateFunc?: (value: string) => void;
	/** Fixed row height × this = the box's max height (scrolls past it). */
	visibleRows?: number;
	label?: string;
	labelPosition?: ClassicyLabelPosition;
	labelSize?: ClassicyControlLabelSize;
	disabled?: boolean;
};

type SelectionModifiers = {
	shiftKey: boolean;
	metaKey: boolean;
	ctrlKey: boolean;
};

/**
 * The `<select multiple>` equivalent: a Platinum List Manager scrolling list
 * (inset white box, highlight selection). Single or multi selection; multi
 * follows the Mac conventions — plain click replaces, ⌘/Ctrl-click toggles,
 * Shift-click (or Shift-arrows) extends a range from the last plain
 * selection. Keyboard navigation is the shared `useListNavigation` roving
 * tabindex, and selection follows the keyboard as Platinum lists do.
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

	const commit = (values: string[]) => {
		setInternal(values);
		onChangeFunc?.(values);
	};

	const applySelection = (index: number, mods: SelectionModifiers) => {
		const option = options[index];
		if (!option || option.disabled || disabled) return;
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
				return; // the anchor survives so the range can keep pivoting
			}
			if (mods.metaKey || mods.ctrlKey) {
				anchorIndex.current = index;
				commit(
					effectiveSelected.includes(option.value)
						? effectiveSelected.filter((v) => v !== option.value)
						: [...effectiveSelected, option.value],
				);
				return;
			}
		}
		anchorIndex.current = index;
		commit([option.value]);
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
			id={id}
			role="listbox"
			aria-multiselectable={selectionMode === "multi" || undefined}
			aria-label={label}
			aria-disabled={disabled || undefined}
			className={classNames(
				"classicyListBox",
				disabled && "classicyListBoxDisabled",
			)}
			style={
				visibleRows
					? ({
							"--classicy-listbox-visible-rows": visibleRows,
						} as CSSProperties)
					: undefined
			}
			onKeyDown={handleKeyDown}
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
						className={classNames("classicyListBoxOption", {
							classicyListBoxOptionSelected: isSelected,
							classicyListBoxOptionDisabled: o.disabled,
						})}
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
		<div className={classNames(labelPositionClass(labelPosition))}>
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
