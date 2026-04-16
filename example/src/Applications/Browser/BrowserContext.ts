import type {
	ActionMessage,
	ClassicyStore,
} from "classicy";
import { registerAppEventHandler } from "classicy";
import { normalizeUrl } from "./browserUtils";

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
	let appData: Record<string, unknown> = ds.System.Manager.Applications.apps[appId].data ?? {};

	switch (action.type) {
		case "ClassicyAppBrowserSetHomePage": {
			appData = { ...appData, homePage: { url: action.url, label: action.label, icon: action.icon } };
			break;
		}
		case "ClassicyAppBrowserInitFavorites": {
			if (!("favorites" in appData)) {
				appData = { ...appData, favorites: action.favorites };
			}
			break;
		}
		case "ClassicyAppBrowserAddFavorite": {
			appData = { ...appData, favorites: [...(appData.favorites as BrowserFavorite[] ?? []), action.favorite] };
			break;
		}
		case "ClassicyAppBrowserRemoveFavorite": {
			if (!appData.favorites) break;
			appData = { ...appData, favorites: (appData.favorites as BrowserFavorite[]).filter((f) => f.id !== action.id) };
			break;
		}
		case "ClassicyAppBrowserRecordVisit": {
			if (!("history" in appData)) {
				appData = { ...appData, history: [] };
			}
			const normalizedUrl = normalizeUrl(action.url);
			const history: BrowserHistoryEntry[] = (appData.history as BrowserHistoryEntry[]).filter(
				(h: BrowserHistoryEntry) => normalizeUrl(h.url) !== normalizedUrl,
			);
			history.push({ url: action.url, visitedAt: new Date().toISOString() });
			appData = { ...appData, history: history.slice(-MAX_HISTORY) };
			break;
		}
		case "ClassicyAppBrowserClearHistory": {
			appData = { ...appData, history: [] };
			break;
		}
		case "ClassicyAppBrowserUpdateProxyConfig": {
			appData = { ...appData, proxyConfig: action.proxyConfig };
			break;
		}
		case "ClassicyAppBrowserSetShowFavoritesBar": {
			appData = { ...appData, showFavoritesBar: action.showFavoritesBar };
			break;
		}
		default:
			break;
	}
	ds.System.Manager.Applications.apps[appId].data = appData;
	return ds;
};

registerAppEventHandler("ClassicyAppBrowser", classicyBrowserEventHandler);
