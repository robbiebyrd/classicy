import "./ClassicyTabs.scss";
import tabMaskImageURL from "@img/ui/tab.svg?base64";
import {
	type FC as FunctionalComponent,
	type MouseEvent,
	type ReactNode,
	useState,
} from "react";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

export interface TabProps {
	tabs: TabIndividual[];
}

export interface TabIndividual {
	title: string;
	children: ReactNode;
}

export const ClassicyTabs: FunctionalComponent<TabProps> = ({ tabs }) => {
	const [activeTab, setActiveTab] = useState(0);
	const player = useSoundDispatch();
	const { track } = useClassicyAnalytics();
	const analyticsArgs = { tabs: tabs.map((t) => t.title) };

	const handleTabClick = (e: MouseEvent<HTMLButtonElement>) => {
		player({ type: "ClassicySoundPlay", sound: "ClassicyTabClickUp" });
		const tabId = parseInt((e.target as HTMLButtonElement).id, 10);
		track("click", { type: "ClassicyTab", tabId, ...analyticsArgs });
		setActiveTab(tabId);
	};
	const startTabClick = (e: MouseEvent<HTMLButtonElement>) => {
		player({ type: "ClassicySoundPlay", sound: "ClassicyTabClickDown" });
		const tabId = parseInt((e.target as HTMLButtonElement).id, 10);
		track("selected", { type: "ClassicyTab", tabId, ...analyticsArgs });
	};

	return (
		<div className={"classicyTabContainer"}>
			<div className={"classicyButtonsHolder"}>
				{tabs.map((tab, index) => {
					return (
						<div
							key={`button_${tab.title}`}
							className={"classicyTabButtonWrapper"}
							style={{
								maskImage: `url(data:image/svg+xml;base64,${tabMaskImageURL}`,
							}}
						>
							<button
								type="button"
								id={index.toString()}
								style={{
									maskImage: `url(data:image/svg+xml;base64,${tabMaskImageURL}`,
								}}
								className={
									"classicyTabButton" +
									" " +
									(index === activeTab ? "classicyTabButtonActive" : "")
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
							key={tab.title}
							className={
								index === activeTab
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
