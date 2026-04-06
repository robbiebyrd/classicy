import "./ClassicyAboutWindow.scss";
import {
	type FC as FunctionalComponent,
	type MouseEventHandler,
	useEffect,
} from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useClassicyAnalytics } from "@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

export type ClassicyAboutWindowProps = {
	appId: string;
	appName: string;
	appIcon: string;
	hideFunc: MouseEventHandler<HTMLButtonElement>;
	appMenu?: ClassicyMenuItem[];
};

export const ClassicyAboutWindow: FunctionalComponent<
	ClassicyAboutWindowProps
> = ({ appId, appName, appIcon, hideFunc, appMenu }) => {
	const { track } = useClassicyAnalytics();
	const desktopEventDispatch = useAppManagerDispatch();

	useEffect(() => {
		desktopEventDispatch({
			type: "ClassicyWindowFocus",
			app: { id: appId },
			window: { id: `${appId}_about` },
		});

		const analyticsArgs = {
			type: "ClassicyAboutWindow",
			appId,
			appName,
			appIcon,
		};
		track("open", analyticsArgs);
	}, [track, desktopEventDispatch, appId, appName, appIcon]);

	return (
		<ClassicyWindow
			id={`${appId}_about`}
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
				<h1 style={{fontFamily: "var(--header-font)"}}>{appName}</h1>
				<h5 style={{fontFamily: "var(--ui-font)"}}>Not Copyright &copy; 1997 Apple Computer, Inc.</h5>
				<ClassicyButton onClickFunc={hideFunc}>OK</ClassicyButton>
			</div>
		</ClassicyWindow>
	);
};
