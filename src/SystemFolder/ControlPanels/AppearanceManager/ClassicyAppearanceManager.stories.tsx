import type { Meta, StoryObj } from "@storybook/react-vite";
import {
	type ChangeEvent,
	type FC,
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	type ClassicyAppearanceKnobs,
	type ClassicyAppearancePackage,
	useActiveClassicyAppearancePackage,
	useClassicyAppearancePackages,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import { classicyKnobsToSchema } from "@/Appearance/ClassicyAppearancePackageSchema";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
// Registers Platinum, whose look Test Pack (below) borrows.
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@/Appearance/Platinum";
import {
	type ClassicyTheme,
	type ClassicyThemeTypography,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicyAppearanceManager } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager";
import { useColorsTab } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Colors";
import { useDesktopTab } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Desktop";
import { useFontsTab } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Fonts";
import { useMetricsTab } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Metrics";
import { useOptionsTab } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Options";
import { usePackagesTab } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Packages";
import { useSoundTab } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Sound";
import { useThemesTab } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Themes";
import { APPEARANCE_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import {
	isCustomThemeActive,
	listClassicyPackageThemes,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";
import { withPrimaryFontFamily } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyFontStack";
import type { ClassicyThemeColorChange } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeColorTargets";
import {
	downloadClassicyTheme,
	parseClassicyThemeFile,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import type {
	ClassicyThemeMetricChange,
	ClassicyThemeMetricFamilyTarget,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets";
import { ClassicyDefaultWallpaper } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { DEFAULT_ALERT_SOUND } from "@/SystemFolder/ControlPanels/SoundManager/ClassicyAlertSounds";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { useClassicySoundPacks } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const APP_NAME = "Appearance Manager";
// The tab windows' own app. ClassicyDesktop already mounts the control panels,
// so opening AppearanceManager.app would open the real panel beside the tab.
const TAB_STORY_APP_ID = "AppearanceManagerTabStory.app";

// ---------------------------------------------------------------------------
// Test Pack: a second Appearance Package, registered at module scope (as in
// the Packages and Options tab tests), so the Packages list shows two rows
// and the Options tab has knobs to show (Platinum declares none). It borrows
// Platinum's look — Platinum's stylesheet re-scoped to its own id — so a
// switch to it changes what the panel offers, not how the desktop looks.
// The registration lasts for the iframe's lifetime, so shoot these stories
// in a fresh page.
// ---------------------------------------------------------------------------

const TEST_PACK_ID = "test-pack";

const testPackKnobs: ClassicyAppearanceKnobs = {
	controlStrip: {
		cellHeight: { label: "Cell height", min: 1, max: 512, default: 22 },
		tabWidth: { label: "Tab width", min: 4, max: 40, default: 12 },
	},
	menuBar: {
		height: { label: "Menu bar height", min: 10, max: 60, default: 20 },
	},
};

const testPackTheme = (
	base: ClassicyTheme,
	id: string,
	name: string,
): ClassicyTheme => ({
	...base,
	id,
	name,
	package: TEST_PACK_ID,
	measurements: {
		...base.measurements,
		controlStrip: { cellHeight: 22, tabWidth: 12 },
		menuBar: { height: 20 },
	},
});

const platinum = getClassicyAppearancePackage(PLATINUM_APPEARANCE_PACKAGE_ID);
const testPackDefaults = testPackTheme(
	getTheme("default"),
	TEST_PACK_ID,
	"Test Pack",
);

const testPack: ClassicyAppearancePackage = {
	id: TEST_PACK_ID,
	name: "Test Pack",
	css: (platinum?.css ?? "").replace(
		/(\[data-classicy-appearance=)("?)platinum\2\]/g,
		`$1$2${TEST_PACK_ID}$2]`,
	),
	defaults: testPackDefaults,
	presets: [
		testPackDefaults,
		testPackTheme(getTheme("azul"), `${TEST_PACK_ID}-azul`, "Test Pack Azul"),
	],
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
	knobs: testPackKnobs,
	options: classicyKnobsToSchema(testPackKnobs),
};

registerClassicyAppearancePackage(testPack);

// ---------------------------------------------------------------------------
// One window per tab: the tab's content in a stand-alone window, so each tab
// renders on its own without the tab strip.
// ---------------------------------------------------------------------------

const useAppearanceIcon = (): string =>
	useClassicyAsset("icons", "controlPanels.appearanceManager.app") ?? "";

/** Opens an app (a ClassicyApp's children render only while it is open). */
const useOpenApp = (id: string, icon: string) => {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({ type: "ClassicyAppOpen", app: { id, name: APP_NAME, icon } });
	}, [dispatch, id, icon]);
};

const AppearanceTabWindow: FC<{
	/** Window id suffix, e.g. `themes` → `story_themes`. */
	id: string;
	tab: TabIndividual;
	/** Rendered inside the app, after the window (e.g. an alert). */
	children?: ReactNode;
}> = ({ id, tab, children }) => {
	const icon = useAppearanceIcon();
	useOpenApp(TAB_STORY_APP_ID, icon);
	return (
		<ClassicyApp
			id={TAB_STORY_APP_ID}
			name={APP_NAME}
			icon={icon}
			showDesktopIcon={false}
			showInApplicationsFolder={false}
		>
			<ClassicyWindow
				id={`story_${id}`}
				appId={TAB_STORY_APP_ID}
				title={`Appearance: ${tab.title}`}
				icon={icon}
				resizable={false}
				zoomable={false}
				collapsable={false}
				scrollable={false}
				initialSize={[480, 0]}
				initialPosition={[120, 60]}
			>
				<div className={"classicyAppearanceManagerContent"}>{tab.children}</div>
			</ClassicyWindow>
			{children}
		</ClassicyApp>
	);
};

const useAppearance = () =>
	useAppManager((state) => state.System.Manager.Appearance);

const ThemesTabStory = () => {
	const appearance = useAppearance();
	const doubleClickTitleToCollapse = useAppManager(
		(state) => state.System.Manager.Desktop?.doubleClickTitleToCollapse,
	);
	const dispatch = useAppManagerDispatch();
	const activePackage = useActiveClassicyAppearancePackage();
	const themesList = useMemo(
		() =>
			listClassicyPackageThemes(appearance, activePackage).map((t) => ({
				value: t.id,
				label: t.name,
			})),
		[appearance, activePackage],
	);
	// Save Theme… and Load Theme… as the panel does them
	// (ClassicyAppearanceManager.tsx): a failure shows a stop alert, and a
	// theme file for another installed package switches to that package
	// before the import, so the active theme and the active look agree (J-R4).
	const [themeFileError, setThemeFileError] = useState<{
		label: string;
		message: string;
	} | null>(null);
	const saveTheme = useCallback(() => {
		const result = downloadClassicyTheme(
			useAppManager.getState().System.Manager.Appearance.activeTheme,
		);
		if (!result.ok)
			setThemeFileError({
				label: "The theme could not be saved.",
				message: result.error,
			});
	}, []);
	const loadThemeFile = useCallback(
		async (file: File) => {
			const label = `“${file.name}” could not be loaded.`;
			let text: string;
			try {
				text = await file.text();
			} catch {
				setThemeFileError({ label, message: "The file could not be read." });
				return;
			}
			const result = parseClassicyThemeFile(text);
			if (!result.ok) {
				setThemeFileError({ label, message: result.error });
				return;
			}
			const themePackage = result.theme.package;
			if (
				themePackage !== activePackage.id &&
				getClassicyAppearancePackage(themePackage)
			)
				dispatch({
					type: "ClassicyDesktopChangeAppearancePackage",
					packageId: themePackage,
				});
			dispatch({ type: "ClassicyDesktopImportTheme", theme: result.theme });
		},
		[dispatch, activePackage.id],
	);
	const tab = useThemesTab({
		packageId: activePackage.id,
		packageName: activePackage.name,
		themesList,
		switchTheme: (e: ChangeEvent<HTMLSelectElement>) =>
			dispatch({
				type: "ClassicyDesktopChangeTheme",
				activeTheme: e.currentTarget.value,
			}),
		activeThemeId: appearance.activeTheme.id,
		smartScrolling: appearance.smartScrolling !== false,
		toggleSmartScrolling: (smartScrolling: boolean) =>
			dispatch({ type: "ClassicyDesktopSetSmartScrolling", smartScrolling }),
		doubleClickTitleToCollapse: doubleClickTitleToCollapse !== false,
		toggleDoubleClickTitleToCollapse: (checked: boolean) =>
			dispatch({
				type: "ClassicyDesktopSetDoubleClickTitleToCollapse",
				doubleClickTitleToCollapse: checked,
			}),
		saveTheme,
		loadThemeFile,
	});
	return (
		<AppearanceTabWindow id="themes" tab={tab}>
			{themeFileError && (
				<ClassicyAlert
					id={"AppearanceManagerTabStory_theme_file_alert"}
					appId={TAB_STORY_APP_ID}
					alertType={"stop"}
					label={themeFileError.label}
					message={themeFileError.message}
					onClose={() => setThemeFileError(null)}
				/>
			)}
		</AppearanceTabWindow>
	);
};

const PackagesTabStory = () => {
	const dispatch = useAppManagerDispatch();
	const changePackage = useCallback(
		(packageId: string) =>
			dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId }),
		[dispatch],
	);
	const tab = usePackagesTab({
		packages: useClassicyAppearancePackages(),
		activePackageId: useActiveClassicyAppearancePackage().id,
		changePackage,
	});
	return <AppearanceTabWindow id="packages" tab={tab} />;
};

const OptionsTabStory = () => {
	const appearance = useAppearance();
	const dispatch = useAppManagerDispatch();
	// Platinum declares no knobs, so the story switches to Test Pack, whose
	// two families render as two groups of spinners. On unmount it switches
	// back (if Test Pack is still active), so a non-desktop story opened next
	// in this iframe, whose frame keeps the store, renders under Platinum.
	useEffect(() => {
		dispatch({
			type: "ClassicyDesktopChangeAppearancePackage",
			packageId: TEST_PACK_ID,
		});
		return () => {
			if (
				useAppManager.getState().System.Manager.Appearance.packageId ===
				TEST_PACK_ID
			)
				dispatch({
					type: "ClassicyDesktopChangeAppearancePackage",
					packageId: PLATINUM_APPEARANCE_PACKAGE_ID,
				});
		};
	}, [dispatch]);
	const changeMetric = useCallback(
		(target: ClassicyThemeMetricFamilyTarget, value: number) =>
			dispatch({ type: "ClassicyDesktopChangeMetric", ...target, value }),
		[dispatch],
	);
	const tab = useOptionsTab({
		pkg: useActiveClassicyAppearancePackage(),
		theme: appearance.activeTheme,
		editingCustomTheme: isCustomThemeActive(appearance),
		changeMetric,
	});
	return <AppearanceTabWindow id="options" tab={tab} />;
};

const DesktopTabStory = () => {
	const { desktop } = useAppearance().activeTheme;
	const dispatch = useAppManagerDispatch();
	const tab = useDesktopTab({
		bg: desktop.backgroundImage || ClassicyDefaultWallpaper,
		bgPosition: desktop.backgroundPosition,
		bgRepeat: desktop.backgroundRepeat,
		bgSize: desktop.backgroundSize,
		changeBackground: (e) =>
			dispatch({
				type: "ClassicyDesktopChangeBackground",
				backgroundImage: e.target.value,
			}),
		setBackgroundURL: (e) =>
			dispatch({
				type: "ClassicyDesktopChangeBackground",
				backgroundImage: e.target.value,
			}),
		alignBackground: (e) =>
			dispatch({
				type: "ClassicyDesktopChangeBackgroundPosition",
				backgroundPosition: e.target.value,
			}),
		repeatBackground: (e) =>
			dispatch({
				type: "ClassicyDesktopChangeBackgroundRepeat",
				backgroundRepeat: e.target.value,
			}),
		backgroundSize: (e) =>
			dispatch({
				type: "ClassicyDesktopChangeBackgroundSize",
				backgroundSize: e.target.value,
			}),
	});
	return <AppearanceTabWindow id="desktop" tab={tab} />;
};

const ColorsTabStory = () => {
	const appearance = useAppearance();
	const dispatch = useAppManagerDispatch();
	const changeColor = useCallback(
		(change: ClassicyThemeColorChange) =>
			dispatch({ type: "ClassicyDesktopChangeColor", ...change }),
		[dispatch],
	);
	const tab = useColorsTab({
		theme: appearance.activeTheme,
		editingCustomTheme: isCustomThemeActive(appearance),
		changeColor,
		appId: TAB_STORY_APP_ID,
	});
	return <AppearanceTabWindow id="colors" tab={tab} />;
};

const FontsTabStory = () => {
	const { typography } = useAppearance().activeTheme;
	const dispatch = useAppManagerDispatch();
	const tab = useFontsTab({
		typography,
		changeFont: (fontType: string, family: string) => {
			const current = typography[fontType as keyof ClassicyThemeTypography];
			dispatch({
				type: "ClassicyDesktopChangeFont",
				fontType,
				font: withPrimaryFontFamily(
					typeof current === "string" ? current : "",
					family,
				),
			});
		},
		changeFontSize: (fontType: string, fontSize: number) =>
			dispatch({ type: "ClassicyDesktopChangeFontSize", fontType, fontSize }),
	});
	return <AppearanceTabWindow id="fonts" tab={tab} />;
};

const MetricsTabStory = () => {
	const appearance = useAppearance();
	const dispatch = useAppManagerDispatch();
	const changeMetric = useCallback(
		(change: ClassicyThemeMetricChange) =>
			dispatch({ type: "ClassicyDesktopChangeMetric", ...change }),
		[dispatch],
	);
	const tab = useMetricsTab({
		theme: appearance.activeTheme,
		editingCustomTheme: isCustomThemeActive(appearance),
		changeMetric,
	});
	return <AppearanceTabWindow id="metrics" tab={tab} />;
};

const SoundTabStory = () => {
	const appearance = useAppearance();
	const dispatch = useAppManagerDispatch();
	const player = useSoundDispatch();
	const activePackageId = useActiveClassicyAppearancePackage().id;
	const registeredSoundPacks = useClassicySoundPacks();
	const soundPack = appearance.activeTheme.sound.pack;
	const soundPacks = useMemo(
		() =>
			registeredSoundPacks
				.filter(
					(pack) =>
						pack.packageId === undefined ||
						pack.packageId === activePackageId ||
						pack.id === soundPack,
				)
				.map(({ id, name }) => ({ id, name })),
		[registeredSoundPacks, activePackageId, soundPack],
	);
	const tab = useSoundTab({
		soundPacks,
		soundPack,
		changeSoundPack: (e) =>
			dispatch({
				type: "ClassicyDesktopChangeAppearanceOption",
				path: "sound.pack",
				value: e.target.value,
			}),
		alertSound: appearance.alertSound ?? DEFAULT_ALERT_SOUND,
		changeAlertSound: (e) => {
			dispatch({
				type: "ClassicyDesktopChangeAlertSound",
				alertSound: e.target.value,
			});
			player({ type: "ClassicySoundPlayInterrupt", sound: e.target.value });
		},
		alertVolume: appearance.alertVolume ?? 100,
		changeAlertVolume: (alertVolume: number) =>
			dispatch({ type: "ClassicyDesktopChangeAlertVolume", alertVolume }),
		previewAlertVolume: (alertVolume: number) => {
			player({ type: "ClassicySoundSetAlertVolume", alertVolume });
			player({ type: "ClassicyAlertSound" });
		},
	});
	return <AppearanceTabWindow id="sound" tab={tab} />;
};

/** The whole control panel, opened as a user would open it. ClassicyDesktop
 * mounts it (with the other control panels), so the story only opens it. */
const AppearancePanel: FC = () => {
	useOpenApp(APPEARANCE_MANAGER_APP_ID, useAppearanceIcon());
	return null;
};

const meta = {
	title: "System/AppearanceManager",
	component: ClassicyAppearanceManager,
	parameters: {
		layout: "fullscreen",
		classicy: { desktop: true },
		docs: { story: { inline: false, height: "600px" } },
	},
} satisfies Meta<typeof ClassicyAppearanceManager>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The Appearance Manager control panel: eight tabs (Themes, Packages,
 * Options, Desktop, Colors, Fonts, Metrics, Sound) in the compact tab strip,
 * which scrolls sideways when they overflow the 480 px window. Every edit
 * dispatches for real; the first edit on a built-in theme forks its
 * package's "Custom" theme.
 */
export const Panel: Story = {
	render: () => <AppearancePanel />,
};

/**
 * Themes: the active Appearance Package's presets and custom themes, the
 * scrolling options, and Save Theme… / Load Theme…. Load Theme… with a file
 * for a package that is not installed, or one that does not parse, is
 * refused before anything is dispatched, with the reason in a stop alert; a
 * file for another installed package (Test Pack, say) switches to that
 * package before the theme is imported.
 */
export const Themes: Story = {
	render: () => <ThemesTabStory />,
};

/**
 * Packages: every registered Appearance Package with its preset count, and
 * each package's seven theme colors. Picking one dispatches
 * `ClassicyDesktopChangeAppearancePackage { packageId }`, which keeps the
 * user's custom themes. Test Pack is registered by this story file.
 */
export const Packages: Story = {
	render: () => <PackagesTabStory />,
};

/**
 * Options: the active package's knobs, one group per family. This story
 * switches to Test Pack (Platinum declares no knobs). Edits dispatch
 * `ClassicyDesktopChangeMetric { family, key, value }`, clamped to the
 * knob's range within 0–512.
 */
export const Options: Story = {
	render: () => <OptionsTabStory />,
};

/** Desktop: the wallpaper picker (read from the wallpaper registry) and its
 * position, tiling and size. */
export const Desktop: Story = {
	render: () => <DesktopTabStory />,
};

/** Colors: the 28 editable theme colors (`CLASSICY_THEME_COLOR_TARGETS`). */
export const Colors: Story = {
	render: () => <ColorsTabStory />,
};

/** Fonts: a family and size per typography slot, read from the font
 * registry. */
export const Fonts: Story = {
	render: () => <FontsTabStory />,
};

/** Metrics: the 20 core layout metrics (`CLASSICY_THEME_METRIC_TARGETS`) in
 * five groups. Edits dispatch `ClassicyDesktopChangeMetric { metricKey,
 * value }`. */
export const Metrics: Story = {
	render: () => <MetricsTabStory />,
};

/** Sound: the sound pack (shared packs and the active package's own), the
 * alert sound and the alert volume. */
export const Sound: Story = {
	render: () => <SoundTabStory />,
};
