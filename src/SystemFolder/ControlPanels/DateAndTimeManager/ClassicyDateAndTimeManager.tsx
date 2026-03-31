import "./ClassicyDateAndTimeManager.scss";
import {
  useAppManager,
  useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindowUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
  quitAppHelper,
  quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyDatePicker } from "@/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicyRadioInput } from "@/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput";
import { ClassicyTimePicker } from "@/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { FC as FunctionalComponent, ChangeEvent, useCallback, useState } from "react";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import appIcon from "@img/icons/control-panels/date-time-manager/date-time-manager.png";

const APP_ID = "DateAndTimeManager.app";
const APP_NAME = "Date and Time Manager";

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

  const [showAbout, setShowAbout] = useState(false);

  const quitApp = () => {
    desktopEventDispatch(quitAppHelper(APP_ID, APP_NAME, appIcon));
  };

  const updateSystemTime = useCallback((updatedDate: Date) => {
    const currentDateTime = useAppManager.getState().System.Manager.DateAndTime.dateTime;
    const date = new Date(currentDateTime);

    let hoursToSet =
      period == "am" ? updatedDate.getHours() : updatedDate.getHours() + 12;
    if (period == "pm" && updatedDate.getHours() == 12) {
      hoursToSet = 0;
    }
    date.setHours(
      hoursToSet,
      updatedDate.getMinutes(),
      updatedDate.getSeconds(),
    );
    desktopEventDispatch({
      type: "ClassicyManagerDateTimeSet",
      dateTime: date,
    });
  }, [period, desktopEventDispatch]);

  const updateSystemDate = (updatedDate: Date) => {
    const date = new Date(dateAndTimeState.dateTime);
    date.setMonth(updatedDate.getMonth());
    date.setDate(updatedDate.getDate());
    date.setFullYear(updatedDate.getFullYear());

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

  const appMenu = [
    {
      id: APP_ID + "_file",
      title: "File",
      menuChildren: [quitMenuItemHelper(APP_ID, APP_NAME, appIcon)],
    },
    {
      id: APP_ID + "_help",
      title: "Help",
      menuChildren: [
        {
          id: APP_ID + "_about",
          title: "About",
          onClickFunc: () => {
            setShowAbout(true);
          },
        },
      ],
    },
  ];

  const date = new Date(dateAndTimeState.dateTime);
  date.setHours(date.getHours() + parseInt(dateAndTimeState.timeZoneOffset));

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
        id={"DateAndTimeManager_1"}
        title={APP_NAME}
        appId={APP_ID}
        icon={appIcon}
        closable={true}
        resizable={false}
        zoomable={false}
        scrollable={false}
        collapsable={false}
        initialSize={[350, 290]}
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
                ></ClassicyDatePicker>
              </ClassicyControlGroup>
            </div>
            <div className={"classicyDateAndTimeManagerTimeColumn"}>
              <ClassicyControlGroup label={"Current Time"}>
                <ClassicyTimePicker
                  id={"time"}
                  labelTitle={""}
                  onChangeFunc={updateSystemTime}
                  prefillValue={date}
                ></ClassicyTimePicker>
              </ClassicyControlGroup>
            </div>
          </div>
          <div className={"classicyDateAndTimeManagerColumn"}>
            <ClassicyControlGroup label={"Timezone"}>
              <ClassicyPopUpMenu
                id={"timezone"}
                small={false}
                options={TIMEZONES}
                onChangeFunc={updateSystemTimeZone}
                selected={dateAndTimeState.timeZoneOffset?.toString()}
              />
            </ClassicyControlGroup>
          </div>
          <div className={"classicyDateAndTimeManagerColumn"}>
            <ClassicyControlGroup label={"Time Format"}>
              <ClassicyRadioInput
                inputs={[
                  {
                    id: "12",
                    label: "12-Hour",
                    checked: true,
                  },
                  {
                    id: "24",
                    label: "Military Time",
                    disabled: true,
                  },
                ]}
                name={"period_selector"}
              />
            </ClassicyControlGroup>
          </div>
          <ClassicyButton isDefault={false} onClickFunc={quitApp}>
            Quit
          </ClassicyButton>
        </div>
      </ClassicyWindow>
      {showAbout
        ? getClassicyAboutWindow({
            appId: APP_ID,
            appName: APP_NAME,
            appIcon,
            hideFunc: () => setShowAbout(false),
          })
        : null}
    </ClassicyApp>
  );
};
