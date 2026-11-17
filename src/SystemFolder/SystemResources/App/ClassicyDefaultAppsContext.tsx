import { createContext } from "react";

export type ClassicyDefaultAppsContextValue = {
	disableSimpleText: boolean;
	disablePDFViewer: boolean;
	disableMoviePlayer: boolean;
	disablePictureViewer: boolean;
	disableHyperCard: boolean;
	disableWebViewer: boolean;
	disableCalculator: boolean;
};

export const ClassicyDefaultAppsContext =
	createContext<ClassicyDefaultAppsContextValue>({
		disableSimpleText: false,
		disablePDFViewer: false,
		disableMoviePlayer: false,
		disablePictureViewer: false,
		disableHyperCard: false,
		disableWebViewer: false,
		disableCalculator: false,
	});
