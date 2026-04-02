import "./PictureViewer.scss";
import defaultDocumentIcon from "@img/icons/system/quicktime/movie.png";
import { type FC as FunctionalComponent, useEffect, useMemo } from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	PictureViewerAppInfo,
	type QuickTimeImageDocument,
} from "@/SystemFolder/QuickTime/PictureViewer/PictureViewerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { quitMenuItemHelper } from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

export const QuickTimePictureViewer: FunctionalComponent = () => {
	const { name: appName, id: appId, icon: appIcon } = PictureViewerAppInfo;

	const desktopEventDispatch = useAppManagerDispatch();
	const appData = useAppManager((s) => s.System.Manager.App.apps[appId]?.data);
	const appOpen = useAppManager((s) => s.System.Manager.App.apps[appId]?.open);

	const openDocuments =
		appData && "openFiles" in appData ? appData.openFiles : [];

	// Load Default Demo documents on open
	useEffect(() => {
		const data = appData || {};
		if (appOpen && (!data.openFiles || data.openFiles?.length === 0)) {
			const defaultDocs = [
				{
					url: "/assets/img/apps/quicktime/sample-picture.jpg",
					name: "Sample Picture",
					icon: defaultDocumentIcon,
				},
			];
			desktopEventDispatch({
				type: "ClassicyAppPictureViewerOpenDocuments",
				documents: defaultDocs,
			});
		}
	}, [appData, appOpen, desktopEventDispatch]);

	const appMenu = useMemo(
		() => [
			{
				id: "file",
				title: "File",
				menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
			},
		],
		[],
	);

	return (
		<ClassicyApp id={appId} name={appName} icon={appIcon}>
			{Array.isArray(openDocuments) && openDocuments.length > 0
				? openDocuments.map((doc: QuickTimeImageDocument) => (
						<ClassicyWindow
							key={`${doc.name}_${doc.url}`}
							id={`${appId}_PictureViewer_${doc.url}`}
							title={doc.name}
							icon={doc.icon || undefined}
							minimumSize={[300, 60]}
							appId={appId}
							closable={true}
							resizable={true}
							zoomable={true}
							scrollable={true}
							collapsable={false}
							initialSize={[400, 100]}
							initialPosition={[300, 50]}
							modal={false}
							appMenu={appMenu}
							onCloseFunc={() =>
								desktopEventDispatch({
									type: "ClassicyAppPictureViewerCloseDocument",
									document: doc,
								})
							}
						>
							<img
								src={doc.url}
								alt={doc.name}
								className={"classicyPictureViewerImage"}
							/>
						</ClassicyWindow>
					))
				: null}
		</ClassicyApp>
	);
};
