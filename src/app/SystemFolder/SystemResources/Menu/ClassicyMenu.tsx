import classicyMenuStyles from '@/app/SystemFolder/SystemResources/Menu/ClassicyMenu.module.scss'
import { useSoundDispatch } from '@/app/SystemFolder/SystemResources/SoundManager/ClassicySoundManagerContext'
import classNames from 'classnames'
import React from 'react'

export interface ClassicyMenuItem {
    id: string
    title?: string
    image?: string
    disabled?: boolean
    icon?: string
    keyboardShortcut?: string
    link?: string
    onClickFunc?: any
    menuChildren?: ClassicyMenuItem[]
    className?: string
}

interface ClassicyMenuProps {
    menuItems: ClassicyMenuItem[]
    navClass?: string
    subNavClass?: string
    children?: any
}

const ClassicyMenu: React.FC<ClassicyMenuProps> = ({ menuItems, navClass, subNavClass, children }) => {
    const player = useSoundDispatch()

    const generateMenuItem = (menuItem: ClassicyMenuItem, subNavClass: string = 'default') => {
        if (menuItem) {
            let newMenuItem = <></>
            if (menuItem.id === 'spacer') {
                return <hr />
            } else {
                newMenuItem = (
                    <>
                        <p>
                            {menuItem.image !== undefined &&
                                (newMenuItem = <img src={menuItem.image} alt={menuItem.title} />)}
                            {!!menuItem.icon && <img src={menuItem.icon} alt={menuItem.title} />}
                            {menuItem.title}
                        </p>
                        <p
                            className={classicyMenuStyles.classicyMenuItemKeyboardShortcut}
                            dangerouslySetInnerHTML={{ __html: menuItem.keyboardShortcut }}
                        ></p>
                    </>
                )
            }

            return (
                <li
                    id={menuItem.id}
                    key={menuItem.id}
                    onClick={() => {
                        if (menuItem.onClickFunc) {
                            menuItem.onClickFunc()
                        }
                    }}
                    onMouseOver={() => {
                        player({ type: 'ClassicySoundPlay', sound: 'ClassicyMenuItemHover' })
                    }}
                    onMouseOut={() => {
                        player({ type: 'ClassicySoundPlay', sound: 'ClassicyMenuItemClick' })
                    }}
                    className={classNames(
                        classicyMenuStyles.classicyMenuItem,
                        !!menuItem.icon ? '' : classicyMenuStyles.classicyMenuItemNoImage,
                        menuItem.className,
                        menuItem.disabled ? classicyMenuStyles.classicyMenuItemDisabled : '',
                        menuItem.menuChildren && menuItem.menuChildren.length > 0
                            ? classicyMenuStyles.classicyMenuItemChildMenuIndicator
                            : ''
                    )}
                >
                    {newMenuItem}
                    {menuItem.menuChildren &&
                        menuItem.menuChildren.length > 0 &&
                        generateMenu(menuItem.menuChildren, subNavClass, subNavClass)}
                </li>
            )
        }
    }
    const generateMenu = (
        items: ClassicyMenuItem[],
        navClass: string = classicyMenuStyles.classicyMenu,
        subNavClass: string = classicyMenuStyles.classicySubMenu,
        children?: any
    ) => {
        if (items && items.length > 0) {
            return (
                <div className={classicyMenuStyles.classicyMenuWrapper}>
                    <ul className={classNames(navClass)}>
                        {items.map((item: ClassicyMenuItem) => generateMenuItem(item, subNavClass))}
                        {children}
                    </ul>
                </div>
            )
        }
    }

    return generateMenu(menuItems, navClass, subNavClass, children)
}

export default ClassicyMenu
