import { act } from "@testing-library/react";
import { produce } from "immer";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	type ClassicyAppearanceLayout,
	type ClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
// Registers Platinum's sound pack: the package's defaults are a Platinum
// theme, and a theme's `sound.pack` must name a registered pack.
import "../../packages/appearance/platinum/src/assets/sounds/platinum";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

/** The test package's id. */
export const TEST_WINDOWS_KEYS_PACKAGE_ID = "test-windows-keys";

/**
 * Mac OS 8's layout with Windows' keys alone: the menu keyboard
 * (`menu.keys` "windows"), Shift+F10 and the Application key
 * (`keyboard.contextMenuKey`) and Explorer's Open first in Finder's item
 * menus (`finder.commands` "windows"), the three flags Windows 98 declares
 * that keep these behaviors from Platinum and System 7.
 */
export const TEST_WINDOWS_KEYS_LAYOUT: ClassicyAppearanceLayout = {
	...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
	menu: { keys: "windows" },
	keyboard: { contextMenuKey: true },
	finder: { commands: "windows" },
};

/**
 * Registers `test-windows-keys` (no CSS, Platinum's default theme,
 * `TEST_WINDOWS_KEYS_LAYOUT` with `layout` spread over it, and the optional
 * package fields `extra`, such as `fileTypeNames`) and makes it the store's
 * active package. The returned function puts the previous package back and
 * unregisters it.
 */
export const activateTestWindowsKeysPackage = (
	layout: Partial<ClassicyAppearanceLayout> = {},
	extra: Pick<
		Partial<ClassicyAppearancePackage>,
		"fileTypeNames" | "apps"
	> = {},
): (() => void) => {
	const previous = useAppManager.getState().System.Manager.Appearance.packageId;
	const setPackageId = (packageId: string) =>
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Appearance.packageId = packageId;
				}),
			);
		});
	act(() => {
		registerClassicyAppearancePackage({
			id: TEST_WINDOWS_KEYS_PACKAGE_ID,
			name: "Windows keys",
			css: "",
			defaults: {
				...getTheme("default"),
				id: "test-windows-keys-default",
				package: TEST_WINDOWS_KEYS_PACKAGE_ID,
			},
			layout: { ...TEST_WINDOWS_KEYS_LAYOUT, ...layout },
			...extra,
		});
	});
	setPackageId(TEST_WINDOWS_KEYS_PACKAGE_ID);
	return () => {
		setPackageId(previous);
		act(() => {
			unregisterClassicyAppearancePackage(TEST_WINDOWS_KEYS_PACKAGE_ID);
		});
	};
};
