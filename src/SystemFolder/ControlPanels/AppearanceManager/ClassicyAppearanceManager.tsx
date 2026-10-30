import {
	useActiveClassicyAppearancePackage,
	useClassicyAppearancePackages,
} from "@/Appearance/ClassicyAppearancePackage";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import "./ClassicyAppearanceManager.scss";
import {
	type ChangeEvent,
	type FC as FunctionalComponent,
	startTransition,
	useCallback,
	useMemo,
	useState,
} from "react";
import type {
	ClassicyTheme,
	ClassicyThemeTypography,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { APPEARANCE_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import {
	isCustomThemeActive,
	listClassicyPackageThemes,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";
import type { ClassicyThemeColorChange } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeColorTargets";
import {
	downloadClassicyTheme,
	parseClassicyThemeFile,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import type {
	ClassicyThemeMetricChange,
	ClassicyThemeMetricFamilyChange,
	ClassicyThemeMetricFamilyTarget,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetricTargets";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { DEFAULT_ALERT_SOUND } from "@/SystemFolder/ControlPanels/SoundManager/ClassicyAlertSounds";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { useClassicySoundPacks } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import {
	useClassicyAboutMenu,
	useClassicyEditMenu,
	useClassicyWindowClose,
} from "@/SystemFolder/SystemResources/App/ClassicyAppMenuHooks";
import {
	closeWindowMenuItemHelper,
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { isValidHttpUrl } from "@/SystemFolder/SystemResources/Utils/urlValidation";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { useColorsTab } from "./ClassicyAppearanceManager.Colors";
import { useDesktopTab } from "./ClassicyAppearanceManager.Desktop";
import { useFontsTab } from "./ClassicyAppearanceManager.Fonts";
import { useMetricsTab } from "./ClassicyAppearanceManager.Metrics";
import { useOptionsTab } from "./ClassicyAppearanceManager.Options";
import { usePackagesTab } from "./ClassicyAppearanceManager.Packages";
import { useSoundTab } from "./ClassicyAppearanceManager.Sound";
import { useThemesTab } from "./ClassicyAppearanceManager.Themes";
import { withPrimaryFontFamily } from "./ClassicyFontStack";
import { ClassicyDefaultWallpaper } from "./ClassicyWallpapers";

const APP_ID = APPEARANCE_MANAGER_APP_ID;
const APP_NAME = "Appearance Manager";
const WINDOW_ID = "AppearanceManager_1";
const THEME_FILE_ALERT_ID = "AppearanceManager_theme_file_alert";

function isValidUrlWithRegex(url: string): boolean {
	return isValidHttpUrl(url);
}

export const ClassicyAppearanceManager: FunctionalComponent = () => {
	const appIcon =
		useClassicyAsset("icons", "controlPanels.appearanceManager.app") ?? "";
	const appearanceState = useAppManager(
			(state) => state.System.Manager.Appearance,
		),
		// Lives on the Desktop slice (ClassicyWindow reads it from there).
		doubleClickTitleToCollapse = useAppManager(
			(state) => state.System.Manager.Desktop?.doubleClickTitleToCollapse,
		),
		desktopEventDispatch = useAppManagerDispatch(),
		player = useSoundDispatch();

	const { aboutMenuItem, aboutWindow } = useClassicyAboutMenu(
		APP_ID,
		APP_NAME,
		appIcon,
	);
	const windowClose = useClassicyWindowClose(APP_ID);
	const editMenu = useClassicyEditMenu(APP_ID);
	// Theme backgrounds are resolved to loadable URLs before they reach the
	// store, so the current one drives the picker directly; only a
	// color-only theme needs a stand-in to select. Derived from the store on
	// every render (never seeded into local state) so a theme switch or a
	// background change from elsewhere is reflected immediately.
	const bg =
		appearanceState.activeTheme.desktop.backgroundImage ||
		ClassicyDefaultWallpaper;

	const packages = useClassicyAppearancePackages();
	const activePackage = useActiveClassicyAppearancePackage();

	// The active package's built-ins (defaults and presets) and host-loaded
	// themes, then the user's custom themes of that package (e.g. "Custom") —
	// plus the active theme when it is not among them (a theme of another
	// package), so the pop-up always shows the current choice, as the Sound
	// tab does for packs (J-R22).
	const { id: activeThemeId, name: activeThemeName } =
		appearanceState.activeTheme;
	const themesList = useMemo(() => {
		const themes = listClassicyPackageThemes(
			{
				availableThemes: appearanceState.availableThemes,
				customThemes: appearanceState.customThemes,
			},
			activePackage,
		).map((a: ClassicyTheme) => ({ value: a.id, label: a.name }));
		if (!themes.some((t) => t.value === activeThemeId))
			themes.push({ value: activeThemeId, label: activeThemeName });
		return themes;
	}, [
		appearanceState.availableThemes,
		appearanceState.customThemes,
		activePackage,
		activeThemeId,
		activeThemeName,
	]);

	// Packs shared by every package, and the active package's own — plus the
	// active theme's pack when it belongs to another package, so the pop-up
	// always shows the current choice.
	const registeredSoundPacks = useClassicySoundPacks();
	const currentSoundPack = appearanceState.activeTheme.sound.pack;
	const soundPacks = useMemo(
		() =>
			registeredSoundPacks
				.filter(
					(pack) =>
						pack.packageId === undefined ||
						pack.packageId === activePackage.id ||
						pack.id === currentSoundPack,
				)
				.map(({ id, name }) => ({ id, name })),
		[registeredSoundPacks, activePackage.id, currentSoundPack],
	);

	// Why a theme file could not be saved or loaded, shown in a stop alert.
	const [themeFileError, setThemeFileError] = useState<{
		label: string;
		message: string;
	} | null>(null);

	// Saves the ACTIVE theme — a built-in or a custom one — as a theme file.
	const saveTheme = useCallback(() => {
		const result = downloadClassicyTheme(
			useAppManager.getState().System.Manager.Appearance.activeTheme,
		);
		if (!result.ok) {
			setThemeFileError({
				label: "The theme could not be saved.",
				message: result.error,
			});
		}
	}, []);

	const loadThemeFile = useCallback(
		async (file: File) => {
			let text: string;
			try {
				text = await file.text();
			} catch {
				setThemeFileError({
					label: `“${file.name}” could not be loaded.`,
					message: "The file could not be read.",
				});
				return;
			}
			const result = parseClassicyThemeFile(text);
			if (!result.ok) {
				setThemeFileError({
					label: `“${file.name}” could not be loaded.`,
					message: result.error,
				});
				return;
			}
			// A theme made for another installed package switches to that
			// package first, so the active theme and the active look agree.
			// (parseClassicyThemeFile has already refused an uninstalled one.)
			const themePackage = result.theme.package;
			if (
				themePackage !== activePackage.id &&
				getClassicyAppearancePackage(themePackage)
			) {
				desktopEventDispatch({
					type: "ClassicyDesktopChangeAppearancePackage",
					packageId: themePackage,
				});
			}
			// The reducer re-validates the theme, gives it a unique id and name,
			// adds it to the custom themes and makes it the active theme, which
			// selects it in the theme pop-up.
			desktopEventDispatch({
				type: "ClassicyDesktopImportTheme",
				theme: result.theme,
			});
		},
		[desktopEventDispatch, activePackage.id],
	);

	const switchTheme = useCallback(
		(e: ChangeEvent<HTMLSelectElement>) => {
			const themeId = e.currentTarget.value;
			startTransition(() => {
				desktopEventDispatch({
					type: "ClassicyDesktopChangeTheme",
					activeTheme: themeId,
				});
			});
		},
		[desktopEventDispatch],
	);

	const toggleSmartScrolling = useCallback(
		(checked: boolean) => {
			startTransition(() => {
				desktopEventDispatch({
					type: "ClassicyDesktopSetSmartScrolling",
					smartScrolling: checked,
				});
			});
		},
		[desktopEventDispatch],
	);

	const toggleDoubleClickTitleToCollapse = useCallback(
		(checked: boolean) => {
			startTransition(() => {
				desktopEventDispatch({
					type: "ClassicyDesktopSetDoubleClickTitleToCollapse",
					doubleClickTitleToCollapse: checked,
				});
			});
		},
		[desktopEventDispatch],
	);

	const changeBackground = useCallback(
		(e: ChangeEvent<HTMLSelectElement>) => {
			startTransition(() => {
				desktopEventDispatch({
					type: "ClassicyDesktopChangeBackground",
					backgroundImage: e.target.value,
				});
			});
		},
		[desktopEventDispatch],
	);

	const setBackgroundURL = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			if (isValidUrlWithRegex(e.target.value)) {
				startTransition(() => {
					desktopEventDispatch({
						type: "ClassicyDesktopChangeBackground",
						backgroundImage: e.target.value,
					});
				});
			}
		},
		[desktopEventDispatch],
	);

	const alignBackground = useCallback(
		(e: ChangeEvent<HTMLSelectElement>) => {
			startTransition(() => {
				desktopEventDispatch({
					type: "ClassicyDesktopChangeBackgroundPosition",
					backgroundPosition: e.target.value,
				});
			});
		},
		[desktopEventDispatch],
	);

	const repeatBackground = useCallback(
		(e: ChangeEvent<HTMLSelectElement>) => {
			startTransition(() => {
				desktopEventDispatch({
					type: "ClassicyDesktopChangeBackgroundRepeat",
					backgroundRepeat: e.target.value,
				});
			});
		},
		[desktopEventDispatch],
	);

	const backgroundSize = useCallback(
		(e: ChangeEvent<HTMLSelectElement>) => {
			startTransition(() => {
				desktopEventDispatch({
					type: "ClassicyDesktopChangeBackgroundSize",
					backgroundSize: e.target.value,
				});
			});
		},
		[desktopEventDispatch],
	);

	const typography = appearanceState.activeTheme.typography;
	const changeFont = useCallback(
		(fontType: string, family: string) => {
			// The menus offer bare family names; the theme stores a full CSS
			// stack. Put the chosen family first and keep the rest of the
			// current stack as fallbacks.
			const current = typography[fontType as keyof ClassicyThemeTypography];
			const font = withPrimaryFontFamily(
				typeof current === "string" ? current : "",
				family,
			);
			startTransition(() => {
				desktopEventDispatch({
					type: "ClassicyDesktopChangeFont",
					fontType,
					font,
				});
			});
		},
		[desktopEventDispatch, typography],
	);

	const changeColor = useCallback(
		(change: ClassicyThemeColorChange) => {
			startTransition(() => {
				desktopEventDispatch({ type: "ClassicyDesktopChangeColor", ...change });
			});
		},
		[desktopEventDispatch],
	);

	const changeMetric = useCallback(
		(change: ClassicyThemeMetricChange | ClassicyThemeMetricFamilyChange) => {
			startTransition(() => {
				desktopEventDispatch({
					type: "ClassicyDesktopChangeMetric",
					...change,
				});
			});
		},
		[desktopEventDispatch],
	);

	// A package knob (Options tab): the family form of ChangeMetric.
	const changeKnob = useCallback(
		(target: ClassicyThemeMetricFamilyTarget, value: number) =>
			changeMetric({ ...target, value }),
		[changeMetric],
	);

	const changePackage = useCallback(
		(packageId: string) => {
			startTransition(() => {
				desktopEventDispatch({
					type: "ClassicyDesktopChangeAppearancePackage",
					packageId,
				});
			});
		},
		[desktopEventDispatch],
	);

	const changeSoundPack = useCallback(
		(e: ChangeEvent<HTMLSelectElement>) => {
			const value = e.target.value;
			startTransition(() => {
				desktopEventDispatch({
					type: "ClassicyDesktopChangeAppearanceOption",
					path: "sound.pack",
					value,
				});
			});
		},
		[desktopEventDispatch],
	);

	const changeAlertSound = useCallback(
		(e: ChangeEvent<HTMLSelectElement>) => {
			const value = e.target.value;
			startTransition(() => {
				desktopEventDispatch({
					type: "ClassicyDesktopChangeAlertSound",
					alertSound: value,
				});
			});
			// Audition the chosen sound immediately (Mac OS 8 Sound control panel).
			player({ type: "ClassicySoundPlayInterrupt", sound: value });
		},
		[desktopEventDispatch, player],
	);

	const changeAlertVolume = useCallback(
		(alertVolume: number) => {
			desktopEventDispatch({
				type: "ClassicyDesktopChangeAlertVolume",
				alertVolume,
			});
		},
		[desktopEventDispatch],
	);

	// Audition the alert at the committed level, as the Volume slider in the
	// Sound control panel does. The level is handed to the sound state directly
	// (ahead of the store→sound bridge) so the preview never plays at the
	// previous level.
	const previewAlertVolume = useCallback(
		(alertVolume: number) => {
			player({ type: "ClassicySoundSetAlertVolume", alertVolume });
			player({ type: "ClassicyAlertSound" });
		},
		[player],
	);

	const changeFontSize = useCallback(
		(fontType: string, size: number) => {
			startTransition(() => {
				desktopEventDispatch({
					type: "ClassicyDesktopChangeFontSize",
					fontType,
					fontSize: size,
				});
			});
		},
		[desktopEventDispatch],
	);
	const quitApp = () => {
		desktopEventDispatch(quitAppHelper(APP_ID, APP_NAME, appIcon));
	};

	// Mac OS 8 HIG control-panel menu bar (audit ch. 6 §35): Apple / File / Edit.
	//
	// The About entry published here is discovery data for the desktop menu bar
	// (HIG #209): ClassicyDesktopMenuBar hoists it into the Apple menu as
	// "About <name>" and strips it from this menu before rendering, so it never
	// shows under File — but it must stay published or the Apple menu loses it.
	//
	// A divider is an item with id "spacer"; ClassicyMenu keys dividers by
	// position, so a menu may hold any number of them.
	const appMenu = [
		{
			id: `${APP_ID}_file`,
			title: "File",
			menuChildren: [
				{ ...aboutMenuItem, title: `About ${APP_NAME}` },
				{
					...closeWindowMenuItemHelper(`${APP_ID}_close_window`, () =>
						windowClose(WINDOW_ID, quitAppHelper(APP_ID, APP_NAME, appIcon)),
					),
					keyboardShortcut: "⌥W",
				},
				{ id: "spacer" },
				{
					...quitMenuItemHelper(APP_ID, APP_NAME, appIcon),
					keyboardShortcut: "⌥Q",
				},
			],
		},
		// Edit menu — the Themes tab exposes a background-image URL text field.
		// Commands act on the focused field; ⌘Z/⌘X/⌘C/⌘V/⌘A work natively there.
		editMenu,
	];

	const themesTab = useThemesTab({
		packageId: activePackage.id,
		packageName: activePackage.name,
		themesList,
		switchTheme,
		activeThemeId: appearanceState.activeTheme.id,
		// Default to on when unset (persisted stores predating this setting).
		smartScrolling: appearanceState.smartScrolling !== false,
		toggleSmartScrolling,
		// Same on-when-unset default ClassicyWindow applies when reading it.
		doubleClickTitleToCollapse: doubleClickTitleToCollapse !== false,
		toggleDoubleClickTitleToCollapse,
		saveTheme,
		loadThemeFile,
	});

	const packagesTab = usePackagesTab({
		packages,
		activePackageId: activePackage.id,
		changePackage,
	});

	const optionsTab = useOptionsTab({
		pkg: activePackage,
		theme: appearanceState.activeTheme,
		editingCustomTheme: isCustomThemeActive(appearanceState),
		changeMetric: changeKnob,
	});

	const desktopTab = useDesktopTab({
		bg,
		bgPosition: appearanceState.activeTheme.desktop.backgroundPosition,
		bgRepeat: appearanceState.activeTheme.desktop.backgroundRepeat,
		bgSize: appearanceState.activeTheme.desktop.backgroundSize,
		changeBackground,
		setBackgroundURL,
		alignBackground,
		repeatBackground,
		backgroundSize,
	});

	const colorsTab = useColorsTab({
		theme: appearanceState.activeTheme,
		editingCustomTheme: isCustomThemeActive(appearanceState),
		changeColor,
		appId: APP_ID,
	});

	const fontsTab = useFontsTab({
		typography,
		changeFont,
		changeFontSize,
	});

	const metricsTab = useMetricsTab({
		theme: appearanceState.activeTheme,
		editingCustomTheme: isCustomThemeActive(appearanceState),
		changeMetric,
	});

	const soundTab = useSoundTab({
		soundPacks,
		soundPack: currentSoundPack,
		changeSoundPack,
		alertSound: appearanceState.alertSound ?? DEFAULT_ALERT_SOUND,
		changeAlertSound,
		alertVolume: appearanceState.alertVolume ?? 100,
		changeAlertVolume,
		previewAlertVolume,
	});

	const tabs = useMemo(
		// Packages and Options follow Themes: the package is the outermost
		// choice, its knobs next. Colors sits between Desktop and Fonts: Mac OS
		// 8.5's Appearance panel puts its color tab ahead of Fonts. Metrics
		// follows Fonts, ahead of Sound.
		() => [
			themesTab,
			packagesTab,
			optionsTab,
			desktopTab,
			colorsTab,
			fontsTab,
			metricsTab,
			soundTab,
		],
		[
			themesTab,
			packagesTab,
			optionsTab,
			desktopTab,
			colorsTab,
			fontsTab,
			metricsTab,
			soundTab,
		],
	);

	return (
		<ClassicyApp
			id={APP_ID}
			name={APP_NAME}
			icon={appIcon}
			defaultWindow={"AppearanceManager_1"}
			showDesktopIcon={false}
			showInApplicationsFolder={false}
			addSystemMenu={true}
		>
			<ClassicyWindow
				id={WINDOW_ID}
				title={APP_NAME}
				appId={APP_ID}
				icon={appIcon}
				closable={true}
				resizable={false}
				zoomable={false}
				scrollable={false}
				collapsable={false}
				// HIG (audit ch. 6 §35): control-panel windows respect the
				// 492×340 absolute ceiling. 480 stays under it (was 500).
				initialSize={[480, 0]}
				initialPosition={[300, 50]}
				modal={false}
				appMenu={appMenu}
			>
				<div className={"classicyAppearanceManagerContent"}>
					{/* Eight tabs need the compact strip, which scrolls sideways
					    when they overflow the 480 px panel. */}
					<ClassicyTabs tabs={tabs} size="small" />
					<ClassicyButton onClickFunc={quitApp}>Quit</ClassicyButton>
				</div>
			</ClassicyWindow>
			{aboutWindow}
			{themeFileError && (
				<ClassicyAlert
					id={THEME_FILE_ALERT_ID}
					appId={APP_ID}
					alertType={"stop"}
					label={themeFileError.label}
					message={themeFileError.message}
					onClose={() => setThemeFileError(null)}
				/>
			)}
		</ClassicyApp>
	);
};
