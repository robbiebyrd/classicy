// Windows `.theme` files, read into a theme of the Windows 98 package: the
// Appearance Manager's Load Theme… hands a file whose name ends in `.theme`
// to `readWindows98ThemeFile` while Windows 98 is the active package (the
// package's `themeFileImporter`), and validates the theme it returns as it
// validates a Classicy theme file's before adding it as a custom theme.
//
// A `.theme` file (Microsoft Plus! for Windows 95, Windows 98's Desktop
// Themes) is an INI file. Read here:
// - `[Control Panel\Colors]`: the system colors, `Name=R G B`, mapped onto
//   the theme as Windows 98's own schemes are (windows98.json). A color the
//   file lacks is Windows Standard's, except GradientActiveTitle and
//   GradientInactiveTitle, which a Plus! file never has: they take their
//   base color, so the caption is flat, as Windows 95 drew it.
// - `[Metrics]`: `NonclientMetrics` (a NONCLIENTMETRICS as decimal bytes:
//   border, scroll bar, caption, small caption and menu sizes, the caption,
//   small caption, menu and message fonts) and `IconMetrics` (an ICONMETRICS:
//   the icon spacing and font). Without them, Windows Standard's.
// - `[Control Panel\Desktop]`: the wallpaper, kept by its file name when a
//   package registers a wallpaper of that name (case aside), else none, and
//   whether it tiles (`TileWallpaper`) or stretches (`WallpaperStyle=2`).
// - `[Theme] DisplayName`, else the file's name, as the theme's name.
//
// Sounds, cursors, icons and screen savers in the file are not read.
import {
	type ClassicyAppearanceThemeImport,
	type ClassicyTheme,
	type ClassicyThemeFontFamily,
	listClassicyWallpapers,
} from "@classicy/classicy";
import windows98JsonSource from "./windows98.json";

/** An `R G B` color as a 24-bit integer, or `undefined`. */
const parseColor = (value: string | undefined): number | undefined => {
	if (value === undefined) return undefined;
	const parts = value.trim().split(/\s+/).map(Number);
	if (
		parts.length !== 3 ||
		parts.some((c) => !Number.isInteger(c) || c < 0 || c > 255)
	)
		return undefined;
	return (parts[0] << 16) | (parts[1] << 8) | parts[2];
};

/** The INI's sections, by lower-cased name, each its keys by lower-cased name. */
const parseIni = (text: string): Map<string, Map<string, string>> => {
	const sections = new Map<string, Map<string, string>>();
	let current: Map<string, string> | undefined;
	for (const raw of text.split(/\r?\n/)) {
		const line = raw.trim();
		if (!line || line.startsWith(";")) continue;
		const section = /^\[(.*)\]$/.exec(line);
		if (section) {
			const name = section[1].trim().toLowerCase();
			current = sections.get(name) ?? new Map();
			sections.set(name, current);
			continue;
		}
		const eq = line.indexOf("=");
		if (current && eq > 0)
			current.set(
				line.slice(0, eq).trim().toLowerCase(),
				line.slice(eq + 1).trim(),
			);
	}
	return sections;
};

type LogFont = { height: number; weight: number; face: string };

/** A LOGFONT at `offset` (ANSI: 60 bytes, a 32-byte face; wide: 92 bytes,
 * a 64-byte UTF-16 face). */
const readLogFont = (
	view: DataView,
	offset: number,
	wide: boolean,
): LogFont => {
	const height = view.getInt32(offset, true);
	const weight = view.getInt32(offset + 16, true);
	let face = "";
	if (wide) {
		for (let i = 0; i < 32; i++) {
			const code = view.getUint16(offset + 28 + i * 2, true);
			if (code === 0) break;
			face += String.fromCharCode(code);
		}
	} else {
		for (let i = 0; i < 32; i++) {
			const code = view.getUint8(offset + 28 + i);
			if (code === 0) break;
			face += String.fromCharCode(code);
		}
	}
	return { height, weight, face };
};

/** A `[Metrics]` value: decimal bytes separated by spaces. */
const parseBytes = (value: string | undefined): DataView | undefined => {
	if (!value) return undefined;
	const bytes = value.trim().split(/\s+/).map(Number);
	if (bytes.some((b) => !Number.isInteger(b) || b < 0 || b > 255))
		return undefined;
	return new DataView(Uint8Array.from(bytes).buffer);
};

type NonClientMetrics = {
	border: number;
	scroll: number;
	captionWidth: number;
	caption: number;
	smallCaption: number;
	menu: number;
	captionFont: LogFont;
	smallCaptionFont: LogFont;
	menuFont: LogFont;
	messageFont: LogFont;
};

