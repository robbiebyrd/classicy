import ClassicyApp from '@/app/SystemFolder/SystemResources/App/ClassicyApp'
import { useDesktop, useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import ClassicyFileBrowser from '@/app/SystemFolder/SystemResources/File/ClassicyFileBrowser'
import { ClassicyFileSystem } from '@/app/SystemFolder/SystemResources/File/ClassicyFileSystem'
import ClassicyWindow from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow'
import React, { useEffect } from 'react'
import { quitAppHelper } from '@/app/SystemFolder/SystemResources/App/ClassicyAppUtils'

const Finder = () => {
    const appName: string = 'Finder'
    const appId: string = 'Finder.app'
    const appIcon: string = `${process.env.NEXT_PUBLIC_BASE_PATH}/img/icons/system/macos.svg`
    const desktopEventDispatch = useDesktopDispatch()
    const desktop = useDesktop()

    const [pathSettings, setPathSettings] = React.useState<Record<string, PathSettingsProps>>({})

    type PathSettingsProps = {
        _viewType: 'list' | 'icons'
    }

    useEffect(() => {
        const appIndex = desktop.System.Manager.App.apps.findIndex((app) => app.id === appId)
        const appData = desktop.System.Manager.App.apps[appIndex].data || {}
        if (!appData?.hasOwnProperty('openPaths')) {
            appData['openPaths'] = ['Macintosh HD']
        }
        desktopEventDispatch({
            type: 'ClassicyAppFinderOpenFolders',
            paths: appData['openPaths'],
        })
    }, [])

    const handlePathSettingsChange = (path: string, settings: PathSettingsProps) => {
        let updatedPathSettings = { ...pathSettings }
        updatedPathSettings[path] = settings
        setPathSettings(updatedPathSettings)
    }

    const openFolder = (path: string) => {
        desktopEventDispatch({
            type: 'ClassicyAppFinderOpenFolder',
            path,
        })

        const appIndex = desktop.System.Manager.App.apps.findIndex((app) => app.id === appId)
        const windowIndex = desktop.System.Manager.App.apps[appIndex].windows.findIndex((w) => w.id === path)
        const ws = desktop.System.Manager.App.apps[appIndex].windows[windowIndex]
        if (ws) {
            ws.closed = false
            desktopEventDispatch({
                type: 'ClassicyWindowOpen',
                app: {
                    id: appId,
                },
                window: ws,
            })
            desktopEventDispatch({
                type: 'ClassicyWindowFocus',
                app: {
                    id: appId,
                },
                window: ws,
            })
        }
    }

    const openFile = (path: string) => {
        // TODO: Need to write this logic
    }
    const closeFolder = (path: string) => {
        desktopEventDispatch({
            type: 'ClassicyAppFinderCloseFolder',
            path,
        })
    }

    const emptyTrash = () => {
        desktopEventDispatch({
            type: 'ClassicyAppFinderEmptyTrash',
        })
    }

    const quitApp = () => {
        desktopEventDispatch(quitAppHelper(appId, appName, appIcon))
    }

    const fs = React.useMemo(() => new ClassicyFileSystem(''), [])

    React.useEffect(() => {
        const drives = fs.filterByType('', 'drive')

        Object.entries(drives).forEach(([path, metadata]) => {
            const openFolderFunc = () => {
                openFolder(path)
            }
            desktopEventDispatch({
                type: 'ClassicyDesktopIconAdd',
                app: {
                    id: appId,
                    name: path,
                    icon: metadata['_icon'],
                    onClickFunc: openFolderFunc,
                    // We should use the event/eventData combo here
                },
                kind: '_drive',
            })
        })

        desktopEventDispatch({
            type: 'ClassicyDesktopIconAdd',
            app: {
                id: 'finder_trash',
                name: 'Trash',
                icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/desktop/trash-full.png`,
            },
            kind: 'trash',
            onClickFunc: emptyTrash,
        })
    }, [fs])

    const getHeaderString = (dir) => {
        return (
            dir['_count'] +
            ' items' +
            (dir['_countHidden'] ? ' (' + dir['_countHidden'] + ' hidden)' : '') +
            ', ' +
            fs.formatSize(dir['_size'])
        )
    }

    const appIndex = desktop.System.Manager.App.apps.findIndex((app) => app.id === appId)
    const { openPaths } = desktop.System.Manager.App.apps[appIndex].data

    return (
        <ClassicyApp
            id={appId}
            name={appName}
            icon={appIcon}
            noDesktopIcon={true}
            defaultWindow={openPaths ? appName + ':' + openPaths.at(0) : 'Macintosh HD'}
        >
            {openPaths
                .map((op) => {
                    return {
                        op,
                        dir: fs.statDir(op),
                    }
                })
                .map(({ op, dir }, idx) => {
                    return (
                        <ClassicyWindow
                            id={op}
                            key={appName + ':' + op}
                            title={dir['_name']}
                            icon={`${dir['_icon']}`}
                            appId={appId}
                            hidden={false}
                            initialSize={[425, 300]}
                            initialPosition={[50 + idx * 50, 50 + idx * 50]}
                            header={<span>{getHeaderString(dir)}</span>}
                            onCloseFunc={closeFolder}
                            appMenu={[
                                {
                                    id: appId + '_' + op + '_file',
                                    title: 'File',
                                    menuChildren: [
                                        {
                                            id: appId + '_' + op + '_file_closew',
                                            title: 'Close Window',
                                            onClickFunc: () => closeFolder(op),
                                        },
                                        {
                                            id: appId + '_' + op + '_file_closews',
                                            title: 'Close All Windows',
                                            onClickFunc: quitApp,
                                        },
                                    ],
                                },
                                {
                                    id: appId + '_view',
                                    title: 'View',
                                    menuChildren: [
                                        {
                                            id: appId + '_' + op + '_view_as_icons',
                                            title: 'View as Icons',
                                            onClickFunc: () => handlePathSettingsChange(op, { _viewType: 'icons' }),
                                        },
                                        {
                                            id: appId + '_' + op + '_view_as_list',
                                            title: 'View as List',
                                            onClickFunc: () => handlePathSettingsChange(op, { _viewType: 'list' }),
                                        },
                                    ],
                                },
                                {
                                    id: appId + '_' + op + '_help',
                                    title: 'Help',
                                    menuChildren: [
                                        {
                                            id: appId + '_' + op + '_help_about',
                                            title: 'About',
                                            onClickFunc: () => {},
                                        },
                                    ],
                                },
                            ]}
                        >
                            <ClassicyFileBrowser
                                appId={appId}
                                fs={fs}
                                path={op}
                                dirOnClickFunc={openFolder}
                                fileOnClickFunc={openFile}
                                display={pathSettings[op]?._viewType || 'list'}
                            />
                        </ClassicyWindow>
                    )
                })}
        </ClassicyApp>
    )
}

export default Finder
