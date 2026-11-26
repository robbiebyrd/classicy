import "@classicy/appearance-platinum";
import "@classicy/appearance-system7";
import { describe, expect, it } from "vitest";
import {
	getAllThemes,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

// Story 0225-ci7: Platinum draws its menu checks and the Notification
// Manager's diamond on the `menu.markPixel` grid (`--menu-mark-pixel`,
// review K1) and its checkbox's bevel and marks on the `checkbox.pixel` grid
// (`--checkbox-pixel`, fix round 3). `ChangeTheme` may draw a theme of
// another package under Platinum, so the core floor supplies both knobs:
// every theme emits them, and no package's theme leaves Platinum's art
// without a size.
describe("the marks' grid knobs", () => {
	it.each([
		"--menu-mark-pixel",
		"--checkbox-pixel",
	])("%s is emitted by every registered package's themes", (name) => {
		const themes = getAllThemes();
		expect(new Set(themes.map((t) => t.package))).toEqual(
			new Set(["platinum", "system7"]),
		);
		for (const theme of themes)
			expect(
				(getThemeVars(theme) as Record<string, unknown>)[name],
				`${theme.package}/${theme.id}`,
			).toBe("1px");
	});
});
