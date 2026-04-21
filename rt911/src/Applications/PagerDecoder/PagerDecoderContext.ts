import type {
	ActionMessage,
	ClassicyStore,
} from "classicy";
import { registerAppEventHandler } from "classicy";

export interface PagerDecoderFilter {
	provider: string;
	id_type: string;
	channel: string;
	mode: string;
	recipient_id: string;
	message: string;
}

export interface PagerDecoderSettings {
	retentionLines: number;
	filter: PagerDecoderFilter;
}

export const DEFAULT_PAGER_SETTINGS: PagerDecoderSettings = {
	retentionLines: 200,
	filter: {
		provider: "",
		id_type: "",
		channel: "",
		mode: "",
		recipient_id: "",
		message: "",
	},
};

export const classicyPagerDecoderEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
) => {
	const appId = "PagerDecoder.app";
	if (!ds.System.Manager.Applications.apps[appId]) return ds;
	let appData = ds.System.Manager.Applications.apps[appId].data;

	switch (action.type) {
		case "ClassicyAppPagerDecoderInitSettings": {
			if (!appData) appData = {};
			if (!("settings" in appData)) {
				appData.settings = action.settings;
			}
			break;
		}
		case "ClassicyAppPagerDecoderUpdateSettings": {
			if (!appData) appData = {};
			appData.settings = {
				...(appData.settings ?? DEFAULT_PAGER_SETTINGS),
				...action.settings,
			};
			break;
		}
	}

	ds.System.Manager.Applications.apps[appId].data = { ...appData };
	return ds;
};

registerAppEventHandler(
	"ClassicyAppPagerDecoder",
	classicyPagerDecoderEventHandler,
);
