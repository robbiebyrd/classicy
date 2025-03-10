import classicyButtonStyles from '@/app/SystemFolder/SystemResources/Button/ClassicyButton.module.scss'
import { useSoundDispatch } from '@/app/SystemFolder/SystemResources/SoundManager/ClassicySoundManagerContext'
import classNames from 'classnames'
import React from 'react'

type ClassicyButtonProps = {
    isDefault?: boolean
    disabled?: boolean
    onClick?: any
    children?: any
    buttonShape?: 'rectangle' | 'square'
    buttonSize?: 'medium' | 'small'
    buttonType?: 'button' | 'submit' | 'reset'
}

const ClassicyButton: React.FC<ClassicyButtonProps> = ({
    isDefault = false,
    buttonType = 'button',
    buttonShape = 'rectangle',
    buttonSize,
    disabled = false,
    onClick = null,
    children,
}) => {
    const player = useSoundDispatch()

    return (
        <button
            type={buttonType}
            tabIndex={0}
            role={buttonType}
            className={classNames(
                classicyButtonStyles.classicyButton,
                isDefault ? classicyButtonStyles.classicyButtonDefault : '',
                buttonShape === 'square' ? classicyButtonStyles.classicyButtonShapeSquare : '',
                buttonSize === 'small' ? classicyButtonStyles.classicyButtonSmall : ''
            )}
            onClick={onClick}
            onMouseDown={() => {
                player({ type: 'ClassicySoundPlay', sound: 'ClassicyButtonClickDown' })
            }}
            onMouseUp={() => {
                player({ type: 'ClassicySoundPlay', sound: 'ClassicyButtonClickUp' })
            }}
            disabled={disabled}
        >
            {children}
        </button>
    )
}

export default ClassicyButton
