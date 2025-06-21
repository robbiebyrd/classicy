import { useDesktop, useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'

import classicyDesktopIconStyles from '@/app/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.module.scss'
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

const ClassicyDesktopIcon: React.FC<ClassicyDesktopIconProps> = ({
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

    const iconRef = useRef(null)

    const id = appId + '.shortcut'

    const clickFocus = () => {
        desktopEventDispatch({
            type: 'ClassicyDesktopIconFocus',
            iconId: id,
        })
    }

    const changeIcon = (e) => {
        if (dragging) {
            clickFocus()

            desktopEventDispatch({
                type: 'ClassicyDesktopIconMove',
                app: {
                    id: appId,
                },
                location: [e.clientX - clickPosition[0], e.clientY - clickPosition[1]],
            })
        }
    }

    const isActive = (id) => {
        const idx = desktopContext.System.Manager.Desktop.selectedIcons.findIndex((o) => o === id)
        return idx > -1
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
        return desktopContext.System.Manager.App.apps[appId]?.open
    }

    const stopChangeIcon = () => {
        setDragging(false)
        setClickPosition([0, 0])
    }

    const startDrag = (e) => {
        setClickPosition([
            e.clientX - iconRef.current.getBoundingClientRect().left,
            e.clientY - iconRef.current.getBoundingClientRect().top,
        ])
        setDragging(true)
    }

    const getClass = (id) => {
        if (isActive(id) && isLaunched()) {
            return classicyDesktopIconStyles.classicyDesktopIconActiveAndOpen
        } else if (isActive(id)) {
            return classicyDesktopIconStyles.classicyDesktopIconActive
        } else if (isLaunched()) {
            return classicyDesktopIconStyles.classicyDesktopIconOpen
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
            onContextMenu={() => {
                clickFocus()
                alert('clicked')
            }} // TODO: Add Context Menu on Desktop Icons
            className={classNames(
                classicyDesktopIconStyles.classicyDesktopIcon,
                dragging ? classicyDesktopIconStyles.classicyDesktopIconDragging : '',
                getClass(id)
            )}
            style={{ top: thisLocation[0], left: thisLocation[1] }}
        >
            <div
                className={classicyDesktopIconStyles.classicyDesktopIconMaskOuter}
                style={{ maskImage: `url(${icon})` }}
            >
                <div className={classicyDesktopIconStyles.classicyDesktopIconMask} style={{ mask: `url(${icon})` }}>
                    <img src={icon} alt={appName} />
                </div>
            </div>
            <p>{label ? label : appName}</p>
        </div>
    )
}

export default ClassicyDesktopIcon
