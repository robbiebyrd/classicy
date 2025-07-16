import './ClassicyTimePicker.scss'
import {ClassicyControlLabel} from '@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel'
import {ClassicyPopUpMenu} from '@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu'
import classNames from 'classnames'
import React, {ChangeEvent, KeyboardEvent, useState} from 'react'

interface ClassicyTimePickerProps {
    id: string
    inputType?: 'text'
    onChangeFunc?: any
    labelTitle?: string
    placeholder?: string
    prefillValue?: Date
    disabled?: boolean
    isDefault?: boolean
    ref?: any
}

export const ClassicyTimePicker: React.FC<ClassicyTimePickerProps> = React.forwardRef<
    HTMLInputElement,
    ClassicyTimePickerProps
>(function ClassicyTimePicker(
    {id, inputType = 'text', labelTitle, placeholder, prefillValue, disabled = false, isDefault, onChangeFunc},
    ref
) {
    if (!prefillValue) {
        prefillValue = new Date()
    }

    const [selectedDate, setSelectedDate] = useState<Date>(prefillValue)
    const [hour, setHour] = useState<string>(prefillValue.getHours().toString())
    const [minutes, setMinutes] = useState<string>(prefillValue.getMinutes().toString())
    const [seconds, setSeconds] = useState<string>(prefillValue.getSeconds().toString())
    const [period, setPeriod] = useState<string>(prefillValue.getHours() < 12 ? 'am' : 'pm')

    const handleDateChange = (date: Date) => {
        onChangeFunc && onChangeFunc(date)
    }

    const handlePeriodChange = (e: ChangeEvent<HTMLInputElement>) => {
        setPeriod(e.target.value)

        let updatedDate = new Date(selectedDate)
        let hours = parseInt(hour)

        if (e.target.value == 'pm') {
            hours += 12
        }

        if (hours >= 24) {
            hours = 0
        }

        updatedDate.setHours(hours)
        setSelectedDate(updatedDate)
        handleDateChange(updatedDate)
    }

    const handleTimePartChange = (e: ChangeEvent<HTMLInputElement>, part: 'hour' | 'minutes' | 'seconds') => {
        let inputValue = parseInt(e.currentTarget.value)
        let updatedDate = new Date(selectedDate)

        if (isNaN(inputValue)) {
            return
        }

        switch (part) {
            case 'hour':
                if (inputValue < 1 || inputValue > 12) {
                    return
                }
                if (period === 'pm') {
                    inputValue = inputValue < 12 ? inputValue + 12 : inputValue
                } else {
                    inputValue = inputValue === 12 ? 0 : inputValue
                }
                updatedDate.setHours(inputValue)
                setHour(e.currentTarget.value)
                break
            case 'minutes':
                if (inputValue < 0 || inputValue > 59) {
                    return
                }
                updatedDate.setMinutes(inputValue)
                setMinutes(e.currentTarget.value)
                break
            case 'seconds':
                if (inputValue < 0 || inputValue > 59) {
                    return
                }
                updatedDate.setSeconds(inputValue)
                setSeconds(e.currentTarget.value)
                break
        }

        setSelectedDate(updatedDate)
        handleDateChange(updatedDate)
    }

    const incrementTimePartChange = (e: KeyboardEvent<HTMLInputElement>, part: 'hour' | 'minutes' | 'seconds') => {
        let updatedDate = new Date(selectedDate)
        let modifier = 0

        switch (e.key) {
            case 'ArrowDown':
                modifier = -1
                break
            case 'ArrowUp':
                modifier = 1
                break
        }

        switch (part) {
            case 'hour':
                let currentHour = parseInt(hour) + modifier
                if (currentHour > 12 || currentHour <= 0) {
                    return
                }
                updatedDate.setHours(currentHour)
                setHour(currentHour.toString())
                break
            case 'minutes':
                let currentMinutes = parseInt(minutes) + modifier
                if (currentMinutes < 0 || currentMinutes > 59) {
                    return
                }
                updatedDate.setMinutes(currentMinutes)
                setMinutes(currentMinutes.toString())
                break
            case 'seconds':
                let currentSeconds = parseInt(seconds) + modifier
                if (currentSeconds < 0 || currentSeconds > 59) {
                    return
                }
                updatedDate.setSeconds(currentSeconds)
                setSeconds(currentSeconds.toString())
                break
        }

        setSelectedDate(updatedDate)
        handleDateChange(updatedDate)
    }

    return (
        <div className={"classicyTimePickerHolder"}>
            {labelTitle && (
                <ClassicyControlLabel
                    label={labelTitle}
                    labelFor={id}
                    direction={'left'}
                    disabled={disabled}
                ></ClassicyControlLabel>
            )}
            <div
                className={classNames(
                    "classicyTimePicker",
                    isDefault ? "classicyTimePickerDefault" : ''
                )}
            >
                <input
                    id={id + '_hour'}
                    tabIndex={0}
                    name={id + '_hour'}
                    type={inputType}
                    ref={ref}
                    disabled={disabled}
                    placeholder={placeholder}
                    onClick={(e) => e.currentTarget.select()}
                    onChange={(e) => handleTimePartChange(e, 'hour')}
                    onBlur={(e) => handleTimePartChange(e, 'hour')}
                    onKeyDown={(e) => incrementTimePartChange(e, 'hour')}
                    value={parseInt(hour) % 12 === 0 ? 12 : parseInt(hour) % 12}
                    maxLength={2}
                    style={{width: '50%'}}
                ></input>
                :
                <input
                    id={id + '_minutes'}
                    tabIndex={0}
                    name={id + '_minutes'}
                    type={inputType}
                    ref={ref}
                    disabled={disabled}
                    value={String(minutes)}
                    onClick={(e) => e.currentTarget.select()}
                    onChange={(e) => handleTimePartChange(e, 'minutes')}
                    onBlur={(e) => handleTimePartChange(e, 'minutes')}
                    onKeyDown={(e) => incrementTimePartChange(e, 'minutes')}
                    maxLength={2}
                    style={{width: '50%'}}
                ></input>
                :
                <input
                    id={id + '_seconds'}
                    tabIndex={0}
                    name={id + '_seconds'}
                    type={inputType}
                    ref={ref}
                    disabled={disabled}
                    value={String(seconds)}
                    onClick={(e) => e.currentTarget.select()}
                    onChange={(e) => handleTimePartChange(e, 'seconds')}
                    onBlur={(e) => handleTimePartChange(e, 'seconds')}
                    onKeyDown={(e) => incrementTimePartChange(e, 'seconds')}
                    maxLength={2}
                    style={{width: '50%'}}
                ></input>
            </div>
            <ClassicyPopUpMenu
                selected={period}
                id={'am-pm'}
                options={[
                    {label: 'am', value: 'am'},
                    {label: 'pm', value: 'pm'},
                ]}
                style={{minWidth: 'calc(var(--ui-font-size) * 4)'}}
                onChangeFunc={handlePeriodChange}
            ></ClassicyPopUpMenu>
        </div>
    )
})
