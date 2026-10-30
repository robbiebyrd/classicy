import {
	type ClassicyAppIdentityOverride,
	registerClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

/**
 * Registers a fixture Appearance Package `id`, with no CSS and Platinum's
 * layout, whose `apps` is `apps`: for a test that renames apps of its own
 * choosing. Tests that call it unregister `id` afterwards
 * (`unregisterClassicyAppearancePackage`).
 */
export const registerTestAppsPackage = (
	id: string,
	apps: Record<string, ClassicyAppIdentityOverride>,
): void => {
	registerClassicyAppearancePackage({
		id,
		name: id,
		css: "",
		defaults: { ...getTheme("default"), id: `${id}-default`, package: id },
		layout: CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
		apps,
	});
};
