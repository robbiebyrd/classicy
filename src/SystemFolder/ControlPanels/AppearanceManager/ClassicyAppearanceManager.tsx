import "./ClassicyAppearanceManager.scss";
import {
	type ChangeEvent,
	type FC as FunctionalComponent,
	startTransition,
	useCallback,
	useMemo,
	useState,
} from "react";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicySounds } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicySounds";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
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
import { useDesktopTab } from "./ClassicyAppearanceManager.Desktop";
import { useFontsTab } from "./ClassicyAppearanceManager.Fonts";
import { useThemesTab } from "./ClassicyAppearanceManager.Themes";
import { ClassicyDefaultWallpaper } from "./ClassicyWallpapers";
import appIcon from "./resources/app.png";

const APP_ID = "AppearanceManager.app";
const APP_NAME = "Appearance Manager";
const WINDOW_ID = "AppearanceManager_1";

function isValidUrlWithRegex(url: string): boolean {
	return isValidHttpUrl(url);
}

export const ClassicyAppearanceManager: FunctionalComponent = () => {
	const appearanceState = useAppManager(
			(state) => state.System.Manager.Appearance,
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
	const [bg, setBg] = useState<string>(
		appearanceState.activeTheme.desktop.backgroundImage.startsWith("data:")
			? appearanceState.activeTheme.desktop.backgroundImage
			: ClassicyDefaultWallpaper,
	);

	const themesList = useMemo(
		() =>
			appearanceState.availableThemes?.map((a: ClassicyTheme) =>
				(({ id, name }) => ({ value: id, label: name }))(a),
			),
		[appearanceState.availableThemes],
	);

	const applySoundTheme = useCallback(
		(themeName: string) => {
			const soundTheme = getTheme(themeName).sound;
			const data = ClassicySounds[soundTheme.name];
			if (!data) {
				console.error("[ClassicyAppearanceManager] Sound theme not found", {
					name: soundTheme.name,
				});
				return;
			}
			player({
				type: "ClassicySoundLoad",
				file: data,
				disabled: soundTheme.disabled,
			});
		},
		[player],
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
			applySoundTheme(themeId);
		},
		[desktopEventDispatch, applySoundTheme],
	);

	const changeBackground = useCallback(
		(e: ChangeEvent<HTMLSelectElement>) => {
			setBg(e.target.value);
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
				setBg(e.target.value);
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

	const changeFont = useCallback(
		(e: ChangeEvent<HTMLSelectElement>) => {
			startTransition(() => {
				desktopEventDispatch({
					type: "ClassicyDesktopChangeFont",
					font: e.target.value,
					fontType: e.target.id,
				});
			});
		},
		[desktopEventDispatch],
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
	// Note: ClassicyMenu only renders an <hr> divider for items whose id is
	// exactly "spacer" and keys items by id, so at most one divider per menu.
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
		themesList,
		switchTheme,
		activeThemeId: appearanceState.activeTheme.id,
	});

	const desktopTab = useDesktopTab({
		bg,
		changeBackground,
		setBackgroundURL,
		alignBackground,
		repeatBackground,
		backgroundSize,
	});

	const fontsTab = useFontsTab({
		typography: appearanceState.activeTheme.typography,
		changeFont,
		changeFontSize,
	});

	const tabs = useMemo(
		() => [themesTab, desktopTab, fontsTab],
		[themesTab, desktopTab, fontsTab],
	);

	return (
		<ClassicyApp
			id={APP_ID}
			name={APP_NAME}
			icon={appIcon}
			defaultWindow={"AppearanceManager_1"}
			noDesktopIcon={true}
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
					<ClassicyTabs tabs={tabs} />
					<ClassicyButton onClickFunc={quitApp}>Quit</ClassicyButton>
				</div>
			</ClassicyWindow>
			{aboutWindow}
		</ClassicyApp>
	);
};
