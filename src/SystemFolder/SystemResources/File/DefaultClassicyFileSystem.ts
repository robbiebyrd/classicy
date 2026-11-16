import "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { CLASSICY_SEEDED_PLACEHOLDER } from "@/SystemFolder/SystemResources/File/ClassicyDerivedFolderPlaceholders.internal";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyFileSystemSeedMigration } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemSeedMigrations";
import { OREGON_TRAIL_STACK_DATA } from "@/SystemFolder/SystemResources/File/DefaultClassicyOregonTrailStack.internal";

// Platinum icons are registered by the ClassicyIcons import above
const platinumIcon = (path: string): string =>
	resolveClassicyAsset("icons", path) ?? "";

const diskIcon = platinumIcon("system.drives.disk");
const directoryIcon = platinumIcon("system.folders.directory");
const extensionsFolderIcon = platinumIcon("system.folders.extensions");

// No `_icon`, like a stack saved from HyperCard: the browser draws the
// active package's icon for its type (iconImageByType).
const oregonTrailStack = {
	_type: ClassicyFileSystemEntryFileType.Stack,
	_mimeType: "application/json",
	_data: OREGON_TRAIL_STACK_DATA,
};

export const DefaultFSContent = {
	"Macintosh HD": {
		_type: ClassicyFileSystemEntryFileType.Drive,
		_icon: diskIcon,
		Applications: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			_icon: directoryIcon,
			// Invisible stand-ins that give way to the real apps of the same
			// name in the derived Applications folder while untouched
			// (`_placeholder`). Copies, so an edit to a live one never changes
			// the frozen seed. Trees stored before the marker are recognized by
			// their exact shape (ClassicyDerivedFolderPlaceholders.internal.ts).
			SimpleText: { ...CLASSICY_SEEDED_PLACEHOLDER },
			Calculator: { ...CLASSICY_SEEDED_PLACEHOLDER },
		},
		"System Folder": {
			_type: ClassicyFileSystemEntryFileType.Directory,
			_icon: directoryIcon,
			Finder: {
				_type: ClassicyFileSystemEntryFileType.File,
				_mimeType: "text/plain",
				_data: "File Contents",
				_system: true,
			},
			System: {
				_type: ClassicyFileSystemEntryFileType.File,
				_mimeType: "text/plain",
				_data: "File Contents",
				_system: true,
			},
			Extensions: {
				_type: ClassicyFileSystemEntryFileType.Directory,
				_icon: extensionsFolderIcon,
			},
		},
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			_icon: directoryIcon,
			"Read Me.txt": {
				_type: ClassicyFileSystemEntryFileType.TextFile,
				_mimeType: "text/plain",
				_data:
					"Welcome to Classicy!\n\nThis is a plain text file opened in SimpleText.",
			},
			"The Oregon Trail.stack": oregonTrailStack,
		},
		Users: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			_icon: directoryIcon,
			Guest: {
				_type: ClassicyFileSystemEntryFileType.File,
				_mimeType: "text/plain",
				_data: "File Contents",
			},
			Shared: {
				_type: ClassicyFileSystemEntryFileType.File,
				_mimeType: "text/plain",
				_data: "File Contents",
			},
		},
		Videos: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			_icon: directoryIcon,
			"BuckBunny.mov": {
				_type: ClassicyFileSystemEntryFileType.File,
				_creator: "QuickTime",
				_format: "Video",
				_mimeType: "text/plain",
				_data: JSON.stringify({
					url: "https://cdn1.911realtime.org/transcoded/newsw/2001-09-11/NEWSW_20010911_040000_The_National.m3u8",
					name: "Buck Bunny",
					options: {
						forceHLS: true,
						forceSafariHLS: false,
					},
					type: "video",
				}),
			},
			"Monkees.mp3": {
				_type: ClassicyFileSystemEntryFileType.File,
				_creator: "QuickTime",
				_format: "Audio",
				_mimeType: "text/plain",
				_data: JSON.stringify({
					url: "http://www.samisite.com/sound/cropShadesofGrayMonkees.mp3",
					name: "Monkees",
					type: "audio",
					subtitlesUrl: `/test.srt`,
				}),
			},
		},
	},
};

/**
 * The core's seed migrations: they bring a returning visitor's stored tree up
 * to date with `DefaultFSContent`. The file system hooks run them ahead of a
 * host's `defaultFileSystemSeedMigrations`, unless the host's tree replaces
 * the core's (`defaultFileSystemMode="exclusive"`). Each has its own `id`, so
 * it runs once per storage key; ids are never reused.
 *
 * November 2026: Documents swapped its Release Notes and three sample PDFs
 * for The Oregon Trail. Each delete is guarded on the old seed's exact
 * content, so a file the visitor replaced under the same name is kept.
 */
export const DefaultFSSeedMigrations: readonly ClassicyFileSystemSeedMigration[] =
	[
		{
			id: "classicy:2026-11:documents:release-notes",
			op: "delete",
			path: "Macintosh HD:Documents:Release Notes.md",
			ifData:
				"# Release Notes\n\n## v0.6\n\n- **New:** File type registration for apps\n- **New:** SimpleText opens text and markdown files\n- *Improved* desktop state persistence\n",
		},
		{
			id: "classicy:2026-11:documents:sample-pdf",
			op: "delete",
			path: "Macintosh HD:Documents:Sample.pdf",
			ifUrl:
				"https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
		},
		{
			id: "classicy:2026-11:documents:sample-2-pdf",
			op: "delete",
			path: "Macintosh HD:Documents:Sample 2.pdf",
			ifUrl:
				"https://raw.githubusercontent.com/mozilla/pdf.js/master/test/pdfs/hello_world_rotated.pdf",
		},
		{
			id: "classicy:2026-11:documents:sample-3-pdf",
			op: "delete",
			path: "Macintosh HD:Documents:Sample 3.pdf",
			ifData:
				"H4sIAAAAAAAAA21R0U7CMBR931ccH0g0Udtu3dCE8MCEkKiRwN4ID4VdcGS2Zi0G_HrTbRHibJrm9txzzz237c2eJnfiXgYCHGa9DwYDsOz0SWCpcqo0O7CZ2pFFCI45hsOAdO6JYaeg4bHnIrdYRp6-AkvNQTsIsFfKCzUyRyw5OCLOIaRcXQhG_wr6syLt2v5sTtYcqg1ZeN7EaNcEAnFr0G-WGu1IOwv5x7a86PJCeufeIROft64i9RGMsloslMi2CDkSjizH9ZTK0twiLZW1xeZ0dYNsj3HmVdvCVj_uTFF7ZIvD2tVXDwqwkbLUZKZUfpErNurC5bGibcCRBPx3IYnjKMYWZ-wRTUafsfihg4moywul6GBR1D9jrlJFSVU9xqL4JiRgc2P8T7bvaZ2qXO1T8n7Q643fJj-sv2hkTQIAAA",
		},
		{
			id: "classicy:2026-11:documents:oregon-trail",
			op: "add",
			path: "Macintosh HD:Documents:The Oregon Trail.stack",
			entry: oregonTrailStack as unknown as ClassicyFileSystemEntry,
		},
	];
