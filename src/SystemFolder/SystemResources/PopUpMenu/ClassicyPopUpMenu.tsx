import {ClassicyControlLabel} from '@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel'
import './ClassicyPopUpMenu.scss'
import classNames from 'classnames'
import React, {ChangeEvent, useState} from 'react'

type classicyPopUpMenuOptions = {
    value: string
    label: string
    icon?: string
}

type classicyPopUpMenuProps = {
    id: string
    label?: string
    options: classicyPopUpMenuOptions[]
    selected?: string
    small?: boolean
    onChangeFunc?: any
    style?: any
}
export const ClassicyPopUpMenu: React.FC<classicyPopUpMenuProps> = ({
                                                                        id,
                                                                        label,
                                                                        options,
                                                                        selected,
                                                                        style,
                                                                        small = false,
                                                                        onChangeFunc,
                                                                    }) => {
    const [selectedItem, setSelectedItem] = useState(selected)

    const onChangeHandler = (e: ChangeEvent<HTMLSelectElement>) => {
        setSelectedItem(e.target.value)
        if (onChangeFunc) {
            onChangeFunc(e)
        }
    }

    return (
        <div className={"classicyPopUpMenuWrapper"}>
            {label && <ClassicyControlLabel label={label} direction={'right'}></ClassicyControlLabel>}
            <div
                style={{flexGrow: '2', ...style}}
                className={classNames(
                    "classicyPopUpMenu",
                    small ? "classicyPopUpMenuSmall" : ''
                )}
            >
                <select id={id} tabIndex={0} value={selectedItem} onChange={onChangeHandler}>
                    {options.map((o) => (
                        <option key={id + o.label + o.value} value={o.value}>
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    )
}
