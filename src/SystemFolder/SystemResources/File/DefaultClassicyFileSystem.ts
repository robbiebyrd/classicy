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
				_url:
					"https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
			},
			"Sample 2.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_mimeType: "application/pdf",
				_icon: documentIcon,
				_url:
					"https://raw.githubusercontent.com/mozilla/pdf.js/master/test/pdfs/hello_world_rotated.pdf",
			},
			"Sample 3.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_mimeType: "application/pdf",
				_icon: documentIcon,
				_data: "H4sIAAAAAAAAA21R0U7CMBR931ccH0g0Udtu3dCE8MCEkKiRwN4ID4VdcGS2Zi0G_HrTbRHibJrm9txzzz237c2eJnfiXgYCHGa9DwYDsOz0SWCpcqo0O7CZ2pFFCI45hsOAdO6JYaeg4bHnIrdYRp6-AkvNQTsIsFfKCzUyRyw5OCLOIaRcXQhG_wr6syLt2v5sTtYcqg1ZeN7EaNcEAnFr0G-WGu1IOwv5x7a86PJCeufeIROft64i9RGMsloslMi2CDkSjizH9ZTK0twiLZW1xeZ0dYNsj3HmVdvCVj_uTFF7ZIvD2tVXDwqwkbLUZKZUfpErNurC5bGibcCRBPx3IYnjKMYWZ-wRTUafsfihg4moywul6GBR1D9jrlJFSVU9xqL4JiRgc2P8T7bvaZ2qXO1T8n7Q643fJj-sv2hkTQIAAA",
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
