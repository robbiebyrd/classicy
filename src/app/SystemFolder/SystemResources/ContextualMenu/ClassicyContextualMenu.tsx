import classicyContextMenuStyles from '@/app/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenu.module.scss'
import ClassicyMenu, { ClassicyMenuItem } from '@/app/SystemFolder/SystemResources/Menu/ClassicyMenu'
import classicyMenuStyles from '@/app/SystemFolder/SystemResources/Menu/ClassicyMenu.module.scss'
import React from 'react'

interface ClassicyMenuProps {
    position: number[]
    menuItems: ClassicyMenuItem[]
}

const ClassicyContextualMenu: React.FC<ClassicyMenuProps> = ({ menuItems, position }) => {
    return (
        <div
            className={classicyContextMenuStyles.classicyContextMenuWrapper}
            style={{ left: position[0], top: position[1] }}
        >
            <ClassicyMenu menuItems={menuItems} subNavClass={classicyMenuStyles.classicyContextSubMenu}></ClassicyMenu>
        </div>
    )
}

export default ClassicyContextualMenu
