# Windows 98 asset inventory

Every icon, system-art key, cursor, font face and display name the Windows 98 Appearance Package (`@classicy/appearance-windows98`, `packages/appearance/windows98`) takes from Windows 98, and exactly which file each comes from. The package registers them from `src/assets/windows98Assets.ts` (the icons from the data in `src/assets/windows98Icons.ts`, the fonts from the face list in `src/assets/windows98Fonts.internal.ts`) and `src/windows98Apps.ts`; `src/assets/windows98Inventory.test.ts` reads this file and fails if a row and the registration disagree.

Windows 95 and 98's icons, bitmaps, cursors and interface are Microsoft's; Classicy uses them under the fair use doctrine, as it uses Apple's Mac OS art under Platinum and System 7. The interface face is a recreation of MS Sans Serif by FontStruct user "lou", licensed CC BY-SA 3.0 (Fonts).

## Sources and conversion

**Every image and cursor is Windows 98 Second Edition's own** (the fonts are a recreation, below). The English Windows 98 SE CD (archive.org item `windows-98-second-edition_202103`) was read: its install cabinets (`WIN98_21.CAB` to `WIN98_74.CAB`, `BASE4` to `BASE6`, `PRECOPY1` and `PRECOPY2`) unpacked, and each binary's `RT_GROUP_ICON`, `RT_GROUP_CURSOR` and `RT_BITMAP` resources written out unchanged. The clones of 98.js, wieslawsoltes/win98 and lolstring/window98-html-css-js carry re-encoded copies of some of these (98.js's toolbar strip, for one, is a high-color screenshot of IE's, black as `#040404` and `#F8F8F8` as white); each was matched against the CD and the CD's bytes taken.

**Icons.** An icon group's 32 px and 16 px images, each the group's highest color depth (the 256-color image where there is one: Windows 98 drew it on a high-color screen), the AND mask made alpha (mask 1 is clear, every other pixel opaque; the few masked pixels whose XOR color is `#040404`, which Windows XORed onto the screen, are clear too). A group with no 16 px image registers its 32 px one alone, which Windows scaled. Files: `src/assets/icons/<binary>-<group id>-<size>.webp`.

**Bitmaps.** The Start flag (`explorer.exe` bitmap 143) and the About box's Windows logo (`shell32.dll` bitmap 130, RLE-compressed) have a `#C0C0C0` ground, which Windows mapped to the button face as it loaded them: it is made clear, so each scheme's face shows through. Internet Explorer 5's toolbar cells are 20 x 20 cells of `browseui.dll` bitmaps 265 (gray, the buttons at rest) and 266 (color, the buttons under the pointer), their `#FF00FF` key made clear: `src/assets/icons/browseui-bitmap-<id>-cell-<n>.webp`. Web View's sky, `C:\WINDOWS\WEB\wvlogo.gif`, keeps every pixel. Files: `src/assets/art/<binary>-bitmap-<id>.webp`, `src/assets/icons/wvlogo.webp`.

**Cursors.** `user.exe`'s `RT_GROUP_CURSOR` resources (Windows 98's system cursors), each one 32 x 32 1-bit image with its hotspot in the resource's own header: AND 0 and XOR 0 is black, AND 0 and XOR 1 white, AND 1 and XOR 0 clear, and AND 1 and XOR 1, a pixel that inverts the screen (every pixel of the I-beam and the cross), black, since a CSS cursor cannot invert. Files: `src/assets/cursors/user-cursor-<id>.png`.

**Fonts.** Windows 98 drew its interface in MS Sans Serif, `sserife.fon`, a bitmap font no browser loads. The package ships 98.css's recreation of it instead: lou's FontStruct "MS Sans Serif" and "MS Sans Serif Bold", the woff2 files 98.css converted (`fonts/converted` in jdan/98.css), as copied unchanged by wieslawsoltes/win98's `assets/`, renamed only. Their readme and license files sit beside them, unchanged, and ship in the package's tarball, as the readmes require.

