import './ClassicyControlLabel.scss'
import classNames from 'classnames'
import React from 'react'

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
    children?: React.ReactNode
    onClickFunc?: (e: React.MouseEvent) => void
}

export const ClassicyControlLabel: React.FC<ClassicyControlLabelProps> = ({
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

    const getDirectionClass = (direction: ClassicyControlLabelDirections) => {
        if (direction === 'right') {
            return "mr-[calc(var(--window-control-size)/2)]"
        }
        return "ml-[calc(var(--window-control-size)/2)]"
    }

    const getSizeClass = (size: ClassicyControlLabelSize) => {
        switch (size) {
            case 'small':
                return "text-[calc(var(--ui-font-size)/2)]"
            case 'medium':
                return "text-[length:var(--ui-font-size)]"
            case 'large':
                return "text-[calc(var(--ui-font-size)*2)]"
            default:
                return "ml-[calc(var(--window-control-size)/2)]"
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
            className={classNames(
                'flex',
                ['left', 'bottom'].includes(direction) ? 'flex-row' : 'flex-row-reverse',
                icon ? 'items-center' : ''
            )}
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
                    "font-[family:var(--ui-font)] select-none",
                    disabled ? "text-[color:var(--color-system-05)]" : '',
                    getDirectionClass(direction),
                    getSizeClass(labelSize)
                )}
            >
                {label}
            </label>

            {['right', 'top'].includes(direction) && children}
        </div>
    )
}
