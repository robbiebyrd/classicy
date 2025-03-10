import classicyControlLabelStyles from '@/app/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.module.scss'
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
}

const ClassicyControlLabel: React.FC<ClassicyControlLabelProps> = ({
    labelFor = '',
    label = '',
    labelSize = 'medium',
    disabled = false,
    direction = 'left',
    icon,
    iconSize,
    children,
}) => {
    const getDirectionClass = (direction: ClassicyControlLabelDirections) => {
        if (direction === 'right') {
            return classicyControlLabelStyles.classicyControlLabelRight
        }
        return classicyControlLabelStyles.classicyControlLabelLeft
    }

    const getSizeClass = (size: ClassicyControlLabelSize) => {
        switch (size) {
            case 'small':
                return classicyControlLabelStyles.classicyControlLabelSmall
            case 'medium':
                return classicyControlLabelStyles.classicyControlLabelMedium
            case 'large':
                return classicyControlLabelStyles.classicyControlLabelLarge
        }
        return classicyControlLabelStyles.classicyControlLabelLeft
    }

    const imageSize = (size: string) => {
        if (iconSize === 'sm') {
            return '16px'
        }
        if (iconSize === 'lg') {
            return '64px'
        }
        return '32px'
    }

    if (label !== '') {
        return (
            <div
                style={{
                    display: 'flex',
                    flexDirection: ['left', 'bottom'].includes(direction) ? 'row' : 'row-reverse',
                    alignItems: icon ? 'center' : '',
                }}
            >
                {icon && <img src={icon} width={imageSize(iconSize)} alt={label} />}

                {['left', 'bottom'].includes(direction) && children}

                <label
                    htmlFor={labelFor}
                    className={classNames(
                        classicyControlLabelStyles.classicyControlLabel,
                        disabled ? classicyControlLabelStyles.classicyControlLabelDisabled : '',
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
}

export default ClassicyControlLabel
