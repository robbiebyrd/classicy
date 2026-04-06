import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
const appIcon = ClassicyIcons.system.quicktime.player;

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
