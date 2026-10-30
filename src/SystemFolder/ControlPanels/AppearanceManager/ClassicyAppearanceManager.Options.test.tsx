import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	act,
	fireEvent,
	render,
	renderHook,
	screen,
	waitFor,
	within,
} from "@/__tests__/test-utils";
import type {
	ClassicyAppearanceKnobs,
	ClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { classicyKnobsToSchema } from "@/Appearance/ClassicyAppearancePackageSchema";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	appearanceOptionInputId,
	useOptionsTab,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Options";
import { APPEARANCE_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import type { ClassicyThemeMetricFamilyTarget } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// Ruling 1: a package's options are its knobs, `{ <family>: { <key>: number } }`
// under `theme.measurements`, built into `options` by classicyKnobsToSchema.
const knobs: ClassicyAppearanceKnobs = {
	controlStrip: {
		cellHeight: { label: "Cell height", min: 1, max: 512, default: 22 },
		tabWidth: { label: "Tab width", min: 4, max: 40, default: 12 },
	},
	menuBar: {
		height: { label: "Menu bar height", min: 10, max: 60, default: 20 },
	},
};

const testPack: ClassicyAppearancePackage = {
	id: "test-pack",
	name: "Test Pack",
	css: "",
	defaults: {
		...getTheme("default"),
		package: "test-pack",
		measurements: {
			...getTheme("default").measurements,
			controlStrip: { cellHeight: 22, tabWidth: 12 },
			menuBar: { height: 20 },
		},
	},
	presets: [],
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
	knobs,
	options: classicyKnobsToSchema(knobs),
};

const themeWith = (
	families: Record<string, Record<string, number>>,
): ClassicyTheme => ({
	...getTheme("default"),
	measurements: { ...getTheme("default").measurements, ...families },
});

const Host = ({
	pkg = testPack,
	theme = themeWith({
		controlStrip: { cellHeight: 22, tabWidth: 12 },
		menuBar: { height: 20 },
	}),
	changeMetric = vi.fn(),
	editingCustomTheme = false,
}: {
	pkg?: ClassicyAppearancePackage;
	theme?: ClassicyTheme;
	changeMetric?: (
		target: ClassicyThemeMetricFamilyTarget,
		value: number,
	) => void;
	editingCustomTheme?: boolean;
}) => {
	const tab = useOptionsTab({ pkg, theme, editingCustomTheme, changeMetric });
	return <div>{tab.children}</div>;
};

const field = (family: string, key: string) =>
	document.getElementById(
		appearanceOptionInputId({ family, key }),
	) as HTMLInputElement;

describe("useOptionsTab", () => {
	it("is titled Options", () => {
		const { result } = renderHook(() =>
			useOptionsTab({
				pkg: testPack,
				theme: testPack.defaults,
				editingCustomTheme: false,
				changeMetric: vi.fn(),
			}),
		);
		expect(result.current.title).toBe("Options");
	});

	it("renders the schema form from the package knobs with appearance_option ids", () => {
		render(
			<Host
				theme={themeWith({
					controlStrip: { cellHeight: 30, tabWidth: 12 },
					menuBar: { height: 20 },
				})}
			/>,
		);
		expect(
			document.getElementById(
				"appearance_option_measurements_controlStrip_cellHeight",
			),
		).toHaveValue(30);
		expect(field("controlStrip", "tabWidth")).toHaveValue(12);
		expect(field("menuBar", "height")).toHaveValue(20);
	});

	it("labels each knob with its label and each family with its humanized name", () => {
		render(<Host />);
		expect(screen.getByLabelText("Cell height")).toBe(
			field("controlStrip", "cellHeight"),
		);
		expect(screen.getByLabelText("Menu bar height")).toBe(
			field("menuBar", "height"),
		);
		// One group box per family, titled by the humanized family name.
		const legend = (input: HTMLElement) =>
			input.closest("fieldset")?.querySelector(":scope > legend")?.textContent;
		expect(legend(field("controlStrip", "cellHeight"))).toBe("Control strip");
		expect(legend(field("controlStrip", "tabWidth"))).toBe("Control strip");
		expect(legend(field("menuBar", "height"))).toBe("Menu bar");
	});

	it("shows a knob's default when the theme predates it", () => {
		render(<Host theme={getTheme("default")} />);
		expect(field("controlStrip", "cellHeight")).toHaveValue(22);
		expect(field("menuBar", "height")).toHaveValue(20);
	});

	it("routes every knob through changeMetric as a family target", () => {
		const changeMetric = vi.fn();
		render(<Host changeMetric={changeMetric} />);
		fireEvent.change(
			document.getElementById(
				"appearance_option_measurements_controlStrip_cellHeight",
			) as HTMLElement,
			{ target: { value: "30" } },
		);
		expect(changeMetric).toHaveBeenCalledWith(
			{ family: "controlStrip", key: "cellHeight" },
			30,
		);
		fireEvent.change(field("menuBar", "height"), { target: { value: "24" } });
		expect(changeMetric).toHaveBeenLastCalledWith(
			{ family: "menuBar", key: "height" },
			24,
		);
	});

	it("clamps an entry to the knob's min and max before dispatch (J-R17)", () => {
		const changeMetric = vi.fn();
		render(<Host changeMetric={changeMetric} />);
		const tabWidth = field("controlStrip", "tabWidth");
		fireEvent.change(tabWidth, { target: { value: "99" } });
		expect(tabWidth).toHaveValue(40);
		expect(changeMetric).toHaveBeenLastCalledWith(
			{ family: "controlStrip", key: "tabWidth" },
			40,
		);
		fireEvent.change(tabWidth, { target: { value: "1" } });
		expect(tabWidth).toHaveValue(4);
		expect(changeMetric).toHaveBeenLastCalledWith(
			{ family: "controlStrip", key: "tabWidth" },
			4,
		);
	});

	it("keeps an entry within the theme's 0–512 even when a knob allows more", () => {
		const wide: ClassicyAppearanceKnobs = {
			controlStrip: {
				cellHeight: { label: "Cell height", min: -10, max: 9000, default: 22 },
			},
		};
		const changeMetric = vi.fn();
		render(
			<Host
				pkg={{ ...testPack, knobs: wide, options: classicyKnobsToSchema(wide) }}
				changeMetric={changeMetric}
			/>,
		);
		const cellHeight = field("controlStrip", "cellHeight");
		fireEvent.change(cellHeight, { target: { value: "9999" } });
		expect(changeMetric).toHaveBeenLastCalledWith(
			{ family: "controlStrip", key: "cellHeight" },
			512,
		);
		fireEvent.change(cellHeight, { target: { value: "-5" } });
		expect(changeMetric).toHaveBeenLastCalledWith(
			{ family: "controlStrip", key: "cellHeight" },
			0,
		);
	});

	it("rounds a fractional entry to whole pixels before clamping (J-R17)", () => {
		const changeMetric = vi.fn();
		render(<Host changeMetric={changeMetric} />);
		const tabWidth = field("controlStrip", "tabWidth");
		fireEvent.change(tabWidth, { target: { value: "12.6" } });
		expect(changeMetric).toHaveBeenLastCalledWith(
			{ family: "controlStrip", key: "tabWidth" },
			13,
		);
		fireEvent.change(tabWidth, { target: { value: "40.4" } });
		expect(changeMetric).toHaveBeenLastCalledWith(
			{ family: "controlStrip", key: "tabWidth" },
			40,
		);
		fireEvent.change(tabWidth, { target: { value: "3.4" } });
		expect(changeMetric).toHaveBeenLastCalledWith(
			{ family: "controlStrip", key: "tabWidth" },
			4,
		);
	});

	it("dispatches nothing for an empty or non-numeric entry (J-R17)", () => {
		const changeMetric = vi.fn();
		render(<Host changeMetric={changeMetric} />);
		fireEvent.change(field("controlStrip", "cellHeight"), {
			target: { value: "" },
		});
		expect(changeMetric).not.toHaveBeenCalled();
	});

	it("shows the Metrics tab's fork notice for a built-in and the editing notice for a custom theme", () => {
		const { rerender } = render(<Host />);
		expect(
			screen.getByText(
				"Changing an option creates a Custom theme from “Default”.",
			),
		).toBeInTheDocument();
		rerender(
			<Host
				theme={{ ...testPack.defaults, id: "custom", name: "Custom" }}
				editingCustomTheme
			/>,
		);
		expect(screen.getByText("Editing the “Custom” theme.")).toBeInTheDocument();
	});

	it("follows a switch between two packages that share a knob: value and bounds (Minor 6)", () => {
		const narrow: ClassicyAppearanceKnobs = {
			controlStrip: {
				cellHeight: { label: "Cell height", min: 50, max: 100, default: 60 },
			},
		};
		const other: ClassicyAppearancePackage = {
			...testPack,
			id: "other-pack",
			name: "Other Pack",
			knobs: narrow,
			options: classicyKnobsToSchema(narrow),
		};
		const changeMetric = vi.fn();
		const { rerender } = render(<Host changeMetric={changeMetric} />);
		const before = field("controlStrip", "cellHeight");
		expect(before).toHaveValue(22);
		rerender(
			<Host
				pkg={other}
				theme={themeWith({ controlStrip: { cellHeight: 75 } })}
				changeMetric={changeMetric}
			/>,
		);
		const after = field("controlStrip", "cellHeight");
		expect(after).toHaveValue(75);
		// The other package's family has no tabWidth, and no menuBar family.
		expect(field("controlStrip", "tabWidth")).toBeNull();
		expect(field("menuBar", "height")).toBeNull();
		fireEvent.change(after, { target: { value: "999" } });
		expect(after).toHaveValue(100);
		expect(changeMetric).toHaveBeenLastCalledWith(
			{ family: "controlStrip", key: "cellHeight" },
			100,
		);
		fireEvent.change(after, { target: { value: "10" } });
		expect(after).toHaveValue(50);
		expect(changeMetric).toHaveBeenLastCalledWith(
			{ family: "controlStrip", key: "cellHeight" },
			50,
		);
	});

	describe("a knob declared wholly outside 0–512 (J-R18)", () => {
		const warnings: ClassicyLogEntry[] = [];
		beforeEach(() => {
			warnings.length = 0;
			vi.spyOn(console, "warn").mockImplementation(() => {});
			registerClassicyLogSink({
				id: "options-tab-test",
				onLog: (entry) => {
					if (entry.level === "warn") warnings.push(entry);
				},
			});
		});
		afterEach(() => {
			unregisterClassicyLogSink("options-tab-test");
			vi.restoreAllMocks();
		});

		const withHuge = (id: string, keepCellHeight: boolean) => {
			const k: ClassicyAppearanceKnobs = {
				controlStrip: {
					...(keepCellHeight
						? { cellHeight: knobs.controlStrip.cellHeight }
						: {}),
					huge: { label: "Huge", min: 600, max: 700, default: 650 },
				},
			};
			return {
				...testPack,
				id,
				name: "Huge Pack",
				knobs: k,
				options: classicyKnobsToSchema(k),
			};
		};

		it("is left out, never rendered with inverted bounds, and warned about once", () => {
			const pkg = withHuge("huge-pack", true);
			const { rerender } = render(<Host pkg={pkg} />);
			rerender(
				<Host
					pkg={pkg}
					theme={themeWith({ controlStrip: { cellHeight: 30 } })}
				/>,
			);
			expect(field("controlStrip", "huge")).toBeNull();
			expect(screen.queryByLabelText("Huge")).toBeNull();
			expect(field("controlStrip", "cellHeight")).toHaveValue(30);
			const huge = warnings.filter((w) => w.message.includes("huge"));
			expect(huge).toHaveLength(1);
			expect(huge[0].subsystem).toBe("ClassicyAppearance");
			expect(huge[0].message).toContain("huge-pack");
			expect(huge[0].message).toContain("controlStrip");
		});

		it("leaves the tab saying the package has no options when it was the only knob", () => {
			render(<Host pkg={withHuge("only-huge-pack", false)} />);
			expect(
				screen.getByText("The Huge Pack package has no options."),
			).toBeInTheDocument();
			expect(document.querySelector("input")).toBeNull();
		});
	});

	describe("a knob the reducer would refuse by name (J-R20)", () => {
		const warnings: ClassicyLogEntry[] = [];
		beforeEach(() => {
			warnings.length = 0;
			vi.spyOn(console, "warn").mockImplementation(() => {});
			registerClassicyLogSink({
				id: "options-tab-names-test",
				onLog: (entry) => {
					if (entry.level === "warn") warnings.push(entry);
				},
			});
		});
		afterEach(() => {
			unregisterClassicyLogSink("options-tab-names-test");
			vi.restoreAllMocks();
		});

		it("leaves out a core-group knob and a kebab-case family, warning once per package", () => {
			const k: ClassicyAppearanceKnobs = {
				controlStrip: knobs.controlStrip,
				window: {
					shadowSize: { label: "Shadow size", min: 0, max: 8, default: 2 },
				},
				"control-strip": {
					gap: { label: "Gap", min: 0, max: 8, default: 2 },
				},
			};
			const pkg = {
				...testPack,
				id: "named-pack",
				knobs: k,
				options: classicyKnobsToSchema(k),
			};
			const { rerender } = render(<Host pkg={pkg} />);
			rerender(<Host pkg={pkg} editingCustomTheme />);
			expect(screen.queryByLabelText("Shadow size")).toBeNull();
			expect(screen.queryByLabelText("Gap")).toBeNull();
			expect(field("window", "shadowSize")).toBeNull();
			expect(field("control-strip", "gap")).toBeNull();
			expect(field("controlStrip", "cellHeight")).not.toBeNull();
			const named = warnings.filter((w) => w.message.includes("named-pack"));
			expect(named).toHaveLength(1);
			expect(named[0].subsystem).toBe("ClassicyAppearance");
			expect(named[0].message).toContain("window.shadowSize");
			expect(named[0].message).toContain("control-strip.gap");
		});
	});

	it("says so when the package has no options", () => {
		render(
			<Host pkg={{ ...testPack, knobs: undefined, options: undefined }} />,
		);
		expect(
			screen.getByText("The Test Pack package has no options."),
		).toBeInTheDocument();
	});

	it("says so when the package declares no knobs (Platinum's empty options)", () => {
		render(
			<Host
				pkg={{
					...testPack,
					knobs: {},
					options: classicyKnobsToSchema({}),
				}}
			/>,
		);
		expect(
			screen.getByText("The Test Pack package has no options."),
		).toBeInTheDocument();
		expect(document.querySelector("input")).toBeNull();
	});
});

// End to end through the real store: switch packages on the Packages tab,
// then edit a knob on the Options tab.
const INTEGRATION_TIMEOUT_MS = 15_000;

describe("Appearance Manager — Packages and Options tabs", {
	timeout: INTEGRATION_TIMEOUT_MS,
}, () => {
	const appearance = () => useAppManager.getState().System.Manager.Appearance;

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
		return screen.findByRole("application", { name: "Appearance Manager" });
	};

	// ClassicyTabs selects on mouse-up (press/release), not click.
	const showTab = (win: HTMLElement, name: string) => {
		const tab = within(win).getByRole("tab", { name });
		fireEvent.mouseDown(tab);
		fireEvent.mouseUp(tab);
	};
	const visiblePanel = (win: HTMLElement) =>
		within(within(win).getByRole("tabpanel"));

	it("lists eight tabs, Packages and Options after Themes", async () => {
		const win = await openAppearanceManager();
		expect(
			within(win)
				.getAllByRole("tab")
				.map((t) => t.textContent?.trim()),
		).toEqual([
			"Themes",
			"Packages",
			"Options",
			"Desktop",
			"Colors",
			"Fonts",
			"Metrics",
			"Sound",
		]);
	});

	it("switches the package and edits its knob through the store", async () => {
		registerClassicyAppearancePackage(testPack);
		const win = await openAppearanceManager();

		showTab(win, "Options");
		expect(
			visiblePanel(win).getByText("The Platinum package has no options."),
		).toBeInTheDocument();

		showTab(win, "Packages");
		fireEvent.click(visiblePanel(win).getByLabelText("Test Pack (0 presets)"));
		await waitFor(() => {
			expect(appearance().packageId).toBe("test-pack");
		});
		expect(appearance().activeTheme.package).toBe("test-pack");

		showTab(win, "Options");
		const cellHeight = await waitFor(() => {
			const input = visiblePanel(win).getByLabelText("Cell height");
			expect(input).toHaveValue(22);
			return input;
		});
		fireEvent.change(cellHeight, { target: { value: "30" } });
		await waitFor(() => {
			expect(appearance().activeTheme.measurements.controlStrip).toEqual({
				cellHeight: 30,
				tabWidth: 12,
			});
		});
		expect(cellHeight).toHaveValue(30);
	});
});
