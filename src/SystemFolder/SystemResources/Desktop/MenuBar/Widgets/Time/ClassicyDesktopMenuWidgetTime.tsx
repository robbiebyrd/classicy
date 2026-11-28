import "./ClassicyDesktopMenuWidgetTime.scss";
import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type KeyboardEvent,
	useState,
} from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { CLASSICY_PART_ATTRIBUTE } from "@/Appearance/vocabulary/ClassicyVocabulary";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	DATE_AND_TIME_MANAGER_APP_ID,
	DATE_AND_TIME_MANAGER_APP_NAME,
} from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerManifest";
import { useClassicyClockTime } from "@/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/useClassicyClockTime.internal";

// The rendered shape of the clock's moment (a Date whose UTC fields read
// the local time, `useClassicyClockTime`).
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

const daysOfWeek = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

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

	// The virtual clock, ticking each second and writing the store on the
	// minute, whether or not the clock is shown.
	const time = computeDisplayTime(useClassicyClockTime());

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
				id: DATE_AND_TIME_MANAGER_APP_ID,
				name: DATE_AND_TIME_MANAGER_APP_NAME,
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
						className,
					)}
					style={style}
					{...{ [CLASSICY_PART_ATTRIBUTE.part]: "clock" }}
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
