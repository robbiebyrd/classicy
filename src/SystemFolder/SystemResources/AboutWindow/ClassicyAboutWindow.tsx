import './ClassicyAboutWindow.scss'
import {ClassicyButton} from '@/SystemFolder/SystemResources/Button/ClassicyButton'
import {ClassicyWindow} from '@/SystemFolder/SystemResources/Window/ClassicyWindow'
import { ClassicyMenuItem } from '@/SystemFolder/SystemResources/Menu/ClassicyMenu'
import React from "react";

type ClassicyAboutWindowProps = {
    appId: string
    appName: string
    appIcon: string
    hideFunc: any
    appMenu?: ClassicyMenuItem[]
}
export const ClassicyAboutWindow: React.FC<ClassicyAboutWindowProps> = ({
    appId,
    appName,
    appIcon,
    hideFunc,
    appMenu,
}) => {
    return (
        <ClassicyWindow
            id="AppearanceManager_about"
            appId={appId}
            closable={false}
            resizable={false}
            zoomable={false}
            scrollable={false}
            collapsable={false}
            initialSize={[0, 0]}
            initialPosition={[50, 50]}
            modal={true}
            appMenu={appMenu}
        >
            <div className={"aboutWindow"}>
                <img src={appIcon} alt="About" />
                <h1>{appName}</h1>
                <h5>Not Copyright &copy; 1997 Apple Computer, Inc.</h5>
                <ClassicyButton onClickFunc={hideFunc}>OK</ClassicyButton>
            </div>
        </ClassicyWindow>
    )
}

export const getClassicyAboutWindow = (props: ClassicyAboutWindowProps) => {
    return <ClassicyAboutWindow {...props} />
}
