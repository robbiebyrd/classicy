import { describe, expect, it } from "vitest";
import { registerClassicyWallpapers } from "@/Appearance/ClassicyAssetRegistry";
import { readClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeFile";
import { ClassicyThemeSchema } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeSchema";
import windows98Json from "./windows98.json";
import { readWindows98ThemeFile } from "./windows98ThemeFile";

// The 98.js report's 2.10: a Windows `.theme` file read into a custom theme
// of the Windows 98 package. The fixture is Windows 98 SE's own Rose (large)
// scheme (SHELL2.INF), written out as a Plus! file writes one: its
// [Control Panel\Colors] without the two gradients (no Plus! file has
// them), its NONCLIENTMETRICS and an ICONMETRICS as decimal bytes.

const NONCLIENT_METRICS =
	"84 1 0 0 2 0 0 0 17 0 0 0 17 0 0 0 28 0 0 0 28 0 0 0 233 255 255 255 0 0 0 0 0 0 0 0 0 0 0 0 144 1 0 0 0 0 0 0 0 0 0 0 84 105 109 101 115 32 78 101 119 32 82 111 109 97 110 0 0 0 72 126 0 0 48 126 99 0 0 0 0 0 1 0 21 0 0 0 21 0 0 0 240 255 255 255 0 0 0 0 0 0 0 0 0 0 0 0 188 2 0 0 0 0 0 0 0 0 0 0 84 105 109 101 115 32 78 101 119 32 82 111 109 97 110 0 0 0 72 126 0 0 48 126 99 0 0 0 0 0 1 0 22 0 0 0 22 0 0 0 239 255 255 255 0 0 0 0 0 0 0 0 0 0 0 0 144 1 0 0 0 0 0 0 0 0 0 0 77 83 32 83 97 110 115 32 83 101 114 105 102 0 110 0 0 0 72 126 0 0 48 126 99 0 0 0 0 0 1 0 240 255 255 255 0 0 0 0 0 0 0 0 0 0 0 0 144 1 0 0 0 0 0 0 0 0 0 0 77 83 32 83 97 110 115 32 83 101 114 105 102 0 110 0 0 0 72 126 0 0 48 126 99 0 0 0 0 0 1 0 239 255 255 255 0 0 0 0 0 0 0 0 0 0 0 0 144 1 0 0 0 0 0 0 0 0 0 0 77 83 32 83 97 110 115 32 83 101 114 105 102 0 110 0 0 0 72 126 0 0 48 126 99 0 0 0 0 0 1 0";
const ICON_METRICS =
	"76 0 0 0 75 0 0 0 75 0 0 0 1 0 0 0 239 255 255 255 0 0 0 0 0 0 0 0 0 0 0 0 144 1 0 0 0 0 0 0 0 0 0 0 77 83 32 83 97 110 115 32 83 101 114 105 102 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0";

const ROSE_LARGE = [
	"; A Windows 98 theme",
	"[Control Panel\\Colors]",
	"Scrollbar=192 192 192",
	"Background=128 128 128",
	"ActiveTitle=160 96 112",
	"InactiveTitle=160 160 164",
	"Menu=208 176 184",
	"Window=255 255 255",
	"WindowFrame=0 0 0",
	"MenuText=0 0 0",
	"WindowText=0 0 0",
	"TitleText=255 255 255",
	"ActiveBorder=208 176 184",
	"InactiveBorder=208 176 184",
	"AppWorkspace=232 216 224",
	"Hilight=160 96 112",
	"HilightText=255 255 255",
	"ButtonFace=208 176 184",
	"ButtonShadow=160 96 112",
	"GrayText=160 96 112",
	"ButtonText=0 0 0",
	"InactiveTitleText=96 96 104",
	"ButtonHilight=232 216 224",
	"ButtonDkShadow=0 0 0",
	"ButtonLight=208 176 184",
	"InfoText=0 0 0",
	"InfoWindow=255 255 255",
	"",
	"[Metrics]",
	`NonclientMetrics=${NONCLIENT_METRICS}`,
	`IconMetrics=${ICON_METRICS}`,
	"",
	"[Control Panel\\Desktop]",
	"Wallpaper=%WinDir%\\ROSE.BMP",
	"TileWallpaper=0",
	"WallpaperStyle=2",
].join("\r\n");

const read = (text = ROSE_LARGE, name = "Rose Large.theme") => {
	const result = readWindows98ThemeFile(text, name);
	if (!result.ok) throw new Error(result.error);
	return result.theme as typeof windows98Json.defaults;
};

describe("readWindows98ThemeFile", () => {
	it("reads the colors onto the palette and the package colors, as Windows 98's schemes are", () => {
		const theme = read();
		expect(theme.package).toBe("windows98");
		expect(theme.name).toBe("Rose Large");
		expect(theme.color.system).toEqual([
			0xe8d8e0, 0xd0b0b8, 0xd0b0b8, 0xb88894, 0xa06070, 0x503038, 0x000000,
		]);
		expect(theme.color.highlight).toBe(0xa06070);
		expect(theme.color.window.document).toBe(0xffffff);
		expect(theme.desktop.backgroundColor).toBe(0x808080);
		expect(theme.color.families.titleBar).toEqual({
			active: 0xa06070,
			// No gradient in the file: the base color, a flat caption.
			activeGradient: 0xa06070,
			inactive: 0xa0a0a4,
			inactiveGradient: 0xa0a0a4,
			text: 0xffffff,
			inactiveText: 0x606068,
		});
		expect(theme.color.families.scrollBar).toEqual({ track: 0xc0c0c0 });
		expect(theme.color.families.text).toEqual({ button: 0, gray: 0xa06070 });
		// ButtonHilight is not Window: the solid Scrollbar track.
		expect(theme.measurements.scrollBar.solidTrack).toBe(1);
	});

	it("reads the metrics and the fonts from NONCLIENTMETRICS and ICONMETRICS", () => {
		const theme = read();
		expect(theme.measurements.window).toMatchObject({
			scrollbarSize: 17,
			titleBarHeight: 28,
			utilityTitleBarHeight: 21,
		});
		expect(theme.measurements.titleBar).toMatchObject({
			buttonWidth: 26,
			buttonHeight: 24,
		});
		expect(theme.measurements.sizingBorder).toEqual({ width: 2 });
		expect(theme.measurements.menuBar).toEqual({ titleHeight: 22 });
		expect(theme.typography.families).toEqual({
			caption: {
				font: '"Times New Roman", Times, serif',
				size: 23,
				weight: 400,
			},
			smallCaption: {
				font: '"Times New Roman", Times, serif',
				size: 16,
				weight: 700,
			},
			menu: {
				font: '"MS Sans Serif", "Microsoft Sans Serif", Tahoma, Arial, sans-serif',
				size: 16,
				weight: 400,
			},
			message: {
				font: '"MS Sans Serif", "Microsoft Sans Serif", Tahoma, Arial, sans-serif',
				size: 16,
				weight: 400,
			},
			icon: {
				font: '"MS Sans Serif", "Microsoft Sans Serif", Tahoma, Arial, sans-serif',
				weight: 400,
			},
		});
		expect(theme.desktop.iconFontSize).toBe(16);
		expect(theme.measurements.desktopIconGrid).toEqual({
			rowGap: 43,
			columnGap: 43,
		});
	});

	// The scheme it was made from: SHELL2.INF's own Rose (large) preset.
	it("matches the preset Windows 98 ships for the same scheme, the gradient aside", () => {
		const theme = read();
		const preset = windows98Json.presets.find(
			(p) => p.id === "windows98RoseLarge",
		);
		expect(theme.color.system).toEqual(preset?.color.system);
		expect(theme.typography.families).toEqual(preset?.typography.families);
		expect(theme.measurements.window).toEqual(preset?.measurements.window);
	});

	it("is a valid Classicy theme, as the Appearance Manager validates it", async () => {
		await import("./index");
		const parsed = readClassicyTheme(read());
		expect(parsed.ok).toBe(true);
		expect(ClassicyThemeSchema.safeParse(read()).success).toBe(true);
	});

	describe("the wallpaper", () => {
		// The registration below is the file's last use of the wallpapers: the
		// registry outlives a test.
		it("is none when no package registers the file, and stretched as WallpaperStyle 2 asks", () => {
			const theme = read();
			expect(theme.desktop.backgroundImage).toBe("");
			expect(theme.desktop.backgroundSize).toBe("100% 100%");
			expect(theme.desktop.backgroundRepeat).toBe("no-repeat");
		});

		it("keeps a registered wallpaper by its file name, case aside, and tiles when asked", async () => {
			await import("./index");
			registerClassicyWallpapers("windows98", [
				{ name: "Rose", src: "data:image/png;base64,AAAA", file: "rose.bmp" },
			]);
			const theme = read(
				ROSE_LARGE.replace("TileWallpaper=0", "TileWallpaper=1"),
			);
			expect(theme.desktop.backgroundImage).toBe("rose.bmp");
			expect(theme.desktop.backgroundRepeat).toBe("repeat");
		});
	});

	it("takes the display name a [Theme] section gives, and Windows Standard's values for what the file lacks", () => {
		const theme = read(
			"[Theme]\nDisplayName=Jungle\n[Control Panel\\Colors]\nHilight=0 128 0",
			"x.theme",
		);
		expect(theme.name).toBe("Jungle");
		expect(theme.color.highlight).toBe(0x008000);
		expect(theme.color.system).toEqual(windows98Json.defaults.color.system);
		expect(theme.measurements.window).toEqual(
			windows98Json.defaults.measurements.window,
		);
		expect(theme.typography.families).toEqual(
			windows98Json.defaults.typography.families,
		);
	});

	it("refuses a file with neither a colors nor a metrics section", () => {
		expect(readWindows98ThemeFile("[Sounds]\nx=y", "a.theme")).toEqual({
			ok: false,
			error:
				"This file is not a Windows theme: it has no [Control Panel\\Colors] or [Metrics] section.",
		});
	});

	it("ignores a malformed color or metrics value", () => {
		const theme = read(
			"[Control Panel\\Colors]\nHilight=300 0 0\nWindow=1 2\n[Metrics]\nNonclientMetrics=1 2 x",
			"bad.theme",
		);
		expect(theme.color.highlight).toBe(windows98Json.defaults.color.highlight);
		expect(theme.color.window.document).toBe(0xffffff);
		expect(theme.measurements.window).toEqual(
			windows98Json.defaults.measurements.window,
		);
	});
});
