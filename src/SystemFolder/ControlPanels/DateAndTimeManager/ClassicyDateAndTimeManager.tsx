import "./ClassicyDateAndTimeManager.scss";
import {
	type ChangeEvent,
	type FC as FunctionalComponent,
	useCallback,
	useState,
} from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeWindowMenuItemHelper,
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";

const appIcon = ClassicyIcons.controlPanels.dateTimeManager.dateTimeManager;

import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import { ClassicyDatePicker } from "@/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicyRadioInput } from "@/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput";
import { ClassicyTimePicker } from "@/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const APP_ID = "DateAndTimeManager.app";
const APP_NAME = "Date and Time Manager";
const WINDOW_ID = "DateAndTimeManager_1";

const TIME_FORMAT_INPUTS = [
	{ id: "12", label: "12-Hour", checked: true },
	{ id: "24", label: "Military Time", disabled: true },
];

const TIMEZONES = [
	{ label: "Pacific/Midway", value: "-11" },
	{ label: "Pacific/Honolulu", value: "-10" },
	{ label: "America/Anchorage", value: "-8" },
	{ label: "America/Los_Angeles", value: "-7" },
	{ label: "America/Denver", value: "-6" },
	{ label: "America/Chicago", value: "-5" },
	{ label: "America/New_York", value: "-4" },
	{ label: "America/Halifax", value: "-3" },
	{ label: "America/Noronha", value: "-2" },
	{ label: "Atlantic/Cape_Verde", value: "-1" },
	{ label: "Africa/Monrovia", value: "0" },
	{ label: "Europe/London", value: "1" },
	{ label: "Europe/Amsterdam", value: "2" },
	{ label: "Europe/Athens", value: "3" },
	{ label: "Europe/Samara", value: "4" },
	{ label: "Asia/Tashkent", value: "5" },
	{ label: "Asia/Dhaka", value: "6" },
	{ label: "Asia/Bangkok", value: "7" },
	{ label: "Asia/Chongqing", value: "8" },
	{ label: "Asia/Tokyo", value: "9" },
	{ label: "Australia/Brisbane", value: "10" },
	{ label: "Australia/Canberra", value: "11" },
	{ label: "Pacific/Fiji", value: "12" },
	{ label: "Pacific/Auckland", value: "13" },
	{ label: "Pacific/Apia", value: "14" },
];

