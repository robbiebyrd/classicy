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

    const sizeClassMap: Record<ClassicyControlLabelSize, string> = {
        small: 'classicyControlLabelSizeSmall',
        medium: 'classicyControlLabelSizeMedium',
        large: 'classicyControlLabelSizeLarge',
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

    const isLeftOrBottom = ['left', 'bottom'].includes(direction)

    return (
        <div
            className={classNames(
                'classicyControlLabelHolder',
                isLeftOrBottom ? 'classicyControlLabelHolderLeft' : 'classicyControlLabelHolderRight',
            )}
            onClick={(e) => {
                e.preventDefault()
                if (onClickFunc) {
                    onClickFunc(e)
                }
            }}
        >
            {icon && <img src={icon} width={imageSize(iconSize)} alt={label} />}

            {isLeftOrBottom && children}

            <label
                htmlFor={labelFor}
                className={classNames(
                    'classicyControlLabel',
                    sizeClassMap[labelSize],
                    disabled && 'classicyControlLabelDisabled',
                    direction === 'right' ? 'classicyControlLabelMarginRight' : 'classicyControlLabelMarginLeft',
                )}
            >
                {label}
            </label>

            {!isLeftOrBottom && children}
        </div>
    )
}
