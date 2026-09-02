import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	type ClassicyFileSystemJournalEntry,
	type ClassicyFileSystemSnapshot,
	flushClassicyFileSystemPendingForStorageKey,
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
import {
	applyClassicyFileSystemSeedMigrations,
	type ClassicyFileSystemSeedMigration,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemSeedMigrations";
import { isValidFileSystemEntry } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemValidation";
import { DefaultFSContent } from "@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { decompressFromBase64 } from "@/SystemFolder/SystemResources/Utils/base64Compression";
import { deepMergeReplacingArrays } from "@/SystemFolder/SystemResources/Utils/deepMerge";

const directoryIcon = ClassicyIcons.system.folders.directory;

// filterByType's default allow-list: every ClassicyFileSystemEntryFileType
// except Drive, derived from the enum so a newly added type is included
// automatically — no per-type hand-listing to forget (see 5762949a, which
// fixed exactly that failure mode for Shortcut). Drive stays excluded
// deliberately: drives live at the filesystem root and are surfaced as
// desktop icons through a dedicated call (Finder.tsx, ClassicyDriveSetupUtils.ts
// both pass byType: "drive"/ClassicyFileSystemEntryFileType.Drive explicitly),
// not as rows inside a folder listing. Do not "fix" this by adding Drive back.
// Object.values() is safe here only because ClassicyFileSystemEntryFileType is
// a string enum — Object.values on a numeric enum also returns the
// reverse-mapped member names, which would silently double the list.
// Frozen because every default call shares this one array instance (not a
// fresh literal per call); nothing mutates it today, but an unfrozen shared
// array is one stray `byType.push(...)` away from poisoning every default
// listing process-wide.
const DEFAULT_FILTER_BY_TYPES: string[] = Object.freeze(
	Object.values(ClassicyFileSystemEntryFileType).filter(
		(type) => type !== ClassicyFileSystemEntryFileType.Drive,
	),
) as string[];

const SUMMABLE_FILE_TYPES = new Set<string>([
	ClassicyFileSystemEntryFileType.File,
	ClassicyFileSystemEntryFileType.TextFile,
	ClassicyFileSystemEntryFileType.Markdown,
	ClassicyFileSystemEntryFileType.Pdf,
	ClassicyFileSystemEntryFileType.Stack,
]);

// Path segments that, if traversed as an object key, can reach or rewrite
// Object.prototype (prototype pollution). pathArray() is the single
// chokepoint that rejects them — every path-consuming method (resolve,
// writeFile, mkDir) routes through it, so none of them need their own copy
// of this check.
const FORBIDDEN_PATH_SEGMENTS = new Set([
	"__proto__",
	"constructor",
	"prototype",
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
		// One-time, idempotent corrections for stale content already persisted
		// in a returning visitor's localStorage tree — see
		// ClassicyFileSystemSeedMigrations.ts. Applied unconditionally below
		// (not just when loaded from storage): every op is a guarded no-op once
		// it no longer applies, so running it against an already-current tree
		// is harmless.
		seedMigrations: ClassicyFileSystemSeedMigration[] = [],
	) {
		// Drain any predecessor instance's pending debounced flush so we never
		// seed from a localStorage snapshot that is about to be overwritten.
		flushClassicyFileSystemPendingForStorageKey(storageKey);

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
					classicyLog(
						"warn",
						"ClassicyFileSystem",
						"localStorage data failed validation, using defaults",
					);
				}
			} catch (e) {
				classicyLog(
					"error",
					"ClassicyFileSystem",
					"Failed to parse localStorage data, using defaults:",
					e,
				);
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
		applyClassicyFileSystemSeedMigrations(this.fs, seedMigrations, separator);
		this.persist();
	}

	load(data: string) {
		try {
			const parsed = JSON.parse(data) as ClassicyFileSystemEntry;
			this.fs = parsed;
			this.notifyMutation("load", "");
		} catch (error) {
			classicyLog(
				"error",
				"ClassicyFileSystem",
				"Failed to parse data in load()",
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
			classicyLog(
				"error",
				"ClassicyFileSystem",
				"Failed to persist filesystem to localStorage.",
				error,
			);
		}
	}

	private nextSeq(): number {
		let stored = 0;
		try {
			const parsed = Number(localStorage.getItem(`${this.storageKey}:seq`));
			if (Number.isFinite(parsed) && parsed > 0) {
				stored = parsed;
			}
		} catch {
			// non-browser environment — seq stays in-memory
		}
		this.seq = Math.max(this.seq, stored) + 1;
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
			// Journal delivery is fire-and-forget by design; the hook swallows its
			// own failures, so there is never a rejection to handle here.
			void invokeClassicyFileSystemAdapterHook(adapter, "onChange", entry);
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
		registerClassicyFileSystemPendingFlush(this.flushNow, this.storageKey);
	}

	/**
	 * Cancel any pending debounce, persist to localStorage, and return the
	 * snapshot to hand to adapters. The synchronous half shared by flushNow and
	 * flushNowAsync, so localStorage is written identically either way.
	 */
	private prepareFlush(): ClassicyFileSystemSnapshot {
		if (this.flushTimer !== null) {
			clearTimeout(this.flushTimer);
			this.flushTimer = null;
		}
		unregisterClassicyFileSystemPendingFlush(this.flushNow);
		this.persist();
		return this.buildSnapshot();
	}

	/**
	 * Persist to localStorage and deliver onSnapshot immediately, cancelling any
	 * pending debounce. Adapter delivery is fire-and-forget — a slow or broken
	 * backend must never stall the filesystem. Arrow property so pagehide can
	 * call it detached.
	 */
	flushNow = () => {
		const snapshot = this.prepareFlush();
		for (const adapter of getClassicyFileSystemAdapters()) {
			void invokeClassicyFileSystemAdapterHook(adapter, "onSnapshot", snapshot);
		}
	};

	/**
	 * flushNow, but resolving only once every adapter's onSnapshot has settled;
	 * false if any of them failed. For the rare caller that is about to destroy
	 * the page — Drive Setup's Initialize reloads the window, and a fire-and-
	 * forget push would be aborted in flight, letting the next boot's reconcile
	 * pull the pre-erase tree back. Everything else should keep using flushNow.
	 */
	flushNowAsync = async (): Promise<boolean> => {
		const snapshot = this.prepareFlush();
		const results = await Promise.all(
			getClassicyFileSystemAdapters().map((adapter) =>
				invokeClassicyFileSystemAdapterHook(adapter, "onSnapshot", snapshot),
			),
		);
		return results.every(Boolean);
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
					classicyLog(
						"error",
						"ClassicyFileSystem",
						`adapter "${adapter.id}" reconcile returned an invalid tree; keeping local`,
					);
					continue;
				}
				this.load(JSON.stringify(result.tree));
				this.flushNow();
				return true;
			} catch (error) {
				classicyLog(
					"error",
					"ClassicyFileSystem",
					`adapter "${adapter.id}" failed in reconcile`,
					error,
				);
			}
		}
		return false;
	}

	/**
	 * Split a colon-separated path into segments, dropping empty ones.
	 * Returns null — rejecting the whole path — if any segment is a
	 * prototype-pollution vector (__proto__, constructor, prototype), rather
	 * than silently dropping just that segment (which would let the
	 * remainder of the path still resolve to something real).
	 */
	pathArray = (path: string): string[] | null => {
		const segments = path.split(this.separator).filter((v) => v !== "");
		if (segments.some((segment) => FORBIDDEN_PATH_SEGMENTS.has(segment))) {
			return null;
		}
		return segments;
	};

	resolve(path: string): ClassicyFileSystemEntry {
		const parts = this.pathArray(path);
		// undefined, NOT {}: every caller guards with `if (!entry)` or `?.`, so a
		// truthy empty object makes a rejected path look like a real entry —
		// setMetadata would report success for a write it never performed, and
		// writeFile's parent-existence check would silently pass. A missing path
		// already resolves to undefined via the reduce below, so returning
		// undefined here keeps one consistent contract for "no such entry".
		//
		// The declared return type omits `| undefined` — pre-existing, and only
		// compiles because `strict` is off. Widening it belongs to the strict-mode
		// subtask, which has to fix every call site at once.
		if (parts === null) return undefined as unknown as ClassicyFileSystemEntry;
		// Object.hasOwn (rather than `prev?.[curr]`) guarantees the reduce can
		// only step onto own, enumerable properties of the tree — never up the
		// prototype chain — even for a segment that isn't in
		// FORBIDDEN_PATH_SEGMENTS but happens to be inherited (e.g. toString).
		return parts.reduce(
			(prev, curr) =>
				prev && Object.hasOwn(prev, curr) ? prev[curr] : undefined,
			this.fs,
		);
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
		byType: string | string[] = DEFAULT_FILTER_BY_TYPES,
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
		// `byType` accepts a bare string for callers that only need one type.
		// Array.prototype.includes is exact-match, but String.prototype.includes
		// is a *substring* match — so testing a bare string directly against
		// `a._type` would let unrelated types leak through wherever one enum
		// value is a substring of another, e.g. "app_shortcut".includes("shortcut")
		// or "text_file".includes("file"). Normalizing to an array up front makes
		// every check go through the exact-match Array.prototype.includes.
		const types = Array.isArray(byType) ? byType : [byType];
		Object.entries(this.resolve(path)).forEach(([b, a]) => {
			if (a._invisible === true && !showInvisible) {
				return;
			}
			if (this.isCreatedAfter(a, notCreatedAfter)) {
				return;
			}
			if (types.includes(a._type)) {
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

		// A Shortcut's `_url` is the thing it points at, not where its own
		// bytes live — unlike every other type that sets `_url` (File,
		// TextFile, Markdown, Pdf, Image, Video, Audio, Extension), where
		// `_url` genuinely is the content location. This has to come before
		// the `_size` check below, not just before the `_url` fetch branch:
		// the pre-fix code cached a resolved HEAD size back onto `entry._size`
		// (and `statFile` writes that onto the live filesystem node, which
		// persists to localStorage), so a Shortcut that was fetched once under
		// the old code carries a stale, meaningless cached _size — the actual
		// source of the "666 Bytes" symptom users saw for rt911's SPA-routed
		// shortcuts. A shortcut has no content of its own, so its size is
		// always 0, regardless of any `_size` a prior run may have recorded.
		if (entry._type === ClassicyFileSystemEntryFileType.Shortcut) {
			return 0;
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

	/**
	 * Create or replace a file entry. Returns true on success, false when the
	 * path was refused (empty name, or a prototype-pollution-prone segment
	 * such as `__proto__`/`constructor`/`prototype`) — nothing is written and
	 * no mutation is journaled in that case. Callers must check the return
	 * value rather than assume a resolved call means the write happened.
	 */
	writeFile(
		path: string,
		data: string,
		metaData?: Partial<ClassicyFileSystemEntryMetadata>,
	): boolean {
		// pathArray() is the chokepoint: it returns null for a path containing
		// __proto__/constructor/prototype anywhere, so no separate guard is
		// needed here.
		const parts = this.pathArray(path);
		if (parts === null) return false;
		const name = parts.pop();
		if (!name) return false;

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
		return true;
	}

	rmDir(path: string) {
		const result = this.deletePropertyPath(this.fs, path);
		this.notifyMutation("rmdir", path);
		return result;
	}

	mkDir(path: string) {
		// pathArray() is the chokepoint: it returns null for a path containing
		// __proto__/constructor/prototype anywhere, so nothing is built or
		// journaled for a forbidden path.
		const parts = this.pathArray(path);
		if (parts === null) return;

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
