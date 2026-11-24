// A theme drawn under another Appearance Package (story 0235-xgi): the
// desktop root carries the drawing package's knobs, the theme's own edits
// on them, and the store and the persisted state keep only the theme's own.
import "@/__tests__/withPlatinum";
import "@classicy/appearance-system7";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@/__tests__/test-utils";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	type ClassicyTheme,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	classicyThemeMeasurementDefaults,
	withoutDefaultThemeMeasurements,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	sanitizeStateForPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { classicyDesktopIconMetrics } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";

vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
		playing = vi.fn().mockReturnValue(false);
	},
}));

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		useClassicyAnalytics: () => ({ track: () => {}, page: () => {} }),
	}),
);

const system7Defaults = getClassicyAppearancePackage("system7")
	?.defaults as ClassicyTheme;

// A Custom theme of `base`'s package with two edits: one in the core five,
// one in a family both packages declare.
const customOf = (base: ClassicyTheme): ClassicyTheme => {
	const theme = structuredClone(base);
	theme.id = base.package === "platinum" ? "custom" : `custom-${base.package}`;
	theme.name = "Custom";
	theme.measurements.window.controlSize = 14;
	theme.measurements.controlStrip = {
		...theme.measurements.controlStrip,
		cellHeight: 30,
	};
	return theme;
};

const seed = (packageId: string, theme: ClassicyTheme) =>
	act(() => {
		useAppManager.setState(
			produce(structuredClone(DefaultAppManagerState), (draft) => {
				draft.System.Manager.Appearance.packageId = packageId;
				draft.System.Manager.Appearance.activeTheme = theme;
				draft.System.Manager.Appearance.customThemes = [theme];
			}),
			true,
		);
	});

const root = () => document.getElementById("classicyDesktop") as HTMLElement;
const rootVar = (name: string) => root().style.getPropertyValue(name);

const renderDesktop = () =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop controlStrip={false} />
		</ClassicyAppManagerProvider>,
	);

beforeEach(() => {
	localStorage.clear();
});

afterEach(() => {
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
});

