import "./ClassicyDesktopMenuWidgetTime.scss";
import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { CLASSICY_PART_ATTRIBUTE } from "@/Appearance/vocabulary/ClassicyVocabulary";

// Shared by the resync effect and the tick interval so the two can never
// drift into computing the rendered shape differently.
const computeDisplayTime = (localDate: Date) => ({
	year: localDate.getUTCFullYear(),
	month: localDate.getUTCMonth(),
	date: localDate.getUTCDate(),
	day: localDate.getUTCDay(),
	minutes: localDate.getUTCMinutes(),
	hours: localDate.getUTCHours() === 0 ? 12 : localDate.getUTCHours(),
	seconds: localDate.getUTCSeconds(),
	period: localDate.getUTCHours() < 12 ? " AM" : " PM",
});

import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { noteClassicyClockTick } from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyClockTick.internal";
import { computeAnchoredTime } from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils";

type ClassicyDesktopMenuWidgetTimeProps = {
	/** Extra class names, merged onto the clock's `<li>` after the component's own. */
	className?: string;
	/** Inline style for the clock's `<li>`. */
	style?: CSSProperties;
};

export const ClassicyDesktopMenuWidgetTime: FunctionalComponent<
	ClassicyDesktopMenuWidgetTimeProps
> = ({ className, style }) => {
	const appIcon =
		useClassicyAsset(
			"icons",
			"controlPanels.dateTimeManager.dateTimeManager",
		) ?? "";
	const dateAndTime = useAppManager((s) => s.System.Manager.DateAndTime);
	const desktopEventDispatch = useAppManagerDispatch();

	const {
		show,
		militaryTime,
		displaySeconds,
		displayPeriod,
		displayDay,
		displayLongDay,
		flashSeparators,
	} = dateAndTime;

	const [showingTime, setShowingTime] = useState(true);

	const [time, setTime] = useState({
		year: new Date(dateAndTime.dateTime).getFullYear(),
		month: new Date(dateAndTime.dateTime).getMonth(),
		date: new Date(dateAndTime.dateTime).getDate(),
		day: new Date(dateAndTime.dateTime).getUTCDay(),
		minutes: new Date(dateAndTime.dateTime).getUTCMinutes(),
		hours: new Date(dateAndTime.dateTime).getUTCHours(),
		seconds: new Date(dateAndTime.dateTime).getUTCSeconds(),
		period: new Date(dateAndTime.dateTime).getUTCHours() > 12 ? " PM" : " AM",
	});

	const daysOfWeek = [
		"Sunday",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
	];

	// Wall-clock anchors: virtualAnchorMsRef holds the local (tz-shifted) epoch-ms
	// when the anchor was last set; realAnchorMsRef holds Date.now() at that moment.
	const virtualAnchorMsRef = useRef<number>(
		new Date(dateAndTime.dateTime).getTime() +
			parseInt(dateAndTime.timeZoneOffset, 10) * 60 * 60 * 1000,
	);
	const realAnchorMsRef = useRef<number>(Date.now());

	const timeZoneOffsetRef = useRef(dateAndTime.timeZoneOffset);
	const prevMinutesRef = useRef(time.minutes);
	const prevSecondsRef = useRef(time.seconds);
	const pausedRef = useRef(dateAndTime.paused);

	// When the store changes (user sets new time/tz), reset both anchors and
	// the second/minute refs so the next tick always updates from the new baseline,
	// and update the rendered display immediately — this must not wait for the
	// tick interval, since that interval no-ops while paused.
	useEffect(() => {
		const newVirtualMs =
			new Date(dateAndTime.dateTime).getTime() +
			parseInt(dateAndTime.timeZoneOffset, 10) * 60 * 60 * 1000;
		virtualAnchorMsRef.current = newVirtualMs;
		realAnchorMsRef.current = Date.now();
		const d = new Date(newVirtualMs);
		prevSecondsRef.current = d.getUTCSeconds();
		prevMinutesRef.current = d.getUTCMinutes();
		setTime(computeDisplayTime(d));
	}, [dateAndTime.dateTime, dateAndTime.timeZoneOffset]);

	useEffect(() => {
		timeZoneOffsetRef.current = dateAndTime.timeZoneOffset;
	}, [dateAndTime.timeZoneOffset]);

	useEffect(() => {
		pausedRef.current = dateAndTime.paused;
	}, [dateAndTime.paused]);

	// Pause: snapshot both anchors at the current virtual moment so the formula
	// yields that frozen time on subsequent ticks.
	// Resume: reset only realAnchorMs so the clock continues from the paused instant.
	useEffect(() => {
		if (dateAndTime.paused) {
			const frozenMs =
				virtualAnchorMsRef.current + (Date.now() - realAnchorMsRef.current);
			virtualAnchorMsRef.current = frozenMs;
			realAnchorMsRef.current = Date.now();
		} else {
			realAnchorMsRef.current = Date.now();
		}
	}, [dateAndTime.paused]);

	// Poll every 250ms; evaluate anchor formula and update display only when the
	// second changes. Dispatches the global store update on minute boundaries.
	useEffect(() => {
		const intervalId = setInterval(() => {
			if (pausedRef.current) return;
			const localDate = computeAnchoredTime(
				virtualAnchorMsRef.current,
				realAnchorMsRef.current,
			);

			const newSeconds = localDate.getUTCSeconds();
			if (newSeconds === prevSecondsRef.current) return;
			prevSecondsRef.current = newSeconds;

			const date = new Date(
				localDate.getTime() -
					parseInt(timeZoneOffsetRef.current, 10) * 60 * 60 * 1000,
			);

			const newMinutes = localDate.getUTCMinutes();

			setTime(computeDisplayTime(localDate));

			if (newMinutes !== prevMinutesRef.current) {
				prevMinutesRef.current = newMinutes;
				// A tick, not an edit: state adapters send nothing for it.
				noteClassicyClockTick(date);
				desktopEventDispatch({
					type: "ClassicyManagerDateTimeSet",
					dateTime: date,
				});
			}
		}, 250);

		return () => clearInterval(intervalId);
	}, [desktopEventDispatch]);

	const convertToTwoDigit = (num: number) => {
		return num.toLocaleString("en-US", {
			minimumIntegerDigits: 2,
		});
	};

	const convertTo12HourPeriod = (num: number) => {
		if (num > 12) {
			return num - 12;
		}
		if (num === 0) {
			return 12;
		}
		return num;
	};

	const toBlink = () => {
		if (!dateAndTime.paused && flashSeparators) {
			return "textBlinker";
		}

		return;
	};

	// What the clock shows, to the minute, for assistive technology: the
	// readout without its seconds, so a focused clock is not described anew
	// every second.
	const hoursShown = militaryTime
		? convertToTwoDigit(time.hours)
		: convertTo12HourPeriod(time.hours);
	const readout = showingTime
		? [
				displayDay
					? displayLongDay
						? daysOfWeek[time.day]
						: daysOfWeek[time.day].slice(0, 3)
					: "",
				`${hoursShown}:${convertToTwoDigit(time.minutes)}${
					!militaryTime && displayPeriod ? time.period : ""
				}`,
			]
				.filter(Boolean)
				.join(" ")
		: `${time.month + 1}/${time.date}/${time.year}`;

	const toggle = () => setShowingTime((shown) => !shown);

	const openDateTimeManager = () => {
		desktopEventDispatch({
			type: "ClassicyAppOpen",
			app: {
				id: "DateAndTimeManager.app",
				name: "Date and Time Manager",
				icon: appIcon,
			},
		});
	};

	return (
		<>
			{show && (
				// biome-ignore lint/a11y/useKeyWithClickEvents: the keyboard toggles it through its button (Enter or Space), whose click reaches this item's
				<li
					className={classNames(
						"classicyMenuItem",
						"classicyMenuItemNoImage",
						"classicyDesktopMenuTime",
						className,
					)}
					style={style}
					{...{ [CLASSICY_PART_ATTRIBUTE.part]: "clock" }}
					// A press anywhere on the clock toggles it and takes no
					// keyboard focus, as the bar's titles take none.
					onMouseDown={(e) => e.preventDefault()}
					onDoubleClick={openDateTimeManager}
					onClick={toggle}
				>
					{/* A Tab stop, so Enter and Space toggle the date (WCAG 2.1.1,
					    which wins over Mac OS 8.1, whose menu bar had no keyboard
					    path at all): a button, whose click reaches the item's.
					    Its name says what it toggles; it is described by what it
					    shows, to the minute. */}
					<button
						type="button"
						aria-label={
							showingTime ? "Clock: show the date" : "Clock: show the time"
						}
						aria-description={readout}
					>
						{showingTime ? (
							<>
								{displayDay && (
									<span className={"classicyDesktopMenuTimeSeparatorRight"}>
										{displayLongDay
											? daysOfWeek[time.day]
											: daysOfWeek[time.day].slice(0, 3)}
									</span>
								)}
								<span>
									{" "}
									{militaryTime
										? convertToTwoDigit(time.hours)
										: convertTo12HourPeriod(time.hours)}
								</span>
								<span>
									<span className={displaySeconds ? "" : toBlink()}>:</span>
									{convertToTwoDigit(time.minutes)}
								</span>
								{displaySeconds && (
									<>
										<span className={toBlink()}>:</span>
										<span>{convertToTwoDigit(time.seconds)}</span>
									</>
								)}
								{!militaryTime && displayPeriod && (
									<span className={"classicyDesktopMenuTimeSeparatorLeft"}>
										{time.period}
									</span>
								)}
							</>
						) : (
							<span>
								{" "}
								{time.month + 1}/{time.date}/{time.year}
							</span>
						)}
					</button>
				</li>
			)}
		</>
	);
};
