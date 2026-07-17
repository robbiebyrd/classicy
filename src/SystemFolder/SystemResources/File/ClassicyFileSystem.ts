import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	type ClassicyFileSystemEntry,
	ClassicyFileSystemEntryFileType,
	type ClassicyFileSystemEntryMetadata,
	type ClassicyFileSystemTree,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { isValidFileSystemEntry } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemValidation";
import { DefaultFSContent } from "@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem";
import { decompressFromBase64 } from "@/SystemFolder/SystemResources/Utils/base64Compression";
import { deepMergeReplacingArrays } from "@/SystemFolder/SystemResources/Utils/deepMerge";

const directoryIcon = ClassicyIcons.system.folders.directory;

const SUMMABLE_FILE_TYPES = new Set<string>([
	ClassicyFileSystemEntryFileType.File,
	ClassicyFileSystemEntryFileType.TextFile,
	ClassicyFileSystemEntryFileType.Markdown,
	ClassicyFileSystemEntryFileType.Pdf,
	ClassicyFileSystemEntryFileType.Stack,
]);

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
		byType: string | string[] = [
			ClassicyFileSystemEntryFileType.File,
			ClassicyFileSystemEntryFileType.Directory,
			ClassicyFileSystemEntryFileType.TextFile,
			ClassicyFileSystemEntryFileType.Markdown,
			ClassicyFileSystemEntryFileType.Pdf,
			ClassicyFileSystemEntryFileType.Image,
			ClassicyFileSystemEntryFileType.Video,
			ClassicyFileSystemEntryFileType.Audio,
			ClassicyFileSystemEntryFileType.AppShortcut,
			ClassicyFileSystemEntryFileType.Extension,
			ClassicyFileSystemEntryFileType.Stack,
		],
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

	async statFile(path: string): Promise<ClassicyFileSystemEntry | undefined> {
		const item = this.resolve(path);
		if (!item) return undefined;
		item._size = await this.size(path);
		return item;
	}

	async size(path: ClassicyPathOrFileSystemEntry): Promise<number> {
		const entry = typeof path === "string" ? this.resolve(path) : path;

		if (!entry) return -1;

		if ("_data" in entry) {
			try {
				const bytes = await decompressFromBase64(String(entry._data));
				return bytes.byteLength;
			} catch {
				return new Blob(String(entry._data).split("")).size;
			}
		}

		if (typeof entry._size === "number") {
			return entry._size;
		}

		if (typeof entry._url === "string") {
			try {
				const response = await fetch(entry._url, {
					method: "HEAD",
					signal: AbortSignal.timeout(8000),
				});
				const contentLength = response.headers.get("Content-Length");
				if (response.ok && contentLength !== null) {
					const resolvedSize = Number(contentLength);
					if (!Number.isNaN(resolvedSize)) {
						entry._size = resolvedSize;
						return resolvedSize;
					}
				}
			} catch {
				// network error, CORS block, or timeout — fall through to -1, uncached
			}
			return -1;
		}

		if (entry._type === ClassicyFileSystemEntryFileType.Directory) {
			return this.calculateSizeDir(entry);
		}

		return -1;
	}

	hash(path: ClassicyPathOrFileSystemEntry): string | undefined {
		if (typeof path === "string") {
			const contents = this.readFile(path);
			if (contents === undefined) {
				return;
			}
			return bytesToHex(sha256(new TextEncoder().encode(contents)));
		}

		if ("_data" in path) {
			return bytesToHex(sha256(new TextEncoder().encode(String(path._data))));
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

	async calculateSizeDir(
		path: ClassicyPathOrFileSystemEntry | string,
	): Promise<number> {
		const gatherEntries = (
			entry: ClassicyFileSystemEntry,
		): ClassicyFileSystemEntry[] => {
			let results: ClassicyFileSystemEntry[] = [];
			for (const key of Object.keys(entry)) {
				if (key === "_type" && SUMMABLE_FILE_TYPES.has(entry[key])) {
					results.push(entry);
				} else if (typeof entry[key] === "object" && entry[key] !== null) {
					results = results.concat(
						gatherEntries(entry[key] as ClassicyFileSystemEntry),
					);
				}
			}
			return results;
		};

		const resolvedPath = typeof path === "string" ? this.resolve(path) : path;

		const matchingEntries = gatherEntries(resolvedPath);
		const sizes = await Promise.all(
			matchingEntries.map((entry) => this.size(entry)),
		);
		return sizes.reduce(
			(total, entrySize) => (entrySize > 0 ? total + entrySize : total),
			0,
		);
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

	statDirShell(path: string): ClassicyFileSystemEntry | undefined {
		const current: ClassicyFileSystemEntry = this.resolve(path);
		if (!current) {
			return undefined;
		}
		const metaData = this.filterMetadata(current, "only");

		const name = path.split(this.separator).slice(-1);

		const returnValue: ClassicyFileSystemEntry = {
			_count: this.countVisibleFiles(path),
			_countHidden: this.countInvisibleFilesInDir(path),
			_name: name[0],
			_path: path,
			_type: ClassicyFileSystemEntryFileType.Directory,
		};

		Object.entries(metaData).forEach(([key, value]) => {
			returnValue[key] = value;
		});

		return returnValue;
	}

	async statDir(path: string): Promise<ClassicyFileSystemEntry | undefined> {
		const shell = this.statDirShell(path);
		if (!shell) return undefined;
		const current = this.resolve(path);
		shell._size = await this.calculateSizeDir(current);
		return shell;
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

/**
 * Deep-merge `overrides` onto a structural clone of `base`. Used to resolve
 * the effective default filesystem tree in "merge" mode — see
 * useClassicyFileSystem in ClassicyFileSystemContext.tsx.
 */
export function mergeClassicyFileSystemEntries(
	base: ClassicyFileSystemTree,
	overrides: ClassicyFileSystemTree,
): ClassicyFileSystemTree {
	return deepMergeReplacingArrays(base, overrides);
}
