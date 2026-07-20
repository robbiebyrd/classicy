import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	type ClassicyFileSystemJournalEntry,
	type ClassicyFileSystemSnapshot,
	getClassicyFileSystemAdapters,
	getClassicyFileSystemSnapshotDebounceMs,
	invokeClassicyFileSystemAdapterHook,
	registerClassicyFileSystemPendingFlush,
	unregisterClassicyFileSystemPendingFlush,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemAdapter";
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
	private seq: number = 0;
	private flushTimer: ReturnType<typeof setTimeout> | null = null;

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
			const storedSeq = Number(localStorage.getItem(`${this.storageKey}:seq`));
			if (Number.isFinite(storedSeq) && storedSeq > 0) {
				this.seq = storedSeq;
			}
		} catch {
			// non-browser environment — seq stays in-memory
		}
		this.persist();
	}

	load(data: string) {
		try {
			const parsed = JSON.parse(data) as ClassicyFileSystemEntry;
			this.fs = parsed;
			this.notifyMutation("load", "");
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

	/** Centralized localStorage persistence — the only place the tree is written. */
	persist() {
		try {
			localStorage.setItem(this.storageKey, this.snapshot());
		} catch (error) {
			console.error(
				"[ClassicyFileSystem] Failed to persist filesystem to localStorage.",
				error,
			);
		}
	}

	private nextSeq(): number {
		this.seq += 1;
		try {
			localStorage.setItem(`${this.storageKey}:seq`, String(this.seq));
		} catch {
			// non-browser environment — seq stays in-memory
		}
		return this.seq;
	}

	/**
	 * Journal a mutation: sequence it, deliver to onChange adapters immediately.
	 * Every mutating method funnels through here — the sync choke point.
	 */
	private notifyMutation(
		op: ClassicyFileSystemJournalEntry["op"],
		path: string,
		extra: Pick<ClassicyFileSystemJournalEntry, "data" | "metadata"> = {},
	) {
		const entry: ClassicyFileSystemJournalEntry = {
			seq: this.nextSeq(),
			op,
			path,
			timestamp: new Date().toISOString(),
			...extra,
		};
		for (const adapter of getClassicyFileSystemAdapters()) {
			invokeClassicyFileSystemAdapterHook(adapter, "onChange", entry);
		}
		this.scheduleFlush();
	}

	/**
	 * Patch an entry's metadata through the journaled mutation path. Returns
	 * false (journaling nothing) when the path does not resolve.
	 */
	setMetadata(
		path: string,
		patch: Partial<ClassicyFileSystemEntryMetadata>,
	): boolean {
		const entry = this.resolve(path);
		if (!entry) return false;
		Object.assign(entry, patch);
		this.notifyMutation("meta", path, { metadata: patch });
		return true;
	}

	/**
	 * Replace the tree with a derived overlay (Applications / Extensions
	 * folders). Derived state regenerates from the app store every boot, so
	 * this intentionally neither journals nor notifies adapters.
	 */
	applyDerivedTree(tree: ClassicyFileSystemEntry) {
		this.fs = tree;
	}

	private scheduleFlush() {
		if (this.flushTimer !== null) {
			clearTimeout(this.flushTimer);
		}
		this.flushTimer = setTimeout(
			this.flushNow,
			getClassicyFileSystemSnapshotDebounceMs(),
		);
		registerClassicyFileSystemPendingFlush(this.flushNow);
	}

	/**
	 * Persist to localStorage and deliver onSnapshot immediately, cancelling any
	 * pending debounce. Arrow property so pagehide can call it detached.
	 */
	flushNow = () => {
		if (this.flushTimer !== null) {
			clearTimeout(this.flushTimer);
			this.flushTimer = null;
		}
		unregisterClassicyFileSystemPendingFlush(this.flushNow);
		this.persist();
		const snapshot = this.buildSnapshot();
		for (const adapter of getClassicyFileSystemAdapters()) {
			invokeClassicyFileSystemAdapterHook(adapter, "onSnapshot", snapshot);
		}
	};

	/** Deep-copied tree + sha256 hash + seq — the consistency envelope. */
	buildSnapshot(): ClassicyFileSystemSnapshot {
		const serialized = this.snapshot();
		return {
			tree: JSON.parse(serialized) as ClassicyFileSystemEntry,
			hash: bytesToHex(sha256(new TextEncoder().encode(serialized))),
			seq: this.seq,
			storageKey: this.storageKey,
			timestamp: new Date().toISOString(),
		};
	}

	/**
	 * Two-way boot sync: offer the local snapshot to each adapter implementing
	 * reconcile (registration order). The first 'replace' verdict wins: the
	 * validated tree is loaded, journaled as 'load', and flushed immediately.
	 * Returns true iff the tree was replaced. Errors and invalid trees degrade
	 * to keeping local — localStorage stays primary.
	 */
	async reconcileWithAdapters(): Promise<boolean> {
		const local = this.buildSnapshot();
		for (const adapter of getClassicyFileSystemAdapters()) {
			if (!adapter.reconcile) continue;
			try {
				const result = await adapter.reconcile(local);
				if (result?.action !== "replace") continue;
				if (!isValidFileSystemEntry(result.tree)) {
					console.error(
						`[ClassicyFileSystem] adapter "${adapter.id}" reconcile returned an invalid tree; keeping local`,
					);
					continue;
				}
				this.load(JSON.stringify(result.tree));
				this.flushNow();
				return true;
			} catch (error) {
				console.error(
					`[ClassicyFileSystem] adapter "${adapter.id}" failed in reconcile`,
					error,
				);
			}
		}
		return false;
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
		// When set, entries whose `_createdOn` is strictly after this moment are
		// omitted from the listing. Apps pass the current Classicy date/time here
		// so files "created in the future" (relative to the virtual clock) stay
		// hidden until that time is reached. Entries without a valid `_createdOn`
		// are always shown. Accepts a Date, an ISO string, or epoch millis.
		notCreatedAfter: Date | string | number | null = null,
	): ClassicyFileSystemEntry {
		const filteredItems = {} as ClassicyFileSystemEntry;
		if (!this.resolve(path)) return filteredItems;
		Object.entries(this.resolve(path)).forEach(([b, a]) => {
			if (a._invisible === true && !showInvisible) {
				return;
			}
			if (this.isCreatedAfter(a, notCreatedAfter)) {
				return;
			}
			if (byType.includes(a._type)) {
				filteredItems[b] = a;
			}
		});
		return filteredItems;
	}

	/**
	 * Returns true when `entry` was created strictly after `cutoff`. Used to hide
	 * files created "in the future" relative to the current Classicy date/time.
	 * A null/absent cutoff (feature off) or a missing/unparseable `_createdOn`
	 * both return false, so the entry is kept.
	 */
	private isCreatedAfter(
		entry: ClassicyFileSystemEntry,
		cutoff: Date | string | number | null,
	): boolean {
		if (cutoff === null || cutoff === undefined) return false;

		const createdOn = entry?._createdOn;
		if (createdOn === null || createdOn === undefined) return false;

		const createdMs = new Date(createdOn as Date | string | number).getTime();
		if (Number.isNaN(createdMs)) return false;

		const cutoffMs = new Date(cutoff).getTime();
		if (Number.isNaN(cutoffMs)) return false;

		return createdMs > cutoffMs;
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
		metaData?: Partial<ClassicyFileSystemEntryMetadata>,
	) {
		// Prevent prototype pollution via special property names anywhere in the path
		const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);
		const parts = this.pathArray(path);
		const name = parts.pop();
		if (!name || FORBIDDEN.has(name) || parts.some((p) => FORBIDDEN.has(p))) {
			return;
		}

		const parentPath = parts.join(this.separator);
		if (parts.length > 0 && !this.resolve(parentPath)) {
			this.mkDir(parentPath);
		}
		const parent = (
			parts.length === 0 ? this.fs : this.resolve(parentPath)
		) as Record<string, unknown>;

		// A file is a full entry object, not a raw string: type and icon metadata
		// ride along with the data so listings and readFile() both work.
		parent[name] = {
			_type: ClassicyFileSystemEntryFileType.TextFile,
			_createdOn: new Date().toISOString(),
			...metaData,
			_data: data,
		} as ClassicyFileSystemEntry;

		this.notifyMutation("write", path, { data, metadata: metaData });
	}

	rmDir(path: string) {
		const result = this.deletePropertyPath(this.fs, path);
		this.notifyMutation("rmdir", path);
		return result;
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
		this.notifyMutation("mkdir", path);
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
