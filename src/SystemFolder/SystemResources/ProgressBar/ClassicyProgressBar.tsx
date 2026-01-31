import './ClassicyProgressBar.scss'
import classNames from 'classnames'
import React from 'react'

interface ClassicyProgressProps {
    value?: number
    max?: number
    indeterminate?: boolean
}

export const ClassicyProgressBar: React.FC<ClassicyProgressProps> = ({ max = 100, value = 0, indeterminate }) => {
    const effectiveMax = indeterminate ? 100 : max
    const effectiveValue = indeterminate ? 100 : value

    return (
        <div
            className={classNames(
                "classicyProgress",
                indeterminate
                    ? "classicyProgressIndeterminate"
                    : "classicyProgressDeterminate"
            )}
        >
            <progress max={effectiveMax} value={effectiveValue} />
        </div>
    )
}
