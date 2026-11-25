/**
 * Which Windows 98 image draws each icon key (docs/windows98-asset-
 * inventory.md, "Icons"). Data only: `windows98Assets.ts` builds the
 * registered tree from it.
 *
 * Every image is a Windows 98 Second Edition resource, read from the
 * English Windows 98 SE CD's cabinets: an icon group's 32 px and 16 px
 * images (the 256-color image where the group has one, as Windows 98 drew
 * it on a high-color screen), Internet Explorer 5's toolbar bitmaps, and
 * Web View's sky. `WINDOWS98_ICON_FILES` names each key's files in
 * `icons/`, by their source: `<binary>-<group id>-<size>.webp` for an icon
 * group's image, `browseui-bitmap-<id>-cell-<n>.webp` for a 20 x 20 cell
 * of a toolbar strip. `src` is the 32 px image (or a key's only image) and
 * `small` the group's own 16 px one, which Windows drew at the small size
 * rather than scaling. `WINDOWS98_ICON_REUSE` gives a key another key's
 * image: what Windows 98 showed for a thing it lacked, its generic for
 * that kind (an unknown file the Windows-logo page, a document shell32's
 * document, a Mac extension a system file, a system folder a plain folder,
 * a DVD the CD-ROM drive). Every other key of the core icon tree (Classicy's
 * own glyphs and brands, the Mac's label colors, the rich text editor's and
 * the QuickTime controller's glyphs) is left out, so it resolves to the
 * default package's image.
 */

/** A key's files in `icons/`: its 32 px image (or its only one) and its own 16 px one. */
export type Windows98IconFiles = {
	readonly src: string;
	readonly small?: string;
};

export const WINDOWS98_ICON_FILES: Readonly<
	Record<string, Windows98IconFiles>
