import type { ReactNode } from "react";

export enum ClassicyFileSystemEntryFileType {
	File = "file",
	Shortcut = "shortcut",
	AppShortcut = "app_shortcut",
	Drive = "drive",
	Directory = "directory",
	TextFile = "text_file",
	Markdown = "markdown",
}

export type ClassicyFileSystemEntryMetadata = {
	// The type of file
	_type: ClassicyFileSystemEntryFileType;
	_mimeType?: string;

	// The Creator and Format are used to determine which application to open the file with.
	_creator?: string;
	_format?: string;

	// Standard fields
	_label?: string;
	_comments?: string;

	// The URL if the file is a 'shortcut' type
	_url?: string;

	// Icon data
	_icon?: string;
	_badge?: ReactNode;

	// Modification data
	_createdOn?: Date;
	_modifiedOn?: Date;
	_versions?: ClassicyFileSystemEntry[];

	// Entry Settings
	_readOnly?: boolean; // The file cannot be modified. It's name can be changed.
	_nameLocked?: boolean; // If true, the name cannot be changed.
	_trashed?: boolean; // If true, this entry is in the trash and will not show, except in the Trash.
	_system?: boolean; // The file is a system file and cannot be modified. It is also marked with an additional icon.
	_invisible?: boolean; // The file is not normally visible, but can be accessed by apps.

	// Folders
	// Used for stat-ing directories
	_count?: number;
	_countHidden?: number;
	_path?: string;

	// Files
	// The contents of the file.
	_data?: unknown;

	// Used for stat-ing directories and files.
	_size?: number;

	// Optional useful field for storing the name.
	_name?: string;
};

export type ClassicyFileSystemEntry = {
	// biome-ignore lint/suspicious/noExplicitAny: Recursive filesystem structure with dynamic keys requires any
	[entry: string]: any;
} & ClassicyFileSystemEntryMetadata;
