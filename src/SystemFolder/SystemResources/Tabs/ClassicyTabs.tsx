import "./ClassicyTabs.scss";
import {
	type FC as FunctionalComponent,
	type KeyboardEvent,
	type ReactNode,
	useRef,
	useState,
} from "react";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";

export interface TabProps {
	tabs: TabIndividual[];
}

export interface TabIndividual {
	/** Text label for the tab. Optional when an icon is supplied. */
	title?: string;
	/** Icon shown on the tab, alongside the title or on its own. */
	icon?: string;
	children: ReactNode;
}

/** Stable identity for a tab, used for React keys and DOM ids. */
const tabKey = (tab: TabIndividual, index: number): string =>
	tab.title && tab.title.length > 0 ? tab.title : `tab-${index}`;

export const ClassicyTabs: FunctionalComponent<TabProps> = ({ tabs }) => {
	const [activeTab, setActiveTab] = useState(0);
	const player = useSoundDispatch();
	const { track } = useClassicyAnalytics();
	const analyticsArgs = { tabs: tabs.map((t) => t.title) };
	const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

	const selectTab = (tabId: number) => {
		player({ type: "ClassicySoundPlay", sound: "ClassicyTabClickUp" });
		track("click", { type: "ClassicyTab", tabId, ...analyticsArgs });
		setActiveTab(tabId);
	};

	const pressTab = (tabId: number) => {
		player({ type: "ClassicySoundPlay", sound: "ClassicyTabClickDown" });
		track("selected", { type: "ClassicyTab", tabId, ...analyticsArgs });
	};

	const focusTab = (tabId: number) => {
		buttonRefs.current[tabId]?.focus();
	};

	// Roving tablist keyboard traversal (Left/Right/Up/Down/Home/End) per
	// WAI-ARIA and Mac OS 8 HIG tab keyboard behavior. Activation follows focus.
	const handleTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		const count = tabs.length;
		if (count === 0) return;
		let next: number;
		switch (e.key) {
			case "ArrowRight":
			case "ArrowDown":
				next = (activeTab + 1) % count;
				break;
			case "ArrowLeft":
			case "ArrowUp":
				next = (activeTab - 1 + count) % count;
				break;
			case "Home":
				next = 0;
				break;
			case "End":
				next = count - 1;
				break;
			default:
				return;
		}
		e.preventDefault();
		selectTab(next);
		focusTab(next);
	};

	return (
		<div className={"classicyTabContainer"}>
			<div className={"classicyButtonsHolder"} role="tablist">
				{tabs.map((tab, index) => {
					const key = tabKey(tab, index);
					const isActive = index === activeTab;
					return (
						<div key={`button_${key}`} className={"classicyTabButtonWrapper"}>
							<button
								type="button"
								role="tab"
								id={`${key}-tab`}
								aria-selected={isActive}
								aria-controls={`${key}-panel`}
								tabIndex={isActive ? 0 : -1}
								ref={(el) => {
									buttonRefs.current[index] = el;
								}}
								className={
									"classicyTabButton" +
									" " +
									(isActive ? "classicyTabButtonActive" : "")
								}
								onMouseDown={() => pressTab(index)}
								onMouseUp={() => selectTab(index)}
								onKeyDown={handleTabKeyDown}
							>
								{tab.icon && (
									<img
										className={"classicyTabButtonIcon"}
										src={tab.icon}
										alt={""}
										aria-hidden={true}
									/>
								)}
								{tab.title && (
									<span className={"classicyTabButtonLabel"}>{tab.title}</span>
								)}
							</button>
						</div>
					);
				})}
			</div>
			<div className={"classicyTabsHolder"}>
				{tabs.map((tab, index) => {
					const key = tabKey(tab, index);
					const isActive = index === activeTab;
					return (
						<div
							id={`${key}-panel`}
							key={key}
							role="tabpanel"
							aria-labelledby={`${key}-tab`}
							hidden={!isActive}
							className={
								isActive
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
