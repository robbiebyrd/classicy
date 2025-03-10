import classicyIconStyles from '@/app/SystemFolder/SystemResources/Icon/ClassicyIcon.module.scss'
import classNames from 'classnames'
import React from 'react'

interface ClassicyIconProps {
    appId: string
    name: string
    icon: string
    label?: string
    initialPosition?: [number, number]
    holder?: any
    onClickFunc?: any
    invisible?: boolean
}

const ClassicyIcon: React.FC<ClassicyIconProps> = ({
    appId,
    name,
    icon,
    label,
    initialPosition = [0, 0],
    holder,
    onClickFunc,
    invisible = false,
}) => {
    const [position, setPosition] = React.useState<[number, number]>(initialPosition)
    const [dragging, setDragging] = React.useState<boolean>(false)
    const [active, setActive] = React.useState<boolean>(false)

    const iconRef = React.useRef(null)

    const id = appId + '.shortcut'

    const toggleFocus = () => {
        setActive(!active)
    }
    const setFocus = (active: boolean) => {
        setActive(active)
    }

    const clearFocus = () => {
        setActive(false)
    }

    const doDoubleClick = () => {
        if (onClickFunc) {
            clearFocus()
            onClickFunc()
        }
    }

    const stopChangeIcon = () => {
        setDragging(false)
    }

    const startDrag = () => {
        setDragging(true)
    }

    const changeIcon = (e) => {
        if (dragging) {
            setFocus(true)
            setPosition([
                e.clientX -
                    holder.current.getBoundingClientRect().left -
                    iconRef.current.getBoundingClientRect().width / 2,
                e.clientY -
                    holder.current.getBoundingClientRect().top -
                    iconRef.current.getBoundingClientRect().height / 2,
            ])
        }
    }

    return (
        <div
            ref={iconRef}
            id={`${id}-${Math.random().toString(36).substring(2, 7)}`}
            draggable={false}
            className={classNames(
                classicyIconStyles.classicyIcon,
                dragging ? classicyIconStyles.classicyIconDragging : '',
                active ? classicyIconStyles.classicyIconActive : ''
            )}
            style={{ position: 'absolute', left: position[0] + 'px', top: position[1] + 'px' }}
            onClick={toggleFocus}
            onMouseDown={startDrag}
            onMouseMove={changeIcon}
            onMouseUp={stopChangeIcon}
            onDoubleClick={doDoubleClick}
        >
            <div
                className={classNames(
                    classicyIconStyles.classicyIconMaskOuter,
                    invisible ? classicyIconStyles.classicyIconInvisible : ''
                )}
                style={{ maskImage: `url(${icon})` }}
            >
                <div className={classicyIconStyles.classicyIconMask} style={{ mask: `url(${icon})` }}>
                    <img src={icon} alt={name} />
                </div>
            </div>
            <p className={classNames(invisible ? classicyIconStyles.classicyIconInvisible : '')}>
                {label ? label : name}
            </p>
        </div>
    )
}

export default ClassicyIcon
