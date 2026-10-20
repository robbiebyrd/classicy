import "./ClassicyTimePicker.scss";
import classNames from "classnames";
import {
	type ChangeEvent,
	type ForwardedRef,
	type FC as FunctionalComponent,
	forwardRef,
	type KeyboardEvent,
	useEffect,
	useState,
} from "react";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyLittleArrows } from "@/SystemFolder/SystemResources/LittleArrows/ClassicyLittleArrows";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";

type ClassicyTimePart = "hour" | "minutes" | "seconds";
type ClassicyPeriod = "am" | "pm";

/**
 * Converts a 12-hour-clock hour (1-12) plus its am/pm period into the
 * 24-hour hour value `Date#setHours` expects. This is the single source of
 * truth for that conversion -- every call site in this file that turns the
 * visible hour field + period into a value for `setHours` must route
 * through here, so the two boundary cases can't drift out of sync between
 * call sites the way they previously did:
 *   - 12 AM -> 0  (midnight, not noon)
 *   - 12 PM -> 12 (noon, not midnight)
 */
function to24h(hour12: number, period: ClassicyPeriod): number {
	const base = hour12 % 12; // 12 -> 0, 1-11 unchanged
	return period === "pm" ? base + 12 : base;
}

interface ClassicyTimePickerProps {
	/**
	 * Base id. The hour, minute and second fields get `${id}_hour`,
	 * `${id}_minutes` and `${id}_seconds`. (The label's `for` is the bare `id`,
	 * so it is not tied to any one field.)
	 */
	id: string;
	/** Called with the new (range-clamped) `Date` after every edit, step or am/pm change. */
	onChangeFunc?: (updatedDate: Date) => void;
	/** Visible label text. Omit for no label. */
	labelTitle?: string;
	/** Label text size. Defaults to `"medium"`. */
	labelSize?: ClassicyControlLabelSize;
	/** Where the label sits relative to the field. Defaults to `"above"`. */
	labelPosition?: ClassicyLabelPosition;
	/** Native placeholder on the hour field (rarely visible: it always holds a value). */
	placeholder?: string;
	/**
	 * The time to show; its date part is carried through to `onChangeFunc`.
	 * Defaults to the Classicy virtual clock
	 * (`System.Manager.DateAndTime.dateTime`), as `ClassicyDatePicker` does.
	 * The field re-syncs whenever a different time is passed.
	 */
	prefillValue?: Date;
	/** Disables the fields, little arrows and am/pm pop-up (and dims the label). Defaults to `false`. */
	disabled?: boolean;
	/** Dims the label independently of the fields. Defaults to `disabled`. */
	labelDisabled?: boolean;
	/**
	 * @deprecated Has no effect: Mac OS 8 clock controls have no default state. Still adds the `classicyTimePickerDefault` class
	 * for any host styling that targets it; removed in the next major version.
	 */
	isDefault?: boolean;
	/**
	 * Forwarded to the hours input only (the first field and the natural
	 * focus target) -- the minutes and seconds inputs are never bound to
	 * this ref, so `ref.current` always resolves to the hours `<input>`.
	 */
	ref?: ForwardedRef<HTMLInputElement>;
	/** Earliest allowed date-time; earlier edits snap to it. */
	minValue?: Date;
	/** Latest allowed date-time; later edits snap to it. */
	maxValue?: Date;
}

/**
 * The `<input type="time">` equivalent: a Mac OS 8 clock control (HIGOS8
 * Ch.2 "Clock Controls", p.36) — hour : minute : second edit fields on a
 * 12-hour clock with shared little arrows, plus an am/pm `ClassicyPopUpMenu`.
 * Click a field to select it; Up/Down (or the arrows) step the focused part
 * within its range (hours 1–12, minutes and seconds 0–59, no wrap-around).
 *
 * The control keeps its own time, seeded from `prefillValue` (else the
 * Classicy virtual clock in the store, so it must render inside
 * `ClassicyAppManagerProvider`) and re-synced when that changes, and reports a
 * full `Date` through `onChangeFunc` on every change, clamped to
 * `minValue`/`maxValue` (compared as full date-times, so give them the same
 * date as `prefillValue`). Pair it with `ClassicyDatePicker` for a full date
 * and time.
 */
