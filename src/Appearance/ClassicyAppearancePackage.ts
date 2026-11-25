import type { CSSProperties } from "react";
import { useSyncExternalStore } from "react";
import type { z } from "zod";
import type {
	ClassicyAssetKind,
	ClassicyAssetTree,
} from "@/Appearance/ClassicyAssetRegistry";
import type { ClassicyAssetSource } from "@/Appearance/ClassicyAssetSource";
import type { ClassicyIconDimming } from "@/Appearance/ClassicyIconDimming";
import type {
	ClassicyComponentName,
	ClassicyState,
} from "@/Appearance/vocabulary/ClassicyVocabulary";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { ClassicySoundPack } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import type {
	ClassicyPatternOrigin,
	ClassicyPatternOriginComponent,
	ClassicyPatternOriginElements,
} from "./ClassicyAppearanceDefaults";
import {
	CLASSICY_FALLBACK_APPEARANCE_PACKAGE,
	getRegisteredClassicyAppearancePackageOrDefault,
	listClassicyAppearancePackages,
	subscribeClassicyAppearancePackages,
} from "./ClassicyAppearancePackageRegistry";

export {
	CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID,
	CLASSICY_PATTERN_ORIGIN_COMPONENTS,
	type ClassicyPatternOrigin,
	type ClassicyPatternOriginComponent,
	type ClassicyPatternOriginElements,
} from "./ClassicyAppearanceDefaults";
export {
	CLASSICY_FALLBACK_APPEARANCE_PACKAGE,
	getClassicyAppearancePackage,
	getRegisteredClassicyAppearancePackageOrDefault,
	listClassicyAppearancePackages,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
	subscribeClassicyAppearancePackages,
	unregisterClassicyAppearancePackage,
} from "./ClassicyAppearancePackageRegistry";

/**
 * Where a package puts the pieces whose position differs between systems.
 * Read through `useClassicyAppearanceLayout` (useClassicyAppearanceLayout.ts).
 */
