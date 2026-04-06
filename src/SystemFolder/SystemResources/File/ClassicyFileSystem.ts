import { sha512 } from "sha512-crypt-ts";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
	type ClassicyFileSystemEntryMetadata,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { isValidFileSystemEntry } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemValidation";
import { DefaultFSContent } from "@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem";

import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
const directoryIcon = ClassicyIcons.system.folders.directory;


export type ClassicyPathOrFileSystemEntry = string | ClassicyFileSystemEntry;

export class ClassicyFileSystem {
	storageKey: string;
	fs: ClassicyFileSystemEntry;
	separator: string;

	constructor(
		storageKey: string = "classicyStorage",
		// biome-ignore lint/suspicious/noExplicitAny: DefaultFSContent doesn't conform to ClassicyFileSystemEntry at root level
		defaultFS: any = DefaultFSContent,
		separator: string = ":",
	) {
		this.storageKey = storageKey;
		this.fs = defaultFS;

		const retrieved =
			typeof window !== "undefined"
				? localStorage.getItem(this.storageKey)
				: null;
		if (typeof window !== "undefined" && retrieved) {
			try {
				const parsed = JSON.parse(retrieved);
				if (isValidFileSystemEntry(parsed)) {
					this.fs = parsed;
				} else {
					console.warn(
						"[ClassicyFileSystem] localStorage data failed validation, using defaults",
					);
				}
			} catch (e) {
				console.error("Failed to parse localStorage data, using defaults:", e);
			}
		}

		this.separator = separator;
		try {
			localStorage.setItem(this.storageKey, this.snapshot());
		} catch (error) {
			console.error(
				"[ClassicyFileSystem] Failed to persist initial filesystem to localStorage.",
				error,
			);
		}
	}

	load(data: string) {
		try {
			const parsed = JSON.parse(data) as ClassicyFileSystemEntry;
			this.fs = parsed;
		} catch (error) {
			console.error(
				"[ClassicyFileSystem] Failed to parse data in load()",
				error,
			);
			throw error;
		}
	}

	snapshot(): string {
		return JSON.stringify(this.fs, null, 2);
	}

	pathArray = (path: string) => {
		return [...path.split(this.separator)].filter((v) => v !== "");
	};

	resolve(path: string): ClassicyFileSystemEntry {
		return this.pathArray(path).reduce((prev, curr) => prev?.[curr], this.fs);
	}

	formatSize(
		bytes: number,
		measure: "bits" | "bytes" = "bytes",
		decimals: number = 2,
	): string {
		if (!+bytes) {
			return `0 ${measure}`;
		}
		const sizes =
			measure === "bits"
				? ["Bits", "Kb", "Mb", "Gb", "Tb", "Pb", "Eb", "Zb", "Yb"]
				: ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		bytes = measure === "bits" ? bytes * 8 : bytes;

		return `${parseFloat((bytes / 1024 ** i).toFixed(Math.max(0, decimals)))} ${sizes[i]}`;
	}

	filterMetadata(
		content: ClassicyFileSystemEntry,
		mode: "only" | "remove" = "remove",
	) {
		const items = {} as ClassicyFileSystemEntry;

		Object.entries(content).forEach(([key, value]) => {
			switch (mode) {
				case "only": {
					if (key.startsWith("_")) {
						items[key] = value;
					}
					break;
				}
				default: {
					if (!key.startsWith("_")) {
						items[key] = value;
					}
					break;
				}
			}
		});
		return items;
	}

	filterByType(
		path: string,
		byType: string | string[] = ["file", "directory"],
		showInvisible: boolean = true,
	): ClassicyFileSystemEntry {
		const filteredItems = {} as ClassicyFileSystemEntry;
		if (!this.resolve(path)) return filteredItems;
		Object.entries(this.resolve(path)).forEach(([b, a]) => {
			if (a._invisible === true && !showInvisible) {
				return;
			}
			if (byType.includes(a._type)) {
				filteredItems[b] = a;
			}
		});
		return filteredItems;
	}

	statFile(path: string): ClassicyFileSystemEntry | undefined {
		const item = this.resolve(path);
		if (!item) return undefined;
		item._size = this.size(path);
		return item;
	}

	size(path: ClassicyPathOrFileSystemEntry): number {
		if (typeof path === "string") {
			const contents = this.readFile(path);
			if (contents !== undefined) {
				return new Blob(contents.split("")).size;
			}
		} else if ("_data" in path) {
			return new Blob((path._data as string).split("")).size;
		}

		return -1;
	}

	hash(path: ClassicyPathOrFileSystemEntry): string | undefined {
		if (typeof path === "string") {
			const contents = this.readFile(path);
			if (contents === undefined) {
				return;
			}
			return sha512.crypt(contents, "");
		}

		if ("_data" in path) {
			return sha512.crypt(String(path._data), "");
		}
		return;
	}

	readFile(path: ClassicyPathOrFileSystemEntry): string | undefined {
		if (typeof path === "string") {
			const item: ClassicyFileSystemEntry = this.resolve(path);
			return this.readFile(item);
		}

		if ("_data" in path) {
			return path._data as string;
		}

		return;
	}

