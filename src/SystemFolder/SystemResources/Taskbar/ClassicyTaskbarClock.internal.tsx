import {
	type FC as FunctionalComponent,
	type MouseEvent,
	useCallback,
	useRef,
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
import { useClassicyBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import { useClassicyClockTime } from "@/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/useClassicyClockTime.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { CLASSICY_TASKBAR_MENU_IDS } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarMenu.internal";
import { CLASSICY_TASKBAR_TOOLTIP_DELAY_MS } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTasks.internal";

/**
 * The taskbar's clock (plan 0020-w98 §2, "The clock"; WIG Ch.3 "The Status
 * Area", p.16; Ch.10 "Status Notification", p.211, Figure 10.2), at the
 * status area's right end. Internal: not exported from the package.
 *
 * Windows' clock is not the Mac menu bar's: it shows the time without
 * seconds in the locale's short time format (ReactOS `trayclock.cpp`,
 * `GetTimeFormat(…, TIME_NOSECONDS, …)`), names the date in a tooltip
 * (`GetDateFormat(…, DATE_LONGDATE, …)`), and has no click of its own. The
 * Mac clock's seconds, day, flashing separators and click-to-show-the-date
 * are options it ignores.
 */

const DAYS = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
];

const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
];

const twoDigits = (n: number) => String(n).padStart(2, "0");

/**
 * The clock's text, from a moment whose UTC fields read the local time
 * (`useClassicyClockTime`): Windows' US short time without seconds, `h:mm
 * tt` (`4:37 PM`, `12:05 AM`; LOCALE_STIMEFORMAT `h:mm:ss tt` under
 * TIME_NOSECONDS), or `HH:mm` (`16:37`, `00:05`) with the Date & Time
 * control panel's 24-hour clock (`DateAndTime.militaryTime`). Pure.
 */
export function classicyTaskbarClockTime(
	local: Date,
	militaryTime: boolean,
): string {
	const hours = local.getUTCHours();
	const minutes = twoDigits(local.getUTCMinutes());
	if (militaryTime) return `${twoDigits(hours)}:${minutes}`;
	const period = hours < 12 ? "AM" : "PM";
	return `${hours % 12 === 0 ? 12 : hours % 12}:${minutes} ${period}`;
}

/**
 * The clock's tooltip: the date in Windows' US long date format, `dddd,
 * MMMM dd, yyyy` (`Wednesday, November 25, 2026`; `Thursday, November 05,
 * 2026`: the day has two digits, as LOCALE_SLONGDATE spells it for
 * English (United States) through Windows 98, Wine `enu.nls`). Pure.
 */
export function classicyTaskbarClockLongDate(local: Date): string {
	return `${DAYS[local.getUTCDay()]}, ${MONTHS[local.getUTCMonth()]} ${twoDigits(
		local.getUTCDate(),
	)}, ${local.getUTCFullYear()}`;
}

/**
 * The `<time>` element's machine-readable value: the local date and time
 * shown, to the minute (`2026-11-25T16:37`, a valid local date and time
 * string). Pure.
 */
export function classicyTaskbarClockDateTime(local: Date): string {
	const year = String(local.getUTCFullYear()).padStart(4, "0");
	return `${year}-${twoDigits(local.getUTCMonth() + 1)}-${twoDigits(
		local.getUTCDate(),
	)}T${twoDigits(local.getUTCHours())}:${twoDigits(local.getUTCMinutes())}`;
}

/**
 * The clock's lead item in the taskbar's menu: **Adjust Date/Time**, the
 * menu's default (bold, `isDefault`), since it is what a double-click on
 * the clock does, as Windows 98's clock menu has it.
 */
export const classicyTaskbarClockMenuItems = (
	onAdjust: () => void,
): ClassicyMenuItem[] => [
	{
		id: CLASSICY_TASKBAR_MENU_IDS.adjustDateTime,
		title: "Adjust Date/Time",
		isDefault: true,
		onClickFunc: onAdjust,
	},
];

