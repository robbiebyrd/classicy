import { z } from "zod";
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

// An open file can be either a manually-opened document (url-only, e.g. the
// demo video) or a plain ClassicyFileSystem path (e.g. a video double-clicked
// in Finder — see ClassicyAppMoviePlayerOpenFile), resolved to a source at
// render time via ClassicyFileSystem + resolveFileSystemEntrySource.
export type MoviePlayerOpenFile = string | MoviePlayerOpenDocument;

export type MoviePlayerData = {
	openFiles: MoviePlayerOpenFile[];
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

/** Manifest schema for one open file: a filesystem path or a media document. */
export const MoviePlayerOpenFileSchema = z.union([
	z.string().describe("A ClassicyFileSystem path to a media file."),
	z
		.looseObject({
			url: z.string().describe("Source URL of the media document."),
			name: z.string().optional().describe("Display name of the document."),
			type: z
				.enum(["audio", "video", "image"])
				.optional()
				.describe("Media kind, when known."),
			icon: z.string().optional().describe("Icon shown for the document."),
			subtitlesUrl: z
				.string()
				.optional()
				.describe("URL of an optional subtitle track."),
		})
		.describe("A manually opened media document."),
]);

/** Manifest schema for MoviePlayer.app's `data` (see registerApp). */
export const MoviePlayerDataSchema = z.looseObject({
	openFiles: z
		.array(MoviePlayerOpenFileSchema)
		.optional()
		.describe("Media documents currently open in Movie Player."),
});

export const MoviePlayerAppInfo = {
	name: "Movie Player",
	id: "MoviePlayer.app",
	icon: appIcon,
};
