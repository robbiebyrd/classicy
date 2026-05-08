import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

const appIcon = ClassicyIcons.system.quicktime.player;

export type QuickTimeImageDocument = {
	url: string;
	name?: string;
	icon?: string;
};

export type PictureViewerData = {
	openFiles: QuickTimeImageDocument[];
};

export function isPictureViewerData(
	d: Record<string, unknown>,
): d is PictureViewerData {
	return (
		d !== null &&
		typeof d === "object" &&
		"openFiles" in d &&
		Array.isArray(d.openFiles)
	);
}

export const PictureViewerAppInfo = {
	name: "Picture Viewer",
	id: "PictureViewer.app",
	icon: appIcon,
};
