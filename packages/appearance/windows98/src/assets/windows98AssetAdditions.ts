import {
	type ClassicyAssetTree,
	type ClassicyCursorLeaf,
	type ClassicyCursorRole,
	type ClassicyIconLeaf,
	registerClassicyAssets,
	registerClassicyCursors,
} from "@classicy/classicy";
import notAllowedCursor from "./cursors/user-cursor-110.png";
import appStartingCursor from "./cursors/user-cursor-111.png";
import { windows98IconFile } from "./windows98Assets";
import type { Windows98IconFiles } from "./windows98Icons";

// What the Windows 98 package registers beside `windows98Assets.ts`
// (docs/windows98-asset-inventory.md, "Document icons by type" and
// "Cursors"): the document icons of the file types Windows 98 registered a
// handler's icon for, and USER.EXE's Unavailable and Working in Background
// pointers. Every file is read from the Windows 98 Second Edition CD, as the
// rest of the package's art is.

const WINDOWS98 = "windows98";

/**
 * The document icon Windows 98 drew for each Classicy file type it had one
 * for (WIG Ch.10 "Registering Icons", p.200, Figure 10.1: a registered
 * type's icon, derived from its application's), by type
 * (`ClassicyFileSystemEntryFileType`), registered as
 * `system.files.byType.<type>`, which `iconImageByType` reads before the
 * generic `system.files.file`:
 *
 * - `text_file`: the text document, shell32.dll #152 (`txtfile`'s
 *   DefaultIcon, `shell32.dll,-152`: shell.inf), the page Notepad opened.
 * - `image`: Imaging's document, kodakimg.exe #129 (`Imaging.Document`'s
 *   DefaultIcon, `KodakImg.Exe,1`: imagevue.inf), since Picture Viewer is
 *   Imaging under Windows 98.
 * - `video`: the video clip, quartz.dll #100, and `audio`: the sound clip,
 *   quartz.dll #200 (the `.avi` and `.wav` `MediaType.Icon`s Media Player
 *   registered, `quartz.dll,-100` and `-200`: amovie.inf), since the Movie
 *   Player is Media Player under Windows 98. Windows 98 SE's older
 *   `avifile` DefaultIcon names `mplayer.exe`, which the CD does not hold.
 *
 * Markdown, PDF and HyperCard stacks had no Windows 98 handler, so they keep
 * the generic page (shell32.dll #1), as an unregistered type did.
 */
export const WINDOWS98_FILE_TYPE_ICON_FILES: Readonly<
	Record<string, Windows98IconFiles>
> = {
	text_file: { src: "shell32-152-32", small: "shell32-152-16" },
	image: { src: "kodakimg-129-32", small: "kodakimg-129-16" },
	video: { src: "quartz-100-32", small: "quartz-100-16" },
	audio: { src: "quartz-200-32", small: "quartz-200-16" },
};

const iconLeaf = ({ src, small }: Windows98IconFiles): ClassicyIconLeaf =>
	small
		? { src: windows98IconFile(src), small: windows98IconFile(small) }
		: { src: windows98IconFile(src) };

const byType: ClassicyAssetTree = {};
for (const [type, files] of Object.entries(WINDOWS98_FILE_TYPE_ICON_FILES))
	byType[type] = iconLeaf(files);

// Deep-merged into the icon tree `windows98Assets.ts` registered.
registerClassicyAssets("icons", WINDOWS98, {
	system: { files: { byType } },
});

/**
 * USER.EXE's Unavailable (cursor 110, the slashed circle; IDC_NO) and Working
 * in Background (cursor 111, the arrow with a small hourglass;
 * IDC_APPSTARTING) pointers (WIG Ch.4 "Mouse Pointers", Table 4.1), each at
 * the hotspot its resource declares, converted as the package's other
 * cursors were: the drag feedback's refused drop
 * (`data-classicy-drop="none"`, `_Desktop.scss`) and a PDF loading behind
 * its window (`_PDFViewer.scss`) read them.
 */
export const WINDOWS98_CURSOR_ADDITIONS: Readonly<
	Record<
		Extract<ClassicyCursorRole, "notAllowed" | "appStarting">,
		ClassicyCursorLeaf
	>
> = {
	notAllowed: { src: notAllowedCursor, hotspot: [15, 15] },
	appStarting: { src: appStartingCursor, hotspot: [0, 0] },
};

registerClassicyCursors(WINDOWS98, WINDOWS98_CURSOR_ADDITIONS);
