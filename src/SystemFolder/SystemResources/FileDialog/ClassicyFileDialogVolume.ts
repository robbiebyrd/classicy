import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { iconImageByType } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

export type ClassicyFileDialogEntry = {
	/** Stable identifier within the volume. */
	id: string;
	name: string;
	kind: "folder" | "file";
	/** A ClassicyFileSystemEntryFileType value, or any app-specific string. */
	fileType?: string;
	icon?: string;
	/** Opaque payload handed back to the dialog's caller on selection. */
	meta?: Record<string, unknown>;
};

export type ClassicyFileDialogSaveFile = {
	data: string;
	/** A ClassicyFileSystemEntryFileType value, or any app-specific string. */
	fileType: string;
	icon?: string;
};

export type ClassicyFileDialogVolume = {
	id: string;
	label: string;
	icon?: string;
	/** Lazy listing of one folder; called on expand. */
	list(path: string[]): Promise<ClassicyFileDialogEntry[]>;
	/** Create or replace a file. Absent on read-only volumes. */
	write?(
		path: string[],
		name: string,
		file: ClassicyFileDialogSaveFile,
	): Promise<void>;
	/** Create a folder. Absent on read-only volumes. */
	mkDir?(path: string[], name: string): Promise<void>;
};

const FOLDER_TYPES = new Set<string>([
	ClassicyFileSystemEntryFileType.Drive,
	ClassicyFileSystemEntryFileType.Directory,
]);

function listFsChildren(
	fs: ClassicyFileSystem,
	segments: string[],
): ClassicyFileDialogEntry[] {
	const target =
		segments.length === 0 ? fs.fs : fs.resolve(segments.join(fs.separator));
	if (!target || typeof target !== "object") {
		return [];
	}
	return Object.entries(target)
		.filter(
			([name, value]) =>
				!name.startsWith("_") &&
				value !== null &&
				typeof value === "object" &&
				"_type" in value &&
				!value._invisible,
		)
		.map(([name, value]) => {
			const path = [...segments, name].join(fs.separator);
			return {
				id: path,
				name,
				kind: (FOLDER_TYPES.has(value._type) ? "folder" : "file") as
					| "folder"
					| "file",
				fileType: value._type as string,
				icon: (value._icon as string) ?? iconImageByType(value._type),
				meta: { classicyPath: path },
			};
		})
		.sort((a, b) =>
			a.kind === b.kind
				? a.name.localeCompare(b.name)
				: a.kind === "folder"
					? -1
					: 1,
		);
}

function writeFsFile(
	fs: ClassicyFileSystem,
	segments: string[],
	name: string,
	file: ClassicyFileDialogSaveFile,
) {
	fs.writeFile([...segments, name].join(fs.separator), file.data, {
		_type: file.fileType as ClassicyFileSystemEntryFileType,
		_icon: file.icon ?? iconImageByType(file.fileType),
	});
}

/** The classic Desktop level: all mounted drives, then their contents. */
export function desktopVolume(
	fs: ClassicyFileSystem,
): ClassicyFileDialogVolume {
	return {
		id: "desktop",
		label: "Desktop",
		icon: ClassicyIcons.system.mac,
		list: (path) => Promise.resolve(listFsChildren(fs, path)),
		write: (path, name, file) => {
			writeFsFile(fs, path, name, file);
			return Promise.resolve();
		},
		mkDir: (path, name) => {
			fs.mkDir([...path, name].join(fs.separator));
			return Promise.resolve();
		},
	};
}

/** A single classic drive rooted at its own top level. */
export function fileSystemVolume(
	fs: ClassicyFileSystem,
	drive: string,
): ClassicyFileDialogVolume {
	return {
		id: `fs-${drive}`,
		label: drive,
		icon:
			(fs.resolve(drive)?._icon as string) ?? ClassicyIcons.system.drives.disk,
		list: (path) => Promise.resolve(listFsChildren(fs, [drive, ...path])),
		write: (path, name, file) => {
			writeFsFile(fs, [drive, ...path], name, file);
			return Promise.resolve();
		},
		mkDir: (path, name) => {
			fs.mkDir([drive, ...path, name].join(fs.separator));
			return Promise.resolve();
		},
	};
}