> = {
	// calc.exe #SC: Calculator.
	"applications.calculator.app": { src: "calc-SC-32", small: "calc-SC-16" },
	// iexplore.exe #32528: Internet Explorer (the program, desktop icon).
	"applications.internetExplorer.app": {
		src: "iexplore-32528-32",
		small: "iexplore-32528-16",
	},
	// IE 5's toolbar, browseui.dll bitmap 265 (the gray strip), cell 0: Back.
	"applications.internetExplorer.backward": {
		src: "browseui-bitmap-265-cell-0",
	},
	// IE 5's toolbar, browseui.dll bitmap 266 (the color strip), cell 0: Back.
	"applications.internetExplorer.backwardOn": {
		src: "browseui-bitmap-266-cell-0",
	},
	// iexplore.exe #32529: HTML document (htmlfile).
	"applications.internetExplorer.document": {
		src: "iexplore-32529-32",
		small: "iexplore-32529-16",
	},
	// IE 5's toolbar, browseui.dll bitmap 266 (the color strip), cell 4: Home.
	"applications.internetExplorer.documentHome": {
		src: "browseui-bitmap-266-cell-4",
	},
	// mshtml.dll #2664: Internet Shortcut (.url).
	"applications.internetExplorer.documentLink": {
		src: "mshtml-2664-32",
		small: "mshtml-2664-16",
	},
	// IE 5's toolbar, browseui.dll bitmap 266 (the color strip), cell 9: Edit.
	"applications.internetExplorer.editor": { src: "browseui-bitmap-266-cell-9" },
	// IE 5's toolbar, browseui.dll bitmap 266 (the color strip), cell 6: Favorites. The core draws compass, favorites and favoritesOn with one image, which a stored URL stands for, so all three draw this cell.
	"applications.internetExplorer.favorites": {
		src: "browseui-bitmap-266-cell-6",
	},
	// IE 5's toolbar, browseui.dll bitmap 265 (the gray strip), cell 1: Forward.
	"applications.internetExplorer.forward": {
		src: "browseui-bitmap-265-cell-1",
	},
	// IE 5's toolbar, browseui.dll bitmap 266 (the color strip), cell 1: Forward.
	"applications.internetExplorer.forwardOn": {
		src: "browseui-bitmap-266-cell-1",
	},
	// msimn.exe #2: Outlook Express.
	"applications.internetExplorer.mailbox": {
		src: "msimn-2-32",
		small: "msimn-2-16",
	},
	// iesetup.dll #102: Internet Options (Control Panel "Internet").
	"applications.internetExplorer.preferences": {
		src: "iesetup-102-32",
		small: "iesetup-102-16",
	},
	// IE 5's toolbar, browseui.dll bitmap 266 (the color strip), cell 7: Print.
	"applications.internetExplorer.print": { src: "browseui-bitmap-266-cell-7" },
	// IE 5's toolbar, browseui.dll bitmap 265 (the gray strip), cell 3: Refresh.
	"applications.internetExplorer.refresh": {
		src: "browseui-bitmap-265-cell-3",
	},
	// IE 5's toolbar, browseui.dll bitmap 266 (the color strip), cell 3: Refresh.
	"applications.internetExplorer.refreshOn": {
		src: "browseui-bitmap-266-cell-3",
	},
	// IE 5's toolbar, browseui.dll bitmap 266 (the color strip), cell 5: Search.
	"applications.internetExplorer.search": { src: "browseui-bitmap-266-cell-5" },
	// kodakimg.exe #128: Imaging (Kodak Imaging for Windows).
	"applications.pictureViewer.app": {
		src: "kodakimg-128-32",
		small: "kodakimg-128-16",
	},
	// regwizc.dll #117: Registration Wizard.
	"applications.registerWithApple.app": {
		src: "regwizc-117-32",
		small: "regwizc-117-16",
	},
	// welcome.exe #102: Welcome to Windows 98.
	"applications.setupAssistant.setupAssistant": {
		src: "welcome-102-32",
		small: "welcome-102-16",
	},
	// notepad.exe #2: Notepad (the program).
	"applications.simpletext.app": { src: "notepad-2-32", small: "notepad-2-16" },
	// msinfo32.exe #128: System Information.
	"applications.systemProfiler.app": {
		src: "msinfo32-128-32",
		small: "msinfo32-128-16",
	},
	// Windows 98 SE's Web View sky, C:\WINDOWS\WEB\wvlogo.gif (480 x 480), the backdrop its folder windows drew their title on.
	"classicy.bg": { src: "wvlogo" },
	// deskcp16.dll #40: Display (Control Panel).
	"controlPanels.appearanceManager.app": {
		src: "deskcp16-40-32",
		small: "deskcp16-40-16",
	},
	// themes.cpl #101: Desktop Themes (Control Panel); .theme files.
	"controlPanels.appearanceManager.file": {
		src: "themes-101-32",
		small: "themes-101-16",
	},
	// shell32.dll #40: Taskbar (Taskbar & Start Menu properties).
	"controlPanels.controlStripManager.app": {
		src: "shell32-40-32",
		small: "shell32-40-16",
	},
	// timedate.cpl #200: Date/Time (Control Panel).
	"controlPanels.dateTimeManager.dateTimeManager": {
		src: "timedate-200-32",
		small: "timedate-200-16",
	},
	// main.cpl #200: Keyboard (Control Panel).
	"controlPanels.keyboard.app": { src: "main-200-32", small: "main-200-16" },
	// intl.cpl #101: Regional Settings (Control Panel).
	"controlPanels.location.app": { src: "intl-101-32", small: "intl-101-16" },
	// mmsys.cpl #110: Sounds (Control Panel); its 16 px image is the taskbar's volume icon.
	"controlPanels.soundManager.app": {
		src: "mmsys-110-32",
		small: "mmsys-110-16",
	},
	// mmsys.cpl #110's 16 px image: the taskbar's volume icon.
	"controlPanels.soundManager.sound33": { src: "mmsys-110-16" },
	// mmsys.cpl #110's 16 px image: the taskbar's volume icon.
	"controlPanels.soundManager.sound66": { src: "mmsys-110-16" },
	// sndvol32.exe #303's 16 px image: the taskbar's muted volume icon.
	"controlPanels.soundManager.soundMute": { src: "sndvol32-303-16" },
	// sndvol32.exe #303's 16 px image: the taskbar's muted volume icon.
	"controlPanels.soundManager.soundOff": { src: "sndvol32-303-16" },
	// mmsys.cpl #110's 16 px image: the taskbar's volume icon.
	"controlPanels.soundManager.soundOn": { src: "mmsys-110-16" },
	// shell32.dll #26: Suspend / Stand by (Start menu).
	"system.controlStrip.sleep": { src: "shell32-26-32", small: "shell32-26-16" },
	// mmsys.cpl #110's 16 px image: the taskbar's volume icon.
	"system.controlStrip.sound": { src: "mmsys-110-16" },
	// sndvol32.exe #303's 16 px image: the taskbar's muted volume icon.
	"system.controlStrip.soundOff": { src: "sndvol32-303-16" },
	// explorer.exe #103: Desktop (Show Desktop, desktop.scf).
	"system.desktop.desktop": {
		src: "explorer-103-32",
		small: "explorer-103-16",
	},
	// shell32.dll #12: CD-ROM drive.
	"system.drives.cdrom": { src: "shell32-12-32", small: "shell32-12-16" },
	// shell32.dll #9: Hard disk drive (Drive DefaultIcon shell32.dll,8).
	"system.drives.disk": { src: "shell32-9-32", small: "shell32-9-16" },
	// shell32.dll #8: Removable disk drive.
	"system.drives.driveExternal": { src: "shell32-8-32", small: "shell32-8-16" },
	// shell32.dll #7: 3.5" floppy drive.
	"system.drives.floppy": { src: "shell32-7-32", small: "shell32-7-16" },
	// shell32.dll #7: 3.5" floppy drive.
	"system.drives.floppyPc": { src: "shell32-7-32", small: "shell32-7-16" },
	// shell32.dll #10: Network drive.
	"system.drives.networkDrive": {
		src: "shell32-10-32",
		small: "shell32-10-16",
	},
	// user.exe #103: Stop / hand (MB_ICONSTOP), 32 px; its 16 px image comctl32.dll #20480.
	"system.error": { src: "user-103-32", small: "comctl32-20480-16" },
	// shell32.dll #154: System file (.dll/.drv/.sys/.vxd; DefaultIcon shell32.dll,-154).
	"system.extension": { src: "shell32-154-32", small: "shell32-154-16" },
	// actmovie.exe #0: ActiveMovie Control.
	"system.extensions.quicktime": {
		src: "actmovie-0-32",
		small: "actmovie-0-16",
	},
	// scrnsave.scr #100: Screen saver (Blank Screen, the generic .scr icon).
	"system.extensions.screensaver": {
		src: "scrnsave-100-32",
		small: "scrnsave-100-16",
	},
	// shell32.dll #3: Application (an .exe with no icon); comfile.
	"system.files.application": { src: "shell32-3-32", small: "shell32-3-16" },
	// shell32.dll #2: Document (a file of a registered type with no icon of its own).
	"system.files.document": { src: "shell32-2-32", small: "shell32-2-16" },
	// shell32.dll #1: Unknown file type (Windows logo on a page); shell32.dll index 0.
	"system.files.file": { src: "shell32-1-32", small: "shell32-1-16" },
	// shell32.dll #152: Text document (.txt; txtfile DefaultIcon shell32.dll,-152).
	"system.files.fileText": { src: "shell32-152-32", small: "shell32-152-16" },
	// iexplore.exe #32540: JPEG image (jpegfile, IE 5).
	"system.files.photo": {
		src: "iexplore-32540-32",
		small: "iexplore-32540-16",
	},
	// shell32.dll #151: Configuration settings (.ini; inifile DefaultIcon shell32.dll,-151).
	"system.files.preferences": {
		src: "shell32-151-32",
		small: "shell32-151-16",
	},
	// shell32.dll #153: MS-DOS batch file (.bat; batfile DefaultIcon shell32.dll,-153).
	"system.files.script": { src: "shell32-153-32", small: "shell32-153-16" },
	// sndrec32.exe #15: Wave sound document (.wav; SoundRec DefaultIcon sndrec32.exe,1).
	"system.files.sound": { src: "sndrec32-15-32", small: "sndrec32-15-16" },
	// shell32.dll #37: Program group folder (Start menu folders).
	"system.folders.appleMenuItem": {
		src: "shell32-37-32",
		small: "shell32-37-16",
	},
	// shell32.dll #137: Control Panel folder.
	"system.folders.controlPanels": {
		src: "shell32-137-32",
		small: "shell32-137-16",
	},
	// shell32.dll #4: Folder (Folder/Directory DefaultIcon shell32.dll,3).
	"system.folders.directory": { src: "shell32-4-32", small: "shell32-4-16" },
	// shell32.dll #44: Favorites folder.
	"system.folders.favorites": { src: "shell32-44-32", small: "shell32-44-16" },
	// shell32.dll #5: Open folder (Explorer tree, Look in list).
	"system.folders.folderFlip": { src: "shell32-5-32", small: "shell32-5-16" },
	// shell32.dll #38: Printers folder.
	"system.folders.folderPrinters": {
		src: "shell32-38-32",
		small: "shell32-38-16",
	},
	// shell32.dll #39: Fonts folder.
	"system.folders.fonts": { src: "shell32-39-32", small: "shell32-39-16" },
	// shell32.dll #21: Documents (Start menu, recent documents).
	"system.folders.recentDocuments": {
		src: "shell32-21-32",
		small: "shell32-21-16",
	},
	// shell32.dll #156: Font file, TrueType (.ttf; shell32.dll,-156).
	"system.folders.suitcase": { src: "shell32-156-32", small: "shell32-156-16" },
	// shell32.dll #24: Help (Start menu, Windows Help).
	"system.help": { src: "shell32-24-32", small: "shell32-24-16" },
	// user.exe #104: Information (MB_ICONINFORMATION), 32 px; its 16 px image comctl32.dll #20481.
	"system.info": { src: "user-104-32", small: "comctl32-20481-16" },
	// explorer.exe #100: My Computer (CLSID DefaultIcon Explorer.exe,0).
	"system.mac": { src: "explorer-100-32", small: "explorer-100-16" },
	// user.exe #105: Windows logo (IDI_WINLOGO): 32, 22, 16, 14, 12 and 10 px.
	"system.macos": { src: "user-105-32", small: "user-105-16" },
	// password.cpl #1000: Passwords (Control Panel).
	"system.network.crypto": {
		src: "password-1000-32",
		small: "password-1000-16",
	},
	// shell32.dll #14: Entire Network (globe).
	"system.network.globe": { src: "shell32-14-32", small: "shell32-14-16" },
	// wab32.dll #IDI_ICON_ABOOK: Address Book.
	"system.network.ldapDirectory": {
		src: "wab32-IDI_ICON_ABOOK-32",
		small: "wab32-IDI_ICON_ABOOK-16",
	},
	// modem.cpl #1000: Modems (Control Panel).
	"system.network.modem": { src: "modem-1000-32", small: "modem-1000-16" },
	// shell32.dll #18: Network Neighborhood (desktop icon, CLSID DefaultIcon shell32.dll,17).
	"system.network.networkLocal": {
		src: "shell32-18-32",
		small: "shell32-18-16",
	},
	// pifmgr.dll #1: MS-DOS Prompt / MS-DOS program; no 16 px image (Windows scaled the 32 px one).
	"system.network.terminal": { src: "pifmgr-1-32" },
	// inetcpl.cpl #1323: Users (Control Panel).
	"system.network.userDirectory": {
		src: "inetcpl-1323-32",
		small: "inetcpl-1323-16",
	},
	// shell32.dll #17: Printer.
	"system.printer": { src: "shell32-17-32", small: "shell32-17-16" },
	// user.exe #102: Question (MB_ICONQUESTION), 32 px; no 16 px image (Windows scaled the 32 px one).
	"system.question": { src: "user-102-32" },
	// mmsys.cpl #99: Multimedia (Control Panel).
	"system.quicktime.controlPanel": { src: "mmsys-99-32", small: "mmsys-99-16" },
	// quartz.dll #100: Video clip (.avi/.mov, ActiveMovie).
	"system.quicktime.movie": { src: "quartz-100-32", small: "quartz-100-16" },
	// mplayer2.exe #110: Media Player (Start > Programs > Accessories > Entertainment).
	"system.quicktime.player": {
		src: "mplayer2-110-32",
		small: "mplayer2-110-16",
	},
	// shell32.dll #23: Find (Start menu); Find Files or Folders.
	"system.sherlock.sherlock": { src: "shell32-23-32", small: "shell32-23-16" },
	// user.exe #101: Exclamation (MB_ICONEXCLAMATION), 32 px; its 16 px image comctl32.dll #20482.
	"system.warn": { src: "user-101-32", small: "comctl32-20482-16" },
	// user.exe #105: Windows logo (IDI_WINLOGO): 32, 22, 16, 14, 12 and 10 px.
	"system.windows": { src: "user-105-32", small: "user-105-16" },
};

