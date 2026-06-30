import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

const diskIcon = ClassicyIcons.system.drives.disk;
const directoryIcon = ClassicyIcons.system.folders.directory;
const macIcon = ClassicyIcons.system.mac;
const documentIcon = ClassicyIcons.system.files.document;

export const DefaultFSContent = {
	"Macintosh HD": {
		_type: ClassicyFileSystemEntryFileType.Drive,
		_icon: diskIcon,
		Applications: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			_icon: directoryIcon,
			SimpleText: {
				_type: ClassicyFileSystemEntryFileType.File,
				_mimeType: "text/plain",
				_data: "File Contents",
				_invisible: true,
			},
			Calculator: {
				_type: ClassicyFileSystemEntryFileType.File,
				_mimeType: "text/plain",
				_data: "File Contents",
				_invisible: true,
			},
		},
		Library: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			_icon: directoryIcon,
			Extensions: {
				_type: ClassicyFileSystemEntryFileType.File,
				_icon: macIcon,
				_mimeType: "text/plain",
				_data: "File Contents",
			},
		},
		"System Folder": {
			_type: ClassicyFileSystemEntryFileType.Directory,
			_icon: directoryIcon,
			Finder: {
				_type: ClassicyFileSystemEntryFileType.File,
				_mimeType: "text/plain",
				_data: "File Contents",
			},
			System: {
				_type: ClassicyFileSystemEntryFileType.File,
				_mimeType: "text/plain",
				_data: "File Contents",
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
			"Release Notes.md": {
				_type: ClassicyFileSystemEntryFileType.Markdown,
				_mimeType: "text/markdown",
				_data:
					"# Release Notes\n\n## v0.6\n\n- **New:** File type registration for apps\n- **New:** SimpleText opens text and markdown files\n- *Improved* desktop state persistence\n",
			},
			"Sample.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_mimeType: "application/pdf",
				_icon: documentIcon,
				_data:
					"https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
			},
			"Sample 2.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_mimeType: "application/pdf",
				_icon: documentIcon,
				_data:
					"https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
			},
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
		Utilities: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			_icon: directoryIcon,
			"Disk Utility.app": {
				_type: ClassicyFileSystemEntryFileType.File,
				_mimeType: "text/plain",
				_data: "File Contents",
			},
			"Terminal.app": {
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
