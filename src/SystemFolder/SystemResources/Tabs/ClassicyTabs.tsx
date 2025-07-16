import './ClassicyTabs.scss'
import {useSoundDispatch} from '@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext'
import tabMaskImageURL from 'img/ui/tab.svg'
import React, {useState} from 'react'

interface TabProps {
    tabs: TabIndividual[]
}

interface TabIndividual {
    title: string
    children: any
}

export const ClassicyTabs: React.FC<TabProps> = ({tabs}) => {
    const [activeTab, setActiveTab] = useState(0)
    const player = useSoundDispatch()

    const handleTabClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        player({type: 'ClassicySoundPlay', sound: 'ClassicyTabClickUp'})
        setActiveTab(parseInt((e.target as HTMLButtonElement).id))
    }
    const startTabClick = (e: React.MouseEvent<HTMLButtonElement>)=> {
        player({type: 'ClassicySoundPlay', sound: 'ClassicyTabClickDown'})
    }

    return (
        <div className={"classicyTabContainer"}>
            <div className={"classicyButtonsHolder"}>
                {tabs.map((tab, index) => {
                    return (
                        <div
                            key={'button_' + index.toString()}
                            className={"classicyTabButtonWrapper"}
                            style={{maskImage: `url('${tabMaskImageURL}`}}
                        >
                            <button
                                id={index.toString()}
                                style={{maskImage: `url('${tabMaskImageURL}`}}
                                className={
                                    "classicyTabButton" +
                                    ' ' +
                                    (index == activeTab ? "classicyTabButtonActive" : '')
                                }
                                onMouseDown={startTabClick}
                                onMouseUp={handleTabClick}
                            >
                                {tab.title}
                            </button>
                        </div>
                    )
                })}
            </div>
            <div className={"classicyTabsHolder"}>
                {tabs.map((tab, index) => {
                    return (
                        <div
                            id={index.toString()}
                            key={index.toString()}
                            className={index == activeTab ? "classicyTabActiveContent" : "classicyTabHiddenContent"}
                        >
                            {tab.children}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
