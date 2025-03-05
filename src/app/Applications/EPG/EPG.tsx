import ClassicyApp from '@/app/SystemFolder/SystemResources/App/ClassicyApp'
import { quitAppHelper } from '@/app/SystemFolder/SystemResources/App/ClassicyAppUtils'
import { useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import ClassicyWindow from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow'
import React from 'react'
import epgStyles from './EPG.module.scss'

const EPG: React.FC = () => {
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
                    description: 'Soup Nazi',
                    start: 1,
                    end: 7,
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: true,
                },
                {
                    title: 'Robocop',
                    description: 'Soup Nazi',
                    start: 7,
                    end: 25,
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: false,
                },
                {
                    title: 'Robocop',
                    description: 'Soup Nazi',
                    start: 25,
                    end: 31,
                    icons: ['tv-pg.png', 'cc.png'],
                    selected: false,
                },
            ],
        },
    ]

    return (
        <>
            <ClassicyApp id={appId} name={appName} icon={appIcon} defaultWindow={'demo'} appContext={appContext}>
                <ClassicyWindow
                    id={'demo2'}
                    title={appName}
                    appId={appId}
                    closable={false}
                    resizable={false}
                    zoomable={false}
                    scrollable={false}
                    collapsable={false}
                    initialSize={[800, 200]}
                    initialPosition={[300, 50]}
                    modal={true}
                    appMenu={appMenu}
                >
                    <div
                        style={{
                            width: '100%',
                            display: 'grid',
                            gridTemplateColumns: '6fr repeat(36, 1fr)',
                        }}
                    >
                        <div className={epgStyles.epgHeaderTime} style={{ gridColumnStart: 2, gridColumnEnd: 8 }}>
                            9:00 AM
                        </div>
                        <div className={epgStyles.epgHeaderTime} style={{ gridColumnStart: 8, gridColumnEnd: 14 }}>
                            9:30 AM
                        </div>
                        <div className={epgStyles.epgHeaderTime} style={{ gridColumnStart: 14, gridColumnEnd: 20 }}>
                            10:00 AM
                        </div>
                        <div className={epgStyles.epgHeaderTime} style={{ gridColumnStart: 20, gridColumnEnd: 26 }}>
                            10:30 AM
                        </div>
                        <div className={epgStyles.epgHeaderTime} style={{ gridColumnStart: 26, gridColumnEnd: 32 }}>
                            11:00 AM
                        </div>
                        <div className={epgStyles.epgHeaderTime} style={{ gridColumnStart: 32, gridColumnEnd: 38 }}>
                            11:30 AM
                        </div>

                        {gridData.map((channel) => {
                            return (
                                <>
                                    <div
                                        className={epgStyles.epgChannel}
                                        style={{ gridColumnStart: 1, gridColumnEnd: 2 }}
                                    >
                                        <img
                                            className={epgStyles.epgChannelIcon}
                                            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/applications/epg/${channel.icon}`}
                                            alt={channel.number + ' ' + channel.callsign + ' - ' + channel.location}
                                        />
                                        {channel.name}
                                    </div>
                                    {channel.grid.map((gridItem) => {
                                        return (
                                            <div
                                                className={
                                                    epgStyles.epgEntry +
                                                    (gridItem.selected ? ' ' + epgStyles.selected : '')
                                                }
                                                style={{
                                                    gridColumnStart: gridItem.start + 1,
                                                    gridColumnEnd: gridItem.end + 1,
                                                }}
                                            >
                                                <span>
                                                    <div className={epgStyles.epgEntryTitle}>{gridItem.title}</div>
                                                    {gridItem.description}
                                                    {gridItem.icons.map((icon) => {
                                                        return (
                                                            <img
                                                                className={epgStyles.epgEntryIcon}
                                                                src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/applications/epg/${icon}`}
                                                                alt={icon}
                                                            />
                                                        )
                                                    })}
                                                    <img
                                                        className={epgStyles.epgEntryIcon}
                                                        src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/applications/epg/esp.png`}
                                                    />
                                                </span>
                                            </div>
                                        )
                                    })}
                                    {/*<div*/}
                                    {/*    className={epgStyles.epgEntry + ' ' + epgStyles.selected}*/}
                                    {/*    style={{ gridColumnStart: 2, gridColumnEnd: 3 }}*/}
                                    {/*>*/}
                                    {/*    <span>*/}
                                    {/*        <div className={epgStyles.epgEntryTitle}>Seinfeld</div> Telling You for the*/}
                                    {/*        Last Time*/}
                                    {/*        <img*/}
                                    {/*            className={epgStyles.epgEntryIcon}*/}
                                    {/*            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/applications/epg/esp.png`}*/}
                                    {/*        />*/}
                                    {/*    </span>*/}
                                    {/*</div>*/}
                                    {/*<div*/}
                                    {/*    className={epgStyles.epgEntry}*/}
                                    {/*    style={{ gridColumnStart: 3, gridColumnEnd: 8 }}*/}
                                    {/*>*/}
                                    {/*    <span>*/}
                                    {/*        <div className={epgStyles.epgEntryTitle}>Robocop</div>*/}
                                    {/*        Man Cop Meets Metal*/}
                                    {/*        <img*/}
                                    {/*            className={epgStyles.epgEntryIcon}*/}
                                    {/*            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/applications/epg/TV-MA.png`}*/}
                                    {/*        />*/}
                                    {/*    </span>*/}
                                    {/*</div>*/}
                                </>
                            )
                        })}
                    </div>
                </ClassicyWindow>
            </ClassicyApp>
        </>
    )
}

export default EPG
