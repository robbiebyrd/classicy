# System 7 asset inventory

Every icon, system-art key, cursor, alert sound and window color the System 7 Appearance Package (`@classicy/appearance-system7`, plan 0018-dbd §2.1, design 0017-6me) needs from System 7.5, and exactly which file to export for each. Work down the tables and tick `[ ]` to `[x]` as files land. Rows whose Done cell is "—" need nothing from you.

**Fallback rule.** Where System 7 would show its own generic icon for a thing it lacked, the key reuses that generic (an extension newer than 7.5 gets the generic extension, an unknown document the generic document, a DVD the CD-ROM). The core image is kept only for Classicy-specific UI glyphs, brands, and things with no file-kind meaning.

`src/Appearance/ClassicySystem7AssetInventory.repo.test.ts` reads the keys from the code and fails if any icon key, `ClassicySystemArtKey` or `ClassicyCursorRole` is missing here, so a key added later shows up as a test failure, not a blank image.

## Summary

| Section | Rows | Your work |
| --- | --- | --- |
| Icons | 294 keys | 66 export (up to 4 PNGs each); 61 reuse and 167 core need nothing. 26 exports have a known ID, 40 say "ID to confirm" |
| System art | 39 keys | the export and crop rows |
| Cursors | 13 roles | 3 exports (`CURS` 1, 2, 4) |
| Sounds | 6 alerts | 6 WAV exports and one copy |
| Window colors | `wctb` and `cctb` | read the hex values; sample 6 screen colors |
| Reference crops | 1 | one screenshot crop of the Control Strip |

## Export conventions

**Source files.** Work on copies of the System 7.5 files (System, Finder, control panels, extensions, applications from the install disks), never on a running System Folder. ResEdit 2.1 or Resorcerer in an emulator (Infinite Mac, Basilisk II) works; any tool that shows a resource's raw pixels is fine.

**Target root:** `packages/appearance/system7/src/assets/`

| Folder | Holds | Pixels from |
| --- | --- | --- |
| `icons/color/32/` | 32×32 color icons (the base tree) | `icl8` pixels, `ICN#` mask |
| `icons/color/16/` | 16×16 color icons | `ics8` pixels, `ics#` mask |
| `icons/bw/32/` | 32×32 1-bit icons (the `bw` variant) | `ICN#` image and mask |
| `icons/bw/16/` | 16×16 1-bit icons | `ics#` image and mask |
| `art/color/` | color system art (the base tree) | the resource or crop named in the row |
| `art/bw/` | 1-bit system art (the `bw` variant) | the same, from a Black & White screen |
| `cursors/` | 16×16 cursors (one set for both themes) | `CURS` image and mask |
| `sounds/system7/sprites/` | alert sounds, one WAV per sprite id | `snd ` resources |

Reference crops for art the implementer draws go to `packages/appearance/system7/resources/reference/` (never published).

**Four files per exported icon.** An icon row marked export is four PNGs with the File name: `icons/color/32/`, `icons/color/16/`, `icons/bw/32/`, `icons/bw/16/`. The Resources column says which families exist:

- `ICN#` `icl8` `ics#` `ics8`: all four files.
- No `ics#` in the file: skip both 16 px files (the 32 px image is scaled down).
- No `icl8` in the file: `icons/color/32/` gets the `ICN#` image (System 7 draws the 1-bit icon on color screens); likewise `ics#` for 16 px.
- `ics#` `ics8` only (Control Strip modules): the two 16 px files only.
- `ICON` (alert icons): 32 px only and 1-bit. Put the image in both `icons/bw/32/` and `icons/color/32/`; if the System file also has a `cicn` of the same ID, use it for `icons/color/32/`. `ICON` has no mask: export white as opaque white.
- `icl4`/`ics4` exist too; skip them, the 8-bit families supersede them.

**File names** are the key path in kebab case: dots become hyphens, a hyphen goes before each capital and before a run of digits, everything lowercase, leading underscores dropped. `system.folders.controlPanels` → `system-folders-control-panels.png`; `system.files._1292` → `system-files-1292.png`. Every File cell already holds the name; copy it.

**PNG rules (all files):**

- Exactly the native size (32×32, 16×16, or the crop named). No scaling, smoothing, anti-aliasing, dithering or color correction.
- No color profile: strip `iCCP`, `gAMA`, `cHRM` and `sRGB` chunks so the stored values are the exact System colors.
- Mask to transparency: mask bit 0 is fully transparent, 1 is fully opaque. No partial alpha anywhere.
- 1-bit files (`bw`, cursors): every pixel is opaque black `#000000`, opaque white `#FFFFFF` or transparent.
- Color files: the exact `icl8`/`ics8` colors (the System 8-bit palette), as an 8-bit indexed PNG with a transparent entry, or RGBA.
- Crops: from 1x screenshots of System 7.5 in an emulator at 100% with no scaling filter. Color crops with Monitors set to 256 colors; B&W crops with Monitors set to Black & White. Crop exactly the pixels the row names.

**Cursors.** From each `CURS`: image 1 + mask 1 is black, image 0 + mask 1 is white, image 0 + mask 0 is transparent, and image 1 + mask 0 (which inverts the screen) is black, since a PNG cannot invert. Write the hotspot in the Hotspot cell as (x, y): ResEdit's `CURS` editor shows it; in the raw resource it is the last four bytes, v then h, so x = h and y = v.

**Sounds.** The file name is the sprite id (`ClassicyAlertSimpleBeep.wav`); the audio pipeline (`bin/make_audio_sprites.sh`) builds the sprite sheet from the folder. Each `snd ` is one of two kinds:

