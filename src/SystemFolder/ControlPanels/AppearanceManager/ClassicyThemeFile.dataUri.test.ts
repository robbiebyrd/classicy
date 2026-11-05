import { beforeEach, describe, expect, it } from "vitest";
// Registers Platinum's sound pack, which the Platinum themes used here name
// (`sound.pack` must name a registered pack).
import "@/Appearance/Platinum/assets/sounds/platinum";
// A Platinum theme file reads only while Platinum is registered.
import "@/Appearance/Platinum";
import { registerClassicyWallpapers } from "@/Appearance/ClassicyAssetRegistry";
import {
	type ClassicyTheme,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	exportClassicyTheme,
	parseClassicyThemeFile,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";

// A library build inlines wallpapers as data: URIs. Simulate one: Platinum's
// "Azul Dark" registered with a data: URI source. Every consumer (schema,
// export, import) must map it back to the portable filename.
const AZUL = "data:image/png;base64,QVpVTA==";

beforeEach(() => {
	registerClassicyWallpapers("platinum", [
		{ name: "Azul Dark", file: "azul_dark.png", src: AZUL },
	]);
});

const azulWithDataUri = (): ClassicyTheme => {
	const theme = structuredClone(getTheme("azul"));
	theme.desktop.backgroundImage = AZUL;
	return theme;
};

describe("theme files in a build that inlines wallpapers as data: URIs", () => {
	it("exports the inlined wallpaper as its filename", () => {
		const file = JSON.parse(exportClassicyTheme(azulWithDataUri()));
		expect(file.theme.desktop.backgroundImage).toBe("azul_dark.png");
	});

	it("imports the filename back as the filename, which renders this build's data: URI", () => {
		const result = parseClassicyThemeFile(
			exportClassicyTheme(azulWithDataUri()),
		);
		expect(result.ok && result.theme.desktop.backgroundImage).toBe(
			"azul_dark.png",
		);
		expect(
			result.ok && getThemeVars(result.theme)["--desktop-background-image"],
		).toBe(`url("${AZUL}")`);
	});

	it("accepts the bundled data: URI itself in a bare theme, storing its filename", () => {
		const result = parseClassicyThemeFile(JSON.stringify(azulWithDataUri()));
		expect(result.ok && result.theme.desktop.backgroundImage).toBe(
			"azul_dark.png",
		);
	});

	it("still rejects any other data: URI", () => {
		const theme = azulWithDataUri();
		theme.desktop.backgroundImage = "data:image/png;base64,T1RIRVI=";
		const result = parseClassicyThemeFile(JSON.stringify(theme));
		expect(result.ok).toBe(false);
	});
});
