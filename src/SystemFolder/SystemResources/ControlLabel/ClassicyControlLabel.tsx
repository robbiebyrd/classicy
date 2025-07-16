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
    children?: any
    onClickFunc?: Function
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

    if (label == '') {
        return
    }

    const getDirectionClass = (direction: ClassicyControlLabelDirections) => {
        if (direction === 'right') {
            return "classicyControlLabelRight"
        }
        return "classicyControlLabelLeft"
    }

    const getSizeClass = (size: ClassicyControlLabelSize) => {
        switch (size) {
            case 'small':
                return "classicyControlLabelSmall"
            case 'medium':
                return "classicyControlLabelMedium"
            case 'large':
                return "classicyControlLabelLarge"
            default:
                return "classicyControlLabelLeft"
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
            style={{
                display: 'flex',
                flexDirection: ['left', 'bottom'].includes(direction) ? 'row' : 'row-reverse',
                alignItems: icon ? 'center' : '',
            }}
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
                    "classicyControlLabel",
                    disabled ? "classicyControlLabelDisabled" : '',
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