export const ClassicyTimePicker: FunctionalComponent<ClassicyTimePickerProps> =
	forwardRef<HTMLInputElement, ClassicyTimePickerProps>(
		function ClassicyTimePicker(
			{
				id,
				labelTitle,
				labelSize = "medium",
				labelPosition = "above",
				placeholder,
				prefillValue,
				disabled = false,
				labelDisabled,
				isDefault,
				onChangeFunc,
				minValue,
				maxValue,
			},
			ref,
		) {
			const dateTime = useAppManager(
				(s) => s.System.Manager.DateAndTime.dateTime,
			);
			// The virtual clock (#312), like DatePicker; `prefillValue` overrides it.
			const seed = prefillValue ?? new Date(dateTime);

			const [selectedDate, setSelectedDate] = useState<Date>(seed);
			// Normalized to the 12-hour range (1-12) up front so `hour` state is
			// always in the same representation `stepTimePart`/`handleTimePartChange`
			// expect -- `getHours()` returns 0-23, and `0 -> 12` is the midnight
			// boundary case (`x % 12 || 12` maps both 0 and 12 to 12).
			const [hour, setHour] = useState<string>(
				(seed.getHours() % 12 || 12).toString(),
			);
			const [minutes, setMinutes] = useState<string>(
				seed.getMinutes().toString(),
			);
			const [seconds, setSeconds] = useState<string>(
				seed.getSeconds().toString(),
			);
			const [period, setPeriod] = useState<ClassicyPeriod>(
				seed.getHours() < 12 ? "am" : "pm",
			);

			// Re-sync when the parent passes a different time (#312), as
			// ClassicyInput and ClassicySpinner do with their initial values.
			// Keyed on the timestamp, so a new Date for the same moment (a
			// parent re-render) leaves the user's edits alone.
			const prefillTime = prefillValue?.getTime();
			useEffect(() => {
				if (prefillTime === undefined) return;
				const next = new Date(prefillTime);
				setSelectedDate(next);
				setHour((next.getHours() % 12 || 12).toString());
				setMinutes(next.getMinutes().toString());
				setSeconds(next.getSeconds().toString());
				setPeriod(next.getHours() < 12 ? "am" : "pm");
			}, [prefillTime]);
			// Which field the visible little-arrows (and Up/Down keys) act on.
			const [focusedPart, setFocusedPart] = useState<ClassicyTimePart>("hour");

			const clampDateTime = (date: Date): Date => {
				if (minValue !== undefined && date.getTime() < minValue.getTime())
					return new Date(minValue.getTime());
				if (maxValue !== undefined && date.getTime() >= maxValue.getTime())
					return new Date(maxValue.getTime());
				return date;
			};

			const handleDateChange = (date: Date) => {
				const clamped = clampDateTime(date);
				if (clamped !== date) {
					const h = clamped.getHours();
					const isPm = h >= 12;
					setSelectedDate(clamped);
					setHour(
						(isPm ? (h === 12 ? 12 : h - 12) : h === 0 ? 12 : h).toString(),
					);
					setMinutes(clamped.getMinutes().toString());
					setSeconds(clamped.getSeconds().toString());
					setPeriod(isPm ? "pm" : "am");
				}
				onChangeFunc?.(clamped);
			};

			const handlePeriodChange = (e: ChangeEvent<HTMLSelectElement>) => {
				const nextPeriod: ClassicyPeriod =
					e.target.value === "pm" ? "pm" : "am";
				setPeriod(nextPeriod);

				const updatedDate = new Date(selectedDate);
				updatedDate.setHours(to24h(parseInt(hour, 10), nextPeriod));
				setSelectedDate(updatedDate);
				handleDateChange(updatedDate);
			};

			const handleTimePartChange = (
				e: ChangeEvent<HTMLInputElement>,
				part: "hour" | "minutes" | "seconds",
			) => {
				const inputValue = parseInt(e.currentTarget.value, 10);
				const updatedDate = new Date(selectedDate);

				if (Number.isNaN(inputValue)) {
					return;
				}

				switch (part) {
					case "hour":
						if (inputValue < 1 || inputValue > 12) {
							return;
						}
						updatedDate.setHours(to24h(inputValue, period));
						setHour(e.currentTarget.value);
						break;
					case "minutes":
						if (inputValue < 0 || inputValue > 59) {
							return;
						}
						updatedDate.setMinutes(inputValue);
						setMinutes(e.currentTarget.value);
						break;
					case "seconds":
						if (inputValue < 0 || inputValue > 59) {
							return;
						}
						updatedDate.setSeconds(inputValue);
						setSeconds(e.currentTarget.value);
						break;
				}

				setSelectedDate(updatedDate);
				handleDateChange(updatedDate);
			};

			// Shared increment core: used by both the Up/Down keys and the visible
			// little-arrows widget so mouse-only users can adjust the clock too.
			const stepTimePart = (part: ClassicyTimePart, direction: 1 | -1) => {
				const updatedDate = new Date(selectedDate);

				switch (part) {
					case "hour": {
						const currentHour = parseInt(hour, 10) + direction;
						if (currentHour > 12 || currentHour <= 0) {
							return;
						}
						updatedDate.setHours(to24h(currentHour, period));
						setHour(currentHour.toString());
						break;
					}
					case "minutes": {
						const currentMinutes = parseInt(minutes, 10) + direction;
						if (currentMinutes < 0 || currentMinutes > 59) {
							return;
						}
						updatedDate.setMinutes(currentMinutes);
						setMinutes(currentMinutes.toString());
						break;
					}
					case "seconds": {
						const currentSeconds = parseInt(seconds, 10) + direction;
						if (currentSeconds < 0 || currentSeconds > 59) {
							return;
						}
						updatedDate.setSeconds(currentSeconds);
						setSeconds(currentSeconds.toString());
						break;
					}
				}

				setSelectedDate(updatedDate);
				handleDateChange(updatedDate);
			};

			const incrementTimePartChange = (
				e: KeyboardEvent<HTMLInputElement>,
				part: ClassicyTimePart,
			) => {
				if (e.key === "ArrowDown") stepTimePart(part, -1);
				else if (e.key === "ArrowUp") stepTimePart(part, 1);
			};

			return (
				<div
					className={classNames(
						"classicyTimePickerHolder",
						labelPositionClass(labelPosition),
					)}
				>
					{labelTitle && (
						<ClassicyControlLabel
							label={labelTitle}
							labelFor={id}
							labelSize={labelSize}
							disabled={labelDisabled ?? disabled}
						></ClassicyControlLabel>
					)}
					<div className="classicyTimePickerField classicyLittleArrowsGroup">
						<div
							className={classNames(
								"classicyTimePicker",
								isDefault ? "classicyTimePickerDefault" : "",
							)}
						>
							<input
								id={`${id}_hour`}
								tabIndex={0}
								name={`${id}_hour`}
								type="text"
								// The forwarded ref lands here only -- see the `ref` doc
								// comment on ClassicyTimePickerProps above. Minutes and
								// seconds are deliberately unref'd.
								ref={ref}
								disabled={disabled}
								placeholder={placeholder}
								onClick={(e) => e.currentTarget.select()}
								onFocus={() => setFocusedPart("hour")}
								onChange={(e) => handleTimePartChange(e, "hour")}
								onBlur={(e) => handleTimePartChange(e, "hour")}
								onKeyDown={(e) => incrementTimePartChange(e, "hour")}
								value={
									parseInt(hour, 10) % 12 === 0 ? 12 : parseInt(hour, 10) % 12
								}
								maxLength={2}
								className={"classicyTimePickerInput"}
							></input>
							:
							<input
								id={`${id}_minutes`}
								tabIndex={0}
								name={`${id}_minutes`}
								type="text"
								disabled={disabled}
								value={String(minutes)}
								onClick={(e) => e.currentTarget.select()}
								onFocus={() => setFocusedPart("minutes")}
								onChange={(e) => handleTimePartChange(e, "minutes")}
								onBlur={(e) => handleTimePartChange(e, "minutes")}
								onKeyDown={(e) => incrementTimePartChange(e, "minutes")}
								maxLength={2}
								className={"classicyTimePickerInput"}
							></input>
							:
							<input
								id={`${id}_seconds`}
								tabIndex={0}
								name={`${id}_seconds`}
								type="text"
								disabled={disabled}
								value={String(seconds)}
								onClick={(e) => e.currentTarget.select()}
								onFocus={() => setFocusedPart("seconds")}
								onChange={(e) => handleTimePartChange(e, "seconds")}
								onBlur={(e) => handleTimePartChange(e, "seconds")}
								onKeyDown={(e) => incrementTimePartChange(e, "seconds")}
								maxLength={2}
								className={"classicyTimePickerInput"}
							></input>
						</div>
						<ClassicyLittleArrows
							disabled={disabled}
							upLabel="Increment time"
							downLabel="Decrement time"
							onStep={(direction) => stepTimePart(focusedPart, direction)}
						/>
					</div>
					<ClassicyPopUpMenu
						selected={period}
						id={"am-pm"}
						options={[
							{ label: "am", value: "am" },
							{ label: "pm", value: "pm" },
						]}
						className={"classicyTimePickerPeriod"}
						onChangeFunc={handlePeriodChange}
						disabled={disabled}
					></ClassicyPopUpMenu>
				</div>
			);
		},
	);
