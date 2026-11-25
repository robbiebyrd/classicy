import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

export const quitAppHelper = (
	appId: string,
	appName: string,
	appIcon: string,
) => {
	return {
		type: "ClassicyAppClose",
		app: {
			id: appId,
			title: appName,
			icon: appIcon,
		},
	};
};

/**
 * An app's Quit item. `accessKey` is its access key, for a bundled app the
 * one `useClassicyBundledAccessKeys()` gives: Quit is unmarked (`""`, WIG
 * Appendix B Table B.5 names none), so the automatic pick never takes one.
 * Omitted, the item carries none, as before.
 */
export const quitMenuItemHelper = (
	appId: string,
	appName: string,
	appIcon: string,
	accessKey?: string,
) => {
	return {
		id: `${appId}_quit`,
		title: "Quit",
		...(accessKey !== undefined ? { accessKey } : {}),
		event: "ClassicyAppClose",
		eventData: {
			app: {
				id: appId,
				title: appName,
				icon: appIcon,
			},
		},
	};
};

/**
 * An app's Close Window item. `accessKey` is its access key, for a bundled
 * app `useClassicyBundledAccessKeys()("c")` (WIG Appendix B Table B.5: Close
 * C); omitted, it carries none, as before.
 */
export const closeWindowMenuItemHelper = (
	id: string,
	onClickFunc: () => void,
	accessKey?: string,
): ClassicyMenuItem => {
	return {
		id,
		title: "Close Window",
		...(accessKey !== undefined ? { accessKey } : {}),
		onClickFunc,
	};
};

/**
 * An app's Close All Windows item. `accessKey` is its access key; omitted
 * (the bundled apps': Table B.5 names none), the package's automatic pick,
 * if any, gives it one.
 */
export const closeAllWindowsMenuItemHelper = (
	id: string,
	onClickFunc: () => void,
	accessKey?: string,
): ClassicyMenuItem => {
	return {
		id,
		title: "Close All Windows",
		...(accessKey !== undefined ? { accessKey } : {}),
		onClickFunc,
	};
};
