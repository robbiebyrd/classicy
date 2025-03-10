import classicyCheckboxStyles from '@/app/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox.module.scss'
import ClassicyControlLabel from '@/app/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel'
import classNames from 'classnames'
import React, { MouseEventHandler } from 'react'

type ClassicyCheckboxProps = {
    id: string
    checked?: boolean
    mixed?: boolean
    isDefault?: boolean
    disabled?: boolean
    onClickFunc?: MouseEventHandler
    label?: string
}
const ClassicyCheckbox: React.FC<ClassicyCheckboxProps> = ({
    id,
    checked,
    mixed,
    isDefault,
    disabled,
    onClickFunc,
    label,
}) => {
    const [check, setChecked] = React.useState<boolean>(checked)

    const handleOnClick = (e: React.MouseEvent<Element, MouseEvent>) => {
        if (!disabled) {
            setChecked(check)
        }
        if (onClickFunc) {
            onClickFunc(e)
        }
    }
    const onCheck = () => {
        setChecked(!check)
    }

    return (
        <div className={classicyCheckboxStyles.ClassicyCheckboxGroup} onClick={handleOnClick}>
            <input
                type={'checkbox'}
                onChange={onCheck}
                tabIndex={0}
                id={id}
                checked={check}
                disabled={disabled}
                className={classNames(
                    classicyCheckboxStyles.ClassicyCheckbox,
                    isDefault ? classicyCheckboxStyles.ClassicyCheckboxDefault : '',
                    mixed ? classicyCheckboxStyles.ClassicyCheckboxMixed : ''
                )}
            />
            <ClassicyControlLabel label={label} labelFor={id} disabled={disabled} />
        </div>
    )
}
export default ClassicyCheckbox
