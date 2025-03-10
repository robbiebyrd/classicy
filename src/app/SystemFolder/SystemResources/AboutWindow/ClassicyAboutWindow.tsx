import appearanceManagerStyles from '@/app/SystemFolder/ControlPanels/AppearanceManager/AppearanceManager.module.scss'
import ClassicyButton from '@/app/SystemFolder/SystemResources/Button/ClassicyButton'
import ClassicyWindow from '@/app/SystemFolder/SystemResources/Window/ClassicyWindow'

type ClassicyAboutWindowProps = {
    appId: string
    appName: string
    appIcon: string
    hideFunc: any
    appMenu?: any
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
            <div className={appearanceManagerStyles.appearanceManagerAbout}>
                <img src={appIcon} alt="About" />
                <h1>{appName}</h1>
                <h5>Not Copyright 1998 Apple Computer, Inc.</h5>
                <ClassicyButton onClick={hideFunc}>OK</ClassicyButton>
            </div>
        </ClassicyWindow>
    )
}
