import ClassicyControlLabel from '@/app/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel'
import classicyDisclosureStyles from '@/app/SystemFolder/SystemResources/Disclosure/ClassicyDisclosure.module.scss'
import classNames from 'classnames'
import React from 'react'

type ClassicyDisclosureTriangleDirections = 'up' | 'right' | 'down' | 'left'

type ClassicyDisclosureProps = {
    direction?: ClassicyDisclosureTriangleDirections
    label?: string
    children?: any
}

const ClassicyDisclosure: React.FC<ClassicyDisclosureProps> = ({ direction = 'right', label = '', children }) => {
    const [open, setOpen] = React.useState(false)
    const triangleClassOpenName =
        'classicyDisclosureTriangle' +
        direction.charAt(0).toUpperCase() +
        direction.slice(1) +
        (open ? 'Open' : 'Closed')

    function handleKeyPress(e) {
        switch (e.key) {
            case 'Enter':
            case ' ': {
                setOpen(!open)
            }
        }
    }

    return (
        <div className={classNames(classicyDisclosureStyles.classicyDisclosure)}>
            <div
                className={classicyDisclosureStyles.classicyDisclosureHeader}
                onClick={() => {
                    setOpen(!open)
                }}
                tabIndex={0}
                onKeyDown={(e) => handleKeyPress(e)}
            >
                <svg
                    id="a"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 6.44 11.12"
                    className={classNames(
                        classicyDisclosureStyles.classicyDisclosureTriangle,
                        classicyDisclosureStyles[triangleClassOpenName]
                    )}
                >
                    <polygon
                        className={classicyDisclosureStyles.classicyDisclosureTriangleDropShadow}
                        points="6.44 6.05 1.17 1.07 .93 11.12 6.44 6.05"
                    />
                    <polygon
                        className={classicyDisclosureStyles.classicyDisclosureTriangleOutline}
                        points="5.68 5.34 0 0 0 10.68 5.68 5.34"
                    />
                    <polygon
                        className={classicyDisclosureStyles.classicyDisclosureTriangleHighlight}
                        points="4.79 5.34 .76 1.82 .76 8.86 4.79 5.34"
                    />
                    <polygon
                        className={classicyDisclosureStyles.classicyDisclosureTriangleInner}
                        points="4.79 5.34 1.27 3.42 1.29 8.43 4.79 5.34"
                    />
                    <polygon
                        className={classicyDisclosureStyles.classicyDisclosureTriangleShadow}
                        points=".76 8.29 .76 8.86 4.79 5.34 4.47 5.05 .76 8.29"
                    />
                </svg>
                <ClassicyControlLabel label={label} />
            </div>
            <div
                className={classNames(
                    classicyDisclosureStyles.classicyDisclosureInner,
                    open === true
                        ? classicyDisclosureStyles.classicyDisclosureInnerOpen
                        : classicyDisclosureStyles.classicyDisclosureInnerClose
                )}
            >
                {children}
            </div>
        </div>
    )
}
export default ClassicyDisclosure
