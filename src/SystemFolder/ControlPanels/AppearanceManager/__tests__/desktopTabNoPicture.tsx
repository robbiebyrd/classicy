// Story 0195-wuo, end to end under whichever Appearance Package the caller
// registered and made active: the Desktop tab's None removes the desktop
// picture, a solid color then shows alone, and choosing the built-in theme
// again brings its picture back. Shared by the core's Platinum test and
// System 7's (packages/appearance/system7).
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect } from "vitest";
import { getThemeVars } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { APPEARANCE_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

const appearance = () => useAppManager.getState().System.Manager.Appearance;

/** The desktop root's drawn picture and color (its inline theme variables). */
const drawn = () => {
	const root = document.querySelector<HTMLElement>(".classicyDesktop");
	if (!root) throw new Error("no desktop");
	return {
		image: root.style.getPropertyValue("--desktop-background-image"),
		color: root.style.getPropertyValue("--desktop-background-color"),
	};
};

/** Mounts the desktop, opens the Appearance Manager on its Desktop tab. */
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
	const win = await screen.findByRole("application", {
		name: "Appearance Manager",
	});
	// ClassicyTabs selects on mouse-up (press/release), not click.
	const tab = within(win).getByRole("tab", { name: "Desktop" });
	fireEvent.mouseDown(tab);
	fireEvent.mouseUp(tab);
	return within(within(win).getByRole("tabpanel"));
};

/**
 * With `themeId` (a built-in theme with a picture) active: None in the
 * Patterns pop-up stores and draws no picture and names itself; a solid
 * `color` then draws alone; the built-in theme, chosen again, draws its
 * picture over its own color.
 */
export const expectDesktopTabNoPicture = async (
	themeId: string,
	color: number,
) => {
	act(() => {
		dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: themeId });
	});
	const builtIn = appearance().activeTheme;
	expect(builtIn.id).toBe(themeId);
	expect(builtIn.desktop.backgroundImage).not.toBe("");
	const picture = getThemeVars(builtIn)["--desktop-background-image"];
	const ownColor = getThemeVars(builtIn)["--desktop-background-color"];

	const panel = await openDesktopTab();
	const patterns = () => panel.getAllByRole("combobox")[0];
	expect(drawn().image).toBe(picture);
	expect(patterns()).not.toHaveTextContent(/^None$/);

	const user = userEvent.setup();
	await user.click(patterns());
	// The options open in a portal, outside the panel.
	await user.click(screen.getByRole("option", { name: "None" }));
	await waitFor(() =>
		expect(appearance().activeTheme.desktop.backgroundImage).toBe(""),
	);
	expect(drawn().image).toBe('url("")');
	expect(patterns()).toHaveTextContent(/^None$/);
	expect(panel.getByRole("img", { name: "No picture" })).toBeInTheDocument();
	expect(panel.queryByAltText("Background")).toBeNull();

	act(() => {
		dispatch({
			type: "ClassicyDesktopChangeColor",
			colorKey: "desktopBackground",
			color,
		});
	});
	const hex = `#${color.toString(16).padStart(6, "0")}`;
	expect(drawn()).toEqual({ image: 'url("")', color: hex });
	// The edits went to the package's Custom theme; the built-in is untouched.
	expect(appearance().activeTheme.id).not.toBe(themeId);

	act(() => {
		dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: themeId });
	});
	expect(appearance().activeTheme.id).toBe(themeId);
	expect(drawn()).toEqual({ image: picture, color: ownColor });
	await waitFor(() => expect(patterns()).not.toHaveTextContent(/^None$/));
	expect(panel.queryByRole("img", { name: "No picture" })).toBeNull();
};
