import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { APPEARANCE_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import { exportClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	CLASSICY_SOUND_SPRITE_IDS,
	registerClassicySoundPack,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

// Every dispatch the panel makes, through the real store's dispatch: the panel
// takes its dispatcher from useAppManagerDispatch.
const { dispatched } = vi.hoisted(() => ({
	dispatched: [] as { type: string; [key: string]: unknown }[],
}));
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")
			>();
		const spy: typeof actual.dispatch = (action, trust) => {
			dispatched.push(action as (typeof dispatched)[number]);
			actual.dispatch(action, trust);
		};
		return { ...actual, useAppManagerDispatch: () => spy };
	},
);

// Sound packs registered below point at remote files; jsdom cannot load
// audio, so the sound manager gets an inert player.
vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
		playing = vi.fn().mockReturnValue(false);
	},
}));

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
	// Query inside the control panel's window, not the whole document: a role
	// query computes styles for every candidate, which jsdom recomputes after
	// each DOM change, so document-wide queries on the full desktop add hundreds
	// of milliseconds of CPU per call.
	const win = await screen.findByRole("application", {
		name: "Appearance Manager",
	});
	expect(
		within(win).getByRole("button", { name: "Load Theme…" }),
	).toBeInTheDocument();
	return win;
};

const pickFile = (file: File) => {
	fireEvent.change(screen.getByTestId("appearance_theme_file_input"), {
		target: { files: [file] },
	});
};

const themeFile = (text: string, name = "ocean.classicy-theme.json") =>
	new File([text], name, { type: "application/json" });

const oceanTheme = () => ({ ...getTheme("bondi"), id: "x", name: "Ocean" });

// The panel's own actions: everything it dispatches is a ClassicyDesktop*
// action, while the desktop around it also dispatches window and app events.
const desktopActions = () =>
	dispatched.filter((a) => a.type.startsWith("ClassicyDesktop"));
const dispatchedTypes = () => desktopActions().map((a) => a.type);

// A second Appearance Package with two presets of its own. Left registered:
// registrations outlive a test, and every test starts on Platinum again.
const testPackTheme = (id: string, name: string): ClassicyTheme => ({
	...structuredClone(getTheme("default")),
	id,
	name,
	package: "test-pack",
});
registerClassicyAppearancePackage({
	id: "test-pack",
	name: "Test Pack",
	css: "",
	defaults: testPackTheme("tp-one", "TP One"),
	presets: [
		testPackTheme("tp-one", "TP One"),
		testPackTheme("tp-two", "TP Two"),
	],
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
});
// A package with defaults only (no presets), whose defaults' id collides
// with Platinum's "default" (J-R19, J-R22).
registerClassicyAppearancePackage({
	id: "solo-pack",
	name: "Solo Pack",
	css: "",
	defaults: {
		...structuredClone(getTheme("default")),
		id: "default",
		name: "Solo Default",
		package: "solo-pack",
	},
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
});
// Complete sprite sheets, so the sound manager has nothing to fall back on.
const everySprite = Object.fromEntries(
	CLASSICY_SOUND_SPRITE_IDS.map((id, i) => [
		id,
		[i * 10, 5] as [number, number],
	]),
);
registerClassicySoundPack({
	id: "beep",
	name: "Beep",
	src: ["https://example.com/beep.ogg"],
	sprite: everySprite,
});
registerClassicySoundPack({
	id: "elsewhere",
	name: "Elsewhere",
	packageId: "some-other-package",
	src: ["https://example.com/elsewhere.ogg"],
	sprite: everySprite,
});

// ClassicyTabs selects on mouse-up (press/release), not click.
const showTab = (win: HTMLElement, name: string) => {
	const tab = within(win).getByRole("tab", { name });
	fireEvent.mouseDown(tab);
	fireEvent.mouseUp(tab);
};

const themeMenuOptions = (win: HTMLElement) => {
	fireEvent.click(
		within(win).getByRole("combobox", { name: "Selected Theme" }),
	);
	return within(screen.getByRole("listbox"))
		.getAllByRole("option")
		.map((o) => o.textContent?.replace(/^✓/, ""));
};