**Format.** Images: lossless WebP with `exact`, one `VP8L` chunk and no color profile (the DIB colors are Windows' stored values), written by `bin/classicyWebp.ts`; no partial alpha. Cursors: PNG, the format every browser takes for a CSS cursor, 8-bit RGBA with no ancillary chunk. Fonts: woff2, as authored.

## Icons

Each of the core icon tree's 296 keys, in the tree's order. **Fallback rule**: where Windows 98 would show its own generic for a thing it lacked, the key reuses that generic (an unknown file the Windows-logo page, a document `shell32.dll`'s document, a program its application window, a Mac extension a system file, a system folder a plain folder, a DVD the CD-ROM drive). The core image stays only for Classicy's own glyphs and brands and for glyphs with no file meaning ("core": the key is not registered, so it draws the default package's image).

| Decision | Keys | Meaning |
| --- | --- | --- |
| export | 66 | an icon group's 32 px image, with its own 16 px one where the group has one |
| export (16 px) | 7 | a 16 px image alone (the tray's volume icons) |
| crop | 11 | a cell of IE 5's toolbar |
| picture | 1 | Web View's sky |
| reuse | 110 | another key's image (the Source column names it) |
| core | 101 | the default package's image (34 of them the rich text editor's toolbar glyphs, read by no code) |

| Key | Decision | Source | Files | Note |
| --- | --- | --- | --- | --- |
| `classicy.logo` | core | — | — | Classicy brand (the screen saver logo and About fallbacks) |
| `classicy.bg` | picture | `C:\WINDOWS\WEB\wvlogo.gif` (480 x 480) | `wvlogo.webp` | About This Computer's banner background (an icons-tree key): Windows 98 SE's Web View sky, C:\WINDOWS\WEB\wvlogo.gif (480 x 480, 8-bit GIF, WIN98 CAB), the backdrop Windows 98 SE's folders drew their title on |
| `applications.internetExplorer.app` | export | `iexplore.exe` #32528: Internet Explorer (the program, desktop icon) | `iexplore-32528-32.webp`, `iexplore-32528-16.webp` |  |
| `applications.internetExplorer.apple` | reuse | `applications.internetExplorer.document` | — | a home-page bookmark's icon: an HTML document |
| `applications.internetExplorer.documentWarn` | reuse | `applications.internetExplorer.document` | — |  |
| `applications.internetExplorer.document` | export | `iexplore.exe` #32529: HTML document (htmlfile) | `iexplore-32529-32.webp`, `iexplore-32529-16.webp` |  |
| `applications.internetExplorer.downloadingFileAnimated` | core | — | — | Mac IE's progress glyph; IE 5 drew file downloads as an AVI animation, not an icon |
| `applications.internetExplorer.downloadingFile` | core | — | — | as above |
| `applications.internetExplorer.forward` | crop | `browseui.dll` bitmap 265 (gray), cell 1: Forward | `browseui-bitmap-265-cell-1.webp` | IE 5 / Explorer toolbar (browseui.dll strip): gray cell 1 |
| `applications.internetExplorer.forwardOn` | crop | `browseui.dll` bitmap 266 (color), cell 1: Forward | `browseui-bitmap-266-cell-1.webp` | IE 5 / Explorer toolbar (browseui.dll strip): color cell 1 |
| `applications.internetExplorer.backward` | crop | `browseui.dll` bitmap 265 (gray), cell 0: Back | `browseui-bitmap-265-cell-0.webp` | IE 5 / Explorer toolbar (browseui.dll strip): gray cell 0 |
| `applications.internetExplorer.backwardOn` | crop | `browseui.dll` bitmap 266 (color), cell 0: Back | `browseui-bitmap-266-cell-0.webp` | IE 5 / Explorer toolbar (browseui.dll strip): color cell 0 |
| `applications.internetExplorer.loaderAnimated` | core | — | — | IE's throbber (the spinning Windows logo, an AVI/bitmap strip in shdocvw.dll); not in the sources as a frame set |
| `applications.internetExplorer.loader` | core | — | — | as above |
| `applications.internetExplorer.refresh` | crop | `browseui.dll` bitmap 265 (gray), cell 3: Refresh | `browseui-bitmap-265-cell-3.webp` | IE 5 / Explorer toolbar (browseui.dll strip): gray cell 3 |
| `applications.internetExplorer.refreshOn` | crop | `browseui.dll` bitmap 266 (color), cell 3: Refresh | `browseui-bitmap-266-cell-3.webp` | IE 5 / Explorer toolbar (browseui.dll strip): color cell 3 |
| `applications.internetExplorer.clipboard` | reuse | `system.files.document` | — |  |
| `applications.internetExplorer.compass` | reuse | `applications.internetExplorer.favorites` | — |  |
| `applications.internetExplorer.documentDownload` | reuse | `applications.internetExplorer.document` | — |  |
| `applications.internetExplorer.documentFolder` | reuse | `applications.internetExplorer.document` | — |  |
| `applications.internetExplorer.documentHome` | crop | `browseui.dll` bitmap 266 (color), cell 4: Home | `browseui-bitmap-266-cell-4.webp` | toolbar strip: Home (the example browser's Home button reads this key) |
| `applications.internetExplorer.documentLink` | export | `mshtml.dll` #2664: Internet Shortcut (.url) | `mshtml-2664-32.webp`, `mshtml-2664-16.webp` |  |
| `applications.internetExplorer.documentMoveToFolder` | reuse | `applications.internetExplorer.document` | — |  |
| `applications.internetExplorer.documentNews` | reuse | `applications.internetExplorer.document` | — |  |
| `applications.internetExplorer.documentShortcut` | reuse | `applications.internetExplorer.documentLink` | — |  |
| `applications.internetExplorer.documentShortcutEdit` | reuse | `applications.internetExplorer.documentLink` | — |  |
| `applications.internetExplorer.documentSound` | reuse | `system.files.sound` | — |  |
| `applications.internetExplorer.documentWarning` | reuse | `applications.internetExplorer.document` | — |  |
| `applications.internetExplorer.editor` | crop | `browseui.dll` bitmap 266 (color), cell 9: Edit | `browseui-bitmap-266-cell-9.webp` | toolbar strip: Edit |
| `applications.internetExplorer.favorites` | crop | `browseui.dll` bitmap 266 (color), cell 6: Favorites | `browseui-bitmap-266-cell-6.webp` | toolbar strip: Favorites; the core draws compass, favorites and favoritesOn with one image, so all three draw the color cell |
| `applications.internetExplorer.favoritesOn` | reuse | `applications.internetExplorer.favorites` | — | the core draws it with the favorites image |
| `applications.internetExplorer.find` | reuse | `system.sherlock.sherlock` | — |  |
| `applications.internetExplorer.globe` | reuse | `applications.internetExplorer.app` | — | Web Viewer's app icon reads this key: IE's icon |
| `applications.internetExplorer.logo` | reuse | `applications.internetExplorer.app` | — |  |
| `applications.internetExplorer.mailbox` | export | `msimn.exe` #2: Outlook Express | `msimn-2-32.webp`, `msimn-2-16.webp` | Outlook Express, the mail program Windows 98 shipped |
| `applications.internetExplorer.news` | reuse | `applications.internetExplorer.mailbox` | — | Outlook Express read news too |
| `applications.internetExplorer.preferences` | export | `iesetup.dll` #102: Internet Options (Control Panel "Internet") | `iesetup-102-32.webp`, `iesetup-102-16.webp` |  |
| `applications.internetExplorer.print` | crop | `browseui.dll` bitmap 266 (color), cell 7: Print | `browseui-bitmap-266-cell-7.webp` | toolbar strip: Print |
| `applications.internetExplorer.search` | crop | `browseui.dll` bitmap 266 (color), cell 5: Search | `browseui-bitmap-266-cell-5.webp` | toolbar strip: Search |
| `applications.netscape.loaderAnimated` | core | — | — | Netscape brand |
| `applications.netscape.loader` | core | — | — | Netscape brand |
| `applications.pager.app` | core | — | — | Classicy's own app (brand) |
| `applications.news.app` | core | — | — | Classicy's own app (brand) |
| `applications.pictureViewer.app` | export | `kodakimg.exe` #128: Imaging (Kodak Imaging for Windows) | `kodakimg-128-32.webp`, `kodakimg-128-16.webp` |  |
| `applications.radio.app` | core | — | — | Classicy's own app (brand) |
| `applications.registerWithApple.app` | export | `regwizc.dll` #117: Registration Wizard | `regwizc-117-32.webp`, `regwizc-117-16.webp` | Registration Wizard |
| `applications.setupAssistant.setupAssistant` | export | `welcome.exe` #102: Welcome to Windows 98 | `welcome-102-32.webp`, `welcome-102-16.webp` | Welcome to Windows 98 |
| `applications.stickies.app` | reuse | `system.files.application` | — | Windows 98 had no Stickies |
| `applications.stickies.controlButtonSprites` | core | — | — | Stickies' own UI sprite sheet |
| `applications.stickies.notes` | reuse | `system.files.document` | — |  |
| `applications.stickies.stack` | reuse | `system.files.document` | — |  |
| `applications.stuffit.app` | reuse | `system.files.application` | — | no StuffIt on Windows 98 |
| `applications.stuffit.compressing` | reuse | `system.files.application` | — |  |
| `applications.stuffit.file` | reuse | `system.files.document` | — |  |
| `applications.usenet.app` | core | — | — | Classicy's own app (brand) |
| `applications.usenet.search` | core | — | — | Classicy's own app (brand) |
| `applications.usenet.server` | core | — | — | Classicy's own app (brand) |
| `applications.systemProfiler.app` | export | `msinfo32.exe` #128: System Information | `msinfo32-128-32.webp`, `msinfo32-128-16.webp` | System Information |
| `applications.simpletext.app` | export | `notepad.exe` #2: Notepad (the program) | `notepad-2-32.webp`, `notepad-2-16.webp` | Notepad |
| `applications.calculator.app` | export | `calc.exe` #SC: Calculator | `calc-SC-32.webp`, `calc-SC-16.webp` |  |
| `controlPanels.appearanceManager.app` | export | `deskcp16.dll` #40: Display (Control Panel) | `deskcp16-40-32.webp`, `deskcp16-40-16.webp` | Display |
| `controlPanels.appearanceManager.backgroundCenter` | core | — | — | Appearance Manager UI glyph (Windows' Display panel shows a monitor preview, no such glyphs) |
| `controlPanels.appearanceManager.backgroundFill` | core | — | — | Appearance Manager UI glyph (Windows' Display panel shows a monitor preview, no such glyphs) |
| `controlPanels.appearanceManager.backgroundScale` | core | — | — | Appearance Manager UI glyph (Windows' Display panel shows a monitor preview, no such glyphs) |
| `controlPanels.appearanceManager.backgroundTile` | core | — | — | Appearance Manager UI glyph (Windows' Display panel shows a monitor preview, no such glyphs) |
| `controlPanels.appearanceManager.file` | export | `themes.cpl` #101: Desktop Themes (Control Panel); .theme files | `themes-101-32.webp`, `themes-101-16.webp` | a .theme file showed Desktop Themes' icon |
| `controlPanels.appearanceManager.preferences` | reuse | `system.files.preferences` | — |  |
| `controlPanels.controlStripManager.app` | export | `shell32.dll` #40: Taskbar (Taskbar & Start Menu properties) | `shell32-40-32.webp`, `shell32-40-16.webp` | Taskbar & Start Menu |
| `controlPanels.dateTimeManager.dateTimeManager` | export | `timedate.cpl` #200: Date/Time (Control Panel) | `timedate-200-32.webp`, `timedate-200-16.webp` |  |
| `controlPanels.keyboard.app` | export | `main.cpl` #200: Keyboard (Control Panel) | `main-200-32.webp`, `main-200-16.webp` |  |
| `controlPanels.location.app` | export | `intl.cpl` #101: Regional Settings (Control Panel) | `intl-101-32.webp`, `intl-101-16.webp` | Regional Settings |
| `controlPanels.location.map` | core | — | — | a world-map picture (timedate.cpl's time-zone map is a bitmap of its own, not an icon) |
| `controlPanels.soundManager.app` | export | `mmsys.cpl` #110: Sounds (Control Panel); its 16 px image is the taskbar's volume icon | `mmsys-110-32.webp`, `mmsys-110-16.webp` | Sounds |
| `controlPanels.soundManager.extension` | reuse | `system.extension` | — |  |
| `controlPanels.soundManager.preferences` | reuse | `system.files.preferences` | — |  |
| `controlPanels.soundManager.sound33` | export (16 px) | `mmsys.cpl` #110, its 16 px image | `mmsys-110-16.webp` | the taskbar's volume icon (mmsys.cpl #110's 16 px image) |
| `controlPanels.soundManager.sound66` | export (16 px) | `mmsys.cpl` #110, its 16 px image | `mmsys-110-16.webp` | the taskbar's volume icon (mmsys.cpl #110's 16 px image) |
| `controlPanels.soundManager.soundMute` | export (16 px) | `sndvol32.exe` #303, its 16 px image | `sndvol32-303-16.webp` | the taskbar's muted volume icon |
| `controlPanels.soundManager.soundOff` | export (16 px) | `sndvol32.exe` #303, its 16 px image | `sndvol32-303-16.webp` | the taskbar's muted volume icon |
| `controlPanels.soundManager.soundOn` | export (16 px) | `mmsys.cpl` #110, its 16 px image | `mmsys-110-16.webp` | the taskbar's volume icon (mmsys.cpl #110's 16 px image) |
| `controlPanels.soundManager.stt` | core | — | — | speech recognition: Windows 98 had none |
| `controlPanels.soundManager.tts` | core | — | — | text to speech: Windows 98 had none |
| `system.controlStrip.appearance` | reuse | `controlPanels.appearanceManager.app` | — |  |
| `system.controlStrip.cd` | reuse | `system.drives.cdrom` | — |  |
| `system.controlStrip.fileSharing` | reuse | `system.network.networkLocal` | — |  |
| `system.controlStrip.moduleFile` | reuse | `system.extension` | — | a Control Strip module file: a system file |
| `system.controlStrip.screenSaver` | reuse | `system.extensions.screensaver` | — |  |
| `system.controlStrip.sleep` | export | `shell32.dll` #26: Suspend / Stand by (Start menu) | `shell32-26-32.webp`, `shell32-26-16.webp` | Stand by |
| `system.controlStrip.sound` | export (16 px) | `mmsys.cpl` #110, its 16 px image | `mmsys-110-16.webp` | the taskbar's volume icon |
| `system.controlStrip.soundOff` | export (16 px) | `sndvol32.exe` #303, its 16 px image | `sndvol32-303-16.webp` | the taskbar's muted volume icon |
| `system.appleBlackOnWhite` | reuse | `system.windows` | — | the OS emblem: the Windows logo |
| `system.appleWhiteOnBlack` | reuse | `system.windows` | — |  |
| `system.bigSwitchOff` | core | — | — | Mac power-switch glyph |
| `system.bigSwitchOn` | core | — | — | Mac power-switch glyph |
| `system.clipboard` | reuse | `system.files.document` | — | the Clipboard Viewer's .clp icon is not in the sources' extracted set; a document |
| `system.comport1` | core | — | — | hardware glyph with no file meaning (Fallback rule) |
| `system.comport2` | core | — | — | hardware glyph with no file meaning (Fallback rule) |
| `system.error` | export | `user.exe` #103: Stop / hand (MB_ICONSTOP), 32 px; 16 px from `comctl32.dll` #20480 | `user-103-32.webp`, `comctl32-20480-16.webp` | MessageBox Stop; its 16 px image from comctl32.dll #20480 |
| `system.extension` | export | `shell32.dll` #154: System file (.dll/.drv/.sys/.vxd; DefaultIcon shell32.dll,-154) | `shell32-154-32.webp`, `shell32-154-16.webp` | a Mac extension is a system file: .dll/.vxd |
| `system.help` | export | `shell32.dll` #24: Help (Start menu, Windows Help) | `shell32-24-32.webp`, `shell32-24-16.webp` |  |
| `system.info` | export | `user.exe` #104: Information (MB_ICONINFORMATION), 32 px; 16 px from `comctl32.dll` #20481 | `user-104-32.webp`, `comctl32-20481-16.webp` | MessageBox Information; 16 px from comctl32.dll #20481 |
| `system.internet` | reuse | `applications.internetExplorer.app` | — | Windows 98's "The Internet" desktop icon was IE's |
| `system.macClassic` | reuse | `system.mac` | — |  |
| `system.macWink` | reuse | `system.mac` | — |  |
| `system.mac` | export | `explorer.exe` #100: My Computer (CLSID DefaultIcon Explorer.exe,0) | `explorer-100-32.webp`, `explorer-100-16.webp` | My Computer |
| `system.macos` | export | `user.exe` #105: Windows logo (IDI_WINLOGO): 32, 22, 16, 14, 12 and 10 px | `user-105-32.webp`, `user-105-16.webp` | the OS emblem: the Windows logo |
| `system.macosSvg` | reuse | `system.macos` | — |  |
| `system.pig` | core | — | — | Classicy joke icon |
| `system.printer` | export | `shell32.dll` #17: Printer | `shell32-17-32.webp`, `shell32-17-16.webp` |  |
| `system.question` | export | `user.exe` #102: Question (MB_ICONQUESTION), 32 px | `user-102-32.webp` | MessageBox Question (32 px only: Windows scaled it) |
| `system.shockwave` | core | — | — | Macromedia brand |
| `system.systemResources` | reuse | `system.extension` | — |  |
| `system.warn` | export | `user.exe` #101: Exclamation (MB_ICONEXCLAMATION), 32 px; 16 px from `comctl32.dll` #20482 | `user-101-32.webp`, `comctl32-20482-16.webp` | MessageBox Exclamation; 16 px from comctl32.dll #20482 |
| `system.windows` | export | `user.exe` #105: Windows logo (IDI_WINLOGO): 32, 22, 16, 14, 12 and 10 px | `user-105-32.webp`, `user-105-16.webp` |  |
| `system.colors.extension` | reuse | `system.extension` | — |  |
| `system.colors.pickerCmyk` | core | — | — | color picker mode glyph (Classicy UI) |
| `system.colors.pickerCrayon` | core | — | — | color picker mode glyph (Classicy UI) |
| `system.colors.pickerHex` | core | — | — | color picker mode glyph (Classicy UI) |
| `system.colors.pickerHls` | core | — | — | color picker mode glyph (Classicy UI) |
| `system.colors.pickerHsv` | core | — | — | color picker mode glyph (Classicy UI) |
| `system.colors.pickerRgb` | core | — | — | color picker mode glyph (Classicy UI) |
| `system.desktop.desktop` | export | `explorer.exe` #103: Desktop (Show Desktop, desktop.scf) | `explorer-103-32.webp`, `explorer-103-16.webp` |  |
| `system.display.brightness` | core | — | — | UI glyph |
| `system.display.contrast` | core | — | — | UI glyph |
| `system.drives.cdrom` | export | `shell32.dll` #12: CD-ROM drive | `shell32-12-32.webp`, `shell32-12-16.webp` |  |
| `system.drives.disk` | export | `shell32.dll` #9: Hard disk drive (Drive DefaultIcon shell32.dll,8) | `shell32-9-32.webp`, `shell32-9-16.webp` |  |
| `system.drives.driveExternal` | export | `shell32.dll` #8: Removable disk drive | `shell32-8-32.webp`, `shell32-8-16.webp` | removable disk |
| `system.drives.dvdAudio` | reuse | `system.drives.cdrom` | — | Windows 98 drew a DVD drive as a CD-ROM drive |
| `system.drives.dvdVideo` | reuse | `system.drives.cdrom` | — | Windows 98 drew a DVD drive as a CD-ROM drive |
| `system.drives.dvd` | reuse | `system.drives.cdrom` | — | Windows 98 drew a DVD drive as a CD-ROM drive |
| `system.drives.floppyMac` | reuse | `system.drives.floppy` | — |  |
| `system.drives.floppyPc` | export | `shell32.dll` #7: 3.5" floppy drive | `shell32-7-32.webp`, `shell32-7-16.webp` |  |
| `system.drives.floppy` | export | `shell32.dll` #7: 3.5" floppy drive | `shell32-7-32.webp`, `shell32-7-16.webp` |  |
| `system.drives.internetDrive` | reuse | `system.drives.networkDrive` | — |  |
| `system.drives.networkDrive` | export | `shell32.dll` #10: Network drive | `shell32-10-32.webp`, `shell32-10-16.webp` |  |
| `system.drives.raid` | reuse | `system.drives.disk` | — |  |
| `system.drives.rom` | reuse | `system.drives.disk` | — |  |
| `system.extensions.appleGuide` | reuse | `system.help` | — | Windows Help |
| `system.extensions.appleShare` | reuse | `system.network.networkLocal` | — |  |
| `system.extensions.appleVision` | reuse | `controlPanels.appearanceManager.app` | — | a display |
| `system.extensions.contextMenus` | reuse | `system.extension` | — |  |
| `system.extensions.dateAndTime` | reuse | `controlPanels.dateTimeManager.dateTimeManager` | — |  |
| `system.extensions.ethernet` | reuse | `system.network.networkLocal` | — |  |
| `system.extensions.fmRadio` | reuse | `system.extension` | — |  |
| `system.extensions.quickdraw` | reuse | `system.extension` | — |  |
| `system.extensions.quicktime` | export | `actmovie.exe` #0: ActiveMovie Control | `actmovie-0-32.webp`, `actmovie-0-16.webp` | ActiveMovie, Windows 98's media framework |
| `system.extensions.quicktimeMpeg` | reuse | `system.extension` | — |  |
| `system.extensions.screensaver` | export | `scrnsave.scr` #100: Screen saver (Blank Screen, the generic .scr icon) | `scrnsave-100-32.webp`, `scrnsave-100-16.webp` |  |
| `system.extensions.soundManager` | reuse | `controlPanels.soundManager.app` | — |  |
| `system.files._1292` | reuse | `system.files.document` | — |  |
| `system.files._1294` | reuse | `system.files.document` | — |  |
| `system.files.application` | export | `shell32.dll` #3: Application (an .exe with no icon); comfile | `shell32-3-32.webp`, `shell32-3-16.webp` |  |
| `system.files.document` | export | `shell32.dll` #2: Document (a file of a registered type with no icon of its own) | `shell32-2-32.webp`, `shell32-2-16.webp` |  |
| `system.files.edition` | reuse | `system.files.document` | — |  |
| `system.files.fileInvisible` | reuse | `system.files.file` | — | Windows drew hidden files with their own icon |
| `system.files.filePc` | reuse | `system.files.file` | — |  |
| `system.files.fileText` | export | `shell32.dll` #152: Text document (.txt; txtfile DefaultIcon shell32.dll,-152) | `shell32-152-32.webp`, `shell32-152-16.webp` |  |
| `system.files.file` | export | `shell32.dll` #1: Unknown file type (Windows logo on a page); shell32.dll index 0 | `shell32-1-32.webp`, `shell32-1-16.webp` | iconImageByType's default: an unknown file type |
| `system.files.internationalization` | reuse | `system.files.document` | — |  |
| `system.files.note` | reuse | `system.files.fileText` | — |  |
| `system.files.photo` | export | `iexplore.exe` #32540: JPEG image (jpegfile, IE 5) | `iexplore-32540-32.webp`, `iexplore-32540-16.webp` | JPEG image |
| `system.files.preferences` | export | `shell32.dll` #151: Configuration settings (.ini; inifile DefaultIcon shell32.dll,-151) | `shell32-151-32.webp`, `shell32-151-16.webp` | configuration settings (.ini) |
| `system.files.script` | export | `shell32.dll` #153: MS-DOS batch file (.bat; batfile DefaultIcon shell32.dll,-153) | `shell32-153-32.webp`, `shell32-153-16.webp` | batch file |
| `system.files.settingsSync` | reuse | `system.files.document` | — |  |
| `system.files.slideshow` | reuse | `system.files.document` | — |  |
| `system.files.sound` | export | `sndrec32.exe` #15: Wave sound document (.wav; SoundRec DefaultIcon sndrec32.exe,1) | `sndrec32-15-32.webp`, `sndrec32-15-16.webp` | Wave sound |
| `system.files.stationaryBlack` | reuse | `system.files.document` | — |  |
| `system.folders.appleMenuItem` | export | `shell32.dll` #37: Program group folder (Start menu folders) | `shell32-37-32.webp`, `shell32-37-16.webp` | the Start Menu folder's program groups |
| `system.folders.applicationSupport` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.applications` | reuse | `system.folders.appleMenuItem` | — | Programs: a program group folder |
| `system.folders.assistant` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.colorsyncProfiles` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.compressed` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.contextualMenuItems` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.controlPanels` | export | `shell32.dll` #137: Control Panel folder | `shell32-137-32.webp`, `shell32-137-16.webp` |  |
| `system.folders.controlStrip` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.directory` | export | `shell32.dll` #4: Folder (Folder/Directory DefaultIcon shell32.dll,3) | `shell32-4-32.webp`, `shell32-4-16.webp` |  |
| `system.folders.extensions` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.extras` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.favorites` | export | `shell32.dll` #44: Favorites folder | `shell32-44-32.webp`, `shell32-44-16.webp` |  |
| `system.folders.folderApple` | reuse | `system.folders.appleMenuItem` | — |  |
| `system.folders.folderExtensions` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.folderFlip` | export | `shell32.dll` #5: Open folder (Explorer tree, Look in list) | `shell32-5-32.webp`, `shell32-5-16.webp` | open folder |
| `system.folders.folderFonts` | reuse | `system.folders.fonts` | — |  |
| `system.folders.folderLdap` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.folderPreferences` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.folderPrinters` | export | `shell32.dll` #38: Printers folder | `shell32-38-32.webp`, `shell32-38-16.webp` |  |
| `system.folders.folderSystemProtected` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.folderSystem` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.fonts` | export | `shell32.dll` #39: Fonts folder | `shell32-39-32.webp`, `shell32-39-16.webp` |  |
| `system.folders.help` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.internet` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.internetSearchSites` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.languageAndRegion` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.preferences` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.recentDocuments` | export | `shell32.dll` #21: Documents (Start menu, recent documents) | `shell32-21-32.webp`, `shell32-21-16.webp` | Start menu Documents |
| `system.folders.scripts` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.startupItems` | reuse | `system.folders.appleMenuItem` | — | StartUp: a program group |
| `system.folders.suitcaseSystem` | reuse | `system.folders.suitcase` | — |  |
| `system.folders.suitcase` | export | `shell32.dll` #156: Font file, TrueType (.ttf; shell32.dll,-156) | `shell32-156-32.webp`, `shell32-156-16.webp` | a Mac font suitcase: a TrueType font file |
| `system.folders.suitecaseSystem` | reuse | `system.folders.suitcase` | — |  |
| `system.folders.system` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.textEncodings` | reuse | `system.folders.directory` | — | Windows drew its system folders (Windows, System, …) as plain folders |
| `system.folders.utilities` | reuse | `system.folders.appleMenuItem` | — | Accessories / System Tools: program groups |
| `system.network.chooser` | reuse | `system.folders.folderPrinters` | — | Windows chose printers in the Printers folder |
| `system.network.controlpanelInternet` | reuse | `applications.internetExplorer.preferences` | — |  |
| `system.network.crypto` | export | `password.cpl` #1000: Passwords (Control Panel) | `password-1000-32.webp`, `password-1000-16.webp` | Passwords |
| `system.network.fileServer` | reuse | `system.drives.networkDrive` | — |  |
| `system.network.globeAnimated` | reuse | `system.network.globe` | — |  |
| `system.network.globe` | export | `shell32.dll` #14: Entire Network (globe) | `shell32-14-32.webp`, `shell32-14-16.webp` | Entire Network's globe |
| `system.network.internetConfig` | reuse | `applications.internetExplorer.preferences` | — |  |
| `system.network.internetServices` | reuse | `system.network.globe` | — |  |
| `system.network.internet` | reuse | `applications.internetExplorer.app` | — |  |
| `system.network.ldapDirectory` | export | `wab32.dll` #IDI_ICON_ABOOK: Address Book | `wab32-IDI_ICON_ABOOK-32.webp`, `wab32-IDI_ICON_ABOOK-16.webp` | Address Book |
| `system.network.modem` | export | `modem.cpl` #1000: Modems (Control Panel) | `modem-1000-32.webp`, `modem-1000-16.webp` |  |
| `system.network.networkLocal` | export | `shell32.dll` #18: Network Neighborhood (desktop icon, CLSID DefaultIcon shell32.dll,17) | `shell32-18-32.webp`, `shell32-18-16.webp` | Network Neighborhood |
| `system.network.networkPublic` | reuse | `system.network.globe` | — | Entire Network |
| `system.network.sslInvalid` | core | — | — | IE drew its secure-connection lock in the status bar from a bitmap, not an icon |
| `system.network.sslWeb` | core | — | — | IE drew its secure-connection lock in the status bar from a bitmap, not an icon |
| `system.network.ssl` | core | — | — | IE drew its secure-connection lock in the status bar from a bitmap, not an icon |
| `system.network.terminal` | export | `pifmgr.dll` #1: MS-DOS Prompt / MS-DOS program | `pifmgr-1-32.webp` | MS-DOS Prompt |
| `system.network.usenet` | core | — | — | Classicy's Usenet reader (brand) |
| `system.network.userDirectory` | export | `inetcpl.cpl` #1323: Users (Control Panel) | `inetcpl-1323-32.webp`, `inetcpl-1323-16.webp` | Users |
| `system.quicktime.backwardButton` | core | — | — | the QuickTime controller's own UI glyphs |
| `system.quicktime.cc` | core | — | — | the QuickTime controller's own UI glyphs |
| `system.quicktime.controlPanel` | export | `mmsys.cpl` #99: Multimedia (Control Panel) | `mmsys-99-32.webp`, `mmsys-99-16.webp` | Multimedia (Control Panel) |
| `system.quicktime.extension` | reuse | `system.extensions.quicktime` | — |  |
| `system.quicktime.forwardButton` | core | — | — | the QuickTime controller's own UI glyphs |
| `system.quicktime.fullscreenButton` | core | — | — | the QuickTime controller's own UI glyphs |
| `system.quicktime.movieStationary` | reuse | `system.quicktime.movie` | — |  |
| `system.quicktime.movie` | export | `quartz.dll` #100: Video clip (.avi/.mov, ActiveMovie) | `quartz-100-32.webp`, `quartz-100-16.webp` | video clip |
| `system.quicktime.pauseButton` | core | — | — | the QuickTime controller's own UI glyphs |
| `system.quicktime.playButton` | core | — | — | the QuickTime controller's own UI glyphs |
| `system.quicktime.player` | export | `mplayer2.exe` #110: Media Player (Start > Programs > Accessories > Entertainment) | `mplayer2-110-32.webp`, `mplayer2-110-16.webp` | Media Player |
| `system.quicktime.splash` | core | — | — | the QuickTime controller's own UI glyphs |
| `system.quicktime.thumbSlider` | core | — | — | the QuickTime controller's own UI glyphs |
| `system.quicktime.volumeSlider` | core | — | — | the QuickTime controller's own UI glyphs |
| `system.richTextEditor.menubar.alignCenterActive` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.alignCenterDepressed` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.alignCenterOff` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.alignLeftActive` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.alignLeftDepressed` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.alignLeftOff` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.alignRightActive` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.alignRightDepressed` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.alignRightOff` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.boldActive` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.boldDepressed` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.boldOff` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.capsActive` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.capsDepressed` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.capsOff` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.indentActive` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.indentOff` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.italicActive` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.italicDepressed` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.italicOff` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.orderedListActive` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.orderedListDepressed` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.orderedListOff` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.outdentActive` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.outdentOff` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.ruleActive` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.ruleOff` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.search` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.underlineActive` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.underlineDepressed` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.underlineOff` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.unorderedListActive` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.unorderedListDepressed` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.richTextEditor.menubar.unorderedListOff` | core | — | — | rich text editor toolbar glyph (read by no code; WordPad's toolbar bitmaps are not icons) |
| `system.security.id` | reuse | `system.network.userDirectory` | — |  |
| `system.security.key` | reuse | `system.network.crypto` | — |  |
| `system.sherlock.searchData` | reuse | `system.sherlock.sherlock` | — |  |
| `system.sherlock.searchFiles` | reuse | `system.sherlock.sherlock` | — |  |
| `system.sherlock.search` | reuse | `system.sherlock.sherlock` | — |  |
| `system.sherlock.sherlock` | export | `shell32.dll` #23: Find (Start menu); Find Files or Folders | `shell32-23-32.webp`, `shell32-23-16.webp` | Find |
| `system.tags.colors.aqua` | core | — | — | Mac label colors |
| `system.tags.colors.black` | core | — | — | Mac label colors |
| `system.tags.colors.blue` | core | — | — | Mac label colors |
| `system.tags.colors.fuchsia` | core | — | — | Mac label colors |
| `system.tags.colors.gray` | core | — | — | Mac label colors |
| `system.tags.colors.green` | core | — | — | Mac label colors |
| `system.tags.colors.lime` | core | — | — | Mac label colors |
| `system.tags.colors.maroon` | core | — | — | Mac label colors |
| `system.tags.colors.navy` | core | — | — | Mac label colors |
| `system.tags.colors.olive` | core | — | — | Mac label colors |
| `system.tags.colors.purple` | core | — | — | Mac label colors |
| `system.tags.colors.red` | core | — | — | Mac label colors |
| `system.tags.colors.silver` | core | — | — | Mac label colors |
| `system.tags.colors.teal` | core | — | — | Mac label colors |
| `system.tags.colors.white` | core | — | — | Mac label colors |
| `system.tags.colors.yellow` | core | — | — | Mac label colors |
| `ui.halftoneLarge` | core | — | — | the pre-boot screen's dither (Classicy UI) |
| `ui.menuDropdownArrowUp` | core | — | — | UI glyph (Windows drew arrows with Marlett in the text color: pixel art) |
| `ui.cursors.hand` | core | — | — | the cursor registry's concern (Cursors) |

The package also registers three leaves of its own, under a `windows98` namespace no core key uses, so each draws its 16 px image wherever it is drawn small: `windows98.explorer` (`explorer.exe` #101, the Finder's override icon), `windows98.recycleBinEmpty` and `windows98.recycleBinFull` (`shell32.dll` #32 and #33, the Trash's art).

## System art

Each `ClassicySystemArtKey`. "register" keys draw Windows 98's file; "default" keys are not registered, so they resolve to the default package's art, and the package's stylesheet hides or replaces whatever of it Windows 98 would not show.

| Key | Decision | Source | File | Note |
| --- | --- | --- | --- | --- |
| `appleMenu` | register | `explorer.exe` bitmap 143: the Start button's flag (16 x 16, 4-bit) | `art/explorer-bitmap-143.webp` | the Apple menu's title, drawn as the Start button; its `#C0C0C0` ground made clear, as Windows mapped it to the button face (`LR_LOADMAP3DCOLORS`) |
| `sadMac` | default | — | — | Windows' fatal error is text on blue, drawn by the crash screen, not a bitmap |
| `startupLogo` | register | `shell32.dll` bitmap 130: the About Windows box's "Microsoft Windows" logo (64 x 64, 4-bit, RLE) | `art/shell32-bitmap-130.webp` | its `#C0C0C0` ground made clear; Windows 98's boot screen (LOGO.SYS, 320 x 400, inside IO.SYS) is in no source at its own pixels |
| `trashEmpty` | register | `shell32.dll` #32: the Recycle Bin, empty (32 px, 8-bit) | `icons/shell32-32-32.webp` | its 16 px image (`shell32-32-16.webp`) is the package's own `windows98.recycleBinEmpty` leaf, so a small Trash draws it |
| `trashFull` | register | `shell32.dll` #33: the Recycle Bin, full (32 px, 8-bit) | `icons/shell32-33-32.webp` | its 16 px image through `windows98.recycleBinFull`, likewise |
| `aliasBadge` | register | `shell32.dll` #30: the shortcut overlay (32 px, 4-bit) | `icons/shell32-30-32.webp` | an arrow box at the bottom left of a clear 32 x 32 image, which Windows drew over the whole icon: the package's stylesheet sizes the badge to the icon (`--alias-badge-size`) |
| `helpButton` | default | — | — | the package's stylesheet hides the art and draws the "?" from tokens, as Windows drew it in the text color |
| `aboutLogo` | register | `shell32.dll` bitmap 130 | `art/shell32-bitmap-130.webp` | as `startupLogo`; the banner behind it is `classicy.bg` (Icons) |
| `aboutBackground` | default | — | — | read by nothing |
| `windowStripes` | default | — | — | Windows drew it with Marlett or DrawFrameControl in the scheme's colors: the package's stylesheet draws it from tokens and reads no art |
| `windowStripesRed` | default | — | — | Windows drew it with Marlett or DrawFrameControl in the scheme's colors: the package's stylesheet draws it from tokens and reads no art |
| `windowUtilityTexture` | default | — | — | Windows drew it with Marlett or DrawFrameControl in the scheme's colors: the package's stylesheet draws it from tokens and reads no art |
| `windowGrip` | default | — | — | Windows drew it with Marlett or DrawFrameControl in the scheme's colors: the package's stylesheet draws it from tokens and reads no art |
| `windowDither` | default | — | — | Windows drew it with Marlett or DrawFrameControl in the scheme's colors: the package's stylesheet draws it from tokens and reads no art |
| `zoomGlyph` | default | — | — | Windows drew it with Marlett or DrawFrameControl in the scheme's colors: the package's stylesheet draws it from tokens and reads no art |
| `collapseGlyph` | default | — | — | Windows drew it with Marlett or DrawFrameControl in the scheme's colors: the package's stylesheet draws it from tokens and reads no art |
| `submenuArrow` | default | — | — | Windows drew it with Marlett or DrawFrameControl in the scheme's colors: the package's stylesheet draws it from tokens and reads no art |
| `popupArrows` | default | — | — | Windows drew it with Marlett or DrawFrameControl in the scheme's colors: the package's stylesheet draws it from tokens and reads no art |
| `sliderThumb` | default | — | — | Windows drew it with Marlett or DrawFrameControl in the scheme's colors: the package's stylesheet draws it from tokens and reads no art |
| `sliderThumbRect` | default | — | — | Windows drew it with Marlett or DrawFrameControl in the scheme's colors: the package's stylesheet draws it from tokens and reads no art |
| `sliderStrikes` | default | — | — | Windows drew it with Marlett or DrawFrameControl in the scheme's colors: the package's stylesheet draws it from tokens and reads no art |
| `tabOutline` | default | — | — | Windows drew it with Marlett or DrawFrameControl in the scheme's colors: the package's stylesheet draws it from tokens and reads no art |
| `halftone` | default | — | — | Windows drew it with Marlett or DrawFrameControl in the scheme's colors: the package's stylesheet draws it from tokens and reads no art |
| `halftoneLarge` | default | — | — | the pre-boot dither, Classicy's |
| `quickTimeThumbSlider` | default | — | — | the QuickTime controller's own art |
| `quickTimeVolumeSlider` | default | — | — | the QuickTime controller's own art |
| `controlStripTab` | default | — | — | the package's stylesheet draws the strip's tab from tokens and hides the art |
| `controlStripTabRight` | default | — | — | the package's stylesheet draws the strip's tab from tokens and hides the art |
| `newFolderGlyph` | default | — | — | the base sheet hides the glyph: the button stays in words, as the Open and Save boxes' New Folder button had none |
| `openFolderIcon` | register | `shell32.dll` #5: open folder (16 px, 8-bit) | `icons/shell32-5-16.webp` | the open folder the Look in list shows |
| `fileDialogFolderIcon` | register | `shell32.dll` #4: folder (16 px, 8-bit) | `icons/shell32-4-16.webp` | the folder in the Open and Save lists |
| `controlStripCollapse` | default | — | — | pixel art the package draws from tokens |
| `controlStripScrollLeft` | default | — | — | pixel art the package draws from tokens |
| `controlStripScrollLeftDisabled` | default | — | — | pixel art the package draws from tokens |
| `controlStripScrollRight` | default | — | — | pixel art the package draws from tokens |
| `controlStripScrollRightDisabled` | default | — | — | pixel art the package draws from tokens |
| `controlStripModuleArrow` | default | — | — | pixel art the package draws from tokens |
| `popUpSliderTrack` | default | — | — | pixel art the package draws from tokens |
| `popUpSliderThumb` | default | — | — | pixel art the package draws from tokens |
| `menuCheck` | default | — | — | Windows drew it with Marlett in the text color: the package's stylesheet draws it from tokens |
| `menuDash` | default | — | — | Windows drew it with Marlett in the text color: the package's stylesheet draws it from tokens |
| `triangle` | default | — | — | Windows drew it with Marlett in the text color: the package's stylesheet draws it from tokens |
| `downArrow` | default | — | — | Windows drew it with Marlett in the text color: the package's stylesheet draws it from tokens |
| `ditherChecker` | default | — | — | Windows drew it with Marlett in the text color: the package's stylesheet draws it from tokens |
| `helpMenuTitle` | default | — | — | Windows titles Help in words; Platinum registers none either, so the word shows |

## Cursors

Each `ClassicyCursorRole`, registered with `registerClassicyCursors` at its resource's own hotspot (`[x, y]` from the image's top left). Windows had no one-way size cursors (a window edge at its limit kept the two-way arrow), so the four one-way roles draw the two-way cursors. The package's stylesheet shows `resizeNwse` over the size grip, where the base reads the Mac grow box's `resizeLr`.

| Role | Windows 98 cursor | Source | File | Hotspot | Note |
| --- | --- | --- | --- | --- | --- |
| `arrow` | Normal Select | `user.exe` cursor 100 | `cursors/user-cursor-100.png` | 0, 0 | the white arrow with its black outline |
| `watch` | Busy | `user.exe` cursor 102 | `cursors/user-cursor-102.png` | 16, 16 | the default scheme's static hourglass |
| `hand` | Link Select | `user.exe` cursor 114 | `cursors/user-cursor-114.png` | 5, 0 | the pointing hand Windows 98 added (IDC_HAND); the PDF viewer's pan tool |
| `ibeam` | Text Select | `user.exe` cursor 101 | `cursors/user-cursor-101.png` | 15, 16 | every pixel inverts: drawn black |
| `crosshair` | Precision Select | `user.exe` cursor 103 | `cursors/user-cursor-103.png` | 15, 16 | every pixel inverts: drawn black |
| `resizeLr` | Horizontal Resize | `user.exe` cursor 107 | `cursors/user-cursor-107.png` | 16, 16 | a split view's vertical divider |
| `resizeUd` | Vertical Resize | `user.exe` cursor 108 | `cursors/user-cursor-108.png` | 15, 16 | a split view's horizontal divider |
| `resizeNwse` | Diagonal Resize 1 | `user.exe` cursor 105 | `cursors/user-cursor-105.png` | 16, 16 | the size grip (the package's stylesheet) |
| `resizeNesw` | Diagonal Resize 2 | `user.exe` cursor 106 | `cursors/user-cursor-106.png` | 16, 16 | |
| `resizeU` | Vertical Resize | `user.exe` cursor 108 | `cursors/user-cursor-108.png` | 15, 16 | no one-way cursor in Windows |
| `resizeD` | Vertical Resize | `user.exe` cursor 108 | `cursors/user-cursor-108.png` | 15, 16 | no one-way cursor in Windows |
| `resizeL` | Horizontal Resize | `user.exe` cursor 107 | `cursors/user-cursor-107.png` | 16, 16 | no one-way cursor in Windows |
| `resizeR` | Horizontal Resize | `user.exe` cursor 107 | `cursors/user-cursor-107.png` | 16, 16 | no one-way cursor in Windows |

USER.EXE's other cursors have no role: Up Arrow (Alternate Select, 104), Move (109), Unavailable (110), Working in Background (111), Help Select (112) and Handwriting (113). The CD's loose cursor files are the other schemes' (Windows Standard large and extra large, Windows Black and Windows Inverted, each at three sizes: `arrow_l.cur`, `arrow_m.cur`, `arrow_r.cur`, `cross_i.cur`, …), the animated cursors (`appstart.ani`, `globe.ani`, …) and the Desktop Themes', none of them the default scheme's.

## Fonts

The faces registered with `registerClassicyFonts` (and written to `dist/classicy-windows98.fonts.css` for strict-CSP hosts), under the family every theme names first in its `ui`, `header` and `body` stacks. The monospaced stacks (`mono`, `digital`) name `"Fixedsys"` first, a face the package does not ship: Windows' own (`vgafix.fon`) is a bitmap font, so the host's Fixedsys, Lucida Console or Courier New draws them.

| Family | Weight | Style | File | Source | License |
| --- | --- | --- | --- | --- | --- |
| `Pixelated MS Sans Serif` | normal | normal | `fonts/PixelatedMSSansSerif-normal-normal.woff2` | FontStruct "MS Sans Serif" by lou (fontstruct.com/fontstructions/show/1384746), 98.css's woff2 (`ms_sans_serif.woff2`) | CC BY-SA 3.0: `fonts/font-readme.txt`, `fonts/font-license.txt` |
| `Pixelated MS Sans Serif` | bold | normal | `fonts/PixelatedMSSansSerif-bold-normal.woff2` | FontStruct "MS Sans Serif Bold" by lou (fontstruct.com/fontstructions/show/1384862), 98.css's woff2 (`ms_sans_serif_bold.woff2`) | CC BY-SA 3.0: `fonts/font-bold-readme.txt`, `fonts/font-bold-license.txt` |

The recreation draws MS Sans Serif 8 pt at 96 dpi, the size the themes set (11 px); the package's stylesheet draws it unsmoothed (`-webkit-font-smoothing: none`), as Windows drew its bitmap face.

## Apps

The package's `apps` overrides (`ClassicyAppIdentityOverride`), display only: the bundled apps by the names Windows 98 gave the same job. "—" keeps the app's own. Every app's own icon key already draws Windows 98's image for it (Icons), so only the Finder names an icon.

| App | Name | Icon | Description | Note |
| --- | --- | --- | --- | --- |
| `Finder.app` | Windows Explorer | `explorer.exe` #101 (`explorer-101-32.webp`, its 16 px image the `windows98.explorer` leaf's) | Shows the files and folders on your computer, and opens them. | Start ▸ Programs ▸ Windows Explorer; the Finder's own icon key is the OS emblem's (`system.macos`, the Windows logo), so the override names its icon |
| `SimpleText.app` | Notepad | — (`applications.simpletext.app`: `notepad.exe` #2) | Creates and edits text files. | |
| `Calculator.app` | — | — (`applications.calculator.app`: `calc.exe` #SC) | Performs mathematical calculations. | Windows 98's own (`Calc_TIP`) |
| `AppearanceManager.app` | Display | — (`controlPanels.appearanceManager.app`: `deskcp16.dll` #40) | Changes the appearance of your desktop: its background, colors, fonts, sounds and theme. | Display Properties' job; Classicy's panel also switches themes and sounds, which Desktop Themes did |
| `SoundManager.app` | Sounds | — (`controlPanels.soundManager.app`: `mmsys.cpl` #110) | Changes system and program sounds. | Windows 98's own (`mmsys.cpl` string 4870) |
| `DateAndTimeManager.app` | Date/Time | — (`controlPanels.dateTimeManager.dateTimeManager`: `timedate.cpl` #200) | Changes date, time and time zone information. | Windows 98's own (`timedate.cpl` string 301) |
| `ControlStripManager.app` | Taskbar & Start Menu | — (`controlPanels.controlStripManager.app`: `shell32.dll` #40) | Changes the settings of the taskbar and its tray. | |
| `ScreenSaverManager.app` | — | — (`system.extensions.screensaver`: `scrnsave.scr` #100) | Displays moving images when your computer is idle to prevent damage to your screen. | Windows 98's own (`SCREENSAVER_TIP`); Screen Saver was a tab of Display Properties, with no panel of its own, so the name stays |
| `ScreenSaver.app` | — | — (`system.extensions.screensaver`: `scrnsave.scr` #100) | Displays moving images when your computer is idle to prevent damage to your screen. | the extension |
| `AppleGuide.app` | Windows Help | — (`system.extensions.appleGuide`: `shell32.dll` #24) | Opens Help, where you can look up how to do a task. | `HelpInit_Desc` |
| `MoviePlayer.app` | Media Player | — (`system.quicktime.player`: `mplayer2.exe` #110) | Plays audio, video and animation files. | `MPlayerLinkDesc` |
| `PictureViewer.app` | Imaging | — (`applications.pictureViewer.app`: `kodakimg.exe` #128) | Opens, views and prints pictures. | `IMAGEVUE_LINK` |
| `WebViewer.app` | Internet Explorer | — (`applications.internetExplorer.globe`: `iexplore.exe` #32528) | Displays pages on the World Wide Web or your corporate intranet, or connects you to the Internet. | Windows 98's own (`Browser_Infotip`) |
| `PDFViewer.app` | — | — (`system.files.document`: `shell32.dll` #2) | — | Windows 98 had no PDF viewer |
| `HyperCard.app` | — | — (`system.files.application`: `shell32.dll` #3) | — | no Windows counterpart |
| `DriveSetup.app` | — | — (`system.drives.disk`: `shell32.dll` #9) | — | Windows 98 set disks up with MS-DOS's FDISK and FORMAT; no windowed program did Drive Setup's job |

## Desktop icons

The package's `desktopIcons` (`ClassicyDesktopIconOverrides`), display only: the icons' records, paths, analytics and saved state keep their own names. Windows 98 put no drive on its desktop, only My Computer, its way to the disks, so the startup disk is shown as My Computer. The tips are written from Windows 98 (the desktop's tips are not in the CD's string tables).

| Icon | Name | Icon image | Description |
| --- | --- | --- | --- |
| `trash` | Recycle Bin | — (the `trashEmpty`/`trashFull` art) | Contains the files and folders that you have deleted. |
| `startupDisk` | My Computer | `explorer.exe` #100 (`explorer-100-32.webp`, the `system.mac` key's) | Displays the contents of your computer. |
