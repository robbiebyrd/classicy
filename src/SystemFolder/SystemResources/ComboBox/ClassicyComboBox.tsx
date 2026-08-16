import "@/SystemFolder/SystemResources/Input/ClassicyInput.scss";
import "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.scss";
import "./ClassicyComboBox.scss";
import classNames from "classnames";
import {
	type ChangeEvent,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import type { ClassicyPopUpMenuOption } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import {
	type ClassicyPopUpMenuPlacementResult,
	classicyPopUpMenuPlacement,
} from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenuPlacement";

const CHECKMARK = "✓";

export type ClassicyComboBoxFilter = "startsWith" | "contains" | false;

type ClassicyComboBoxProps = {
	id: string;
	options: ClassicyPopUpMenuOption[];
	prefillValue?: string;
	placeholder?: string;
	label?: string;
	labelPosition?: ClassicyLabelPosition;
	labelSize?: ClassicyControlLabelSize;
	/** How typing narrows the suggestions. `false` never filters. */
	filter?: ClassicyComboBoxFilter;
	/**
	 * When false, dismissing the combo with text that matches no option
	 * reverts to the last committed selection — the field can only ever hold
	 * an option label.
	 */
	freeText?: boolean;
	disabled?: boolean;
	/** Fired for every text change (typing or committing a suggestion). */
	onChangeFunc?: (text: string) => void;
	/** Fired when a suggestion is committed (click or Enter). */
	onSelectFunc?: (value: string, option: ClassicyPopUpMenuOption) => void;
};

/**
 * The `<datalist>`/combobox equivalent: the Platinum "combination box" — an
 * editable field with a pop-up arrow whose suggestion menu filters as you
 * type. Focus stays in the input (ARIA combobox pattern with
 * `aria-activedescendant`); the suggestion list reuses the PopUpMenu's menu
 * styling and placement so both drop-downs look and flip identically.
 */
export const ClassicyComboBox: FunctionalComponent<ClassicyComboBoxProps> = ({
	id,
	options,
	prefillValue,
	placeholder,
	label,
	labelPosition = "above",
	labelSize,
	filter = "startsWith",
	freeText = true,
	disabled = false,
	onChangeFunc,
	onSelectFunc,
}) => {
	const [text, setText] = useState(prefillValue ?? "");
	useEffect(() => {
		setText(prefillValue ?? "");
	}, [prefillValue]);

	const [open, setOpen] = useState(false);
	const [highlight, setHighlight] = useState(-1);
	// The arrow button surfaces the FULL list regardless of the current text;
	// the first keystroke afterwards switches back to filtering.
	const [bypassFilter, setBypassFilter] = useState(false);
	const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
	const [placement, setPlacement] =
		useState<ClassicyPopUpMenuPlacementResult | null>(null);

	const anchorRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	// The last committed suggestion — what a freeText=false combo reverts to.
	const committedLabel = useRef<string | undefined>(prefillValue);
	const committedValue = useRef<string | undefined>(undefined);
	const reactId = useId();
	const listId = `${reactId}-list`;
	const optionId = (index: number) => `${reactId}-opt-${index}`;

	const { track } = useClassicyAnalytics();

	const filtered = useMemo(() => {
		if (bypassFilter || filter === false || text === "") return options;
		const t = text.toLowerCase();
		return options.filter((o) =>
			filter === "contains"
				? o.label.toLowerCase().includes(t)
				: o.label.toLowerCase().startsWith(t),
		);
	}, [options, text, filter, bypassFilter]);

	// The stored highlight can outlive a shrinking filter result; clamp at
	// render time so it always points at a real suggestion.
	const effectiveHighlight = Math.min(highlight, filtered.length - 1);

	const closeList = useCallback(() => {
		setOpen(false);
		setHighlight(-1);
		setBypassFilter(false);
		setMenuRect(null);
		setPlacement(null);
	}, []);

	const openList = useCallback(
		(bypass: boolean) => {
			if (disabled) return;
			setBypassFilter(bypass);
			if (anchorRef.current) {
				setMenuRect(anchorRef.current.getBoundingClientRect());
			}
			setOpen(true);
			inputRef.current?.focus();
		},
		[disabled],
	);

	const commitOption = useCallback(
		(option: ClassicyPopUpMenuOption) => {
			setText(option.label);
			committedLabel.current = option.label;
			committedValue.current = option.value;
			closeList();
			inputRef.current?.focus();
			track("selected", {
				type: "ClassicyComboBox",
				itemId: option.value,
				id,
				label,
			});
			onChangeFunc?.(option.label);
			onSelectFunc?.(option.value, option);
		},
		[closeList, track, id, label, onChangeFunc, onSelectFunc],
	);

	// freeText=false: a dismissed combo may only hold an option label.
	const settleText = useCallback(() => {
		if (freeText) return;
		const match = options.find(
			(o) => o.label.toLowerCase() === text.toLowerCase(),
		);
		if (match) {
			setText(match.label);
			committedLabel.current = match.label;
			committedValue.current = match.value;
		} else {
			setText(committedLabel.current ?? "");
		}
	}, [freeText, options, text]);

	const dismiss = useCallback(() => {
		closeList();
		settleText();
	}, [closeList, settleText]);

	// Close on outside pointer-down (same behavior as ClassicyPopUpMenu).
	useEffect(() => {
		if (!open) return;
		const onPointerDown = (e: globalThis.MouseEvent) => {
			const target = e.target as Node;
			if (
				!anchorRef.current?.contains(target) &&
				!listRef.current?.contains(target)
			) {
				dismiss();
			}
		};
		document.addEventListener("mousedown", onPointerDown);
		return () => document.removeEventListener("mousedown", onPointerDown);
	}, [open, dismiss]);

	// A fixed-position portal can't follow its anchor; dismiss on ancestor
	// scroll or resize, but not when the list scrolls its own overflow.
	useEffect(() => {
		if (!open) return;
		const onScroll = (e: Event) => {
			const target = e.target;
			if (target instanceof Node && listRef.current?.contains(target)) return;
			dismiss();
		};
		const onResize = () => dismiss();
		window.addEventListener("scroll", onScroll, true);
		window.addEventListener("resize", onResize);
		return () => {
			window.removeEventListener("scroll", onScroll, true);
			window.removeEventListener("resize", onResize);
		};
	}, [open, dismiss]);

	// Measure and pick the growth direction — same pass as ClassicyPopUpMenu.
	useLayoutEffect(() => {
		if (!open || !menuRect) return;
		const el = listRef.current;
		if (!el) return;
		setPlacement(
			classicyPopUpMenuPlacement(menuRect, el.scrollHeight, window.innerHeight),
		);
	}, [open, menuRect]);

	useLayoutEffect(() => {
		if (!open || effectiveHighlight < 0) return;
		const active = document.getElementById(optionId(effectiveHighlight));
		active?.scrollIntoView?.({ block: "nearest" });
	});

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setText(value);
		setBypassFilter(false);
		setHighlight(0);
		onChangeFunc?.(value);
		if (!open) openList(false);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (disabled) return;
		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				if (!open) {
					openList(false);
					setHighlight(0);
				} else {
					setHighlight((h) => Math.min(filtered.length - 1, h + 1));
				}
				break;
			case "ArrowUp":
				e.preventDefault();
				if (open) setHighlight((h) => Math.max(0, h - 1));
				break;
			case "Enter":
				if (open && effectiveHighlight >= 0 && filtered[effectiveHighlight]) {
					e.preventDefault();
					commitOption(filtered[effectiveHighlight]);
				} else if (open) {
					dismiss();
				}
				break;
			case "Escape":
				if (open) {
					e.preventDefault();
					dismiss();
				}
				break;
			case "Tab":
				if (open) dismiss();
				break;
		}
	};

	return (
		<div
			className={classNames(
				"classicyComboBoxWrapper",
				labelPositionClass(labelPosition),
			)}
		>
			{label && (
				<ClassicyControlLabel
					label={label}
					labelFor={id}
					labelSize={labelSize}
					disabled={disabled}
				/>
			)}
			<div
				ref={anchorRef}
				className={classNames(
					"classicyComboBox",
					disabled && "classicyComboBoxDisabled",
				)}
			>
				<input
					ref={inputRef}
					id={id}
					name={id}
					type="text"
					role="combobox"
					aria-autocomplete="list"
					aria-expanded={open}
					aria-controls={open ? listId : undefined}
					aria-activedescendant={
						open && effectiveHighlight >= 0
							? optionId(effectiveHighlight)
							: undefined
					}
					className="classicyInput classicyComboBoxInput"
					value={text}
					placeholder={placeholder}
					disabled={disabled}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
				/>
				<button
					type="button"
					// Not a second tab stop: the input is the control, the arrow is
					// a pointer affordance (matches the native combo box).
					tabIndex={-1}
					aria-label="Show options"
					disabled={disabled}
					className="classicyPopUpMenuIndicator classicyComboBoxIndicator"
					onMouseDown={(e) => e.preventDefault()}
					onClick={() => {
						if (open) {
							dismiss();
							return;
						}
						openList(true);
						const index = options.findIndex(
							(o) => o.value === committedValue.current,
						);
						setHighlight(index >= 0 ? index : 0);
					}}
				/>
			</div>

			{open &&
				menuRect &&
				createPortal(
					<div
						ref={listRef}
						id={listId}
						role="listbox"
						aria-label={label ?? placeholder ?? id}
						className={classNames(
							"classicyPopUpMenuList",
							placement?.above && "classicyPopUpMenuListAbove",
						)}
						style={{
							position: "fixed",
							left: `${menuRect.left}px`,
							minWidth: `${menuRect.width}px`,
							zIndex: 5000,
							// Unlike the pop-up menu (which overlays its button), the
							// suggestion list hangs below the field — or sits fully
							// above it when there is no room below.
							...(placement?.above
								? { bottom: `${window.innerHeight - menuRect.top}px` }
								: { top: `${menuRect.bottom}px` }),
							...(placement && { maxHeight: `${placement.maxHeight}px` }),
						}}
					>
						{filtered.length === 0 && (
							<div
								role="presentation"
								className="classicyComboBoxNoMatches classicyPopUpMenuListItem"
							>
								No matches
							</div>
						)}
						{filtered.map((o, index) => {
							const isSelected = o.value === committedValue.current;
							return (
								<div
									key={id + o.value}
									id={optionId(index)}
									role="option"
									tabIndex={-1}
									aria-selected={isSelected}
									className={classNames(
										"classicyPopUpMenuListItem",
										index === effectiveHighlight &&
											"classicyPopUpMenuListItemHighlight",
									)}
									onMouseEnter={() => setHighlight(index)}
									// Commit on mousedown-driven click; preventDefault on
									// mousedown keeps focus in the input meanwhile.
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => commitOption(o)}
									onKeyDown={(e) => {
										if (e.key === "Enter" || e.key === " ") {
											e.preventDefault();
											commitOption(o);
										}
									}}
								>
									<span className="classicyPopUpMenuCheck" aria-hidden={true}>
										{isSelected ? CHECKMARK : ""}
									</span>
									{o.icon && (
										<img
											className="classicyPopUpMenuListItemIcon"
											src={o.icon}
											alt=""
										/>
									)}
									<span className="classicyPopUpMenuListItemLabel">
										{o.label}
									</span>
								</div>
							);
						})}
					</div>,
					document.getElementById("classicyDesktop") ?? document.body,
				)}
		</div>
	);
};
