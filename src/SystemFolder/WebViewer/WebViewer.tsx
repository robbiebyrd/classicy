import { type FC as FunctionalComponent, useCallback } from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeAllWindowsMenuItemHelper,
	closeWindowMenuItemHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { isSameOriginUrl } from "@/SystemFolder/SystemResources/Shortcut/ClassicyShortcut";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import "./WebViewer.scss";
import {
	WebViewerAppInfo,
	type WebViewerOpenUrl,
} from "@/SystemFolder/WebViewer/WebViewerUtils";
import "./WebViewerContext";

const { name: appName, id: appId, icon: appIcon } = WebViewerAppInfo;

/**
 * Renders a shortcut target inside the desktop.
 *
 * Cross-origin targets are sandboxed; same-origin ones are not. That asymmetry
 * is deliberate: a same-origin frame can reach its own frame element and delete
 * the sandbox attribute, so applying it there would be theater while breaking
 * nothing. See isSameOriginUrl.
 */
const WebViewerFrame: FunctionalComponent<{ url: string; title: string }> = ({
	url,
	title,
}) =>
	isSameOriginUrl(url) ? (
		<iframe className="classicyWebViewerFrame" src={url} title={title} />
	) : (
		<iframe
			className="classicyWebViewerFrame"
			src={url}
			title={title}
			sandbox="allow-scripts allow-popups"
			referrerPolicy="no-referrer"
		/>
	);

export const WebViewer: FunctionalComponent = () => {
	const desktopEventDispatch = useAppManagerDispatch();
	const appState = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId],
	);

	const rawOpenUrls = appState?.data?.openUrls;
	const openUrls: WebViewerOpenUrl[] = Array.isArray(rawOpenUrls)
		? (rawOpenUrls as WebViewerOpenUrl[])
		: [];

	const closeUrl = useCallback(
		(url: string) => {
			desktopEventDispatch({
				type: "ClassicyAppWebViewerCloseUrl",
				app: { id: appId },
				url,
			});
		},
		[desktopEventDispatch],
	);

	const closeWindow = useClassicyWindowClose(appId);
	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		appId,
		appName,
		appIcon,
	);

	const buildAppMenu = useCallback(
		(windowId: string, url: string) => [
			{
				id: `${windowId}_file`,
				title: "File",
				menuChildren: [
					closeWindowMenuItemHelper(`${windowId}_close_window`, () =>
						closeWindow(windowId, {
							type: "ClassicyAppWebViewerCloseUrl",
							app: { id: appId },
							url,
						}),
					),
					closeAllWindowsMenuItemHelper(`${appId}_close_all_windows`, () => {
						openUrls.forEach((u) => {
							closeWindow(`${appId}_url_${u.url}`, {
								type: "ClassicyAppWebViewerCloseUrl",
								app: { id: appId },
								url: u.url,
							});
						});
					}),
					quitMenuItemHelper(appId, appName, appIcon),
				],
			},
			{
				id: `${windowId}_help`,
				title: "Help",
				menuChildren: [aboutMenuItem],
			},
		],
		[closeWindow, openUrls, aboutMenuItem],
	);

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			handlesOwnFiles={true}
			showDesktopIcon={false}
			showInApplicationsFolder={false}
		>
			{openUrls.map((entry, idx) => {
				const windowId = `${appId}_url_${entry.url}`;
				return (
					<ClassicyWindow
						key={windowId}
						id={windowId}
						title={entry.title}
						appId={appId}
						scrollable={false}
						initialSize={[640, 520]}
						initialPosition={[180 + idx * 30, 70 + idx * 30]}
						appMenu={buildAppMenu(windowId, entry.url)}
						growable={true}
						onCloseFunc={() => closeUrl(entry.url)}
					>
						<WebViewerFrame url={entry.url} title={entry.title} />
					</ClassicyWindow>
				);
			})}
			{aboutWindow}
		</ClassicyApp>
	);
};
