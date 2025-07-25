'use client'

import { useDesktop, useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import { useSoundDispatch } from '@/app/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext'
import ClassicyContextualMenu from '@/app/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu'
import { ClassicyMenuItem } from '@/app/SystemFolder/SystemResources/Menu/ClassicyMenu'
import classicyWindowStyle from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow.module.scss'
import { ClassicyWindowState } from '@/app/SystemFolder/SystemResources/Window/ClassicyWindowContext'
import classNames from 'classnames'
import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react'

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
    header?: ReactNode
    appMenu?: ClassicyMenuItem[]
    contextMenu?: ClassicyMenuItem[]
    onCloseFunc?: any
    children?: ReactNode
    type?: string
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
    type = 'default',
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
    const [size, setSize] = useState<[number, number]>(initialSize)
    const [clickPosition, setClickPosition] = useState<[number, number]>([0, 0])

    const clickOffset = [10, 10]

    const desktopContext = useDesktop()
    const desktopEventDispatch = useDesktopDispatch()
    let player = useSoundDispatch()

    const windowRef = useRef(null)

    const ws = useMemo(() => {
        const initialWindowState: ClassicyWindowState = {
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
        let window = desktopContext.System.Manager.App.apps[appId]?.windows.find((w) => w.id === id)
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

    const startResizeWindow = () => {
        desktopEventDispatch({
            type: 'ClassicyWindowPosition',
            app: {
                id: appId,
            },
            window: ws,
            position: [windowRef.current.getBoundingClientRect().left, windowRef.current.getBoundingClientRect().top],
        })
        setResize(true)
        setZoom(false)
        setSize([windowRef.current.clientWidth, windowRef.current.clientHeight])
    }

    const startMoveWindow = (e) => {
        e.preventDefault()
        if (modal && type == 'error') {
            // Don't allow modal error dialogs to move
            return
        }
        setClickPosition([
            e.clientX - windowRef.current.getBoundingClientRect().left,
            e.clientY - windowRef.current.getBoundingClientRect().top,
        ])
        desktopEventDispatch({
            type: 'ClassicyWindowMove',
            app: {
                id: appId,
            },
            window: ws,
            moving: true,
            position: [windowRef.current.getBoundingClientRect().left, windowRef.current.getBoundingClientRect().top],
        })
        player({ type: 'ClassicySoundPlay', sound: 'ClassicyWindowMoveIdle' })
        setDragging(true)
    }

    const changeWindow = (e) => {
        e.preventDefault()
        if (ws.resizing || ws.dragging) {
            setActive()
        }

        if (ws.resizing) {
            setSize([Math.abs(ws.position[0] - e.clientX) + 5, Math.abs(ws.position[1] - e.clientY) + 5])
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

    const setActive = () => {
        if (!isActive()) {
            player({ type: 'ClassicySoundPlay', sound: 'ClassicyWindowFocus' })

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
            player({ type: 'ClassicySoundPlayError' })
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
            player({ type: 'ClassicySoundPlay', sound: 'ClassicyWindowCollapse' })
            desktopEventDispatch({
                type: 'ClassicyWindowCollapse',
                window: ws,
                app: {
                    id: appId,
                },
            })
        } else {
            player({ type: 'ClassicySoundPlay', sound: 'ClassicyWindowExpand' })
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
        player({ type: 'ClassicySoundPlay', sound: 'ClassicyWindowClose' })
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
                    <div className={classicyWindowStyle.classicyWindowTitleLeft}></div>
                    <div className={classicyWindowStyle.classicyWindowIcon}>
                        <img src={icon} alt={title} />
                    </div>
                    <div className={classicyWindowStyle.classicyWindowTitleText}>
                        <p>{title}</p>
                    </div>
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
                        modal && type == 'error' ? classicyWindowStyle.classicyWindowRed : '',
                        scrollable === true ? '' : classicyWindowStyle.classicyWindowNoScroll
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
                                classicyWindowStyle.classicyWindowTitleBar,
                                modal === true ? classicyWindowStyle.classicyWindowTitleBarModal : ''
                            )}
                        >
                            {closable && (
                                <div className={classicyWindowStyle.classicyWindowControlBox}>
                                    <div className={classicyWindowStyle.classicyWindowCloseBox} onClick={close}></div>
                                </div>
                            )}
                            <div
                                className={classicyWindowStyle.classicyWindowTitle}
                                onMouseDown={startMoveWindow}
                                onMouseUp={stopChangeWindow}
                            >
                                {titleBar()}
                            </div>
                            {zoomable && (
                                <div className={classicyWindowStyle.classicyWindowControlBox}>
                                    <div
                                        className={classicyWindowStyle.classicyWindowZoomBox}
                                        onClick={toggleZoom}
                                    ></div>
                                </div>
                            )}
                            {collapsable && (
                                <div className={classicyWindowStyle.classicyWindowControlBox}>
                                    <div
                                        className={classicyWindowStyle.classicyWindowCollapseBox}
                                        onClick={toggleCollapse}
                                    ></div>
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
                                !isActive() ? classicyWindowStyle.classicyWindowContentsDimmed : '',
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
                                {children}
                            </div>
                        </div>
                        {resizable && !ws.collapsed && (
                            <div
                                className={classNames(
                                    classicyWindowStyle.classicyWindowResizer,
                                    isActive() ? '' : classicyWindowStyle.classicyWindowResizerDimmed
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

export default ClassicyWindow
