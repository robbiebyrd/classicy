import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { APPEARANCE_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import { CLASSICY_CUSTOM_THEME_ID } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

// End to end through the real store: open the Appearance Manager on the
// desktop, edit a colour on the Colors tab, and check the fork lands in the
// theme list.
const appearance = () => useAppManager.getState().System.Manager.Appearance;

const openAppearanceManager = async () => {
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop controlStrip={false} />
		</ClassicyAppManagerProvider>,
	);
	// Let the control panel register itself before opening it.
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
	await waitFor(() => {
		expect(screen.getByRole("tab", { name: "Colors" })).toBeInTheDocument();
	});
};

// ClassicyTabs selects on mouse-up (press/release), not click.
const showTab = (name: string) => {
	const tab = screen.getByRole("tab", { name });
	fireEvent.mouseDown(tab);
	fireEvent.mouseUp(tab);
};

describe("Appearance Manager — Colors tab and Custom theme", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(
			JSON.parse(
				JSON.stringify(DefaultAppManagerState),
			) as typeof DefaultAppManagerState,
			true,
		);
	});

	it("places Colors between Desktop and Fonts", async () => {
		await openAppearanceManager();
		const tabs = screen
			.getAllByRole("tab")
			.map((t) => t.textContent?.trim())
			.filter((t) =>
				["Themes", "Desktop", "Colors", "Fonts", "Sound"].includes(t ?? ""),
			);
		expect(tabs).toEqual(["Themes", "Desktop", "Colors", "Fonts", "Sound"]);
	});

	it("shows 28 swatches carrying the active theme's colours", async () => {
		await openAppearanceManager();
		showTab("Colors");
		const panel = screen.getByRole("tabpanel");
		const swatches = within(panel).getAllByTestId("color-picker-swatch");
		expect(swatches).toHaveLength(28);
		const select = panel.querySelector("#appearance_color_select");
		expect(select?.getAttribute("aria-label")).toBe(
			"Color: #dddddd. Click to open color picker.",
		);
	});

	it("picking a colour forks Custom and lists it on the Themes tab", async () => {
		await openAppearanceManager();
		showTab("Colors");
		fireEvent.click(
			screen
				.getByRole("tabpanel")
				.querySelector("#appearance_color_highlight") as HTMLElement,
		);
		fireEvent.click(await screen.findByRole("option", { name: "Banana" }));
		fireEvent.click(screen.getByRole("button", { name: "OK" }));

		await waitFor(() => {
			expect(appearance().activeTheme.id).toBe(CLASSICY_CUSTOM_THEME_ID);
		});
		expect(appearance().activeTheme.color.highlight).toBe(0xffffb8);
		expect(
			appearance().availableThemes?.find((t) => t.id === "default")?.color
				.highlight,
		).toBe(0xaaaaaa);
		expect(screen.getByText(/Editing the “Custom” theme/)).toBeInTheDocument();

		showTab("Themes");
		const themeMenu = screen.getByRole("combobox", { name: "Selected Theme" });
		expect(themeMenu).toHaveTextContent("Custom");
		fireEvent.click(themeMenu);
		const listbox = screen.getByRole("listbox");
		const options = within(listbox).getAllByRole("option");
		// Built-ins first, Custom last.
		expect(options).toHaveLength(
			(appearance().availableThemes?.length ?? 0) + 1,
		);
		expect(options.at(-1)).toHaveTextContent("Custom");
	});
});
