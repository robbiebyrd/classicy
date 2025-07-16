import './ClassicyButton.scss'
import { useSoundDispatch } from '@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext'
import classNames from 'classnames'
import React from 'react'

type ClassicyButtonProps = {
    isDefault?: boolean
    disabled?: boolean
    onClickFunc?: any
    children?: any
    buttonShape?: 'rectangle' | 'square'
    buttonSize?: 'medium' | 'small'
    buttonType?: 'button' | 'submit' | 'reset'
}

export const ClassicyButton: React.FC<ClassicyButtonProps> = ({
    isDefault = false,
    buttonType = 'button',
    buttonShape = 'rectangle',
    buttonSize,
    disabled = false,
    onClickFunc = null,
    children,
}) => {
    const player = useSoundDispatch()

    return (
        <button
            type={buttonType}
            tabIndex={0}
            role={buttonType}
            className={classNames(
                "classicyButton",
                isDefault ? "classicyButtonDefault" : '',
                buttonShape === 'square' ? "classicyButtonShapeSquare" : '',
                buttonSize === 'small' ? "classicyButtonSmall" : ''
            )}
            onClick={onClickFunc}
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