export type ClassicyAppearanceLayout = {
	window: {
		growBoxCorner: "bottom-right" | "bottom-left" | "top-right" | "top-left";
		/**
		 * Where a window opened at a symbolic `"center"` position lands.
		 * Optional. `"exact"` (the default, Mac OS 8): at exactly half the free
		 * space, on a half pixel when that space is odd. `"wholePixel"`
		 * (System 7): rounded to a whole pixel, so a centered alert or dialog
		 * draws its one-pixel lines and text crisp in every engine.
		 */
		centering?: "exact" | "wholePixel";
		/**
		 * What the collapse box does (and Option-click collapse-all, and a
		 * `ClassicyWindowCollapse` dispatch). Optional. `"shade"` (the default,
		 * Mac OS 8's WindowShade): the window rolls up into its title bar.
		 * `"minimize"` (Windows 95/98, WIG Ch.6 "Minimizing Windows", p.85): the
		 * window leaves the screen and keeps its taskbar button, focus passes to
		 * the next window, and activating the window again (its taskbar button,
		 * its app) restores it, maximized if it was. It is the store's
		 * `collapsed` flag either way, so a window minimized under one package
		 * is shaded under another. A modal or utility window has no taskbar
		 * button, so it is never minimized (a stored `collapsed` is drawn
		 * expanded), and an app's palettes are hidden while every one of its
		 * open document windows is minimized (WIG Ch.8, p.145). Requires
		 * `taskbar`: the schema refuses `"minimize"` without one, since a
		 * minimized window comes back only through its taskbar button.
		 */
		collapse?: "shade" | "minimize";
		/**
		 * What the zoom box does. Optional. `"standard"` (the default, Mac OS
		 * 8): it toggles the window between the size the user gave it and its
		 * standard state, the content's ideal size within the desktop less
		 * `--window-zoom-margin` (`zoomMode`, `idealSize`). `"maximize"`
		 * (Windows 95/98, WIG Ch.6 "Maximizing Windows" and "Restoring
		 * Windows", pp.84–85): it fills the desktop less the menu bar's band and
		 * the taskbar's, with the frame just outside that area, so the caption
		 * meets the screen's top and sides. While maximized the window neither
		 * moves nor sizes, and the zoom box, now Restore, returns it to the rect
		 * it had, which is stored (`restoreRect`) so a reload restores it too.
		 * `zoomMode` and `idealSize` are ignored: Windows has one maximized
		 * state.
		 */
		zoom?: "standard" | "maximize";
		/**
		 * What a double-click on the title bar's caption does. Optional.
		 * `"collapse"` (the default, Mac OS 8): it collapses the window while
		 * the desktop's `doubleClickTitleToCollapse` preference is on, and does
		 * nothing otherwise. `"zoom"` (Windows 95/98 as shipped, Wine's
		 * `NC_HandleNCLButtonDblClk`): it maximizes or restores a zoomable
		 * window whatever the preference says (the preference stays stored and
		 * applies again under another package); on a window that cannot zoom,
		 * or a modal's caption, it does nothing, never falling back to a
		 * collapse.
		 */
		titleDoubleClick?: "collapse" | "zoom";
		/**
		 * What the four frame edges do. Optional. `"move"` (the default, Mac OS
		 * 8, whose frame is a drag region): dragging an edge moves the window.
		 * `"resize"` (Windows 95/98, WIG Ch.6 "Sizing Borders", p.83): dragging
		 * an edge sizes a resizable window from that edge, and eight corner
		 * arms, each reaching a title bar's height past the inside of the frame
		 * along its edge (Wine's `NC_HandleNCHitTest`: `SM_CXSIZE` past
		 * `SM_CXFRAME`), size both edges of their corner; the window's root
		 * carries `classicyWindowSizingBorder`. A non-resizable or maximized
		 * window's edges do nothing, as a fixed border neither moves nor sizes
		 * a window in Windows.
		 */
		frameEdges?: "move" | "resize";
		/**
		 * Whether windows have the window pop-up (system) menu. Optional.
		 * `false` (the default): none, so a right-click on the title bar shows
		 * the window's or its app's `contextMenu`, as anywhere in the window,
		 * and the title bar's icon is inert. `true` (Windows 95/98, WIG Ch.6
		 * "Title Bars", "Title Bar Icons" and "Title Bar Buttons", pp.76–80;
		 * Ch.7 "The Window Pop-up Menu", p.102; Ch.8, pp.145 and 164): the menu
		 * opens on a right-click anywhere in the title bar, a press on its icon,
		 * ALT+SPACE and a right-click on the window's taskbar button. It holds
		 * Restore, Move, Size, Minimize, Maximize and Close for a document
		 * window, Move and Close for a modal, Move, Size and Close for a
		 * palette, each enabled as Windows enables it (Wine's
		 * `MENU_InitSysMenuPopup`), Close the default. A double-click on the
		 * icon and ALT+F4 close the window, and the menu's Move and Size move
		 * and size it with the arrow keys and ENTER, ESC putting it back.
		 */
		systemMenu?: boolean;
		/**
		 * Whether each title-bar box names itself in a tooltip. Optional.
		 * `false` (the default): none. `true` (Windows 98 as shipped; Windows
		 * 95 had none, and the 1995 guidelines say nothing): a caption button
		 * shows its label ("Minimize", "Maximize" or "Restore", "Close") once
		 * the pointer has rested on it for 500 ms, whether or not balloon help
		 * is on.
		 */
		captionTooltips?: boolean;
	};
	menuBar: { placement: "screen" | "window" };
	desktop: {
		iconGridOrigin: "top-right" | "top-left" | "bottom-right" | "bottom-left";
	};
	/**
	 * How the scroll bars behave (`ClassicyScrollArea`). Optional, as is each
	 * key: a package that leaves one out keeps Mac OS 8's behavior.
	 */
	scrollBar?: {
		/**
		 * `"live"` (the default, Mac OS 8): dragging the thumb scrolls the
		 * content as it goes. `"onRelease"` (System 7, HIG p.165): the thumb
		 * stays put while a drag outline (`data-classicy-part`
		 * `scroll-drag-outline`) follows the pointer, and the content scrolls
		 * when the button comes up; a pointer more than the theme's
		 * `--scroll-bar-snap-back` (else the bar's thickness, "the width of
		 * the scroll box") from the bar snaps the outline back over the thumb,
		 * and a release there scrolls nothing. Escape cancels the drag; the
		 * keys and the wheel wait until it ends.
		 */
		thumbDrag?: "live" | "onRelease";
		/**
		 * `"hidden"` (the default, Mac OS 8): a document window draws its bars
		 * only while its content overflows, and a list box its bar only while
		 * its rows do. `"shown"` (System 7, HIG p.160): a document window keeps
		 * both bars (the default of `ClassicyWindow`'s `fitsScrollBars` for a
		 * resizable, non-utility window) and a list (`ClassicyListBox`,
		 * Standard File's) its vertical bar while the content fits, drawn in
		 * the `fits` state (no thumb).
		 */
		fitsBars?: "hidden" | "shown";
		/**
		 * `"element"` (the default): nothing is published, and a track's
		 * pattern lies where the package's stylesheet anchors it. `"window"`
		 * (System 7, as QuickDraw aligned a pattern to its window port): the
		 * core publishes the window's content origin (inside the frame, under
		 * the title bar) on each bar and on its track, from that element's
		 * padding-box corner, as `--classicy-scroll-origin-x` / `-y` in whole
		 * pixels, kept current as the window resizes or anything in it
		 * scrolls; the package positions its pattern by them.
		 */
		patternOrigin?: "element" | "window";
	};
	/**
	 * Where the patterns a package fills its parts with are laid from, by
	 * component (`CLASSICY_PATTERN_ORIGIN_COMPONENTS`). Optional, as is each
	 * key: a component left out, or set to `"element"` (the default), has
	 * nothing published and no watcher, and its pattern lies where the
	 * package's stylesheet anchors it (the part's own corner). `"window"`
	 * (System 7, as QuickDraw laid a pattern from its window's port, so a
	 * dithered part keeps the window's phase wherever it sits): the core
	 * publishes the window's content origin (inside the frame, under the
	 * title bar; outside a window, the desktop's corner). `"desktop"`: the
	 * core publishes the desktop's corner (outside a desktop, the
	 * viewport's), for a pattern that keeps one phase across the whole
	 * screen, wherever the part's window is. Either is published on each of the component's
	 * pattern-bearing elements, from the element's padding-box corner, as
	 * `--classicy-pattern-origin-x` / `-y` in whole pixels, and kept current
	 * as anything moves the element against it: a `ControlGroup`'s fieldset;
	 * a `PopUpMenu`'s button and its indicator; a `Separator`'s rule; a
	 * `Slider`'s range input and its tick rail. `elements` names any other
	 * element by CSS selector (a dimmed label the core's dither mixins mask,
	 * say), with its origin: every window, and the desktop for what lies
	 * outside windows (menus, the menu bar), publishes it on the elements
	 * in it that match, on the same signals, and removes it from an element
	 * that no longer matches. The scroll bars have their own declaration,
	 * `scrollBar.patternOrigin`.
	 */
	patternOrigin?: {
		readonly [C in ClassicyPatternOriginComponent]?: ClassicyPatternOrigin;
	} & { readonly elements?: readonly ClassicyPatternOriginElements[] };
	/**
	 * How a slider with a ghost indicator (`ClassicySlider`'s `ghost`)
	 * drags. Optional, as is each key: a package that leaves one out keeps
	 * live dragging.
	 */
	slider?: {
		/**
		 * `"live"` (the default): the indicator follows the pointer and the
		 * value changes as it goes, the ghost with it. `"onRelease"`
		 * (Platinum, HIGOS8 p.34, Figure 2-17): the indicator stays where it
		 * was while the ghost follows the pointer, and the value changes, once,
		 * when the button comes up; a lost pointer stream drops it. A slider
		 * without a ghost drags live under either (the HIG's "live feedback").
		 */
		thumbDrag?: "live" | "onRelease";
	};
	/**
	 * How the file dialog (`ClassicyFileDialog`, Standard File) is framed.
	 * Optional, as is each key.
	 */
	fileDialog?: {
		/**
		 * `"movable"` (the default, Mac OS 8, HIGOS8 p.59): a movable modal
		 * window with a title bar. `"fixed"` (System 7, `*-755-dialog-
		 * standardfile-layout.png`): a fixed modal dialog box, the double frame
		 * alone, no title bar.
		 */
		frame?: "movable" | "fixed";
		/**
		 * `"tree"` (the default, Mac OS 8): folders expand in place under
		 * disclosure triangles. `"flat"` (System 7.5's Standard File): the
		 * list shows one folder's contents, every row by its small icon, a
		 * folder entered by a double-click or Open, and the pop-up lists the
		 * folder's path upward (each level by its small icon), then the other
		 * volumes.
		 */
		navigation?: "tree" | "flat";
		/**
		 * `"plain"` (the default, Mac OS 8): the Save box opens with the
		 * modal's first control focused. `"selected"` (System 7.5,
		 * `*-dialog-standardfile-save.png`): it opens with its name field
		 * focused and the default name selected.
		 */
		saveName?: "plain" | "selected";
	};
	/**
	 * How the file browser (`ClassicyFileBrowser`, the Finder's windows)
	 * draws its list view. Optional, as is each key.
	 */
	fileBrowser?: {
		/**
		 * Where the list view's column titles go. `"inList"` (the default, Mac
		 * OS 8): the list's first row, pinned while it scrolls, beside the
		 * vertical bar. `"aboveList"` (System 7, HIG p.218,
		 * `*-755-finder-list-row-selected.png`): above the list's scrolling
		 * region, in its scroll area's head (`classicyScrollAreaHead`), the
		 * window's full width, so the vertical bar starts under them; they
		 * scroll sideways with the rows (`ClassicyTable`'s `headerPlacement`).
		 * The window's header, when it has one, is marked
		 * `classicyWindowHeaderAboveHead` meanwhile.
		 */
		listColumnTitles?: "inList" | "aboveList";
	};
	/**
	 * The Windows 95/98 shell's taskbar (WIG Ch.3 "The Taskbar", pp.15–16,
	 * Figure 3.1; Ch.9 "Single Document Window Interface", p.175; Ch.10
	 * "Taskbar Integration", pp.211–212). Optional: absent (the default),
	 * the desktop draws its Control Strip and no taskbar. Present,
	 * `ClassicyDesktop` mounts a taskbar along its bottom edge in the Control
	 * Strip's place: the Start button at its left, whose Start menu opens
	 * upward with the Apple menu's, the Applications folder's, Help's and the
	 * Special menu's commands; a button for each open primary window (not a
	 * modal or a palette, WIG Ch.8, p.145); and at its right the status
	 * area, where the Control Strip's modules show as tray icons beside the
	 * menu bar extensions and the clock. No Control Strip is drawn (its
	 * stored settings are kept for a package that draws it). Window
	 * geometry, the desktop icon grid and every menu keep above the
	 * taskbar's band, and each window's menu bar ends with the Help menu.
	 * Requires `menuBar.placement: "window"`: the schema refuses a taskbar
	 * beside a screen menu bar, whose Apple, Help and App Switcher menus the
	 * Start menu, the window menu bars and the task buttons would repeat.
	 */
	taskbar?: {
		/**
		 * The Start button's label. Optional: `"Start"` (Figure 3.1) when
		 * absent; a host relabels it (in its own language, say). One line of
		 * 1–24 characters, with no space at either end and no control
		 * character.
		 */
		startLabel?: string;
		/**
		 * The Start menu's banner, the vertical strip down its left side,
		 * reading upward: `title` in bold, then `edition` (Windows 98's
		 * "Windows" "98"). Optional: absent, the Start menu has no banner.
		 * Text, not art, so it is the layout's and the same under every theme,
		 * as Windows 98 drew its banner under every color scheme. Each part is
		 * one line of 1–24 characters, with no space at either end and no
		 * control character.
		 */
		startBanner?: { title: string; edition?: string };
	};
	/**
	 * How a modal window (`ClassicyWindow`'s `modal`: an alert, a file, input
	 * or keyboard-equivalent dialog, an About box) is captioned. Optional, as
	 * is each key.
	 */
	dialog?: {
		/**
		 * `"plain"` (the default, Mac OS 8): a modal shows the title it is
		 * given (an alert, usually none), a Close box only when it is
		 * `closable`, and an alert of `type="error"` is fixed in place.
		 * `"titled"` (Windows 95/98, WIG Ch.8 "Appearance and Behavior",
		 * p.145, Figure 8.1; "Message Boxes", p.164; "Message Box Types",
		 * p.166, Figure 8.17): every modal's caption has a title, its app's
		 * display name when it is given none (a message box's title names its
		 * context), and a Close box, which closes a `closable` modal, runs its
		 * `onCaptionClose` otherwise, and is drawn unavailable when it has
		 * neither; and every modal moves by its caption, an error alert
		 * included.
		 */
		caption?: "plain" | "titled";
	};
};

