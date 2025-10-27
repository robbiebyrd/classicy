import './ClassicyDesktopMenuWidgetTime.scss'
import '@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss'
import {useDesktop, useDesktopDispatch} from '@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import classNames from 'classnames'
import appIcon from 'img/icons/control-panels/date-time-manager/date-time-manager.png'
import React, {useEffect, useState} from 'react'

export const ClassicyDesktopMenuWidgetTime: React.FC = ({}) => {
    const desktopContext = useDesktop()
    const desktopEventDispatch = useDesktopDispatch()

    const {show, militaryTime, displaySeconds, displayPeriod, displayDay, displayLongDay, flashSeparators} =
        desktopContext.System.Manager.DateAndTime

    const [showingTime, setShowingTime] = useState(true)

    const [time, setTime] = useState({
        year: new Date(desktopContext.System.Manager.DateAndTime.dateTime).getFullYear(),
        month: new Date(desktopContext.System.Manager.DateAndTime.dateTime).getMonth(),
        date: new Date(desktopContext.System.Manager.DateAndTime.dateTime).getDate(),
        day: new Date(desktopContext.System.Manager.DateAndTime.dateTime).getUTCDay(),
        minutes: new Date(desktopContext.System.Manager.DateAndTime.dateTime).getUTCMinutes(),
        hours: new Date(desktopContext.System.Manager.DateAndTime.dateTime).getUTCHours(),
        seconds: new Date(desktopContext.System.Manager.DateAndTime.dateTime).getUTCSeconds(),
        period: new Date(desktopContext.System.Manager.DateAndTime.dateTime).getUTCHours() > 12 ? ' PM' : ' AM',
    })

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    useEffect(() => {
        const intervalId = setInterval(() => {
            const date = new Date(desktopContext.System.Manager.DateAndTime.dateTime)
            date.setSeconds(date.getSeconds() + 1)
            desktopEventDispatch({
                type: 'ClassicyManagerDateTimeSet',
                dateTime: date,
            })

            const localDate = new Date(date.toISOString())
            localDate.setHours(
                localDate.getHours() + parseInt(desktopContext.System.Manager.DateAndTime.timeZoneOffset)
            )
            setTime({
                year: localDate.getFullYear(),
                month: localDate.getMonth(),
                date: localDate.getDate(),
                day: localDate.getDay(),
                minutes: localDate.getMinutes(),
                hours: localDate.getHours() === 0 ? 12 : localDate.getHours(),
                seconds: localDate.getSeconds(),
                period: localDate.getHours() < 12 ? ' AM' : ' PM',
            })
        }, 1000)

        return () => clearInterval(intervalId)
    }, [])

    const convertToTwoDigit = (num: number) => {
        return num.toLocaleString('en-US', {
            minimumIntegerDigits: 2,
        })
    }

    const convertTo12HourPeriod = (num: number) => {
        if (num > 12) {
            return num - 12
        }
        if (num == 0) {
            return 12
        }
        return num
    }

    const toBlink = () => {
        if (flashSeparators) {
            return "textBlinker"
        }

        return
    }

    const openDateTimeManager = () => {
        desktopEventDispatch({
            type: 'ClassicyAppOpen',
            app: {
                id: 'DateAndTimeManager.app',
                name: 'Date and Time Manager',
                icon: appIcon,
            },
        })
    }

    return (
        <>
            {show && (
                <li
                    className={classNames(
                        "classicyMenuItem",
                        "classicyMenuItemNoImage",
                        "classicyDesktopMenuTime"
                    )}
                    onDoubleClick={openDateTimeManager}
                    onClick={() => {setShowingTime(!showingTime)}}
                >
                    {showingTime ? (
                        <div>
                            {displayDay && (
                                <span className={"classicyDesktopMenuTimeSeparatorRight"}>
                            {displayLongDay ? daysOfWeek[time.day] : daysOfWeek[time.day].slice(0, 3)}
                        </span>
                            )}
                            <span> {militaryTime ? convertToTwoDigit(time.hours) : convertTo12HourPeriod(time.hours)}</span>
                            <span>
                        <span className={displaySeconds ? '' : toBlink()}>:</span>
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
                            <span> {time.month}/{time.day}/{time.year}</span>
                        </div>
                    )}
                </li>
            )}
        </>
    )
}
