import "./ClassicyTabs.scss";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import tabMaskImageURL from "@img/ui/tab.svg?base64";
import React, { useState } from "react";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

interface TabProps {
  tabs: TabIndividual[];
}

interface TabIndividual {
  title: string;
  children: React.ReactNode;
}

export const ClassicyTabs: React.FC<TabProps> = ({ tabs }) => {
  const [activeTab, setActiveTab] = useState(0);
  const player = useSoundDispatch();
  const { track } = useClassicyAnalytics();
  const analyticsArgs = { tabs: tabs.map((t) => t.title) };

  const handleTabClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    player({ type: "ClassicySoundPlay", sound: "ClassicyTabClickUp" });
    const tabId = parseInt((e.target as HTMLButtonElement).id);
    track("click", { type: "ClassicyTab", tabId, ...analyticsArgs });
    setActiveTab(tabId);
  };
  const startTabClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    player({ type: "ClassicySoundPlay", sound: "ClassicyTabClickDown" });
    const tabId = parseInt((e.target as HTMLButtonElement).id);
    track("selected", { type: "ClassicyTab", tabId, ...analyticsArgs });
  };

  return (
    <div className={"classicyTabContainer"}>
      <div className={"classicyButtonsHolder"}>
        {tabs.map((tab, index) => {
          return (
            <div
              key={"button_" + index.toString()}
              className={"classicyTabButtonWrapper"}
              style={{
                maskImage: `url(data:image/svg+xml;base64,${tabMaskImageURL}`,
              }}
            >
              <button
                id={index.toString()}
                style={{
                  maskImage: `url(data:image/svg+xml;base64,${tabMaskImageURL}`,
                }}
                className={
                  "classicyTabButton" +
                  " " +
                  (index == activeTab ? "classicyTabButtonActive" : "")
                }
                onMouseDown={startTabClick}
                onMouseUp={handleTabClick}
              >
                {tab.title}
              </button>
            </div>
          );
        })}
      </div>
      <div className={"classicyTabsHolder"}>
        {tabs.map((tab, index) => {
          return (
            <div
              id={index.toString()}
              key={index.toString()}
              className={
                index == activeTab
                  ? "classicyTabActiveContent"
                  : "classicyTabHiddenContent"
              }
            >
              {tab.children}
            </div>
          );
        })}
      </div>
    </div>
  );
};