describe("a theme drawn under another package", () => {
	it("draws a Platinum Custom theme with System 7's knobs and its own edits", () => {
		const theme = customOf(getTheme("default"));
		seed("system7", theme);
		renderDesktop();
		expect(root().getAttribute("data-classicy-appearance")).toBe("system7");
		// System 7's own knobs, which no Platinum theme carries.
		expect(rootVar("--title-bar-box-gap")).toBe("1px");
		expect(rootVar("--menu-item-height")).toBe("16px");
		expect(rootVar("--file-dialog-list-left")).toBe("15px");
		// System 7's values for the knobs both packages declare that the
		// theme did not change, its core five included.
		expect(rootVar("--window-scrollbar-size")).toBe("16px");
		expect(rootVar("--window-utility-title-bar-height")).toBe("13px");
		expect(rootVar("--zoom-rects-trail")).toBe("4px");
		// The theme's own edits win.
		expect(rootVar("--window-control-size")).toBe("14px");
		expect(rootVar("--control-strip-cell-height")).toBe("30px");
	});

	it("keeps the store and the persisted state to the theme's own values", () => {
		const theme = customOf(getTheme("default"));
		seed("system7", theme);
		renderDesktop();
		const stored = useAppManager.getState().System.Manager.Appearance;
		expect(stored.activeTheme.measurements).toEqual(theme.measurements);
		expect(stored.activeTheme.measurements).not.toHaveProperty("titleBar");
		const persisted = sanitizeStateForPersistence(useAppManager.getState())
			.System.Manager.Appearance;
		const own = withoutDefaultThemeMeasurements(
			theme,
			classicyThemeMeasurementDefaults("platinum"),
		).measurements;
		expect(persisted.activeTheme.measurements).toEqual(own);
		expect(persisted.customThemes?.[0]?.measurements).toEqual(own);
		// Only the edit is kept past the core five, and nothing of System 7's.
		expect(own.controlStrip).toEqual({ cellHeight: 30 });
		for (const family of ["titleBar", "menuItem", "fileDialog", "zoomRects"])
			expect(persisted.activeTheme.measurements, family).not.toHaveProperty(
				family,
			);
		expect(persisted.activeTheme.measurements.window.scrollbarSize).toBe(17);
	});

	it("draws a System 7 Custom theme with Platinum's knobs and its own edits", () => {
		const theme = customOf(system7Defaults);
		seed("platinum", theme);
		renderDesktop();
		expect(root().getAttribute("data-classicy-appearance")).toBe("platinum");
		expect(rootVar("--window-scrollbar-size")).toBe("17px");
		expect(rootVar("--window-utility-title-bar-height")).toBe("10px");
		expect(rootVar("--menu-frame-shadow-start")).toBe("1px");
		expect(rootVar("--zoom-rects-first-step")).toBe("5px");
		expect(rootVar("--window-control-size")).toBe("14px");
		expect(rootVar("--control-strip-cell-height")).toBe("30px");
	});

	it("draws another package's preset chosen with ChangeTheme with the drawing package's knobs", () => {
		// ChangeTheme finds an id the active package lacks among the other
		// packages' built-ins, and leaves `packageId` alone.
		seed("system7", structuredClone(system7Defaults));
		renderDesktop();
		expect(rootVar("--window-scrollbar-size")).toBe("16px");
		act(() =>
			dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: "azul" }),
		);
		const appearance = useAppManager.getState().System.Manager.Appearance;
		expect(appearance.packageId).toBe("system7");
		expect(appearance.activeTheme).toMatchObject({
			id: "azul",
			package: "platinum",
		});
		expect(root().getAttribute("data-classicy-appearance")).toBe("system7");
		expect(rootVar("--window-scrollbar-size")).toBe("16px");
		expect(rootVar("--window-control-size")).toBe("11px");
		expect(rootVar("--title-bar-box-gap")).toBe("1px");
		expect(rootVar("--menu-bar-height")).toBe("20px");
		// Azul's own colors still draw.
		const azul = getThemeVars(getTheme("azul")) as Record<string, string>;
		expect(rootVar("--color-theme-03")).toBe(azul["--color-theme-03"]);
		expect(rootVar("--color-theme-03")).not.toBe(
			(getThemeVars(system7Defaults) as Record<string, string>)[
				"--color-theme-03"
			],
		);
		act(() =>
			dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: "system7" }),
		);
		expect(rootVar("--title-bar-box-gap")).toBe("1px");
		expect(rootVar("--window-scrollbar-size")).toBe("16px");
	});

	it("lays the desktop's icons out on the drawing package's grid", () => {
		// System 7's `desktopIconGrid` (each row 20 px below the last icon,
		// the first at 28 px) for a Platinum theme it draws; Platinum's
		// formula (no knob) for a System 7 theme under Platinum.
		const platinumTheme = getTheme("default");
		const underSystem7 = classicyDesktopIconMetrics(platinumTheme, "system7");
		expect(underSystem7.top).toBe(28);
		expect(underSystem7.rowPitch).toBe(platinumTheme.desktop.iconSize + 20);
		const underPlatinum = classicyDesktopIconMetrics(
			system7Defaults,
			"platinum",
		);
		expect(underPlatinum.top).toBeUndefined();
		expect(underPlatinum.rowPitch).toBeUndefined();
		// The reducer's clean-up reads the store's package.
		seed("system7", customOf(platinumTheme));
		act(() => {
			useAppManager.setState(
				produce(useAppManager.getState(), (draft) => {
					draft.System.Manager.Desktop.icons = ["A", "B"].map((name) => ({
						appId: `${name}.app`,
						appName: name,
						icon: "",
						kind: "app_shortcut",
					}));
				}),
			);
			dispatch({ type: "ClassicyDesktopIconCleanup" });
		});
		const tops = useAppManager
			.getState()
			.System.Manager.Desktop.icons.map((i) => i.location?.[1]);
		expect(tops).toEqual([28, 28 + (underSystem7.rowPitch as number)]);
	});
});
