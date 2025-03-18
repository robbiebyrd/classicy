import ClassicyApp from '@/app/SystemFolder/SystemResources/App/ClassicyApp'
import { quitAppHelper } from '@/app/SystemFolder/SystemResources/App/ClassicyAppUtils'
import { useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import ClassicyWindow from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow'
import React, { useMemo, useState } from 'react'
import epgStyles from './EPG.module.scss'
import ClassicyButton from '@/app/SystemFolder/SystemResources/Button/ClassicyButton'

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
    gridStart = new Date(),
    channelHeaderWidth = 6,
}) => {
    gridStart = new Date('2001-09-11T11:00:00Z')
    const [gridStartTime, setGridStartTime] = useState(roundDownToNearestMinuntes(gridStart, gridTimeWidth))

    const appName = 'EPG'
    const appId = 'EPG.app'
    const appIcon = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/folders/directory.png`

    const desktopEventDispatch = useDesktopDispatch()
    const [appContext] = React.useState({})

    const quitApp = () => {
        desktopEventDispatch(quitAppHelper(appId, appName, appIcon))
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
                    end: Date.parse('2001-09-11T12:30:00Z'),
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
                    className={epgStyles.epgEntry + (gridItem.selected ? ' ' + epgStyles.selected : '')}
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
        let headers: React.ReactElement[] = []
        for (let i = 1; i <= gridWidth / minutesPerGrid; i += gridTimeWidth / minutesPerGrid) {
            const d = new Date(gridStartTime.getTime() + (i - 1) * minutesPerGrid * 60000)
            headers.push(
                <div
                    className={epgStyles.epgHeaderTime}
                    style={{
                        gridColumn: `${i + 1} / span ${minutesPerGrid}`,
                    }}
                >
                    {d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                </div>
            )
        }
        return headers
    }, [gridStartTime])

    const epgData = useMemo(() => {
        return gridData.map((channel, channelIndex) => {
            return (
                <>
                    <div
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
    }, [gridStartTime])

    const jumpBack = () => {
        setGridStartTime(new Date(gridStartTime.getTime() - 30 * 60 * 1000))
    }

    const jumpForward = () => {
        setGridStartTime(new Date(gridStartTime.getTime() + 30 * 60 * 1000))
    }

    return (
        <>
            <ClassicyApp id={appId} name={appName} icon={appIcon} defaultWindow={'demo'} appContext={appContext}>
                <ClassicyWindow
                    id={'demo2'}
                    title={appName}
                    appId={appId}
                    closable={true}
                    resizable={true}
                    zoomable={true}
                    scrollable={true}
                    collapsable={true}
                    initialSize={[800, 500]}
                    initialPosition={[300, 50]}
                    minimumSize={[600, 300]}
                    modal={false}
                    appMenu={appMenu}
                >
                    <div style={{ height: '100%', width: '100%' }}>
                        <div
                            className={epgStyles.epgGridSetup}
                            style={{
                                gridTemplateColumns: `${channelHeaderWidth}fr repeat(${gridWidth / minutesPerGrid}, 1fr)`,
                            }}
                        >
                            {epgHeader}
                            {epgData}
                            <div style={{ gridRowStart: 99 }}>
                                <ClassicyButton onClick={jumpBack}>&lt;&lt;</ClassicyButton>
                                <ClassicyButton onClick={jumpForward}>&gt;&gt;</ClassicyButton>
                            </div>
                        </div>
                    </div>
                </ClassicyWindow>
            </ClassicyApp>
        </>
    )
}

export default EPG
