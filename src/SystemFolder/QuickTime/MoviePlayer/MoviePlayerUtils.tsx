import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

const appIcon = ClassicyIcons.system.quicktime.player;

export type QuickTimeMovieDocument = {
	url: string;
	name: string;
	type: "audio" | "video";
	icon?: string;
	options?: Record<string, object>;
	subtitlesUrl?: string;
};

// MoviePlayerData uses a relaxed document type (name optional, type optional)
// because event payloads may not include all required UI fields.
export type MoviePlayerOpenDocument = {
	url: string;
	name?: string;
	type?: "audio" | "video" | "image";
	icon?: string;
	options?: object;
	subtitlesUrl?: string;
};

export type MoviePlayerData = {
	openFiles: MoviePlayerOpenDocument[];
};

export function isMoviePlayerData(
	d: Record<string, unknown>,
): d is MoviePlayerData {
	return (
		d !== null &&
		typeof d === "object" &&
		"openFiles" in d &&
		Array.isArray(d.openFiles)
	);
}

export const MoviePlayerAppInfo = {
	name: "Movie Player",
	id: "MoviePlayer.app",
	icon: appIcon,
};