/**
 * A package's tunable measurements, as UI metadata: family → key →
 * `{ label, min, max, default }`. The values themselves are theme data, under
 * `defaults.measurements.<family>.<key>`; `classicyKnobsToSchema` turns the
 * metadata into the package's `options` schema.
 */
export type ClassicyAppearanceKnobs = Record<
	string,
	Record<string, { label: string; min: number; max: number; default: number }>
>;

/**
 * A package's own named colors, as UI metadata: family → `{ label, colors:
 * key → { label } }`. The values themselves are theme data, under
 * `defaults.color.families.<family>.<key>` (every declared key must have
 * one), emitted as `--package-color-<family>-<key>`; the Appearance
 * Manager's Colors tab lists the declared ones under each family's label,
 * and `ClassicyDesktopChangeColor { family, key, color }` edits only those.
 */
export type ClassicyAppearanceColorFamilies = Record<
	string,
	{ label: string; colors: Record<string, { label: string }> }
>;

/**
 * Every event a component may emit to a package (`ClassicyAppearanceEvent`),
 * in the contract's order. Frozen.
 */
export const CLASSICY_APPEARANCE_EVENTS = Object.freeze([
	"mount",
	"unmount",
	"press",
	"release",
	"click",
	"open",
	"close",
	"focus",
	"blur",
	"collapse",
	"expand",
	"zoom",
	"select",
	"change",
	"dragStart",
	"dragEnd",
] as const);

