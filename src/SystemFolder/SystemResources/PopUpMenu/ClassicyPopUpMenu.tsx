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
	useRef,
	useState,
} from "react";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

const PLACEHOLDER_VALUE = "__classicy_placeholder__";
// HIG checkmark drawn against the current selection in the open menu.
const CHECKMARK = "✓";

export type ClassicyPopUpMenuSize = ClassicyControlLabelSize | "mini";

type classicyPopUpMenuOptions = {
	value: string;
	label: string;
	icon?: string;
};

type classicyPopUpMenuProps = {
	id: string;
	label?: string;
	labelPosition?: ClassicyLabelPosition;
	labelSize?: ClassicyControlLabelSize;
	options: classicyPopUpMenuOptions[];
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

	const wrapperRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const reactId = useId();

	const { track } = useClassicyAnalytics();

	const selectedOption = options.find((o) => o.value === selectedItem);
	const currentLabel = selectedOption
		? selectedOption.label
		: (placeholder ?? "");
	const currentIndex = options.findIndex((o) => o.value === selectedItem);

	const optionId = (index: number) => `${reactId}-opt-${index}`;

	const emitChange = useCallback(
		(value: string, nativeEvent?: ChangeEvent<HTMLSelectElement>) => {
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
				const evt =
					nativeEvent ??
					({
						target: { value },
						currentTarget: { value },
					} as unknown as ChangeEvent<HTMLSelectElement>);
				onChangeFunc(evt);
			}
		},
		[onChangeFunc, track, id, label, options, selected],
	);

	const closeMenu = useCallback(() => {
		setOpen(false);
		setHighlight(-1);
	}, []);

	const openMenu = useCallback(() => {
		if (disabled) return;
		setHighlight(currentIndex >= 0 ? currentIndex : 0);
		setOpen(true);
	}, [disabled, currentIndex]);

	// Commit a menu selection (mouse or keyboard). Matches native <select>
	// semantics: re-picking the current value simply closes with no onChange.
	const commitIndex = useCallback(
		(index: number) => {
			const option = options[index];
			closeMenu();
			buttonRef.current?.focus();
			if (!option || option.value === selectedItem) return;
			emitChange(option.value);
		},
		[options, selectedItem, emitChange, closeMenu],
	);

	// Close on outside pointer-down (release outside = no change).
	useEffect(() => {
		if (!open) return;
		const onPointerDown = (e: globalThis.MouseEvent) => {
			if (!wrapperRef.current?.contains(e.target as Node)) {
				closeMenu();
			}
		};
		document.addEventListener("mousedown", onPointerDown);
		return () => document.removeEventListener("mousedown", onPointerDown);
	}, [open, closeMenu]);

	const onButtonKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		if (disabled) return;
		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				if (!open) {
					openMenu();
				} else {
					setHighlight((h) => Math.min(options.length - 1, h + 1));
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
					setHighlight(options.length - 1);
				}
				break;
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
				{/* Visually-hidden native mirror: preserves the element id, the
				    disabled state and form value for consumers/tests while the
				    visible control is the custom Mac-style button below. */}
				<select
					id={id}
					className="classicyPopUpMenuNativeMirror"
					tabIndex={-1}
					aria-hidden={true}
					value={selectedItem}
					disabled={disabled}
					onChange={(e) => emitChange(e.target.value, e)}
				>
					{placeholder && (
						<option value={PLACEHOLDER_VALUE} disabled>
							{placeholder}
						</option>
					)}
					{options.map((o) => (
						<option key={id + o.label + o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>

				<button
					ref={buttonRef}
					type="button"
					className="classicyPopUpMenuButton"
					disabled={disabled}
					aria-haspopup="listbox"
					aria-expanded={open}
					onClick={() => (open ? closeMenu() : openMenu())}
					onKeyDown={onButtonKeyDown}
				>
					<span className="classicyPopUpMenuValue">{currentLabel}</span>
					<span className="classicyPopUpMenuIndicator" aria-hidden={true} />
				</button>

				{open && (
					<div role="listbox" className="classicyPopUpMenuList">
						{options.map((o, index) => {
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
										index === highlight && "classicyPopUpMenuListItemHighlight",
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
					</div>
				)}
			</div>
		</div>
	);
};
