'use client'

import fileIcon from 'img/icons/system/files/file.png'
import {useDesktop, useDesktopDispatch} from '@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import {useSoundDispatch} from '@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext'
import {ClassicyContextualMenu} from '@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu'
import {ClassicyMenuItem} from '@/SystemFolder/SystemResources/Menu/ClassicyMenu'
import './ClassicyWindow.scss'
import {ClassicyWindowState} from '@/SystemFolder/SystemResources/Window/ClassicyWindowContext'
import classNames from 'classnames'
import React, {ReactNode, useEffect, useMemo, useRef, useState} from 'react'

interface ClassicyWindowProps {
    title?: string
    id: string
    appId: string
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
    header?: ReactNode
    appMenu?: ClassicyMenuItem[]
    contextMenu?: ClassicyMenuItem[]
    onCloseFunc?: any
    children?: ReactNode
    type?: string
}

export const ClassicyWindow: React.FC<ClassicyWindowProps> = ({
                                                                  id,
                                                                  title = '',
                                                                  appId,
                                                                  icon,
                                                                  hidden = false,
                                                                  closable = true,
                                                                  zoomable = true,
                                                                  collapsable = true,
                                                                  resizable = true,
                                                                  scrollable = true,
                                                                  modal = false,
                                                                  type = 'default',
                                                                  growable,
                                                                  initialSize = [350, 0],
                                                                  initialPosition = [110, 110],
                                                                  minimumSize = [300, 0],
                                                                  header,
                                                                  appMenu,
                                                                  contextMenu,
                                                                  onCloseFunc,
                                                                  children,
                                                              }) => {
    if (!icon || icon === '') {
        icon = fileIcon
    }

    const [size, setSize] = useState<[number, number]>(initialSize)
    const [clickPosition, setClickPosition] = useState<[number, number]>([0, 0])

    const clickOffset = [10, 10]

    const desktopContext = useDesktop()
    const desktopEventDispatch = useDesktopDispatch()
    let player = useSoundDispatch()

    const windowRef = useRef<HTMLDivElement | null>(null)

    const ws = useMemo(() => {
        const initialWindowState: ClassicyWindowState = {
            collapsed: false,
            focused: false,
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

        const window = desktopContext.System.Manager.App.apps[appId]?.windows.find((w) => w.id === id)
        if (window) {
            return window
        }

        return {
            id,
            appId,
            minimumSize,
            ...initialWindowState,
            position: [
                windowRef.current?.getBoundingClientRect().left || 0,
                windowRef.current?.getBoundingClientRect().top || 0,
            ],
        } as ClassicyWindowState
    }, [
        appId,
        appId,
        appMenu,
        contextMenu,
        desktopContext.System.Manager.App.apps[appId],
        hidden,
        id,
        initialPosition,
        initialSize,
        minimumSize,
    ])

    useEffect(() => {
        desktopEventDispatch({
            type: 'ClassicyWindowOpen',
            window: ws,
            app: {
                id: appId,
            },
        })
    }, [appId, desktopContext.System.Manager.App.apps[appId], ws])

    const startResizeWindow = (e: React.MouseEvent<HTMLDivElement>) => {

        e.preventDefault()
        desktopEventDispatch({
            type: 'ClassicyWindowPosition',
            app: {
                id: appId,
            },
            window: ws,
            position: [windowRef?.current?.getBoundingClientRect().left, windowRef?.current?.getBoundingClientRect().top],
        })
        setResize(true)
        setZoom(false)
        setSize([windowRef?.current?.clientWidth || initialSize[0], windowRef?.current?.clientHeight || initialSize[1]])
    }

    const startMoveWindow = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault()
        if (modal && type == 'error') {
            // Don't allow modal error dialogs to move
            return
        }
        setClickPosition([
            e.clientX - (windowRef?.current?.getBoundingClientRect().left || 0),
            e.clientY - (windowRef?.current?.getBoundingClientRect().top || 0),
        ])
        desktopEventDispatch({
            type: 'ClassicyWindowMove',
            app: {
                id: appId,
            },
            window: ws,
            moving: true,
            position: [windowRef?.current?.getBoundingClientRect().left, windowRef?.current?.getBoundingClientRect().top],
        })
        player({type: 'ClassicySoundPlay', sound: 'ClassicyWindowMoveIdle'})
        setDragging(true)
    }

    const changeWindow = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault()
        if (ws.resizing || ws.dragging) {
            setActive(e)
        }

        if (ws.resizing) {
            setSize([Math.abs(ws.position[0] - e.clientX) + 5, Math.abs(ws.position[1] - e.clientY) + 5])
        }

        if (ws.dragging) {
            player({type: 'ClassicySoundPlay', sound: 'ClassicyWindowMoveMoving'})
            setMoving(true, [e.clientX - clickPosition[0], e.clientY - clickPosition[1]])
        }
    }

    const stopChangeWindow = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault()
        setActive()
        if (ws.resizing || ws.dragging || ws.moving) {
            player({type: 'ClassicySoundPlayInterrupt', sound: 'ClassicyWindowMoveStop'})
        }
        setResize(false)
        setDragging(false)
        setMoving(false, [ws.position[0], ws.position[1]])
    }

    const setDragging = (toDrag: boolean) => {
        desktopEventDispatch({
            type: 'ClassicyWindowDrag',
            dragging: toDrag,
            app: {
                id: appId,
            },
            window: ws,
        })
    }

    const setMoving = (toMove: boolean, toPosition: [number, number] = [0, 0]) => {
        desktopEventDispatch({
            type: 'ClassicyWindowMove',
            moving: toMove,
            position: toPosition,
            app: {
                id: appId,
            },
            window: ws,
        })
    }

    const isActive = () => {
        return ws.focused
    }

    const setActive = (e?: React.MouseEvent<HTMLDivElement>) => {
        e?.preventDefault()
        if (!isActive()) {
            player({type: 'ClassicySoundPlay', sound: 'ClassicyWindowFocus'})

            desktopEventDispatch({
                type: 'ClassicyWindowFocus',
                app: {
                    id: appId,
                    appMenu: appMenu,
                },
                window: ws,
            })
            // desktopEventDispatch({
            //     type: 'ClassicyWindowContextMenu',
            //     contextMenu: contextMenu || [],
            // })
        }
    }

    useEffect(() => {
        // This ensures that once a window has opened it becomes the focus.
        setActive()
        if (modal && type == 'error') {
            player({type: 'ClassicySoundPlayError'})
        }
    }, [])

    const toggleCollapse = () => {
        if (collapsable) {
            setCollapse(!ws.collapsed)
        }
    }

    const setCollapse = (toCollapse: boolean) => {
        if (toCollapse) {
            setZoom(false)
            player({type: 'ClassicySoundPlay', sound: 'ClassicyWindowCollapse'})
            desktopEventDispatch({
                type: 'ClassicyWindowCollapse',
                window: ws,
                app: {
                    id: appId,
                },
            })
        } else {
            player({type: 'ClassicySoundPlay', sound: 'ClassicyWindowExpand'})
            desktopEventDispatch({
                type: 'ClassicyWindowExpand',
                window: ws,
                app: {
                    id: appId,
                },
            })
        }
    }

    const toggleZoom = () => {
        setActive()
        if (zoomable) {
            setZoom(!ws.zoomed, false)
        }
    }

    const setZoom = (toZoom: boolean, playSound: boolean = true) => {
        if (ws.collapsed) {
            setCollapse(false)
        }
        if (!playSound) {
            player({
                type: 'ClassicySoundPlay',
                sound: toZoom ? 'ClassicyWindowZoomMinimize' : 'ClassicyWindowZoomMinimize',
            })
        }
        desktopEventDispatch({
            type: 'ClassicyWindowZoom',
            zoomed: toZoom,
            window: ws,
            app: {
                id: appId,
            },
        })
    }

    const setContextMenu = (toShow: boolean, atPosition: [number, number]) => {
        // desktopEventDispatch({
        //     type: 'ClassicyWindowContextMenu',
        //     contextMenu: toShow,
        //     position: atPosition,
        //     window: ws,
        //     app: {
        //         id: appId,
        //     },
        // })
    }

    const hideContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault()
        setContextMenu(false, [0, 0])
    }

    const showContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault()
        setActive()
        setContextMenu(true, [e.clientX - clickOffset[0], e.clientY - clickOffset[1]])
    }

    const setResize = (toResize: boolean) => {
        if (resizable) {
            desktopEventDispatch({
                type: 'ClassicyWindowResize',
                resizing: toResize,
                window: ws,
                size: [
                    windowRef.current?.getBoundingClientRect().width,
                    windowRef.current?.getBoundingClientRect().height,
                ],
                app: {
                    id: appId,
                },
            })
        }
    }

    const close = () => {
        setActive()
        player({type: 'ClassicySoundPlay', sound: 'ClassicyWindowClose'})
        desktopEventDispatch({
            type: 'ClassicyWindowClose',
            app: {
                id: appId,
            },
            window: ws,
        })
        if (typeof onCloseFunc === 'function') {
            onCloseFunc(id)
        }
    }

    const titleBar = () => {
        if (title !== '') {
            return (
                <>
                    <div className={"classicyWindowTitleLeft"}></div>
                    <div className={"classicyWindowIcon"}>
                        <img src={icon} alt={title}/>
                    </div>
                    <div className={"classicyWindowTitleText"}>
                        <p>{title}</p>
                    </div>
                    <div className={"classicyWindowTitleRight"}></div>
                </>
            )
        }
        return <div className={"classicyWindowTitleCenter"}></div>
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
                        "classicyWindow",
                        ws.collapsed === true ? "classicyWindowCollapsed" : '',
                        ws.zoomed === true ? "classicyWindowZoomed" : '',
                        isActive()
                            ? "classicyWindowActive"
                            : "classicyWindowInactive",
                        ws.closed === false ? '' : "classicyWindowInvisible",
                        ws.moving === true ? "classicyWindowDragging" : '',
                        ws.resizing === true ? "classicyWindowResizing" : '',
                        modal === true ? "classicyWindowModal" : '',
                        modal && type == 'error' ? "classicyWindowRed" : '',
                        scrollable === true ? '' : "classicyWindowNoScroll"
                    )}
                    onMouseMove={changeWindow}
                    onMouseUp={stopChangeWindow}
                    onClick={setActive}
                    onContextMenu={showContextMenu}
                    onMouseOut={hideContextMenu}
                >
                    <>
                        {contextMenu && ws.contextMenu && (
                            <ClassicyContextualMenu
                                name={[appId, id, 'contextMenu'].join('_')}
                                menuItems={contextMenu}
                                position={clickPosition}
                            ></ClassicyContextualMenu>
                        )}

                        <div
                            className={classNames(
                                "classicyWindowTitleBar",
                                modal === true ? "classicyWindowTitleBarModal" : ''
                            )}
                        >
                            {closable && (
                                <div className={"classicyWindowControlBox"}>
                                    <div className={"classicyWindowCloseBox"} onClick={close}></div>
                                </div>
                            )}
                            <div
                                className={"classicyWindowTitle"}
                                onMouseDown={startMoveWindow}
                                onMouseUp={stopChangeWindow}
                            >
                                {titleBar()}
                            </div>
                            {zoomable && (
                                <div className={"classicyWindowControlBox"}>
                                    <div
                                        className={"classicyWindowZoomBox"}
                                        onClick={toggleZoom}
                                    ></div>
                                </div>
                            )}
                            {collapsable && (
                                <div className={"classicyWindowControlBox"}>
                                    <div
                                        className={"classicyWindowCollapseBox"}
                                        onClick={toggleCollapse}
                                    ></div>
                                </div>
                            )}
                        </div>
                        {header && !ws.collapsed && (
                            <div
                                className={classNames(
                                    "classicyWindowHeader",
                                    isActive() ? '' : "classicyWindowHeaderDimmed"
                                )}
                            >
                                {header}
                            </div>
                        )}
                        <div
                            className={classNames(
                                !isActive() ? "classicyWindowContentsDimmed" : '',
                                scrollable === true ? '' : "classicyWindowNoScroll",
                                modal === true
                                    ? "classicyWindowContentsModal"
                                    : "classicyWindowContents",
                                header ? "classicyWindowContentsWithHeader" : ''
                            )}
                            style={{
                                display: ws.collapsed == true ? 'none' : 'block',
                            }}
                        >
                            <div
                                className={classNames(
                                    "classicyWindowContentsInner",
                                    modal === true ? "classicyWindowContentsModalInner" : '',
                                    growable ? "classicyWindowContentsInnerGrow" : ''
                                )}
                            >
                                {' '}
                                {children}
                            </div>
                        </div>
                        {resizable && !ws.collapsed && (
                            <div
                                className={classNames(
                                    "classicyWindowResizer",
                                    isActive() ? '' : "classicyWindowResizerDimmed"
                                )}
                                onMouseDown={startResizeWindow}
                                onMouseUp={stopChangeWindow}
                            ></div>
                        )}
                    </>
                </div>
            )}
        </>
    )
}
