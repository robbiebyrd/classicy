import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import "./ClassicyPopUpMenu.scss";
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
	type ClassicyPopUpMenuPlacementResult,
	classicyPopUpMenuPlacement,
} from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenuPlacement";

const PLACEHOLDER_VALUE = "__classicy_placeholder__";
// HIG checkmark drawn against the current selection in the open menu.
const CHECKMARK = "✓";

export type ClassicyPopUpMenuSize = ClassicyControlLabelSize | "mini";

export type ClassicyPopUpMenuOption = {
	value: string;
	label: string;
	icon?: string;
};

/** The `<optgroup>` equivalent: a titled, non-selectable run of options. */
export type ClassicyPopUpMenuOptionGroup = {
	groupLabel: string;
	options: ClassicyPopUpMenuOption[];
};

export type ClassicyPopUpMenuEntry =
	| ClassicyPopUpMenuOption
	| ClassicyPopUpMenuOptionGroup;

const isOptionGroup = (
	entry: ClassicyPopUpMenuEntry,
): entry is ClassicyPopUpMenuOptionGroup => "groupLabel" in entry;

// Rendering walks display rows (headers interleaved with options); every
// other piece of logic — highlight, type-ahead, commit, Home/End — indexes
// the flat option list, so group headers can never be highlighted or
// selected and the keyboard math is identical to the ungrouped case.
type ClassicyPopUpMenuRow =
	| { kind: "header"; label: string }
	| {
			kind: "option";
			option: ClassicyPopUpMenuOption;
			flatIndex: number;
			grouped: boolean;
	  };

const normalizeEntries = (
	entries: ClassicyPopUpMenuEntry[],
): { rows: ClassicyPopUpMenuRow[]; flatOptions: ClassicyPopUpMenuOption[] } => {
	const rows: ClassicyPopUpMenuRow[] = [];
	const flatOptions: ClassicyPopUpMenuOption[] = [];
	for (const entry of entries) {
		if (isOptionGroup(entry)) {
			rows.push({ kind: "header", label: entry.groupLabel });
			for (const option of entry.options) {
				rows.push({
					kind: "option",
					option,
					flatIndex: flatOptions.length,
					grouped: true,
				});
				flatOptions.push(option);
			}
		} else {
			rows.push({
				kind: "option",
				option: entry,
				flatIndex: flatOptions.length,
				grouped: false,
			});
			flatOptions.push(entry);
		}
	}
	return { rows, flatOptions };
};

type classicyPopUpMenuProps = {
	id: string;
	label?: string;
	labelPosition?: ClassicyLabelPosition;
	labelSize?: ClassicyControlLabelSize;
	options: ClassicyPopUpMenuEntry[];
	selected?: string;
	placeholder?: string;
	size?: ClassicyPopUpMenuSize;
	onChangeFunc?: (e: ChangeEvent<HTMLSelectElement>) => void;
	className?: string;
	disabled?: boolean;
};