// Whole-desktop integration tests: each boots ClassicyDesktop, opens a real
// window and drives it through the store, costing up to ~1.5 s of CPU on an
// idle machine (mostly React dev-mode rendering and jsdom style computation,
// much of it one-off warm-up in each fresh test worker). A full parallel
// `pnpm test` run on a loaded or small CI machine stretches that several
// times over, past vitest's 5 s default, so this suite gets more headroom.
const INTEGRATION_TIMEOUT_MS = 15_000;

describe("Appearance Manager — saving and loading theme files", {
	timeout: INTEGRATION_TIMEOUT_MS,
}, () => {
	beforeEach(() => {
		dispatched.length = 0;
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
		const win = await openAppearanceManager();
		pickFile(themeFile(exportClassicyTheme(oceanTheme())));

		await waitFor(() => {
			expect(appearance().activeTheme.id).toBe("custom-ocean");
		});
		expect(appearance().activeTheme.name).toBe("Ocean");
		expect(appearance().customThemes?.map((t) => t.id)).toEqual([
			"custom-ocean",
		]);

		const themeMenu = within(win).getByRole("combobox", {
			name: "Selected Theme",
		});
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
		bad.sound = { pack: "sosumi", disabled: [] };
		pickFile(themeFile(exportClassicyTheme(bad)));

		const alert = await screen.findByRole("alertdialog");
		expect(alert).toHaveTextContent("sound.pack:");
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

		const win = await openAppearanceManager();
		act(() => {
			dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: "azul" });
		});
		fireEvent.click(within(win).getByRole("button", { name: "Save Theme…" }));

		expect(downloads).toEqual(["azul.classicy-theme.json"]);
		expect(await blob?.text()).toBe(exportClassicyTheme(getTheme("azul")));
	});
	it("refuses a theme file for an unregistered package with a stop alert and no dispatch", async () => {
		await openAppearanceManager();
		dispatched.length = 0;
		pickFile(
			themeFile(
				JSON.stringify({
					format: "classicy-theme",
					version: 1,
					theme: { ...getTheme("default"), package: "irix" },
				}),
				"irix.classicy-theme.json",
			),
		);

		const alert = await screen.findByRole("alertdialog");
		expect(alert).toHaveTextContent(
			"“irix.classicy-theme.json” could not be loaded.",
		);
		// parseClassicyThemeFile's own refusal (J-R3), word for word.
		expect(alert).toHaveTextContent(
			'This theme needs the "irix" appearance package, which is not installed.',
		);
		expect(within(alert).getByAltText("Error")).toBeInTheDocument();
		expect(dispatchedTypes()).not.toContain("ClassicyDesktopImportTheme");
		expect(dispatchedTypes()).not.toContain(
			"ClassicyDesktopChangeAppearancePackage",
		);
		expect(appearance().customThemes ?? []).toHaveLength(0);
	});

	it("lists presets of the active package and custom themes of that package only", async () => {
		useAppManager.setState((state) => {
			const a = state.System.Manager.Appearance;
			a.customThemes = [
				{
					...getTheme("azul"),
					id: "custom",
					name: "Custom",
					package: "platinum",
				},
				testPackTheme("custom-test-pack", "Test Pack Custom"),
			];
			return state;
		});
		const win = await openAppearanceManager();
		const options = themeMenuOptions(win);
		expect(options).toHaveLength(21 + 1);
		expect(options.at(-1)).toBe("Custom");
		expect(options).not.toContain("Test Pack Custom");
	});

	it("lists another package's presets and switches to one", async () => {
		act(() => {
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: "test-pack",
			});
		});
		const win = await openAppearanceManager();
		expect(
			within(win).getByText("The current Appearance Package is Test Pack"),
		).toBeInTheDocument();
		expect(themeMenuOptions(win)).toEqual(["TP One", "TP Two"]);

		fireEvent.click(
			within(screen.getByRole("listbox")).getByRole("option", {
				name: "TP Two",
			}),
		);
		await waitFor(() => {
			expect(appearance().activeTheme.id).toBe("tp-two");
		});
		expect(appearance().activeTheme.package).toBe("test-pack");
	});

	it("lists a defaults-only package's default, switches away and back (J-R22)", async () => {
		act(() => {
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: "solo-pack",
			});
		});
		const win = await openAppearanceManager();
		const menu = within(win).getByRole("combobox", { name: "Selected Theme" });
		expect(menu).toHaveTextContent("Solo Default");
		expect(themeMenuOptions(win)).toEqual(["Solo Default"]);
		// Re-picking the current theme closes the menu and changes nothing.
		fireEvent.click(
			within(screen.getByRole("listbox")).getByRole("option", {
				name: "Solo Default",
			}),
		);

		act(() => {
			dispatch({
				type: "ClassicyDesktopChangeColor",
				colorKey: "black",
				color: 0x040404,
			});
		});
		await waitFor(() => {
			expect(menu).toHaveTextContent("Custom");
		});
		expect(themeMenuOptions(win)).toEqual(["Solo Default", "Custom"]);
		fireEvent.click(
			within(screen.getByRole("listbox")).getByRole("option", {
				name: "Solo Default",
			}),
		);
		await waitFor(() => {
			expect(appearance().activeTheme.name).toBe("Solo Default");
		});
		expect(appearance().activeTheme.package).toBe("solo-pack");
		expect(menu).toHaveTextContent("Solo Default");
	});

	it("shows the active theme in the pop-up when it is not in the package's list", async () => {
		useAppManager.setState((state) => {
			const a = state.System.Manager.Appearance;
			a.packageId = "test-pack";
			a.activeTheme = { ...getTheme("azul"), package: "platinum" };
			return state;
		});
		const win = await openAppearanceManager();
		const menu = within(win).getByRole("combobox", { name: "Selected Theme" });
		expect(menu).toHaveTextContent(getTheme("azul").name);
		expect(themeMenuOptions(win)).toEqual([
			"TP One",
			"TP Two",
			getTheme("azul").name,
		]);
	});

	it("loading a theme of another installed package switches to that package first", async () => {
		await openAppearanceManager();
		dispatched.length = 0;
		pickFile(
			themeFile(
				exportClassicyTheme(testPackTheme("x", "Pack Ocean")),
				"pack-ocean.classicy-theme.json",
			),
		);

		await waitFor(() => {
			expect(appearance().activeTheme.name).toBe("Pack Ocean");
		});
		expect(dispatchedTypes()).toEqual([
			"ClassicyDesktopChangeAppearancePackage",
			"ClassicyDesktopImportTheme",
		]);
		expect(desktopActions()[0]).toMatchObject({ packageId: "test-pack" });
		expect(appearance().packageId).toBe("test-pack");
		expect(appearance().activeTheme.package).toBe("test-pack");
	});

	it("loading a theme of the active package does not switch packages", async () => {
		await openAppearanceManager();
		dispatched.length = 0;
		pickFile(themeFile(exportClassicyTheme(oceanTheme())));
		await waitFor(() => {
			expect(appearance().activeTheme.id).toBe("custom-ocean");
		});
		expect(dispatchedTypes()).toEqual(["ClassicyDesktopImportTheme"]);
	});

	it("selecting a sound pack dispatches ClassicyDesktopChangeAppearanceOption sound.pack", async () => {
		const win = await openAppearanceManager();
		showTab(win, "Sound");
		const menu = win.querySelector("#soundPack") as HTMLElement;
		expect(menu).toHaveTextContent("Platinum");
		fireEvent.click(menu);
		const listbox = screen.getByRole("listbox");
		// Packs of no package and of the active one; never another package's.
		expect(
			within(listbox)
				.getAllByRole("option")
				.map((o) => o.textContent?.replace(/^✓/, "")),
		).toEqual(["Platinum", "Beep"]);
		dispatched.length = 0;
		fireEvent.click(within(listbox).getByRole("option", { name: "Beep" }));

		await waitFor(() => {
			expect(appearance().activeTheme.sound.pack).toBe("beep");
		});
		expect(desktopActions()).toEqual([
			{
				type: "ClassicyDesktopChangeAppearanceOption",
				path: "sound.pack",
				value: "beep",
			},
		]);
	});
	it("lists the active theme's pack even when it belongs to another package", async () => {
		useAppManager.setState((state) => {
			state.System.Manager.Appearance.activeTheme.sound.pack = "elsewhere";
			return state;
		});
		const win = await openAppearanceManager();
		showTab(win, "Sound");
		const menu = win.querySelector("#soundPack") as HTMLElement;
		expect(menu).toHaveTextContent("Elsewhere");
		fireEvent.click(menu);
		expect(
			within(screen.getByRole("listbox"))
				.getAllByRole("option")
				.map((o) => o.textContent?.replace(/^✓/, "")),
		).toEqual(["Platinum", "Beep", "Elsewhere"]);
	});
});
