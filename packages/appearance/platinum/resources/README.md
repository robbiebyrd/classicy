# About this directory

Files in the "Resources" folder are additional sources that may be used as part of a build process, or added for optional use by other developers.

## `screenshots/mac-os-8.1/`

Mac OS 8.1 as Infinite Mac runs it (its "Mac OS 8.1" disk, 640 x 480),
captured from the emulator's own framebuffer with
`packages/appearance/system7/bin/capture-references.mjs serve` (story
0225-ci7). They are the references for Platinum's menu marks and checkbox
check (`src/styles/_marks.scss`) and for the Notification Manager's menu
bar (`docs/AGENT-REFERENCE.md` §4.11). The emulator shows #DDDDDD as
#E7E7E7, #888888 as #A5A5A5, #AAAAAA as #C0C0C0, #999999 as #B3B3B3,
#777777 as #969696, #555555 as #777777 and #444444 as #666666.

| File | Shows |
| --- | --- |
| `platinum-81-appmenu-notification.png` | A background Script Editor's notification (`display dialog` after `tell application "Finder" to activate`): the Application menu's ◆ beside Script Editor and ✓ beside the Finder (Charcoal 12's diamond and check) |
| `platinum-81-appmenu-notification-open.png` | The same menu open: the title shows the front application's (the Finder's) own icon |
| `platinum-81-blink-appmenu-open-sheet.png` | Twelve crops of the open Application menu, at six phases of the blink, twice each: the title always the Finder's icon |
| `platinum-81-blink-filemenu-open-sheet.png` | Twelve crops of the Application title with the Finder's File menu open, at six phases (rows), twice each (columns): the blink frozen on the frame it showed |
| `platinum-81-finder-view-menu.png` | The Finder's View menu: the check in a text-only menu |
| `platinum-81-popup-font.png` | Finder Preferences' "Font for views" pop-up, open: the check in a pop-up menu |
| `platinum-81-finder-preferences.png` | Finder Preferences: "Simple Finder" empty (the box at 154,84) and "Spring-loaded folders" checked (154,128), the Appearance Manager's checkbox and check, each HIGOS8 Figure 2-8's box pixel for pixel |
| `platinum-81-finder-preferences-pressed-empty.png` | The same, the mouse held down on "Simple Finder"'s label (so the pointer is off the box): the pressed empty box, Figure 2-8's pixel for pixel (#999999 shows as #B3B3B3, #444444 as #666666) |
| `platinum-81-finder-preferences-pressed-checked.png` | The mouse held down on "Spring-loaded folders"' label: the pressed checked box, Figure 2-8's pixel for pixel, the check reaching past the box |
| `platinum-81-script-editor-syntax-error.png` | Script Editor's "Syntax Error" box (Apple Extras > AppleScript > Script Editor, a script that does not compile), a movable modal dialog box: its frame is two rings inside the black border, #DDDDDD (shown #E7E7E7) along the top and left and #555555 (shown #777777) along the bottom and right, then white and #999999 (shown #B3B3B3), the inner ring's two far corners #DDDDDD; the title bar white along its top and left, #999999 along its bottom and right (story 0236-2f8). No stock 8.1 application found shows a movable alert box (Figure 3-4's red frame): the Finder's alerts are fixed (Figure 3-5's), and this, the one other alert-like box looked at, is a dialog box |

## `screenshots/higos8/`

Figures of the Mac OS 8 Human Interface Guidelines
(`Apple_HIGOS8_1997_Guidelines.pdf`, and its 1996 draft,
`Apple_HIGOS8_1996_Guidelines.pdf`) as the PDFs embed them: 1:1 screen
bitmaps, extracted with `pdfimages -png`, in each PDF's own palette, near the
screen's colors but not equal to them (the window's face is #E3E4E4 in the
1997 PDF and #E4E4E4 in the draft).

| File | Shows |
| --- | --- |
| `figure-3-4-movable-alert.png` | p.61, Figure 3-4, "A movable alert box": 375 x 132, the window 374 x 131 with its drop shadow. Inside the black border, the title bar (rows 1-20) is bevelled white along its top and left and light red (#FDABA9) along its bottom and right, its face (#FED6D5) at the two far corners; a black line (row 21); then two rings round the contents: light red along the top and left (both far corners included) and dark red (#FC7D78) along the right and bottom, then white along the top and left and gray (#A9A9A9) along the right and bottom, that ring's two far corners light red. Platinum's movable alert draws it pixel for pixel (`src/styles/components/_Alert.scss`, `alertFrame.css.test.ts`; story 0236-2f8) |
| `draft-1996-figure-9-movable-alert.png` | The 1996 draft's p.13, Figure 9, "Movable alert box design": a stop alert, 378 x 136 (the window one pixel in from the image's edge). The same frame as Figure 3-4, pixel for pixel, in the draft's palette (#FFACAA, #FF7F7A, #FFD7D6) |
