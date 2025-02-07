import ClassicyApp from '@/app/SystemFolder/SystemResources/App/ClassicyApp'
import {useDesktopDispatch} from '@/app/SystemFolder/SystemResources/AppManager/ClassicyAppManagerContext'
import ClassicyFileBrowser from '@/app/SystemFolder/SystemResources/File/ClassicyFileBrowser'
import {ClassicyFileSystem} from '@/app/SystemFolder/SystemResources/File/ClassicyFileSystem'
import ClassicyWindow from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow'
import React from 'react'
import {quitAppHelper} from '@/app/SystemFolder/SystemResources/App/ClassicyAppUtils'

const Finder = () => {
    const appName: string = 'Finder'
    const appId: string = 'Finder.app'
    const appIcon: string = `${process.env.NEXT_PUBLIC_BASE_PATH}/img/icons/system/macos.svg`
    const desktopEventDispatch = useDesktopDispatch()

    const [openPaths, setOpenPaths] = React.useState(['Macintosh HD'])
    const [pathSettings, setPathSettings] = React.useState<Record<string, PathSettingsProps>>({})

    type PathSettingsProps = {
        _viewType: 'list' | 'icons'
    }

    const handlePathSettingsChange = (path: string, settings: PathSettingsProps) => {
        let a = {...pathSettings}
        a[path] = settings
        setPathSettings(a)
    }

    const openFolder = (path: string) => {
        setOpenPaths(Array.from(new Set([...openPaths, path])))
    }

    const openFile = (path: string) => {
        // TODO: Need to write this logic
    }
    const closeFolder = (path: string) => {
        const uniqueOpenPaths = openPaths.filter((e) => e !== path.replace('Finder:', ''))
        setOpenPaths(uniqueOpenPaths)
    }

    const closeAll = () => {
        setOpenPaths([])
    }

    const emptyTrash = () => {
        desktopEventDispatch({
            type: 'ClassicyFinderEmptyTrash',
        })
    }

    const quitApp = () => {
        desktopEventDispatch(quitAppHelper(appId, appName, appIcon))
    }

    const fs = React.useMemo(() => new ClassicyFileSystem(''), [])

    React.useEffect(() => {
        const drives = fs.filterByType('', 'drive')

        Object.entries(drives).forEach(([a, b]) => {
            desktopEventDispatch({
                type: 'ClassicyDesktopIconAdd',
                app: {
                    id: appId,
                    name: a,
                    icon: b['_icon'],
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

    return (
        <ClassicyApp
            id={appId}
            name={appName}
            icon={appIcon}
            noDesktopIcon={true}
            defaultWindow={appName + ':' + openPaths[0]}
        >
            {openPaths
                .map((op) => {
                    return {
                        op,
                        dir: fs.statDir(op),
                    }
                })
                .map(({op, dir}, idx) => {
                    return (
                        <ClassicyWindow
                            id={appName + ':' + op}
                            key={appName + ':' + op}
                            title={dir['_name']}
                            icon={`${process.env.NEXT_PUBLIC_BASE_PATH}${dir['_icon']}`}
                            appId={appId}
                            initialSize={[425, 300]}
                            initialPosition={[50 + idx * 50, 50 + idx * 50]}
                            header={<span>{getHeaderString(dir)}</span>}
                            onCloseFunc={closeFolder}
                            appMenu={[
                                {
                                    id: appId + '_file',
                                    title: 'File',
                                    menuChildren: [
                                        {
                                            id: appId + '_quit',
                                            title: 'Quit',
                                            onClickFunc: quitApp,
                                        },
                                    ],
                                },
                                {
                                    id: appId + '_view',
                                    title: 'View',
                                    menuChildren: [
                                        {
                                            id: appId + '_view_as_icons',
                                            title: 'View as Icons',
                                            onClickFunc: () => handlePathSettingsChange(op, {_viewType: 'icons'}),
                                        },
                                        {
                                            id: appId + '_view_as_list',
                                            title: 'View as List',
                                            onClickFunc: () => handlePathSettingsChange(op, {_viewType: 'list'}),
                                        },
                                    ],
                                },
                                {
                                    id: appId + '_help',
                                    title: 'Help',
                                    menuChildren: [
                                        {
                                            id: appId + '_about',
                                            title: 'About',
                                            onClickFunc: () => {
                                            },
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
            {/*<ClassicyWindow*/}
            {/*    id={'test-get-file-info'}*/}
            {/*    scrollable={false}*/}
            {/*    resizable={false}*/}
            {/*    collapsable={false}*/}
            {/*    zoomable={false}*/}
            {/*    modalWindow={true}*/}
            {/*    initialSize={[50,200]}*/}
            {/*    initialPosition={[50,50]}*/}
            {/*>*/}
            {/*    <div>*/}
            {/*        <ClassicyControlLabel label={'File Name'} labelSize={'medium'} icon={'img/icons/system/apple.png'}></ClassicyControlLabel>*/}
            {/*        <ClassicyDisclosure label={"More Info"}>*/}
            {/*            Hello*/}
            {/*        </ClassicyDisclosure>*/}
            {/*    </div>*/}
            {/*</ClassicyWindow>*/}{' '}
        </ClassicyApp>
    )
}

export default Finder
