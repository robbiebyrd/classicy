/**
 * Search sources: a host's own content made findable in Find File (story
 * 0227-815), as Mac OS 8.5's Sherlock searched its Internet plug-ins.
 * `registerClassicyFindSource({ id, name, search })` adds one; Find File
 * lists every source as a channel the user can switch on or off, sends each
 * the words typed, and shows what each returns.
 *
 * A source searches asynchronously: `search(query, { signal })` returns a
 * promise of results, and `signal` aborts when a new search starts, when the
 * user stops it, or when Find File quits. One source failing never stops the
 * others: its error is logged through `classicyLog` and its results are
 * simply missing.
 */
import { useSyncExternalStore } from "react";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/** One item a source found. */
export interface ClassicyFindResult {
	/** The name the results list shows. */
	name: string;
	/** What it is, in the list's Kind column ("web page", "photo", …). */
	kind: string;
	/** An optional small icon (URL or data URI). */
	icon?: string;
	/** Open it: called when the user opens the result. */
	open: () => void;
}

export interface ClassicyFindSearchOptions {
	/** Aborted when the search is superseded or stopped: stop work and settle. */
	signal: AbortSignal;
}

/** A host's search channel. */
export interface ClassicyFindSource {
	/** Unique; registering an id again replaces that source. */
	id: string;
	/** The channel's name, in Find File's list and the results' Site column. */
	name: string;
	/** An optional small icon for the channel list. */
	icon?: string;
	/** Search for `query` (the words typed); resolve with the results. */
	search: (
		query: string,
		options: ClassicyFindSearchOptions,
	) => Promise<readonly ClassicyFindResult[]>;
}

const LOG = "ClassicyFindFile";

const sources = new Map<string, ClassicyFindSource>();
const listeners = new Set<() => void>();
let snapshot: readonly ClassicyFindSource[] = [];

const publish = () => {
	snapshot = Object.freeze([...sources.values()]);
	for (const listener of listeners) listener();
};

/** Remove the source `id`. Returns whether one was registered. */
export function unregisterClassicyFindSource(id: string): boolean {
	if (!sources.delete(id)) return false;
	publish();
	return true;
}

/**
 * Make a host's content findable: Find File shows `source` as a channel.
 * Call it at module scope or from an effect; registering an `id` again
 * replaces that source in its place. Returns the unregister.
 */
export function registerClassicyFindSource(
	source: ClassicyFindSource,
): () => void {
	if (
		!source ||
		typeof source.id !== "string" ||
		source.id === "" ||
		typeof source.name !== "string" ||
		source.name === "" ||
		typeof source.search !== "function"
	) {
		classicyLog(
			"warn",
			LOG,
			"Ignoring a search source without an id, a name and a search function",
			{ id: source?.id },
		);
		return () => {};
	}
	sources.set(source.id, source);
	publish();
	return () => {
		if (sources.get(source.id) === source)
			unregisterClassicyFindSource(source.id);
	};
}

/** Every registered source, in registration order. */
export function listClassicyFindSources(): readonly ClassicyFindSource[] {
	return snapshot;
}

/** Be told when a source registers or unregisters. */
export function subscribeClassicyFindSources(listener: () => void): () => void {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

/** The registered sources, live (a component re-renders when they change). */
export const useClassicyFindSources = (): readonly ClassicyFindSource[] =>
	useSyncExternalStore(
		subscribeClassicyFindSources,
		listClassicyFindSources,
		listClassicyFindSources,
	);

/** One result as Find File keeps it: tagged with the source it came from. */
export interface ClassicyFindSourceResult extends ClassicyFindResult {
	sourceId: string;
}

/** How a source's search ended. */
export type ClassicyFindSourceOutcome =
	| { sourceId: string; status: "found"; count: number }
	| { sourceId: string; status: "failed"; error: unknown }
	| { sourceId: string; status: "aborted" };

export interface ClassicyFindSourcesRunOptions {
	/** The sources to ask, by id (default: every registered source). */
	sourceIds?: readonly string[];
	signal: AbortSignal;
	/** Called once per source that answers before the signal aborts. */
	onResults?: (sourceId: string, results: ClassicyFindSourceResult[]) => void;
}

const isResult = (value: unknown): value is ClassicyFindResult => {
	if (typeof value !== "object" || value === null) return false;
	const result = value as Partial<ClassicyFindResult>;
	return (
		typeof result.name === "string" &&
		typeof result.kind === "string" &&
		typeof result.open === "function" &&
		(result.icon === undefined || typeof result.icon === "string")
	);
};

/**
 * Ask each source for `query`, all at once. Each source is isolated: one that
 * throws, rejects or resolves with no array is logged (`error`) and gives no
 * results; malformed results are dropped with a warning. Nothing is reported
 * once `signal` aborts, whatever the source does then. Resolves when every
 * source has settled, with how each ended.
 */
export async function searchClassicyFindSources(
	query: string,
	{ sourceIds, signal, onResults }: ClassicyFindSourcesRunOptions,
): Promise<ClassicyFindSourceOutcome[]> {
	const chosen = [...sources.values()].filter(
		(s) => sourceIds === undefined || sourceIds.includes(s.id),
	);
	return Promise.all(
		chosen.map(async (source): Promise<ClassicyFindSourceOutcome> => {
			const sourceId = source.id;
			try {
				const found = await source.search(query, { signal });
				if (signal.aborted) return { sourceId, status: "aborted" };
				if (!Array.isArray(found)) {
					throw new TypeError("search() resolved with no array of results");
				}
				const results = found.filter(isResult);
				if (results.length < found.length) {
					classicyLog(
						"warn",
						LOG,
						`Search source "${sourceId}" returned results without a name, a kind and an open function; they were left out`,
						{ source: sourceId, dropped: found.length - results.length },
					);
				}
				onResults?.(
					sourceId,
					results.map((r) => ({ ...r, sourceId })),
				);
				return { sourceId, status: "found", count: results.length };
			} catch (error) {
				if (signal.aborted) return { sourceId, status: "aborted" };
				classicyLog("error", LOG, `Search source "${sourceId}" failed`, {
					source: sourceId,
					error,
				});
				return { sourceId, status: "failed", error };
			}
		}),
	);
}
