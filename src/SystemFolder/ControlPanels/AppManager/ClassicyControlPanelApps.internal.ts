/**
 * The app ids a manifest marked a control panel (`registerApp({ controlPanel:
 * true })`), kept in a leaf module so the reducer path (Recent Items, from
 * `openApp`) reads them without importing the manifest registry, which
 * imports the kernel.
 */
const controlPanelApps = new Set<string>();

/** Called by `registerApp` for a registration that says `controlPanel: true`. */
export const markClassicyControlPanelApp = (appId: string): void => {
	controlPanelApps.add(appId);
};

/** True when a registration marked `appId` a control panel. */
export const isClassicyControlPanelApp = (appId: string): boolean =>
	controlPanelApps.has(appId);
