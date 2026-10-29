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
	// Query inside the control panel's window, not the whole document: every
	// role query computes styles for each candidate, and jsdom recomputes them
	// after every DOM change, so a document-wide query on the full desktop costs
	// hundreds of milliseconds of CPU (enough, on a loaded machine, to push a
	// test past its timeout).
	const win = await screen.findByRole("application", {
		name: "Appearance Manager",
	});
	expect(within(win).getByRole("tab", { name: "Colors" })).toBeInTheDocument();
	return win;
};

// ClassicyTabs selects on mouse-up (press/release), not click.
const showTab = (win: HTMLElement, name: string) => {
	const tab = within(win).getByRole("tab", { name });
	fireEvent.mouseDown(tab);
	fireEvent.mouseUp(tab);
};

// Whole-desktop integration tests: each boots ClassicyDesktop, opens a real
// window and drives it through the store, costing up to ~1.5 s of CPU on an
// idle machine (mostly React dev-mode rendering and jsdom style computation,
// much of it one-off warm-up in each fresh test worker). A full parallel
// `pnpm test` run on a loaded or small CI machine stretches that several
// times over, past vitest's 5 s default, so this suite gets more headroom.
const INTEGRATION_TIMEOUT_MS = 15_000;

describe("Appearance Manager — Colors tab and Custom theme", {
	timeout: INTEGRATION_TIMEOUT_MS,
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
	});

	it("places Colors between Desktop and Fonts", async () => {
		const win = await openAppearanceManager();
		const tabs = within(win)
			.getAllByRole("tab")
			.map((t) => t.textContent?.trim())
			.filter((t) =>
				["Themes", "Desktop", "Colors", "Fonts", "Sound"].includes(t ?? ""),
			);
		expect(tabs).toEqual(["Themes", "Desktop", "Colors", "Fonts", "Sound"]);
	});

	it("places Metrics between Fonts and Sound", async () => {
		const win = await openAppearanceManager();
		const tabs = within(win)
			.getAllByRole("tab")
			.map((t) => t.textContent?.trim())
			.filter((t) => ["Fonts", "Metrics", "Sound"].includes(t ?? ""));
		expect(tabs).toEqual(["Fonts", "Metrics", "Sound"]);
	});

	it("editing a metric forks Custom with the metricKey change", async () => {
		const win = await openAppearanceManager();
		showTab(win, "Metrics");
		const gap = within(win)
			.getByRole("tabpanel")
			.querySelector("#appearance_metric_buttonGap") as HTMLInputElement;
		const builtInGap = appearance().activeTheme.measurements.button.gap;
		fireEvent.change(gap, { target: { value: String(builtInGap + 7) } });

		await waitFor(() => {
			expect(appearance().activeTheme.id).toBe(CLASSICY_CUSTOM_THEME_ID);
		});
		expect(appearance().activeTheme.measurements.button.gap).toBe(
			builtInGap + 7,
		);
		expect(
			appearance().availableThemes?.find((t) => t.id === "default")
				?.measurements.button.gap,
		).toBe(builtInGap);
		// Every tab's panel stays mounted (Colors and Metrics both carry the
		// notice), so look only inside the one on show.
		expect(
			within(within(win).getByRole("tabpanel")).getByText(
				/Editing the “Custom” theme/,
			),
		).toBeInTheDocument();
		expect(gap).toHaveValue(builtInGap + 7);
	});

	it("shows 28 swatches carrying the active theme's colours", async () => {
		const win = await openAppearanceManager();
		showTab(win, "Colors");
		const panel = within(win).getByRole("tabpanel");
		const swatches = within(panel).getAllByTestId("color-picker-swatch");
		expect(swatches).toHaveLength(28);
		const select = panel.querySelector("#appearance_color_select");
		expect(select?.getAttribute("aria-label")).toBe(
			"Color: #dddddd. Click to open color picker.",
		);
	});

	it("picking a colour forks Custom and lists it on the Themes tab", async () => {
		const win = await openAppearanceManager();
		showTab(win, "Colors");
		fireEvent.click(
			within(win)
				.getByRole("tabpanel")
				.querySelector("#appearance_color_highlight") as HTMLElement,
		);
		const picker = await screen.findByRole("application", {
			name: "Color Picker",
		});
		const crayons = within(picker).getByRole("listbox", {
			name: "Crayon colors",
		});
		fireEvent.click(within(crayons).getByRole("option", { name: "Banana" }));
		fireEvent.click(within(picker).getByRole("button", { name: "OK" }));

		await waitFor(() => {
			expect(appearance().activeTheme.id).toBe(CLASSICY_CUSTOM_THEME_ID);
		});
		expect(appearance().activeTheme.color.highlight).toBe(0xffffb8);
		expect(
			appearance().availableThemes?.find((t) => t.id === "default")?.color
				.highlight,
		).toBe(0xaaaaaa);
		// Every tab's panel stays mounted (Colors and Metrics both carry the
		// notice), so look only inside the one on show.
		expect(
			within(within(win).getByRole("tabpanel")).getByText(
				/Editing the “Custom” theme/,
			),
		).toBeInTheDocument();

		showTab(win, "Themes");
		const themeMenu = within(win).getByRole("combobox", {
			name: "Selected Theme",
		});
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
