import ClassicyApp from '@/app/SystemFolder/SystemResources/App/ClassicyApp'
import { quitAppHelper } from '@/app/SystemFolder/SystemResources/App/ClassicyAppUtils'
import { useDesktop, useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import ClassicyWindow from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow'
import React, { ReactElement, useMemo, useState } from 'react'
import epgStyles from './EPG.module.scss'
import ClassicyButton from '@/app/SystemFolder/SystemResources/Button/ClassicyButton'
import classNames from 'classnames'

interface ClassicyEPGProps {
    minutesPerGrid?: number // Minutes
    gridTimeWidth?: number // Minutes
    gridWidth?: number // Minutes
    gridStart?: Date
    channelHeaderWidth?: number
}

export type EPGProgram = {
    title: string
    description?: string
    notes?: string
    start: number
    end: number
    icons?: string[]
    selected?: boolean
}

export type EPGChannel = {
    name: string
    title?: string
    number: string
    callsign: string
    location: string
    icon: string
    grid: EPGProgram[]
}

function roundDownToNearestMinuntes(date: Date, roundMinutes: number) {
    const minutes = date.getMinutes()
    date.setMinutes(minutes - (minutes % roundMinutes), 0, 0)
    return date
}

const EPG: React.FC<ClassicyEPGProps> = ({
    minutesPerGrid = 5,
    gridTimeWidth = 30,
    gridWidth = 180,
    gridStart,
    channelHeaderWidth = 5,
}) => {
    const appName = 'EPG'
    const appId = 'EPG.app'
    const appIcon = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/folders/directory.png`

    const desktopEventDispatch = useDesktopDispatch()
    const desktop = useDesktop()

    if (!gridStart) {
        const gs = new Date(desktop.System.Manager.DateAndTime.dateTime)
        gs.setHours(gs.getHours() + parseInt(desktop.System.Manager.DateAndTime.timeZoneOffset))
        gridStart = gs
    }

    const [gridStartTime, setGridStartTime] = useState(roundDownToNearestMinuntes(gridStart, gridTimeWidth))

    const quitApp = () => {
        desktopEventDispatch(quitAppHelper(appId, appName, appIcon))
    }

    const testClick = (e) => {
        alert(e.target.id)
    }

    const appMenu = [
        {
            id: 'file',
            title: 'File',
            menuChildren: [
                {
                    id: appId + '_quit',
                    title: 'Quit',
                    onClickFunc: quitApp,
                },
            ],
        },
    ]

    const gridData = [
        {
            name: 'ABC',
            number: '3',
            callsign: 'WABC',
            location: 'New York, NY',
            icon: 'wjla.png',
            grid: [
                {
                    title: 'Seinfeld',
                    description: 'The Marine Biologist',
                    start: Date.parse('2001-09-11T11:00:00Z'),
                    end: Date.parse('2001-09-11T11:30:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Seinfeld',
                    description: 'The Puffy Shirt',
                    start: Date.parse('2001-09-11T11:30:00Z'),
                    end: Date.parse('2001-09-11T12:00:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: true,
                },
                {
                    title: 'Seinfeld',
                    description: 'The Contest',
                    start: Date.parse('2001-09-11T12:00:00Z'),
                    end: Date.parse('2001-09-11T12:30:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Seinfeld',
                    description: 'The Opposite',
                    start: Date.parse('2001-09-11T12:30:00Z'),
                    end: Date.parse('2001-09-11T13:00:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Seinfeld',
                    description: 'Soup Nazi',
                    start: Date.parse('2001-09-11T13:00:00Z'),
                    end: Date.parse('2001-09-11T13:30:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Robocop',
                    description: '(1987)',
                    start: Date.parse('2001-09-11T13:30:00Z'),
                    end: Date.parse('2001-09-11T15:30:00Z'),
                    icons: ['mpaa-r.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Robocop 2',
                    description: '(1990)',
                    start: Date.parse('2001-09-11T15:30:00Z'),
                    end: Date.parse('2001-09-11T17:30:00Z'),
                    icons: ['mpaa-r.png', 'cc.png'],
                    selected: false,
                },
            ],
        },
        {
            name: 'CBS',
            number: '3',
            callsign: 'WABC',
            location: 'New York, NY',
            icon: 'wjla.png',
            grid: [
                {
                    title: 'Seinfeld',
                    description: 'The Marine Biologist',
                    start: Date.parse('2001-09-11T11:00:00Z'),
                    end: Date.parse('2001-09-11T12:00:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: true,
                },
                {
                    title: 'Seinfeld',
                    description: 'The Opposite',
                    start: Date.parse('2001-09-11T12:30:00Z'),
                    end: Date.parse('2001-09-11T13:00:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Seinfeld',
                    description: 'Soup Nazi',
                    start: Date.parse('2001-09-11T13:00:00Z'),
                    end: Date.parse('2001-09-11T13:30:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Robocop',
                    description: '(1987)',
                    start: Date.parse('2001-09-11T13:30:00Z'),
                    end: Date.parse('2001-09-11T15:30:00Z'),
                    icons: ['mpaa-r.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Robocop 2',
                    description: '(1990)',
                    start: Date.parse('2001-09-11T15:30:00Z'),
                    end: Date.parse('2001-09-11T17:30:00Z'),
                    icons: ['mpaa-r.png', 'cc.png'],
                    selected: false,
                },
            ],
        },
        {
            name: 'NBC',
            number: '3',
            callsign: 'WABC',
            location: 'New York, NY',
            icon: 'wjla.png',
            grid: [
                {
                    title: 'Seinfeld',
                    description: 'The Marine Biologist',
                    start: Date.parse('2001-09-11T11:00:00Z'),
                    end: Date.parse('2001-09-11T11:30:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Seinfeld',
                    description: 'The Puffy Shirt',
                    start: Date.parse('2001-09-11T11:30:00Z'),
                    end: Date.parse('2001-09-11T12:00:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: true,
                },
                {
                    title: 'Seinfeld',
                    description: 'The Contest',
                    start: Date.parse('2001-09-11T12:00:00Z'),
                    end: Date.parse('2001-09-11T12:30:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Seinfeld',
                    description: 'The Opposite',
                    start: Date.parse('2001-09-11T12:30:00Z'),
                    end: Date.parse('2001-09-11T13:00:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Seinfeld',
                    description: 'Soup Nazi',
                    start: Date.parse('2001-09-11T13:00:00Z'),
                    end: Date.parse('2001-09-11T13:30:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Robocop',
                    description: '(1987)',
                    start: Date.parse('2001-09-11T13:30:00Z'),
                    end: Date.parse('2001-09-11T15:30:00Z'),
                    icons: ['mpaa-r.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Robocop 2',
                    description: '(1990)',
                    start: Date.parse('2001-09-11T15:30:00Z'),
                    end: Date.parse('2001-09-11T17:30:00Z'),
                    icons: ['mpaa-r.png', 'cc.png'],
                    selected: false,
                },
            ],
        },
        {
            name: 'FOX',
            number: '3',
            callsign: 'WABC',
            location: 'New York, NY',
            icon: 'wjla.png',
            grid: [
                {
                    title: 'Seinfeld',
                    description: 'The Marine Biologist',
                    start: Date.parse('2001-09-11T11:00:00Z'),
                    end: Date.parse('2001-09-11T11:30:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Seinfeld',
                    description: 'The Puffy Shirt',
                    start: Date.parse('2001-09-11T11:30:00Z'),
                    end: Date.parse('2001-09-11T12:00:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: true,
                },
                {
                    title: 'Seinfeld',
                    description: 'The Contest',
                    start: Date.parse('2001-09-11T12:00:00Z'),
                    end: Date.parse('2001-09-11T12:30:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Seinfeld',
                    description: 'The Opposite',
                    start: Date.parse('2001-09-11T12:30:00Z'),
                    end: Date.parse('2001-09-11T13:00:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Seinfeld',
                    description: 'Soup Nazi',
                    start: Date.parse('2001-09-11T13:00:00Z'),
                    end: Date.parse('2001-09-11T13:30:00Z'),
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Robocop',
                    description: '(1987)',
                    start: Date.parse('2001-09-11T13:30:00Z'),
                    end: Date.parse('2001-09-11T15:30:00Z'),
                    icons: ['mpaa-r.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Robocop 2',
                    description: '(1990)',
                    start: Date.parse('2001-09-11T15:30:00Z'),
                    end: Date.parse('2001-09-11T17:30:00Z'),
                    icons: ['mpaa-r.png', 'cc.png'],
                    selected: false,
                },
            ],
        },
    ] as EPGChannel[]

    const getProgramData = (channel: EPGChannel, channelIndex: number) => {
        return channel.grid.map((gridItem) => {
            gridItem.start = Math.max(gridItem.start, gridStartTime.getTime())

            const totalGridSlots = gridWidth / minutesPerGrid

            let gridProgramStart = (gridItem.start - gridStartTime.getTime()) / 60 / 1000 / minutesPerGrid + 2
            let gridProgramEnd = (gridItem.end - gridItem.start) / 60 / 1000 / minutesPerGrid
            const currentTime = new Date(desktop.System.Manager.DateAndTime.dateTime)
            currentTime.setHours(currentTime.getHours() + parseInt(desktop.System.Manager.DateAndTime.timeZoneOffset))
            const highlight = new Date(gridItem.start) <= currentTime && new Date(gridItem.end) >= currentTime

            if (gridProgramStart > totalGridSlots || gridProgramEnd <= 0) {
                return
            }
            if (gridProgramStart < 0) {
                gridProgramStart = 2
            }
            if (gridProgramEnd > gridWidth / minutesPerGrid) {
                gridProgramEnd = totalGridSlots
            }

            return (
                <div
                    key={channel.name + gridItem.start + gridItem.end}
                    className={classNames(epgStyles.epgEntry, highlight ? epgStyles.selected : undefined)}
                    style={{
                        gridRowStart: channelIndex + 2,
                        gridColumn: gridProgramStart + '/ span ' + gridProgramEnd,
                    }}
                >
                    <div className={epgStyles.epgEntryTitle}>
                        {gridItem.title}
                        <div className={epgStyles.epgEntryDescription}>{gridItem.description}</div>
                    </div>
                    <div className={epgStyles.epgEntryIcons}>
                        {gridItem.icons?.map((icon) => {
                            return (
                                <img
                                    key={channel.name + gridItem.start + gridItem.end + icon}
                                    className={epgStyles.epgEntryIcon}
                                    src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/applications/epg/${icon}`}
                                    alt={icon}
                                />
                            )
                        })}
                    </div>
                </div>
            )
        })
    }

    const epgHeader = useMemo(() => {
        let headers: ReactElement[] = [
            <div
                key={'column_header_date'}
                className={epgStyles.epgHeaderTime}
                style={{
                    gridColumn: `1 / span 1`,
                }}
            >
                {gridStartTime.toLocaleDateString([], { month: 'numeric', day: 'numeric', year: 'numeric' })}
            </div>,
        ]
        for (let i = 1; i <= gridWidth / minutesPerGrid; i += gridTimeWidth / minutesPerGrid) {
            const d = new Date(gridStartTime.getTime() + (i - 1) * minutesPerGrid * 60000)
            headers.push(
                <div
                    key={d.toLocaleTimeString()}
                    className={epgStyles.epgHeaderTime}
                    onDoubleClick={testClick}
                    style={{
                        gridColumn: `${i + 1} / span ${minutesPerGrid + 1}`,
                    }}
                >
                    <div className={epgStyles.epgHeaderTimeInner}>
                        {d.toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                        })}
                    </div>
                </div>
            )
        }
        return headers
    }, [
        gridStartTime,
        gridWidth,
        minutesPerGrid,
        gridTimeWidth,
        desktop.System.Manager.DateAndTime.dateTime,
        desktop.System.Manager.DateAndTime.timeZoneOffset,
    ])

    const epgData = useMemo(() => {
        return gridData.map((channel, channelIndex) => {
            return (
                <>
                    <div
                        key={channel.name + channelIndex}
                        className={epgStyles.epgChannel}
                        style={{ gridRowStart: channelIndex + 2, gridColumnStart: 1, gridColumnEnd: 2 }}
                    >
                        <img
                            className={epgStyles.epgChannelIcon}
                            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/applications/epg/channels/${channel.icon}`}
                            alt={channel.number + ' ' + channel.callsign + ' - ' + channel.location}
                        />
                        {channel.name}
                    </div>
                    {getProgramData(channel, channelIndex)}
                </>
            )
        })
    }, [gridStartTime, desktop.System.Manager.DateAndTime.dateTime])

    const jumpBack = () => {
        setGridStartTime(new Date(gridStartTime.getTime() - 30 * 60 * 1000))
    }

    const jumpForward = () => {
        setGridStartTime(new Date(gridStartTime.getTime() + 30 * 60 * 1000))
    }

    const jumpToNow = () => {
        const currentTime = new Date(desktop.System.Manager.DateAndTime.dateTime)
        currentTime.setHours(currentTime.getHours() + parseInt(desktop.System.Manager.DateAndTime.timeZoneOffset))
        setGridStartTime(roundDownToNearestMinuntes(currentTime, gridTimeWidth))
    }
    const currentDate = new Date(desktop.System.Manager.DateAndTime.dateTime)
    currentDate.setHours(currentDate.getHours() + parseInt(desktop.System.Manager.DateAndTime.timeZoneOffset))

    return (
        <>
            <ClassicyApp id={appId} name={appName} icon={appIcon} defaultWindow={'demo'}>
                <ClassicyWindow
                    id={'demo2'}
                    title={appName}
                    appId={appId}
                    closable={true}
                    resizable={true}
                    zoomable={true}
                    scrollable={true}
                    collapsable={true}
                    initialSize={[800, 400]}
                    initialPosition={[300, 50]}
                    minimumSize={[600, 300]}
                    modal={false}
                    appMenu={appMenu}
                >
                    <div className={epgStyles.epgHolder}>
                        <div
                            className={epgStyles.epgGridSetup}
                            style={{
                                gridTemplateColumns: `${channelHeaderWidth}fr repeat(${gridWidth / minutesPerGrid}, 1fr)`,
                                backgroundColor: 'var(--color-white)',
                            }}
                        >
                            {epgHeader}
                        </div>
                        <div
                            className={classNames([
                                epgStyles.epgGridSetup,
                                epgStyles.epgGridSetupBorder,
                                epgStyles.epgGridAnimatedBackground,
                            ])}
                            style={{
                                gridTemplateColumns: `${channelHeaderWidth}fr repeat(${gridWidth / minutesPerGrid}, 1fr)`,
                                backgroundImage: `url(${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/ui/stripe.svg)`,
                            }}
                        >
                            {epgData}
                        </div>
                        <div>
                            <ClassicyButton onClickFunc={jumpBack}>&lt;&lt;</ClassicyButton>
                            <ClassicyButton onClickFunc={jumpForward}>&gt;&gt;</ClassicyButton>
                            <ClassicyButton onClickFunc={jumpToNow}>Now</ClassicyButton>
                        </div>
                    </div>
                </ClassicyWindow>
            </ClassicyApp>
        </>
    )
}

export default EPG
