import ClassicyControlLabel from '@/app/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel'
import classicyPopUpMenuStyle from '@/app/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu.module.scss'
import classNames from 'classnames'
import React from 'react'

type classicyPopUpMenuOptions = {
    value: string
    label: string
}

type classicyPopUpMenuProps = {
    id: string
    label?: string
    options: classicyPopUpMenuOptions[]
    selected?: string
    small?: boolean
    onChangeFunc?: any
}
const ClassicyPopUpMenu: React.FC<classicyPopUpMenuProps> = ({
    id,
    label,
    options,
    selected,
    small = false,
    onChangeFunc,
}) => {
    return (
        <div className={classicyPopUpMenuStyle.classicyPopUpMenuWrapper}>
            {label && <ClassicyControlLabel label={label}></ClassicyControlLabel>}
            <div
                style={{ flexGrow: '2' }}
                className={classNames(
                    classicyPopUpMenuStyle.classicyPopUpMenu,
                    small ? classicyPopUpMenuStyle.classicyPopUpMenuSmall : ''
                )}
            >
                <select id={id} tabIndex={0} value={selected} onChange={onChangeFunc}>
                    {options.map((o) => (
                        <option key={o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    )
}
export default ClassicyPopUpMenu
