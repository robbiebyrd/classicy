import {getAllThemes, getThemeVars} from '@/app/SystemFolder/Appearance/ClassicyAppearance'
import Finder from '@/app/SystemFolder/Finder/Finder'
import {useDesktop, useDesktopDispatch} from '@/app/SystemFolder/SystemResources/AppManager/ClassicyAppManagerContext'
import ClassicyContextualMenu from '@/app/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu'
import classicyDesktop from '@/app/SystemFolder/SystemResources/Desktop/ClassicyDesktop.module.scss'
import ClassicyDesktopIcon from '@/app/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon'
import ClassicyDesktopMenuBar from '@/app/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar'
import {ClassicyMenuItem} from '@/app/SystemFolder/SystemResources/Menu/ClassicyMenu'
import classNames from 'classnames'
import React, {Suspense} from 'react'
import '@/app/SystemFolder/Appearance/styles/fonts.scss'

interface ClassicyDesktopProps {
    children?: any
}

const ClassicyDesktop: React.FC<ClassicyDesktopProps> = ({children}) => {
    const [contextMenu, setContextMenu] = React.useState(false)
    const [contextMenuLocation, setContextMenuLocation] = React.useState([0, 0])

    const [selectBoxStart, setSelectBoxStart] = React.useState([0, 0])
    const [selectBoxSize, setSelectBoxSize] = React.useState([0, 0])
    const [selectBox, setSelectBox] = React.useState(false)

    const clickOffset = [10, 10]

    const desktopState = useDesktop()
    const desktopEventDispatch = useDesktopDispatch()

    if (desktopState.availableThemes.length <= 0) {
        desktopEventDispatch({
            type: 'ClassicyDesktopLoadThemes',
            availableThemes: getAllThemes(),
        })
    }

    const startSelectBox = (e) => {
        if (e.target.id === 'classicyDesktop') {
            if (e.button > 1) {
                toggleDesktopContextMenu(e)
            } else {
                clearActives(e)
                setSelectBox(true)
                setSelectBoxStart([e.clientX, e.clientY])
                setSelectBoxSize([0, 0])
            }
        }
    }

    const resizeSelectBox = (e) => {
        setSelectBoxSize([e.clientX - selectBoxStart[0], e.clientY - selectBoxStart[1]])
    }

    const clearSelectBox = () => {
        setSelectBoxSize([0, 0])
        setSelectBoxStart([0, 0])
        setSelectBox(false)
    }

    const clearActives = (e) => {
        setContextMenu(false)
        desktopEventDispatch({
            type: 'ClassicyDesktopFocus',
            e: e,
            menuBar: defaultMenuItems,
        })
    }

    const toggleDesktopContextMenu = (e) => {
        e.preventDefault()
        if (e.target.id === 'classicyDesktop') {
            setContextMenuLocation([e.clientX - clickOffset[0], e.clientY - clickOffset[1]])
            setContextMenu(!contextMenu)
        }
    }

    const defaultMenuItems: ClassicyMenuItem[] = [
        {
            id: 'finder_file',
            title: 'File',
        },
        {
            id: 'finder_edit',
            title: 'Edit',
        },
        {
            id: 'finder_view',
            title: 'View',
            menuChildren: [
                {
                    id: 'finder.app_CleanupDesktopIcons',
                    title: 'Clean up',
                    onClickFunc: () => {
                        desktopEventDispatch({
                            type: 'ClassicyDesktopIconCleanup',
                        })
                    },
                },
                {
                    id: 'finder.app_ArrangeDesktopIcons',
                    title: 'Arrange...',
                    menuChildren: [
                        {
                            id: 'finder.app_arrange_by_name',
                            title: 'by Name',
                        },
                        {
                            id: 'finder.app_arrange_by_kind',
                            title: 'by Kind',
                        },
                        {
                            id: 'finder.app_arrange_by_label',
                            title: 'by Label',
                        },
                    ],
                },
            ],
        },
        {
            id: 'finder_special',
            title: 'Special',
        },

        {
            id: 'finder_help',
            title: 'Help',
        },
    ]

    const currentTheme = getThemeVars(desktopState.activeTheme)

    React.useEffect(() => {
        desktopEventDispatch({
            type: 'ClassicyDesktopFocus',
            menuBar: defaultMenuItems,
        })
    }, [])

    return (
        <>
            <Suspense>
                <div
                    id={'classicyDesktop'}
                    style={currentTheme as React.CSSProperties}
                    className={classNames(classicyDesktop.classicyDesktop)}
                    onMouseMove={resizeSelectBox}
                    onContextMenu={toggleDesktopContextMenu}
                    onClick={clearSelectBox}
                    onMouseDown={startSelectBox}
                >
                    {selectBox && (
                        <div
                            className={classicyDesktop.classicyDesktopSelect}
                            style={{
                                left: selectBoxStart[0],
                                top: selectBoxStart[1],
                                width: selectBoxSize[0],
                                height: selectBoxSize[1],
                            }}
                        />
                    )}
                    <ClassicyDesktopMenuBar/>
                    {contextMenu && (
                        <ClassicyContextualMenu menuItems={defaultMenuItems} position={contextMenuLocation}/>
                    )}
                    <Finder/>
                    {desktopState.desktopIcons.map((i) => (
                        <ClassicyDesktopIcon
                            appId={i.appId}
                            appName={i.appName}
                            icon={i.icon}
                            label={i.label}
                            kind={i.kind}
                            key={i.appId}
                            onClickFunc={i.onClickFunc}
                        />
                    ))}
                    {children}
                </div>
            </Suspense>
        </>
    )
}

export default ClassicyDesktop
