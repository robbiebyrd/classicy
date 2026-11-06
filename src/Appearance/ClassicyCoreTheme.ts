import { CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID } from "@/Appearance/ClassicyAppearanceDefaults";
import type {
	ClassicyTheme,
	ClassicyThemeMeasurements,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

// The core theme floor (H-R13): what the core itself guarantees every theme
// of every package, so it never reads an Appearance Package's data to render
// a structure. Plain data, copied from Platinum's `defaults` (its values, so
// Platinum renders as it always has) and never read from it: the core holds
// no import of Platinum (`@classicy/appearance-platinum`).
// ClassicyCoreTheme.test.ts pins every value to platinum.json and the knob
// set to AGENT-REFERENCE §8's table.

/** `value` frozen, and every object and array inside it. */
const deepFreeze = <T>(value: T): Readonly<T> => {
	if (value && typeof value === "object") {
		for (const inner of Object.values(value)) deepFreeze(inner);
		Object.freeze(value);
	}
	return value;
};

/**
 * The measurements every theme is completed with, whatever its package
 * (`classicyThemeMeasurementDefaults` merges the registered package's own
 * values over these): the core five families (`CLASSICY_DEFAULT_THEME_METRICS`)
 * and every structural knob, the 84 knobs a base stylesheet (`classicy.base`)
 * or component code reads ("Structural: yes", AGENT-REFERENCE §8). The 11
 * look-only knobs, read only by Platinum's own partials, are Platinum's and
 * stay in its `platinum.json`. Frozen all the way down.
 */
export const CLASSICY_CORE_MEASUREMENT_DEFAULTS: Readonly<ClassicyThemeMeasurements> =
	deepFreeze({
		window: {
			borderSize: 1,
			controlSize: 12,
			paddingSize: 6,
			scrollbarSize: 17,
			titleBarHeight: 19,
			utilityTitleBarHeight: 10,
		},
		control: { height: 20, labelGap: 5, staticTextHeight: 16 },
		button: { minWidth: 58, textPadding: 8, gap: 12 },
		groupBox: {
			marginSide: 10,
			marginTop: 12,
			marginBottom: 10,
			titlePad: 3,
			gap: 12,
		},
		layout: { itemGap: 4, groupGap: 16, dialogEdge: 12 },
		controlStrip: {
			cellHeight: 22,
			narrowCellWidth: 13,
			moduleWidth: 30,
			borderWidth: 1,
			pressedShift: 1,
			collapseGlyphLeft: 2,
			collapseGlyphTop: 7,
			scrollGlyphLeft: 2,
			scrollGlyphTop: 6,
			moduleIconLeft: 2,
			moduleIconTop: 3,
			moduleArrowLeft: 22,
			moduleArrowTop: 7,
		},
		pager: {
			borderWidth: 1,
			arrowWidth: 42,
			cellHeight: 36,
			glyphHalfHeight: 8,
			glyphDepth: 11,
			punchHalfHeight: 5,
			punchDepth: 7,
			pageMinWidth: 32,
			pageTopBorder: 2,
			fontSize: 12,
		},
		balloonHelp: {
			cornerRadius: 8,
			minWidth: 80,
			maxWidth: 220,
			titleGap: 3,
			tailOffset: 12,
			tailInset: 8,
		},
		popUpSlider: {
			width: 17,
			height: 73,
			trackLeft: 4,
			trackTop: 3,
			thumbLeft: 1,
		},
		hyperCard: {
			fontSize: 11,
			handleSize: 6,
			paletteMaxWidth: 220,
			indent: 12,
		},
		finder: {
			padding: 8,
			aboutBannerWidth: 260,
			aboutBannerHeight: 120,
			aboutBannerShadowOffset: 4,
			aboutBannerShadowBlur: 6,
			aboutRowGap: 12,
			aboutIconSize: 56,
			aboutLabelWidth: 80,
			aboutValueWidth: 60,
		},
		appleGuide: {
			headerHeight: 42,
			headerPaddingX: 12,
			headerFontSize: 13,
			bodyFontSize: 14,
			bodyPaddingY: 12,
			bodyPaddingX: 20,
			paragraphGap: 12,
			listIndent: 18,
			listItemGap: 2,
			footerHeight: 48,
			footerPaddingX: 10,
		},
		picker: {
			wheelMax: 240,
			labelOverhang: 14,
			modeListWidth: 90,
			itemPaddingY: 3,
			crayonHoverLift: 8,
			crayonSelectedLift: 5,
			boxLipHeight: 22,
			fieldWidth: 44,
			unitWidth: 14,
		},
		dialog: {
			alertMinWidth: 280,
			alertMaxWidth: 460,
			alertLabelOffset: 1,
			inputMinWidth: 300,
			inputMaxWidth: 460,
			keyboardEquivalentMinWidth: 300,
			keyboardEquivalentMaxWidth: 420,
			fileDialogMinHeight: 220,
		},
		formControl: { fileInputHiddenSize: 1 },
		controlPanel: { listMaxHeight: 180, colorsScrollMaxHeight: 210 },
		progressBar: { stripeWidth: 10 },
		boot: { halftoneTile: 4 },
		helpButton: { glyphSize: 14 },
		menu: { popUpMaxHeight: 300 },
		table: { resizerWidth: 15 },
		stripMenu: { overlap: 3 },
	});

/**
 * The theme the core starts from and falls back to while no Appearance
 * Package is registered: Platinum's `defaults` (id `"default"`, package
 * `"platinum"`, the same palette, typography and desktop values) with no
 * wallpaper (`desktop.backgroundImage: ""`, the wallpapers being a package's
 * files) and `CLASSICY_CORE_MEASUREMENT_DEFAULTS` as its measurements. It is
 * the store's initial active theme and `CLASSICY_FALLBACK_APPEARANCE_PACKAGE`'s
 * defaults; a built-in of the package it names, so that package's registration
 * replaces it with its own `default` theme. Frozen all the way down.
 */
export const CLASSICY_CORE_DEFAULT_THEME: Readonly<ClassicyTheme> = deepFreeze({
	id: "default",
	name: "Default",
	package: CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
	color: {
		outline: 0x6666cc,
		select: 0xdddddd,
		highlight: 0xaaaaaa,
		window: {
			border: 0x000000,
			borderOutset: 0xffffff,
			borderInset: 0xcccccc,
			frame: 0xcccccc,
			title: 0x000000,
			document: 0xffffff,
		},
		black: 0x000000,
		white: 0xffffff,
		alert: 0xffff00,
		error: 0xff0000,
		system: [
			0xeeeeee, 0xdddddd, 0xcccccc, 0xaaaaaa, 0x808080, 0x393939, 0x202020,
		],
		theme: [
			0xeeeeee, 0xccccff, 0x9999ff, 0x6666cc, 0x333399, 0x000088, 0x000055,
		],
	},
	sound: { pack: "platinum", disabled: [] },
	typography: {
		ui: '"Charcoal", "ChicagoFLF", "Geneva", sans-serif',
		uiSize: 14,
		header: '"AppleGaramond", serif',
		headerSize: 22,
		body: '"Geneva", serif',
		bodySize: 14,
		mono: "Monaco",
		monoSize: 14,
		digital: "VCR OSD Mono",
		digitalSize: 14,
	},
	measurements: CLASSICY_CORE_MEASUREMENT_DEFAULTS,
	desktop: {
		iconSize: 48,
		iconFontSize: 12,
		backgroundImage: "",
		backgroundColor: 0x6666cc,
		backgroundRepeat: "repeat",
		backgroundPosition: "center",
		backgroundSize: "auto",
	},
});
