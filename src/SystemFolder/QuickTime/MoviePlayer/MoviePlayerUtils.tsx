import appIcon from "@img/icons/system/quicktime/player.png";

export type QuickTimeMovieDocument = {
  url: string;
  name: string;
  type: "audio" | "video";
  icon?: string;
  options?: Record<string, object>;
  subtitlesUrl?: string;
};

export const MoviePlayerAppInfo = {
name: "Movie Player",
  id: "MoviePlayer.app",
  icon: appIcon,
};
