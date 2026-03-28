import './ClassicyControlLabel.scss'
import classNames from 'classnames'
import { FC as FunctionalComponent, ReactNode, MouseEvent } from 'react'

type ClassicyControlLabelDirections = 'left' | 'right'
type ClassicyControlLabelSize = 'small' | 'medium' | 'large'

interface ClassicyControlLabelProps {
    labelFor?: string
    label?: string
    labelSize?: ClassicyControlLabelSize
    disabled?: boolean
    icon?: string
    iconSize?: string
    direction?: ClassicyControlLabelDirections
    children?: ReactNode
    onClickFunc?: (e: MouseEvent) => void
}

export const ClassicyControlLabel: FunctionalComponent<ClassicyControlLabelProps> = ({
    labelFor = '',
    label = '',
    labelSize = 'medium',
    disabled = false,
    direction = 'left',
    icon,
    iconSize,
    children,
    onClickFunc,
}) => {

    if (label === '') {
        return null
    }

    const getDirectionStyle = (direction: ClassicyControlLabelDirections) => {
        if (direction === 'right') {
            return { marginRight: "calc(var(--window-control-size)/2)" }
        }
        return { marginLeft: "calc(var(--window-control-size)/2)" }
    }
    const getSizeStyle = (size: ClassicyControlLabelSize) => {
        switch (size) {
            case 'small':
                return "calc(var(--ui-font-size)/2)"
            case 'medium':
                return "var(--ui-font-size)"
            case 'large':
                return "calc(var(--ui-font-size)*2)"
            default:
                return "calc(var(--window-control-size)/2)"
        }
    }

    const imageSize = (s: string | undefined) => {
        if (s === 'sm') {
            return '16px'
        }
        if (s === 'lg') {
            return '64px'
        }
        return '32px'
    }

    return (
        <div
        style={{display: "flex", flexDirection: ['left', 'bottom'].includes(direction) ? 'row' : 'row-reverse', alignItems: icon ? "center" : ""}}
            onClick={(e) => {
                e.preventDefault()
                if (onClickFunc) {
                    onClickFunc(e)
                }
            }}
        >
            {icon && <img src={icon} width={imageSize(iconSize)} alt={label} />}

            {['left', 'bottom'].includes(direction) && children}

            <label
                htmlFor={labelFor}
                className={classNames(
                    disabled ? "text-[color:var(--color-system-05)]" : '',
                )}
                style={{
                    fontFamily: "var(--ui-font)",
                    fontSize: getSizeStyle(labelSize),
                    ...getDirectionStyle(direction),
                }}
            >
                {label}
            </label>

            {['right', 'top'].includes(direction) && children}
        </div>
    )
}