/** A component lifecycle or interaction moment a package may react to. */
export type ClassicyAppearanceEvent =
	(typeof CLASSICY_APPEARANCE_EVENTS)[number];

/**
 * How the user drove an event that a component emits from both a pointer
 * path and a keyboard path: `detail.input`. A package uses it
 * to tell, say, a mouse press on a tab from an arrow key landing on it.
 */
export type ClassicyAppearanceInput = "pointer" | "keyboard";

/**
 * How a gesture ended: `lost` is true when it ended because the pointer
 * stream was lost (the window blurred, a `pointercancel`, the page turned
 * hidden), false when it ended any other way (a release, a key release; for
 * a file drag, Escape or its source unmounting too). Host callbacks fired at
 * a gesture's end take it as their trailing argument
 * (`ClassicySplitView`'s `onResizeCommit`, `ClassicySlider`'s
 * `onCommitFunc`), and it is what a package `dragEnd` or `release` detail
 * carries (`ClassicyAppearanceDragEnd`, `ClassicyAppearanceRelease`).
 */
export type ClassicyGestureEnd = { lost: boolean };

/**
 * What every `dragEnd` and `release` detail carries beside the component's
 * own fields (`ClassicyGestureEnd`): `detail.lost`. A package uses it to,
 * say, skip a drop sound for a gesture the user never let go of.
 */
