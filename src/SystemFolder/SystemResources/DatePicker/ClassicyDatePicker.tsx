import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import "./ClassicyDatePicker.scss";
import classNames from "classnames";
import {
	type ChangeEvent,
	type CSSProperties,
	type ForwardedRef,
	type FC as FunctionalComponent,
	forwardRef,
	type KeyboardEvent,
	type MouseEvent,
	type MutableRefObject,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	validateDayOfMonth,
	validateMonth,
} from "@/SystemFolder/SystemResources/DatePicker/ClassicyDatePickerUtils";
import { ClassicyLittleArrows } from "@/SystemFolder/SystemResources/LittleArrows/ClassicyLittleArrows";

type ClassicyDatePart = "month" | "day" | "year";

interface ClassicyDatePickerProps {
	/**
	 * Base id. The month, day and year fields get `${id}_month`, `${id}_day`
	 * and `${id}_year`, and the label `${id}_label`. The label points at the
	 * month field, and the fields form a group labelled by it.
	 */
	id: string;
	/** Called with the new (range-clamped) `Date` after every edit or step. */
	onChangeFunc?: (date: Date) => void;
	/** Visible label text. Omit for no label. */
	labelTitle?: string;
	/** Label text size. Defaults to `"medium"`. */
	labelSize?: ClassicyControlLabelSize;
	/** Where the label sits relative to the field. Defaults to `"above"`. */
	labelPosition?: ClassicyLabelPosition;
	/**
	 * @deprecated Has no effect: the fields always show a date. Removed in the
	 * next major version.
	 */
	placeholder?: string;
	/**
	 * The date to show. Defaults to the Classicy virtual clock
	 * (`System.Manager.DateAndTime.dateTime`). The field re-syncs whenever a
	 * different date is passed.
	 */
	prefillValue?: Date;
	/** Disables the fields and little arrows (and dims the label). Defaults to `false`. */
	disabled?: boolean;
	/** Dims the label independently of the fields. Defaults to `disabled`. */
	labelDisabled?: boolean;
	/**
	 * @deprecated Has no effect: Mac OS 8 clock controls have no default state. Still adds the `classicyDatePickerDefault` class
	 * for any host styling that targets it; removed in the next major version.
	 */
	isDefault?: boolean;
	/** Forwarded to the month field (the first field). */
	ref?: ForwardedRef<HTMLInputElement>;
	/** Earliest allowed date; earlier edits snap to it. */
	minValue?: Date;
	/** Latest allowed date; later edits snap to it. */
	maxValue?: Date;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
}

/**
 * The `<input type="date">` equivalent: a Mac OS 8 clock control (HIGOS8
 * Ch.2 "Clock Controls", p.36) — month / day / year edit fields with shared
 * little arrows. Click a field to select it; Up/Down (or the arrows) step the
 * focused part, with the day kept valid for the month and year.
 *
 * The control keeps its own date: it seeds from `prefillValue` (else the
 * Classicy virtual clock in the store, so it must render inside
 * `ClassicyAppManagerProvider`) and reports every change through
 * `onChangeFunc`, clamped to `minValue`/`maxValue`. Pair it with
 * `ClassicyTimePicker` for a full date and time.
 */