/** NONCLIENTMETRICS: 340 bytes (ANSI), 500 or 504 (wide), told apart by
 * its length (a scheme blob's `cbSize` is not always set). */
const readNonClientMetrics = (
	view: DataView | undefined,
): NonClientMetrics | undefined => {
	if (!view || view.byteLength < 340) return undefined;
	const wide = view.byteLength >= 500;
	const font = wide ? 92 : 60;
	let at = 4;
	const border = view.getInt32(at, true);
	const scroll = view.getInt32(at + 4, true);
	const captionWidth = view.getInt32(at + 12, true);
	const caption = view.getInt32(at + 16, true);
	at += 20;
	const captionFont = readLogFont(view, at, wide);
	at += font;
	const smallCaption = view.getInt32(at + 4, true);
	at += 8;
	const smallCaptionFont = readLogFont(view, at, wide);
	at += font;
	const menu = view.getInt32(at + 4, true);
	at += 8;
	const menuFont = readLogFont(view, at, wide);
	at += font * 2; // the status font is not read
	const messageFont = readLogFont(view, at, wide);
	return {
		border,
		scroll,
		captionWidth,
		caption,
		smallCaption,
		menu,
		captionFont,
		smallCaptionFont,
		menuFont,
		messageFont,
	};
};

/** ICONMETRICS: 76 bytes (ANSI), 108 (wide), told apart by its length. */
const readIconMetrics = (
	view: DataView | undefined,
): { horizontal: number; vertical: number; font: LogFont } | undefined => {
	if (!view || view.byteLength < 76) return undefined;
	const wide = view.byteLength >= 108;
	return {
		horizontal: view.getInt32(4, true),
		vertical: view.getInt32(8, true),
		font: readLogFont(view, 16, wide),
	};
};

