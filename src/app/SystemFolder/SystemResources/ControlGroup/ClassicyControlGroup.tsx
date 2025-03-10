import classicyControlGroupStyles from '@/app/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup.module.scss'
import classNames from 'classnames'
import React from 'react'

const ClassicyControlGroup = ({ label = '', columns = false, children }) => {
    return (
        <fieldset
            className={classNames(
                classicyControlGroupStyles.classicyControlGroup,
                columns
                    ? classicyControlGroupStyles.classicyControlGroupColumns
                    : classicyControlGroupStyles.classicyControlGroupNoColumns
            )}
        >
            {label !== '' && <legend className={classicyControlGroupStyles.classicyControlGroupLegend}>{label}</legend>}
            <div className={columns ? classicyControlGroupStyles.classicyControlGroupContentColumns : ''}>
                {children}
            </div>
        </fieldset>
    )
}
export default ClassicyControlGroup
