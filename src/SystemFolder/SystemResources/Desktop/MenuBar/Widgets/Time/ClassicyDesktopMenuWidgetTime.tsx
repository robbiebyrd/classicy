import "./ClassicyDesktopMenuWidgetTime.scss";
import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

const appIcon = ClassicyIcons.controlPanels.dateTimeManager.dateTimeManager;

import classNames from "classnames";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { computeAnchoredTime } from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerUtils";

export const ClassicyDesktopMenuWidgetTime: FunctionalComponent = () => {
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

	// When the store changes (user sets new time/tz), reset both anchors.
	useEffect(() => {
		virtualAnchorMsRef.current =
			new Date(dateAndTime.dateTime).getTime() +
			parseInt(dateAndTime.timeZoneOffset, 10) * 60 * 60 * 1000;
		realAnchorMsRef.current = Date.now();
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

			setTime({
				year: localDate.getUTCFullYear(),
				month: localDate.getUTCMonth(),
				date: localDate.getUTCDate(),
				day: localDate.getUTCDay(),
				minutes: newMinutes,
				hours: localDate.getUTCHours() === 0 ? 12 : localDate.getUTCHours(),
				seconds: newSeconds,
				period: localDate.getUTCHours() < 12 ? " AM" : " PM",
			});

			if (newMinutes !== prevMinutesRef.current) {
				prevMinutesRef.current = newMinutes;
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
				<li
					className={classNames(
						"classicyMenuItem",
						"classicyMenuItemNoImage",
						"classicyDesktopMenuTime",
					)}
					onDoubleClick={openDateTimeManager}
					onClick={() => {
						setShowingTime(!showingTime);
					}}
					onKeyDown={(e: KeyboardEvent) => {
						if (e.key === "Enter" || e.key === " ") {
							e.preventDefault();
							setShowingTime(!showingTime);
						}
					}}
				>
					{showingTime ? (
						<div>
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
						</div>
					) : (
						<div>
							<span>
								{" "}
								{time.month + 1}/{time.date}/{time.year}
							</span>
						</div>
					)}
				</li>
			)}
		</>
	);
};
