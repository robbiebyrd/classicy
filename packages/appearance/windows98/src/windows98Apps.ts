import type {
	ClassicyAppIdentityOverride,
	ClassicyDesktopIconOverrides,
} from "@classicy/classicy";
import { windows98IconFile } from "./assets/windows98Assets";

// What Windows 98 called Classicy's surfaces (docs/windows98-asset-
// inventory.md, "Apps" and "Desktop icons"): display only. The apps keep
// their ids, action types, saved state and analytics, and the Trash and the
// startup disk their records and paths; only the names, icons and balloon
// copy shown change, while Windows 98 is the active package.

/**
 * The bundled apps by the names Windows 98 gave the same job (its Control
 * Panel's, Start menu's and Setup's strings), with the descriptions its
 * Control Panel and Setup gave them where they had one (Calculator, Sounds,
 * Date/Time, Screen Saver, Internet Explorer), else written in the same
 * voice. Every app's own icon key already draws Windows 98's image for it
 * (assets/windows98Icons.ts), so only the Finder, whose icon is the OS
 * emblem's key, names an icon: Windows Explorer's (explorer.exe #101). The
 * PDF viewer, HyperCard and Drive Setup had no Windows 98 counterpart and
 * keep their names, with verb-first descriptions of their own.
 */
export const WINDOWS98_APPS: Readonly<
	Record<string, ClassicyAppIdentityOverride>
> = {
	"Finder.app": {
		name: "Windows Explorer",
		icon: windows98IconFile("explorer-101-32"),
		description:
			"Shows the files and folders on your computer, and opens them.",
	},
	"SimpleText.app": {
		name: "Notepad",
		description: "Creates and edits text files.",
	},
	"Calculator.app": {
		description: "Performs mathematical calculations.",
	},
	"AppearanceManager.app": {
		name: "Display",
		description:
			"Changes the appearance of your desktop: its background, colors, fonts, sounds and theme.",
	},
	"SoundManager.app": {
		name: "Sounds",
		description: "Changes system and program sounds.",
	},
	"DateAndTimeManager.app": {
		name: "Date/Time",
		description: "Changes date, time and time zone information.",
	},
	"ControlStripManager.app": {
		name: "Taskbar & Start Menu",
		description: "Changes the settings of the taskbar and its tray.",
	},
	"ScreenSaverManager.app": {
		description:
			"Displays moving images when your computer is idle to prevent damage to your screen.",
	},
	"ScreenSaver.app": {
		description:
			"Displays moving images when your computer is idle to prevent damage to your screen.",
	},
	"AppleGuide.app": {
		name: "Windows Help",
		description: "Opens Help, where you can look up how to do a task.",
	},
	"MoviePlayer.app": {
		name: "Media Player",
		description: "Plays audio, video and animation files.",
	},
	"PictureViewer.app": {
		name: "Imaging",
		description: "Opens, views and prints pictures.",
	},
	"WebViewer.app": {
		name: "Internet Explorer",
		description:
			"Displays pages on the World Wide Web or your corporate intranet, or connects you to the Internet.",
	},
	// Apps Windows 98 had no counterpart for keep their names, but their
	// tips start with a verb, in common terms, as Windows' own did (WIG
	// Ch.12 "Guidelines for Writing Context-Sensitive Help", p.275).
	"PDFViewer.app": {
		description:
			"Opens PDF documents, and lets you zoom and scroll their pages.",
	},
	"HyperCard.app": {
		description: "Opens, plays and edits HyperCard stacks.",
	},
	"DriveSetup.app": {
		description: "Initializes the startup disk or syncs it with its backend.",
	},
};

/**
 * The desktop's own icons as Windows 98 showed them: the Trash is the Recycle
 * Bin (its art is the package's `trashEmpty`/`trashFull`, the Recycle Bin's),
 * and the startup disk My Computer, with My Computer's icon (explorer.exe
 * #100): Windows 98 put no drive on its desktop, only My Computer, its way
 * to the disks. The Recycle Bin's and My Computer's tips are Windows 98's own
 * InfoTips (`RECYCLEBIN_IT` and `MYCOMPUTER_IT`, in the setup INF
 * `shell32.dll` carries).
 */
export const WINDOWS98_DESKTOP_ICONS: Readonly<ClassicyDesktopIconOverrides> = {
	trash: {
		name: "Recycle Bin",
		description:
			"Contains deleted items you can permanently remove or restore.",
	},
	startupDisk: {
		name: "My Computer",
		icon: windows98IconFile("explorer-100-32"),
		description: "Displays the contents of your computer.",
	},
	// Every other drive's tip (the startup disk is My Computer). Windows 98
	// put no drive on its desktop and gave a drive no tip (neither shell32,
	// shdoc401 nor shdocvw holds one, nor any InfoTip the CD's INF files
	// write), so it is written in the voice of the others (WIG Ch.12 p.275).
	drive: {
		description: "Shows the files and folders on this disk.",
	},
};
