import { useDesktop, useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import { useSound } from '@/app/SystemFolder/SystemResources/SoundManager/ClassicySoundManagerContext'
import ClassicyWindow from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow'
import React from 'react'
import { JSONTree } from 'react-json-tree'
import { intToHex } from '@/app/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors'

interface ClassicyAppProps {
    id: string
    name: string
    icon: string
    defaultWindow: string
    noDesktopIcon?: boolean
    debug?: boolean
    openOnBoot?: boolean
    children?: any
    appContext?: any
}

const ClassicyApp: React.FC<ClassicyAppProps> = ({
    id,
    icon,
    name,
    openOnBoot,
    noDesktopIcon,
    appContext,
    defaultWindow,
    debug = false,
    children,
}) => {
    const desktopContext = useDesktop()
    const desktopEventDispatch = useDesktopDispatch()

    const themeData = desktopContext.System.Manager.Appearance.activeTheme
    const debuggerJSONTheme = {
        base00: intToHex(themeData.color.white),
        base01: intToHex(themeData.color.black),
        base02: intToHex(themeData.color.system[3]),
        base03: intToHex(themeData.color.system[3]),
        base04: intToHex(themeData.color.system[3]),
        base05: intToHex(themeData.color.system[4]),
        base06: intToHex(themeData.color.system[5]),
        base07: intToHex(themeData.color.system[6]),
        base08: intToHex(themeData.color.error),
        base09: intToHex(themeData.color.theme[2]),
        base0A: intToHex(themeData.color.theme[1]),
        base0B: intToHex(themeData.color.theme[2]),
        base0C: intToHex(themeData.color.theme[3]),
        base0D: intToHex(themeData.color.theme[4]),
        base0E: intToHex(themeData.color.theme[5]),
        base0F: intToHex(themeData.color.theme[6]),
    }

    const isAppOpen = () => {
        const appOpen = desktopContext.System.Manager.App.apps.find((i) => i.id === id && i.open)
        return !!appOpen
    }

    const isAppActive = () => {
        if (desktopContext && 'activeApp' in desktopContext) {
            return id === desktopContext.activeApp
        }
        return true
    }

    const onFocus = () => {
        desktopEventDispatch({
            type: 'ClassicyAppActivate',
            app: { id: id },
        })
    }

    React.useEffect(() => {
        if (isAppActive()) {
            desktopEventDispatch({
                type: 'ClassicyWindowFocus',
                app: {
                    id: id,
                },
                window: {
                    id: defaultWindow,
                },
            })
        }

        if (!noDesktopIcon) {
            desktopEventDispatch({
                type: 'ClassicyDesktopIconAdd',
                app: {
                    id: id,
                    name: name,
                    icon: icon,
                },
                kind: 'app_shortcut',
            })
        }
    }, [noDesktopIcon])

    if (debug) {
        let debugWindow = (
            <ClassicyWindow
                initialSize={[400, 300]}
                initialPosition={[100, 200]}
                title={'DEBUG ' + name}
                id={id + '_debugger'}
                appId={id}
                appMenu={[{ id: 'Debug', title: 'Debug' }]}
            >
                <h1>Providers</h1>
                <hr />
                <h2>appContext</h2>
                <JSONTree data={appContext} theme={debuggerJSONTheme} />
                <br />
                <h2>desktopContext</h2>
                <JSONTree data={desktopContext} theme={debuggerJSONTheme} />
                <br />
                <h2>soundPlayer</h2>
                <JSONTree data={useSound} theme={debuggerJSONTheme} />
            </ClassicyWindow>
        )

        if (Array.isArray[children]) {
            children = [...children, debugWindow]
        } else {
            children = [children, debugWindow]
        }
    }

    return <div onMouseDown={onFocus}>{isAppOpen() && <>{children}</>}</div>
}

export default ClassicyApp
