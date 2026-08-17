import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { HyperCardAppInfo } from "@/SystemFolder/HyperCard/HyperCardUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { WebViewer } from "@/SystemFolder/WebViewer/WebViewer";
import { WebViewerAppInfo } from "@/SystemFolder/WebViewer/WebViewerUtils";

// The app-manager store is module-level and survives between tests in this
// file, so anything we add to systemMenu must be taken back out.
afterEach(() => {
	dispatch({
		type: "ClassicyDesktopAppMenuRemove",
		app: HyperCardAppInfo,
	});
});

describe("Web Viewer visibility", () => {
	it("adds no desktop-icon record, so it is absent from Applications", () => {
		render(
			<ClassicyAppManagerProvider>
				<WebViewer />
			</ClassicyAppManagerProvider>,
		);
		const icons = useAppManager.getState().System.Manager.Desktop.icons;
		expect(icons.some((icon) => icon.appId === WebViewerAppInfo.id)).toBe(
			false,
		);
	});
});

describe("HyperCard Apple-menu visibility", () => {
	it("removes a persisted systemMenu entry when it mounts without addSystemMenu", () => {
		// Stand in for state restored from localStorage: the entry is already
		// there before the app mounts.
		dispatch({ type: "ClassicyDesktopAppMenuAdd", app: HyperCardAppInfo });
		expect(
			useAppManager
				.getState()
				.System.Manager.Desktop.systemMenu.some(
					(item) => item.id === `system_menu_${HyperCardAppInfo.id}`,
				),
		).toBe(true);

		render(
			<ClassicyAppManagerProvider>
				<ClassicyApp
					id={HyperCardAppInfo.id}
					name={HyperCardAppInfo.name}
					icon={HyperCardAppInfo.icon}
					showDesktopIcon={false}
				>
					<div />
				</ClassicyApp>
			</ClassicyAppManagerProvider>,
		);

		expect(
			useAppManager
				.getState()
				.System.Manager.Desktop.systemMenu.some(
					(item) => item.id === `system_menu_${HyperCardAppInfo.id}`,
				),
		).toBe(false);
	});
});