export type ClassicyAppearanceDragEnd = ClassicyGestureEnd;

/**
 * What every `release` detail carries beside the component's own fields:
 * `lost` (`ClassicyGestureEnd`) and `canceled`, true when the press did not
 * end with a release over the control (let go elsewhere: dragged off, a held
 * menu let go over an item or outside; or lost, so a lost release is always
 * canceled too, as a lost file drag is). Every `press` meets exactly one
 * `release`, so a package uses `canceled` to, say, play a button-up click
 * only for a press the user let go of over the control.
 */
export type ClassicyAppearanceRelease = ClassicyGestureEnd & {
	canceled: boolean;
};

/**
 * A component's `emit` (`useClassicyAppearance`): a `dragEnd` must carry
 * `lost` (`ClassicyAppearanceDragEnd`), and a `release` `lost` and
 * `canceled` (`ClassicyAppearanceRelease`), with their own fields; any other
 * event takes the component's own detail, or none.
 */
export type ClassicyAppearanceEmit = <E extends ClassicyAppearanceEvent>(
	event: E,
	...detail: ClassicyAppearanceEmitDetail<E>
) => void;

/**
 * The detail `ClassicyAppearanceEmit` takes for `event`, as a rest tuple: a
 * required one carrying `lost` for `dragEnd`, `lost` and `canceled` for
 * `release`, an optional one of any shape otherwise. Named so a narrower
 * emitter (`ClassicyTable`'s `emitDrag`) stays assignable from `emit`.
 */
