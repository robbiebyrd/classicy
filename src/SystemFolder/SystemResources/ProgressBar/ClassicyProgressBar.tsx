import './ClassicyProgressBar.scss'
import classNames from 'classnames'
import React from 'react'

interface ClassicyProgressProps {
    value?: number
    max?: number
    indeterminate?: boolean
}

const ClassicyProgressBar: React.FC<ClassicyProgressProps> = ({ max = 100, value = 0, indeterminate }) => {
    if (indeterminate) {
        max = 100
        value = 100
    }

    return (
        <div
            className={classNames(
                "classicyProgress",
                indeterminate
                    ? "classicyProgressIndeterminate"
                    : "classicyProgressDeterminate"
            )}
        >
            <progress max={max} value={value} />
        </div>
    )
}
