import classicyDesktopMenuWidgetTimeStyles from '@/app/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.module.scss'
import classicyMenuStyles from '@/app/SystemFolder/SystemResources/Menu/ClassicyMenu.module.scss'
import classNames from 'classnames'
import React from 'react'
import { useDesktop, useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'

type ClassicyDesktopMenuWidgetTimeProps = {
    hide?: boolean
    militaryTime?: boolean
    displaySeconds?: boolean
    displayPeriod?: boolean
    displayDay?: boolean
    displayLongDay?: boolean
    flashSeparators?: boolean
}

const ClassicyDesktopMenuWidgetTime: React.FC<ClassicyDesktopMenuWidgetTimeProps> = ({
    hide = false,
    militaryTime = false,
    displaySeconds = false,
    displayPeriod = true,
    displayDay = true,
    displayLongDay = false,
    flashSeparators = true,
}) => {
    const desktopContext = useDesktop()
    const desktopEventDispatch = useDesktopDispatch()

    const [time, setTime] = React.useState({
        day: new Date(desktopContext.System.Manager.DateAndTime.dateTime).getUTCDay(),
        minutes: new Date(desktopContext.System.Manager.DateAndTime.dateTime).getUTCMinutes(),
        hours: new Date(desktopContext.System.Manager.DateAndTime.dateTime).getUTCHours(),
        seconds: new Date(desktopContext.System.Manager.DateAndTime.dateTime).getUTCSeconds(),
        period: new Date(desktopContext.System.Manager.DateAndTime.dateTime).getUTCHours() > 12 ? ' PM' : ' AM',
    })

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    React.useEffect(() => {
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
                day: localDate.getDay(),
                minutes: localDate.getMinutes(),
                hours: localDate.getHours() === 0 ? 12 : localDate.getHours(),
                seconds: localDate.getSeconds(),
                period: localDate.getHours() > 12 ? ' PM' : ' AM',
            })
        }, 1000)

        return () => clearInterval(intervalId)
    }, [])

    const convertToTwoDigit = (num) => {
        return num.toLocaleString('en-US', {
            minimumIntegerDigits: 2,
        })
    }

    const convertTo12HourPeriod = (num) => {
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
            return classicyDesktopMenuWidgetTimeStyles.textBlinker
        }

        return
    }

    const openDateTimeManager = () => {
        desktopEventDispatch({
            type: 'ClassicyAppOpen',
            app: {
                id: 'DateAndTimeManager.app',
                name: 'Date and Time Manager',
                icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/control-panels/date-time-manager/date-time-manager.png`,
            },
        })
    }

    return (
        <>
            {!hide && (
                <li
                    className={classNames(
                        classicyMenuStyles.classicyMenuItem,
                        classicyMenuStyles.classicyMenuItemNoImage,
                        classicyDesktopMenuWidgetTimeStyles.classicyDesktopMenuTime
                    )}
                    onDoubleClick={openDateTimeManager}
                >
                    {displayDay && (
                        <span>{displayLongDay ? daysOfWeek[time.day] : daysOfWeek[time.day].slice(0, 3)}&nbsp;</span>
                    )}
                    <span> {militaryTime ? convertToTwoDigit(time.hours) : convertTo12HourPeriod(time.hours)}</span>
                    <span>
                        <span className={displaySeconds ? '' : toBlink()}>:</span>
                        {convertToTwoDigit(time.minutes)}
                    </span>
                    {displaySeconds && (
                        <span>
                            <span className={toBlink()}>:</span>
                            {convertToTwoDigit(time.seconds)}
                        </span>
                    )}
                    {!militaryTime && displayPeriod && <span>&nbsp;{time.hours >= 12 ? 'PM' : 'AM'}</span>}
                </li>
            )}
        </>
    )
}

export default ClassicyDesktopMenuWidgetTime