/**
 * The clock (`time.classicyTaskbarClock`, `data-classicy-part="clock"`,
 * `dateTime` the local date and time to the minute, `aria-label` the long
 * date and the time).
 *
 * - **The time** follows the virtual clock (`useClassicyClockTime` at the
 *   minute's resolution, which also writes the store each minute, as the
 *   menu bar's clock does where it is drawn); `classicyTaskbarClockTime`
 *   formats it.
 * - **Hidden** while the Date & Time control panel hides the clock
 *   (`DateAndTime.show: false`), the store still kept on time.
 * - **The tooltip** is the long date (`classicyTaskbarClockLongDate`), after
 *   500 ms, whatever Balloon Help says, and goes at a press.
 * - **A click** does nothing; **a double-click** opens the Date & Time
 *   control panel.
 * - **Button 2** opens the taskbar's menu at the pointer with Adjust
 *   Date/Time first (`showTaskbarMenu`, the taskbar's own, so its Undo
 *   Minimize All is the one the taskbar's background offers).
 */
export const ClassicyTaskbarClock: FunctionalComponent<{
	/**
	 * Opens the taskbar's menu at a desktop point with leading items
	 * (`useClassicyTaskbarMenu`, from the taskbar that mounts the clock).
	 * Absent, button 2 on the clock opens nothing.
	 */
	showTaskbarMenu?: (
		at: [number, number],
		leading?: readonly ClassicyMenuItem[],
	) => void;
}> = ({ showTaskbarMenu }) => {
	const show = useAppManager((s) => s.System.Manager.DateAndTime.show);
	const militaryTime = useAppManager(
		(s) => s.System.Manager.DateAndTime.militaryTime,
	);
	const local = useClassicyClockTime({ resolution: "minute" });
	const dispatch = useAppManagerDispatch();
	const appIcon =
		useClassicyAsset(
			"icons",
			"controlPanels.dateTimeManager.dateTimeManager",
		) ?? "";

	const time = classicyTaskbarClockTime(local, militaryTime);
	const longDate = classicyTaskbarClockLongDate(local);

	const clockRef = useRef<HTMLTimeElement>(null);
	const { handlers, balloon } = useClassicyBalloonHelp(
		clockRef,
		{ content: longDate, delay: CLASSICY_TASKBAR_TOOLTIP_DELAY_MS },
		{ force: true },
	);

	const openDateAndTime = useCallback(
		() =>
			dispatch({
				type: "ClassicyAppOpen",
				app: {
					id: DATE_AND_TIME_MANAGER_APP_ID,
					name: DATE_AND_TIME_MANAGER_APP_NAME,
					icon: appIcon,
				},
			}),
		[dispatch, appIcon],
	);

	if (!show) return null;

	const onMouseDown = (e: MouseEvent<HTMLElement>) => {
		// A press puts the tooltip away, as Windows' does, and leaves the
		// focus where it is, as the tray's icons do.
		handlers.onMouseLeave();
		if (e.button === 0) e.preventDefault();
	};
	const onContextMenu = (e: MouseEvent<HTMLElement>) => {
		// Never the browser's menu or the desktop's; the taskbar's, led by
		// the clock's own command.
		e.preventDefault();
		handlers.onMouseLeave();
		showTaskbarMenu?.(
			[e.clientX, e.clientY],
			classicyTaskbarClockMenuItems(openDateAndTime),
		);
	};

	return (
		<>
			{/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: <time> has the ARIA 1.2 time role, which takes its name from the author; the label carries the long date, which is otherwise only the pointer's tooltip */}
			<time
				ref={clockRef}
				className="classicyTaskbarClock"
				{...{ [CLASSICY_PART_ATTRIBUTE.part]: "clock" }}
				dateTime={classicyTaskbarClockDateTime(local)}
				aria-label={`${longDate}, ${time}`}
				aria-describedby={handlers["aria-describedby"]}
				onMouseDown={onMouseDown}
				onMouseEnter={handlers.onMouseEnter}
				onMouseLeave={handlers.onMouseLeave}
				onDoubleClick={openDateAndTime}
				onContextMenu={onContextMenu}
			>
				{time}
			</time>
			{balloon}
		</>
	);
};
