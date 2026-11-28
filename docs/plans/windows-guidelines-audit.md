# Windows Interface Guidelines — Windows 98 Appearance Package Compliance Audit

_Last updated: 2026-11-25_

## About this document

This is the compliance audit of `@classicy/appearance-windows98`, the Windows 98
Appearance Package (`packages/appearance/windows98`), against Microsoft's
**Windows Interface Guidelines** of 1995, the design authority for the look of
Windows 95 that Windows 98 kept. It records, per chapter group, the normative
rules that apply to Classicy, the current state of each, the fixes applied and
the changes made to the core for them. It is the Windows counterpart of
[`hig-audit.md`](hig-audit.md), the Platinum audit against Apple's Mac OS 8
Human Interface Guidelines, and follows its shape.

The first pass audited Chapters 3, 6, 7, 8, 13 and 14 and Appendix C; the
second covers every other chapter and appendix (Ch.1, 2, 4, 5, 9, 10, 11, 12
and Appendices A, B, D and E), so the whole book is now audited. The chapters
appear in the book's order. Every finding's Status column, and the table under
"Status after the Windows 98 completion program" at the end, record where the
Windows 98 shell (plan 0020-w98) and the three follow-up lanes (menus and
controls; Windows 98 SE's art; selection, files, documents, help and keyboard)
left it, by commit on branch `claude/macos-ui-components-audit-li9fxm`
(PR #346). Each finding's **Details & fixes** bullet records the finding as it
was audited, with the fix it proposed then.

### Sources

| Short name | Document | Role |
| --- | --- | --- |
| **WIG** | _The Windows Interface Guidelines — A Guide for Designing Software_, Microsoft, February 13, 1995 (the pre-release of the Microsoft Press book; `packages/appearance/windows98/resources/Microsoft_WindowsInterfaceGuidelines_1995.pdf`, 372 PDF pages) | **Authoritative** for the look: colors, border styles, control states, sizes in pixels and dialog base units, layout, fonts, and the behavior Windows 95 attached to them. |
| Windows 98 as shipped | The operating system's own drawing and behavior (`user32`/`comctl32`/`shell32`/`explorer`, documented pixel for pixel by Wine's `uitools.c`, `button.c`, `scroll.c`, `menu.c`, `trackbar.c`, `progress.c`, by ReactOS, and by 98.css and os-gui; the Windows 98 SE CD's own resources, strings and INF files) | Fills in what the 1995 text leaves to figures (pixel offsets, the title-bar gradient, flat toolbar buttons). **Where the text of 1995 and the OS as shipped differ, the OS wins**, and the choice is recorded. |

### Citation scheme

Findings cite **WIG by chapter, topic heading and printed page**, e.g.
`WIG Ch.6 "Title Bars" (p.76)`, with the figure or table where one carries the
rule (`Figure 6.1`, `Table 7.4`). The printed page is **derived from each
chapter's opening page**: in this pre-release PDF every running head carries
one placeholder number per chapter (every Ch.6 page reads "95", every Ch.7 page
"143", every Ch.13 page "325"), so only the chapter openers, which print their
true folio, anchor the numbering. The offsets used throughout this document:

| Chapter | Opener | Printed page = | Covered here |
| --- | --- | --- | --- |
| Ch.1 Design Principles and Methodology | PDF 18 = p.1 | PDF − 17 | pp.1–10 (PDF 18–27) |
| Ch.2 Basic Concepts | PDF 28 = p.11 | PDF − 17 | pp.11–13 (PDF 28–30) |
| Ch.3 The Windows Environment | PDF 31 = p.15 | PDF − 16 | pp.15–19 (PDF 31–35) |
| Ch.4 Input Basics | PDF 36 = p.23 | PDF − 13 | pp.23–33 (PDF 36–46) |
| Ch.5 General Interaction Techniques | PDF 47 = p.35 | PDF − 12 | pp.35–72 (PDF 47–84) |
| Ch.6 Windows | PDF 85 = p.75 | PDF − 10 | pp.75–96 (PDF 85–106) |
| Ch.7 Menus, Controls, and Toolbars | PDF 107 = p.97 | PDF − 10 | Menus pp.97–110, Controls pp.110–135, Toolbars and Status Bars pp.136–140 (PDF 107–150) |
| Ch.8 Secondary Windows | PDF 151 = p.145 | PDF − 6 | pp.145–170 (PDF 151–176) |
| Ch.9 Window Management | PDF 177 = p.175 | PDF − 2 | pp.175–187 (PDF 177–189) |
| Ch.10 Integrating with the System | PDF 190 = p.189 | PDF − 1 | pp.189–214 (PDF 190–215) |
| Ch.11 Working with OLE Embedded and OLE Linked Objects | PDF 216 = p.219 | PDF + 3 | pp.219–265 (PDF 216–262) |
| Ch.12 User Assistance | PDF 263 = p.273 | PDF + 10 | pp.273–292 (PDF 263–282) |
| Ch.13 Visual Design | PDF 283 = p.295 | PDF + 12 | pp.295–321 (PDF 283–309) |
| Ch.14 Special Design Considerations | PDF 310 = p.327 | PDF + 17 | pp.327–344 (PDF 310–327) |
| Appendix A Mouse Interface Summary | (stale "261"; from App. B's and C's openers) | PDF + 20 | pp.349–356 (PDF 329–336) |
| Appendix B Keyboard Interface Summary | PDF 337 = p.357 | PDF + 20 | pp.357–360 (PDF 337–340) |
| Appendix C Guidelines Summary | PDF 341 = p.361 | PDF + 20 | pp.361–366 (PDF 341–346) |
| Appendix D Supporting Windows 95 and Windows NT Version 3.51 | PDF 347 = p.367 | PDF + 20 | pp.367–368 (PDF 347–348) |
| Appendix E Localization Word Lists | PDF 349 = p.369 | PDF + 20 | pp.369–376 (PDF 349–356) |

The pre-release's contents page uses the final book's numbers, one to three
pages higher than the openers give; citations use the opener-derived folio.
Each chapter's "Pages read" paragraph records its derivation.

The code comments the fix groups first wrote into the Ch.7, Ch.13 and Ch.14
partials used other derivations (the Ch.7 Controls comments the offset this
document's Controls section first carried, two or three pages high; Ch.13 at
PDF + 14; Ch.14 and App. C from the running head). The package pass
(a2c1d339d) realigned every page number in the partials' comments to this
scheme and checked each against the PDF: Table 7.4 p.113, the menu button
(Figure 7.8) p.114, Option Buttons p.115, Single Selection List Boxes p.120,
Drop-down List Boxes p.122, Tree View Controls pp.123–124, Support for User
Options p.137, Button Border Styles p.301, Option-Set Appearance pp.304–305
(the heading and Figure 13.12), Mixed-Value Appearance p.306, Unavailable
Appearance pp.306–307, Font and Size p.310 (`_PopUpMenu.scss`'s one-size rule)
and p.311 (`_Button.scss`'s 24 × 22 toolbar button, and the nonbold rule
`_AppearanceManager.scss` and `_Placard.scss` cite, which sits on PDF 299 =
p.311 as the Ch.13 checklist row and the 13.2 detail have it, not the p.310
this paragraph first derived for it), Animation p.321, The User's Point of
Focus p.333, Scalability p.334. The topic headings, which do not move, remain
the stable half of every citation.

### What is auditable

The package owns the **look**: every color, bevel, border, glyph, size, font and
spacing, through its themes (`src/windows98.json`: 34 presets, the knob families
and color families), its stylesheet partials
(`src/styles/components/_<Name>.scss`, the bevel helpers `_bevels.scss` and the
pixel-art helpers `_pixel.scss`) and, since the art lane, Windows 98 SE's own
icons, system art, cursors, sounds, wallpapers, patterns and screen savers and
a recreation of MS Sans Serif. The core owns **behavior and structure**: what
parts exist, keyboard handling, focus, how menus open, dialog flow, window
management. A WIG rule about behavior the core already provides is ✅. The
first pass recorded one it lacked as ⚠️ Deferred, since a package cannot add
behavior, and proposed the small additive core hook it needed (a state class,
a custom property, a layout flag); the shell and the follow-up lanes then
built those hooks, each one additive: an optional layout key that only
`windows98.json` declares, an optional prop, or a class only the Windows 98
package reads, so Platinum, System 7 and Storybook's `mirrored` package draw
and behave as before. Theme data (`windows98.json`) is package scope.

### Mac-structure and web-platform adaptations (intentional, NOT findings)

Under its layout the package takes Windows' shell (the taskbar with the Start
menu, the task buttons and the status area; a menu bar in each window;
Minimize to the taskbar; Maximize to the work area); the rest is a Mac OS
structure in Windows dress. These are deliberate and must be preserved:

- **No MDI.** The WIG offers it as an option; nothing requires it.
- **The Mac's application model behind the shell.** Desktop icons are laid
  from the top left (`desktop.iconGridOrigin`); the Apple menu's commands live
  in the Start menu and the App Switcher's in the task buttons; apps keep
  their Mac internal names and identities, shown under Windows 98's names
  (Windows Explorer, Notepad, Display, …) through the package's `apps`
  overrides.
- **Browser-safe chords.** The browser keeps ⌘W/⌘Q, Ctrl+W, Ctrl+N, Ctrl+F4
  and, on some platforms, Alt+Space, Alt+letter and F10; Classicy binds
  Control and Option chords where the browser lets it, spells them as Windows
  does (`menu.shortcutSpelling: "names"`: Ctrl+, Alt+, Shift+) and reads ⌘ as
  Ctrl (`keyboard.command: "ctrl"`). Where a Windows chord cannot be had, the
  residual is recorded in its finding.
- **No OLE and no pen input.** Ch.11's OLE rules and Ch.4's pen rules have no
  Classicy surface; in-page drag and drop and the file clipboard stand in for
  OLE transfer.
- **Windows 98 SE's art, used under fair use.** The icons, system art,
  cursors, sounds, wallpapers, patterns and screen savers are Windows 98 SE's
  own, taken from its CD and credited in the package README; MS Sans Serif is
  a CC BY-SA recreation, since Windows' bitmap `.fon` faces cannot be served
  to a browser.
- **The desktop labels' drop shadow** is a knob (`desktopLabel.shadow`, 1;
  0 = none, stock Windows 98 without the Active Desktop).

### Status legend

- ✅ **Compliant** — already conforms, no change needed.
- 🔧 **Fixed** — deviation found and corrected (file named; the changes are
  committed on branch `claude/macos-ui-components-audit-li9fxm`, PR #346: the
  first pass's e9e424f20 the package-scope fixes, 01758bd05 the two core hooks;
  the follow-up pass: 751ac4026 the menu hooks with the bullet and bold rules,
  6ad402bcc the window hooks with the Restore mark and the fixed frame,
  e013ae28c the scroll-arrow hook with its emboss, a2c1d339d the package pass
  (8.8, 8.10, 13.7, 13.10, the dead `menuFrame` knobs, the citations),
  557289452 the set well's outline reset and the menu rules' pin; every later
  fix names its commit in the Status column and in the closing table).
  **Fixed in part** names what is done and, after a semicolon, what is open.
- ⚠️ **Deferred** — real deviation, still open; the Status column and the
  closing table give the reason.
- ➖ **N/A** — WIG rule with no Classicy surface, or an intentional adaptation.

Severities: **HIGH** (a visible contradiction of the Windows look a user
notices at once), **MEDIUM** (a visible gap in a common surface), **LOW** (a
pixel, a state or an uncommon surface).

---

## Chapter 1 — Design Principles and Methodology; Chapter 2 — Basic Concepts

Pages read: PDF 3 (the contents) and PDF 18–30 in full, PDF 28–30 also as
images; neither chapter has a figure. Both chapters print their opener's true
folio (Ch.1's PDF 18 prints "1", Ch.2's PDF 28 prints "11"; every other running
head carries the placeholder "11" or "13"), so printed page = PDF − 17 for both:
Ch.1 is PDF 18–27 = pp.1–10, Ch.2 is PDF 28–30 = pp.11–13. The contents page
uses the final book's numbers, one to three pages higher than the openers give
(it lists Ch.2 at p.13 and Ch.3 at p.17, where the openers print 11 and 15);
citations use the opener-derived folio. Ch.1 is principles: its rules with a
surface are control, modes, consistency with the environment, forgiveness,
feedback and single-click alternatives; its process topics (the design team, the
design cycle, usability testing) are ➖. Ch.2's rules are data-centered design,
persistence of view state and properties.

The adaptation list ("Mac-structure and web-platform adaptations") re-checked
against these chapters: the one screen menu bar, the absence of a taskbar, Start
menu and window buttons, and Minimize drawn on the collapse box are requirements
for the Windows shell (plan 0020-w98), recorded here as ⚠️ the Windows shell
(1.6–1.11); "desktop icons as the Mac lays them" no longer applies, since
`windows98.json` declares `iconGridOrigin: "top-left"`; the Mac menu content is
the shell's (About, Exit), except the ellipsis before a confirmation alert, a
core deviation (1.13); the browser-safe chords justify which chords are bound,
not their spelling or the missing access keys (1.12); no OLE and no pen stay ➖,
with their reasons; the art rule forbids copying Microsoft's artwork, not
drawing original art in Windows 95's style (1.14); the desktop labels' shadow
knob is user customization (✅). MDI stays ➖: the WIG offers it as an option and
nothing in Ch.1–2 requires it.

Normative checklist (WIG Ch.1 and Ch.2) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| Ch.1 "User in Control" (p.1) | The user starts actions, not the software; automation and constraints leave the user freedom of choice. | core ClassicyMenuProvider (`DEFAULT_IDLE_TIMEOUT_MS` 15000); `ClassicyWindowOpen`'s focus rules; the screen saver (Windows 98 offers none, so no idle timer); the startup screen (once a session) | 🔧 see 1.1 |
| Ch.1 "User in Control" (p.1) | Users customize the interface; software reflects the user's color and font settings. | `windows98.json` (18 presets, color families, six knob families with min and max); every partial's tokens (`_bevels.scss`); the Appearance Manager (Themes, Colors, Fonts, Metrics, Options) | ✅ |
| Ch.1 "User in Control" (p.1); "Directness" (pp.1–2) | A setting's visible choice names what it changes, so the user recognizes rather than recalls it. | core Colors tab (`ClassicyAppearanceManager.Colors.tsx` over `CLASSICY_THEME_COLOR_TARGETS`, the core's generic names) | 🔧 see 1.2 |
| Ch.1 "User in Control" (p.1) | Avoid modes; a mode that is the best design is visible, explicitly chosen and easy to cancel. | HyperCard editor palette (`.classicyHyperCardPaletteEntry` with `selected`), `_HyperCard.scss`; `HyperCardEditorOverlay.tsx`'s Escape | 🔧 see 1.3, 1.4 |
| Ch.1 "User in Control" (p.1) | Other modes are visible and cancelable. | modal windows (scrim; Escape or Cancel), the keyboard-equivalent capture dialog, Balloon Help (a titled toggle), file drags and menus (Escape) | ✅ |
| Ch.1 "Directness" (pp.1–2) | Users manipulate objects directly and see the effect on screen. | core `drawClassicyDragOutline`, drop targets drawn selected (`_Desktop.scss`, `_Icon.scss`), the window drag band (`_Window.scss`), live scroll thumbs and split dividers, Appearance Manager edits applied at once | ✅ |
| Ch.1 "Directness" (pp.1–2) | Familiar metaphors; information and choices kept visible. | folders holding any object (Applications, Desktop Folder); `_Menu.scss`'s shortcut column; balloons drawn as ToolTips | ✅ |
| Ch.1 "Consistency" (p.2) | Within a product, the same command for functions that seem alike. | core `moveClassicyItemsToTrash` (menu, Control-Backspace, Delete, drag), open on double-click and Enter (`ClassicyIcon`, `ClassicyDesktopIcon`), one OpenFile route | ✅ |
| Ch.1 "Consistency" (p.2) | A consistent visual presentation within the product. | `_Window.scss` (the header's etched line); the Assistant's header (no rule) | 🔧 see 1.5 |
| Ch.1 "Consistency" (p.2) | Follow the environment's conventions so users apply skills they have. | `windows98.json` `layout` (`iconGridOrigin` top-left, `growBoxCorner` bottom-right, `scrollBar.fitsBars` shown, `fileDialog` flat with `saveName` selected); caption buttons reordered by `order` | ✅ (gaps 1.6–1.16) |
| Ch.1 "Consistency" (p.2); Ch.2 "Putting Theory into Practice" (p.13); Ch.7 "The File Menu" (p.98), "The Help Menu" (p.99) | Each primary window carries its own menu bar acting on its selection; File ends with Exit (Close for a folder); Help holds About last. | `layout.menuBar.placement` "screen" (one Mac-style bar); core ClassicyWindowMenuBar (`placement: "window"`); `_Window.scss` window bar rule | ⚠️ see 1.6 (shell) |
| Ch.1 "Understanding Users" (p.9); Ch.3 "Window Buttons" (p.15), Figure 3.1 | Every open primary window keeps a taskbar button that brings it back with one click. | `_MenuBar.scss` (the front application's single button); core Hide/Hide Others/Show All | 🔧 see 1.7 (shell) |
| Ch.1 "Understanding Users" (p.9); Ch.2 "Persistence" (p.12) | A minimized window stays reachable from its button and keeps its size and place for Restore. | core collapse box (WindowShade) under the package's Minimize mark | 🔧 see 1.8 (shell) |
| Ch.1 "Understanding Users" (p.8), "Simplicity" (p.3); Ch.3 "The Start Button" (p.15) | Applications open with single clicks; choices disclosed progressively. | `_MenuBar.scss` `.classicyDesktopMenuApple` (the Apple menu as the Start button, its art only) | ⚠️ see 1.9 (shell) |
| Ch.1 "Consistency" (p.2); Ch.3 "The Status Area" (p.16) | Status indicators and the clock sit in the taskbar's status area, opposite Start. | `_MenuBar.scss` tray icons and clock pane; core ClassicyControlStrip (a separate floating strip) | 🔧 see 1.10 (shell) |
| Ch.1 "User in Control" (p.1), "Simplicity" (p.3); Ch.3 "The Taskbar" (p.15) | The user moves the taskbar to another edge by a plain drag. | the screen menu bar, fixed at the top | ⚠️ see 1.11 (shell) |
| Ch.1 "Consistency" (p.2); Ch.7 "Shortcut Keys in Menu Items" (p.110); Ch.4 "Shortcut Keys" (p.27) | Keyboard conventions as Windows has them: Ctrl+, Alt+, Shift+ spelled out, access keys underlined, no Alt+letter shortcuts. | core ClassicyKbd / ClassicyKeyboardShortcut (glyphs), ClassicyMenuItem (no access key) | 🔧 see 1.12 |
| Ch.1 "Consistency" (p.2); Ch.7 "Types of Menu Items" (pp.107–108) | An ellipsis only on a command that needs more information; none before a message box. | core `ClassicySpecialMenu.tsx` ("Empty Trash…", "Reset PRAM…"), the Trash icon's "Empty Trash…" (`Finder.tsx`) | 🔧 see 1.13 |
| Ch.1 "Consistency" (p.2); Ch.2 "Putting Theory into Practice" (p.13); Ch.13 "Icon Design" (pp.314–316), "Pointer Design" (pp.316–317) | Icons, pointers and system art follow the environment's conventions. | core asset registry (the active package, then the default package); the package registers no art, icons or cursors | 🔧 see 1.14 |
| Ch.1 "Consistency" (p.2) | System objects carry the environment's names (the Recycle Bin). | core Trash desktop icon (`Finder.tsx`, `name: "Trash"`), the Trash window title; `apps` display overrides reach `app_shortcut` icons only | 🔧 see 1.15 |
| Ch.1 "Consistency" (p.2), "Feedback" (p.3) | The startup sequence and its sound follow the environment. | core ClassicyStartupScreen (`ClassicyBoot`, the extensions parade); the Windows 98 sound pack (no `ClassicyBoot`) | 🔧 see 1.16 |
| Ch.1 "Consistency" (p.2) | A behavior matches its metaphor (a wastebasket keeps what is thrown in). | core `ClassicyTrash.ts` (`_trashedFrom`, Restore), Empty Trash after a warning | ✅ |
| Ch.1 "Forgiveness" (pp.2–3) | Offer only appropriate choices; warn before damage; make actions reversible. | unavailable commands embossed (`_Menu.scss` `b.disabled-text`); warnings before Empty Trash, Initialize, Reset PRAM; Restore; built-in themes forked, never mutated; bounded knobs; locked items refused; HyperCard's unsaved guard | ✅ |
| Ch.1 "Forgiveness" (pp.2–3) | Warn before an action that may damage data, such as closing a document with unsaved changes. | core `SimpleText.tsx` (Close, the close box and Quit discard the working copy) | 🔧 see 1.17 |
| Ch.1 "Forgiveness" (pp.2–3); Ch.4 "Shortcut Keys" (p.27) | A direct-manipulation gesture in progress can be taken back with ESC. | core ClassicyWindow move and resize, ClassicySplitView, ClassicySlider, the Control Strip's drags, the desktop's selection rectangle, a non-file icon drag, a table's column resize | 🔧 see 1.18 |
| Ch.1 "Feedback" (p.3) | Visual, and sometimes audio, feedback for every interaction, timely and close to it. | pressed states in 13 partials, the Hilight band in menus, the dotted focus rectangle, drop targets drawn selected; the pack's alert tones; no click sounds (Windows' scheme assigns none) | ✅ |
| Ch.1 "User in Control" (p.1), "Feedback" (p.3); Ch.7 "Drop-down Menu Interaction" (p.97) | Choosing a menu item removes the menu and carries out the command at once. | core `ClassicyMenu.tsx` (`FLASH_ACTION_FALLBACK_MS` 400, `finishFlash`); the package registers no MenuItem hook | 🔧 see 1.19 |
| Ch.1 "Feedback" (p.3) | Show a process's state and how to cancel it; no dead screen; feedback suited to the task. | `PDFViewerDocument.tsx` and `ClassicyFileDialog.tsx` "Loading…", the startup screen's progress bar, alerts as message boxes; closing a window cancels its load | ✅ |
| Ch.1 "Aesthetics" (p.3) | Every element competes for attention; a pleasant environment that aids understanding. | every partial (Windows 98's own elements from tokens; the caption gradient the only gradient) | ✅ |
| Ch.1 "Simplicity" (p.3) | Minimum information, terse names, natural mappings, progressive disclosure. | `windows98.json` labels; caption buttons grouped (Close after `closeGap` 2); the tray grouped at the right | ✅ |
| Ch.1 "Simplicity" (p.3) | Never make a modifier key the only way to a basic function. | core `ClassicyControlStrip.tsx` (moving and docking by Control-drag only); Option-click collapse-all is an accelerator only | 🔧 see 1.20 |
| Ch.1 "A Balanced Design Team" (p.4) | Staff the team across disciplines. | none (process) | ➖ |
| Ch.1 "The Design Cycle": "Design" (p.4) | Document the design. | this audit; `docs/AGENT-REFERENCE.md` §8; each partial's header comment | ✅ |
| Ch.1 "The Design Cycle": "Prototype" (pp.4–5) | Prototype the design. | `Windows98.stories.tsx`, `storybook/.storybook/windows98.ts`, the example app | ✅ |
| Ch.1 "Test", "Iterate" (p.5); "Usability Assessment in the Design Process" (pp.5–8) | Usability-test with the target audience; iterate. | none (a process with people; `bin/parity` and vitest are quality assurance, which p.5 distinguishes) | ➖ |
| Ch.1 "Understanding Users" (p.8) | Do not make double-clicking and dragging the only ways to basic tasks. | core Finder (no File ▸ Open, no Open on item menus, moves by drag only) | 🔧 see 1.21 |
| Ch.1 "Understanding Users" (p.9) | Descriptive: beginners and intermediate users struggle with nesting and moving files. | none (user characteristics; the concrete gap is 1.21) | ➖ |
| Ch.1 "Understanding Users" (p.9) | Shortcuts for advanced users without complexity for others. | core keyboard equivalents, `ClassicyKeyboardEquivalentField`, type-select in lists and tables | ✅ |
| Ch.1 "Understanding Users" (p.9) | Plan for international users and users with disabilities. | none here (Ch.14's rules, audited there; no localization layer) | ➖ |
| Ch.1 "Design Tradeoffs" (pp.9–10) | Advice: weigh each feature; keep the frequent task easy. | none (advice; single selection stays the default in ClassicyListBox and ClassicyTable) | ➖ |
| Ch.2 "Data-Centered Design" (p.11) | Users browse to data and edit it directly; the data's commands come with it. | core `routeClassicyAppOpenFile`, the manifests' `<prefix>OpenFile`; the menu bar follows the focused window | ✅ |
| Ch.2 "Object Characteristics" (p.11) | Expose an object's operations through commands and direct manipulation. | core Finder, the desktop, `ClassicyFileDrag.ts` | ✅ |
| Ch.2 "Relationships" (pp.11–12) | Operations apply to a collection; a container controls what it accepts. | core multiple selection (icon and list views, the desktop marquee), `moveClassicyFileSystemItems`, `fs.move`'s refusals | ✅ |
| Ch.2 "Composition" (p.12) | Interaction consistent at every level of composition. | core ClassicyFileBrowser (icon and list views), ClassicyDesktop | ✅ |
| Ch.2 "Persistence" (p.12) | Preserve data automatically where possible (explicit saving stays acceptable). | core shared live file tree and the store's localStorage subscriber | ✅ |
| Ch.2 "Persistence" (p.12) | Preserve and restore view state: cursor and scroll position, window size and place. | core window records (size, position, zoomed, collapsed), Finder's folder views; no scroll offset or caret | 🔧 see 2.1 |
| Ch.2 "Putting Theory into Practice" (p.12) | Icons mainly for containers that open into windows. | core desktop icons, Finder | ✅ |
| Ch.2 "Putting Theory into Practice" (pp.12–13) | An object's attributes are its properties, mostly in a property sheet. | core Finder (no Properties or Get Info) | 🔧 see 2.2 |
| Ch.2 "Putting Theory into Practice" (p.13) | Operations as menu commands and direct manipulation once selected; pop-up menus. | core ClassicyContextualMenuProvider and ClassicyContextualMenuTarget (innermost wins), Finder's File menu | ✅ |
| Ch.2 "Putting Theory into Practice" (p.13) | Add OLE drag-and-drop. | none (no OLE; in-page drag and drop works) | ➖ |

### Findings — Chapters 1 and 2

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 1.1 | LOW | An open menu the user leaves alone closes itself after 15 s: the software, not the user, ends the interaction. Same as 7.6 / 14.4, still open. | core ClassicyMenuProvider | 🔧 Fixed (08d728581) |
| 1.2 | LOW | The Colors tab labels the core colors with Classicy's generic names (System Palette 1–7, Theme Palette 1–7, Window Border…); the user must know that System Palette 3 is 3D Objects (ButtonFace). A package can label its own family colors, not the core's. | core `ClassicyAppearanceManager.Colors.tsx` | 🔧 Fixed (7bc33b74f) |
| 1.3 | MEDIUM | HyperCard's armed part tool (a one-shot placing mode) is marked only by the `selected` class, which Windows 98 does not draw: the armed entry looks like every other, and a part appears where the user did not expect one. | `_HyperCard.scss` | 🔧 Fixed (d7b4ea532) |
| 1.4 | LOW | Escape in the HyperCard editor deselects the part but leaves an armed placing mode armed. | core `HyperCardEditorOverlay.tsx` | 🔧 Fixed (d7b4ea532) |
| 1.5 | LOW | The Assistant's header band (Apple Guide's window) has no rule under it, where every other header band under Windows 98 has the etched line. | core ClassicyAssistant (`.classicyAssistantHeader`); no Windows 98 rule | 🔧 Fixed (d7b4ea532) |
| 1.6 | MEDIUM | One Mac-style menu bar serves every window; About is in the Apple menu, Quit in the app's menu, Empty Trash and Reset PRAM in Special. | `layout.menuBar.placement` "screen"; core ClassicyDesktopMenuBar | 🔧 Fixed in part (0c937b0e7, ef9a323d7); ⚠️ addendum B1 |
| 1.7 | HIGH | The bar shows one button, the front application's; other windows are reached only through the Application menu or an exposed edge, and Hide sets windows to `display: none` with nothing on screen to show they exist. | `_MenuBar.scss`; core Application menu | 🔧 Fixed (11d0b9502, f21282e6c) |
| 1.8 | MEDIUM | Minimize collapses the window to its caption where it stands (WindowShade), so a minimized window still covers the desktop. | core collapse box | 🔧 Fixed (4c42d9b56, 0c937b0e7) |
| 1.9 | HIGH | The Start button shows Platinum's Apple logo, no "Start" label, and opens the Mac Apple menu; on the desktop an application opens only by double-click or the keyboard. | `_MenuBar.scss` `.classicyDesktopMenuApple`; core ClassicyDesktopMenuBar | 🔧 Fixed in part (22ca9cc74, 8b668e667); ⚠️ addendum B2 |
| 1.10 | LOW | The Control Strip's modules live in a separate floating strip, a Mac construct; the tray holds only the menu bar extensions, Sound and the clock. | core ClassicyControlStrip; `_ControlStrip.scss` | 🔧 Fixed (b86689686, 0c937b0e7) |
| 1.11 | LOW | The bar is fixed at the top of the screen; nothing moves it. | the coming taskbar | 🔧 Fixed in part (c89e4f72a); ⚠️ addendum B5 |
| 1.12 | MEDIUM | Shortcuts are written as Mac glyphs where Windows writes `Ctrl+`; no title or label carries an access key; Option chords are Alt chords on a PC keyboard (Hide Balloons' Option-H is Alt+H, the Help menu's access key). Same as 7.15 and 7.1 / 8.9. | core ClassicyKbd, ClassicyKeyboardShortcut, ClassicyMenuItem | 🔧 Fixed (7470e0537) |
| 1.13 | LOW | "Empty Trash…" (and "Reset PRAM…") opens only a warning alert, yet Windows' Empty Recycle Bin carries no ellipsis; the titles are shared menu data a package cannot change. | core `ClassicySpecialMenu.tsx`, `Finder.tsx` | 🔧 Fixed (7bc33b74f) |
| 1.14 | HIGH | Every picture falls back to Platinum's: the Apple logo as Start, the Mac OS face at startup, the Mac Trash can, Mac drive, folder and document icons, the curved alias arrow, the Mac watch as the busy pointer, the Sad Mac. | the package (registers no art, icons or cursors) | 🔧 Fixed (41de137d5) |
| 1.15 | MEDIUM | The desktop always shows "Trash" (and its window and Empty command say Trash); the package cannot show "Recycle Bin", since display overrides reach `app_shortcut` icons only. | core ClassicyDesktopIcon, `ClassicyAppIdentity.ts`, `Finder.tsx` | 🔧 Fixed (41de137d5) |
| 1.16 | LOW | The pack has no `ClassicyBoot`, so with Platinum registered startup plays Platinum's Mac chime through the fallback; the startup screen shows the Mac OS 7 extensions parade. | `windows98.json` `sound`; `_Desktop.scss` | 🔧 Fixed (7bc33b74f) |
| 1.17 | MEDIUM | SimpleText closes a document window (close box, File ▸ Close, Quit) with unsaved changes without a prompt; the working copy is discarded. HyperCard already asks. | core `SimpleText.tsx` | 🔧 Fixed (3ee697577) |
| 1.18 | LOW | A window move or resize, a split-divider drag, a slider drag, the Control Strip's drags, the desktop's selection rectangle, a non-file icon drag and a column resize cannot be taken back with Escape (file drags and System 7's on-release thumb drag can). | core ClassicyWindow, ClassicySplitView, ClassicySlider, ClassicyControlStrip, ClassicyDesktop, ClassicyDesktopIcon, ClassicyTable | 🔧 Fixed (be51df8bd, 1ed1b21f7) |
| 1.19 | MEDIUM | A chosen item's action waits for its flash to end, with a 400 ms fallback; Windows 98 registers no MenuItem hook, so no flash starts and every menu command runs 400 ms late with the menu still drawn. | the package's hooks (none); `_Menu.scss`; core ClassicyMenu | 🔧 Fixed (7bc33b74f) |
| 1.20 | LOW | Moving the Control Strip up or down, or docking it to the other edge, works only by Control-dragging; neither its control panel nor its contextual menu offers a position. | core ClassicyControlStrip, ClassicyControlStripManager | ➖ (0c937b0e7: no surface under the shell) |
| 1.21 | MEDIUM | Opening a selected item takes a double-click or the keyboard: Finder has no File ▸ Open and the item and desktop-icon menus no Open (the Trash's alone has one); moving an item into another folder works only by drag (no Cut and Paste). | core Finder, ClassicyIcon, ClassicyDesktopIcon, `ClassicyFileMove.ts` | 🔧 Fixed (c1ab2bf24, d7f1b8d3f, 3a30ada87) |
| 2.1 | LOW | Window records keep size, position, zoomed and collapsed, but nothing keeps a scroll offset or a text caret: a reopened Finder window or SimpleText document starts at the top. | core window records, ClassicyScrollArea, ClassicyTextEditor | 🔧 Fixed (3ee697577, 1ed1b21f7) |
| 2.2 | LOW | A file, folder, drive or application has no Properties (name, type, location, size, dates, read-only, hidden), and ALT+ENTER does nothing. Same as 7.11's Properties analogue. | core Finder, desktop icon menus | 🔧 Fixed (57ae34974) |

**Details & fixes**

- **1.1** ⚠️ core layout flag (= 7.6 / 14.4): `layout.menuBar.idleTimeoutMs?:
  number` in the layout schema's `menuBar` object
  (`ClassicyAppearancePackageSchema.ts`), passed by ClassicyDesktopMenuBar and
  ClassicyWindowMenuBar to ClassicyMenuProvider's existing `idleTimeoutMs` prop;
  0 never closes (the provider already returns for ≤ 0), absent keeps 15000, so
  Platinum and System 7 are unchanged; `windows98.json` declares
  `"idleTimeoutMs": 0` in `layout.menuBar`. The rest of the rule passes: a
  window re-registering after a reload never steals focus (`closedThisSession`
  is stripped from saved state), the screen saver never runs under Windows 98
  (the package names no savers, so the overlay arms no idle timer), and the
  startup screen runs once a session. _WIG Ch.1 "User in Control" (p.1)._
- ✅ Ch.1 "User in Control" (p.1), customization: every font in the package is a
  theme token (`var(--ui-font)`, `var(--body-font)`, `var(--ui-font-size)` or
  `inherit`; `_Alert.scss`, `_Icon.scss`, `_Dialog.scss`, `_Table.scss`,
  `_TextField.scss`, `_PopUpMenu.scss`, `_Desktop.scss`), every color a token
  through `_bevels.scss` (`$face`, `$hilight`, `$shadow`, `$dkshadow`, `$text`,
  `$highlight`, `$highlight-text`), enforced by the literal-color sweep. The
  user edits the 28 core colors, the package's 10 family colors (titleBar,
  selection, tooltip, desktop) and the six knob families within their bounds; an
  edit forks the built-in theme into Windows 98's Custom theme and applies at
  once. The host's High Contrast setting is 14.3 and not counted again.
- **1.2** ⚠️ core optional field (additive): `colorLabels?:
  Partial<Record<string, string>>` on ClassicyAppearancePackage (zod-validated),
  keyed by the targets' `cssVar`; `ClassicyAppearanceManager.Colors.tsx` renders
  `labelTitle={activePackage.colorLabels?.[info.cssVar] ?? info.label}`.
  Platinum and System 7 declare none, so their tab is unchanged. The package's
  `index.ts` declares Windows' names: `--color-system-03` "3D Objects",
  `--color-system-01` "Button Highlight", `--color-system-02` "Button Light",
  `--color-system-05` "Button Shadow", `--color-system-07` "Button Dark Shadow",
  `--color-black` "Window Text", `--color-highlight` "Selected Items",
  `--color-window-document` "Window", `--desktop-background-color` "Desktop".
  _WIG Ch.1 "User in Control" (p.1), "Directness" (pp.1–2)._
- **1.3** ⚠️ package
  (`packages/appearance/windows98/src/styles/components/_HyperCard.scss`; fix
  written, not applied): pressing a part entry (Button, Field…) arms a one-shot
  placing mode (`HyperCardEditorOverlay.tsx` l.148–156) marked only by
  `selected` and `aria-pressed`; Platinum draws a check after the entry, Windows
  98 nothing, and the pointer does not change. Fix: inside `@mixin hyper-card`
  (with `@use "../pixel" as *;`), draw the armed entry as a latched toolbar
  button, the option-set appearance: `.classicyHyperCardPaletteEntry.selected {
  color: b.$text; background: repeating-conic-gradient(b.$hilight 0 25%, b.$face
  0 50%) 0 0 / px(2) px(2); @include b.pressed; }`. Scoped to the Windows 98
  block, so no other package changes (System 7 has the same gap; out of scope).
  MEDIUM rather than the legend's LOW for an uncommon surface, because the
  effect is functional. _WIG Ch.1 "User in Control" (p.1); Ch.13 "Option-Set
  Appearance" (pp.304–305), Figure 13.12._
- **1.4** ⚠️ core layout flag: `layout.input?: { escapeCancels?: boolean }`,
  schema-optional, `true` only in `windows98.json` (1.18 uses the same flag). In
  the overlay's Escape branch, when `edit.placing` is set and the flag is on,
  dispatch `{ type: "ClassicyAppHCEditSetPlacing", stackId, partType: undefined
  }` instead of `ClassicyAppHCEditSelect`; today placing ends only by pressing
  the entry again, choosing Browse or Pointer, or placing a part. Platinum and
  System 7 keep today's Escape. _WIG Ch.1 "User in Control" (p.1); Ch.4
  "Shortcut Keys" (p.27)._
- **1.5** ⚠️ package (fix written, not applied): of every `.classicy*` class
  Platinum's sheet styles and Windows 98's does not, all are Platinum-only (the
  menu flash, the savers, the red alert bar, split arrows, the fixed modal)
  except `.classicyAssistantHeader`, which Platinum gives the window-header
  border and Windows 98 nothing. Fix: the etched line `.classicyWindow
  .classicyWindowHeader` draws (`_Window.scss` l.507), `.classicyAssistantHeader
  { box-shadow: inset 0 #{b.$neg-b} b.$hilight, inset 0 #{b.$neg-b2} b.$shadow;
  }`, in 12.23's new `_Assistant.scss`; in the Apple Guide window 12.19's line
  under the non-scrolling region takes its place. _WIG Ch.1 "Consistency"
  (p.2)._
- ✅ Ch.1 "Consistency" (p.2), the environment's conventions: where a layout flag
  exists the package already takes Windows' arrangement (icons fill from the top
  left, the grip at the lower right, fitting scroll bars stay drawn, the file
  dialogs navigate one folder at a time and preselect the name, the caption
  buttons reordered by `order`). The gaps no flag closes are 1.6–1.16.
- **1.6** ⚠️ the Windows shell (plan 0020-w98, §4): requirements. Set
  `layout.menuBar.placement: "window"`: every primary (document) window with an
  `appMenu` draws its own bar under its caption, secondary windows none (Ch.8
  p.145); the core's `placement: "window"` already makes the screen bar headless
  (chords still dispatch), zeroes `--menu-bar-height` and mounts
  ClassicyWindowMenuBar, which `_Window.scss` draws flat ButtonFace. File's last
  item is Exit after a separator, Close for Finder's folder windows (p.98);
  About <display name> goes last in the window's Help menu (p.99), and the move
  into the Apple menu stops under the shell; the Special menu's commands go
  where Windows keeps them (Empty Recycle Bin on the Trash's own menu, which
  exists, `Finder.tsx` l.619); titles carry access keys (4.11). _WIG Ch.1
  "Consistency" (p.2); Ch.2 "Putting Theory into Practice" (p.13); Ch.7 "The
  File Menu" (p.98), "The Help Menu" (p.99)._
- **1.7** ⚠️ the Windows shell (plan 0020-w98, §2 "Task buttons"): requirements.
  One button per open primary window (every app's document windows and Finder's
  folder windows; no dialogs, utility windows or extensions), each showing its
  16-px icon and title, sized to fit and abbreviated with a ToolTip when narrow
  (Ch.3 p.15); the active window's button pressed over the
  ButtonHilight/ButtonFace checker with a bold label, the others raised (Figure
  3.1, the existing `taskbar-button` and `taskbar-button-pressed` mixins); one
  click activates the window, restoring it if minimized (1.8). Under the shell a
  hidden app's windows keep their buttons, or the Hide commands are not offered.
  _WIG Ch.1 "Understanding Users" (p.9); Ch.3 "Window Buttons" (p.15), Figure
  3.1._
- **1.8** ⚠️ the Windows shell (plan 0020-w98, §5, `window.collapse:
  "minimize"`): requirements. The caption's Minimize hides the window into its
  taskbar button, not WindowShade, and activates the next window by z-order; the
  button restores it at its stored size and position, which persist in the
  window record. _WIG Ch.1 "Understanding Users" (p.9); Ch.2 "Persistence"
  (p.12); Ch.6 "Minimizing Windows" (p.85)._
- **1.9** ⚠️ the Windows shell (plan 0020-w98, §3): requirements. A raised Start
  button at the bar's end with a bold "Start" label after an original 16-px
  glyph (not the Apple art; the Windows flag is Microsoft's mark), pressed over
  the checker while open; one click opens the Start menu; its Programs cascade
  lists every registered application shown in Applications
  (`showInApplicationsFolder`), each opening on a single click (10.7); a
  Settings cascade lists the control panels; the Apple menu's host items move
  here; cascades follow 7.12's delays. _WIG Ch.1 "Understanding Users" (p.8),
  "Simplicity" (p.3); Ch.3 "The Start Button" (p.15)._
- **1.10** ⚠️ the Windows shell (plan 0020-w98, §2 "The tray"): requirements.
  The status area, at the end opposite Start, holds the clock and the indicators
  (Sound and each extension's icon, each with a ToolTip, 10.18), a double-click
  opening the owning control panel (10.17); the Control Strip's modules move
  into the tray, so the strip is not drawn under the package and 1.20 becomes ➖.
  Figure 10.2 puts the icons inside the clock's sunken pane (10.14). _WIG Ch.1
  "Consistency" (p.2); Ch.3 "The Status Area" (p.16)._
- **1.11** ⚠️ the Windows shell (beyond plan 0020-w98's scope, which leaves
  "moving the taskbar to another edge" out): requirements. Dragging an empty
  part of the taskbar, with no modifier, docks it to the nearest screen edge
  (bottom by default), persisted in desktop state; dragging its inner edge, with
  the sizing pointer showing there, resizes it (4.13); maximized windows fill
  the rest of the screen (6.6); pull-downs and the Start menu open toward the
  desktop. _WIG Ch.1 "User in Control" (p.1), "Simplicity" (p.3); Ch.3 "The
  Taskbar" (p.15); Ch.4 "Mode Keys" (p.27)._
- **1.12** ⚠️ core hooks (= 7.15 and 7.1 / 8.9; lane L2-B is building them):
  7.15's `layout.menu.shortcutSpelling: "names"` in `windows98.json`, rendered
  by ClassicyKbd and ClassicyKeyboardShortcut as Control = `Ctrl+`, Option =
  `Alt+`, Shift = `Shift+`, and Command = `Ctrl+` off a Mac (matching
  `shortcutMatchesEvent`'s meta-or-ctrl); 7.1's `accessKey?: string` on
  ClassicyMenuItem and control labels, rendered as
  `data-classicy-part="access-key"` under 4.11's `layout.keyboard.accessKeys`,
  which `_Menu.scss` and `_MenuBar.scss` underline. Both are absent from
  Platinum's and System 7's JSON. The browser-reserved keys (Ctrl+W/T/N,
  Alt+Space, F10) justify only the choice of chords; the Alt+letter collisions
  are 4.14. _WIG Ch.1 "Consistency" (p.2); Ch.7 "Shortcut Keys in Menu Items"
  (p.110); Ch.4 "Shortcut Keys" (p.27)._
- **1.13** ⚠️ core optional field and layout flag (additive): `confirms?:
  boolean` on ClassicyMenuItem; the three items become `title: "Empty Trash",
  confirms: true` (and Reset PRAM likewise), and ClassicyMenu appends the
  ellipsis to a confirming item's title unless `layout.menu.confirmEllipsis ===
  false`, which only `windows98.json` declares; Platinum and System 7 still read
  "Empty Trash…" and "Reset PRAM…". With 1.15 the Windows title reads "Empty
  Recycle Bin". _WIG Ch.1 "Consistency" (p.2); Ch.7 "Types of Menu Items"
  (pp.107–108)._
- **1.14** ⚠️ package art (lane 3 is drawing it): from
  `packages/appearance/windows98/src/index.ts`, register original art in Windows
  95's style, never copied Microsoft art. System art,
  `registerClassicySystemArt("windows98", { … })`: `appleMenu` (the Start
  glyph), `startupLogo`, `aboutLogo`, `trashEmpty`, `trashFull`, `helpButton`,
  `sadMac` (a fatal-error picture; the crash screen resolves system art at
  render); the `aliasBadge` is drawn as theme-token pixel art instead (11.1).
  Cursors, `registerClassicyCursors("windows98", { arrow, watch (an hourglass),
  ibeam, hand, crosshair, resizeLr, resizeUd, resizeNwse, resizeNesw })` (4.2,
  4.3). Icons, `registerClassicyAssets("icons", "windows98", { system: { … } })`
  for drives, folders, documents and applications at 16 and 32 px (10.5). Then
  extend `bin/verify-dist.mjs`'s exact `dist/assets` list (today `windows98.svg`
  and the two sprites) and the docs that say the package registers no art. _WIG
  Ch.1 "Consistency" (p.2); Ch.2 "Putting Theory into Practice" (p.13); Ch.13
  "Icon Design" (pp.314–316), "Pointer Design" (pp.316–317)._
- **1.15** ⚠️ core display override (additive, display only): extend the `apps`
  display-override resolution to the Trash, `kind === "trash"` with appId
  `"Trash"` (`Finder.tsx` adds it as `{ id: "Trash", name: "Trash" }`), in three
  places: ClassicyDesktopIcon (today it resolves overrides for `app_shortcut`
  only), the Trash window's title (`useClassicyAppIdentity("Trash", { name:
  "Trash" })` where `isClassicyTrashFolder`) and the Empty item's title, built
  as `Empty ${name}` (1.13 adds the ellipsis back for the Mac packages).
  `windows98`'s registration declares `apps: { Trash: { name: "Recycle Bin" }
  }`; Platinum and System 7 declare no `apps`, so their labels stay.
  `CLASSICY_TRASH_PATH` and the persisted bytes never change. Raised to MEDIUM
  with 10.22, which found the same: the label is on every desktop. The command's
  own name ("Move To Trash" → Delete) is 5.39. _WIG Ch.1 "Consistency" (p.2);
  Ch.10 "Recycle Bin Integration" (p.212)._
- **1.16** ⚠️ package (fix written, not applied): (a) in `windows98.json`, set
  the defaults and all 18 presets to `"sound": { "pack": "windows98",
  "disabled": ["ClassicyBoot"] }` (a theme's disabled list silences that sprite,
  `ClassicySoundManagerUtils.tsx` l.213–214), or add an original synthesized
  `ClassicyBoot.wav` to `src/assets/sounds/windows98/sprites/` and run `pnpm
  build:audio`; (b) in `_Desktop.scss`'s startup-screen section,
  `.classicyStartupScreenExtensions { display: none; }` (a package may hide a
  part). _WIG Ch.1 "Consistency" (p.2), "Feedback" (p.3)._
- **1.17** ⚠️ core layout flag: `layout.document?: { confirmUnsavedClose?:
  boolean }`, `true` only in `windows98.json`. Under it SimpleText passes
  `onBeforeClose` to each document window; a document is dirty when
  `pathContent[path] !== fs.resolve(path)._data`, or an untitled one has text. A
  dirty document shows a ClassicyAlert, "Do you want to save the changes you
  made to “<title>”?", with Yes (default), No and Cancel: Yes saves (an untitled
  one through Save As…, closing once saved), No closes and discards, Cancel
  vetoes the close. File ▸ Close routes through the same guard, and Quit walks
  the dirty documents one at a time, as HyperCard's `handleQuit` does (its
  `onBeforeCloseMain`, `HyperCard.tsx` l.278–283, is the model). Mac OS 8 asks
  the same question, so the Mac packages may adopt the flag after their own
  parity check; until then they are unchanged. Also 5.25. _WIG Ch.1
  "Forgiveness" (pp.2–3); Ch.5 "View Operations" (p.46), "Transactions" (p.49)._
- **1.18** ⚠️ core layout flag (1.4's `layout.input.escapeCancels`, `true` in
  `windows98.json`; 4.16 is the same finding from Ch.4): for each gesture's
  duration, a capture-phase `keydown` listener on the document; Escape restores
  the state at the gesture's start, prevents the key and ends the gesture the
  way `onClassicyPointerStreamLost` ends it. ClassicyWindow dispatches the
  window back to its start rect (move and resize), ClassicySplitView restores
  its sizes, ClassicySlider its value, ClassicyControlStrip its position and
  width, ClassicyDesktop the selection before the rectangle, ClassicyDesktopIcon
  a non-file icon's location (or 5.36's outline drag cancels), ClassicyTable the
  column width. Platinum and System 7 declare nothing. _WIG Ch.1 "Forgiveness"
  (pp.2–3); Ch.4 "Shortcut Keys" (p.27)._
- **1.19** ⚠️ package (`packages/appearance/windows98/src/index.ts`,
  `_Menu.scss`; fix written, not applied): `handleClick` arms the 400 ms
  fallback, and `handleAnimationEnd` (`ClassicyMenu.tsx` l.736–740) runs
  `finishFlash` for any animation that ends on the item itself while it flashes.
  So register `hooks: { on: { MenuItem: { press: () => ({ className:
  "windows98MenuItemChosen" }), release: () => ({}) } } }`, deeply frozen as
  Platinum's hooks are, playing no sound, and in `_Menu.scss`
  `.classicyMenuItem.windows98MenuItemChosen { animation:
  windows98MenuItemChosen 1ms steps(1, end); }` with `@keyframes
  windows98MenuItemChosen { to { opacity: 1; } }`, declared as Platinum's
  `_Menu.scss` declares its flash keyframes. The item's `animationend` then
  fires within a frame and nothing flashes (Windows has none); the class is not
  a `classicy*` token, so the vocabulary test is unaffected. This supersedes a
  core `layout.menu.choose` flag: no core change is needed. 4.7 is the same
  finding from Ch.4. _WIG Ch.1 "User in Control" (p.1), "Feedback" (p.3); Ch.4
  "Mouse Actions" (p.24); Ch.7 "Drop-down Menu Interaction" (p.97)._
- ✅ Ch.1 "Forgiveness" (pp.2–3): unavailable commands (Move To Trash in the
  Trash, Restore outside it, Test and Sleep Now with no saver) are GrayText
  embossed; Empty Trash, Initialize ("will erase all data on it. This cannot be
  undone.", `DriveSetupController.tsx` l.151–164) and Reset PRAM warn first; the
  Trash restores; built-in themes fork into a Custom theme; knobs are bounded;
  locked items are refused with an alert.
- **1.20** ⚠️ core layout flag: `layout.controlStrip?: { dockCommands?: boolean
  }` (`true` in `windows98.json`) adds Dock Left and Dock Right to the strip's
  contextual menu, each dispatching `ClassicyDesktopControlStripSetPosition {
  edge, bottom }` with the current bottom. Becomes ➖ once the shell's tray takes
  the strip's modules under Windows 98 (1.10). _WIG Ch.1 "Simplicity" (p.3);
  Ch.4 "Mode Keys" (p.27)._
- **1.21** ⚠️ core layout flag: `layout.finder?: { commands?: "mac" | "windows"
  }`, `"windows"` in `windows98.json`, the one flag for the Windows commands in
  Finder's and the desktop's menus. Under it: File ▸ Open and Open first and
  default on every item menu (5.23); Cut, Copy and Paste for items, Paste moving
  the cut items into the window's folder (5.28); Rename, Create Shortcut and
  Properties (2.2, 7.11); New ▸ Folder (5.40); Delete for Move To Trash (5.39).
  Applications also open with a single click from the Start menu (1.9). Platinum
  and System 7 keep today's menus. _WIG Ch.1 "Understanding Users" (p.8)._
- **2.1** ⚠️ core layout flag: `layout.window.restoreViewState?: boolean`
  (`true` in `windows98.json`). ClassicyWindow records its content area's scroll
  offsets as `scroll?: [number, number]` through a new `ClassicyWindowSetScroll`
  action (debounced, once scrolling ends) and restores them on mount;
  ClassicyTextEditor records its selection start the same way (`caret?:
  number`). While the flag is off, Platinum's and System 7's records gain
  nothing and their windows open as today. _WIG Ch.2 "Persistence" (p.12)._
- **2.2** ⚠️ core layout flag (1.21's `layout.finder.commands: "windows"`; =
  7.11's Properties analogue; 5.27 and B.10 are the same finding): (1)
  Properties goes last on Finder's File menu, on every item, Desktop Folder
  item, drive, app shortcut and Trash menu, and on the empty desktop's menu,
  where it opens the Appearance control panel (the Display Properties analogue).
  (2) ALT+ENTER (⌥↩, where the browser delivers it) on a selected item in
  ClassicyFileBrowser or on a desktop icon, and an `altKey` double-click, run
  Properties. (3) A new core `ClassicyFilePropertiesWindow` (window id
  `properties:${path}`, title "<name> Properties"), a modeless window with no
  Minimize or Maximize (Ch.8 p.145) holding ClassicyTabs with a General page:
  icon and name, Type (10.2's names), Location, Size, Created, Modified, and
  Read-only and Hidden check boxes from `_readOnly` and `_invisible`, with OK,
  Cancel and Apply writing through `fs.setMetadata`; choosing Properties for an
  object whose sheet is open focuses that sheet (Ch.5 p.46). Platinum's and
  System 7's menus are unchanged. _WIG Ch.2 "Putting Theory into Practice"
  (pp.12–13); Ch.5 "Properties" (p.51), "View Shortcuts" (p.47)._
- ✅ Ch.2 "Relationships" (pp.11–12): multiple selection works in both views and
  on the desktop; drags, Move To Trash and Restore apply to the whole set
  (`moveClassicyFileSystemItems` takes a list); `fs.move` refuses missing,
  not-a-folder, same-folder, into-itself, locked and exists, and an alert
  reports the first refusal.

---

## Chapter 3 — The Windows Environment; Chapter 6 — Windows

Pages read: PDF 31–35 (Ch.3) and 85–106 (Ch.6). Chapters 3 and 6 give almost no
numbers; the pixel values the findings compare against (16 × 14 caption buttons
in an 18-px caption, the 4-px sizing frame against the 3-px fixed frame, the
16-px scroll bar, 2 px before Close) are Windows 95's system metrics as the
figures show them. Windows 98's title-bar gradient is not in the 1995 text; the
package's gradient colors are Windows 98's defaults.

Normative checklist (WIG Ch.3 and Ch.6) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| Ch.3 "The Desktop" (p.15) | The desktop fills the screen as the background of all operations and holds file-system objects. | `_Desktop.scss`; `windows98.json` `defaults.desktop` (backgroundColor 32896 = #008080, Windows' Background teal, no image); the core's Desktop Folder (Finder) | ✅ |
| Ch.3 "The Taskbar" / "The Start Button" (p.15, Figure 3.1) | A raised ButtonFace bar along a screen edge, the raised edge facing the desktop; the Start button a raised button with a bold label; one raised button per open window, the active window's drawn pressed over the ButtonHilight/ButtonFace checker; the status area (clock) in a sunken pane at the other end. No pixel sizes given. | core ClassicyTaskbar (`layout.taskbar`), `_Taskbar.scss`: the raised bar with its edge toward the desktop on any docked edge (E4), the Start button with its bold label, the task buttons, the status area | 🔧 see 3.1, 3.2 |
| Ch.3 "Window Buttons" (pp.15–16) | A button per primary window, sized to fit, abbreviated with a tooltip; buttons activate their window and take drops. | core ClassicyTaskbar task buttons (`ClassicyTaskbarTasks.internal.tsx`), `_Taskbar.scss`: one per primary window, at most 160 and at least 22 px, paged behind an up/down control (E1); a forced tooltip when abbreviated; drop activation | 🔧 (11d0b9502, f39f67a54, 0c937b0e7, f21282e6c, bf26606e9) |
| Ch.3 "The Status Area" (p.16) | Opposite the Start menu, a status area for indicators an application may show even when not active. | the taskbar's tray (`ClassicyTaskbarTray.internal.tsx`, `_Taskbar.scss`): the Control Strip's modules as notification icons, the menu bar extensions, the clock, in one sunken pane | ✅ |
| Ch.3 "Icons" (pp.17–18, Table 3.1) | A picture with its label centered beneath it; a shortcut carries the arrow badge at its lower left; register icons for the application and its document types. | `_Desktop.scss`, `_Icon.scss`; `defaults.desktop.iconSize` 32, `iconFontSize` 11; the core's alias badge; the pictures are Platinum's | ✅ geometry; ➖ pictures |
| Ch.3 "Windows" (p.19, Figure 3.2) | Icons open into windows; windows also present dialogs, palettes and messages. | core window types (document, modal, utility) | ✅ structure |
| Ch.6 "Primary Window Components" (pp.75–76, Figure 6.1) | Frame, title bar (icon at the left, bold white title, Minimize and Maximize side by side then Close after a gap at the right), scroll bars when needed, optional menu bar, toolbars and status bar with the size grip at its right end; two-pixel raised edge around a ButtonFace border; sunken client area. | `_Window.scss` (title bar, caption boxes, frame, client edge, resizer) | ✅ |
| Ch.6 "Window Frames" (p.76) | A sizable window has a distinct sizing border; a window that cannot be resized has none: its border coincides with its edge (Windows: the 2-px edge + 1 px of ButtonFace, SM_CXDLGFRAME 3, against SM_CXFRAME 4). | `_Window.scss` `.classicyWindow` (`b.window-frame` over the core's `--window-frame-inset` 4 ring), `.classicyWindow.classicyWindowModal`, `.classicyWindow.classicyWindowNoResize` (the core's class for `resizable={false}`); `measurements.window.borderSize` 1 | ✅ sizable; 🔧 modal and non-resizable documents, see 6.1 |
| Ch.6 "Title Bars" (p.76) | Across the window's width inside the border; identifies the content; moves the window; shows the window's pop-up menu on button 2 and ALT+SPACEBAR. | `_Window.scss` title-bar mixin (`--window-title-bar-height` 18, `--title-bar-end-inset` 2, `--title-bar-icon-inset` 2); core `startMoveWindow` | ✅ look and move; 🔧 pop-up menu, see 6.2 |
| Ch.6 "Title Bar Icons" (pp.76–77, Figures 6.2–6.4) | A small (16 px) icon at the upper left: a tool's own icon, a document window's data-type icon. | `_Window.scss` caption-icon mixin (16 × 16, `--icon-small-size`); core `icon`/`hideIcon` props | ✅ (which icon is the app's content) |
| Ch.6 "Title Bar Icons" (p.78) | Button 2 on the icon shows the object's pop-up menu with Close as default; double-clicking the icon closes. | core ClassicyWindow (the icon is inert) | 🔧 see 6.3 |
| Ch.6 "Title Text" (pp.78–79, Figure 6.6) | "Document - Application Name"; a tool shows its name; names as in the file system, no extension or path. | core `title` (each app's content; Finder titles by folder, the container convention, as Explorer does); SimpleText titles "Untitled - Notepad" under `document.titleAppName` | 🔧 Fixed (1d75e0a62) |
| Ch.6 "Title Text" (p.80) | Abbreviate a title too wide for the window; draw nothing else into the title area. | base ellipsis kept by `_Window.scss` `.classicyWindowTitleText`; the package adds nothing to the title area | ✅ |
| Ch.6 "Title Bar Buttons" (p.80; Figure 6.1) | Close (X), Minimize (a bar at the bottom left of center), Maximize (a box with a thick top), Restore (two overlapping boxes), each a small raised ButtonFace button (16 × 14 in the 18-px caption; Minimize and Maximize adjacent, Close 2 px apart, 2 px in from the end); button 1 invokes, button 2 shows the window menu; no button for an unsupported command. | `_Window.scss` caption-boxes/caption-button, the marks `$close` 8 × 7, `$maximize` 9 × 9, `$restore` 8 × 9 (on `.classicyWindow.expanded`), `$minimize` 6 × 2; `measurements.titleBar` buttonWidth 16, buttonHeight 14, buttonGap 0, closeGap 2, endInset 2; core `zoomable`/`collapsible`/`closable` | ✅; 🔧 Restore, see 6.7 |
| Ch.6 "Activating and Deactivating Windows" (pp.80–81) | The active title bar in COLOR_ACTIVECAPTION, every other in COLOR_INACTIVECAPTION (the two system colors by name, no values; Windows 95's scheme defaults are navy 0,0,128 with white text and gray 128,128,128 with 192,192,192 text); nothing else changes; a click anywhere in a window activates it. | `_Window.scss` title-bar/title-bar-inactive mixins, `.classicyWindow.inactive`; `color.families.titleBar` active 128, activeGradient 1082576, inactive 8421504, inactiveGradient 11908533, text #ffffff, inactiveText 12632256; core `setActive` | ✅ |
| Ch.6 "Activating and Deactivating Windows" (p.81) | Hide a selection's feedback in an inactive window. | core ListBox/Table/Tree selection (no window-active state published) | 🔧 see 6.4 |
| Ch.6 "Activating and Deactivating Windows" (p.81) | Reactivating a primary window raises it with its secondaries, positions kept. | core z-order bands (app 150, focused window 300, palettes 350, modals 370) and `focusApp` | ✅ |
| Ch.6 "Opening and Closing Windows" (pp.81–82) | Restore a reopened window's last size and position; a first open uses a default; opening activates; keep a stored rectangle on the display. | core persisted window records, `ClassicyWindowOpen` focus and cascade, `clampWindowPositionToViewport` | ✅ |
| Ch.6 "Opening and Closing Windows" (p.83) | Close by the Close button or the window menu; prompt for pending changes; closing a primary closes its secondaries. | core Close box, `ClassicyWindowClose`, `closeApp` (the save prompt is each app's) | ✅ |
| Ch.6 "Moving Windows" (p.83) | Drag the title bar; an outline moves with the pointer, the window redraws on release; never where it cannot be reached; moving activates. | `_Window.scss` drag-band (the frame ring as a 2-px 50% WindowText checker) on `.dragging`; core `startMoveWindow`, the release clamp, `setActive` | ✅ |
| Ch.6 "Resizing Windows" / "Sizing Borders" (p.83) | Resize by dragging the sizing border at any edge (sizing cursors); an outline follows; the window takes its size on release and becomes active. | core frame-edge handles (they move the window, Mac OS 8's drag-from-the-frame), the grow box; `_Window.scss` drag-band on `.classicyWindowResizing` | ✅ outline and activation; 🔧 edges, see 6.5 |
| Ch.6 "Resizing Windows" (p.84) | Clip the content when smaller; a window may define minimum and maximum sizes. | core `minimumSize`; the contents a ClassicyScrollArea | ✅ |
| Ch.6 "Maximizing Windows" (pp.84–85) | Maximize fills the display less the taskbar; replace the Maximize button with Restore while maximized. | core zoom (`computeStandardRect`, `--window-zoom-margin` 7, the `zoomed` flag emitted as the state `expanded`); `_Window.scss` `.classicyWindowZoomBox`, `.classicyWindow.expanded` | 🔧 fill, see 6.6; 🔧 Restore, see 6.7 |
| Ch.6 "Minimizing Windows" / "Restoring Windows" (p.85) | Minimize reduces the window to its taskbar entry; restore from the taskbar or ALT+TAB. | core `window.collapse: "minimize"`: the window leaves the screen, keeps its task button and is restored from it | 🔧 (`window.collapse: "minimize"`; 4c42d9b56, 0c937b0e7) |
| Ch.6 "Size Grip" (p.85; Figure 6.1) | A sizable window's size grip at its lower right: at the scroll bars' junction, or at the far end of the status bar, never both; three diagonal ridges, ButtonHilight over ButtonShadow, in a ButtonFace square. | `_Window.scss` `.classicyWindowResizer` (the 16-px corner cell, the 14 × 14 `$grip`, `--grow-box-inset` 2); core resizer (resizable windows only), the placard bar | ✅ |
| Ch.6 "Scrolling Windows" (p.86, Figure 6.7) | Scroll bars: raised ButtonFace arrow buttons with black triangles at each end, a halftone (ButtonFace/ButtonHilight checker) shaft, a raised ButtonFace scroll box; 16 px across; a bar per scrolling axis, aligned with its window edge. | `_ScrollBar.scss` (`.classicyScrollBar`, `-Arrow`, `-Track`, `-Thumb`, `.classicyScrollAreaCorner`); `measurements.window.scrollbarSize` 16; core per-axis policies | ✅ |
| Ch.6 "Scrolling Windows" (p.87) | Keep the bars displayed when the window is inactive or when its content stops needing them. | `layout.scrollBar.fitsBars: "shown"`; core `fitsScrollBars`; `_ScrollBar.scss` `.fits` (embossed arrows, no thumb), nothing on `inactive` | ✅ |
| Ch.6 "Scroll Arrows" (p.87) | Arrows point away from the center; a click scrolls one line; disable the arrow at the end of travel (the system does not by default); hold auto-repeats, pausing while the pointer is off the button. | core `useClassicyPressRepeat` (120 ms), `lineStep`, `disabled` on an arrow at the end of its travel; `_ScrollBar.scss` arrow glyphs, `.fits` and `.disabled` emboss | ✅ repeat; 🔧 per-arrow disabling, see 6.8 |
| Ch.6 "Scroll Box" (pp.87–88, Figure 6.8) | Position and size proportional to the view; when everything is visible the box fills the bar and the arrows are disabled; minimum box no smaller than the sizing border; dragging updates the view continuously. | core `computeClassicyScrollThumb`, live `pressThumb`; `_ScrollBar.scss` `$thumb-min` 8 px (over the 4-px sizing border), `.fits` | ✅ proportion, minimum, live drag; ⚠️ full-length box, see 6.9 |
| Ch.6 "Scroll Box" (p.89) | Dragging the box off the bar past a distance proportional to its width returns it to its start and cancels; dragging back resumes. | core `pressThumb` (snap-back only in `thumbDrag: "onRelease"`, System 7's) | 🔧 see 6.10 |
| Ch.6 "Scroll Bar Shaft" (pp.89–90, Figure 6.9) | A click in the shaft pages by the visible area, with some overlap from the previous view; hold repeats; leaving the shaft pauses. | core `pressTrack` (page = visible − lineStep; stops when the thumb reaches the pointer); `_ScrollBar.scss` inverts the paged side (`--classicy-scroll-page-start`/`-length`) | ✅ |
| Ch.6 "Automatic Scrolling" (p.91) | Scroll when a selection or a dragged object nears the edge, when typing at the edge, when an operation moves the cursor out of view. | core file drag (no auto-scroll), native caret scrolling | 🔧 see 6.11 |
| Ch.6 "Keyboard Scrolling" (p.92) | Arrow keys scroll at the edge; PAGE UP/DOWN are shaft clicks. | core ClassicyScrollArea keys on a focusable root | ✅ |
| Ch.6 "Placing Adjacent Controls" (p.92) | Controls or status bars may shorten a scroll bar, not so much that scrolling gets hard. | core placard bar on the horizontal bar's line, `--window-placard-end-reserve`; `_Window.scss` placard inset | ✅ |
| Ch.6 "Splitting Windows" (pp.92–94, Figures 6.10–6.11) | A split box at the end of a scroll bar, the sizing border's size; the pointer changes over it; the split bar runs side to side, at least as wide as the sizing border. | core ClassicySplitView (divider, no split box, live resize); `_ScrollBar.scss` divider rules (flat ButtonFace, `--window-padding-size` 5 ≥ the 4-px border, full length) | ✅ bar; 🔧 split box, see 6.12 |
| Ch.6 "Splitting Windows" (p.95, Figure 6.12) | Dragging to the end of the bar closes the split; optional double-click; a Split command with arrow keys, ENTER and ESC. | core ClassicySplitView (arrow keys nudge 1 %, `minPaneSize` 48 floor) | 🔧 see 6.13 |
| Ch.6 "Splitting Windows" (p.96) | Panes get their own bars as needed; view state per pane; the split saved with the view. | core ClassicySplitView (each pane a ClassicyScrollArea, `onResizeCommit`, `defaultSizes`) | ✅ |

### Findings — Chapters 3 and 6

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 3.1 | LOW | The front application's taskbar button was raised at rest and pressed over the checker only while its menu was open; Figure 3.1 draws the active window's button pressed and checkered at all times, its label bold. | `_Taskbar.scss` (`.classicyTaskbarTask.active`; first `_MenuBar.scss` `.classicyDesktopMenuAppSwitcher`) | 🔧 Fixed (re-pointed to the taskbar, f21282e6c) |
| 3.2 | LOW | The screen bar was flat on every edge (`box-shadow: none`); the taskbar's edge toward the desktop is raised. Docked at the top, that is its bottom: ButtonShadow inside ButtonDkShadow. | `_Taskbar.scss` (`.classicyTaskbar`; first `_MenuBar.scss` `.classicyDesktopMenu`) | 🔧 Fixed (re-pointed to the taskbar, f21282e6c) |
| 6.1 | LOW | A modal dialog wore the sizable window's 4-px frame (`--window-frame-inset`); a window that cannot be resized has no sizing border (3 rings). A non-resizable **document** window wore the sizable frame too: the core published no state for `resizable={false}`. | `_Window.scss` (`.classicyWindow.classicyWindowModal`, `.classicyWindow.classicyWindowNoResize`); core ClassicyWindow | 🔧 Fixed (modal; documents through the core class `classicyWindowNoResize`) |
| 6.2 | LOW | Mouse button 2 on a title bar shows only an app-supplied `contextMenu`; the core has no window system menu (Restore, Move, Size, Minimize, Maximize, Close) and no ALT+SPACEBAR. | core ClassicyWindow | 🔧 Fixed (63ebc2f3f) |
| 6.3 | LOW | The title-bar icon is inert: no pop-up menu on button 2, no double-click close. | core ClassicyWindow | 🔧 Fixed (63ebc2f3f) |
| 6.4 | LOW | A selection in an inactive window stays Hilight/HilightText: only ClassicyScrollArea reads `ClassicyWindowActiveContext`; list boxes, tables and trees carry no window-active state the package could key on. | core ListBox/Table/Tree; `_ListBox.scss`, `_Table.scss` | 🔧 Fixed (3ed578659) |
| 6.5 | MEDIUM | The four `.classicyWindowFrameEdge-*` handles over the sizing border **move** the window (Mac OS 8's drag-from-the-frame); only the grow box resizes. Windows resizes by dragging any edge. | core ClassicyWindow | 🔧 Fixed (2e45e70d8, 819723aaa) |
| 6.6 | LOW | A full zoom is Mac OS 8's: the content's ideal size less a 7-px `--window-zoom-margin`, not the display less the taskbar. | core `computeStandardRect` | 🔧 Fixed (4b8d16bef) |
| 6.7 | MEDIUM | The core kept `zoomed` in the window record and emitted the `zoom` hook event but published no state class, so a maximized window still showed the Maximize mark; Windows replaces it with Restore. | core ClassicyWindow; `_Window.scss` `.classicyWindowZoomBox` | 🔧 Fixed (core hook `expanded`) |
| 6.8 | LOW | `fits` was published per bar only; at the top of a scrolling document the up arrow stayed enabled (as Windows' default bars do; the WIG still asks applications to disable it). | core ClassicyScrollArea; `_ScrollBar.scss` | 🔧 Fixed (core hook `disabled`) |
| 6.9 | LOW | When everything is visible the core draws no thumb and the package keeps the bare checker with embossed arrows (how Windows 95/98 draws a disabled bar, ESB_DISABLE_BOTH); the WIG's text has the scroll box fill the bar. | `_ScrollBar.scss` `.fits` | ⚠️ Deferred (product decision: the OS as shipped kept) |
| 6.10 | LOW | A live thumb drag follows the pointer anywhere and never snaps back (`snapBack` is infinite unless `thumbDrag === "onRelease"`). | core `pressThumb` | 🔧 Fixed (03c039b38) |
| 6.11 | LOW | No auto-scroll of a scroll area while a file drag nears its edge. | core `startClassicyFileDrag` | 🔧 Fixed (03c039b38) |
| 6.12 | LOW | ClassicySplitView has no split box for user-splittable windows; the divider's drag resizes live rather than moving a representation (a stronger form of the same feedback); its cursor is Platinum's. | core ClassicySplitView | 🔧 Fixed (03c039b38) |
| 6.13 | LOW | A divider drag stops at `minPaneSize` (48 px) rather than closing the split at the end of the bar; no double-click, no Split command. | core ClassicySplitView | 🔧 Fixed (03c039b38) |

**Details & fixes**

- **3.1** 🔧 (`packages/appearance/windows98/src/styles/components/_MenuBar.scss`):
  `.classicyDesktopMenuAppSwitcher` now includes the renamed mixin
  `taskbar-button-pressed` (the pressed bevel over the 2-px
  ButtonHilight/ButtonFace checker, formerly `taskbar-button-open`) at rest, with
  `> p { font-weight: bold }` on the text alone so the menu's items stay plain;
  the mixin carries its own `:hover` guard so the title's hover rule never lifts
  it, and the redundant `&.open` include is gone (the rest state already is the
  pressed one). The Start button keeps `taskbar-button-pressed` while open only.
  _WIG Ch.3 "The Taskbar" (p.15), Figure 3.1: the front "Document" button sunken,
  the others raised._
- **3.2** 🔧 (`_MenuBar.scss`): `.classicyDesktopMenu` gets
  `box-shadow: inset 0 b.$neg-b b.$dkshadow, inset 0 b.$neg-b2 b.$shadow` (two
  rings along the bottom edge only, DrawEdge EDGE_RAISED BF_BOTTOM's dark side)
  in place of `box-shadow: none`; the titles' 2-px bottom margin keeps them above
  the rings and the pull-downs already hang from `top: calc(100% + $edge)`.
  Product decision, recorded: the porting brief's "no bottom bevel" described a
  window's own menu bar, which Windows 98 draws flat (`_Window.scss` still does);
  this bar is styled as the taskbar, whose top-docked edge Windows 98 draws
  raised, so the taskbar reading was taken. _WIG Ch.3 "The Taskbar" (p.15),
  Figure 3.1._
- ✅ Ch.3 "The Status Area" (p.16): `_MenuBar.scss` orders the switcher and the
  extensions into the bar's right group (`order: 35; margin-left: auto`), draws
  the extensions as flat 16-px tray icons (`--icon-small-size`) and the clock
  in a sunken one-ring pane (ButtonShadow top-left over ButtonHilight
  bottom-right) 2 px in from the bar's edges.
- ✅ Ch.3 "Icons" (pp.17–18): `_Desktop.scss` draws the 32-px image over an
  11-px UI-font label (desktop text white with the 1-px black shadow knob), the
  base centering both; selected, Hilight under HilightText with the dotted focus
  rectangle on the label's outer ring and the 50 % Hilight dither over the
  image's opaque pixels (ImageList_Draw ILD_SELECTED); a shortcut keeps the
  arrow badge at its lower left and an upright label (Windows never italicized
  one). `_Icon.scss` does the same in windows on Window white.
- **6.1** 🔧 (`_Window.scss`): `$fixed-frame: calc(#{b.$b2} + #{b.$b})` (the
  two-pixel edge plus one pixel of ButtonFace, SM_CXDLGFRAME 3);
  `.classicyWindow.classicyWindowModal { padding: $fixed-frame }` in place of
  `var(--window-frame-inset)`, and the drag band follows
  (`.classicyWindowModal.dragging::after`, `.classicyWindowResizing::after`
  `{ padding: $fixed-frame }`) so a moved dialog's checkered outline is its
  three-ring frame. Every bundled modal (Alert, FileDialog, InputDialog,
  ColorPicker, KeyboardEquivalentDialog) passes `resizable={false}`, so no
  sizable dialog loses its border; a resizable modal (none is bundled) would
  keep the core's grip measured from the 4-px `--window-frame-inset` inside a
  3-px frame, one pixel off (noted in the partial). A non-resizable document
  window wears the same frame since 6ad402bcc: the core marks the root
  `classicyWindowNoResize` while `resizable={false}` (named like
  `classicyWindowNoScroll`, declared as a Window part in the vocabulary), and
  `.classicyWindow.classicyWindowNoResize` takes `$fixed-frame`, its drag band
  (`.classicyWindowNoResize.dragging::after`, `.classicyWindowResizing::after`)
  and a re-measured placard-bar corner (`left`/`bottom: calc($fixed-frame +
  $client-edge)`, the one length such a window can show that the four-ring
  `--window-frame-inset` sized; no bundled window carries a placard); the core
  draws no grow box for `resizable={false}`, and the contents' heights are
  shares of the content box, so the thinner ring moves nothing inside. Under
  this package the control panels, the About windows and the Calculator wear
  the fixed frame, Windows' own treatment of a fixed-border window. _WIG Ch.6
  "Window Frames" (p.76)._
- ✅ Ch.6 "Window Frames" (p.76), sizable: `.classicyWindow { @include
  b.window-frame }` draws the two-pixel raised edge (ButtonLight then
  ButtonHilight at the top and left, ButtonDkShadow then ButtonShadow at the
  bottom and right) inside the core's 4-px ButtonFace ring, leaving two pixels
  of sizing border: SM_CXFRAME 4.
- ✅ Ch.6 "Primary Window Components" (pp.75–76), Figure 6.1: Minimize order
  20, Maximize order 30 with `--title-bar-button-gap` 0, Close order 40 after
  `--title-bar-close-gap` 2 and `--title-bar-end-inset` 2; the 16-px icon
  `--title-bar-icon-inset` 2 from the left; the title left-aligned, bold,
  TitleText; the client area sunken (`b.sunken`, two rings of padding); the
  grip in the scroll bars' corner.
- ✅ Ch.6 "Title Bar Buttons" (p.80): the marks on the pixel grid in WindowText,
  Close 8 × 7 two-pixel diagonals at (4,3), Maximize 9 × 9 with a two-row top at
  (3,2), Minimize 6 × 2 at (4,9); `caption-button` raised ButtonFace, pressed
  the bevel turns and the mark steps one pixel down and right; `opacity: 1` on
  inactive windows; the core draws a box only for a command the window has.
- ✅ Ch.6 "Activating and Deactivating Windows" (pp.80–81): the title-bar color
  family holds Windows 95's ActiveTitle, InactiveTitle, TitleText and
  InactiveTitleText defaults with Windows 98's gradient ends; the active bar's
  left-to-right gradient (`b.title-bar-gradient`; a preset whose two colors are
  equal, Windows 95's, draws a flat bar); `.classicyWindow.inactive` swaps the
  pair and sets `filter: none`, undimming contents, header and placard bar, so
  nothing but the caption changes; any click on the root dispatches
  `ClassicyWindowFocus`.
- ✅ Ch.6 "Moving Windows" (p.83): the base hides a dragged window's children
  and the `drag-band` mixin draws the frame ring as a 2-px 50 % WindowText
  checker masked to the ring (Windows' halftone drag frame, Show Window Contents
  While Dragging off); the release clamp keeps the window above the menu bar's
  floor; the root's mouseup activates it.
- ✅ Ch.6 "Size Grip" (p.85): `.classicyWindowResizer` is the 16-px corner cell
  inside the client edge, ButtonFace, the grip a 14 × 14 picture of three
  diagonal ridges (one ButtonHilight line over two ButtonShadow lines)
  `--grow-box-inset` 2 from the corner; one grip only, on resizable windows,
  the placard (status) bar sharing the same scroll-bar line.
- ✅ Ch.6 "Scrolling Windows" (p.86), Figure 6.7: `_ScrollBar.scss` draws
  raised ButtonFace arrow buttons with 7 × 4 (or 4 × 7) WindowText triangles
  one pixel off center as Windows sets them (Marlett at 16 px), pressed flat
  (one ring of ButtonShadow) with the triangle a pixel down-right; the track the
  50 % ButtonHilight/ButtonFace checker on the pixel grid
  (`repeating-conic-gradient`); the thumb raised ButtonFace with no grip, never
  under 8 px; the corner plain ButtonFace; `--window-scrollbar-size` 16.
- ✅ Ch.6 "Scrolling Windows" (p.87): `layout.scrollBar.fitsBars: "shown"`
  keeps a resizable, non-utility window's bars drawn, disabled, when its content
  fits (`fits`: embossed arrows), and an inactive window changes nothing.
- ✅ Ch.6 "Scroll Arrows" (p.87) and "Scroll Bar Shaft" (pp.89–90): the core's
  `hold` repeats every 120 ms, stops on `mouseleave`, resumes on `mouseenter`;
  a track press pages by `max(visible − lineStep, lineStep)` toward the pointer
  until the thumb reaches it; the package inverts the paged side of the checker
  (`PatBlt DSTINVERT`) from `--classicy-scroll-page-start`/`-length`.
- **6.2, 6.3** ⚠️ core: a default window pop-up menu (Close, Collapse/Expand,
  Zoom, Move to Front) when neither the window's nor the app's `contextMenu` is
  set, shown on the title bar's and the icon's contextmenu; `onDoubleClick` on
  `.classicyWindowIcon` closes a `closable` window (stopping propagation so the
  title's double-click collapse does not also fire). ALT+SPACEBAR is browser
  reserved. _WIG Ch.6 "Title Bars" (p.76), "Title Bar Icons" (p.78)._
- **6.4** ⚠️ core hook (additive): ClassicyListBox, ClassicyTable, ClassicyTree
  (and ClassicyTextEditor's selection surface) read `ClassicyWindowActiveContext`
  and emit the vocabulary state `inactive` on their roots as ClassicyScrollArea
  does; the package then hides the selection (the WIG) or draws it in
  ButtonFace/WindowText (Windows' own list views) in `_ListBox.scss` and
  `_Table.scss`. _WIG Ch.6 (p.81); Ch.13 "Highlighting" (p.318)._
- **6.5** ⚠️ core: a layout flag `layout.window.frameEdges: "move" | "resize"`
  (default `"move"`) read through `useClassicyAppearanceLayout()`; under
  `"resize"` the frame-edge handles call `startResizeWindow` anchored at the
  opposite edge (corners at the opposite corner), honoring `resizable` and
  `minimumSize`, with the resize cursors from `--classicy-cursor-resize-lr`/`-ud`
  (Platinum's art, by the brief). `windows98.json` would declare
  `window: { growBoxCorner: "bottom-right", frameEdges: "resize" }`. _WIG Ch.6
  "Sizing Borders" (p.83)._
- **6.6** ⚠️ core: `layout.window.zoom: "standard" | "maximize"` (default
  `"standard"`); under `"maximize"` `computeStandardRect` ignores the content's
  `idealSize` and `--window-zoom-margin` and fills the desktop under the menu
  bar. _WIG Ch.6 "Maximizing Windows" (p.84)._
- **6.7** 🔧 core hook (additive; 6ad402bcc, `ClassicyWindow.tsx`,
  `_Window.scss`): the window emits the existing vocabulary state `expanded`
  on `.classicyWindow` while `ws.zoomed` (beside collapsed/active/inactive/
  dragging; the zoom's geometry stays inline, #208, and `ClassicyWindow.scss`'s
  note says so), read by no base, Platinum or System 7 rule. The package's
  `$restore` picture, two overlapping 6-wide boxes with two-row tops, the back
  one up and to the right (rows `..xxxxxx`, `..xxxxxx`, `..x....x`,
  `xxxxxx.x`, `xxxxxx.x`, `x....xxx`, `x....x..`, `x....x..`, `xxxxxx..`),
  draws on `.classicyWindow.expanded .classicyWindowTitleBar
  .classicyWindowZoomBox { @include caption-button($restore, 3, 2); }`,
  Maximize's offset (98.css's restore.svg), so the mark stands one pixel left
  of center as Windows draws it; an inactive zoomed window keeps Restore, and a
  utility window hides its zoom box. The appearance test sees `expanded` after
  a zoom-box click, gone after the second and once a resize starts.
  _WIG Ch.6 "Maximizing Windows" (pp.84–85), "Title Bar Buttons" (p.80)._
- **6.8** 🔧 core hook (additive; e013ae28c, `ClassicyScrollArea.tsx`,
  `classicyScrollAxisEnds` in `ClassicyScrollAreaMetrics.ts`; `_ScrollBar.scss`):
  from `update()`'s measurement, the pass that sets `fits` and the thumb (so on
  every scroll and the rAF measurement), each bar emits `disabled` on its
  `scroll-arrow-start` part while the scroll position is 0 and on
  `scroll-arrow-end` within a pixel of its maximum (a zoomed page reports a
  fractional offset against whole-pixel extents), both while the axis fits,
  derived from the position, not from `fits`; a press there scrolled nothing
  before and scrolls nothing now, and no base, Platinum or System 7 rule reads
  it. The package's `.classicyScrollBarVertical
  .classicyScrollBarArrowStart.disabled { @include
  arrow-glyph-disabled($arrow-up); }` and its three siblings sit beside the
  `.fits` rules and after the `.pressed` rules of the same weight, so a held
  arrow at its end draws no press, as a fitting bar's arrows do not. _WIG Ch.6
  "Scroll Arrows" (p.87); Ch.7 "List Boxes" (p.120), "Scroll Bars" (p.131)._
- **6.9** ⚠️ product decision, the OS as shipped kept: Windows 95/98 hides the
  scroll box of a disabled bar (ESB_DISABLE_BOTH) and leaves the halftone shaft
  with embossed arrows, which `_ScrollBar.scss` draws. If the 1995 text's
  reading is wanted, the package fix is
  `.classicyScrollBar.fits .classicyScrollBarTrack { background: b.$face;
  @include b.raised; }`. _WIG Ch.6 "Scroll Box" (p.88)._
- **6.10** ⚠️ core: in live-drag mode read the snap-back distance too
  (`--scroll-bar-snap-back`, else the bar's thickness); while the pointer is
  outside the track grown by it, scroll back to `startPosition`, resuming when
  it returns; a release outside leaves the view at `startPosition`. _WIG Ch.6
  "Scroll Box" (p.89)._
- **6.11** ⚠️ core: while a file drag's ghost is within a line step of a
  ClassicyScrollArea viewport's edge under the pointer, scroll it by `lineStep`
  on `useClassicyPressRepeat`'s interval. _WIG Ch.6 "Automatic Scrolling"
  (p.91)._
- **6.12, 6.13** ⚠️ core: an optional split box at the end of a pane's scroll
  bar (the sizing border's size, drawn by the package as a raised ButtonFace
  box) that starts a divider drag; a divider drag past `minPaneSize` to the end
  of the bar closes the split (`onSplitClose`), an optional double-click resets
  to `defaultSizes`, and a `splitViewSplitCommand` helper opens the split in the
  middle and moves it with the arrow keys until ENTER or ESC. _WIG Ch.6
  "Splitting Windows" (pp.92–95)._
- ✅ Ch.6 "Splitting Windows" (p.94): `.classicySplitViewDivider` is the flat
  ButtonFace splitter bar of Explorer's panes, `margin: 0` so it runs from one
  side of the view to the other, `--window-padding-size` 5 thick (≥ the 4-px
  sizing border), with the dotted WindowText focus rectangle for the keyboard.

---

## Chapter 4 — Input Basics

Pages read: PDF 36–46 as text and PDF 36–37 as images (the pointer shapes of
Table 4.1). The opener, PDF 36, prints 23, so printed page = PDF − 13 and the
chapter is pp.23–33; p.34, the blank verso, is not in the pre-release (Ch.5's
opener, PDF 47, prints 35). For cross-reference: App. B Tables B.2, B.3 and B.5
(PDF 338–340 = pp.358–360) and Ch.13 "Pointer Design" (PDF 304–305 =
pp.316–317). Ch.4 is the pointer shapes, the mouse's press-and-release
discipline, access keys, modifier and shortcut keys, and pen input (➖). The
package owns the pointer over its parts (CSS `cursor` keywords draw the host's
own pointers and copy no art); the core owns the gestures and the keys.

The adaptation list re-checked: "cursors are Platinum's" gives no reason to show
Platinum's Mac resize and hand images where a CSS keyword draws the host OS's
own pointer (4.1–4.4); Alt+letter is browser-reserved only in part (Chromium on
Windows routes Alt+key to a page's HTML `accesskey`), so the missing access keys
are a core deviation, not an adaptation (4.11).

Normative checklist (WIG Ch.4) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| "Mouse Pointers" (pp.23–24), Table 4.1 | Over most objects, controls included, the pointer is the arrow; the slashed circle means an object cannot take an operation, not that a control is disabled. | base `cursor: pointer` / `not-allowed` on list rows, tree rows, disclosure buttons, tab scroll arrows, pager arrows, sliders and swatches, none overridden by the package | 🔧 see 4.1 |
| "Mouse Pointers" (p.23), Table 4.1 | A sizing or splitting pointer shows its axis: the grip the diagonal arrow, a split bar the split pointer. | `_Window.scss` `.classicyWindowResizer`, `_ScrollBar.scss` `.classicySplitViewDivider` (the base's `--classicy-cursor-resize-*`, Platinum's images) | 🔧 see 4.2 |
| "Mouse Pointers" (p.23), Table 4.1 | The same, for the page-wide pointer the core sets during a gesture. | core `useClassicyCursor.ts` (`document.body.style.cursor`), the asset registry's fallback to the default package | 🔧 see 4.3 |
| "Mouse Pointers" (p.23), Table 4.1; Ch.6 "Moving Windows" (p.83) | A window keeps the arrow while moved and the sizing pointer while resized. | base `:where(.classicyWindow).dragging { cursor: grabbing }`; `_Window.scss` drag band (no cursor) | ⚠️ see 4.4 |
| "Mouse Pointers" (p.23), Table 4.1; Ch.13 "Pointer Design" (p.316) | The hourglass over something busy, the arrow with hourglass over background work. | the startup screen (`_Desktop.scss`), `.pdfViewerDocumentLoading`; `useClassicyCursor("watch")` has no caller | 🔧 see 4.5 |
| "Mouse Pointers" (p.23), Table 4.1 | The arrow with "?" in contextual Help mode. | none (no What's This? mode; 12.2) | ➖ |
| "Mouse Pointers" (p.23), Table 4.1; p.24 | The magnifier while zooming a view; applications may define pointers. | `PDFViewerDocument.scss` `.pdfViewerDocumentToolZoom` (`--classicy-pdf-zoom-cursor`, `zoom-in`) | ✅ |
| "Mouse Pointers" (p.23), Table 4.1 | The column-resize pointer over column edges. | `ClassicyTable.scss` `.resizer` (`col-resize`) | ✅ |
| "Mouse Pointers" (p.23), Table 4.1 | The row-resize pointer over row edges. | none (no row resizing) | ➖ |
| "Mouse Pointers" (pp.23–24), Table 4.1; Ch.13 "Pointer Design" (p.316) | The not-available pointer while a dragged object is over a place that cannot take it. | core `startClassicyFileDrag` (`body.classicyFileDragging`, `.classicyFileDropTarget`; nothing over a refusing surface) | 🔧 see 4.6 |
| "Mouse Pointers" (p.24) | A hot spot fixes the location; a hot zone may be larger than the object. | registered cursors' `--classicy-cursor-<role>-hotspot`; keyword cursors; caption buttons, the grip cell, `--table-resizer-width` | ✅ |
| "Mouse Actions" (p.24) | Basic actions use button 1 and button 2; the user may swap them. | core click/mousedown handlers (`button` 0), `contextmenu` handlers | ✅ |
| "Mouse Actions" (p.24) | Pressing identifies and gives feedback; releasing carries out; auto-repeat is the exception. | ClassicyButton, check boxes and radios, caption buttons (`onClick`), ClassicyTabs, ClassicyScrollArea and ClassicyLittleArrows (`useClassicyPressRepeat`) | ✅ |
| "Mouse Actions" (p.24) | Releasing over a chosen menu item runs its command and closes its menu at the release. | core `ClassicyMenu.tsx` (400 ms fallback); the package's hooks (none) | 🔧 see 4.7 (= 1.19) |
| "Mouse Actions" (p.24); App. A Table A.1 (p.349) | A tab is selected at the button-down (Windows 98 as shipped: comctl32 selects on WM_LBUTTONDOWN). | core `ClassicyTabs.tsx` (selects at the mouseup); `_Tabs.scss` (no pressed tab) | 🔧 see 4.8 |
| "Mouse Actions" (p.24) | A click tolerates small movement; an object drags only past the drag rectangle (SM_CXDRAG, 4 px). | core ClassicyDesktopIcon `startDrag` / `changeIcon` (non-file icons), ClassicyIcon without `onFileDrag` | 🔧 see 4.9 |
| "Mouse Actions" (p.24); App. A Table A.1 (p.350) | Double-clicking an object invokes its default operation. | ClassicyDesktopIcon `launchIcon`, ClassicyIcon `doDoubleClick`, ClassicyTable `onActivateRow`, ClassicyListBox, ClassicyTree | ✅ |
| "Mouse Actions" (p.25) | No chording and no triple or quadruple clicks for basic operations. | core mouse handlers (no `detail` above 2) | ✅ |
| "Mouse Actions" (pp.24–25) | No basic action on the middle button; a button-2 drag never performs button 1's operation. | core ClassicyWindow move and resize, ClassicyDesktop `startSelectBox` (`e.button > 1`), ClassicySplitView, ClassicyTable's resizer, non-file desktop icons | 🔧 see 4.10 |
| "Keyboard Input" (p.25) | Keyboard actions on the key's down transition. | `useKeyboardEquivalents.ts`, ClassicyShortcutDispatcher, menu Enter, desktop keys; native buttons | ✅ |
| "Text Keys" (p.25) | A text key enters its character; TAB and ENTER characters usually invisible. | native `<input>` and `<textarea>` | ➖ |
| "Text Keys" (p.25) | Both ENTER keys do the same. | handlers test `e.key === "Enter"` (never `e.code`) | ✅ |
| "Access Keys" (p.26); Ch.7 "Menu Titles" (p.106), "Menu Item Labels" (p.109); Ch.8 "Navigation in Secondary Windows" (pp.148–149) | Each labeled control, menu title and item has an access key, underlined, reached with ALT, case-insensitive. | core ClassicyMenuItem, ClassicyButton, ClassicyControlLabel, ClassicyCheckbox, ClassicyRadioInput, ClassicyTabs (no `accessKey`) | 🔧 see 4.11 (= 7.1 / 8.9) |
| "Access Keys" (p.26); App. B Table B.5 (p.360) | First letter, else a distinctive consonant, else a vowel; unique per scope; unlabeled controls get a labeling static text; none on OK and Cancel. | bundled menus and dialogs (no keys assigned; no duplicate check) | 🔧 see 4.12 |
| "Access Keys" (p.26) | Nonroman scripts may prefix a roman access-key character. | none (English labels only) | ➖ |
| "Mode Keys" (p.26) | Toggle keys switch a mode on and off. | none (the OS owns CAPS LOCK and NUM LOCK; matching ignores case) | ➖ |
| "Mode Keys" (p.27) | Prefer spring-loaded modifier modes; avoid multiple modifiers as the main way in. | bundled chords (one modifier each); `checkKeyboardEquivalent`; the Control-drag lasts while held | ✅ |
| "Mode Keys" (p.27); Ch.3 "The Taskbar" (p.15) | Modifier-based actions only as quick access to operations reachable otherwise. | core `ClassicyControlStrip.tsx` (Control-drag); the coming taskbar | ⚠️ see 4.13 (shell; today's strip 1.20) |
| "Shortcut Keys" (p.27) | A shortcut is never the only way; prefer CTRL+letter and function keys; single keys where possible. | every bundled chord duplicates a menu item; Delete, Return and the arrows as single keys | ✅ |
| "Shortcut Keys" (p.27) | Modifier+letter combinations are case-insensitive. | `ClassicyKeyboardShortcut.ts` `keyMatchesEvent` (lowercased `e.key`, `e.code` fallback) | ✅ |
| "Shortcut Keys" (p.27) | SHIFT+key extends or reverses; CTRL+key for larger effects and letter commands. | Shift range selection in ClassicyTable and ClassicyListBox; native Ctrl+letter edit keys | ✅ |
| "Shortcut Keys" (p.27) | Avoid ALT+key shortcuts, which collide with access keys. | core Hide (⌥H), the control panels' and Calculator's Close ⌥W and Quit ⌥Q | 🔧 see 4.14 |
| "Shortcut Keys" (p.27) | ALT+TAB, ALT+ESC, ALT+SPACEBAR are the system's; ALT+number enters characters. | all `keyboardShortcut` strings (none assigned) | ✅ |
| "Shortcut Keys" (p.27); App. B Table B.2 (p.358) | Do not reassign the standard shortcut keys. | Ctrl+C, X, V, Z, A native (`nativeShortcut`); Ctrl+O, P, S, F1 unassigned; ESC only cancels | ✅ |
| "Shortcut Keys" (p.27) | Let the user change shortcut assignments where possible. | core `ClassicyKeyboardEquivalentField` (used nowhere but its own module and stories) | 🔧 see 4.15 |
| "Shortcut Keys" (p.27); App. B Table B.2 (p.358) | ESC is the Cancel button's shortcut. | `useKeyboardEquivalents.ts` `onCancel` (Escape, Ctrl+period) | ✅ |
| "Shortcut Keys" (p.27) | ESC stops a function in progress and cancels a direct manipulation, restoring the prior state. | core window move and resize, split divider, icon drag, selection rectangle, column resize, Control Strip drags | 🔧 see 4.16 (= 1.18) |
| "Shortcut Keys" (p.28); App. B Tables B.2 and B.3 (pp.358–359) | The Application key and SHIFT+F10 display the selection's pop-up menu. | core ClassicyContextualMenuTarget, ClassicyFileBrowser, ClassicyDesktop (the `contextmenu` event alone) | 🔧 see 4.17 (= 7.9) |
| "Shortcut Keys" (p.28); App. B Tables B.2 and B.3 (pp.358–359) | Either Windows key displays the Start menu; CTRL+ESC reaches the Start button. | the coming Start button | 🔧 see 4.18 (shell) |
| "Shortcut Keys" (p.28); App. B Table B.3 (p.359) | The Windows keys are modifiers for system functions only. | core `shortcutMatchesEvent` (Command = `metaKey \|\| ctrlKey`), `canonicalChordsFromEvent`, the dialogs' cancel chord | 🔧 see 4.19 |
| "Pen Input" (pp.28–31), "Pen Pointers" (p.31), Table 4.2 | Pen actions, barrel buttons, pen pointers. | none (a pen arrives as pointer events, handled as the mouse) | ➖ |
| "Pen Gestures" (pp.31–32), "Pen Recognition" and "Ink Input" (p.32) | Gestures as shortcuts only; recognition with easy correction; ink as data. | none | ➖ |
| "Targeting" (p.33), Figure 4.1 | Pen gestures aimed by context. | none | ➖ |
| "Mouse Actions" (p.24); "Mouse Pointers" (p.23), Table 4.1 | The taskbar's buttons show feedback at the press and act at the release; the arrow over the bar. | the coming taskbar | ⚠️ see 4.20 (shell) |
| "Access Keys" (p.26); App. B Table B.5 (p.360) | Window-bar titles and items, and the Start menu's items, carry unique underlined access keys. | the coming window bars and Start menu | ⚠️ see 4.21 (shell) |

### Findings — Chapter 4

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 4.1 | MEDIUM | The base's hand pointer shows over list box rows, tree rows, the list view's expand buttons, tab scroll arrows, pager arrows, sliders and their thumbs, and the Colors tab's swatches; a disabled slider shows the slashed circle. Windows shows the arrow over all of these. | `_ListBox.scss`, `_Table.scss`, `_Tabs.scss`, `_Placard.scss`, `_Slider.scss`, `_AppearanceManager.scss` | 🔧 Fixed (7bc33b74f) |
| 4.2 | MEDIUM | The size grip and the split dividers read the `resize-*` cursor roles, which fall back to Platinum's Mac arrows when Platinum is loaded: the grip shows a horizontal arrow, not the diagonal one. | `_Window.scss`, `_ScrollBar.scss` | 🔧 Fixed (7bc33b74f) |
| 4.3 | LOW | During a split-view drag the core writes the resolved role's URL (Platinum's image) into `body`'s inline cursor, outside the package's scope; the PDF viewer's pan tool shows Platinum's hand. | core `useClassicyCursor.ts`, `ClassicyAssetRegistry.ts` | 🔧 Fixed (41de137d5) |
| 4.4 | LOW | A title-bar drag and a grip drag both show the browser's closed hand (`grabbing`); Windows keeps the arrow while moving and the diagonal arrow while sizing. | `_Window.scss` | 🔧 Fixed in part (a206f0031); ⚠️ addendum B4 |
| 4.5 | LOW | Nothing shows a busy pointer: the startup screen and the PDF viewer's "Loading…" keep the arrow. | `_Desktop.scss`; a new `_PDFViewer.scss` | 🔧 Fixed (7bc33b74f) |
| 4.6 | LOW | Over a surface that refuses a file drag (a window, the menu bar, the Control Strip, a dialog) nothing changes; the `body` class is outside the package's scope, so the package cannot draw the not-available pointer. | core `ClassicyFileDrag.ts` | 🔧 Fixed (37d580c6d) |
| 4.7 | MEDIUM | Every command chosen from a menu runs 400 ms after the release, its menu still drawn. Same as 1.19. | the package's hooks; `_Menu.scss` | 🔧 Fixed (7bc33b74f) |
| 4.8 | LOW | A tab is selected at the mouseup over it, with no pressed look between press and release; a release over another tab selects that one. | core `ClassicyTabs.tsx` | 🔧 Fixed (be51df8bd) |
| 4.9 | LOW | A non-file desktop icon moves on the first mousemove with the button down, so a one-pixel jitter moves it and swallows the click; ClassicyIcon without `onFileDrag` re-centers on the pointer at the first move. | core ClassicyDesktopIcon, ClassicyIcon | 🔧 Fixed (be51df8bd) |
| 4.10 | LOW | A middle or right press-drag moves or resizes a window and drags a split divider, a column edge or an app icon; a middle press on the desktop starts the selection rectangle, and buttons 3 and 4 open the desktop menu. | core ClassicyWindow, ClassicyWindowTitleBar, ClassicyDesktop, ClassicySplitView, ClassicyTable, ClassicyDesktopIcon | 🔧 Fixed (be51df8bd, 1ed1b21f7) |
| 4.11 | MEDIUM | No access keys anywhere: no `accessKey` in src or the package, no underline, no Alt+letter handling. Same as 7.1 / 8.9 (rated MEDIUM here: the gap shows in every menu and dialog). | core menus and controls; `_Menu.scss`, `_MenuBar.scss`, `_Button.scss`, `_TextField.scss` | 🔧 Fixed (7470e0537) |
| 4.12 | LOW | No bundled label has an access key assigned, and nothing checks for duplicates within a menu or window. | core bundled menus and dialogs, ClassicyControlLabel | 🔧 Fixed (7470e0537) |
| 4.13 | LOW | The Control Strip's position is reachable only by Control-dragging; the taskbar that replaces it must move and size without a modifier. | the coming taskbar; core ClassicyControlStrip | ⚠️ Deferred (shell addendum B5, not implemented) |
| 4.14 | LOW | Close ⌥W, Quit ⌥Q and Hide ⌥H are Alt+W, Alt+Q and Alt+H on a PC keyboard: Alt+H is the Help menu's access key everywhere, Alt+W a Window menu's. Harmless only while access keys do not exist. | core ClassicyDesktopMenuBar, the control panels, Calculator, `shortcutMatchesEvent` | 🔧 Fixed (7470e0537) |
| 4.15 | LOW | Bundled shortcuts are literals in each app's menus; no panel edits them, though `ClassicyKeyboardEquivalentField` exists. | core `KeyboardEquivalent/` | 🔧 Fixed (3066b9019, 3a30ada87) |
| 4.16 | LOW | Escape does not take back a window move or resize, a split, icon or column drag, the selection rectangle or the Control Strip's drags. Same as 1.18. | core (see 1.18) | 🔧 Fixed (be51df8bd, 1ed1b21f7) |
| 4.17 | LOW | No handler reads the ContextMenu key or Shift+F10; the desktop's selected icons are never the target, since the root shows its menu only for itself. Same as 7.9. | core ClassicyContextualMenuTarget, ClassicyFileBrowser, ClassicyDesktop, ClassicyWindow | 🔧 Fixed (3066b9019) |
| 4.18 | LOW | There is no Start menu yet for the Windows keys and CTRL+ESC. | the coming Start button | 🔧 Fixed (22ca9cc74) |
| 4.19 | LOW | On a Windows keyboard `e.metaKey` is the Windows key, so every Command equivalent (and Finder's ⌘A) also fires on Win+letter, and Win+period cancels a dialog. | core `ClassicyKeyboardShortcut.ts`, `ClassicyShortcutDispatcher.ts`, `useKeyboardEquivalents.ts` | 🔧 Fixed (7470e0537) |
| 4.20 | LOW | The taskbar's Start and window buttons do not exist yet. | the coming taskbar | ⚠️ Deferred (shell addendum B5, B6, not implemented) |
| 4.21 | MEDIUM | The window bars and the Start menu do not exist yet, and their access keys depend on 4.11. | the coming window bars and Start menu | ⚠️ Deferred (shell addendum B7, not implemented) |

**Details & fixes**

- **4.1** ⚠️ package (fix written, not applied): the package already restores
  the arrow on the controls it styles (`_Button.scss` l.229, `_Checkbox.scss`
  l.133, `_RadioInput.scss` l.170, `_Menu.scss` l.163, `_MenuBar.scss` l.127,
  `_Table.scss` l.103, `_PopUpMenu.scss` l.97/115/272, `_LittleArrows.scss`
  l.103/126); `classicy.package` beats every base rule whatever its specificity.
  Add: `_ListBox.scss` `.classicyListBoxOption, .classicyTreeNodeBranch,
  .classicyTreeNodeSelectable { cursor: default; }`; `_Table.scss`
  `.classicyFileBrowserViewTableDisclosureTriangle { cursor: default; }`;
  `_Tabs.scss` `cursor: default` on `.classicyTabScrollButton`; `_Placard.scss`
  the same on `.classicyPagerArrow`; `_Slider.scss` `cursor: default` on
  `.classicySlider` and on its separate `&::-webkit-slider-thumb` and
  `&::-moz-range-thumb` blocks (which also covers `.disabled`);
  `_AppearanceManager.scss` `.classicyColorPickerSwatch,
  .classicyColorPickerCrayon { cursor: default; }`. Leave ClassicyLink's hand
  (Windows 98's own hyperlink hand) and the HyperCard editor's handles (an
  application's own pointers, which p.24 allows). _WIG Ch.4 "Mouse Pointers"
  (pp.23–24), Table 4.1._
- **4.2** ⚠️ package (fix written, not applied): the base's keyword fallbacks
  (`nwse-resize`, `col-resize`, `row-resize`) draw the host OS's own pointers
  and copy no Microsoft art, so the "cursors are Platinum's" adaptation has no
  reason left for these roles. `_Window.scss`: `cursor: nwse-resize;` on
  `.classicyWindowResizer` (the package declares `growBoxCorner:
  "bottom-right"`); `_ScrollBar.scss`: `.classicySplitViewHorizontal >
  .classicySplitViewDivider { cursor: col-resize; }`,
  `.classicySplitViewVertical > .classicySplitViewDivider { cursor: row-resize;
  }`, and while a drag lasts `.classicySplitView:is([data-drag-direction='l'],
  [data-drag-direction='r']) .classicySplitViewDivider { cursor: col-resize; }`
  and the `u`/`d` pair `row-resize`. Keep the grip rule even once the package
  registers cursors (1.14): the base reads the left-right role there. _WIG Ch.4
  "Mouse Pointers" (p.23), Table 4.1; Windows 98 as shipped (IDC_SIZENWSE over
  the grip)._
- **4.3** ⚠️ core layout flag: `layout.cursors?: "inherit" | "system"` (default
  `"inherit"`, today's fallback to the default package; `"system"` in
  `windows98.json`). Under `"system"`, `assetVars()` publishes
  `--classicy-cursor-*` and their `-hotspot` values only from the active
  package's own tree and variant, so the base keyword fallbacks apply, and
  `useClassicyCursor` sets a keyword for a role the active package has no image
  for instead of clearing: arrow `default`, watch `wait`, hand `grab`, ibeam
  `text`, crosshair `crosshair`, resizeLr/L/R `ew-resize`, resizeUd/U/D
  `ns-resize`, resizeNwse `nwse-resize`, resizeNesw `nesw-resize`. Platinum and
  System 7 declare nothing and resolve as now. _WIG Ch.4 "Mouse Pointers"
  (p.23), Table 4.1._
- **4.4** ⚠️ package (fix written, not applied): `_Window.scss`, beside the
  drag-band rule (l.721–724): `.classicyWindow.dragging { cursor: default; }`
  and `.classicyWindow.classicyWindowResizing .classicyWindowResizer { cursor:
  nwse-resize; }`. _WIG Ch.4 "Mouse Pointers" (p.23), Table 4.1; Ch.6 "Moving
  Windows" (p.83)._
- **4.5** ⚠️ package (fix written, not applied): `_Desktop.scss`
  `.classicyStartupScreen { cursor: wait; }`; a new
  `components/_PDFViewer.scss`, included by `windows98.scss`, with
  `.pdfViewerDocumentLoading { cursor: progress; }` (the host's app-starting
  pointer). Both classes exist, and neither Platinum nor System 7 reads them.
  _WIG Ch.4 "Mouse Pointers" (p.23), Table 4.1; Ch.13 "Pointer Design" (p.316)._
- ✅ "Mouse Pointers" (p.24): registered cursors carry their hot spots
  (`--classicy-cursor-<role>-hotspot`, `ClassicyAssetRegistry.ts` l.1032–1060),
  keyword cursors the OS's own, and the 16 × 14 caption buttons, the 16-px grip
  cell and the column resizer's zone are at least the visible part's size.
- **4.6** ⚠️ core hook (additive): while a file drag has no target,
  `startClassicyFileDrag` sets `data-classicy-drop="none"` on the
  `.classicyDesktop` root, removed on a target, a drop, a cancel or a lost
  pointer stream (5.34 adds `"copy"` while a copy applies). No base, Platinum or
  System 7 rule reads it; document it in `docs/AGENT-REFERENCE.md` §4.0.1.
  Package rule at the end of `_Desktop.scss`, inside the wrapper:
  `&[data-classicy-drop='none'], &[data-classicy-drop='none'] * { cursor:
  no-drop; }`, after 5.37's drag rule. 5.32 is the same finding from Ch.5. _WIG
  Ch.4 "Mouse Pointers" (pp.23–24), Table 4.1; Ch.13 "Pointer Design" (p.316);
  Ch.5 "Direct Manipulation Method" (p.62)._
- ✅ "Mouse Actions" (p.24): push buttons act on click with the pressed look on
  `:active`; the caption buttons act on `onClick` (`ClassicyWindowTitleBar.tsx`
  l.106/150/168); scroll arrows, the track and the little arrows repeat while
  held through `useClassicyPressRepeat`.
- **4.7** ⚠️ package: same as 1.19, whose fix (a no-sound MenuItem press hook
  whose class carries a 1-ms animation) closes both. _WIG Ch.4 "Mouse Actions"
  (p.24)._
- **4.8** ⚠️ core layout flag: `layout.mouse?: "mac" | "windows"` (default
  `"mac"`; `"windows"` in `windows98.json`), the flag for Ch.4's press
  discipline (4.8–4.10). Under it ClassicyTabs calls `selectTab(index)` in the
  tab's `mousedown` for button 0 and skips the mouseup select. Platinum and
  System 7 keep selection at the release. Windows 98 as shipped wins over the
  1995 text here. _WIG Ch.4 "Mouse Actions" (p.24); App. A Table A.1 (p.349)._
- **4.9** ⚠️ core layout flag (4.8's `layout.mouse: "windows"`): both
  `changeIcon` handlers ignore movement until the pointer is 4 px from the press
  (`Math.hypot`, as `promoteDragIfNeeded` measures), then keep the grab offset.
  File drags and window moves already wait for their thresholds. _WIG Ch.4
  "Mouse Actions" (p.24)._
- **4.10** ⚠️ core layout flag (4.8's `layout.mouse: "windows"`):
  `startMoveWindow`, `startResizeWindow`, the frame edges,
  ClassicyWindowTitleBar's press, ClassicySplitView's divider, ClassicyTable's
  resizer and the non-file desktop icon drag return unless `e.button === 0`; on
  the desktop button 0 starts the rectangle, button 2 behaves as 5.6 has it,
  other buttons do nothing. ClassicyLink keeps its middle-click new tab, a
  redundant shortcut. ClassicyIcon, the list view, file drags,
  ClassicyScrollArea, the sliders and the bevel pop-ups already check the
  button. _WIG Ch.4 "Mouse Actions" (pp.24–25)._
- **4.11** ⚠️ core hook (= 7.1 / 8.9; lane L2-B is building it), gated by
  `layout.keyboard?: { accessKeys?: boolean }` (`true` in `windows98.json`;
  absent for Platinum and System 7, whose output stays byte for byte the same).
  An `accessKey?: string` prop on ClassicyMenuItem and menu titles,
  ClassicyButton, ClassicyControlLabel (whose key focuses its control),
  ClassicyCheckbox, ClassicyRadioInput and tab definitions. While the flag is
  on: the label's first case-insensitive match is wrapped in `<span
  data-classicy-part="access-key">` (a new vocabulary part); controls get the
  native `accesskey` attribute; menu titles and items get an Alt+letter handler
  in ClassicyShortcutDispatcher, scoped to the open menu or the focused window's
  bar (11.6 adds the cycling rule). Package rule in `_Menu.scss`,
  `_MenuBar.scss`, `_Button.scss` and `_TextField.scss`:
  `[data-classicy-part='access-key'] { text-decoration: underline; }`, shown at
  all times as Windows 95/98 did. _WIG Ch.4 "Access Keys" (p.26); Ch.7 "Menu
  Titles" (p.106), "Menu Item Labels" (p.109); Ch.8 "Navigation in Secondary
  Windows" (pp.148–149)._
- **4.12** ⚠️ core, with 4.11's hook: give the bundled menus and buttons Table
  B.5's letters (the underlined character of each): window-bar titles File F,
  Edit E, View V, Help H, and Special S (its first letter; Table B.5 has none);
  items About A, New N, Open… O, Close and Close Window C, Save S, Save As… A,
  Undo U, Cut t, Copy C, Paste P, Delete D, Select All A, Find F, Hide H, Show
  S, Help Topics T, What's This? W, Properties r, Exit x; the system menu's
  Restore R, Move M, Size S, Minimize n, Maximize x, Close C; the wizard's Back
  B and Next N; message boxes' Yes Y, No N, Retry R; Movie Player's Play P,
  Pause P, Stop S; Quit unmarked unless a product decision gives it Q. OK and
  Cancel take none (ENTER and ESC reach them). Log a dev-mode `classicyLog`
  warning (`Menu` or `Dialog`) when two items in one menu or two controls in one
  window share a key, and let ClassicyControlLabel's key focus its `htmlFor`
  control. B.12 is the same rule from Table B.5. _WIG Ch.4 "Access Keys" (p.26);
  App. B Table B.5 (p.360)._
- ✅ "Mode Keys" (p.27): every bundled chord uses one modifier
  (Control+Backspace, Option+W, Option+Q, Option+H, the native Command edit
  keys); `checkKeyboardEquivalent` requires Command or a function key; the
  Control-drag mode lasts only while the key is held.
- **4.13** ⚠️ the Windows shell (plan 0020-w98): requirement. The taskbar and
  tray that replace the Control Strip under Windows 98 move to a screen edge by
  a plain button-1 drag of the taskbar's empty area and size by dragging its
  inner edge, with the sizing pointer there (Table 4.1), neither needing a
  modifier (1.11 holds the placement requirement, beyond the plan's scope); any
  modifier gesture is only a shortcut for something reachable without one.
  Today's strip is 1.20. _WIG Ch.4 "Mode Keys" (p.27); Ch.3 "The Taskbar"
  (p.15)._
- **4.14** ⚠️ core, with 4.11's `layout.keyboard.accessKeys`:
  ClassicyShortcutDispatcher gives an Alt+letter press to an access key in scope
  (the open menu, the focused window's bar or the dialog) before any
  Option+letter equivalent; menus spell the chord as 7.15's `"names"` does
  (Alt+W). Under the shell a window's Help menu carries no ⌥H (12.1). Windows'
  own Close key (Ctrl+F4) is browser-reserved, so the Alt binding stays as a
  documented residual. _WIG Ch.4 "Shortcut Keys" (p.27)._
- **4.15** ⚠️ core layout flag (additive): a persisted
  `System.Manager.Desktop.shortcutOverrides` map (menu-item id to canonical
  chord), applied by `findMenuItemByShortcut` and by the menu's displayed chord,
  edited with ClassicyKeyboardEquivalentField in a Keyboard control panel listed
  only while the active package declares `layout.keyboard.editableShortcuts:
  true` (Windows 98). Platinum's and System 7's Control Panels and shortcuts are
  unchanged. _WIG Ch.4 "Shortcut Keys" (p.27)._
- **4.16** ⚠️ core layout flag: same as 1.18 (`layout.input.escapeCancels`),
  whose surface list already includes this finding's (the selection rectangle,
  the icon drag, the column resize, the Control Strip). File drags, System 7's
  on-release thumb drag, pop-ups and combo lists already cancel on Escape; the
  live thumb drag's cancel is 6.10. _WIG Ch.4 "Shortcut Keys" (p.27)._
- **4.17** ⚠️ core layout flag (= 7.9; 11.4 and B.6 are the same finding): gated
  by `layout.keyboard.contextMenuKey: true` (Windows 98 only), a keydown handler
  on the desktop root for `ContextMenu` and Shift+F10 prevents the browser's
  event and opens the menu of the focused selection: the focused window's
  selected rows or icons through `itemContextMenu`, or the desktop's selected
  icon's `contextMenu`, at the lower left of the selection's first item; a
  `contextmenu` event with no pointer position (keyboard-originated) is placed
  the same way. Lane 2's 08d728581 (wip/w98-lane2, not on this branch) adds
  `useClassicyContextMenuKey.internal.ts` to ClassicyContextualMenuProvider in
  every package; under the owner's rule it lands behind this flag, or Platinum's
  and System 7's new key path is verified and recorded. _WIG Ch.4 "Shortcut
  Keys" (p.28); App. B Tables B.2 and B.3 (pp.358–359)._
- **4.18** ⚠️ the Windows shell (plan 0020-w98, §2 "Keyboard", §3): requirement.
  The Start menu opens, through a keydown/keyup handler on the desktop root
  active only under the shell, on the keyup of a lone Meta key (no other key
  between its down and up) and on Ctrl+Esc, wherever the browser delivers them
  (on a Windows host the OS takes both before the page; on macOS and Linux they
  arrive), with focus in the menu and the first item highlighted; Esc closes it
  back to the Start button. _WIG Ch.4 "Shortcut Keys" (p.28); App. B Tables B.2
  (p.358), B.3 (p.359)._
- **4.19** ⚠️ core layout flag: under `layout.keyboard.command: "ctrl"`
  (`windows98.json`; default `"metaOrCtrl"`), `shortcutMatchesEvent`,
  `canonicalChordsFromEvent` and `useKeyboardEquivalents`' cancel chord treat
  Command as `e.ctrlKey` alone and ignore events with `e.metaKey` set. Platinum
  and System 7 are unchanged. _WIG Ch.4 "Shortcut Keys" (p.28); App. B Table B.3
  (p.359)._
- **4.20** ⚠️ the Windows shell (plan 0020-w98, §2): requirements. The Start
  button and window buttons draw pressed at the button-down (`:active`, and a
  pressed state while their menu is open); the Start menu opens at the press, as
  a menu title does (Ch.7 p.97), and follows a drag into it; a window button
  acts at the release over it, a release elsewhere cancels; the pointer is the
  arrow over the taskbar, and `ns-resize` (`ew-resize` docked left or right) on
  its inner edge if it sizes. _WIG Ch.4 "Mouse Actions" (p.24); "Mouse Pointers"
  (p.23), Table 4.1._
- **4.21** ⚠️ the Windows shell (plan 0020-w98, §3–§4; access keys are outside
  the plan's scope, 4.11): requirements, with 4.11's `access-key` underline.
  Each window-bar title (File, Edit, View, Help…) and its items, and each Start
  menu item (Programs, Documents, Settings, Find, Help, Run…, Shut Down…), carry
  an access key per Table B.5 (4.12), unique within its bar or menu and
  underlined at all times (Ch.11 Figures 11.12 and 11.18 draw them so, 11.5);
  Alt+letter opens the focused window's bar title; ALT alone enters menu-bar
  mode (B.7); in an open menu a bare letter chooses its item (11.6). _WIG Ch.4
  "Access Keys" (p.26); App. B Table B.5 (p.360)._

---

## Chapter 5 — General Interaction Techniques

Pages read: PDF 47–84 as text, and as images PDF 47–49, 51–55 (Table 5.1, Figure
5.1, the CTRL and SHIFT list sequences, the mouse-selection summary table,
Figure 5.2), 60–61, 74, 78–79 and 82–84 (Figures 5.3, 5.4, 5.13, 5.15–5.19). The
opener, PDF 47, prints its true folio 35; every other running head reads the
placeholder "73". So printed page = PDF − 12 and the chapter is PDF 47–84 =
pp.35–72; Ch.6's opener (PDF 85 = p.75) shows pp.73–74 are absent from the
pre-release, and the contents page numbers these sections up to two pages higher
(Common Conventions 46, Editing Operations 49, Transfer Operations 59). The
first half (pp.35–44, to "Common Conventions for Supporting Operations") is
navigation and selection, 5.1–5.19; the second (pp.44–72) is operations,
editing, transfer, creation and links, 5.20–5.40; the shell's requirements are
5.41–5.46. For cross-reference: Ch.7 "Extended and Multiple Selection List
Boxes" and "List View Controls" (PDF 132–133 = pp.122–123) and Ch.3 "Window
Buttons" (PDF 32 = p.16).

The chapter is behavior almost throughout, so almost every finding is the
core's; each fix is gated by an optional layout key that only `windows98.json`
declares (the selection model under `layout.selection`, the folder views under
`layout.fileBrowser`, transfers under `layout.transfer`, Finder's Windows
commands under 1.21's `layout.finder.commands`), so Platinum and System 7 behave
as they do now. Three earlier rows are corrected here: Ch.7 "Single Selection
List Boxes" (pp.120–121) marked PAGE UP/DOWN ✅, but they only scroll the list
(5.2); Ch.7 "List View Controls" (p.123) was ✅ for structure only, and the
folder views have no region selection or icon-view keyboard (5.12, 5.17); Ch.13
"Highlighting" (p.318, "shown on mouse down") checked the color only, and lists,
tables, trees and window icons highlight at the release (5.5). Where Windows 98
as shipped differs from the text the OS wins, recorded where it applies (the
"Selection Adjustment" and single-selection rows, 5.6). OLE, pen and the Windows
help system stay ➖ with their reasons.

Normative checklist (WIG Ch.5) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| chapter introduction (p.35) | Support the basic techniques for the mouse and the keyboard; an interaction started with one device can be finished with the other. | core menus (7.7–7.9), the icon view (Enter and Space only), the desktop (arrows ignore Shift) | 🔧 see 5.1 |
| introduction (p.35); "Pen Selection" (p.42), Figure 5.2 | Pen navigation and selection; lasso-tap. | none (no pen input) | ➖ |
| "Mouse and Pen Navigation" (p.35) | The pointer moves with the mouse. | none (the host's pointer) | ➖ |
| "Keyboard Navigation" (p.35); Ch.13 "Input Focus Appearance" (p.308) | Keyboard navigation moves the input focus, which is shown; in text it is the insertion point. | `_TextField.scss` (the caret in WindowText), `_ListBox.scss`, `_Table.scss`, `_Button.scss`, `_Tabs.scss`, `_Slider.scss` (`b.focus-rect`); icons are 5.15 | ✅ |
| "Basic Navigation Keys" (pp.35–36), Table 5.1 | In text: arrows, CTRL+arrows by word, HOME/END, CTRL+HOME/END, PAGE UP/DOWN. | native `<input>`, `<textarea>`, contentEditable (Option+arrows on a macOS host, a reasoned adaptation) | ✅ |
| "Basic Navigation Keys", Table 5.1 (pp.35–36) | In a list: arrows by row, HOME/END and CTRL+HOME/END to the first and last row. | `useListNavigation.ts` (ClassicyListBox, ClassicyTree), ClassicyTable `handleKeyDown` | ✅ |
| "Basic Navigation Keys", Table 5.1 (pp.35–36) | PAGE UP and PAGE DOWN move the cursor one screen. | the same, plus ClassicyScrollArea's `onRootKeyDown` (scrolls only) | 🔧 see 5.2 |
| "Basic Navigation Keys", Table 5.1 (pp.35–36) | TAB and SHIFT+TAB move between fields. | native focus order; one roving tab stop per list (`tabStopId`), one per table | ✅ (icons, 5.17) |
| "Basic Navigation Keys", Table 5.1 (pp.35–36) | CTRL+TAB moves to the next larger field. | none (browsers keep CTRL+TAB for their tabs; the tab strip answers its arrows, HOME and END) | ➖ |
| "Basic Navigation Keys" (p.36) | Optionally, SCROLL LOCK scrolls without moving the selection. | none (optional) | ➖ |
| "Selection" (p.36) | Definitions: explicit, implicit, contiguous, disjoint, homogeneous, heterogeneous. | none (definitions) | ➖ |
| "Selection Feedback" (pp.36–37); Ch.13 "Highlighting" (p.318) | Feedback as the selection is made, on every object in the set. | `_ListBox.scss`, `_Table.scss`, `_Icon.scss`, `_Desktop.scss` (Hilight, HilightText, the ILD_SELECTED dither), `*::selection`, the live desktop marquee | ✅ |
| "Scope of Selection" (p.37) | Selections in different scopes are independent. | `System.Manager.Desktop.selectedIcons`; each ClassicyFileBrowser's own selection | ✅ |
| "Hierarchical Selection" (p.37), Figure 5.1 | Optionally, a range past its containment rises a level. | none (no range crosses containment) | ➖ |
| "Mouse Selection", "Selection with the Mouse" (p.37); "Selection Adjustment" (pp.38–39) | Dragging selects a range, tracking the pointer; the modifier held at the press governs until the release. | core ClassicyListBox, ClassicyTable (select on click only) | 🔧 see 5.3 |
| "Mouse Selection" (p.37) | Where dragging moves objects, multiple selection by modifier clicks or region selection. | Finder list view ✅; the desktop (no modifiers), the icon view (neither) | 🔧 see 5.4 |
| "Selection with the Mouse" (pp.37–38); Ch.13 "Highlighting" (p.318) | The press sets the anchor and resets the selection at once, with feedback at the press. | core ClassicyListBox, ClassicyTable, ClassicyTree, ClassicyIcon (`onClick`, at the release); desktop icons ✅ | 🔧 see 5.5 |
| "Selection with the Mouse" (pp.37–38) | Either button selects; button 2 on a selected item keeps the selection and shows its menu. | core ClassicyDesktopIcon (collapses the selection), ClassicyFileBrowser (selects nothing), ClassicyDesktop's empty area | 🔧 see 5.6 |
| "Selection with the Mouse" (p.38) | A button-2 selection shows its pop-up menu at the release. | core ClassicyContextualMenuProvider (opens at the event; at the press on macOS and Linux hosts), `startSelectBox` (at the press) | 🔧 see 5.7 |
| "Selection with the Mouse" (p.38) | Single selection: a new selection cancels the old; a press on a selected item keeps it; a release without movement may reset it to that item. | ClassicyDesktopIcon (press and `clickFocus`), ClassicyListBox, ClassicyTable, the list view's `startRowDrag` | ✅ |
| "Selection with the Mouse" (p.38), "Selection Adjustment" (pp.38–39), summary table (p.42) | In a folder window: click replaces, empty space resets, CTRL toggles, SHIFT extends, a drag carries the selection. | core ClassicyIcon (each icon toggles its own `active`), ClassicyFileBrowserViewIcons | 🔧 see 5.8 |
| "Selection with the Mouse" (p.38) | A selection may be inferred from proximity. | native text; whole-row hit areas | ✅ |
| "Selection Adjustment" (pp.38–39), summary table (p.42) | CTRL toggles and moves the anchor; SHIFT extends from a fixed anchor. | `ClassicyListBox.applySelection`, `ClassicyTable.applySelection` (Shift alone replaces other disjoint selections, as user32 and comctl32 do: the OS kept) | ✅ |
| "Selection Adjustment" (p.39) | Adjusting from the anchor leaves other disjoint selections; the range takes the anchor's state. | the same (Ctrl+Shift takes the Shift branch) | 🔧 see 5.9 |
| "Selection Adjustment" (pp.38–39), summary table (p.42) | Desktop icons take CTRL+click and SHIFT+click. | core ClassicyDesktopIcon, `ClassicyDesktopIconFocus` | 🔧 see 5.10 |
| "Region Selection" (p.42) | A press on the background starts region selection with a live outline; the release keeps the selection. | ClassicyDesktop `startSelectBox`, `resizeSelectBox`, `clearSelectBox`; `_Desktop.scss` `.classicyDesktopSelect` | ✅ |
| "Region Selection" (p.42) | Region selection applies the SHIFT and CTRL rules. | the same (every rectangle clears first) | 🔧 see 5.11 |
| "Region Selection" (p.42); Ch.7 "List View Controls" (p.123) | A folder window supports region selection from its empty space. | core ClassicyFileBrowser, ClassicyFileBrowserViewIcons, ClassicyFileBrowserViewTable (no marquee) | 🔧 see 5.12 |
| "Region Selection" (p.42) | Show the outline once the user presses and moves. | ClassicyDesktop (the element renders at the press, a dot under every click) | 🔧 see 5.13 |
| "Region Selection" (p.42); Windows 98 as shipped (DrawFocusRect XOR) | The outline is the dotted rectangle XORed over what lies beneath, the icons included. | `_Desktop.scss` `.classicyDesktopSelect` (white dots, under the icons' z-index) | 🔧 see 5.14 |
| "Keyboard Selection" (p.43) | Implicit selection with navigation, or explicit with a Select key. | ClassicyListBox, ClassicyTable, the desktop (implicit); ClassicyTree (explicit) | ✅ |
| "Keyboard Selection" (p.43), "Selection Feedback" (p.36) | The dotted outline marks the one focus item; selection is shown by the selection appearance. | `_Desktop.scss`, `_Icon.scss` `label-selected` (a rectangle on every selected icon, none on a focused unselected one) | 🔧 see 5.15 |
| "Keyboard Selection" (p.43) | SPACEBAR is the Select key (CTRL+SPACEBAR where Space conflicts); it may toggle. | ClassicyListBox ✅; ClassicyTable (no Space), ClassicyDesktopIcon and ClassicyIcon (Space opens) | 🔧 see 5.16 |
| "Contiguous Selection" (p.43) | SHIFT+navigation extends from the anchor; an unshifted key cancels; the range takes the anchor's state. | native text; ClassicyListBox, ClassicyTable (kept anchor) | ✅ |
| Table 5.1 (pp.35–36); "Keyboard Selection", "Contiguous Selection" (p.43); Ch.7 "List View Controls" (p.123) | An icon view is one field; arrows, HOME, END and type-select move inside it, SHIFT extends. | ClassicyDesktopIcon and ClassicyIcon (every icon a Tab stop), ClassicyDesktop `handleKeyDown` (no Home, End or Shift), the icon view (no keys) | 🔧 see 5.17 |
| "Disjoint Selection" (pp.43–44) | Move with the navigation keys, add with Select; Add mode (SHIFT+F8) where navigation selects implicitly. | `useListNavigation`, ClassicyListBox, ClassicyTable, the desktop (navigation always selects; no F8) | 🔧 see 5.18 |
| "Selection Shortcuts" (p.44) | A button-1 double-click runs the default operation. | ClassicyDesktopIcon, ClassicyIcon, ClassicyTable, ClassicyListBox, ClassicyTree | ✅ |
| "Selection Shortcuts" (p.44) | In text, a double-click selects the word and the space after it, not punctuation. | ClassicyInput, ClassicyTextEditor (the browser's: the trailing space on Windows hosts only) | 🔧 see 5.19 |
| "Selection Shortcuts" (p.44) | A selection shortcut is never the only way to a selection. | ClassicyTable Ctrl/Cmd+A beside click and Shift-range | ✅ |
| "Selection with the Mouse" (p.38), "Region Selection" (p.42) | A layered editor: a press selects the object under the pointer, the background deselects. | HyperCard editor (`HyperCardEditorOverlay.tsx`), its handles (13.10) | ✅ |
| "Common Conventions for Supporting Operations" (p.44); "Default Operations and Shortcut Techniques" (p.45) | More than one technique per operation (size a window by command and by drag). | core ClassicyWindow (no Move, Size, Minimize or Maximize command) | 🔧 see 5.20 (= 7.10) |
| "Common Conventions for Supporting Operations" (p.44) | Operations are contextual: an object's menu holds its type's commands and its container's. | core contextual menus (innermost wins), Finder's `itemContextMenu` (Restore in the Trash, Move To Trash elsewhere) | ✅ |
| "Operations for a Multiple Selection" (p.44) | Offer the operations common to the selection's members. | Finder `itemContextMenu` (acts on the selection when the item is in it) | ✅ |
| "Operations for a Multiple Selection" (p.44) | Limit an operation to its selection's scope (a word deleted in one window never deletes another's selection). | file operations ✅ (`ClassicyFileBrowser`, `ClassicyDesktop`, each Finder window's `commandsRef`); text: core `ClassicyEditCommands.ts` `resolveTarget` | 🔧 see 5.21 |
| "Operations for a Multiple Selection" (p.44); "Direct Manipulation Transfers" (p.66) | A drag from a selected object carries the whole selection. | core ClassicyIcon `startDrag`, ClassicyFileBrowserViewIcons `onFileDrag` (one item); list view and desktop ✅ | 🔧 see 5.22 |
| "Default Operations and Shortcut Techniques" (pp.44–45); "View Shortcuts" (p.47) | Double-click or ENTER runs the default command. | ClassicyDesktopIcon (double-click, Enter, Space), ClassicyIcon, the list's Return | ✅ |
| "Default Operations and Shortcut Techniques" (p.45); "View Shortcuts" (p.47) | A shortcut is never the only way: Open also on the object's menu; CTRL+O opens the selection. | core Finder (no Open in File or item menus), desktop items and app shortcuts (no menu), the drive menu | 🔧 see 5.23 |
| "View Operations" (p.45) | A new window at the top of its peers and activated; secondary windows above their application's. | core `ClassicyWindowOpen`; z-order bands (app 150, focused 300, palettes 350, modals 370) | ✅ |
| "View Operations" (p.45) | A window opening after the user turned elsewhere does not come to the top. | core window registration (the commit after the command; a reload never steals focus) | ✅ |
| "View Operations" (p.46) | Re-running the command that opened a window activates it, not a second instance (Finder's own opens). | `Finder.tsx` `openFolder` (`ClassicyWindowOpen` + `ClassicyWindowFocus`); `openPaths` a Set | ✅ |
| "View Operations" (p.46) | The same from anywhere: reopening an open object activates its window. | core generic `*OpenFile` route, `openApp`, `ClassicyAppFinderOpenFolder` from the desktop (the app's last window comes forward) | 🔧 see 5.24 |
| "View Operations" (p.46); "Transactions" (p.49) | Closing a window with changes asks to apply, discard or cancel. | core `SimpleText.tsx` (no prompt) | 🔧 see 5.25 (= 1.17) |
| "View Operations" (p.46) | Close does not necessarily quit; Close is not Cancel. | core `closeApp` / `ClassicyWindowClose`; dialogs' Cancel (`role: "cancel"`) | ✅ |
| "Editing Text" (p.47) | The insertion point shows a field's focus. | `_TextField.scss` `field-marks` (`caret-color`), `client-edge` (no ring) | ✅ |
| "Inserting Text" (p.47) | Each character moves the insertion point; a multi-line field word-wraps. | native controls (no `wrap="off"`) | ✅ |
| "Overtype Mode" (p.48), Figure 5.3 | Optional overtype, a block cursor toggled by INSERT. | none (optional; neither the browser nor Windows' EDIT control has it) | ➖ |
| "Deleting Text" (p.48) | DELETE and BACKSPACE close the gap; no Clipboard; at least one undo. | native editing; Edit ▸ Undo titled from the last input type (`inputTypeLabel`) | ✅ |
| "Deleting Text" (p.48); "Command Method" (p.61) | Typing or pasting replaces a selection; the caret ends after the insertion. | native editing; `classicyEditCommands.paste` (`setRangeText(…, "end")`) | ✅ |
| "Handles" (p.49), Figure 5.4 | Solid handles act, hollow ones do not; drawn in the highlight color. | `_HyperCard.scss` `.classicyHyperCardEditorHandle` (every handle resizes) | ✅ |
| "Handles" (p.49) | The title bar moves a window and its borders size it. | core title bar ✅; the frame edges move it | 🔧 see 5.26 (= 6.5) |
| "Handles" (p.49) | A selected icon is its own move handle. | ClassicyIcon / ClassicyDesktopIcon drags | ✅ |
| "Transactions" (p.49) | Prompt for pending transactions when a window closes. | `HyperCard.tsx` `confirmDirtyStack`, `onBeforeCloseMain` | ✅ |
| "Transactions" (pp.49–50) | Name transaction commands Save, Close, Undo, Redo, Repeat, Apply, Cancel. | SimpleText Save, `useClassicyEditMenu` Undo ("Can't Undo"), Cancel (Redo, Repeat, Apply not offered, as Notepad and WordPad) | ✅ |
| "Transactions" (p.50) | Name process commands Pause, Resume, Stop. | none (no pausable process) | ➖ |
| "Properties" (p.51); "View Operations" (pp.45–46); "View Shortcuts" (p.47) | Properties shows the property sheet; ALT+ENTER and ALT+double-click; an open sheet is activated. | core Finder and desktop menus (no Properties) | 🔧 see 5.27 (= 2.2) |
| "Properties" (p.51) | Folder views may show properties too. | ClassicyFileBrowserViewTable columns (Date Modified, Created, Size, Kind, Label); header counts | ✅ |
| "Pen-Specific Editing Techniques" (pp.51–56), Figures 5.5–5.12, Table 5.2; "Direct Manipulation Method" (p.61) | Writing tools, action handles, pen gestures, barrel-button drags. | none (no pen services) | ➖ |
| "Command Method" (pp.59–61); "Direct Manipulation Method" (p.61); "Command Method Transfers" (p.66) | Cut, Copy, Paste on the Edit and pop-up menus; direct manipulation never the only transfer; a Cut object shown dithered until pasted. | core Finder (Edit: Select All and Preferences), the desktop (Edit disabled), `fs` (move only) | 🔧 see 5.28 |
| "Command Method" (p.59) | Cut, Copy and Paste on the Edit drop-down (text). | `useClassicyEditMenu` in SimpleText and three control panels | ✅ |
| "Command Method" (p.59) | A text selection's pop-up menu: Undo, Cut, Copy, Paste, Delete, Select All. | core ClassicyDesktop `toggleDesktopContextMenu` (prevents every `contextmenu`); no text component renders a menu | 🔧 see 5.29 |
| "Command Method" (pp.59–61) | Plain Paste inserts native content and leaves the Clipboard unchanged. | `classicyEditCommands.paste` (`navigator.clipboard.readText()`) | ✅ |
| "Shortcut Keys for Transfer Operations" (pp.67–68) | CTRL+X, CTRL+C, CTRL+V spelled so. | `useClassicyEditMenu` (⌘X, ⌘C, ⌘V, ⌘Z glyphs; the keys work natively) | 🔧 see 5.30 (= 7.15) |
| "Shortcut Keys for Transfer Operations" (pp.67–68) | The transfer keys are never reassigned; ESC cancels a drag. | no bundled command binds ⌃X, ⌃C, ⌃V; `ClassicyFileDrag.ts` Escape | ✅ |
| "Direct Manipulation Method" (p.62) | Any visible object can take a drop, an inactive window's included. | `findClassicyFileDropTarget` (drop marks before `.classicyWindow`) | ✅ |
| "Direct Manipulation Method" (p.62) | A drop in an inactive window activates it. | core Finder `onMoveItems`, ClassicyDesktop `moveDesktopItems` (no focus) | 🔧 see 5.31 |
| "Direct Manipulation Method" (p.62); "Direct Manipulation Transfers" (p.67), Figure 5.17 | A refusing destination gives feedback (the no-drop pointer). | core `findClassicyFileDropTarget` / `BLOCKING_SELECTOR` | 🔧 see 5.32 (= 4.6) |
| "Default Drag and Drop" (p.62) | The default drag runs the destination's default, usually Move; never a destructive default unconfirmed. | `moveClassicyFileSystemItems`; the Trash (restorable); Empty Trash behind a warning | ✅ |
| "Default Drag and Drop" (p.62) | Press button 1, move, release at the destination. | `ClassicyFileDrag.ts` (`CLASSICY_FILE_DRAG_THRESHOLD` 4, SM_CXDRAG's default) | ✅ |
| "Nondefault Drag and Drop" (pp.62–63), Figure 5.13; "Canceling a Drag and Drop Transfer" (p.64) | A button-2 drag ends in a menu: Move Here, Copy Here, Create Shortcut Here, Cancel, the default bold. | core ClassicyIcon, ClassicyDesktopIcon, ClassicyFileBrowserViewTable (button 0 only) | 🔧 see 5.33 |
| "Canceling a Drag and Drop Transfer" (p.64) | A drop back on itself cancels; ESC cancels. | `ClassicyFileMove.ts` (skips itself, same-folder silent), `ClassicyFileDrag.ts` (Escape in the capture phase) | ✅ |
| "Differentiating Transfer and Selection When Dragging" (p.64) | A drag from a selection transfers; from the background, selects. | ClassicyDesktop `startSelectBox`; icon drags | ✅ |
| "Scrolling When Transferring by Dragging" (pp.64–65), Figure 5.14 | Auto-scroll near an edge, only when the drag is slow (the velocity rule). | core `startClassicyFileDrag` (no scrolling) | 🔧 see 5.35 (extends 6.11) |
| "Shortcut Keys for Transfer Operations" (pp.67–68); "Direct Manipulation Transfers" (p.67), Figure 5.16 | CTRL+drag copies; the pointer shows the operation. | core `ClassicyFileDrag.ts` (no modifier read), `fs` (no copy) | 🔧 see 5.34 |
| "Direct Manipulation Transfers" (p.66); "Canceling a Drag and Drop Transfer" (p.64) | The source stays at its place until the transfer completes; ESC cancels. | core ClassicyDesktopIcon (non-file icons follow the pointer live; no Escape) | 🔧 see 5.36 |
| "Direct Manipulation Transfers" (p.66), Figure 5.15 | The source stays shown selected; a representation (outline or translucent) follows. | `ClassicyFileDragOutline.ts` (a dotted outline), `.classicyFileDragGhost` | ✅ |
| "Command Method Transfers" (p.66) | Cut removes visually; Copy needs no feedback; Paste's feedback is the insertion. | native text editing | ✅ |
| "Direct Manipulation Transfers" (p.67), Figure 5.16 | The pointer suits the destination: the arrow for a move; the I-beam only between characters. | `_Desktop.scss` (no rule for `body.classicyFileDragging`) | 🔧 see 5.37 |
| "Direct Manipulation Transfers" (p.67), Figure 5.16 | A move adds no glyph. | `ClassicyFileDrag.ts` (move only) | ✅ |
| "Direct Manipulation Transfers" (p.67) | Show a destination's receptivity, e.g. highlighted as selected. | `_Icon.scss`, `_Desktop.scss` (icons drawn selected); a window's WindowText frame ✅; `_Table.scss` (a list row keeps Mac OS 8's darkening) | 🔧 see 5.38 |
| "Specialized Transfer Commands" (p.67) | Delete moves a file to the Recycle Bin; Clear removes content. | `moveClassicyItemsToTrash`, Edit ▸ Clear | ✅ |
| "Specialized Transfer Commands" (p.67) | The command is Delete and the container the Recycle Bin. | core Finder ("Move To Trash"), the Trash icon | 🔧 see 5.39 |
| "Specialized Transfer Commands" (p.67) | Optional Duplicate, Print, Send To. | none (optional; no printer or Send To) | ➖ |
| "Creation Operations" (p.69); "New Command" (p.69); "Command Method" (p.61) | The shell creates objects too: New creates in place and selects the result. | core Finder, ClassicyDesktop (New Folder only in the Save dialog) | 🔧 see 5.40 |
| "New Command" (p.69); "Using Controls" (p.69) | New creates by type; tools may create. | SimpleText File ▸ New; HyperCard's New Card and part tools | ✅ |
| "Command Method" (pp.59–61); "Scraps" (p.69); "Insert Command" (p.69) | OLE Paste forms, scraps, Insert Object. | none (OLE) | ➖ |
| "Using Templates" (p.70), Figure 5.18 | Templates create objects by New. | none (no template type) | ➖ |
| "Operations on Linked Objects" (pp.70–71) | Linked objects keep absolute and relative paths. | none (shortcuts name URLs or app ids) | ➖ |
| "Operations on Linked Objects" (p.72), Figure 5.19 | A jump looks like a button or shows the hand. | `ClassicyLink.scss` (`cursor: pointer`), `_Placard.scss` `.classicyLink`; HyperCard buttons | ✅ |
| "View Operations" (p.45, Help), "View Shortcuts" (p.47, F1, SHIFT+F1, ALT+F4) | F1 Help, SHIFT+F1 Help mode, ALT+F4 closes. | none here (Help is Ch.12's, 12.2–12.4; the OS takes ALT+F4 on a Windows host, B.8) | ➖ |
| "Scope of Selection" (p.37) | The taskbar, Start menu, tray and each window's bar are scopes of their own. | the coming shell; `ClassicyDesktopFocus` | ⚠️ see 5.41 (shell) |
| Table 5.1 (pp.35–36); "Keyboard Navigation" (p.35) | The taskbar is reached by TAB as fields; the navigation keys move inside each. | the coming taskbar | ⚠️ see 5.42 (shell) |
| "Selection with the Mouse" (pp.37–38), "Selection Feedback" (p.36) | Button 2 on a taskbar item shows its menu at the release; button 1 shows feedback at once. | the coming taskbar | ⚠️ see 5.43 (shell) |
| "Command Method" (p.59), "Properties" (p.51), "Operations for a Multiple Selection" (p.44) | The window's own Edit and File menus carry the command method, acting on that window alone. | the coming window bars | 🔧 see 5.44 (shell) |
| "Direct Manipulation Method" (p.62); Ch.3 "Window Buttons" (p.16) | Dragging over a taskbar button activates its window for the drop. | the coming task buttons; `BLOCKING_SELECTOR` | 🔧 see 5.45 (shell) |
| "View Operations" (p.45) | The new window's button appears and shows the active state. | the coming task buttons | 🔧 see 5.46 (shell) |


### Findings — Chapter 5

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 5.1 | LOW | A menu opened with the mouse cannot be continued from the keyboard (7.7–7.9); the icon view has no keyboard navigation; a desktop marquee selection cannot be extended from the keyboard. | core | 🔧 Fixed (cb7ffc984, d4a23b190) |
| 5.2 | LOW | PAGE UP and PAGE DOWN scroll a list without moving its cursor or selection; user32's list box moves both a page. Corrects the Ch.7 "Single Selection List Boxes" row. | core `useListNavigation.ts`, ClassicyTable, ClassicyScrollArea | 🔧 Fixed (462e43608) |
| 5.3 | LOW | A drag across rows selects nothing: ListBox and Table select in `onClick` alone, and the click lands on the rows' common ancestor. | core ClassicyListBox, ClassicyTable | 🔧 Fixed (27e4d9d61) |
| 5.4 | LOW | Where dragging moves objects, the desktop has region selection but no modifier clicks, the icon view neither (its only multiple selection is click-to-toggle). | core | 🔧 Fixed (d4a23b190) |
| 5.5 | MEDIUM | Lists, tables (the Finder's list view included), trees and window icons select at the release, so a press shows nothing; a list-view row dragged before it is selected moves without ever being drawn selected. Corrects the Ch.13 "Highlighting" row. | core ClassicyListBox, ClassicyTable, ClassicyTree, ClassicyIcon | 🔧 Fixed (27e4d9d61, cb7ffc984) |
| 5.6 | MEDIUM | Right-clicking one of several selected desktop icons collapses the selection to it; in a Finder window a right-clicked unselected item gets no highlight while the menu acts on it alone; the desktop's empty area keeps its icon selection under button 2. | core ClassicyDesktopIcon, ClassicyFileBrowser, ClassicyTable, ClassicyIcon, ClassicyDesktop | 🔧 Fixed (be51df8bd, 3a30ada87) |
| 5.7 | LOW | Menus open the moment `showContextMenu` is called: at the release on Windows hosts, at the press on macOS and Linux; the desktop opens its menu on the button-2 mousedown on every host. | core ClassicyContextualMenuProvider, ClassicyDesktop | 🔧 Fixed (be51df8bd) |
| 5.8 | MEDIUM | In the icon view every icon toggles its own selection on click: a second click leaves the first selected, a click on a selected icon deselects it, empty space clears nothing, modifiers are ignored, and a drag moves only the pressed icon. | core ClassicyIcon, ClassicyFileBrowserViewIcons, ClassicyFileBrowser | 🔧 Fixed (cb7ffc984) |
| 5.9 | LOW | Ctrl+Shift-click takes the Shift branch: other disjoint selections are discarded and the range is always selected, whatever the anchor's state. | core `applySelection` (ListBox, Table) | 🔧 Fixed (27e4d9d61) |
| 5.10 | MEDIUM | Shift-click and Ctrl/Cmd-click on a desktop icon both replace the selection; the marquee is the desktop's only route to a multiple selection. | core ClassicyDesktopIcon, `ClassicyDesktopIconContext.tsx` | 🔧 Fixed (d4a23b190) |
| 5.11 | LOW | A Shift- or Ctrl-drag marquee cannot add to or toggle a selection: every press clears it first. | core ClassicyDesktop, `ClassicyDesktopManager.tsx` | 🔧 Fixed (d4a23b190, 3a30ada87) |
| 5.12 | MEDIUM | Neither folder view has a marquee: a press on a folder window's empty space selects and draws nothing. Corrects the Ch.7 "List View Controls" row. | core ClassicyFileBrowser and its two views | 🔧 Fixed (cb7ffc984) |
| 5.13 | LOW | The marquee renders at the press at size zero, so every click on the desktop draws a dotted dot until the release. | core ClassicyDesktop | 🔧 Fixed (d4a23b190, 3a30ada87) |
| 5.14 | LOW | The marquee is a white dotted ring (the header admits an approximation of the XOR) drawn under the icons, where the shell's XOR drew over them. | `_Desktop.scss` | 🔧 Fixed (d4a23b190) |
| 5.15 | LOW | Every selected icon gets the dotted focus rectangle, a focused unselected icon none, and a keyboard-focused window icon the browser's ring around its whole box. | `_Desktop.scss`, `_Icon.scss` | 🔧 Fixed (cb7ffc984) |
| 5.16 | LOW | ClassicyTable has no Space case (the scroll area pages instead), and desktop and window icons open on Space, so Space can never select an icon. | core ClassicyTable, ClassicyDesktopIcon, ClassicyIcon | 🔧 Fixed (462e43608, cb7ffc984, d4a23b190, 3a30ada87) |
| 5.17 | MEDIUM | Every desktop and window icon is its own Tab stop; the desktop's arrows do nothing with nothing selected and ignore Shift and Ctrl; HOME, END and the Page keys are unhandled; the icon view has no navigation keys. | core ClassicyDesktopIcon, ClassicyDesktop, ClassicyIcon, ClassicyFileBrowserViewIcons | 🔧 Fixed (cb7ffc984, d4a23b190, 3a30ada87) |
| 5.18 | LOW | Navigation always selects and nothing handles F8, so a disjoint selection cannot be built from the keyboard. | core `useListNavigation`, ClassicyListBox, ClassicyTable, ClassicyDesktop | 🔧 Fixed (462e43608, d4a23b190, 3a30ada87) |
| 5.19 | LOW | A double-click takes the following space only on Windows hosts (the browser's editing behavior); on macOS and Linux it is left out. | core ClassicyInput, ClassicyTextEditor | 🔧 Fixed (fdbf94e78) |
| 5.20 | LOW | A window moves and sizes only by dragging; there is no Move, Size, Minimize or Maximize command. Same as 7.10 / 6.2. | core ClassicyWindow | 🔧 Fixed (5d8266d49, 63ebc2f3f) |
| 5.21 | MEDIUM | `resolveTarget` falls back to the last editable field anywhere in the document: select a word in SimpleText, click into Date & Time, choose Edit ▸ Clear there, and the SimpleText word is deleted. | core `ClassicyEditCommands.ts` | 🔧 Fixed (fdbf94e78) |
| 5.22 | LOW | In the icon view a drag from one of three selected icons moves one item, while File ▸ Move To Trash acts on all three. | core ClassicyIcon, ClassicyFileBrowserViewIcons | 🔧 Fixed (cb7ffc984) |
| 5.23 | MEDIUM | No Finder File menu has Open; an item's menu is Move To Trash alone; Desktop Folder items and app shortcuts have no menu; a drive's is Initialize…, Sync, Backup. Double-click and Enter, both shortcuts, are the only ways to open. | core `Finder.tsx`, `ClassicyFileMove.ts`, `ClassicyApp.tsx`, `ClassicyDriveSetupUtils.ts` | 🔧 Fixed (c1ab2bf24, 3a30ada87) |
| 5.24 | LOW | Reopening an open document or folder from Finder or the desktop focuses the app, not the object's window: the app's last-focused window comes forward. | core generic `*OpenFile` route, `ClassicyAppFinderOpenFolder` | 🔧 Fixed (3ee697577) |
| 5.25 | MEDIUM | SimpleText loses unsaved text on close without a prompt. Same as 1.17. | core `SimpleText.tsx` | 🔧 Fixed (3ee697577) |
| 5.26 | MEDIUM | The frame edges move the window; only the grow box sizes it. Same as 6.5. | core ClassicyWindow | 🔧 Fixed (2e45e70d8) |
| 5.27 | LOW | No Properties command, sheet or ALT+ENTER. Same as 2.2. | core Finder | 🔧 Fixed (57ae34974) |
| 5.28 | MEDIUM | Files and folders move between folders only by dragging: no Cut, Copy or Paste for them, the desktop's Edit menu is disabled, and the file system has no copy. | core Finder, ClassicyDesktop, `ClassicyFileSystem.ts` | 🔧 Fixed (d7f1b8d3f) |
| 5.29 | MEDIUM | Right-clicking a text selection shows nothing, or the window's or app's menu: the desktop prevents every `contextmenu` and no text component renders one. | core ClassicyDesktop, ClassicyInput, ClassicyTextEditor, ClassicyRichTextEditor, ClassicyComboBox, ClassicySpinner | 🔧 Fixed (fdbf94e78) |
| 5.30 | LOW | The Edit menu spells ⌘X, ⌘C, ⌘V and ⌘Z; on a Windows host ⌘ is the Windows key, so the menu names a key the user does not press. Same as 7.15. | core `useClassicyEditMenu`, ClassicyKbd | 🔧 Fixed (7470e0537) |
| 5.31 | LOW | A drop into an inactive Finder window moves the items but does not activate the window. | core Finder `onMoveItems`, ClassicyDesktop `moveDesktopItems` | 🔧 Fixed (d7f1b8d3f, 3a30ada87) |
| 5.32 | LOW | A refusing surface looks the same as empty space during a drag. Same as 4.6. | core `ClassicyFileDrag.ts` | 🔧 Fixed (37d580c6d) |
| 5.33 | LOW | Every drag source ignores a button-2 press: no nondefault drag, no completion menu. | core ClassicyIcon, ClassicyDesktopIcon, ClassicyFileBrowserViewTable, `ClassicyFileDrag.ts` | 🔧 Fixed (3a69b2ed0, 37d580c6d) |
| 5.34 | LOW | Ctrl+drag behaves as a plain drag: the drag reads no modifier and `fs` has no copy, so there is no copy and no copy pointer. | core `ClassicyFileDrag.ts`, `ClassicyFileSystem.ts` | 🔧 Fixed (37d580c6d) |
| 5.35 | LOW | A file drag never scrolls the view under it, so a destination out of view cannot be reached without dropping first. Extends 6.11 with the WIG's velocity rule. | core `startClassicyFileDrag` | 🔧 Fixed (37d580c6d) |
| 5.36 | LOW | App shortcuts, drives and the Trash follow the pointer live: nothing stays at the origin, no outline is drawn, and Escape leaves the icon where the pointer took it. | core ClassicyDesktopIcon | 🔧 Fixed (37d580c6d) |
| 5.37 | LOW | During a file drag the pointer is whatever the element under it declares: the I-beam over a text area, the hand over a link, though nothing can be dropped there. | `_Desktop.scss` | 🔧 Fixed (37d580c6d) |
| 5.38 | LOW | A list-view folder row under a drag keeps the base's Mac OS 8 darkening (`filter: brightness(0.55)`) instead of the selected look the package gives icons. | `_Table.scss` | 🔧 Fixed (37d580c6d) |
| 5.39 | LOW | Delete works as the WIG says but keeps the Mac name "Move To Trash"; the container's name is 1.15. | core Finder, ClassicyDesktop | 🔧 Fixed (c1ab2bf24) |
| 5.40 | MEDIUM | Folders can be created only inside a Save dialog: Finder's File menu, a folder window's background and the empty desktop's menu have no New. | core Finder, ClassicyDesktop | 🔧 Fixed (c1ab2bf24, 3a30ada87) |
| 5.41 | MEDIUM | Using the taskbar, Start menu, tray or a window's bar must never change a selection; today `ClassicyDesktopFocus` clears the desktop icons for any press whose target is `#classicyDesktop`. | the coming shell; `ClassicyDesktopManager.tsx` | ⚠️ Deferred (shell addendum B9, not implemented) |
| 5.42 | MEDIUM | The taskbar's keyboard navigation is not defined yet. | the coming taskbar | ⚠️ Deferred (shell addendum B10, not implemented) |
| 5.43 | LOW | The taskbar's button-2 menus and button-1 feedback are not defined yet. | the coming taskbar | ⚠️ Deferred (shell addendum B11, not implemented) |
| 5.44 | MEDIUM | Folder windows' Edit menu holds only Select All and Preferences…, and the Edit commands resolve their target outside the window (5.21). | the coming window bars; bundled `appMenu`s | 🔧 Fixed (fdbf94e78, 1ed1b21f7) |
| 5.45 | LOW | The screen bar is in `BLOCKING_SELECTOR`, so a drag over it is refused without activation or feedback; a minimized window cannot take a drop. | the coming task buttons; `ClassicyFileDrag.ts` | 🔧 Fixed (f39f67a54, 37d580c6d) |
| 5.46 | LOW | The task buttons must show the core's open and active state. | the coming task buttons | 🔧 Fixed (11d0b9502) |

**Details & fixes**

- **5.1** ⚠️ core, no hook of its own: the device-switch gaps close with 7.7–7.9
  (menu keyboard), 5.17 (icon keyboard navigation) and 5.18 (keyboard disjoint
  selection). Escape already ends a file drag started with the mouse. _WIG Ch.5
  chapter introduction (p.35)._
- **5.2** ⚠️ core layout flag: `layout.selection.pageKeys?: "scroll" | "move"`
  (default `"scroll"`; `"move"` in `windows98.json`), added to
  `ClassicyAppearanceLayout` and the strict `ClassicyAppearanceLayoutSchema`
  like every key below. Under `"move"`, `useListNavigation` takes an optional
  `pageRows()` and handles PageUp and PageDown with `preventDefault`: the key
  moves to the first or last fully visible row, or one viewport further when the
  cursor is there (`floor(viewport.clientHeight / row height)` rows), returning
  the row id as Home and End do, so ClassicyListBox selects it (Shift extends)
  and ClassicyTree moves focus only; ClassicyTable's `handleKeyDown` adds the
  two cases through `moveCursorTo`, so the scroll area no longer pages. Mac OS
  lists scroll without moving the selection, hence the gate. B.3 is the same
  rule from Table B.1. _WIG Ch.5 "Basic Navigation Keys", Table 5.1 (pp.35–36)._
- **5.3** ⚠️ core layout flag: `layout.selection.dragRange?: boolean` (`true` in
  `windows98.json`), meaningful with 5.5's `selectOn: "press"`. For
  ClassicyListBox and any ClassicyTable whose rows do not drag: at the press
  record the anchor, the modifiers and a copy of the selection; a document
  `mousemove` finds the row under the pointer
  (`elementFromPoint(…).closest('[role=option]')` or `'tr[data-row-id]'`),
  clamped to the first or last row outside the list, and auto-scrolls the
  viewport a `lineStep` a frame while the pointer is outside it; a
  single-selection list selects that row, a multi-selection one applies
  anchor..row (no modifier), the pre-press selection with anchor..row set to the
  anchor's state (Ctrl/Cmd), anchor..row (Shift), or 5.9's rule (both); the
  press's modifiers hold until the release (p.39); the drag ends on `mouseup` or
  `onClassicyPointerStreamLost`; `onChangeFunc` fires on each change. The
  Finder's list view drags files, so region selection is its route (5.12). _WIG
  Ch.5 "Mouse Selection", "Selection with the Mouse" (p.37); "Selection
  Adjustment" (pp.38–39)._
- **5.4** ⚠️ core, no hook of its own: the Finder's list view complies
  (Ctrl/Cmd-click and Shift-click, `ClassicyTable.applySelection`); the rest
  closes with 5.8, 5.10 and 5.12. _WIG Ch.5 "Mouse Selection" (p.37)._
- **5.5** ⚠️ core layout flag: `layout.selection.selectOn?: "click" | "press"`
  (default `"click"`; `"press"` in `windows98.json`). Under `"press"`:
  ClassicyListBox selects in a row's `onMouseDown` (button 0, row and list
  enabled) through `selectRow` and `applySelection(index, e)`, marking the press
  in a ref as ClassicyDesktopIcon's `selectedOnPressRef` does, and the click
  ending it returns, except that an unmodified press on an already selected row
  of a multi-selection list defers to the click, which resets the selection to
  it; ClassicyTable does the same for an unselected row or a modified press
  (comctl32's `nLButtonDownItem` for a selected one), and the Finder's
  `startRowDrag` still drags `[rowPath]`, now the new selection; ClassicyTree
  selects a selectable leaf or branch on `onMouseDown`. ClassicyIcon is 5.8.
  Desktop icons already select at the press, as user32 and comctl32 do. A.2 is
  the same rule from App. A. _WIG Ch.5 "Selection with the Mouse" (pp.37–38);
  Ch.13 "Highlighting" (p.318)._
- **5.6** ⚠️ core layout flag: `layout.selection.secondaryButton?: "menu" |
  "select"` (default `"menu"`; `"select"` in `windows98.json`; 11.3 and A.3 are
  the same finding). Under `"select"`: ClassicyDesktopIcon's `onContextMenu`
  calls `clickFocus` only when `!isSelected` (it still stops propagation and
  takes focus) and the icon's menu acts on the whole selection, as the desktop's
  Delete key does through `trashSelectedDesktopItems`; a ClassicyTable row's
  button-2 `mousedown` on an unselected row calls `setCursorId` and
  `applySelection(row, no modifiers)` before the `contextmenu` event, so
  ClassicyFileBrowser's `onContextMenu` reads the new selection
  (`trackListSelection` updates `listSelectionRef` synchronously), and a
  selected row changes nothing; ClassicyIcon's button-2 press on an unselected
  icon resets the view's selection to it (5.8); ClassicyDesktop's
  `startSelectBox` clears the icon selection for a button-2 press on
  `#classicyDesktop` before the menu. ClassicyListBox and ClassicyTree ignore
  button 2, as user32's list box does (the OS kept). _WIG Ch.5 "Selection with
  the Mouse" (pp.37–38); Ch.7 "Pop-up Menu Interaction" (p.101)._
- **5.7** ⚠️ core layout flag: `layout.contextMenu?: { openOn?: "event" |
  "release" }` (default `"event"`; `"release"` in `windows98.json`). Under
  `"release"`, ClassicyContextualMenuProvider tracks button 2 with a
  capture-phase document `mousedown`/`mouseup` listener: a `showContextMenu`
  call while button 2 is down is held and opened on that button's `mouseup`,
  dropped on `onClassicyPointerStreamLost` or a newer call; `startSelectBox`
  skips its press-time `toggleDesktopContextMenu` and its `onContextMenu` path
  is deferred the same way. On a Windows host the event already comes at the
  release, so the menu opens at once. Mac OS 8's contextual menus open at the
  Control-press, hence the gate. _WIG Ch.5 "Selection with the Mouse" (p.38)._
- **5.8** ⚠️ core layout flag: `layout.fileBrowser?: { iconSelection?: "perIcon" |
  "view" }` beside `listColumnTitles` (default `"perIcon"`, today's toggle;
  `"view"` in `windows98.json`; A.1 and 5.22 are the same finding). Under
  `"view"`, ClassicyFileBrowserViewIcons owns the selection (a Set of paths and
  an anchor) and passes it to each ClassicyIcon through new optional controlled
  props `selected` and `onSelect(path, modifiers, phase)`; ClassicyIcon keeps
  its local toggle when they are absent. A press on an unselected icon replaces
  the selection; Ctrl/Cmd toggles and moves the anchor; Shift selects the icons
  whose boxes lie in the rectangle spanned by the anchor's and the clicked
  icon's (comctl32's icon-view group selection); Ctrl/Cmd+Shift is 5.9; a press
  on a selected icon keeps the selection and a release without a drag resets it
  to that icon; a press on the holder clears it; button 2 follows 5.6. A file
  drag of a selected icon carries every selected path (`onMoveItems(paths, …)`)
  with each one's image and label as outline parts, as `startRowDrag` does.
  ClassicyFileBrowser's `currentSelection` reads the view's state instead of the
  DOM, and the icons' `selected` class still drives the look. Finder windows
  open in list view by default, so this is the View menu's alternative. _WIG
  Ch.5 "Selection with the Mouse" (p.38), "Selection Adjustment" (pp.38–39),
  summary table (p.42)._
- ✅ "Selection Adjustment" (pp.38–39): Ctrl-click (and Cmd-click, where a
  Control-press is the secondary click) toggles the row and moves the anchor;
  Shift-click selects anchor..row and keeps the anchor. Recorded choice: Shift
  alone replaces the other disjoint selections, as user32's `LISTBOX_MoveCaret`
  and comctl32's `LISTVIEW_SetGroupSelection` do, the OS as shipped over p.39's
  "other disjoint selections are not affected" (the OS keeps them with
  Ctrl+Shift, 5.9).
- **5.9** ⚠️ core layout flag: `layout.selection.modifiers?: "mac" | "windows"`
  (default `"mac"`; `"windows"` in `windows98.json`; it drives 5.10 and 5.11
  too). Under `"windows"`, `ClassicyTable.applySelection` and, in multi mode,
  `ClassicyListBox.applySelection` test `(metaKey || ctrlKey) && shiftKey`
  first: that branch keeps `effectiveSelected` and sets every row in anchor..row
  to the anchor row's state (added if it is selected, removed if not), without
  moving the anchor, as comctl32's `LISTVIEW_AddGroupSelection` does. _WIG Ch.5
  "Selection Adjustment" (p.39)._
- **5.10** ⚠️ core layout flag (5.9's `layout.selection.modifiers: "windows"`;
  A.6 is the same finding): a new reducer case `ClassicyDesktopIconSelect {
  iconId, mode: "toggle" | "range" | "addRange" }` in
  `ClassicyDesktopIconContext.tsx` (`ClassicyDesktopIconFocus` unchanged) and a
  session field `Desktop.selectionAnchor`, stripped by
  `sanitizeStateForPersistence` like `selectBox`. `"toggle"` flips the icon and
  sets the anchor; `"range"` selects the icons in the rectangle spanned by the
  anchor's and this icon's locations, replacing the rest; `"addRange"` adds or
  removes that rectangle by the anchor's state. ClassicyDesktopIcon dispatches
  `"toggle"` for a press with Ctrl or Cmd, `"range"` with Shift, `"addRange"`
  with both; a modified press never arms the release-collapse, and a Ctrl/Cmd
  press on a selected icon starts no drag until the pointer moves. _WIG Ch.5
  "Selection Adjustment" (pp.38–39), summary table (p.42)._
- ✅ "Region Selection" (p.42), the desktop: a press on `#classicyDesktop` clears
  the selection and starts the box; each animation frame selects every icon
  whose box intersects the outline (`rectsIntersect`, the intersection method
  shown live); the release removes the outline and keeps the selection; a lost
  pointer stream ends it the same way.
- **5.11** ⚠️ core layout flag (5.9's `"windows"`; A.7 is the same finding):
  when the press carries Shift, or Ctrl or Cmd, ClassicyDesktop dispatches
  `ClassicyDesktopFocus` with an additive optional `keepIconSelection: true`,
  which the reducer honors by not clearing `selectedIcons`, skips
  `clearSelectedIcons`, keeps the pre-press selection in a ref, and
  `resizeSelectBox` dispatches `ClassicyDesktopIconSelectBox` with base ∪ boxed
  (Shift) or base △ boxed, the symmetric difference (Ctrl/Cmd, toggling as
  Explorer's marquee does). Without a modifier nothing changes. _WIG Ch.5
  "Region Selection" (p.42)._
- **5.12** ⚠️ core layout flag: `layout.fileBrowser.regionSelect?: boolean`
  (`true` in `windows98.json`; A.1). A button-1 press (or button 2 under 5.6) on
  the browser's empty space (the `.classicyFileBrowserFill` holder, or the
  list's area below its last row, never an element carrying
  `data-classicy-file-path`) starts a marquee in the holder's coordinates: a new
  element `classicyFileBrowserSelect`, declared as a FileBrowser part in
  `ClassicyVocabulary.json` and drawn by the package as `.classicyDesktopSelect`
  is (5.14). Each frame intersect-tests it against the
  `[data-classicy-file-path]` items and sets the selection live, through 5.8's
  view selection in the icon view and ClassicyTable's controlled `selected` and
  `onSelectionChange` in the list view; modifiers apply as in 5.11; the view
  auto-scrolls near its edges (5.35); the release or a lost pointer stream
  removes the outline and keeps the selection. _WIG Ch.5 "Region Selection"
  (p.42); Ch.7 "List View Controls" (p.123)._
- **5.13** ⚠️ core hook (additive): ClassicyDesktop adds
  `classicyDesktopSelectEmpty` to `.classicyDesktopSelect` while `selectBoxSize`
  is `[0, 0]`, declared as a Desktop part (`SelectEmpty`) in
  `ClassicyVocabulary.json`; no base, Platinum or System 7 rule reads it.
  Package rule in `_Desktop.scss`:
  `.classicyDesktopSelect.classicyDesktopSelectEmpty { display: none; }`. _WIG
  Ch.5 "Region Selection" (p.42)._
- **5.14** ⚠️ package (`_Desktop.scss`; fix written, not applied):
  `.classicyDesktopSelect { border: b.$b dotted var(--color-white); outline:
  none; mix-blend-mode: difference; z-index: 11; }`. White dots under
  `difference` invert the pixels beneath them, exactly as DrawFocusRect's XOR
  did in 8-bit color (on the teal Background the dots read (255,127,127), not
  white), and z-index 11 puts the outline above the desktop icons' 10 and below
  the windows' bands. _WIG Ch.5 "Region Selection" (p.42); Windows 98 as
  shipped._
- **5.15** ⚠️ package (`_Icon.scss`, `_Desktop.scss`; fix written, not applied):
  remove `outline` and `outline-offset` from both `label-selected` mixins (the
  drop-target state keeps the mixin without the rectangle) and add, in `@mixin
  icon`: `.classicyIcon:focus-visible { outline: none; } .classicyIcon:focus p {
  outline: b.$b dotted b.$text; outline-offset: b.$neg-b; }
  .classicyIcon.selected:focus p { outline-color: b.$highlight-text; }`; in
  `_Desktop.scss`: `.classicyDesktopIcon:focus p { outline: b.$b dotted
  var(--package-color-desktop-text, var(--color-white)); outline-offset:
  b.$neg-b; } .classicyDesktopIcon.selected:focus p { outline-color:
  b.$highlight-text; }`. Windows draws one rectangle, on the focus item's label
  (LVIS_FOCUSED), while the view has focus, as `_Table.scss` already does for
  the list view; `clickFocus` focuses a desktop icon and a press focuses a
  ClassicyIcon natively. _WIG Ch.5 "Keyboard Selection" (p.43), "Selection
  Feedback" (p.36)._
- **5.16** ⚠️ core layout flag: `layout.selection.keyboard?: "follow" |
  "windows"` (default `"follow"`; `"windows"` in `windows98.json`; it drives
  5.18 too). Under it ClassicyTable's `handleKeyDown` gains a `' '` case
  (`preventDefault`, so the scroll area no longer pages) selecting the cursor
  row alone and moving the anchor, Ctrl/Cmd+Space toggling it in multi mode;
  ClassicyDesktopIcon and ClassicyIcon select on Space
  (`ClassicyDesktopIconFocus`, or 5.8's view selection), toggle on
  Ctrl/Cmd+Space (5.10's `"toggle"`) and open on Enter only, taking
  `role="option"` inside a `role="listbox"` (`aria-multiselectable`) desktop or
  holder, so assistive technology is not promised Space activation. _WIG Ch.5
  "Keyboard Selection" (p.43)._
- **5.17** ⚠️ core layout flag: `layout.selection.iconNavigation?: "each" |
  "roving"` (default `"each"`; `"roving"` in `windows98.json`; B.2 is the same
  finding for HOME and END). On the desktop only the focus icon has `tabIndex`
  0, the rest −1; the focus icon is the last pressed or navigated to, else the
  first in reading order, kept in a session field `Desktop.focusIcon`. The
  arrows move from it, or select the first icon when nothing is selected,
  through `nearestIconInDirection`; HOME and END select the first and last icon
  in reading order; Shift with them extends through 5.10's `"range"`;
  Ctrl/Option with them moves the focus icon only (5.18). In the icon view,
  ClassicyFileBrowserViewIcons gives its icons a roving `tabindex` and puts a
  keydown handler on the holder: the arrows through `nearestIconInDirection`
  (`ClassicyDesktopKeyNav.ts`) over the icons' positions, HOME and END,
  type-ahead with `typeaheadMatch`, Enter to open, selecting as it moves (it
  needs 5.8). _WIG Ch.5 Table 5.1 (pp.35–36); "Keyboard Selection", "Contiguous
  Selection" (p.43); Ch.7 "List View Controls" (p.123)._
- ✅ "Contiguous Selection" (p.43): in multi mode Shift+arrows, Shift+Home and
  Shift+End extend from the kept anchor and an unshifted key selects the new row
  alone; since navigation always selects the row it reaches, the anchor and the
  range are always selected, which is the state rule (an unselected anchor
  arises only with 5.18's add mode).
- **5.18** ⚠️ core layout flag (5.16's `layout.selection.keyboard: "windows"`):
  in ClassicyListBox (multi), ClassicyTable (multi) and, with 5.17, on the
  desktop, Ctrl with a navigation key moves the cursor only (ListBox `selectRow`
  without `applySelection`, Table `setCursorId` and `scrollIntoView`, the
  desktop its focus icon), and Option likewise, since macOS takes Control+arrows
  for Spaces; Space and Ctrl/Cmd+Space follow 5.16; Shift+F8 (fn+Shift+F8 on Mac
  laptops) toggles add mode, held in a ref and published as
  `data-classicy-selection-mode="add"` on the list root, an attribute no base,
  Platinum or System 7 rule reads; in add mode plain navigation moves the cursor
  only and Space toggles and moves the anchor; Shift+navigation extends from the
  anchor at any time; leaving add mode keeps the selections, and the next plain
  click or navigation replaces them (p.44). _WIG Ch.5 "Disjoint Selection"
  (pp.43–44)._
- **5.19** ⚠️ core layout flag: `layout.text?: { wordSelect?: "native" |
  "trailingSpace" }` (default `"native"`; `"trailingSpace"` in
  `windows98.json`). Under it ClassicyInput and ClassicyTextEditor add an
  `onDoubleClick` that, after the browser has selected the word, extends the
  selection over the spaces (U+0020 or U+00A0, not a line break) after
  `selectionEnd` with `setSelectionRange(start, end + n, "forward")`;
  punctuation stays out, and on a Windows host the browser has already taken the
  space. _WIG Ch.5 "Selection Shortcuts" (p.44)._
- **5.20** ⚠️ core layout flag (= 7.10 / 6.2, which plan 0020-w98 takes as
  `window.systemMenu`): Restore, Move, Size, Minimize, Maximize, a separator and
  Close (bold, `isDefault`) at the top of the title bar's contextual menu, Move
  and Close alone for modal and utility windows, Move and Size driven by the
  arrow keys with ENTER and ESC. _WIG Ch.5 "Common Conventions for Supporting
  Operations" (p.44); "Default Operations and Shortcut Techniques" (p.45)._
- **5.21** ⚠️ core layout flag: `layout.edit?: { scope?: "any" | "window" }`
  (`"window"` in `windows98.json`), read store-free with
  `getClassicyAppearanceLayout()`. Under `"window"`, `resolveTarget`
  (`ClassicyEditCommands.ts` l.124–130) returns `lastEditable` only when
  `lastEditable.closest(".classicyWindow")` is the focused window's root
  (`document.querySelector("#classicyDesktop .classicyWindow.active")`), else
  null, so Cut, Copy, Clear, Paste, Undo and Select All do nothing and the
  snapshot reads `{ canUndo: false }` ("Can't Undo"); today the control panel's
  Undo title even comes from the other window's field (`recomputeUndoSnapshot`).
  The bug is under every package; per the owner's rule it is fixed only behind
  the flag until Platinum and System 7 are checked against HIGOS8. _WIG Ch.5
  "Operations for a Multiple Selection" (p.44)._
- **5.22** ⚠️ core: 5.8's view-owned selection carries every selected path and
  its outline parts on a drag; no separate flag. _WIG Ch.5 "Operations for a
  Multiple Selection" (p.44); "Direct Manipulation Transfers" (p.66)._
- **5.23** ⚠️ core layout flag (1.21's `layout.finder.commands: "windows"`): (1)
  File ▸ Open ⌃O first in Finder's folder-window File menu and the desktop's
  File menu, opening `commandsRef.current?.selectedPaths()` (or the desktop
  selection) through `openFolder` / `openFile`; (2) Open first and `isDefault:
  true` in `itemContextMenu`, in a new `contextMenu` on
  `classicyDesktopItemIconAction`, in ClassicyApp's app-shortcut
  `ClassicyDesktopIconAdd` (dispatching `ClassicyDesktopIconOpen`) and above
  Initialize… in `buildDriveContextMenu`; the package's
  `.classicyMenuItem.default > p` already draws it bold (7.14). 10.6 adds the
  handler app's verbs after Open. `"mac"`, the default, keeps today's menus.
  _WIG Ch.5 "Default Operations and Shortcut Techniques" (p.45); "View
  Shortcuts" (p.47)._
- **5.24** ⚠️ core layout flag: `layout.document.reopenActivates?: boolean`
  (`true` in `windows98.json`; 9.2 is the same finding). In the generic
  `*OpenFile` default case, when `openFiles` already includes the path and
  `getAppWindow(app, `${app.id}_file_${path}`)` exists (ClassicyApp's
  file-window id; an app with its own reducer uses its own key), call
  `focusWindow(ds, app.id, thatId)` after `openApp`; in FinderContext's
  `ClassicyAppFinderOpenFolder`, when `openPaths` holds the path and its window
  is open, `focusWindow(ds, "Finder.app", path)`.
  `FinderOpenFileRouting.test.ts` l.132 pins today's "brings the app forward".
  Mac OS 8 also raises the document's window, so this defect is under every
  package; it stays gated until it is checked against HIGOS8. _WIG Ch.5 "View
  Operations" (p.46); Ch.9 "Single Document Window Interface" (p.175)._
- **5.25** ⚠️ core layout flag: same as 1.17
  (`layout.document.confirmUnsavedClose`). _WIG Ch.5 "View Operations" (p.46);
  "Transactions" (p.49)._
- **5.26** ⚠️ core layout flag: same as 6.5, which plan 0020-w98 takes as
  `window.frameEdges: "resize"`. _WIG Ch.5 "Handles" (p.49)._
- **5.27** ⚠️ core layout flag: same as 2.2, whose fix covers this chapter's
  Properties, ALT+ENTER and ALT+double-click and the activation of an open
  sheet. _WIG Ch.5 "Properties" (p.51); "View Shortcuts" (p.47); "View
  Operations" (p.46)._
- **5.28** ⚠️ core layout flag (1.21's `layout.finder.commands: "windows"`): (1)
  `fs.copy(path, toFolder, { name? })`, a deep copy with a new `_createdOn`,
  journal op `"copy"`, Windows 95's "Copy of <name>" then "Copy (2) of <name>"
  on a clash, refusing missing, not-a-folder, into-itself and locked; (2) a
  module-level file clipboard `{ op: "cut" | "copy", paths }`, apart from the
  system clipboard; (3) Cut ⌃X, Copy ⌃C and Paste ⌃V in Finder's folder-window
  and the desktop's Edit menus and on item and folder-background menus, acting
  on `selectedPaths()` or the desktop selection, Paste into the window's folder
  (the Desktop Folder on the desktop) running `moveClassicyFileSystemItems` for
  a cut (clearing the clipboard) and a new `copyClassicyFileSystemItems` for a
  copy (keeping it, so pastes repeat), the pasted items becoming the selection
  at the menu's point (`classicyDesktopDropLocation`) or the next free grid
  cell; (4) cut items carry a new vocabulary class `classicyFileCut` on
  `.classicyIcon`, `.classicyDesktopIcon` and the list row container until a
  paste, a new Cut or Copy, or Escape; (5) the package draws the cut dither
  through the icon's mask: `_Icon.scss` `.classicyIcon.classicyFileCut
  .classicyIconMaskOuter::after { background: repeating-conic-gradient(b.$window
  0 25%, transparent 0 50%) 0 0 / px(2) px(2); }`, `_Desktop.scss` the same on
  `.classicyDesktopIconMaskOuter` with `var(--desktop-background-color)`,
  `_Table.scss` `.classicyFileBrowserViewTableRowContainer.classicyFileCut
  .classicyFileBrowserViewTableRowIcon { opacity: .5 }` (a stand-in, as the
  table's selection is). _WIG Ch.5 "Command Method" (pp.59–61); "Direct
  Manipulation Method" (p.61); "Command Method Transfers" (p.66)._
- **5.29** ⚠️ core layout flag: `layout.textField?: { contextMenu?: "none" |
  "edit" }` (`"edit"` in `windows98.json`). Under it ClassicyInput,
  ClassicyTextEditor's viewport, ClassicyRichTextEditor's content editable,
  ClassicyComboBox's input and ClassicySpinner's field handle `onContextMenu`
  themselves: focus the field keeping its selection, `preventDefault` and
  `stopPropagation`, and `showContextMenu` at the pointer with Undo, a
  separator, Cut, Copy, Paste, Delete, a separator and Select All, each running
  `classicyEditCommands` on that field; Undo disabled with nothing to undo, Cut,
  Copy and Delete with an empty selection, Cut, Paste and Delete when read-only;
  Shift+F10 and the ContextMenu key open it at the caret (4.17). `"none"`, the
  default, keeps Platinum and System 7. _WIG Ch.5 "Command Method" (p.59)._
- **5.30** ⚠️ core layout flag (= 7.15's `layout.menu.shortcutSpelling:
  "names"`): in addition, a ⌘ chord on an item flagged `nativeShortcut` (or any
  ⌘ chord off a Mac, `!isClassicyMacPlatform()`) is spelled `Ctrl+`: Undo
  Ctrl+Z, Cut Ctrl+X, Copy Ctrl+C, Paste Ctrl+V, Select All Ctrl+A, and Clear or
  Delete as Del. `"glyphs"`, the default, keeps the Mac packages' glyphs. The
  keys themselves work: off a Mac the browser's editing answers Ctrl+X/C/V and
  the dispatcher matches ⌘ to `metaKey || ctrlKey`. _WIG Ch.5 "Shortcut Keys for
  Transfer Operations" (pp.67–68)._
- **5.31** ⚠️ core layout flag: `layout.transfer?: { activateDropWindow?:
  boolean, … }` (`true` in `windows98.json`), the group for this section's
  transfer keys. After a successful drop, Finder's `onMoveItems` and the
  desktop's `moveDesktopItems` find the window root holding the target
  (`target.element.closest(".classicyWindow")`) and, when it is not `.active`,
  dispatch `ClassicyWindowFocus` for the Finder window whose id is the
  `data-classicy-drop-folder` of the `.classicyFileBrowserFill` root containing
  the target (Finder keys its windows by folder path). _WIG Ch.5 "Direct
  Manipulation Method" (p.62)._
- **5.32** ⚠️ core hook: same as 4.6 (`data-classicy-drop="none"` on the desktop
  root and the package's `cursor: no-drop`, the host's own circle-slash of
  Figure 5.17), which needs no flag of its own. _WIG Ch.5 "Direct Manipulation
  Method" (p.62); "Direct Manipulation Transfers" (p.67), Figure 5.17._
- **5.33** ⚠️ core layout flag: `layout.transfer.secondaryButton?: "menu"`
  (`windows98.json`; 11.7 and A.5 are the same finding). The three drag sources
  also accept `e.button === 2` and swallow that press's `contextmenu`;
  `startClassicyFileDrag` takes `button` and ends only on that button's
  `mouseup`; on release over a target it calls a new `onMenu(target, point)`
  instead of `onDrop`, and the source shows `showContextMenu` at the pointer
  with Move Here (`isDefault: true`, bold through `_Menu.scss`), Copy Here (once
  5.28's `fs.copy` exists), a separator and Cancel; Create Shortcut Here is left
  out, Classicy having no file shortcuts. The browser's `contextmenu` after the
  release is swallowed by a one-shot capture listener; Escape closes the menu,
  which cancels. _WIG Ch.5 "Nondefault Drag and Drop" (pp.62–63), Figure 5.13;
  "Canceling a Drag and Drop Transfer" (p.64)._
- **5.34** ⚠️ core layout flag: `layout.transfer.copyModifier?: "ctrl"`
  (`windows98.json`; A.8 is the same finding), with 5.28's `fs.copy`.
  `startClassicyFileDrag` reads `ctrlKey` on each `mousemove`, on Control's
  `keydown` and `keyup` while the ghost exists, and at the release (not the
  press, App. A notes 2–3), ignoring a press that began with `ctrlKey` on a Mac
  host (`isClassicyMacPlatform()`, where it is a secondary click); while the
  copy applies over an accepting target it sets 4.6's attribute to
  `data-classicy-drop="copy"` and passes `effect: "move" | "copy"` to `onDrop`,
  and Finder's and the desktop's handlers copy or move accordingly. Package rule
  in `_Desktop.scss`, after 5.37's: `&[data-classicy-drop='copy'],
  &[data-classicy-drop='copy'] * { cursor: copy; }`, the host's own arrow with a
  plus. _WIG Ch.5 "Shortcut Keys for Transfer Operations" (pp.67–68); "Direct
  Manipulation Transfers" (p.67), Figure 5.16._
- **5.35** ⚠️ core layout flag: `layout.transfer.autoScroll?: boolean` (`true`
  in `windows98.json`; extends 6.11). While the ghost exists,
  `startClassicyFileDrag` keeps the last three `{ x, y, t }` samples (at drag
  start, on each `mousemove` and on a 100-ms timer) and computes velocity =
  Σ(|Δx|+|Δy|)·1024 / Σ(Δt) as on p.65; the scrollable area is the
  `.classicyScrollAreaViewport` under the pointer (`elementsFromPoint`), the hot
  zone the theme's `--window-scrollbar-size` (16 px) inside each edge (the WIG
  leaves it open; Windows' DD_DEFSCROLLINSET is 11), and the viewport scrolls by
  its `lineStep` toward the edge while the pointer is in the zone, the velocity
  is under one line step per sample interval, 50 ms have passed since the last
  scroll (DD_DEFSCROLLINTERVAL) and the axis is not at its end
  (`classicyScrollAxisEnds`); the timer stops in `cleanup`. _WIG Ch.5 "Scrolling
  When Transferring by Dragging" (pp.64–65), Figure 5.14._
- **5.36** ⚠️ core layout flag: `layout.transfer.desktopIconDrag?: "live" |
  "outline"` (default `"live"`; `"outline"` in `windows98.json`). Under it the
  non-file path of ClassicyDesktopIcon's `startDrag` calls
  `startClassicyFileDrag` with `parts` from every selected icon's image and
  label and a new option `canDrop: (t) => t.destination.kind === "desktop"`, so
  folders, drives and the Trash neither highlight nor accept it (and show 4.6's
  no-drop); `onDrop` dispatches `ClassicyDesktopIconMove` for each selected icon
  to `classicyDesktopDropLocation(outlineTopLeft)` plus its offset, and Escape
  or a lost pointer stream leaves the icons where they were. _WIG Ch.5 "Direct
  Manipulation Transfers" (p.66); "Canceling a Drag and Drop Transfer" (p.64)._
- ✅ "Direct Manipulation Transfers" (p.66), Figure 5.15: the source keeps its
  selected look at its place until the release, and a 1-px dotted outline (the
  figure's left-hand form) follows the pointer, drawing nothing inside so the
  destination stays visible. Windows 98's Explorer draws the other form, a
  translucent image; a `layout.transfer.dragImage` choice would be an optional
  product decision, not a deviation.
- **5.37** ⚠️ package (`_Desktop.scss`; fix written, not applied): inside
  `@mixin desktop`, where `&` is the package wrapper, `body.classicyFileDragging
  &, body.classicyFileDragging & * { cursor: default; }` (the core already sets
  the class for the whole drag); 4.6's no-drop and 5.34's copy rules follow it,
  so they win while their attribute is set. _WIG Ch.5 "Direct Manipulation
  Transfers" (p.67), Figure 5.16._
- **5.38** ⚠️ package (`_Table.scss`; fix written, not applied): in `@mixin
  table`, after the selected-name rules,
  `.classicyFileBrowserViewTableRowContainer.classicyFileDropTarget { filter:
  none; .classicyFileBrowserViewTableRowIconLabel { color: b.$highlight-text;
  background: b.$highlight; } }`, and add
  `.classicyFileBrowserViewTableRowContainer.classicyFileDropTarget
  .classicyFileBrowserViewTableDisclosure::after` to the selector of the
  existing `:where(.classicyFileBrowserViewTableRow).selected
  .classicyFileBrowserViewTableDisclosure::after` rule (l.213–227), so the icon
  takes the Hilight dither as a selected one does (LVIS_DROPHILITED). _WIG Ch.5
  "Direct Manipulation Transfers" (p.67)._
- **5.39** ⚠️ core layout flag (1.21's `layout.finder.commands: "windows"`): the
  command is titled "Delete", spelled with "Del" under 5.30's `"names"`, ⌃⌫ kept
  as a binding; the container's name, "Recycle Bin", is 1.15's override.
  `CLASSICY_TRASH_PATH` stays `"Trash"`. _WIG Ch.5 "Specialized Transfer
  Commands" (p.67)._
- **5.40** ⚠️ core layout flag (1.21's `layout.finder.commands: "windows"`):
  File ▸ New ▸ Folder in Finder's folder-window and the desktop's File menus,
  and New ▸ Folder on the folder background's and the empty desktop's menus,
  each running `fs.mkDir` for "New Folder" ("New Folder (2)"… on a clash,
  10.10's helper) in the window's folder or the Desktop Folder
  (`ensureClassicyDesktopFolder`); the new folder becomes the only selection, at
  the menu's point or the next free grid cell, on the desktop through
  `classicyDesktopItemIconAction(fs, path, location)`, and its label starts
  editing. 10.3 adds the registered document types after Folder. _WIG Ch.5
  "Creation Operations" (p.69); "New Command" (p.69); "Command Method" (p.61)._
- **5.41** ⚠️ the Windows shell (plan 0020-w98, §2): requirements. Pressing the
  Start button, opening the Start menu or a window's bar, pressing a task button
  (activating, minimizing or restoring its window) or a tray icon leaves
  `selectedIcons` and every window's selection untouched; a window activated or
  restored from its button shows the selection it had (with active-window
  feedback once active, 6.4); a window bar's command acts on that window's
  selection. `ClassicyDesktopFocus` clears the desktop icons for any press whose
  target is `#classicyDesktop`, so the shell's elements must not be that target.
  _WIG Ch.5 "Scope of Selection" (p.37)._
- **5.42** ⚠️ the Windows shell (plan 0020-w98, §2 "Keyboard"): requirements.
  The Start button is one Tab stop; the window-button band one Tab stop with a
  roving focus (Left/Right, Up/Down when docked at a side; HOME and END to the
  first and last; Space or Enter activates the window); the tray one Tab stop;
  Shift+Tab in reverse; the focused button draws the dotted focus rectangle
  inside its bevel with `b.focus-rect`, as `_Button.scss` does; a Start menu
  opened from the keyboard keeps focus in the menu (7.7's keys). _WIG Ch.5 Table
  5.1 (pp.35–36); "Keyboard Navigation" (p.35); Ch.13 "Input Focus Appearance"
  (p.308)._
- **5.43** ⚠️ the Windows shell (plan 0020-w98, §2, §5): requirements. A
  button-2 press on a task button shows that window's pop-up menu (Restore,
  Move, Size, Minimize, Maximize, Close; 7.10's) at the release, through 5.7's
  `openOn: "release"`, without changing the buttons' pressed (active-window)
  state; on the taskbar's empty area, the taskbar's own menu at the release
  (A.10); a button-1 press draws the task button pressed at once and activates
  the window on release, as a push button does. _WIG Ch.5 "Selection with the
  Mouse" (pp.37–38); "Selection Feedback" (p.36)._
- **5.44** ⚠️ the Windows shell (plan 0020-w98, §4): requirements. Every window
  with an `appMenu` draws its own ClassicyWindowMenuBar (1.6); a window whose
  content takes transfers carries an Edit menu, Undo, a separator, Cut Ctrl+X,
  Copy Ctrl+C, Paste Ctrl+V, Delete Del, a separator, Select All Ctrl+A
  (SimpleText, the control panels with text fields, and Finder's folder windows
  once 5.28 lands); its File menu carries Open (on the selection), Close, and
  Properties last (5.23, 2.2); a window bar's commands resolve their target
  inside that window only (5.21's `scope: "window"`), and the native Ctrl+X, C
  and V go to the focused field, never another window's; the screen bar, which
  becomes the taskbar, carries no Edit menu. _WIG Ch.5 "Command Method" (p.59);
  "Default Operations and Shortcut Techniques" (p.45); "Properties" (p.51);
  "Operations for a Multiple Selection" (p.44)._
- **5.45** ⚠️ the Windows shell (plan 0020-w98, §2 "Drops"; 10.12 is the same
  requirement from Ch.10): requirements. Each task button carries a hit-test
  mark (`data-classicy-drop-activate`, or
  `data-classicy-taskbar-window="<appId>\u0000<windowId>"`) that
  `findClassicyFileDropTarget` recognizes before `BLOCKING_SELECTOR`; during a
  file drag a pointer resting on a button for about 500 ms dispatches
  `ClassicyWindowFocus` for its window, first restoring a minimized one, which
  then becomes the drop surface once the pointer enters it; the button itself
  never accepts the drop: it shows 4.6's no-drop pointer and a release on it
  ends the drag as refused; the Start button, the tray and the empty taskbar
  refuse with the same feedback. _WIG Ch.5 "Direct Manipulation Method" (p.62);
  Ch.3 "Window Buttons" (p.16)._
- **5.46** ⚠️ the Windows shell (plan 0020-w98, §2 "Task buttons"): requirement.
  A window's button appears as soon as its record is open and not hidden, drawn
  pressed (3.1's `taskbar-button-pressed`) exactly while that window is the
  store's focused window, the previous one released in the same commit; a window
  that registers without focus (opened behind, or restored on reload) gets a
  released button. Which windows get one is 10.11. _WIG Ch.5 "View Operations"
  (p.45)._

---

## Chapter 7 — Menus

Pages read: PDF 107–120 (pp.97–110), plus Figure 7.8 at PDF 124 (p.114). Ch.7
gives no pixel numbers for menus (item height, frame, gutter, overlap); the
frame's pixel colors are Ch.13's, so the frame, the separator and the submenu
overlap are judged against the figures and Windows 9x's known rendering.
`_PopUpMenu.scss`'s open list is a Windows list box (the drop-down list), judged
under Controls; only its bevel-button pop-up panel and arrows belong here.

Normative checklist (WIG Ch.7, Menus) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| "The Menu Bar and Drop-down Menus" (p.97, Figure 7.1) | A flat ButtonFace strip under the title bar, titles in plain ButtonText, no bevel (the screen bar's styling is judged, not its placement). | `_MenuBar.scss` (`.classicyDesktopMenuBar`, `.classicyDesktopMenu`, the titles) | ✅ |
| "Drop-down Menu Interaction" (p.97) | Pressing or clicking a title highlights it and opens its menu; the title stays highlighted while open; with a menu open, moving to another title tracks it; no hot-tracking of a title under the pointer alone. | `_MenuBar.scss` `.open`, `:focus-visible` (Hilight band, HilightText, no outline), `:hover` plain; core ClassicyMenu/ClassicyDesktopMenuBar | ✅ |
| "Drop-down Menu Interaction" (p.97) | A menu opened by pressing can be dragged: items highlight under the pointer, release over an item chooses, release off the menu cancels. | core ClassicyMenu (click and Enter only) | 🔧 see 7.5 |
| "Drop-down Menu Interaction" (p.97) | A menu opened by clicking stays until the next click; nothing else removes it. | core ClassicyMenuProvider (`DEFAULT_IDLE_TIMEOUT_MS` 15000) | 🔧 see 7.6 |
| "The Menu Bar and Drop-down Menus" (p.98) | Keyboard: ALT activates the bar; ALT+access key opens a menu; LEFT/RIGHT move between titles with wrap-around; ENTER, UP or DOWN open; UP/DOWN move with wrap-around; ALT cancels; ESC closes one level and leaves the title highlighted. | core ClassicyMenu (items `tabIndex={-1}`, Enter only) | 🔧 see 7.7 |
| "The Menu Bar and Drop-down Menus" (p.98) | A shortcut key carries the command out at once; the drop-down is not displayed. | core ClassicyShortcutDispatcher | ✅ |
| "Common Drop-down Menus" (pp.98–99) | File (Open, Save, Send To, Print, Exit after a separator), Edit (Cut, Copy, Paste, Undo, Repeat, Find and Replace, Delete, Duplicate), View, Window (MDI), Help (Help Topics, About with no ellipsis). | core bundled apps' `appMenu` (Mac structure) | ➖ |
| "Pop-up Menus" (pp.99–100, Figure 7.2) | A pop-up menu looks like a drop-down: the same ButtonFace panel, raised edge, items, separators, cascade arrows and band, at the pointer. | `_Menu.scss` `$menus` (`.classicyMenu`, `.classicySubMenu`, `.classicyContextMenu`, `.classicyContextSubMenu`) | ✅ |
| "Pop-up Menus" (p.100) | Order: primary commands (Open, Play, Print), then Cut, Copy, Paste, other commands, What's This?, Properties last; keep it small. | core contextual menus (ClassicyContextualMenuProvider, Finder, desktop) | ➖ |
| "Pop-up Menu Interaction" (p.101) | Button 2 down selects; on the up transition display the menu right of and below the hot spot, never clipped by the screen edge. | core ClassicyContextualMenuProvider (`clickOffset [1, 1]`), ClassicyContextualMenu (flips left and up, pinned to the desktop) | ✅ |
| "Pop-up Menu Interaction" (p.101) | Dismiss on an outside button-1 click, a second button-2 click in the same selection, or ESC. | core `useClassicyMenuCloseOnOutsideMouseDown` (no Escape handling) | 🔧 see 7.8 |
| "Pop-up Menu Interaction" (p.101) | SHIFT+F10 and the Application key display the selection's pop-up menu. | core (no `ContextMenu`/`F10` handling) | 🔧 see 7.9 |
| "Pop-up Menu Interaction" (p.101); "Shortcut Keys in Menu Items" (p.110) | Avoid shortcut keys in pop-up menus. | core bundled contextual menus (Finder `itemContextMenu`, desktop menu: none carry `keyboardShortcut`) | ✅ |
| "The Window Pop-up Menu" (p.102) | A primary window's pop-up menu (button 2 on the title bar, ALT+SPACEBAR): Close, Restore, Move, Size, Minimize, Maximize, plus window commands; a secondary window's holds Move and Close; palettes may add Always on Top. | core ClassicyWindow (`contextMenu` prop, no system menu) | 🔧 see 7.10 (= 6.2) |
| "Icon Pop-up Menus" (pp.102–103, Tables 7.1–7.2) | An application icon's menu: Open, Send To, Cut, Copy, Paste, Create Shortcut, Delete, Rename, Properties; a document icon's: Open, Print, Send To, Cut, Copy, Delete, Rename, Properties. | core Finder `itemContextMenu` / desktop icon menus (Open, Restore, Move To Trash) | 🔧 see 7.11 |
| "Cascading Menus" (p.104, Figure 7.5) | A triangular arrow at the item's right edge pointing right, in the item's ink (HilightText on the band, grayed when unavailable). | `_Menu.scss` `.classicyMenuItemChildMenuIndicator::after` (4 × 7 triangle at `--menu-item-padding-x` 6 from the right, embossed when disabled) | ✅ |
| "Cascading Menus" (pp.104–105) | A cascade opens after a short time-out and, once open, is removed after a time-out when the pointer rests on another item of the parent, so a diagonal drag into it works. | core ClassicyMenu `handleMouseEnter` (opens at once, never closes on a leaf sibling) | 🔧 see 7.12 |
| Cascading menu placement (no WIG rule: Windows 9x's rendering, as os-gui and 98.css reproduce it) | The cascade opens beside its parent, its first item level with the parent item, its frame overlapping the parent's; flips left where there is no room. | `_Menu.scss` (`left: 100%; margin: $neg-frame 0 0`, 3 px: the two rings and the ring of face; `classicySubMenuFlipLeft` at `right: 100%`) | ✅ |
| "Menu Titles" (p.105) | Single-word menu bar titles. | core bundled titles (File, Edit, View, Special, Help) | ✅ |
| "Menu Titles" (p.106, Figure 7.4); "Menu Item Labels" (p.109) | One character of every title and item is its access key, unique in its menu, shown underlined. | core ClassicyMenuItem (no access-key field); `_Menu.scss`/`_MenuBar.scss` | 🔧 see 7.1 |
| "Menu Items" (p.106, Figure 7.5) | Items may be words, graphics or both. | `_Menu.scss` (`img` 16 px, `--layout-item-gap` 4 after it); core image/icon before the title | ✅ |
| "Menu Items" (p.106, Figure 7.5 "Selected Item") | The tracked item is a band across the menu's interior, HilightText on Hilight, following pointer or keyboard; no focus rectangle. | `_Menu.scss` `:hover`, `.open`, `:focus-visible` (`b.$highlight-text` on `b.$highlight`, `outline: none`) | ✅ |
| "Menu Items" (p.106, Figure 7.6) | Separator: a single line spanning the menu (ButtonShadow over ButtonHilight, 2 px); never an item as a separator. | `_Menu.scss` `.classicySeparatorHorizontal` (`b.$b2` tall, shadow over hilight, `margin: px(3) 0 px(4)`: a 9-px slot); core `{ id: "spacer" }` renders ClassicySeparator | ✅ |
| "Menu Items" (p.107) | Disable rather than remove; disabling does not prevent browsing or choosing (it does nothing); the standard unavailable appearance (GrayText embossed by a ButtonHilight pixel below right). | `_Menu.scss` `.classicyMenuItem.disabled` (`b.disabled-text`, tracked as the band with plain GrayText), `_MenuBar.scss` disabled title; core ignores a disabled item's click and chord | ✅ |
| "Types of Menu Items" (pp.107–108) | An ellipsis after a command needing more information; none for Properties, About or a message box. | core bundled menu data (Mac structure: Empty Trash…, Reset PRAM… precede confirmation alerts) | ➖ |
| "Types of Menu Items" (p.108, Figure 7.5 "Check Box") | An independent setting shows a check mark at the left when set; a mixed selection shows the menu without the check mark. | `_Menu.scss` `.classicyMenuItemCheck.checked` (7 × 6 check in the item's ink), `.mixed` | 🔧 see 7.2 |
| "Types of Menu Items" (p.108, Figure 7.5 "Option Button") | An interdependent setting shows a round bullet at the left of the chosen item. | core ClassicyMenuItem `mark: "bullet"` (`menuitemradio`, the gutter's `classicyMenuItemBullet`); `_Menu.scss` (the 6 × 6 bullet in the item's ink at the chosen item, embossed when unavailable); Finder's View menu | 🔧 see 7.13 |
| "Types of Menu Items" (pp.108–109, Figure 7.5 "Default Item") | The default item (the double-click's command) is bold. | core ClassicyMenuItem `isDefault` (the `default` state); `_Menu.scss` (`.classicyMenuItem.default > p` bold, the title alone); the Trash icon's Open | 🔧 see 7.14 |
| "Menu Item Labels" (pp.109–110) | Unique, brief, book-title capitalization; no per-item bold, italic or underline. | `_Menu.scss` (one weight, the UI face, `line-height: 1`); bundled item names | ✅ |
| "Shortcut Keys in Menu Items" (p.110) | Shortcuts left-aligned at the first tab position after the longest item in the menu that has one. | `_Menu.scss` `.classicyMenuItemKeyboardShortcut` | 🔧 see 7.3 |
| "Shortcut Keys in Menu Items" (p.110) | Spell shortcuts as inscribed on the keycap: Ctrl+key, Shift+key, Fn. | core ClassicyKbd / ClassicyKeyboardShortcut (glyphs ⌃ ⌥ ⇧ ⌘, the Mac adaptation) | 🔧 see 7.15 |
| "Command Buttons" (p.114, Figure 7.8 "A menu button") | A menu button is a command button whose label includes the down-pointing cascade arrow; its menu hangs below, left edges aligned. | `_PopUpMenu.scss` (`.classicyBevelButtonArrow*`, 7 × 4 down / 4 × 7 right triangle; the pop-up panel in the menu frame), `_Placard.scss` (`.classicyPlacardArrow`, the placard's menu) | ✅ |
| "Menu Items" (p.107), Figure 7.5 | A disabled item in a button's menu is browsed like any item: the band tracks it, its text GrayText, choosing does nothing. | `_Placard.scss` `.classicyPlacardMenuItem:disabled` | 🔧 see 7.4 |
| Figures 7.2, 7.5 (pp.100, 106); colors Ch.13 | A menu is a ButtonFace panel in the raised window edge (ButtonLight then ButtonHilight top-left, ButtonDkShadow then ButtonShadow bottom-right), no drop shadow, sized to its items. | `_Menu.scss` `menu-frame` (`b.window-frame` alone, inset shadows, so no drop shadow; padding 3 px, `min-width: 0` against the core's 180-px floor); `windows98.json` emits no `menuFrame` family (dropped in a2c1d339d: Platinum's knobs, read by no partial here) | ✅ |

### Findings — Chapter 7, Menus

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 7.1 | MEDIUM | No access-key underlines: ClassicyMenuItem has no access-key field and titles render as plain text. Every Windows menu figure (7.1, 7.2, 7.4, 7.5, 7.8) shows the underline. | core ClassicyMenu; `_Menu.scss`, `_MenuBar.scss` | 🔧 Fixed (ce8bde683) |
| 7.2 | LOW | A mixed setting (`checked: "mixed"`) drew the Mac's 7 × 2 dash in the check gutter; the WIG shows a mixed state with no mark. | `_Menu.scss` (`.classicyMenuItemCheck.mixed`) | 🔧 Fixed |
| 7.3 | LOW | Shortcuts were right-aligned (Mac OS 8's column); Windows left-aligns them at one tab position after the longest item. | `_Menu.scss` (`.classicyMenuItemKeyboardShortcut`) | 🔧 Fixed |
| 7.4 | LOW | A disabled placard-menu item was not tracked under the pointer (`:hover:not(:disabled)`), unlike the pull-downs' disabled items. | `_Placard.scss` (`.classicyPlacardMenuItem`) | 🔧 Fixed |
| 7.5 | LOW | No press-drag-release: a menu title opens on click, items are chosen on click or Enter; no mouseup handling in the menu code. | core ClassicyMenu / ClassicyDesktopMenuBar | 🔧 Fixed (08d728581) |
| 7.6 | LOW | An untouched open menu closes itself after 15 s (`DEFAULT_IDLE_TIMEOUT_MS`); Windows keeps it until the next click. | core ClassicyMenuProvider | 🔧 Fixed (08d728581) |
| 7.7 | LOW | No menu keyboard navigation (Left/Right between titles, Up/Down within a menu, Escape by levels); items are `tabIndex={-1}` and only Enter is handled. The package already draws the keyboard-tracked item and title as the band. | core ClassicyMenu | 🔧 Fixed (08d728581) |
| 7.8 | LOW | Escape does not close an open contextual menu. | core ClassicyContextualMenu | 🔧 Fixed (08d728581) |
| 7.9 | LOW | Shift+F10 and the ContextMenu key open nothing; contextual menus open from the `contextmenu` event alone. | core ClassicyContextualMenuTarget / ClassicyDesktop | 🔧 Fixed (08d728581) |
| 7.10 | LOW | No window pop-up (system) menu; a title bar's button 2 shows the window's or app's `contextMenu` only. Same as 6.2. | core ClassicyWindow | 🔧 Fixed (63ebc2f3f) |
| 7.11 | LOW | Finder's icon menus are the Mac's (Open, Restore, Move To Trash): no Rename, Create Shortcut or Properties (Get Info), Properties last. | core Finder | 🔧 Fixed (d70d4c7aa, 70494a489, c1ab2bf24, 3a69b2ed0, 57ae34974, d7f1b8d3f) |
| 7.12 | LOW | A hover-opened submenu opens at once and stays open when the pointer rests on a leaf sibling of its parent (nothing calls `onClose`); Windows uses a show and a hide time-out (SPI_GETMENUSHOWDELAY, 400 ms). | core ClassicyMenu | 🔧 Fixed (08d728581) |
| 7.13 | LOW | No option-button (radio) mark: `checked?: boolean \| "mixed"` was the only mark kind, every checkable item a `menuitemcheckbox`. | core ClassicyMenuItem; `_Menu.scss`; Finder | 🔧 Fixed (core hook `mark`) |
| 7.14 | LOW | No default-item flag, so no item could be drawn bold; the vocabulary's `default` state was emitted by buttons only. | core ClassicyMenuItem; `_Menu.scss`; Finder | 🔧 Fixed (core hook `isDefault`) |
| 7.15 | LOW | Chords are written as glyphs (`⌃⌫`, `⌘A`); the WIG spells `Ctrl+`, `Shift+`, `Fn`. A package can style the modifier parts but cannot substitute text. | core ClassicyKbd / ClassicyKeyboardShortcut | 🔧 Fixed (ce8bde683) |

**Details & fixes**

- **7.2** 🔧 (`packages/appearance/windows98/src/styles/components/_Menu.scss`):
  `.classicyMenuItemCheck.mixed::before { background: none }`; the `$dash` art
  and its disabled and tracked rules are gone, the check's rules flattened to
  `.checked` alone; the gutter (`--icon-small-size` wide, `--layout-item-gap`
  after it) stays so titles keep their alignment. Product note: the core's
  `checked: "mixed"` state is now invisible under Windows dress (its
  `aria-checked="mixed"` still reaches assistive technology), which is what
  Windows did. _WIG Ch.7 "Types of Menu Items" (p.108): "you also display the
  menu without the check mark"._
- **7.3** 🔧 (`_Menu.scss`): the exact rule, not an approximation. Each menu list
  (`$menus`) is a two-column grid, `grid-template-columns: 1fr max-content`
  (titles, shortcuts: the first takes the slack so the band spans a stretched
  list, the second is empty with no gutter in a menu with no shortcuts); every
  `.classicyMenuItem` is `display: grid; grid-template-columns: subgrid;
  grid-column: 1 / -1` with `> p { grid-column: 1 }` and the shortcut
  `grid-column: 2; justify-content: flex-start; margin-left: $tab-space`
  (`px(8)`, Windows' MENU_TAB_SPACE as Wine and ReactOS carry it; the WIG gives
  no number); balloon-wrapped rows (`> .classicyMenuItemBalloonAnchor`) are
  subgrids too and separators span `1 / -1`; `display: grid` is set exactly
  where the base shows a list (`.classicyMenu`, `.classicyContextMenu`, and
  `.classicyMenuItem.open > .classicyMenuWrapper > :is(.classicySubMenu,
  .classicyContextSubMenu)`), so a closed submenu stays `display: none`; the
  child-menu indicator's clearance moved from the item's padding to the title's
  `margin-right`. Verified in headless Chromium against a mock of
  ClassicyMenu's DOM: every shortcut starts at one x, 8 px after the longest
  title; the band spans the list's inner width; rows are 17 px; a menu with no
  shortcuts keeps its 6-px right padding; the open submenu sits 3 px above its
  item over the parent's frame; the arrow stays 6 px in. Subgrid is inside the
  browser floor (Chrome 117, Safari 16, Firefox 71 against the floor's
  120/16.2/113). _WIG Ch.7 "Shortcut Keys in Menu Items" (p.110)._
- **7.4** 🔧 (`_Placard.scss`): `&:hover, &:focus` give every item the Hilight
  band with HilightText and `outline: none`; `&:disabled` keeps the embossed
  GrayText; `&:disabled:is(:hover, :focus)` draws GrayText on the band with no
  text-shadow, as `_Menu.scss` draws the pull-downs' disabled items and as
  Windows 9x drew a selected disabled item. _WIG Ch.7 "Menu Items" (p.107)._
- ✅ "The Menu Bar and Drop-down Menus" (p.97): `_MenuBar.scss` clears the base's
  Platinum bevel and rounded corners (`background: b.$face`, `border-radius: 0`),
  titles plain `b.$text` on transparent, hover plain; `.open` and
  `:focus-visible` the band (`--color-highlight` #000080 in Windows Standard,
  `--package-color-selection-text`); the pull-down hangs from the bar's bottom
  under its title's left edge.
- ✅ "Pop-up Menus" (p.100), Figure 7.2: `$menus` covers contextual and
  bevel-button pop-up menus, so the frame, item, disabled, separator and arrow
  rules are one set; ClassicyContextualMenu and ClassicyBevelButtonPopup render
  with `classicyContextMenu`.
- ✅ "Cascading Menus" (p.104): the submenu wrapper is pinned over its item; the
  submenu at `left: 100%` with `margin: $neg-frame 0 0` (−3 px), so its first
  item is level with the parent item and, the item box being 3 px inside the
  menu's edge, its frame overlaps the parent's exactly, as os-gui and 98.css
  reproduce Windows 9x; `classicySubMenuFlipLeft` hangs it at `right: 100%`.
- ✅ "Menu Items" (p.107): `.classicyMenuItem.disabled` is `b.disabled-text`
  (GrayText with the 1-px ButtonHilight shadow), still browsed as the band with
  plain GrayText (specificity (0,4,0) beating the base's transparent rule), the
  mark and arrow embossed alike; a disabled title is embossed too. Caveat: a
  disabled title never takes the band, which only keyboard title tracking
  (absent, 7.7) could show.
- ✅ Figures 7.2, 7.5: `menu-frame` is `b.$face`, padding 3 px (two rings and a
  ring of face), `b.window-frame` (outer ButtonLight/ButtonDkShadow, inner
  ButtonHilight/ButtonShadow), inset shadows only so no drop shadow;
  `min-width: 0` so the menu sizes to its items; a scrolling list redraws the
  frame on `.classicyMenuScrollShadow`. Housekeeping (not a WIG rule; done in
  a2c1d339d): the `menuFrame` family (`borderWidth`, `bevelWidth`, the three
  shadow keys) was emitted as `--menu-frame-*` but read by nothing here, the
  frame being built from `--window-border-size`; it is Platinum's, not the core
  floor's, so it is dropped from `defaults` and every preset and a Windows 98
  theme emits none of it (the `knobs` metadata never listed it; a package test
  pins the absence).
- ✅ "Command Buttons" (p.114), Figure 7.8: `_PopUpMenu.scss`
  `.classicyBevelButtonArrowVertical::before` is the 7 × 4 down triangle in the
  label's ink (Horizontal the 4 × 7 right one); `_Placard.scss`
  `.classicyPlacardArrow` the same triangle, embossed when disabled, the content
  stepping a pixel down-right while pressed or open; the placard's menu is a
  Windows menu (`b.window-frame` around ButtonFace with 3-px padding, items 6 px
  in, the tracked item HilightText on Hilight); bevel pop-ups open below,
  start-aligned, in the same frame.
- **7.1** ⚠️ core hook: `accessKey?: string` on ClassicyMenuItem (one character;
  or an `&` marker in `title`), rendered by ClassicyMenuItemComponent as
  `<span data-classicy-part="access-key">` around the title's first
  case-insensitive match, in pull-down items and menu-bar titles alike (the
  part name added to the vocabulary and the ClassicyVocabulary test's
  allowlist). Package follow-up ready: `_Menu.scss` and `_MenuBar.scss`
  `[data-classicy-part="access-key"] { text-decoration: underline;
  text-underline-offset: 0; }` (Windows 95/98 always showed the underline;
  hiding it until ALT came with Windows 2000). ALT+key activation stays with
  the Mac keyboard adaptation. _WIG Ch.7 "Menu Titles" (p.106), Figure 7.4;
  Ch.8 "Navigation in Secondary Windows" (pp.148–149)._
- **7.5** ⚠️ core: a mousedown on a title opens its menu and, while the button
  is held, a document `mouseup` over an item `click()`s it (the idiom
  ClassicyBevelButton's hold trigger uses) and a `mouseup` off every menu
  closes all; a quick click keeps today's sticky behavior. Mac OS 8 wants the
  same gesture. _WIG Ch.7 "Drop-down Menu Interaction" (p.97)._
- **7.6** ⚠️ core: `layout.menuBar.idleTimeoutMs?: number` (0 = never close)
  passed by ClassicyDesktopMenuBar and ClassicyWindowMenuBar as the
  `idleTimeoutMs` prop of the ClassicyMenuProvider they mount (the prop exists;
  15000 stays the default for Platinum and System 7); Windows 98's layout sets
  0. _WIG Ch.7 (p.97); Ch.14 "Timing and Navigational Interfaces" (p.333)._
- **7.7, 7.8, 7.9** ⚠️ core: roving focus on the `<li>`s (so the package's
  `:focus-visible` band shows): ArrowLeft/ArrowRight between titles with
  wrap-around (opening the new title's menu when one was open), ArrowUp/ArrowDown
  within a menu skipping separators, ArrowRight opening a submenu on its first
  item, ArrowLeft closing it, Enter choosing, Escape closing one level and
  leaving the title highlighted, a second Escape deactivating the bar; Escape
  closing an open contextual menu through the provider's `onClose`; Shift+F10
  and `e.key === "ContextMenu"` on ClassicyContextualMenuTarget, the window root
  and ClassicyDesktopIcon opening the target's menu at its bottom-left corner,
  placed as a pointer-opened one. _WIG Ch.7 (p.98), "Pop-up Menu Interaction"
  (p.101)._
- **7.10** ⚠️ core/product: `layout.window.systemMenu?: boolean` set by the
  package; when true ClassicyWindow prepends Restore/Zoom, Move, Size,
  Minimize/Collapse, Maximize, a separator and Close to the title bar's
  contextual menu (Move and Close alone for utility and modal windows).
  _WIG Ch.7 "The Window Pop-up Menu" (p.102)._
- **7.11** ⚠️ core/product: Finder's `itemContextMenu` and the desktop icons'
  menus gain Rename (begins the label edit), Create Shortcut (an alias) and a
  Properties analogue (Get Info) placed last, Open first and Move To Trash
  before them; package-agnostic, since menu content is the core's. _WIG Ch.7
  "Icon Pop-up Menus" (pp.102–103)._
- **7.12** ⚠️ core: `layout.menu.submenuDelayMs` (Platinum and System 7 0,
  Windows 98 400 = SPI_GETMENUSHOWDELAY's default): ClassicyMenuItemComponent's
  `handleMouseEnter` arms a timer before `onOpen(id, "pointer")`, cleared on
  mouseleave; ClassicyMenu's `handleMouseEnter` on a leaf sibling arms the same
  delay before `setOpenChildId(null)`, cleared when the pointer enters the open
  submenu's wrapper, so a diagonal drag survives; click and Enter stay
  immediate. _WIG Ch.7 "Cascading Menus" (pp.104–105)._
- **7.13** 🔧 core hook (additive; 751ac4026, `ClassicyMenu.tsx`, `_Menu.scss`,
  `Finder.tsx`): `mark?: "check" | "bullet"` on ClassicyMenuItem (default
  `"check"`); with `"bullet"` the item is `role="menuitemradio"` with
  `aria-checked` true or false (`"mixed"` reads as unchecked: ARIA 1.2 allows it
  on a check box alone) and the gutter span carries `classicyMenuItemBullet`
  beside `classicyMenuItemCheck`, so Platinum and System 7, keyed on
  `.classicyMenuItemCheck.checked`, keep drawing their check; the menu scroll
  indicators' row selector and the bevel button's held-press item selector
  (`ClassicyBevelButton`, `ClassicyBevelButtonPopup`) take the new role, and
  the vocabulary declares the `Bullet` part under MenuItem. The package draws
  the 6 × 6 Marlett bullet in the item's ink at the chosen item
  (`:is(#{$menus}) .classicyMenuItemCheck.classicyMenuItemBullet.checked::before
  { background: pixel-art(currentColor, $bullet); }`, `$bullet` the rows
  `..xx..`, `.xxxx.`, `xxxxxx`, `xxxxxx`, `.xxxx.`, `..xx..`), embossed when
  the item is unavailable and plain while the unavailable item is tracked, each
  rule outranking the check rule it stands in for. Finder's View as Icons /
  View as List are an option group marking the current view (Platinum and
  System 7 now draw a check there, as Mac OS 8's View menu did); the Views
  tab's groups are ClassicyRadioInput controls, not menu items, so they take
  nothing. _WIG Ch.7 "Types of Menu Items" (p.108), Figure 7.5 "Option
  Button"._
- **7.14** 🔧 core hook (additive; 751ac4026): `isDefault?: boolean` on
  ClassicyMenuItem, emitted as the vocabulary state `default` on the item's
  `<li>` through the MenuItem appearance state (the path ClassicyButton emits
  its own `default` by; `classicyStateClasses` underneath, so a package's
  `decorate` sees it too); absent, nothing is emitted. The package's
  `:is(#{$menus}) .classicyMenuItem.default > p { font-weight: bold; }` bolds
  the title alone, so a submenu's items stay plain. Finder has no File ▸ Open
  item (the finding's "Finder's Open" assumed one); the one Finder Open that is
  a double-click's command is the Trash icon's contextual Open
  (`finder_trash_open`, the `ClassicyAppFinderOpenFolder` the double-click
  dispatches), which carries it, the icon pop-up menu Figure 7.5 draws bold.
  _WIG Ch.7 (pp.108–109), Figure 7.5 "Default Item"; Ch.13 "Font and Size"
  (p.311)._
- **7.15** ⚠️ core: `layout.menu.shortcutSpelling?: "glyphs" | "names"` read by
  ClassicyKbd's inline variant: `"names"` writes `Ctrl+`, `Alt+`, `Shift+` and
  `Fn` with `+` separators (Classicy's Control chord reads Ctrl+, Option Alt+;
  Command has no Windows name, a product decision: keep its glyph or spell it
  Win+); Windows 98 sets `"names"`, Platinum and System 7 keep glyphs. The
  brief lists Mac keyboard equivalents as an intentional adaptation, hence LOW.
  _WIG Ch.7 "Shortcut Keys in Menu Items" (p.110)._

---

## Chapter 7 — Controls, Toolbars and Status Bars

Pages read: PDF 120–150 (Controls pp.110–135, Toolbars and Status Bars
pp.136–140). Where the text gives no number (the focus rectangle's row, Table
7.4), Windows' own `DrawFrameControl`/`DrawFocusRect` geometry decides, and
where the 1995 figure and Windows 98 differ (raised toolbar buttons against
TBSTYLE_FLAT), Windows 98 as shipped wins and the choice is recorded.

Normative checklist (WIG Ch.7, Controls, Toolbars and Status Bars) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| "Command Buttons" (p.112, Figure 7.7) | A rectangular control with a text or graphic label; mouse down shows the pressed look and moves the focus, dragging off restores it, the command runs on release over the button; the default button ringed in black outside its bevel. | `_Button.scss` `.classicyButton` (ButtonFace, `b.raised`, `--push-button-height` 23, `--button-min-width` 75, `--button-text-padding` 12; pressed `b.pressed` with the label +1,+1; `.default` ringed in WindowFrame, pressed flat); core ClassicyButton (native `<button>`) | ✅ |
| "Command Buttons" (pp.112–113) | SPACEBAR activates the focused button; TAB and arrows move between buttons. | core ClassicyButton (Enter/Space click and flash) | ✅ |
| "Command Buttons" (pp.112–113) | An unavailable button's label is displayed as unavailable (Table 7.4: embossed gray on the raised face). | `_Button.scss` `.classicyButton:disabled`, `.classicyBevelButton.disabled` (`b.disabled-text`) | ✅ |
| "Command Buttons" (p.112) | Ellipsis for a command needing more information; `>>` on an unfold button. | host copy | ➖ |
| "Command Buttons", Table 7.4 (p.113) | Seven appearances: normal, pressed, option-set (ButtonHilight checkerboard over the face), unavailable, option-set unavailable, mixed-value, input focus (a dotted rectangle inside the bevel). | `_Button.scss` `$checker` (`repeating-conic-gradient` of `--color-system-01` and `-03` on a 2 × 2 `--pixel-unit` tile), `.classicyBevelButton` `.checked`/`.mixed`/`.disabled`/`:focus-visible` | ✅ (the mixed and disabled-set refinements are 13.4, 13.5) |
| "Command Buttons", Table 7.4 (p.113) | The focus rectangle lies inside the bevel with a pixel of face between (Windows: the client rectangle less the 2-px edge, deflated once more: the 4th pixel row, the 5th on a default button). | `_Button.scss` `focus-line(var(--push-button-focus-inset))`; `windows98.json` `pushButton.focusInset` | 🔧 see 7.16 |
| "Command Buttons" (pp.114–115, Figure 7.8) | A menu button is a command button with the cascade arrow; pressed it is pressed; while its menu shows it takes the option-set look; unavailable the unavailable look. | `_Button.scss` `.classicyBevelButton.open`; `_PopUpMenu.scss` arrows; `_ControlStrip.scss` module `.open` | 🔧 see 7.17 |
| "Option Buttons" (p.115, Figure 7.9) | Small circles, a dot in the middle when set, empty when not; groups of two to seven; a text label in sentence capitalization. | `_RadioInput.scss` (the 12 × 12 circle as four arcs, ButtonShadow/ButtonDkShadow upper left, ButtonLight/ButtonHilight lower right, over Window white; the 4 × 4 dot, corners off, at (4,4) on `.checked`); `radio.size` 12 | ✅ |
| "Option Buttons" (p.115, Figure 7.10) | Mixed value: every button without a setting dot. | `_RadioInput.scss` `.classicyRadioInput.mixed` | 🔧 see 7.18 |
| "Option Buttons" (pp.115–116) | The label shows unavailability; clicking circle or label chooses; pressed look on mouse down, the setting changes on release; TAB and arrows navigate. | `_RadioInput.scss` (`:active` inside ButtonFace, `.disabled` inside ButtonFace with a GrayText dot, label embossed); core native radio + label | ✅ |
| "Check Boxes" (p.117, Figure 7.11) | A square box with a label; a check mark when set; click box or label toggles; pressed on mouse down, toggled on release; SPACEBAR toggles; the label shows unavailability. | `_Checkbox.scss` (`--checkbox-size` 13 in a `--checkbox-margin` 2, Window white in `b.sunken`; the 7 × 7 WindowText check three pixels in; pressed ButtonFace with the mark kept; disabled ButtonFace with a GrayText mark; label embossed) | ✅ |
| "Check Boxes" (pp.117–118, Figure 7.12) | Mixed value: a checkerboard inside the box; set, clear, mixed on successive clicks. | `_Checkbox.scss` `.classicyCheckbox.mixed` (the 50 % checker face with the mark in GrayText, Wine's DFCS_BUTTON3STATE; pressed or disabled ButtonFace); core `mixed` prop | ✅ |
| "List Boxes" (pp.118–119) | Choices in a bordered box; no label of its own (a static text label); disabled: the label unavailable and, if possible, every entry. | `_ListBox.scss` (`client-edge`: Window white in `b.sunken`, the rows and scroll bar inside the rings; disabled rows GrayText on white, the selection kept, as user32 paints it); core label `disabled` | ✅ |
| "List Boxes" (pp.118–119) | Wide enough for the average entry; else ellipsis or a horizontal bar. | host sizing; base `white-space: nowrap` | ➖ |
| "List Boxes" (p.119) | Click selects; scroll bars when the items exceed the area; arrows and text keys select. | core ClassicyListBox (`useListNavigation`), ClassicyScrollArea | ✅ |
| "List Boxes" (p.120); "Scroll Bars" (p.131) | Disable the arrow at the beginning or end; both when everything fits (and, per Ch.6, enlarge the box to fill the shaft); the system does not disable arrows by default. | `_ScrollBar.scss` `.fits`, `.disabled`; core ClassicyScrollArea states (`disabled` per arrow) | 🔧 arrows, see 7.24 (= 6.8); ⚠️ full-length box 6.9 |
| "Single Selection List Boxes" (p.120, Figure 7.13) | Three to eight rows tall, always a vertical bar, the selected row Hilight under HilightText across the row; 8-pt MS Sans Serif rows (13 px). | `_ListBox.scss` (`--classicy-listbox-row-height`, the 8-row cap, `.selected`); `layout.scrollBar.fitsBars` | 🔧 see 7.19 |
| "Single Selection List Boxes" (pp.120–121) | Arrows, HOME, END, PAGE UP/DOWN and text keys navigate; a mixed-value list shows no selection. | core ClassicyListBox | ✅ |
| "Drop-down List Boxes" (p.121, Figure 7.14) | Closed: the value in a sunken field with a menu button at the right; open: a white list in a black line below, the current item highlighted; press on either part opens, choosing closes. | `_PopUpMenu.scss` (`field` Window white in `b.sunken`, `--pop-up-height` 21, the value `--pop-up-text-inset` 4 in; the raised ButtonFace button `--pop-up-button-width` 16 with the 7 × 4 triangle, pressed flat while open; the list Window white in a 1-px ButtonDkShadow line, 13-px rows, the tracked row a Hilight band; disabled ButtonFace with GrayText and an embossed triangle) | ✅ |
| "Drop-down List Boxes" (p.122) | The closed field a few spaces wider than the average item; the open list three to eight items tall. | core `--menu-pop-up-max-height` (`menu.popUpMaxHeight`, core floor 300) | 🔧 see 7.20 |
| "Drop-down List Boxes" (p.122) | UP/DOWN or ALT+UP/DOWN open; arrows and text keys select; leaving the control closes; a mixed drop-down shows no value. | core ClassicyPopUpMenu (`onButtonKeyDown`, placeholder) | ✅ |
| "Extended and Multiple Selection List Boxes" (pp.122–123, Figure 7.15) | The single-selection height and width; a flat-style check box before each item of a multiple selection list. | core ClassicyListBox `selection="multiple"` (highlighted rows, no check part) | 🔧 see 7.25 |
| "List View Controls" (p.123) | Icon, small icon, list and report views; sorting, label editing, drag and drop, pop-up menus, region selection. | core Finder / ClassicyFileBrowser, ClassicyTable; `_Table.scss`, `_Icon.scss` | ✅ structure (label editing is the core's content) |
| "Tree View Controls" (pp.123–124, Figure 7.16) | An indented outline with expand/collapse buttons and lines (best both); UP/DOWN between items, LEFT/RIGHT along a branch, RIGHT expands; ENTER or double-click runs the default. | `_Button.scss` `.classicyTriangle` (the 9 × 9 tree button: a ButtonShadow line on Window white with a black + or −); `_ListBox.scss` tree rules; core ClassicyTree keys | 🔧 lines, see 7.21; 🔧 bare Right Arrow, see 7.21 |
| "Text Fields" (pp.124–125) | No label of its own (a static text label shows unavailability); TAB reaches them; read-only fields show text that can be selected but not edited. | `_TextField.scss` (`.classicyControlLabel.disabled` embossed, disabled fields ButtonFace with plain GrayText, the read-only well) | ✅ |
| "Text Boxes" (p.125, Figure 7.17) | A rectangular control for one or more lines; the border typical in dialogs (a white field in the sunken two-ring edge); scroll bars for multi-line boxes. | `_TextField.scss` (`client-edge`: Window white in `b.sunken`, `field.height` 21, `field.paddingX` 4, `field.paddingY` 3, caret WindowText, selection HilightText on Hilight, no focus ring; the multiline editor's bars inside the rings) | ✅ |
| "Rich-Text Boxes" (pp.125–126, Figure 7.18) | A text box with character and paragraph formatting, in the same bordered box. | `_TextField.scss` `.classicyRichTextEditor` (the toolbar a ButtonFace band, the prose in the body face) | ✅ |
| "Combo Boxes" (p.127, Figure 7.19) | A text box with an always-visible list below it. | none (Classicy has no always-open combo box) | ➖ |
| "Drop-down Combo Boxes" (pp.127–128, Figure 7.20) | A drop-down list whose text box is editable; the menu button opens and closes the list. | `_PopUpMenu.scss` (`.classicyComboBox`, `-Input`, `-Indicator`); core ClassicyComboBox | ✅ |
| "Spin Boxes" (p.128, Figure 7.21) | A text box with a pair of small up-down buttons flush at its right; the top increases, the bottom decreases by one unit; clicking either focuses the text box. | `_LittleArrows.scss` (the pair `--window-scrollbar-size` 16 wide, each a raised ButtonFace button with a 5 × 3 WindowText triangle one pixel left of center, pressed flat, disabled embossed; flush to the field, stretched to its height); `_TextField.scss` `.classicySpinner` | ✅ look |
| "Spin Boxes" (p.128) | Typically wrap at either end; with the focus, UP/DOWN ARROW change the value. | core ClassicySpinner (clamps; arrow keys not bound) | 🔧 see 7.26 |
| "Static Text Fields" (p.128, Figure 7.22) | Read-only text on the dialog face; a label's access key moves the focus to its control. | `_TextField.scss` `.classicyControlLabel` (WindowText; disabled GrayText embossed), `.classicyOutput` | ✅ |
| "Shortcut Key Input Controls" (pp.128–129) | A special text box accepting a key combination and displaying it with its modifiers; labeled by a static text field. | `_Dialog.scss` `output.classicyOutput.classicyKeyboardEquivalentDisplay` (an edit control: Window white in `b.sunken`, the field's height and inset, left-aligned; disabled ButtonFace with plain GrayText); core ClassicyKeyboardEquivalentField | ✅ |
| "Group Boxes" (p.130, Figure 7.23) | An etched rectangular frame with an optional label breaking the top line at the upper left (sentence capitalization); processes no input. | `_ControlGroup.scss` (`.classicyControlGroupFieldsetPrimary::before` `b.etched`, two rings; the legend WindowText in the UI font on a ButtonFace strip, its ink 7 px from the frame's outer edge, GB_Paint's deflate-by-7) | ✅ |
| "Column Headings" (pp.130–131, Figure 7.24) | Header parts over the columns acting as command buttons (sort on click); labels text and/or image, aligned left, right or center; draggable divisions. | `_Table.scss` (`.classicyTableColumnHeader` raised ButtonFace, pressed while the mouse is down, raised again sorted or not; no sort arrow or stripe, Windows 98's; `aria-sort` carries the order); core ClassicyTable (align, resizable) | ✅ |
| "Tabs" (p.131, Figure 7.25) | One row of tabs by default; a tab sized to its label; the system font; raised tabs on the raised page, the chosen tab forward and joined to the page. | `_Tabs.scss` (raised ButtonFace tabs open at the bottom, `tabControl.radius` 3, `paddingX` 10, `height` 21; the chosen tab `lift` 2 higher and two rings wider, its face running over the panel's edge; the panel `b.raised`, content `padding` 12 in; scroll arrows 16 wide; one tab size: the small tabs keep the UI font) | ✅ |
| "Tabs" (p.131) | Clicking a tab switches; LEFT/RIGHT move between tabs; CTRL+TAB switches. | core ClassicyTabs (roving tablist) | ✅ |
| "Property Sheet Controls" (p.131) | Tabbed property pages (details Ch.8). | Ch.8 | see Ch.8 |
| "Scroll Bars" (pp.131–132) | Scroll bar controls only for scrolling; disable an arrow at the end; no input focus on bars. | core ClassicyScrollArea (bars `aria-hidden`, never focusable; `disabled` on an arrow at the end of its travel) | ✅ focus; 🔧 arrows 7.24 |
| "Sliders" (p.132, Figure 7.26) | A bar defining the range and an indicator; drag or click in the bar's hot zone moves it; TAB reaches it, arrows move it; orientation, lengths, increments and ticks optional; a sunken channel, a pointed thumb pointing down, ticks below. | `_Slider.scss` (`slider.channel` 4 in `b.sunken`, the pointed raised thumb `thumbAlong` 11 × `thumbAcross` 21 with a 5-row point, `thumbRise` 5; dragged, highlighted or disabled the 55AA dithered face; ticks `tickWidth` 1 × `tickHeight` 4 WindowText on the pointed side, centered on the tip; the focus rectangle around the control); core ClassicySlider | ✅ |
| "Progress Indicators" (p.132, Figure 7.27) | A bar filling left to right in highlight-colored blocks in a sunken bar; noninteractive. | `_ProgressBar.scss` (`progressBar.height` 16 in the one-ring sunken edge, `blockWidth` 8, `blockGap` 2, `inset` 2; Hilight blocks) | ✅ |
| "Tooltip Controls" (p.133, Figure 7.28) | A small pop-up of descriptive text: a cream box in a 1-px black line, no tail. | `_BalloonHelp.scss` (`--package-color-tooltip-face` #ffffe1 and `-text`, a 1-px `--color-window-border` line, `tooltip.paddingX` 4, `paddingY` 2, square corners, the tail hidden) | ✅ |
| "Tooltip Controls" (p.133) | Appears after a time-out, removed on click or when the pointer leaves; shown at the lower right of the pointer, adjusted at the screen edge. | core `useClassicyBalloonHelp` (600 ms; placed by the anchor; hides on mouse leave, not on click) | 🔧 see 7.27 |
| "Wells" (p.133, Figure 7.29) | A field for graphic values with the check box's or text box's sunken border; the set value marked by a special selection border around the control's edge; grouped and labeled. | `_Icon.scss` `.classicyImageWell` (`b.sunken` around Window white; `.selected` the option-set border, two solid rings inside the client edge, WindowText outside ButtonHilight; drag-over dashed; disabled ButtonFace); `_AppearanceManager.scss` swatches (`b.sunken` wells, no set state) | ✅ border; 🔧 set-value border, see 13.7 |
| "Pen-Specific Controls" (pp.133–135, Figures 7.30–7.33) | Boxed edit, ink edit, writing tool and eraser controls. | none | ➖ |
| "Toolbars and Status Bars" (p.136, Figure 7.34) | A toolbar is a panel of controls for quick access; Figure 7.34 shows raised 3-D buttons on the face. | `_Button.scss` `.classicyButtonToolbar .classicyBevelButton` (flat, TBSTYLE_FLAT); `_ControlStrip.scss` cells (`b.raised-thin`) | 🔧 see 7.23 (product: Windows 98's flat buttons kept) |
| "Toolbars and Status Bars" (p.136, Figure 7.35) | A status bar at the window's bottom with panes of read-only text, each a one-ring sunken field, the size grip at the right end. | `_Placard.scss` `.classicyPlacard` (ButtonFace in the one-ring sunken edge, BDR_SUNKENOUTER, text 3 px in); the grip `_Window.scss` | ✅ |
| "Interaction with Controls in Toolbars and Status Bars" (pp.136–137) | Property controls apply directly to the selection; always a tooltip for a control without a text label. | core ClassicyControlStrip (`aria-label` only); ClassicyBalloonHelp for host toolbars | 🔧 see 7.28 |
| "Support for User Options" (p.137) | Toolbar buttons in two sizes, 24 × 22 and 32 × 30, images no larger than 16 × 16 and 24 × 24; let the user switch sizes and show or hide bars. | `_Button.scss` toolbar sizes; `windows98.json` `toolbar` family | 🔧 see 7.22 |
| "Support for User Options" (pp.137–138) | Toolbars docked by default and movable, a dotted outline as drag feedback; position, size and state preserved. | core ClassicyControlStrip (Control-drag docks left or right, position persisted) | ✅ (for the one toolbar Classicy has) |
| "Support for User Options" (p.138) | With a status bar's size grip shown, hide the grip at the scroll bars' junction. | one grip, in the scroll bars' corner (Ch.6 "Size Grip") | ✅ |
| "Common Toolbar Buttons", Table 7.5 (pp.139–140) | The standard 16 × 16 and 24 × 24 images for New, Open, Save, Print, Cut, Copy, Paste, Undo, the views and the rest, only for those functions. | none (the package registers no art) | ➖ |

### Findings — Chapter 7, Controls

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 7.16 | LOW | The push button's focus rectangle lay on the 5th pixel row (`pushButton.focusInset` 4: two of bevel, two of face), the default button's on the 6th; Windows paints it on the 4th (the client rectangle less the 2-px edge, deflated once more; 98.css's `outline-offset: -4px`), the 5th on a default button. | `windows98.json`, `_Button.scss` | 🔧 Fixed |
| 7.17 | LOW | A bevel button whose pop-up menu was open took the pressed rings on a plain face; the WIG gives a displayed menu button the option-set checkerboard. | `_Button.scss` (`.classicyBevelButton.open`) | 🔧 Fixed |
| 7.18 | LOW | A mixed radio button drew a 6 × 2 dash inside the circle; Figure 7.10 draws every button of a mixed group with no dot at all. | `_RadioInput.scss` (`.classicyRadioInput.mixed`) | 🔧 Fixed |
| 7.19 | LOW | List rows were 16 px (`--control-static-text-height`, the nearest knob); Figure 7.13's 8-pt MS Sans Serif rows are 13 px, the package's own drop-down rows. | `_ListBox.scss`, `windows98.json` (`listBox.rowHeight`) | 🔧 Fixed |
| 7.20 | LOW | An open drop-down list could show up to the core's 300-px floor (`--menu-pop-up-max-height`), about 23 rows; the WIG shows three to eight. | `windows98.json` (`menu.popUpMaxHeight`), `_PopUpMenu.scss` | 🔧 Fixed |
| 7.21 | LOW | The tree view drew its +/− buttons but no hierarchy lines (TVS_HASLINES); the WIG says it is best to include both. A bare Right Arrow does not expand a branch (the Mac's modifier+arrow does). | `_ListBox.scss`; core ClassicyTree | 🔧 Fixed (3ed578659) |
| 7.22 | LOW | Toolbar bevel buttons took the base's Platinum sizes (square widths 24/36/48, height by content); the WIG names 24 × 22 and 32 × 30 with 16 × 16 and 24 × 24 images. | `_Button.scss`, `windows98.json` (`toolbar` family) | 🔧 Fixed |
| 7.23 | LOW | Toolbar buttons are flat at rest (TBSTYLE_FLAT: one raised ring under the pointer, one sunken ring pressed or latched), the Windows 98 shell's and IE4's; Figure 7.34 (1995) shows raised 3-D buttons. | `_Button.scss` (`.classicyButtonToolbar .classicyBevelButton`) | 🔧 Fixed (376c49cb5) |
| 7.24 | LOW | A list box's or scroll area's arrow at the start or end of its travel stayed enabled (the core published `fits` per bar only). Same mechanism as 6.8. | core ClassicyScrollArea; `_ScrollBar.scss` | 🔧 Fixed (core hook `disabled`, = 6.8) |
| 7.25 | LOW | A multiple-selection list box highlights rows and renders no check-box part before each item. | core ClassicyListBox; `_ListBox.scss` | 🔧 Fixed (3ed578659) |
| 7.26 | LOW | The spin box ignores Up/Down Arrow and clamps at its limits rather than wrapping. | core ClassicySpinner | 🔧 Fixed (3ed578659) |
| 7.27 | LOW | The tooltip is placed by its anchor (the balloon's positions) rather than below-right of the pointer, and a click on the control does not hide it. | core `useClassicyBalloonHelp` | 🔧 Fixed (3ed578659) |
| 7.28 | LOW | The Control Strip's unlabeled cells (modules, collapse box, scroll arrows) carry `aria-label`s but no tooltip. | core ClassicyControlStrip | 🔧 Fixed (b86689686, 0c937b0e7, 819723aaa) |

**Details & fixes**

- **7.16** 🔧 (`packages/appearance/windows98/src/windows98.json`,
  `.../_Button.scss`): `pushButton.focusInset` 4 → 3 in `defaults` and all 18
  presets, so `focus-line(var(--push-button-focus-inset))` lays the dotted line
  on the 4th pixel row (two rings of bevel, one of face) and the default button's
  `focus-line(inset + 1)` on the 5th; the partial's header says so and cites the
  rule. The WIG gives no number (Table 7.4's tile cannot be counted); Windows'
  DrawFrameControl/PB_Paint/DrawFocusRect geometry and 98.css agree on the row.
  _WIG Ch.7 "Command Buttons", Table 7.4 (p.113)._
- **7.17** 🔧 (`_Button.scss`): `.classicyBevelButton:not(.disabled):is(.checked,
  .mixed, .open) { background: $checker; }` (was `.checked`/`.mixed` only), so an
  open pop-up bevel button shows the option-set face while its menu is up; the
  flat toolbar rule (one sunken ring while open) is unchanged. _WIG Ch.7
  "Command Buttons" (p.115; Figure 7.8, p.114)._
- **7.18** 🔧 (`_RadioInput.scss`): `.classicyRadioInput.mixed { opacity: 1;
  background: well(); }` draws the empty inside in the state's face over the
  wrapper's dot (so a checked-and-mixed button shows no dot and a pressed mixed
  button still shows the ButtonFace inside); the `$dash` art is removed. _WIG
  Ch.7 "Option Buttons" (p.115), Figure 7.10._
- **7.19** 🔧 (`windows98.json`, `_ListBox.scss`): new family `listBox {
  rowHeight: 13 }` in `defaults` and all presets (emitted as
  `--list-box-row-height`, the name System 7 already uses); `.classicyListBox {
  --classicy-listbox-row-height: var(--list-box-row-height) }`, so rows are
  13 px and the eight-row cap (`max-height: 8 rows + the two rings each way`)
  follows. Not an editable knob (a fixed Windows metric, like `pushButton`), so
  no `knobs` entry; `docs/AGENT-REFERENCE.md`'s Windows 98 family list names
  it. _WIG Ch.7 "Single Selection List Boxes" (p.120), Figure 7.13._
- **7.20** 🔧 (`windows98.json`, `_PopUpMenu.scss`): new family `menu {
  popUpMaxHeight: 106 }` in `defaults` and all presets, the package's own value
  of the core's structural knob (`--menu-pop-up-max-height`, core floor 300):
  8 rows × 13 px + the list's two 1-px lines (the list is border-box), read by
  `ClassicyPopUpMenu.scss` and the core's placement for the pop-up and combo
  box lists; the partial's header notes the cap. _WIG Ch.7 "Drop-down List
  Boxes" (p.122)._
- **7.21** 🔧 (`_ListBox.scss`): Explorer's lines (TVS_HASLINES + TVS_LINESATROOT)
  as dotted ButtonShadow (`repeating-linear-gradient` on the `--pixel-unit`
  grid, 1 on / 1 off) drawn as each `.classicyTreeNodeRow`'s background from its
  content box (`background-origin: content-box`, since rows indent by inline
  padding): a vertical line down the middle of the 12-px button column (`px(6)`)
  and an 8-px stub at the row's middle (`px(8)`, the 17-px row's tree-button
  bar) toward the icon; a group's last item ends its line at the stub, the
  root's first item begins there (alone at the root: stub only); a parent with
  siblings below carries its line on beside its open children
  (`.classicyTreeNode:not(:last-child) > .classicyTreeGroup`, at the parent's
  column, which each group learns a level at a time through
  `--windows98-tree-column` / `--windows98-tree-parent-column`, no
  self-reference, no multiplier). Standard File's well (a list view) is
  excluded like the label rules; the tree button, drawn over it, hides the
  line. The geometry assumes the package's 17-px rows (`window.controlSize` 12
  + `paddingSize` 5), fixed by every preset. ⚠️ core (keys): ClassicyTree
  expands a closed branch on a bare ArrowRight (and collapses on ArrowLeft,
  moving to the parent when closed) when the active package's layout declares
  `tree: { keys: "windows" }`. _WIG Ch.7 "Tree View Controls" (pp.123–124),
  Figure 7.16._
- **7.22** 🔧 (`windows98.json`, `_Button.scss`): new family `toolbar {
  buttonWidth: 24, buttonHeight: 22, largeButtonWidth: 32, largeButtonHeight:
  30 }` in `defaults` and all presets; every ClassicyButtonToolbar bevel button
  is `box-sizing: border-box` at the row height (32 × 30 for the base's default
  large toolbar, 24 × 22 under `.classicyButtonToolbarSizeMedium`/`-Small`), an
  icon-only (`.classicyBevelButtonSquare`) button takes the width and `padding:
  px(3) px(4)` so its image is 24 × 24 or 16 × 16, a labeled button keeps its
  width at the row height, and the help button (its "?" placed on a 20 × 21 box)
  keeps its own size via `:not(.classicyHelpButton)` and a height restatement.
  comctl32's own 16-px-image buttons measured 23 × 22, one pixel narrower than
  the WIG's 24; the WIG's figure is applied. _WIG Ch.7 "Support for User
  Options" (p.137); Ch.13 "Font and Size" (p.311)._
- ✅ "Command Buttons" (p.112): `.classicyButton` is ButtonFace in `b.raised`
  (ButtonHilight and ButtonLight at the top and left, ButtonDkShadow and
  ButtonShadow at the bottom and right), 23 tall and 75 wide at least, the label
  12 px from each end; `:active`, `.pressed` and the keyboard flash turn the
  rings (`b.pressed`) and step the label +1,+1; `.default` is ringed in
  WindowFrame one ring outside the bevel and, pressed, drawn flat (the ring and
  one ring of ButtonShadow, Wine's DFCS_FLAT for a pushed BS_DEFPUSHBUTTON);
  disabled, raised with the label embossed. The browser's `:active` drops when
  the pointer leaves a pressed `<button>` and returns over it; the click fires
  on release over it.
- ✅ "Check Boxes" (pp.117–118): the 13-px box in a 2-px margin, Window white
  in `b.sunken`; the 7 × 7 check three pixels in (two of bevel, one of face);
  the "x" mark kept as the HIG's localization opt-in; pressed ButtonFace with
  the mark; disabled ButtonFace with a GrayText mark (Windows embosses no check
  mark); mixed the 50 % checker with the mark in GrayText, on or off; the label
  6 px after the box (98.css's 19-px inset less the box), embossed when
  disabled, carrying the dotted focus rectangle.
- ✅ "Drop-down List Boxes" (p.121), Figure 7.14: `_PopUpMenu.scss`'s field is
  Window white in `b.sunken`, 21 tall, the value 4 px in; the drop-down button a
  raised ButtonFace box 16 wide inside the frame at the right with the 7 × 4
  triangle, pressed flat while the list is open; while focused (however it got
  the focus: Windows 98 hid none) a Hilight band over the value with HilightText
  and the dotted rectangle on its edge; the open list Window white in a 1-px
  ButtonDkShadow line, 13-px rows, the tracked row a band, no check against the
  current item (Windows drew none).
- ✅ "Spin Boxes" (p.128), Figure 7.21: `_LittleArrows.scss` draws the pair
  16 wide, each button raised ButtonFace with a 5 × 3 WindowText triangle one
  pixel left of center, four pixels from the pair's outer edge (so both center
  in an 11-px button at any height), pressed flat with the triangle +1,+1,
  disabled embossed; the stepper's and the pickers' arrows stand flush to the
  field and stretch to its height (the up-down control on its buddy edit).
- ✅ "Group Boxes" (p.130): `.classicyControlGroupFieldsetPrimary::before` is
  `b.etched` over the fieldset's transparent two-ring border (an inset shadow
  stops at the padding box, so the pseudo-element lies in the border); the
  legend's ink 7 px from the frame's outer edge on a ButtonFace strip a pixel
  wider each side (GB_Paint), its line box the font and a pixel (14.1).
- ✅ "Column Headings" (pp.130–131): `_Table.scss`'s header is a row of raised
  ButtonFace buttons, titles `--field-padding-y` × `--field-padding-x` inside,
  pressed (`b.pressed`, the title +1,+1) while the mouse is down and raised
  again at once; Windows 98 marked the sorted column with no stripe, no pressed
  header and no arrow (the arrow came with Windows XP), so the base's arrow is
  not drawn and `aria-sort` carries the order; the WIG's "may include an image
  such as the sort direction" is permissive.
- ✅ "Tabs" (p.131), Figure 7.25: `_Tabs.scss`'s tabs are raised ButtonFace
  boxes open at the bottom, the two top corners rounded by `--tab-control-radius`
  3 (Windows' two-pixel diagonal), labels 10 px from each side; the chosen tab
  stands `--tab-control-lift` 2 higher and two rings wider (TAB_DrawItem's
  SELECTED_TAB_OFFSET), its face running two rings down over the panel's
  ButtonHilight line; the panel `b.raised` with 12 px of padding; the overflow
  arrows raised 16-px boxes with 3 × 5 triangles, pressed flat, disabled
  embossed; `.classicyTabsSizeSmall` keeps the UI font (Windows has no smaller
  tab).
- ✅ "Sliders" (p.132), Figure 7.26: the 4-px channel in `b.sunken` lying
  `--slider-thumb-rise` 5 from the thumb's flat side (comctl32's quarter of the
  thumb's length); the pointed raised thumb 11 along × 21 across with the point
  five rows deep, its diagonals continuing the raised bevel's rings, the tip
  dark; TBS_BOTTOM/TOP/LEFT/RIGHT each drawn as seen, TBS_BOTH a raised box 14
  across; dragged, highlighted or disabled the 55AA checker face; 1 × 4
  WindowText ticks centered on the tip column; the Control Strip's pop-up
  slider the taskbar volume pop-up's vertical trackbar.
- ✅ "Progress Indicators" (p.132), Figure 7.27: the 16-px ButtonFace track in
  the one-ring sunken edge comctl32 draws (`DrawEdge(BDR_SUNKENOUTER)`, not the
  two-ring client edge), the Hilight blocks 8 wide with a 2-px gap starting
  `--progress-bar-inset` 2 inside (the ring and one pixel of face, where comctl32
  starts its blocks); the browser cuts the last block where the value ends,
  where Windows drew whole blocks.
- ✅ "Tooltip Controls" (p.133), Figure 7.28: `_BalloonHelp.scss` draws the
  balloon as a ToolTip: InfoWindow (`--package-color-tooltip-face`, #ffffe1 in
  Windows Standard) in a 1-px WindowFrame line, square corners, InfoText in the
  UI font 4 px from the sides and 2 px from the top and bottom, as wide as its
  text, no tail; a title the same text in bold (TTM_SETTITLE).
- ✅ "Toolbars and Status Bars" (p.136), Figure 7.35: `.classicyPlacard` is a
  status-bar pane, ButtonFace in the one-ring sunken edge (BDR_SUNKENOUTER:
  ButtonShadow top-left, ButtonHilight bottom-right), its text 3 px in; a
  placard with a menu shows the combo box's 7 × 4 triangle, pressed or open its
  content steps +1,+1, disabled embossed.
- **7.23** ⚠️ product decision, Windows 98 as shipped kept: the flat toolbar
  button is the 98 shell's and IE4's; a per-preset look (raised for the Windows
  95 preset) cannot be switched by a numeric knob and would need a core variant
  hook (`assetVariant`-style). _WIG Ch.7 "Toolbars and Status Bars" (p.136),
  Figure 7.34._
- **7.24** 🔧 core hook: see 6.8 (`disabled` per arrow from `update()`'s
  measurement, e013ae28c; an existing vocabulary state, so nothing was added to
  `ClassicyVocabulary.json`; CLAUDE.md's Scroll Bars note describes it; the
  package embosses the one arrow). _WIG Ch.7 "List Boxes" (p.120), "Scroll
  Bars" (p.131)._
- **7.25** ⚠️ core hook: ClassicyListBox takes an opt-in `checkboxes` prop for
  `selection="multiple"` rendering `data-classicy-part="list-check"` (a span,
  `aria-hidden`, the row's `aria-selected` carrying the state) before each row's
  label; the package draws it in `_ListBox.scss` as the 13-px Window-white box in
  a one-ring ButtonShadow line (the flat appearance style, Ch.13 "Flat
  Appearance" (p.309)) with the 7 × 7 check while the row is selected. _WIG Ch.7
  "Extended and Multiple Selection List Boxes" (pp.122–123), Figure 7.15._
- **7.26** ⚠️ core: ClassicySpinner's `handleOnKeyDown` steps the value on
  ArrowUp/ArrowDown (`preventDefault`, the OS key repeat covering a held key) and
  a `wrap?: boolean` prop (default false) cycles past `minValue`/`maxValue`
  instead of clamping. _WIG Ch.7 "Spin Boxes" (p.128)._
- **7.27** ⚠️ core layout flag: `balloonHelp: { placement: "anchor" | "pointer"
  }` (default `"anchor"`; Windows 98 `"pointer"`) read by `useClassicyBalloonHelp`:
  with `"pointer"` the box is placed below-right of the pointer's last position
  (tracked on mousemove while hovering), flipped at the desktop's edges, and a
  pointerdown on the anchor hides it. `_BalloonHelp.scss` already draws the
  ToolTip box. _WIG Ch.7 "Tooltip Controls" (p.133)._
- **7.28** ⚠️ core: ClassicyControlStrip wraps each cell in `useClassicyBalloonHelp`
  with the module's label (`classicyControlStripModuleLabel`) or the cell's
  `aria-label` as the content, so every unlabeled toolbar control carries a
  tooltip. _WIG Ch.7 "Interaction with Controls in Toolbars and Status Bars"
  (p.137); App. C "User Assistance" (p.364)._

---

## Chapter 8 — Secondary Windows

Pages read: PDF 151–176 (pp.145–170). Ch.8 gives no pixel numbers; its look rules
are the secondary window's caption (Figure 8.1), the common dialogs' layouts
(Figures 8.6–8.8, 8.13) and the palette window's title bar (Figure 8.15). Dialog
flow, modality, navigation and message wording are the core's and the apps'.

Normative checklist (WIG Ch.8) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| "Appearance and Behavior" (p.145, Figure 8.1) | A secondary window has a title bar and frame and is movable; it has no Maximize or Minimize button, optionally a Close button; the title describes the window's purpose; the title bar has no icon. | `_Window.scss` modal caption (`.classicyWindowTitleBarModal`) | 🔧 see 8.1 |
| "Appearance and Behavior" (p.145) | A secondary window has a pop-up menu with the window's commands (button 2 on the title bar). | core ClassicyWindow (no system menu) | 🔧 see 8.7 (= 6.2) |
| "Appearance and Behavior" (p.145) | A What's This? button may sit in the title bar. | none (no Windows help system) | ➖ |
| "Interaction with Other Windows" (pp.145–146) | Secondaries depend on their primary: closed or hidden with it, restored with it; ALT+F6 switches; activating a primary brings its secondaries with it; a dependent secondary always lies above its primary and its peers. | core: `closeApp` closes an app's windows, a hidden app's modals are `display: none`, z-order bands (palettes 350, modals 370 above the focused window's 300) | ✅ |
| "Interaction with Other Windows" (p.146) | Always On Top for palette windows, user-configurable. | core utility band (always above the app's documents; no setting) | ➖ |
| "Interaction with Other Windows" (p.146) | Persistence of state: show a secondary window as last accessed (the Open dialog's current directory, the last tabbed page). | core ClassicyFileDialog (`currentPath` reset on open), control panel tabs | 🔧 see 8.11 |
| "Unfolding Secondary Windows" (p.146) | An unfold button labeled with `>>` expands to a second fixed size. | host content | ➖ |
| "Cascading Secondary Windows" (pp.146–147) | A dependent window opens offset right and below its parent; one level only. | no bundled dialog opens another | ➖ |
| "Window Placement" (p.147) | Where it last appeared; else where it displays fully; else centered in the primary window below its title bar, menu bar and toolbars. | core: alerts and dialogs open at `initialPosition ["center", "center"]` on the desktop (the Mac's); `windows98.json` declares `layout.window.centering: "wholePixel"`, so the core's `resolvePosition` rounds a `"center"` axis to a whole pixel | 🔧 see 8.8 |
| "Modeless vs. Modal" (p.147) | Modeless where the user repeats an action; modal sparingly; system modal only for severe conditions. | core `modal` prop; modeless windows | ✅ |
| "Default Buttons" (pp.147–148) | ENTER activates the default button, shown with a bold outline; never a destructive default; the default follows focus to another button and returns. | `_Button.scss` `.default` (WindowFrame ring); core dialogs (native `<button>` activation) | ✅ |
| "Default Buttons" (p.148) | Double-clicking a single-selection item may carry out the default. | core FileDialog (double-click opens) | ✅ |
| "Navigation in Secondary Windows" (p.148) | TAB and SHIFT+TAB move between controls left to right, top to bottom; option buttons one tab stop with arrows inside; combination controls one stop. | core (native tab order, native radio groups) | ✅ |
| "Navigation in Secondary Windows" (pp.148–149) | ALT+access key (and a bare letter outside text fields) moves to and activates a control; unique access keys. | core (no access keys) | 🔧 see 8.9 (= 7.1) |
| "Navigation in Secondary Windows" (p.149) | OK and Cancel take no access keys: ENTER and ESC reach them; ENTER always invokes the default button. | core dialogs (Enter opens in the file dialog, Enter/Escape in the keyboard-equivalent dialog, alerts' default button) | ✅ |
| "Validation of Input" (p.149) | Validate at the point of input; else when leaving the control or on commit, leaving the window open. | apps' content | ➖ |
| "Property Sheet Interface" (pp.149–151, Figures 8.2–8.3) | Title "<name> Properties"; properties grouped on tabbed pages; a drop-down to switch groups of pages. | core control panels (the Appearance Manager's eight tabs); `_Tabs.scss` | ✅ structure (titles are the Mac's) |
| "Property Sheet Commands" (pp.151–152) | OK, Apply, Cancel outside the pages, applying to the window; closing with pending changes prompts Yes/No/Cancel. | core control panels apply at once (the inspector model, "Property Inspectors", pp.152–153) | ✅ (inspector model) |
| "Properties of a Multiple Selection" (p.153) | Differing values shown with the mixed-value appearance. | Ch.13 "Mixed-Value Appearance" | see Ch.13 |
| "Dialog Boxes" (p.154) | A dialog's title is its command's name, without ellipsis or menu title. | apps' content | ➖ |
| "Dialog Box Commands" (p.154) | OK applies and closes, Cancel discards and closes; OK the default; a Help button possible. | core InputDialog, FileDialog, Alert (default and cancel roles) | ✅ |
| "Layout" (p.154) | Controls left to right, top to bottom; buttons stacked at the upper right or in a row across the bottom; the default first; OK and Cancel together; Help last. | `_Dialog.scss` `button-row` (order: default, others, Cancel; the alert's Help after Cancel); `--layout-dialog-edge` 11 | ✅ |
| "Common Dialog Box Interfaces" (p.155) | Use the system's dialogs; preserve the user's latest settings between openings. | core dialogs (see 8.11) | 🔧 see 8.11 |
| "Open Dialog Box" (pp.155–156, Figure 8.6) | Look in (the path upward, then the drives), a list of small icons and names with the selected name alone highlighted, File name, Files of type, Open and Cancel; shortcuts open their targets. | `windows98.json` `layout.fileDialog`, `_Dialog.scss` file-dialog rules | 🔧 see 8.4, 8.6 |
| "Save As Dialog Box" (pp.156–157, Figure 8.7) | The Open dialog's layout with Save in; a default name in the File name box (the current name, or one from the short type name). | `layout.fileDialog.saveName`; core FileDialog | 🔧 see 8.5 |
| "Find and Replace Dialog Boxes" (p.158, Figure 8.8) | Plain ButtonFace dialogs of fields, drop-downs and check boxes, no inner frame. | `_Window.scss` `.classicyWindowContentsFramed` (the core's modeless-dialog frame) | 🔧 see 8.3 |
| "Print", "Print Setup", "Page Setup", "Font" (pp.159–161) | The system's dialogs. | none | ➖ |
| "Color Dialog Box" (pp.162–163, Figures 8.13–8.14) | Basic and Custom color wells, Hue/Sat/Lum and Red/Green/Blue fields, expandable. | core ClassicyColorPicker (its structure); `_AppearanceManager.scss` (swatches as sunken wells, field labels plain) | ✅ look (structure is the core's) |
| "Palette Windows" (pp.163–164, Figure 8.15) | A modeless window of controls with a shorter title bar holding a Close button only; title = the command's or toolbar's name; sizable palettes show the size pointer and a Size command; pop-up menu Close, Move, Size, Always On Top, Properties. | `_Window.scss` `.classicyWindow.classicyWindowUtility` (`--window-utility-title-bar-height` 13, `utilityTitleBar.buttonWidth` 12 × `buttonHeight` 11) | 🔧 see 8.2; 🔧 pop-up menu 8.7 |
| "Message Boxes" (pp.164–165) | The title identifies the context (the document's or application's name), never "warning", "caution" or "error". | apps' content (the Mac's alerts) | ✅ (`dialog.caption: "titled"`: an untitled message box is titled with its application; 7d1d67f52) |
| "Message Box Types" (pp.165–167, Table 8.1, Figure 8.17) | Information, Warning and Critical symbols. | core ClassicyAlert `alertType` note, caution, stop (Platinum's art) | ✅ types; ➖ pictures |
| "Message Box Types" (p.167) | Display a message box only while the application is active; a progress or start-up box needs no symbol. | core; the startup screen (`_Desktop.scss` draws it as a dialog) | ✅ |
| "Command Buttons in Message Boxes" (pp.167–168, Figure 8.19) | The most frequent or least destructive option as the default; OK alone (plus Help) for an acknowledgement; Yes/No or named actions; Cancel (or Stop) to abandon. | core alerts (default buttons generated by type); `_Alert.scss` (buttons centered, Windows' order, Help last) | ✅ look; ➖ wording |
| "Message Box Text" (p.169) | Clear, specific, two or three lines, no jargon, never "error". | apps' content | ➖ |
| "Pop-up Windows" (p.170, Figure 8.20) | Tooltips as contextual help with system time-outs; a pointing-hand cursor for click pop-ups; a second click dismisses. | core `useClassicyBalloonHelp` (600 ms); cursors Platinum's | ✅ tooltips; ➖ hand cursor |

### Findings — Chapter 8

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 8.1 | LOW | A dialog's caption drew the collapse (Minimize) box the core gives a `collapsable` modal and the icon it draws unless `hideIcon`; a secondary window has neither. | `_Window.scss` (`.classicyWindowTitleBarModal`) | 🔧 Fixed (7d1d67f52, 819723aaa) |
| 8.2 | LOW | A palette (utility) window drew small Minimize and Maximize boxes beside Close; a palette's title bar holds Close alone. | `_Window.scss` (`.classicyWindow.classicyWindowUtility`) | 🔧 Fixed |
| 8.3 | LOW | A modeless dialog's `contentFrame` (HIGOS8's two-pixel modeless frame) was drawn as a sunken white box inside the client area; Find and Replace are plain ButtonFace boxes with no inner frame. | `_Window.scss` (`.classicyWindowContentsFramed`, `.classicyWindowContentsWithFrame`); core ClassicyWindow | 🔧 Fixed |
| 8.4 | MEDIUM | The Open and Save dialogs browsed the Mac's expanding tree (`fileDialog.navigation: "tree"`, the default); Windows' common dialogs show one folder at a time under Look in. | `windows98.json` (`layout.fileDialog`) | 🔧 Fixed |
| 8.5 | LOW | Save As opened with its default name unselected; the WIG's default name is there to be overtyped. | `windows98.json` (`layout.fileDialog.saveName`) | 🔧 Fixed |
| 8.6 | LOW | The file dialogs' list drew a disclosure cell before each row and ran the selection across the whole row; Figure 8.6's list view has small icons and names, the name alone highlighted, the icon untouched. | `_Dialog.scss` (`.classicyFileOpenDialogWell`) | 🔧 Fixed |
| 8.7 | LOW | No pop-up menu for a secondary window (Move, Close; a palette's Close, Move, Size, Always On Top). Same mechanism as 6.2 and 7.10. | core ClassicyWindow | 🔧 Fixed (63ebc2f3f) |
| 8.8 | LOW | Dialogs and alerts centered on the desktop with `layout.window.centering` unset, so they sat on a half pixel when the free space is odd, which blurred every pixel-grid bevel and glyph; System 7 declares `"wholePixel"`. (Centering on the desktop rather than in the primary window is the Mac's and stays.) | `windows98.json` (`layout.window`) | 🔧 Fixed |
| 8.9 | LOW | No access keys in dialogs (ALT+letter, a bare letter outside text fields). Same as 7.1; ALT+letter is browser-reserved on some platforms. | core | 🔧 Fixed (ce8bde683) |
| 8.10 | LOW | The recommended maximum secondary-window size is 234 × 263 dialog base units, 415 × 452 px; the core's alert and input dialogs capped their width at 460 px (`--dialog-alert-max-width`, `--dialog-input-max-width`, the core `dialog` family). | `windows98.json` (`measurements.dialog`) | 🔧 Fixed |
| 8.11 | LOW | The Open and Save dialogs reset `currentPath` on every open rather than preserving the last directory for the session; the control panels do not reopen on their last tab. | core ClassicyFileDialog, control panels | 🔧 Fixed (d70d4c7aa) |

**Details & fixes**

- **8.1** 🔧 (`packages/appearance/windows98/src/styles/components/_Window.scss`):
  `.classicyWindow .classicyWindowTitleBarModal [data-classicy-control="collapse"]`
  and `.classicyWindow .classicyWindowTitleBarModal .classicyWindowIcon` are
  `display: none` (the core draws no zoom box on a modal bar); the title keeps
  `--title-bar-text-inset` 3 from the caption's left, where the icon stood.
  Product consequence recorded: under this package a dialog has no WindowShade
  box (the title's double-click still collapses it where the desktop preference
  is on). _WIG Ch.8 "Appearance and Behavior" (p.145), Figure 8.1._
- **8.2** 🔧 (`_Window.scss`): in `.classicyWindow.classicyWindowUtility
  .classicyWindowTitleBar`, `[data-classicy-control="zoom"]` and
  `[data-classicy-control="collapse"]` are `display: none`; the small
  `$maximize-small` and `$minimize-small` art is removed, `$close-small` (6 × 5
  at (3,3) on the 12 × 11 box) stays; the header comment records that a palette
  has no WindowShade box under this package. _WIG Ch.8 "Palette Windows" (p.163),
  Figure 8.15._
- **8.3** 🔧 (`_Window.scss`; core ClassicyWindow): `.classicyWindowContentsFramed
  { padding: 0; border: none; box-shadow: none }` (the frame draws nothing,
  active or not) and `.classicyWindow
  .classicyWindowContents.classicyWindowContentsWithFrame { padding: 0;
  box-shadow: none; background-color: var(--classicy-window-contents-bg,
  b.$face) }`, so the client area around it gives up its client edge and Window
  white for ButtonFace (a host's `--classicy-window-contents-bg` first, as the
  modal body takes it). The holder is known by `classicyWindowContentsWithFrame`,
  the class the core now sets on the contents holding a frame, beside
  `classicyWindowContentsWithHeader` (commit 01758bd05; "Core changes made in
  this pass" below), so the rule needs no `:has()` and holds in every browser of
  the floor. _WIG Ch.8 "Find and Replace Dialog Boxes" (p.158), Figure 8.8._
- **8.4, 8.5** 🔧 (`packages/appearance/windows98/src/windows98.json`,
  `src/ClassicyWindows98.test.ts`, `README.md`, `docs/AGENT-REFERENCE.md`):
  `layout.fileDialog: { frame: "movable", navigation: "flat", saveName:
  "selected" }`. `frame` is the default, stated (the Open and Save boxes are
  titled, movable dialogs, as Windows' are); `navigation: "flat"` shows one
  folder's contents at a time, a folder entered by opening it, the pop-up over
  the list running the path upward and then the volumes, as Look in / Save in
  do; `saveName: "selected"` makes the dialog manager select the default name on
  first focus ("include a default name in the File Name text box", p.157). The
  package test's exact `layout` expectation lists the block; the README's "Its
  layout" bullet and the agent reference's Windows 98 entry describe it. _WIG
  Ch.8 "Open Dialog Box" (pp.155–156), "Save As Dialog Box" (pp.156–157),
  Figures 8.6 and 8.7._
- **8.6** 🔧 (`_Dialog.scss`): in `.classicyFileOpenDialogWell` the
  `.classicyTreeNodeDisclosure` is `display: none` (under flat navigation every
  row is a small icon and a name, so the cell is empty; the tree view outside the
  well keeps its buttons, `_ListBox.scss`); the name alone takes the selection
  (`.selected .classicyTreeNodeLabel` HilightText on Hilight, a ring high and
  half an item gap wide around the text, `padding: b.$b var(--layout-item-gap-half)`),
  the icon untouched; the dotted focus rectangle sits on the name of the row
  that has the keyboard whenever the list has focus (`:focus`, a click's
  included), one ring inside, in HilightText over a selected name
  (`.classicyTreeNodeLabelHolder.selected:focus .classicyTreeNodeLabel {
  outline-color }`, the state class outside `:where()` so it outranks the focus
  rule); a disabled row's name GrayText. _WIG Ch.8 "Open Dialog Box" (pp.155–156),
  Figure 8.6 (which highlights "Letter to Nancy", not its icon)._
- ✅ "Interaction with Other Windows" (pp.145–146): `ClassicyWindow.scss`'s
  bands put the focused app's palettes at 350 and modals at 370 above its
  focused window (300) and every other app (20); `closeApp` closes an app's
  windows with it and a hidden app's container and modals are `display: none`
  (CLAUDE.md "Window Order & Focus Succession").
- ✅ "Default Buttons" (pp.147–148): `.classicyButton.default` is the raised
  bevel one ring inside a WindowFrame ring ("a bold outline that appears around
  the button"), pressed drawn flat; the core's dialogs make OK the default and
  a native `<button>` with focus takes ENTER itself, so the default follows the
  focus and returns.
- ✅ "Layout" (p.154), "Dialog Box Commands" (p.154): `_Dialog.scss`'s
  `button-row` orders the default button first, any other next and Cancel last
  by `order` on the vocabulary's `[data-classicy-role]` parts (the alert's) and
  the `default` state class (the input, keyboard and form rows), rows
  right-aligned (98.css's dialogs, the base's `justify-content: flex-end`); a
  dialog's items start `--layout-dialog-edge` 11 px in (7 dialog units in MS Sans
  Serif 8, the core's HIG inset by coincidence the same figure).
- ✅ "Command Buttons in Message Boxes" (pp.167–168): `_Alert.scss` (committed
  before this pass) sets label and message as one text in the UI font at one
  size and weight (MS Sans Serif 8 on 13-px lines), centers the button row as
  MessageBox does (Wine's `MSGBOX_OnInit`; Microsoft's own "On pop-up error
  messages, center command buttons"), orders [OK] [Cancel], [Yes] [No] [Cancel]
  through `button-row`, and places a Help button after Cancel at the row's right
  (`order: 40`, the base's auto margin removed); the windows' caption gradient
  covers the base's red alert caption, since Windows has no alert caption of its
  own.
- ✅ "Message Box Types" (pp.165–166): `ClassicyAlertType` is `"note" |
  "caution" | "stop"`, Table 8.1's Information, Warning and Critical, selecting
  the icon and the generated default buttons; the symbols are Platinum's art
  (by design).
- ✅ "Color Dialog Box" (pp.162–163): the picker's swatches are sunken two-ring
  wells with the dotted focus rectangle inside the rings (`_AppearanceManager.scss`
  `.classicyColorPickerSwatch`), the Packages tab's 16-px swatches one-ring
  wells, and the wheel fields' labels (Red, Green, Blue and the rest) plain
  (13.2).
- **8.7** ⚠️ core: the window pop-up menu of 6.2/7.10, with Move and Close alone
  for modal and utility windows (a sizable palette adding Size). _WIG Ch.8
  "Appearance and Behavior" (p.145), "Palette Windows" (p.164), Figure 8.16._
- **8.8** 🔧 (`packages/appearance/windows98/src/windows98.json`,
  `src/ClassicyWindows98.test.ts`, `README.md`, `docs/AGENT-REFERENCE.md`;
  a2c1d339d): `layout.window.centering: "wholePixel"` beside `growBoxCorner`
  (the core's `resolvePosition` then rounds a `"center"` axis to a whole pixel,
  as System 7's layout asks), with the package test's exact `layout`
  expectation, the README's layout bullet and the agent reference's layout
  table (which names Windows 98 beside System 7 for `wholePixel`) updated.
  Found while writing this document, after the Ch.8 fix group had closed, and
  applied in the package pass. _WIG Ch.8 "Window Placement" (p.147); Ch.13
  "Design of Graphic Images" (p.313): pixel art must land on the grid._
- **8.9** ⚠️ core hook: 7.1's `accessKey` on menu items extended to control
  labels (`ClassicyControlLabel` underlining one character and, on ALT+letter
  where the browser lets it through, focusing its control). _WIG Ch.8
  "Navigation in Secondary Windows" (pp.148–149)._
- **8.10** 🔧 (`windows98.json`, `src/ClassicyWindows98.test.ts`, `README.md`,
  `docs/AGENT-REFERENCE.md`; a2c1d339d): the core's `dialog` family is a
  structural knob family every package may set (as `menu.popUpMaxHeight` was set
  in 7.20); `measurements.dialog: { alertMaxWidth: 415, inputMaxWidth: 415 }`
  (the keys as `src/Appearance/ClassicyCoreTheme.ts` names them) in `defaults`
  and all 18 presets caps the alert and input dialogs at the WIG's width while
  the family's other keys stay the core floor's (`--dialog-alert-min-width` 280,
  `--dialog-keyboard-equivalent-max-width` 420); the package test pins the
  values in every theme and the emitted variables; the 452-px height is not
  exceeded by any bundled dialog. _WIG Ch.13 "Font and Size" (p.311)._
- **8.11** ⚠️ core: ClassicyFileDialog keeps the last `currentPath` (and
  volume) per app for the session instead of `setCurrentPath([])` on open, and
  the control panels remember their last tab in session state. _WIG Ch.8
  "Interaction with Other Windows" (p.146), "Common Dialog Box Interfaces"
  (p.155)._

---

## Chapter 9 — Window Management; Chapter 10 — Integrating with the System

Pages read: Ch.9, PDF 177–189 (its opener prints 175, so printed page = PDF − 2:
pp.175–187; p.188 is the blank verso); Ch.10, PDF 190–215 (its opener prints
189, so printed page = PDF − 1: pp.189–214), and PDF 216–222 to place Ch.11's
opener. The running heads carry the placeholders 187 (Ch.9) and 203 (Ch.10).
Figures read as images: 9.1–9.6 (PDF 178–187; Figure 9.6's windows and taskbar
again at 300 dpi), 10.1 (PDF 194), 10.2 and 10.3 (PDF 212–213, at 300 dpi) and,
for comparison, Figure 3.1 (PDF 31). The pre-release's contents run ahead of the
openers' folios, Ch.9's second half by one page (Display Layout 188 against the
derived 187) and Ch.10 by up to four (Taskbar Integration 214 against 211,
Modeless Interaction 218 against 214); citations use the derived numbers. Ch.9
is window models: the single document window interface Classicy follows (✅) and
MDI, workspaces, workbooks and projects (➖: optional models with no Classicy
container). Ch.10 is the registry and file types (mostly ➖, with their Classicy
analogues judged), naming, the taskbar's window buttons and status area (the
shell's), the Recycle Bin, the Control Panel and modeless interaction.

Two earlier rows are contradicted here and must change: Ch.3 "The Status Area"
(p.16) marks the pre-shell bar ✅ with the tray icons outside the clock's sunken
pane, which Figure 10.2 puts inside it (10.14); Ch.8 "Modeless vs. Modal"
(p.147) is ✅, but every Classicy modal blocks the whole desktop, system-modal in
effect (10.21). Where the WIG asks for more than plan 0020-w98 covers, the
requirement says so: message notification (10.19, out of the plan's scope),
What's This? on every tray menu and a menu for Sound (10.16), an opt-out for
non-modal secondary windows' task buttons (10.11), button 1 on a menu-only
module (10.15) and a default item for the tray's double-click (10.17).

Normative checklist (WIG Ch.9 and Ch.10) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| Ch.9 "Single Document Window Interface" (p.175) | Opening a primary window puts it at the top of the Z order. | core `ClassicyWindowOpen`, `focusWindow` (`ClassicyAppHelpers.ts`) | ✅ |
| Ch.9 "Single Document Window Interface" (p.175); Ch.10 "Taskbar Window Buttons" (p.211); Figure 9.6 (p.185) | Opening a primary window places its entry in the taskbar, one button per window. | `_MenuBar.scss` `.classicyDesktopMenuAppSwitcher` (one button, the front application's) | 🔧 see 9.1 (shell) |
| Ch.9 "Single Document Window Interface" (p.175) | Single instance: reopening an object activates its existing window. | apps ✅ (`ClassicyAppOpen`), folders ✅ (`openFolder`); documents: the kernel's generic OpenFile branch | 🔧 see 9.2 (= 5.24) |
| Ch.9 "Single Document Window Interface" (p.176) | An object with no primary window has Properties as its default and an adequate menu. | Extension entries in System Folder:Extensions and Control Strip Modules; FinderContext's Extension branch (an alert) | 🔧 see 9.3 |
| Ch.9 "Multiple Document Interface" (pp.176–177), Figure 9.1 | A parent window contains its children, sharing its menu bar. | none (every window is desktop-level; MDI is optional) | ➖ |
| Ch.9 "Opening and Closing MDI Windows" (p.178) | Parent then child; closing the parent closes the children. | none | ➖ |
| Ch.9 "Moving and Sizing MDI Windows" (pp.178–179), Figure 9.2 | Children clipped to and minimized within the parent. | none (Minimize is the shell's, 1.8) | ➖ |
| Ch.9 "Moving and Sizing MDI Windows" (pp.179–180), Figure 9.3 | A maximized child merges into the parent's menu bar. | none (maximize is the shell's `window.zoom`) | ➖ |
| Ch.9 "Switching Between MDI Child Windows" (p.180) | CTRL+F6, CTRL+TAB; a Window menu with Tile and Cascade. | none (plan 0020-w98 excludes Cascade and Tile, which the WIG asks only of MDI) | ➖ |
| Ch.9 "Workspaces" (pp.181–183), Figure 9.4 | A workspace's icons and children, its Window menu. | none (no workspace container; p.181: no system construct) | ➖ |
| Ch.9 "Workbooks" (pp.183–184), Figure 9.5 | Views as tabbed sections of one window. | none (the Appearance Manager's tabs are one object's pages) | ➖ |
| Ch.9 "Projects" (pp.184–185), Figure 9.6 | A project's children are desktop peers with their own buttons and bars. | none (no project container; the look is 9.1 and 9.4) | ➖ |
| Ch.9 "Presentation of Object or Task" (p.186) | Documents get a primary window; simple objects menus and a property sheet. | document apps' resizable windows; control panels fixed (`resizable={false}`, drawn with `classicyWindowNoResize`) | ✅ |
| Ch.9 "Display Layout" (p.187); Figure 9.6 (p.185) | Shared elements make clear what they apply to; nothing crowds the work area at VGA; each window its own bar, an inactive one drawn as an active one. | one screen menu bar shared by every app (`_MenuBar.scss`) | ⚠️ see 9.4 (shell) |
| Ch.9 "Display Layout" (p.187) | Let users choose which components show; basic functions stay reachable. | the Control Strip and its modules hideable; Finder's list columns; Balloon Help's toggle | ✅ |
| Ch.10 "The Registry" (p.189) | Registry key syntax, value size, creation functions. | none (no registry; the analogues below) | ➖ |
| Ch.10 "Registering Application State Information" (pp.189–190) | Save state when the primary window closes; restore a reopened window. | the store's persistence (`classicyDesktopState`); window records | ✅ |
| Ch.10 "Registering Application State Information" (pp.190–192) | Optionally restore state at startup; always save at shutdown; Run and RunOnce. | the store and Finder's `openPaths` come back on reload (Run keys ➖) | ✅ |
| Ch.10 "Registering Application Path Information" (p.192) | App Paths and SharedDLLs. | none (apps are bundled modules) | ➖ |
| Ch.10 "Registering File Extensions" (p.192) | Register every user-visible type; an unregistered type has Open With as its default. | the kernel's `fileTypeHandlers` (all default to Finder.app), FinderContext's last branches (a path-only window, or an alert) | 🔧 see 10.1 |
| Ch.10 "The Filename Extension Key" (p.193), Table 10.1 (pp.194–197) | Unique type ids; never overwrite another application's entry or a system extension. | `ClassicyAppRegisterFileTypes` (the first claim wins), `ClassicyAppSetDefaultFileTypeHandler` | ✅ |
| Ch.10 "The Application Identifier Key" (pp.197–198) | Every type has a title-case name of at most 40 characters, its data-type part at most 15. | `fileTypeDisplayName` (`ClassicyFileBrowserUtils.ts`: "Text file", "Pdf", "Directory") | 🔧 see 10.2 |
| Ch.10 "The Application Identifier Key" (pp.198–199) | Short names in menus; controls allow 40 and 15 characters. | the Save dialog's Format pop-up ("Plain Text", "HyperCard Stack"); the Kind column (150 px, resizable) | ✅ |
| Ch.10 "Supporting Creation" (pp.199–200) | Registered types appear on the folders' and the desktop's New command. | core Finder, ClassicyDesktop (no New) | 🔧 see 10.3 (extends 5.40) |
| Ch.10 "Registering Icons" (p.200); Figure 10.1 (p.193) | An icon per data type; an unregistered type's derived from its application's, else the generic. | `iconImageByType` (one `system.files.file` key for every non-directory) | 🔧 see 10.4 |
| Ch.10 "Registering Icons" (p.200); Figure 10.1 (p.193) | Icons at 16, 32 and 48 px; the generic document a dog-eared page. | the package (no icons; Platinum's pictures) | 🔧 see 10.5 |
| Ch.10 "Registering Commands" (pp.200–201) | The container supplies the transfer commands, the type its verbs at the top, the first the default (bold). | Finder `itemContextMenu` (Move To Trash or Restore; only the Trash's has Open, `isDefault`) | 🔧 see 10.6 |
| Ch.10 "Enabling Printing" (pp.201–202) | Print and Print To verbs and feedback. | none (no printing) | ➖ |
| Ch.10 "Registering OLE" (p.202) | OLE classes under CLSID. | none (no OLE) | ➖ |
| Ch.10 "Registering Shell Extensions" (pp.202–203) | Shell extension handlers. | none (no handler registry; per-instance icons are an entry's `_icon`) | ➖ |
| Ch.10 "Supporting the Quick View Command" (pp.203–204) | File viewers for Quick View. | none | ➖ |
| Ch.10 "Registering Sound Events" (p.204) | User-assignable events with readable names. | the Windows 98 pack's alerts (Chimes, Chord, Ding, Exclamation); the Sound tab | ✅ |
| Ch.10 "Installation" (pp.204–208) | Program Files layout, setup, uninstall, network installs. | none (the host registers apps at build time) | ➖ |
| Ch.10 "Making Your Application Accessible" (p.206) | One shortcut per application in Start Menu\Programs, no folder hierarchy. | the coming Start menu | 🔧 see 10.7 (shell) |
| Ch.10 "Installing Fonts" (p.208) | Check for an installed font and rename yours. | `windows98.json` typography (no faces registered; a registered face is named apart from MS Sans Serif) | ➖ |
| Ch.10 "Supporting Auto Play" (pp.208–209) | Autorun on removable media. | none | ➖ |
| Ch.10 "System Naming Conventions" (p.210) | Show the long filename in full. | desktop labels (`width: fit-content`), both views (names verbatim) | ✅ |
| Ch.10 "System Naming Conventions" (p.210) | Hide a registered type's extension unless the user shows them. | every surface shows the stored name ("Read Me.txt", "BuckBunny.mov") | 🔧 see 10.8 |
| Ch.10 "System Naming Conventions" (p.210), Table 10.1 | No extensions for variants of a type; a Windows extension only where the file fits it. | `DefaultClassicyFileSystem.ts` | ✅ |
| Ch.10 "System Naming Conventions" (p.210) | A long filename holds any character but `\ / : * ? < > \|`. | `ClassicyFileDialog.tsx` `canSave`, `handleCreateFolder`, the New Folder prompt (refuse `:` only) | 🔧 see 10.9 |
| Ch.10 "System Naming Conventions" (p.210) | A system-supplied name is the type name, numbered with the first free ordinal when taken. | the Trash's and derived folders' numbering ✅; the New Folder prompt (empty, refuses a taken name) | 🔧 see 10.10 |
| Ch.10 "System Naming Conventions" (p.210) | "Copy of X", "Shortcut to X". | none (no copy or shortcut command yet; 5.28 names copies so) | ➖ |
| Ch.10 "System Naming Conventions" (pp.210–211) | UNC paths, MS-DOS aliases, abbreviated paths. | none (no network volumes or aliases; no full path shown) | ➖ |
| Ch.10 "Taskbar Window Buttons" (p.211); Ch.8 "Appearance and Behavior" (p.145) | A button appears with a primary window and goes with it; no button for windowless apps or secondary windows. | the coming task buttons (plan §2 "Which windows") | ⚠️ see 10.11 (shell) |
| Ch.10 "Taskbar Window Buttons" (p.211) | Dragging over a task button restores its window for the drop. | the coming task buttons | ⚠️ see 10.12 (shell; = 5.45) |
| Ch.10 "Status Notification" (p.211) | Only global or monitored information in the taskbar, as a graphic. | the coming tray; `ClassicyMenuBarExtension` (`icon?`) | ⚠️ see 10.13 (shell) |
| Ch.10 "Status Notification" (p.211), Figure 10.2 | The status area is one sunken pane holding the icons, then the clock. | `_MenuBar.scss` (the icons outside the clock's pane) | 🔧 see 10.14 (shell) |
| Ch.10 "Status Notification" (p.211) | Button 1 opens a pop-up window near the indicator, dismissed by a click elsewhere. | `ClassicySoundControlStripModule.tsx` `content`; the coming tray | 🔧 see 10.15 (shell) |
| Ch.10 "Status Notification" (pp.211–212) | Button 2 shows a menu with the related windows' commands and What's This?. | `classicyControlStripOpenControlPanelItem`; Sound (no menu) | ⚠️ see 10.16 (shell) |
| Ch.10 "Status Notification" (p.212) | A double-click runs the menu's default command. | `classicyControlStripOpenControlPanelItem` (no `isDefault`) | ⚠️ see 10.17 (shell) |
| Ch.10 "Status Notification" (p.212) | Each indicator has a tooltip naming it, with a value. | the Control Strip's cells (none, 7.28) | ⚠️ see 10.18 (shell) |
| Ch.10 "Message Notification" (p.212), Figure 10.3 | An inactive application flashes its task button three times, then leaves it highlighted. | none (no attention signal) | 🔧 see 10.19 (shell) |
| Ch.10 "Message Notification" (p.212) | A system-modal message flushes the input queue. | `useKeyboardEquivalents.ts` (`e.repeat` never checked) | 🔧 see 10.20 |
| Ch.10 "Message Notification" (p.212); "Modeless Interaction" (p.214) | System-modal messages only for system integrity and data; an application's dialog blocks only its owner. | ClassicyWindow's modal scrim (`.classicyWindowModalScrim`, the whole desktop) | ⚠️ see 10.21 |
| Ch.10 "Recycle Bin Integration" (p.212) | Deleted files go to the Recycle Bin. | `trashClassicyFileSystemItems`, `moveClassicyItemsToTrash`; only Empty Trash removes | ✅ |
| Ch.10 "Recycle Bin Integration" (p.212) | The repository is named the Recycle Bin. | the Trash desktop icon and window | 🔧 see 10.22 (= 1.15) |
| Ch.10 "Control Panel Integration", "Adding Control Panel Objects" (p.212) | Control Panel objects, mostly a single secondary window. | the control panels (one fixed window each) | ✅ |
| Ch.10 "Adding Control Panel Objects" (p.212) | A Control Panel object represents a concrete object. | `APP_NAME`s ("Appearance Manager", "Sound Manager", "Date and Time Manager", "Control Strip"); the package declares no `apps` | 🔧 see 10.23 |
| Ch.10 "Adding to the Passwords Object" (p.213) | Register password services. | none | ➖ |
| Ch.10 "Plug and Play Support" (p.213) | Resize windows and toolbars when the screen size changes. | `clampWindowPositionToViewport` (read at render, no resize subscription); menus re-place ✅ | ⚠️ see 10.24 (shell) |
| Ch.10 "Plug and Play Support" (p.213) | Power, dock and media events. | none (sync adapters degrade to local-wins) | ➖ |
| Ch.10 "System Settings and Notification" (pp.213–214) | Match the system metrics and settings; adjust when they change. | every metric and color a theme variable (`getThemeVars`, the gates); `readClassicyThemeVar`; reduced motion honored (forced colors is 14.3) | ✅ |
| Ch.10 "Modeless Interaction" (p.214) | Long processes in the background, the foreground interactive. | `PDFViewerDocument` lazy load, Finder's "Calculating…", the adapters | ✅ |

### Findings — Chapters 9 and 10

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 9.1 | HIGH | No window has a taskbar entry of its own: the bar draws one button, the front application's. Same requirement as 1.7, with Figure 9.6's layout. | `_MenuBar.scss`; the coming ClassicyTaskbar | 🔧 Fixed (11d0b9502, f21282e6c) |
| 9.2 | LOW | Reopening an open document from Finder runs `openApp`, which raises the app's last-focused window, not the document's. Same as 5.24. | the kernel's generic OpenFile branch; `PDFViewerContext.tsx`, `PictureViewerContext.tsx` | 🔧 Fixed (3ee697577) |
| 9.3 | LOW | An extension file, which has no primary window, opens an alert on double-click, and its menu holds only Move To Trash: no Properties, no default. | `ClassicyFileSystemExtensions.ts`, `ClassicyFileSystemControlStripModules.ts`, FinderContext, Finder | 🔧 Fixed (c1ab2bf24) |
| 9.4 | MEDIUM | Every application and window shares one bar; only the pressed switcher names what it applies to. Extends 1.6 with Figure 9.6. | ClassicyDesktopMenuBar; `_MenuBar.scss` | ⚠️ Deferred (shell addendum B12, not implemented) |
| 10.1 | LOW | A type no app claims opens a path-only window or the alert "Finder cannot open the file type you requested."; neither offers Open With. | the kernel's `fileTypeHandlers`, FinderContext, ClassicyApp's plain file window | 🔧 Fixed (57ae34974) |
| 10.2 | LOW | Type names are the type id capitalized: sentence case ("Text file"), "Pdf" miscapitalized, "Directory" where Windows says "File Folder". | `fileTypeDisplayName` | 🔧 Fixed (57ae34974) |
| 10.3 | LOW | Neither a folder window nor the desktop has a New command for the registered types. Extends 5.40. | core Finder, ClassicyDesktop | 🔧 Fixed (c1ab2bf24) |
| 10.4 | LOW | Every non-directory entry without its own `_icon` draws one key, so a registered type (a SimpleText `text_file`) looks exactly like an unregistered file. | `iconImageByType` | 🔧 Fixed (41de137d5) |
| 10.5 | LOW | The package registers no icons, so every file and app icon under Windows 98 is Platinum's Mac picture. | the package | 🔧 Fixed (104ebd968) |
| 10.6 | LOW | A file's or folder's menu holds only Move To Trash (or Restore): no Open, no default item, no verbs, though a double-click opens. | Finder `itemContextMenu`, the desktop items' menus | 🔧 Fixed (3a69b2ed0) |
| 10.7 | MEDIUM | No Start menu; apps are reached from the desktop, the Apple menu and the Applications folder. | the coming Start menu | 🔧 Fixed (22ca9cc74) |
| 10.8 | LOW | Names carry their extensions on every surface, registered type or not. | the two views, desktop item labels, Finder's window title | 🔧 Fixed (57ae34974) |
| 10.9 | LOW | Only `:` is refused in a name, so `a*b`, `x?y` or `c\|d` save under Windows 98. | `ClassicyFileDialog.tsx` | 🔧 Fixed (c1ab2bf24) |
| 10.10 | LOW | The New Folder prompt supplies no name (an empty field under an "untitled folder" placeholder) and refuses a taken name instead of numbering it. | `ClassicyFileDialog.tsx` | 🔧 Fixed (c1ab2bf24) |
| 10.11 | HIGH | No per-window task buttons yet; the plan would give buttons to non-modal secondary windows (Finder Preferences, About This Computer) that Windows 98 gives none. | the coming task buttons; `FinderPreferences.tsx` | ⚠️ Deferred (shell addendum B13, not implemented) |
| 10.12 | LOW | No taskbar yet to take a drag. Same requirement as 5.45. | the coming task buttons | ⚠️ Deferred (shell addendum B15, not implemented) |
| 10.13 | LOW | A menu bar extension may have a title and no icon, which would put text in the tray. | `ClassicyMenuBarExtension`; the coming tray | ⚠️ Deferred (shell addendum B16, not implemented) |
| 10.14 | LOW | The pre-shell bar draws the extensions and Sound as flat icons outside the clock's sunken pane; Figure 10.2 puts them inside it. Corrects the Ch.3 "The Status Area" row. | `_MenuBar.scss`; the coming `_Taskbar.scss` | 🔧 Fixed (f21282e6c) |
| 10.15 | LOW | The plan opens a menu-only module's `menuItems` on button 1, where the text says to show nothing. | the coming tray | 🔧 Fixed (b86689686) |
| 10.16 | LOW | Screen Saver and Appearance menus have "Open … Control Panel" but no What's This?; Sound has no menu at all. | `ClassicyControlStripRegistry.ts`, `ClassicySoundControlStripModule.tsx` | ⚠️ Deferred (shell addendum B3, not implemented) |
| 10.17 | LOW | No module menu item is a default, so the plan's double-click has nothing to run. | `classicyControlStripOpenControlPanelItem`; the coming tray | ⚠️ Deferred (shell addendum B3, not implemented) |
| 10.18 | LOW | No tray yet; the Control Strip's cells carry no tooltip (7.28). | the coming tray | 🔧 Fixed in part (b86689686); ⚠️ addendum B3 |
| 10.19 | LOW | Classicy has no attention signal: an inactive app can only open a modal, which takes the desktop (10.21). | the coming task buttons; core | 🔧 Fixed (ca8fbeb6d) |
| 10.20 | LOW | `onDefault` runs on any Enter keydown, auto-repeat included, so an Enter held from the action that raised an alert dismisses it the moment it mounts. | core `useKeyboardEquivalents.ts` | 🔧 Fixed (7bc33b74f) |
| 10.21 | MEDIUM | Every modal renders a scrim over the whole desktop: any app's dialog, a Save dialog included, blocks every other app, the desktop and (per the plan) the taskbar, system-modal in effect. Corrects the Ch.8 "Modeless vs. Modal" row. | core ClassicyWindow (`.classicyWindowModalScrim`) | ⚠️ Deferred (shell addendum B18, not implemented) |
| 10.22 | MEDIUM | The desktop shows "Trash" and the package cannot rename it. Same as 1.15. | core ClassicyDesktopIcon, the Trash window, the Empty item | 🔧 Fixed (41de137d5) |
| 10.23 | LOW | Under Windows 98 the panels are titled as managers and a Mac part ("Appearance Manager", "Sound Manager", "Date and Time Manager", "Control Strip"), where Windows 98 names the objects (Display, Sounds, Date/Time, Taskbar). | `packages/appearance/windows98/src/index.ts` | 🔧 Fixed (104ebd968) |
| 10.24 | LOW | A window's viewport clamp reads `window.innerWidth` and `innerHeight` at render with no resize subscription, so after a browser resize a window stays where it was until it re-renders. | `clampWindowPositionToViewport` (`ClassicyWindow.tsx` l.246) | ⚠️ Deferred (shell addendum B14, not implemented) |

**Details & fixes**

- **9.1** ⚠️ the Windows shell (plan 0020-w98, §2 "Task buttons", §7
  `_Taskbar.scss`): requirements (1.7's, with Figure 9.6). Each open primary
  window gets a task button (windows neither modal nor utility, apps open),
  appended in creation order; activating or minimizing a window moves no button;
  the active window's button is pressed over the ButtonHilight/ButtonFace
  checker, the others raised; the 16-px window icon, then the title, cut with an
  ellipsis, a cut title showing the full one as a tooltip. Figure 9.6 draws
  Sample Project raised and the active Templates pressed over the checker. _WIG
  Ch.9 "Single Document Window Interface" (p.175); Ch.10 "Taskbar Window
  Buttons" (p.211); Figure 9.6 (p.185)._
- **9.2** ⚠️ core layout flag: same as 5.24 (`layout.document.reopenActivates`),
  which also covers the PDF Viewer's and Picture Viewer's OpenFile cases (each
  `focusWindow`s its own window key). _WIG Ch.9 "Single Document Window
  Interface" (p.175)._
- **9.3** ⚠️ core layout flag (1.21's `layout.finder.commands: "windows"`): an
  Extension entry's menu leads with Properties, `isDefault: true` (drawn bold by
  `_Menu.scss` `.classicyMenuItem.default > p`), which dispatches
  `ClassicyAppOpen` for the entry's control panel (ScreenSaver.app to
  ScreenSaverManager.app, a Control Strip module to ControlStripManager.app,
  otherwise `_creator`'s panel), and FinderContext's Extension branch (~l.364)
  runs that command on a double-click instead of "This file adds functionality
  to your computer. It cannot be opened.". The Screen Saver extension itself
  complies, controlled from its Control Strip menu and its panel. _WIG Ch.9
  "Single Document Window Interface" (p.176)._
- **9.4** ⚠️ the Windows shell (plan 0020-w98, §4, §7): requirements (extends
  1.6). Under the taskbar no screen bar is drawn (the plan's refinement 1); each
  window with an `appMenu` has its own bar holding only that window's menus,
  Help merged last; an inactive window's bar is drawn as an active one's (Figure
  9.6: ButtonText titles, access keys underlined, no dimming, no hover band);
  the bar is 20 px and the taskbar band only its own 28 px (`--taskbar-height`),
  so a maximized window has 452 px of work area at 640 × 480; no other chrome is
  added. _WIG Ch.9 "Display Layout" (p.187); Figure 9.6 (p.185)._
- ✅ Ch.10 "Registering Application State Information" (pp.189–192): state is
  written on every change; window records (position, size, collapsed, zoomed)
  restore a reopened window at its rect; a reload is the restart, and open apps,
  their windows and Finder's `openPaths` come back as saved. Under the shell the
  minimized and maximized state persists through `collapsed`, `zoomed` and
  `restoreRect` (plan §5).
- **10.1** ⚠️ core layout flag: `layout.files?: { unregisteredOpen?: "default" |
  "openWith", … }` (`"openWith"` in `windows98.json`), the group for the file
  naming and display rules below. Under it a file whose type has no handler but
  Finder.app sets `Desktop.systemDialog = { dialog: "openWith", path }`, and
  ClassicyDesktop renders a new ClassicyOpenWithDialog: the apps whose manifests
  declare `<prefix>OpenFile` or handle any type, an "Always use this program to
  open this type of file" check box dispatching
  `ClassicyAppSetDefaultFileTypeHandler`, OK routing through
  `routeClassicyAppOpenFile` under the open's trust, and Cancel. Platinum and
  System 7 keep today's paths. _WIG Ch.10 "Registering File Extensions"
  (p.192)._
- **10.2** ⚠️ core optional field: `fileTypeNames?:
  Partial<Record<ClassicyFileSystemEntryFileType, string>>` on
  ClassicyAppearancePackageSchema, title-case names of 1–40 characters validated
  like `apps` display names; `fileTypeDisplayName(type, packageId)` reads the
  active package's for the Kind column (and 2.2's Type), else today's text, so
  Platinum and System 7 are unchanged. The package declares, from Table 10.1 and
  Windows 98 as shipped, each 15 characters or fewer: directory "File Folder",
  drive "Local Disk", text_file "Text Document", video "Video Clip",
  app_shortcut "Application", shortcut "Internet Shortcut", stack "HyperCard
  Stack", pdf "PDF Document". "Pdf" is wrong under every package; a core default
  fix would change the Mac packages' Kind column and needs its own HIGOS8 check.
  _WIG Ch.10 "The Application Identifier Key" (pp.197–198)._
- **10.3** ⚠️ core layout flag (1.21's `layout.finder.commands: "windows"`;
  extends 5.40): an additive `registerApp` manifest field `creates?: { fileType,
  typeName, extension?, data? }[]`, the ShellNew entry; the New ▸ submenu lists
  Folder, a separator, then each registered `typeName`, each creating "New <Type
  Name>" named per 10.10 and starting its label's edit. _WIG Ch.10 "Supporting
  Creation" (pp.199–200)._
- **10.4** ⚠️ core icon key family (additive): `iconImageByType(type,
  packageId)` first resolves `system.files.byType.<type>`, a new optional key
  family in the icon tree, through `resolveClassicyAsset` (the active package,
  then the default), then falls back to `system.files.file`. Platinum and System
  7 register no `byType` keys and draw as today; the handler-derived icon the
  WIG describes is then the package's art for that key (10.5). _WIG Ch.10
  "Registering Icons" (p.200); Figure 10.1 (p.193)._
- **10.5** ⚠️ package art (lane 3; 1.14): in the art lane's
  `registerClassicyIcons` call under `"windows98"`, original pixel art:
  `system.files.file` a dog-eared white page (Figure 10.1's generic document
  without its logo) and `system.files.byType.{text_file, image, video, audio,
  pdf, stack, markdown}` the page bearing the handler app's 16-px mark, each
  leaf with its 32-px image and its own 16-px small image, which
  `ClassicyIconImage.internal.tsx` picks at or below the small-icon size (48 px
  has no Classicy surface). The art rule forbids copying Figure 10.1's logo
  page, not drawing an original one. _WIG Ch.10 "Registering Icons" (p.200);
  Figure 10.1 (p.193)._
- **10.6** ⚠️ core layout flag (1.21's `layout.finder.commands: "windows"`):
  `itemContextMenu` and the desktop items' menus lead with (1) Open, `isDefault:
  true`, running the double-click's command (5.23), (2) the handler app's verbs
  when its manifest declares any (a new additive `registerApp` field `verbs?: {
  id, title, action }[]`), (3) a separator, (4) 7.11's container commands:
  Create Shortcut, Delete (5.39), Rename, Properties last (2.2). Access keys are
  4.11. _WIG Ch.10 "Registering Commands" (pp.200–201)._
- **10.7** ⚠️ the Windows shell (plan 0020-w98, §3 item 3): requirement. Start ▸
  Programs ▸ is a flat list, one item per app the derived Applications folder
  lists (`showInApplicationsFolder` true, app mounted), sorted by display name,
  each with its display name and 16-px icon; no per-app folder submenus; a host
  keeps helper apps out with `showInApplicationsFolder={false}`; an empty list
  shows a disabled "(Empty)". _WIG Ch.10 "Making Your Application Accessible"
  (p.206)._
- **10.8** ⚠️ core layout flag: `layout.files.extensions?: "shown" |
  "hideRegistered"` (default `"shown"`; `"hideRegistered"` in `windows98.json`).
  A store-free `classicyDisplayFileName(name, entry, packageId)` drops the final
  ".ext" when the entry is not a directory and its `_type` has a handler other
  than Finder.app; the two views, the desktop item labels and Finder's window
  title use it; a rename edits the shown stem and keeps the extension (the Save
  dialog already re-appends its format's); under the flag Finder Preferences
  adds a "Hide file extensions for known file types" check box (Windows 98's
  Folder Options). _WIG Ch.10 "System Naming Conventions" (p.210)._
- **10.9** ⚠️ core layout flag: `layout.files.names?: "mac" | "windows"`
  (default `"mac"`; `"windows"` in `windows98.json`). A store-free
  `isClassicyValidFileName(name, packageId?)` refuses `\ / : * ? " < > |` under
  `"windows"` (Windows 98 as shipped also refused the quotation mark);
  `canSave`, `handleCreateFolder` and the New Folder prompt's `validate` use it,
  and the dialog explains with Windows 98's text: "A filename cannot contain any
  of the following characters:" and the characters. _WIG Ch.10 "System Naming
  Conventions" (p.210)._
- **10.10** ⚠️ core layout flag (10.9's `"windows"`): the prompt's
  `initialValue` is the first free of "New Folder", "New Folder (2)", "New
  Folder (3)"… in the selected folder, selected, as Windows 98 as shipped names
  it (its parentheses win over the text's "Document 2"); 5.40's and 10.3's New
  use the same helper. The Trash (`freeTrashName`) and the derived folders
  (`classicyFreeDerivedEntryName`) already number a clash with the first free
  ordinal. _WIG Ch.10 "System Naming Conventions" (p.210)._
- ✅ Ch.10 "The Application Identifier Key" (pp.198–199): the Format pop-up lists
  short names ("Plain Text", "HyperCard Stack", each 15 characters or fewer),
  and the Kind column takes `@tanstack/react-table`'s 150-px default, resizable,
  holding more than 15 average characters of the 11-px UI font.
- **10.11** ⚠️ the Windows shell (plan 0020-w98, §2 "Which windows"):
  requirements. A button appears when a primary window opens and goes when it
  closes; a minimized window keeps its button; a windowless extension app
  (ScreenSaver.app) gets none, nor Finder with no folder window (the desktop);
  additive, an optional ClassicyWindow prop `taskbarButton?: boolean`, read only
  by the taskbar and defaulting to true for non-modal, non-utility windows,
  which Finder Preferences (`FinderPreferences.tsx` `modal={false}`) and About
  This Computer pass as false, so secondary windows get no button. _WIG Ch.10
  "Taskbar Window Buttons" (p.211); Ch.8 "Appearance and Behavior" (p.145)._
- **10.12** ⚠️ the Windows shell (plan 0020-w98, §2 "Drops"): same requirement
  as 5.45; Windows 98 as shipped answered a release on a button with the message
  box "You cannot drop an item onto a button on the Taskbar. However, if you
  drag the item over a button without releasing the mouse button, the window
  will open after a moment, allowing you to drop the item inside the window.",
  optional (the plan drops silently). _WIG Ch.10 "Taskbar Window Buttons"
  (p.211)._
- **10.13** ⚠️ the Windows shell (plan 0020-w98, §2 "The tray"): requirements.
  The tray holds only Control Strip modules and menu bar extensions, each a 16 ×
  16 graphic (`iconSmall`); an extension with no icon draws a generic 16-px
  glyph from the package with its title as the tooltip, never text in the tray;
  per-window information never goes there. _WIG Ch.10 "Status Notification"
  (p.211)._
- **10.14** ⚠️ the Windows shell (plan 0020-w98, §7): requirement.
  `_Taskbar.scss` `.classicyTaskbarTray` is the one-ring sunken pane
  (ButtonShadow top and left, ButtonHilight bottom and right), 22 px tall and 2
  px from the bar's right, around the icons (16 px at a 20-px pitch, 3 px in)
  and then the clock (5 px each side), as the plan specifies; the pre-shell
  bar's rules go with it, and the Ch.3 "The Status Area" row's ✅ becomes this
  requirement. _WIG Ch.10 "Status Notification" (p.211), Figure 10.2._
- **10.15** ⚠️ the Windows shell (plan 0020-w98, §2 "Clicks on a module"):
  requirements. A module's `content` opens above its icon in the bevel popup
  portal and closes on an outside press, Escape or a choice (Sound's
  ClassicyPopUpSlider fits, as Windows' volume control does); a menu-only module
  (Screen Saver, Appearance) shows nothing on button 1, per the text, or, if the
  plan keeps its button-1 menu (as Windows 98's PC Card and Unplug icons had),
  it is recorded as the OS-as-shipped choice. _WIG Ch.10 "Status Notification"
  (p.211)._
- **10.16** ⚠️ the Windows shell (plan 0020-w98, §2; not in the plan):
  requirements. Every tray icon's button-2 menu ends with What's This?, which
  shows the module's purpose in a forced balloon at the icon (Balloon Help is
  Classicy's context help, so the old "no Windows help system" adaptation does
  not cover it). Optional registry fields `panel?: { id, name, icon }` and
  `description?: string` on `registerClassicyControlStripModule`, read only by
  the tray, build Sound's menu: "Open Sound Control Panel" (SoundManager.app), a
  separator, What's This?. The Control Strip under Platinum and System 7 reads
  neither field. _WIG Ch.10 "Status Notification" (pp.211–212)._
- **10.17** ⚠️ the Windows shell (plan 0020-w98, §2): requirement. A tray
  double-click runs the module's default command, opening its control panel as
  Windows 98's volume icon opens Volume Control; the tray, when it builds a
  module's menu, marks the item `classicyControlStripOpenControlPanelItem` built
  (known by its id) `isDefault: true` on its own copy, so the shared helper and
  the Control Strip under Platinum and System 7 stay as they are (setting
  `isDefault` in the helper would add the `default` state to their menus, which
  they do not style; that would need a parity check). _WIG Ch.10 "Status
  Notification" (p.212)._
- **10.18** ⚠️ the Windows shell (plan 0020-w98, §2; resolves 7.28):
  requirement. A forced tooltip after 500 ms (`useClassicyBalloonHelp` with
  `force`) giving `classicyControlStripModuleLabel`, for Sound with the level
  ("Volume" and, when muted, "Muted"); the clock's is the long date (plan §2
  "The clock"). _WIG Ch.10 "Status Notification" (p.212)._
- **10.19** ⚠️ the Windows shell (beyond plan 0020-w98's scope, which leaves
  message notification out): requirements. Core: an additive action
  `ClassicyAppRequestAttention { app: { id }, window? }` sets a session-only
  `attention: true` on the window record (`sanitizeStateForPersistence` strips
  it, `focusWindow` clears it). Taskbar: the button carries a new vocabulary
  part class `classicyTaskbarTaskAttention`, read only by Windows 98. Package
  (`_Taskbar.scss`): drawn raised (`b.raised`) with a `--color-highlight` face
  and a `--package-color-selection-text` label, toggling with the plain face
  three times at the caret-blink rate (530 ms a phase, a CSS animation with
  `animation-iteration-count: 3`), then holding highlighted, as Figure 10.3
  draws the pending button beside the active one; the app shows its message box
  once activated. _WIG Ch.10 "Message Notification" (p.212), Figure 10.3._
- **10.20** ⚠️ core layout flag: `layout.dialog?: { flushInput?: boolean, … }`
  (`true` in `windows98.json`). Under it the hook ignores keydowns with
  `e.repeat` and any key whose keydown came before the dialog mounted, arming on
  the first keyup or first non-repeat keydown after mount (ClassicyButton
  already checks `e.repeat`). The defect is under every package; ungated it must
  first be checked against HIGOS8 and HIG7. _WIG Ch.10 "Message Notification"
  (p.212)._
- **10.21** ⚠️ core layout flag: `layout.dialog.modality?: "desktop" |
  "application"` (default `"desktop"`, today; `"application"` in
  `windows98.json`). Under `"application"` a modal renders no desktop-wide
  scrim; its own app's other windows get `inert` and a capture-phase `mousedown`
  that beeps (`ClassicySoundPlayError`) and focuses the modal, while other apps,
  the desktop and the taskbar stay usable; `type="error"` alerts,
  `Desktop.errorDialog` and `Desktop.systemDialog` (Empty Trash, Reset PRAM)
  keep the desktop scrim as system-modal. The bundled settings windows are
  modeless already. Plan 0020-w98 keeps Classicy's modals desktop-modal (its
  Scope), so this is a separate change. _WIG Ch.10 "Message Notification"
  (p.212), "Modeless Interaction" (p.214); Ch.8 "Modeless vs. Modal" (p.147)._
- ✅ Ch.10 "Recycle Bin Integration" (p.212): every deletion goes through the
  Trash (File ▸ Move To Trash ⌃⌫, Delete in the browsers and on the desktop, a
  drag onto the Trash); only Empty Trash calls `fs.rmDir`, and Restore puts
  items back.
- **10.22** ⚠️ core display override: same as 1.15 (`apps: { Trash: { name:
  "Recycle Bin" } }` honored for `kind === "trash"`). _WIG Ch.10 "Recycle Bin
  Integration" (p.212)._
- **10.23** ⚠️ package (`packages/appearance/windows98/src/index.ts`; fix
  written, not applied): add to the registration `apps: {
  "AppearanceManager.app": { name: "Display" }, "SoundManager.app": { name:
  "Sounds" }, "DateAndTimeManager.app": { name: "Date/Time" },
  "ControlStripManager.app": { name: "Taskbar" } }` ("Taskbar" once the shell
  makes that panel the tray's settings; "Screen Saver" is already a concrete
  object). The names pass `ClassicyAppIdentityOverrideSchema` (no `:`); the
  change is display only (window titles, the Apple and Start menu entries, the
  Appearance module's label through `classicyControlStripModuleLabel`), ids and
  actions unchanged; pin it in `ClassicyWindows98.test.ts`. 12.6 adds
  descriptions to the same record. _WIG Ch.10 "Adding Control Panel Objects"
  (p.212)._
- **10.24** ⚠️ the Windows shell (plan 0020-w98, §5): requirements. A maximized
  window re-applies the work-area rect when `#classicyDesktop` or the taskbar
  band resizes (plan §5); task buttons reflow to the bar's width (`flex: 0 1
  160px`, minimum 22); under the taskbar every window is re-clamped into the
  work area on a desktop resize (a ResizeObserver read only when
  `layout.taskbar` is set). Menus already re-place on a desktop resize. _WIG
  Ch.10 "Plug and Play Support" (p.213)._
- ✅ Ch.10 "System Settings and Notification" (pp.213–214): every metric and
  color is a theme variable; the pixel-literal and literal-color gates keep the
  sheet on tokens and knobs; JS reads sizes live (ClassicyWindow reads
  `--window-resize-inset` and `--menu-bar-height` from its own element); a theme
  or scheme switch redraws every open surface at once.

---

## Chapter 11 — Working with OLE Embedded and OLE Linked Objects

Pages read: PDF 216–262 as text. The opener, PDF 216, prints p.219, so printed
page = PDF + 3 and the chapter is pp.219–265; every running head prints the
placeholder 271. Ch.12's opener (PDF 263) prints p.273, so the book's
"pp.219–272" is the span between the two openers: this pre-release's Ch.11 has
47 pages, and no PDF page derives to pp.266–272. Figures read as images: PDF
229–231 (pp.232–234, Figures 11.10–11.13), 238–241 (pp.241–244, Figures
11.17–11.20 and the access-key text), 245 (p.248, Figures 11.23–11.24), 253
(p.256, Figures 11.30–11.31), 257–258 (pp.260–261, Figures 11.35–11.38) and 260
(p.263, Figures 11.41–11.43); Figure 11.11's 96-ppi bitmap (PDF 230, stored
bottom-up) and Figures 11.30–11.31's (PDF 253) were extracted and read pixel by
pixel. Cross-references: Ch.5 "Nondefault Drag and Drop" (PDF 74–76 = pp.62–64),
Ch.7 "Pop-up Menu Interaction" (PDF 111 = p.101), Ch.13 "Handles" (PDF 307–308 =
pp.319–320).

Ch.11 is almost entirely OLE. Classicy has no compound documents, embedding,
linking, registry or object verbs, and the web platform offers no OLE, so the
"no OLE" adaptation keeps a real reason and most rows are ➖ (each with it). The
rules that reach a Classicy surface are the shortcut graphic, selection and
commands on a selected object, access keys, button-2 drags and the message
boxes' look. This section corrects one earlier row: Ch.7 "Pop-up Menu
Interaction" (p.101) is ✅ for the desktop only; in Finder windows a right-click
on an unselected item does not select it (11.3).

Normative checklist (WIG Ch.11) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| "Displaying Objects" (p.230), "Selecting Objects" (p.232), Figure 11.11 (p.233); Ch.3 "Icons" (pp.17–18) | A shortcut icon carries the shortcut graphic at its lower left: an 11 × 11 white box, gray top and left edges, black bottom and right, a black arrow rising to the upper right. | core ClassicyDesktopIcon (the `classicyDesktopIconAliasBadge` mask pair, `aliasBadge` system art); `_Desktop.scss` (keeps the label upright); the picture is Platinum's curved arrow, or nothing without Platinum | 🔧 see 11.1 |
| "Inserting New Objects" (p.226), "Displaying Objects" (p.230), Figure 11.11 (p.233) | Every shortcut icon carries the graphic, in a folder window too. | core ClassicyIcon, ClassicyFileBrowserViewIcons, ClassicyFileBrowserViewTable (no badge); the Applications folder's `AppShortcut` entries | 🔧 see 11.2 |
| "Accessing Commands for Selected Objects" (p.234); Ch.7 "Pop-up Menu Interaction" (p.101) | Pressing button 2 on an object selects it, and its menu applies to that selection. | the desktop ✅ (`clickFocus` before `showContextMenu`); Finder windows: core ClassicyFileBrowser `onContextMenu`, ClassicyIcon, ClassicyTable | 🔧 see 11.3 (= 5.6) |
| "OLE Visual Editing of OLE Embedded Objects" (p.237), Note; Ch.7 "Pop-up Menu Interaction" (p.101) | SHIFT+F10 and the Application key display the selection's pop-up menu. | core ClassicyContextualMenuTarget (the `contextmenu` event alone) | 🔧 see 11.4 (= 4.17) |
| "Keyboard Interface Integration", "Access Keys" (pp.243–244); Figures 11.12 (p.234), 11.18 (p.242) | A window bar's titles have unique access keys, File F; underlined at all times; Help last. | the coming window bars (ClassicyWindowMenuBar under `layout.taskbar`) | ⚠️ see 11.5 (shell; = 4.21) |
| "Access Keys" (p.244) | A repeated access character cycles the selection on each press; ENTER carries out the selected candidate ("standard system behavior for menus"). | core `ClassicyMenu.tsx` item keydown (Enter only; 7.1, 7.7) | 🔧 see 11.6 |
| "Direct Manipulation" (pp.224–225); Ch.5 "Nondefault Drag and Drop" (pp.62–64), Figure 5.13 | A button-2 drag ends in a transfer menu, the default bold, Cancel last. | core drag sources (button 0 only) | 🔧 see 11.7 (= 5.33) |
| Figures 11.30–11.43 (pp.256–263); Ch.8 "Message Boxes" (p.164) | A message box is captioned with its context in the bold caption font, Close alone (grayed on a box with more than one button and no Cancel), the symbol at the left, one centered row with the default first, access keys on Yes, No, Retry. | plan 0020-w98 §6 `dialog.caption: "titled"`; `_Window.scss` `.classicyWindowTitleBarModal`, `_Alert.scss` | 🔧 see 11.8 (shell) |
| "Selecting Objects" (p.232) | An object shown as an icon takes the checkerboard selection highlighting of folders and the desktop. | `_Desktop.scss`, `_Icon.scss`, `_Table.scss` (`$selection-dither`, the 50 % Hilight checker through the icon's mask) | ✅ |
| "OLE Visual Editing of OLE Embedded Objects" (p.237); Table 11.5 (p.265) | Double-click or ENTER carries out the default command. | ClassicyDesktopIcon (`launchIcon`, Enter or Space), ClassicyIcon (`doDoubleClick`) | ✅ |
| "Operations and Links" (p.251) | An open source's window becomes active and comes to the top. | `Finder.tsx` `openFolder` (`ClassicyWindowOpen` then `ClassicyWindowFocus`) | ✅ |
| "The Paste Command" (p.221) | Paste's wording says how the data is incorporated. | the Edit menu's "Paste" (native text); HyperCard's "Paste Part" | ✅ |
| "Using Handles" (p.257); Ch.13 "Handles" (pp.319–320), Figure 13.32 | Selection-only handles hollow, manipulating handles solid. | `HyperCardEditorOverlay.tsx` (every handle resizes); `_HyperCard.scss` (solid Hilight) | ✅ |
| "Opening OLE Embedded Objects" (p.248), Figure 11.24; Ch.13 "Open Appearance" (pp.320–321) | An open embedded object is masked with a 45-degree hatch. | none (OLE; Windows marked an open icon not at all, and the package withdraws the Mac open mark) | ➖ |
| "The Paste Special Command", "The Paste Link, Paste Shortcut, and Create Shortcut Commands" (pp.222–224), Figures 11.2–11.4, Table 11.1 | Paste Special, Paste Link, Paste Shortcut. | none (OLE; the Edit menu pastes text) | ➖ |
| "Inserting New Objects", "The Insert Object Command" (pp.225–228), Figures 11.5–11.7, Table 11.2 | Insert Object and its dialog. | none (no object types or registry) | ➖ |
| "Displaying Objects" (pp.228–230), Figures 11.8–11.9 | Cached presentation; Show Objects borders. | none (no embedded or linked objects) | ➖ |
| "Displaying Objects" (pp.230–231) | Display As Icon labels ("Shortcut to <name>"). | none (OLE labels; app shortcuts are named by their app) | ➖ |
| "Accessing Commands for Selected Objects" (pp.233–234), Figure 11.12 | An "<name> Object" submenu of registered verbs. | none (no registered verbs) | ➖ |
| "Accessing Commands for Selected Objects" (pp.234–235), Figure 11.13; Note (p.237) | An object's menu: transfer commands, verbs, Properties last; ALT+ENTER is Properties. | none here (OLE; the general rule is 7.11 and 2.2, where ALT+ENTER lands) | ➖ |
| "Selecting Objects" (p.231), "Activating Objects", "Outside-in Activation", "Inside-out Activation", "Container Control of Activation" (pp.235–236) | Activation models. | none (no activatable objects) | ➖ |
| "OLE Visual Editing of OLE Embedded Objects" (pp.236–241), Figures 11.14–11.16 | In-place activation, one level at a time, the container's title kept. | none | ➖ |
| "The Active Hatched Border" (pp.241–242), Figure 11.17 | A hatched border around the active object. | none | ➖ |
| "Menu Integration", "Primary Container Menu", "Workspace Menu", "Active Object Menus" (pp.242–243), Figures 11.18–11.20 | Menu merging; an MDI child's buttons in the parent's bar. | none (OLE; no MDI, which plan 0020-w98 keeps out; the look of Figure 11.18's bar is 11.5) | ➖ |
| "Shortcut Keys" (p.244) | An active object's keys against the container's. | none (OLE key routing; Classicy's own keys are 7.15 and App. B) | ➖ |
| "Toolbars, Frame Adornments, and Palette Windows" (pp.244–247), Figures 11.21–11.22 | Negotiated tool areas. | none | ➖ |
| "Opening OLE Embedded Objects" (pp.247–249), Figures 11.23–11.25 | Open in a separate window titled "Object Name in Container Name". | none | ➖ |
| "Editing an OLE Linked Object", "Automatic and Manual Updating", "Operations and Links", "Types and Links" (pp.249–252), Figure 11.26 | Link editing and updating. | none (OLE links; the one general rule is the ✅ row above) | ➖ |
| "Link Management", "Accessing Properties of OLE Objects", "The Properties Command", "The Links Command" (pp.252–256), Figures 11.27–11.31 | Link property pages and the Links dialog. | none (the message boxes' look is 11.8) | ➖ |
| "Converting Types" (pp.256–257), Figure 11.32 | The Convert dialog. | none | ➖ |
| "Using Handles" (pp.257–258), Figure 11.33 | An active object's handles inside its hatch. | none (OLE; the general rule is ✅ above) | ➖ |
| "Undo Operations for Active and Open Objects" (pp.258–259), Figure 11.34 | One undo stack per window, shared with its active objects. | none (Edit ▸ Undo is the focused field's native stack) | ➖ |
| "Displaying Messages", "Object Application Messages", "OLE Linked Object Messages" (pp.259–263), Figures 11.35–11.43 | The OLE messages' content. | none (their look is 11.8) | ➖ |
| "Status Line Messages" (pp.264–265), Tables 11.3–11.5 | Status-line text for the container's and objects' commands. | none (OLE commands; no message status bar; wording is Ch.12's) | ➖ |

### Findings — Chapter 11

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 11.1 | MEDIUM | The shortcut graphic is Platinum's Mac alias arrow (no box) at 8 px; on a host without Platinum it resolves to `""` and every app icon on the desktop loses its graphic. The old "art is the default package's" adaptation gives no reason here. | `_Desktop.scss`, `windows98.json`; core ClassicyDesktopIcon | 🔧 Fixed (104ebd968, cf4e1bc7a) |
| 11.2 | LOW | Only desktop icons draw the graphic; Finder's Applications window shows its `AppShortcut` entries with none, and the package cannot add it (`.classicyIconMaskOuter` is masked by the icon's own shape). | core ClassicyIcon, ClassicyFileBrowserViewIcons, ClassicyFileBrowserViewTable; `_Icon.scss`, `_Table.scss` | 🔧 Fixed (7bc33b74f) |
| 11.3 | LOW | In Finder windows a right-click on an unselected item shows its menu without selecting it: Move To Trash then trashes an item drawn unselected while the old selection stays highlighted. Same as 5.6. | core ClassicyFileBrowser, ClassicyIcon, ClassicyTable, Finder | 🔧 Fixed (be51df8bd) |
| 11.4 | LOW | Nothing on this branch handles F10 or the ContextMenu key. Same as 4.17 (= 7.9). | core ClassicyContextualMenuTarget, ClassicyContextualMenuProvider | 🔧 Fixed (3066b9019) |
| 11.5 | LOW | The shell's window bars and their appended Help menu carry no access keys (plan 0020-w98 leaves access keys out). Same as 4.21. | the coming ClassicyWindowMenuBar; `_Window.scss` | ⚠️ Deferred (shell addendum B7, not implemented) |
| 11.6 | LOW | A menu's items handle Enter alone and have no access keys; lane 2's type-ahead (wip/w98-lane2, 08d728581) moves to the next item a letter starts but neither knows access keys nor carries out a unique match. | core `ClassicyMenu.tsx` | 🔧 Fixed (ce8bde683, 08d728581, 7470e0537) |
| 11.7 | LOW | Every file drag starts on button 1 only; a button-2 press shows the item's menu instead, and `fs` has no copy or shortcut writer. Same as 5.33. | core ClassicyIcon, ClassicyDesktopIcon, ClassicyFileBrowserViewTable | 🔧 Fixed (37d580c6d) |
| 11.8 | LOW | Today a modal's caption has no icon and no collapse box (8.1) and a Close box only when `closable`; the plan's titled captions must match Figures 11.30–11.43 box by box. | plan 0020-w98 §6; `_Window.scss`, `_Alert.scss` | 🔧 Fixed (7d1d67f52, 7470e0537) |

**Details & fixes**

- **11.1** ⚠️ package
  (`packages/appearance/windows98/src/styles/components/_Desktop.scss`,
  `src/windows98.json`; fix written, not applied): placement already complies
  (the base pins the badge at `bottom: 0; left: 0`, and `_Desktop.scss`
  l.145–148 keeps an alias label upright); the picture does not, since the
  package registers no system art and `useClassicyAsset("systemArt",
  "aliasBadge")` resolves to Platinum's `art/alias.png` at `--alias-badge-size:
  calc(var(--desktop-icon-size) / 4)`, 8 px, or `""` (line 197) without
  Platinum, when the badge's `<img src="">` and its `url("")` mask draw nothing.
  After the "Opened" block (same specificity, so the new rule must follow it),
  add the 11-row picture as a Sass list, `$shortcut-graphic: ("SSSSSSSSSSK",
  "S.........K", "S...KKKK..K", "S....KKK..K", "S...KKKK..K", "S..KKK.K..K",
  "S..KK.....K", "S..K......K", "S...K.....K", "S.........K", "KKKKKKKKKKK")` (S
  gray, K black, . white), and `.classicyDesktopIcon
  .classicyDesktopIconMaskOuter.classicyDesktopIconAliasBadge {
  --alias-badge-size: #{px(11)}; mask-image: none; background:
  pixel-art(var(--color-black), runs($shortcut-graphic, "K")),
  pixel-art(var(--package-color-shortcut-frame, var(--color-system-05)),
  runs($shortcut-graphic, "S")), var(--color-white); > .classicyDesktopIconMask
  { mask-image: none; } img { visibility: hidden; } }`. In `windows98.json`,
  `colorFamilies.shortcut { label: "Shortcut", colors: { frame: { label:
  "Shortcut arrow frame" } } }` and `defaults.color.families.shortcut.frame:
  8421504` (#808080): the overlay is an icon, so a scheme must not recolor it as
  it would ButtonShadow. Selected, the badge's existing `::after` 50 % Hilight
  dither covers the whole box, as ILD_SELECTED blends the overlay. Platinum and
  System 7 register their own `aliasBadge` and read none of it. Before landing,
  check the 11-px size against a Windows 98 capture of a 32-px desktop shortcut,
  since Figure 11.11 shows an OLE content view. 1.14's art registration leaves
  `aliasBadge` to this rule. _WIG Ch.11 "Displaying Objects" (p.230), "Selecting
  Objects" (p.232), Figure 11.11 (p.233); Ch.3 "Icons" (pp.17–18)._
- **11.2** ⚠️ core layout flag: `layout.icon?: { aliasBadge?: "desktop" |
  "everywhere" }` (absent means `"desktop"`, today's; `"everywhere"` in
  `windows98.json`). ClassicyIcon takes `alias?: boolean` and under
  `"everywhere"` wraps its mask pair in `<div className="classicyIconImage">`
  with a second pair, `classicyIconMaskOuter classicyIconAliasBadge`, carrying
  the `aliasBadge` system art, as `ClassicyDesktopIcon.tsx` l.624–638 does;
  ClassicyFileBrowserViewIcons passes `alias={isAliasKind(properties._type)}`
  (`ClassicyDesktopIconKinds.ts`) and ClassicyFileBrowserViewTable adds the
  badge after the row icon under the flag; `IconImage` and `IconAliasBadge` are
  declared in `ClassicyVocabulary.json`. Package side: `_Icon.scss` draws 11.1's
  pixel art on `.classicyIconAliasBadge` (absolute, bottom-left, `mask-image:
  none`, the img hidden); `_Table.scss` draws the small-icon overlay, whose
  pixels the WIG does not give (take them from a Windows 98 capture). Platinum
  and System 7 declare no flag, so their DOM and pixels are unchanged. _WIG
  Ch.11 "Inserting New Objects" (p.226), "Displaying Objects" (p.230), Figure
  11.11 (p.233)._
- **11.3** ⚠️ core layout flag: same as 5.6 (`layout.selection.secondaryButton:
  "select"`), whose ClassicyIcon and ClassicyTable rules (a button-2 press on an
  unselected icon or row selects it alone before the `contextmenu`) close this
  one; the desktop complies today (`ClassicyDesktopIcon.tsx` l.584–591). Mac OS
  8's Control-click also selects, so Platinum could adopt the flag later with
  its own parity review. The Ch.7 "Pop-up Menu Interaction" row, ✅, checked the
  desktop alone. _WIG Ch.11 "Accessing Commands for Selected Objects" (p.234);
  Ch.7 "Pop-up Menu Interaction" (p.101)._
- **11.4** ⚠️ core layout flag: same as 4.17 (`layout.keyboard.contextMenuKey`).
  Bind nothing to ALT+ENTER until a Properties command exists (2.2). _WIG Ch.11
  "OLE Visual Editing of OLE Embedded Objects" (p.237), Note._
- **11.5** ⚠️ the Windows shell (plan 0020-w98, §4; with 4.11): same requirement
  as 4.21. Every title in a window bar carries an access key, its first letter
  where free (File F, Edit E, View V, Special S, the appended Help H), unique
  within the bar; bundled apps' `appMenu` titles declare theirs; `_Window.scss`
  underlines `.classicyWindowMenuBar [data-classicy-part="access-key"]`
  (`text-decoration: underline`) at all times, as Figures 11.12 and 11.18 draw
  (Windows 95/98 did not wait for ALT); F10 and ALT+letter reach the bar where
  the browser delivers them (B.7); with no MDI there is no Window menu. _WIG
  Ch.11 "Keyboard Interface Integration", "Access Keys" (pp.243–244); Figures
  11.12 (p.234), 11.18 (p.242)._
- **11.6** ⚠️ core layout flag (4.11's `layout.keyboard.accessKeys`): the root
  ClassicyMenu's key handler takes a letter, bare inside an open menu or
  ALT+letter where the browser delivers it: when exactly one enabled item in the
  open list has that `accessKey`, click it (Windows' MNC_EXECUTE); when several
  do, move the tracked item to the next match on each press, wrapping, and ENTER
  clicks it (MNC_SELECT); when none does, keep lane 2's type-ahead. Platinum and
  System 7 declare no flag and keep the Mac menus. _WIG Ch.11 "Access Keys"
  (p.244)._
- **11.7** ⚠️ core layout flag: same as 5.33 (`layout.transfer.secondaryButton:
  "menu"`), Copy Here waiting for 5.28's `fs.copy` and Create Shortcut Here for
  a shortcut writer. _WIG Ch.11 "Direct Manipulation" (pp.224–225); Ch.5
  "Nondefault Drag and Drop" (pp.62–64), Figure 5.13._
- **11.8** ⚠️ the Windows shell (plan 0020-w98, §6, `dialog.caption: "titled"`,
  Step 10): requirements. Keep §6's Close mapping (the cancel-role button, else
  the only button, else drawn disabled, `closeDisabled`), which matches the
  figures box by box; test Figure 11.31's case (Yes/No, Close disabled: its ×
  measured embossed gray in the bitmap) and Figure 11.30's (Yes/No/Cancel, Close
  runs Cancel); a box raised from a dialog keeps a title the caller passes
  ("Change Source"), and only an empty title falls back to the app's display
  name. The row already centers with the default first (✅ in Ch.8); access keys
  on Yes, No and Retry wait for 4.11 / 8.9. _WIG Ch.11 Figures 11.30–11.31
  (p.256), 11.35–11.38 (pp.260–261), 11.39–11.43 (pp.262–263); Ch.8 "Message
  Boxes" (p.164)._
- ✅ "Selecting Objects" (p.232): the package draws `$selection-dither:
  repeating-conic-gradient(b.$highlight 0 25%, transparent 0 50%) 0 0 / px(2)
  px(2)` over a selected icon's image, clipped by its own mask, the label
  HilightText on Hilight inside the dotted ring, on the desktop (`_Desktop.scss`
  l.64–66, 150–168), in the icon view (`_Icon.scss` l.56–58, 114–132) and in the
  list view (`_Table.scss` l.193–229, the disclosure gutter's `::after` masked
  by `--classicy-icon-mask`); a package's pre-rendered selected image takes no
  layer.

---

## Chapter 12 — User Assistance

Pages read: PDF 263–282, every page as text and PDF 263–273 and 279–281 as
images (Figures 12.1–12.12 and 12.17–12.18). The opener, PDF 263, prints 273, so
printed page = PDF + 10 and the chapter is pp.273–292; every other running head
carries the placeholder "237". Ch.13's opener (PDF 283) prints 295, so the
book's pp.293–294 have no page in this pre-release: its Ch.12 is two pages
shorter. Cross-reference: Ch.7 "The Help Menu" (PDF 109 = p.99). Ch.12 is
context-sensitive Help, tooltips, status-bar messages, the Help button, Help
windows, the Help Topics browser and wizards.

"No Windows help system" is no longer treated as exempt: Apple Guide is
Classicy's task Help and is held to the task-topic rules (12.15–12.20), and
Balloon Help to the tooltip rules (12.7–12.12); only the reference Help window
and the Contents and Index word lists stay ➖, each with its reason. One fix
(12.10) changes a defect under every package, so under the owner's rule it
carries Platinum's and System 7's own look in the same change.

Normative checklist (WIG Ch.12) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| "The Help Topics Browser" (p.284); Ch.7 "The Help Menu" (p.99) | The Help menu holds Help Topics (or Contents, Index, Find Topic), other assistance, then "About <application>" last, with no ellipsis. | ClassicyDesktopMenuBar `helpMenuItem` (About Balloon Help…, Show/Hide Balloons ⌥H); plan 0020-w98 §4 (`classicySystemHelpItems` into each window's Help) | ⚠️ see 12.1 (shell) |
| "Context-Sensitive Help" (pp.273–274), Figures 12.1 and 12.2; App. B Table B.2 (p.358) | What's This? (a command, a button, or SHIFT+F1) enters a mode with the contextual Help pointer over the active window. | core `useClassicyBalloonHelp.tsx` (hover only), `ClassicyCursorRole` (no `help`), no SHIFT+F1 | 🔧 see 12.2 |
| "Context-Sensitive Help" (pp.274–275), Figures 12.3 and 12.4 | In the mode a click shows the object's pop-up and ends the mode; ESC, an outside click or the command again cancels it; What's This? on a pop-up menu shows it at once. | core balloon hook and ClassicyContextualMenu (no mode); `_BalloonHelp.scss` (the hover ToolTip only) | 🔧 see 12.3 |
| "Context-Sensitive Help" (p.275); App. B Table B.2 (p.358) | F1 shows the focused object's context-sensitive Help. | core (no F1 handler) | 🔧 see 12.4 |
| "Guidelines for Writing Context-Sensitive Help" (p.275), Figure 12.5 (p.276) | Start with a verb, in common terms, briefly; an icon's help gives its long type name and a description. | core `ClassicyDesktopIconBalloons.ts` (`DEFAULT_BALLOON_CONTENT`: "This is the Trash…") | 🔧 see 12.5 |
| "Guidelines for Writing Context-Sensitive Help" (p.275) | The same, for an app shortcut's balloon. | the bundled `*Manifest.ts` descriptions ("Control panel for…"); the package declares no `apps` | 🔧 see 12.6 |
| Figure 12.5 (p.276), "Guidelines for Writing Context-Sensitive Help" (p.275); Figure 12.3 (p.274) | An icon's help is two lines of plain text; help pop-ups are plain text. | `_BalloonHelp.scss` (keeps the title bold, citing TTM_SETTITLE); base `.classicyBalloonHelpTitle` | 🔧 see 12.7 |
| "Tooltips" (p.276); App. C "User Assistance" (p.364) | Every control without a text label has a tooltip naming it. | ClassicyWindowTitleBar's close, zoom and collapse boxes (accessible names, no tooltip) | 🔧 see 12.8 (shell) |
| "Tooltips" (p.276), Figure 12.6; App. C "User Assistance" (p.364) | Tooltips name unlabeled controls, toolbar buttons most of all. | core ClassicyBevelButton, ClassicyButtonToolbar (no balloon); the Control Strip is 7.28 | 🔧 see 12.9 |
| "Tooltips" (p.276), Figure 12.6; Ch.7 "Tooltip Controls" (p.133) | A toolbar button's tooltip is a small cream InfoWindow box in a black line. | core ClassicyRichTextEditor (MDXEditor's Radix tooltips, portaled unstyled into `document.body`) | 🔧 see 12.10 |
| "Tooltips" (p.276) | Show after the system's delay; keep until a press, a move off or a time-out; a straight move to another tooltip shows it at once. | `useClassicyBalloonHelp.tsx` (600 ms, `onMouseEnter`/`onMouseLeave` only, one timer per instance) | 🔧 see 12.11 |
| "Tooltips" (p.276), Figure 12.6; Ch.7 "Tooltip Controls" (p.133) | Figure 12.6's box: cream InfoWindow, a one-pixel black line, plain one-line text, no tail. | `_BalloonHelp.scss` `.classicyBalloonHelp` (`--package-color-tooltip-face` #ffffe1, `b.$b` solid line, square, `tooltip.paddingX` 4 and `paddingY` 2, the tail hidden) | ✅ |
| "Status Bar Messages" (p.276) | Like status messages, tooltips appear only while their window is active. | `useClassicyBalloonHelp.tsx` (no window-activity check) | 🔧 see 12.12 |
| "Status Bar Messages" (p.276) | Nothing essential only in the status bar. | ClassicyWindow's header strip (counts), ClassicyPlacard; `_Window.scss`, `_Placard.scss` | ✅ |
| "Status Bar Messages" (pp.276–277), Figure 12.7 | A highlighted menu item's or pointed toolbar button's message shows in the window's status bar. | core ClassicyMenu `ClassicyMenuItem.balloon` (a balloon beside the item) | 🔧 see 12.13 |
| "Guidelines for Writing Status Bar Messages" (p.278) | Verb-first, brief, a whole menu summarized, an unavailable item's reason. | none bundled (no item declares a `balloon`; host copy) | ➖ |
| "The Help Command Button" (p.278), Figure 12.8 | A Help button is a standard command button labeled "Help", the size of OK and Cancel, last in the row. | `ClassicyAlert.tsx` help role (ClassicyHelpButton, `classicyAlertHelpButton`); `_Button.scss` (the "?" on 20 × 21); `_Alert.scss` (`order: 40`) | 🔧 see 12.14 |
| "The Help Command Button" (p.278), Figure 12.9 | The Help button opens a Help secondary window, not a pop-up. | the help role calls its handler; Apple Guide's topic window | ✅ |
| "Task Topic Windows" (p.279) | Task topic windows are primary windows the user can size. | `AppleGuideWindow.tsx` (`resizable={false}`, 700 × 322) | 🔧 see 12.15 |
| "Task Topic Windows", "Guidelines for Writing Task Help Topics" (p.280), Figure 12.10 | Command buttons at the top: at least Help Topics and Back, then others (Copy, Print). | `AppleGuideWindow.tsx` → ClassicyAssistant (the footer pager only) | 🔧 see 12.16 |
| "Task Topic Windows" (p.280) | Cover as little as possible while showing the topic without scrolling. | `AppleGuideWindow.tsx` (`initialSize [700, 322]`, centered) | ✅ |
| "Task Topic Windows" (p.280), Figures 12.10 and 12.11 | The interior in the Help window color (cream InfoWindow), the topic in the system font, its title bold. | `AppleGuide.scss`, `ClassicyAssistant.scss` (ButtonHilight header, white body, ButtonLight footer, the body font at 13 and 14 px) | 🔧 see 12.17 |
| "Guidelines for Writing Task Help Topics" (pp.280–281) | A topic is brief "how", at most four steps, no concepts. | `AppleGuideTopics.tsx` (`ABOUT_BALLOON_HELP_TOPIC_ID` "About Help", a "what" list of the Mac menus) | 🔧 see 12.18 |
| "Topic Titles" (p.283) | Always title the current topic. | `AppleGuideWindow.tsx` (the header band reads `topic.title`) | ✅ |
| "Nonscrolling Regions" (p.283); Figure 12.12 (p.282) | A non-scrolling region has a line along its bottom; the scroll bar starts below it. | the Apple Guide header band (no rule; the body its own scroll area, so the bar starts below ✅) | 🔧 see 12.19 |
| "Adding Menus and Toolbar Buttons" (p.283) | Browse buttons fit the topic: Next disabled at the chain's end. | `ClassicyPager.tsx` (`canGoForward`, `canGoBack`); `_Placard.scss` (embossed) | ✅ |
| "Jumps" (p.283) | A jump looks different (button, pointer or color); a text jump is green and underlined by default. | `ClassicyLink.scss` (underlined, the hand) ✅; `_Placard.scss` `.classicyLink` (navy `--color-theme-04`) | 🔧 see 12.20 |
| "The Reference Help Window", "Adding Menus and Toolbar Buttons" (pp.281–283), Figure 12.12 (p.282) | A reference Help window with its menu bar, toolbar and browse buttons. | none (no reference documentation viewer or Help file format) | ➖ |
| "The Help Topics Browser", "The Help Topic Tabs" (pp.284–288), Figures 12.13–12.16; Ch.7 "The Help Menu" (p.99) | Help Topics opens a browser: Contents (books and pages), Index, Find. | none (the Apple Guide registry holds topics, nothing lists them) | 🔧 see 12.21 |
| "Guidelines for Writing Help Contents Entries", "… Help Index Keywords" (pp.288–289) | Contents entries match the topic titles; index keywords cover synonyms and levels. | none (no Contents or Index pages; host word lists) | ➖ |
| "Wizard Buttons" (p.289), Figures 12.17 and 12.18 | At a wizard's bottom: "< Back" (disabled on the first page), "Next >", "Finish", "Cancel". | `ClassicyAssistant.tsx` (the page's buttons left, ClassicyPager's arrows and page number right) | 🔧 see 12.22 |
| "Wizard Buttons" (p.289) | < Back disabled on the first page. | `ClassicyPager.tsx` (`canGoBack = page > 0`) | ✅ |
| "Guidelines for Writing Text for Wizards" (p.289) | One secondary window rather than a series. | `ClassicyAssistant.tsx` (every page in one window) | ✅ |
| "Guidelines for Writing Text for Wizards" (pp.289–290), Figures 12.17 and 12.18 | A page is a dialog face: a graphic left, the text top right, an etched line above the buttons, no page number. | `ClassicyAssistant.scss` (base: a bold header band, white body, the footer's buttons left and the pager right) | 🔧 see 12.23 |
| "Guidelines for Writing Text for Wizards", "… for Wizard Pages" (pp.290–292) | Defaults in controls; "click Finish" on the last page; conversational wording. | none bundled (the host's pages) | ➖ |

### Findings — Chapter 12

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 12.1 | MEDIUM | The Help menu reads About Balloon Help… then Show/Hide Balloons ⌥H, with no Help Topics; the plan carries both Mac items unchanged into the Windows window bars. | ClassicyDesktopMenuBar `helpMenuItem`; plan 0020-w98 §4 | 🔧 Fixed in part (ec433430a, 1ed1b21f7); ⚠️ addendum B19 |
| 12.2 | LOW | Classicy's contextual help is Balloon Help on hover after 600 ms; no command or key enters a mode, and no pointer changes (no `help` cursor role). | core `useClassicyBalloonHelp.tsx`, `ClassicyAssetRegistry.ts` | 🔧 Fixed (8e57449df, 1ed1b21f7) |
| 12.3 | LOW | No click shows a balloon: they show on `mouseenter` and hide on `mouseleave`, and there is no mode for ESC or an outside click to end. | core balloon hook, ClassicyContextualMenu; `_BalloonHelp.scss` | 🔧 Fixed (8e57449df) |
| 12.4 | LOW | F1 appears only in the shortcut-parsing docs; no handler acts on it, so the browser's own Help opens. | core | 🔧 Fixed (8e57449df) |
| 12.5 | LOW | The Trash's and the drive's stock balloons open "This is…" rather than a verb, the Trash's runs to three sentences and names the Special menu, and no package can override them. | core `ClassicyDesktopIconBalloons.ts` | 🔧 Fixed (41de137d5) |
| 12.6 | LOW | An app shortcut's balloon is its manifest description, mostly noun-first ("Control panel for themes, colors, and the desktop background."); Windows 98 declares no `apps` descriptions. | `packages/appearance/windows98/src/index.ts` | 🔧 Fixed (41de137d5) |
| 12.7 | LOW | Every desktop icon's balloon is titled with the icon's name in bold with a gap below; Figure 12.5 draws the name and description in one weight with no gap (TTM_SETTITLE came with comctl32 5.80, after Windows 98's 4.72). | `_BalloonHelp.scss` | 🔧 Fixed (70d5848d3) |
| 12.8 | LOW | The caption boxes are glyph-only buttons with accessible names and no tooltip; Windows 98 shows "Minimize", "Maximize" or "Restore", and "Close". | ClassicyWindowTitleBar; plan 0020-w98 §1 `window.captionTooltips` | 🔧 Fixed (7d1d67f52, ca8fbeb6d, 1ed1b21f7) |
| 12.9 | LOW | An icon-only ClassicyBevelButton's name serves only as its accessible name; neither it nor ClassicyButtonToolbar attaches a balloon, so a host's icon toolbar shows no tooltips. | core ClassicyBevelButton, ClassicyButtonToolbar | 🔧 Fixed (70d5848d3) |
| 12.10 | MEDIUM | The rich text editor's toolbar tooltips (Undo, Redo, Bold, Italic, Underline, Code, Rule) are Radix tooltips portaled into a container MDXEditor appends to `document.body`, which no sheet styles and no package can reach: unstyled text, under every package. | core `ClassicyRichTextEditor.tsx` | 🔧 Fixed (70d5848d3) |
| 12.11 | LOW | The delay is 600 ms, no press hides a balloon, nothing auto-pops it, and each instance runs its own timer, so moving straight to the next anchor waits the full delay again. | core `useClassicyBalloonHelp.tsx`, ClassicyBalloonHelp | 🔧 Fixed (70d5848d3) |
| 12.12 | LOW | A balloon in an inactive window shows on hover like any other. | core `useClassicyBalloonHelp.tsx` | 🔧 Fixed (70d5848d3) |
| 12.13 | LOW | A menu item's help is a balloon drawn beside the item, as a ToolTip under Windows 98; Windows menus show none, and nothing carries the text to a status bar. | core `ClassicyMenu.tsx` | 🔧 Fixed (70d5848d3) |
| 12.14 | LOW | The alert's Help button is a 20 × 21 bevel square showing the caption "?" (DFCS_CAPTIONHELP); Figure 12.8 shows a 75 × 23 push button with the word "Help". | `_Alert.scss` | 🔧 Fixed (7bc33b74f) |
| 12.15 | LOW | The Apple Guide window is fixed at 700 × 322, drawn with the fixed dialog frame and no grip. | core `AppleGuideWindow.tsx` | 🔧 Fixed (89e1a5683, 1ed1b21f7) |
| 12.16 | LOW | Apple Guide navigates only with the pager at the bottom: no Help Topics, Back, Copy or Print command. | core `AppleGuideWindow.tsx`, ClassicyAssistant | 🔧 Fixed (89e1a5683) |
| 12.17 | LOW | Under Windows 98 the Apple Guide header is ButtonHilight, the body white, the footer ButtonLight, the fonts the body font at Platinum's 13 and 14 px. | the package (no Apple Guide or Assistant partial); `windows98.json` | 🔧 Fixed (d7b4ea532) |
| 12.18 | LOW | The only built-in topic is a "what" list of the Mac Help menu ("Balloons—to help you identify items…"), shown under Windows 98, and re-registering an id replaces it for every package. | core `AppleGuideTopics.tsx` | 🔧 Fixed (89e1a5683) |
| 12.19 | LOW | The title band runs into the body with no line between them (the base's comment says "Its beveled border is in the Platinum package"). | the package (no Apple Guide partial) | 🔧 Fixed (d7b4ea532) |
| 12.20 | LOW | A link in an Apple Guide topic, a help jump, is navy (`--color-theme-04`), not Help's green. | `_Placard.scss` `.classicyLink`; `windows98.json` | 🔧 Fixed (d7b4ea532) |
| 12.21 | LOW | No window lists the registered topics, so Help Topics (12.1) can open only one topic. | core AppleGuide extension | 🔧 Fixed (89e1a5683, 1ed1b21f7) |
| 12.22 | LOW | The Assistant's navigation is two square triangle buttons around a sunken page number, the page's buttons to their left; no Back or Next labels exist for a package to draw, and the names read "Previous page" and "Next page". | core `ClassicyAssistant.tsx`, `ClassicyPager.tsx` | 🔧 Fixed (d7b4ea532) |
| 12.23 | LOW | A wizard page's body is Window white, not ButtonFace, no etched line separates the footer, its buttons are `--control-row-height` tall rather than the push button's 23, and a page number is drawn. | the package (no Assistant partial) | 🔧 Fixed (d7b4ea532) |

**Details & fixes**

- **12.1** ⚠️ the Windows shell (plan 0020-w98, §4, Step 11): requirements,
  under `layout.taskbar` only. `classicySystemHelpItems` returns "Help Topics"
  first, no ellipsis, keeping the same event and topic or opening 12.21's window
  once it exists; "What's This?" ⇧F1 follows once 12.2 lands; the balloon on/off
  toggle is not offered in a window's Help (Windows 98 has no switch for
  ToolTips, which always show, p.276), so its ⌥H is not dispatched there (B.7);
  "About <display name>" stays last after a divider, as §4 has it. The screen
  bar under Platinum, System 7 and `mirrored` keeps About Balloon Help… and
  Show/Hide Balloons byte for byte. _WIG Ch.12 "The Help Topics Browser"
  (p.284); Ch.7 "The Help Menu" (p.99)._
- **12.2** ⚠️ core layout flag: `layout.balloonHelp.contextHelp?: "whatsThis"`
  (absent for Platinum, System 7 and `mirrored`; joining 7.27's
  `layout.balloonHelp` group). Under it the window Help menu offers "What's
  This?" with `keyboardShortcut` "⇧F1", dispatched with `preventDefault` where
  the browser delivers it; the command sets a session-only mode, never
  persisted, which puts `classicyWhatsThisMode` (a new Window part in the
  vocabulary) on the active ClassicyWindow's root; one base rule in
  `ClassicyWindow.scss`, `.classicyWindow.classicyWhatsThisMode,
  .classicyWindow.classicyWhatsThisMode * { cursor: var(--classicy-cursor-help,
  help) }` (the CSS `help` keyword is Windows' own arrow and "?" on a Windows
  host), read only while the class is set, which no other package sets; `help`
  joins `ClassicyCursorRole` so a package can register art for it. _WIG Ch.12
  "Context-Sensitive Help" (pp.273–274), Figures 12.1 and 12.2; App. B Table B.2
  (p.358)._
- **12.3** ⚠️ core layout flag (12.2's): (1) `useClassicyBalloonHelp` registers
  each anchor's config in a module WeakMap keyed by element; (2) while the mode
  is on, a capture-phase `pointerdown` in the active window swallows the click
  and, on the nearest registered anchor, renders that config as a pop-up
  (`classicyBalloonHelp classicyBalloonHelpContext`, portaled to
  `#classicyDesktop` at the click point, closed by the next click or key), then
  ends the mode; (3) a click on a menu title, or button 2 on a
  ClassicyContextualMenuTarget, passes through and keeps the mode until the menu
  closes; (4) an element with no anchor keeps the mode; (5) ESC, a `pointerdown`
  outside the active window or the command again ends it; (6) an optional
  contextual "What's This?" item shows its target's pop-up at once. Package
  rule, ready for `_BalloonHelp.scss`: `.classicyBalloonHelpContext` takes the
  ToolTip box plus Figure 12.3's shadow at the right and bottom, a 50 % checker
  of ButtonShadow and transparent two pixels deep, sized by a new
  `tooltip.shadow` knob. _WIG Ch.12 "Context-Sensitive Help" (pp.274–275),
  Figures 12.3 and 12.4._
- **12.4** ⚠️ core layout flag (12.2's): a document `keydown` for F1 with no
  modifiers, `preventDefault` where the browser delivers it, shows 12.3's pop-up
  for `document.activeElement`'s nearest registered anchor, placed below that
  element, or with no anchor opens the Help Topics topic (12.1). Platinum and
  System 7 bind nothing. _WIG Ch.12 "Context-Sensitive Help" (p.275); App. B
  Table B.2 (p.358)._
- **12.5** ⚠️ core optional field (additive): `desktopIconBalloons?:
  Partial<Record<"trash" | "drive", string>>` on ClassicyAppearancePackage,
  validated like `apps[id].description`; `defaultBalloonForKind` reads the
  active package's before `DEFAULT_BALLOON_CONTENT`. Platinum and System 7
  declare none. Windows 98 declares trash: "Holds the items you have moved to
  the Recycle Bin. To delete them for good, right-click the Recycle Bin and
  choose Empty Recycle Bin." (with 1.15's name) and drive: "Shows the files and
  folders on this disk." _WIG Ch.12 "Guidelines for Writing Context-Sensitive
  Help" (p.275), Figure 12.5 (p.276)._
- **12.6** ⚠️ package (`packages/appearance/windows98/src/index.ts`; fix
  written, not applied): pass `apps` with `description` only, ids, names and
  icons untouched (10.23 adds names to the same record): AppearanceManager.app
  "Changes the theme, colors, fonts and background of your desktop.",
  SoundManager.app "Sets the alert sound and the system volume.",
  DateAndTimeManager.app "Sets the date, time and time zone of the clock.",
  ControlStripManager.app "Shows or hides the Control Strip and chooses its
  modules and their order.", ScreenSaverManager.app "Chooses a screen saver and
  how long to wait before it starts.", DriveSetup.app "Initializes the startup
  disk or syncs it with its backend.", SimpleText.app "Opens and edits
  plain-text and styled-text documents.", Calculator.app "Adds, subtracts,
  multiplies and divides numbers."; pin the record in
  `ClassicyWindows98.test.ts`. A package's description beats the manifest's
  (`ClassicyDesktopIcon.tsx` l.205–214, 290–296). _WIG Ch.12 "Guidelines for
  Writing Context-Sensitive Help" (p.275)._
- **12.7** ⚠️ package (`_BalloonHelp.scss`; fix written, not applied):
  `.classicyBalloonHelpTitle { font-weight: normal; margin-bottom: 0; }`, so the
  name reads as the first line, and the header comment's title bullet cites
  Figure 12.5 instead of TTM_SETTITLE (Windows 98's own icon infotips carry no
  title). _WIG Ch.12 Figure 12.5 (p.276); "Guidelines for Writing
  Context-Sensitive Help" (p.275); Figure 12.3 (p.274)._
- **12.8** ⚠️ the Windows shell (plan 0020-w98, §1 `window.captionTooltips`,
  Step 10): requirement, now in the plan (its revision 020735126 added the flag
  the first draft left out as "not in the guidelines"; p.276 and App. C p.364
  cover every unlabeled control). Each caption box shows its label as a forced
  500-ms ToolTip, "Minimize", "Maximize" or "Restore" while maximized, "Close",
  and "Help" for a What's This? box once 12.2 lands, through
  `useClassicyBalloonHelp(boxRef, { content: label, delay: 500 }, { force: true
  })`; nothing changes without the flag. _WIG Ch.12 "Tooltips" (p.276); App. C
  "User Assistance" (p.364)._
- **12.9** ⚠️ core layout flag: `layout.balloonHelp.unlabeledTips?: boolean`
  (`true` in `windows98.json`). Under it a ClassicyBevelButton with no text
  children and an accessible name (`aria-label` or `iconAlt`) calls
  `useClassicyBalloonHelp(buttonRef, { content: name })`, forced, so it follows
  12.1's always-on rule. Platinum and System 7 are unchanged. _WIG Ch.12
  "Tooltips" (p.276), Figure 12.6; App. C "User Assistance" (p.364)._
- **12.10** ⚠️ core, under every package: ClassicyRichTextEditor passes
  MDXEditor `overlayContainer` = its root's `closest(".classicyDesktop")`,
  resolved after mount (balloons portal into `#classicyDesktop` the same way),
  and adds the extra vocabulary class `classicyRichTextEditorPopups` to that
  container (Classicy loads no `@mdxeditor/editor/style.css`, and no sheet
  styles `.mdxeditor-popup-container` or `[data-radix-popper-content-wrapper]`).
  Then `_BalloonHelp.scss` draws `.classicyRichTextEditorPopups
  [data-radix-popper-content-wrapper] > *` with the ToolTip box's declarations.
  Moving the container also changes the unstyled text's inherited font under
  Platinum and System 7; it is the same bug there, so per the owner's rule the
  change gives each its own look in the same change (Platinum's balloon box,
  System 7's) and checks both with `pnpm parity:shoot`. It shows in SimpleText's
  Markdown window. _WIG Ch.12 "Tooltips" (p.276), Figure 12.6; Ch.7 "Tooltip
  Controls" (p.133)._
- ✅ "Tooltips" (p.276), Figure 12.6: `.classicyBalloonHelp` uses
  `--package-color-tooltip-face` (#ffffe1) and `--package-color-tooltip-text` in
  a `b.$b` solid `--color-window-border` line, square, `tooltip.paddingX` 4 and
  `paddingY` 2, `min-width: 0`, the tail hidden; placement below and right of
  the pointer stays with 7.27.
- **12.11** ⚠️ core layout flag (extends 7.27's `layout.balloonHelp` group;
  Windows 98's values, Platinum and System 7 declare none and keep today's):
  `delayMs: 500`, Windows' double-click time (Wine `tooltips.c` TTDT_AUTOMATIC);
  `autoPopMs: 5000`, ten times the delay; `reshowMs: 100`, a fifth of it;
  `hideOnPress: true`. `onPointerDown` hides the balloon and cancels its timer;
  a module-level "last tooltip hidden at" stamp lets a balloon that starts
  within `reshowMs` skip its delay; a second timer hides it after `autoPopMs`.
  _WIG Ch.12 "Tooltips" (p.276)._
- **12.12** ⚠️ core layout flag: `layout.balloonHelp.activeWindowOnly?: boolean`
  (`true` in `windows98.json`). Under it the hook reads
  `ClassicyWindowActiveContext`, as ClassicyScrollArea already does, and never
  shows while it is false; anchors outside any window (desktop icons, the
  taskbar) are unaffected. _WIG Ch.12 "Status Bar Messages" (p.276)._
- **12.13** ⚠️ core layout flag: `layout.menu.itemHelp?: "balloon" |
  "statusBar"` (default `"balloon"`; `"statusBar"` in `windows98.json`). With
  `"statusBar"` ClassicyMenuItemComponent renders no balloon wrapper and, while
  the item is highlighted (by hover, or 7.7's keyboard tracking), publishes
  `balloon.content` through a store-free source, `useClassicyMenuStatusText` (a
  new optional `balloon.disabledContent` while the item is disabled, so a host
  can give an unavailable item its reason); a ClassicyPlacard given a new
  optional `menuStatus` prop shows that text in place of its children until the
  menu closes; a window with no such placard shows nothing. It pairs with the
  shell's window bars. _WIG Ch.12 "Status Bar Messages" (pp.276–277), Figure
  12.7; "Guidelines for Writing Status Bar Messages" (p.278)._
- **12.14** ⚠️ package (`_Alert.scss`; fix written, not applied): inside
  `.classicyAlertButtons`, with `@use "../bevels" as b`:
  `.classicyBevelButton.classicyAlertHelpButton { box-sizing: border-box;
  min-width: var(--button-min-width); height: var(--push-button-height);
  padding: 0 var(--button-text-padding); background: b.$face; @include b.raised;
  &::after { content: attr(aria-label); font-size: var(--ui-font-size); color:
  b.$text; } &:focus-visible { @include
  b.focus-rect(calc(var(--push-button-focus-inset) + #{b.$b})); } }`,
  `.classicyBevelButton.classicyAlertHelpButton:not(.disabled):is(:active,
  .pressed) { background: b.$face; @include b.pressed; &::after { position:
  relative; top: b.$b; left: b.$b; } }` and
  `.classicyBevelButton.classicyAlertHelpButton.disabled { background: b.$face;
  &::after { @include b.disabled-text; } }`. `background: b.$face` drops
  `_Button.scss`'s "?" layer; these selectors carry five and six classes,
  beating `_Button.scss`'s four-class pressed rule; the label is the button's
  accessible name ("Help", or the alert's label). The "?" stays for a
  ClassicyHelpButton outside an alert's row; the order (last, after Cancel)
  already complies. _WIG Ch.12 "The Help Command Button" (p.278), Figure 12.8._
- **12.15** ⚠️ core layout flag: `layout.help?: { topicWindow?: "winhelp" }`,
  read by AppleGuideWindow: under it the window is resizable with a
  `minimumSize` keeping the assistant usable (320 × 200); its task button comes
  from the shell, which lists Apple Guide windows. Platinum and System 7 keep
  the fixed window. _WIG Ch.12 "Task Topic Windows" (p.279)._
- **12.16** ⚠️ core layout flag (12.15's): AppleGuideWindow renders an
  `.appleGuideButtonBar` (a vocabulary part) above the ClassicyAssistant with
  ClassicyButtons: "Help Topics" (12.21's window, else the
  `ABOUT_BALLOON_HELP_TOPIC_ID` topic), "Back" (the previous page through
  `ClassicyAppAppleGuideSetPage`, disabled on page 0) and "Options", a
  ClassicyBevelButton menu of Copy (`navigator.clipboard.writeText` of the
  page's text) and Print Topic…; the package draws the row as Figure 12.10 does,
  a ButtonFace band of raised command buttons at the row's height. _WIG Ch.12
  "Task Topic Windows", "Guidelines for Writing Task Help Topics" (p.280),
  Figure 12.10._
- **12.17** ⚠️ package (fix written, not applied): a new partial
  `components/_AppleGuide.scss` (`@mixin apple-guide`), included by
  `windows98.scss` after BalloonHelp: `.appleGuideWindow
  .classicyAssistantHeader, .appleGuideWindow .classicyAssistantBody { color:
  var(--package-color-tooltip-text, var(--color-black)); background:
  var(--package-color-tooltip-face, var(--color-window-document)); font-family:
  var(--ui-font), sans-serif; } .appleGuideWindow .classicyAssistantFooter {
  background: b.$face; --classicy-pager-band: #{b.$face}; }`; in
  `windows98.json`, `measurements.appleGuide { headerFontSize: 11, bodyFontSize:
  11 }` in the defaults and all 18 presets (`appleGuide` is a structural family
  any package may set, as 8.10 set `dialog`). _WIG Ch.12 "Task Topic Windows"
  (p.280), Figures 12.10 and 12.11._
- **12.18** ⚠️ core optional field (additive): `registerAppleGuideTopic` gains
  an optional `packages?: string[]`, as `registerClassicyScreenSaver` has, and
  `getAppleGuideTopic(id)` returns the variant offered under the active package,
  else the unrestricted one. Windows 98's `index.ts` registers an
  `ABOUT_BALLOON_HELP_TOPIC_ID` variant with `packages: ["windows98"]`, titled
  "Using Help", its pages "how" steps ("Point to an item and wait: its ToolTip
  names it."; after 12.2, "To learn what an item does, choose What's This? from
  the Help menu, then click the item."). Platinum and System 7 keep "About
  Help". _WIG Ch.12 "Guidelines for Writing Task Help Topics" (pp.280–281)._
- **12.19** ⚠️ package (12.17's `_AppleGuide.scss`; fix written, not applied):
  `.appleGuideWindow .classicyAssistantHeader { border-bottom: b.$b solid
  var(--color-window-border); }` (`AppleGuide.scss` already makes the header
  `box-sizing: border-box`, so its height holds); it takes the place of 1.5's
  etched line in this window. _WIG Ch.12 "Nonscrolling Regions" (p.283); Figure
  12.12 (p.282)._
- **12.20** ⚠️ package (`windows98.json`, 12.17's `_AppleGuide.scss`; fix
  written, not applied): a package color family `help`,
  `defaults.color.families.help.jump = 32768` (#008000, WinHelp's jump color)
  with `colorFamilies.help = { label: "Help", colors: { jump: { label: "Jump
  text" } } }`, and `.appleGuideWindow .classicyLink, .appleGuideWindow
  .classicyLink:hover { color: var(--package-color-help-jump,
  var(--color-theme-04)); }`. The underline and the pointer already set a jump
  apart. _WIG Ch.12 "Jumps" (p.283)._
- **12.21** ⚠️ core layout flag (12.15's): a core window, ClassicyHelpTopics (in
  the AppleGuide extension), shown only under the help flag; its one Contents
  tab lists the registered topics in a ClassicyTree, book rows from a new
  optional `book?: string` on `registerAppleGuideTopic` and page rows for
  topics; Display (the default button, also a double-click) opens the topic
  window, Close closes the browser; under the taskbar Help ▸ Help Topics and
  Start ▸ Help open it. Index and Find are optional. _WIG Ch.12 "The Help Topics
  Browser", "The Help Topic Tabs" (pp.284–288), Figures 12.13–12.16._
- **12.22** ⚠️ core layout flag: `layout.assistant?: { navigation?: "pager" |
  "buttons" }` (`"buttons"` in `windows98.json`; Platinum, System 7 and
  `mirrored` keep the pager). With `"buttons"` ClassicyAssistant renders two
  ClassicyButtons in `.classicyAssistantNav` in place of ClassicyPager, both
  through `goPrev` and `goNext` so `canAdvance` and the `change` hook stay: "<
  Back" (`classicyAssistantBack`, disabled on page 0) and "Next >"
  (`classicyAssistantNext`, disabled on the last page); the vocabulary adds the
  parts `Back` and `Next`; the page's own buttons (Finish, Cancel) follow at the
  right through 12.23's order. _WIG Ch.12 "Wizard Buttons" (p.289), Figures
  12.17 and 12.18._
- ✅ "Wizard Buttons" (p.289) and "Adding Menus and Toolbar Buttons" (p.283):
  ClassicyPager disables its previous control at page 0 and its next at the last
  page (`canGoBack`, `canGoForward`), and Windows 98 embosses both glyphs.
- **12.23** ⚠️ package (fix written, not applied): a new partial
  `components/_Assistant.scss` (`@mixin assistant`), included before
  `_AppleGuide.scss`: `.classicyAssistant { color: b.$text; }
  .classicyAssistantHeader { box-shadow: inset 0 #{b.$neg-b} b.$hilight, inset 0
  #{b.$neg-b2} b.$shadow; } .classicyAssistantBody { background: b.$face; }
  .classicyAssistantFooter { justify-content: flex-end; background: b.$face;
  border-top: b.$b solid b.$shadow; box-shadow: inset 0 b.$b b.$hilight;
  --classicy-pager-band: #{b.$face}; } .classicyAssistantNav { order: 1; }
  .classicyAssistantFooterButtons { order: 2; } .classicyAssistantPageIndicator
  { display: none; } .classicyAssistantFooter
  .classicyButton.classicyButtonSmall { min-height: var(--push-button-height);
  min-width: var(--button-min-width); }`. The header's inset shadow is 1.5's
  etched line; the footer's border and inset shadow are the etched line above
  the buttons (ButtonShadow over ButtonHilight); the order rules put Back and
  Next first and the page's Finish and Cancel at the right. The header band
  stays as the page title, drawn in the Wizard97 manner (Windows 98's comctl32
  4.72 supports PSH_WIZARD97); Figure 12.17 has no header, a product choice
  recorded here. _WIG Ch.12 "Guidelines for Writing Text for Wizards"
  (pp.289–290), Figures 12.17 and 12.18._

---

## Chapter 13 — Visual Design

Pages read: PDF 283–309 (pp.295–321). This is the chapter the look is built
from: the four basic border styles and the five composite styles, the control
states, the fonts and sizes, the layout units, the selection and transfer
appearances. The Windows 95 text names "button face" for the raised outer
border's light side; Windows 98's Windows Standard scheme separates that role
into ButtonLight (223,223,223), which the package's `--color-system-02` holds,
so every "button face" of Figure 13.2's outer light edge reads ButtonLight here
and the OS as shipped is matched.

Normative checklist (WIG Ch.13) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| "Composition and Organization" (pp.295–296) | Hierarchy, focus at the upper left, structure and balance, relationship of elements, readability, unity with the system. | core layouts; the package's unity with Windows is this audit's subject | ➖ principles |
| "Color" (pp.296–298) | Color as a secondary form of information; a limited set; base elements on the system colors and schemes so they follow a user's change. | `windows98.json` (every color a palette token or a package color family; the 18 presets are Windows' own schemes); every partial reads tokens only (`bin/classicyLiteralColorSweep.ts` gate) | ✅ |
| "Fonts" (pp.298–299, Figure 13.1) | Avoid italic and serif fonts; limit the fonts and styles; use the standard system font for common elements. | `typography` (one 11-px sans stack for ui, header and body); `_Desktop.scss` (shortcut labels upright), `_Dialog.scss` (the About box without serif), `_Alert.scss` (one text) | ✅ |
| "Dimensionality" (p.299) | Highlighting and shading from a light source at the upper left; no 3-D on a non-interactive element. | `_bevels.scss` (every ring light at the top and left, dark at the bottom and right); the placard pane and progress track sunken as Windows' own status fields are | ✅ |
| "Basic Border Styles" (pp.299–300, Figure 13.2) | Raised outer: button face (Windows 98: ButtonLight) top-left, window frame (ButtonDkShadow) bottom-right. Raised inner: ButtonHilight top-left, ButtonShadow bottom-right. Sunken outer: ButtonShadow top-left, ButtonHilight bottom-right. Sunken inner: window frame (ButtonDkShadow) top-left, button face (ButtonLight) bottom-right. One pixel each. | `_bevels.scss` (`$hilight` system-01, `$light` system-02, `$face` system-03, `$shadow` system-05, `$dkshadow` system-07; one ring = `--window-border-size` 1) | ✅ |
| "Window Border Style" (p.301, Figure 13.3) | Raised outer + raised inner: primary and secondary windows, menus, scroll arrow buttons and other variable-background cases. | `b.window-frame` (windows, the standalone frame, menus, the placard's menu, the startup panel); scroll arrows use the button style | ✅ windows and menus; scroll arrows per Windows 98 (below) |
| "Button Border Styles" (p.301, Figures 13.4–13.5) | The outer and inner top-left colors swapped (ButtonHilight outside, ButtonLight inside); up = raised, down = sunken; the button-down style also for read-only areas (read-only text boxes). | `b.raised`, `b.pressed`; `_TextField.scss` `.classicyOutputInset` (the read-only edit) | ✅; 🔧 read-only well, see 13.3 |
| "Field Border Style" (p.302, Figure 13.6) | Sunken outer + sunken inner for editable text boxes, check boxes, drop-down combo and list boxes, spin boxes, list boxes and wells; the interior button highlight (white). | `b.sunken` in `_TextField.scss`, `_Checkbox.scss`, `_PopUpMenu.scss`, `_ListBox.scss`, `_Icon.scss`, `_Table.scss`, `_Slider.scss` (channel), the client area; interiors `--color-window-document` (Window, Windows' own choice; white in Windows Standard) | ✅ |
| "Status Field Border Style" (p.303, Figure 13.7) | Sunken outer only. | `_Placard.scss` `.classicyPlacard`, `_ProgressBar.scss` track (`DrawEdge(BDR_SUNKENOUTER)`), `_MenuBar.scss` clock pane | ✅ |
| "Grouping Border Style" (p.303, Figure 13.8) | Sunken outer + raised inner (etched) for group boxes and menu separators. | `b.etched` (`_ControlGroup.scss`), `_Separator.scss`, `_Menu.scss` separators (ButtonShadow over ButtonHilight) | ✅ |
| "Pressed Appearance" (pp.303–304, Figures 13.9–13.10) | Feedback on the down transition: a check box's or option button's field turns button face; a command button takes the button-down border and its label moves one pixel down and right. | `_Checkbox.scss`/`_RadioInput.scss` `:active` (ButtonFace inside); `_Button.scss` pressed (`b.pressed`, label +1,+1); caption buttons, scroll arrows, tabs, pager | ✅ |
| "Option-Set Appearance" (pp.304–305, Figures 13.11–13.13) | On the up transition: a check mark, a dot; a command button keeps the button-down border with a ButtonFace/ButtonHilight checkerboard, the glyph as when pressed; a well gets a border in the text color and the button highlight. | `_Checkbox.scss`, `_RadioInput.scss`; `_Button.scss` `.checked` (`$checker`, content +1,+1), `_ControlStrip.scss` module `.open`, `_MenuBar.scss` pressed taskbar buttons; `_Icon.scss` `.classicyImageWell.selected` (the two solid rings, WindowText outside ButtonHilight) | ✅ marks and buttons; 🔧 wells, see 13.7 |
| "Mixed-Value Appearance" (pp.305–306, Figures 13.14–13.15) | Leave the field blank for a mixed value; a check box draws its special mark; a graphical button draws the checkerboard on its face (raised); clicks cycle set, clear, mixed. | `_Checkbox.scss` `.mixed` (the checker face with a GrayText mark), `_RadioInput.scss` `.mixed` (7.18), `_Menu.scss` `.mixed` (7.2), core pop-up placeholder; `_Button.scss` `.classicyBevelButton.mixed` | ✅; 🔧 bevel buttons, see 13.4 |
| "Unavailable Appearance" (pp.306–307, Figures 13.16–13.19) | An engraved label: the label in button highlight overlaid at a small offset by the label in button shadow; a set but unavailable check box or option button shows its mark in button shadow; a set and unavailable graphical button omits the checkerboard. | `b.disabled-text` (GrayText with a 1-px ButtonHilight shadow) on every label, title and glyph (`embossed()` pixel art); checkbox and radio marks GrayText when disabled; `_Button.scss` `.classicyBevelButton.disabled.checked` | ✅; 🔧 disabled-set buttons, see 13.5 |
| "Input Focus Appearance" (p.308, Figure 13.20) | A blinking insertion point in text boxes; elsewhere a dotted outline around the control or its label, at least one pixel of space around the control. | `_TextField.scss` (caret WindowText, no ring); `b.focus-rect` on buttons (7.16), tabs, sliders, wells, swatches, list rows, the Control Strip; around the label on check boxes and radio buttons; the pop-up's band plus rectangle | ✅ |
| "Flat Appearance" (p.309, Figure 13.21) | Controls nested in a scrollable region use the flat style (`DFCS_FLAT`, `BF_FLAT`). | no bundled nested controls (the multiple-selection list's check boxes, 7.25, would be) | ➖ |
| "Layout" (p.309) | Left to right, top to bottom, the most important information at the upper left. | core dialog layouts; `_Dialog.scss` (button order) | ✅ |
| "Font and Size" (p.310, Figure 13.22) | MS Sans Serif 8-point for menu titles, items, control labels and all interface text; the title bar's text 8-point bold; check the system font setting. | `typography` (11 px, the stack `"Pixelated MS Sans Serif"`, `"MS Sans Serif"`, `"Microsoft Sans Serif"`, Tahoma, Arial); `_Window.scss` title bold; every partial `font-size: var(--ui-font-size)`; the size variants | ✅; 🔧 pop-up variants, see 13.1 |
| "Font and Size" (p.310) | The system's settings for title bar height, menu bar height, border width, title bar button height, icon title text, scroll bar height and width size the interface; use them for custom elements. | `measurements.window` (titleBarHeight 18, borderSize 1, scrollbarSize 16), `titleBar.buttonHeight` 14, `desktop.iconFontSize` 11, the knob families; the Fonts tab (14.1) | ✅ |
| "Font and Size" (pp.310–311, Figure 13.23) | A single-line control is 14 dialog base units (DBU) tall; 1 horizontal DBU = a quarter of the average character width, 1 vertical DBU = an eighth of the average character height (MS Sans Serif 8: 1.5 px and 1.625 px); Figure 13.23's spacing. | `pushButton.height` 23 (14 × 1.625 = 22.75), `button.minWidth` 75 (50 DBU), `field.height` 21, `popUp.height` 21, `tabControl.height` 21 (Windows' own 21-px edit, combo and tab) | ✅ |
| "Font and Size" (p.311) | A default menu item in bold; a default button with a bold outline; otherwise nonbold text, bold only to call attention or make a hierarchy. | `_Button.scss` `.default`; `_AppearanceManager.scss`, `_Placard.scss`, `_Alert.scss` (plain weights); core ClassicyMenuItem `isDefault`, `_Menu.scss` `.classicyMenuItem.default > p` bold | ✅ button; 🔧 residual bold, see 13.2; 🔧 menu item 7.14 |
| "Font and Size" (p.311) | Secondary windows at most 234 × 263 DBU, 415 × 452 px. | `windows98.json` `measurements.dialog` (`alertMaxWidth` 415, `inputMaxWidth` 415 over the core floor's 460; `keyboardEquivalentMaxWidth` stays the floor's 420) | 🔧 see 8.10 |
| "Font and Size" (p.311) | Toolbar buttons 24 × 22 px including the border at VGA, the glyph 16 × 16 centered on the face; a tooltip names an unlabeled button. | `_Button.scss` toolbar sizes (7.22); tooltips 7.28 | ✅ sizes; 🔧 tooltips 7.28 |
| "Capitalization" (p.312) | Title capitalization for commands and buttons; sentence-style for field labels (option buttons, check boxes, text boxes, group boxes, tabs). | the package's own strings: knob labels ("Button width", "Close button gap", "Label shadow"), color labels ("Active gradient", "Icon label text"), the theme names; app content is the core's | ✅ |
| "Grouping and Spacing" (p.312) | At least 3 DBU between controls; 7 DBU from the window's edge; a toolbar's controls a border width from its edges; buttons of an exclusive set adjacent. | `layout.itemGap` 4 (3 DBU horizontal, 4.5 px), `control.labelGap` 5 (3 DBU vertical, 4.9 px), `layout.dialogEdge` 11 (7 DBU: 10.5 and 11.4 px), `layout.groupGap` 12; `_ControlStrip.scss` cells abutting in one frame | ✅ |
| "Alignment" (p.312) | Align fields by their left edges; labels above or to the left, a left label aligned with the box's text. | core forms and dialogs; `_TextField.scss` labels | ✅ |
| "Button Placement" (pp.312–313, Figure 13.24) | Buttons stacked at the upper right or in a row along the bottom; the default first; OK and Cancel together; Help last; consistent lengths. | `_Dialog.scss` `button-row`, `_Alert.scss`; `button.minWidth` 75 | ✅ |
| "Design of Graphic Images" (pp.313–314, Figure 13.25) | Nouns; black and white first; light from the upper left; no anti-aliasing on an icon's outer edge; avoid letters. | the package's glyphs are one-pixel rectangles on the `--pixel-unit` grid (`_pixel.scss`), never anti-aliased; the only letter is the help button's "?", the caption glyph Windows itself drew | ✅ |
| "Icon Design" (pp.314–316, Figures 13.26–13.29) | Icons in 16, 32 and 48 px; document icons distinct from the application's; black outlines eliminated; small icons like their large ones. | `desktop.iconSize` 32, `--icon-small-size` 16; `_Desktop.scss` and `_Icon.scss` remove the base's black outline through the outer mask (Platinum's); the pictures Platinum's | ✅ geometry; ➖ pictures |
| "Pointer Design" (pp.316–317, Figure 13.30) | Pointer changes conservatively, hot spots, the I-beam for text, the hourglass only where the window is busy. | the asset registry's cursors (Platinum's) | ➖ |
| "Highlighting" (p.318, Figure 13.31) | The system highlight color for a selection, shown on mouse down; only in the active window or pane. | Hilight/HilightText everywhere (`--color-highlight`, `--package-color-selection-text`); the 50 % Hilight dither over a selected icon (ImageList's ILD_BLEND50); inactive windows 6.4 | ✅ color; 🔧 inactive, see 13.8 (= 6.4) |
| "Highlighting" (p.319) | A secondary selection outlined in the highlight color; a list box's highlighted setting paired with a focus indication. | `_ListBox.scss`, `_Table.scss`, `_Dialog.scss` (the dotted rectangle in HilightText on the selected row or name; 14.2 on an unselected list) | ✅ |
| "Handles" (pp.319–320, Figure 13.32) | Solid square handles, HighlightText border with a Highlight fill (hollow: reversed), sized from the window border and edge metrics. | `_HyperCard.scss` `.classicyHyperCardEditorHandle` (a Hilight fill inside a one-ring HilightText border on the core's `--hyper-card-handle-size` 6 box) | 🔧 see 13.10 |
| "Transfer Appearance" (p.320, Figure 13.33) | A translucent or outline representation of the dragged object moves with the pointer; the destination defines the presentation. | core file drag (`drawClassicyDragOutline`: a dotted outline of the icon's shape and label box); drop targets drawn selected (`_Desktop.scss`, `_Icon.scss`) | ✅ |
| "Open Appearance" (pp.320–321, Figure 13.34) | An opened OLE object hatched every four pixels. | no OLE; `_Desktop.scss`/`_Icon.scss` mark no opened icon (Windows marked none; the base's inverted open icon is the Mac's) | ➖ (✅ no Mac open mark) |
| "Animation" (p.321) | Fluid at 16 fps or more; interruptible; avoid gratuitous use; offer a way to turn it off. | `_ProgressBar.scss` indeterminate slide (whole-pixel steps, one period a second; `prefers-reduced-motion`); the core pauses screen savers the same way | 🔧 see 13.6 |

### Findings — Chapter 13

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 13.1 | LOW | The pop-up menu's size variants used the base's smaller and larger faces (`--ui-font-size-small`, `--ui-font-size-xlarge`); interface text is one size, the 8-point system font the pixel face is cut for. | `_PopUpMenu.scss` (`.classicyPopUpMenuSizeSmall`, `-Large`) | 🔧 Fixed |
| 13.2 | LOW | The color picker's field labels (Red, Green, Blue and the rest) and the pager's page number were bold (the base's); interface text is nonbold but to call attention or make a hierarchy. | `_AppearanceManager.scss`, `_Placard.scss` | 🔧 Fixed |
| 13.3 | LOW | The read-only output well was Window white inside its edge; Windows paints a read-only text box's interior ButtonFace (ES_READONLY, the button-down border style the WIG gives read-only areas). | `_TextField.scss` (`.classicyOutputInset`) | 🔧 Fixed |
| 13.4 | LOW | A mixed bevel button was drawn sunken with its content stepped, like a set one; Figure 13.15 draws the mixed button raised with the checkerboard on its face and only the set button sunken. | `_Button.scss` (`$down`, `.classicyBevelButton.mixed`) | 🔧 Fixed |
| 13.5 | LOW | A disabled latched bevel button kept the checkerboard; Figure 13.19 omits it and embosses the label. A disabled mixed button is the plain disabled one. | `_Button.scss` (`.classicyBevelButton.disabled.checked`) | 🔧 Fixed |
| 13.6 | LOW | Under `prefers-reduced-motion` the indeterminate progress bar only slowed its slide (3 s a period); the WIG asks for a way to turn animation off. | `_ProgressBar.scss` | 🔧 Fixed |
| 13.7 | LOW | A set image well showed a dotted WindowText rectangle two rings inside its edge (the focus rectangle's look); Figure 13.13's set-value border is solid, in the text color and the button highlight. | `_Icon.scss` (`.classicyImageWell.selected`) | 🔧 Fixed (image well); ➖ swatches (no set state) |
| 13.8 | LOW | Selections stay highlighted in inactive windows and panes. Same as 6.4. | core ListBox/Table/Tree | 🔧 Fixed (3ed578659) |
| 13.9 | LOW | No menu item could be bold as the default command. Same as 7.14. | core ClassicyMenuItem; `_Menu.scss` | 🔧 Fixed (core hook `isDefault`, = 7.14) |
| 13.10 | LOW | The HyperCard editor's selection handles drew as the core's base sheet draws them (a solid black square); the package had no rule making them HighlightText-bordered Highlight squares sized from `--window-border-size`. | `_HyperCard.scss` (`.classicyHyperCardEditorHandle`) | 🔧 Fixed |

**Details & fixes**

- **13.1** 🔧 (`packages/appearance/windows98/src/styles/components/_PopUpMenu.scss`):
  `.classicyPopUpMenuSizeSmall`, `-Medium` and `-Large` all set `font-size:
  var(--ui-font-size)` (the large one still grows to its text, `min-height`
  the field's); the header records that every variant is one size, as the push
  button's small variant already gave way in `_Button.scss`. _WIG Ch.13 "Font and
  Size" (p.310)._
- **13.2** 🔧 (`_AppearanceManager.scss`, `_Placard.scss`):
  `.classicyColorPickerWheelField .classicyControlLabel { font-weight: normal }`
  (the Color dialog's Hue, Sat, Lum, Red, Green and Blue are plain) and
  `.classicyPagerPage { font-weight: normal }`; both headers cite the rule.
  _WIG Ch.13 "Font and Size" (p.311)._
- **13.3** 🔧 (`_TextField.scss`): the `client-edge` mixin takes a `$ground`
  (default `b.$window`) and `.classicyOutputInset` includes `client-edge(b.$face)`,
  so the inset result well is WindowText on ButtonFace inside the same sunken
  edge; the header's color table lists the read-only well under ButtonFace and
  notes that no input in the package passes `readOnly`. _WIG Ch.13 "Button Border
  Styles" (p.301); "Flat Appearance" (p.309), Figure 13.21's read-only text box._
- **13.4** 🔧 (`_Button.scss`): `$down` is `:is(:active, .pressed, .checked,
  .open)` (mixed removed), so a mixed bevel button keeps its raised rings (or a
  toolbar's flat face) and its content in place while
  `.classicyBevelButton:not(.disabled):is(.checked, .mixed, .open) { background:
  $checker }` draws the checkerboard; a toolbar's mixed button keeps the flat
  face under its checker. _WIG Ch.13 "Mixed-Value Appearance" (p.306), Figure
  13.15; "Option-Set Appearance" (pp.304–305), Figure 13.12._
- **13.5** 🔧 (`_Button.scss`): `.classicyBevelButton.disabled.checked { @include
  b.pressed }` with no checker (was `.disabled:is(.checked, .mixed)` with
  `$checker`), the label embossed by the `.disabled` rule; a toolbar's disabled
  latched button keeps its one sunken ring without the checker; a disabled mixed
  button is the plain disabled one. _WIG Ch.13 "Unavailable Appearance"
  (pp.306–307), Figure 13.19._
- **13.6** 🔧 (`_ProgressBar.scss`): `@media (prefers-reduced-motion: reduce)`
  sets `animation: none` on the indeterminate bar's value parts (was
  `animation-duration: 3s`), so the blocks stand still; the header cites the rule
  and the core's screen-saver pause as the precedent. _WIG Ch.13 "Animation"
  (p.321)._
- ✅ "Basic Border Styles" (pp.299–300): `_bevels.scss` builds every edge from
  inset box-shadows of five tokens, one ring each: `raised` (ButtonHilight,
  ButtonLight / ButtonDkShadow, ButtonShadow: the button style), `pressed` (the
  reverse), `pressed-flat` (one ring of ButtonShadow: a pushed scroll button),
  `sunken` (the field style: ButtonShadow, ButtonDkShadow / ButtonHilight,
  ButtonLight), `window-frame` (ButtonLight, ButtonHilight / ButtonDkShadow,
  ButtonShadow: the window style), `etched` (the grouping style), `raised-thin`
  (one ring, the status style reversed) and `disabled-text`; Windows 98's
  scroll-arrow buttons take the button style (`DrawFrameControl`'s `BF_SOFT`,
  which 98.css reproduces), where the 1995 text names the window style for them:
  the OS as shipped is matched.
- ✅ "Pressed", "Option-Set", "Unavailable", "Input Focus" (pp.303–308): the
  check box's and radio button's inside turns ButtonFace while pressed and shows
  its mark in GrayText when disabled; a latched bevel button, an open Control
  Strip module and the pressed taskbar buttons take the ButtonFace/ButtonHilight
  checker on the pixel grid; every disabled label, title, caption and glyph is
  GrayText over a ButtonHilight copy one pixel down and right (`disabled-text`,
  `embossed()`); the dotted rectangle is `focus-rect($inset)` (one ring,
  `--window-border-size`, dotted WindowText), around the label of a check box or
  radio button, inside the bevel of a button, tab, well, swatch or Control Strip
  cell, in HilightText on a selected list row.
- ✅ "Font and Size" (pp.310–311): the three typography sizes are 11 px (MS
  Sans Serif 8 at 96 dpi), the title bold; the single-line controls stand at
  Windows' own 21 px (edit, combo box, tab), the push button at 23 (14 DBU);
  `button.minWidth` 75 is the 50-DBU button of Figure 13.23's layout; the
  Fonts tab's larger sizes carry the controls with them (14.1).
- ✅ "Grouping and Spacing", "Button Placement" (pp.312–313): `layout.itemGap`
  4 and `control.labelGap` 5 are 3 DBU across and down, `layout.dialogEdge` 11
  is 7 DBU, `layout.groupGap` 12; `button-row` puts the default first, OK and
  Cancel together and Help last; buttons share `--button-min-width`.
- ✅ "Icon Design" (p.316): the desktop's and the icon view's mask pair is
  exactly the icon's box, with no fringe, so the base's black outline through
  the outer mask (Platinum's, the Windows 3.1 style the WIG retired) is gone;
  a selected icon is blended with the 50 % Hilight dither clipped by its own
  mask and a pre-rendered selected image (`registerClassicySelectedIconImages`)
  takes no layer.
- ✅ "Transfer Appearance" (p.320): `startClassicyFileDrag`'s ghost is the 1-px
  dotted outline of the icon's opaque shape and its label box, moving with the
  pointer; folder targets under the drag are drawn selected as the shell
  highlighted a drop target.
- **13.7** 🔧 (`_Icon.scss`; a2c1d339d, 557289452): a set well
  (`:where(.classicyImageWell).selected`) wears the option-set border, two
  solid rings just inside the client edge, WindowText outside ButtonHilight, in
  place of the dotted rectangle: an `::after` overlay (`inset: b.$b2`,
  `pointer-events: none`, `box-shadow: inset 0 0 0 b.$b b.$text, inset 0 0 0
  b.$b2 b.$hilight`) on a now `position: relative` well, not more rings of the
  well's own inset shadow as first sketched here, since a well is sized to its
  picture, which is painted over the well's shadows, so rings under it would
  never show. The `.selected` rule itself stays, as `outline: none`: the base
  draws a set well's accent frame as a solid two-pixel `--color-outline`
  outline, which showed around the sunken edge beside the rings once the dotted
  rule was dropped (the review's one regression, 557289452); the compiled-sheet
  test pins the overlay, its two tokens, the cleared outline and no dotted
  line. The well takes no keyboard focus (it is a frame, not a button), so
  there is no focus rectangle to keep, and the Appearance Manager's swatches
  have no set state to draw a border on (the Colors tab's swatch is a button
  that opens the picker; the Packages tab's carries no `selected`), so their
  rule stands, the dotted rectangle on `:focus-visible` alone. _WIG Ch.7
  "Wells" (p.133); Ch.13 "Option-Set Appearance" (p.305), Figure 13.13._
- **13.10** 🔧 (`packages/appearance/windows98/src/styles/components/_HyperCard.scss`,
  new, included by `src/styles/windows98.scss` after the Control Strip;
  a2c1d339d): `.classicyHyperCardEditorHandle { background: b.$highlight;
  box-shadow: inset 0 0 0 b.$b b.$highlight-text }` draws the editor's
  selection handles as Hilight squares inside a one-ring
  (`--window-border-size`) HilightText border on the base's
  `--hyper-card-handle-size` box, in place of the base's solid black (checked
  against the base sheet first: a plain `--color-black` square the package can
  restyle without a core change); the hollow variant is described in the
  comment only, since the editor draws no selection-only handle. The
  compiled-sheet test pins the selector and both declarations. _WIG Ch.13
  "Handles" (pp.319–320), Figure 13.32._

---

## Chapter 14 — Special Design Considerations; Appendix C — Guidelines Summary

Pages read: PDF 310–327 (pp.327–344) and 341–346 (pp.361–366). Ch.14 is mostly
behavior and process (sound, accessibility aids, internationalization, network,
records, telephony, Exchange); the rules a package can meet are scalability
with the user's font, system colors, visible keyboard focus, time-outs and
color as a secondary cue. Appendix C is the whole guide's checklist; its rows
are mapped to the sections above.

Normative checklist (WIG Ch.14) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| "Sound" (p.327) | Sound as a redundant cue; let the user customize it; support the system volume interface; ShowSounds captioning. | core Sound control (Control Strip), the Sound control panel; the package's pack is four alert tones and the beep, no interface feedback | ✅; ➖ ShowSounds |
| "Accessibility" / "Visual Disabilities" (p.328) | Support larger text and graphics through the system's scalable fonts and controls. | the Fonts tab; `_TextField.scss`, `_Dialog.scss`, `_PopUpMenu.scss`, `_ControlGroup.scss` | 🔧 see 14.1 |
| "Visual Disabilities" (p.329) | Color as an additive property, never the only means. | disabled = GrayText and emboss; selected = Hilight and HilightText and the focus rectangle; a meter's zones | ✅; 🔧 meter zones, see 14.5 |
| "Hearing Disabilities" (p.329) | No information by sound alone. | alerts carry their message; the package plays no feedback sounds | ✅ |
| "Physical Movement Disabilities" (p.329) | Good keyboard and mouse interfaces. | core (the keyboard gaps 7.7, 7.9 and 7.26, all fixed) | 🔧 see Ch.7 |
| "Seizure Disorders" (p.329) | Base modulating interfaces on the cursor blink rate or make the rate configurable. | the browser's caret; the indeterminate progress slide (one period a second, off under reduced motion, 13.6) | ✅ |
| "Compatibility with Screen Review Utilities" / "Controls" (pp.330–331) | Standard controls; a label for every control, placed before it, ending in a colon; text for choices shown as colors or widths. | core (native controls, `ClassicyControlLabel`, the color picker's named fields) | ✅ structure |
| "Text Output" / "Graphics Output" (p.332) | Text as text, not bitmaps; separable graphic components. | the package's glyphs are CSS layers on real elements; titles and labels are text | ✅ |
| "Icons and Windows" (p.333) | Icons with a text label in the system font and color, placed as the system places it; every window titled. | `_Desktop.scss`, `_Icon.scss` (UI font, the desktop text and WindowText colors, centered below); core window titles | ✅ |
| "The User's Point of Focus" (p.333) | Accessibility aids follow the input focus; place it with standard functions and keep it indicated. | `_Table.scss` (the focus item), every `:focus-visible` rectangle | 🔧 see 14.2 |
| "Timing and Navigational Interfaces" (p.333) | No critical feedback removed on a timer; time-out interfaces configurable; nothing shown or hidden by pointer movement but standard tooltips; navigation never triggers actions. | core (the 15-s menu idle close, 7.6; the screen saver's 1–240 min; balloon delay 600 ms) | 🔧 see 14.4 (= 7.6) |
| "Color" (pp.333–334) | Base colors on the system colors; pair foregrounds with their backgrounds (button text on button face). | every partial's color table pairs WindowText/Window, ButtonText/ButtonFace, HilightText/Hilight, InfoText/InfoWindow, TitleText/ActiveTitle | ✅ |
| "Color" (p.334) | Check High Contrast Mode and adjust colors; hide images behind text. | none (no `forced-colors` or `prefers-contrast` rule; no High Contrast preset) | 🔧 see 14.3 |
| "Scalability" (p.334) | Scale elements from the system's font and size metrics; the system's own components scale. | `measurements` knobs and `typography`; the field heights (14.1) | 🔧 see 14.1 |
| "Keyboard and Mouse Interface" (pp.334–335) | Follow the keyboard conventions; basic functions by single click, not only by double-click, drag or modified clicks. | core | see Ch.7 |
| "Documentation, Packaging, and Support", "Usability Testing" (p.335) | Process. | none | ➖ |
| "Internationalization" / "Text" (pp.336–337) | Allow 30 % text expansion in dialogs, 100 % in message boxes; never rely on text position. | buttons grow from `button.minWidth` 75 with `textPadding` 12; alerts wrap within `--dialog-alert-max-width`; the menu's shortcut column is computed (7.3) | ✅ |
| "Graphics" (p.337) | Generic images and glyphs. | the package's glyphs: triangles, check, X, boxes, the "?" | ✅ |
| "Keyboards" (p.337) | No punctuation keys as shortcuts; no CTRL+ALT combinations. | core bundled chords (Control and Option with letters, Backspace, Delete) | ✅ |
| "Character Sets", "Formats" (pp.338–339) | System interfaces for character sets and locale formats. | core Date & Time manager (the browser's locale) | ✅ |
| "Layout" (p.340) | Reverse the presentation for right-to-left languages; room for diacritics; nothing in the title bar area. | the package lays everything out physically (left and right, `order`); the title bar carries nothing (Ch.6) | ➖ RTL (no RTL locale in Classicy); ✅ title bar |
| "Network Computing", "Records Processing", "Telephony", "Microsoft Exchange" (pp.340–344) | Platform integration. | none | ➖ |

Appendix C, "Guidelines Summary" (pp.361–366), mapped to this audit:

| App. C section (page) | Item | Where covered | Status |
| --- | --- | --- | --- |
| "Input and Interaction" (p.362) | Visual feedback for selected objects (highlighting, handles); keyboard interface for all basic operations; single-click access to common operations. | Ch.13 "Highlighting", 13.10; Ch.7 7.7, 7.9, 7.26 | ✅ highlighting; 🔧 handles, see 13.10; 🔧 keyboard, see 7.7, 7.9, 7.26 |
| "Windows" (p.362) | Title text for all windows; saves and restores window state; adjusts size and position to the screen; uses common dialog boxes; modeless where possible; the appropriate message symbol; a brief statement of the problem in message boxes. | Ch.6 "Opening and Closing Windows"; Ch.8 8.4, 8.5, 8.11; message types | ✅; 🔧 8.11 |
| "Windows" (p.363) | Property pages for peer properties; buttons that apply to the page inside it, to the window outside it. | Ch.8 "Property Sheet Commands" (inspector model) | ✅ |
| "Controls" (p.363) | System-supplied controls; a pop-up menu for the title bar icon and for the window; the menu glyph (triangular arrow) for cascades, drop-down arrows and scroll arrows; pop-up menus by button 2 and SHIFT+F10, displayed on the button's release; the order of pop-up commands; toolbars user-configurable; custom controls consistent with the system's. | 6.2, 6.3, 7.9, 7.10; `_Menu.scss`, `_PopUpMenu.scss`, `_ScrollBar.scss` triangles; the Control Strip control panel | ✅ glyphs, toolbars; 🔧 menus 6.2, 6.3, 7.9 |
| "Integrating with the System" (p.363) | Registry, file types, icons in 16, 32 and 48 px, the taskbar for notification, OLE. | ➖ (no Windows registry, taskbar or OLE; icons Platinum's) | ➖ |
| "User Assistance" (p.364) | Context-sensitive Help; tooltips for all unlabeled controls, particularly in toolbars. | 7.28 | 🔧 7.28 |
| "Visual Design" (p.365) | Color only as an enhancing, secondary form of information; a limited set of colors; system metrics for all display elements; standard border styles; the appropriate appearance for every control state; a light source from the upper left; the layout and font guidelines; correct capitalization. | Ch.13 throughout; 13.1–13.7, 13.9 and 13.10 fixed | ✅ |
| "Sound" (p.365) | Audio for secondary cues; the system volume interface; ShowSounds. | Ch.14 "Sound" | ✅; ➖ ShowSounds |
| "Accessibility" (p.365) | Labels for all controls, icons and windows; indicates keyboard focus; standard text functions; avoids time-out interaction or makes it configurable; avoids triggering actions on navigation; supports scaling; supports High Contrast Mode; tests with accessibility aids. | 14.1, 14.2, 14.3, 14.4 | 🔧 14.1, 14.2; 🔧 14.3, 14.4 |
| "International Users" (pp.365–366) | Space for expansion; no punctuation shortcut keys; local formats; layout per reading conventions; references to unsupported features adjusted. | Ch.14 "Text", "Keyboards", "Formats", "Layout" | ✅; ➖ RTL |
| "Network Users" (p.366) | System naming conventions; shared access. | ➖ | ➖ |

### Findings — Chapter 14 and Appendix C

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| 14.1 | LOW | The single-line fields (edit control, stepper field, output well, the pickers), the hot-key box, the pop-up menu's field and the group box's legend line box were fixed at their knobs (21 px, 12 px); a larger UI font set in the Fonts tab clipped their text or broke the legend's strip, where Windows sizes every control from the system font. | `_TextField.scss`, `_Dialog.scss`, `_PopUpMenu.scss`, `_ControlGroup.scss`, `windows98.json` | 🔧 Fixed |
| 14.2 | LOW | A focused list with nothing selected showed no focus item; Windows' list view keeps its focus rectangle on the first item until one is selected (the row Down Arrow and Home select). | `_Table.scss`; core ClassicyTable | 🔧 Fixed |
| 14.3 | LOW | No High Contrast handling: no `forced-colors`/`prefers-contrast` rule and none of Windows 98's four High Contrast schemes among the presets. | `windows98.json`, `windows98.scss` | 🔧 Fixed (376c49cb5) |
| 14.4 | LOW | An open menu closes itself after 15 s, a time-out the user cannot configure. Same as 7.6. | core ClassicyMenuProvider | 🔧 Fixed (08d728581) |
| 14.5 | LOW | A meter tells its warning zones by block color alone (Hilight against `--color-alert`/`--color-error`), with no pattern or text. | `_ProgressBar.scss` (meter); core ClassicyMeter | 🔧 Fixed (3ed578659) |

**Details & fixes**

- **14.1** 🔧 (`packages/appearance/windows98/src/styles/components/_TextField.scss`,
  `_Dialog.scss`, `_PopUpMenu.scss`, `_ControlGroup.scss`;
  `packages/appearance/windows98/src/windows98.json`, `README.md`,
  `docs/AGENT-REFERENCE.md`): `_TextField.scss` defines `$field-height:
  max(var(--field-height), calc(var(--ui-font-size) + 2 × var(--field-padding-y)
  + 2 × b.$b2))` (11 + 3 + 3 + 2 + 2 = 21 at the default: the knob's own figure)
  and `$field-line` (the line left inside the inset, 15), used by the edit
  control, the stepper's field, the output well and the date and time pickers;
  `_Dialog.scss` repeats the pair for the hot-key box; `_PopUpMenu.scss` sets
  `$field-height: max(var(--pop-up-height), calc(var(--ui-font-size) + 2 × b.$b2
  + 2 × b.$b + 2 × b.$b2))` (the value's band in its two rings of padding, the
  pixel it stands inside the bevel, the bevel's two rings: 11 + 4 + 2 + 4 = 21)
  for the field and the large variant's `min-height`; `_ControlGroup.scss`'s
  legend is `line-height: calc(var(--ui-font-size) + #{$px})` (12 at the default,
  even, so the pixel font lands on whole pixels) instead of `px(12)`. The
  pop-up's height became an Options-tab knob, `knobs.popUp.height` (16–40,
  default 21), beside `field.height`; the README's knob bullet and the agent
  reference's knob list name it. The knob keeps the Windows metric at the stock
  font; only a font the knob no longer holds raises the control. _WIG Ch.14
  "Scalability" (p.334), "Visual Disabilities" (p.328); Ch.13 "Font and Size"
  (p.310)._
- **14.2** 🔧 (`_Table.scss`; core ClassicyTable): the core's ClassicyTable now
  emits the vocabulary state `focused` on its focus row, Windows' focus item and
  the Mac list's cursor: the row the keyboard continues from while it is listed,
  else the first selected row, else the first row, whether or not the list has
  focus (`ClassicyTable.tsx`, commit 01758bd05; "Core changes made in this pass"
  below). The package gates it under the list's `:focus`: `#{$list}:focus
  :where(.classicyTableRow).focused { @include b.focus-rect(b.$b) }` rings that
  row in WindowText on a white row, `.focused.selected` in HilightText, and the
  Finder's list rings the `focused` row's name alone
  (`.classicyFileBrowserViewTableRowIconLabel`), as Explorer's details view keeps
  its focus item; with nothing selected that is the first row, so a focused list
  always shows one. No `:has()`, so the rule holds in every browser of the
  floor. _WIG Ch.14 "The User's Point of Focus" (p.333); App. C "Accessibility"
  (p.365)._
- ✅ "Color" (pp.333–334): every partial's header carries its Windows-color
  table, pairing each foreground with the background Windows pairs it with
  (WindowText on Window, ButtonText on ButtonFace, HilightText on Hilight,
  InfoText on InfoWindow, TitleText on ActiveTitle, GrayText with its
  ButtonHilight emboss), and the literal-color sweep and the varCoverage test
  keep every value a token, so a scheme change in the Colors tab recolors the
  whole look.
- ✅ "Icons and Windows" (p.333): desktop and window icon labels are the UI font
  (MS Sans Serif 8's stack at 11 px) in the desktop text color or WindowText,
  centered beneath the picture as the shell places them.
- ✅ "Text" (pp.336–337): a push button is `min-width` 75 with 12 px of text
  padding and grows with its label; an alert's message wraps within
  `--dialog-alert-max-width`; the menu's shortcut column is laid from the longest
  title (7.3), so no label position is assumed.
- **14.3** ⚠️ product decision: (a) a `@media (forced-colors: active)` block in
  `windows98.scss` mapping the package's tokens to the system colors
  (`CanvasText`, `Canvas`, `ButtonText`, `ButtonFace`, `Highlight`,
  `HighlightText`, `GrayText`) and hiding the images behind text (the Desktop
  tab's preview, the About box's banner), and/or (b) Windows 98's four High
  Contrast schemes (High Contrast #1, #2, Black, White) as presets, read from
  their `[Control Panel\Colors]` blocks like the sixteen classic schemes. The
  core has no contrast rule of its own either. _WIG Ch.14 "Color" (p.334); App. C
  "Accessibility" (p.365)._
- **14.4** ⚠️ core layout flag: 7.6's `layout.menuBar.idleTimeoutMs`, which also
  makes the time-out configurable per package. _WIG Ch.14 "Timing and
  Navigational Interfaces" (p.333)._
- **14.5** ⚠️ core/product: ClassicyMeter exposes its zone as a state class or
  part (`warning`, `critical`) so a package can add a pattern (a diagonal
  hatch of the zone color over the blocks) or the core adds an optional text
  readout; the Mac meter has the same gap. _WIG Ch.14 "Visual Disabilities"
  (p.329); Ch.13 "Color" (p.296)._

---

## Appendix A — Mouse Interface Summary

Pages read: PDF 329–336 as text and PDF 329 as an image. The opener prints a
stale "261", lower than Ch.14's p.327, so the folio is taken from the next
openers: Appendix B's PDF 337 prints 357 and Appendix C's PDF 341 prints 361,
both printed page = PDF + 20, which puts Appendix A at PDF 329–336 = pp.349–356
(Table A.1 pp.349–350, Table A.2 pp.351–353, Table A.3 pp.354–356). The tables
summarize the mouse rules of Ch.4 and Ch.5 per object, white space and modifier,
so most findings here are Ch.5's under the same layout flags (5.5–5.11, 5.33,
5.34); only the button-2 white-space menus (A.4), the modified double-click
(A.9) and the taskbar's objects (A.10) are new.

Normative checklist (WIG Appendix A) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| Table A.1 (pp.349–350), the desktop | A press on an unselected object selects it alone, either button; on a selected one changes nothing; on white space clears and starts a region; a click on a selected object may collapse to it (note 2); a double-click runs the default. | ClassicyDesktopIcon `startDrag`, `clickFocus`, `launchIcon`; ClassicyDesktop `startSelectBox`, `resizeSelectBox` | ✅ |
| Table A.1 (pp.349–350), Tables A.2 and A.3 (pp.351–356), an icon view | The same in a folder window, with SHIFT extending from the anchor, CTRL toggling, and a drag carrying the whole selection. | core ClassicyIcon (`toggleFocus` on click), ClassicyFileBrowserViewIcons; Select All disabled in icon view (`Finder.tsx` l.207–218) | 🔧 see A.1 (= 5.8, 5.12) |
| Table A.1 (p.349, "Press"; "Drag. Unselected object") | The press selects with feedback at the button-down; dragging an unselected object selects it first. | core ClassicyListBox, ClassicyTable, ClassicyTree (`onClick`); the list view's `startRowDrag` | 🔧 see A.2 (= 5.5) |
| Table A.1 (p.349, "Press" and "Click" with button 2) | Button 2 on an unselected object selects it and shows its menu; on a selected one keeps the selection. | core ClassicyFileBrowser `onContextMenu`, ClassicyIcon (`e.button !== 0`), ClassicyTable rows; desktop icons ✅ | 🔧 see A.3 (= 5.6) |
| Table A.1 (pp.349–350) and note 3 (p.350) | Button 2 on white space clears and starts a region; its click shows the white space's own menu (Select All, Arrange, View, Paste, Properties). | core ClassicyDesktop (`startSelectBox` opens the menu on the button-2 mousedown, keeping the selection; `defaultMenuItems` is the menu bar's cascade); Finder folder windows (no `contextMenu`) | 🔧 see A.4 |
| Table A.1 (pp.349–350, "Drag" with button 2) | A button-2 drag shows the transfer menu at the destination. | core drag sources (button 0 only); a non-file desktop icon moves under any button | 🔧 see A.5 (= 5.33) |
| Table A.1 (p.350, "Double-click" with button 2) | A button-2 double-click runs Properties. | none (browsers raise `dblclick` for button 1 only; Properties is 2.2) | ➖ |
| Table A.2 (pp.351–353) | SHIFT+click or SHIFT+press extends from the anchor and keeps it; the range takes the anchor's state (note 2). | `ClassicyListBox.tsx` l.163–174, `ClassicyTable.tsx` l.417–425 | ✅ |
| Tables A.2 (pp.351–353) and A.3 (pp.354–356) | SHIFT+click on an icon extends from the anchor; CTRL+click toggles; CTRL+press resets the anchor. | core ClassicyDesktopIcon (no modifier read), `ClassicyDesktopIconContext.tsx` l.356–361 | 🔧 see A.6 (= 5.10) |
| Table A.3 (p.354, "CTRL+Click") and note 1 (p.356) | CTRL+click toggles and resets the anchor. | `ClassicyListBox.tsx` l.175–186, `ClassicyTable.tsx` l.427–436 | ✅ |
| Table A.2 (p.351, SHIFT+Press on white space); Table A.3 (pp.354–355) and note 4 (p.356) | SHIFT+press on white space extends; CTRL+press starts a disjoint region toggling what it covers to the first object's state. | core ClassicyDesktop `startSelectBox` (always clears), `resizeSelectBox` (replaces) | 🔧 see A.7 (= 5.11) |
| Table A.3 (p.355, "CTRL+Drag") and notes 2–3 (p.356) | CTRL+drag copies; releasing CTRL before the button reverts to the default transfer. | core `ClassicyFileDrag.ts` (move only, no modifier), `fs` (no copy) | 🔧 see A.8 (= 5.34) |
| Table A.2 (pp.352–353, SHIFT+Double-click); Table A.3 (p.356, CTRL+Double-click) | A modified double-click adjusts the selection, then runs the default command on the whole set. | core ClassicyTable (`onActivateRow`, l.739), ClassicyListBox (l.278), the Finder's views | 🔧 see A.9 |
| Table A.1 (pp.349–350); Ch.3 "The Taskbar" (p.15) | Every taskbar object follows the mouse table: button 2 shows its menu at the release, a double-click runs its default. | the coming taskbar, Start button, task buttons and tray | ⚠️ see A.10 (shell) |

### Findings — Appendix A

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| A.1 | MEDIUM | In the icon view each click toggles one icon, white space clears nothing, there is no selection rectangle, modifiers are ignored, a drag carries only the pressed icon, and Select All is disabled. Same as 5.8 and 5.12. | core ClassicyIcon, ClassicyFileBrowserViewIcons, ClassicyFileBrowser, Finder | 🔧 Fixed (cb7ffc984) |
| A.2 | LOW | Lists, tables and trees select at the release; a press-drag on an unselected list-view row moves it without selecting it. Same as 5.5. | core ClassicyListBox, ClassicyTable, ClassicyTree, ClassicyFileBrowserViewTable | 🔧 Fixed (27e4d9d61) |
| A.3 | LOW | A right-click on an unselected item in a Finder window acts on it without drawing it selected. Same as 5.6 (and 11.3). | core ClassicyFileBrowser, ClassicyIcon, ClassicyTable | 🔧 Fixed (be51df8bd) |
| A.4 | LOW | On the desktop a button-2 press opens the default menu at once and keeps the icon selection, and that menu is the menu bar's File/Edit/View/Special cascade; in a Finder window's white space button 2 shows nothing. | core ClassicyDesktop, Finder | 🔧 Fixed (c1ab2bf24, 3a30ada87) |
| A.5 | LOW | File drags start on button 0 only, so a button-2 drag does nothing, while a non-file desktop icon moves under any button. Same as 5.33 (and 4.10 for the icon). | core drag sources | 🔧 Fixed (37d580c6d) |
| A.6 | LOW | A modified click on a desktop icon selects it alone. Same as 5.10. | core ClassicyDesktopIcon | 🔧 Fixed (d4a23b190) |
| A.7 | LOW | Every rectangle clears the selection, then replaces it with what it covers. Same as 5.11. | core ClassicyDesktop | 🔧 Fixed (d4a23b190, 3a30ada87) |
| A.8 | LOW | Every file drag moves; there is no copy and no modifier read at the release. Same as 5.34. | core `ClassicyFileDrag.ts`, `ClassicyFileSystem.ts` | 🔧 Fixed (37d580c6d) |
| A.9 | LOW | A double-click activates only the row under the pointer, after its two clicks have already toggled or extended the selection; the default command never runs on the set. | core ClassicyTable, ClassicyListBox; Finder | 🔧 Fixed (27e4d9d61) |
| A.10 | MEDIUM | The taskbar's Start button, task buttons, tray and white space do not exist yet; today the screen bar stands in for the taskbar and the Control Strip for the tray. | the coming taskbar | 🔧 Fixed in part (11d0b9502, 22ca9cc74, b86689686); ⚠️ addendum B11 |

**Details & fixes**

- **A.1** ⚠️ core layout flags: same as 5.8 (`layout.fileBrowser.iconSelection:
  "view"`, which also gives the icon view `selectionApiRef.selectAll`) and 5.12
  (`layout.fileBrowser.regionSelect`). Platinum and System 7 keep today's
  toggling; a plain click collapsing the selection is also Mac OS 8's rule, a
  question for the Platinum audit. _WIG App. A Table A.1 (pp.349–350), Tables
  A.2 and A.3 (pp.351–356)._
- **A.2** ⚠️ core layout flag: same as 5.5 (`layout.selection.selectOn:
  "press"`), whose list-view rule selects an unselected row at the press before
  `startRowDrag` carries it. _WIG App. A Table A.1 (p.349)._
- **A.3** ⚠️ core layout flag: same as 5.6 (`layout.selection.secondaryButton:
  "select"`). _WIG App. A Table A.1 (p.349)._
- **A.4** ⚠️ core layout flags: (1) under 5.6's `secondaryButton: "select"`,
  `startSelectBox` treats button 2 as button 0 (clear, then the rectangle) and
  leaves the menu to the `contextmenu` event, opened at the release by 5.7's
  `openOn: "release"`; (2) under 1.21's `layout.finder.commands: "windows"`, the
  desktop's white-space menu lists its commands flat: Arrange Icons (by Name, by
  Type), Line Up Icons (Clean Up), Paste (5.28), New (5.40), Select All, and
  Properties (2.2: the Appearance control panel's Desktop tab), and Finder gives
  each folder window a `contextMenu` of its view's commands: View (as Icons, as
  List), Arrange Icons, Line Up Icons, Paste, New, Select All, Properties.
  Platinum and System 7 keep the menu bar's cascade. _WIG App. A Table A.1
  (pp.349–350) and note 3 (p.350)._
- **A.5** ⚠️ core layout flag: same as 5.33 (`layout.transfer.secondaryButton:
  "menu"`); the non-file icon's any-button move is 4.10's. _WIG App. A Table A.1
  (pp.349–350)._
- ✅ Tables A.2 (pp.351–353) and A.3 (p.354): in multiple-selection lists and
  tables, Shift+click selects from the anchor in visual order and keeps it,
  Shift+arrows extend the same way, and Ctrl (or Command) toggles the row and
  moves the anchor to it.
- **A.6** ⚠️ core layout flag: same as 5.10 (`ClassicyDesktopIconSelect`,
  `layout.selection.modifiers: "windows"`); Ctrl toggles at the click, not the
  press, so dragging a selected icon still carries the selection. _WIG App. A
  Tables A.2 (pp.351–353) and A.3 (pp.354–356)._
- **A.7** ⚠️ core layout flag: same as 5.11 (`keepIconSelection`, the union
  under Shift and the toggle under Ctrl, to the first covered icon's state per
  note 4). _WIG App. A Table A.2 (p.351); Table A.3 (pp.354–355) and note 4
  (p.356)._
- **A.8** ⚠️ core layout flag: same as 5.34 (`layout.transfer.copyModifier:
  "ctrl"`, read at the release per notes 2–3, with 5.28's `fs.copy` and the
  `data-classicy-drop="copy"` pointer). _WIG App. A Table A.3 (p.355) and notes
  2–3 (p.356)._
- **A.9** ⚠️ core layout flag (5.9's `layout.selection.modifiers: "windows"`):
  ClassicyTable and ClassicyListBox call a new optional
  `onActivateSelection(ids)` with the selection as it stands after the
  double-click's own clicks, falling back to `onActivateRow`, and Finder opens
  every selected item through it. _WIG App. A Table A.2 (pp.352–353); Table A.3
  (p.356)._
- **A.10** ⚠️ the Windows shell (plan 0020-w98, §2, §3, §5): requirements. Start
  button: button 2 shows its own menu. Task button: button 1 activates the
  window, or minimizes it if it is already active (Ch.3); button 2 shows the
  window's pop-up menu (7.10's Restore, Move, Size, Minimize, Maximize, Close,
  Close the bold default). The taskbar's white space: button 2 shows Cascade,
  Tile, Minimize All Windows, Properties (the plan keeps Minimize All Windows,
  Undo Minimize All and Properties, B.11; Cascade and Tile are out of its
  scope). Tray icon: button 2 shows its module's `menuItems` (10.16); a
  double-click runs its default (the clock opens Date & Time, Sound the volume
  control; 10.17). Each menu opens on the `contextmenu` event (the release on
  Windows, 5.43) and draws the pressed state at the press. _WIG App. A Table A.1
  (pp.349–350); Ch.3 "The Taskbar" (p.15)._

---

## Appendix B — Keyboard Interface Summary

Pages read: PDF 337–340, as text and as images (Table B.5's access-key
underlines are lost in the text extraction and were read from the image of PDF
340). The opener, PDF 337, prints 357, so printed page = PDF + 20: Table B.1 is
p.357, B.2 p.358, B.3 and B.4 p.359, B.5 p.360; the other running heads print
"359". Cross-reference: Ch.7 "The Help Menu" (PDF 109 = p.99). The tables
summarize the navigation keys, the shortcut keys (common, Windows-key and
accessibility) and the recommended access keys; most findings are therefore
earlier chapters' under the same flags (5.2, 5.17, 4.11, 4.12, 4.17, 2.2, 12.2),
and the shell's window keys are requirements on plan 0020-w98. Keys the OS or
the browser takes before the page (ALT+TAB, CTRL+TAB, the accessibility
sequences) are ➖ with that reason.

Normative checklist (WIG Appendix B) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| Table B.1 (p.357) | Each arrow key moves one unit. | native fields; `useListNavigation.ts`; ClassicyTable (l.473–495); ClassicyTabs (l.263–292); ClassicySlider (native range); ClassicyDesktop (`nearestIconInDirection`); ClassicySplitView (1 %); ClassicyScrollArea (`lineStep`) | ✅ |
| Table B.1 (p.357) | Up and Down Arrow move a unit or line in every control, menus and spin boxes included. | core ClassicyMenu (items `tabIndex={-1}`, 7.7), ClassicySpinner (7.26) | 🔧 see B.1 |
| Table B.1 (p.357) | HOME and END to the line's ends; CTRL+HOME and CTRL+END to the data's. | `useListNavigation.ts` (l.95–106, modifiers ignored, so the data's ends), ClassicyTable, ClassicyTabs, ClassicyScrollArea's focused root, native fields | ✅ |
| Table B.1 (p.357) | HOME and END move to the first and last item, on the desktop's icon view too. | core ClassicyDesktop `handleKeyDown` (l.390–445; arrows, Backspace, Delete, type-ahead only) | 🔧 see B.2 |
| Table B.1 (p.357) | PAGE UP and PAGE DOWN move a screen keeping the position; CTRL+arrow a larger unit. | `useListNavigation.ts` `handleNavKey`, ClassicyTable's switch, ClassicyTree (no Page keys; CTRL+Left/Right collapse and expand) | 🔧 see B.3 |
| Table B.1 (p.357) | CTRL+PAGE UP/DOWN a screen sideways; CTRL+TAB the next tab position or page; SHIFT reverses. | ClassicyTabs (its arrows, HOME and END) | ➖ (browser-reserved) |
| Table B.1 (p.357) | TAB to the next field, SHIFT+TAB to the previous. | native focus order; `useListNavigation`'s roving `tabStopId`; `useFocusTrap` in `useKeyboardEquivalents.ts` | ✅ |
| Table B.2 (p.358) | CTRL+C, V, X, Z copy, paste, cut, undo; not reassigned. | `useClassicyEditMenu` (`nativeShortcut` items, skipped by `findMenuItemByShortcut`) | ✅ (spelling 7.15) |
| Table B.2 (p.358) | CTRL+O opens, CTRL+P prints, CTRL+S saves; not reassigned. | `SimpleText.tsx` File menu (Open…, Save: no equivalent; nothing else takes the keys) | 🔧 see B.4 |
| Table B.2 (p.358) | F1 shows contextual Help; SHIFT+F1 enters its mode. | none bound | 🔧 see B.5 (= 12.2, 12.4) |
| Table B.2 (p.358); Table B.3 (p.359) | SHIFT+F10 and the APPLICATION key show the selection's pop-up menu. | core contextual menus (the `contextmenu` event alone) | 🔧 see B.6 (= 4.17) |
| Table B.2 (p.358) | SPACEBAR selects, as a button-1 click. | native check boxes, radios and buttons; ClassicyListBox (l.208), ClassicyTree (l.519–520) | ✅ (tables and icons, 5.16) |
| Table B.2 (p.358) | ESC cancels. | `useKeyboardEquivalents.ts` `onCancel` (Escape or Ctrl/⌘+period) | ✅ (contextual menus, 7.8) |
| Table B.2 (p.358), with Table B.5 (p.360) | ALT alone enters or leaves menu-bar mode; ALT+letter reaches a title by its access key. | ClassicyShortcutDispatcher (ignores a bare ALT); ⌥H, ⌥W, ⌥Q bound | ⚠️ see B.7 (shell) |
| Table B.2 (p.358) | ALT+SPACEBAR the window menu; ALT+F4 closes; CTRL+ESC the Start button. | plan 0020-w98 §2 "Keyboard", §5 (not built) | 🔧 see B.8 (shell) |
| Table B.2 (p.358) | ALT+F6 switches among an application's windows. | none bound (not in the plan) | ⚠️ see B.9 (shell) |
| Table B.2 (p.358) | ALT+ENTER shows the selection's property sheet. | none (no Properties, 2.2) | 🔧 see B.10 (= 2.2) |
| Table B.2 (p.358) | ALT+TAB, ALT+ESC, ALT+PRINT SCREEN, CTRL+ALT+DEL, ALT+HYPHEN; not reassigned. | none assigned (the OS takes the first four; ALT+HYPHEN is MDI's) | ➖ |
| Table B.3 (p.359) | The Windows key opens Start; WINDOWS+M minimizes all; SHIFT+WINDOWS+M undoes it; Windows-key chords are the shell's alone. | plan 0020-w98 §2 (the taskbar's menu: Minimize All Windows, Undo Minimize All, Properties; the key unbound; not built) | ⚠️ see B.11 (shell) |
| Table B.4 (p.359) | Accessibility key sequences toggle High Contrast, MouseKeys, StickyKeys, FilterKeys, ToggleKeys. | none (the OS handles them; forced colors is 14.3) | ➖ |
| Table B.5 (p.360); Ch.7 "Menu Titles" (p.106) | Use the recommended access keys in menus and command buttons. | core ClassicyMenu, ClassicyMenuItem, control labels and buttons (no `accessKey`) | 🔧 see B.12 (= 4.11, 4.12) |
| Table B.5 (p.360) | No access keys on OK and Cancel when ENTER and ESC reach them. | ClassicyAlert, InputDialog, FileDialog (no keys; Enter and Escape drive default and cancel) | ✅ |

### Findings — Appendix B

| # | Severity | Finding | Component | Status |
| --- | --- | --- | --- | --- |
| B.1 | LOW | Menu items are `tabIndex={-1}` and handle Enter only; the spinner ignores ArrowUp and ArrowDown. Same as 7.7 and 7.26. | core ClassicyMenu, ClassicySpinner | 🔧 Fixed (08d728581, 3ed578659) |
| B.2 | LOW | HOME and END do nothing on the desktop. Same as 5.17. | core ClassicyDesktop | 🔧 Fixed (d4a23b190, 3a30ada87) |
| B.3 | LOW | No list handles PageUp or PageDown (the browser scrolls, the row and selection stay); ClassicyTable and ClassicyTree take CTRL+Left and CTRL+Right to collapse and expand, not as a larger move. | core `useListNavigation.ts`, ClassicyTable, ClassicyTree | 🔧 Fixed (462e43608) |
| B.4 | LOW | SimpleText's Open… and Save carry no keyboard equivalent, so on a Windows host CTRL+O and CTRL+S reach the browser's Open and Save Page. | core `SimpleText.tsx` | 🔧 Fixed (3ee697577) |
| B.5 | LOW | Neither F1 nor SHIFT+F1 is bound. Same as 12.4 and 12.2. | core | 🔧 Fixed (8e57449df, 1ed1b21f7) |
| B.6 | LOW | No handler places a menu at a keyboard-focused target. Same as 4.17 (= 7.9). | core contextual menus | 🔧 Fixed (3066b9019) |
| B.7 | LOW | Nothing acts on a bare ALT; ⌥H (ALT+H) toggles balloons, where Table B.5 gives H to Help; ⌥W and ⌥Q are Close Window and Quit. | the coming ClassicyWindowMenuBar; ClassicyShortcutDispatcher; ClassicyDesktopMenuBar l.328 | ⚠️ Deferred (shell addendum B8, not implemented) |
| B.8 | LOW | ALT+SPACE, ALT+F4 and CTRL+ESC are planned but not built (no ClassicyTaskbar in src). | plan 0020-w98 §2, §5 | 🔧 Fixed (63ebc2f3f, 22ca9cc74, ce8bde683) |
| B.9 | LOW | Nothing binds ALT+F6, and the plan does not list it. | the shell's window registry | ⚠️ Deferred (shell addendum B20, not implemented) |
| B.10 | LOW | Classicy has no Properties command for ALT+ENTER to run. Same as 2.2. | core Finder, desktop icon menus | 🔧 Fixed (57ae34974) |
| B.11 | LOW | Classicy binds no Windows-key chord of its own (compliant); WINDOWS+M's and SHIFT+WINDOWS+M's commands, the taskbar menu's Minimize All Windows and Undo Minimize All, are planned but not built. | plan 0020-w98 §2 | 🔧 Fixed in part (b86689686, bf26606e9); ⚠️ addendum B21 |
| B.12 | MEDIUM | No menu title, item or button has an access key. Same as 4.11 and 4.12 (= 7.1 / 8.9). | core menus and controls | 🔧 Fixed (7470e0537) |

**Details & fixes**

- ✅ Table B.1 (p.357): each arrow moves exactly one row, tab, slider step, icon,
  1 % of the split or line; lists, trees and tables go to their first and last
  row on HOME and END (and, modifiers ignored, on CTRL+HOME and CTRL+END, the
  data's ends); a dialog's focus trap cycles TAB and SHIFT+TAB.
- **B.1** ⚠️ core: as 7.7 and 7.26 propose, roving focus in menus with Up and
  Down skipping separators, and ArrowUp/ArrowDown stepping in ClassicySpinner's
  `handleOnKeyDown`. _WIG App. B Table B.1 (p.357)._
- **B.2** ⚠️ core layout flag: same as 5.17 (`layout.selection.iconNavigation:
  "roving"`), which maps HOME to the first and END to the last icon in reading
  order, selecting and focusing it as the arrows do (`selectIconFromKeyboard`).
  _WIG App. B Table B.1 (p.357)._
- **B.3** ⚠️ core layout flags: PAGE UP and PAGE DOWN as 5.2
  (`layout.selection.pageKeys: "move"`); under 7.21's `layout.tree.keys:
  "windows"` (Windows 98 only), CTRL+Up and CTRL+Down move the view one row
  without changing the selection, and expand and collapse go to 7.21's bare
  Right and Left arrows. _WIG App. B Table B.1 (p.357)._
- **B.4** ⚠️ core layout flag: `layout.menu.standardShortcuts?: "windows"`
  (beside 7.15's `shortcutSpelling`; Windows 98 only). Under it SimpleText's
  Open… and Save carry "⌃O" and "⌃S", which the dispatcher matches on
  `e.ctrlKey` (Windows' CTRL+O and CTRL+S) with `preventDefault`; Chrome, Edge
  and Firefox let a page take both. Platinum's menus keep no equivalent. _WIG
  App. B Table B.2 (p.358)._
- **B.5** ⚠️ core layout flag: same as 12.2 (SHIFT+F1) and 12.4 (F1), under
  `layout.balloonHelp.contextHelp`. _WIG App. B Table B.2 (p.358)._
- **B.6** ⚠️ core layout flag: same as 4.17 (`layout.keyboard.contextMenuKey`;
  Shift+F10 and `e.key === "ContextMenu"` open the target's menu at its lower
  left, and a pointer-less `contextmenu` event is placed the same way). _WIG
  App. B Table B.2 (p.358); Table B.3 (p.359)._
- ✅ Table B.2 (p.358): Ctrl+C, V, X and Z are the browser's native edits (with
  Ctrl on Windows and Linux hosts), and no Classicy command takes them or
  CTRL+O, P or S; Space activates native controls and selects or toggles the
  focused row in list boxes and trees; every dialog's Escape runs its Cancel
  path.
- **B.7** ⚠️ the Windows shell (plan 0020-w98, §4, §7; with 4.11 and 4.14):
  requirements, under `layout.taskbar`. (1) A bare ALT press and release with no
  key between, or F10, enters menu-bar mode on the focused window's bar: the
  first title keyboard-tracked (§7's sunken title), Left and Right moving with
  wrap-around, Down or Enter opening a menu (7.7), ALT again or ESC leaving. (2)
  ALT+letter opens the title with that access key (B.12) and wins over a ⌥ item
  chord with the same letter. (3) A window's Help menu carries no ⌥H (12.1). (4)
  The bundled ⌥W and ⌥Q stay only while no title takes W or Q. Where the browser
  acts on a bare ALT itself (Firefox's menu bar on Windows and Linux), the keyup
  gets `preventDefault`. _WIG App. B Table B.2 (p.358), Table B.5 (p.360)._
- **B.8** ⚠️ the Windows shell (plan 0020-w98, §2
  `useClassicyTaskbarKeys.internal.ts`, §5
  `useClassicyWindowShellKeys.internal.ts`): requirements, as planned. CTRL+ESC
  toggles the Start menu with `preventDefault`; ALT+SPACE opens the focused
  window's system menu at its icon's lower left, a text field's Option+Space
  giving way to it; ALT+F4 runs the focused window's close, modals included,
  through `onCaptionClose`; Close shows ⌥F4 in 7.15's spelling. On a Windows
  host the OS takes all three before the page; on macOS they arrive as Option
  and Control chords. _WIG App. B Table B.2 (p.358)._
- **B.9** ⚠️ the Windows shell (plan 0020-w98, §5 `runClassicyWindowCommand`;
  not in the plan): requirement. Under `layout.taskbar`, ALT+F6 (and
  ALT+SHIFT+F6) runs "activate" on the focused app's next (or previous) open,
  non-minimized, non-modal window, palettes included, in ascending `zOrder` with
  wrap-around, with `preventDefault` where the browser delivers it. _WIG App. B
  Table B.2 (p.358)._
- **B.10** ⚠️ core layout flag: same as 2.2 (ALT+ENTER on a focused desktop or
  Finder item runs Properties, with `preventDefault` where the browser delivers
  it). _WIG App. B Table B.2 (p.358)._
- **B.11** ⚠️ the Windows shell (plan 0020-w98, §2 the taskbar's menu):
  requirements, as the plan's revision (020735126) now has them. Bind nothing to
  the Windows key (the OS takes it on Windows and it is Command on macOS;
  CTRL+ESC is the Start key, B.8); after Minimize All Windows the taskbar menu's
  item reads Undo Minimize All and restores exactly the windows that command
  minimized, kept in a session list in the taskbar, then focuses the window that
  was active; restoring or closing a listed window by other means, or activating
  or opening another, forgets the list, as Windows 98 as shipped does. _WIG App.
  B Table B.3 (p.359)._
- **B.12** ⚠️ core hook: same as 4.11 (the `accessKey` hook under
  `layout.keyboard.accessKeys`) and 4.12 (Table B.5's letters, listed there, for
  the bundled titles, items and buttons). ALT+letter activation is B.7's. _WIG
  App. B Table B.5 (p.360); Ch.7 "Menu Titles" (p.106)._
- ✅ Table B.5 (p.360): no button has an access key, and Enter and Escape drive
  the default and cancel buttons; when 4.11 lands, OK and Cancel stay without
  one.

---

## Appendix D — Supporting Windows 95 and Windows NT Version 3.51; Appendix E — Localization Word Lists

Pages read: Appendix D, PDF 347–348 (the opener prints 367, so printed page =
PDF + 20: pp.367–368; the running head prints the placeholder 265); Appendix E,
PDF 349–356 (the opener prints 369, PDF + 20: pp.369–376; the running head
prints 375), with PDF 349 viewed as an image for its bold command names. Neither
appendix has a rule with a Classicy surface: this pre-release's Appendix D reads
"To be supplied." and nothing else, and Appendix E is a 257-entry glossary of
Windows 95 terms to be translated.

Normative checklist (WIG Appendices D and E) and surface mapping:

| Topic (page) | WIG rule | Classicy surface | Status |
| --- | --- | --- | --- |
| App. D "Supporting Windows 95 and Windows NT Version 3.51" (pp.367–368) | None: "To be supplied." | none (no text; Windows NT 3.51 has no Classicy surface either) | ➖ |
| App. E "Localization Word Lists" (pp.369–376) | None: a glossary of terms for translators. | none (Classicy ships English only and has no localization layer) | ➖ |

No findings: both appendices are ➖.

**Details & fixes**

- ➖ App. E "Localization Word Lists" (pp.369–376): no normative content, but a
  spelling reference for the shell's strings, which plan 0020-w98's labels
  should match: "Shut Down" (two words), "Run", "Settings", "Find", "Help",
  "Start button", "taskbar", "Close button", "Minimize", "Maximize", "Restore",
  "Properties", "Always on Top", "Recycle Bin (icon)", "My Computer (icon)"
  (1.15's "Recycle Bin" included).

---
## Status after the Windows 98 completion program

One line per finding the first pass left open or the second pass found (the
first pass's own fixes, 3.1–14.2, are recorded in their chapters), in the book's
order: its status now, the commit or commits on
`claude/macos-ui-components-audit-li9fxm` that closed it, and what they did or,
for a finding still open, the reason the results give. "Shell addendum B<n>"
names a requirement of the shell's chapter-audit addendum (section B), "C<n>"
its wiring of lane 4's modules into the shell (section C, commits 3a30ada87 and
1ed1b21f7), "section A" a requirement the numbered steps met, confirmed at
integration against each step's result.

"E4's reason" is the reason the shell's step E4 gave for every section B
requirement it left: "These are 21 separate shell requirements, each about the
size of a plan step (several need new layout keys, new art assets or lane-2 menu
infrastructure). They do not fit in this step's session alongside E4. Each still
needs its own step; none is half-done in the tree."

| # | Status | Commit(s) | Outcome |
| --- | --- | --- | --- |
| 1.1 | 🔧 Fixed | 08d728581 | Same as 7.6 / 14.4: `menuBar.idleTimeoutMs` 0 under Windows 98, so a menu stays open until the user closes it. |
| 1.2 | 🔧 Fixed | 7bc33b74f | The Colors tab names the core colors by Windows 98's Display items (`colorLabels` on the package). |
| 1.3 | 🔧 Fixed | d7b4ea532 | `_HyperCard.scss` latches the armed palette entry: the ButtonHilight/ButtonFace checker inside the pressed rings (Figure 13.12). |
| 1.4 | 🔧 Fixed | d7b4ea532 | Under `input.escapeCancels`, Escape on the card (and, added here, in the Tools palette) disarms an armed part tool before it deselects. |
| 1.5 | 🔧 Fixed | d7b4ea532 | `_Assistant.scss` rules the Assistant's header off with the etched line the window header draws. |
| 1.6 | 🔧 Fixed in part | 0c937b0e7, ef9a323d7 | Each window carries its own menu bar under `menuBar.placement: "window"` (steps 16 and 17) and Help ends with About <name> (step 11); File's Exit and the absent Special menu (addendum B1) are not implemented (E4's reason). |
| 1.7 | 🔧 Fixed | 11d0b9502, f21282e6c | A task button per open primary window (steps 4 and 18); a hidden app's windows keep their buttons. Confirmed at integration (shell addendum section A). |
| 1.8 | 🔧 Fixed | 4c42d9b56, 0c937b0e7 | `window.collapse: "minimize"`: a minimized window leaves the screen and is restored from its task button (steps 5 and 16). Confirmed at integration (shell addendum section A). |
| 1.9 | 🔧 Fixed in part | 22ca9cc74, 8b668e667 | The Start button reads "Start" in bold and opens Windows' Start menu, which opens programs with one click (steps 12 and 19); the flag drawn from lane 3's `appleMenu` art and the banner from explorer.exe bitmap 157 (addendum B2) are not implemented: the button draws the package's pixel-art glyph and the banner is drawn from the bitmap's colors and metrics (E4's reason). |
| 1.10 | 🔧 Fixed | b86689686, 0c937b0e7 | The Control Strip's modules are the tray's notification icons (step 13), and no strip is drawn under Windows 98 (step 16). The tray menus' refinements are 10.16 and 10.17. |
| 1.11 | 🔧 Fixed in part | c89e4f72a | The taskbar docks to any edge by a plain drag, with Taskbar Properties (E4); sizing it by its inner edge (addendum B5) is not: E4's reason |
| 1.12 | 🔧 Fixed | 7470e0537 | Shortcuts spelled as Windows spells them (`menu.shortcutSpelling: "names"`, ⌘ as Ctrl+ under `keyboard.command: "ctrl"`), access keys on menus, labels and every control. |
| 1.13 | 🔧 Fixed | 7bc33b74f | Items that confirm with a message box carry no ellipsis under Windows 98 (`ClassicyMenuItem.confirms`, `menu.confirmEllipsis: false`). |
| 1.14 | 🔧 Fixed | 41de137d5 | Windows 98 SE's own art, icons and cursors (lane 3), and Windows 98's fatal-exception screen in place of the Sad Mac (`layout.crashScreen: "fatalException"`). |
| 1.15 | 🔧 Fixed | 41de137d5 | The Trash is the Recycle Bin on the desktop (lane 3's `desktopIcons.trash.name`) and on every other surface: its window title, Empty Recycle Bin, Delete's question, the Empty alert, Properties and the refusal alerts. |
| 1.16 | 🔧 Fixed | 7bc33b74f | No extensions parade under Windows 98; the boot sound is The Microsoft Sound (lane 3). |
| 1.17 | 🔧 Fixed | 3ee697577 | Under `document.confirmUnsavedClose`, SimpleText's close box, File ▸ Close and Quit show Notepad's "The text in the … file has changed." message box (Yes, No, Cancel), and Quit walks each changed document. |
| 1.18 | 🔧 Fixed | be51df8bd, 1ed1b21f7 | Escape takes a direct-manipulation gesture back (`input.escapeCancels`): split views, sliders, icons, column resize, and since C5 the window's move and resize and the Control Strip's drags. |
| 1.19 | 🔧 Fixed | 7bc33b74f | A chosen menu item runs at once, with no flash (Windows 98's MenuItem press hook). |
| 1.20 | ➖ | 0c937b0e7 | No Control Strip is drawn under Windows 98 (step 16), so its Control-drag-only position has no surface; the taskbar docks by a plain drag (E4). |
| 1.21 | 🔧 Fixed | c1ab2bf24, d7f1b8d3f, 3a30ada87 | Under `finder.commands: "windows"` Finder and the desktop carry File ▸ Open, Open first on every item, New, Delete, Rename, Create Shortcut, Cut, Copy, Paste, Properties and the white-space menus. |
| 2.1 | 🔧 Fixed | 3ee697577, 1ed1b21f7 | Under `window.restoreViewState` a window keeps its scroll offset and caret on its record and gets them back on reopening; the window's own content area (C6) restores Finder's folder windows too. |
| 2.2 | 🔧 Fixed | 57ae34974 | Under `finder.commands: "windows"` Properties ends every item's menu and the File menus; Alt+Enter and an Alt double-click run it; it opens Windows 98 SE's General page (`ClassicyFilePropertiesWindow`). |
| 3.1 | 🔧 Fixed | f21282e6c | Re-pointed to `_Taskbar.scss` (`.classicyTaskbarTask.active`): the active window's task button is pushed in over the checker at all times, its label bold. |
| 3.2 | 🔧 Fixed | f21282e6c | Re-pointed to `_Taskbar.scss` (`.classicyTaskbar`): the taskbar's raised edge faces the desktop on whichever edge it is docked. |
| 4.1 | 🔧 Fixed | 7bc33b74f | The arrow pointer over list and tree rows, expand buttons, tab and pager arrows, sliders and swatches. |
| 4.2 | 🔧 Fixed | 7bc33b74f | The split dividers show the horizontal and vertical size cursors, kept through their drags; the size grip's is lane 3's. |
| 4.3 | 🔧 Fixed | 41de137d5 | Every cursor role is registered from USER.EXE's cursors, notAllowed and appStarting included, so no role draws Platinum's image. |
| 4.4 | 🔧 Fixed in part | a206f0031 | The size grip shows USER.EXE's diagonal size cursor; the arrow while a window is moved (addendum B4) is not: lane 3's reason, "Neither Platinum nor System 7 draws its registered arrow, watch, ibeam or crosshair from a stylesheet; base rules set cursor: default and similar keywords per element … outside this item", and the shell's addendum B4 was not implemented (E4's reason). |
| 4.5 | 🔧 Fixed | 7bc33b74f | The wait pointer over the startup screen and the working-in-background pointer over the PDF viewer's Loading…. |
| 4.6 | 🔧 Fixed | 37d580c6d | The no-drop pointer shows wherever a drag has no target (`data-classicy-drop="none"`). |
| 4.7 | 🔧 Fixed | 7bc33b74f | Same fix as 1.19. |
| 4.8 | 🔧 Fixed | be51df8bd | A tab is chosen at the button-1 press (`mouse: "windows"`), as comctl32's TAB_LButtonDown does (Windows 98 as shipped over the 1995 text). |
| 4.9 | 🔧 Fixed | be51df8bd | A non-file icon drag starts past a 4 px threshold and keeps the grab offset (`mouse: "windows"`). |
| 4.10 | 🔧 Fixed | be51df8bd, 1ed1b21f7 | Gestures start only from button 1 under `mouse: "windows"` (`isClassicyGestureButton`): split views, tables, icons, and since C5 the window's move, resize and frame edges. |
| 4.11 | 🔧 Fixed | 7470e0537 | Push buttons, check boxes, option buttons and tabs have `accessKey` through lane 2's one register, with the automatic pick (OK and Cancel excepted, tabs only when given). |
| 4.12 | 🔧 Fixed | 7470e0537 | The bundled menus and message boxes carry Windows 98 SE's access keys (`useClassicyBundledAccessKeys`, gated on `menu.accessKeys`); development builds warn on duplicates. |
| 4.13 | ⚠️ Deferred | — | Shell addendum B5 (sizing the taskbar by its inner edge) not implemented (E4's reason). |
| 4.14 | 🔧 Fixed | 7470e0537 | Under `menu.accessKeys`, the menu bars' and labels' Alt+letter listeners run in the capture phase and call preventDefault, so an access key in scope wins over a ⌥ equivalent and the dispatcher stands down unchanged. |
| 4.15 | 🔧 Fixed | 3066b9019, 3a30ada87 | Editable shortcuts (`keyboard.editableShortcuts`, the Keyboard control panel); the desktop's Move To Trash chord follows them since C1. |
| 4.16 | 🔧 Fixed | be51df8bd, 1ed1b21f7 | Same as 1.18. |
| 4.17 | 🔧 Fixed | 3066b9019 | Same as 7.9: under `keyboard.contextMenuKey` Shift+F10 and the context-menu key open the focused selection's menu at its lower left. |
| 4.18 | 🔧 Fixed | 22ca9cc74 | CTRL+ESC opens the Start menu with its first item highlighted, Escape returns to Start (step 12); the lone Windows-key release stays out (the OS takes the key on Windows, and it is Command on macOS). Confirmed at integration (shell addendum section A). |
| 4.19 | 🔧 Fixed | 7470e0537 | `layout.keyboard.command` "ctrl" (Windows 98): shortcutMatchesEvent, canonicalChordsFromEvent, keyboardShortcutFromEvent and classicyCommandKeyHeld treat Command as Ctrl alone and ignore Windows-key chords, so Win+letter fires nothing and Win+period cancels no. |
| 4.20 | ⚠️ Deferred | — | Shell addendum B5, B6 (sizing the taskbar; Start's press-drag and the task buttons' release) not implemented (E4's reason). |
| 4.21 | ⚠️ Deferred | — | Shell addendum B7 (access keys in the shell's menus) not implemented (E4's reason). |
| 5.1 | 🔧 Fixed | cb7ffc984, d4a23b190 | Umbrella finding: closed by the menu keys (7.7–7.9), 5.17 and 5.18. |
| 5.2 | 🔧 Fixed | 462e43608 | `layout.selection.pageKeys: "move"` (Windows 98 only): `useListNavigation`'s `pageRows`, plus ClassicyTable's PageUp and PageDown through `moveCursorTo`, use comctl32's list-view page rule. |
| 5.3 | 🔧 Fixed | 27e4d9d61 | A press dragged across a list box's or table's rows selects the range from the anchor (`selection.dragRange`), scrolling past the list's ends. |
| 5.4 | 🔧 Fixed | d4a23b190 | Umbrella finding: closed by 5.8 and 5.12 (L4-E1) and 5.10 (L4-E2). |
| 5.5 | 🔧 Fixed | 27e4d9d61, cb7ffc984 | Lists, tables, trees and the icon view select at the button-1 press (`selection.selectOn: "press"`), with comctl32's deferred reset on a selected row. |
| 5.6 | 🔧 Fixed | be51df8bd, 3a30ada87 | Button 2 selects before its menu (`selection.secondaryButton: "select"`): desktop icons, table and list rows, the icon view, and the empty desktop since C2. |
| 5.7 | 🔧 Fixed | be51df8bd | A menu asked for during button 2 opens at its release (`contextMenu.openOn: "release"`). |
| 5.8 | 🔧 Fixed | cb7ffc984 | Windows' icon-view selection behind keys: the rectangle's range, Ctrl+Shift by the anchor's state, press selection, button 2, and a drag carrying the selection (`fileBrowser.iconSelection: "view"`). |
| 5.9 | 🔧 Fixed | 27e4d9d61 | Ctrl+Shift-click keeps the other selections and sets the anchor's range to the anchor's state (`selection.modifiers: "windows"`). |
| 5.10 | 🔧 Fixed | d4a23b190 | Under `selection.modifiers: "windows"`, a Control or ⌘ click toggles a desktop icon, Shift selects the anchor's rectangle, and both together give addRange (`ClassicyDesktopIconSelect`, `Desktop.selectionAnchor`). |
| 5.11 | 🔧 Fixed | d4a23b190, 3a30ada87 | `classicyDesktopSelectPress` keeps the selection under a Shift or Control rectangle (union or toggle), wired into the desktop by C2. |
| 5.12 | 🔧 Fixed | cb7ffc984 | The list view takes the selection rectangle and either view auto-scrolls under it (`fileBrowser.regionSelect`). |
| 5.13 | 🔧 Fixed | d4a23b190, 3a30ada87 | The selection rectangle draws nothing while it is 0 × 0 (`classicyDesktopSelectEmpty`, emitted by the desktop since C2). |
| 5.14 | 🔧 Fixed | d4a23b190 | The package's `.classicyDesktopSelect` is white dotted dots under `mix-blend-mode: difference`, `z-index` 11, no outline, pinned in windows98.css.test.ts. |
| 5.15 | 🔧 Fixed | cb7ffc984 | The dotted focus rectangle is on the focus icon's label alone (`_Icon.scss`, `_Desktop.scss`). |
| 5.16 | 🔧 Fixed | 462e43608, cb7ffc984, d4a23b190, 3a30ada87 | Space is the Select key (Ctrl+Space toggles, Shift extends, Enter opens) in tables, the icon view and the desktop, whose root is a listbox since C3. |
| 5.17 | 🔧 Fixed | cb7ffc984, d4a23b190, 3a30ada87 | One Tab stop with a roving focus icon in the icon view and on the desktop, whose arrows, Home and End go through `classicyDesktopKeyCommand` since C3. |
| 5.18 | 🔧 Fixed | 462e43608, d4a23b190, 3a30ada87 | Ctrl with a navigation key moves only the focus in lists, tables, the icon view and the desktop; Shift+F8 toggles a list's Add mode. |
| 5.19 | 🔧 Fixed | fdbf94e78 | A double-clicked word takes the spaces after it (`text.wordSelect: "trailingSpace"`). |
| 5.20 | 🔧 Fixed | 5d8266d49, 63ebc2f3f | The window pop-up menu's Restore, Move, Size, Minimize, Maximize and Close, with keyboard Move and Size modes (steps 8 and 9). Confirmed at integration (shell addendum section A). |
| 5.21 | 🔧 Fixed | fdbf94e78 | The Edit commands and the undo state act on the last field only while its window is active (`edit.scope: "window"`). |
| 5.22 | 🔧 Fixed | cb7ffc984 | A drag of a selected icon carries every selected item, each outlined; dropped in its own folder every one moves as far (`fileBrowser.iconSelection: "view"`). |
| 5.23 | 🔧 Fixed | c1ab2bf24, 3a30ada87 | File ▸ Open first (Ctrl+O), and Open first and default on every item, app shortcut and drive menu; the desktop's File menu since C1. |
| 5.24 | 🔧 Fixed | 3ee697577 | Under `document.reopenActivates`, the generic *OpenFile route, the viewers' OpenFile cases and ClassicyAppFinderOpenFolder focus the open object's own window (focusClassicyReopenedWindow). |
| 5.25 | 🔧 Fixed | 3ee697577 | Same fix as 1.17. |
| 5.26 | 🔧 Fixed | 2e45e70d8 | `window.frameEdges: "resize"`: the frame's edges and corners size the window (step 7). Confirmed at integration (shell addendum section A). |
| 5.27 | 🔧 Fixed | 57ae34974 | Same as 2.2: the Properties command, the sheet, Alt+Enter, the Alt double-click, and an open sheet activated again. |
| 5.28 | 🔧 Fixed | d7f1b8d3f | Cut, Copy, Paste and Paste Shortcut of files in Finder and on the desktop, through a page-level file clipboard; a Cut item is drawn dithered until pasted; copies are named "Copy of". |
| 5.29 | 🔧 Fixed | fdbf94e78 | Text fields carry user.exe's edit pop-up menu, dimmed as Windows dims it (`textField.contextMenu: "edit"`). |
| 5.30 | 🔧 Fixed | 7470e0537 | Under `menu.shortcutSpelling` "names", a `nativeShortcut` ⌘ chord off a Mac (and every ⌘ chord under "ctrl") reads Ctrl+: Undo Ctrl+Z, Cut Ctrl+X, Copy Ctrl+C, Paste Ctrl+V, Select All Ctrl+A. |
| 5.31 | 🔧 Fixed | d7f1b8d3f, 3a30ada87 | A drop in an inactive window activates it (`transfer.activateDropWindow`), for Finder's windows and, since C4, the desktop's drops on a folder. |
| 5.32 | 🔧 Fixed | 37d580c6d | A drop target shows the drop's effect (move, copy, link) through the drop-feedback attribute. |
| 5.33 | 🔧 Fixed | 3a69b2ed0, 37d580c6d | A button-2 drag ends in shell32's transfer menu (Move Here, Copy Here, Create Shortcut(s) Here, Cancel), using the file shortcuts L4-A2 made possible. |
| 5.34 | 🔧 Fixed | 37d580c6d | Ctrl held at the release copies and Ctrl+Shift links (`transfer.copyModifier: "ctrl"`). |
| 5.35 | 🔧 Fixed | 37d580c6d | Velocity auto-scroll near a scroller's edge with DAD_AutoScroll's figures (`transfer.autoScroll`). |
| 5.36 | 🔧 Fixed | 37d580c6d | Desktop application, drive and Recycle Bin icons drag as outlines (`transfer.desktopIconDrag: "outline"`). |
| 5.37 | 🔧 Fixed | 37d580c6d | The arrow pointer throughout a drag. |
| 5.38 | 🔧 Fixed | 37d580c6d | A list row under a drag is drawn selected. |
| 5.39 | 🔧 Fixed | c1ab2bf24 | Delete with Del, and Windows 98 SE's Confirm File, Folder and Multiple File Delete box on every route (the drop on the Recycle Bin's box recorded as unverified). |
| 5.40 | 🔧 Fixed | c1ab2bf24, 3a30ada87 | New ▸ Folder in the File menu and on folder and desktop white space, named "New Folder (2)"…, selected, its name edited in place. |
| 5.41 | ⚠️ Deferred | — | Shell addendum B9 (shell presses keep every selection) not implemented (E4's reason). |
| 5.42 | ⚠️ Deferred | — | Shell addendum B10 (the taskbar from the keyboard) not implemented (E4's reason). |
| 5.43 | ⚠️ Deferred | — | Shell addendum B11 (button 2 on the taskbar's objects) not implemented (E4's reason). |
| 5.44 | 🔧 Fixed | fdbf94e78, 1ed1b21f7 | Window bars' Edit menus take Notepad's form (`edit.menu: "windows"`) and act in their own window (`edit.scope: "window"`); the shell's C9 wiring and tests close it. |
| 5.45 | 🔧 Fixed | f39f67a54, 37d580c6d | A file drag resting 500 ms on a task button restores or activates its window (step 15); the no-drop pointer shows over the taskbar (`data-classicy-drop="none"`, 4.6). 10.12's message box is separate. Confirmed at integration (shell addendum section A). |
| 5.46 | 🔧 Fixed | 11d0b9502 | Task buttons carry `active`, `collapsed` and `pressed` from the window registry (step 4). Confirmed at integration (shell addendum section A). |
| 6.2 | 🔧 Fixed | 63ebc2f3f | `window.systemMenu`: the window pop-up menu from button 2 on the title bar and from ALT+SPACEBAR. |
| 6.3 | 🔧 Fixed | 63ebc2f3f | A press on the title-bar icon shows the window's menu (Wine's NC_HandleNCRButtonDown, the OS as shipped over p.78's object menu); a double-click on it closes the window. |
| 6.4 | 🔧 Fixed | 3ed578659 | Selections in an inactive window take Windows' SHOWSELALWAYS look: `inactive` on ClassicyTree, the unscrolled ClassicyTable and ClassicyIcon, read by `_Table.scss`, `_ListBox.scss` and `_Icon.scss`. |
| 6.5 | 🔧 Fixed | 2e45e70d8, 819723aaa | `window.frameEdges: "resize"`: the frame's edges and eight corner arms size a resizable window, and a fixed border's edges are inert. |
| 6.6 | 🔧 Fixed | 4b8d16bef | `window.zoom: "maximize"`: Maximize takes the work area with the frame off screen and draws Restore; no move, size or grip while maximized. |
| 6.9 | ⚠️ Deferred | — | Product decision (the OS as shipped kept): Windows 95/98 draws a fitting bar disabled (ESB_DISABLE_BOTH), with no full-length scroll box. |
| 6.10 | 🔧 Fixed | 03c039b38 | A live thumb drag snaps back past Windows' distance (`scrollBar.liveSnapBack`, `snapBackScale` { across 8, along 2 }). |
| 6.11 | 🔧 Fixed | 03c039b38 | A file drag auto-scrolls a scroll area holding drop targets near its edge (every package; Mac OS 8's and System 7's Finders did too). |
| 6.12 | 🔧 Fixed | 03c039b38 | An opt-in split box (`splittable`, `classicySplitViewSplitBox`) in the remaining pane's scroll bar. |
| 6.13 | 🔧 Fixed | 03c039b38 | A `splittable` split closes when dragged to either end, a double-click closes or reopens it, and `split()` runs a keyboard Split mode (arrows, Enter, Esc). |
| 7.1 | 🔧 Fixed | ce8bde683 | Access keys on menu titles and items (`ClassicyMenuItem.accessKey`, the `access-key` part, `menu.accessKeys: "auto"`), underlined; Alt+title key, typed item keys and Alt alone. |
| 7.5 | 🔧 Fixed | 08d728581 | Press-drag-release on menu titles and items (`useClassicyMenuPress`, every package). |
| 7.6 | 🔧 Fixed | 08d728581 | `menuBar.idleTimeoutMs` 0 under Windows 98: a menu opened by clicking stays until the next click. |
| 7.7 | 🔧 Fixed | 08d728581 | Menu keyboard navigation (`menu.keys: "windows"`): roving focus, arrows, Home/End, Return/Space, type-ahead, Escape by levels, F10; dimmed items browsable (`menu.disabledItems: "browse"`). |
| 7.8 | 🔧 Fixed | 08d728581 | Escape dismisses a pop-up menu, one level at a time. |
| 7.9 | 🔧 Fixed | 08d728581 | Shift+F10 and the context-menu key open the focused object's menu (`keyboard.contextMenuKey`). |
| 7.10 | 🔧 Fixed | 63ebc2f3f | Same as 6.2: Restore, Move, Size, Minimize, Maximize and Close for primary windows, Move and Close for secondary windows. |
| 7.11 | 🔧 Fixed | d70d4c7aa, 70494a489, c1ab2bf24, 3a69b2ed0, 57ae34974, d7f1b8d3f | Under `finder.commands: "windows"` Finder's item menus lead with Open (the default) and carry Rename, Create Shortcut, Cut, Copy, Paste and Properties last; Send To stays ➖. |
| 7.12 | 🔧 Fixed | 08d728581 | Cascading menus open and close after 400 ms (`menu.submenuDelayMs`). |
| 7.15 | 🔧 Fixed | ce8bde683 | `menu.shortcutSpelling: "names"`: shortcuts read Ctrl+, Alt+, Shift+, Del, Esc and the arrow names. |
| 7.21 | 🔧 Fixed | 3ed578659 | A tree's bare Right Arrow expands and Left collapses (`tree.keys: "windows"`). |
| 7.23 | 🔧 Fixed | 376c49cb5 | The `toolbar.restBevel` knob: Windows 95's raised toolbar buttons in its preset, Windows 98's flat ones in every other scheme. |
| 7.25 | 🔧 Fixed | 3ed578659 | A multiple-selection list box's opt-in check boxes (`checkboxes`, the `list-check` part), drawn flat. |
| 7.26 | 🔧 Fixed | 3ed578659 | ClassicySpinner takes Up and Down Arrow and an optional `wrap`. |
| 7.27 | 🔧 Fixed | 3ed578659 | ToolTips placed below and right of the pointer (`balloonHelp.placement: "pointer"`, `tooltip.pointerOffset` 20). |
| 7.28 | 🔧 Fixed | b86689686, 0c937b0e7, 819723aaa | Under the shell each tray notification icon names its module in a forced 500 ms tooltip, and no Control Strip is drawn. |
| 8.1 | 🔧 Fixed | 7d1d67f52, 819723aaa | A dialog's caption has its title (its app's name when untitled) and a Close box that is its Cancel, embossed and unavailable on a Yes/No box; every dialog moves by its caption (`dialog.caption: "titled"`). |
| 8.7 | 🔧 Fixed | 63ebc2f3f | A secondary window's pop-up menu is Move and Close, a palette's Move, Size and Close. |
| 8.9 | 🔧 Fixed | ce8bde683 | Access keys on control labels (`ClassicyControlLabel.accessKey`, automatic picks), underlined; Alt+key focuses or clicks the control. |
| 8.11 | 🔧 Fixed | d70d4c7aa | The file dialogs reopen at the app's last folder, and the control panels on their last tab, for the session. |
| 9.1 | 🔧 Fixed | 11d0b9502, f21282e6c | Each open primary window has its own task button, laid out as Figure 9.6 (steps 4 and 18). Confirmed at integration (shell addendum section A). |
| 9.2 | 🔧 Fixed | 3ee697577 | Same fix as 5.24, the PDF Viewer's and Picture Viewer's own window keys included (and the Movie Player's). |
| 9.3 | 🔧 Fixed | c1ab2bf24 | An extension's Properties is its first command and its double-click, opening its control panel. |
| 9.4 | ⚠️ Deferred | — | Shell addendum B12 (an inactive window's bar drawn as an active one's) not implemented (E4's reason). |
| 10.1 | 🔧 Fixed | 57ae34974 | Under `files.unregisteredOpen: "openWith"`, a type only Finder opens shows shell32's Open With dialog, with "Always use this program". |
| 10.2 | 🔧 Fixed | 57ae34974 | The package's `fileTypeNames` give the Kind column and the Properties sheet Windows 98's type names (File Folder, Text Document, …). |
| 10.3 | 🔧 Fixed | c1ab2bf24 | `registerApp` `creates`, SimpleText's Text Document, New ▸ lists the mounted apps' types, Rename on the menus and F2. |
| 10.4 | 🔧 Fixed | 41de137d5 | Document icons by type: `iconImageByType` reads `system.files.byType.<type>`, and Windows 98 registers text, image, video and audio. |
| 10.5 | 🔧 Fixed | 104ebd968 | The package registers Windows 98 SE's own icons (146 WebPs from the CD), so file and app icons are Windows 98's. |
| 10.6 | 🔧 Fixed | 3a69b2ed0 | The item menus carry Open (the default), the handler's `verbs`, Create Shortcut, Delete and Rename; Create Shortcut makes a "Shortcut to <name>" file shortcut. |
| 10.7 | 🔧 Fixed | 22ca9cc74 | The Start menu's Programs is a flat, sorted list of the Applications folder, "(Empty)" when empty (step 12). Confirmed at integration (shell addendum section A). |
| 10.8 | 🔧 Fixed | 57ae34974 | Registered types' extensions are hidden in the views, labels, the sheet and Open With (`files.extensions: "hideRegistered"`), with Finder Preferences' option. |
| 10.9 | 🔧 Fixed | c1ab2bf24 | `isClassicyValidFileName` under `files.names: "windows"`, Windows 98's refusal in the Rename box and in the dialog's prompt, Save and Create dimmed. |
| 10.10 | 🔧 Fixed | c1ab2bf24 | `classicyFirstFreeName`, "New Folder (2)", the dialog's New Folder `initialValue`, selected. |
| 10.11 | ⚠️ Deferred | — | Shell addendum B13 (no task button for secondary windows) not implemented (E4's reason). |
| 10.12 | ⚠️ Deferred | — | Shell addendum B15 (the message on a drop over a task button) not implemented (E4's reason). |
| 10.13 | ⚠️ Deferred | — | Shell addendum B16 (no text in the tray) not implemented (E4's reason). |
| 10.14 | 🔧 Fixed | f21282e6c | The status area's icons and extensions sit inside its sunken pane, the clock at its far end (step 18). Confirmed at integration (shell addendum section A). |
| 10.15 | 🔧 Fixed | b86689686 | A tray icon opens its module's `content`, else its menu; recorded as Windows 98 as shipped over the 1995 text (step 13 and its decision). Confirmed at integration (shell addendum section A). |
| 10.16 | ⚠️ Deferred | — | Shell addendum B3 (the tray's menus: Sound's menu, no What's This?) not implemented (E4's reason). |
| 10.17 | ⚠️ Deferred | — | Shell addendum B3 (the tray menus' default item) not implemented (E4's reason). |
| 10.18 | 🔧 Fixed in part | b86689686 | Every tray icon names its module in a forced 500 ms tooltip; the Sound icon's "Volume" / "Volume (muted)" tips (addendum B3) are not implemented (E4's reason). |
| 10.19 | 🔧 Fixed | ca8fbeb6d | Flashing task buttons through `ClassicyAppRequestAttention`, triggered by a background app's modal. |
| 10.20 | 🔧 Fixed | 7bc33b74f | Held keys are kept out of a dialog that opens under them (`dialog.flushInput`). |
| 10.21 | ⚠️ Deferred | — | Shell addendum B18 (application-modal dialogs, `dialog.modality`) not implemented (E4's reason). |
| 10.22 | 🔧 Fixed | 41de137d5 | Same as 1.15: the Recycle Bin's name reaches every surface. |
| 10.23 | 🔧 Fixed | 104ebd968 | `WINDOWS98_APPS` names the panels as Windows 98 does: Display, Sounds, Date/Time, Taskbar & Start Menu. |
| 10.24 | ⚠️ Deferred | — | Shell addendum B14 (re-clamping on a resize) not implemented (E4's reason). |
| 11.1 | 🔧 Fixed | 104ebd968, cf4e1bc7a | The shortcut graphic is shell32 #30, registered as the package's `aliasBadge` and sized to the icon; it no longer depends on Platinum. |
| 11.2 | 🔧 Fixed | 7bc33b74f | Shortcuts carry the shortcut graphic in the icon and list views as on the desktop (`icon.aliasBadge: "everywhere"`). |
| 11.3 | 🔧 Fixed | be51df8bd | Same as 5.6. |
| 11.4 | 🔧 Fixed | 3066b9019 | Same as 4.17. |
| 11.5 | ⚠️ Deferred | — | Shell addendum B7 (access keys in the shell's menus) not implemented (E4's reason). |
| 11.6 | 🔧 Fixed | ce8bde683, 08d728581, 7470e0537 | Typed access keys in open menus (`useClassicyMenuBarAccessKeys`): a unique match carries out its item, as Windows does. |
| 11.7 | 🔧 Fixed | 37d580c6d | Same as 5.33. |
| 11.8 | 🔧 Fixed | 7d1d67f52, 7470e0537 | `dialog.caption: "titled"`: message boxes' captions are titled with a Close box (step 10); Yes, No and Retry carry access keys (L4-H1). Confirmed at integration (shell addendum section A). |
| 12.1 | 🔧 Fixed in part | ec433430a, 1ed1b21f7 | A window bar's Help holds Help Topics (C7) and What's This? (C8); dropping the balloon toggle from it and About's access key (addendum B19) are not implemented (E4's reason). |
| 12.2 | 🔧 Fixed | 8e57449df, 1ed1b21f7 | What's This? (`balloonHelp.contextHelp: "whatsThis"`, Shift+F1) with the help pointer, reached from a window bar's Help and a dialog's "?" box since C8. |
| 12.3 | 🔧 Fixed | 8e57449df | In What's This? mode a click on a described control shows its help as WinHelp's context-sensitive pop-up and ends the mode; a right-click offers What's This?. |
| 12.4 | 🔧 Fixed | 8e57449df | F1 shows the focused element's help below it, else opens Help Topics. |
| 12.5 | 🔧 Fixed | 41de137d5 | The Recycle Bin's, My Computer's and the other drives' tips are Windows 98's (`desktopIcons`). |
| 12.6 | 🔧 Fixed | 41de137d5 | Lane 3's descriptions are kept; L4-L adds verb-first tips for PDFViewer.app, HyperCard.app and DriveSetup.app. |
| 12.7 | 🔧 Fixed | 70d5848d3 | Windows 98's tip title is its first line, plain, with no gap (Figure 12.5), pinned in windows98.css.test.ts. |
| 12.8 | 🔧 Fixed | 7d1d67f52, ca8fbeb6d, 1ed1b21f7 | `window.captionTooltips` gives each caption box a forced 500 ms tooltip of its label (Minimize, Maximize, Restore, Close); the "?" box's "Help" tip shows since C8 wired the box. |
| 12.9 | 🔧 Fixed | 70d5848d3 | Under `balloonHelp.unlabeledTips` an icon-only ClassicyBevelButton shows its aria-label or iconAlt as a forced ToolTip, so ClassicyButtonToolbar's buttons are named too. |
| 12.10 | 🔧 Fixed | 70d5848d3 | The rich text editor's tips open above the windows in the desktop, drawn as a ToolTip under Windows 98 and as each package's help balloon elsewhere. |
| 12.11 | 🔧 Fixed | 70d5848d3 | `balloonHelp.delayMs` 500, `autoPopMs` 5000, `reshowMs` 100 and `hideOnPress`, as Wine's tooltips.c times them. |
| 12.12 | 🔧 Fixed | 70d5848d3 | Under `balloonHelp.activeWindowOnly` no tip shows in an inactive window (its `.classicyWindow` root without `active`), and a shown one hides when its window goes inactive. |
| 12.13 | 🔧 Fixed | 70d5848d3 | Under `menu.itemHelp: "statusBar"` a highlighted menu item's help is the active window's status-bar text (`ClassicyPlacard menuStatus`), not a balloon. |
| 12.14 | 🔧 Fixed | 7bc33b74f | The alert's Help button is a 75 × 23 push button reading "Help", last in the row. |
| 12.15 | 🔧 Fixed | 89e1a5683, 1ed1b21f7 | Under `help.topicWindow: "winhelp"` the help window is a sizable primary window with its own task button, opened from Start ▸ Help and Help Topics since C7. |
| 12.16 | 🔧 Fixed | 89e1a5683 | The help window's button bar holds winhlp32's Help Topics, Back and Options (with Copy); Print Topic is left out (recorded). |
| 12.17 | 🔧 Fixed | d7b4ea532 | `_AppleGuide.scss` draws the title and topic on InfoWindow in InfoText and the UI font with a ButtonFace footer. |
| 12.18 | 🔧 Fixed | 89e1a5683 | Help topics may be registered per package (`registerAppleGuideTopic`'s `packages` and `book`); Windows 98 registers "Using Help". |
| 12.19 | 🔧 Fixed | d7b4ea532 | A one-ring WindowFrame line runs under Apple Guide's title band, in place of the etched line. |
| 12.20 | 🔧 Fixed | d7b4ea532 | Text jumps are green from the new `help.jump` color family (#008000 in every scheme, LinkText under forced colors). |
| 12.21 | 🔧 Fixed | 89e1a5683, 1ed1b21f7 | `ClassicyHelpTopics`, winhlp32's Help Topics dialog with its Contents tab, opened by Start ▸ Help and a window bar's Help Topics since C7. |
| 12.22 | 🔧 Fixed | d7b4ea532 | `layout.assistant.navigation` "buttons" (Windows 98) puts "< Back" and "Next >" (access keys B and N, comctl32.dll's strings) in place of the pager, with no page number. |
| 12.23 | 🔧 Fixed | d7b4ea532 | `_Assistant.scss` gives a ButtonFace page, an etched line above the footer, Back and Next first and touching (comctl32's template), push-button-sized footer buttons, and no page number. |
| 13.8 | 🔧 Fixed | 3ed578659 | Same as 6.4: selections in an inactive window are drawn as Windows' SHOWSELALWAYS look. |
| 14.3 | 🔧 Fixed | 376c49cb5 | `_ForcedColors.scss` maps the tokens to the CSS system colors under forced colors, and the twelve High Contrast schemes from Windows 98 SE's SHELL2.INF are presets. |
| 14.4 | 🔧 Fixed | 08d728581 | Same as 7.6. |
| 14.5 | 🔧 Fixed | 3ed578659 | A meter's warning and critical zones carry a stipple and a checker as well as their color (`_ProgressBar.scss`). |
| A.1 | 🔧 Fixed | cb7ffc984 | Same as 5.8 and 5.12; a double-click on a selected icon opens the whole selection. |
| A.2 | 🔧 Fixed | 27e4d9d61 | Same as 5.5: a press-drag on an unselected list-view row selects it first and drags it drawn selected. |
| A.3 | 🔧 Fixed | be51df8bd | Same as 5.6. |
| A.4 | 🔧 Fixed | c1ab2bf24, 3a30ada87 | Button 2 on the white space of a folder window and of the desktop opens its menu (View, Arrange Icons, Paste, New, Properties), the desktop's since C1 and C2. |
| A.5 | 🔧 Fixed | 37d580c6d | Same as 5.33. |
| A.6 | 🔧 Fixed | d4a23b190 | Same as 5.10. A modified press on an unselected icon applies at the press. |
| A.7 | 🔧 Fixed | d4a23b190, 3a30ada87 | Same as 5.11: a modified rectangle keeps the desktop's selection, wired by C2. |
| A.8 | 🔧 Fixed | 37d580c6d | Same as 5.34. |
| A.9 | 🔧 Fixed | 27e4d9d61 | A modified double-click adjusts nothing and opens the whole selection (`onActivateSelection`). |
| A.10 | 🔧 Fixed in part | 11d0b9502, 22ca9cc74, b86689686 | The Start button, task buttons, tray and white space exist (steps 4, 12, 13); button 2 on each of them as Table A.1 has it (addendum B11) is not: E4's reason |
| B.1 | 🔧 Fixed | 08d728581, 3ed578659 | Same as 7.7 and 7.26: menus take arrow-key navigation (roving focus, Home/End, Return/Space), and ClassicySpinner takes Up and Down Arrow. |
| B.2 | 🔧 Fixed | d4a23b190, 3a30ada87 | Home and End go to the desktop's first and last icon through `classicyDesktopKeyCommand`, wired by C3. |
| B.3 | 🔧 Fixed | 462e43608 | Page keys as in 5.2. Under `layout.tree.keys: "windows"`, ClassicyTree's Ctrl/⌘ with an arrow, Home, End or a page key scrolls without changing the selection (TREEVIEW_ScrollKeyDown), giving way to the bare arrows from 7.21. |
| B.4 | 🔧 Fixed | 3ee697577 | Under `menu.standardShortcuts: "windows"`, SimpleText's Open… and Save carry Ctrl+O and Ctrl+S, claimed with preventDefault. |
| B.5 | 🔧 Fixed | 8e57449df, 1ed1b21f7 | F1 and Shift+F1 are bound under `balloonHelp.contextHelp`; the "?" box and the Help menu item start the same mode since C8. |
| B.6 | 🔧 Fixed | 3066b9019 | Same as 4.17. |
| B.7 | ⚠️ Deferred | — | Shell addendum B8 (menu-bar mode on a window bar) not implemented (E4's reason). |
| B.8 | 🔧 Fixed | 63ebc2f3f, 22ca9cc74, ce8bde683 | ALT+SPACE and ALT+F4 (step 9) and CTRL+ESC (step 12) are bound; the system menu spells ⌥F4 as "Alt+F4" under `menu.shortcutSpelling: "names"`. Confirmed at integration (shell addendum section A). |
| B.9 | ⚠️ Deferred | — | Shell addendum B20 (ALT+F6) not implemented (E4's reason). |
| B.10 | 🔧 Fixed | 57ae34974 | Same as 2.2: Alt+Enter on a selected item or a focused desktop icon runs Properties. |
| B.11 | 🔧 Fixed in part | b86689686, bf26606e9 | The taskbar menu's Minimize All Windows and Undo Minimize All are built (step 13, E1's form); Undo Minimize All forgetting its list when another window is activated or opened (addendum B21) is not: E1's notDone, "That is E4's B21, out of E1's scope", and E4's reason. |
| B.12 | 🔧 Fixed | 7470e0537 | Same as 4.11 and 4.12: the bundled titles, items and buttons carry Table B.5's letters, checked against Windows 98 SE's own menus. |

---

## Core changes and what remains

The package-scope fixes of the first pass are applied (3.1, 3.2, 6.1 modal, 7.2–7.4,
7.16–7.22, 8.1–8.6, 13.1–13.6, 14.1, 14.2), and the follow-up pass applied the
four package-scope items found after the fix groups closed (8.8, 8.10, 13.7,
13.10; a2c1d339d, 557289452) and the hooks of 6.1 (documents), 6.7, 6.8 / 7.24,
7.13 and 7.14 / 13.9 with their package rules (751ac4026, 6ad402bcc,
e013ae28c); the gates were run after each group
(`node bin/check-pixel-literals.ts`, `node bin/classicyLiteralColorSweep.ts`,
`ClassicyAppearance.varCoverage.test.ts`, `pnpm --filter
@classicy/appearance-windows98 exec vitest run`, the whole sheet compiling to one
`@layer classicy.package` block with no `!important`). The four package-scope items are
recorded in their findings (8.8, 8.10, 13.7, 13.10).

**Core changes made in the first pass** (commit 01758bd05, "fix(appearance): a
table's focus row and a framed holder as classes, not :has()", and the
follow-up pass's three hook commits, 751ac4026, 6ad402bcc and e013ae28c): the
one exception to "proposed, not applied" under "What is auditable", taken for
01758bd05 because the first pass's `:has()` rules for 8.3 and 14.2 failed the
browser floor (Firefox 113–120 has no `:has()`), and for the three because
each is an additive state class or optional prop that no base, Platinum or
System 7 rule reads, so those packages render byte for byte as before.
01758bd05's two hooks, read by no other package: ClassicyTable emits the
vocabulary state `focused` on its focus row (the keyboard cursor while it is
listed, else the first selected row, else the first row, whether or not the
list has focus; 14.2), and ClassicyWindow marks the contents holding a
modeless-dialog frame `classicyWindowContentsWithFrame`, beside
`classicyWindowContentsWithHeader` (8.3). 751ac4026 (menus): ClassicyMenuItem
takes `mark?: "check" | "bullet"`, a bullet item rendering as `menuitemradio`
with its gutter span carrying `classicyMenuItemBullet` (7.13), and
`isDefault?: boolean`, emitted as the `default` state on the item's `<li>`
(7.14 / 13.9). 6ad402bcc (windows): ClassicyWindow emits the vocabulary state
`expanded` while the store's `zoomed` is true (6.7), and carries
`classicyWindowNoResize` on its root while `resizable={false}` (6.1).
e013ae28c (scroll arrows): ClassicyScrollArea emits `disabled` on a bar's
start arrow while its axis is at 0 and on its end arrow within a pixel of its
maximum, both while the axis fits, from the same measurement that sets `fits`
(`classicyScrollAxisEnds`; 6.8 / 7.24). The vocabulary entries (`Bullet` and
`NoResize` as parts), tests, `docs/AGENT-REFERENCE.md` and
`docs/RELEASE-NOTES-3.8.md` went with each; a2c1d339d, the package pass, and
557289452, the review's fix, are package and documentation only.

**Core changes made by the Windows 98 completion program.** The hooks the
first pass proposed, and the ones the second pass's findings asked for, are
built, each additive: an optional layout key that only `windows98.json`
declares (absent, every other package behaves as before), an optional prop, or
a class only the Windows 98 package reads. The few changes every package sees
are recorded where they land: one Help menu in every package (ec433430a,
HIGOS8 p.92 and HIG7 p.125 have one Help menu too), press-drag-release on menu
titles (7.5) and auto-scroll under a file drag (6.11), both of which Mac OS 8
and System 7 have as well. By lane:

- **The Windows shell** (plan 0020-w98, steps 1–21 and E1–E4, with reviews A–C;
  04876e927 … be687a48b): `window.collapse`, `window.zoom`,
  `window.titleDoubleClick`, `window.frameEdges`, `window.systemMenu`,
  `window.captionTooltips`, `dialog.caption`, `menuBar.placement: "window"`
  with Help in each window bar, and `taskbar` (the Start menu, task buttons,
  status area, clock, Quick Launch, the taskbar's menu, Shut Down and Run,
  flashing task buttons, Taskbar Properties and docking); the runtime window
  registry and the taskbar band. Integration wired each scheme's caption,
  frame and menu metrics into it (29a022f86) and added `window.utilityTitle`.
- **Menus, controls and schemes** (lane 2; 08d728581, ce8bde683, 3ed578659,
  03c039b38, d70d4c7aa, 376c49cb5, with its review 70494a489 and 56d84b1a0):
  `menuBar.idleTimeoutMs`, `menu.keys`, `menu.disabledItems`,
  `menu.submenuDelayMs`, `menu.accessKeys`, `menu.shortcutSpelling`,
  `menu.emptySubmenus`, `keyboard.contextMenuKey`, `tree.keys`,
  `balloonHelp.placement`, `scrollBar.liveSnapBack`/`snapBackScale`,
  `fileDialog.listFlow`, `fileList.foldersFirst`, `fileBrowser.keys`,
  `finder.commands`; ClassicyListBox `checkboxes`, ClassicySpinner `wrap`,
  ClassicySplitView `splittable`; Windows 98 SE's 33 schemes from SHELL2.INF
  and a forced-colors block.
- **Windows 98 SE's art** (lane 3; 104ebd968, a206f0031, ced950214,
  1c4f133f1, with its review cf4e1bc7a): icons, system art, app names and the
  `desktopIcons` override; USER.EXE's cursors and MS Sans Serif's recreation;
  the CD's sounds with optional sprites and alert-type sounds; wallpapers,
  patterns and seven screen savers.
- **Selection, files, documents, help and keyboard** (lane 4; be51df8bd …
  41de137d5, with its review 2b38e1f69): `mouse`, `input.escapeCancels`,
  `selection.*`, `contextMenu.openOn`, `fileBrowser.iconSelection` and
  `regionSelect`, `keyboard.command` and `editableShortcuts`,
  `menu.standardShortcuts`, `menu.itemHelp`, `menu.confirmEllipsis`,
  `document.*`, `window.restoreViewState`, `text.wordSelect`, `edit.scope` and
  `edit.menu`, `textField.contextMenu`, `files.*`, `transfer.*`,
  `assistant.navigation`, `help.topicWindow`, `balloonHelp.contextHelp`,
  `unlabeledTips` and its timing and gating keys, `dialog.flushInput`,
  `icon.aliasBadge`, `crashScreen`; the package fields `colorLabels` and
  `fileTypeNames`; `registerApp`'s `creates` and `verbs`; file shortcuts,
  `fs.copy` and the file clipboard; the Properties sheet, Open With, Help
  Topics and What's This?. Its desktop and window parts were wired into the
  shell's files at integration (3a30ada87, 1ed1b21f7).

**Still open** (each with the reason in the table above):

- **The shell addendum's section B** (B1, B3–B16, B18–B21; B2 and B19 in
  part): File's Exit and no Special menu in window bars (1.6), the Start flag
  and banner bitmaps (1.9), the tray's menus, default item and Sound tips
  (10.16–10.18), the pointer while moving a window (4.4), sizing the taskbar
  by its inner edge (1.11, 4.13, 4.20), Start's press-drag (4.20), access keys
  in the shell's menus (4.21, 11.5), menu-bar mode on a window bar (B.7),
  shell presses keeping every selection (5.41), the taskbar from the keyboard
  (5.42), button 2 on the taskbar's objects (5.43, A.10), an inactive window's
  bar (9.4), no task button for secondary windows (10.11), re-clamping on a
  resize (10.24), the message on a drop over a task button (10.12), no text in
  the tray (10.13), application-modal dialogs (10.21), the rest of a window's
  Help menu (12.1), ALT+F6 (B.9) and Undo Minimize All forgetting its list
  (B.11). The shell's E4 result left all of them, none half-done in the tree.
- **6.9**, a product decision: Windows 95/98's disabled bar kept over the 1995
  text's full-length scroll box.

**Product decisions recorded** (the OS as shipped kept, or a reading chosen):

- **3.2** the taskbar's raised edge faces the desktop, on whichever edge it is
  docked.
- **6.9** no full-length scroll box on a fitting bar.
- **7.23** Windows 95's raised toolbar buttons in its preset and Windows 98's
  flat ones elsewhere, from the `toolbar.restBevel` knob (376c49cb5).
- **14.3** a forced-colors block and the twelve High Contrast schemes, both
  (376c49cb5).
- Each lane's results record the smaller choices in the AGENT-REFERENCE
  sections they wrote (for example Windows 98 SE's "&Help Topics" over Table
  B.5's T, comctl32's press-time tab choice over the 1995 text, Send To left
  out).

## Next pass

- The shell addendum's section B requirements listed under "Still open", each
  about the size of a plan step.
- Review C's open question: with Always on top cleared, whether Windows 98
  lets maximized windows cover the taskbar (the shell follows ReactOS and keeps
  the work area reserved); it needs a Windows 98 capture.
- Visual parity of the Windows 98 shell against a Windows 98 SE capture, which
  step 21 could not make (no capture was available; the values were checked
  against the WIG figures, the CD's bitmaps and Wine's and ReactOS's
  constants).