const MS_SANS_SERIF = `"MS Sans Serif", "Microsoft Sans Serif", Tahoma, Arial, sans-serif`;
const PIXEL_MS_SANS_SERIF = `"Pixelated MS Sans Serif", ${MS_SANS_SERIF}`;
// MS Sans Serif is a bitmap face (sserife.fon at 96 dpi): character heights
// 11, 13, 16, 18, 24 and 32 px. GDI draws a request between two of them in
// the smaller, and one below 11 px in the 11 px face; the pixel face is cut
// for 11 px, the 8-point face, and named only there.
const MS_SANS_SERIF_HEIGHTS = [11, 13, 16, 18, 24, 32];
// The stacks Windows 98's schemes' other faces take (windows98.json's).
const FACE_STACKS: Record<string, string> = {
	Arial: "Arial, Helvetica, sans-serif",
	"Times New Roman": `"Times New Roman", Times, serif`,
	"Small Fonts": `"Small Fonts", Arial, sans-serif`,
};
const FONT_SIZE_MIN = 8;
const FONT_SIZE_MAX = 72;
// The characters a theme's font stack may hold (the theme schema's).
const FONT_NAME = /^[\p{L}\p{N} '._-]+$/u;

const clamp = (n: number, min: number, max: number) =>
	Math.min(max, Math.max(min, n));

/** A LOGFONT as a package font: the face's stack, its size in px, its weight. */
export const windows98FontFamily = (lf: LogFont): ClassicyThemeFontFamily => {
	const height = Math.abs(lf.height) || 11;
	const weight = lf.weight >= 600 ? 700 : 400;
	if (lf.face === "MS Sans Serif" || !FONT_NAME.test(lf.face)) {
		const size =
			MS_SANS_SERIF_HEIGHTS.filter((h) => h <= height).at(-1) ??
			MS_SANS_SERIF_HEIGHTS[0];
		return {
			font: size === 11 ? PIXEL_MS_SANS_SERIF : MS_SANS_SERIF,
			size,
			weight,
		};
	}
	return {
		font: Object.hasOwn(FACE_STACKS, lf.face)
			? FACE_STACKS[lf.face]
			: `"${lf.face}", sans-serif`,
		size: clamp(height, FONT_SIZE_MIN, FONT_SIZE_MAX),
		weight,
	};
};

// Python's round(), half to even, as the shipped palettes were computed.
const roundEven = (x: number): number => {
	const floor = Math.floor(x);
	if (Math.abs(x - floor - 0.5) < 1e-9)
		return floor % 2 === 0 ? floor : floor + 1;
	return Math.round(x);
};
const channels = (c: number) => [(c >> 16) & 255, (c >> 8) & 255, c & 255];
const join = ([r, g, b]: number[]) => (r << 16) | (g << 8) | b;
const mid = (a: number, b: number) =>
	join(channels(a).map((c, i) => roundEven((c + channels(b)[i]) / 2)));
const tint = (c: number, k: number) =>
	join(channels(c).map((v) => roundEven(v + (255 - v) * k)));
const shade = (c: number, k: number) =>
	join(channels(c).map((v) => roundEven(v * k)));

/** The desktop labels' color: white over a dark desktop, black over a light
 * one (High Contrast White's). */
const labelText = (background: number): number => {
	const [r, g, b] = channels(background);
	return 0.299 * r + 0.587 * g + 0.114 * b > 186 ? 0x000000 : 0xffffff;
};

const COLOR_NAMES = [
	"Scrollbar",
	"Background",
	"ActiveTitle",
	"InactiveTitle",
	"Window",
	"WindowFrame",
	"WindowText",
	"TitleText",
	"ActiveBorder",
	"InactiveBorder",
	"Hilight",
	"HilightText",
	"ButtonFace",
	"ButtonShadow",
	"GrayText",
	"ButtonText",
	"InactiveTitleText",
	"ButtonHilight",
	"ButtonDkShadow",
	"ButtonLight",
	"InfoText",
	"InfoWindow",
	"GradientActiveTitle",
	"GradientInactiveTitle",
] as const;
type ColorName = (typeof COLOR_NAMES)[number];

/** Windows Standard's colors, read back from the package's defaults. */
const standardColors = (base: ClassicyTheme): Record<ColorName, number> => {
	const c = base.color;
	const f = c.families ?? {};
	return {
		Scrollbar: f.scrollBar?.track ?? c.system[2],
		Background: base.desktop.backgroundColor,
		ActiveTitle: f.titleBar?.active ?? c.highlight,
		InactiveTitle: f.titleBar?.inactive ?? c.system[4],
		Window: c.window.document,
		WindowFrame: c.window.border,
		WindowText: c.black,
		TitleText: f.titleBar?.text ?? c.window.title,
		ActiveBorder: f.sizingBorder?.active ?? c.system[2],
		InactiveBorder: f.sizingBorder?.inactive ?? c.system[2],
		Hilight: c.highlight,
		HilightText: f.selection?.text ?? c.white,
		ButtonFace: c.system[2],
		ButtonShadow: c.system[4],
		GrayText: f.text?.gray ?? c.system[4],
		ButtonText: f.text?.button ?? c.black,
		InactiveTitleText: f.titleBar?.inactiveText ?? c.system[2],
		ButtonHilight: c.system[0],
		ButtonDkShadow: c.system[6],
		ButtonLight: c.system[1],
		InfoText: f.tooltip?.text ?? c.black,
		InfoWindow: f.tooltip?.face ?? c.white,
		GradientActiveTitle: f.titleBar?.activeGradient ?? c.highlight,
		GradientInactiveTitle: f.titleBar?.inactiveGradient ?? c.system[4],
	};
};

/** The registered wallpaper `path` names, by its file name (case aside). */
const wallpaperFile = (path: string | undefined): string => {
	if (!path) return "";
	const name = path
		.split(/[\\/]/)
		.at(-1)
		?.replace(/^%[^%]*%/, "");
	if (!name) return "";
	const lower = name.toLowerCase();
	const match = listClassicyWallpapers("windows98").find(
		(entry) => entry.file?.toLowerCase() === lower,
	);
	return match?.file ?? "";
};

/**
 * Reads a Windows `.theme` file as a theme of the Windows 98 package (see
 * the module's head). The theme is validated by the caller
 * (`parseClassicyForeignThemeFile`); its id and name are made unique when it
 * is imported (`ClassicyDesktopImportTheme`).
 */
export const readWindows98ThemeFile = (
	text: string,
	fileName: string,
): ClassicyAppearanceThemeImport => {
	const ini = parseIni(text);
	const colorSection = ini.get("control panel\\colors");
	const metrics = ini.get("metrics");
	if (!colorSection && !metrics)
		return {
			ok: false,
			error:
				"This file is not a Windows theme: it has no [Control Panel\\Colors] or [Metrics] section.",
		};
	const base = structuredClone(
		windows98JsonSource.defaults,
	) as unknown as ClassicyTheme;
	const standard = standardColors(base);
	const read = (name: ColorName) =>
		parseColor(colorSection?.get(name.toLowerCase()));
	const c = Object.fromEntries(
		COLOR_NAMES.map((name) => [name, read(name) ?? standard[name]]),
	) as Record<ColorName, number>;
	// A Plus! file has no gradient: its base color, a flat caption.
	c.GradientActiveTitle = read("GradientActiveTitle") ?? c.ActiveTitle;
	c.GradientInactiveTitle = read("GradientInactiveTitle") ?? c.InactiveTitle;

	const hilight = c.Hilight;
	base.color = {
		...base.color,
		outline: c.WindowFrame,
		select: hilight,
		highlight: hilight,
		black: c.WindowText,
		window: {
			border: c.WindowFrame,
			borderOutset: c.ButtonHilight,
			borderInset: c.ButtonShadow,
			frame: c.ButtonFace,
			title: c.TitleText,
			document: c.Window,
		},
		system: [
			c.ButtonHilight,
			c.ButtonLight,
			c.ButtonFace,
			mid(c.ButtonFace, c.ButtonShadow),
			c.ButtonShadow,
			mid(c.ButtonShadow, c.ButtonDkShadow),
			c.ButtonDkShadow,
		],
		theme: [
			tint(hilight, 0.8),
			tint(hilight, 0.55),
			tint(hilight, 0.3),
			hilight,
			shade(hilight, 0.8),
			shade(hilight, 0.6),
			shade(hilight, 0.4),
		],
		families: {
			titleBar: {
				active: c.ActiveTitle,
				activeGradient: c.GradientActiveTitle,
				inactive: c.InactiveTitle,
				inactiveGradient: c.GradientInactiveTitle,
				text: c.TitleText,
				inactiveText: c.InactiveTitleText,
			},
			selection: { text: c.HilightText },
			tooltip: { face: c.InfoWindow, text: c.InfoText },
			desktop: { text: labelText(c.Background) },
			text: { button: c.ButtonText, gray: c.GrayText },
			scrollBar: { track: c.Scrollbar },
			sizingBorder: { active: c.ActiveBorder, inactive: c.InactiveBorder },
		},
	};

	const measurements = base.measurements as unknown as Record<
		string,
		Record<string, number>
	>;
	// Windows fills the track with the checker only where ButtonHilight is
	// Window; else with Scrollbar.
	measurements.scrollBar = {
		...measurements.scrollBar,
		solidTrack: c.ButtonHilight === c.Window ? 0 : 1,
	};
	const ncm = readNonClientMetrics(
		parseBytes(metrics?.get("nonclientmetrics")),
	);
	const families = { ...(base.typography.families ?? {}) };
	if (ncm) {
		const size = (n: number, min: number) => clamp(n, min, 512);
		measurements.window = {
			...measurements.window,
			scrollbarSize: size(ncm.scroll, 8),
			titleBarHeight: size(ncm.caption, 8),
			utilityTitleBarHeight: size(ncm.smallCaption, 8),
		};
		measurements.titleBar = {
			...measurements.titleBar,
			buttonWidth: size(ncm.captionWidth - 2, 6),
			buttonHeight: size(ncm.caption - 4, 4),
		};
		measurements.sizingBorder = { width: size(ncm.border, 1) };
		measurements.menuBar = { titleHeight: size(ncm.menu, 8) };
		families.caption = windows98FontFamily(ncm.captionFont);
		families.smallCaption = windows98FontFamily(ncm.smallCaptionFont);
		families.menu = windows98FontFamily(ncm.menuFont);
		families.message = windows98FontFamily(ncm.messageFont);
	}
	const icm = readIconMetrics(parseBytes(metrics?.get("iconmetrics")));
	if (icm) {
		const icon = windows98FontFamily(icm.font);
		families.icon = { font: icon.font, weight: icon.weight };
		base.desktop.iconFontSize = icon.size ?? base.desktop.iconFontSize;
		const gap = (spacing: number) =>
			clamp(spacing - base.desktop.iconSize, 0, 512);
		measurements.desktopIconGrid = {
			rowGap: gap(icm.vertical),
			columnGap: gap(icm.horizontal),
		};
	}
	base.typography = { ...base.typography, families };

	const desktop = ini.get("control panel\\desktop");
	const wallpaper = wallpaperFile(desktop?.get("wallpaper"));
	const tiled = desktop?.get("tilewallpaper") === "1";
	const stretched = desktop?.get("wallpaperstyle") === "2";
	base.desktop = {
		...base.desktop,
		backgroundColor: c.Background,
		backgroundImage: wallpaper,
		backgroundRepeat: tiled ? "repeat" : "no-repeat",
		backgroundPosition: tiled ? "top left" : "center",
		backgroundSize: stretched && !tiled ? "100% 100%" : "auto",
	};

	const displayName = ini.get("theme")?.get("displayname");
	const fromFile = fileName
		.replace(/\.theme$/i, "")
		.split(/[\\/]/)
		.at(-1);
	const name = (displayName || fromFile || "Windows Theme").slice(0, 64).trim();
	base.id = "windows98-theme-file";
	base.name = name || "Windows Theme";
	base.package = "windows98";
	return { ok: true, theme: base };
};
