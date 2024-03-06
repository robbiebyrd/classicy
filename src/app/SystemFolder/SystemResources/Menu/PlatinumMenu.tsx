import {useSoundDispatch} from "@/app/SystemFolder/SystemResources/Desktop/PlatinumDesktopSoundManagerContext";
import platinumMenuStyles from "@/app/SystemFolder/SystemResources/Menu/PlatinumMenu.module.scss";
import classNames from "classnames";
import React from "react";

export interface PlatinumMenuItem {
    id: string;
    title?: string;
    image?: string;
    disabled?: boolean;
    icon?: string;
    keyboardShortcut?: string;
    link?: string;
    onClickFunc?: any;
    menuChildren?: PlatinumMenuItem[];
    className?: string;
}

interface PlatinumMenuProps {
    menuItems: PlatinumMenuItem[];
    navClass?: string;
    subNavClass?: string;
    children?: any;
}

const PlatinumMenu: React.FC<PlatinumMenuProps> = (
    {
        menuItems,
        navClass,
        subNavClass,
        children
    }
) => {

    const player = useSoundDispatch();

    const generateMenuItem = (
            menuItem: PlatinumMenuItem,
            subNavClass: string = "default"
        ) => {
            if (menuItem) {
                let newMenuItem = <></>;
                if (menuItem.id === "spacer") {
                    return (<hr/>)
                } else {
                    newMenuItem = <>
                        <p>
                            {menuItem.image !== undefined && (
                                newMenuItem = <img src={menuItem.image} alt={menuItem.title}/>
                            )}
                            {!!menuItem.icon && (
                                <img src={menuItem.icon} alt={menuItem.title}/>
                            )}
                            {menuItem.title}
                        </p>
                        <p className={platinumMenuStyles.platinumMenuItemKeyboardShortcut}
                           dangerouslySetInnerHTML={{__html: menuItem.keyboardShortcut}}></p>
                    </>;
                }

                return (
                    <li id={menuItem.id} key={menuItem.id}
                        onClick={menuItem.onClickFunc}
                        onMouseOver={() => {
                            player({type: "PlatinumSoundPlay", sound: "PlatinumMenuItemHover"})
                        }}
                        onMouseOut={() => {
                            player({type: "PlatinumSoundPlay", sound: "PlatinumMenuItemClick"})
                        }}
                        className={classNames(platinumMenuStyles.platinumMenuItem,
                            !!menuItem.icon ? "" : platinumMenuStyles.platinumMenuItemNoImage, menuItem.className,
                            menuItem.disabled ? platinumMenuStyles.platinumMenuItemDisabled : "",
                            menuItem.menuChildren && menuItem.menuChildren.length > 0 ?
                                platinumMenuStyles.platinumMenuItemChildMenuIndicator
                                : "")
                        }
                    >
                        {newMenuItem}
                        {(menuItem.menuChildren && menuItem.menuChildren.length > 0) && (
                            generateMenu(menuItem.menuChildren, subNavClass, subNavClass)
                        )}
                    </li>)
            }
        }
    ;

    const generateMenu = (
        items: PlatinumMenuItem[],
        navClass: string = platinumMenuStyles.platinumMenu,
        subNavClass: string = platinumMenuStyles.platinumSubMenu,
        children?: any
    ) => {
        if (items && items.length > 0) {
            return (
                <div className={platinumMenuStyles.platinumMenuWrapper}>
                    <ul className={classNames(navClass)}>
                        {items.map((item: PlatinumMenuItem) => (
                            generateMenuItem(item, subNavClass)
                        ))}
                        {children}
                    </ul>
                </div>
            );
        }
    };

    return generateMenu(menuItems, navClass, subNavClass, children)
};

export default PlatinumMenu;

