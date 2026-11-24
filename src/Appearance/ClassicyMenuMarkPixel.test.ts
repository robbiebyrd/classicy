import "@classicy/appearance-platinum";
import "@classicy/appearance-system7";
import { describe, expect, it } from "vitest";
import {
	getAllThemes,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

// Story 0225-ci7, review K1: Platinum draws its menu checks and the
// Notification Manager's diamond on the `menu.markPixel` grid
// (`--menu-mark-pixel`). `ChangeTheme` may draw a theme of another package
// under Platinum, so the core floor supplies the knob: every theme emits it,
// and no package's theme leaves Platinum's marks without a size.
describe("--menu-mark-pixel", () => {
	it("is emitted by every registered package's themes", () => {
		const themes = getAllThemes();
		expect(new Set(themes.map((t) => t.package))).toEqual(
			new Set(["platinum", "system7"]),
		);
		for (const theme of themes)
			expect(
				(getThemeVars(theme) as Record<string, unknown>)["--menu-mark-pixel"],
				`${theme.package}/${theme.id}`,
			).toBe("1px");
	});
});
