import './ClassicyContextualMenu.scss'
import {ClassicyMenu, ClassicyMenuItem} from '@/SystemFolder/SystemResources/Menu/ClassicyMenu'
import {ClassicyMenuProvider} from '@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider'
import '@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss'
import { FC as FunctionalComponent } from 'react'

interface ClassicyMenuProps {
    name: string
    position: number[]
    menuItems: ClassicyMenuItem[]
    onClose?: () => void
}

export const ClassicyContextualMenu: FunctionalComponent<ClassicyMenuProps> = ({name, menuItems, position, onClose}) => {
    return (
        <ClassicyMenuProvider onClose={onClose}>
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
        </ClassicyMenuProvider>
    )
}