/** Key → the key in `WINDOWS98_ICON_FILES` whose image it shows. */
export const WINDOWS98_ICON_REUSE: Readonly<Record<string, string>> = {
	// a home-page bookmark's icon: an HTML document.
	"applications.internetExplorer.apple":
		"applications.internetExplorer.document",
	"applications.internetExplorer.clipboard": "system.files.document",
	"applications.internetExplorer.compass":
		"applications.internetExplorer.favorites",
	"applications.internetExplorer.documentDownload":
		"applications.internetExplorer.document",
	"applications.internetExplorer.documentFolder":
		"applications.internetExplorer.document",
	"applications.internetExplorer.documentMoveToFolder":
		"applications.internetExplorer.document",
	"applications.internetExplorer.documentNews":
		"applications.internetExplorer.document",
	"applications.internetExplorer.documentShortcut":
		"applications.internetExplorer.documentLink",
	"applications.internetExplorer.documentShortcutEdit":
		"applications.internetExplorer.documentLink",
	"applications.internetExplorer.documentSound": "system.files.sound",
	"applications.internetExplorer.documentWarn":
		"applications.internetExplorer.document",
	"applications.internetExplorer.documentWarning":
		"applications.internetExplorer.document",
	// the core draws it with the favorites image.
	"applications.internetExplorer.favoritesOn":
		"applications.internetExplorer.favorites",
	"applications.internetExplorer.find": "system.sherlock.sherlock",
	// Web Viewer's app icon reads this key: IE's icon.
	"applications.internetExplorer.globe": "applications.internetExplorer.app",
	"applications.internetExplorer.logo": "applications.internetExplorer.app",
	// Outlook Express read news too.
	"applications.internetExplorer.news": "applications.internetExplorer.mailbox",
	// Windows 98 had no Stickies.
	"applications.stickies.app": "system.files.application",
	"applications.stickies.notes": "system.files.document",
	"applications.stickies.stack": "system.files.document",
	// no StuffIt on Windows 98.
	"applications.stuffit.app": "system.files.application",
	"applications.stuffit.compressing": "system.files.application",
	"applications.stuffit.file": "system.files.document",
	"controlPanels.appearanceManager.preferences": "system.files.preferences",
	"controlPanels.soundManager.extension": "system.extension",
	"controlPanels.soundManager.preferences": "system.files.preferences",
	// the OS emblem: the Windows logo.
	"system.appleBlackOnWhite": "system.windows",
	"system.appleWhiteOnBlack": "system.windows",
	// the Clipboard Viewer's .clp icon is not in the sources' extracted set; a document.
	"system.clipboard": "system.files.document",
	"system.colors.extension": "system.extension",
	"system.controlStrip.appearance": "controlPanels.appearanceManager.app",
	"system.controlStrip.cd": "system.drives.cdrom",
	"system.controlStrip.fileSharing": "system.network.networkLocal",
	// a Control Strip module file: a system file.
	"system.controlStrip.moduleFile": "system.extension",
	"system.controlStrip.screenSaver": "system.extensions.screensaver",
	// Windows 98 drew a DVD drive as a CD-ROM drive.
	"system.drives.dvd": "system.drives.cdrom",
	"system.drives.dvdAudio": "system.drives.cdrom",
	"system.drives.dvdVideo": "system.drives.cdrom",
	"system.drives.floppyMac": "system.drives.floppy",
	"system.drives.internetDrive": "system.drives.networkDrive",
	"system.drives.raid": "system.drives.disk",
	"system.drives.rom": "system.drives.disk",
	// Windows Help.
	"system.extensions.appleGuide": "system.help",
	"system.extensions.appleShare": "system.network.networkLocal",
	// a display.
	"system.extensions.appleVision": "controlPanels.appearanceManager.app",
	"system.extensions.contextMenus": "system.extension",
	"system.extensions.dateAndTime":
		"controlPanels.dateTimeManager.dateTimeManager",
	"system.extensions.ethernet": "system.network.networkLocal",
	"system.extensions.fmRadio": "system.extension",
	"system.extensions.quickdraw": "system.extension",
	"system.extensions.quicktimeMpeg": "system.extension",
	"system.extensions.soundManager": "controlPanels.soundManager.app",
	"system.files._1292": "system.files.document",
	"system.files._1294": "system.files.document",
	"system.files.edition": "system.files.document",
	// Windows drew hidden files with their own icon.
	"system.files.fileInvisible": "system.files.file",
	"system.files.filePc": "system.files.file",
	"system.files.internationalization": "system.files.document",
	"system.files.note": "system.files.fileText",
	"system.files.settingsSync": "system.files.document",
	"system.files.slideshow": "system.files.document",
	"system.files.stationaryBlack": "system.files.document",
	// Windows drew its system folders (Windows, System, …) as plain folders.
	"system.folders.applicationSupport": "system.folders.directory",
	// Programs: a program group folder.
	"system.folders.applications": "system.folders.appleMenuItem",
	// Windows drew its system folders (Windows, System, …) as plain folders.
	"system.folders.assistant": "system.folders.directory",
	"system.folders.colorsyncProfiles": "system.folders.directory",
	"system.folders.compressed": "system.folders.directory",
	"system.folders.contextualMenuItems": "system.folders.directory",
	"system.folders.controlStrip": "system.folders.directory",
	"system.folders.extensions": "system.folders.directory",
	"system.folders.extras": "system.folders.directory",
	"system.folders.folderApple": "system.folders.appleMenuItem",
	"system.folders.folderExtensions": "system.folders.directory",
	"system.folders.folderFonts": "system.folders.fonts",
	"system.folders.folderLdap": "system.folders.directory",
	"system.folders.folderPreferences": "system.folders.directory",
	"system.folders.folderSystem": "system.folders.directory",
	"system.folders.folderSystemProtected": "system.folders.directory",
	"system.folders.help": "system.folders.directory",
	"system.folders.internet": "system.folders.directory",
	"system.folders.internetSearchSites": "system.folders.directory",
	"system.folders.languageAndRegion": "system.folders.directory",
	"system.folders.preferences": "system.folders.directory",
	"system.folders.scripts": "system.folders.directory",
	// StartUp: a program group.
	"system.folders.startupItems": "system.folders.appleMenuItem",
	"system.folders.suitcaseSystem": "system.folders.suitcase",
	"system.folders.suitecaseSystem": "system.folders.suitcase",
	// Windows drew its system folders (Windows, System, …) as plain folders.
	"system.folders.system": "system.folders.directory",
	"system.folders.textEncodings": "system.folders.directory",
	// Accessories / System Tools: program groups.
	"system.folders.utilities": "system.folders.appleMenuItem",
	// Windows 98's "The Internet" desktop icon was IE's.
	"system.internet": "applications.internetExplorer.app",
	"system.macClassic": "system.mac",
	"system.macWink": "system.mac",
	"system.macosSvg": "system.macos",
	// Windows chose printers in the Printers folder.
	"system.network.chooser": "system.folders.folderPrinters",
	"system.network.controlpanelInternet":
		"applications.internetExplorer.preferences",
	"system.network.fileServer": "system.drives.networkDrive",
	"system.network.globeAnimated": "system.network.globe",
	"system.network.internet": "applications.internetExplorer.app",
	"system.network.internetConfig": "applications.internetExplorer.preferences",
	"system.network.internetServices": "system.network.globe",
	// Entire Network.
	"system.network.networkPublic": "system.network.globe",
	"system.quicktime.extension": "system.extensions.quicktime",
	"system.quicktime.movieStationary": "system.quicktime.movie",
	"system.security.id": "system.network.userDirectory",
	"system.security.key": "system.network.crypto",
	"system.sherlock.search": "system.sherlock.sherlock",
	"system.sherlock.searchData": "system.sherlock.sherlock",
	"system.sherlock.searchFiles": "system.sherlock.sherlock",
	"system.systemResources": "system.extension",
};

/**
 * The package's own icons, under its own `windows98` namespace (no core
 * key): images the package draws for a surface whose icon is not a core
 * key's, registered as `{ src, small }` leaves so each draws its 16 px
 * image wherever it is drawn small.
 */
export const WINDOWS98_OWN_ICON_FILES: Readonly<
	Record<string, Windows98IconFiles>
> = {
	// explorer.exe #101: Windows Explorer, the Finder's icon (the package's `apps` override).
	"windows98.explorer": { src: "explorer-101-32", small: "explorer-101-16" },
	// shell32.dll #32: the Recycle Bin, empty (the `trashEmpty` art).
	"windows98.recycleBinEmpty": { src: "shell32-32-32", small: "shell32-32-16" },
	// shell32.dll #33: the Recycle Bin, full (the `trashFull` art).
	"windows98.recycleBinFull": { src: "shell32-33-32", small: "shell32-33-16" },
};
