import { useDesktop, useDesktopDispatch } from '@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'

import './ClassicyDesktopIcon.scss'
import classNames from 'classnames'
import React, { useRef, useState } from 'react'

interface ClassicyDesktopIconProps {
    appId: string
    appName: string
    icon: string
    label?: string
    kind: string
    onClickFunc?: any
    event?: string
    eventData?: any
}

export const ClassicyDesktopIcon: React.FC<ClassicyDesktopIconProps> = ({
    appId,
    appName,
    icon,
    label,
    kind = 'app_shortcut',
    onClickFunc,
    event,
    eventData,
}) => {
    const [clickPosition, setClickPosition] = useState<[number, number]>([0, 0])
    const [dragging, setDragging] = useState<boolean>(false)

    const desktopContext = useDesktop()
    const desktopEventDispatch = useDesktopDispatch()

    const iconRef = useRef<HTMLDivElement>(null)

    const id = appId + '.shortcut'

    const clickFocus = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation()
        desktopEventDispatch({
            type: 'ClassicyDesktopIconFocus',
            iconId: appId,
        })
    }

    const changeIcon = (e: React.MouseEvent<HTMLDivElement>) => {
        if (dragging) {
            clickFocus(e)

            desktopEventDispatch({
                type: 'ClassicyDesktopIconMove',
                app: {
                    id: appId,
                },
                location: [e.clientX - clickPosition[0], e.clientY - clickPosition[1]],
            })
        }
    }

    const isActive = (i: string) => {
        const idx = desktopContext.System.Manager.Desktop.selectedIcons?.findIndex((o) => o === i)
        return idx != undefined && idx > -1
    }

    const launchIcon = () => {
        if (onClickFunc) {
            onClickFunc()
        }
        if (event && eventData) {
            desktopEventDispatch({
                type: event,
                ...eventData,
            })
        }
        desktopEventDispatch({
            type: 'ClassicyDesktopIconOpen',
            iconId: id,
            app: {
                id: appId,
                name: appName,
                icon: icon,
            },
        })
    }

    const getIconLocation = () => {
        let iconIdx = desktopContext.System.Manager.Desktop.icons.findIndex((i) => i.appId === appId)

        if (!desktopContext.System.Manager.Desktop.icons[iconIdx].location) {
            return [0, 0]
        }

        let leftValue: number = 0
        let topValue: number = 0
        if (iconIdx > -1) {
            leftValue = desktopContext.System.Manager.Desktop.icons[iconIdx].location[0]
            topValue = desktopContext.System.Manager.Desktop.icons[iconIdx].location[1]
        }
        return [topValue, leftValue]
    }

    let thisLocation = getIconLocation()

    const isLaunched = () => {
        // Check if a Finder window is open
        if (appId.startsWith('Finder.app')) {
            const a = desktopContext.System.Manager.App.apps['Finder.app'].windows.findIndex(
                (w) => w.id === eventData.path && w.closed === false
            )
            return a >= 0
        }
        return desktopContext.System.Manager.App.apps[appId]?.open
    }

    const stopChangeIcon = () => {
        setDragging(false)
        setClickPosition([0, 0])
    }

    const startDrag = (e: React.MouseEvent<HTMLDivElement>) => {
        if (iconRef.current == null) {
            return
        }

        setClickPosition([
            e.clientX - iconRef.current.getBoundingClientRect().left,
            e.clientY - iconRef.current.getBoundingClientRect().top,
        ])

        setDragging(true)
    }

    const getClass = (i: string) => {
        if (isActive(i) && isLaunched()) {
            return "classicyDesktopIconActiveAndOpen"
        } else if (isActive(i)) {
            return "classicyDesktopIconActive"
        } else if (isLaunched()) {
            return "classicyDesktopIconOpen"
        } else {
            return ''
        }
    }

    return (
        <div
            ref={iconRef}
            id={`${id}`}
            onMouseDown={startDrag}
            onMouseMove={changeIcon}
            onMouseUp={stopChangeIcon}
            onDoubleClick={launchIcon}
            draggable={false}
            onClick={clickFocus}
            onContextMenu={(e: React.MouseEvent<HTMLDivElement>) => {
                clickFocus(e)
                alert('clicked')
            }} // TODO: Add Context Menu on Desktop Icons
            className={classNames(
                "classicyDesktopIcon",
                dragging ? "classicyDesktopIconDragging" : '',
                getClass(appId)
            )}
            style={{ top: thisLocation[0], left: thisLocation[1] }}
        >
            <div
                className={"classicyDesktopIconMaskOuter"}
                style={{ maskImage: `url(${icon})` }}
            >
                <div className={"classicyDesktopIconMask"} style={{ mask: `url(${icon})` }}>
                    <img src={icon} alt={appName} />
                </div>
            </div>
            <p>{label ? label : appName}</p>
        </div>
    )
}