export type ClassicyAppearanceEmitDetail<E extends ClassicyAppearanceEvent> =
	E extends "release"
		? [detail: ClassicyAppearanceRelease & Record<string, unknown>]
		: E extends "dragEnd"
			? [detail: ClassicyAppearanceDragEnd & Record<string, unknown>]
			: [detail?: unknown];

/** What a package hook adds to a component's root element. */
export type ClassicyAppearanceDecoration = {
	className?: string;
	style?: CSSProperties;
	attrs?: Record<string, string>;
};

export type ClassicyAppearanceContext = {
	component: ClassicyComponentName;
	event: ClassicyAppearanceEvent;
	element: HTMLElement | null;
	state: Partial<Record<ClassicyState, boolean>>;
	detail?: unknown;
};

/** Returning nothing keeps the previous decoration; `{}` clears it. */
export type ClassicyAppearanceHandler = (
	ctx: ClassicyAppearanceContext,
	// biome-ignore lint/suspicious/noConfusingVoidType: the contract's type, so a handler may simply not return.
) => ClassicyAppearanceDecoration | void;

export type ClassicyAppearanceHooks = {
	/**
	 * What the package adds to a component's root for its state. It must be a
	 * pure function of `(component, state)`: its result is memoized on the
	 * component's state classes and the package, so anything else it reads
	 * (the active theme, the store, the time) goes stale until one of those
	 * changes.
	 */
	decorate?: (
		component: ClassicyComponentName,
		state: Partial<Record<ClassicyState, boolean>>,
	) => ClassicyAppearanceDecoration | undefined;
	on?: Partial<
		Record<
			ClassicyComponentName,
			Partial<Record<ClassicyAppearanceEvent, ClassicyAppearanceHandler>>
		>
	>;
};

/** A package's display override for one app (by app id). Display only:
 *  the app's id, action types, routing and saved state never change. */
export type ClassicyAppIdentityOverride = {
	/** Shown wherever the app's name is shown. */
	name?: string;
	/** Shown wherever the app's icon is shown. */
	icon?: ClassicyAssetSource;
	/** Balloon-help copy for the app's desktop icon when the app supplies none. */
	description?: string;
};

/**
 * An Appearance Package: a complete look (CSS, default theme, presets,
 * arrangement, assets, sounds, behavior hooks) that the desktop can switch
 * to as a unit. Register one with `registerClassicyAppearancePackage`.
 */
