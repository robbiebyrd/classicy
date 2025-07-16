import './ClassicyContextualMenu.scss'
import {ClassicyMenu, ClassicyMenuItem} from '@/SystemFolder/SystemResources/Menu/ClassicyMenu'
import '@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss'
import React from 'react'

interface ClassicyMenuProps {
    name: string
    position: number[]
    menuItems: ClassicyMenuItem[]
}

export const ClassicyContextualMenu: React.FC<ClassicyMenuProps> = ({name, menuItems, position}) => {
    return (
        <div
            className={"classicyContextMenuWrapper"}
            style={{left: position[0], top: position[1]}}
        >
            <ClassicyMenu
                name={name}
                menuItems={menuItems}
                subNavClass={"classicyContextSubMenu"}
            ></ClassicyMenu>
        </div>
    )
}