export const ClassicyDateAndTimeManager: FunctionalComponent = () => {
	const [period, setPeriod] = useState<string>("am");

	const dateAndTimeState = useAppManager(
			(state) => state.System.Manager.DateAndTime,
		),
		desktopEventDispatch = useAppManagerDispatch();

	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		APP_ID,
		APP_NAME,
		appIcon,
	);
	const windowClose = useClassicyWindowClose(APP_ID);

	const quitApp = () => {
		desktopEventDispatch(quitAppHelper(APP_ID, APP_NAME, appIcon));
	};

	const updateSystemTime = useCallback(
		(updatedDate: Date) => {
			const state = useAppManager.getState().System.Manager.DateAndTime;
			const date = new Date(state.dateTime);
			const tzOffset = parseInt(state.timeZoneOffset, 10);

			let hoursToSet =
				period === "am" ? updatedDate.getHours() : updatedDate.getHours() + 12;
			if (period === "pm" && updatedDate.getHours() === 12) {
				hoursToSet = 0;
			}
			// Use UTC methods so the result is timezone-independent of the browser's
			// local timezone. The user's input is in the selected Classicy timezone:
			// local_hour - tzOffset = UTC_hour.
			date.setUTCHours(
				hoursToSet - tzOffset,
				updatedDate.getMinutes(),
				updatedDate.getSeconds(),
				0,
			);
			desktopEventDispatch({
				type: "ClassicyManagerDateTimeSet",
				dateTime: date,
			});
		},
		[period, desktopEventDispatch],
	);

	const updateSystemDate = (updatedDate: Date) => {
		const tzOffset = parseInt(dateAndTimeState.timeZoneOffset, 10);
		const date = new Date(dateAndTimeState.dateTime);
		// The picker displays TZ-adjusted dates; convert back to UTC for storage
		// by temporarily applying the offset, setting date fields, then reverting.
		// Use UTC methods throughout to stay independent of the browser's timezone.
		date.setUTCHours(date.getUTCHours() + tzOffset);
		date.setUTCMonth(updatedDate.getMonth());
		date.setUTCDate(updatedDate.getDate());
		date.setUTCFullYear(updatedDate.getFullYear());
		date.setUTCHours(date.getUTCHours() - tzOffset);

		desktopEventDispatch({
			type: "ClassicyManagerDateTimeSet",
			dateTime: date,
		});
	};

	const updateSystemTimeZone = (e: ChangeEvent<HTMLSelectElement>) => {
		setPeriod(e.target.value);
		desktopEventDispatch({
			type: "ClassicyManagerDateTimeTZSet",
			tzOffset: e.target.value,
		});
	};

	// Mac OS 8 HIG control-panel menu bar (audit ch. 6 §35): Apple / File / Edit.
	// About ideally lives as the first item of the global Apple menu
	// (Desktop.systemMenu), which is outside this panel's editable scope; until a
	// per-app Apple-menu injection point exists it sits at the top of File (out of
	// the old Help menu). TODO(#209): relocate About to the Apple menu.
	//
	// ClassicyMenu renders an <hr> divider only for id === "spacer" and keys by
	// id, so at most one divider per menu.
	const appMenu = [
		{
			id: `${APP_ID}_file`,
			title: "File",
			menuChildren: [
				{ ...aboutMenuItem, title: `About ${APP_NAME}` },
				{
					...closeWindowMenuItemHelper(`${APP_ID}_close_window`, () =>
						windowClose(WINDOW_ID, quitAppHelper(APP_ID, APP_NAME, appIcon)),
					),
					keyboardShortcut: "⌘W",
				},
				{ id: "spacer" },
				{
					...quitMenuItemHelper(APP_ID, APP_NAME, appIcon),
					keyboardShortcut: "⌘Q",
				},
			],
		},
		// Edit menu — this panel has date/time entry fields. Standard HIG Edit
		// commands; wiring to the focused field is tracked by the
		// keyboard-equivalent workstream (display-only for now).
		{
			id: `${APP_ID}_edit`,
			title: "Edit",
			menuChildren: [
				{ id: `${APP_ID}_undo`, title: "Undo", keyboardShortcut: "⌘Z" },
				{ id: "spacer" },
				{ id: `${APP_ID}_cut`, title: "Cut", keyboardShortcut: "⌘X" },
				{ id: `${APP_ID}_copy`, title: "Copy", keyboardShortcut: "⌘C" },
				{ id: `${APP_ID}_paste`, title: "Paste", keyboardShortcut: "⌘V" },
				{ id: `${APP_ID}_clear`, title: "Clear" },
				{
					id: `${APP_ID}_select_all`,
					title: "Select All",
					keyboardShortcut: "⌘A",
				},
			],
		},
	];

	// Shift stored UTC dateTime into the selected Classicy timezone for display.
	// We also counteract the browser's own UTC offset so that date.getHours()
	// (which the pickers use internally) returns the correct Classicy-local hour
	// regardless of which timezone the user's browser is set to.
	const tzOffset = parseInt(dateAndTimeState.timeZoneOffset, 10);
	const date = new Date(
		new Date(dateAndTimeState.dateTime).getTime() +
			tzOffset * 3600000 +
			new Date().getTimezoneOffset() * 60000,
	);

	const adjustToDisplay = (isoString: string): Date =>
		new Date(
			new Date(isoString).getTime() +
				tzOffset * 3600000 +
				new Date().getTimezoneOffset() * 60000,
		);

	const minValue = dateAndTimeState.minDateTime
		? adjustToDisplay(dateAndTimeState.minDateTime)
		: undefined;
	const maxValue = dateAndTimeState.maxDateTime
		? adjustToDisplay(dateAndTimeState.maxDateTime)
		: undefined;

	return (
		<ClassicyApp
			id={APP_ID}
			name={APP_NAME}
			icon={appIcon}
			defaultWindow={"DateAndTimeManager_1"}
			noDesktopIcon={true}
			addSystemMenu={true}
		>
			<ClassicyWindow
				id={WINDOW_ID}
				title={APP_NAME}
				appId={APP_ID}
				icon={appIcon}
				closable={true}
				resizable={false}
				zoomable={false}
				scrollable={false}
				collapsable={false}
				initialSize={[350, 265]}
				initialPosition={[300, 50]}
				modal={false}
				appMenu={appMenu}
			>
				<div className={"classicyDateAndTimeManagerContent"}>
					<div className={"classicyDateAndTimeManagerRow"}>
						<div className={"classicyDateAndTimeManagerDateColumn"}>
							<ClassicyControlGroup label={"Current Date"}>
								<ClassicyDatePicker
									id={"date"}
									labelTitle={""}
									prefillValue={date}
									onChangeFunc={updateSystemDate}
									minValue={minValue}
									maxValue={maxValue}
									disabled={dateAndTimeState.dateTimeLocked}
								></ClassicyDatePicker>
							</ClassicyControlGroup>
						</div>
						<div className={"classicyDateAndTimeManagerTimeColumn"}>
							<ClassicyControlGroup label={"Current Time"}>
								<ClassicyTimePicker
									id={"time"}
									labelTitle={""}
									labelPosition="left"
									onChangeFunc={updateSystemTime}
									prefillValue={date}
									minValue={minValue}
									maxValue={maxValue}
									disabled={dateAndTimeState.dateTimeLocked}
								></ClassicyTimePicker>
							</ClassicyControlGroup>
						</div>
					</div>
					<div className={"classicyDateAndTimeManagerColumn"}>
						<ClassicyControlGroup label={"Timezone"}>
							<ClassicyPopUpMenu
								id={"timezone"}
								options={TIMEZONES}
								onChangeFunc={updateSystemTimeZone}
								selected={dateAndTimeState.timeZoneOffset?.toString()}
							/>
						</ClassicyControlGroup>
					</div>
					<div className={"classicyDateAndTimeManagerColumn"}>
						<ClassicyControlGroup label={"Time Format"}>
							<ClassicyRadioInput
								inputs={TIME_FORMAT_INPUTS}
								name={"period_selector"}
							/>
						</ClassicyControlGroup>
					</div>
					<ClassicyButton isDefault={false} onClickFunc={quitApp}>
						Quit
					</ClassicyButton>
				</div>
			</ClassicyWindow>
			{aboutWindow}
		</ClassicyApp>
	);
};
