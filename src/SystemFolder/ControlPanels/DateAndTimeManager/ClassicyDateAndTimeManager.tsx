'use client'

import {ActionMessage, ClassicyStore} from '@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager'
import { useDesktop, useDesktopDispatch } from '@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import { getClassicyAboutWindow } from '@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow'
import {ClassicyApp} from '@/SystemFolder/SystemResources/App/ClassicyApp'
import { quitAppHelper, quitMenuItemHelper } from '@/SystemFolder/SystemResources/App/ClassicyAppUtils'
import {ClassicyButton} from '@/SystemFolder/SystemResources/Button/ClassicyButton'
import {ClassicyDatePicker} from '@/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker'
import {ClassicyPopUpMenu} from '@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu'
import {ClassicyRadioInput} from '@/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput'
import {ClassicyTimePicker} from '@/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker'
import {ClassicyWindow} from '@/SystemFolder/SystemResources/Window/ClassicyWindow'
import React, { ChangeEvent, useState } from 'react'
import {ClassicyControlGroup} from '../../SystemResources/ControlGroup/ClassicyControlGroup'
import appIcon from 'img/icons/control-panels/date-time-manager/date-time-manager.png'

export const ClassicyDateAndTimeManager: React.FC = () => {
    const appName: string = 'Date and Time Manager'
    const appId: string = 'DateAndTimeManager.app'

    const [period, setPeriod] = useState<string>('am')

    const desktopContext = useDesktop(),
        desktopEventDispatch = useDesktopDispatch()

    const [showAbout, setShowAbout] = useState(false)

    const quitApp = () => {
        desktopEventDispatch(quitAppHelper(appId, appName, appIcon))
    }

    const updateSystemTime = (updatedDate: Date) => {
        const date = new Date(desktopContext.System.Manager.DateAndTime.dateTime)

        let hoursToSet = period == 'am' ? updatedDate.getHours() : updatedDate.getHours() + 12
        if (period == 'pm' && updatedDate.getHours() == 12) {
            hoursToSet = 0
        }
        date.setHours(hoursToSet, updatedDate.getMinutes(), updatedDate.getSeconds())
        desktopEventDispatch({
            type: 'ClassicyManagerDateTimeSet',
            dateTime: date,
        })
    }

    const updateSystemDate = (updatedDate: Date) => {
        const date = new Date(desktopContext.System.Manager.DateAndTime.dateTime)
        date.setMonth(updatedDate.getMonth())
        date.setDate(updatedDate.getDate())
        date.setFullYear(updatedDate.getFullYear())

        desktopEventDispatch({
            type: 'ClassicyManagerDateTimeSet',
            dateTime: date,
        })
    }

    const updateSystemTimeZone = (e: ChangeEvent<HTMLSelectElement>) => {
        setPeriod(e.target.value)
        desktopEventDispatch({
            type: 'ClassicyManagerDateTimeTZSet',
            tzOffset: e.target.value,
        })
    }

    const appMenu = [
        {
            id: appId + '_file',
            title: 'File',
            menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
        },
        {
            id: appId + '_help',
            title: 'Help',
            menuChildren: [
                {
                    id: appId + '_about',
                    title: 'About',
                    onClickFunc: () => {
                        setShowAbout(true)
                    },
                },
            ],
        },
    ]

    const timezones = [
        {
            label: 'Pacific/Midway',
            value: '-11',
        },
        {
            label: 'Pacific/Honolulu',
            value: '-10',
        },
        {
            label: 'America/Anchorage',
            value: '-8',
        },
        {
            label: 'America/Los_Angeles',
            value: '-7',
        },
        {
            label: 'America/Denver',
            value: '-6',
        },
        {
            label: 'America/Chicago',
            value: '-5',
        },
        {
            label: 'America/New_York',
            value: '-4',
        },
        {
            label: 'America/Halifax',
            value: '-3',
        },
        {
            label: 'America/Noronha',
            value: '-2',
        },
        {
            label: 'Atlantic/Cape_Verde',
            value: '-1',
        },
        {
            label: 'Africa/Monrovia',
            value: '0',
        },
        {
            label: 'Europe/London',
            value: '1',
        },
        {
            label: 'Europe/Amsterdam',
            value: '2',
        },
        {
            label: 'Europe/Athens',
            value: '3',
        },
        {
            label: 'Europe/Samara',
            value: '4',
        },
        {
            label: 'Asia/Tashkent',
            value: '5',
        },
        {
            label: 'Asia/Dhaka',
            value: '6',
        },
        {
            label: 'Asia/Bangkok',
            value: '7',
        },
        {
            label: 'Asia/Chongqing',
            value: '8',
        },
        {
            label: 'Asia/Tokyo',
            value: '9',
        },
        {
            label: 'Australia/Brisbane',
            value: '10',
        },
        {
            label: 'Australia/Canberra',
            value: '11',
        },
        {
            label: 'Pacific/Fiji',
            value: '12',
        },
        {
            label: 'Pacific/Auckland',
            value: '13',
        },
        {
            label: 'Pacific/Apia',
            value: '14',
        },
    ]

    const date = new Date(desktopContext.System.Manager.DateAndTime.dateTime)
    date.setHours(date.getHours() + parseInt(desktopContext.System.Manager.DateAndTime.timeZoneOffset))

    return (
        <ClassicyApp
            id={appId}
            name={appName}
            icon={appIcon}
            defaultWindow={'DateAndTimeManager_1'}
            openOnBoot={true}
            noDesktopIcon={true}
            addSystemMenu={true}
        >
            <ClassicyWindow
                id={'DateAndTimeManager_1'}
                title={appName}
                appId={appId}
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
                <div
                    style={{
                        backgroundColor: 'var(--color-system-03)',
                        height: '100%',
                        width: '100%',
                        padding: 'var(--window-padding-size)',
                        boxSizing: 'border-box',
                    }}
                >
                    <div style={{ display: 'flex', flexDirection: 'row' }}>
                        <div style={{ width: '42%' }}>
                            <ClassicyControlGroup label={'Current Date'}>
                                <ClassicyDatePicker
                                    id={'date'}
                                    labelTitle={''}
                                    prefillValue={date}
                                    onChangeFunc={updateSystemDate}
                                ></ClassicyDatePicker>
                            </ClassicyControlGroup>
                        </div>
                        <div style={{ width: '58%' }}>
                            <ClassicyControlGroup label={'Current Time'}>
                                <ClassicyTimePicker
                                    id={'time'}
                                    labelTitle={''}
                                    onChangeFunc={updateSystemTime}
                                    prefillValue={date}
                                ></ClassicyTimePicker>
                            </ClassicyControlGroup>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <ClassicyControlGroup label={'Timezone'}>
                            <ClassicyPopUpMenu
                                id={'timezone'}
                                small={false}
                                options={timezones}
                                onChangeFunc={updateSystemTimeZone}
                                selected={desktopContext.System.Manager.DateAndTime.timeZoneOffset?.toString()}
                            />
                        </ClassicyControlGroup>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <ClassicyControlGroup label={'Time Format'}>
                            <ClassicyRadioInput
                                inputs={[
                                    {
                                        id: '12',
                                        label: '12-Hour',
                                        checked: true,
                                    },
                                    {
                                        id: '24',
                                        label: 'Military Time',
                                        disabled: true,
                                    },
                                ]}
                                name={'period_selector'}
                            />
                        </ClassicyControlGroup>
                    </div>
                    <ClassicyButton isDefault={false} onClickFunc={quitApp}>
                        Quit
                    </ClassicyButton>
                </div>
            </ClassicyWindow>
            {showAbout && getClassicyAboutWindow({ appId, appName, appIcon, hideFunc: () => setShowAbout(false) })}
        </ClassicyApp>
    )
}

export const classicyDateTimeManagerEventHandler = (ds: ClassicyStore, action: ActionMessage) => {
    switch (action.type) {
        case 'ClassicyManagerDateTimeSet': {
            const t = action.dateTime
            t.setHours(action.dateTime.getHours())
            ds.System.Manager.DateAndTime.dateTime = t.toISOString()
            break
        }
        case 'ClassicyManagerDateTimeTZSet': {
            ds.System.Manager.DateAndTime.timeZoneOffset = action.tzOffset
            break
        }
    }
    return ds
}
