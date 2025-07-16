import './ClassicyCheckbox.scss'
import {ClassicyControlLabel} from '@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel'
import classNames from 'classnames'
import React, {useState} from 'react'

type ClassicyCheckboxProps = {
    id: string
    checked?: boolean
    mixed?: boolean
    isDefault?: boolean
    disabled?: boolean
    onClickFunc?: (checked: boolean) => void
    label?: string
}

export const ClassicyCheckbox: React.FC<ClassicyCheckboxProps> = ({
                                                                      id,
                                                                      checked,
                                                                      mixed,
                                                                      isDefault,
                                                                      disabled,
                                                                      onClickFunc,
                                                                      label,
                                                                  }) => {
    const [check, setCheck] = useState<boolean>(checked || false)

    const handleOnClick = () => {
        if (onClickFunc) {
            onClickFunc(!check)
        }
        if (!disabled) {
            setCheck(!check)
        }
    }

    return (
        <div className={"ClassicyCheckboxGroup"}>
            <input
                type={'checkbox'}
                onClick={handleOnClick}
                tabIndex={0}
                id={id}
                checked={check}
                disabled={disabled}
                className={classNames(
                    "ClassicyCheckbox",
                    isDefault ? "ClassicyCheckboxDefault" : '',
                    mixed ? "ClassicyCheckboxMixed" : ''
                )}
            />
            <ClassicyControlLabel label={label} labelFor={id} disabled={disabled} onClickFunc={handleOnClick}/>
        </div>
    )
}
