import classNames from "classnames";
import * as React from "react";
import {Suspense} from "react";
import Finder from "./Finder";
import {getAllThemes, getThemeVars} from "./PlatinumAppearance"
import PlatinumContextMenu from "./PlatinumContextMenu";
import platinumDesktop from "./PlatinumDesktop.module.scss";
import {useDesktop, useDesktopDispatch} from "./PlatinumDesktopContext";
import PlatinumDesktopIcon from "./PlatinumDesktopIcon";
import PlatinumDesktopMenu from "./PlatinumDesktopMenu";

interface PlatinumDesktopProps {
    children?: any;
}

const PlatinumDesktop: React.FC<PlatinumDesktopProps> = ({children}) => {

    const [contextMenu, setContextMenu] = React.useState(false);
    const [contextMenuLocation, setContextMenuLocation] = React.useState([0, 0]);

    const [selectBoxStart, setSelectBoxStart] = React.useState([0, 0]);
    const [selectBoxSize, setSelectBoxSize] = React.useState([0, 0]);
    const [selectBox, setSelectBox] = React.useState(false);

    const clickOffset = [10, 10];

    const desktopState = useDesktop();
    const desktopEventDispatch = useDesktopDispatch();

    if (desktopState.availableThemes.length <= 0) {
        desktopEventDispatch({
            type: "PlatinumDesktopLoadThemes",
            availableThemes: getAllThemes(),
        });
    }


    const startSelectBox = (e) => {
        if (e.target.id === "platinumDesktop") {
            if (e.button > 1) {
                toggleDesktopContextMenu(e);
            } else {
                clearActives(e);
                setSelectBox(true);
                setSelectBoxStart([e.clientX, e.clientY]);
                setSelectBoxSize([0, 0]);
            }
        }
    }

    const resizeSelectBox = (e) => {
        setSelectBoxSize([e.clientX - selectBoxStart[0], e.clientY - selectBoxStart[1]]);
    }

    const clearSelectBox = (e) => {
        setSelectBoxSize([0, 0]);
        setSelectBoxStart([0, 0]);
        setSelectBox(false);
    }

    const clearActives = (e) => {
        setContextMenu(false);
        desktopEventDispatch({
            type: "PlatinumDesktopFocus",
            e: e,
        });
    }

    const toggleDesktopContextMenu = (e) => {
        e.preventDefault();
        if (e.target.id === "platinumDesktop") {
            setContextMenuLocation([e.clientX - clickOffset[0], e.clientY - clickOffset[1]]);
            setContextMenu(!contextMenu);
        }
    }

    const defaultMenuItems = [
        {
            id: "finder.app_CleanupDesktopIcons",
            title: "Clean up...",
            onClickFunc: () => {
                desktopEventDispatch({
                    type: "PlatinumDesktopIconCleanup"
                });
            }
        }
    ];
    const currentTheme = getThemeVars(desktopState.activeTheme);

    React.useEffect(() => {
        desktopEventDispatch({
            type: "PlatinumDesktopIconCleanup"
        });
    }, [desktopEventDispatch]);

    return (
        <>
            <Suspense>
                <div id={"platinumDesktop"}
                     style={currentTheme as React.CSSProperties}
                     className={classNames(platinumDesktop.platinumDesktop)}
                     onMouseMove={resizeSelectBox}
                     onContextMenu={toggleDesktopContextMenu}
                     onClick={clearSelectBox}
                     onMouseDown={startSelectBox}>
                    {selectBox &&
                        <div className={platinumDesktop.platinumDesktopSelect}
                             style={{
                                 left: selectBoxStart[0],
                                 top: selectBoxStart[1],
                                 width: selectBoxSize[0],
                                 height: selectBoxSize[1]
                             }}/>
                    }
                    <PlatinumDesktopMenu menuItems={desktopState.menuBar}/>
                    {contextMenu && (
                        <PlatinumContextMenu menuItems={defaultMenuItems}
                                             position={contextMenuLocation}/>
                    )}
                    <Finder/>
                    {desktopState.desktopIcons.map(i => (
                        <PlatinumDesktopIcon
                            appId={i.appId}
                            appName={i.appName}
                            icon={i.icon}
                        />
                    ))}
                    {children}
                </div>
            </Suspense>
        </>
    );
};

export default PlatinumDesktop;
