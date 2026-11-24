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
 * and every structural knob ("Structural: yes", AGENT-REFERENCE §8), the 114
 * knobs a base stylesheet (`classicy.base`), component code (the `zoomRects`
 * path and pace) or the SCSS vocabulary (`dither.tileSize`) reads, and those
 * Platinum's own partials read without a fallback: `ChangeTheme` may draw
 * any package's theme under Platinum, whose sheet then reads that theme's
 * variables (story 0225-ci7: the menu marks' grid, the checkbox's, the
 * slider, the menu frame, the scroll-bar grip, the windoid texture, the
 * Control Strip's bevel and the QuickTime caption's shadow; stories 0228-e9l
 * and 0230-n6c: the selection and zoom rectangles' pens and checkers). Only
 * Platinum's three optional knobs stay in its `platinum.json` alone: the two
 * `fileBrowserList` knobs, which the file browser reads with a fallback, and
 * `zoomRects.enabled`, the zoom rectangles' opt-in, a package's own (read
 * with a fallback of 0). Frozen all the way down.
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
			bevelWidth: 1,
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
		menuFrame: {
			borderWidth: 1,
			bevelWidth: 1,
			shadowWidth: 1,
			shadowStart: 1,
			shadowGap: 0,
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
		scrollbar: { thumbGripWidth: 7, thumbGripHeight: 8 },
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
		// `markPixel`: the grid of Platinum's menu marks (_marks.scss), on
		// the floor so a theme of another package drawn under Platinum still
		// draws its checks and diamond (story 0225-ci7, review K1).
		menu: { popUpMaxHeight: 300, markPixel: 1 },
		table: { resizerWidth: 15 },
		stripMenu: { overlap: 3 },
		// `pixel`: the grid of Platinum's checkbox marks (_marks.scss; the
		// box's bevel follows the window metrics), on the floor for the same
		// reason (story 0225-ci7, fix round 3).
		checkbox: { pixel: 1 },
		// Platinum's own partials' knobs (_Window.scss, _QuickTimeMovieEmbed
		// .scss, _Slider.scss), on the floor for the same reason: a theme of
		// another package drawn under Platinum emitted none of them, and its
		// slider lost its art (story 0225-ci7).
		utilityTitleBar: { textureWidth: 4, textureHeight: 3 },
		quickTime: { captionShadowBlur: 3 },
		slider: {
			pixel: 1,
			channel: 7,
			thumbAlong: 15,
			thumbAcross: 17,
			thumbRise: 3,
			tickWidth: 3,
			tickHeight: 8,
		},
		// The dither vocabulary's switch (`_dither.scss`): 0 is plain ink.
		dither: { tileSize: 0 },
		// The selection rectangle's pen and checker, Platinum's
		// (_SelectionMarquee.scss), on the floor for 0225-ci7's reason: a
		// theme of another package drawn under Platinum still draws it
		// (story 0228-e9l).
		selectionMarquee: { width: 2, tileSize: 2 },
		// The zoom rectangles' path and pace (ClassicyZoomRects.ts): Mac OS
		// 8.1's, the six steps nearest the window of an 11-step path, each
		// 1.4 times the last, one a tick, all kept to the end; and their pen
		// and checker, Platinum's (_ZoomRects.scss), for the same reason as
		// the selection rectangle's. Not `enabled`: a package opts in with
		// its own knob (read with a fallback of 0), as it must also draw the
		// rectangles (story 0230-n6c).
		zoomRects: {
			steps: 11,
			growthPercent: 140,
			firstStep: 5,
			trail: 0,
			rate: 60,
			width: 2,
			tileSize: 2,
		},
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
