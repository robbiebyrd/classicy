# About this directory

Files in the "Resources" folder are additional sources that may be used as part of a build process, or added for optional use by other developers.

## `screenshots/mac-os-8.1/`

Mac OS 8.1 as Infinite Mac runs it (its "Mac OS 8.1" disk, 640 x 480),
captured from the emulator's own framebuffer with
`packages/appearance/system7/bin/capture-references.mjs serve` (story
0225-ci7). They are the references for Platinum's menu marks and checkbox
check (`src/styles/_marks.scss`) and for the Notification Manager's menu
bar (`docs/AGENT-REFERENCE.md` §4.11). The emulator shows #DDDDDD as
#E7E7E7, #888888 as #A5A5A5, #AAAAAA as #C0C0C0, #777777 as #969696 and
#555555 as #777777.

| File | Shows |
| --- | --- |
| `platinum-81-appmenu-notification.png` | A background Script Editor's notification (`display dialog` after `tell application "Finder" to activate`): the Application menu's ◆ beside Script Editor and ✓ beside the Finder (Charcoal 12's diamond and check) |
| `platinum-81-appmenu-notification-open.png` | The same menu open: the title shows the front application's (the Finder's) own icon |
| `platinum-81-blink-appmenu-open-sheet.png` | Twelve crops of the open Application menu, at six phases of the blink, twice each: the title always the Finder's icon |
| `platinum-81-blink-filemenu-open-sheet.png` | Twelve crops of the Application title with the Finder's File menu open, at six phases (rows), twice each (columns): the blink frozen on the frame it showed |
| `platinum-81-finder-view-menu.png` | The Finder's View menu: the check in a text-only menu |
| `platinum-81-popup-font.png` | Finder Preferences' "Font for views" pop-up, open: the check in a pop-up menu |
| `platinum-81-finder-preferences.png` | Finder Preferences: "Spring-loaded folders" checked, the Appearance Manager's checkbox check (the box at 154,128; HIGOS8 Figure 2-8's checked box, pixel for pixel) |
