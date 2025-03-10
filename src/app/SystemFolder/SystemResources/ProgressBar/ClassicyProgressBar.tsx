import classicyProgressStyles from '@/app/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.module.scss'
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
                classicyProgressStyles.classicyProgress,
                indeterminate
                    ? classicyProgressStyles.classicyProgressIndeterminate
                    : classicyProgressStyles.classicyProgressDeterminate
            )}
        >
            <progress max={max} value={value} />
        </div>
    )
}

export default ClassicyProgressBar