export const ClassicyPopUpMenu: FunctionalComponent<classicyPopUpMenuProps> = ({
	id,
	label,
	labelPosition = "above",
	labelSize,
	options,
	selected,
	placeholder,
	className: extraClassName,
	size = "medium",
	onChangeFunc,
	disabled = false,
}) => {
	// For the control label, "mini" maps to "small" — "mini" is a menu-only size
	const controlLabelSize: ClassicyControlLabelSize =
		labelSize || size === "mini" ? "small" : size;

	const [selectedItem, setSelectedItem] = useState(
		selected ?? (placeholder ? PLACEHOLDER_VALUE : undefined),
	);
	// biome-ignore lint/correctness/useExhaustiveDependencies: placeholder is intentionally excluded — it does not change after mount
	useEffect(() => {
		setSelectedItem(selected ?? (placeholder ? PLACEHOLDER_VALUE : undefined)); // eslint-disable-line react-hooks/set-state-in-effect
	}, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

	const [open, setOpen] = useState(false);
	const [highlight, setHighlight] = useState<number>(-1);
	const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
	// Null until the open menu has been measured; the first (unmeasured) paint
	// falls back to growing downward under the stylesheet's height cap.
	const [placement, setPlacement] =
		useState<ClassicyPopUpMenuPlacementResult | null>(null);

	const wrapperRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const typeaheadBufferRef = useRef("");
	const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const reactId = useId();

	const { track } = useClassicyAnalytics();

	const { rows, flatOptions } = useMemo(
		() => normalizeEntries(options),
		[options],
	);

	const selectedOption = flatOptions.find((o) => o.value === selectedItem);
	const currentLabel = selectedOption
		? selectedOption.label
		: (placeholder ?? "");
	const currentIndex = flatOptions.findIndex((o) => o.value === selectedItem);

	const optionId = (index: number) => `${reactId}-opt-${index}`;
	const listId = `${reactId}-list`;

	const emitChange = useCallback(
		(value: string) => {
			if (value === PLACEHOLDER_VALUE) return;
			setSelectedItem(value);
			track("selected", {
				type: "ClassicyPopUpMenu",
				itemId: value,
				id,
				label,
				options,
				selected,
			});
			if (onChangeFunc) {
				// Synthesize a `{ target: { value } }`-shaped event so consumers
				// written against the old native <select> API keep working.
				const evt = {
					target: { value },
					currentTarget: { value },
				} as unknown as ChangeEvent<HTMLSelectElement>;
				onChangeFunc(evt);
			}
		},
		[onChangeFunc, track, id, label, options, selected],
	);

	const closeMenu = useCallback(() => {
		setOpen(false);
		setHighlight(-1);
		setMenuRect(null);
		setPlacement(null);
	}, []);

	const openMenu = useCallback(() => {
		if (disabled) return;
		setHighlight(currentIndex >= 0 ? currentIndex : 0);
		if (buttonRef.current) {
			setMenuRect(buttonRef.current.getBoundingClientRect());
		}
		setOpen(true);
		// Firefox/Safari don't focus a <button> on click (only Chromium does),
		// so without this the keydown handler never runs after a mouse-open.
		buttonRef.current?.focus();
	}, [disabled, currentIndex]);

	// Native-<select>-style type-ahead: accumulate typed chars (reset after
	// 250ms idle) and jump the highlight to the first matching option label.
	const handleTypeahead = useCallback(
		(char: string): boolean => {
			if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
			typeaheadBufferRef.current += char;
			typeaheadTimerRef.current = setTimeout(() => {
				typeaheadBufferRef.current = "";
			}, 250);

			const buffer = typeaheadBufferRef.current.toLowerCase();
			let index = flatOptions.findIndex((o) =>
				o.label.toLowerCase().startsWith(buffer),
			);
			// If the accumulated buffer no longer matches, fall back to the
			// latest char alone (re-locates the first option with that initial).
			if (index < 0) {
				const last = char.toLowerCase();
				index = flatOptions.findIndex((o) =>
					o.label.toLowerCase().startsWith(last),
				);
			}
			if (index < 0) return false;

			if (!open) openMenu(); // typing surfaces the menu; never a silent change
			setHighlight(index);
			return true;
		},
		[flatOptions, open, openMenu],
	);

	// Commit a menu selection (mouse or keyboard). Matches native <select>
	// semantics: re-picking the current value simply closes with no onChange.
	const commitIndex = useCallback(
		(index: number) => {
			const option = flatOptions[index];
			closeMenu();
			buttonRef.current?.focus();
			if (!option || option.value === selectedItem) return;
			emitChange(option.value);
		},
		[flatOptions, selectedItem, emitChange, closeMenu],
	);

	// Close on outside pointer-down (release outside = no change).
	useEffect(() => {
		if (!open) return;
		const onPointerDown = (e: globalThis.MouseEvent) => {
			const target = e.target as Node;
			if (
				!wrapperRef.current?.contains(target) &&
				!listRef.current?.contains(target)
			) {
				closeMenu();
			}
		};
		document.addEventListener("mousedown", onPointerDown);
		return () => document.removeEventListener("mousedown", onPointerDown);
	}, [open, closeMenu]);

	// A fixed-position portal can't follow its button, so dismiss on scroll/
	// resize. `capture: true` catches scrolls in any ancestor, not just window.
	useEffect(() => {
		if (!open) return;
		const dismiss = () => {
			closeMenu();
			buttonRef.current?.focus();
		};
		// Capture propagates window -> target even for non-bubbling `scroll`
		// events, so this listener also sees the menu list scrolling its own
		// overflow. Those scrolls must not dismiss it — the anchor hasn't moved,
		// the user is just browsing the options.
		const onScroll = (e: Event) => {
			// A window/document-targeted scroll is an ancestor scrolling away, and
			// `contains()` rejects a non-Node target, so check before asking.
			const target = e.target;
			if (target instanceof Node && listRef.current?.contains(target)) return;
			dismiss();
		};
		window.addEventListener("scroll", onScroll, true);
		window.addEventListener("resize", dismiss);
		return () => {
			window.removeEventListener("scroll", onScroll, true);
			window.removeEventListener("resize", dismiss);
		};
	}, [open, closeMenu]);

	// Measure the rendered menu and decide which way it grows. A layout effect
	// runs before paint, so the corrected placement is what the user sees (same
	// approach as ClassicyContextualMenu's horizontal flip). `scrollHeight` is
	// the unclamped content height, so it stays correct once maxHeight applies.
	useLayoutEffect(() => {
		if (!open || !menuRect) return;
		const el = listRef.current;
		if (!el) return;
		setPlacement(
			classicyPopUpMenuPlacement(menuRect, el.scrollHeight, window.innerHeight),
		);
	}, [open, menuRect]);

	// Keyboard navigation moves a highlight, not focus (focus stays on the
	// button for the combobox pattern), so nothing scrolls the active option
	// into view automatically the way focus would.
	useLayoutEffect(() => {
		if (!open || highlight < 0) return;
		const active = document.getElementById(`${reactId}-opt-${highlight}`);
		// Optional call: jsdom does not implement scrollIntoView.
		active?.scrollIntoView?.({ block: "nearest" });
	}, [open, highlight, reactId]);

	useEffect(
		() => () => {
			if (typeaheadTimerRef.current) clearTimeout(typeaheadTimerRef.current);
		},
		[],
	);

	const onButtonKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		if (disabled) return;
		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				if (!open) {
					openMenu();
				} else {
					setHighlight((h) => Math.min(flatOptions.length - 1, h + 1));
				}
				break;
			case "ArrowUp":
				e.preventDefault();
				if (!open) {
					openMenu();
				} else {
					setHighlight((h) => Math.max(0, h - 1));
				}
				break;
			case "Enter":
			case " ":
			case "Spacebar":
				e.preventDefault();
				if (!open) {
					openMenu();
				} else if (highlight >= 0) {
					commitIndex(highlight);
				}
				break;
			case "Escape":
				if (open) {
					e.preventDefault();
					closeMenu();
				}
				break;
			case "Home":
				if (open) {
					e.preventDefault();
					setHighlight(0);
				}
				break;
			case "End":
				if (open) {
					e.preventDefault();
					setHighlight(flatOptions.length - 1);
				}
				break;
			default: {
				// Single printable char (not Space, not a modifier combo) -> type-ahead.
				const isPrintable =
					e.key.length === 1 &&
					e.key !== " " &&
					!e.altKey &&
					!e.ctrlKey &&
					!e.metaKey;
				if (isPrintable && handleTypeahead(e.key)) {
					e.preventDefault();
				}
				break;
			}
		}
	};

	const sizeClass = `classicyPopUpMenuSize${size.charAt(0).toUpperCase()}${size.slice(1)}`;

	return (
		<div
			className={classNames(
				"classicyPopUpMenuWrapper",
				labelPositionClass(labelPosition),
			)}
		>
			{label && (
				<ClassicyControlLabel
					label={label}
					labelFor={id}
					labelSize={controlLabelSize}
				></ClassicyControlLabel>
			)}
			<div
				ref={wrapperRef}
				className={classNames(
					"classicyPopUpMenu",
					sizeClass,
					disabled && "select--disabled",
					open && "classicyPopUpMenuOpen",
					extraClassName,
				)}
			>
				{/* The visible custom button IS the control: it carries the `id`
				    so consumers/tests can target it, and reflects the disabled
				    state via the native `disabled` attribute, `aria-disabled` and
				    a disabled class. (No hidden native <select> mirror anymore.) */}
				<button
					ref={buttonRef}
					id={id}
					type="button"
					role="combobox"
					className={classNames(
						"classicyPopUpMenuButton",
						disabled && "classicyPopUpMenuButtonDisabled",
					)}
					disabled={disabled}
					aria-disabled={disabled}
					aria-label={label ?? currentLabel}
					aria-haspopup="listbox"
					aria-expanded={open}
					aria-controls={open ? listId : undefined}
					aria-activedescendant={
						open && highlight >= 0 ? optionId(highlight) : undefined
					}
					onClick={() => (open ? closeMenu() : openMenu())}
					onKeyDown={onButtonKeyDown}
				>
					<span className="classicyPopUpMenuValue">{currentLabel}</span>
					<span className="classicyPopUpMenuIndicator" aria-hidden={true} />
				</button>

				{open &&
					menuRect &&
					createPortal(
						<div
							ref={listRef}
							id={listId}
							role="listbox"
							aria-label={label ?? currentLabel}
							className={classNames(
								"classicyPopUpMenuList",
								placement?.above && "classicyPopUpMenuListAbove",
							)}
							style={{
								position: "fixed",
								left: `${menuRect.left}px`,
								minWidth: `${menuRect.width}px`,
								zIndex: 5000,
								// Anchor the edge the menu grows away from: its top to the
								// button's top when growing down, its bottom to the button's
								// bottom when growing up. Only one of the two is ever set.
								...(placement?.above
									? { bottom: `${window.innerHeight - menuRect.bottom}px` }
									: { top: `${menuRect.top}px` }),
								...(placement && { maxHeight: `${placement.maxHeight}px` }),
							}}
						>
							{rows.map((row, rowIndex) => {
								if (row.kind === "header") {
									return (
										<div
											// biome-ignore lint/suspicious/noArrayIndexKey: rows derive 1:1 from the options prop; the index disambiguates duplicate group labels and rows never reorder independently
											key={`${id}-group-${row.label}-${rowIndex}`}
											role="presentation"
											className="classicyPopUpMenuGroupHeader"
										>
											{row.label}
										</div>
									);
								}
								const { option: o, flatIndex: index, grouped } = row;
								const isSelected = o.value === selectedItem;
								return (
									<div
										key={id + o.value}
										id={optionId(index)}
										role="option"
										tabIndex={-1}
										aria-selected={isSelected}
										className={classNames(
											"classicyPopUpMenuListItem",
											grouped && "classicyPopUpMenuListItemGrouped",
											index === highlight &&
												"classicyPopUpMenuListItemHighlight",
										)}
										onMouseEnter={() => setHighlight(index)}
										onClick={() => commitIndex(index)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												commitIndex(index);
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
		</div>
	);
};
