import { useDesktop, useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'

import classicyDesktopIconStyles from '@/app/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.module.scss'
import classNames from 'classnames'
import React from 'react'

interface ClassicyDesktopIconProps {
    appId: string
    appName: string
    icon: string
    label?: string
    kind?: 'app_shortcut' | 'file'
    onClickFunc?: any
}

const ClassicyDesktopIcon: React.FC<ClassicyDesktopIconProps> = ({
    appId,
    appName,
    icon,
    label,
    kind = 'app_shortcut',
    onClickFunc,
}) => {
    const [clickPosition, setClickPosition] = React.useState<[number, number]>([0, 0])
    const [dragging, setDragging] = React.useState<boolean>(false)

    const desktopContext = useDesktop()
    const desktopEventDispatch = useDesktopDispatch()

    const iconRef = React.useRef(null)

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
        const idx = desktopContext.System.Manager.App.apps.findIndex((o) => o.id === appId && o.open)
        return idx > -1
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
