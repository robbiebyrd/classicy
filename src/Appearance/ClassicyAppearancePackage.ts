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
		/**
		 * Whether a window's view state comes back with it (WIG Ch.2
		 * "Persistence", p.12: "view state information, such as cursor
		 * position, scroll position, and window size and location, should be
		 * preserved so it can be restored when an object's view is
		 * reopened"). Absent or `false` (Mac OS 8 and
		 * System 7, today's behavior): a window's record keeps its size,
		 * place, zoom and collapse alone, and a reopened window starts
		 * scrolled to the top with the caret at the start. `true` (Windows):
		 * once its scrolling settles, a scroll area given
		 * `useClassicyWindowViewState`'s callbacks records its offsets on the
		 * window's record (`scroll`, through `ClassicyWindowSetScroll`), and a
		 * document's text editor its caret (`caret`; SimpleText's windows),
		 * and both are put back when the window mounts again, this session or
		 * after a reload.
		 */
		restoreViewState?: boolean;
		growBoxCorner: "bottom-right" | "bottom-left" | "top-right" | "top-left";
		/**
		 * Where a window opened at a symbolic `"center"` position lands.
		 * Optional. `"exact"` (the default, Mac OS 8): at exactly half the free
		 * space, on a half pixel when that space is odd. `"wholePixel"`
		 * (System 7): rounded to a whole pixel, so a centered alert or dialog
		 * draws its one-pixel lines and text crisp in every engine.
		 */
		centering?: "exact" | "wholePixel";
	};
	menuBar: {
		placement: "screen" | "window";
		/**
		 * How long an open menu waits, untouched, before it closes itself, in
		 * milliseconds. Optional: absent, 15000 (HIGOS8 "Sticky Menus", p.92:
		 * "A sticky menu will also close on its own after fifteen seconds").
		 * `0` never closes it: Windows keeps a menu until the next click (WIG
		 * Ch.7 "Drop-down Menu Interaction", p.97; Ch.14 "Timing and
		 * Navigational Interfaces", p.333). Read by every
		 * `ClassicyMenuProvider` given no `idleTimeoutMs` of its own (the
		 * screen and window menu bars, contextual menus, pop-up bevel
		 * buttons' menus), through `useClassicyMenuIdleTimeout`.
		 */
		idleTimeoutMs?: number;
	};
	/**
	 * How menus track the pointer and the keyboard (`ClassicyMenu`).
	 * Optional, as is each key: a package that leaves one out keeps the
	 * Mac OS behavior.
	 */
	menu?: {
		/**
		 * The standard shortcut keys a bundled document app's File menu
		 * carries. Absent (Mac OS 8 and System 7, whose equivalents are
		 * ⌘-keys the browser keeps): none, so SimpleText's Open… and Save
		 * have no equivalent. `"windows"` (WIG Appendix B Table B.2, p.358,
		 * the common shortcut keys, CTRL+O Open and CTRL+S Save: "Avoid
		 * assigning these keys to functions other than those listed"): SimpleText's
		 * Open… carries ⌃O and Save ⌃S (spelled Ctrl+O and Ctrl+S under
		 * `shortcutSpelling: "names"`), so on a Windows host Ctrl+O and
		 * Ctrl+S run them instead of the browser's Open and Save Page; the
		 * menu-shortcut dispatcher prevents the browser's default.
		 */
		standardShortcuts?: "windows";
		/**
		 * How a menu takes the keyboard (`ClassicyMenu`). `"mac"` (the
		 * default; Mac OS 8's and System 7's menus had no keyboard
		 * navigation, HIGOS8 "Sticky Menus" (p.92)): Return chooses the
		 * focused item, as a click does, and a pop-up bevel button's menu
		 * walks its items with Up and Down and closes on Escape
		 * (`ClassicyBevelButtonPopup`), as before; nothing else. `"windows"`
		 * (WIG Ch.7 "The Menu Bar and Drop-down Menus" (pp.97-98), "Pop-up
		 * Menu Interaction" (p.101)): roving focus through every menu tree
		 * (Up and Down through a list, wrapping, Right and Left into and out
		 * of submenus and across a menu bar's titles, Home and End, Return
		 * and Space, typing to the next item a letter starts), Escape a level
		 * at a time (an open contextual menu included), F10 to a menu bar and
		 * back, and a pop-up shown with focus outside it taking Escape, Up,
		 * Down and its access keys from the document. Access keys typed in a
		 * menu, and Alt with a title's, act only under it (`accessKeys`).
		 */
		keys?: "mac" | "windows";
		/**
		 * The time-out, in milliseconds, before a submenu (a cascading menu)
		 * opens under a resting pointer and before an open one closes when the
		 * pointer rests on another item of its parent, so a diagonal drag into
		 * it survives the siblings it crosses (WIG Ch.7 "Cascading Menus",
		 * pp.104-105; Windows' SPI_GETMENUSHOWDELAY, 400). Absent (Mac OS 8):
		 * a hovered submenu opens at once and stays open until another opens
		 * or the menus close, and a pop-up menu (a contextual menu, a pop-up
		 * bevel button's) opens its submenus on a click alone. Set, even to
		 * `0`, a pop-up menu's submenus open on hover too, after the delay,
		 * and a dimmed item's submenu never opens on hover. Menu bar titles
		 * switch at once either way; a click, Return or the arrow keys open a
		 * submenu at once.
		 */
		submenuDelayMs?: number;
		/**
		 * How the keyboard treats a dimmed item. `"skip"` (the default, as Mac
		 * OS menus and the pop-up bevel buttons' menus did): the arrow keys,
		 * Home, End and typing pass over it. `"browse"` (Windows): it is
		 * tracked like any other item, and choosing it does nothing (WIG
		 * Ch.7 "Menu Items", p.107: "If you disable a menu item or its title,
		 * it does not prevent the user from browsing or choosing it").
		 */
		disabledItems?: "skip" | "browse";
		/**
		 * Which menu titles and items have an access key, the character
		 * typed to reach them, drawn as the `access-key` part (WIG Ch.7 "Menu
		 * Titles" (p.106), "Menu Item Labels" (p.109)), and which control
		 * labels do (`ClassicyControlLabel`; Ch.8 "Navigation in Secondary
		 * Windows", pp.148-149). Absent (Mac OS 8 and System 7, which had no
		 * access keys): none, an `accessKey` given included, so nothing is
		 * drawn, named or taken. `"explicit"`: only those given an
		 * `accessKey`. `"auto"` (Windows): every other titled item, and every
		 * other label of a focusable control, takes the first character of
		 * its text no sibling holds (the first letter, a later word's first
		 * letter, a consonant, a vowel: WIG Ch.4 "Access Keys", p.27), an
		 * explicit key always winning and reserved first. A menu's keys are
		 * typed through the menu keyboard (`keys: "windows"`), and a label's
		 * reached with Alt and its key under either value.
		 */
		accessKeys?: "explicit" | "auto";
		/**
		 * How `ClassicyKbd`'s inline form (a menu item's keyboard equivalent)
		 * spells a shortcut. `"glyphs"` (the default, Mac OS): ⌃⌥⇧⌘ and the
		 * key, `⇧⌘S`. `"names"` (Windows; WIG Ch.7 "Shortcut Keys in Menu
		 * Items", p.110): the keycaps' names joined by `+`, `Ctrl+Shift+S`
		 * (⌃ Ctrl, ⌥ Alt, ⇧ Shift, ⌘ Win; ⌫ Backspace, ⌦ Del, the arrows Up,
		 * Down, Left and Right, Escape Esc, function keys as they are).
		 */
		shortcutSpelling?: "glyphs" | "names";
		/**
		 * An item given an empty `menuChildren`. `"leaf"` (the default): a
		 * plain item, chosen as any other. `"placeholder"` (Windows 98's Start
		 * menu and Favorites): a submenu holding one dimmed "(Empty)" item.
		 */
		emptySubmenus?: "leaf" | "placeholder";
	};
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
		 * the scroll box", times `snapBackScale`) from the bar snaps the
		 * outline back over the thumb,
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
		/**
		 * Whether a live thumb drag (`thumbDrag` `"live"`) snaps back. Absent
		 * or `false` (Mac OS 8): the content follows the thumb wherever the
		 * pointer goes. `true` (Windows; WIG Ch.6 "Scroll Box", p.89): while
		 * the pointer is farther from the bar than the snap-back distance
		 * (`snapBackScale`, below), the content returns to where the drag
		 * started, and follows the pointer again once it comes back; a
		 * release out there leaves it where it started.
		 */
		liveSnapBack?: boolean;
		/**
		 * The snap-back distance of a thumb drag, as multiples of the bar's
		 * thickness: `across` the bar (to either side) and `along` it (past
		 * either end), for a theme that emits no `--scroll-bar-snap-back`
		 * (which, when emitted, is the distance on every side, in px). Absent:
		 * once the thickness each way (HIG p.165's "width of the scroll box").
		 * Windows: 8 across and 2 along, the rectangle Windows' scroll bar is
		 * grown by before the thumb snaps back (Wine's `point_in_scroll_rect`,
		 * which ReactOS shares). Read by an on-release drag and by a live one
		 * that `liveSnapBack` lets snap back.
		 */
		snapBackScale?: { across: number; along: number };
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
		/**
		 * How a flat list (`navigation: "flat"`) lays out its rows.
		 * `"single"` (the default): one column, scrolling down. `"columns"`
		 * (Windows' common dialogs, WIG Ch.8 "Open Dialog Box", Figure 8.6:
		 * the list view's List mode): the rows flow in columns, top to
		 * bottom then left to right, as many to a column as the list's
		 * height holds, scrolling sideways (the list's horizontal bar); Left
		 * and Right Arrow move a column, Up and Down a row, Home and End to
		 * the first and last. The tree navigation ignores it.
		 */
		listFlow?: "single" | "columns";
	};
	/**
	 * Keys that reach a target outside any one control. Optional, as is
	 * each key.
	 */
	keyboard?: {
		/**
		 * `true` (Windows; WIG Ch.7 "Pop-up Menu Interaction" (p.101),
		 * Appendix B Tables B.2 and B.3): Shift+F10 and the Application
		 * (ContextMenu) key open the focused element's contextual menu, as a
		 * right-click on it does (`ClassicyContextualMenuProvider`). Absent
		 * or `false` (Mac OS 8 and System 7, whose contextual menus open
		 * from a Control-click alone, HIGOS8 "Contextual Menus" (p.93)):
		 * neither key is taken.
		 */
		contextMenuKey?: boolean;
		/**
		 * Which key a Command (⌘) keyboard equivalent answers to
		 * (`shortcutMatchesEvent`, `canonicalChordsFromEvent`,
		 * `classicyCommandKeyHeld`: the menu-shortcut dispatcher, the
		 * dialogs' Command-period, HyperCard's editor). `"metaOrCtrl"` (the
		 * default, Mac OS): Command or Control, so a ⌘ equivalent works on
		 * any keyboard. `"ctrl"` (Windows; WIG Ch.4 "Shortcut Keys" (p.28),
		 * Appendix B Table B.3 (p.359): the Windows keys are for the
		 * system's own functions): Control alone, and a key pressed with the
		 * Windows key (`metaKey`) runs no command, so Win+letter fires
		 * nothing and Win+period cancels nothing. A recorded equivalent
		 * (`keyboardShortcutFromEvent`) follows: Control records as ⌘ and the
		 * Windows key records nothing. Under `menu.shortcutSpelling`
		 * `"names"` a ⌘ chord is then spelled `Ctrl+`.
		 */
		command?: "metaOrCtrl" | "ctrl";
	};
	/**
	 * Which commands the Finder's menus offer (`Finder`). Optional, as is
	 * each key.
	 */
	finder?: {
		/**
		 * `"mac"` (the default, Mac OS 8's Finder): an item's contextual menu
		 * holds the Mac commands alone, with no default item (HIGOS8
		 * "Contextual Menus" (pp.94-95): "you should not set a default
		 * item"). `"windows"` (Windows Explorer; WIG Ch.7 "Icon Pop-up
		 * Menus" (pp.102-103)): every item's contextual menu, a desktop
		 * file's or folder's included, leads with Open, its default item, the
		 * command a double-click runs.
		 */
		commands?: "mac" | "windows";
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
		/**
		 * How the icon view's selection answers the keyboard and modified
		 * clicks. `"mac"` (the default, Mac OS 8's Finder, HIG7 pp.288-291):
		 * Shift-, ⌘- or Control-click adds an icon to the selection or takes
		 * it out, a selection rectangle drawn with any of them adds the icons
		 * it touches, and the paging keys scroll the window. `"windows"`
		 * (Windows Explorer's list view; WIG Ch.5 "Selection", pp.38-45):
		 * Shift-click and Shift with an arrow, Home or End select the icons
		 * whose top left lies in the rectangle spanned by the anchor's icon
		 * and the item's, replacing the rest (comctl32's icon-view group
		 * selection, `LISTVIEW_SetGroupSelection`); Control-click adds or
		 * takes out one item and moves the anchor; Control with Shift keeps
		 * the other selections and sets that rectangle's icons to the
		 * anchor's state, the anchor staying (WIG p.39, as `selection.modifiers`
		 * "windows" has it for a list); a selection rectangle drawn with Shift
		 * adds the icons it touches, with Control (or ⌘) toggles them (the
		 * symmetric difference, as Explorer's marquee inverts them), and with
		 * neither selects them alone; Home, End, Page Up and Page Down select
		 * the first item, the last, and the item a window's height above or
		 * below; and typing one letter again goes to the next item starting
		 * with it. Under either, a click selects one icon, an arrow the
		 * nearest icon its way, typing the item whose name starts with what
		 * was typed (forgotten after a second), a drag across empty space
		 * selects the icons it touches, and a click on a selected icon's
		 * name, not followed by a second, renames it.
		 */
		keys?: "mac" | "windows";
		/**
		 * What dragging a selected icon of the icon view carries. `"perIcon"`
		 * (the default, today's rule): the icon pressed, alone, whatever else
		 * is selected. `"view"` (Windows Explorer; WIG Ch.5 "Operations for a
		 * Multiple Selection", p.44, "Direct Manipulation Transfers", p.66;
		 * App. A Tables A.1-A.3): the view's whole selection, each selected
		 * icon's image and label in the outline that follows the pointer,
		 * moved together to the folder or desktop it is let go over
		 * (`onMoveItems` gets every path), or, let go in its own folder,
		 * every selected icon moved as far as the pointer went; the click
		 * that ends such a drag leaves the selection as it is. The view keeps
		 * one selection under either (a click selects an icon, a press on its
		 * empty space clears it); this key decides only what a drag takes.
		 */
		iconSelection?: "perIcon" | "view";
		/**
		 * `true` (Windows Explorer; WIG Ch.5 "Region Selection", p.42; Ch.7
		 * "List View Controls", p.123): the list view takes a selection
		 * rectangle too, from a press on its empty space (below its last
		 * row, never on a row or its column titles), selecting the rows whose
		 * names it touches, live, as the icon view's does, with the same
		 * modifiers (`keys`); and while either view's rectangle is drawn the
		 * window scrolls toward an edge the pointer is near or past, a line
		 * at a time at a held scroll arrow's rate, as a file drag scrolls
		 * it. A press there clears the list's selection first unless Shift,
		 * Control or ⌘ is held. Absent or `false`: the list view has no
		 * rectangle, and the icon view's never scrolls the window.
		 */
		regionSelect?: boolean;
	};
	/**
	 * How lists of files order their items (`ClassicyFileBrowser`'s views,
	 * the Finder's windows). Optional, as is each key.
	 */
	fileList?: {
		/**
		 * `true` (Windows Explorer): folders (and drives) come before files,
		 * each group sorted in itself; a descending sort of the list view
		 * reverses the whole order, folders last, as Explorer negates a
		 * compare that puts folders first (Wine's
		 * `ShellView_ListViewCompareItems`, ReactOS's
		 * `CDefView::ListViewCompareItems`). The icon view, arranged or not,
		 * keeps folders first. Absent or `false` (Mac OS 8's Finder): folders
		 * and files sort together. The file dialogs' volumes list folders
		 * first already, under every package.
		 */
		foldersFirst?: boolean;
	};
	/**
	 * How the keyboard drives a tree (`ClassicyTree`, and a table's tree
	 * rows). Optional, as is each key.
	 */
	tree?: {
		/**
		 * `"mac"` (the default, Mac OS 8's list views): Up, Down, Home, End
		 * and typing move between the rows, and ⌘→ / ⌘← (Control under
		 * Windows' keyboards) open and close the focused branch; a bare Right
		 * or Left Arrow does nothing. `"windows"` (WIG Ch.7 "Tree View
		 * Controls", pp.123-124; comctl32's tree view): a bare Right Arrow
		 * expands a closed branch, or moves to the first child of an open
		 * one; a bare Left Arrow collapses an open branch, or moves to the
		 * parent of a closed branch or a leaf. Under `"windows"` the chords
		 * scroll instead, as comctl32's tree view takes them
		 * (`TREEVIEW_ScrollKeyDown`; WIG App. B Table B.1, p.357): Control
		 * (or ⌘) with Up or Down scrolls the tree's scroller one row, with
		 * Left or Right a row's height sideways, with Page Up or Page Down a
		 * page, and with Home or End to its top or bottom, the keyboard row
		 * and the selection staying where they are. A table's tree rows
		 * (`ClassicyTable` with `getSubRows`, the Finder's list view) follow
		 * the same key: ⌘→ / ⌘← (or Control) expand and collapse the
		 * keyboard row under `"mac"`, a bare Right and Left Arrow under
		 * `"windows"`.
		 */
		keys?: "mac" | "windows";
	};
	/**
	 * Where help that `useClassicyBalloonHelp` (`ClassicyBalloonHelp`, the
	 * desktop icons' balloons) shows goes. Optional, as is each key.
	 */
	balloonHelp?: {
		/**
		 * `"anchor"` (the default, Mac OS 8's Balloon Help): the balloon is
		 * placed against the element it describes, on the side its
		 * `position` prefers (flipped where there is no room), its tail
		 * pointing at it, after the delay from the pointer's arrival.
		 * `"pointer"` (Windows' ToolTip; WIG Ch.7 "Tooltip Controls",
		 * p.133; Ch.12 "Tooltips"): the box appears once the pointer has
		 * rested on the element for the delay, its top-left corner at the
		 * pointer's position, below it by what the package's stylesheet
		 * offsets the part `classicyBalloonHelpPointerBelow` (the cursor's
		 * height), moved left to stay on the desktop, and above the element
		 * (`classicyBalloonHelpPointerAbove`) where it would pass the
		 * desktop's bottom; no tail is drawn. A press on the element hides
		 * it until the pointer leaves.
		 */
		placement?: "anchor" | "pointer";
	};
	/**
	 * How a text field selects its text (`ClassicyInput`,
	 * `ClassicyTextEditor`). Optional, as is each key.
	 */
	text?: {
		/**
		 * What a double-click selects. `"native"` (the default, Mac OS 8's
		 * TextEdit): what the browser selects, the word alone on macOS and
		 * Linux hosts. `"trailingSpace"` (Windows; WIG Ch.5 "Selection
		 * Shortcuts", p.44: a double-click selects the word and the space
		 * after it, not punctuation): once the browser has selected the
		 * word, the selection is extended forward over the spaces (U+0020,
		 * U+00A0) that follow it, never over a line break or a punctuation
		 * mark; on a Windows host the browser has taken them already, and
		 * nothing changes.
		 */
		wordSelect?: "native" | "trailingSpace";
	};
	/**
	 * What the Edit commands act on, and how the bundled Edit menu reads
	 * (`classicyEditCommands`, `useClassicyEditMenu`). Optional, as is each
	 * key.
	 */
	edit?: {
		/**
		 * Which text field Undo, Cut, Copy, Paste, Clear and Select All act
		 * on when the focus is not in one (a menu click took it). `"any"`
		 * (the default, today's rule): the text field last focused, wherever
		 * it is. `"window"` (Windows; WIG Ch.5 "Operations for a Multiple
		 * Selection", p.44: an operation keeps to its selection's scope): the
		 * last focused field only while its window is an active one (its
		 * `.classicyWindow` root carries `active`), else none, so the
		 * commands do nothing and Undo has nothing to undo; a field outside
		 * every window is never the target then. A focused field is the
		 * target under either.
		 */
		scope?: "any" | "window";
		/**
		 * The form of the bundled Edit menu (`useClassicyEditMenu`). `"mac"`
		 * (the default, Mac OS 8, HIG 4.6): Undo named after the last edit
		 * ("Undo Typing") or "Can't Undo", a divider, Cut, Copy, Paste, Clear
		 * and Select All. `"windows"` (Windows 98 SE's Notepad; WIG Ch.5
		 * "Command Method", p.59, "Shortcut Keys for Transfer Operations",
		 * pp.67-68): "Undo", dimmed with nothing to undo, a divider, Cut,
		 * Copy, Paste, Delete (in Clear's place, with the Delete key, "Del"),
		 * a divider, and Select All; Cut, Copy and Delete are dimmed while
		 * the target field has no selection (Cut and Copy in a password
		 * field), Cut, Paste and Delete while it is read-only, Select All
		 * while it is empty, and every command while there is no target, as
		 * Notepad's menu dims them.
		 */
		menu?: "mac" | "windows";
	};
	/**
	 * What a text field does with a right-click. Optional, as is each key.
	 */
	textField?: {
		/**
		 * `"none"` (the default, Mac OS 8, whose text fields had no
		 * contextual menu of their own): the right-click goes on to the
		 * window's or the app's menu. `"edit"` (Windows; WIG Ch.5 "Command
		 * Method", p.59; user.exe's edit-control pop-up menu): a right-click
		 * on a text field (`ClassicyInput`, `ClassicyTextEditor`,
		 * `ClassicyRichTextEditor`'s text, `ClassicyComboBox`'s field,
		 * `ClassicySpinner`'s) focuses it, keeping its selection, and shows
		 * the field's own menu, Undo, a divider, Cut, Copy, Paste, Delete, a
		 * divider and Select All, each acting on that field: Undo is dimmed
		 * with nothing to undo, Cut, Copy and Delete with an empty selection,
		 * Cut and Copy in a password field, Undo, Cut, Paste and Delete in a
		 * read-only one, and Select All while everything is selected.
		 * Shift+F10 and the Application key (`keyboard.contextMenuKey`) open
		 * it at the field's center.
		 */
		contextMenu?: "none" | "edit";
	};
	/**
	 * How a paged assistant (`ClassicyAssistant`, Apple Guide's topic
	 * window) is moved through. Optional, as is each key.
	 */
	assistant?: {
		/**
		 * `"pager"` (the default, the Mac OS Setup Assistant's): a
		 * `ClassicyPager` at the footer's right, its back and forward arrows
		 * around the page number, the page's own buttons at the left.
		 * `"buttons"` (a Windows wizard; WIG Ch.12 "Wizard Buttons", p.289,
		 * Figures 12.17 and 12.18; comctl32.dll's wizard strings on the
		 * Windows 98 SE CD, "< &Back" and "&Next >"): two push buttons in
		 * `.classicyAssistantNav` in the pager's place, "< Back"
		 * (`classicyAssistantBack`, disabled on the first page, access key B)
		 * and "Next >" (`classicyAssistantNext`, disabled on the last, access
		 * key N), through the same handlers as the pager's arrows, so a
		 * page's `canAdvance` and the `change` hook hold; the page number is
		 * not drawn. The package's stylesheet orders them before the page's
		 * own buttons (Finish, Cancel).
		 */
		navigation?: "pager" | "buttons";
	};
	/**
	 * What kind of window Apple Guide's help topics open in, and whether a
	 * window lists them. Optional, as is each key.
	 */
	help?: {
		/**
		 * Absent (the default, Mac OS 8's Apple Guide): a topic's window
		 * (`AppleGuideWindow`) is fixed at 700 × 322 and pages with the
		 * assistant's navigation alone, and no window lists the topics
		 * (`APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT` shows the built-in
		 * `ABOUT_BALLOON_HELP_TOPIC_ID` topic). `"winhelp"` (Windows Help;
		 * WIG Ch.12 "Task Topic Windows", pp.279-280, Figure 12.10, and "The
		 * Help Topics Browser", pp.284-288, Figure 12.13; winhlp32.exe on
		 * the Windows 98 SE CD): a topic's window is a primary window the
		 * user can size (at least 320 × 200), with a row of command buttons
		 * above the topic (`appleGuideButtonBar`): "Help Topics" (access key
		 * T), "Back" (the previous page, dimmed on the first) and "Options"
		 * (O), a menu of "Copy" (o), which puts the page's text on the
		 * clipboard; and `APPLE_GUIDE_SHOW_HELP_TOPICS_EVENT` opens the Help
		 * Topics browser (`ClassicyHelpTopics`, "Help Topics: <Apple Guide's
		 * display name>"), whose Contents tab lists the topics offered under
		 * the active package, a book row per `book` and a page row per
		 * topic, with Display (or Open and Close on a book) and Cancel.
		 */
		topicWindow?: "winhelp";
	};
	/**
	 * What the mouse's buttons and the keyboard do to a selection.
	 * Optional, as is each key.
	 */
	selection?: {
		/**
		 * What button 2 (the right button, or a Control-click) does to the
		 * selection it presses on. `"menu"` (the default, Mac OS 8's
		 * Control-click): it shows the object's contextual menu, a desktop
		 * icon's collapsing the desktop's selection to that icon first, and
		 * a table row under it changes nothing. `"select"` (Windows; WIG
		 * Ch.5 "Selection with the Mouse", pp.37-38; Ch.11 "Accessing
		 * Commands for Selected Objects", p.234; App. A Table A.1, p.349): a
		 * press on an unselected desktop icon or table row (`ClassicyTable`,
		 * the Finder's list view) selects it alone before its menu shows,
		 * and a press on a selected one keeps the whole selection, which its
		 * menu then acts on. A list box (`ClassicyListBox`) and a tree
		 * (`ClassicyTree`) ignore button 2 under either, as user32's list box
		 * does.
		 */
		secondaryButton?: "menu" | "select";
		/**
		 * When button 1 selects a row of a list box (`ClassicyListBox`), a
		 * table (`ClassicyTable`, the Finder's list view) or a tree
		 * (`ClassicyTree`). `"click"` (the default, Mac OS 8's List Manager):
		 * when the button comes up over it, so a press shows nothing. `"press"`
		 * (Windows; WIG Ch.5 "Selection with the Mouse", pp.37-38; Ch.13
		 * "Highlighting", p.318; App. A Table A.1, p.349): at the press, which
		 * also sets the anchor, so a row dragged before it was selected is
		 * drawn selected as it goes. An unmodified press on a row already
		 * selected (in a multiple selection list box, in any table) keeps the
		 * selection, and the click that ends it resets the selection to that
		 * row, as comctl32's list view does (`nLButtonDownItem`), so a drag
		 * from it carries the whole selection. The second press of a
		 * double-click changes nothing (Win32's WM_LBUTTONDBLCLK takes the
		 * place of its WM_LBUTTONDOWN). A check list (`checkboxes`) toggles at
		 * the press.
		 */
		selectOn?: "click" | "press";
		/**
		 * Whether dragging across a list's rows selects them (WIG Ch.5
		 * "Mouse Selection", "Selection with the Mouse", p.37; "Selection
		 * Adjustment", pp.38-39). Meaningful with `selectOn: "press"`, for a
		 * `ClassicyListBox` (not a check list) and a `ClassicyTable` whose
		 * rows do not drag (`rowsDrag`; the Finder's list view drags its
		 * files instead). Absent or `false` (Mac OS 8): a drag selects
		 * nothing. `true` (Windows, as user32's list box and comctl32's list
		 * view track the pointer): from the press to the release (or a lost
		 * pointer stream), the row under the pointer counts, the first or
		 * last shown row while the pointer is above or below the list, which
		 * then scrolls a line step a frame toward it. A single selection list
		 * selects that row; a multiple selection list selects the anchor's
		 * row to it (no modifier, or Shift), or keeps the selection the press
		 * found and sets that range to the anchor's state (Control or ⌘;
		 * with Shift too under `modifiers: "windows"`), the modifiers held at
		 * the press governing to the release.
		 */
		dragRange?: boolean;
		/**
		 * What Control (or ⌘) with Shift does to a multiple selection list
		 * box's or a table's selection, and what a double-click opens.
		 * `"mac"` (the default): Shift wins, the range from the anchor
		 * replacing the selection, and a double-click opens the row under
		 * the pointer. `"windows"` (WIG Ch.5 "Selection Adjustment", p.39;
		 * App. A Tables A.2, pp.352-353, and A.3, p.356): the other disjoint
		 * selections stay, and every row from the anchor to the one clicked
		 * takes the anchor's state, the anchor staying where it is; the
		 * second click of a double-click changes no selection; and a
		 * double-click hands the whole selection as it then stands to
		 * `onActivateSelection` (`ClassicyListBox`, `ClassicyTable`; the
		 * Finder opens every selected item), where one is given. On the
		 * desktop (`ClassicyDesktopIcon`, `ClassicyDesktopIconSelect`; WIG
		 * Ch.5 pp.38-39, 42; App. A Tables A.2 and A.3), a Control- or
		 * ⌘-click toggles an icon, a Shift-click selects the anchor's
		 * rectangle to it, both set that rectangle to the anchor's state,
		 * and a selection rectangle pressed with Shift adds to the
		 * selection, with Control or ⌘ toggles what it covers
		 * (`classicyDesktopSelectPress`'s `keep`).
		 */
		modifiers?: "mac" | "windows";
		/**
		 * What Page Up and Page Down do in a list box (`ClassicyListBox`), a
		 * table (`ClassicyTable`, the Finder's list view) or a tree
		 * (`ClassicyTree`). `"scroll"` (the default, Mac OS 8's lists): they
		 * scroll the list a page (a scrolling table's or list box's scroll
		 * area, else the browser), the keyboard row and the selection staying
		 * where they are. `"move"` (Windows; WIG Ch.5 "Basic Navigation
		 * Keys", Table 5.1, pp.35-36, "Down one screen (next screen, same
		 * position)"; App. B Table B.1, p.357): they move the keyboard row to
		 * the last (Page Down) or first (Page Up) row wholly shown, or, when
		 * it is there already, a page further, one row fewer than the list
		 * shows (comctl32's list view, `LISTVIEW_KeyDown`; user32's list box
		 * steps the same page less one), the list scrolling only as far as
		 * the row needs. A list box and a table select the row it reaches as
		 * their arrows do (Shift extends from the anchor); a tree moves its
		 * keyboard row alone, as its arrows do.
		 */
		pageKeys?: "scroll" | "move";
		/**
		 * How the keyboard builds a multiple selection list box's
		 * (`ClassicyListBox`, not a check list) or a table's (`ClassicyTable`)
		 * selection. `"follow"` (the default, Mac OS 8's lists): the
		 * selection follows the keyboard row (Shift extends), and a table
		 * leaves Space to its scroll area, which pages. `"windows"` (WIG
		 * Ch.5 "Keyboard Selection", p.43, "Disjoint Selection", pp.43-44;
		 * App. B Table B.2, p.358; comctl32's `LISTVIEW_KeySelection`):
		 * Space selects a table's keyboard row alone and makes it the anchor,
		 * and Control (or ⌘) with Space toggles it in a multiple selection
		 * table, as a list box's Space already does; in a multiple selection
		 * list box or table, Control, ⌘ or Option with an arrow, Home, End,
		 * Page Up or Page Down moves the keyboard row without selecting
		 * (macOS takes Control and the arrows for Spaces); and Shift+F8
		 * toggles Add mode, published as `data-classicy-selection-mode="add"`
		 * on the list's root, in which the navigation keys move the keyboard
		 * row alone, Space toggles the row and makes it the anchor, and Shift
		 * with a navigation key sets the anchor's range to the anchor's
		 * state, the other selections staying. Leaving Add mode keeps the
		 * selection; the next plain click or navigation key replaces it.
		 * The file browser's icon view reads it too: under `"windows"` Space
		 * selects the keyboard's icon alone and Control (or ⌘) with Space
		 * toggles it, Return alone opening it (Space opens an icon under
		 * `"follow"`), and the view is a list box of options (`role="listbox"`,
		 * `aria-multiselectable`, each icon `role="option"` with
		 * `aria-selected`) rather than a set of buttons. The desktop's icons
		 * too (`ClassicyDesktopIcon`): Space selects, Control or ⌘ with it
		 * toggles, Shift with it extends, Enter alone opens, and Control,
		 * ⌘ or Option with a navigation key moves the focus icon alone
		 * (`classicyDesktopKeyCommand`).
		 */
		keyboard?: "follow" | "windows";
		/**
		 * How Tab reaches a view's icons (the file browser's icon view).
		 * `"each"` (the default, today's rule): every icon is a Tab stop.
		 * `"roving"` (Windows; WIG Ch.5 Table 5.1, pp.35-36, "Keyboard
		 * Selection", p.43; Ch.7 "List View Controls", p.123: an icon view is
		 * one field the arrows move inside): one icon is the view's Tab stop,
		 * the one last pressed or moved to, else the first in the view's
		 * order; the rest are reached by the arrows, Home, End and typing.
		 * The desktop too: its focus icon (`Desktop.focusIcon`,
		 * `classicyDesktopFocusIconId`) is its one Tab stop, and its arrows,
		 * Home, End and page keys move from it (`classicyDesktopKeyCommand`;
		 * App. B Table B.1, p.357).
		 */
		iconNavigation?: "each" | "roving";
	};
	/**
	 * When a contextual menu opens (`ClassicyContextualMenuProvider`).
	 * Optional, as is each key.
	 */
	contextMenu?: {
		/**
		 * `"event"` (the default, Mac OS 8, whose contextual menus open at
		 * the Control-press): the menu opens the moment `showContextMenu` is
		 * called, which is at the press on macOS and Linux hosts and at the
		 * release on Windows hosts, as the browser raises `contextmenu`.
		 * `"release"` (Windows; WIG Ch.5 "Selection with the Mouse", p.38):
		 * a call made while button 2 is down is held, and the menu opens
		 * when that button comes up, on every host; a newer call replaces
		 * the held one, and a lost pointer stream (the window blurs, a
		 * `pointercancel`, the page is hidden) or `hideContextMenu` drops it.
		 */
		openOn?: "event" | "release";
	};
	/**
	 * How a document's app treats its documents' windows. Optional, as is
	 * each key.
	 */
	document?: {
		/**
		 * Whether closing a document with unsaved changes asks first (WIG
		 * Ch.1 "Forgiveness", pp.2-3; Ch.5 "View Operations", p.46,
		 * "Transactions", p.49). Absent or `false` (today's behavior under
		 * Mac OS 8 and System 7, until their parity check): SimpleText's
		 * close box, File ▸ Close and Quit close the window and discard the
		 * working copy. `true` (Windows 98's Notepad): a document whose text
		 * differs from its file (an untitled one: holds any text) shows
		 * Notepad's message box, "The text in the <name> file has changed.",
		 * "Do you want to save the changes?", with Yes (the default), No and
		 * Cancel: Yes saves (an untitled one through Save As…) and closes once
		 * saved, No discards and closes, Cancel keeps the window open. Quit
		 * asks for each changed document in turn, a Cancel stopping it.
		 */
		confirmUnsavedClose?: boolean;
		/**
		 * What opening a document or folder that is already open does (WIG
		 * Ch.5 "View Operations", p.46; Ch.9 "Single Document Window
		 * Interface", p.175). Absent or `false` (today's behavior): the app is
		 * brought forward with its last-focused window, which may be another
		 * document's. `true` (Windows): the document's or folder's own window
		 * comes forward and takes the focus (the kernel's generic `*OpenFile`
		 * route, the PDF and Picture Viewers' OpenFile cases, the Finder's
		 * `ClassicyAppFinderOpenFolder`).
		 */
		reopenActivates?: boolean;
	};
	/**
	 * The mouse's press discipline (WIG Ch.4 "Mouse Actions", pp.24-25).
	 * Optional. `"mac"` (the default): a tab is chosen when the button comes
	 * up over it (`ClassicyTabs`); a non-file icon follows the pointer from
	 * its first move (`ClassicyDesktopIcon` keeping where it was grabbed,
	 * `ClassicyIcon` without `onFileDrag` centered under it); and any button
	 * drags a split view's divider, a table's column edge and a non-file
	 * icon. `"windows"`: a tab is chosen at the button-1 press (comctl32
	 * selects on WM_LBUTTONDOWN: Windows 98 as shipped, over the 1995 text's
	 * release); a non-file icon moves only once the pointer is 4 px from
	 * the press (SM_CXDRAG), keeping where it was grabbed; and only button 1
	 * drags (`isClassicyGestureButton`), a desktop icon ignoring the middle
	 * button and the others altogether (button 2 still selects it).
	 */
	mouse?: "mac" | "windows";
	/**
	 * How the keyboard takes part in a gesture. Optional, as is each key.
	 */
	input?: {
		/**
		 * Whether Escape takes back a direct manipulation in progress (WIG
		 * Ch.1 "Forgiveness", pp.2-3; Ch.4 "Shortcut Keys", p.27). Absent or
		 * `false` (Mac OS 8): only a file drag, an on-release thumb drag, a
		 * pop-up and a combo list cancel on Escape. `true` (Windows): while a
		 * split view's divider, a slider's thumb, a non-file icon or a
		 * table's column edge is dragged, Escape puts it back where the press
		 * found it and ends the drag, the key going no further
		 * (`useClassicyEscapeCancel`).
		 * In HyperCard's editor, Escape on the card or in the Tools palette
		 * first disarms an armed part tool (the one-shot placing mode, WIG
		 * Ch.1 "User in Control", p.1: a mode is easy to cancel), and only
		 * at the next press deselects the part.
		 */
		escapeCancels?: boolean;
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
 * Labels for a package's own fonts, as UI metadata: name → `{ label }`. The
 * fonts themselves are theme data, under `typography.families.<name>`
 * (`ClassicyThemeFontFamily`), emitted as `--package-font-<name>`; the
 * Appearance Manager's Fonts tab lists a theme's families under these labels
 * (in this order), and `ClassicyDesktopChangeFont { family, font }` and
 * `ClassicyDesktopChangeFontSize { family, fontSize }` edit them.
 */
export type ClassicyAppearanceFontFamilies = Record<string, { label: string }>;

/** What a package's theme file importer returns: a theme to validate, or why
 * the file cannot be read. */
export type ClassicyAppearanceThemeImport =
	| { ok: true; theme: unknown }
	| { ok: false; error: string };

/**
 * A package's importer for another system's theme files (Windows 98's
 * `.theme` files), offered by the Appearance Manager's Load Theme… while the
 * package is active: a file whose name ends in one of `extensions` (lower
 * case, with the dot) is read as text and handed to `read`, and the theme it
 * returns is validated as a Classicy theme file's would be
 * (`readClassicyTheme`) before `ClassicyDesktopImportTheme` adds it as a
 * custom theme. A package without one leaves Load Theme… taking Classicy's
 * own theme files alone.
 */
export type ClassicyAppearanceThemeFileImporter = {
	/** File name extensions, lower case with the dot (`[".theme"]`). */
	extensions: readonly string[];
	/** The file's text and its name, as the theme or the reason it fails. */
	read: (text: string, fileName: string) => ClassicyAppearanceThemeImport;
};

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
	/** UI metadata per package font (`defaults.typography.families`). */
	fontFamilies?: ClassicyAppearanceFontFamilies;
	/**
	 * Reads another system's theme files for Load Theme… while the package
	 * is active (Windows 98's `.theme`); validated as a theme file's theme.
	 */
	themeFileImporter?: ClassicyAppearanceThemeFileImporter;
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