	writeFile(
		path: string,
		data: string,
		_metaData?: ClassicyFileSystemEntryMetadata,
	) {
		const updateObjProp = (
			obj: Record<string, unknown>,
			value: string,
			propPath: string,
		) => {
			const [head, ...rest] = propPath.split(":");

			// Prevent prototype pollution via special property names
			if (
				head === "__proto__" ||
				head === "constructor" ||
				head === "prototype"
			) {
				// Abort the write to avoid mutating Object.prototype
				return;
			}

			if (rest.length) {
				updateObjProp(
					obj[head] as Record<string, unknown>,
					value,
					rest.join(":"),
				);
			} else {
				obj[head] = value;
			}
		};

		const directoryPath = path.split(":");
		if (!this.resolve(directoryPath.join(":"))) {
			this.mkDir(directoryPath.join(":"));
		}

		return updateObjProp(this.fs, data, path);
	}

	rmDir(path: string) {
		return this.deletePropertyPath(this.fs, path);
	}

	mkDir(path: string) {
		const parts: string[] = this.pathArray(path);

		const newDirectoryObject = () => {
			return {
				_type: "directory",
				_icon: directoryIcon,
			} as ClassicyFileSystemEntry;
		};

		let current = {} as ClassicyFileSystemEntry;
		let reference: ClassicyFileSystemEntry;

		for (let i = parts.length - 1; i >= 0; i--) {
			reference = current;
			current =
				i === 0 ? ({} as ClassicyFileSystemEntry) : newDirectoryObject();
			current[parts[i]] =
				i === parts.length - 1 ? newDirectoryObject() : reference;
		}

		this.fs = this.deepMerge(current, this.fs);
	}

	calculateSizeDir(path: ClassicyPathOrFileSystemEntry | string): number {
		const gatherSizes = (
			entry: ClassicyFileSystemEntry,
			field: string,
			value: string,
		): string[] => {
			let results: string[] = [];
			for (const key of Object.keys(entry)) {
				if (key === field && entry[key] === value) {
					results.push(String(this.size(entry)));
				} else if (typeof entry[key] === "object" && entry[key] !== null) {
					results = results.concat(
						gatherSizes(entry[key] as ClassicyFileSystemEntry, field, value),
					);
				}
			}
			return results;
		};

		if (typeof path === "string") {
			path = this.resolve(path);
		}

		return gatherSizes(path, "_type", "file").reduce((a, c) => a + +c, 0);
	}

	countVisibleFiles(path: string): number {
		const resolved = this.resolve(path);
		if (!resolved) return 0;
		const visibleFiles: boolean[] = Object.entries(
			this.filterMetadata(resolved),
		)
			.map(([_, b]) => {
				return !b._invisible;
			})
			.filter((element) => element || undefined);
		return visibleFiles.length;
	}

	countInvisibleFilesInDir(path: string): number {
		const resolved = this.resolve(path);
		if (!resolved) return 0;
		const invisibleFiles: boolean[] = Object.entries(
			this.filterMetadata(resolved),
		)
			.map(([_a, b]) => {
				return b._invisible;
			})
			.filter((element) => element === true);
		return invisibleFiles.length;
	}

	statDir(path: string): ClassicyFileSystemEntry | undefined {
		const current: ClassicyFileSystemEntry = this.resolve(path);
		if (!current) {
			return;
		}
		const metaData = this.filterMetadata(current, "only");

		const name = path.split(this.separator).slice(-1);

		const returnValue: ClassicyFileSystemEntry = {
			_count: this.countVisibleFiles(path),
			_countHidden: this.countInvisibleFilesInDir(path),
			_name: name[0],
			_path: path,
			_size: this.calculateSizeDir(current),
			_type: ClassicyFileSystemEntryFileType.Directory,
		};

		Object.entries(metaData).forEach(([key, value]) => {
			returnValue[key] = value;
		});

		return returnValue;
	}

	private deepMerge(
		source: ClassicyFileSystemEntry,
		target: ClassicyFileSystemEntry,
	): ClassicyFileSystemEntry {
		Object.keys(target).forEach((key) => {
			if (key === "__proto__" || key === "constructor" || key === "prototype")
				return;
			const sourceKeyIsObject = source[key] instanceof Object;
			const targetKeyIsObject = target[key] instanceof Object;

			if (sourceKeyIsObject && targetKeyIsObject) {
				const sourceKeyIsArray = Array.isArray(source[key]);
				const targetKeyIsArray = Array.isArray(target[key]);

				if (sourceKeyIsArray && targetKeyIsArray) {
					source[key] = Array.from(new Set(source[key].concat(target[key])));
				} else if (!sourceKeyIsArray && !targetKeyIsArray) {
					this.deepMerge(source[key], target[key]);
				} else {
					source[key] = target[key];
				}
			} else {
				source[key] = target[key];
			}
		});
		return source;
	}

	private deletePropertyPath(
		fileSystem: ClassicyFileSystemEntry,
		path: string,
	): ClassicyFileSystemEntry | undefined {
		const pathToArray = path.split(":");

		for (let i = 0; i < pathToArray.length - 1; i++) {
			const segment = pathToArray[i];
			if (
				segment === "__proto__" ||
				segment === "constructor" ||
				segment === "prototype"
			) {
				// Avoid traversing into object prototypes
				return;
			}
			fileSystem = fileSystem[segment];
			if (typeof fileSystem === "undefined") {
				return;
			}
		}

		const updatedPath = pathToArray.pop();
		if (
			updatedPath &&
			updatedPath !== "__proto__" &&
			updatedPath !== "constructor" &&
			updatedPath !== "prototype"
		) {
			delete fileSystem[updatedPath];
		}

		return fileSystem;
	}
}
