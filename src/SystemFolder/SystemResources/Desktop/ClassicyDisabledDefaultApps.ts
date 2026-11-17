import { CALCULATOR_APP_ID } from "@/SystemFolder/Calculator/CalculatorManifest";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { HyperCardAppInfo } from "@/SystemFolder/HyperCard/HyperCardUtils";
import { PDFViewerAppInfo } from "@/SystemFolder/PDFViewer/PDFViewerUtils";
import { MoviePlayerAppInfo } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils";
import { PictureViewerAppInfo } from "@/SystemFolder/QuickTime/PictureViewer/PictureViewerUtils";
import { SIMPLE_TEXT_APP_ID } from "@/SystemFolder/SimpleText/SimpleTextManifest";
import type { ClassicyDefaultAppsContextValue } from "@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext";
import { CLASSICY_SYSTEM_MENU_APP_PREFIX } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppSwitcherUtils";
import { WebViewerAppInfo } from "@/SystemFolder/WebViewer/WebViewerUtils";

/**
 * The app each `disableX` prop keeps from mounting. Keyed by the context's
 * own fields, so a new `disableX` flag does not compile without its app.
 */
export const CLASSICY_DEFAULT_APP_IDS: Readonly<
	Record<keyof ClassicyDefaultAppsContextValue, string>
> = Object.freeze({
	disableSimpleText: SIMPLE_TEXT_APP_ID,
	disablePDFViewer: PDFViewerAppInfo.id,
	disableMoviePlayer: MoviePlayerAppInfo.id,
	disablePictureViewer: PictureViewerAppInfo.id,
	disableHyperCard: HyperCardAppInfo.id,
	disableWebViewer: WebViewerAppInfo.id,
	disableCalculator: CALCULATOR_APP_ID,
});

/** The ids of the default apps the host has disabled, in declaration order. */
export const classicyDisabledDefaultAppIds = (
	flags: ClassicyDefaultAppsContextValue,
): string[] =>
	(
		Object.keys(
			CLASSICY_DEFAULT_APP_IDS,
		) as (keyof ClassicyDefaultAppsContextValue)[]
	)
		.filter((flag) => flags[flag])
		.map((flag) => CLASSICY_DEFAULT_APP_IDS[flag]);

/**
 * The actions that clear what a disabled app left in saved state. An app
 * writes its Apple-menu entry and its icon record (which lists it in
 * Applications) when it mounts, and both persist; a visitor who saw the app
 * before the host disabled it would otherwise keep them, and an app saved
 * open would stay in the app switcher.
 *
 * Skips an app that is mounted anyway (`isMounted`): a host may disable a
 * default app and render it itself, and that copy owns its records.
 */
export function classicyDisabledDefaultAppCleanup(
	appIds: readonly string[],
	state: ClassicyStore,
	isMounted: (appId: string) => boolean,
): ActionMessage[] {
	const desktop = state.System.Manager.Desktop;
	const apps = state.System.Manager.Applications.apps;
	const actions: ActionMessage[] = [];
	for (const id of appIds) {
		if (isMounted(id)) continue;
		if (apps[id]?.open) actions.push({ type: "ClassicyAppClose", app: { id } });
		const menuId = `${CLASSICY_SYSTEM_MENU_APP_PREFIX}${id}`;
		if (desktop.systemMenu.some((item) => item?.id === menuId))
			actions.push({ type: "ClassicyDesktopAppMenuRemove", app: { id } });
		if (desktop.icons.some((icon) => icon.appId === id))
			actions.push({ type: "ClassicyDesktopIconRemove", app: { id } });
	}
	return actions;
}
