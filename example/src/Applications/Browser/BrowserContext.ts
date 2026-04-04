import type {
	ActionMessage,
	ClassicyStore,
} from "classicy";
import { registerAppEventHandler } from "classicy";

export interface BrowserFavorite {
	id: string;
	title: string;
	url: string;
	icon: string;
}

export interface BrowserHistoryEntry {
	url: string;
	visitedAt: string;
}

const MAX_HISTORY = 500;

export const classicyBrowserEventHandler = (
	ds: ClassicyStore,
	action: ActionMessage,
) => {
	const appId = "Browser.app";
	if (!ds.System.Manager.Applications.apps[appId]) return ds;
	let appData = ds.System.Manager.Applications.apps[appId].data;

	switch (action.type) {
		case "ClassicyAppBrowserSetHomePage": {
			if (!appData) {
				appData = {};
			}
			appData.homePage = {
				url: action.url,
				label: action.label,
				icon: action.icon,
			};
			break;
		}
		case "ClassicyAppBrowserInitFavorites": {
			if (!appData) {
				appData = {};
			}
			if (!("favorites" in appData)) {
				appData.favorites = action.favorites;
			}
			break;
		}
		case "ClassicyAppBrowserAddFavorite": {
			if (!appData) {
				appData = { favorites: [] };
			}
			if (!("favorites" in appData)) {
				appData.favorites = [];
			}
			appData.favorites = [...appData.favorites, action.favorite];
			break;
		}
		case "ClassicyAppBrowserRemoveFavorite": {
			if (!appData?.favorites) break;
			appData.favorites = appData.favorites.filter(
				(f: BrowserFavorite) => f.id !== action.id,
			);
			break;
		}
		case "ClassicyAppBrowserRecordVisit": {
			if (!appData) {
				appData = {};
			}
			if (!("history" in appData)) {
				appData.history = [];
			}
			const normalize = (u: string) => {
				try {
					const parsed = new URL(u);
					if (parsed.hostname.startsWith("www.")) {
						parsed.hostname = parsed.hostname.slice(4);
					}
					return parsed.toString().replace(/\/+$/, "");
				} catch {
					return u.replace(/\/+$/, "");
				}
			};
			const normalizedUrl = normalize(action.url);
			const history: BrowserHistoryEntry[] = appData.history.filter(
				(h: BrowserHistoryEntry) => normalize(h.url) !== normalizedUrl,
			);
			history.push({ url: action.url, visitedAt: new Date().toISOString() });
			appData.history = history.slice(-MAX_HISTORY);
			break;
		}
		case "ClassicyAppBrowserClearHistory": {
			if (!appData) {
				appData = {};
			}
			appData.history = [];
			break;
		}
	}
	ds.System.Manager.Applications.apps[appId].data = { ...appData };
	return ds;
};

registerAppEventHandler("ClassicyAppBrowser", classicyBrowserEventHandler);
