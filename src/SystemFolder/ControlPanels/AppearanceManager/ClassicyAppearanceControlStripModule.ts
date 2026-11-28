import { startTransition } from "react";
import {
	useActiveClassicyAppearancePackage,
	useClassicyAppearancePackages,
} from "@/Appearance/ClassicyAppearancePackage";
import { useClassicyAppIdentity } from "@/Appearance/ClassicyAppIdentity";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { APPEARANCE_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import { listClassicyPackageThemes } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyCustomTheme";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	CLASSICY_CONTROL_STRIP_MODULE_IDS,
	classicyControlStripOpenControlPanelItem,
	registerClassicyControlStripModule,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const SEPARATOR: ClassicyMenuItem = { id: "spacer" };

/** An italic heading line, like Figure 6-15's "No Users Connected". */
const heading = (id: string, title: string): ClassicyMenuItem => ({
	id,
	title,
	disabled: true,
	className: "classicyControlStripStatus",
});

const useAppearanceModuleIcon = (): string =>
	useClassicyAsset("icons", "system.controlStrip.appearance") ?? "";

/**
 * Switch the Appearance Package (when more than one is installed) and the
 * theme, or open the Appearance control panel. The same actions as the
 * panel's Packages and Themes tabs, so a switch made here and one made there
 * are the same switch.
 */
const useAppearanceModuleMenu = (): ClassicyMenuItem[] => {
	const dispatch = useAppManagerDispatch();
	const packages = useClassicyAppearancePackages();
	const activePackage = useActiveClassicyAppearancePackage();
	const availableThemes = useAppManager(
		(s) => s.System.Manager.Appearance.availableThemes,
	);
	const customThemes = useAppManager(
		(s) => s.System.Manager.Appearance.customThemes,
	);
	const activeTheme = useAppManager(
		(s) => s.System.Manager.Appearance.activeTheme,
	);
	// Display only: the item opens the panel by its own identity.
	const panel = useClassicyAppIdentity(APPEARANCE_MANAGER_APP_ID, {
		name: "Appearance Manager",
		icon: ClassicyIcons.controlPanels.appearanceManager.app,
	});

	// The Themes tab's list: the active package's built-ins and host-loaded
	// themes, then its custom ones, plus the active theme when it belongs to
	// another package, so the current choice is always shown checked.
	const themes = listClassicyPackageThemes(
		{ availableThemes, customThemes },
		activePackage,
	).map(({ id, name }) => ({ id, name }));
	if (!themes.some((t) => t.id === activeTheme.id))
		themes.push({ id: activeTheme.id, name: activeTheme.name });

	// A package section only when there is another package to switch to.
	const packageItems: ClassicyMenuItem[] =
		packages.length > 1
			? [
					heading("appearance-packages", "Appearance"),
					...packages.map((pkg) => ({
						id: `appearance-package-${pkg.id}`,
						title: pkg.name,
						checked: pkg.id === activePackage.id,
						onClickFunc: () => {
							if (pkg.id === activePackage.id) return;
							startTransition(() =>
								dispatch({
									type: "ClassicyDesktopChangeAppearancePackage",
									packageId: pkg.id,
								}),
							);
						},
					})),
					SEPARATOR,
				]
			: [];

	return [
		...packageItems,
		heading("appearance-themes", `${activePackage.name} Themes`),
		...themes.map((theme) => ({
			id: `appearance-theme-${theme.id}`,
			title: theme.name,
			checked: theme.id === activeTheme.id,
			onClickFunc: () => {
				if (theme.id === activeTheme.id) return;
				startTransition(() =>
					dispatch({
						type: "ClassicyDesktopChangeTheme",
						activeTheme: theme.id,
					}),
				);
			},
		})),
		SEPARATOR,
		classicyControlStripOpenControlPanelItem(dispatch, panel.name, {
			id: APPEARANCE_MANAGER_APP_ID,
			name: "Appearance Manager",
			icon: ClassicyIcons.controlPanels.appearanceManager.app,
		}),
	];
};

/**
 * Appearance: switch package and theme from the strip. Contributed by the
 * Appearance control panel, so it shows while AppearanceManager.app is
 * mounted (HIGOS8 p.125: it carries the command that opens that panel).
 */
export const CLASSICY_APPEARANCE_CONTROL_STRIP_MODULE =
	registerClassicyControlStripModule({
		id: CLASSICY_CONTROL_STRIP_MODULE_IDS.appearance,
		appId: APPEARANCE_MANAGER_APP_ID,
		label: "Appearance",
		order: 30,
		icon: useAppearanceModuleIcon,
		fileIcon: ClassicyIcons.controlPanels.appearanceManager.app,
		menuItems: useAppearanceModuleMenu,
		// The Windows shell's status area makes its Open item the default.
		panel: {
			id: APPEARANCE_MANAGER_APP_ID,
			name: "Appearance Manager",
			icon: ClassicyIcons.controlPanels.appearanceManager.app,
		},
	});