export const ClassicyDatePicker: FunctionalComponent<ClassicyDatePickerProps> =
	forwardRef<HTMLInputElement, ClassicyDatePickerProps>(
		function ClassicyDatePicker(
			{
				id,
				labelTitle,
				labelSize = "medium",
				labelPosition = "above",
				prefillValue,
				disabled = false,
				labelDisabled,
				isDefault,
				onChangeFunc,
				minValue,
				maxValue,
				className,
				style,
			},
			ref,
		) {
			const dateTime = useAppManager(
				(s) => s.System.Manager.DateAndTime.dateTime,
			);

			// `prefillValue` (matching TimePicker's API) overrides the shared
			// date/time store as the field's seed value.
			const seed = prefillValue ?? new Date(dateTime);

			const yearRef = useRef<HTMLInputElement>(null);
			const monthRef = useRef<HTMLInputElement>(null);
			const dayRef = useRef<HTMLInputElement>(null);

			// Merge the internal month-field ref with the forwarded ref so callers
			// can focus/measure the control (previously the ref was ignored).
			const setMonthRef = (node: HTMLInputElement | null) => {
				monthRef.current = node;
				if (typeof ref === "function") {
					ref(node);
				} else if (ref) {
					(ref as MutableRefObject<HTMLInputElement | null>).current = node;
				}
			};

			const [selectedDate, setSelectedDate] = useState<Date>(
				() => new Date(seed),
			);
			const [month, setMonth] = useState<string>(() =>
				(new Date(seed).getMonth() + 1).toString(),
			);
			const [day, setDay] = useState<string>(() =>
				new Date(seed).getDate().toString(),
			);
			const [year, setYear] = useState<string>(() =>
				new Date(seed).getFullYear().toString(),
			);
			// Which field the visible little-arrows (and Up/Down keys) act on.
			const [focusedPart, setFocusedPart] = useState<ClassicyDatePart>("month");

			// Re-sync when the parent passes a different date (#312), as
			// ClassicyInput and ClassicySpinner do with their initial values.
			// Keyed on the timestamp, so a new Date for the same moment (a
			// parent re-render) leaves the user's edits alone.
			const prefillTime = prefillValue?.getTime();
			useEffect(() => {
				if (prefillTime === undefined) return;
				const next = new Date(prefillTime);
				setSelectedDate(next);
				setMonth((next.getMonth() + 1).toString());
				setDay(next.getDate().toString());
				setYear(next.getFullYear().toString());
			}, [prefillTime]);

			const selectText = (e: MouseEvent<HTMLInputElement>) => {
				e.currentTarget.focus();
				e.currentTarget.select();
			};

			const clampDate = (date: Date): Date => {
				if (minValue !== undefined && date.getTime() < minValue.getTime())
					return new Date(minValue.getTime());
				if (maxValue !== undefined && date.getTime() >= maxValue.getTime())
					return new Date(maxValue.getTime());
				return date;
			};

			const handleDateChange = (date: Date) => {
				const clamped = clampDate(date);
				if (clamped !== date) {
					setSelectedDate(clamped);
					setMonth((clamped.getMonth() + 1).toString());
					setDay(clamped.getDate().toString());
					setYear(clamped.getFullYear().toString());
				}
				if (onChangeFunc) {
					onChangeFunc(clamped);
				}
			};

			const handleDatePartChange = (
				e: ChangeEvent<HTMLInputElement>,
				part: "month" | "day" | "year",
			) => {
				let inputValue = parseInt(e.currentTarget.value, 10);

				if (Number.isNaN(inputValue)) {
					return;
				}

				const updatedDate = new Date(selectedDate);

				switch (part) {
					case "month":
						inputValue--;
						if (inputValue < 0 || inputValue > 11) {
							setMonth("1");
							return;
						}
						updatedDate.setMonth(inputValue);
						setMonth(e.currentTarget.value);
						break;
					case "day":
						inputValue = validateDayOfMonth(
							inputValue,
							parseInt(month, 10),
							parseInt(year, 10),
						);
						updatedDate.setDate(inputValue);
						setDay(e.currentTarget.value);
						break;
					case "year":
						if (inputValue < 0) {
							return;
						}
						updatedDate.setFullYear(inputValue);
						setYear(e.currentTarget.value);
						break;
				}

				setSelectedDate(updatedDate);
				handleDateChange(updatedDate);
			};

			// Shared increment core: used by both the Up/Down keys and the visible
			// little-arrows widget so mouse-only users can adjust the date too.
			const stepDatePart = (part: ClassicyDatePart, direction: 1 | -1) => {
				const updatedDate = new Date(selectedDate);

				switch (part) {
					case "month": {
						const currentMonth = validateMonth(parseInt(month, 10) + direction);
						updatedDate.setMonth(currentMonth - 1);
						setMonth(currentMonth.toString());
						break;
					}
					case "day": {
						const currentDay = validateDayOfMonth(
							parseInt(day, 10) + direction,
							parseInt(month, 10),
							parseInt(year, 10),
						);
						updatedDate.setDate(currentDay);
						setDay(currentDay.toString());
						break;
					}
					case "year": {
						const currentYear = parseInt(year, 10) + direction;
						updatedDate.setFullYear(currentYear);
						setYear(currentYear.toString());
						break;
					}
				}

				setSelectedDate(updatedDate);
				handleDateChange(updatedDate);
			};

			const incrementDatePartChange = (
				e: KeyboardEvent<HTMLInputElement>,
				part: ClassicyDatePart,
			) => {
				if (e.key === "ArrowDown") stepDatePart(part, -1);
				else if (e.key === "ArrowUp") stepDatePart(part, 1);
			};

			return (
				<div
					className={classNames(
						"classicyDatePickerHolder",
						labelPositionClass(labelPosition),
						className,
					)}
					style={style}
				>
					{labelTitle && (
						<ClassicyControlLabel
							id={`${id}_label`}
							label={labelTitle}
							labelFor={`${id}_month`}
							labelSize={labelSize}
							disabled={labelDisabled ?? disabled}
						></ClassicyControlLabel>
					)}
					{/* biome-ignore lint/a11y/useSemanticElements: a <fieldset> brings its own border, padding and min-width rules into this flex row; role="group" names the fields without them */}
					<div
						className="classicyDatePickerField classicyLittleArrowsGroup"
						role="group"
						aria-labelledby={labelTitle ? `${id}_label` : undefined}
					>
						<div
							className={classNames(
								"classicyDatePicker",
								isDefault ? "classicyDatePickerDefault" : "",
							)}
						>
							<input
								id={`${id}_month`}
								tabIndex={0}
								onChange={(e) => handleDatePartChange(e, "month")}
								onBlur={(e) => handleDatePartChange(e, "month")}
								onKeyDown={(e) => incrementDatePartChange(e, "month")}
								onClick={selectText}
								onFocus={() => setFocusedPart("month")}
								name={`${id}_month`}
								type="text"
								ref={setMonthRef}
								disabled={disabled}
								value={month}
								maxLength={2}
								className={"classicyDatePickerInputShort"}
							></input>
							/
							<input
								id={`${id}_day`}
								tabIndex={0}
								onChange={(e) => handleDatePartChange(e, "day")}
								onBlur={(e) => handleDatePartChange(e, "day")}
								onKeyDown={(e) => incrementDatePartChange(e, "day")}
								onClick={selectText}
								onFocus={() => setFocusedPart("day")}
								name={`${id}_day`}
								type="text"
								ref={dayRef}
								disabled={disabled}
								value={day}
								maxLength={2}
								className={"classicyDatePickerInputShort"}
							></input>
							/
							<input
								id={`${id}_year`}
								tabIndex={0}
								onClick={selectText}
								onFocus={() => setFocusedPart("year")}
								onChange={(e) => handleDatePartChange(e, "year")}
								onBlur={(e) => handleDatePartChange(e, "year")}
								onKeyDown={(e) => incrementDatePartChange(e, "year")}
								name={`${id}_year`}
								type="text"
								ref={yearRef}
								disabled={disabled}
								value={year}
								maxLength={4}
								className={"classicyDatePickerInputLong"}
							></input>
						</div>
						<ClassicyLittleArrows
							disabled={disabled}
							upLabel="Increment date"
							downLabel="Decrement date"
							onStep={(direction) => stepDatePart(focusedPart, direction)}
						/>
					</div>
				</div>
			);
		},
	);
