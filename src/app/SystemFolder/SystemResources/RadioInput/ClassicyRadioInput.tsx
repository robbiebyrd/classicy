import ClassicyControlLabel from '@/app/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel'
import classicyRadioInputStyles from '@/app/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput.module.scss'
import { useSoundDispatch } from '@/app/SystemFolder/SystemResources/SoundManager/ClassicySoundManagerContext'
import classNames from 'classnames'
import React, { MouseEventHandler } from 'react'

type ClassicyRadioInputProps = {
    name: string
    label?: string
    align?: 'rows' | 'columns'
    disabled?: boolean
    onClickFunc?: MouseEventHandler
    inputs: ClassicyRadioInputValueProps[]
}

type ClassicyRadioInputValueProps = {
    id: string
    checked?: boolean
    mixed?: boolean
    isDefault?: boolean
    disabled?: boolean
    label?: string
}

const ClassicyRadioInput: React.FC<ClassicyRadioInputProps> = ({
    name,
    label,
    align = 'columns',
    disabled = false,
    onClickFunc,
    inputs,
}) => {
    const [check, setCheck] = React.useState<string>('')
    const player = useSoundDispatch()

    const handleOnClick = (e) => {
        setCheck(e.target.id)
        if (onClickFunc) {
            onClickFunc(e)
        }
    }
    const handleOnChange = (e) => {
        setCheck(e.target.id)
    }

    return (
        <>
            {label && <ClassicyControlLabel labelFor={name} disabled={disabled} label={label} direction={'left'} />}
            <div
                className={classNames(
                    classicyRadioInputStyles.classicyRadioInputGroup,
                    align === 'columns' ? classicyRadioInputStyles.classicyRadioInputGroupColumns : ''
                )}
            >
                {inputs &&
                    inputs.map((item) => (
                        <div key={name + item.id} onClick={handleOnClick}>
                            <div
                                className={classNames(
                                    classicyRadioInputStyles.classicyRadioInputWrapper,
                                    check === item.id ? classicyRadioInputStyles.classicyRadioInputWrapperChecked : '',
                                    item.disabled ? classicyRadioInputStyles.classicyRadioInputWrapperDisabled : ''
                                )}
                            >
                                <input
                                    id={item.id}
                                    name={name}
                                    disabled={item.disabled}
                                    checked={check === item.id || item.checked}
                                    className={classNames(
                                        classicyRadioInputStyles.classicyRadioInput,
                                        item.isDefault ? classicyRadioInputStyles.classicyRadioInputDefault : '',
                                        item.mixed ? classicyRadioInputStyles.classicyRadioInputMixed : ''
                                    )}
                                    type={'radio'}
                                    tabIndex={0}
                                    onChange={handleOnChange}
                                    onMouseDown={() => {
                                        player({ type: 'ClassicySoundPlay', sound: 'ClassicyInputRadioClickDown' })
                                    }}
                                    onMouseUp={() => {
                                        player({ type: 'ClassicySoundPlay', sound: 'ClassicyInputRadioClickUp' })
                                    }}
                                />
                            </div>
                            <ClassicyControlLabel labelFor={item.id} disabled={item.disabled} label={item.label} />
                        </div>
                    ))}
            </div>
        </>
    )
}
export default ClassicyRadioInput
