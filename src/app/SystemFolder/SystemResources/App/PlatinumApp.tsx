import {getTheme} from "@/app/SystemFolder/Appearance/PlatinumAppearance";
import {
    useDesktop,
    useDesktopDispatch
} from '@/app/SystemFolder/SystemResources/Desktop/PlatinumDesktopAppManagerContext';
import {useSound} from "@/app/SystemFolder/SystemResources/Desktop/PlatinumDesktopSoundManagerContext";
import PlatinumWindow from "@/app/SystemFolder/SystemResources/Window/PlatinumWindow";
import React from "react";
import {JSONTree} from 'react-json-tree';

interface PlatinumAppProps {
    id: string;
    name: string;
    icon: string;
    defaultWindow: string;
    noDesktopIcon?: boolean;
    debug?: boolean;
    openOnBoot?: boolean;
    children?: any;
    appContext?: any;
}


const PlatinumApp: React.FC<PlatinumAppProps> = ({
                                                     id,
                                                     icon,
                                                     name,
                                                     openOnBoot,
                                                     noDesktopIcon,
                                                     appContext,
                                                     defaultWindow,
                                                     debug = false,
                                                     children
                                                 }) => {
    const desktopContext = useDesktop();
    const desktopEventDispatch = useDesktopDispatch();

    const themeData = getTheme(desktopContext.activeTheme);
    const debuggerJSONTheme = {
        base00: themeData.color.white,
        base01: themeData.color.black,
        base02: themeData.color.system[3],
        base03: themeData.color.system[3],
        base04: themeData.color.system[3],
        base05: themeData.color.system[4],
        base06: themeData.color.system[5],
        base07: themeData.color.system[6],
        base08: themeData.color.error,
        base09: themeData.color.theme[2],
        base0A: themeData.color.theme[1],
        base0B: themeData.color.theme[2],
        base0C: themeData.color.theme[3],
        base0D: themeData.color.theme[4],
        base0E: themeData.color.theme[5],
        base0F: themeData.color.theme[6],
    };

    const isAppOpen = () => {
        const appOpen = desktopContext.openApps.find((i) => i.id === id);
        return !!appOpen;
    }

    const onFocus = () => {
        desktopEventDispatch({
            type: "PlatinumAppFocus",
            app: {id: id},
        });
    }

    React.useEffect(() => {
        if (!noDesktopIcon) {
            desktopEventDispatch({
                type: "PlatinumDesktopIconAdd",
                app: {
                    id: id,
                    name: name,
                    icon: icon
                }
            });
        }
    }, [desktopEventDispatch]);

    if (debug) {
        let debugWindow = (
            <PlatinumWindow initialSize={[400, 300]}
                            initialPosition={[100, 200]}
                            title={"DEBUG " + name}
                            id={id + "_debugger"}
                            appId={id}
                            appMenu={[{id: "Debug", title: "Debug"}]}>
                <h1>Providers</h1>
                <hr/>
                <h2>appContext</h2>
                <JSONTree data={appContext} theme={debuggerJSONTheme}/>
                <br/>
                <h2>desktopContext</h2>
                <JSONTree data={desktopContext} theme={debuggerJSONTheme}/>
                <br/>
                <h2>soundPlayer</h2>
                <JSONTree data={useSound()} theme={debuggerJSONTheme}/>
            </PlatinumWindow>
        );

        if (Array.isArray[children]) {
            children = [...children, debugWindow];
        } else {
            children = [children, debugWindow];
        }
    }

    return (
        <div onMouseDown={onFocus}>
            {isAppOpen() &&
                <>
                    {children}
                </>
            }
        </div>
    );
};

export default PlatinumApp;
