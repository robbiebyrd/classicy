import ClassicyControlLabel from '@/app/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel'
import classicyInputStyles from '@/app/SystemFolder/SystemResources/Input/ClassicyInput.module.scss'
import classNames from 'classnames'
import React from 'react'

interface ClassicyInputProps {
    id: string
    inputType?: 'text'
    onChangeFunc?: any
    labelTitle?: string
    placeholder?: string
    prefillValue?: string
    disabled?: boolean
    isDefault?: boolean
    ref?: any
}

const ClassicyInput: React.FC<ClassicyInputProps> = React.forwardRef<HTMLInputElement, ClassicyInputProps>(
    function ClassicyInput(
        { id, inputType = 'text', labelTitle, placeholder, prefillValue, disabled = false, isDefault, onChangeFunc },
        ref
    ) {
        return (
            <div className={classicyInputStyles.classicyInputHolder}>
                {labelTitle && (
                    <ClassicyControlLabel
                        label={labelTitle}
                        labelFor={id}
                        direction={'left'}
                        disabled={disabled}
                    ></ClassicyControlLabel>
                )}
                <input
                    id={id}
                    tabIndex={0}
                    onChange={onChangeFunc}
                    name={id}
                    type={inputType}
                    ref={ref}
                    disabled={disabled}
                    value={prefillValue}
                    placeholder={placeholder}
                    className={classNames(
                        classicyInputStyles.classicyInput,
                        isDefault ? classicyInputStyles.classicyInputDefault : ''
                    )}
                ></input>
            </div>
        )
    }
)

export default ClassicyInput
