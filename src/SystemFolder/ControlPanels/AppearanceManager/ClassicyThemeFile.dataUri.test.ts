import { describe, expect, it, vi } from "vitest";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	exportClassicyTheme,
	parseClassicyThemeFile,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";

// A library build inlines wallpapers as data: URIs. Simulate one: the
// wallpaper module resolves names to data: URIs, and every consumer (schema,
// export, import) must map those back to the portable filename. (vi.mock is
// hoisted above the imports, hence vi.hoisted.)
const { AZUL } = vi.hoisted(() => ({
	AZUL: "data:image/png;base64,QVpVTA==",
}));
vi.mock(
	"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers")
			>();
		const index = actual.buildClassicyWallpaperIndex({
			"wallpapers/azul_dark.png": AZUL,
		});
		return {
			...actual,
			classicyWallpaperFilename: (value: string) => index.get(value),
			resolveWallpaper: (value: string) =>
				value === "azul_dark.png" ? AZUL : actual.resolveWallpaper(value),
		};
	},
);

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

	it("imports the filename back as this build's data: URI", () => {
		const result = parseClassicyThemeFile(
			exportClassicyTheme(azulWithDataUri()),
		);
		expect(result.ok && result.theme.desktop.backgroundImage).toBe(AZUL);
	});

	it("accepts the bundled data: URI itself in a bare theme", () => {
		const result = parseClassicyThemeFile(JSON.stringify(azulWithDataUri()));
		expect(result.ok && result.theme.desktop.backgroundImage).toBe(AZUL);
	});

	it("still rejects any other data: URI", () => {
		const theme = azulWithDataUri();
		theme.desktop.backgroundImage = "data:image/png;base64,T1RIRVI=";
		const result = parseClassicyThemeFile(JSON.stringify(theme));
		expect(result.ok).toBe(false);
	});
});
