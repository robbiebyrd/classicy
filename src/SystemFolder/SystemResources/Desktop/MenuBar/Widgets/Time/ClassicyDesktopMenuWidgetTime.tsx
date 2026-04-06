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

	// Refs to hold current values so the interval callback doesn't need them in its dep array
	const localDateRef = useRef(
		new Date(
			new Date(dateAndTime.dateTime).getTime() +
				parseInt(dateAndTime.timeZoneOffset, 10) * 60 * 60 * 1000,
		),
	);
	const timeZoneOffsetRef = useRef(dateAndTime.timeZoneOffset);
	const prevMinutesRef = useRef(time.minutes);

	// When the store changes (user sets new time/tz), reset the accumulated clock
	useEffect(() => {
		localDateRef.current = new Date(
			new Date(dateAndTime.dateTime).getTime() +
				parseInt(dateAndTime.timeZoneOffset, 10) * 60 * 60 * 1000,
		);
	}, [dateAndTime.dateTime, dateAndTime.timeZoneOffset]);

	useEffect(() => {
		timeZoneOffsetRef.current = dateAndTime.timeZoneOffset;
	}, [dateAndTime.timeZoneOffset]);

	// Interval created once on mount; advances from accumulated ref
	useEffect(() => {
		const intervalId = setInterval(() => {
			const advanced = new Date(localDateRef.current.getTime() + 1000);
			localDateRef.current = advanced;

			const date = new Date(
				advanced.getTime() -
					parseInt(timeZoneOffsetRef.current, 10) * 60 * 60 * 1000,
			);

			const localDate = advanced;

			const newMinutes = localDate.getMinutes();

			// Update local time state every second for display
			setTime({
				year: localDate.getFullYear(),
				month: localDate.getMonth(),
				date: localDate.getDate(),
				day: localDate.getDay(),
				minutes: newMinutes,
				hours: localDate.getHours() === 0 ? 12 : localDate.getHours(),
				seconds: localDate.getSeconds(),
				period: localDate.getHours() < 12 ? " AM" : " PM",
			});

			// Only dispatch global state update when minute changes
			if (newMinutes !== prevMinutesRef.current) {
				prevMinutesRef.current = newMinutes;
				desktopEventDispatch({
					type: "ClassicyManagerDateTimeSet",
					dateTime: date,
				});
			}
		}, 1000);

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
		if (flashSeparators) {
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
