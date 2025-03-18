'use client'

import { useDesktop, useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import ClassicyContextualMenu from '@/app/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu'
import { ClassicyMenuItem } from '@/app/SystemFolder/SystemResources/Menu/ClassicyMenu'
import { useSoundDispatch } from '@/app/SystemFolder/SystemResources/SoundManager/ClassicySoundManagerContext'
import classicyWindowStyle from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow.module.scss'
import { ClassicyWindowState } from '@/app/SystemFolder/SystemResources/Window/ClassicyWindowContext'
import classNames from 'classnames'
import React, { useEffect, useMemo } from 'react'

interface ClassicyWindowProps {
    title?: string
    id: string
    appId?: string
    icon?: string
    hidden?: boolean
    closable?: boolean
    zoomable?: boolean
    collapsable?: boolean
    resizable?: boolean
    scrollable?: boolean
    modal?: boolean
    growable?: boolean
    initialSize?: [number, number]
    initialPosition?: [number, number]
    minimumSize?: [number, number]
    header?: React.ReactNode
    appMenu?: ClassicyMenuItem[]
    contextMenu?: ClassicyMenuItem[]
    onCloseFunc?: any
    children?: React.ReactNode
}

const ClassicyWindow: React.FC<ClassicyWindowProps> = ({
    id,
    title = '',
    appId,
    icon = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/files/file.png`,
    hidden = false,
    closable = true,
    zoomable = true,
    collapsable = true,
    resizable = true,
    scrollable = true,
    modal = false,
    growable,
    initialSize = [350, 0],
    initialPosition = [0, 0],
    minimumSize = [300, 0],
    header,
    appMenu,
    contextMenu,
    onCloseFunc,
    children,
}) => {
    const [size, setSize] = React.useState<[number, number]>(initialSize)
    const [clickPosition, setClickPosition] = React.useState<[number, number]>([0, 0])

    let initialWindowState: ClassicyWindowState = {
        collapsed: false,
        contextMenu: contextMenu,
        dragging: false,
        moving: false,
        resizing: false,
        sounding: false,
        zoomed: false,
        size: initialSize,
        position: initialPosition,
        closed: hidden,
        menuBar: appMenu || [],
        contextMenuShown: false,
    }

    const clickOffset = [10, 10]

    const desktopContext = useDesktop()
    const desktopEventDispatch = useDesktopDispatch()
    let player = useSoundDispatch()

    const windowRef = React.useRef(null)
    const ws = useMemo(() => {
        const app = desktopContext.System.Manager.App.apps.findIndex((app) => app.id === appId)
        let window = desktopContext.System.Manager.App.apps[app].windows.find((w) => w.id === id)
        if (!window) {
            window = {
                id,
                appId,
                minimumSize,
                position: [
                    windowRef.current?.getBoundingClientRect().left,
                    windowRef.current?.getBoundingClientRect().top,
                ],

                ...initialWindowState,
            }
        }
        return window
    }, [desktopContext])

    useEffect(() => {
        desktopEventDispatch({
            type: 'ClassicyWindowOpen',
            window: ws,
            app: {
                id: appId,
            },
        })
    }, [])

    if (player === null) {
        player = (_) => {}
    }

    const startResizeWindow = () => {
        // windowEventDispatch({
        //     type: 'ClassicyWindowPosition',
        //     position: [windowRef.current.getBoundingClientRect().left, windowRef.current.getBoundingClientRect().top],
        // })
        desktopEventDispatch({
            type: 'ClassicyWindowPosition',
            app: {
                id: appId,
            },
            window,
            position: [windowRef.current.getBoundingClientRect().left, windowRef.current.getBoundingClientRect().top],
        })
        setResize(true)
        setZoom(false)
        setSize([windowRef.current.clientWidth, windowRef.current.clientHeight])
    }

    const startMoveWindow = (e) => {
        e.preventDefault()
        player({ type: 'ClassicySoundPlay', sound: 'ClassicyWindowMoveIdle' })
        setDragging(true)
        setClickPosition([
            e.clientX - windowRef.current.getBoundingClientRect().left,
            e.clientY - windowRef.current.getBoundingClientRect().top,
        ])
    }

    const changeWindow = (e) => {
        e.preventDefault()
        if (ws.resizing || ws.dragging) {
            setActive()
        }

        if (ws.resizing) {
            setSize([Math.abs(ws.position[0] - e.clientX - 4), Math.abs(ws.position[1] - e.clientY - 4)])
        }

        if (ws.dragging) {
            player({ type: 'ClassicySoundPlay', sound: 'ClassicyWindowMoveMoving' })
            setMoving(true, [e.clientX - clickPosition[0], e.clientY - clickPosition[1]])
        }
    }

    const stopChangeWindow = (e) => {
        e.preventDefault()
        if (ws.resizing || ws.dragging || ws.moving) {
            player({ type: 'ClassicySoundPlayInterrupt', sound: 'ClassicyWindowMoveStop' })
        }
        setResize(false)
        setDragging(false)
        setMoving(false)
        setClickPosition([0, 0])
    }

    const setDragging = (toDrag: boolean) => {
        // windowEventDispatch({
        //     type: 'ClassicyWindowDrag',
        //     dragging: toDrag,
        // })
        desktopEventDispatch({
            type: 'ClassicyWindowDrag',
            dragging: toDrag,
            app: {
                id: appId,
            },
            window,
        })
    }

    const setMoving = (toMove: boolean, toPosition: [number, number] = [0, 0]) => {
        // windowEventDispatch({
        //     type: 'ClassicyWindowMove',
        //     moving: toMove,
        //     position: toPosition,
        // })
        desktopEventDispatch({
            type: 'ClassicyWindowMove',
            moving: toMove,
            position: toPosition,
            app: {
                id: appId,
            },
            window,
        })
    }

    const isActive = () => {
        if (desktopContext && 'activeWindow' in desktopContext) {
            return id === desktopContext.activeWindow
        }
        return true
    }

    const setActive = () => {
        if (!isActive()) {
            player({ type: 'ClassicySoundPlay', sound: 'ClassicyWindowFocus' })

            desktopEventDispatch({
                type: 'ClassicyWindowFocus',
                app: {
                    id: appId,
                    appMenu: appMenu,
                },
                window,
            })
            desktopEventDispatch({
                type: 'ClassicyWindowContextMenu',
                contextMenu: contextMenu ? contextMenu : [],
            })
        }
    }

    React.useEffect(() => {
        // This ensures that once a window has opened it becomes the focus.
        setActive()
    }, [])

    const toggleCollapse = () => {
        if (collapsable) {
            setCollapse(!ws.collapsed)
        }
    }

    const setCollapse = (toCollapse: boolean) => {
        if (toCollapse) {
            player({ type: 'ClassicySoundPlay', sound: 'ClassicyWindowCollapse' })
            // windowEventDispatch({
            //     type: 'ClassicyWindowCollapse',
            // })
            desktopEventDispatch({
                type: 'ClassicyWindowCollapse',
                window: id,
                app: {
                    id: appId,
                },
            })
        } else {
            player({ type: 'ClassicySoundPlay', sound: 'ClassicyWindowExpand' })
            // windowEventDispatch({
            //     type: 'ClassicyWindowExpand',
            // })
            desktopEventDispatch({
                type: 'ClassicyWindowExpand',
                window: id,
                app: {
                    id: appId,
                },
            })
        }
    }

    const toggleZoom = () => {
        if (zoomable) {
            setZoom(!ws.zoomed)
        }
    }

    const setZoom = (toZoom: boolean) => {
        if (ws.collapsed) {
            setCollapse(false)
        }
        player({ type: 'ClassicySoundPlay', sound: 'ClassicyWindowZoom' })
        // windowEventDispatch({
        //     type: 'ClassicyWindowZoom',
        //     zoomed: toZoom,
        // })
        desktopEventDispatch({
            type: 'ClassicyWindowZoom',
            zoomed: toZoom,
            window: id,
            app: {
                id: appId,
            },
        })
    }

    const setContextMenu = (toShow: boolean, atPosition: [number, number]) => {
        // windowEventDispatch({
        //     type: 'ClassicyWindowContextMenu',
        //     contextMenu: toShow,
        //     position: atPosition,
        // })
        desktopEventDispatch({
            type: 'ClassicyWindowContextMenu',
            contextMenu: toShow,
            position: atPosition,
            window: id,
            app: {
                id: appId,
            },
        })
    }

    const hideContextMenu = (e) => {
        e.preventDefault()
        setContextMenu(false, [0, 0])
    }

    const showContextMenu = (e) => {
        e.preventDefault()
        setContextMenu(true, [e.clientX - clickOffset[0], e.clientY - clickOffset[1]])
    }

    const setResize = (toResize: boolean) => {
        if (resizable) {
            // windowEventDispatch({
            //     type: 'ClassicyWindowResize',
            //     resizing: toResize,
            // })
            desktopEventDispatch({
                type: 'ClassicyWindowResize',
                resizing: toResize,
                window: id,
                app: {
                    id: appId,
                },
            })
        }
    }

    const close = () => {
        player({ type: 'ClassicySoundPlay', sound: 'ClassicyWindowClose' })
        desktopEventDispatch({
            type: 'ClassicyWindowClose',
            app: {
                id: appId,
            },
            window,
        })
        if (typeof onCloseFunc === 'function') {
            onCloseFunc(id)
        }
    }

    const titleBar = () => {
        if (title !== '') {
            return (
                <>
                    <div className={classicyWindowStyle.classicyWindowTitleLeft}></div>
                    <div className={classicyWindowStyle.classicyWindowIcon}>
                        <img src={icon} alt={title} />
                    </div>
                    <div className={classicyWindowStyle.classicyWindowTitleText}>{title}</div>
                    <div className={classicyWindowStyle.classicyWindowTitleRight}></div>
                </>
            )
        }
        return <div className={classicyWindowStyle.classicyWindowTitleCenter}></div>
    }

    return (
        <>
            {!ws.closed && (
                <div
                    id={[appId, id].join('_')}
                    ref={windowRef}
                    style={{
                        width: size[0] === 0 ? 'auto' : size[0],
                        height: ws.collapsed ? 'auto' : size[1] === 0 ? 'auto' : size[1],
                        left: ws.position[0],
                        top: ws.position[1],
                        minWidth: minimumSize[0],
                        minHeight: ws.collapsed ? 0 : minimumSize[1],
                    }}
                    className={classNames(
                        classicyWindowStyle.classicyWindow,
                        ws.collapsed === true ? classicyWindowStyle.classicyWindowCollapsed : '',
                        ws.zoomed === true ? classicyWindowStyle.classicyWindowZoomed : '',
                        isActive()
                            ? classicyWindowStyle.classicyWindowActive
                            : classicyWindowStyle.classicyWindowInactive,
                        ws.closed === false ? '' : classicyWindowStyle.classicyWindowInvisible,
                        ws.moving === true ? classicyWindowStyle.classicyWindowDragging : '',
                        ws.resizing === true ? classicyWindowStyle.classicyWindowResizing : '',
                        modal === true ? classicyWindowStyle.classicyWindowModal : '',
                        scrollable === true ? '' : classicyWindowStyle.classicyWindowNoScroll
                    )}
                    onMouseMove={changeWindow}
                    onMouseUp={stopChangeWindow}
                    onClick={setActive}
                    onContextMenu={showContextMenu}
                    onMouseOut={hideContextMenu}
                >
                    {contextMenu && ws.contextMenu && (
                        <ClassicyContextualMenu
                            menuItems={contextMenu}
                            // position={windowState.contextMenuLocation}
                        ></ClassicyContextualMenu>
                    )}

                    <div
                        className={classNames(
                            classicyWindowStyle.classicyWindowTitleBar,
                            modal === true ? classicyWindowStyle.classicyWindowTitleBarModal : ''
                        )}
                        onDoubleClick={toggleCollapse}
                    >
                        {closable && (
                            <div className={classicyWindowStyle.classicyWindowControlBox}>
                                <div className={classicyWindowStyle.classicyWindowCloseBox} onClick={close}></div>
                            </div>
                        )}
                        <div className={classicyWindowStyle.classicyWindowTitle} onMouseDown={startMoveWindow}>
                            {titleBar()}
                        </div>
                        {collapsable && (
                            <div className={classicyWindowStyle.classicyWindowControlBox}>
                                <div
                                    className={classicyWindowStyle.classicyWindowCollapseBox}
                                    onClick={toggleCollapse}
                                ></div>
                            </div>
                        )}
                        {zoomable && (
                            <div className={classicyWindowStyle.classicyWindowControlBox}>
                                <div className={classicyWindowStyle.classicyWindowZoomBox} onClick={toggleZoom}></div>
                            </div>
                        )}
                    </div>
                    {header && !ws.collapsed && (
                        <div
                            className={classNames(
                                classicyWindowStyle.classicyWindowHeader,
                                isActive() ? '' : classicyWindowStyle.classicyWindowHeaderDimmed
                            )}
                        >
                            {header}
                        </div>
                    )}
                    <div
                        className={classNames(
                            !isActive() && !modal ? classicyWindowStyle.classicyWindowContentsDimmed : '',
                            scrollable === true ? '' : classicyWindowStyle.classicyWindowNoScroll,
                            modal === true
                                ? classicyWindowStyle.classicyWindowContentsModal
                                : classicyWindowStyle.classicyWindowContents,
                            header ? classicyWindowStyle.classicyWindowContentsWithHeader : ''
                        )}
                        style={{
                            display: ws.collapsed == true ? 'none' : 'block',
                        }}
                    >
                        <div
                            className={classNames(
                                classicyWindowStyle.classicyWindowContentsInner,
                                modal === true ? classicyWindowStyle.classicyWindowContentsModalInner : '',
                                growable ? classicyWindowStyle.classicyWindowContentsInnerGrow : ''
                            )}
                        >
                            {' '}
                            {JSON.stringify(ws, null, 1)}
                            {children}
                        </div>
                    </div>
                    {resizable && !ws.collapsed && (
                        <div
                            className={classNames(
                                classicyWindowStyle.classicyWindowResizer,
                                isActive() ? '' : classicyWindowStyle.classicyWindowResizerDimmed
                            )}
                            onMouseDownCapture={startResizeWindow}
                        ></div>
                    )}
                </div>
            )}
        </>
    )
}

export default ClassicyWindow
