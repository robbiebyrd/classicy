import appIcon from "@img/icons/system/quicktime/player.png";

export type QuickTimeImageDocument = {
	url: string;
	name?: string;
	icon?: string;
};

export const PictureViewerAppInfo = {
	name: "Picture Viewer",
	id: "PictureViewer.app",
	icon: appIcon,
};