export type ClassicyAppearancePackage = {
	/** Kebab-case, e.g. "platinum". */
	id: string;
	name: string;
	/**
	 * The package's icon, shown beside its name (the Appearance Manager's
	 * Themes tab). Without one, a generic package glyph is shown.
	 */
	icon?: ClassicyAssetSource;
	/**
	 * Compiled CSS, already one `@layer classicy.package { … }` block scoped
	 * under `.classicyDesktop[data-classicy-appearance=<id>]`.
	 */
	css: string;
	/** The package's default theme (color, typography, measurements, desktop, sound). */
	defaults: ClassicyTheme;
	/** Built-in themes offered with the package (Platinum's 21). */
	presets?: ClassicyTheme[];
	/** UI metadata per measurements family/key. */
	knobs?: ClassicyAppearanceKnobs;
	/** UI metadata per color family/key (`defaults.color.families`). */
	colorFamilies?: ClassicyAppearanceColorFamilies;
	/** Built from `knobs` by `classicyKnobsToSchema(knobs)`. */
	// biome-ignore lint/suspicious/noExplicitAny: the contract's type; each package's knobs give the shape.
	options?: z.ZodObject<any>;
	layout: ClassicyAppearanceLayout;
	/** Descriptive: the package's assets, registered through the asset registries. */
	assets?: Partial<Record<ClassicyAssetKind, ClassicyAssetTree>>;
	/** Descriptive: the package's sound packs, registered through the sound pack registry. */
	sounds?: ClassicySoundPack[];
	/** Per-app display overrides keyed by app id (`"MoviePlayer.app"`); read with `useClassicyAppIdentity`. */
	apps?: Readonly<Record<string, ClassicyAppIdentityOverride>>;
	/**
	 * The id of the screen saver this package prefers: in effect when the
	 * user's stored choice is not offered under the package. A registered saver
	 * that names this package (or none); an unknown id is warned about once and
	 * ignored.
	 */
	defaultScreenSaver?: string;
	/**
	 * How the package dims an icon per pixel (a hidden application's icon in
	 * the Application menu), drawn on a canvas by the core
	 * (`ClassicyIconDimming.ts`); without a rule, or for an icon a canvas
	 * cannot read, the package's stylesheet dims it.
	 */
	iconDimming?: ClassicyIconDimming;
	hooks?: ClassicyAppearanceHooks;
};

/** Registered packages in registration order; re-renders on any change. */
export const useClassicyAppearancePackages = (): ClassicyAppearancePackage[] =>
	useSyncExternalStore(
		subscribeClassicyAppearancePackages,
		listClassicyAppearancePackages,
		listClassicyAppearancePackages,
	);

// Read as possibly absent: a hand-built state may lack it until
// migrateClassicyState fills it, and a missing id means the default package.
// Mocked stores in tests may lack the slice altogether.
const selectPackageId = (state: ClassicyStore): string | undefined =>
	state.System?.Manager?.Appearance?.packageId;

// The store-free registry helper (shared with the reducers, J-R16), then the
// frozen structure-only fallback.
const resolve = (packageId: string | undefined): ClassicyAppearancePackage =>
	getRegisteredClassicyAppearancePackageOrDefault(packageId) ??
	CLASSICY_FALLBACK_APPEARANCE_PACKAGE;

/**
 * The package that applies to `packageId`: that package when registered, else
 * the default package (`CLASSICY_DEFAULT_APPEARANCE_PACKAGE_ID`) when
 * registered, else the first registered package, else (no package registered
 * at all) `CLASSICY_FALLBACK_APPEARANCE_PACKAGE`. With no argument it
 * reads the store's active package id at call time, for reducers, effects and
 * other non-hook callers; components use `useActiveClassicyAppearancePackage`.
 */
export const resolveClassicyAppearancePackage = (
	packageId: string | undefined = selectPackageId(useAppManager.getState()),
): ClassicyAppearancePackage => resolve(packageId);

/**
 * The active package: the store's `packageId` resolved as
 * `resolveClassicyAppearancePackage` resolves it (that package, else the
 * registered default, else the first registered, else
 * `CLASSICY_FALLBACK_APPEARANCE_PACKAGE`). Re-renders when the store's id or
 * the registry changes.
 */
export const useActiveClassicyAppearancePackage =
	(): ClassicyAppearancePackage => {
		const packageId = useAppManager(selectPackageId);
		useClassicyAppearancePackages();
		return resolve(packageId);
	};
