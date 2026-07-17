import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import "./ClassicyDesktopMenuBar.scss";
import { ClassicyDesktopMenuWidgetSound } from "@/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Sound/ClassicyDesktopMenuWidgetSound";
import { ClassicyDesktopMenuWidgetTime } from "@/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime";
import {
	ClassicyMenu,
	type ClassicyMenuItem,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyMenuContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuContext";
import { ClassicyMenuProvider } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";
import "@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss";
import {
	type FC as FunctionalComponent,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from "react";

import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { appSwitcherAppsFrom } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";

const appleMenuIcon = ClassicyIcons.system.apple;

export const ClassicyDesktopMenuBar: FunctionalComponent = () => {
	return (
		<ClassicyMenuProvider>
			<ClassicyDesktopMenuBarContent />
		</ClassicyMenuProvider>
	);
};

const ClassicyDesktopMenuBarContent: FunctionalComponent = () => {
	const apps = useAppManager((s) => s.System.Manager.Applications.apps);
	const systemMenu = useAppManager((s) => s.System.Manager.Desktop.systemMenu);
	const appMenu = useAppManager((s) => s.System.Manager.Desktop.appMenu);
	const disableBalloonHelp = useAppManager(
		(s) => s.System.Manager.Desktop.disableBalloonHelp,
	);
	// Optional per-app Help entries. Read defensively so the bar works whether or
	// not a consumer has populated a `helpMenu` slot on the desktop store.
	const appHelpMenu = useAppManager((s) => s.System.Manager.Desktop?.helpMenu);
	const desktopEventDispatch = useAppManagerDispatch();
	const { closeAll } = useContext(ClassicyMenuContext);
	const navRef = useRef<HTMLElement>(null);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (navRef.current && !navRef.current.contains(e.target as Node)) {
				closeAll();
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [closeAll]);

	const appSwitcherData = useMemo(() => appSwitcherAppsFrom(apps), [apps]);

	const setActiveApp = (appId: string) => {
		desktopEventDispatch({
			type: "ClassicyAppFocus",
			app: { id: appId },
		});
	};

	const appSwitcherMenuMenuItem: ClassicyMenuItem = useMemo(() => {
		const focusedApp = appSwitcherData.find((a) => a.focused);
		return {
			id: "app-switcher",
			image: focusedApp?.icon || "",
			title: focusedApp?.name || "Finder",
			className: "classicyDesktopMenuAppSwitcher",
			menuChildren: appSwitcherData
				.filter((a) => a.open)
				.map((app) => ({
					id: app.id,
					icon: app.icon,
					title: app.name,
					onClickFunc: () => {
						setActiveApp(app.id);
					},
				})),
		};
		// biome-ignore lint/correctness/useExhaustiveDependencies: setActiveApp is defined inline and recreated each render; including it would cause infinite loops
	}, [appSwitcherData, setActiveApp]);

	// Standard Help menu (HIG Ch. 4 "Menu Bar"): rightmost of the standard
	// menus. About Balloon Help, a Show/Hide Balloons toggle wired to the
	// existing balloon-help store flag, and a slot for app-supplied help items.
	const helpMenuItem: ClassicyMenuItem = useMemo(() => {
		const helpChildren: ClassicyMenuItem[] = [
			{
				id: "help-about-balloon",
				title: "About Balloon Help…",
				onClickFunc: () => {},
			},
			{
				id: "help-toggle-balloons",
				title: disableBalloonHelp ? "Show Balloons" : "Hide Balloons",
				event: "ClassicyDesktopSetBalloonHelp",
				eventData: { disableBalloonHelp: !disableBalloonHelp },
			},
		];
		if (appHelpMenu && appHelpMenu.length > 0) {
			helpChildren.push({ id: "spacer" }, ...appHelpMenu);
		}
		return {
			id: "help-menu",
			title: "Help",
			className: "classicyDesktopMenuHelp",
			menuChildren: helpChildren,
		};
	}, [disableBalloonHelp, appHelpMenu]);

	const defaultMenuItems: ClassicyMenuItem[] = useMemo(() => {
		const systemMenuItem: ClassicyMenuItem = {
			id: "apple-menu",
			image: appleMenuIcon,
			menuChildren: systemMenu,
			className: "clasicyDesktopMenuAppleMenu",
		};
		const items = [systemMenuItem] as ClassicyMenuItem[];
		if (appMenu) {
			items.push(...appMenu);
		}
		// Help is the rightmost standard menu; the App Switcher floats to the far
		// right of the bar (8.5+ construct) and is kept last in the data.
		items.push(helpMenuItem);
		items.push(appSwitcherMenuMenuItem);
		return items;
	}, [systemMenu, appMenu, helpMenuItem, appSwitcherMenuMenuItem]);

	return (
		<nav ref={navRef} className={"classicyDesktopMenuBar"}>
			<ClassicyMenu
				name={"desktopMenuBar"}
				menuItems={defaultMenuItems}
				navClass={"classicyDesktopMenu"}
				subNavClass={"classicySubMenu"}
			>
				<ClassicyDesktopMenuWidgetSound />
				<ClassicyDesktopMenuWidgetTime />
			</ClassicyMenu>
		</nav>
	);
};