- **Sampled** (it holds a sampled-sound buffer; most alerts): write it as WAV (PCM) at its stored depth and channel count (8-bit mono for the 7.5 alerts). A 22.254 kHz sound (Apple's rate, 22254.54 Hz) is written with a WAV rate of 22254 Hz; a 11.127 kHz one as 11127 Hz. No resampling, normalizing, trimming or fades.
- **Synthesized** (a format 1 `snd ` with only note or square-wave commands and no sampled data; Simple Beep may be one): there is nothing to export. Play it in the emulator (the Sound control panel plays an alert when you click its name) and record the emulator's audio output as WAV at 22,050 Hz, mono, 16-bit, trimmed to the sound: cut the silence before the first and after the last non-silent sample, with no fades or normalizing.

### Decisions

| Decision | Meaning | Your work |
| --- | --- | --- |
| export | Exported from a resource in a System 7.5 file | Export the files |
| crop | Cut from a 1x System 7.5 screenshot | Crop the files |
| draw | Drawn by the implementer, or copied from the named Platinum file | None |
| core | The package registers the core icon tree's existing image (the fallback for anything newer than System 7) | None |
| reuse | The package registers another row's file under this key | None |

### Finding an ID marked "to confirm"

- **Generic system icons** (the negative IDs quoted from Apple's `Icons.h`) are in the System file. If one is missing there, look in Finder under the same ID.
- **An application, control panel, extension or desk accessory's own icon:** open the file, open its `BNDL`, find the `FREF` for the file's own type (`APPL`, `cdev`, `INIT`, `appe`, `dfil`, …) and follow its local ID to the `ICN#` ID. Applications usually use 128, control panels -4064. The `icl8`, `ics#` and `ics8` share that ID.
- **A document icon:** the same `BNDL`, following the `FREF` for the document's type (`TEXT`, `PICT`, `MooV`, …).
- **Unsure which one it is:** ResEdit's `icl8` list shows thumbnails; pick by eye.
- Write the ID you used over "ID to confirm" in the Source cell, so the export can be repeated.

## Icons

Every leaf of the core icon tree (`src/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons.ts`). Every icon key a bundled app or component reads by name is in the tree; the test checks that too. Keys with no System 7 counterpart (apps and formats newer than System 7.5) are "core": they keep the core tree's image, never an empty one.

### Classicy

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| — | `classicy.logo` | Classicy wordmark (About box, Logo screen saver) | core | Classicy's brand, not System 7 art | — | — |
| — | `classicy.bg` | Earth photo behind About This Computer | core | Classicy's own art | — | — |

### Applications

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| — | `applications.internetExplorer.app` | Internet Explorer application | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.apple` | Apple logo (IE toolbar) | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.documentWarn` | IE document with a warning badge | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.document` | IE HTML document | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.downloadingFileAnimated` | Download in progress (animated) | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.downloadingFile` | Download in progress | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.forward` | Forward arrow | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.forwardOn` | Forward arrow, pressed | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.backward` | Back arrow | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.backwardOn` | Back arrow, pressed | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.loaderAnimated` | Throbber (animated) | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.loader` | Throbber | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.refresh` | Refresh arrow | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.refreshOn` | Refresh arrow, pressed | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.clipboard` | Clipboard | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.compass` | Compass (favorites) | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.documentDownload` | Download document | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.documentFolder` | Document in a folder | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.documentHome` | Home page document | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.documentLink` | Link document | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.documentMoveToFolder` | Move-to-folder document | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.documentNews` | News document | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.documentShortcut` | Internet shortcut document | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.documentShortcutEdit` | Edit shortcut document | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.documentSound` | Sound document | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.documentWarning` | Warning document | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.editor` | HTML editor | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.favorites` | Favorites (compass) | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.favoritesOn` | Favorites, pressed (compass) | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.find` | Find (magnifier) | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.globe` | Globe (web viewer, URL shortcuts) | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.logo` | IE logo | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.mailbox` | Mailbox | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.news` | News | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.preferences` | IE preferences | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.print` | Printer | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.internetExplorer.search` | Search | core | Internet Explorer (1996) is not on the System 7.5 disks | — | — |
| — | `applications.netscape.loaderAnimated` | Netscape throbber (animated) | core | Netscape (1994+) is not on the System 7.5 disks | — | — |
| — | `applications.netscape.loader` | Netscape throbber | core | Netscape is not on the System 7.5 disks | — | — |
| — | `applications.pager.app` | Pager application (pager device) | core | Classicy app; no System 7 counterpart | — | — |
| — | `applications.news.app` | News reader application | core | Classicy app; no System 7 counterpart | — | — |
| — | `applications.pictureViewer.app` | Picture Viewer application | reuse | `applications.simpletext.app` (SimpleText was System 7.5's picture viewer; Picture Viewer arrived with QuickTime 3, after 7.5) | — | — |
| — | `applications.radio.app` | Radio application | core | Classicy app; no System 7 counterpart | — | — |
| — | `applications.registerWithApple.app` | Register with Apple | core | Mac OS 7.6/8 era; not on the System 7.5 disks | — | — |
| — | `applications.setupAssistant.setupAssistant` | Mac OS Setup Assistant | core | Mac OS 8 era; not on the System 7.5 disks | — | — |
| [ ] | `applications.stickies.app` | Stickies application | export | Stickies (Apple Menu Items); ID to confirm: the application's own icon (`BNDL`, usually 128) | `ICN#` `icl8` `ics#` `ics8` | `applications-stickies-app.png` |
| — | `applications.stickies.controlButtonSprites` | Stickies window button sprite sheet | core | UI sprite sheet, not an icon | — | — |
| [ ] | `applications.stickies.notes` | Stickies notes | export | Stickies (Apple Menu Items); ID to confirm: the document icon for the Stickies file in its `BNDL` (usually 129) | `ICN#` `icl8` `ics#` `ics8` | `applications-stickies-notes.png` |
| — | `applications.stickies.stack` | Stack of sticky notes | reuse | `applications.stickies.notes` (the Stickies file) | — | — |
| — | `applications.stuffit.app` | StuffIt application | core | StuffIt is third-party and not on the System 7.5 disks | — | — |
| — | `applications.stuffit.compressing` | StuffIt compressing | core | StuffIt is not on the System 7.5 disks | — | — |
| — | `applications.stuffit.file` | StuffIt archive | reuse | `system.files.document` (without StuffIt, System 7 shows the generic document) | — | — |
| — | `applications.usenet.app` | Usenet reader application | core | Classicy app's own icon (a brand) | — | — |
| — | `applications.usenet.search` | Usenet search | core | Classicy UI glyph | — | — |
| — | `applications.usenet.server` | Usenet server | core | Classicy UI glyph | — | — |
| — | `applications.systemProfiler.app` | Apple System Profiler | core | Apple System Profiler shipped after 7.5 | — | — |
| [ ] | `applications.simpletext.app` | SimpleText application | export | SimpleText; ID to confirm: the application's own icon (`BNDL`, usually 128) | `ICN#` `icl8` `ics#` `ics8` | `applications-simpletext-app.png` |

### Control panels

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | `controlPanels.appearanceManager.app` | Appearance control panel | export | Color control panel (its nearest System 7.5 counterpart: window and highlight colors); ID to confirm: the control panel's own icon (`BNDL`, usually -4064) | `ICN#` `icl8` `ics#` `ics8` | `control-panels-appearance-manager-app.png` |
| — | `controlPanels.appearanceManager.backgroundCenter` | Wallpaper position glyph: center | core | Classicy UI glyph; no System 7 counterpart | — | — |
| — | `controlPanels.appearanceManager.backgroundFill` | Wallpaper position glyph: fill | core | Classicy UI glyph; no System 7 counterpart | — | — |
| — | `controlPanels.appearanceManager.backgroundScale` | Wallpaper position glyph: scale | core | Classicy UI glyph; no System 7 counterpart | — | — |
| — | `controlPanels.appearanceManager.backgroundTile` | Wallpaper position glyph: tile | core | Classicy UI glyph; no System 7 counterpart | — | — |
| — | `controlPanels.appearanceManager.file` | Appearance theme file | reuse | `system.files.document` (System 7 shows the generic document) | — | — |
| — | `controlPanels.appearanceManager.preferences` | Appearance preferences file | reuse | `system.files.preferences` (generic preferences) | — | — |
| [ ] | `controlPanels.controlStripManager.app` | Control Strip control panel | export | Control Strip control panel (PowerBook install of 7.5); ID to confirm: the control panel's own icon (`BNDL`, usually -4064) | `ICN#` `icl8` `ics#` `ics8` | `control-panels-control-strip-manager-app.png` |
| [ ] | `controlPanels.dateTimeManager.dateTimeManager` | Date & Time control panel | export | Date & Time control panel; ID to confirm: the control panel's own icon (`BNDL`, usually -4064) | `ICN#` `icl8` `ics#` `ics8` | `control-panels-date-time-manager-date-time-manager.png` |
| [ ] | `controlPanels.keyboard.app` | Keyboard control panel | export | Keyboard control panel; ID to confirm: the control panel's own icon (`BNDL`, usually -4064) | `ICN#` `icl8` `ics#` `ics8` | `control-panels-keyboard-app.png` |
| [ ] | `controlPanels.location.app` | Location Manager control panel | export | Map control panel (its nearest System 7.5 counterpart); ID to confirm: the control panel's own icon (`BNDL`, usually -4064) | `ICN#` `icl8` `ics#` `ics8` | `control-panels-location-app.png` |
| — | `controlPanels.location.map` | World map picture | core | A picture, not an icon | — | — |
| [ ] | `controlPanels.soundManager.app` | Sound control panel (also the menu-bar sound widget) | export | Sound control panel; ID to confirm: the control panel's own icon (`BNDL`, usually -4064) | `ICN#` `icl8` `ics#` `ics8` | `control-panels-sound-manager-app.png` |
| — | `controlPanels.soundManager.extension` | Sound Manager extension | reuse | `system.extensions.soundManager` | — | — |
| — | `controlPanels.soundManager.preferences` | Sound preferences file | reuse | `system.files.preferences` (generic preferences) | — | — |
| — | `controlPanels.soundManager.sound33` | Speaker at one third volume | core | Classicy volume glyph; no System 7 set | — | — |
| — | `controlPanels.soundManager.sound66` | Speaker at two thirds volume | core | Classicy volume glyph; no System 7 set | — | — |
| — | `controlPanels.soundManager.soundMute` | Speaker, muted | core | Classicy volume glyph; no System 7 set | — | — |
| — | `controlPanels.soundManager.soundOff` | Speaker, off (menu-bar widget) | core | Classicy volume glyph; no System 7 set | — | — |
| — | `controlPanels.soundManager.soundOn` | Speaker, on (menu-bar widget) | core | Classicy volume glyph; no System 7 set | — | — |
| [ ] | `controlPanels.soundManager.stt` | Speech recognition (ear) | export | Speech Setup control panel (PlainTalk 1.x, AV and Power Macintosh installs, 1993); ID to confirm: the control panel's own icon (`BNDL`, usually -4064) | `ICN#` `icl8` `ics#` `ics8` | `control-panels-sound-manager-stt.png` |
| [ ] | `controlPanels.soundManager.tts` | Text to speech (face) | export | Speech Manager extension (PlainTalk / MacinTalk, 1993); ID to confirm: the extension's own icon (`BNDL`) | `ICN#` `icl8` `ics#` `ics8` | `control-panels-sound-manager-tts.png` |

### System: Control Strip modules

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| — | `system.controlStrip.cd` | Control Strip CD module (16 px) | core | No CD module in the 7.5 Control Strip | — | — |
| [ ] | `system.controlStrip.fileSharing` | Control Strip File Sharing module (16 px) | export | File Sharing module (Control Strip Modules folder, PowerBook install); ID to confirm: the module's small icon family | `ics#` `ics8` | `system-control-strip-file-sharing.png` |
| [ ] | `system.controlStrip.moduleFile` | Control Strip module file (32 px) | export | Any Control Strip module file; ID to confirm: the module file's icon (`BNDL`) | `ICN#` `icl8` `ics#` `ics8` | `system-control-strip-module-file.png` |
| — | `system.controlStrip.screenSaver` | Control Strip Screen Saver module (16 px) | core | No screen saver in System 7.5 | — | — |
| [ ] | `system.controlStrip.sleep` | Control Strip Sleep Now module (16 px) | export | Sleep Now module (Control Strip Modules folder, PowerBook install); ID to confirm: the module's small icon family | `ics#` `ics8` | `system-control-strip-sleep.png` |
| [ ] | `system.controlStrip.sound` | Control Strip Sound Volume module (16 px) | export | Sound Volume module (Control Strip Modules folder, PowerBook install); ID to confirm: the module's small icon family | `ics#` `ics8` | `system-control-strip-sound.png` |
| — | `system.controlStrip.soundOff` | Control Strip Sound module, sound off (16 px) | core | Classicy variant; the 7.5 module has none | — | — |

### System: colors

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | `system.colors.extension` | Color Picker extension | export | Color Picker (Extensions); ID to confirm: the extension's own icon (`BNDL`) | `ICN#` `icl8` `ics#` `ics8` | `system-colors-extension.png` |
| — | `system.colors.pickerCmyk` | CMYK picker | core | Color Picker plug-in icons arrived after 7.5 | — | — |
| — | `system.colors.pickerCrayon` | Crayon picker | core | Color Picker plug-in icons arrived after 7.5 | — | — |
| — | `system.colors.pickerHex` | HTML (hex) picker | core | Color Picker plug-in icons arrived after 7.5 | — | — |
| — | `system.colors.pickerHls` | HLS picker | core | Color Picker plug-in icons arrived after 7.5 | — | — |
| — | `system.colors.pickerHsv` | HSV picker | core | Color Picker plug-in icons arrived after 7.5 | — | — |
| — | `system.colors.pickerRgb` | RGB picker | core | Color Picker plug-in icons arrived after 7.5 | — | — |

### System: desktop and display

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | `system.desktop.desktop` | Desktop | export | System, ID -3992 (`kDesktopIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-desktop-desktop.png` |
| — | `system.display.brightness` | Brightness glyph (sun) | core | UI glyph; no System 7 counterpart | — | — |
| — | `system.display.contrast` | Contrast glyph | core | UI glyph; no System 7 counterpart | — | — |

### System: drives

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | `system.drives.cdrom` | CD-ROM disc | export | System, ID -3987 (`kGenericCDROMIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-drives-cdrom.png` |
| [ ] | `system.drives.disk` | Hard disk (startup disk) | export | System, ID -3995 (`kGenericHardDiskIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-drives-disk.png` |
| — | `system.drives.driveExternal` | External hard disk | reuse | `system.drives.disk` (System 7 has one hard disk icon) | — | — |
| — | `system.drives.dvdAudio` | DVD-Audio disc | reuse | `system.drives.cdrom` (System 7's optical disc) | — | — |
| — | `system.drives.dvdVideo` | DVD-Video disc | reuse | `system.drives.cdrom` (System 7's optical disc) | — | — |
| — | `system.drives.dvd` | DVD disc | reuse | `system.drives.cdrom` (System 7's optical disc) | — | — |
| — | `system.drives.floppyMac` | Macintosh floppy disk | reuse | `system.drives.floppy` | — | — |
| [ ] | `system.drives.floppyPc` | PC (DOS) floppy disk | export | PC Exchange (Control Panels); ID to confirm: the DOS disk icon PC Exchange mounts (look in its `icl8` list) | `ICN#` `icl8` `ics#` `ics8` | `system-drives-floppy-pc.png` |
| [ ] | `system.drives.floppy` | Floppy disk | export | System, ID -3998 (`kFloppyIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-drives-floppy.png` |
| — | `system.drives.internetDrive` | Internet drive | reuse | `system.drives.networkDrive` (System 7's remote volume) | — | — |
| [ ] | `system.drives.networkDrive` | Network (AppleShare) volume | export | System, ID -3972 (`kGenericFileServerIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-drives-network-drive.png` |
| — | `system.drives.raid` | RAID volume | reuse | `system.drives.disk` (System 7's hard disk) | — | — |
| — | `system.drives.rom` | ROM disk | reuse | `system.drives.disk` (System 7's hard disk) | — | — |

### System: extensions

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | `system.extensions.appleGuide` | Apple Guide extension (also the Apple Guide app) | export | Apple Guide (Extensions); ID to confirm: the extension's own icon (`BNDL`) | `ICN#` `icl8` `ics#` `ics8` | `system-extensions-apple-guide.png` |
| [ ] | `system.extensions.appleShare` | AppleShare extension | export | AppleShare (Extensions); ID to confirm: the extension's own icon (`BNDL`; Chooser shows it) | `ICN#` `icl8` `ics#` `ics8` | `system-extensions-apple-share.png` |
| — | `system.extensions.appleVision` | AppleVision extension (boot parade) | reuse | `system.extension` (System 7 shows the generic extension) | — | — |
| — | `system.extensions.contextMenus` | Contextual Menu extension | reuse | `system.extension` (System 7 shows the generic extension) | — | — |
| — | `system.extensions.dateAndTime` | Date & Time extension | reuse | `controlPanels.dateTimeManager.dateTimeManager` | — | — |
| [ ] | `system.extensions.ethernet` | Ethernet extension | export | EtherTalk Phase 2 (Extensions, network install); ID to confirm: the extension's own icon (`BNDL`) | `ICN#` `icl8` `ics#` `ics8` | `system-extensions-ethernet.png` |
| — | `system.extensions.fmRadio` | FM radio extension (boot parade) | reuse | `system.extension` (System 7 shows the generic extension) | — | — |
| [ ] | `system.extensions.quickdraw` | QuickDraw extension | export | QuickDraw GX (Extensions); ID to confirm: the extension's own icon (`BNDL`) | `ICN#` `icl8` `ics#` `ics8` | `system-extensions-quickdraw.png` |
| [ ] | `system.extensions.quicktime` | QuickTime extension | export | QuickTime 2.0 (Extensions); ID to confirm: the extension's own icon (`BNDL`) | `ICN#` `icl8` `ics#` `ics8` | `system-extensions-quicktime.png` |
| — | `system.extensions.quicktimeMpeg` | QuickTime MPEG extension | reuse | `system.extension` (System 7 shows the generic extension) | — | — |
| — | `system.extensions.screensaver` | Screen Saver extension | reuse | `system.extension` (System 7 shows the generic extension) | — | — |
| [ ] | `system.extensions.soundManager` | Sound Manager extension | export | Sound Manager (Extensions); ID to confirm: the extension's own icon (`BNDL`) | `ICN#` `icl8` `ics#` `ics8` | `system-extensions-sound-manager.png` |

### System: files

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| — | `system.files._1292` | Flowchart document | reuse | `system.files.document` (System 7 shows the generic document) | — | — |
| — | `system.files._1294` | Yellow note stack document | reuse | `system.files.document` (System 7 shows the generic document) | — | — |
| [ ] | `system.files.application` | Generic application | export | System, ID -3996 (`kGenericApplicationIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-files-application.png` |
| [ ] | `system.files.document` | Generic document | export | System, ID -4000 (`kGenericDocumentIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-files-document.png` |
| [ ] | `system.files.edition` | Edition file | export | System, ID -3989 (`kGenericEditionFileIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-files-edition.png` |
| — | `system.files.fileInvisible` | Invisible file (dotted outline) | core | Classicy's invisible-file marker, a UI glyph: System 7 never shows invisible files | — | — |
| — | `system.files.filePc` | PC file | reuse | `system.files.document` (System 7 shows the generic document) | — | — |
| [ ] | `system.files.fileText` | Text document | export | SimpleText; ID to confirm: the `TEXT` document icon in its `BNDL` (usually 129) | `ICN#` `icl8` `ics#` `ics8` | `system-files-file-text.png` |
| — | `system.files.file` | Plain file | reuse | `system.files.document` | — | — |
| — | `system.files.internationalization` | International (flags) file | reuse | `system.files.document` (System 7 shows the generic document) | — | — |
| [ ] | `system.files.note` | Note Pad file | export | Note Pad (Apple Menu Items); ID to confirm: the Note Pad File document icon in its `BNDL` | `ICN#` `icl8` `ics#` `ics8` | `system-files-note.png` |
| [ ] | `system.files.photo` | Picture document | export | SimpleText; ID to confirm: the `PICT` document icon in its `BNDL` | `ICN#` `icl8` `ics#` `ics8` | `system-files-photo.png` |
| [ ] | `system.files.preferences` | Generic preferences file | export | System, ID -3971 (`kGenericPreferencesIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-files-preferences.png` |
| [ ] | `system.files.script` | Script | export | Script Editor (AppleScript); ID to confirm: the compiled script document icon in its `BNDL` | `ICN#` `icl8` `ics#` `ics8` | `system-files-script.png` |
| — | `system.files.settingsSync` | Settings sync file | reuse | `system.files.document` (System 7 shows the generic document) | — | — |
| — | `system.files.slideshow` | Slide show document | reuse | `system.files.document` (System 7 shows the generic document) | — | — |
| [ ] | `system.files.sound` | Sound file | export | System; ID to confirm: the icon family for file type `sfil` (a System 7 sound file; look in the System's `icl8` list) | `ICN#` `icl8` `ics#` `ics8` | `system-files-sound.png` |
| [ ] | `system.files.stationaryBlack` | Generic stationery | export | System, ID -3985 (`kGenericStationeryIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-files-stationary-black.png` |

### System: folders

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | `system.folders.appleMenuItem` | Apple Menu Items folder | export | System, ID -3982 (`kAppleMenuFolderIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-folders-apple-menu-item.png` |
| — | `system.folders.applicationSupport` | Application Support folder | reuse | `system.folders.directory` (generic folder) | — | — |
| — | `system.folders.applications` | Applications folder | reuse | `system.folders.directory` (generic folder) | — | — |
| — | `system.folders.assistant` | Assistants folder | reuse | `system.folders.directory` (generic folder) | — | — |
| — | `system.folders.colorsyncProfiles` | ColorSync Profiles folder | reuse | `system.folders.directory` (generic folder) | — | — |
| — | `system.folders.compressed` | Compressed folder | reuse | `system.folders.directory` (generic folder) | — | — |
| — | `system.folders.contextualMenuItems` | Contextual Menu Items folder | reuse | `system.folders.directory` (generic folder) | — | — |
| [ ] | `system.folders.controlPanels` | Control Panels folder | export | System, ID -3976 (`kControlPanelFolderIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-folders-control-panels.png` |
| — | `system.folders.controlStrip` | Control Strip Modules folder | reuse | `system.folders.directory` (generic folder) | — | — |
| [ ] | `system.folders.directory` | Generic folder | export | System, ID -3999 (`kGenericFolderIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-folders-directory.png` |
| [ ] | `system.folders.extensions` | Extensions folder | export | System, ID -3973 (`kExtensionsFolderIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-folders-extensions.png` |
| — | `system.folders.extras` | Apple Extras folder | reuse | `system.folders.directory` (generic folder) | — | — |
| — | `system.folders.favorites` | Favorites folder | reuse | `system.folders.directory` (generic folder) | — | — |
| — | `system.folders.folderApple` | Folder with an Apple | reuse | `system.folders.appleMenuItem` | — | — |
| — | `system.folders.folderExtensions` | Extensions folder (alternate) | reuse | `system.folders.extensions` | — | — |
| [ ] | `system.folders.folderFlip` | Open folder | export | System, ID -3997 (`kOpenFolderIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-folders-folder-flip.png` |
| — | `system.folders.folderFonts` | Fonts folder (alternate) | reuse | `system.folders.fonts` | — | — |
| — | `system.folders.folderLdap` | LDAP folder | reuse | `system.folders.directory` (generic folder) | — | — |
| — | `system.folders.folderPreferences` | Preferences folder (alternate) | reuse | `system.folders.preferences` | — | — |
| [ ] | `system.folders.folderPrinters` | Printers folder | export | System, ID -3975 (`kPrintMonitorFolderIconResource`, PrintMonitor Documents) | `ICN#` `icl8` `ics#` `ics8` | `system-folders-folder-printers.png` |
| — | `system.folders.folderSystemProtected` | Locked System Folder | reuse | `system.folders.system` | — | — |
| — | `system.folders.folderSystem` | System Folder (alternate) | reuse | `system.folders.system` | — | — |
| [ ] | `system.folders.fonts` | Fonts folder | export | System, ID -3968 (`kFontsFolderIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-folders-fonts.png` |
| — | `system.folders.help` | Help folder | reuse | `system.folders.directory` (generic folder) | — | — |
| — | `system.folders.internet` | Internet folder | reuse | `system.folders.directory` (generic folder) | — | — |
| — | `system.folders.internetSearchSites` | Internet Search Sites folder | reuse | `system.folders.directory` (generic folder) | — | — |
| — | `system.folders.languageAndRegion` | Language & Region folder | reuse | `system.folders.directory` (generic folder) | — | — |
| [ ] | `system.folders.preferences` | Preferences folder | export | System, ID -3974 (`kPreferencesFolderIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-folders-preferences.png` |
| — | `system.folders.recentDocuments` | Recent Documents folder | reuse | `system.folders.directory` (generic folder) | — | — |
| — | `system.folders.scripts` | Scripts folder | reuse | `system.folders.directory` (generic folder) | — | — |
| [ ] | `system.folders.startupItems` | Startup Items folder | export | System, ID -3981 (`kStartupFolderIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-folders-startup-items.png` |
| [ ] | `system.folders.suitcaseSystem` | System file (suitcase with a Mac) | export | System; ID to confirm: the icon family for file type `zsys` (the System file's own icon) | `ICN#` `icl8` `ics#` `ics8` | `system-folders-suitcase-system.png` |
| [ ] | `system.folders.suitcase` | Suitcase (font or DA suitcase) | export | System, ID -3970 (`kGenericSuitcaseIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-folders-suitcase.png` |
| — | `system.folders.suitecaseSystem` | System suitcase (misspelled duplicate key) | reuse | `system.folders.suitcaseSystem` | — | — |
| [ ] | `system.folders.system` | System Folder | export | System, ID -3983 (`kSystemFolderIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-folders-system.png` |
| — | `system.folders.textEncodings` | Text Encodings folder | reuse | `system.folders.directory` (generic folder) | — | — |
| — | `system.folders.utilities` | Utilities folder | reuse | `system.folders.directory` (generic folder) | — | — |

### System: network

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | `system.network.chooser` | Chooser | export | Chooser (Apple Menu Items); ID to confirm: the desk accessory's own icon (`BNDL`) | `ICN#` `icl8` `ics#` `ics8` | `system-network-chooser.png` |
| — | `system.network.controlpanelInternet` | Internet control panel | core | Mac OS 8.5 era | — | — |
| — | `system.network.crypto` | Encryption | core | Concept glyph with no file-kind meaning | — | — |
| — | `system.network.fileServer` | File server | reuse | `system.drives.networkDrive` (the same -3972 server icon) | — | — |
| — | `system.network.globeAnimated` | Spinning globe (animated) | core | Concept glyph with no file-kind meaning | — | — |
| — | `system.network.globe` | Globe | core | Concept glyph with no file-kind meaning | — | — |
| — | `system.network.internetConfig` | Internet Config | core | Third-party; not on the System 7.5 disks | — | — |
| — | `system.network.internetServices` | Internet services | core | Concept glyph with no file-kind meaning | — | — |
| — | `system.network.internet` | Internet | core | Concept glyph with no file-kind meaning | — | — |
| — | `system.network.ldapDirectory` | LDAP directory | core | Concept glyph with no file-kind meaning | — | — |
| — | `system.network.modem` | Modem | core | Hardware glyph with no file-kind meaning | — | — |
| [ ] | `system.network.networkLocal` | Local network | export | Network control panel; ID to confirm: the control panel's own icon (`BNDL`, usually -4064) | `ICN#` `icl8` `ics#` `ics8` | `system-network-network-local.png` |
| — | `system.network.networkPublic` | Public network | core | Concept glyph with no file-kind meaning | — | — |
| — | `system.network.sslInvalid` | Invalid certificate | core | Concept glyph with no file-kind meaning | — | — |
| — | `system.network.sslWeb` | Secure web | core | Concept glyph with no file-kind meaning | — | — |
| — | `system.network.ssl` | Lock (secure) | core | Concept glyph with no file-kind meaning | — | — |
| — | `system.network.terminal` | Terminal | core | Concept glyph with no file-kind meaning | — | — |
| — | `system.network.usenet` | Usenet | core | Concept glyph with no file-kind meaning | — | — |
| [ ] | `system.network.userDirectory` | User directory (person with a folder) | export | Users & Groups control panel; ID to confirm: the control panel's own icon (`BNDL`, usually -4064) | `ICN#` `icl8` `ics#` `ics8` | `system-network-user-directory.png` |

### System: QuickTime

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| — | `system.quicktime.backwardButton` | Step back button | core | QuickTime controller glyph drawn by the movie embed; not System art | — | — |
| — | `system.quicktime.cc` | Closed captions badge | core | QuickTime controller glyph drawn by the movie embed; not System art | — | — |
| — | `system.quicktime.controlPanel` | QuickTime Settings control panel | core | QuickTime Settings arrived with QuickTime 2.5, after 7.5 | — | — |
| — | `system.quicktime.extension` | QuickTime extension (alternate) | reuse | `system.extensions.quicktime` | — | — |
| — | `system.quicktime.forwardButton` | Step forward button | core | QuickTime controller glyph drawn by the movie embed; not System art | — | — |
| — | `system.quicktime.fullscreenButton` | Full screen button | core | QuickTime controller glyph drawn by the movie embed; not System art | — | — |
| — | `system.quicktime.movieStationary` | Movie stationery | reuse | `system.files.stationaryBlack` (a stationery pad whose application has no stationery icon gets System 7's generic stationery; stationery-ness is what the icon says) | — | — |
| [ ] | `system.quicktime.movie` | QuickTime movie document | export | MoviePlayer (QuickTime 2.0); ID to confirm: the `MooV` document icon in its `BNDL` | `ICN#` `icl8` `ics#` `ics8` | `system-quicktime-movie.png` |
| — | `system.quicktime.pauseButton` | Pause button | core | QuickTime controller glyph drawn by the movie embed; not System art | — | — |
| — | `system.quicktime.playButton` | Play button | core | QuickTime controller glyph drawn by the movie embed; not System art | — | — |
| [ ] | `system.quicktime.player` | Movie player application | export | MoviePlayer (QuickTime 2.0); ID to confirm: the application's own icon (`BNDL`, usually 128) | `ICN#` `icl8` `ics#` `ics8` | `system-quicktime-player.png` |
| — | `system.quicktime.splash` | QuickTime splash logo | core | Splash art, not an icon | — | — |
| — | `system.quicktime.thumbSlider` | Seek slider thumb | core | QuickTime controller glyph drawn by the movie embed; not System art | — | — |
| — | `system.quicktime.volumeSlider` | Volume slider thumb | core | QuickTime controller glyph drawn by the movie embed; not System art | — | — |

### System: rich-text editor toolbar

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| — | `system.richTextEditor.menubar.alignCenterActive` | Toolbar button: Align center, active | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.alignCenterDepressed` | Toolbar button: Align center, pressed | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.alignCenterOff` | Toolbar button: Align center, off | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.alignLeftActive` | Toolbar button: Align left, active | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.alignLeftDepressed` | Toolbar button: Align left, pressed | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.alignLeftOff` | Toolbar button: Align left, off | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.alignRightActive` | Toolbar button: Align right, active | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.alignRightDepressed` | Toolbar button: Align right, pressed | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.alignRightOff` | Toolbar button: Align right, off | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.boldActive` | Toolbar button: Bold, active | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.boldDepressed` | Toolbar button: Bold, pressed | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.boldOff` | Toolbar button: Bold, off | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.capsActive` | Toolbar button: Caps, active | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.capsDepressed` | Toolbar button: Caps, pressed | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.capsOff` | Toolbar button: Caps, off | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.indentActive` | Toolbar button: Indent, active | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.indentOff` | Toolbar button: Indent, off | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.italicActive` | Toolbar button: Italic, active | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.italicDepressed` | Toolbar button: Italic, pressed | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.italicOff` | Toolbar button: Italic, off | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.orderedListActive` | Toolbar button: Numbered list, active | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.orderedListDepressed` | Toolbar button: Numbered list, pressed | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.orderedListOff` | Toolbar button: Numbered list, off | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.outdentActive` | Toolbar button: Outdent, active | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.outdentOff` | Toolbar button: Outdent, off | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.ruleActive` | Toolbar button: Horizontal rule, active | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.ruleOff` | Toolbar button: Horizontal rule, off | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.search` | Toolbar button: search | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.underlineActive` | Toolbar button: Underline, active | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.underlineDepressed` | Toolbar button: Underline, pressed | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.underlineOff` | Toolbar button: Underline, off | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.unorderedListActive` | Toolbar button: Bulleted list, active | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.unorderedListDepressed` | Toolbar button: Bulleted list, pressed | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |
| — | `system.richTextEditor.menubar.unorderedListOff` | Toolbar button: Bulleted list, off | core | Classicy's rich-text toolbar glyph; System 7.5 has no such toolbar | — | — |

### System: security

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| — | `system.security.id` | ID card | core | Concept glyph with no file-kind meaning | — | — |
| — | `system.security.key` | Key | core | Concept glyph with no file-kind meaning | — | — |

### System: Sherlock

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| — | `system.sherlock.searchData` | Search data | reuse | `system.sherlock.sherlock` (Find File) | — | — |
| — | `system.sherlock.searchFiles` | Search files | reuse | `system.sherlock.sherlock` (Find File) | — | — |
| — | `system.sherlock.search` | Search (PDF viewer find) | reuse | `system.sherlock.sherlock` (Find File) | — | — |
| [ ] | `system.sherlock.sherlock` | Sherlock (find) | export | Find File (Apple Menu Items, System 7.5's find); ID to confirm: the application's own icon (`BNDL`, usually 128) | `ICN#` `icl8` `ics#` `ics8` | `system-sherlock-sherlock.png` |

### System: tag colors

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| — | `system.tags.colors.aqua` | Tag swatch: aqua | core | Classicy's tag swatch; System 7.5 labels have no swatch icons | — | — |
| — | `system.tags.colors.black` | Tag swatch: black | core | Classicy's tag swatch; System 7.5 labels have no swatch icons | — | — |
| — | `system.tags.colors.blue` | Tag swatch: blue | core | Classicy's tag swatch; System 7.5 labels have no swatch icons | — | — |
| — | `system.tags.colors.fuchsia` | Tag swatch: fuchsia | core | Classicy's tag swatch; System 7.5 labels have no swatch icons | — | — |
| — | `system.tags.colors.gray` | Tag swatch: gray | core | Classicy's tag swatch; System 7.5 labels have no swatch icons | — | — |
| — | `system.tags.colors.green` | Tag swatch: green | core | Classicy's tag swatch; System 7.5 labels have no swatch icons | — | — |
| — | `system.tags.colors.lime` | Tag swatch: lime | core | Classicy's tag swatch; System 7.5 labels have no swatch icons | — | — |
| — | `system.tags.colors.maroon` | Tag swatch: maroon | core | Classicy's tag swatch; System 7.5 labels have no swatch icons | — | — |
| — | `system.tags.colors.navy` | Tag swatch: navy | core | Classicy's tag swatch; System 7.5 labels have no swatch icons | — | — |
| — | `system.tags.colors.olive` | Tag swatch: olive | core | Classicy's tag swatch; System 7.5 labels have no swatch icons | — | — |
| — | `system.tags.colors.purple` | Tag swatch: purple | core | Classicy's tag swatch; System 7.5 labels have no swatch icons | — | — |
| — | `system.tags.colors.red` | Tag swatch: red | core | Classicy's tag swatch; System 7.5 labels have no swatch icons | — | — |
| — | `system.tags.colors.silver` | Tag swatch: silver | core | Classicy's tag swatch; System 7.5 labels have no swatch icons | — | — |
| — | `system.tags.colors.teal` | Tag swatch: teal | core | Classicy's tag swatch; System 7.5 labels have no swatch icons | — | — |
| — | `system.tags.colors.white` | Tag swatch: white | core | Classicy's tag swatch; System 7.5 labels have no swatch icons | — | — |
| — | `system.tags.colors.yellow` | Tag swatch: yellow | core | Classicy's tag swatch; System 7.5 labels have no swatch icons | — | — |

### System: other

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| — | `system.appleBlackOnWhite` | Black Apple logo on white | core | Logo art; the Apple menu glyph is the `appleMenu` system art | — | — |
| — | `system.appleWhiteOnBlack` | White Apple logo on black | core | Logo art; the Apple menu glyph is the `appleMenu` system art | — | — |
| — | `system.bigSwitchOff` | Power switch, off | core | Classicy UI glyph | — | — |
| — | `system.bigSwitchOn` | Power switch, on | core | Classicy UI glyph | — | — |
| [ ] | `system.clipboard` | Clipboard file | export | System; ID to confirm: the icon family for file type `CLIP` (Finder's `FREF`/`BNDL` maps it; look for the clipboard in the System's `icl8` list) | `ICN#` `icl8` `ics#` `ics8` | `system-clipboard.png` |
| — | `system.comport1` | COM1 serial port | core | Hardware glyph with no file-kind meaning | — | — |
| — | `system.comport2` | COM2 serial port | core | Hardware glyph with no file-kind meaning | — | — |
| [ ] | `system.error` | Stop alert icon | export | System, ID 0 (`kStopIcon`). 1-bit, no mask, no small size | `ICON` (`cicn` if present) | `system-error.png` |
| [ ] | `system.extension` | Generic extension (puzzle piece) | export | System, ID -16415 (`kGenericExtensionIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-extension.png` |
| [ ] | `system.help` | Help (Finder Preferences) | export | System, ID -20271 (`kHelpIconResource`) to confirm: Icons.h names it, check it is the Help icon in 7.5 | `ICN#` `icl8` `ics#` `ics8` | `system-help.png` |
| [ ] | `system.info` | Note alert icon | export | System, ID 1 (`kNoteIcon`). 1-bit, no mask, no small size | `ICON` (`cicn` if present) | `system-info.png` |
| — | `system.internet` | Internet (hand and globe) | core | Concept glyph with no file-kind meaning | — | — |
| — | `system.macClassic` | Macintosh Classic with mouse | reuse | `system.mac` (the compact Mac machine icon) | — | — |
| — | `system.macWink` | Winking compact Mac | core | Classicy's whimsical Mac glyph, no file-kind meaning | — | — |
| [ ] | `system.mac` | Compact Macintosh (About This Computer, file dialogs) | export | System; ID to confirm: a compact Mac machine icon (About This Macintosh shows it; browse the System's `ICN#` list with negative IDs). If none, crop it from About This Macintosh on an emulated compact Mac | `ICN#` `icl8` `ics#` `ics8` | `system-mac.png` |
| [ ] | `system.macos` | Finder / Mac OS face (Finder's application icon, desktop) | export | Finder (System Folder); ID to confirm: the application's own icon (`BNDL`, usually 128) | `ICN#` `icl8` `ics#` `ics8` | `system-macos.png` |
| — | `system.macosSvg` | Mac OS face logo, vector (Platinum startup screen) | core | Mac OS 7.6/8 logo; System 7's startup screen is the `startupLogo` system art | — | — |
| — | `system.pig` | Piggy bank | core | Concept glyph with no file-kind meaning | — | — |
| [ ] | `system.printer` | Printer | export | LaserWriter driver (Extensions); ID to confirm: the driver file's own icon (`BNDL`; Chooser shows it) | `ICN#` `icl8` `ics#` `ics8` | `system-printer.png` |
| [ ] | `system.question` | Document with a question mark | export | System, ID -16506 (`kGenericQueryDocumentIconResource`) | `ICN#` `icl8` `ics#` `ics8` | `system-question.png` |
| — | `system.shockwave` | Shockwave plug-in | core | Macromedia brand (1995+) | — | — |
| — | `system.systemResources` | System Resources file | reuse | `system.folders.suitcaseSystem` (the System file) | — | — |
| [ ] | `system.warn` | Caution alert icon | export | System, ID 2 (`kCautionIcon`). 1-bit, no mask, no small size | `ICON` (`cicn` if present) | `system-warn.png` |
| — | `system.windows` | Windows logo | core | Microsoft brand | — | — |

### UI

| Done | Key | Depicts | Decision | Source | Resources | File |
| --- | --- | --- | --- | --- | --- | --- |
| — | `ui.halftoneLarge` | Pre-boot screen dither | core | A 1-bit pattern, the same in System 7 | — | — |
| — | `ui.menuDropdownArrowUp` | Menu scroll-up arrow | core | A solid black triangle, the same in System 7 | — | — |
| — | `ui.cursors.hand` | Hand cursor image (PDF viewer pan) | core | The `hand` cursor role is in Cursors | — | — |

## System art

Every `ClassicySystemArtKey` (`src/Appearance/ClassicyAssetRegistry.ts`; Platinum's registrations are in `packages/appearance/platinum/src/assets/platinumAssets.ts`, `art/platinumArt.ts` and `pixelart/platinumPixelArt.ts`). A host that loads only System 7 must find every key, so each has a decision. Color art is the base tree, 1-bit art the `bw` variant; "same as color" means one file serves both themes. HIG page numbers are the printed pages of the System 7 HIG (1995).

| Done | Key | What | Decision | Source | Color file | B&W file |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | `appleMenu` | Apple menu title glyph | crop | Color: the six-color rainbow apple; B&W: the solid black apple, from the menu bar in a 1x screenshot with the Apple menu closed. Box: the apple's tight bounding box (its leftmost, topmost, rightmost and bottommost non-white pixels) grown by 1 px on every side; then make every white pixel transparent. The menu bar draws it as the Apple menu's title image (as Platinum's `apple.png`, a glyph on transparency) | `art/color/apple-menu.png` | `art/bw/apple-menu.png` |
| — | `sadMac` | Sad Mac on the crash screen | draw | ROM art, the same on every Mac: copy Platinum's `sad-mac.png` (implementer) | — | — |
| [ ] | `startupLogo` | Startup screen logo | crop | The "Welcome to Macintosh" panel with the Happy Mac, cropped to the panel's outer frame from the System 7.5 startup screen in a 1x screenshot (the same in both modes) | `art/color/startup-logo.png` | same as color |
| [ ] | `trashEmpty` | Trash, empty (desktop icon) | export | System, ID -3993 (`kTrashIconResource`): `icl8` with the `ICN#` mask for color, `ICN#` for B&W, 32 px only (the desktop's Trash icon is the only reader; no 16 px file) | `art/color/trash-empty.png` | `art/bw/trash-empty.png` |
| [ ] | `trashFull` | Trash, full (desktop icon) | export | System, ID -3984 (`kFullTrashIconResource`): `icl8` with the `ICN#` mask for color, `ICN#` for B&W, 32 px only (the desktop's Trash icon is the only reader; no 16 px file) | `art/color/trash-full.png` | `art/bw/trash-full.png` |
| — | `aliasBadge` | Alias arrow over an alias's icon | draw | System 7 has no alias badge: aliases show only an italic name. A transparent 32×32 SVG (implementer) | — | — |
| [ ] | `helpButton` | Help button glyph (round help button) | crop | No help button in System 7.5; its nearest glyph is the Help (Guide) menu title, the balloon with a "?": from the menu bar in a 1x screenshot in each mode, crop its tight bounding box grown by 1 px on every side, then make every white pixel transparent | `art/color/help-button.png` | `art/bw/help-button.png` |
| — | `aboutLogo` | About This Computer logo | core | `classicy.logo`, as Platinum registers it | — | — |
| — | `aboutBackground` | About box background | draw | No consumer today; About This Macintosh is plain white: an 8×8 white SVG (implementer) | — | — |
| [ ] | `windowStripes` | Title-bar racing stripes (active window) | crop | A repeating tile, 16 px wide × 15 px tall, from an active document window's title bar in a 1x screenshot. Count the window's top frame line as row 0: take rows 2 to 16, so the frame lines and the color bar's 1 px highlight and shadow rows are out (the package draws those); the six stripes land on tile rows 2, 4, 6, 8, 10 and 12. Columns: 16 px from the middle of the stripe run between the close box and the title, clear of both gaps. Black stripes in B&W, gray in color. Platinum's consumer repeats it across each stripe band | `art/color/window-stripes.png` | `art/bw/window-stripes.png` |
| — | `windowStripesRed` | Red title-bar stripes (Platinum variant) | reuse | `windowStripes` (System 7 has no red variant; nothing reads it) | — | — |
| [ ] | `windowUtilityTexture` | Utility window (windoid) drag-bar texture | crop | A 4×4 tile of the 25% dot pattern (HIG p.138) from a floating utility window's drag region (the Apple Guide window, or any floating palette) in a 1x screenshot. Its top-left pixel is the first pixel inside the window's top and left frame lines (frame lines out). Platinum's consumer repeats it at the `utilityTitleBar` knob size, so the tile must be one pattern period | `art/color/window-utility-texture.png` | `art/bw/window-utility-texture.png` |
| [ ] | `windowGrip` | Size box glyph (window grow box) | crop | The whole size box cell, glyph and face, from an active window with both scroll bars in a 1x screenshot: every pixel inside its four 1 px lines (the vertical scroll bar's left line, the horizontal scroll bar's top line, the window frame's right and bottom lines); all four lines out. The consumer expects the cell: Platinum's `resizer.svg` fills the whole resizer box as its background | `art/color/window-grip.png` | `art/bw/window-grip.png` |
| — | `windowDither` | Control-box dither (Platinum) | draw | System 7 control boxes have no dither: a transparent 2×2 SVG (implementer) | — | — |
| [ ] | `zoomGlyph` | Zoom box glyph | crop | The glyph only, at its place in the box: crop the 11×11 zoom box from an active window's title bar in a 1x screenshot with its outer 1 px frame line in, then make the frame ring and the face (and, in color, the bevel pixels) transparent, keeping only the inner square's right and bottom edge lines. Platinum's consumer lays the glyph over the whole box (`.classicyWindowZoomBox::after`, `zoom.svg`) and the package draws the box frame and face | `art/color/zoom-glyph.png` | `art/bw/zoom-glyph.png` |
| — | `collapseGlyph` | Collapse box glyph | draw | System 7 has no collapse box (the package hides it): a transparent 11×11 SVG (implementer) | — | — |
| [ ] | `submenuArrow` | Hierarchical menu triangle | crop | The solid black right-pointing triangle: crop it from an item with a submenu (Apple menu ▸ Recent Applications, Apple Menu Options) in a 1x screenshot, tight to the triangle | `art/color/submenu-arrow.png` | same as color |
| [ ] | `popupArrows` | Pop-up menu indicator | crop | The single solid black down triangle (HIG p.87): crop it tight from a pop-up menu (the Monitors or Sound control panel) in a 1x screenshot | `art/color/popup-arrows.png` | same as color |
| [ ] | `sliderThumb` | Slider thumb | crop | No Toolbox slider (HIG p.214); crop the thumb of the Sound control panel's volume slider in a 1x screenshot | `art/color/slider-thumb.png` | same as color |
| — | `sliderThumbRect` | Rectangular slider thumb | reuse | `sliderThumb` (System 7 has one slider look) | — | — |
| — | `sliderStrikes` | Grip strikes on a slider thumb | draw | System 7 thumbs have no strikes: a transparent 2×2 SVG (implementer) | — | — |
| — | `tabOutline` | Tab control outline | draw | System 7 has no tab control: a flat 1 px black outline in Platinum's tab geometry, as an SVG (implementer) | — | — |
| — | `halftone` | Open-icon fill pattern (a mask) | draw | Fig 8-1's 1-in-4 dot dither as an 8×8 `currentColor` SVG, as Platinum's `halftone.svg` (implementer) | — | — |
| — | `halftoneLarge` | Pre-boot screen dither | core | `ui.halftoneLarge`, as Platinum registers it | — | — |
| — | `quickTimeThumbSlider` | QuickTime controller seek thumb | core | `system.quicktime.thumbSlider` (QuickTime draws its own controller) | — | — |
| — | `quickTimeVolumeSlider` | QuickTime controller volume thumb | core | `system.quicktime.volumeSlider` (QuickTime draws its own controller) | — | — |
| — | `controlStripTab` | Control Strip tab | draw | Pixel-art rows (`.txt`, theme tokens) transcribed by the implementer from the owner's reference crop `reference/control-strip.png` (below) | — | — |
| — | `controlStripCollapse` | Control Strip collapse box | draw | Pixel-art rows from `reference/control-strip.png` | — | — |
| — | `controlStripScrollLeft` | Control Strip scroll arrow, left | draw | Pixel-art rows from `reference/control-strip.png` | — | — |
| — | `controlStripScrollLeftDisabled` | Control Strip scroll arrow, left, dimmed | draw | Pixel-art rows from `reference/control-strip.png` | — | — |
| — | `controlStripScrollRight` | Control Strip scroll arrow, right | draw | Pixel-art rows from `reference/control-strip.png` | — | — |
| — | `controlStripScrollRightDisabled` | Control Strip scroll arrow, right, dimmed | draw | Pixel-art rows from `reference/control-strip.png` | — | — |
| — | `controlStripModuleArrow` | Control Strip module pop-up arrow | draw | Pixel-art rows from `reference/control-strip.png` | — | — |
| — | `popUpSliderTrack` | Pop-up slider track (Control Strip sound) | draw | Mac OS 8 only: pixel-art rows in the flat 1 px black System 7 style (implementer) | — | — |
| — | `popUpSliderThumb` | Pop-up slider thumb | draw | Mac OS 8 only: pixel-art rows in the flat 1 px black System 7 style (implementer) | — | — |
| — | `menuCheck` | Menu check mark | draw | Chicago's ✓ (Platinum uses the font glyph and registers no art): a 1-bit SVG of the Chicago 12 glyph (implementer) | — | — |
| — | `menuDash` | Menu dash (mixed state) | draw | Chicago's – : a 1-bit SVG of the Chicago 12 glyph (implementer) | — | — |
| — | `triangle` | Alias of `submenuArrow` | reuse | `submenuArrow` | — | — |
| — | `downArrow` | Alias of `popupArrows` | reuse | `popupArrows` | — | — |

## Cursors

Every `ClassicyCursorRole`. One set serves both themes (the pointer stays black, HIG p.260). System 7.5's System file holds `CURS` 1 (I-beam), 2 (crosshair), 3 (plus) and 4 (watch); the arrow is QuickDraw's, in ROM. Classicy has no plus role, so `CURS` 3 is not exported. Export rows: 16×16 PNG plus the hotspot.

| Done | Role | What | Decision | Source | File | Hotspot (x, y) |
| --- | --- | --- | --- | --- | --- | --- |
| — | `arrow` | Standard pointer | draw | QuickDraw's `arrow` (ROM; no `CURS`). The bitmap is unchanged in Mac OS 8: copy Platinum's `cursor-arrow.svg` pixels (implementer) | `cursors/arrow.png` | (1, 1) |
| [ ] | `watch` | Busy | export | System, `CURS` 4 (`watchCursor`) | `cursors/watch.png` | read from the `CURS` |
| — | `hand` | Grabber / pan (PDF viewer) | core | `ui.cursors.hand` (the classic pointing hand), as Platinum registers it | — | (8, 8) as the stylesheets use it |
| [ ] | `ibeam` | Text insertion | export | System, `CURS` 1 (`iBeamCursor`) | `cursors/ibeam.png` | read from the `CURS` |
| [ ] | `crosshair` | Crosshair | export | System, `CURS` 2 (`crossCursor`) | `cursors/crosshair.png` | read from the `CURS` |
| — | `resizeLr` | Resize left-right (split view, column) | draw | System 7 has none: copy Platinum's `cursor-resize-lr.png` (a 1-bit cursor in the same style; implementer) | `cursors/resize-lr.png` | (8, 8) |
| — | `resizeUd` | Resize up-down | draw | System 7 has none: copy Platinum's `cursor-resize-ud.png` (implementer) | `cursors/resize-ud.png` | (8, 8) |
| — | `resizeNwse` | Resize diagonal ↖↘ | draw | System 7 has none, nor does Platinum: draw a 1-bit diagonal double arrow in the same style (implementer) | `cursors/resize-nwse.png` | (8, 8) |
| — | `resizeNesw` | Resize diagonal ↗↙ | draw | System 7 has none, nor does Platinum: draw a 1-bit diagonal double arrow in the same style (implementer) | `cursors/resize-nesw.png` | (8, 8) |
| — | `resizeU` | Resize up only | draw | System 7 has none: copy Platinum's `cursor-resize-u.png` (implementer) | `cursors/resize-u.png` | (8, 8) |
| — | `resizeD` | Resize down only | draw | System 7 has none: copy Platinum's `cursor-resize-d.png` (implementer) | `cursors/resize-d.png` | (8, 8) |
| — | `resizeL` | Resize left only | draw | System 7 has none: copy Platinum's `cursor-resize-l.png` (implementer) | `cursors/resize-l.png` | (8, 8) |
| — | `resizeR` | Resize right only | draw | System 7 has none: copy Platinum's `cursor-resize-r.png` (implementer) | `cursors/resize-r.png` | (8, 8) |

## Sounds

The System 7.5 alert sounds from the System file's `snd ` resources, as the package's sound pack (pack id `system7`). Confirm the set in the Sound control panel's Alert Sounds list: if it shows more than these six, add rows. ResEdit lists `snd ` resources by name; write each ID over "ID to confirm".

| Done | Sprite id | Sound | Source | File | Notes |
| --- | --- | --- | --- | --- | --- |
| [ ] | `ClassicyAlertSimpleBeep` | Simple Beep | System, `snd ` "Simple Beep", ID to confirm | `sounds/system7/sprites/ClassicyAlertSimpleBeep.wav` | The pack's default alert |
| [ ] | `ClassicyAlertDroplet` | Droplet | System, `snd ` "Droplet", ID to confirm | `sounds/system7/sprites/ClassicyAlertDroplet.wav` | |
| [ ] | `ClassicyAlertIndigo` | Indigo | System, `snd ` "Indigo", ID to confirm | `sounds/system7/sprites/ClassicyAlertIndigo.wav` | |
| [ ] | `ClassicyAlertQuack` | Quack | System, `snd ` "Quack", ID to confirm | `sounds/system7/sprites/ClassicyAlertQuack.wav` | |
| [ ] | `ClassicyAlertSosumi` | Sosumi | System, `snd ` "Sosumi", ID to confirm | `sounds/system7/sprites/ClassicyAlertSosumi.wav` | |
| [ ] | `ClassicyAlertWildEep` | Wild Eep | System, `snd ` "Wild Eep", ID to confirm | `sounds/system7/sprites/ClassicyAlertWildEep.wav` | |
| [ ] | `ClassicyBeep` | Simple Beep | A byte-identical copy of `ClassicyAlertSimpleBeep.wav` | `sounds/system7/sprites/ClassicyBeep.wav` | The beep HyperCard's `beep` plays |

Not exported, so a System 7-only host has no sprite for them and stays silent where they play (a host that also loads Platinum plays Platinum's):

- Platinum's other alerts: `ClassicyAlertBonk`, `ClassicyAlertGrowl`, `ClassicyAlertTabitha` (a stored choice of one of them plays the pack's default alert, Simple Beep, plan 0018-dbd §1.3).
- `ClassicyBoot`: the startup chime is in ROM, not the System file.
- `ClassicyEmailMailError`, `ClassicyEmailMailSent`, `ClassicyEmailNewMail`, `ClassicyEmailNoMail`, `ClassicyThump`, `ClassicyClick`: no System 7.5 counterpart.
- The interface feedback sounds (`ClassicyButtonClick*`, `ClassicyMenu*`, `ClassicyWindow*`, `ClassicyTab*`, `ClassicyInputRadio*`): System 7 had none (design 0017-6me).

## Window colors

The color theme's window, frame-control and scroll-bar colors come from System 7.5's Standard color tables; they replace the colors measured from the HIG PDF where they differ (design 0017-6me, open question "Exact window colors").

How to read them: in the Color control panel set Window color to Standard. Then open a copy of the System file and read `wctb` 0 and `cctb` 0 (ID to confirm: if those hold no tinge entries, the Color control panel's own `wctb`/`cctb` resources hold each scheme, Standard first). ResEdit shows each entry as 16-bit RGB (`$CCCC $CCCC $FFFF`); write the high byte of each channel as hex (`#CCCCFF`). The Measured column is provisional, from the HIG PDF figures.

| Done | Table | Part | Name | Colors | Measured (provisional) | System 7.5 value |
| --- | --- | --- | --- | --- | --- | --- |
| [ ] | `wctb` | 0 | `wContentColor` | Window content | `#FFFFFF` | |
| [ ] | `wctb` | 1 | `wFrameColor` | Window frame | `#000000` | |
| [ ] | `wctb` | 2 | `wTextColor` | Title text | `#000000` | |
| [ ] | `wctb` | 3 | `wHiliteColor` | Title-bar highlight (stripes, 1-bit era) | — | |
| [ ] | `wctb` | 4 | `wTitleBarColor` | Title-bar background | `#F5F5F5` | |
| [ ] | `wctb` | 5 | `wHiliteColorLight` | Racing stripes, light | — | |
| [ ] | `wctb` | 6 | `wHiliteColorDark` | Racing stripes, dark | `#A8A8A8` | |
| [ ] | `wctb` | 7 | `wTitleBarLight` | Title-bar top-left highlight | `#D6D8EA` | |
| [ ] | `wctb` | 8 | `wTitleBarDark` | Title-bar bottom edge | `#B2B5D4` | |
| [ ] | `wctb` | 9 | `wDialogLight` | Dialog frame band, light | `#D6D8EA` | |
| [ ] | `wctb` | 10 | `wDialogDark` | Dialog frame band, dark | `#898BB2` | |
| [ ] | `wctb` | 11 | `wTingeLight` | Frame tinge, light (box and frame highlight) | `#D6D8EA` | |
| [ ] | `wctb` | 12 | `wTingeDark` | Frame tinge, dark (box outline, scroll-arrow outline) | `#46528B` | |
| [ ] | `cctb` | 0 | `cFrameColor` | Scroll-bar frame | `#000000` | |
| [ ] | `cctb` | 1 | `cBodyColor` | Scroll track and arrow-box face | `#ECECEC` | |
| [ ] | `cctb` | 2 | `cTextColor` | Control text | `#000000` | |
| [ ] | `cctb` | 3 | `cThumbColor` | Scroll box face | `#CDCDCD` | |
| [ ] | `cctb` | 5 | `cArrowsColorLight` | Scroll arrow fill, light | `#D6D8EA` | |
| [ ] | `cctb` | 6 | `cArrowsColorDark` | Scroll arrow outline, dark | `#46528B` | |
| [ ] | `cctb` | 7 | `cThumbLight` | Scroll box highlight | `#D6D8EA` | |
| [ ] | `cctb` | 8 | `cThumbDark` | Scroll box shadow | `#46528B` | |
| [ ] | `cctb` | 9 | `cHiliteLight` | Pressed part, light | — | |
| [ ] | `cctb` | 10 | `cHiliteDark` | Pressed part, dark | — | |
| [ ] | `cctb` | 11 | `cTitleBarLight` | Title-bar light (shared with the window) | — | |
| [ ] | `cctb` | 12 | `cTitleBarDark` | Title-bar dark | — | |
| [ ] | `cctb` | 13 | `cTingeLight` | Control tinge, light | `#D6D8EA` | |
| [ ] | `cctb` | 14 | `cTingeDark` | Control tinge, dark | `#46528B` | |

Part codes are Apple's (`Windows.h`, `Controls.h`); if ResEdit numbers an entry differently, keep its number and name in the row. Some colors on screen are computed by the window and control definitions, not read from a table: sample those from a 1x color screenshot (Monitors at 256 colors) with a color picker that reads raw pixel values.

| Done | Element | Where to sample | Measured (provisional) | Sampled value |
| --- | --- | --- | --- | --- |
| [ ] | Racing stripes | An active window's title bar | `#A8A8A8` | |
| [ ] | Inactive window frame | A window behind another | `#828282` | |
| [ ] | Inactive title text | The same window's title | `#B4B4B4` | |
| [ ] | Scroll track dither dots | An active scroll bar's gray area | `#A8A8A8` on `#ECECEC` | |
| [ ] | Close and zoom box face | An active window's close box | `#CDCDCD` | |
| [ ] | Desktop | The default color desktop | `#CACACA` | |

## Reference crops

For art the implementer draws from System 7.5's look rather than exports. Same crop rules as above.

| Done | File | What to crop |
| --- | --- | --- |
| [ ] | `resources/reference/control-strip.png` | The Control Strip, expanded with at least three modules showing and both scroll arrows (one dimmed if possible), then collapsed to its tab, in one image, from a System 7.5 setup with Control Strip installed (PowerBook install), at 256 colors |

The package's own `icon` (shown in the Appearance Manager's Themes tab) uses the `system.folders.suitcaseSystem` color 32 px file; nothing extra to export.
