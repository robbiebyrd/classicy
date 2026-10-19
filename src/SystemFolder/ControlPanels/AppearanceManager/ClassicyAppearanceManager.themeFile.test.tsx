import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { APPEARANCE_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import { exportClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

// End to end through the real store: open the Appearance Manager, then save
// and load theme files from its Themes tab.
const appearance = () => useAppManager.getState().System.Manager.Appearance;

const openAppearanceManager = async () => {
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
	await waitFor(() => {
		expect(
			screen.getByRole("button", { name: "Load Theme…" }),
		).toBeInTheDocument();
	});
};

const pickFile = (file: File) => {
	fireEvent.change(screen.getByTestId("appearance_theme_file_input"), {
		target: { files: [file] },
	});
};

const themeFile = (text: string, name = "ocean.classicy-theme.json") =>
	new File([text], name, { type: "application/json" });

const oceanTheme = () => ({ ...getTheme("bondi"), id: "x", name: "Ocean" });

describe("Appearance Manager — saving and loading theme files", () => {
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

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("loading a valid file imports the theme and selects it", async () => {
		await openAppearanceManager();
		pickFile(themeFile(exportClassicyTheme(oceanTheme())));

		await waitFor(() => {
			expect(appearance().activeTheme.id).toBe("custom-ocean");
		});
		expect(appearance().activeTheme.name).toBe("Ocean");
		expect(appearance().customThemes?.map((t) => t.id)).toEqual([
			"custom-ocean",
		]);

		const themeMenu = screen.getByRole("combobox", { name: "Selected Theme" });
		expect(themeMenu).toHaveTextContent("Ocean");
		fireEvent.click(themeMenu);
		const options = within(screen.getByRole("listbox")).getAllByRole("option");
		expect(options.at(-1)).toHaveTextContent("Ocean");
	});

	it("loading an invalid file shows a stop alert with the reason", async () => {
		await openAppearanceManager();
		const before = appearance().activeTheme;
		pickFile(themeFile("{ nope", "broken.json"));

		const alert = await screen.findByRole("alertdialog");
		expect(alert).toHaveTextContent("“broken.json” could not be loaded.");
		expect(alert).toHaveTextContent("This file is not valid JSON.");
		expect(within(alert).getByAltText("Error")).toBeInTheDocument();
		expect(appearance().activeTheme).toEqual(before);
		expect(appearance().customThemes ?? []).toHaveLength(0);

		fireEvent.click(within(alert).getByRole("button", { name: "OK" }));
		await waitFor(() => {
			expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
		});
	});

	it("reports schema problems from the file", async () => {
		await openAppearanceManager();
		const bad = oceanTheme();
		bad.sound = { name: "sosumi", disabled: [] };
		pickFile(themeFile(exportClassicyTheme(bad)));

		const alert = await screen.findByRole("alertdialog");
		expect(alert).toHaveTextContent("sound.name:");
		expect(appearance().customThemes ?? []).toHaveLength(0);
	});

	it("Save Theme… downloads the active theme", async () => {
		let blob: Blob | undefined;
		vi.stubGlobal(
			"URL",
			class extends URL {
				static createObjectURL = vi.fn((b: Blob) => {
					blob = b;
					return "blob:theme";
				});
				static revokeObjectURL = vi.fn();
			},
		);
		const downloads: string[] = [];
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
			this: HTMLAnchorElement,
		) {
			downloads.push(this.download);
		});

		await openAppearanceManager();
		act(() => {
			dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: "azul" });
		});
		fireEvent.click(screen.getByRole("button", { name: "Save Theme…" }));

		expect(downloads).toEqual(["azul.classicy-theme.json"]);
		expect(await blob?.text()).toBe(exportClassicyTheme(getTheme("azul")));
	});
});
