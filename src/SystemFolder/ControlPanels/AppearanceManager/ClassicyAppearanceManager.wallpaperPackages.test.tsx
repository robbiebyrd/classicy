// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { registerClassicyWallpapers } from "@/Appearance/ClassicyAssetRegistry";
import {
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { APPEARANCE_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { platinumWallpaperUrl } from "../../../../packages/appearance/platinum/src/assets/platinumWallpapers";

// 0143, end to end: a second package registers its own "default.png" beside
// Platinum's; with that package's theme active, the Desktop tab's two
// "Default"s each store and render their own image.
const FOO_DEFAULT = "/foo/default.png";

const base = getTheme("default");
registerClassicyAppearancePackage({
	id: "foo",
	name: "Foo",
	css: "",
	defaults: {
		...structuredClone(base),
		id: "foo",
		name: "Foo",
		package: "foo",
		desktop: { ...base.desktop, backgroundImage: "default.png" },
	},
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
});
registerClassicyWallpapers("foo", [
	{ name: "Foo Default", file: "default.png", src: FOO_DEFAULT },
]);

const appearance = () => useAppManager.getState().System.Manager.Appearance;

const openDesktopTab = async () => {
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop controlStrip={false} />
		</ClassicyAppManagerProvider>,
	);
	await waitFor(() => {
		expect(
			useAppManager.getState().System.Manager.Applications.apps[
				APPEARANCE_MANAGER_APP_ID
			],
		).toBeDefined();
	});
	act(() => {
		dispatch({
			type: "ClassicyAppOpen",
			app: {
				id: APPEARANCE_MANAGER_APP_ID,
				name: "Appearance Manager",
				icon: "",
			},
		});
	});
	// Query inside the window: a document-wide role query on the whole
	// desktop is slow under jsdom.
	const win = await screen.findByRole("application", {
		name: "Appearance Manager",
	});
	// ClassicyTabs selects on mouse-up (press/release), not click.
	const tab = within(win).getByRole("tab", { name: "Desktop" });
	fireEvent.mouseDown(tab);
	fireEvent.mouseUp(tab);
	return within(within(win).getByRole("tabpanel"));
};

const background = () => appearance().activeTheme.desktop.backgroundImage;
const rendered = () =>
	getThemeVars(appearance().activeTheme)["--desktop-background-image"];

// Whole-desktop integration, like ClassicyAppearanceManager.customTheme.
describe("Appearance Manager — two packages' default.png", {
	timeout: 15_000,
}, () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(
			JSON.parse(
				JSON.stringify(DefaultAppManagerState),
			) as typeof DefaultAppManagerState,
			true,
		);
		act(() => {
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: "foo",
			});
		});
		expect(appearance().activeTheme.package).toBe("foo");
	});

	it("stores and renders Platinum's Default and the package's own, each its own", async () => {
		const panel = await openDesktopTab();
		const user = userEvent.setup();
		const patterns = () => panel.getAllByRole("combobox")[0];
		expect(patterns()).toHaveTextContent("Foo Default");

		await user.click(patterns());
		// The options open in a portal, outside the panel.
		await user.click(screen.getByRole("option", { name: "Default" }));
		await waitFor(() => expect(background()).toBe("platinum|default.png"));
		expect(rendered()).toBe(`url("${platinumWallpaperUrl("default.png")}")`);
		expect(patterns()).toHaveTextContent(/^Default$/);

		await user.click(patterns());
		await user.click(screen.getByRole("option", { name: "Foo Default" }));
		await waitFor(() => expect(background()).toBe("default.png"));
		expect(rendered()).toBe(`url("${FOO_DEFAULT}")`);
		expect(patterns()).toHaveTextContent("Foo Default");
	});
});
